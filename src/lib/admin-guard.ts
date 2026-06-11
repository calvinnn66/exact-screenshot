/*
  Guard for server functions that require the Supabase service role key.

  In production (Lovable Cloud) the key is always present.
  In local dev it is optional — most UI features work without it because
  app state is stored in localStorage. Only POS sync / webhook features
  need the admin client.

  Call requireAdmin() at the top of any server function that polls
  automatically. It warns once to the terminal and returns false so
  callers can return an empty-but-safe response instead of throwing.
*/

let warned = false;

export function requireAdmin(): boolean {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return true;

  if (!warned) {
    console.warn(
      "\n[KitchenIntel] SUPABASE_SERVICE_ROLE_KEY is not set.\n" +
      "  → Server-side POS sync and admin features are disabled in local dev.\n" +
      "  → All inventory / UI features using localStorage work normally.\n" +
      "  → Full backend runs through Lovable Cloud automatically.\n" +
      "  → To enable admin features locally, add SUPABASE_SERVICE_ROLE_KEY to .env\n" +
      "    (see .env.example — get the key from Supabase Dashboard → Settings → API).\n"
    );
    warned = true;
  }

  return false;
}
