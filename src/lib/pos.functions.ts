import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/*
  Unified POS live feed.
  Returns recent normalized orders across all integrated POS sources
  (Toast, Square) for a project, with each line item enriched with the
  resolved internal menu SKU when a mapping exists.
*/
export const getLivePosFeed = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      projectId: z.string().min(1),
      sinceIso: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const sinceIso = data.sinceIso || new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("pos_orders")
      .select("id, source, external_id, items, total_cents, currency, ordered_at, location_id, merchant_id")
      .eq("project_id", data.projectId)
      .gte("ordered_at", sinceIso)
      .order("ordered_at", { ascending: false })
      .limit(data.limit);

    if (error) return { ok: false as const, error: error.message, rows: [] as any[] };
    if (!rows || rows.length === 0) return { ok: true as const, rows: [] as any[] };

    // Build a lookup of toast GUIDs and square variation/object IDs from line items
    const toastGuids = new Set<string>();
    const squareIds = new Set<string>();
    for (const r of rows) {
      const items = (r.items as any[]) || [];
      for (const it of items) {
        if (r.source === "toast" && it.toastItemGuid) toastGuids.add(it.toastItemGuid);
        if (r.source === "square" && (it.squareVariationId || it.squareObjectId)) {
          squareIds.add(it.squareVariationId || it.squareObjectId);
        }
      }
    }

    const toastMap: Record<string, { menuSku: string | null; ignored: boolean }> = {};
    if (toastGuids.size > 0) {
      const { data: tm } = await supabaseAdmin
        .from("toast_menu_map")
        .select("toast_item_guid, menu_sku, ignored")
        .eq("project_id", data.projectId)
        .in("toast_item_guid", [...toastGuids]);
      for (const m of tm || []) {
        toastMap[m.toast_item_guid] = { menuSku: m.menu_sku, ignored: !!m.ignored };
      }
    }

    const squareMap: Record<string, { menuSku: string | null; ignored: boolean }> = {};
    if (squareIds.size > 0) {
      const { data: sm } = await supabaseAdmin
        .from("square_catalog_map")
        .select("square_object_id, square_variation_id, menu_sku, ignored")
        .eq("project_id", data.projectId);
      for (const m of sm || []) {
        const key = m.square_variation_id || m.square_object_id;
        squareMap[key] = { menuSku: m.menu_sku, ignored: !!m.ignored };
      }
    }

    const enriched = rows.map((r) => {
      const items = ((r.items as any[]) || []).map((it: any) => {
        let menuSku: string | null = null;
        let ignored = false;
        if (r.source === "toast" && it.toastItemGuid && toastMap[it.toastItemGuid]) {
          menuSku = toastMap[it.toastItemGuid].menuSku;
          ignored = toastMap[it.toastItemGuid].ignored;
        } else if (r.source === "square") {
          const key = it.squareVariationId || it.squareObjectId;
          if (key && squareMap[key]) {
            menuSku = squareMap[key].menuSku;
            ignored = squareMap[key].ignored;
          }
        }
        return { ...it, menuSku, ignored };
      });
      return { ...r, items };
    });

    return { ok: true as const, rows: enriched };
  });
