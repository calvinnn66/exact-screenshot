import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  disconnectSquare,
  getSquareAuthUrl,
  getSquareStatus,
  listCatalogMap,
  listRecentOrders,
  syncSquareCatalog,
  updateCatalogMap,
} from "@/lib/square.functions";

type Props = {
  projectId: string;
  menuSkus: { sku: string; name: string }[];
  onConnectionChange?: (connected: boolean) => void;
};

const css = {
  panel: {
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    background: "#fff",
    overflow: "hidden",
  } as React.CSSProperties,
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid #F1F2F4",
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, color: "#0B0B0C" } as React.CSSProperties,
  subtitle: { fontSize: 11, color: "#6B7280", marginTop: 2 } as React.CSSProperties,
  body: { padding: 16 } as React.CSSProperties,
  kv: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 } as React.CSSProperties,
  kvLabel: { fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 } as React.CSSProperties,
  kvValue: { fontSize: 14, fontWeight: 600, marginTop: 4, color: "#0B0B0C" } as React.CSSProperties,
  mono: { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" } as React.CSSProperties,
  btn: {
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: "1px solid #0B0B0C",
    background: "#0B0B0C",
    color: "#fff",
    cursor: "pointer",
  } as React.CSSProperties,
  btnGhost: {
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: "1px solid #E5E7EB",
    background: "#fff",
    color: "#0B0B0C",
    cursor: "pointer",
  } as React.CSSProperties,
  pillOk: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", borderRadius: 999 } as React.CSSProperties,
  pillWarn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 999 } as React.CSSProperties,
  pillMuted: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 999 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700, color: "#6B7280", letterSpacing: 0.6, borderBottom: "1px solid #E5E7EB", background: "#FAFAFB" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F2F4" },
  select: { padding: "5px 8px", fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff" } as React.CSSProperties,
};

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function SquarePanel({ projectId, menuSkus, onConnectionChange }: Props) {
  const statusFn = useServerFn(getSquareStatus);
  const authUrlFn = useServerFn(getSquareAuthUrl);
  const disconnectFn = useServerFn(disconnectSquare);
  const syncFn = useServerFn(syncSquareCatalog);
  const mapListFn = useServerFn(listCatalogMap);
  const mapUpdateFn = useServerFn(updateCatalogMap);
  const ordersFn = useServerFn(listRecentOrders);

  const [status, setStatus] = useState<any>(null);
  const [mapping, setMapping] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [tab, setTab] = useState<"overview" | "mapping" | "orders">("overview");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const refresh = async () => {
    const s = await statusFn({ data: { projectId } });
    setStatus(s);
    onConnectionChange?.(!!s?.connection);
    if (s?.connection) {
      const [m, o] = await Promise.all([
        mapListFn({ data: { projectId } }),
        ordersFn({ data: { projectId, limit: 25, ...(s.connection?.location_id ? { locationId: s.connection.location_id } : {}) } }),
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

  // Detect callback redirect ?square=connected and refresh
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const sq = u.searchParams.get("square");
    if (sq) {
      u.searchParams.delete("square");
      u.searchParams.delete("reason");
      window.history.replaceState({}, "", u.toString());
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await authUrlFn({ data: { projectId, env } });
      if (res.ok) window.location.href = res.url;
      else alert(res.error);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = () => setConfirmDisconnect(true);
  const doDisconnect = async () => {
    setConfirmDisconnect(false);
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
  const tokenExpiresIn = useMemo(() => {
    if (!status?.connection?.expires_at) return null;
    const days = (new Date(status.connection.expires_at).getTime() - Date.now()) / 86400000;
    return Math.max(0, Math.round(days));
  }, [status]);

  return (
    <>
    <div style={css.panel}>
      <div style={css.head}>
        <div>
          <div style={css.title}>
            Square POS{" "}
            {connected ? (
              <span style={css.pillOk}><span style={{ width: 6, height: 6, borderRadius: 999, background: "#10B981" }} /> Connected</span>
            ) : (
              <span style={css.pillMuted}>Not connected</span>
            )}
          </div>
          <div style={css.subtitle}>Real OAuth + webhook-driven order sync · inventory deducts automatically</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!connected && (
            <select value={env} onChange={(e) => setEnv(e.target.value as any)} style={css.select}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          )}
          {connected ? (
            <>
              <button style={css.btnGhost} onClick={sync} disabled={busy === "sync"}>
                {busy === "sync" ? "Syncing…" : "Sync catalog"}
              </button>
              <button style={css.btnGhost} onClick={disconnect} disabled={busy === "disconnect"}>
                Disconnect
              </button>
            </>
          ) : (
            <button style={css.btn} onClick={connect} disabled={busy === "connect"}>
              {busy === "connect" ? "Redirecting…" : "Connect Square"}
            </button>
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
              {t === "overview" ? "Overview" : t === "mapping" ? `Catalog mapping (${mapping.length})` : `Orders (${orders.length})`}
            </button>
          ))}
        </div>
      )}

      <div style={css.body}>
        {connected && (status?.consecutiveErrors ?? 0) >= 3 && (
          <div style={{ padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6 }}>
            {status.consecutiveErrors} consecutive webhook failures — verify your webhook URL and signature key.
          </div>
        )}
        {!connected ? (
          <div>
            <div style={css.kv}>
              <div><div style={css.kvLabel}>Webhook URL</div><div style={{ ...css.kvValue, ...css.mono, fontSize: 11, wordBreak: "break-all" }}>{status?.webhookUrl || "—"}</div></div>
              <div><div style={css.kvLabel}>Environment</div><div style={css.kvValue}>{env}</div></div>
            </div>
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 14, lineHeight: 1.5 }}>
              Connect a Square account to receive real orders via webhook. Each order is verified by HMAC signature, normalized, persisted, and used to deduct ingredients from inventory based on your recipe mapping.
            </p>
          </div>
        ) : tab === "overview" ? (
          <div style={css.kv}>
            <div><div style={css.kvLabel}>Merchant</div><div style={{ ...css.kvValue, ...css.mono, fontSize: 12 }}>{status.connection.merchant_id}</div></div>
            <div><div style={css.kvLabel}>Location</div><div style={{ ...css.kvValue, ...css.mono, fontSize: 12 }}>{status.connection.location_id || "—"}</div></div>
            <div><div style={css.kvLabel}>Environment</div><div style={css.kvValue}>{status.connection.environment}</div></div>
            <div><div style={css.kvLabel}>Token refresh in</div><div style={css.kvValue}>{tokenExpiresIn} days</div></div>
            <div><div style={css.kvLabel}>Last webhook</div><div style={css.kvValue}>{timeAgo(status.lastEventAt)}</div></div>
            <div><div style={css.kvLabel}>Webhooks (24h)</div><div style={css.kvValue}>{status.webhookCount}{status.webhookErrors > 0 && <span style={{ color: "#DC2626", fontSize: 12 }}> · {status.webhookErrors} errors</span>}</div></div>
            <div><div style={css.kvLabel}>Consecutive errors</div><div style={{ ...css.kvValue, color: (status.consecutiveErrors ?? 0) > 0 ? "#DC2626" : undefined }}>{(status.consecutiveErrors ?? 0) > 0 ? status.consecutiveErrors : "None"}</div></div>
            <div><div style={css.kvLabel}>Orders (24h)</div><div style={css.kvValue}>{status.orders24h}</div></div>
          </div>
        ) : tab === "mapping" ? (
          <div style={{ marginTop: -8, marginLeft: -16, marginRight: -16, marginBottom: -16 }}>
            {mapping.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                No catalog items yet. Click <strong>Sync catalog</strong> to pull from Square.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>Square item</th><th style={css.th}>Variation ID</th><th style={css.th}>Mapped recipe</th><th style={css.th}>Ignore</th></tr></thead>
                  <tbody>
                    {mapping.map((m) => (
                      <tr key={m.id}>
                        <td style={css.td}>{m.square_name}</td>
                        <td style={{ ...css.td, ...css.mono, fontSize: 11, color: "#6B7280" }}>{m.square_variation_id || m.square_object_id}</td>
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
                No orders yet. Ring a sale in Square — it should appear within seconds.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>Time</th><th style={css.th}>Order ID</th><th style={css.th}>Items</th><th style={css.th}>Total</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ ...css.td, ...css.mono, fontSize: 11 }}>{timeAgo(o.ordered_at)}</td>
                        <td style={{ ...css.td, ...css.mono, fontSize: 11, color: "#6B7280" }}>{o.external_id.slice(0, 12)}…</td>
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
    {confirmDisconnect && (
      <div onClick={() => setConfirmDisconnect(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0B0B0C", marginBottom: 8 }}>Disconnect Square?</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 1.5 }}>This removes the OAuth token; webhooks will fail until reconnected.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={css.btnGhost} onClick={() => setConfirmDisconnect(false)}>Cancel</button>
            <button style={{ ...css.btn, background: "#B42318", borderColor: "#B42318" }} onClick={doDisconnect}>Disconnect</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
