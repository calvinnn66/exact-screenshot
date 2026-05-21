import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  exchangeCode,
  squareFetch,
  verifyState,
  type SquareEnv,
} from "@/lib/square.server";

export const Route = createFileRoute("/api/square/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) return redirect(`/?square=error&reason=${encodeURIComponent(error)}`);
        if (!code || !state) return redirect("/?square=error&reason=missing_params");

        const decoded = verifyState(state);
        if (!decoded) return redirect("/?square=error&reason=bad_state");

        try {
          const tokens = await exchangeCode({ code, env: decoded.env });

          // Pick first location for this merchant
          let locationId: string | null = null;
          try {
            const locRes: any = await fetch(
              `${decoded.env === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com"}/v2/locations`,
              {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                  "Square-Version": "2024-12-18",
                },
              }
            ).then((r) => r.json());
            locationId = locRes?.locations?.[0]?.id || null;
          } catch {
            // non-fatal
          }

          const { error: upErr } = await supabaseAdmin
            .from("square_connections")
            .upsert(
              {
                project_id: decoded.projectId,
                merchant_id: tokens.merchant_id,
                location_id: locationId,
                environment: decoded.env,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: tokens.expires_at,
                scopes: [],
              },
              { onConflict: "project_id,merchant_id,location_id" }
            );
          if (upErr) {
            return redirect(`/?square=error&reason=${encodeURIComponent(upErr.message)}`);
          }
          return redirect("/?square=connected");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          return redirect(`/?square=error&reason=${encodeURIComponent(msg)}`);
        }
      },
    },
  },
});

function redirect(path: string) {
  return new Response(null, { status: 302, headers: { Location: path } });
}
