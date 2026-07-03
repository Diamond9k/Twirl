const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const paymentFn = read("supabase/functions/create-payment-intent/index.ts");
assert(
  paymentFn.includes('.in("status", ["pending", "approved"])'),
  "create-payment-intent must allow approved rentals to pay"
);
assert(
  paymentFn.includes("amount: amountCents") && paymentFn.includes("moneyToCents(rental.total_price)"),
  "create-payment-intent must derive the rental charge from the rental row"
);
assert(
  !paymentFn.includes("const { rental_id, amount") && !paymentFn.includes("amount,\n      currency"),
  "create-payment-intent must not trust client-supplied charge amounts"
);
assert(
  paymentFn.includes("depositCents") && paymentFn.includes("moneyToCents(rental.deposit_amount)"),
  "create-payment-intent must derive deposit amounts from the rental row"
);

const contractScreen = read("app/contract/[id].tsx");
assert(
  contractScreen.includes("body: JSON.stringify({ rental_id: rental.id })"),
  "checkout must only send the rental id to create-payment-intent"
);
assert(
  !contractScreen.includes("Math.round(rental.total_price") &&
    !contractScreen.includes("Math.round(rental.items.deposit"),
  "checkout must not compute payment amounts client-side"
);

const deleteFn = read("supabase/functions/delete-account/index.ts");
const authDeleteIndex = deleteFn.indexOf("deleteUser(user.id, true)");
const cleanupIndex = deleteFn.indexOf('rpc("delete_user_data"');
assert(authDeleteIndex !== -1, "delete-account must soft-delete auth users");
assert(cleanupIndex !== -1, "delete-account must call delete_user_data cleanup");
assert(
  authDeleteIndex < cleanupIndex,
  "delete-account must soft-delete auth before cleanup to avoid active orphaned logins"
);
assert(
  deleteFn.includes('status", blockingStatuses') && deleteFn.includes("return json(") && deleteFn.includes("409"),
  "delete-account must reject pending/active rentals before deletion"
);

const deletionMigration = read("supabase/migrations/20260703_account_deletion_preserve_rentals.sql");
assert(
  deletionMigration.includes("status not in ('completed', 'cancelled')"),
  "account deletion migration must block unresolved rentals"
);
assert(
  !deletionMigration.includes("delete from public.rentals") &&
    !deletionMigration.includes("delete from public.rental_contracts"),
  "account deletion migration must preserve rentals and contracts"
);
assert(
  deletionMigration.includes("update public.messages") &&
    deletionMigration.includes("update public.items") &&
    deletionMigration.includes("update public.profiles"),
  "account deletion migration must anonymize app data instead of hard-deleting shared history"
);

console.log("critical bug fix guards passed");
