import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  REQUIRED_SCOPES,
  REDIRECT_PATH,
  publicBaseUrl,
  signState,
  squareApiBase,
  squareFetch,
  type SquareEnv,
} from "./square.server";

/* ---------- Build the OAuth authorize URL ---------- */
export const getSquareAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      projectId: z.string().min(1),
      env: z.enum(["sandbox", "production"]).default("sandbox"),
    }).parse(i)
  )
  .handler(async ({ data }) => {
    const appId = process.env.SQUARE_APPLICATION_ID;
    if (!appId) return { ok: false as const, error: "SQUARE_APPLICATION_ID not configured" };

    const nonce = Math.random().toString(36).slice(2);
    const state = signState({ projectId: data.projectId, env: data.env as SquareEnv, nonce });
    const params = new URLSearchParams({
      client_id: appId,
      scope: REQUIRED_SCOPES.join(" "),
      session: "false",
      state,
      redirect_uri: publicBaseUrl() + REDIRECT_PATH,
    });
    const url = `${squareApiBase(data.env as SquareEnv)}/oauth2/authorize?${params.toString()}`;
    return { ok: true as const, url };
  });

/* ---------- Connection status ---------- */
export const getSquareStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: conn } = await supabaseAdmin
      .from("square_connections")
      .select("id, merchant_id, location_id, environment, expires_at, updated_at, scopes")
      .eq("project_id", data.projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let webhookCount = 0;
    let webhookErrors = 0;
    let lastEventAt: string | null = null;
    let orders24h = 0;
    let consecutiveErrors = 0;

    if (conn) {
      const { count: total } = await supabaseAdmin
        .from("square_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", conn.merchant_id)
        .gte("received_at", since);
      webhookCount = total || 0;

      const { count: errs } = await supabaseAdmin
        .from("square_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", conn.merchant_id)
        .not("error", "is", null)
        .gte("received_at", since);
      webhookErrors = errs || 0;

      const { data: last } = await supabaseAdmin
        .from("square_webhook_events")
        .select("received_at")
        .eq("merchant_id", conn.merchant_id)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastEventAt = last?.received_at || null;

      const { data: recent } = await supabaseAdmin
        .from("square_webhook_events")
        .select("error")
        .eq("merchant_id", conn.merchant_id)
        .order("received_at", { ascending: false })
        .limit(20);
      for (const ev of recent || []) {
        if (ev.error != null) consecutiveErrors++;
        else break;
      }

      const { count: oc } = await supabaseAdmin
        .from("pos_orders")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId)
        .gte("ordered_at", since);
      orders24h = oc || 0;
    }

    return {
      connection: conn,
      webhookCount,
      webhookErrors,
      consecutiveErrors,
      lastEventAt,
      orders24h,
      webhookUrl: publicBaseUrl() + "/api/public/square/webhook",
    };
  });

/* ---------- Disconnect ---------- */
export const disconnectSquare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("square_connections")
      .delete()
      .eq("project_id", data.projectId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ---------- Sync Square catalog into mapping table ---------- */
export const syncSquareCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: conn } = await supabaseAdmin
      .from("square_connections")
      .select("*")
      .eq("project_id", data.projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conn) return { ok: false as const, error: "No Square connection" };

    let cursor: string | undefined;
    let totalSynced = 0;
    do {
      const path = `/v2/catalog/list?types=ITEM${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const page: any = await squareFetch({ connectionId: conn.id, path });
      const objects: any[] = page.objects || [];

      for (const obj of objects) {
        const itemData = obj.item_data || {};
        const variations: any[] = itemData.variations || [];
        if (variations.length === 0) {
          await supabaseAdmin.from("square_catalog_map").upsert(
            {
              project_id: data.projectId,
              merchant_id: conn.merchant_id,
              square_object_id: obj.id,
              square_variation_id: null,
              square_name: itemData.name || "Unnamed",
            },
            { onConflict: "project_id,merchant_id,square_object_id,square_variation_id" }
          );
          totalSynced++;
        } else {
          for (const v of variations) {
            const vd = v.item_variation_data || {};
            const name = vd.name && vd.name !== "Regular"
              ? `${itemData.name || "Unnamed"} · ${vd.name}`
              : itemData.name || "Unnamed";
            await supabaseAdmin.from("square_catalog_map").upsert(
              {
                project_id: data.projectId,
                merchant_id: conn.merchant_id,
                square_object_id: obj.id,
                square_variation_id: v.id,
                square_name: name,
              },
              { onConflict: "project_id,merchant_id,square_object_id,square_variation_id" }
            );
            totalSynced++;
          }
        }
      }
      cursor = page.cursor;
    } while (cursor);

    return { ok: true as const, synced: totalSynced };
  });

/* ---------- List catalog map ---------- */
export const listCatalogMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("square_catalog_map")
      .select("*")
      .eq("project_id", data.projectId)
      .order("square_name", { ascending: true });
    if (error) return { ok: false as const, error: error.message, rows: [] };
    return { ok: true as const, rows: rows || [] };
  });

/* ---------- Update one mapping row ---------- */
export const updateCatalogMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      menuSku: z.string().nullable(),
      ignored: z.boolean().optional(),
    }).parse(i)
  )
  .handler(async ({ data }) => {
    const patch: { menu_sku: string | null; ignored?: boolean } = { menu_sku: data.menuSku };
    if (typeof data.ignored === "boolean") patch.ignored = data.ignored;
    const { error } = await supabaseAdmin
      .from("square_catalog_map")
      .update(patch)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ---------- Recent orders feed ---------- */
export const listRecentOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      projectId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(25),
      locationId: z.string().optional(),
    }).parse(i)
  )
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("pos_orders")
      .select("id, external_id, items, total_cents, currency, ordered_at, location_id")
      .eq("project_id", data.projectId);
    if (data.locationId) query = query.eq("location_id", data.locationId);
    const { data: rows, error } = await query
      .order("ordered_at", { ascending: false })
      .limit(data.limit);
    if (error) return { ok: false as const, error: error.message, rows: [] };
    return { ok: true as const, rows: rows || [] };
  });
