import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const createPaymentIntent = read("supabase/functions/create-payment-intent/index.ts");
const confirmRentalPayment = read("supabase/functions/confirm-rental-payment/index.ts");
const rentalLockdown = read("supabase/migrations/20260609_lock_rental_money_writes.sql");
const contractScreen = read("app/contract/[id].tsx");
const rentalsScreen = read("app/(tabs)/rentals.tsx");

assert(
  !/const\s*\{\s*rental_id\s*,\s*amount\s*,\s*deposit\s*\}\s*=\s*await req\.json\(\)/.test(createPaymentIntent),
  "create-payment-intent must not trust client-supplied amount/deposit"
);
assert(
  createPaymentIntent.includes('.eq("status", "approved")'),
  "create-payment-intent must only create Stripe intents for owner-approved rentals"
);
assert(
  createPaymentIntent.includes("Math.round(Number(rental.total_price) * 100)") &&
    createPaymentIntent.includes("Math.round(Number(rental.deposit_amount ?? 0) * 100)"),
  "create-payment-intent must compute charge/deposit from the rental row"
);
assert(
  confirmRentalPayment.includes('paymentIntent.status !== "requires_capture"') &&
    confirmRentalPayment.includes('depositIntent.status !== "requires_capture"') &&
    confirmRentalPayment.includes('supabase.rpc("confirm_rental_payment"'),
  "confirm-rental-payment must verify Stripe authorization before invoking the paid-state RPC"
);
assert(
  rentalLockdown.includes('drop policy if exists "Rental parties update rentals"') &&
    rentalLockdown.includes("revoke update on public.rentals from anon, authenticated") &&
    rentalLockdown.includes("grant update (status) on public.rentals to authenticated") &&
    rentalLockdown.includes("status = 'pending'") &&
    rentalLockdown.includes("status in ('approved', 'cancelled')") &&
    rentalLockdown.includes("status = 'paid'") &&
    rentalLockdown.includes("status = 'active'") &&
    rentalLockdown.includes("create or replace function public.confirm_rental_payment") &&
    rentalLockdown.includes("revoke execute on function public.confirm_rental_payment") &&
    rentalLockdown.includes("grant execute on function public.confirm_rental_payment"),
  "rental lockdown migration must remove broad writes and keep paid transition service-role only"
);
assert(
  contractScreen.includes("confirm-rental-payment") &&
    contractScreen.includes("rental.status !== \"approved\"") &&
    contractScreen.includes("depositIntentClientSecret") &&
    contractScreen.includes("paymentIntentClientSecret: depositIntentClientSecret") &&
    !contractScreen.includes("amount: Math.round"),
  "contract screen must not send client amounts and must confirm paid state server-side"
);
assert(
  rentalsScreen.includes('rental.status === "pending"') &&
    rentalsScreen.includes("Waiting for owner approval") &&
    rentalsScreen.includes('rental.status === "approved"'),
  "rentals ledger must show checkout only after approval"
);

console.log("Money guard checks passed");
