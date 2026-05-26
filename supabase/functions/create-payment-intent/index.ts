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

    // Verify rental belongs to this user and is still payable.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, owner_id, status, start_date, end_date, items(price_per_day, deposit, owner_id)")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .in("status", ["pending", "approved"])
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const item = Array.isArray(rental.items) ? rental.items[0] : rental.items;
    if (!item || rental.owner_id !== item.owner_id) {
      return json({ error: "Rental item is invalid" }, 409);
    }

    const days = rentalDays(rental.start_date, rental.end_date);
    const rentalSubtotal = toMoney(item.price_per_day) * days;
    const commissionAmount = roundMoney(rentalSubtotal * 0.15);
    const totalPrice = roundMoney(rentalSubtotal + commissionAmount);
    const depositAmount = roundMoney(toMoney(item.deposit));
    const amount = toCents(totalPrice);
    const deposit = toCents(depositAmount);

    // Create PaymentIntent for rental amount (manual capture — charge on handoff)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      capture_method: "manual",
      metadata: { rental_id, type: "rental", user_id: user.id },
    }, {
      idempotencyKey: `rental:${rental_id}:payment`,
    });

    // Create PaymentIntent for deposit (manual capture — hold, release on safe return)
    let depositIntentClientSecret: string | null = null;
    let depositIntentId: string | null = null;
    if (deposit && deposit > 0) {
      const depositIntent = await stripe.paymentIntents.create({
        amount: deposit,
        currency: "usd",
        capture_method: "manual",
        metadata: { rental_id, type: "deposit", user_id: user.id },
      }, {
        idempotencyKey: `rental:${rental_id}:deposit`,
      });
      depositIntentClientSecret = depositIntent.client_secret;
      depositIntentId = depositIntent.id;
    }

    // Store server-computed money fields and payment intent IDs on rental.
    const { error: updateError } = await supabase
      .from("rentals")
      .update({
        total_price: totalPrice,
        commission_amount: commissionAmount,
        deposit_amount: depositAmount,
        stripe_payment_intent: paymentIntent.id,
        stripe_deposit_intent: depositIntentId,
      })
      .eq("id", rental_id);

    if (updateError) throw updateError;

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

function rentalDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const days = Math.ceil((end - start) / 86_400_000);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error("Invalid rental dates");
  }
  return days;
}

function toMoney(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid rental amount");
  }
  return parsed;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toCents(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("Invalid payment amount");
  }
  return cents;
}
