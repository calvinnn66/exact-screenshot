import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const Route = createFileRoute("/")({ component: KitchenIntel });

/* ─── DARK INDUSTRIAL DESIGN TOKENS ─── */
const T = {
  bg: "#0B0D10",
  bgDeep: "#070809",
  surface: "#13161B",
  surfaceAlt: "#191D24",
  surfaceHov: "#1F242C",
  surfaceElev: "#1B2029",
  border: "#22272F",
  borderMid: "#2C323C",
  borderStrong: "#39414D",
  text: "#F1F3F5",
  textSub: "#A8B0BB",
  textMuted: "#6B7480",
  textDim: "#4A5260",
  textInv: "#0B0D10",
  green: "#34D399",
  greenBg: "rgba(52,211,153,0.10)",
  greenBorder: "rgba(52,211,153,0.30)",
  yellow: "#FBBF24",
  yellowBg: "rgba(251,191,36,0.10)",
  yellowBorder: "rgba(251,191,36,0.30)",
  red: "#F87171",
  redBg: "rgba(248,113,113,0.10)",
  redBorder: "rgba(248,113,113,0.35)",
  blue: "#60A5FA",
  blueBg: "rgba(96,165,250,0.10)",
  blueBorder: "rgba(96,165,250,0.30)",
  accent: "#E7EAEE",
  accentSolid: "#F1F3F5",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'DM Mono', 'JetBrains Mono', 'SF Mono', monospace",
};

const pct = (cur: number, max: number) => Math.min(100, Math.round((cur / max) * 100));
type Status = "ok" | "low" | "critical";
const getStatus = (p: number): Status => (p > 60 ? "ok" : p > 30 ? "low" : "critical");
const STATUS: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  ok: { label: "Stocked", color: T.green, bg: T.greenBg, border: T.greenBorder },
  low: { label: "Low", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder },
  critical: { label: "Critical", color: T.red, bg: T.redBg, border: T.redBorder },
};

type Role = "owner" | "manager" | "prep" | "line";
const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner", manager: "Manager", prep: "Prep Cook", line: "Line Cook",
};

/* ─── DATA ─── */
type Category = "Protein" | "Produce" | "Dairy" | "Dry" | "Oil" | "Bakery" | "Other";
type Item = {
  id: string; name: string; unit: string; max: number; current: number; par: number;
  usage: number[]; category: Category; updatedAt: number;
};
type Module = { id: string; name: string; icon: string; items: Item[] };
type Modules = Record<string, Module>;

const NOW = Date.now();
const u = (mins: number) => NOW - mins * 60_000;

const INIT_MODULES: Modules = {
  flatTop: {
    id: "flatTop", name: "Flat Top", icon: "▬",
    items: [
      { id: "ft1", name: "Burger Patties (8oz)", unit: "lbs", max: 40, current: 28, par: 15, usage: [4,5,6,4,7,5,6], category: "Protein", updatedAt: u(12) },
      { id: "ft2", name: "Chicken Breast", unit: "lbs", max: 30, current: 12, par: 12, usage: [3,4,3,5,4,3,4], category: "Protein", updatedAt: u(34) },
      { id: "ft3", name: "Butter", unit: "lbs", max: 10, current: 7, par: 3, usage: [1,1,2,1,1,1,1], category: "Dairy", updatedAt: u(90) },
      { id: "ft4", name: "Sandwich Bread", unit: "loaves", max: 20, current: 8, par: 8, usage: [2,3,2,3,2,2,3], category: "Bakery", updatedAt: u(50) },
      { id: "ft5", name: "American Cheese", unit: "slices", max: 200, current: 80, par: 60, usage: [25,30,28,32,27,29,30], category: "Dairy", updatedAt: u(22) },
    ],
  },
  fryer: {
    id: "fryer", name: "Fryer", icon: "◈",
    items: [
      { id: "fr1", name: "Fry Oil", unit: "gal", max: 15, current: 6, par: 5, usage: [1,1,2,1,1,1,1], category: "Oil", updatedAt: u(140) },
      { id: "fr2", name: "Frozen Fries", unit: "lbs", max: 80, current: 30, par: 25, usage: [8,10,9,11,8,9,10], category: "Dry", updatedAt: u(15) },
      { id: "fr3", name: "Chicken Tenders", unit: "lbs", max: 50, current: 18, par: 15, usage: [5,6,5,7,5,6,6], category: "Protein", updatedAt: u(28) },
      { id: "fr4", name: "Onion Rings", unit: "lbs", max: 30, current: 22, par: 10, usage: [3,4,3,4,3,3,4], category: "Dry", updatedAt: u(70) },
      { id: "fr5", name: "Breading Mix", unit: "lbs", max: 20, current: 9, par: 6, usage: [2,2,2,2,2,2,2], category: "Dry", updatedAt: u(110) },
    ],
  },
  line: {
    id: "line", name: "Sauté Line", icon: "◎",
    items: [
      { id: "ln1", name: "Olive Oil", unit: "L", max: 10, current: 4, par: 3, usage: [1,1,1,1,1,1,1], category: "Oil", updatedAt: u(80) },
      { id: "ln2", name: "Garlic (minced)", unit: "lbs", max: 8, current: 3, par: 2, usage: [0.5,0.5,0.5,1,0.5,0.5,0.5], category: "Produce", updatedAt: u(45) },
      { id: "ln3", name: "Pasta (dry)", unit: "lbs", max: 40, current: 15, par: 12, usage: [4,5,4,5,4,4,5], category: "Dry", updatedAt: u(25) },
      { id: "ln4", name: "Heavy Cream", unit: "qts", max: 20, current: 11, par: 6, usage: [2,2,2,3,2,2,2], category: "Dairy", updatedAt: u(38) },
      { id: "ln5", name: "White Wine", unit: "btls", max: 12, current: 5, par: 4, usage: [1,1,1,2,1,1,1], category: "Other", updatedAt: u(200) },
    ],
  },
  grill: {
    id: "grill", name: "Char Grill", icon: "≡",
    items: [
      { id: "gr1", name: "Ribeye Steaks", unit: "ea", max: 40, current: 14, par: 12, usage: [3,4,4,5,4,3,4], category: "Protein", updatedAt: u(18) },
      { id: "gr2", name: "Salmon Filets", unit: "ea", max: 30, current: 11, par: 10, usage: [2,3,3,4,3,2,3], category: "Protein", updatedAt: u(60) },
      { id: "gr3", name: "Skewers", unit: "ea", max: 60, current: 42, par: 20, usage: [5,6,5,7,6,5,6], category: "Protein", updatedAt: u(75) },
    ],
  },
  cold: {
    id: "cold", name: "Cold Line", icon: "❄",
    items: [
      { id: "cl1", name: "Mixed Greens", unit: "lbs", max: 25, current: 10, par: 8, usage: [2,3,2,3,2,2,3], category: "Produce", updatedAt: u(20) },
      { id: "cl2", name: "Tomatoes", unit: "lbs", max: 20, current: 7, par: 6, usage: [2,2,2,2,2,2,2], category: "Produce", updatedAt: u(55) },
      { id: "cl3", name: "Lemons", unit: "ea", max: 80, current: 55, par: 30, usage: [8,10,9,11,9,9,10], category: "Produce", updatedAt: u(95) },
    ],
  },
};

/* ─── AI HELPERS (deterministic) ─── */
function hoursLeft(item: Item) {
  const avg = item.usage.reduce((a, b) => a + b, 0) / item.usage.length;
  // assume an 8-hour service per day-of-usage
  const perHour = avg / 8;
  return perHour > 0 ? item.current / perHour : 999;
}
function predictionFor(item: Item): string {
  const hl = hoursLeft(item);
  const reorder = Math.max(1, Math.ceil(item.max - item.current));
  if (hl < 4) return `Runs out in ~${hl.toFixed(1)}h — reorder ${reorder} ${item.unit} immediately`;
  if (hl < 12) return `Predicted depletion by next service — order ${reorder} ${item.unit} tonight`;
  if (hl < 24) return `Hits par tomorrow — schedule ${reorder} ${item.unit} with morning delivery`;
  return `On track — ${reorder} ${item.unit} suggested by Friday`;
}
function depletionLabel(item: Item): string {
  const hl = hoursLeft(item);
  if (hl < 1) return "< 1h";
  if (hl < 24) return `${hl.toFixed(1)}h`;
  return `${(hl / 24).toFixed(1)}d`;
}
function relTime(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function genEODList(modules: Modules): string {
  const lines = Object.values(modules).flatMap((m) =>
    m.items.filter((i) => pct(i.current, i.max) < 55).map((i) =>
      `• [${m.name}] ${i.name} — ${i.current}${i.unit} on hand (par ${i.par})`),
  );
  if (!lines.length) return "All stations stocked above par. Light prep day — focus on mise en place and deep-clean rotation.";
  return ["Morning Prep — priorities for the crew:", "", ...lines, "", "Pull proteins from walk-in first. Verify oil quality on fryer before lunch push."].join("\n");
}
function genSupplierMsg(modules: Modules): string {
  const lines = Object.values(modules).flatMap((m) =>
    m.items.filter((i) => pct(i.current, i.max) < 40).map((i) =>
      `${i.name} — ${Math.ceil(i.max - i.current)} ${i.unit}`));
  if (!lines.length) return "Hi — no urgent order needed today. Will confirm tomorrow's pull by 10am. Thanks.";
  return ["Hi, placing today's order — please confirm by 3pm for next-day delivery:", "", ...lines.map((l) => `- ${l}`), "", "Standard drop time works. Thanks!"].join("\n");
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
      <div style={{ width: `${p}%`, height: "100%", background: col, transition: "width 400ms ease, background 200ms", boxShadow: status === "critical" ? `0 0 12px ${col}66` : "none" }} />
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 64, H = 22;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / (max - min + 0.001)) * H}`).join(" ");
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: 18, ...style,
    }}>{children}</div>
  );
}

function Skeleton({ h = 14, w = "100%" }: { h?: number; w?: number | string }) {
  return (
    <div style={{
      height: h, width: w, background: `linear-gradient(90deg, ${T.surfaceAlt}, ${T.surfaceHov}, ${T.surfaceAlt})`,
      backgroundSize: "200% 100%", borderRadius: 6, animation: "ki-shimmer 1.4s linear infinite",
    }} />
  );
}

/* ─── ITEM ROW ─── */
function ItemRow({ item, onUpdate, kitchenMode, readOnly }: {
  item: Item; onUpdate: (val: number) => void; kitchenMode: boolean; readOnly: boolean;
}) {
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
    setEditing(false); setVal("");
  };

  const ctrlBtn: CSSProperties = {
    width: 32, height: 32, fontSize: 16, fontWeight: 700, background: T.surfaceAlt,
    border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.text,
    transition: "background 120ms",
  };

  if (kitchenMode) {
    return (
      <div style={{
        background: T.surface,
        border: `1px solid ${status === "critical" ? T.redBorder : T.border}`,
        borderRadius: 12, padding: 16, marginBottom: 12,
        boxShadow: status === "critical" ? `0 0 0 1px ${T.redBorder} inset` : "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{item.name}</span>
          <Badge status={status} />
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 28, color: T.text, marginBottom: 10, letterSpacing: -0.5 }}>
          {item.current}<span style={{ color: T.textMuted, fontSize: 16 }}> / {item.max} {item.unit}</span>
        </div>
        <Bar value={item.current} max={item.max} status={status} thick />
        {!readOnly && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => adjust(-1)} style={{ flex: 1, height: 56, fontSize: 24, fontWeight: 700, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", color: T.text }}>−</button>
            {editing ? (
              <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)}
                onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
                style={{ flex: 2, height: 56, textAlign: "center", fontSize: 22, fontFamily: T.mono, background: T.surfaceAlt, border: `1px solid ${T.borderStrong}`, borderRadius: 10, color: T.text }} />
            ) : (
              <button onClick={() => { setVal(String(item.current)); setEditing(true); }}
                style={{ flex: 2, height: 56, fontFamily: T.mono, fontSize: 18, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", color: T.text }}>Set</button>
            )}
            <button onClick={() => adjust(1)} style={{ flex: 1, height: 56, fontSize: 24, fontWeight: 700, background: T.accentSolid, border: "none", borderRadius: 10, cursor: "pointer", color: T.textInv }}>+</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${status === "critical" ? T.redBorder : T.border}`,
      borderRadius: 10, padding: 12, marginBottom: 8, transition: "border-color 200ms",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textMuted }}>{p}%</span>
          <Badge status={status} />
        </div>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 13, color: T.textSub, marginBottom: 6 }}>
        {item.current} / {item.max} {item.unit} · par {item.par} · {depletionLabel(item)} left
      </div>
      <Bar value={item.current} max={item.max} status={status} />
      {!readOnly && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
          <button onClick={() => adjust(-1)} style={ctrlBtn}>−</button>
          {editing ? (
            <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)}
              onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
              style={{ width: 70, height: 32, textAlign: "center", fontFamily: T.mono, background: T.surfaceAlt, border: `1px solid ${T.borderStrong}`, borderRadius: 6, color: T.text }} />
          ) : (
            <button onClick={() => { setVal(String(item.current)); setEditing(true); }}
              style={{ ...ctrlBtn, width: 70, fontFamily: T.mono, fontWeight: 500 }}>Set</button>
          )}
          <button onClick={() => adjust(1)} style={{ ...ctrlBtn, background: T.accentSolid, color: T.textInv, borderColor: T.accentSolid }}>+</button>
          <button onClick={() => setInsight(predictionFor(item))}
            style={{ marginLeft: "auto", height: 32, padding: "0 10px", fontSize: 11, fontWeight: 600,
              background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: 6, cursor: "pointer", color: T.blue }}>
            ✦ Predict
          </button>
        </div>
      )}
      {insight && (
        <div style={{ marginTop: 10, padding: "8px 10px", background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: 6, fontSize: 12, color: T.text, lineHeight: 1.5 }}>
          <span style={{ color: T.blue, fontWeight: 700, marginRight: 6 }}>AI</span>{insight}
        </div>
      )}
    </div>
  );
}

/* ─── SIDEBAR BTN ─── */
function StationButton({ mod, active, onClick }: { mod: Module; active: boolean; onClick: () => void }) {
  const crits = mod.items.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length;
  const lows = mod.items.filter((i) => getStatus(pct(i.current, i.max)) === "low").length;
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", cursor: "pointer",
      background: active ? T.surfaceElev : "transparent",
      border: active ? `1px solid ${T.border}` : "1px solid transparent",
      borderRadius: 8, padding: "10px 12px", marginBottom: 4,
      display: "flex", alignItems: "center", gap: 10,
      transition: "background 120ms",
    }}>
      <span style={{ fontSize: 14, color: T.textSub, width: 16, textAlign: "center" }}>{mod.icon}</span>
      <span style={{ fontSize: 13, color: T.text, fontWeight: active ? 600 : 500, flex: 1 }}>{mod.name}</span>
      {crits > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.red, boxShadow: `0 0 6px ${T.red}` }} />}
      {crits === 0 && lows > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.yellow }} />}
    </button>
  );
}

/* ─── KITCHEN TAB ─── */
function KitchenTab({ modules, setModules, kitchenMode, role }: {
  modules: Modules; setModules: React.Dispatch<React.SetStateAction<Modules>>; kitchenMode: boolean; role: Role;
}) {
  const [selected, setSelected] = useState<string>(Object.keys(modules)[0]);
  const mod = modules[selected];
  const readOnly = role === "line";

  const updateItem = (modId: string, itemId: string, val: number) =>
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], items: prev[modId].items.map((i) => (i.id === itemId ? { ...i, current: val, updatedAt: Date.now() } : i)) },
    }));

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <aside style={{ width: kitchenMode ? 0 : 220, borderRight: `1px solid ${T.border}`, padding: kitchenMode ? 0 : 16, overflow: "auto", background: T.bgDeep, flexShrink: 0 }} className="ki-side">
        {!kitchenMode && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Stations</div>
            {Object.values(modules).map((m) => (
              <StationButton key={m.id} mod={m} active={selected === m.id} onClick={() => setSelected(m.id)} />
            ))}
          </>
        )}
      </aside>
      <section style={{ flex: 1, overflow: "auto", padding: kitchenMode ? 20 : 24, background: T.bg }}>
        {kitchenMode && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.values(modules).map((m) => (
              <button key={m.id} onClick={() => setSelected(m.id)} style={{
                background: selected === m.id ? T.accentSolid : T.surface,
                color: selected === m.id ? T.textInv : T.text,
                border: `1px solid ${selected === m.id ? T.accentSolid : T.border}`,
                borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 17 }}>{m.icon}</span>{m.name}
              </button>
            ))}
          </div>
        )}
        <h2 style={{ margin: "0 0 4px", fontSize: kitchenMode ? 22 : 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{mod.name}</h2>
        {!kitchenMode && (
          <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub }}>
            Live inventory — drains automatically during service · {role === "line" ? "Read-only access" : "Tap to adjust"}
          </p>
        )}
        <div style={{ marginTop: 12 }}>
          {mod.items.map((item) => (
            <ItemRow key={item.id} item={item} kitchenMode={kitchenMode} readOnly={readOnly}
              onUpdate={(v) => updateItem(mod.id, item.id, v)} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── FULL INVENTORY TAB ─── */
type SortKey = "name" | "station" | "current" | "par" | "max" | "status" | "depletion" | "updated";
function InventoryTab({ modules, setModules, role }: { modules: Modules; setModules: React.Dispatch<React.SetStateAction<Modules>>; role: Role }) {
  const [q, setQ] = useState("");
  const [station, setStation] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("status");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const canEdit = role === "owner" || role === "manager";

  const flat = useMemo(() => Object.values(modules).flatMap((m) =>
    m.items.map((i) => ({ ...i, modId: m.id, modName: m.name }))), [modules]);

  const filtered = flat.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (station !== "all" && i.modId !== station) return false;
    if (category !== "all" && i.category !== category) return false;
    if (statusF !== "all" && getStatus(pct(i.current, i.max)) !== statusF) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const m = dir === "asc" ? 1 : -1;
    switch (sort) {
      case "name": return a.name.localeCompare(b.name) * m;
      case "station": return a.modName.localeCompare(b.modName) * m;
      case "current": return (a.current - b.current) * m;
      case "par": return (a.par - b.par) * m;
      case "max": return (a.max - b.max) * m;
      case "depletion": return (hoursLeft(a) - hoursLeft(b)) * m;
      case "updated": return (a.updatedAt - b.updatedAt) * m;
      case "status": return (pct(a.current, a.max) - pct(b.current, b.max)) * m;
    }
  });

  const updateField = (modId: string, itemId: string, patch: Partial<Item>) =>
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], items: prev[modId].items.map((i) => i.id === itemId ? { ...i, ...patch, updatedAt: Date.now() } : i) },
    }));

  const removeItem = (modId: string, itemId: string) =>
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], items: prev[modId].items.filter((i) => i.id !== itemId) },
    }));

  const addItem = () => {
    const modId = station === "all" ? Object.keys(modules)[0] : station;
    const id = `n${Date.now()}`;
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], items: [...prev[modId].items, {
        id, name: "New Item", unit: "ea", max: 10, current: 5, par: 3,
        usage: [1, 1, 1, 1, 1, 1, 1], category: "Other", updatedAt: Date.now(),
      }] },
    }));
  };

  const headerCell = (label: string, key: SortKey) => (
    <th onClick={() => { if (sort === key) setDir(dir === "asc" ? "desc" : "asc"); else { setSort(key); setDir("asc"); } }}
      style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label} {sort === key && <span style={{ color: T.textMuted }}>{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );

  const inputStyle: CSSProperties = {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6,
    padding: "6px 10px", fontSize: 12, color: T.text, fontFamily: T.sans, height: 30,
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Full Inventory</h2>
          <p style={{ margin: 0, fontSize: 12, color: T.textSub }}>{sorted.length} of {flat.length} items · synced across stations</p>
        </div>
        {canEdit && (
          <button onClick={addItem} style={{ background: T.accentSolid, color: T.textInv, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Item</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…"
          style={{ ...inputStyle, flex: "1 1 220px", minWidth: 180 }} />
        <select value={station} onChange={(e) => setStation(e.target.value)} style={inputStyle}>
          <option value="all">All Stations</option>
          {Object.values(modules).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
          <option value="all">All Categories</option>
          {(["Protein", "Produce", "Dairy", "Dry", "Oil", "Bakery", "Other"] as Category[]).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={inputStyle}>
          <option value="all">All Status</option>
          <option value="ok">Stocked</option>
          <option value="low">Low</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bgDeep }}>
              {headerCell("Item", "name")}
              {headerCell("Station", "station")}
              {headerCell("Current", "current")}
              {headerCell("Par", "par")}
              {headerCell("Max", "max")}
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.5 }}>Unit</th>
              {headerCell("Status", "status")}
              {headerCell("Predicted", "depletion")}
              {headerCell("Updated", "updated")}
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => {
              const s = getStatus(pct(i.current, i.max));
              const isCrit = s === "critical";
              return (
                <tr key={i.id} style={{ borderBottom: `1px solid ${T.border}`, background: isCrit ? T.redBg : "transparent" }}>
                  <td style={{ padding: "8px 12px" }}>
                    {canEdit ? (
                      <input value={i.name} onChange={(e) => updateField(i.modId, i.id, { name: e.target.value })}
                        style={{ background: "transparent", border: "none", color: T.text, fontSize: 13, fontWeight: 500, width: "100%", outline: "none" }} />
                    ) : <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{i.name}</span>}
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: T.textSub }}>{i.modName}</td>
                  <td style={{ padding: "8px 12px", fontFamily: T.mono, fontSize: 12, color: T.text }}>
                    {canEdit ? (
                      <input type="number" value={i.current} onChange={(e) => updateField(i.modId, i.id, { current: Math.max(0, parseFloat(e.target.value) || 0) })}
                        style={{ width: 64, ...inputStyle, height: 26, padding: "2px 6px", fontFamily: T.mono }} />
                    ) : i.current}
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: T.mono, fontSize: 12, color: T.textSub }}>
                    {canEdit ? (
                      <input type="number" value={i.par} onChange={(e) => updateField(i.modId, i.id, { par: Math.max(0, parseFloat(e.target.value) || 0) })}
                        style={{ width: 56, ...inputStyle, height: 26, padding: "2px 6px", fontFamily: T.mono }} />
                    ) : i.par}
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: T.mono, fontSize: 12, color: T.textSub }}>
                    {canEdit ? (
                      <input type="number" value={i.max} onChange={(e) => updateField(i.modId, i.id, { max: Math.max(1, parseFloat(e.target.value) || 1) })}
                        style={{ width: 56, ...inputStyle, height: 26, padding: "2px 6px", fontFamily: T.mono }} />
                    ) : i.max}
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: T.textMuted, fontFamily: T.mono }}>{i.unit}</td>
                  <td style={{ padding: "8px 12px" }}><Badge status={s} /></td>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: isCrit ? T.red : T.textSub, fontFamily: T.mono, fontWeight: isCrit ? 600 : 400 }}>{depletionLabel(i)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: T.textMuted }}>{relTime(i.updatedAt)}</td>
                  {canEdit && (
                    <td style={{ padding: "8px 12px" }}>
                      <button onClick={() => removeItem(i.modId, i.id)}
                        style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textSub, borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Remove</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── HEATMAP TAB ─── */
function HeatmapTab({ modules }: { modules: Modules }) {
  const stations = Object.values(modules);
  const bottlenecks = stations.filter((m) =>
    m.items.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length >= 2);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Kitchen Heatmap</h2>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub }}>Real-time depletion intensity across stations</p>

      {bottlenecks.length > 0 && (
        <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>⚠ Operational Bottleneck</div>
          <div style={{ fontSize: 13, color: T.text }}>
            {bottlenecks.map((b) => b.name).join(" · ")} have multiple critical items. Re-route prep or pull from walk-in immediately.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        {stations.map((m) => (
          <Card key={m.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18, color: T.textSub }}>{m.icon}</span>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{m.name}</h3>
              </div>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.mono }}>{m.items.length} items</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))", gap: 6 }}>
              {m.items.map((i) => {
                const p = pct(i.current, i.max);
                const s = getStatus(p);
                const col = STATUS[s].color;
                const intensity = 1 - p / 100;
                return (
                  <div key={i.id} title={`${i.name} — ${p}%`} style={{
                    aspectRatio: "1", borderRadius: 6,
                    background: s === "critical"
                      ? `${col}${Math.round(0.25 + intensity * 0.55 * 255).toString(16).padStart(2, "0")}`
                      : s === "low" ? `${col}33` : `${col}1a`,
                    border: `1px solid ${col}55`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: T.text, fontFamily: T.mono, padding: 4, textAlign: "center", lineHeight: 1.1,
                    boxShadow: s === "critical" ? `0 0 12px ${col}44` : "none",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{p}%</span>
                    <span style={{ fontSize: 8, color: T.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", whiteSpace: "nowrap" }}>{i.name.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, fontSize: 11, color: T.textSub, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.green }} /> Stocked &gt; 60%</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.yellow }} /> Low 30–60%</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.red }} /> Critical &lt; 30%</span>
      </div>
    </div>
  );
}

/* ─── RECEIVING / DELIVERY TAB ─── */
function ReceivingTab({ modules, setModules }: { modules: Modules; setModules: React.Dispatch<React.SetStateAction<Modules>> }) {
  const [scanning, setScanning] = useState(false);
  const [recognized, setRecognized] = useState<{ modId: string; itemId: string; name: string; qty: number; unit: string }[]>([]);

  const runScan = () => {
    setScanning(true);
    setRecognized([]);
    setTimeout(() => {
      // pick a few low-stock items as "recognized" delivery
      const candidates = Object.values(modules).flatMap((m) =>
        m.items.filter((i) => pct(i.current, i.max) < 50).map((i) => ({
          modId: m.id, itemId: i.id, name: i.name, qty: Math.ceil(i.max - i.current), unit: i.unit,
        }))).slice(0, 5);
      setRecognized(candidates);
      setScanning(false);
    }, 1400);
  };

  const accept = () => {
    setModules((prev) => {
      const next = { ...prev };
      for (const r of recognized) {
        next[r.modId] = {
          ...next[r.modId],
          items: next[r.modId].items.map((i) => i.id === r.itemId
            ? { ...i, current: Math.min(i.max, i.current + r.qty), updatedAt: Date.now() }
            : i),
        };
      }
      return next;
    });
    setRecognized([]);
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Delivery & Receiving</h2>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub }}>Scan barcodes or snap a photo to bulk-import incoming stock</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Card>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Barcode Scan</div>
          <div style={{ fontSize: 28, color: T.text, fontFamily: T.mono, marginBottom: 12 }}>▎▎ ▎ ▎▎</div>
          <button onClick={runScan} disabled={scanning} style={{ width: "100%", background: T.accentSolid, color: T.textInv, border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: scanning ? "wait" : "pointer" }}>
            {scanning ? "Scanning…" : "Scan Delivery"}
          </button>
        </Card>
        <Card>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Photo Recognition</div>
          <div style={{ fontSize: 28, color: T.text, marginBottom: 12 }}>◳</div>
          <button onClick={runScan} disabled={scanning} style={{ width: "100%", background: T.surfaceAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Snap Label / Box
          </button>
        </Card>
        <Card>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Bulk CSV</div>
          <div style={{ fontSize: 28, color: T.text, marginBottom: 12 }}>≣</div>
          <button onClick={runScan} disabled={scanning} style={{ width: "100%", background: T.surfaceAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Import Order Sheet
          </button>
        </Card>
      </div>

      {scanning && (
        <Card>
          <div style={{ fontSize: 12, color: T.textSub, marginBottom: 10 }}>AI recognizing delivery contents…</div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton h={36} /></div>
          ))}
        </Card>
      )}

      {recognized.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>Recognized Items</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted }}>Verify quantities before committing</p>
            </div>
            <button onClick={accept} style={{ background: T.green, color: T.textInv, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ✓ Accept & Update Inventory
            </button>
          </div>
          <div>
            {recognized.map((r, idx) => (
              <div key={r.itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: idx < recognized.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: T.greenBg, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, border: `1px solid ${T.greenBorder}` }}>✓</span>
                <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500 }}>{r.name}</span>
                <input type="number" value={r.qty} onChange={(e) => setRecognized((prev) => prev.map((p, i) => i === idx ? { ...p, qty: parseFloat(e.target.value) || 0 } : p))}
                  style={{ width: 72, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, color: T.text, fontFamily: T.mono, textAlign: "right" }} />
                <span style={{ fontSize: 11, color: T.textMuted, width: 30 }}>{r.unit}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── REPORTS TAB ─── */
function ReportsTab({ modules }: { modules: Modules }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Station Reports</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {Object.values(modules).map((mod) => (
          <Card key={mod.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16, color: T.textSub }}>{mod.icon}</span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{mod.name}</h3>
            </div>
            {mod.items.map((item, idx) => {
              const p = pct(item.current, item.max);
              const s = getStatus(p);
              return (
                <div key={item.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: idx < mod.items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{item.name}</span>
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
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ─── */
function AnalyticsTab({ modules }: { modules: Modules }) {
  const all = Object.values(modules).flatMap((m) => m.items.map((i) => ({ ...i, mod: m.name })));
  const sorted = [...all].sort((a, b) => pct(a.current, a.max) - pct(b.current, b.max));
  const crits = all.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length;
  const totalValue = all.reduce((sum, i) => sum + i.current * 5, 0); // mock
  const projectedWaste = all.filter((i) => pct(i.current, i.max) > 80).length;
  const avgDepl = all.reduce((s, i) => s + Math.min(72, hoursLeft(i)), 0) / all.length;

  const stat = (label: string, value: string | number, sub?: string) => (
    <Card style={{ flex: "1 1 180px" }}>
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 26, color: T.text, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSub, marginTop: 4 }}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Operations Analytics</h2>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub }}>Performance and waste signals across the kitchen</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {stat("Items Tracked", all.length)}
        {stat("Critical Items", crits, "Need action this service")}
        {stat("Inventory Value", `$${totalValue.toFixed(0)}`, "Estimated cost on-hand")}
        {stat("Avg Runway", `${avgDepl.toFixed(1)}h`, "Across all items")}
        {stat("Overstock Risk", projectedWaste, "Items >80% of max")}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bgDeep }}>
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
      </Card>
    </div>
  );
}

/* ─── EOD TAB ─── */
function EODTab({ modules }: { modules: Modules }) {
  const [eod, setEod] = useState("");
  const [supplier, setSupplier] = useState("");
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const critical = Object.values(modules).flatMap((m) => m.items.filter((i) => getStatus(pct(i.current, i.max)) === "critical"));

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text); setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const genSummary = () => {
    const all = Object.values(modules).flatMap((m) => m.items);
    const total = all.length;
    const c = all.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length;
    const l = all.filter((i) => getStatus(pct(i.current, i.max)) === "low").length;
    const fastest = [...all].sort((a, b) => hoursLeft(a) - hoursLeft(b))[0];
    setSummary([
      "Daily Kitchen Intelligence — " + new Date().toLocaleDateString(),
      "",
      `Tracking ${total} items across ${Object.keys(modules).length} stations.`,
      `${c} critical · ${l} low · ${total - c - l} stocked.`,
      "",
      fastest ? `Fastest depletion: ${fastest.name} (${depletionLabel(fastest)} runway).` : "",
      c > 0 ? "Recommend placing supplier order before 3pm cutoff." : "No urgent reorder required tonight.",
    ].filter(Boolean).join("\n"));
  };

  const btn: CSSProperties = { background: T.accentSolid, color: T.textInv, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
  const altBtn: CSSProperties = { background: T.surfaceAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
  const pre: CSSProperties = { margin: 0, background: T.bgDeep, borderRadius: 6, padding: 14, fontSize: 12, color: T.text, whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 280, overflowY: "auto", border: `1px solid ${T.border}` };
  const empty: CSSProperties = { background: T.surfaceAlt, borderRadius: 6, padding: 22, textAlign: "center", fontSize: 12, color: T.textMuted, border: `1px dashed ${T.border}` };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      {critical.length > 0 && (
        <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 10, padding: 14, marginBottom: 20, boxShadow: `0 0 0 1px ${T.redBorder} inset` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 8, letterSpacing: 0.5 }}>
            {critical.length} CRITICAL {critical.length === 1 ? "ITEM" : "ITEMS"} — REQUIRES ACTION
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {critical.map((i) => (
              <span key={i.id} style={{ background: T.surface, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                {i.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>✦ AI Daily Summary</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted }}>Manager briefing</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {summary && <button onClick={() => copy(summary, "sum")} style={altBtn}>{copied === "sum" ? "Copied" : "Copy"}</button>}
              <button onClick={genSummary} style={btn}>Generate</button>
            </div>
          </div>
          {summary ? <pre style={pre}>{summary}</pre> : <div style={empty}>Generate today's kitchen intelligence briefing</div>}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>Morning Prep List</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted }}>For kitchen crew</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {eod && <button onClick={() => copy(eod, "eod")} style={altBtn}>{copied === "eod" ? "Copied" : "Copy"}</button>}
              <button onClick={() => setEod(genEODList(modules))} style={btn}>Generate</button>
            </div>
          </div>
          {eod ? <pre style={pre}>{eod}</pre> : <div style={empty}>Generate a prep list based on tonight's stock</div>}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>Supplier Order</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted }}>Send to vendor</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {supplier && <button onClick={() => copy(supplier, "sup")} style={altBtn}>{copied === "sup" ? "Copied" : "Copy"}</button>}
              <button onClick={() => setSupplier(genSupplierMsg(modules))} style={btn}>Draft</button>
            </div>
          </div>
          {supplier ? <pre style={pre}>{supplier}</pre> : <div style={empty}>Draft a supplier message for all critical stock items</div>}
        </Card>
      </div>
    </div>
  );
}

/* ─── SETTINGS TAB ─── */
function SettingsTab({ role, setRole, demoMode, setDemoMode, resetData }: {
  role: Role; setRole: (r: Role) => void;
  demoMode: boolean; setDemoMode: (v: boolean) => void;
  resetData: () => void;
}) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Settings</h2>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSub }}>Account, role, and workspace</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <Card>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: T.text }}>Role & Permissions</h3>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: T.textMuted }}>Controls which actions are available in the kitchen</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["owner", "manager", "prep", "line"] as Role[]).map((r) => (
              <button key={r} onClick={() => setRole(r)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: role === r ? T.surfaceElev : T.surfaceAlt,
                border: `1px solid ${role === r ? T.borderStrong : T.border}`,
                borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{ROLE_LABEL[r]}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>
                  {r === "owner" && "Full access · multi-location"}
                  {r === "manager" && "Inventory · orders · reports"}
                  {r === "prep" && "Adjust counts · prep lists"}
                  {r === "line" && "Read-only kitchen view"}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: T.text }}>Workspace</h3>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: T.textMuted }}>Demo data and sync</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Demo Restaurant Mode</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Auto-simulate service drain</div>
            </div>
            <button onClick={() => setDemoMode(!demoMode)} style={{
              width: 40, height: 22, borderRadius: 999, border: "none",
              background: demoMode ? T.green : T.borderMid, position: "relative", cursor: "pointer", transition: "background 200ms",
            }}>
              <span style={{ position: "absolute", top: 2, left: demoMode ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 200ms" }} />
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Cloud Sync</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Real-time across devices</div>
            </div>
            <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.mono }}>Coming soon</span>
          </div>
          <button onClick={resetData} style={{ marginTop: 14, background: "transparent", color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Reset Demo Data
          </button>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: T.text }}>Premium Features</h3>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: T.textMuted }}>Unlock with Kitchen Intel Pro</p>
          {[
            "Multi-location dashboard",
            "Labor vs prep efficiency",
            "Waste tracking & cost analysis",
            "AI reorder assistant",
            "Vendor recommendations",
          ].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.blue, fontSize: 12 }}>✦</span>
              <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{f}</span>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0.6 }}>Pro</span>
            </div>
          ))}
          <button style={{ marginTop: 12, width: "100%", background: T.blue, color: T.textInv, border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Upgrade to Pro
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ─── NOTIFICATIONS ─── */
function NotificationPanel({ modules, onClose }: { modules: Modules; onClose: () => void }) {
  const items = Object.values(modules).flatMap((m) => m.items.map((i) => ({ ...i, mod: m.name })));
  const critical = items.filter((i) => getStatus(pct(i.current, i.max)) === "critical");
  const lows = items.filter((i) => getStatus(pct(i.current, i.max)) === "low");

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} />
      <div style={{
        position: "fixed", top: 56, right: 16, width: 340, maxHeight: "70vh", overflowY: "auto",
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, zIndex: 50,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>Notifications</h3>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: T.mono }}>{critical.length + lows.length} alerts</span>
        </div>
        <div style={{ padding: 8 }}>
          {critical.length === 0 && lows.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.textMuted }}>All stations clear</div>
          )}
          {critical.map((i) => (
            <div key={i.id} style={{ padding: "10px 12px", borderRadius: 8, background: T.redBg, border: `1px solid ${T.redBorder}`, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: T.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>Critical · {i.mod}</div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{i.name}</div>
              <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{predictionFor(i)}</div>
            </div>
          ))}
          {lows.map((i) => (
            <div key={i.id} style={{ padding: "10px 12px", borderRadius: 8, background: T.yellowBg, border: `1px solid ${T.yellowBorder}`, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: T.yellow, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>Low · {i.mod}</div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{i.name}</div>
              <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{depletionLabel(i)} runway · monitor</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── ONBOARDING ─── */
function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { t: "Welcome to Kitchen Intel", d: "The live inventory OS for restaurant kitchens. Built for the rush, optimized for tablets and phones." },
    { t: "Real-time depletion tracking", d: "Stations drain automatically. Tap +/− or Set to update on the fly. Critical items glow red." },
    { t: "AI-powered intelligence", d: "Get predicted depletion, supplier drafts, prep lists, and waste signals — all generated from your live counts." },
    { t: "Ready when you are", d: "We've loaded a demo restaurant. Switch roles, scan deliveries, and explore the heatmap when you're ready." },
  ];
  const s = steps[step];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,8,9,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 460, width: "100%", background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: 16, padding: 28 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? T.accentSolid : T.border }} />
          ))}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentSolid, color: T.textInv, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>KI</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4 }}>{s.t}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: T.textSub, lineHeight: 1.6 }}>{s.d}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={onClose} style={{ background: "transparent", color: T.textMuted, border: "none", padding: "10px 14px", fontSize: 12, cursor: "pointer" }}>Skip tour</button>
          <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onClose()}
            style={{ background: T.accentSolid, color: T.textInv, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {step < steps.length - 1 ? "Next" : "Enter Kitchen"}
          </button>
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
  const [role, setRole] = useState<Role>("manager");
  const [demoMode, setDemoMode] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [showNotifs, setShowNotifs] = useState(false);
  const [showOnboard, setShowOnboard] = useState(true);

  useEffect(() => {
    if (!demoMode) return;
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
  }, [demoMode]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const all = Object.values(modules).flatMap((m) => m.items);
  const crits = all.filter((i) => getStatus(pct(i.current, i.max)) === "critical").length;
  const lows = all.filter((i) => getStatus(pct(i.current, i.max)) === "low").length;

  const TABS = [
    { id: "kitchen", label: "Kitchen" },
    { id: "inventory", label: "Inventory" },
    { id: "heatmap", label: "Heatmap" },
    { id: "receiving", label: "Receiving" },
    { id: "reports", label: "Reports" },
    { id: "weekly", label: "Analytics" },
    { id: "eod", label: "EOD & Orders" },
    { id: "settings", label: "Settings" },
  ];

  const resetData = () => setModules(INIT_MODULES);

  return (
    <>
      <style>{`
        @keyframes ki-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes ki-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        .ki-pulse { animation: ki-pulse 1.8s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${T.bgDeep}; }
        ::-webkit-scrollbar-thumb { background: ${T.borderMid}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.borderStrong}; }
        button:hover:not(:disabled) { filter: brightness(1.08); }
        input, select { outline: none; }
        input:focus, select:focus { border-color: ${T.borderStrong} !important; }
        select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A8B0BB' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px !important; }
        @media (max-width: 768px) {
          .ki-side { display: none; }
          .ki-tabs-scroll { overflow-x: auto; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; }
          .ki-tabs-scroll::-webkit-scrollbar { display: none; }
        }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: T.sans, color: T.text }}>
        {/* Header */}
        <header style={{ borderBottom: `1px solid ${T.border}`, background: T.bgDeep, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: T.accentSolid, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: T.textInv, fontFamily: T.mono, fontWeight: 700, fontSize: 13 }}>KI</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>Kitchen Intel</h1>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.mono, letterSpacing: 0.4 }}>DEMO RESTAURANT · {ROLE_LABEL[role].toUpperCase()}</div>
            </div>
          </div>

          <nav className="ki-tabs-scroll" style={{ display: "flex", gap: 2, marginLeft: 8, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? T.surfaceElev : "transparent",
                border: "none", borderRadius: 6, padding: "7px 12px",
                fontSize: 12, fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? T.text : T.textSub, cursor: "pointer", whiteSpace: "nowrap",
                transition: "background 120ms, color 120ms",
              }}>{t.label}</button>
            ))}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {crits > 0 && (
              <span className={crits > 0 ? "ki-pulse" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
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
            <button onClick={() => setShowNotifs(true)} style={{
              position: "relative", width: 32, height: 32, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.text, fontSize: 14,
            }}>
              ⌖
              {(crits + lows) > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: T.red, color: T.textInv, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono }}>
                  {crits + lows}
                </span>
              )}
            </button>
            <button onClick={() => setKitchenMode((v) => !v)} style={{
              background: kitchenMode ? T.accentSolid : T.surface, color: kitchenMode ? T.textInv : T.text,
              border: `1px solid ${kitchenMode ? T.accentSolid : T.border}`, borderRadius: 6,
              padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              {kitchenMode ? "Exit Kitchen Mode" : "Kitchen Mode"}
            </button>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </header>

        {kitchenMode && tab === "kitchen" && (
          <div style={{ background: T.yellowBg, borderBottom: `1px solid ${T.yellowBorder}`, padding: "8px 24px", fontSize: 12, color: T.yellow, fontWeight: 600 }}>
            🖐️ Kitchen Mode — large tap targets active · tap station chips to switch
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tab === "kitchen" && <KitchenTab modules={modules} setModules={setModules} kitchenMode={kitchenMode} role={role} />}
          {tab === "inventory" && <InventoryTab modules={modules} setModules={setModules} role={role} />}
          {tab === "heatmap" && <HeatmapTab modules={modules} />}
          {tab === "receiving" && <ReceivingTab modules={modules} setModules={setModules} />}
          {tab === "reports" && <ReportsTab modules={modules} />}
          {tab === "weekly" && <AnalyticsTab modules={modules} />}
          {tab === "eod" && <EODTab modules={modules} />}
          {tab === "settings" && <SettingsTab role={role} setRole={setRole} demoMode={demoMode} setDemoMode={setDemoMode} resetData={resetData} />}
        </div>

        {showNotifs && <NotificationPanel modules={modules} onClose={() => setShowNotifs(false)} />}
        {showOnboard && <Onboarding onClose={() => setShowOnboard(false)} />}
      </div>
    </>
  );
}
