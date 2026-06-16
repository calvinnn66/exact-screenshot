/*
  Guard for server functions that require the Supabase service role key.

  SUPABASE_SERVICE_ROLE_KEY is required for all POS sync, webhook processing,
  and admin Supabase operations (Square, Toast, catalog mapping, pos_orders).
  Without it, supabaseAdmin throws on first access and all Square/Toast server
  functions crash.

  Call requireAdmin() only at the top of server functions that poll
  automatically (e.g. getLivePosFeed). It warns once and returns false so the
  caller can return an empty-but-safe response rather than crashing the poll
  loop. User-triggered server functions (button clicks, webhook routes) should
  throw normally — they only fire on explicit action.

  Get the key from: Supabase Dashboard → Settings → API → service_role secret.
  Add it to .env as SUPABASE_SERVICE_ROLE_KEY=<key>.
*/

let warned = false;

export function requireAdmin(): boolean {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return true;

  if (!warned) {
    console.warn(
      "\n[KitchenIntel] SUPABASE_SERVICE_ROLE_KEY is not set.\n" +
      "  → All Square and Toast server functions will crash without this key.\n" +
      "  → Get it from: Supabase Dashboard → Settings → API → service_role secret.\n" +
      "  → Add SUPABASE_SERVICE_ROLE_KEY=<key> to your .env file.\n"
    );
    warned = true;
  }

  return false;
}
