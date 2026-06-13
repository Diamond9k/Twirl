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

    // Verify the rental belongs to this user and is payable.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, status, total_price, commission_amount, deposit_amount, owner:profiles!owner_id(stripe_account_id)")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const amount = centsFromDollars(rental.total_price);
    const applicationFeeAmount = centsFromDollars(rental.commission_amount ?? 0);
    const deposit = centsFromDollars(rental.deposit_amount ?? 0);
    if (amount <= 0) return json({ error: "Rental amount is invalid" }, 400);

    const ownerProfile = Array.isArray(rental.owner) ? rental.owner[0] : rental.owner;
    const destination = ownerProfile?.stripe_account_id;
    if (!destination) return json({ error: "Owner has not set up payouts" }, 409);

    const paymentIntentParams: Record<string, unknown> = {
      amount,
      currency: "usd",
      capture_method: "manual",
      transfer_data: { destination },
      metadata: { rental_id, type: "rental", user_id: user.id },
    };
    if (applicationFeeAmount > 0) {
      paymentIntentParams.application_fee_amount = applicationFeeAmount;
    }

    // Create PaymentIntent for rental amount (manual capture — charge on handoff)
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams as any);

    // Create PaymentIntent for deposit (manual capture — hold, release on safe return)
    let depositIntentClientSecret: string | null = null;
    if (deposit && deposit > 0) {
      const depositIntent = await stripe.paymentIntents.create({
        amount: deposit,
        currency: "usd",
        capture_method: "manual",
        metadata: { rental_id, type: "deposit", user_id: user.id },
      });
      depositIntentClientSecret = depositIntent.client_secret;

      await supabase
        .from("rentals")
        .update({ stripe_deposit_intent: depositIntent.id })
        .eq("id", rental_id);
    }

    // Store payment intent ID on rental
    await supabase
      .from("rentals")
      .update({ stripe_payment_intent: paymentIntent.id })
      .eq("id", rental_id);

    return json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      depositIntentClientSecret,
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

function centsFromDollars(value: number | string | null): number {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}
