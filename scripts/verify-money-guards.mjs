import { readFileSync } from "node:fs";

const files = {
  payment: read("supabase/functions/create-payment-intent/index.ts"),
  contract: read("app/contract/[id].tsx"),
  migration: read("supabase/migrations/20260630_lock_rental_payment_integrity.sql"),
};

mustInclude(files.payment, ".eq(\"status\", \"approved\")", "payment intents require owner approval");
mustInclude(files.payment, "computeRentalQuote", "payment function computes the quote server-side");
mustInclude(files.payment, "getOrCreatePaymentIntent", "payment function reuses existing intents");
mustInclude(files.payment, "transfer_data: { destination }", "payment function routes funds to owner connected account");
mustInclude(files.payment, "application_fee_amount: quote.applicationFeeAmount", "payment function keeps the platform fee");
mustNotMatch(files.payment, /const\s*\{\s*rental_id\s*,\s*amount\b/, "payment function must not read amount from request body");
mustNotMatch(files.payment, /const\s*\{\s*rental_id\s*,[^}]*deposit\b/, "payment function must not read deposit from request body");

mustInclude(files.contract, "confirm-rental-payment", "client confirms paid state through server function");
mustNotMatch(files.contract, /\.update\(\{\s*status:\s*["']paid["']/, "client must not mark rentals paid directly");
mustNotMatch(files.contract, /amount:\s*Math\.round/, "client must not send payment amount");

mustInclude(files.migration, "alter table public.profiles add column if not exists stripe_account_id text;", "migration versions connected account storage");
mustInclude(files.migration, "revoke update on public.rentals from anon, authenticated;", "migration revokes broad rental updates");
mustInclude(files.migration, "grant update (status) on public.rentals to authenticated;", "migration limits authenticated updates to status");
mustInclude(files.migration, "public.confirm_rental_payment", "migration defines service-role payment confirmation RPC");

console.log("money guard checks passed");

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function mustInclude(source, needle, message) {
  if (!source.includes(needle)) {
    fail(message);
  }
}

function mustNotMatch(source, pattern, message) {
  if (pattern.test(source)) {
    fail(message);
  }
}

function fail(message) {
  console.error(`money guard check failed: ${message}`);
  process.exit(1);
}
