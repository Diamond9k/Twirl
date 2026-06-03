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

    // Verify rental belongs to this user and is awaiting payment.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, status, total_price, deposit_amount")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const rentalAmount = toStripeAmount(rental.total_price);
    const depositAmount = toStripeAmount(rental.deposit_amount ?? 0);
    const authorizationAmount = rentalAmount + depositAmount;

    if (rentalAmount <= 0 || authorizationAmount <= 0) {
      return json({ error: "Invalid rental amount" }, 400);
    }

    // Authorize rental + deposit server-side. On return we capture only the rental fee
    // for good-condition returns, which releases the remaining deposit hold.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: authorizationAmount,
      currency: "usd",
      capture_method: "manual",
      metadata: {
        rental_id,
        type: "rental_with_deposit_hold",
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
    if (updateError) throw updateError;

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

function toStripeAmount(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(numberValue * 100);
}
