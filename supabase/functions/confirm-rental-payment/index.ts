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
    return json(null, 200);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { rental_id } = await req.json();
    if (!rental_id) return json({ error: "Missing rental_id" }, 400);

    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, owner_id, status, total_price, deposit_amount, stripe_payment_intent")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) {
      return json({ error: "Rental not found or not authorized" }, 404);
    }

    if (!rental.stripe_payment_intent) {
      return json({ error: "Missing payment authorization" }, 409);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent);
    const expectedAmount =
      toStripeAmount(rental.total_price) + toStripeAmount(rental.deposit_amount ?? 0);

    if (paymentIntent.amount !== expectedAmount || paymentIntent.currency !== "usd") {
      return json({ error: "Payment amount mismatch" }, 409);
    }

    if (paymentIntent.status !== "requires_capture") {
      return json({ error: `Payment is not authorized: ${paymentIntent.status}` }, 409);
    }

    const agreedAt = new Date().toISOString();
    const { data: paidRental, error: updateError } = await supabase
      .from("rentals")
      .update({ status: "paid", contract_agreed: true, contract_agreed_at: agreedAt })
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .select("id")
      .single();
    if (updateError || !paidRental) {
      return json({ error: "Rental was already paid or changed status" }, 409);
    }

    const { data: existingContract, error: contractLookupError } = await supabase
      .from("rental_contracts")
      .select("id")
      .eq("rental_id", rental_id)
      .limit(1)
      .maybeSingle();
    if (contractLookupError) throw contractLookupError;

    if (!existingContract) {
      const { error: contractError } = await supabase
        .from("rental_contracts")
        .insert({
          rental_id,
          renter_id: user.id,
          owner_id: rental.owner_id,
          agreed_at: agreedAt,
          terms_version: "1.0",
        });
      if (contractError) throw contractError;
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("confirm-rental-payment error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});

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

function toStripeAmount(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(numberValue * 100);
}
