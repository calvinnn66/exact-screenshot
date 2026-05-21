import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getConnectionByMerchant,
  persistOrder,
  publicBaseUrl,
  squareFetch,
  verifyWebhookSignature,
  WEBHOOK_PATH,
} from "@/lib/square.server";

export const Route = createFileRoute("/api/public/square/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const sig = request.headers.get("x-square-hmacsha256-signature");

        if (
          !verifyWebhookSignature({
            notificationUrl: publicBaseUrl() + WEBHOOK_PATH,
            rawBody,
            signatureHeader: sig,
          })
        ) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        const eventId: string | undefined = payload.event_id || payload.merchant_id + ":" + payload.created_at;
        const type: string = payload.type || "unknown";
        const merchantId: string | undefined = payload.merchant_id;
        const locationId: string | null = payload.location_id || payload.data?.object?.order?.location_id || null;

        if (!eventId) return new Response("missing event_id", { status: 400 });

        // Idempotency: insert; if duplicate, return 200
        const { error: insErr } = await supabaseAdmin
          .from("square_webhook_events")
          .insert({
            event_id: eventId,
            merchant_id: merchantId || null,
            location_id: locationId,
            type,
            payload,
          });
        if (insErr && !insErr.message.includes("duplicate")) {
          // log but acknowledge so Square doesn't retry forever
          console.error("webhook insert error", insErr);
        }
        if (insErr) {
          return new Response("ok", { status: 200 });
        }

        // Process order events
        try {
          if (type === "order.created" || type === "order.updated" || type === "order.fulfillment.updated") {
            if (!merchantId) throw new Error("no merchant_id");
            const conn = await getConnectionByMerchant(merchantId);
            if (!conn) throw new Error("no connection for merchant");

            const orderObj = payload.data?.object?.order;
            const orderId = orderObj?.id || payload.data?.id;
            if (!orderId) throw new Error("no order id");

            // Fetch full order
            const fetched: any = await squareFetch({
              connectionId: conn.id,
              path: `/v2/orders/${orderId}`,
            });
            const order = fetched.order;
            if (order) {
              await persistOrder({
                projectId: conn.project_id,
                merchantId,
                locationId: order.location_id || locationId,
                order,
              });
            }
          }

          await supabaseAdmin
            .from("square_webhook_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          await supabaseAdmin
            .from("square_webhook_events")
            .update({ error: msg, processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
