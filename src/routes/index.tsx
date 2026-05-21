import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KitchenIntel — AI Kitchen Operating System" },
      { name: "description", content: "AI-powered kitchen OS: inventory, prep, sales intelligence, POS sync and forecasting for modern restaurants." },
    ],
  }),
  component: KitchenIntel,
});

/* ============================================================
   DESIGN SYSTEM — enterprise / operational
   white · soft grey · charcoal · silver · black accents
   ============================================================ */
const ui = {
  font: { fontFamily: '"Inter", "DM Sans", -apple-system, system-ui, sans-serif' },
  mono: { fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
  // surfaces
  bg: "#F7F8FA",          // app background
  panel: "#FFFFFF",       // cards
  panel2: "#FBFBFC",      // subtle alt
  sidebar: "#0F1115",     // charcoal sidebar
  sidebarHover: "#1A1D23",
  sidebarText: "#E5E7EB",
  sidebarMuted: "#8B8F98",
  // text
  ink: "#0B0D10",
  ink2: "#1F2328",
  muted: "#6B7280",
  faint: "#9AA0A6",
  // lines
  line: "#E6E8EC",
  lineSoft: "#EEF0F3",
  // accents (use sparingly)
  ok: "#0F7A4A",
  okBg: "#E8F5EE",
  warn: "#A86A00",
  warnBg: "#FFF4E0",
  bad: "#B42318",
  badBg: "#FDECEA",
  info: "#1F4ED8",
  infoBg: "#EEF2FF",
  // shadow
  shadow: "0 1px 2px rgba(16,24,40,.04), 0 1px 1px rgba(16,24,40,.02)",
  shadowMd: "0 4px 12px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)",
};

/* ============================================================
   TYPES & MOCK DATA
   ============================================================ */
type Item = {
  id: string;
  name: string;
  unit: string;
  max: number;
  current: number;
  par: number;
  station: string;
  category: string;
  costPerUnit: number;
  usage: number[]; // 7-day
};

type RecipeIngredient = { itemId: string; qty: number };
type MenuItem = {
  id: string;
  name: string;
  station: string;
  price: number;
  posMap: { toast?: string; square?: string; clover?: string };
  recipe: RecipeIngredient[];
};

type SalesRow = { menuId: string; hour: number; qty: number };

type Integration = {
  id: string;
  name: string;
  category: "POS" | "Accounting" | "Reporting" | "Supplier";
  status: "connected" | "available" | "error";
  lastSync?: string;
  records?: number;
};

const STATIONS = ["Flat Top", "Fryer", "Sauté", "Char Grill", "Cold Line"];

const seedItems = (): Item[] => {
  const base: Omit<Item, "usage" | "current">[] = [
    { id: "buns",      name: "Brioche Buns",      unit: "ea", max: 240, par: 120, station: "Flat Top",  category: "Bakery",  costPerUnit: 0.42 },
    { id: "beef",      name: "Ground Beef 80/20", unit: "lb", max: 80,  par: 40,  station: "Flat Top",  category: "Protein", costPerUnit: 5.20 },
    { id: "cheese",    name: "American Cheese",   unit: "sl", max: 400, par: 180, station: "Flat Top",  category: "Dairy",   costPerUnit: 0.18 },
    { id: "tomato",    name: "Tomato",            unit: "sl", max: 320, par: 160, station: "Cold Line", category: "Produce", costPerUnit: 0.09 },
    { id: "lettuce",   name: "Iceberg Lettuce",   unit: "oz", max: 160, par: 70,  station: "Cold Line", category: "Produce", costPerUnit: 0.22 },
    { id: "fries",     name: "Shoestring Fries",  unit: "lb", max: 120, par: 60,  station: "Fryer",     category: "Frozen",  costPerUnit: 1.80 },
    { id: "oil",       name: "Fryer Oil",         unit: "L",  max: 40,  par: 18,  station: "Fryer",     category: "Pantry",  costPerUnit: 3.40 },
    { id: "wraps",     name: "Flour Wraps 10\"",  unit: "ea", max: 160, par: 70,  station: "Sauté",     category: "Bakery",  costPerUnit: 0.28 },
    { id: "chicken",   name: "Chicken Breast",    unit: "lb", max: 90,  par: 45,  station: "Sauté",     category: "Protein", costPerUnit: 4.10 },
    { id: "ribeye",    name: "Ribeye 12oz",       unit: "ea", max: 60,  par: 24,  station: "Char Grill",category: "Protein", costPerUnit: 11.50 },
    { id: "salmon",    name: "Salmon Filet",      unit: "ea", max: 50,  par: 22,  station: "Char Grill",category: "Protein", costPerUnit: 8.20 },
    { id: "onion",     name: "Diced Onion",       unit: "lb", max: 40,  par: 18,  station: "Flat Top",  category: "Produce", costPerUnit: 0.95 },
    { id: "pickle",    name: "Pickle Slices",     unit: "sl", max: 500, par: 220, station: "Cold Line", category: "Pantry",  costPerUnit: 0.04 },
    { id: "bacon",     name: "Bacon Strips",      unit: "ea", max: 240, par: 100, station: "Flat Top",  category: "Protein", costPerUnit: 0.65 },
  ];
  return base.map((b) => {
    const usage = Array.from({ length: 7 }, (_, i) => Math.round(b.max * (0.35 + 0.15 * Math.sin(i + b.id.length))) );
    const current = Math.round(b.max * (0.45 + 0.4 * Math.random()));
    return { ...b, current, usage };
  });
};

const MENU: MenuItem[] = [
  { id: "m_burger",   name: "Classic Burger",        station: "Flat Top",   price: 13.5, posMap: { toast: "TST-1001" }, recipe: [
    { itemId: "buns", qty: 1 }, { itemId: "beef", qty: 0.33 }, { itemId: "cheese", qty: 1 },
    { itemId: "tomato", qty: 2 }, { itemId: "lettuce", qty: 0.6 }, { itemId: "onion", qty: 0.05 }, { itemId: "pickle", qty: 3 },
  ]},
  { id: "m_dblburger",name: "Double Stack",          station: "Flat Top",   price: 16.5, posMap: { toast: "TST-1002" }, recipe: [
    { itemId: "buns", qty: 1 }, { itemId: "beef", qty: 0.55 }, { itemId: "cheese", qty: 2 },
    { itemId: "bacon", qty: 2 }, { itemId: "onion", qty: 0.05 }, { itemId: "pickle", qty: 3 },
  ]},
  { id: "m_fries",    name: "Shoestring Fries",      station: "Fryer",      price: 5.5,  posMap: { toast: "TST-2001" }, recipe: [
    { itemId: "fries", qty: 0.32 }, { itemId: "oil", qty: 0.04 },
  ]},
  { id: "m_chxwrap",  name: "Grilled Chicken Wrap",  station: "Sauté",      price: 12.0, posMap: { toast: "TST-3001" }, recipe: [
    { itemId: "wraps", qty: 1 }, { itemId: "chicken", qty: 0.35 }, { itemId: "lettuce", qty: 0.5 }, { itemId: "tomato", qty: 2 },
  ]},
  { id: "m_ribeye",   name: "Ribeye 12oz",           station: "Char Grill", price: 38.0, posMap: { toast: "TST-4001" }, recipe: [
    { itemId: "ribeye", qty: 1 },
  ]},
  { id: "m_salmon",   name: "Wild Salmon",           station: "Char Grill", price: 28.0, posMap: { toast: "TST-4002" }, recipe: [
    { itemId: "salmon", qty: 1 },
  ]},
];

const INTEGRATIONS_SEED: Integration[] = [
  { id: "toast",      name: "Toast POS",       category: "POS", status: "connected", lastSync: "live", records: 1284 },
  { id: "square",     name: "Square",          category: "POS", status: "available" },
  { id: "clover",     name: "Clover",          category: "POS", status: "available" },
  { id: "lightspeed", name: "Lightspeed",      category: "POS", status: "available" },
  { id: "revel",      name: "Revel Systems",   category: "POS", status: "available" },
  { id: "shopify",    name: "Shopify POS",     category: "POS", status: "available" },
  { id: "ncr",        name: "NCR Aloha",       category: "POS", status: "available" },
  { id: "qbooks",     name: "QuickBooks",      category: "Accounting", status: "available" },
  { id: "sysco",      name: "Sysco Supplier",  category: "Supplier",   status: "available" },
  { id: "usf",        name: "US Foods",        category: "Supplier",   status: "available" },
];

/* ============================================================
   ICONS (inline, monochrome)
   ============================================================ */
const Icon = {
  dot: (c: string) => <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: c }} />,
  chev: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  arrowUp: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  arrowDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 21a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6"/></svg>,
  menu: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

const NAV: { id: string; label: string; svg: JSX.Element }[] = [
  { id: "dashboard",   label: "Dashboard",         svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="3" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="11" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="15" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { id: "stations",    label: "Stations",          svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 10h16M4 14h16M6 6h12v12H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> },
  { id: "inventory",   label: "Full Inventory",    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> },
  { id: "prep",        label: "Prep",              svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M6 7v12a2 2 0 002 2h8a2 2 0 002-2V7M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { id: "sales",       label: "Sales Intelligence",svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 20h18M5 16l4-6 4 3 6-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "recipes",     label: "Recipe Engine",     svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l3 3v15H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { id: "forecast",    label: "Forecasting",       svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 17l4-4 3 3 5-7 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "reports",     label: "Reports",           svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { id: "deliveries",  label: "Deliveries",        svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { id: "integrations",label: "Integrations",      svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 4h4v4M14 20h-4v-4M4 10v4h4M20 14v-4h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "settings",    label: "Settings",          svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2L5.1 6 3.1 9.4l2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
];

/* ============================================================
   REUSABLE PRIMITIVES
   ============================================================ */
function Card({ children, style, pad = 20, title, subtitle, action }: any) {
  return (
    <div style={{ background: ui.panel, border: `1px solid ${ui.line}`, borderRadius: 10, boxShadow: ui.shadow, ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${ui.lineSoft}` }}>
          <div>
            {title && <div style={{ fontSize: 13, fontWeight: 600, color: ui.ink, letterSpacing: -0.1 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: ui.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

function Pill({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "bad" | "info"; children: any }) {
  const map: any = {
    neutral: { c: ui.ink2, b: "#F1F2F4", bd: ui.line },
    ok:      { c: ui.ok,   b: ui.okBg,   bd: "#CFE7DA" },
    warn:    { c: ui.warn, b: ui.warnBg, bd: "#F3DDB4" },
    bad:     { c: ui.bad,  b: ui.badBg,  bd: "#F3C7C0" },
    info:    { c: ui.info, b: ui.infoBg, bd: "#D5DDFA" },
  };
  const s = map[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: s.c, background: s.b, border: `1px solid ${s.bd}`, letterSpacing: -0.1 }}>
      {children}
    </span>
  );
}

function Btn({ variant = "secondary", children, onClick, style, size = "md" }: any) {
  const sizes: any = { sm: { p: "6px 10px", fs: 12 }, md: { p: "8px 14px", fs: 13 }, lg: { p: "10px 18px", fs: 14 } };
  const sz = sizes[size];
  const base: any = { borderRadius: 8, fontWeight: 600, fontSize: sz.fs, padding: sz.p, cursor: "pointer", transition: "all .15s", border: "1px solid", letterSpacing: -0.1, display: "inline-flex", alignItems: "center", gap: 6 };
  const variants: any = {
    primary:   { background: ui.ink, color: "#fff", borderColor: ui.ink },
    secondary: { background: "#fff", color: ui.ink, borderColor: ui.line },
    ghost:     { background: "transparent", color: ui.ink2, borderColor: "transparent" },
    danger:    { background: "#fff", color: ui.bad, borderColor: "#F3C7C0" },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Stat({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: { dir: "up" | "down"; v: string; good?: boolean } }) {
  return (
    <div style={{ padding: "16px 18px", background: ui.panel, border: `1px solid ${ui.line}`, borderRadius: 10, boxShadow: ui.shadow }}>
      <div style={{ fontSize: 11, color: ui.muted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: ui.ink, letterSpacing: -0.5, ...ui.mono }}>{value}</div>
        {trend && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color: trend.good ? ui.ok : ui.bad }}>
            {trend.dir === "up" ? <Icon.arrowUp/> : <Icon.arrowDown/>}{trend.v}
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: ui.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Spark({ data, w = 120, h = 32, stroke = ui.ink2 }: { data: number[]; w?: number; h?: number; stroke?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={pts} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Bars({ data, w = 120, h = 32, color = ui.ink2 }: { data: number[]; w?: number; h?: number; color?: string }) {
  const max = Math.max(...data, 1);
  const bw = w / data.length - 2;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * h);
        return <rect key={i} x={i * (bw + 2)} y={h - bh} width={bw} height={bh} fill={color} rx="1.5"/>;
      })}
    </svg>
  );
}

/* status helper */
function statusOf(it: Item): { tone: "ok" | "warn" | "bad"; label: string } {
  const pct = it.current / it.max;
  if (it.current <= it.par * 0.4) return { tone: "bad", label: "Critical" };
  if (it.current <= it.par) return { tone: "warn", label: "Low" };
  if (pct > 0.6) return { tone: "ok", label: "In stock" };
  return { tone: "ok", label: "OK" };
}

/* ============================================================
   MAIN APP
   ============================================================ */
function KitchenIntel() {
  const [tab, setTab] = useState("dashboard");
  const [items, setItems] = useState<Item[]>(seedItems);
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_SEED);
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posLive, setPosLive] = useState(true);
  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState("Downtown · Main St");
  const isMobile = useIsMobile();

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // POS live → simulate sales tick → recipe deduction
  useEffect(() => {
    if (!posLive) return;
    const t = setInterval(() => {
      const hour = new Date().getHours();
      const picks = 1 + Math.floor(Math.random() * 3);
      const newRows: SalesRow[] = [];
      for (let i = 0; i < picks; i++) {
        const m = MENU[Math.floor(Math.random() * MENU.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        newRows.push({ menuId: m.id, hour, qty });
      }
      // deduct ingredients
      setItems(prev => {
        const next = prev.map(p => ({ ...p }));
        const byId: Record<string, Item> = Object.fromEntries(next.map(n => [n.id, n]));
        for (const row of newRows) {
          const menu = MENU.find(m => m.id === row.menuId);
          if (!menu) continue;
          for (const r of menu.recipe) {
            const it = byId[r.itemId];
            if (it) it.current = Math.max(0, +(it.current - r.qty * row.qty).toFixed(2));
          }
        }
        return next;
      });
      setSales(s => [...newRows, ...s].slice(0, 200));
    }, 5000);
    return () => clearInterval(t);
  }, [posLive]);

  const stats = useMemo(() => {
    const total = items.length;
    const critical = items.filter(i => i.current <= i.par * 0.4).length;
    const low = items.filter(i => i.current > i.par * 0.4 && i.current <= i.par).length;
    const value = items.reduce((s, i) => s + i.current * i.costPerUnit, 0);
    const todaySales = sales.reduce((s, r) => {
      const m = MENU.find(mm => mm.id === r.menuId);
      return s + (m ? m.price * r.qty : 0);
    }, 0);
    const itemsSold = sales.reduce((s, r) => s + r.qty, 0);
    return { total, critical, low, value, todaySales, itemsSold };
  }, [items, sales]);

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh", background: ui.bg, color: ui.ink, ...ui.font,
    display: "flex", letterSpacing: -0.1,
  };

  return (
    <div style={containerStyle}>
      {/* SIDEBAR */}
      <Sidebar tab={tab} setTab={(t) => { setTab(t); setSidebarOpen(false); }} open={sidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* TOPBAR */}
        <header style={{ height: 56, borderBottom: `1px solid ${ui.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: `1px solid ${ui.line}`, borderRadius: 8, width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", color: ui.ink2 }}>
                <Icon.menu/>
              </button>
            )}
            <select value={location} onChange={(e) => setLocation(e.target.value)} style={{ background: "#fff", border: `1px solid ${ui.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: ui.ink, fontWeight: 600, cursor: "pointer" }}>
              <option>Downtown · Main St</option>
              <option>Westside · Marina</option>
              <option>Airport Terminal B</option>
            </select>
            <Pill tone={posLive ? "ok" : "neutral"}>
              {Icon.dot(posLive ? ui.ok : ui.muted)} POS {posLive ? "Live" : "Paused"}
            </Pill>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...ui.mono, fontSize: 12, color: ui.muted, display: isMobile ? "none" : "block" }}>
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <button style={{ background: "none", border: `1px solid ${ui.line}`, borderRadius: 8, width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", color: ui.ink2, position: "relative" }}>
              <Icon.bell/>
              {stats.critical > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, background: ui.bad, borderRadius: 999 }}/>}
            </button>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: "#E5E7EB", color: ui.ink, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>JM</div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, padding: isMobile ? 14 : 24, overflow: "auto" }}>
          {tab === "dashboard"   && <Dashboard items={items} sales={sales} stats={stats}/>}
          {tab === "stations"    && <Stations items={items} setItems={setItems}/>}
          {tab === "inventory"   && <Inventory items={items} setItems={setItems}/>}
          {tab === "prep"        && <Prep items={items} sales={sales}/>}
          {tab === "sales"       && <SalesIntel sales={sales} items={items}/>}
          {tab === "recipes"     && <RecipeEngine items={items}/>}
          {tab === "forecast"    && <Forecast items={items} sales={sales}/>}
          {tab === "reports"     && <Reports items={items} sales={sales}/>}
          {tab === "deliveries"  && <Deliveries items={items} setItems={setItems}/>}
          {tab === "integrations"&& <Integrations integrations={integrations} setIntegrations={setIntegrations} posLive={posLive} setPosLive={setPosLive}/>}
          {tab === "settings"    && <Settings/>}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar({ tab, setTab, open, setOpen, isMobile }: any) {
  const content = (
    <div style={{ width: 240, background: ui.sidebar, color: ui.sidebarText, height: "100vh", display: "flex", flexDirection: "column", borderRight: `1px solid #000` }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid #1F232A` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#fff", display: "grid", placeItems: "center", color: ui.ink, fontWeight: 800, fontSize: 13 }}>K</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: -0.2 }}>KitchenIntel</div>
            <div style={{ fontSize: 10, color: ui.sidebarMuted, ...ui.mono, letterSpacing: 0.4 }}>OS v2.4</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: 10, overflow: "auto" }}>
        {NAV.map((n) => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 10px",
                background: active ? "#fff" : "transparent",
                color: active ? ui.ink : ui.sidebarText,
                border: "none", borderRadius: 6, cursor: "pointer",
                fontSize: 13, fontWeight: active ? 600 : 500, marginBottom: 2, textAlign: "left",
                transition: "background .12s",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget.style.background = ui.sidebarHover); }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget.style.background = "transparent"); }}
            >
              <span style={{ opacity: active ? 1 : 0.85 }}>{n.svg}</span>
              {n.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 14, borderTop: `1px solid #1F232A`, fontSize: 11, color: ui.sidebarMuted }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Sync health</span><span style={{ color: ui.ok }}>● 99.8%</span>
        </div>
        <div style={{ ...ui.mono, fontSize: 10 }}>edge-us-west-2 · 12ms</div>
      </div>
    </div>
  );

  if (!isMobile) return content;
  return (
    <>
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 40 }}/>}
      <div style={{ position: "fixed", left: 0, top: 0, zIndex: 50, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .25s" }}>
        {content}
      </div>
    </>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ items, sales, stats }: any) {
  const critical = items.filter((i: Item) => i.current <= i.par * 0.4);
  const recent = sales.slice(0, 8);
  const hourly = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const r of sales) arr[(r.hour % 12)] += r.qty;
    return arr;
  }, [sales]);

  return (
    <div>
      <PageHeader title="Kitchen Dashboard" subtitle="Real-time operational overview"/>
      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Items Tracked" value={String(stats.total)} sub="14 SKUs across 5 stations"/>
        <Stat label="Critical" value={String(stats.critical)} sub={`${stats.low} low · need attention`} trend={{ dir: "down", v: "2", good: true }}/>
        <Stat label="Inventory Value" value={`$${stats.value.toFixed(0)}`} sub="At current cost" trend={{ dir: "up", v: "3.2%", good: true }}/>
        <Stat label="Today's Sales" value={`$${stats.todaySales.toFixed(0)}`} sub={`${stats.itemsSold} items sold · live POS`} trend={{ dir: "up", v: "12%", good: true }}/>
      </Grid>

      <Grid cols="2fr 1fr" gap={16}>
        <Card title="Hourly Item Velocity" subtitle="Items sold per hour from connected POS" action={<Pill tone="info">Toast · Live</Pill>}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
            {hourly.map((v, i) => {
              const max = Math.max(...hourly, 1);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ ...ui.mono, fontSize: 9, color: ui.faint }}>{v || ""}</div>
                  <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: 2, background: i === new Date().getHours() % 12 ? ui.ink : "#D1D5DB", borderRadius: 3, transition: "height .3s" }}/>
                  <div style={{ ...ui.mono, fontSize: 9, color: ui.muted }}>{i}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Critical Inventory" subtitle={`${critical.length} items below threshold`} action={critical.length > 0 ? <Pill tone="bad">{Icon.dot(ui.bad)} Action needed</Pill> : <Pill tone="ok">All OK</Pill>}>
          {critical.length === 0 ? (
            <div style={{ fontSize: 13, color: ui.muted, padding: "20px 0", textAlign: "center" }}>No critical items. Every station is stocked.</div>
          ) : critical.slice(0, 6).map((it: Item) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ui.ink }}>{it.name}</div>
                <div style={{ fontSize: 11, color: ui.muted }}>{it.station}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...ui.mono, fontSize: 13, color: ui.bad, fontWeight: 600 }}>{it.current}<span style={{ color: ui.faint, fontWeight: 400 }}>/{it.par}</span> {it.unit}</div>
              </div>
            </div>
          ))}
        </Card>
      </Grid>

      <Grid cols="1fr 1fr" gap={16} style={{ marginTop: 16 }}>
        <Card title="Live Sales Feed" subtitle="Streaming from Toast POS" action={<Pill tone="ok">{Icon.dot(ui.ok)} Streaming</Pill>}>
          {recent.length === 0 ? <div style={{ fontSize: 13, color: ui.muted, padding: 12 }}>Waiting for POS events…</div> :
            recent.map((r: SalesRow, i: number) => {
              const m = MENU.find(mm => mm.id === r.menuId);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...ui.mono, fontSize: 10, color: ui.faint }}>{String(r.hour).padStart(2,"0")}:{String(Math.floor(Math.random()*60)).padStart(2,"0")}</span>
                    <span style={{ fontSize: 13, color: ui.ink }}>{m?.name}</span>
                    <Pill tone="neutral">×{r.qty}</Pill>
                  </div>
                  <span style={{ ...ui.mono, fontSize: 12, color: ui.ink2 }}>${((m?.price ?? 0) * r.qty).toFixed(2)}</span>
                </div>
              );
            })
          }
        </Card>

        <Card title="AI Kitchen Intelligence" subtitle="Auto-generated from sales velocity & inventory" action={<Pill tone="info">AI</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AIInsight tone="bad" title="Ribeye depletion risk" body="At current sell rate (3.2/hr) you will stock out by 7:45pm. Pull from walk-in or 86 the item."/>
            <AIInsight tone="warn" title="Fries demand spike" body="Lunch rush 24% above 7-day avg. Drop 2 baskets early. Predicted +18 portions next hour."/>
            <AIInsight tone="info" title="Prep recommendation" body="Tomorrow's forecast: 312 covers. Pre-portion 28 lb beef, 14 lb chicken, 90 wraps."/>
          </div>
        </Card>
      </Grid>
    </div>
  );
}

function AIInsight({ tone, title, body }: any) {
  const map: any = { bad: ui.bad, warn: ui.warn, info: ui.info, ok: ui.ok };
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 12px", background: ui.panel2, border: `1px solid ${ui.lineSoft}`, borderLeft: `3px solid ${map[tone]}`, borderRadius: 6 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: ui.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: ui.muted, marginTop: 3, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

/* ============================================================
   STATIONS
   ============================================================ */
function Stations({ items, setItems }: any) {
  const [active, setActive] = useState(STATIONS[0]);
  const stationItems = items.filter((i: Item) => i.station === active);
  return (
    <div>
      <PageHeader title="Stations" subtitle="Real-time station-level inventory & depletion"/>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {STATIONS.map(s => {
          const count = items.filter((i: Item) => i.station === s).length;
          const crit = items.filter((i: Item) => i.station === s && i.current <= i.par * 0.4).length;
          return (
            <button key={s} onClick={() => setActive(s)} style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${active === s ? ui.ink : ui.line}`,
              background: active === s ? ui.ink : "#fff", color: active === s ? "#fff" : ui.ink,
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8,
            }}>
              {s}
              <span style={{ ...ui.mono, fontSize: 10, opacity: 0.7 }}>{count}</span>
              {crit > 0 && <span style={{ width: 6, height: 6, borderRadius: 999, background: active === s ? "#fff" : ui.bad }}/>}
            </button>
          );
        })}
      </div>

      <Card title={`${active} Station`} subtitle={`${stationItems.length} tracked items`} pad={0}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
              <Th>Item</Th><Th>Status</Th><Th align="right">On Hand</Th><Th align="right">Par</Th><Th align="right">7d Usage</Th><Th align="right">Adjust</Th>
            </tr>
          </thead>
          <tbody>
            {stationItems.map((it: Item) => <ItemRow key={it.id} it={it} setItems={setItems}/>)}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ItemRow({ it, setItems }: any) {
  const st = statusOf(it);
  const pct = Math.min(100, (it.current / it.max) * 100);
  return (
    <tr style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
      <td style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: ui.ink }}>{it.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <div style={{ flex: 1, maxWidth: 140, height: 4, background: ui.lineSoft, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: st.tone === "bad" ? ui.bad : st.tone === "warn" ? ui.warn : ui.ink2 }}/>
          </div>
          <span style={{ ...ui.mono, fontSize: 10, color: ui.muted }}>{pct.toFixed(0)}%</span>
        </div>
      </td>
      <td style={{ padding: "14px 16px" }}><Pill tone={st.tone}>{Icon.dot(st.tone === "bad" ? ui.bad : st.tone === "warn" ? ui.warn : ui.ok)}{st.label}</Pill></td>
      <td style={{ padding: "14px 16px", textAlign: "right", ...ui.mono, fontSize: 13, color: ui.ink, fontWeight: 600 }}>{it.current} <span style={{ color: ui.faint, fontWeight: 400 }}>{it.unit}</span></td>
      <td style={{ padding: "14px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.muted }}>{it.par}</td>
      <td style={{ padding: "14px 16px", textAlign: "right" }}><Spark data={it.usage}/></td>
      <td style={{ padding: "14px 16px", textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 4 }}>
          <Btn size="sm" onClick={() => setItems((p: Item[]) => p.map(x => x.id === it.id ? { ...x, current: Math.max(0, x.current - 1) } : x))}>−</Btn>
          <Btn size="sm" onClick={() => setItems((p: Item[]) => p.map(x => x.id === it.id ? { ...x, current: Math.min(x.max, x.current + 1) } : x))}>+</Btn>
        </div>
      </td>
    </tr>
  );
}

const Th = ({ children, align = "left" }: any) => (
  <th style={{ padding: "10px 16px", textAlign: align, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, color: ui.muted }}>{children}</th>
);

/* ============================================================
   FULL INVENTORY
   ============================================================ */
function Inventory({ items, setItems }: any) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [station, setStation] = useState("all");
  const cats = useMemo(() => Array.from(new Set(items.map((i: Item) => i.category))) as string[], [items]);
  const filtered = items.filter((i: Item) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat !== "all" && i.category !== cat) return false;
    if (station !== "all" && i.station !== station) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Full Inventory" subtitle={`${items.length} SKUs · live tracking`} actions={<><Btn variant="secondary">Export CSV</Btn><Btn variant="primary">+ Add Item</Btn></>}/>
      <Card pad={0}>
        <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: `1px solid ${ui.lineSoft}`, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: ui.faint }}><Icon.search/></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search items…" style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${ui.line}`, borderRadius: 8, fontSize: 13, background: "#fff" }}/>
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)} style={selectStyle}><option value="all">All categories</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
          <select value={station} onChange={e => setStation(e.target.value)} style={selectStyle}><option value="all">All stations</option>{STATIONS.map(s => <option key={s}>{s}</option>)}</select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
              <Th>Item</Th><Th>Category</Th><Th>Station</Th><Th>Status</Th><Th align="right">On Hand</Th><Th align="right">Par</Th><Th align="right">Value</Th><Th align="right">7d</Th>
            </tr></thead>
            <tbody>
              {filtered.map((it: Item) => {
                const st = statusOf(it);
                return (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: ui.ink }}>{it.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{it.category}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{it.station}</td>
                    <td style={{ padding: "12px 16px" }}><Pill tone={st.tone}>{st.label}</Pill></td>
                    <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12 }}>{it.current} {it.unit}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.muted }}>{it.par}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.ink2 }}>${(it.current * it.costPerUnit).toFixed(0)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}><Spark data={it.usage} w={70} h={20}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const selectStyle: React.CSSProperties = { padding: "8px 12px", border: `1px solid ${ui.line}`, borderRadius: 8, fontSize: 13, background: "#fff", color: ui.ink, fontWeight: 500, cursor: "pointer" };

/* ============================================================
   PREP
   ============================================================ */
function Prep({ items, sales }: any) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  // generate prep tasks from items below par
  const tasks = items.filter((i: Item) => i.current < i.par).map((i: Item) => ({
    id: i.id,
    item: i.name,
    station: i.station,
    target: i.par - i.current,
    unit: i.unit,
    urgency: i.current <= i.par * 0.4 ? "high" : "normal",
  }));

  return (
    <div>
      <PageHeader title="Prep List" subtitle={`${tasks.length} tasks · auto-generated from par levels`} actions={<><Btn variant="secondary">Print</Btn><Btn variant="primary">Send to Stations</Btn></>}/>
      <Grid cols="repeat(auto-fit, minmax(260px, 1fr))" gap={12}>
        {STATIONS.map(s => {
          const list = tasks.filter((t: any) => t.station === s);
          return (
            <Card key={s} title={s} subtitle={`${list.length} tasks`} action={<Pill tone={list.some((t: any) => t.urgency === "high") ? "bad" : "neutral"}>{list.length}</Pill>}>
              {list.length === 0 ? <div style={{ fontSize: 12, color: ui.muted, padding: "8px 0" }}>All stocked.</div> :
                list.map((t: any) => (
                  <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}`, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!done[t.id]} onChange={() => setDone(d => ({ ...d, [t.id]: !d[t.id] }))} style={{ width: 16, height: 16, accentColor: ui.ink }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: done[t.id] ? ui.faint : ui.ink, textDecoration: done[t.id] ? "line-through" : "none" }}>{t.item}</div>
                      <div style={{ fontSize: 11, color: ui.muted, ...ui.mono }}>+{t.target.toFixed(1)} {t.unit}</div>
                    </div>
                    {t.urgency === "high" && <Pill tone="bad">URGENT</Pill>}
                  </label>
                ))
              }
            </Card>
          );
        })}
      </Grid>
    </div>
  );
}

/* ============================================================
   SALES INTELLIGENCE
   ============================================================ */
function SalesIntel({ sales, items }: any) {
  const byMenu = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of sales) m[r.menuId] = (m[r.menuId] || 0) + r.qty;
    return MENU.map(mn => ({ ...mn, qty: m[mn.id] || 0, revenue: (m[mn.id] || 0) * mn.price })).sort((a,b) => b.qty - a.qty);
  }, [sales]);

  const hourly = useMemo(() => {
    const arr = Array(24).fill(0);
    for (const r of sales) arr[r.hour] += r.qty;
    return arr;
  }, [sales]);

  const burn = useMemo(() => {
    // ingredient burn rate from sales × recipes
    const b: Record<string, number> = {};
    for (const r of sales) {
      const m = MENU.find(mm => mm.id === r.menuId);
      if (!m) continue;
      for (const ing of m.recipe) b[ing.itemId] = (b[ing.itemId] || 0) + ing.qty * r.qty;
    }
    return items.map((i: Item) => ({ ...i, burned: b[i.id] || 0 })).filter((x: any) => x.burned > 0).sort((a: any, b: any) => b.burned - a.burned);
  }, [sales, items]);

  const totalRev = byMenu.reduce((s, x) => s + x.revenue, 0);
  const totalQty = byMenu.reduce((s, x) => s + x.qty, 0);

  return (
    <div>
      <PageHeader title="Sales Intelligence" subtitle="Hourly velocity, item mix, ingredient burn" actions={<Pill tone="info">Toast · synced 8s ago</Pill>}/>

      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Net Sales" value={`$${totalRev.toFixed(0)}`} trend={{ dir: "up", v: "12.4%", good: true }} sub="vs 7-day avg"/>
        <Stat label="Items Sold" value={String(totalQty)} sub="Live count"/>
        <Stat label="Avg Ticket" value={`$${totalQty ? (totalRev/totalQty).toFixed(2) : "0.00"}`} sub="Per item"/>
        <Stat label="Rush Risk" value="MED" sub="Next 45 min · +18% velocity expected"/>
      </Grid>

      <Card title="Hourly Sales Velocity" subtitle="Item count per hour" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160 }}>
          {hourly.map((v, i) => {
            const max = Math.max(...hourly, 1);
            const isPeak = v === max && v > 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: 2, background: isPeak ? ui.ink : "#CBD0D7", borderRadius: 3 }}/>
                <div style={{ ...ui.mono, fontSize: 9, color: ui.muted }}>{i}h</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Grid cols="1fr 1fr" gap={16}>
        <Card title="Top Menu Items" subtitle="Sorted by quantity">
          {byMenu.slice(0, 8).map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <span style={{ ...ui.mono, fontSize: 11, color: ui.faint, width: 18 }}>{String(i+1).padStart(2,"0")}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ui.ink }}>{m.name}</div>
                <div style={{ fontSize: 11, color: ui.muted }}>{m.station} · ${m.price.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...ui.mono, fontSize: 13, fontWeight: 600 }}>{m.qty}</div>
                <div style={{ ...ui.mono, fontSize: 10, color: ui.muted }}>${m.revenue.toFixed(0)}</div>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Ingredient Burn Rate" subtitle="Computed from POS × recipes" action={<Pill tone="info">Recipe Engine</Pill>}>
          {burn.length === 0 ? <div style={{ fontSize: 13, color: ui.muted, padding: 12 }}>Waiting for sales…</div> :
            burn.slice(0, 8).map((b: any) => {
              const projHours = b.current / (b.burned / Math.max(1, sales.length * 0.1));
              return (
                <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                    <span style={{ ...ui.mono, fontSize: 12, color: ui.ink2 }}>−{b.burned.toFixed(1)} {b.unit}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, height: 3, background: ui.lineSoft, borderRadius: 999, marginRight: 10, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (b.burned / b.max) * 100)}%`, height: "100%", background: ui.bad }}/>
                    </div>
                    <span style={{ ...ui.mono, fontSize: 10, color: ui.muted }}>{isFinite(projHours) ? `${projHours.toFixed(1)}h left` : "—"}</span>
                  </div>
                </div>
              );
            })
          }
        </Card>
      </Grid>
    </div>
  );
}

/* ============================================================
   RECIPE ENGINE
   ============================================================ */
function RecipeEngine({ items }: any) {
  const [selected, setSelected] = useState(MENU[0].id);
  const menu = MENU.find(m => m.id === selected)!;
  const cost = menu.recipe.reduce((s, r) => {
    const it = items.find((i: Item) => i.id === r.itemId);
    return s + (it ? it.costPerUnit * r.qty : 0);
  }, 0);
  const margin = ((menu.price - cost) / menu.price) * 100;

  return (
    <div>
      <PageHeader title="Recipe Engine" subtitle="Map menu items to inventory · auto-deduct on sale" actions={<><Btn variant="secondary">Import from POS</Btn><Btn variant="primary">+ New Recipe</Btn></>}/>

      <Grid cols="280px 1fr" gap={16}>
        <Card title="Menu Items" pad={0}>
          {MENU.map(m => (
            <button key={m.id} onClick={() => setSelected(m.id)} style={{
              width: "100%", textAlign: "left", padding: "12px 16px", border: "none",
              background: selected === m.id ? ui.panel2 : "transparent",
              borderLeft: `3px solid ${selected === m.id ? ui.ink : "transparent"}`,
              borderBottom: `1px solid ${ui.lineSoft}`, cursor: "pointer",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ui.ink }}>{m.name}</div>
              <div style={{ fontSize: 11, color: ui.muted, marginTop: 2 }}>{m.station} · ${m.price.toFixed(2)} · {m.recipe.length} ingredients</div>
            </button>
          ))}
        </Card>

        <div>
          <Grid cols="repeat(auto-fit, minmax(140px, 1fr))" gap={10} style={{ marginBottom: 16 }}>
            <Stat label="Menu Price" value={`$${menu.price.toFixed(2)}`}/>
            <Stat label="Recipe Cost" value={`$${cost.toFixed(2)}`}/>
            <Stat label="Margin" value={`${margin.toFixed(1)}%`} sub={margin > 65 ? "Healthy" : "Review"}/>
            <Stat label="POS Map" value={menu.posMap.toast || "—"} sub="Toast SKU"/>
          </Grid>

          <Card title={`${menu.name} · Ingredient Map`} subtitle="Deducted automatically when this item is rung in" pad={0}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
                <Th>Ingredient</Th><Th>Station</Th><Th align="right">Qty / sale</Th><Th align="right">Unit cost</Th><Th align="right">Sale cost</Th>
              </tr></thead>
              <tbody>
                {menu.recipe.map(r => {
                  const it = items.find((i: Item) => i.id === r.itemId);
                  if (!it) return null;
                  return (
                    <tr key={r.itemId} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: ui.ink }}>{it.name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{it.station}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12 }}>{r.qty} {it.unit}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.muted }}>${it.costPerUnit.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.ink2, fontWeight: 600 }}>${(it.costPerUnit * r.qty).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </Grid>
    </div>
  );
}

/* ============================================================
   FORECASTING
   ============================================================ */
function Forecast({ items, sales }: any) {
  const proj = items.map((i: Item) => {
    const avg7 = i.usage.reduce((s, v) => s + v, 0) / 7;
    const hoursLeft = avg7 > 0 ? (i.current / avg7) * 24 : 999;
    return { ...i, avg7, hoursLeft };
  }).sort((a: any, b: any) => a.hoursLeft - b.hoursLeft);

  return (
    <div>
      <PageHeader title="Forecasting" subtitle="AI projections · depletion · reorder · demand"/>

      <Grid cols="repeat(auto-fit, minmax(220px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Tomorrow Covers" value="312" sub="Forecast · 94% confidence" trend={{ dir: "up", v: "+8%", good: true }}/>
        <Stat label="Weather Factor" value="+12%" sub="Clear, 72°F · patio demand"/>
        <Stat label="Event Boost" value="+24%" sub="Concert · 8pm 3mi away"/>
        <Stat label="Items at Risk" value={String(proj.filter((p: any) => p.hoursLeft < 24).length)} sub="< 24h projected supply"/>
      </Grid>

      <Card title="Projected Depletion Timeline" subtitle="Based on 7-day usage × live sales velocity" pad={0}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
            <Th>Item</Th><Th>Station</Th><Th align="right">On Hand</Th><Th align="right">Avg/Day</Th><Th align="right">Runway</Th><Th align="right">Reorder</Th>
          </tr></thead>
          <tbody>
            {proj.slice(0, 10).map((p: any) => {
              const tone: any = p.hoursLeft < 12 ? "bad" : p.hoursLeft < 36 ? "warn" : "ok";
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{p.station}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12 }}>{p.current} {p.unit}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.muted }}>{p.avg7.toFixed(1)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}><Pill tone={tone}>{p.hoursLeft < 999 ? `${p.hoursLeft.toFixed(0)}h` : "stable"}</Pill></td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>{p.hoursLeft < 36 ? <Btn size="sm" variant="primary">Order</Btn> : <span style={{ fontSize: 11, color: ui.faint }}>—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================
   REPORTS
   ============================================================ */
function Reports({ items, sales }: any) {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Operational analytics across stations, items, and labor" actions={<><Btn variant="secondary">Export PDF</Btn><Btn variant="secondary">Email Daily</Btn></>}/>

      <Grid cols="repeat(auto-fit, minmax(220px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Waste %" value="2.4%" sub="Industry avg 5.8%" trend={{ dir: "down", v: "0.6%", good: true }}/>
        <Stat label="COGS" value="28.2%" sub="Target 30%" trend={{ dir: "down", v: "1.1%", good: true }}/>
        <Stat label="Labor Ratio" value="22.8%" sub="vs net sales"/>
        <Stat label="Prep Accuracy" value="94%" sub="Actual vs predicted"/>
      </Grid>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 16 }}>
        <Card title="7-Day Usage by Item" subtitle="Top consumers">
          {items.slice(0, 8).map((i: Item) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <div style={{ flex: 1, fontSize: 12 }}>{i.name}</div>
              <Bars data={i.usage} w={140} h={28}/>
              <span style={{ ...ui.mono, fontSize: 11, color: ui.muted, width: 40, textAlign: "right" }}>{i.usage.reduce((s,v)=>s+v,0)}</span>
            </div>
          ))}
        </Card>
        <Card title="Labor vs Output" subtitle="Items prepped per labor-hour">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
            {[42, 51, 48, 63, 71, 58, 67].map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ ...ui.mono, fontSize: 10, color: ui.muted }}>{v}</div>
                <div style={{ width: "100%", height: `${(v / 75) * 100}%`, background: ui.ink, borderRadius: 3 }}/>
                <div style={{ ...ui.mono, fontSize: 10, color: ui.faint }}>{["M","T","W","T","F","S","S"][i]}</div>
              </div>
            ))}
          </div>
        </Card>
      </Grid>

      <Card title="Inventory Heatmap" subtitle="Stock health across station × item">
        <div style={{ display: "grid", gridTemplateColumns: "120px repeat(7, 1fr)", gap: 4 }}>
          {/* header */}
          <div/>{Array.from({length:7}, (_,i) => <div key={i} style={{ ...ui.mono, fontSize: 10, color: ui.muted, textAlign: "center" }}>D{i+1}</div>)}
          {items.slice(0, 10).map((it: Item) => (
            <>
              <div key={`l-${it.id}`} style={{ fontSize: 11, color: ui.ink2, padding: "6px 0" }}>{it.name}</div>
              {it.usage.map((v, i) => {
                const pct = v / it.max;
                const bg = pct > 0.7 ? "#0F1115" : pct > 0.5 ? "#3B4046" : pct > 0.3 ? "#9098A1" : pct > 0.15 ? "#D5D9DE" : "#EFF1F4";
                return <div key={i} style={{ background: bg, borderRadius: 4, height: 26 }}/>;
              })}
            </>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   DELIVERIES
   ============================================================ */
function Deliveries({ items, setItems }: any) {
  const [pos, setPos] = useState<{ vendor: string; eta: string; lines: { name: string; qty: number }[] }[]>([
    { vendor: "Sysco", eta: "Today · 2:30pm", lines: [{ name: "Brioche Buns", qty: 240 }, { name: "Ground Beef 80/20", qty: 60 }] },
    { vendor: "US Foods", eta: "Tomorrow · 9am", lines: [{ name: "Ribeye 12oz", qty: 40 }, { name: "Salmon Filet", qty: 30 }] },
  ]);

  return (
    <div>
      <PageHeader title="Deliveries" subtitle="Incoming POs · scanning · receiving" actions={<Btn variant="primary">+ New PO</Btn>}/>
      <Grid cols="repeat(auto-fit, minmax(320px, 1fr))" gap={16}>
        {pos.map((p, i) => (
          <Card key={i} title={p.vendor} subtitle={`ETA · ${p.eta}`} action={<Pill tone="info">Inbound</Pill>}>
            {p.lines.map((l, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
                <span style={{ fontSize: 13 }}>{l.name}</span>
                <span style={{ ...ui.mono, fontSize: 12, color: ui.muted }}>×{l.qty}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="secondary" size="sm">Scan Barcode</Btn>
              <Btn variant="primary" size="sm">Receive All</Btn>
            </div>
          </Card>
        ))}
      </Grid>
    </div>
  );
}

/* ============================================================
   INTEGRATIONS
   ============================================================ */
function Integrations({ integrations, setIntegrations, posLive, setPosLive }: any) {
  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect POS, accounting, and supplier systems"/>

      <Card title="POS Sync Status" subtitle="Real-time connection health" action={<Pill tone={posLive ? "ok" : "neutral"}>{Icon.dot(posLive ? ui.ok : ui.muted)} {posLive ? "Live" : "Paused"}</Pill>} style={{ marginBottom: 16 }}>
        <Grid cols="repeat(auto-fit, minmax(160px, 1fr))" gap={10}>
          <div>
            <div style={{ fontSize: 11, color: ui.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.6 }}>Active POS</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>Toast</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: ui.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.6 }}>Last sync</div>
            <div style={{ ...ui.mono, fontSize: 14, marginTop: 4 }}>8s ago</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: ui.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.6 }}>Records / day</div>
            <div style={{ ...ui.mono, fontSize: 14, marginTop: 4 }}>1,284</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: ui.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.6 }}>Webhook latency</div>
            <div style={{ ...ui.mono, fontSize: 14, marginTop: 4 }}>p95 · 142ms</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setPosLive((v: boolean) => !v)}>{posLive ? "Pause sync" : "Resume sync"}</Btn>
          </div>
        </Grid>
      </Card>

      {["POS", "Accounting", "Supplier"].map(cat => (
        <Card key={cat} title={cat === "POS" ? "Point of Sale" : cat} subtitle={`${integrations.filter((i: Integration) => i.category === cat).length} available`} style={{ marginBottom: 16 }} pad={0}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 0 }}>
            {integrations.filter((i: Integration) => i.category === cat).map((ig: Integration, idx: number, arr: Integration[]) => (
              <div key={ig.id} style={{ padding: 16, borderRight: idx % 3 !== 2 ? `1px solid ${ui.lineSoft}` : "none", borderBottom: `1px solid ${ui.lineSoft}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: "#F1F2F4", borderRadius: 6, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, color: ui.ink2 }}>{ig.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ig.name}</div>
                      {ig.lastSync && <div style={{ fontSize: 10, color: ui.muted, ...ui.mono }}>sync · {ig.lastSync}</div>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Pill tone={ig.status === "connected" ? "ok" : ig.status === "error" ? "bad" : "neutral"}>
                    {ig.status === "connected" ? "Connected" : ig.status === "error" ? "Error" : "Available"}
                  </Pill>
                  {ig.status === "connected" ? (
                    <Btn size="sm" variant="ghost">Configure</Btn>
                  ) : (
                    <Btn size="sm" variant="secondary" onClick={() => setIntegrations((prev: Integration[]) => prev.map(p => p.id === ig.id ? { ...p, status: "connected", lastSync: "just now", records: 0 } : p))}>Connect</Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card title="Menu Item Mapping" subtitle="Map POS items to KitchenIntel recipes" pad={0}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
            <Th>POS SKU</Th><Th>POS Name</Th><Th>Mapped Recipe</Th><Th>Status</Th>
          </tr></thead>
          <tbody>
            {MENU.map(m => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                <td style={{ padding: "12px 16px", ...ui.mono, fontSize: 12, color: ui.muted }}>{m.posMap.toast || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{m.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{m.name} <span style={{ color: ui.muted, fontWeight: 400 }}>· {m.recipe.length} ing</span></td>
                <td style={{ padding: "12px 16px" }}><Pill tone="ok">Mapped</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================
   SETTINGS
   ============================================================ */
function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Workspace, locations, users, and roles"/>
      <Grid cols="1fr 1fr" gap={16}>
        <Card title="Workspace">
          <Field label="Restaurant name" defaultValue="Maison Group"/>
          <Field label="Timezone" defaultValue="America/Los_Angeles"/>
          <Field label="Default location" defaultValue="Downtown · Main St"/>
        </Card>
        <Card title="Locations">
          {["Downtown · Main St", "Westside · Marina", "Airport Terminal B"].map(l => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <span style={{ fontSize: 13 }}>{l}</span>
              <Pill tone="ok">Active</Pill>
            </div>
          ))}
          <Btn variant="secondary" size="sm" style={{ marginTop: 10 }}>+ Add Location</Btn>
        </Card>
        <Card title="Users & Roles">
          {[
            { n: "Jamie M.", r: "Owner" }, { n: "Diego R.", r: "Manager" }, { n: "Sam K.", r: "Prep Lead" }, { n: "Avery T.", r: "Line Cook" }
          ].map(u => (
            <div key={u.n} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.n}</div>
                <div style={{ fontSize: 11, color: ui.muted }}>{u.r}</div>
              </div>
              <Btn size="sm" variant="ghost">Manage</Btn>
            </div>
          ))}
        </Card>
        <Card title="API & Webhooks">
          <Field label="API Key" defaultValue="ki_live_••••••••3f8a"/>
          <Field label="Webhook URL" defaultValue="https://api.kitchenintel.io/v1/hooks/toast"/>
          <div style={{ marginTop: 10 }}><Pill tone="ok">{Icon.dot(ui.ok)} 4 webhooks active</Pill></div>
        </Card>
      </Grid>
    </div>
  );
}

function Field({ label, defaultValue }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: ui.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
      <input defaultValue={defaultValue} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${ui.line}`, borderRadius: 8, fontSize: 13, background: "#fff", color: ui.ink }}/>
    </div>
  );
}

/* ============================================================
   LAYOUT HELPERS
   ============================================================ */
function PageHeader({ title, subtitle, actions }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.ink, letterSpacing: -0.5 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: ui.muted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

function Grid({ cols, gap = 16, children, style }: any) {
  const isMobile = useIsMobile();
  return <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : cols, gap, ...style }}>{children}</div>;
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const fn = () => setM(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return m;
}
