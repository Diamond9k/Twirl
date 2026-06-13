import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const BLOCKING_RENTAL_STATUSES = ["pending", "approved", "paid", "active", "disputed"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // Authenticate caller; a user can only delete their own account.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: blockingRental, error: rentalError } = await supabase
      .from("rentals")
      .select("id")
      .in("status", BLOCKING_RENTAL_STATUSES)
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();
    if (rentalError) return json({ error: rentalError.message }, 500);
    if (blockingRental) {
      return json({ error: "Finish or cancel active rentals before deleting your account." }, 409);
    }

    // 1. Remove public uploads while the auth user still owns the storage prefix.
    const { error: storageError } = await removeUserUploads(user.id);
    if (storageError) return json({ error: storageError.message }, 500);

    // 2. Anonymize personal data while preserving shared transaction/audit rows.
    const { error: rpcError } = await supabase.rpc("delete_user_data", { p_user: user.id });
    if (rpcError) return json({ error: rpcError.message }, 500);

    // 3. Remove the auth identity itself. The profile row is retained as anonymized
    // transaction history; see the account-deletion migration.
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) return json({ error: delError.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function removeUserUploads(userId: string) {
  const bucket = supabase.storage.from("item-images");
  const { data, error } = await bucket.list(userId, { limit: 1000 });
  if (error) return { error };

  const paths = (data ?? [])
    .filter((entry) => entry.name)
    .map((entry) => `${userId}/${entry.name}`);
  if (paths.length === 0) return { error: null };

  const { error: removeError } = await bucket.remove(paths);
  return { error: removeError };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
