import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authenticateToast,
  publicBaseUrl,
  toastFetch,
  WEBHOOK_PATH,
  type ToastEnv,
} from "./toast.server";

/* ---------- Connect / save credentials ---------- */
export const connectToast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      projectId: z.string().min(1),
      env: z.enum(["sandbox", "production"]).default("sandbox"),
      clientId: z.string().min(4),
      clientSecret: z.string().min(4),
      restaurantGuid: z.string().min(4),
      managementGroupGuid: z.string().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    // Verify credentials by performing a login round-trip first
    let auth: { accessToken: string; expiresAt: string; scopes: string[] };
    try {
      auth = await authenticateToast({
        env: data.env as ToastEnv,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
      });
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Authentication failed" };
    }

    const { error } = await supabaseAdmin.from("toast_connections").upsert(
      {
        project_id: data.projectId,
        restaurant_guid: data.restaurantGuid,
        management_group_guid: data.managementGroupGuid || null,
        environment: data.env,
        client_id: data.clientId,
        client_secret: data.clientSecret,
        access_token: auth.accessToken,
        expires_at: auth.expiresAt,
        scopes: auth.scopes,
      },
      { onConflict: "project_id,restaurant_guid" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ---------- Connection status ---------- */
export const getToastStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: conn } = await supabaseAdmin
      .from("toast_connections")
      .select("id, restaurant_guid, environment, expires_at, updated_at, scopes")
      .eq("project_id", data.projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let webhookCount = 0;
    let webhookErrors = 0;
    let lastEventAt: string | null = null;
    let orders24h = 0;

    if (conn) {
      const { count: total } = await supabaseAdmin
        .from("toast_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_guid", conn.restaurant_guid)
        .gte("received_at", since);
      webhookCount = total || 0;

      const { count: errs } = await supabaseAdmin
        .from("toast_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_guid", conn.restaurant_guid)
        .not("error", "is", null)
        .gte("received_at", since);
      webhookErrors = errs || 0;

      const { data: last } = await supabaseAdmin
        .from("toast_webhook_events")
        .select("received_at")
        .eq("restaurant_guid", conn.restaurant_guid)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastEventAt = last?.received_at || null;

      const { count: oc } = await supabaseAdmin
        .from("pos_orders")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId)
        .eq("source", "toast")
        .gte("ordered_at", since);
      orders24h = oc || 0;
    }

    return {
      connection: conn,
      webhookCount,
      webhookErrors,
      lastEventAt,
      orders24h,
      webhookUrl: publicBaseUrl() + WEBHOOK_PATH,
    };
  });

/* ---------- Disconnect ---------- */
export const disconnectToast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("toast_connections")
      .delete()
      .eq("project_id", data.projectId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ---------- Sync Toast menu into mapping table ---------- */
export const syncToastMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: conn } = await supabaseAdmin
      .from("toast_connections")
      .select("*")
      .eq("project_id", data.projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conn) return { ok: false as const, error: "No Toast connection" };

    // /menus/v2/menus returns the full published menu tree
    let menus: any;
    try {
      menus = await toastFetch({ connectionId: conn.id, path: "/menus/v2/menus" });
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Menu fetch failed" };
    }

    let totalSynced = 0;
    const seen = new Set<string>();

    const walk = (items: any[] | undefined) => {
      if (!items) return;
      for (const it of items) {
        const guid: string | undefined = it.guid || it.itemGuid || it.referenceId;
        const name: string = it.name || it.displayName || "Unnamed";
        if (guid && !seen.has(guid)) {
          seen.add(guid);
        }
        if (Array.isArray(it.menuItems)) walk(it.menuItems);
        if (Array.isArray(it.menuGroups)) walk(it.menuGroups);
      }
    };

    // Toast menu shape: menus[].menuGroups[].menuItems[]
    if (Array.isArray(menus?.menus)) {
      for (const m of menus.menus) walk(m.menuGroups);
    } else if (Array.isArray(menus?.menuGroups)) {
      walk(menus.menuGroups);
    }

    // Re-walk to actually upsert with names (we collected guids; redo with payload)
    const upserts: { guid: string; name: string }[] = [];
    const collect = (items: any[] | undefined) => {
      if (!items) return;
      for (const it of items) {
        if (Array.isArray(it.menuItems)) {
          for (const mi of it.menuItems) {
            const guid = mi.guid || mi.itemGuid || mi.referenceId;
            if (guid) upserts.push({ guid, name: mi.name || "Unnamed" });
          }
        }
        if (Array.isArray(it.menuGroups)) collect(it.menuGroups);
      }
    };
    if (Array.isArray(menus?.menus)) {
      for (const m of menus.menus) collect(m.menuGroups);
    } else if (Array.isArray(menus?.menuGroups)) {
      collect(menus.menuGroups);
    }

    for (const u of upserts) {
      await supabaseAdmin.from("toast_menu_map").upsert(
        {
          project_id: data.projectId,
          restaurant_guid: conn.restaurant_guid,
          toast_item_guid: u.guid,
          toast_item_name: u.name,
        },
        { onConflict: "project_id,restaurant_guid,toast_item_guid" },
      );
      totalSynced++;
    }

    return { ok: true as const, synced: totalSynced };
  });

/* ---------- List menu mappings ---------- */
export const listToastMenuMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("toast_menu_map")
      .select("*")
      .eq("project_id", data.projectId)
      .order("toast_item_name", { ascending: true });
    if (error) return { ok: false as const, error: error.message, rows: [] };
    return { ok: true as const, rows: rows || [] };
  });

/* ---------- Update one mapping row ---------- */
export const updateToastMenuMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      menuSku: z.string().nullable(),
      ignored: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const patch: { menu_sku: string | null; ignored?: boolean } = { menu_sku: data.menuSku };
    if (typeof data.ignored === "boolean") patch.ignored = data.ignored;
    const { error } = await supabaseAdmin
      .from("toast_menu_map")
      .update(patch)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ---------- Recent Toast orders ---------- */
export const listRecentToastOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      projectId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(25),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("pos_orders")
      .select("id, external_id, items, total_cents, currency, ordered_at, location_id")
      .eq("project_id", data.projectId)
      .eq("source", "toast")
      .order("ordered_at", { ascending: false })
      .limit(data.limit);
    if (error) return { ok: false as const, error: error.message, rows: [] };
    return { ok: true as const, rows: rows || [] };
  });
