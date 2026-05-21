/* ============================================================
   Toast POS — server-only helpers
   Toast uses client_credentials per restaurant (no user OAuth redirect).
   Restaurants generate clientId/clientSecret in Toast Web.
   ============================================================ */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";

export type ToastEnv = "sandbox" | "production";

export function toastApiBase(env: ToastEnv) {
  return env === "production"
    ? "https://ws-api.toasttab.com"
    : "https://ws-sandbox-api.eng.toasttab.com";
}

export function publicBaseUrl(): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://project--aa475a88-be51-4f31-9bb2-d0266a47d1be.lovable.app";
}

export const WEBHOOK_PATH = "/api/public/toast/webhook";

/* ---------- Webhook signature verification ----------
   Toast signs the raw body with HMAC-SHA256 using the webhook secret.
   Header: `toast-signature` — base64-encoded digest.
*/
export function verifyWebhookSignature(opts: {
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  const key = process.env.TOAST_WEBHOOK_SIGNATURE_KEY;
  if (!key || !opts.signatureHeader) return false;
  const expected = createHmac("sha256", key).update(opts.rawBody).digest("base64");
  if (opts.signatureHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(opts.signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ---------- Authenticate against Toast ---------- */

export async function authenticateToast(opts: {
  env: ToastEnv;
  clientId: string;
  clientSecret: string;
}) {
  const res = await fetch(`${toastApiBase(opts.env)}/authentication/v1/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      userAccessType: "TOAST_MACHINE_CLIENT",
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.token?.accessToken) {
    throw new Error(`Toast auth failed: ${JSON.stringify(json)}`);
  }
  const token = json.token;
  // expiresIn is seconds
  const expiresAt = new Date(Date.now() + Number(token.expiresIn || 86400) * 1000).toISOString();
  return {
    accessToken: token.accessToken as string,
    expiresAt,
    scopes: (token.scope ? String(token.scope).split(" ") : []) as string[],
  };
}

/* ---------- Connection storage ---------- */

export async function getActiveConnection(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("toast_connections")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getConnectionByRestaurant(restaurantGuid: string) {
  const { data, error } = await supabaseAdmin
    .from("toast_connections")
    .select("*")
    .eq("restaurant_guid", restaurantGuid)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureFreshToken(connectionId: string) {
  const { data: conn, error } = await supabaseAdmin
    .from("toast_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (error || !conn) throw new Error("Toast connection not found");

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const buffer = 5 * 60 * 1000; // refresh 5 minutes before expiry
  if (conn.access_token && expiresAt - Date.now() > buffer) return conn;

  const fresh = await authenticateToast({
    env: conn.environment as ToastEnv,
    clientId: conn.client_id,
    clientSecret: conn.client_secret,
  });

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("toast_connections")
    .update({
      access_token: fresh.accessToken,
      expires_at: fresh.expiresAt,
      scopes: fresh.scopes,
    })
    .eq("id", connectionId)
    .select("*")
    .single();
  if (upErr) throw new Error(upErr.message);
  return updated;
}

/* ---------- Authenticated Toast API call ---------- */

export async function toastFetch(opts: {
  connectionId: string;
  path: string;
  method?: string;
  body?: unknown;
}) {
  const conn = await ensureFreshToken(opts.connectionId);
  const url = `${toastApiBase(conn.environment as ToastEnv)}${opts.path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Toast-Restaurant-External-ID": conn.restaurant_guid,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? safeJson(text) : {};
  if (!res.ok) throw new Error(`Toast API ${opts.path} failed [${res.status}]: ${text.slice(0, 400)}`);
  return json;
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}

/* ---------- Order normalization + persistence ---------- */

export type NormalizedToastItem = {
  toastItemGuid: string | null;
  name: string;
  quantity: number;
  totalCents: number;
};

export async function persistToastOrder(opts: {
  projectId: string;
  restaurantGuid: string;
  order: any;
}) {
  const order = opts.order;
  const checks: any[] = order.checks || [];
  const selections = checks.flatMap((c) => c.selections || []);

  const items: NormalizedToastItem[] = selections.map((s: any) => ({
    toastItemGuid: s.item?.guid || s.itemGroup?.guid || null,
    name: s.displayName || s.item?.name || "Item",
    quantity: Number(s.quantity || 1),
    totalCents: Math.round(Number(s.price || 0) * 100),
  }));

  const totalCents = Math.round(
    checks.reduce((sum: number, c: any) => sum + Number(c.totalAmount || 0), 0) * 100,
  );
  const orderedAt = order.openedDate || order.createdDate || new Date().toISOString();

  const { error } = await supabaseAdmin.from("pos_orders").upsert(
    {
      project_id: opts.projectId,
      source: "toast",
      external_id: order.guid,
      merchant_id: opts.restaurantGuid,
      location_id: opts.restaurantGuid,
      items: items as any,
      total_cents: totalCents,
      currency: "USD",
      ordered_at: orderedAt,
    },
    { onConflict: "source,external_id" },
  );
  if (error) throw new Error(error.message);
}
