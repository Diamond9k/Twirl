// Public privacy-policy page. Re-serves the HTML stored in the `legal` bucket
// as text/html so it renders in a browser (Storage's public CDN forces text/plain
// on uploaded HTML as an XSS mitigation). No auth required (verify_jwt = false).
// Live at: https://qlulzatkhgblorbjndsz.supabase.co/functions/v1/privacy
const SRC = "https://qlulzatkhgblorbjndsz.supabase.co/storage/v1/object/public/legal/privacy.html";

Deno.serve(async () => {
  const r = await fetch(SRC, { headers: { "cache-control": "no-cache" } });
  if (!r.ok) {
    return new Response("Privacy policy temporarily unavailable.", { status: 502, headers: { "content-type": "text/plain" } });
  }
  const html = await r.text();
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
});
