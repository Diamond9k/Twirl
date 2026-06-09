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
      .select("id, renter_id, owner_id, status, stripe_payment_intent, stripe_deposit_intent")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .eq("status", "approved")
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);
    if (!rental.stripe_payment_intent) return json({ error: "Missing payment intent" }, 400);

    const paymentIntent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent);
    if (paymentIntent.status !== "requires_capture" && paymentIntent.status !== "succeeded") {
      return json({ error: "Payment has not been authorized" }, 409);
    }

    if (rental.stripe_deposit_intent) {
      const depositIntent = await stripe.paymentIntents.retrieve(rental.stripe_deposit_intent);
      if (depositIntent.status !== "requires_capture" && depositIntent.status !== "succeeded") {
        return json({ error: "Deposit has not been authorized" }, 409);
      }
    }

    const agreedAt = new Date().toISOString();

    const { error: confirmError } = await supabase.rpc("confirm_rental_payment", {
      p_rental_id: rental.id,
      p_renter_id: rental.renter_id,
      p_owner_id: rental.owner_id,
      p_deposit_intent_id: rental.stripe_deposit_intent,
      p_agreed_at: agreedAt,
    });
    if (confirmError) return json({ error: confirmError.message }, 500);

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
