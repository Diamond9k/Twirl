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
      .select("id, renter_id, owner_id, status, deposit_amount, stripe_payment_intent, stripe_deposit_intent")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);
    if (!rental.stripe_payment_intent) return json({ error: "Payment intent missing" }, 409);

    const paymentIntent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent);
    if (paymentIntent.status !== "requires_capture") {
      return json({ error: "Rental payment has not been authorized" }, 402);
    }

    const depositAmount = Number(rental.deposit_amount ?? 0);
    if (depositAmount > 0) {
      if (!rental.stripe_deposit_intent) return json({ error: "Deposit intent missing" }, 409);

      const depositIntent = await stripe.paymentIntents.retrieve(rental.stripe_deposit_intent);
      if (depositIntent.status !== "requires_capture") {
        return json({ error: "Security deposit has not been authorized" }, 402);
      }
    }

    const agreedAt = new Date().toISOString();
    const { error: contractError } = await supabase
      .from("rental_contracts")
      .insert({
        rental_id: rental.id,
        renter_id: rental.renter_id,
        owner_id: rental.owner_id,
        agreed_at: agreedAt,
        deposit_intent_id: rental.stripe_deposit_intent,
        terms_version: "1.0",
      });
    if (contractError) throw contractError;

    const { error: updateError } = await supabase
      .from("rentals")
      .update({ status: "paid", contract_agreed: true, contract_agreed_at: agreedAt })
      .eq("id", rental_id);
    if (updateError) throw updateError;

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
