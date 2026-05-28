import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { rental_id } = await req.json();
    if (!rental_id) return json({ error: "Missing rental_id" }, 400);

    // Verify rental belongs to this user and is ready for payment. Amounts must
    // come from the rental row so clients cannot underpay by editing the request.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, status, total_price, deposit_amount")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const rentalAmount = toCents(rental.total_price);
    const depositAmount = toCents(rental.deposit_amount ?? 0);
    const authorizedAmount = rentalAmount + depositAmount;
    if (rentalAmount <= 0) return json({ error: "Invalid rental amount" }, 400);

    // Authorize the rental fee plus deposit in one card hold. On safe return,
    // release-deposit captures only the rental fee and releases the remainder.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: authorizedAmount,
      currency: "usd",
      capture_method: "manual",
      metadata: {
        rental_id,
        type: "rental_with_deposit",
        user_id: user.id,
        rental_amount: String(rentalAmount),
        deposit_amount: String(depositAmount),
      },
    });

    // Store payment intent ID on rental
    const { error: updateError } = await supabase
      .from("rentals")
      .update({ stripe_payment_intent: paymentIntent.id, stripe_deposit_intent: null })
      .eq("id", rental_id);
    if (updateError) {
      await stripe.paymentIntents.cancel(paymentIntent.id).catch((cancelError) => {
        console.error("payment intent cleanup failed:", cancelError);
      });
      return json({ error: updateError.message }, 500);
    }

    return json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      depositIntentClientSecret: null,
    });
  } catch (err: any) {
    console.error("create-payment-intent error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function toCents(value: number | string | null): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}
