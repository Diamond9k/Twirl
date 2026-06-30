import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { rental_id } = await req.json();
    if (!rental_id) return json({ error: "Missing rental_id" }, 400);

    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, renter_id, owner_id, status, total_price, deposit_amount, stripe_payment_intent, stripe_deposit_intent")
      .eq("id", rental_id)
      .eq("renter_id", user.id)
      .single();

    if (rentalError || !rental) return json({ error: "Rental not found or not authorized" }, 404);
    if (rental.status === "paid") return json({ success: true });
    if (rental.status !== "approved") return json({ error: "Rental is not approved for payment" }, 409);
    if (!rental.stripe_payment_intent) return json({ error: "Missing rental payment intent" }, 409);

    const expectedAmount = cents(rental.total_price);
    const expectedDeposit = cents(rental.deposit_amount ?? 0);
    if (expectedAmount <= 0) return json({ error: "Rental amount is invalid" }, 400);

    const paymentIntent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent);
    if (paymentIntent.amount !== expectedAmount) {
      return json({ error: "Payment amount does not match rental" }, 409);
    }
    if (!isAuthorized(paymentIntent.status)) {
      return json({ error: "Payment has not been authorized" }, 409);
    }

    let depositIntentId: string | null = null;
    if (expectedDeposit > 0) {
      if (!rental.stripe_deposit_intent) return json({ error: "Missing deposit intent" }, 409);
      const depositIntent = await stripe.paymentIntents.retrieve(rental.stripe_deposit_intent);
      if (depositIntent.amount !== expectedDeposit) {
        return json({ error: "Deposit amount does not match rental" }, 409);
      }
      if (!isAuthorized(depositIntent.status)) {
        return json({ error: "Deposit has not been authorized" }, 409);
      }
      depositIntentId = depositIntent.id;
    }

    const agreedAt = new Date().toISOString();
    const { error: confirmError } = await supabase.rpc("confirm_rental_payment", {
      p_rental_id: rental.id,
      p_renter_id: rental.renter_id,
      p_owner_id: rental.owner_id,
      p_deposit_intent_id: depositIntentId,
      p_agreed_at: agreedAt,
    });
    if (confirmError) return json({ error: confirmError.message }, 409);

    return json({ success: true });
  } catch (err: any) {
    console.error("confirm-rental-payment error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});

function isAuthorized(status: string): boolean {
  return status === "requires_capture" || status === "succeeded";
}

function cents(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
