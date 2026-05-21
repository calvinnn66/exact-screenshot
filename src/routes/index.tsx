import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export const Route = createFileRoute("/")({ component: KitchenIntel });

/* ─── DESIGN TOKENS ─── */
const T = {
  bg: "#F7F7F6",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F1EF",
  surfaceHov: "#EDECE9",
  border: "#E4E3E0",
  borderMid: "#D1CFC9",
  text: "#1A1916",
  textSub: "#6B6860",
  textMuted: "#9E9C96",
  textInv: "#FFFFFF",
  green: "#166534",
  greenBg: "#F0FDF4",
  greenBorder: "#BBF7D0",
  yellow: "#854D0E",
  yellowBg: "#FEFCE8",
  yellowBorder: "#FDE68A",
  red: "#991B1B",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
  accent: "#1A1916",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'DM Mono', 'Fira Code', 'SF Mono', monospace",
};

const pct = (cur: number, max: number) => Math.min(100, Math.round((cur / max) * 100));
type Status = "ok" | "low" | "critical";
const getStatus = (p: number): Status => (p > 60 ? "ok" : p > 30 ? "low" : "critical");
const STATUS: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  ok: { label: "Stocked", color: T.green, bg: T.greenBg, border: T.greenBorder },
  low: { label: "Low", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder },
  critical: { label: "Critical", color: T.red, bg: T.redBg, border: T.redBorder },
};

/* ─── DATA ─── */
type Item = {
  id: string;
  name: string;
  unit: string;
  max: number;
  current: number;
  par: number;
  usage: number[];
};
type Module = { id: string; name: string; icon: string; items: Item[] };
type Modules = Record<string, Module>;

const INIT_MODULES: Modules = {
  flatTop: {
    id: "flatTop", name: "Flat Top", icon: "▬",
    items: [
      { id: "ft1", name: "Burger Patties (8oz)", unit: "lbs", max: 40, current: 28, par: 15, usage: [4, 5, 6, 4, 7, 5, 6] },
      { id: "ft2", name: "Chicken Breast", unit: "lbs", max: 30, current: 12, par: 12, usage: [3, 4, 3, 5, 4, 3, 4] },
      { id: "ft3", name: "Butter", unit: "lbs", max: 10, current: 7, par: 3, usage: [1, 1, 2, 1, 1, 1, 1] },
      { id: "ft4", name: "Sandwich Bread", unit: "loaves", max: 20, current: 8, par: 8, usage: [2, 3, 2, 3, 2, 2, 3] },
      { id: "ft5", name: "American Cheese", unit: "slices", max: 200, current: 80, par: 60, usage: [25, 30, 28, 32, 27, 29, 30] },
    ],
  },
  fryer: {
    id: "fryer", name: "Fryer", icon: "◈",
    items: [
      { id: "fr1", name: "Fry Oil", unit: "gal", max: 15, current: 6, par: 5, usage: [1, 1, 2, 1, 1, 1, 1] },
      { id: "fr2", name: "Frozen Fries", unit: "lbs", max: 80, current: 30, par: 25, usage: [8, 10, 9, 11, 8, 9, 10] },
      { id: "fr3", name: "Chicken Tenders", unit: "lbs", max: 50, current: 18, par: 15, usage: [5, 6, 5, 7, 5, 6, 6] },
      { id: "fr4", name: "Onion Rings", unit: "lbs", max: 30, current: 22, par: 10, usage: [3, 4, 3, 4, 3, 3, 4] },
      { id: "fr5", name: "Breading Mix", unit: "lbs", max: 20, current: 9, par: 6, usage: [2, 2, 2, 2, 2, 2, 2] },
    ],
  },
  line: {
    id: "line", name: "Sauté Line", icon: "◎",
    items: [
      { id: "ln1", name: "Olive Oil", unit: "liters", max: 10, current: 4, par: 3, usage: [1, 1, 1, 1, 1, 1, 1] },
      { id: "ln2", name: "Garlic (minced)", unit: "lbs", max: 8, current: 3, par: 2, usage: [0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5] },
      { id: "ln3", name: "Pasta (dry)", unit: "lbs", max: 40, current: 15, par: 12, usage: [4, 5, 4, 5, 4, 4, 5] },
      { id: "ln4", name: "Heavy Cream", unit: "qts", max: 20, current: 11, par: 6, usage: [2, 2, 2, 3, 2, 2, 2] },
      { id: "ln5", name: "White Wine", unit: "btls", max: 12, current: 5, par: 4, usage: [1, 1, 1, 2, 1, 1, 1] },
    ],
  },
  grill: {
    id: "grill", name: "Char Grill", icon: "≡",
    items: [
      { id: "gr1", name: "Ribeye Steaks", unit: "ea", max: 40, current: 14, par: 12, usage: [3, 4, 4, 5, 4, 3, 4] },
      { id: "gr2", name: "Salmon Filets", unit: "ea", max: 30, current: 11, par: 10, usage: [2, 3, 3, 4, 3, 2, 3] },
      { id: "gr3", name: "Skewers", unit: "ea", max: 60, current: 42, par: 20, usage: [5, 6, 5, 7, 6, 5, 6] },
    ],
  },
  cold: {
    id: "cold", name: "Cold Line", icon: "❄",
    items: [
      { id: "cl1", name: "Mixed Greens", unit: "lbs", max: 25, current: 10, par: 8, usage: [2, 3, 2, 3, 2, 2, 3] },
      { id: "cl2", name: "Tomatoes", unit: "lbs", max: 20, current: 7, par: 6, usage: [2, 2, 2, 2, 2, 2, 2] },
      { id: "cl3", name: "Lemons", unit: "ea", max: 80, current: 55, par: 30, usage: [8, 10, 9, 11, 9, 9, 10] },
    ],
  },
};

/* ─── MOCK AI (deterministic templates, no external call) ─── */
function predictionFor(item: Item): string {
  const avg = item.usage.reduce((a, b) => a + b, 0) / item.usage.length;
  const daysLeft = avg > 0 ? item.current / avg : 99;
  const toReorder = Math.max(1, Math.ceil(item.max - item.current));
  if (daysLeft < 0.5) return `Predicted shortage by dinner service — reorder ${toReorder} ${item.unit} today`;
  if (daysLeft < 1) return `Expected to hit par by lunch — monitor closely`;
  if (avg > item.usage[0] * 1.3) return `Usage trending above baseline — reorder earlier this week`;
  return `On track — suggested reorder: ${toReorder} ${item.unit} by Friday`;
}

function genEODList(modules: Modules): string {
  const lines = Object.values(modules)
    .flatMap((m) =>
      m.items
        .filter((i) => pct(i.current, i.max) < 55)
        .map((i) => `• [${m.name}] ${i.name} — ${i.current}${i.unit} on hand (par ${i.par})`),
    );
  if (!lines.length) return "All stations stocked above par. Light prep day — focus on mise en place and deep-clean rotation.";
  return [
    "Morning Prep — priorities for the crew:",
    "",
    ...lines,
    "",
    "Pull proteins from walk-in first. Verify oil quality on fryer before lunch push.",
  ].join("\n");
}

function genSupplierMsg(modules: Modules): string {
  const lines = Object.values(modules)
    .flatMap((m) => m.items.filter((i) => pct(i.current, i.max) < 40).map((i) => `${i.name} — ${Math.ceil(i.max - i.current)} ${i.unit}`));
  if (!lines.length) return "Hi — no urgent order needed today. Will confirm tomorrow's pull by 10am. Thanks.";
  return [
    "Hi, placing today's order — please confirm by 3pm for next-day delivery:",
    "",
    ...lines.map((l) => `- ${l}`),
    "",
    "Standard drop time works. Thanks!",
  ].join("\n");
}

/* ─── PRIMITIVES ─── */
function Badge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      fontFamily: T.sans, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function Bar({ value, max, status, thick }: { value: number; max: number; status: Status; thick?: boolean }) {
  const p = pct(value, max);
  const col = STATUS[status].color;
  const h = thick ? 8 : 4;
  return (
    <div style={{ width: "100%", height: h, background: T.surfaceAlt, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, height: "100%", background: col, transition: "width 400ms ease, background 200ms" }} />
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 64, H = 22;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / (max - min + 0.001)) * H}`)
    .join(" ");
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/* ─── ITEM ROW ─── */
function ItemRow({
  item, onUpdate, kitchenMode,
}: { item: Item; onUpdate: (val: number) => void; kitchenMode: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [insight, setInsight] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const p = pct(item.current, item.max);
  const status = getStatus(p);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const adjust = (d: number) => onUpdate(Math.max(0, Math.min(item.max, +(item.current + d).toFixed(1))));
  const commit = () => {
    const n = parseFloat(val);
    if (!isNaN(n)) onUpdate(Math.max(0, Math.min(item.max, n)));
    setEditing(false);
    setVal("");
  };

  const ctrlBtn: CSSProperties = {
    width: 32, height: 32, fontSize: 16, fontWeight: 700, background: T.surfaceAlt,
    border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.text,
  };

  if (kitchenMode) {
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: T.text, fontFamily: T.sans }}>{item.name}</span>
          <Badge status={status} />
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 26, color: T.text, marginBottom: 10 }}>
          {item.current}<span style={{ color: T.textMuted, fontSize: 16 }}> / {item.max} {item.unit}</span>
        </div>
        <Bar value={item.current} max={item.max} status={status} thick />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => adjust(-1)} style={{
            flex: 1, height: 52, fontSize: 22, fontWeight: 700, background: T.surfaceAlt,
            border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.text,
          }}>−</button>
          {editing ? (
            <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)}
              onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
              style={{ flex: 2, height: 52, textAlign: "center", fontSize: 20, fontFamily: T.mono, border: `1px solid ${T.borderMid}`, borderRadius: 8 }} />
          ) : (
            <button onClick={() => { setVal(String(item.current)); setEditing(true); }}
              style={{ flex: 2, height: 52, fontFamily: T.mono, fontSize: 18, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer" }}>
              Set
            </button>
          )}
          <button onClick={() => adjust(1)} style={{
            flex: 1, height: 52, fontSize: 22, fontWeight: 700, background: T.accent,
            border: "none", borderRadius: 8, cursor: "pointer", color: T.textInv,
          }}>+</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.sans }}>{item.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>{p}%</span>
          <Badge status={status} />
        </div>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 13, color: T.textSub, marginBottom: 6 }}>
        {item.current} / {item.max} {item.unit} · par {item.par}
      </div>
      <Bar value={item.current} max={item.max} status={status} />
      <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
        <button onClick={() => adjust(-1)} style={ctrlBtn}>−</button>
        {editing ? (
          <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)}
            onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
            style={{ width: 70, height: 32, textAlign: "center", fontFamily: T.mono, border: `1px solid ${T.borderMid}`, borderRadius: 6 }} />
        ) : (
          <button onClick={() => { setVal(String(item.current)); setEditing(true); }}
            style={{ ...ctrlBtn, width: 70, fontFamily: T.mono, fontWeight: 500 }}>
            Set
          </button>
        )}
        <button onClick={() => adjust(1)} style={{ ...ctrlBtn, background: T.accent, color: T.textInv, borderColor: T.accent }}>+</button>
        <button onClick={() => setInsight(predictionFor(item))}
          style={{ marginLeft: "auto", height: 32, padding: "0 10px", fontSize: 11, fontFamily: T.sans, fontWeight: 600,
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.textSub }}>
          Predict
        </button>
      </div>
      {insight && (
        <div style={{ marginTop: 10, padding: "8px 10px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, color: T.text, fontFamily: T.sans, lineHeight: 1.5 }}>
          {insight}
        </div>
      )}
    </div>
  );
}

/* ─── STATION SIDEBAR BUTTON ─── */
function StationButton({ mod, active, onClick }: { mod: Module; active: boolean; onClick: () => void }) {
  const crits = mod.items.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length;
  const lows = mod.items.filter((i) => getStatus(pct(i.current, i.max)) === "low").length;
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", cursor: "pointer",
      background: active ? T.surface : "transparent",
      border: active ? `1px solid ${T.border}` : "1px solid transparent",
      borderRadius: 8, padding: "10px 12px", marginBottom: 4,
      display: "flex", alignItems: "center", gap: 10, fontFamily: T.sans,
    }}>
      <span style={{ fontSize: 14, color: T.textSub, width: 16, textAlign: "center" }}>{mod.icon}</span>
      <span style={{ fontSize: 13, color: T.text, fontWeight: active ? 600 : 500, flex: 1 }}>{mod.name}</span>
      {crits > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.red }} />}
      {crits === 0 && lows > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.yellow }} />}
    </button>
  );
}

/* ─── TABS ─── */
function KitchenTab({
  modules, setModules, kitchenMode,
}: { modules: Modules; setModules: React.Dispatch<React.SetStateAction<Modules>>; kitchenMode: boolean }) {
  const [selected, setSelected] = useState<string>(Object.keys(modules)[0]);
  const mod = modules[selected];

  const updateItem = (modId: string, itemId: string, val: number) =>
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], items: prev[modId].items.map((i) => (i.id === itemId ? { ...i, current: val } : i)) },
    }));

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: kitchenMode ? 0 : 220, borderRight: `1px solid ${T.border}`, padding: kitchenMode ? 0 : 16, overflow: "auto", background: T.bg }}>
        {!kitchenMode && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, fontFamily: T.sans, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Stations</div>
            {Object.values(modules).map((m) => (
              <StationButton key={m.id} mod={m} active={selected === m.id} onClick={() => setSelected(m.id)} />
            ))}
          </>
        )}
      </aside>

      {/* Content */}
      <section style={{ flex: 1, overflow: "auto", padding: kitchenMode ? 20 : 24, background: T.bg }}>
        {kitchenMode && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.values(modules).map((m) => (
              <button key={m.id} onClick={() => setSelected(m.id)} style={{
                background: selected === m.id ? T.accent : T.surface,
                color: selected === m.id ? T.textInv : T.text,
                border: `1px solid ${selected === m.id ? T.accent : T.border}`,
                borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                fontSize: 15, fontWeight: 600, fontFamily: T.sans, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 17 }}>{m.icon}</span>
                {m.name}
              </button>
            ))}
          </div>
        )}
        <h2 style={{ margin: "0 0 4px", fontSize: kitchenMode ? 22 : 17, fontWeight: 700, color: T.text, fontFamily: T.sans }}>{mod.name}</h2>
        {!kitchenMode && (
          <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub, fontFamily: T.sans }}>
            Live inventory — drains automatically during service
          </p>
        )}
        <div style={{ marginTop: 12 }}>
          {mod.items.map((item) => (
            <ItemRow key={item.id} item={item} kitchenMode={kitchenMode}
              onUpdate={(v) => updateItem(mod.id, item.id, v)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportsTab({ modules }: { modules: Modules }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.sans }}>Station Reports</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {Object.values(modules).map((mod) => (
          <div key={mod.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>{mod.icon}</span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.sans }}>{mod.name}</h3>
            </div>
            {mod.items.map((item) => {
              const p = pct(item.current, item.max);
              const s = getStatus(p);
              return (
                <div key={item.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.text, fontFamily: T.sans, fontWeight: 500 }}>{item.name}</span>
                    <Sparkline data={item.usage} color={STATUS[s].color} />
                  </div>
                  <Bar value={item.current} max={item.max} status={s} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, fontFamily: T.mono, color: T.textMuted }}>
                    <span>{item.current}/{item.max} {item.unit}</span>
                    <span>par {item.par}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ modules }: { modules: Modules }) {
  const all = Object.values(modules).flatMap((m) => m.items.map((i) => ({ ...i, mod: m.name })));
  const sorted = [...all].sort((a, b) => pct(a.current, a.max) - pct(b.current, b.max));
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.sans }}>Weekly Analytics</h2>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub, fontFamily: T.sans }}>All items ranked by stock level</p>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.sans }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
              {["Item", "Station", "Stock", "Par", "7-day", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => {
              const s = getStatus(pct(i.current, i.max));
              return (
                <tr key={i.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: T.text, fontWeight: 500 }}>{i.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: T.textSub }}>{i.mod}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: T.mono, color: T.text }}>{i.current}/{i.max} {i.unit}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: T.mono, color: T.textSub }}>{i.par}</td>
                  <td style={{ padding: "10px 14px" }}><Sparkline data={i.usage} color={STATUS[s].color} /></td>
                  <td style={{ padding: "10px 14px" }}><Badge status={s} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EODTab({ modules }: { modules: Modules }) {
  const [eod, setEod] = useState("");
  const [supplier, setSupplier] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const critical = Object.values(modules).flatMap((m) => m.items.filter((i) => getStatus(pct(i.current, i.max)) === "critical"));

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const card: CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 };
  const btn: CSSProperties = { background: T.accent, color: T.textInv, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: T.sans, cursor: "pointer" };
  const pre: CSSProperties = { margin: 0, background: T.surfaceAlt, borderRadius: 6, padding: 14, fontSize: 12, fontFamily: T.sans, color: T.text, whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 280, overflowY: "auto", border: `1px solid ${T.border}` };
  const empty: CSSProperties = { background: T.surfaceAlt, borderRadius: 6, padding: 22, textAlign: "center", fontSize: 12, color: T.textMuted, fontFamily: T.sans, border: `1px dashed ${T.border}` };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      {critical.length > 0 && (
        <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.red, fontFamily: T.sans, marginBottom: 8 }}>
            {critical.length} CRITICAL {critical.length === 1 ? "ITEM" : "ITEMS"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {critical.map((i) => (
              <span key={i.id} style={{ background: T.surface, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontFamily: T.sans, fontWeight: 600 }}>
                {i.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* Prep List */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.sans }}>Morning Prep List</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted, fontFamily: T.sans }}>For kitchen crew</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {eod && (
                <button onClick={() => copy(eod, "eod")} style={{ ...btn, background: T.surface, color: T.text, border: `1px solid ${T.border}` }}>
                  {copied === "eod" ? "Copied" : "Copy"}
                </button>
              )}
              <button onClick={() => setEod(genEODList(modules))} style={btn}>Generate</button>
            </div>
          </div>
          {eod ? <pre style={pre}>{eod}</pre> : <div style={empty}>Generate a prep list based on tonight's stock</div>}
        </div>

        {/* Supplier */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.sans }}>Supplier Order</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted, fontFamily: T.sans }}>Send to vendor</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {supplier && (
                <button onClick={() => copy(supplier, "sup")} style={{ ...btn, background: T.surface, color: T.text, border: `1px solid ${T.border}` }}>
                  {copied === "sup" ? "Copied" : "Copy"}
                </button>
              )}
              <button onClick={() => setSupplier(genSupplierMsg(modules))} style={btn}>Draft</button>
            </div>
          </div>
          {supplier ? <pre style={pre}>{supplier}</pre> : <div style={empty}>Draft a supplier message for all critical stock items</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ─── */
function KitchenIntel() {
  const [modules, setModules] = useState<Modules>(INIT_MODULES);
  const [tab, setTab] = useState("kitchen");
  const [kitchenMode, setKitchenMode] = useState(false);
  const [clock, setClock] = useState(new Date());

  // Service drain simulation
  useEffect(() => {
    const id = setInterval(() => {
      setModules((prev) => {
        const next: Modules = {};
        for (const k of Object.keys(prev)) {
          const m = prev[k];
          next[k] = {
            ...m,
            items: m.items.map((item) => {
              const tickIdx = Math.floor(Date.now() / 9000) % 7;
              const rate = (item.usage[tickIdx] / 480) * (0.7 + Math.random() * 0.6);
              return { ...item, current: Math.max(0, parseFloat((item.current - rate).toFixed(2))) };
            }),
          };
        }
        return next;
      });
    }, 9000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const all = Object.values(modules).flatMap((m) => m.items);
  const crits = all.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length;
  const lows = all.filter((i) => getStatus(pct(i.current, i.max)) === "low").length;

  const TABS = [
    { id: "kitchen", label: "Kitchen" },
    { id: "reports", label: "Reports" },
    { id: "weekly", label: "Analytics" },
    { id: "eod", label: "EOD & Orders" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: T.sans, color: T.text }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "12px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: T.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: T.textInv, fontFamily: T.mono, fontWeight: 700, fontSize: 14 }}>KI</div>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: T.sans, letterSpacing: -0.2 }}>Kitchen Intel</h1>
        </div>

        <nav style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? T.surfaceAlt : "transparent",
              border: "none", borderRadius: 6, padding: "6px 12px",
              fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              fontFamily: T.sans, color: tab === t.id ? T.text : T.textSub, cursor: "pointer",
            }}>{t.label}</button>
          ))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {crits > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.red }} />
              {crits} Critical
            </span>
          )}
          {lows > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellowBorder}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.yellow }} />
              {lows} Low
            </span>
          )}
          <button onClick={() => setKitchenMode((v) => !v)} style={{
            background: kitchenMode ? T.accent : T.surface, color: kitchenMode ? T.textInv : T.text,
            border: `1px solid ${kitchenMode ? T.accent : T.border}`, borderRadius: 6,
            padding: "6px 12px", fontSize: 12, fontWeight: 600, fontFamily: T.sans, cursor: "pointer",
          }}>
            {kitchenMode ? "Exit Kitchen Mode" : "Kitchen Mode"}
          </button>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>
            {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </header>

      {kitchenMode && tab === "kitchen" && (
        <div style={{ background: T.yellowBg, borderBottom: `1px solid ${T.yellowBorder}`, padding: "8px 24px", fontSize: 12, color: T.yellow, fontFamily: T.sans, fontWeight: 600 }}>
          🖐️ Kitchen Mode — large tap targets active · tap station icons to switch
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "kitchen" && <KitchenTab modules={modules} setModules={setModules} kitchenMode={kitchenMode} />}
        {tab === "reports" && <ReportsTab modules={modules} />}
        {tab === "weekly" && <AnalyticsTab modules={modules} />}
        {tab === "eod" && <EODTab modules={modules} />}
      </div>
    </div>
  );
}
