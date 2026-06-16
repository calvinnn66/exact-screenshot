/* ============================================================
   Square API helpers + Supabase admin access
   Server-only — never import from client code.
   ============================================================ */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";

export type SquareEnv = "sandbox" | "production";

export function squareApiBase(env: SquareEnv) {
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function publicBaseUrl(): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Local dev fallback. OAuth and webhook delivery require a public HTTPS URL —
  // set PUBLIC_BASE_URL to your ngrok URL before testing those flows.
  return "http://localhost:8080";
}

export const REDIRECT_PATH = "/api/square/callback";
export const WEBHOOK_PATH = "/api/public/square/webhook";

export const REQUIRED_SCOPES = [
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ITEMS_READ",
  "PAYMENTS_READ",
  "INVENTORY_READ",
];

/* ---------- Signed OAuth state ---------- */

function stateSecret() {
  const s = process.env.SQUARE_APPLICATION_SECRET;
  if (!s) throw new Error("SQUARE_APPLICATION_SECRET not configured");
  return s;
}

export function signState(payload: { projectId: string; env: SquareEnv; nonce: string }) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyState(state: string): { projectId: string; env: SquareEnv; nonce: string } | null {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(b64).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/* ---------- Webhook signature verification ---------- */

export function verifyWebhookSignature(opts: {
  notificationUrl: string;
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !opts.signatureHeader) return false;
  const expected = createHmac("sha256", key)
    .update(opts.notificationUrl + opts.rawBody)
    .digest("base64");
  if (opts.signatureHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(opts.signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ---------- OAuth token exchange + refresh ---------- */

export async function exchangeCode(opts: { code: string; env: SquareEnv }) {
  const appId = process.env.SQUARE_APPLICATION_ID;
  const secret = process.env.SQUARE_APPLICATION_SECRET;
  if (!appId || !secret) throw new Error("Square app credentials missing");

  const res = await fetch(`${squareApiBase(opts.env)}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-12-18",
    },
    body: JSON.stringify({
      client_id: appId,
      client_secret: secret,
      code: opts.code,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Square token exchange failed: ${JSON.stringify(json)}`);
  return json as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    merchant_id: string;
    token_type: string;
  };
}

export async function refreshAccessToken(opts: { refreshToken: string; env: SquareEnv }) {
  const appId = process.env.SQUARE_APPLICATION_ID;
  const secret = process.env.SQUARE_APPLICATION_SECRET;
  if (!appId || !secret) throw new Error("Square app credentials missing");

  const res = await fetch(`${squareApiBase(opts.env)}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-12-18",
    },
    body: JSON.stringify({
      client_id: appId,
      client_secret: secret,
      refresh_token: opts.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Square token refresh failed: ${JSON.stringify(json)}`);
  return json as { access_token: string; refresh_token: string; expires_at: string; merchant_id: string };
}

/* ---------- Connection storage + retrieval ---------- */

export async function getActiveConnection(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("square_connections")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getConnectionByMerchant(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from("square_connections")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureFreshToken(connectionId: string) {
  const { data: conn, error } = await supabaseAdmin
    .from("square_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (error || !conn) throw new Error("Connection not found");

  const expiresAt = new Date(conn.expires_at).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (expiresAt - Date.now() > sevenDays) return conn;

  const refreshed = await refreshAccessToken({
    refreshToken: conn.refresh_token,
    env: conn.environment as SquareEnv,
  });
  const { data: updated, error: upErr } = await supabaseAdmin
    .from("square_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    })
    .eq("id", connectionId)
    .select("*")
    .single();
  if (upErr) throw new Error(upErr.message);
  return updated;
}

/* ---------- Authenticated Square API call ---------- */

export async function squareFetch(opts: {
  connectionId: string;
  path: string;
  method?: string;
  body?: unknown;
}) {
  const conn = await ensureFreshToken(opts.connectionId);
  const url = `${squareApiBase(conn.environment as SquareEnv)}${opts.path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-12-18",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Square API ${opts.path} failed: ${JSON.stringify(json)}`);
  return json;
}

/* ---------- Order normalization + persistence ---------- */

export type NormalizedOrderItem = {
  squareObjectId: string | null;
  squareVariationId: string | null;
  name: string;
  quantity: number;
  totalCents: number;
};

export async function persistOrder(opts: {
  projectId: string;
  merchantId: string;
  locationId: string | null;
  order: any;
}) {
  const order = opts.order;
  const items: NormalizedOrderItem[] = (order.line_items || []).map((li: any) => ({
    squareObjectId: li.catalog_object_id || null,
    squareVariationId: li.catalog_object_id || null,
    name: li.name || "Item",
    quantity: Number(li.quantity || 1),
    totalCents: Number(li.total_money?.amount || 0),
  }));

  const totalCents = Number(order.total_money?.amount || 0);
  const currency = order.total_money?.currency || "USD";
  const orderedAt = order.created_at || new Date().toISOString();

  const { error } = await supabaseAdmin.from("pos_orders").upsert(
    {
      project_id: opts.projectId,
      source: "square",
      external_id: order.id,
      merchant_id: opts.merchantId,
      location_id: opts.locationId,
      items: items as any,
      total_cents: totalCents,
      currency,
      ordered_at: orderedAt,
    },
    { onConflict: "source,external_id" }
  );
  if (error) throw new Error(error.message);
}
