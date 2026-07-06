import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const migration = readFileSync(
  resolve(root, "supabase/migrations/20260706_account_deletion_history_guard.sql"),
  "utf8"
);
const edgeFunction = readFileSync(
  resolve(root, "supabase/functions/delete-account/index.ts"),
  "utf8"
);

const checks = [
  {
    name: "deletion RPC checks rentals before teardown",
    ok:
      /from\s+public\.rentals[\s\S]*renter_id\s*=\s*p_user[\s\S]*owner_id\s*=\s*p_user/i.test(migration) &&
      /item_id\s+in\s*\(\s*select\s+i\.id\s+from\s+public\.items/i.test(migration),
  },
  {
    name: "deletion RPC checks rental contracts before teardown",
    ok: /from\s+public\.rental_contracts[\s\S]*renter_id\s*=\s*p_user[\s\S]*owner_id\s*=\s*p_user/i.test(migration),
  },
  {
    name: "deletion RPC raises protected-history error before deleting rows",
    ok:
      /raise\s+exception[\s\S]*Account deletion blocked: rental or payment history must be retained/i.test(migration) &&
      migration.indexOf("raise exception") < migration.indexOf("delete from public.reviews") &&
      migration.indexOf("delete from public.rentals") === -1 &&
      migration.indexOf("delete from public.rental_contracts") === -1,
  },
  {
    name: "edge function maps protected-history block to HTTP 409",
    ok:
      /rpcError\.code\s*===\s*"P0001"\s*\?\s*409\s*:\s*500/.test(edgeFunction) &&
      edgeFunction.indexOf('supabase.rpc("delete_user_data"') < edgeFunction.indexOf("supabase.auth.admin.deleteUser"),
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure.name}`);
  }
  process.exit(1);
}

for (const check of checks) {
  console.log(`PASS: ${check.name}`);
}
