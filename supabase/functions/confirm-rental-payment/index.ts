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
  if (req.method === "OPTIONS") return json(null, 200);

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
      .select("id, renter_id, owner_id, status, total_price, stripe_payment_intent, stripe_deposit_intent, contract_agreed")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);
    if (rental.status === "paid" && rental.contract_agreed) return json({ success: true });
    if (!["pending", "approved"].includes(rental.status)) {
      return json({ error: "Rental is not payable" }, 409);
    }
    if (!rental.stripe_payment_intent) return json({ error: "Missing rental payment intent" }, 400);

    const paymentIntent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent);
    const expectedAmount = dollarsToCents(rental.total_price);
    const validStatus = paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded";
    if (
      !validStatus ||
      paymentIntent.amount !== expectedAmount ||
      paymentIntent.metadata?.rental_id !== rental.id ||
      paymentIntent.metadata?.user_id !== user.id
    ) {
      return json({ error: "Payment has not been authorized for this rental" }, 402);
    }

    const now = new Date().toISOString();
    const { data: updatedRental, error: updateError } = await supabase
      .from("rentals")
      .update({ status: "paid", contract_agreed: true, contract_agreed_at: now })
      .eq("id", rental.id)
      .in("status", ["pending", "approved"])
      .select("id")
      .maybeSingle();

    if (updateError) return json({ error: updateError.message }, 500);
    if (!updatedRental) {
      const { data: latest } = await supabase
        .from("rentals")
        .select("status, contract_agreed")
        .eq("id", rental.id)
        .single();
      if (latest?.status === "paid" && latest.contract_agreed) return json({ success: true });
      return json({ error: "Rental is no longer payable" }, 409);
    }

    const { data: existingContract } = await supabase
      .from("rental_contracts")
      .select("id")
      .eq("rental_id", rental.id)
      .limit(1)
      .maybeSingle();

    if (!existingContract) {
      const { error: contractError } = await supabase.from("rental_contracts").insert({
        rental_id: rental.id,
        renter_id: user.id,
        owner_id: rental.owner_id,
        agreed_at: now,
        deposit_intent_id: rental.stripe_deposit_intent,
        terms_version: "1.0",
      });
      if (contractError) return json({ error: contractError.message }, 500);
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

function dollarsToCents(value: number | string | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}
