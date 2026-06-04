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

    // 1. Remove all of the user's rows (transactional, ordered for FK constraints).
    const { error: rpcError } = await supabase.rpc("delete_user_data", { p_user: user.id });
    if (rpcError) return json({ error: rpcError.message }, 500);

    // 2. Remove the auth identity itself.
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) return json({ error: delError.message }, 500);

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
