import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  connectToast,
  disconnectToast,
  getToastStatus,
  listRecentToastOrders,
  listToastMenuMap,
  syncToastMenu,
  updateToastMenuMap,
} from "@/lib/toast.functions";

type Props = {
  projectId: string;
  menuSkus: { sku: string; name: string }[];
};

const css = {
  panel: { border: "1px solid #E5E7EB", borderRadius: 10, background: "#fff", overflow: "hidden" } as React.CSSProperties,
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #F1F2F4", flexWrap: "wrap" as const, gap: 8 } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, color: "#0B0B0C" } as React.CSSProperties,
  subtitle: { fontSize: 11, color: "#6B7280", marginTop: 2 } as React.CSSProperties,
  body: { padding: 16 } as React.CSSProperties,
  kv: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 } as React.CSSProperties,
  kvLabel: { fontSize: 10, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: 0.6, fontWeight: 600 } as React.CSSProperties,
  kvValue: { fontSize: 14, fontWeight: 600, marginTop: 4, color: "#0B0B0C" } as React.CSSProperties,
  mono: { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" } as React.CSSProperties,
  btn: { padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "1px solid #0B0B0C", background: "#0B0B0C", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", color: "#0B0B0C", cursor: "pointer" } as React.CSSProperties,
  pillOk: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", borderRadius: 999 } as React.CSSProperties,
  pillMuted: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 999 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: "#6B7280", letterSpacing: 0.6, borderBottom: "1px solid #E5E7EB", background: "#FAFAFB" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F2F4" },
  select: { padding: "5px 8px", fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff" } as React.CSSProperties,
  input: { padding: "8px 10px", fontSize: 13, border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff", width: "100%" } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" } as React.CSSProperties,
};

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function ToastPanel({ projectId, menuSkus }: Props) {
  const statusFn = useServerFn(getToastStatus);
  const connectFn = useServerFn(connectToast);
  const disconnectFn = useServerFn(disconnectToast);
  const syncFn = useServerFn(syncToastMenu);
  const mapListFn = useServerFn(listToastMenuMap);
  const mapUpdateFn = useServerFn(updateToastMenuMap);
  const ordersFn = useServerFn(listRecentToastOrders);

  const [status, setStatus] = useState<any>(null);
  const [mapping, setMapping] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "mapping" | "orders">("overview");

  // Connect form state
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [restaurantGuid, setRestaurantGuid] = useState("");
  const [mgmtGroupGuid, setMgmtGroupGuid] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const s = await statusFn({ data: { projectId } });
    setStatus(s);
    if (s?.connection) {
      const [m, o] = await Promise.all([
        mapListFn({ data: { projectId } }),
        ordersFn({ data: { projectId, limit: 25 } }),
      ]);
      setMapping(m.rows || []);
      setOrders(o.rows || []);
    } else {
      setMapping([]);
      setOrders([]);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const submitConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("connect");
    try {
      const res = await connectFn({
        data: {
          projectId,
          env,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          restaurantGuid: restaurantGuid.trim(),
          managementGroupGuid: mgmtGroupGuid.trim() || undefined,
        },
      });
      if (!res.ok) {
        setError(res.error || "Failed to connect");
      } else {
        setClientSecret("");
        await refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Toast? Webhooks will stop syncing until reconnected.")) return;
    setBusy("disconnect");
    try {
      await disconnectFn({ data: { projectId } });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const res = await syncFn({ data: { projectId } });
      if (!res.ok) alert(res.error);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const connected = !!status?.connection;
  const tokenExpired = !!status?.connection?.expires_at && new Date(status.connection.expires_at) < new Date();

  const tokenExpiresIn = useMemo(() => {
    if (!status?.connection?.expires_at) return null;
    const mins = (new Date(status.connection.expires_at).getTime() - Date.now()) / 60000;
    if (mins <= 0) return "Expired";
    if (mins < 60) return `${Math.round(mins)}m`;
    return `${Math.round(mins / 60)}h`;
  }, [status]);

  return (
    <div style={css.panel}>
      <div style={css.head}>
        <div>
          <div style={css.title}>
            Toast POS{" "}
            {connected ? (
              <span style={css.pillOk}><span style={{ width: 6, height: 6, borderRadius: 999, background: "#10B981" }} /> Connected</span>
            ) : (
              <span style={css.pillMuted}>Not connected</span>
            )}
          </div>
          <div style={css.subtitle}>Restaurant-credential auth + webhook-driven order sync</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {connected && (
            <>
              <button style={css.btnGhost} onClick={sync} disabled={busy === "sync"}>
                {busy === "sync" ? "Syncing…" : "Sync menu"}
              </button>
              <button style={css.btnGhost} onClick={disconnect} disabled={busy === "disconnect"}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {connected && (
        <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid #F1F2F4", background: "#FAFAFB" }}>
          {(["overview", "mapping", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                background: tab === t ? "#fff" : "transparent",
                borderRadius: 6,
                cursor: "pointer",
                color: tab === t ? "#0B0B0C" : "#6B7280",
                border: tab === t ? "1px solid #E5E7EB" : "1px solid transparent",
              }}
            >
              {t === "overview" ? "Overview" : t === "mapping" ? `Menu mapping (${mapping.length})` : `Orders (${orders.length})`}
            </button>
          ))}
        </div>
      )}

      <div style={css.body}>
        {connected && tokenExpired && (
          <div style={{ padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span>Token expired — your Toast credentials need to be renewed to resume syncing.</span>
            <button style={css.btnGhost} onClick={disconnect} disabled={busy === "disconnect"}>
              {busy === "disconnect" ? "Disconnecting…" : "Reconnect"}
            </button>
          </div>
        )}
        {connected && (status?.consecutiveErrors ?? 0) >= 3 && (
          <div style={{ padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6 }}>
            {status.consecutiveErrors} consecutive webhook failures — verify your webhook URL and signature key.
          </div>
        )}
        {!connected ? (
          <form onSubmit={submitConnect} style={{ display: "grid", gap: 12 }}>
            <div style={css.kv}>
              <div>
                <div style={css.kvLabel}>Webhook URL</div>
                <div style={{ ...css.kvValue, ...css.mono, fontSize: 11, wordBreak: "break-all" }}>{status?.webhookUrl || "—"}</div>
              </div>
              <div>
                <div style={css.kvLabel}>Auth type</div>
                <div style={css.kvValue}>Restaurant client credentials</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <div>
                <label style={css.label}>Environment</label>
                <select value={env} onChange={(e) => setEnv(e.target.value as any)} style={css.input}>
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div>
                <label style={css.label}>Restaurant GUID</label>
                <input style={css.input} value={restaurantGuid} onChange={(e) => setRestaurantGuid(e.target.value)} placeholder="e.g. d2c1a... " required />
              </div>
              <div>
                <label style={css.label}>Client ID</label>
                <input style={css.input} value={clientId} onChange={(e) => setClientId(e.target.value)} required />
              </div>
              <div>
                <label style={css.label}>Client Secret</label>
                <input type="password" style={css.input} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required />
              </div>
              <div>
                <label style={css.label}>Management Group GUID <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(optional)</span></label>
                <input style={css.input} value={mgmtGroupGuid} onChange={(e) => setMgmtGroupGuid(e.target.value)} />
              </div>
            </div>

            {error && (
              <div style={{ padding: 10, fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, margin: 0, flex: 1 }}>
                Credentials are issued from Toast Web → Integrations → API access. We verify them via a live login before storing, then auto-refresh the access token before expiry.
              </p>
              <button type="submit" style={css.btn} disabled={busy === "connect"}>
                {busy === "connect" ? "Verifying…" : "Connect Toast"}
              </button>
            </div>
          </form>
        ) : tab === "overview" ? (
          <div style={css.kv}>
            <div><div style={css.kvLabel}>Restaurant GUID</div><div style={{ ...css.kvValue, ...css.mono, fontSize: 12, wordBreak: "break-all" }}>{status.connection.restaurant_guid}</div></div>
            <div><div style={css.kvLabel}>Environment</div><div style={css.kvValue}>{status.connection.environment}</div></div>
            <div><div style={css.kvLabel}>Token refresh in</div><div style={css.kvValue}>{tokenExpiresIn || "—"}</div></div>
            <div><div style={css.kvLabel}>Last webhook</div><div style={css.kvValue}>{timeAgo(status.lastEventAt)}</div></div>
            <div><div style={css.kvLabel}>Webhooks (24h)</div><div style={css.kvValue}>{status.webhookCount}{status.webhookErrors > 0 && <span style={{ color: "#DC2626", fontSize: 12 }}> · {status.webhookErrors} errors</span>}</div></div>
            <div><div style={css.kvLabel}>Consecutive errors</div><div style={{ ...css.kvValue, color: (status.consecutiveErrors ?? 0) > 0 ? "#DC2626" : undefined }}>{(status.consecutiveErrors ?? 0) > 0 ? status.consecutiveErrors : "None"}</div></div>
            <div><div style={css.kvLabel}>Orders (24h)</div><div style={css.kvValue}>{status.orders24h}</div></div>
          </div>
        ) : tab === "mapping" ? (
          <div style={{ marginTop: -8, marginLeft: -16, marginRight: -16, marginBottom: -16 }}>
            {mapping.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                No menu items yet. Click <strong>Sync menu</strong> to pull from Toast.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>Toast item</th><th style={css.th}>Item GUID</th><th style={css.th}>Mapped recipe</th><th style={css.th}>Ignore</th></tr></thead>
                  <tbody>
                    {mapping.map((m) => (
                      <tr key={m.id}>
                        <td style={css.td}>{m.toast_item_name}</td>
                        <td style={{ ...css.td, ...css.mono, fontSize: 11, color: "#6B7280" }}>{m.toast_item_guid.slice(0, 14)}…</td>
                        <td style={css.td}>
                          <select
                            value={m.menu_sku || ""}
                            disabled={m.ignored}
                            onChange={async (e) => {
                              const v = e.target.value || null;
                              setMapping((prev) => prev.map((r) => r.id === m.id ? { ...r, menu_sku: v } : r));
                              await mapUpdateFn({ data: { id: m.id, menuSku: v } });
                            }}
                            style={css.select}
                          >
                            <option value="">— unmapped —</option>
                            {menuSkus.map((s) => (<option key={s.sku} value={s.sku}>{s.name}</option>))}
                          </select>
                        </td>
                        <td style={css.td}>
                          <input
                            type="checkbox"
                            checked={!!m.ignored}
                            onChange={async (e) => {
                              const v = e.target.checked;
                              setMapping((prev) => prev.map((r) => r.id === m.id ? { ...r, ignored: v } : r));
                              await mapUpdateFn({ data: { id: m.id, menuSku: m.menu_sku, ignored: v } });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: -8, marginLeft: -16, marginRight: -16, marginBottom: -16 }}>
            {orders.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                No orders yet. Ring a sale in Toast — it should appear within seconds.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>Time</th><th style={css.th}>Order ID</th><th style={css.th}>Items</th><th style={css.th}>Total</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ ...css.td, ...css.mono, fontSize: 11 }}>{timeAgo(o.ordered_at)}</td>
                        <td style={{ ...css.td, ...css.mono, fontSize: 11, color: "#6B7280" }}>{String(o.external_id).slice(0, 12)}…</td>
                        <td style={css.td}>{(o.items as any[]).map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                        <td style={{ ...css.td, ...css.mono, fontSize: 12 }}>${(o.total_cents / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
