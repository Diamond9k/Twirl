import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
    // Authenticate caller; a user can only delete their own account.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const blockingStatuses = ["pending", "approved", "paid", "active", "disputed"];
    const { count, error: rentalCheckError } = await supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .or(`owner_id.eq.${user.id},renter_id.eq.${user.id}`)
      .in("status", blockingStatuses);

    if (rentalCheckError) return json({ error: rentalCheckError.message }, 500);
    if ((count ?? 0) > 0) {
      return json(
        { error: "Account deletion is blocked while you have pending or active rentals. Complete or cancel them first." },
        409
      );
    }

    // 1. Soft-delete the auth identity first so a later data-cleanup failure cannot
    // leave an active login with app data already removed.
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id, true);
    if (delError) return json({ error: delError.message }, 500);

    // 2. Remove/anonymize app data while preserving completed rental history.
    const { error: rpcError } = await supabase.rpc("delete_user_data", { p_user: user.id });
    if (rpcError) return json({ error: rpcError.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
