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

    // Verify rental belongs to this user and use DB-managed quote amounts.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, status, total_price, deposit_amount")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const total = Number((rental as any).total_price);
    const deposit = Number((rental as any).deposit_amount ?? 0);
    const paymentAmount = toCents(total);
    const depositAmount = toCents(deposit);

    // Create PaymentIntent for rental amount (manual capture — charge on handoff)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: paymentAmount,
      currency: "usd",
      capture_method: "manual",
      metadata: { rental_id, type: "rental", user_id: user.id },
    });

    // Create PaymentIntent for deposit (manual capture — hold, release on safe return)
    let depositIntentClientSecret: string | null = null;
    let depositIntentId: string | null = null;
    if (depositAmount > 0) {
      const depositIntent = await stripe.paymentIntents.create({
        amount: depositAmount,
        currency: "usd",
        capture_method: "manual",
        metadata: { rental_id, type: "deposit", user_id: user.id },
      });
      depositIntentClientSecret = depositIntent.client_secret;
      depositIntentId = depositIntent.id;
    }

    // Store intent IDs on the rental; pricing fields are owned by DB triggers.
    const { error: updateError } = await supabase
      .from("rentals")
      .update({
        stripe_payment_intent: paymentIntent.id,
        stripe_deposit_intent: depositIntentId,
      })
      .eq("id", rental_id);

    if (updateError) throw updateError;

    return json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      depositIntentClientSecret,
      amount: paymentAmount,
      depositAmount,
    });
  } catch (err: any) {
    console.error("create-payment-intent error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});

function toCents(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(amount * 100);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    },
  });
}
