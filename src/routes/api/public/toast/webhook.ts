import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getConnectionByRestaurant,
  persistToastOrder,
  toastFetch,
  verifyWebhookSignature,
} from "@/lib/toast.server";

/*
  Toast webhook receiver.
  Toast posts JSON payloads of the form:
  {
    "eventType": "ORDER_MODIFIED",
    "guid": "...event-guid...",
    "restaurantGuid": "...",
    "entityId": "...order-guid...",
    "timestamp": "..."
  }
  Signature header: `toast-signature` (HMAC-SHA256 base64 of raw body).
*/
export const Route = createFileRoute("/api/public/toast/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const sig = request.headers.get("toast-signature");

        if (!verifyWebhookSignature({ rawBody, signatureHeader: sig })) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        const eventId: string | undefined =
          payload.guid || payload.eventId || `${payload.restaurantGuid}:${payload.timestamp}`;
        const type: string = payload.eventType || payload.type || "unknown";
        const restaurantGuid: string | undefined = payload.restaurantGuid;

        if (!eventId) return new Response("missing event id", { status: 400 });

        const { error: insErr } = await supabaseAdmin.from("toast_webhook_events").insert({
          event_id: eventId,
          restaurant_guid: restaurantGuid || null,
          type,
          payload,
        });
        if (insErr && !insErr.message.includes("duplicate")) {
          console.error("toast webhook insert error", insErr);
        }
        if (insErr) {
          // Duplicate (already processed) — ACK so Toast stops retrying
          return new Response("ok", { status: 200 });
        }

        try {
          const isOrderEvent =
            type === "ORDER_CREATED" ||
            type === "ORDER_MODIFIED" ||
            type === "ORDER_PAID" ||
            type === "ORDER_DELETED";
          if (isOrderEvent && restaurantGuid) {
            const conn = await getConnectionByRestaurant(restaurantGuid);
            if (!conn) throw new Error("no connection for restaurant");
            const orderId = payload.entityId || payload.guid;
            if (!orderId) throw new Error("no order id in payload");

            const order: any = await toastFetch({
              connectionId: conn.id,
              path: `/orders/v2/orders/${orderId}`,
            });
            if (order) {
              await persistToastOrder({
                projectId: conn.project_id,
                restaurantGuid,
                order,
              });
            }
          }

          await supabaseAdmin
            .from("toast_webhook_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          await supabaseAdmin
            .from("toast_webhook_events")
            .update({ error: msg, processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
