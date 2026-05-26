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

    // Verify rental belongs to this owner and is active
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, owner_id, renter_id, status, total_price, commission_amount, deposit_amount, stripe_payment_intent, stripe_deposit_intent")
      .eq("id", rental_id)
      .eq("owner_id", user.id)
      .eq("status", "active")
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    if (!rental.stripe_payment_intent) {
      return json({ error: "Rental payment intent missing" }, 409);
    }

    // Capture the rental payment (actually charge the renter)
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent);
      if (paymentIntent.status === "requires_capture") {
        await stripe.paymentIntents.capture(rental.stripe_payment_intent);
      } else if (paymentIntent.status !== "succeeded") {
        return json({ error: "Rental payment has not been authorized" }, 402);
      }
    } catch (err: any) {
      // Concurrent return confirmations can race after Stripe captured the hold.
      if (!err.message?.includes("already been captured")) {
        throw new Error(`Capture failed: ${err.message}`);
      }
    }

    // Cancel/refund the deposit hold (release it back to renter)
    if (Number(rental.deposit_amount ?? 0) > 0) {
      if (!rental.stripe_deposit_intent) {
        return json({ error: "Deposit intent missing" }, 409);
      }

      try {
        const depositIntent = await stripe.paymentIntents.retrieve(rental.stripe_deposit_intent);
        if (depositIntent.status === "requires_capture") {
          await stripe.paymentIntents.cancel(rental.stripe_deposit_intent);
        } else if (depositIntent.status === "succeeded") {
          // Already captured — issue a full refund
          await stripe.refunds.create(
            { payment_intent: rental.stripe_deposit_intent },
            { idempotencyKey: `rental:${rental_id}:deposit-refund` }
          );
        } else if (depositIntent.status !== "canceled") {
          return json({ error: "Security deposit has not been authorized" }, 402);
        }
      } catch (err: any) {
        throw new Error(`Deposit release failed: ${err.message}`);
      }
    }

    // Mark rental completed only once, so concurrent requests cannot double-credit earnings.
    const completedAt = new Date().toISOString();
    const { data: completedRental, error: updateError } = await supabase
      .from("rentals")
      .update({ status: "completed", return_confirmed_at: completedAt, deposit_released_at: completedAt })
      .eq("id", rental_id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!completedRental) return json({ error: "Rental was already completed" }, 409);

    // Credit owner's earnings (rental price minus commission)
    const ownerEarnings = (rental.total_price ?? 0) - (rental.commission_amount ?? 0);
    const { error: earningsError } = await supabase.rpc("increment_owner_earnings", {
      p_owner_id: rental.owner_id,
      p_amount: ownerEarnings,
    });
    if (earningsError) throw earningsError;

    return json({ success: true });
  } catch (err: any) {
    console.error("release-deposit error:", err);
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
