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
      .select("id, owner_id, renter_id, status, total_price, commission_amount, stripe_payment_intent, stripe_deposit_intent")
      .eq("id", rental_id)
      .eq("owner_id", user.id)
      .eq("status", "active")
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);
    if (!rental.stripe_payment_intent) return json({ error: "Missing rental payment intent" }, 400);

    const errors: string[] = [];

    // Capture the rental payment (actually charge the renter)
    try {
      await stripe.paymentIntents.capture(rental.stripe_payment_intent);
    } catch (err: any) {
      // Already captured is fine for retries after a previous partial success.
      if (!err.message?.includes("already been captured")) {
        errors.push(`Capture failed: ${err.message}`);
      }
    }

    // Cancel/refund the deposit hold (release it back to renter)
    if (rental.stripe_deposit_intent) {
      try {
        const depositIntent = await stripe.paymentIntents.retrieve(rental.stripe_deposit_intent);
        if (depositIntent.status === "requires_capture") {
          await stripe.paymentIntents.cancel(rental.stripe_deposit_intent);
        } else if (depositIntent.status === "succeeded") {
          // Already captured — issue a full refund
          await stripe.refunds.create({ payment_intent: rental.stripe_deposit_intent });
        }
      } catch (err: any) {
        errors.push(`Deposit release failed: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      return json({ error: errors.join("; ") }, 500);
    }

    // Mark completed once; concurrent retries must not credit earnings twice.
    const { data: completedRental, error: completeError } = await supabase
      .from("rentals")
      .update({ status: "completed" })
      .eq("id", rental_id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (completeError) return json({ error: completeError.message }, 500);
    if (!completedRental) return json({ error: "Rental already completed or no longer active" }, 409);

    // Credit owner's earnings (rental price minus commission)
    const ownerEarnings = (rental.total_price ?? 0) - (rental.commission_amount ?? 0);
    await supabase.rpc("increment_owner_earnings", {
      p_owner_id: rental.owner_id,
      p_amount: ownerEarnings,
    });

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
