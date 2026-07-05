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

const migration = read("supabase/migrations/20260604_account_deletion.sql");
const edgeFunction = read("supabase/functions/delete-account/index.ts");

const unresolvedGuard = "Cannot delete account while rentals are unresolved";
const guardIndex = migration.indexOf(unresolvedGuard);
const rentalDeleteIndex = migration.indexOf("delete from public.rentals");

assert(guardIndex !== -1, "delete_user_data must refuse unresolved rentals");
assert(rentalDeleteIndex !== -1, "delete_user_data must keep an explicit rentals delete");
assert(
  guardIndex < rentalDeleteIndex,
  "unresolved-rental guard must run before deleting rental rows"
);

for (const status of ["pending", "approved", "paid", "active", "disputed"]) {
  assert(
    migration.includes(`'${status}'`),
    `delete_user_data guard must block ${status} rentals`
  );
}

assert(
  edgeFunction.includes(unresolvedGuard),
  "delete-account function must detect unresolved-rental RPC failures"
);
assert(
  edgeFunction.includes("409"),
  "delete-account function must return HTTP 409 for unresolved rentals"
);

console.log("Account deletion unresolved-rental guard verified.");
