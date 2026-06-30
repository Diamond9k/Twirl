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

    // Verify rental belongs to this user and has been approved by the owner.
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, status, start_date, end_date, stripe_payment_intent, stripe_deposit_intent, items(price_per_day, deposit)")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .eq("status", "approved")
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);

    const quote = computeRentalQuote(rental);
    if (quote.amount <= 0) return json({ error: "Rental amount is invalid" }, 400);
    if (quote.deposit < 0) return json({ error: "Deposit amount is invalid" }, 400);

    // Create PaymentIntent for rental amount (manual capture — charge on handoff)
    const paymentIntent = await getOrCreatePaymentIntent({
      existingIntentId: rental.stripe_payment_intent,
      expectedAmount: quote.amount,
      create: () => stripe.paymentIntents.create({
        amount: quote.amount,
        currency: "usd",
        capture_method: "manual",
        metadata: { rental_id, type: "rental", user_id: user.id },
      }),
    });
    if (!paymentIntent.client_secret) return json({ error: "Payment intent missing client secret" }, 500);

    // Create PaymentIntent for deposit (manual capture — hold, release on safe return)
    let depositIntentClientSecret: string | null = null;
    let depositIntentId: string | null = quote.deposit > 0 ? rental.stripe_deposit_intent ?? null : null;
    if (quote.deposit > 0) {
      const depositIntent = await getOrCreatePaymentIntent({
        existingIntentId: rental.stripe_deposit_intent,
        expectedAmount: quote.deposit,
        create: () => stripe.paymentIntents.create({
          amount: quote.deposit,
          currency: "usd",
          capture_method: "manual",
          metadata: { rental_id, type: "deposit", user_id: user.id },
        }),
      });
      if (!depositIntent.client_secret) return json({ error: "Deposit intent missing client secret" }, 500);
      depositIntentClientSecret = depositIntent.client_secret;
      depositIntentId = depositIntent.id;
    }

    // Store the server-computed quote and Stripe intent IDs on the rental.
    await supabase
      .from("rentals")
      .update({
        total_price: quote.totalDollars,
        commission_amount: quote.commissionDollars,
        deposit_amount: quote.depositDollars,
        stripe_payment_intent: paymentIntent.id,
        stripe_deposit_intent: depositIntentId,
      })
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

type RentalForQuote = {
  start_date: string;
  end_date: string;
  items?: { price_per_day?: number | string | null; deposit?: number | string | null } | Array<{ price_per_day?: number | string | null; deposit?: number | string | null }>;
};

function computeRentalQuote(rental: RentalForQuote) {
  const item = Array.isArray(rental.items) ? rental.items[0] : rental.items;
  const pricePerDay = dollars(item?.price_per_day);
  const depositDollars = dollars(item?.deposit);
  const days = rentalDays(rental.start_date, rental.end_date);
  const subtotalDollars = roundDollars(pricePerDay * days);
  const commissionDollars = roundDollars(subtotalDollars * 0.15);
  const totalDollars = roundDollars(subtotalDollars + commissionDollars);

  return {
    totalDollars,
    commissionDollars,
    depositDollars,
    amount: cents(totalDollars),
    deposit: cents(depositDollars),
  };
}

function rentalDays(startDate: string, endDate: string): number {
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return Math.ceil((endMs - startMs) / 86400000);
}

function dollars(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundDollars(value: number): number {
  return Math.round(value * 100) / 100;
}

function cents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

async function getOrCreatePaymentIntent(args: {
  existingIntentId?: string | null;
  expectedAmount: number;
  create: () => Promise<Stripe.PaymentIntent>;
}): Promise<Stripe.PaymentIntent> {
  if (args.existingIntentId) {
    const existing = await stripe.paymentIntents.retrieve(args.existingIntentId);
    if (existing.amount === args.expectedAmount && !["canceled", "succeeded"].includes(existing.status)) {
      return existing;
    }
  }

  return args.create();
}
