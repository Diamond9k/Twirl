const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const paymentFunction = read("supabase/functions/create-payment-intent/index.ts");
assert(
  /\.in\("status",\s*\[\s*"pending",\s*"approved"\s*\]\)/.test(paymentFunction),
  "create-payment-intent must allow approved rentals to complete checkout"
);
assert(
  /const\s+\{\s*rental_id\s*\}\s*=\s*await req\.json\(\)/.test(paymentFunction),
  "create-payment-intent must not read client-supplied amount/deposit values"
);
assert(
  /toStripeCents\(rental\.total_price\)/.test(paymentFunction) &&
    /toStripeCents\(rental\.deposit_amount \?\? 0\)/.test(paymentFunction),
  "create-payment-intent must derive Stripe amounts from the rental row"
);

const deletionMigration = read("supabase/migrations/20260604_account_deletion.sql");
assert(
  /from public\.rentals/.test(deletionMigration) &&
    /status <> 'cancelled'/.test(deletionMigration) &&
    /raise exception 'Account deletion requires support review/.test(deletionMigration),
  "account deletion must block before deleting non-cancelled rental records"
);

const deleteAccountFunction = read("supabase/functions/delete-account/index.ts");
assert(
  /rpcError\.code === "P0001" \? 409 : 500/.test(deleteAccountFunction),
  "delete-account must surface guarded deletion as a conflict"
);

console.log("critical guard checks passed");
