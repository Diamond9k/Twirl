const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Critical guard failed: ${message}`);
    process.exitCode = 1;
  }
}

const deletionMigration = read("supabase/migrations/20260704_protect_account_deletion_rental_history.sql");
const deleteAccountFn = read("supabase/functions/delete-account/index.ts");

const rentalGuardIndex = deletionMigration.indexOf("from public.rentals");
const contractGuardIndex = deletionMigration.indexOf("from public.rental_contracts");
const firstRentalDeleteIndex = deletionMigration.indexOf("delete from public.rentals");
const firstContractDeleteIndex = deletionMigration.indexOf("delete from public.rental_contracts");

assert(
  deletionMigration.includes("create or replace function public.delete_user_data"),
  "account deletion RPC must be redefined by the hotfix migration"
);
assert(
  rentalGuardIndex !== -1 && rentalGuardIndex < firstRentalDeleteIndex,
  "rental history must be checked before any rentals delete"
);
assert(
  contractGuardIndex !== -1 && contractGuardIndex < firstContractDeleteIndex,
  "contract history must be checked before any rental_contracts delete"
);
assert(
  deletionMigration.includes("raise exception") &&
    deletionMigration.includes("rental history must be retained safely"),
  "unsafe account deletion must raise a clear rental-history block"
);
assert(
  deleteAccountFn.includes("RENTAL_HISTORY_BLOCK_MESSAGE") &&
    deleteAccountFn.includes("409"),
  "delete-account Edge Function must return conflict for rental-history blocks"
);

if (process.exitCode) process.exit(process.exitCode);
console.log("Critical account-deletion guards verified.");
