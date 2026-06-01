import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const COMMISSION_RATE = 0.15;
const DAY_MS = 86_400_000;

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

    // Verify rental belongs to this user and derive all billable amounts server-side.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, status, start_date, end_date, items(price_per_day, deposit)")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const item = Array.isArray((rental as any).items) ? (rental as any).items[0] : (rental as any).items;
    if (!item) return json({ error: "Rental item not found" }, 404);

    const days = Math.ceil(
      (new Date((rental as any).end_date).getTime() - new Date((rental as any).start_date).getTime()) / DAY_MS
    );
    if (!Number.isFinite(days) || days <= 0) return json({ error: "Invalid rental dates" }, 400);

    const subtotal = Number(item.price_per_day) * days;
    const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
    const total = subtotal + commission;
    const deposit = Number(item.deposit ?? 0);
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

    // Store authoritative amounts and intent IDs on the rental.
    const { error: updateError } = await supabase
      .from("rentals")
      .update({
        total_price: total,
        commission_amount: commission,
        deposit_amount: deposit,
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
