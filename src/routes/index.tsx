import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { scanImage } from "@/lib/scan.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KitchenIntel — AI Kitchen Operating System" },
      { name: "description", content: "AI-powered kitchen OS: inventory, prep, sales intelligence, POS sync, forecasting, and AI scanning for modern restaurants." },
    ],
  }),
  component: KitchenIntel,
});

/* ============================================================
   DESIGN SYSTEM — enterprise / operational
   ============================================================ */
const ui = {
  font: { fontFamily: '"Inter", "DM Sans", -apple-system, system-ui, sans-serif' },
  mono: { fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
  bg: "#F7F8FA", panel: "#FFFFFF", panel2: "#FBFBFC",
  sidebar: "#0F1115", sidebarHover: "#1A1D23", sidebarText: "#E5E7EB", sidebarMuted: "#8B8F98",
  ink: "#0B0D10", ink2: "#1F2328", muted: "#6B7280", faint: "#9AA0A6",
  line: "#E6E8EC", lineSoft: "#EEF0F3",
  ok: "#0F7A4A", okBg: "#E8F5EE",
  warn: "#A86A00", warnBg: "#FFF4E0",
  bad: "#B42318", badBg: "#FDECEA",
  info: "#1F4ED8", infoBg: "#EEF2FF",
  shadow: "0 1px 2px rgba(16,24,40,.04), 0 1px 1px rgba(16,24,40,.02)",
  shadowMd: "0 4px 12px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)",
};

/* ============================================================
   TYPES
   ============================================================ */
type Item = {
  id: string; name: string; unit: string;
  max: number; current: number; par: number;
  station: string; category: string; costPerUnit: number;
  usage: number[]; vendor?: string; barcode?: string;
};
type RecipeIngredient = { itemId: string; qty: number };
type MenuItem = {
  id: string; name: string; station: string; price: number;
  posMap: { toast?: string; square?: string; clover?: string };
  recipe: RecipeIngredient[];
};
type SalesRow = { menuId: string; hour: number; qty: number };
type Location = { id: string; name: string; address?: string; active: boolean };
type Vendor = { id: string; name: string; contact?: string; category?: string };
type Integration = {
  id: string; name: string; category: "POS" | "Accounting" | "Reporting" | "Supplier";
  status: "connected" | "available" | "error"; lastSync?: string; records?: number;
};

/* ============================================================
   SEED DATA (first-run only, persisted to localStorage)
   ============================================================ */
const DEFAULT_STATIONS = ["Flat Top", "Fryer", "Sauté", "Char Grill", "Cold Line"];
const DEFAULT_CATEGORIES = ["Produce", "Protein", "Dairy", "Bakery", "Pantry", "Frozen", "Beverage"];
const DEFAULT_VENDORS: Vendor[] = [
  { id: "v_sysco", name: "Sysco", category: "Broadline" },
  { id: "v_usf",   name: "US Foods", category: "Broadline" },
];

const seedItems = (): Item[] => {
  const base: Omit<Item, "usage" | "current">[] = [
    { id: "buns",    name: "Brioche Buns",      unit: "ea", max: 240, par: 120, station: "Flat Top",  category: "Bakery",  costPerUnit: 0.42 },
    { id: "beef",    name: "Ground Beef 80/20", unit: "lb", max: 80,  par: 40,  station: "Flat Top",  category: "Protein", costPerUnit: 5.20 },
    { id: "cheese",  name: "American Cheese",   unit: "sl", max: 400, par: 180, station: "Flat Top",  category: "Dairy",   costPerUnit: 0.18 },
    { id: "tomato",  name: "Tomato",            unit: "sl", max: 320, par: 160, station: "Cold Line", category: "Produce", costPerUnit: 0.09 },
    { id: "lettuce", name: "Iceberg Lettuce",   unit: "oz", max: 160, par: 70,  station: "Cold Line", category: "Produce", costPerUnit: 0.22 },
    { id: "fries",   name: "Shoestring Fries",  unit: "lb", max: 120, par: 60,  station: "Fryer",     category: "Frozen",  costPerUnit: 1.80 },
    { id: "oil",     name: "Fryer Oil",         unit: "L",  max: 40,  par: 18,  station: "Fryer",     category: "Pantry",  costPerUnit: 3.40 },
    { id: "wraps",   name: 'Flour Wraps 10"',   unit: "ea", max: 160, par: 70,  station: "Sauté",     category: "Bakery",  costPerUnit: 0.28 },
    { id: "chicken", name: "Chicken Breast",    unit: "lb", max: 90,  par: 45,  station: "Sauté",     category: "Protein", costPerUnit: 4.10 },
    { id: "ribeye",  name: "Ribeye 12oz",       unit: "ea", max: 60,  par: 24,  station: "Char Grill",category: "Protein", costPerUnit: 11.50 },
    { id: "salmon",  name: "Salmon Filet",      unit: "ea", max: 50,  par: 22,  station: "Char Grill",category: "Protein", costPerUnit: 8.20 },
    { id: "onion",   name: "Diced Onion",       unit: "lb", max: 40,  par: 18,  station: "Flat Top",  category: "Produce", costPerUnit: 0.95 },
    { id: "pickle",  name: "Pickle Slices",     unit: "sl", max: 500, par: 220, station: "Cold Line", category: "Pantry",  costPerUnit: 0.04 },
    { id: "bacon",   name: "Bacon Strips",      unit: "ea", max: 240, par: 100, station: "Flat Top",  category: "Protein", costPerUnit: 0.65 },
  ];
  return base.map((b) => {
    const usage = Array.from({ length: 7 }, (_, i) => Math.round(b.max * (0.35 + 0.15 * Math.sin(i + b.id.length))));
    const current = Math.round(b.max * (0.45 + 0.4 * Math.random()));
    return { ...b, current, usage };
  });
};

const DEFAULT_MENU: MenuItem[] = [
  { id: "m_burger",   name: "Classic Burger",       station: "Flat Top",   price: 13.5, posMap: { toast: "TST-1001" }, recipe: [
    { itemId: "buns", qty: 1 }, { itemId: "beef", qty: 0.33 }, { itemId: "cheese", qty: 1 },
    { itemId: "tomato", qty: 2 }, { itemId: "lettuce", qty: 0.6 }, { itemId: "onion", qty: 0.05 }, { itemId: "pickle", qty: 3 },
  ]},
  { id: "m_dblburger",name: "Double Stack",         station: "Flat Top",   price: 16.5, posMap: { toast: "TST-1002" }, recipe: [
    { itemId: "buns", qty: 1 }, { itemId: "beef", qty: 0.55 }, { itemId: "cheese", qty: 2 },
    { itemId: "bacon", qty: 2 }, { itemId: "onion", qty: 0.05 }, { itemId: "pickle", qty: 3 },
  ]},
  { id: "m_fries",    name: "Shoestring Fries",     station: "Fryer",      price: 5.5,  posMap: { toast: "TST-2001" }, recipe: [
    { itemId: "fries", qty: 0.32 }, { itemId: "oil", qty: 0.04 },
  ]},
  { id: "m_chxwrap",  name: "Grilled Chicken Wrap", station: "Sauté",      price: 12.0, posMap: { toast: "TST-3001" }, recipe: [
    { itemId: "wraps", qty: 1 }, { itemId: "chicken", qty: 0.35 }, { itemId: "lettuce", qty: 0.5 }, { itemId: "tomato", qty: 2 },
  ]},
  { id: "m_ribeye",   name: "Ribeye 12oz",          station: "Char Grill", price: 38.0, posMap: { toast: "TST-4001" }, recipe: [{ itemId: "ribeye", qty: 1 }]},
  { id: "m_salmon",   name: "Wild Salmon",          station: "Char Grill", price: 28.0, posMap: { toast: "TST-4002" }, recipe: [{ itemId: "salmon", qty: 1 }]},
];

const INTEGRATIONS_SEED: Integration[] = [
  { id: "toast",      name: "Toast POS",      category: "POS", status: "connected", lastSync: "live", records: 1284 },
  { id: "square",     name: "Square",         category: "POS", status: "available" },
  { id: "clover",     name: "Clover",         category: "POS", status: "available" },
  { id: "lightspeed", name: "Lightspeed",     category: "POS", status: "available" },
  { id: "revel",      name: "Revel Systems",  category: "POS", status: "available" },
  { id: "shopify",    name: "Shopify POS",    category: "POS", status: "available" },
  { id: "ncr",        name: "NCR Aloha",      category: "POS", status: "available" },
  { id: "qbooks",     name: "QuickBooks",     category: "Accounting", status: "available" },
];

/* ============================================================
   STORAGE
   ============================================================ */
const LS_KEY = "ki_state_v1";
type Persist = {
  brand: string;
  locations: Location[];
  activeLocationId: string | null;
  stations: string[];
  categories: string[];
  vendors: Vendor[];
  items: Item[];
  menu: MenuItem[];
};
function loadState(): Persist | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveState(s: Persist) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}
const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

/* ============================================================
   APP CONTEXT
   ============================================================ */
type AppCtx = {
  brand: string; setBrand: (s: string) => void;
  locations: Location[]; setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  activeLocationId: string | null; setActiveLocationId: (id: string | null) => void;
  stations: string[]; setStations: React.Dispatch<React.SetStateAction<string[]>>;
  categories: string[]; setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  vendors: Vendor[]; setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  menu: MenuItem[]; setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  sales: SalesRow[]; setSales: React.Dispatch<React.SetStateAction<SalesRow[]>>;
};
const Ctx = createContext<AppCtx | null>(null);
const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
};

/* ============================================================
   ICONS
   ============================================================ */
const Icon = {
  dot: (c: string) => <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: c }} />,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 21a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6"/></svg>,
  menu: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  camera: (size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 8h3l2-2h6l2 2h3v11H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 15V3M7 8l5-5 5 5M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  arrowUp: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const NAV: { id: string; label: string; svg: React.ReactNode }[] = [
  { id: "dashboard",   label: "Dashboard",          svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="3" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="11" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="15" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { id: "scanner",     label: "AI Scanner",         svg: Icon.camera(16) },
  { id: "stations",    label: "Stations",           svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 10h16M4 14h16M6 6h12v12H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> },
  { id: "inventory",   label: "Full Inventory",     svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> },
  { id: "prep",        label: "Prep",               svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M6 7v12a2 2 0 002 2h8a2 2 0 002-2V7M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { id: "sales",       label: "Sales Intelligence", svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 20h18M5 16l4-6 4 3 6-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "recipes",     label: "Recipe Engine",      svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l3 3v15H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { id: "forecast",    label: "Forecasting",        svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 17l4-4 3 3 5-7 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "reports",     label: "Reports",            svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { id: "deliveries",  label: "Deliveries",         svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { id: "integrations",label: "Integrations",       svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 4h4v4M14 20h-4v-4M4 10v4h4M20 14v-4h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "settings",    label: "Settings",           svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2L5.1 6 3.1 9.4l2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
];

/* ============================================================
   PRIMITIVES
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
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: s.c, background: s.b, border: `1px solid ${s.bd}`, letterSpacing: -0.1 }}>{children}</span>;
}
function Btn({ variant = "secondary", children, onClick, style, size = "md", disabled, type }: any) {
  const sizes: any = { sm: { p: "6px 10px", fs: 12 }, md: { p: "8px 14px", fs: 13 }, lg: { p: "10px 18px", fs: 14 } };
  const sz = sizes[size];
  const base: any = { borderRadius: 8, fontWeight: 600, fontSize: sz.fs, padding: sz.p, cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s", border: "1px solid", letterSpacing: -0.1, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1 };
  const variants: any = {
    primary:   { background: ui.ink, color: "#fff", borderColor: ui.ink },
    secondary: { background: "#fff", color: ui.ink, borderColor: ui.line },
    ghost:     { background: "transparent", color: ui.ink2, borderColor: "transparent" },
    danger:    { background: "#fff", color: ui.bad, borderColor: "#F3C7C0" },
  };
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}
function Stat({ label, value, sub, trend }: any) {
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
  const max = Math.max(...data, 1); const min = Math.min(...data, 0);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return <svg width={w} height={h}><polyline fill="none" stroke={stroke} strokeWidth="1.5" points={pts} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Bars({ data, w = 120, h = 32, color = ui.ink2 }: { data: number[]; w?: number; h?: number; color?: string }) {
  const max = Math.max(...data, 1); const bw = w / data.length - 2;
  return <svg width={w} height={h}>{data.map((v, i) => { const bh = Math.max(2, (v / max) * h); return <rect key={i} x={i * (bw + 2)} y={h - bh} width={bw} height={bh} fill={color} rx="1.5"/>; })}</svg>;
}
const selectStyle: React.CSSProperties = { padding: "8px 12px", border: `1px solid ${ui.line}`, borderRadius: 8, fontSize: 13, background: "#fff", color: ui.ink, fontWeight: 500, cursor: "pointer" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: `1px solid ${ui.line}`, borderRadius: 8, fontSize: 13, background: "#fff", color: ui.ink };

function statusOf(it: Item): { tone: "ok" | "warn" | "bad"; label: string } {
  if (it.current <= it.par * 0.4) return { tone: "bad", label: "Critical" };
  if (it.current <= it.par) return { tone: "warn", label: "Low" };
  return { tone: "ok", label: "In stock" };
}
const Th = ({ children, align = "left" }: any) => <th style={{ padding: "10px 16px", textAlign: align, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, color: ui.muted }}>{children}</th>;
function PageHeader({ title, subtitle, actions }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.ink, letterSpacing: -0.5 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: ui.muted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
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
    const fn = () => setM(mq.matches); fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return m;
}

/* ============================================================
   MAIN APP — provider + shell
   ============================================================ */
function KitchenIntel() {
  // hydrate from localStorage (first paint with seed; SSR-safe via effect)
  const [hydrated, setHydrated] = useState(false);
  const [brand, setBrand] = useState("KitchenIntel");
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [stations, setStations] = useState<string[]>(DEFAULT_STATIONS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [vendors, setVendors] = useState<Vendor[]>(DEFAULT_VENDORS);
  const [items, setItems] = useState<Item[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>(DEFAULT_MENU);
  const [sales, setSales] = useState<SalesRow[]>([]);

  useEffect(() => {
    const s = loadState();
    if (s) {
      setBrand(s.brand ?? "KitchenIntel");
      setLocations(s.locations ?? []);
      setActiveLocationId(s.activeLocationId ?? null);
      setStations(s.stations ?? DEFAULT_STATIONS);
      setCategories(s.categories ?? DEFAULT_CATEGORIES);
      setVendors(s.vendors ?? DEFAULT_VENDORS);
      setItems(s.items?.length ? s.items : seedItems());
      setMenu(s.menu ?? DEFAULT_MENU);
    } else {
      setItems(seedItems());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ brand, locations, activeLocationId, stations, categories, vendors, items, menu });
  }, [hydrated, brand, locations, activeLocationId, stations, categories, vendors, items, menu]);

  const ctxValue: AppCtx = {
    brand, setBrand,
    locations, setLocations, activeLocationId, setActiveLocationId,
    stations, setStations, categories, setCategories, vendors, setVendors,
    items, setItems, menu, setMenu, sales, setSales,
  };

  return (
    <Ctx.Provider value={ctxValue}>
      <Shell hydrated={hydrated}/>
    </Ctx.Provider>
  );
}

function Shell({ hydrated }: { hydrated: boolean }) {
  const app = useApp();
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posLive, setPosLive] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_SEED);
  const [now, setNow] = useState(new Date());
  const isMobile = useIsMobile();

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // POS sim → recipe-driven deduction
  useEffect(() => {
    if (!posLive) return;
    const t = setInterval(() => {
      const hour = new Date().getHours();
      const picks = 1 + Math.floor(Math.random() * 3);
      const newRows: SalesRow[] = [];
      for (let i = 0; i < picks; i++) {
        const m = app.menu[Math.floor(Math.random() * app.menu.length)];
        if (!m) continue;
        const qty = 1 + Math.floor(Math.random() * 3);
        newRows.push({ menuId: m.id, hour, qty });
      }
      app.setItems(prev => {
        const next = prev.map(p => ({ ...p }));
        const byId: Record<string, Item> = Object.fromEntries(next.map(n => [n.id, n]));
        for (const row of newRows) {
          const m = app.menu.find(mm => mm.id === row.menuId);
          if (!m) continue;
          for (const r of m.recipe) {
            const it = byId[r.itemId];
            if (it) it.current = Math.max(0, +(it.current - r.qty * row.qty).toFixed(2));
          }
        }
        return next;
      });
      app.setSales(s => [...newRows, ...s].slice(0, 200));
    }, 5000);
    return () => clearInterval(t);
  }, [posLive, app.menu]);

  const stats = useMemo(() => {
    const total = app.items.length;
    const critical = app.items.filter(i => i.current <= i.par * 0.4).length;
    const low = app.items.filter(i => i.current > i.par * 0.4 && i.current <= i.par).length;
    const value = app.items.reduce((s, i) => s + i.current * i.costPerUnit, 0);
    const todaySales = app.sales.reduce((s, r) => { const m = app.menu.find(mm => mm.id === r.menuId); return s + (m ? m.price * r.qty : 0); }, 0);
    const itemsSold = app.sales.reduce((s, r) => s + r.qty, 0);
    return { total, critical, low, value, todaySales, itemsSold };
  }, [app.items, app.sales, app.menu]);

  const containerStyle: React.CSSProperties = { minHeight: "100vh", background: ui.bg, color: ui.ink, ...ui.font, display: "flex", letterSpacing: -0.1 };

  if (!hydrated) {
    return <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}><div style={{ color: ui.muted, fontSize: 13 }}>Loading workspace…</div></div>;
  }

  // First-run: no location → onboarding
  if (app.locations.length === 0) {
    return <Onboarding/>;
  }

  return (
    <div style={containerStyle}>
      <Sidebar tab={tab} setTab={(t: string) => { setTab(t); setSidebarOpen(false); }} open={sidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} brand={app.brand}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 56, borderBottom: `1px solid ${ui.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: `1px solid ${ui.line}`, borderRadius: 8, width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", color: ui.ink2 }}>
                <Icon.menu/>
              </button>
            )}
            <select value={app.activeLocationId ?? ""} onChange={(e) => app.setActiveLocationId(e.target.value || null)} style={{ ...selectStyle, fontWeight: 600 }}>
              {app.locations.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <Pill tone={posLive ? "ok" : "neutral"}>{Icon.dot(posLive ? ui.ok : ui.muted)} POS {posLive ? "Live" : "Paused"}</Pill>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn size="sm" variant="primary" onClick={() => setTab("scanner")} style={{ display: isMobile ? "none" : "inline-flex" }}>{Icon.camera(14)} Scan</Btn>
            <div style={{ ...ui.mono, fontSize: 12, color: ui.muted, display: isMobile ? "none" : "block" }}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <button style={{ background: "none", border: `1px solid ${ui.line}`, borderRadius: 8, width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", color: ui.ink2, position: "relative" }}>
              <Icon.bell/>
              {stats.critical > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, background: ui.bad, borderRadius: 999 }}/>}
            </button>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: "#E5E7EB", color: ui.ink, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>{app.brand[0]}</div>
          </div>
        </header>

        <main style={{ flex: 1, padding: isMobile ? 14 : 24, overflow: "auto" }}>
          {tab === "dashboard"    && <Dashboard stats={stats} setTab={setTab}/>}
          {tab === "scanner"      && <Scanner/>}
          {tab === "stations"     && <Stations/>}
          {tab === "inventory"    && <Inventory/>}
          {tab === "prep"         && <Prep/>}
          {tab === "sales"        && <SalesIntel/>}
          {tab === "recipes"      && <RecipeEngine/>}
          {tab === "forecast"     && <Forecast/>}
          {tab === "reports"      && <Reports/>}
          {tab === "deliveries"   && <Deliveries/>}
          {tab === "integrations" && <Integrations integrations={integrations} setIntegrations={setIntegrations} posLive={posLive} setPosLive={setPosLive}/>}
          {tab === "settings"     && <Settings/>}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   ONBOARDING — create first restaurant
   ============================================================ */
function Onboarding() {
  const app = useApp();
  const [brand, setBrand] = useState(app.brand);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const create = () => {
    if (!name.trim()) return;
    const loc: Location = { id: uid("loc"), name: name.trim(), address: address.trim() || undefined, active: true };
    app.setBrand(brand.trim() || "KitchenIntel");
    app.setLocations([loc]);
    app.setActiveLocationId(loc.id);
  };

  return (
    <div style={{ minHeight: "100vh", background: ui.bg, ...ui.font, display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#fff", border: `1px solid ${ui.line}`, borderRadius: 12, boxShadow: ui.shadowMd, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: ui.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>K</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>KitchenIntel</div>
        </div>
        <h2 style={{ margin: "18px 0 6px", fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>Set up your restaurant</h2>
        <p style={{ fontSize: 13, color: ui.muted, marginTop: 0, marginBottom: 22 }}>Create your first location to get started. You can add more locations, stations, and vendors anytime.</p>

        <Field label="Restaurant / Brand name" value={brand} onChange={setBrand} placeholder="e.g. Maison Group"/>
        <Field label="Location name" value={name} onChange={setName} placeholder="e.g. Flagship · Downtown"/>
        <Field label="Address (optional)" value={address} onChange={setAddress} placeholder="123 Main St, City"/>

        <Btn variant="primary" size="lg" onClick={create} disabled={!name.trim()} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
          Create workspace
        </Btn>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar({ tab, setTab, open, setOpen, isMobile, brand }: any) {
  const content = (
    <div style={{ width: 240, background: ui.sidebar, color: ui.sidebarText, height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid #1F232A` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#fff", display: "grid", placeItems: "center", color: ui.ink, fontWeight: 800, fontSize: 13 }}>{brand[0]}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: -0.2 }}>{brand}</div>
            <div style={{ fontSize: 10, color: ui.sidebarMuted, ...ui.mono, letterSpacing: 0.4 }}>KitchenIntel · OS</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: 10, overflow: "auto" }}>
        {NAV.map((n) => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 10px",
              background: active ? "#fff" : "transparent", color: active ? ui.ink : ui.sidebarText,
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500, marginBottom: 2, textAlign: "left",
            }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget.style.background = ui.sidebarHover); }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget.style.background = "transparent"); }}>
              <span style={{ opacity: active ? 1 : 0.85 }}>{n.svg}</span>
              {n.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 14, borderTop: `1px solid #1F232A`, fontSize: 11, color: ui.sidebarMuted }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Sync health</span><span style={{ color: ui.ok }}>● 99.8%</span></div>
        <div style={{ ...ui.mono, fontSize: 10 }}>edge-us-west-2 · 12ms</div>
      </div>
    </div>
  );
  if (!isMobile) return content;
  return (
    <>
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 40 }}/>}
      <div style={{ position: "fixed", left: 0, top: 0, zIndex: 50, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .25s" }}>{content}</div>
    </>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ stats, setTab }: any) {
  const { items, sales, menu } = useApp();
  const critical = items.filter(i => i.current <= i.par * 0.4);
  const recent = sales.slice(0, 8);
  const hourly = useMemo(() => { const arr = Array(12).fill(0); for (const r of sales) arr[r.hour % 12] += r.qty; return arr; }, [sales]);

  return (
    <div>
      <PageHeader title="Kitchen Dashboard" subtitle="Real-time operational overview" actions={<Btn variant="primary" onClick={() => setTab("scanner")}>{Icon.camera(14)} Scan items</Btn>}/>
      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Items Tracked" value={String(stats.total)} sub={`across ${new Set(items.map(i=>i.station)).size} stations`}/>
        <Stat label="Critical" value={String(stats.critical)} sub={`${stats.low} low · need attention`} trend={{ dir: "down", v: "2", good: true }}/>
        <Stat label="Inventory Value" value={`$${stats.value.toFixed(0)}`} sub="At current cost" trend={{ dir: "up", v: "3.2%", good: true }}/>
        <Stat label="Today's Sales" value={`$${stats.todaySales.toFixed(0)}`} sub={`${stats.itemsSold} items · live POS`} trend={{ dir: "up", v: "12%", good: true }}/>
      </Grid>

      <Grid cols="2fr 1fr" gap={16}>
        <Card title="Hourly Item Velocity" subtitle="Items sold per hour from connected POS" action={<Pill tone="info">Toast · Live</Pill>}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
            {hourly.map((v, i) => { const max = Math.max(...hourly, 1); return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ ...ui.mono, fontSize: 9, color: ui.faint }}>{v || ""}</div>
                <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: 2, background: i === new Date().getHours() % 12 ? ui.ink : "#D1D5DB", borderRadius: 3, transition: "height .3s" }}/>
                <div style={{ ...ui.mono, fontSize: 9, color: ui.muted }}>{i}</div>
              </div>
            ); })}
          </div>
        </Card>
        <Card title="Critical Inventory" subtitle={`${critical.length} items below threshold`} action={critical.length > 0 ? <Pill tone="bad">{Icon.dot(ui.bad)} Action needed</Pill> : <Pill tone="ok">All OK</Pill>}>
          {critical.length === 0 ? <div style={{ fontSize: 13, color: ui.muted, padding: "20px 0", textAlign: "center" }}>No critical items. Every station is stocked.</div> :
            critical.slice(0, 6).map(it => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</div><div style={{ fontSize: 11, color: ui.muted }}>{it.station}</div></div>
                <div style={{ ...ui.mono, fontSize: 13, color: ui.bad, fontWeight: 600 }}>{it.current}<span style={{ color: ui.faint, fontWeight: 400 }}>/{it.par}</span> {it.unit}</div>
              </div>
            ))
          }
        </Card>
      </Grid>

      <Grid cols="1fr 1fr" gap={16} style={{ marginTop: 16 }}>
        <Card title="Live Sales Feed" subtitle="Streaming from Toast POS" action={<Pill tone="ok">{Icon.dot(ui.ok)} Streaming</Pill>}>
          {recent.length === 0 ? <div style={{ fontSize: 13, color: ui.muted, padding: 12 }}>Waiting for POS events…</div> :
            recent.map((r, i) => { const m = menu.find(mm => mm.id === r.menuId); return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...ui.mono, fontSize: 10, color: ui.faint }}>{String(r.hour).padStart(2,"0")}:{String(Math.floor(Math.random()*60)).padStart(2,"0")}</span>
                  <span style={{ fontSize: 13 }}>{m?.name}</span>
                  <Pill tone="neutral">×{r.qty}</Pill>
                </div>
                <span style={{ ...ui.mono, fontSize: 12, color: ui.ink2 }}>${((m?.price ?? 0) * r.qty).toFixed(2)}</span>
              </div>
            ); })
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
   SCANNER — AI camera scanning system
   ============================================================ */
type ScanMode = "product" | "recipe" | "invoice";
type ScanState =
  | { kind: "idle" }
  | { kind: "preview"; dataUrl: string; mime: string }
  | { kind: "processing"; dataUrl: string }
  | { kind: "result"; dataUrl: string; mode: ScanMode; payload: any }
  | { kind: "error"; message: string };

function Scanner() {
  const app = useApp();
  const scanFn = useServerFn(scanImage);
  const [mode, setMode] = useState<ScanMode>("product");
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    if (!f) return;
    if (f.size > 9_000_000) { setState({ kind: "error", message: "Image too large. Use a smaller photo (under 9 MB)." }); return; }
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
    });
    setState({ kind: "preview", dataUrl, mime: f.type || "image/jpeg" });
  };

  const runScan = async () => {
    if (state.kind !== "preview") return;
    const { dataUrl, mime } = state;
    setState({ kind: "processing", dataUrl });
    try {
      const base64 = dataUrl.split(",")[1] || dataUrl;
      const res = await scanFn({ data: { imageBase64: base64, mimeType: mime, mode } });
      if (!res.ok) { setState({ kind: "error", message: res.error }); return; }
      setState({ kind: "result", dataUrl, mode, payload: res.result });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message || "Scan failed" });
    }
  };

  const reset = () => setState({ kind: "idle" });

  return (
    <div>
      <PageHeader title="AI Scanner" subtitle="Scan recipes, products, packaging, barcodes, and invoices — auto-populate inventory and recipes."/>

      {/* Mode picker */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["product", "recipe", "invoice"] as ScanMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "10px 16px", borderRadius: 10, border: `1px solid ${mode === m ? ui.ink : ui.line}`,
            background: mode === m ? ui.ink : "#fff", color: mode === m ? "#fff" : ui.ink,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            {m === "product" ? "📦 Product / Barcode" : m === "recipe" ? "📝 Recipe Sheet" : "🧾 Invoice / Delivery"}
          </button>
        ))}
      </div>

      <Grid cols="1fr 1fr" gap={16}>
        {/* LEFT: capture */}
        <Card title="Capture" subtitle={mode === "recipe" ? "Photograph handwritten or printed recipes" : mode === "invoice" ? "Photograph a delivery invoice" : "Photograph packaging, labels, or barcodes"}>
          {state.kind === "idle" && (
            <div style={{ border: `2px dashed ${ui.line}`, borderRadius: 12, padding: 32, textAlign: "center", background: ui.panel2 }}>
              <div style={{ display: "inline-grid", placeItems: "center", width: 56, height: 56, borderRadius: 999, background: "#fff", border: `1px solid ${ui.line}`, marginBottom: 14, color: ui.ink2 }}>{Icon.camera(24)}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Capture or upload an image</div>
              <div style={{ fontSize: 12, color: ui.muted, marginBottom: 16 }}>Tap one of the options below — works great on iPad in the kitchen</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn variant="primary" onClick={() => cameraInput.current?.click()}>{Icon.camera(14)} Use camera</Btn>
                <Btn onClick={() => fileInput.current?.click()}><Icon.upload/> Upload photo</Btn>
              </div>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}/>
              <input ref={fileInput}   type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}/>
            </div>
          )}

          {(state.kind === "preview" || state.kind === "processing" || state.kind === "result") && (
            <div>
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${ui.line}`, background: "#000" }}>
                <img src={state.dataUrl} alt="scan" style={{ width: "100%", display: "block", maxHeight: 380, objectFit: "contain" }}/>
                {state.kind === "processing" && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,21,.55)", display: "grid", placeItems: "center", color: "#fff" }}>
                    <div style={{ textAlign: "center" }}>
                      <ScanAnimation/>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>Analyzing image…</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>OCR · object detection · ingredient parsing</div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {state.kind === "preview" && <Btn variant="primary" onClick={runScan}>{Icon.camera(14)} Scan with AI</Btn>}
                {state.kind === "processing" && <Btn disabled>Processing…</Btn>}
                <Btn onClick={reset} variant="ghost">Start over</Btn>
              </div>
            </div>
          )}

          {state.kind === "error" && (
            <div style={{ padding: 18, background: ui.badBg, border: `1px solid #F3C7C0`, borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ui.bad, marginBottom: 6 }}>Scan failed</div>
              <div style={{ fontSize: 12, color: ui.ink2, marginBottom: 12 }}>{state.message}</div>
              <Btn onClick={reset}>Try again</Btn>
            </div>
          )}
        </Card>

        {/* RIGHT: review / guidance */}
        <Card title={state.kind === "result" ? "Review & save" : "How AI scanning works"} subtitle={state.kind === "result" ? `Confidence ${Math.round((state.payload.confidence ?? 0) * 100)}% — edit anything before saving` : "Vision model extracts structured data"}>
          {state.kind !== "result" ? (
            <div>
              <ScanStep n={1} title="Capture" body="Photograph the recipe, product, barcode, or invoice. Good lighting helps."/>
              <ScanStep n={2} title="AI extraction" body="Gemini Vision performs OCR, identifies items, parses quantities and units, and detects vendors and barcodes."/>
              <ScanStep n={3} title="Review" body="Edit any field before saving. Confidence score is shown so low-confidence scans are flagged."/>
              <ScanStep n={4} title="Auto-populate" body="Products are added to inventory (or merged with existing items). Recipes flow into the Recipe Engine with ingredient mappings."/>
              <div style={{ marginTop: 14, padding: 12, background: ui.infoBg, border: `1px solid #D5DDFA`, borderRadius: 8, fontSize: 12, color: ui.info, fontWeight: 600 }}>
                Powered by Lovable AI · Gemini 2.5 Flash · structured tool-calling output
              </div>
            </div>
          ) : state.mode === "recipe" ? (
            <RecipeReview payload={state.payload} onDone={reset}/>
          ) : (
            <ProductReview payload={state.payload} onDone={reset}/>
          )}
        </Card>
      </Grid>

      {/* recent scans hint */}
      <Card title="Bulk receiving" subtitle="Scan multiple items in sequence — each item is reviewed before saving" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, color: ui.muted }}>
          Tip: For a full delivery, use <b style={{ color: ui.ink2 }}>Invoice mode</b> and snap one photo of the packing slip — every line item will be extracted in one pass.
        </div>
      </Card>
    </div>
  );
}

function ScanAnimation() {
  return (
    <div style={{ display: "inline-block", position: "relative", width: 64, height: 64 }}>
      <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "#fff", borderRadius: 999, animation: "spin 1s linear infinite" }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
function ScanStep({ n, title, body }: any) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
      <div style={{ ...ui.mono, width: 22, height: 22, borderRadius: 999, background: ui.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: ui.muted, marginTop: 2, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function RecipeReview({ payload, onDone }: { payload: any; onDone: () => void }) {
  const app = useApp();
  const [name, setName] = useState(payload.name || "Untitled Recipe");
  const [station, setStation] = useState(payload.station && app.stations.includes(payload.station) ? payload.station : app.stations[0]);
  const [price, setPrice] = useState<number>(0);
  const [ings, setIngs] = useState<{ name: string; qty: number; unit: string; category?: string; selected: boolean; matchedItemId?: string | null }[]>(
    (payload.ingredients || []).map((i: any) => {
      const match = app.items.find(it => it.name.toLowerCase().includes((i.name || "").toLowerCase()) || (i.name || "").toLowerCase().includes(it.name.toLowerCase()));
      return { name: i.name, qty: i.qty, unit: i.unit, category: i.category, selected: true, matchedItemId: match?.id ?? null };
    })
  );

  const save = () => {
    // create missing items
    const newItems: Item[] = [];
    const recipe: RecipeIngredient[] = [];
    for (const ing of ings) {
      if (!ing.selected) continue;
      let itemId = ing.matchedItemId;
      if (!itemId) {
        const id = uid("itm");
        newItems.push({
          id, name: ing.name, unit: ing.unit || "ea",
          max: Math.max(50, ing.qty * 40), current: 0, par: Math.max(20, ing.qty * 15),
          station, category: ing.category && app.categories.includes(ing.category) ? ing.category : "Pantry",
          costPerUnit: 1, usage: Array(7).fill(0),
        });
        itemId = id;
      }
      recipe.push({ itemId, qty: ing.qty });
    }
    if (newItems.length) app.setItems(prev => [...prev, ...newItems]);
    const menuItem: MenuItem = { id: uid("m"), name, station, price: price || 0, posMap: {}, recipe };
    app.setMenu(prev => [...prev, menuItem]);
    onDone();
  };

  return (
    <div>
      <Field label="Recipe name" value={name} onChange={setName}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <FieldLabel>Station</FieldLabel>
          <select value={station} onChange={e => setStation(e.target.value)} style={{ ...inputStyle }}>
            {app.stations.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Menu price ($)</FieldLabel>
          <input type="number" step="0.01" value={price || ""} onChange={e => setPrice(parseFloat(e.target.value) || 0)} style={inputStyle}/>
        </div>
      </div>

      <FieldLabel>Ingredients ({ings.filter(i => i.selected).length} selected)</FieldLabel>
      <div style={{ border: `1px solid ${ui.line}`, borderRadius: 8, maxHeight: 260, overflow: "auto" }}>
        {ings.length === 0 && <div style={{ padding: 14, fontSize: 12, color: ui.muted }}>No ingredients detected.</div>}
        {ings.map((ing, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr 70px 60px auto", gap: 6, padding: "8px 10px", borderBottom: `1px solid ${ui.lineSoft}`, alignItems: "center" }}>
            <input type="checkbox" checked={ing.selected} onChange={e => setIngs(prev => prev.map((p, j) => j === i ? { ...p, selected: e.target.checked } : p))} style={{ accentColor: ui.ink }}/>
            <input value={ing.name} onChange={e => setIngs(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}/>
            <input type="number" step="0.01" value={ing.qty} onChange={e => setIngs(prev => prev.map((p, j) => j === i ? { ...p, qty: parseFloat(e.target.value) || 0 } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}/>
            <input value={ing.unit} onChange={e => setIngs(prev => prev.map((p, j) => j === i ? { ...p, unit: e.target.value } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}/>
            {ing.matchedItemId ? <Pill tone="ok">linked</Pill> : <Pill tone="info">new</Pill>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn variant="primary" onClick={save}><Icon.check/> Save recipe</Btn>
        <Btn variant="ghost" onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  );
}

function ProductReview({ payload, onDone }: { payload: any; onDone: () => void }) {
  const app = useApp();
  const [vendor, setVendor] = useState(payload.vendor || "");
  const [rows, setRows] = useState(
    (payload.products || []).map((p: any) => {
      const match = app.items.find(it => it.name.toLowerCase() === (p.name || "").toLowerCase());
      return {
        name: p.name, qty: p.qty, unit: p.unit, category: p.category && app.categories.includes(p.category) ? p.category : "Pantry",
        station: p.station && app.stations.includes(p.station) ? p.station : app.stations[0],
        suggestedPar: p.suggestedPar || Math.max(10, (p.qty || 1) * 0.5),
        unitCost: p.unitCost || 0, barcode: p.barcode || "",
        selected: true, matchedItemId: match?.id ?? null,
      };
    })
  );

  const save = () => {
    const newItems: Item[] = [];
    let updated = [...app.items];
    for (const r of rows) {
      if (!r.selected) continue;
      if (r.matchedItemId) {
        updated = updated.map(it => it.id === r.matchedItemId ? { ...it, current: Math.min(it.max, it.current + r.qty), vendor: vendor || it.vendor } : it);
      } else {
        newItems.push({
          id: uid("itm"), name: r.name, unit: r.unit || "ea",
          max: Math.max(r.suggestedPar * 2, r.qty * 2),
          current: r.qty, par: r.suggestedPar || 20,
          station: r.station, category: r.category,
          costPerUnit: r.unitCost || 1, usage: Array(7).fill(0),
          vendor: vendor || undefined, barcode: r.barcode || undefined,
        });
      }
    }
    app.setItems([...updated, ...newItems]);
    // upsert vendor
    if (vendor.trim() && !app.vendors.some(v => v.name.toLowerCase() === vendor.toLowerCase())) {
      app.setVendors(prev => [...prev, { id: uid("v"), name: vendor.trim() }]);
    }
    onDone();
  };

  return (
    <div>
      <Field label="Vendor / Supplier" value={vendor} onChange={setVendor} placeholder="e.g. Sysco"/>
      <FieldLabel>Detected products ({rows.filter((r: any) => r.selected).length} selected)</FieldLabel>
      <div style={{ border: `1px solid ${ui.line}`, borderRadius: 8, maxHeight: 320, overflow: "auto" }}>
        {rows.length === 0 && <div style={{ padding: 14, fontSize: 12, color: ui.muted }}>No products detected. Try a clearer photo.</div>}
        {rows.map((r: any, i: number) => (
          <div key={i} style={{ padding: 10, borderBottom: `1px solid ${ui.lineSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={r.selected} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, selected: e.target.checked } : p))} style={{ accentColor: ui.ink }}/>
              <input value={r.name} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, name: e.target.value } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, fontWeight: 600 }}/>
              {r.matchedItemId ? <Pill tone="ok">existing</Pill> : <Pill tone="info">new</Pill>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "70px 60px 1fr 1fr 70px", gap: 6 }}>
              <input type="number" step="0.01" value={r.qty} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, qty: parseFloat(e.target.value) || 0 } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 11 }} placeholder="Qty"/>
              <input value={r.unit} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, unit: e.target.value } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 11 }} placeholder="Unit"/>
              <select value={r.category} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, category: e.target.value } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 11 }}>{app.categories.map(c => <option key={c}>{c}</option>)}</select>
              <select value={r.station} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, station: e.target.value } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 11 }}>{app.stations.map(s => <option key={s}>{s}</option>)}</select>
              <input type="number" step="1" value={r.suggestedPar} onChange={e => setRows((prev: any) => prev.map((p: any, j: number) => j === i ? { ...p, suggestedPar: parseFloat(e.target.value) || 0 } : p))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 11 }} placeholder="Par"/>
            </div>
            {r.barcode && <div style={{ ...ui.mono, fontSize: 10, color: ui.muted, marginTop: 4 }}>UPC: {r.barcode}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn variant="primary" onClick={save}><Icon.check/> Save to inventory</Btn>
        <Btn variant="ghost" onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   STATIONS / INVENTORY / PREP / SALES / RECIPES / FORECAST / REPORTS
   ============================================================ */
function Stations() {
  const { items, setItems, stations } = useApp();
  const [active, setActive] = useState(stations[0]);
  useEffect(() => { if (!stations.includes(active)) setActive(stations[0]); }, [stations]);
  const list = items.filter(i => i.station === active);
  return (
    <div>
      <PageHeader title="Stations" subtitle="Real-time station-level inventory & depletion"/>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {stations.map(s => {
          const count = items.filter(i => i.station === s).length;
          const crit = items.filter(i => i.station === s && i.current <= i.par * 0.4).length;
          return (
            <button key={s} onClick={() => setActive(s)} style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${active === s ? ui.ink : ui.line}`,
              background: active === s ? ui.ink : "#fff", color: active === s ? "#fff" : ui.ink,
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8,
            }}>{s} <span style={{ ...ui.mono, fontSize: 10, opacity: 0.7 }}>{count}</span>
              {crit > 0 && <span style={{ width: 6, height: 6, borderRadius: 999, background: active === s ? "#fff" : ui.bad }}/>}
            </button>
          );
        })}
      </div>
      <Card title={`${active} Station`} subtitle={`${list.length} tracked items`} pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
              <Th>Item</Th><Th>Status</Th><Th align="right">On Hand</Th><Th align="right">Par</Th><Th align="right">7d</Th><Th align="right">Adjust</Th>
            </tr></thead>
            <tbody>
              {list.map(it => <ItemRow key={it.id} it={it} setItems={setItems}/>)}
            </tbody>
          </table>
        </div>
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
        <div style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <div style={{ flex: 1, maxWidth: 140, height: 4, background: ui.lineSoft, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: st.tone === "bad" ? ui.bad : st.tone === "warn" ? ui.warn : ui.ink2 }}/>
          </div>
          <span style={{ ...ui.mono, fontSize: 10, color: ui.muted }}>{pct.toFixed(0)}%</span>
        </div>
      </td>
      <td style={{ padding: "14px 16px" }}><Pill tone={st.tone}>{Icon.dot(st.tone === "bad" ? ui.bad : st.tone === "warn" ? ui.warn : ui.ok)}{st.label}</Pill></td>
      <td style={{ padding: "14px 16px", textAlign: "right", ...ui.mono, fontSize: 13, fontWeight: 600 }}>{it.current} <span style={{ color: ui.faint, fontWeight: 400 }}>{it.unit}</span></td>
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

function Inventory() {
  const { items, setItems, stations, categories } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [stn, setStn] = useState("all");
  const filtered = items.filter(i => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat !== "all" && i.category !== cat) return false;
    if (stn !== "all" && i.station !== stn) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Full Inventory" subtitle={`${items.length} SKUs · live tracking`} actions={<><Btn>Export CSV</Btn><Btn variant="primary">+ Add Item</Btn></>}/>
      <Card pad={0}>
        <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: `1px solid ${ui.lineSoft}`, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: ui.faint }}><Icon.search/></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search items…" style={{ ...inputStyle, padding: "8px 12px 8px 32px" }}/>
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)} style={selectStyle}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <select value={stn} onChange={e => setStn(e.target.value)} style={selectStyle}><option value="all">All stations</option>{stations.map(s => <option key={s}>{s}</option>)}</select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
              <Th>Item</Th><Th>Category</Th><Th>Station</Th><Th>Status</Th><Th align="right">On Hand</Th><Th align="right">Par</Th><Th align="right">Value</Th><Th align="right">7d</Th><Th></Th>
            </tr></thead>
            <tbody>
              {filtered.map(it => {
                const st = statusOf(it);
                return (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{it.name}{it.vendor && <span style={{ display: "block", fontSize: 10, color: ui.muted, fontWeight: 400, marginTop: 2 }}>via {it.vendor}</span>}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{it.category}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{it.station}</td>
                    <td style={{ padding: "12px 16px" }}><Pill tone={st.tone}>{st.label}</Pill></td>
                    <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12 }}>{it.current} {it.unit}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.muted }}>{it.par}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.ink2 }}>${(it.current * it.costPerUnit).toFixed(0)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}><Spark data={it.usage} w={70} h={20}/></td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}><Btn size="sm" variant="ghost" onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))}><Icon.x/></Btn></td>
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

function Prep() {
  const { items, stations } = useApp();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const tasks = items.filter(i => i.current < i.par).map(i => ({
    id: i.id, item: i.name, station: i.station, target: i.par - i.current, unit: i.unit,
    urgency: i.current <= i.par * 0.4 ? "high" : "normal",
  }));

  return (
    <div>
      <PageHeader title="Prep List" subtitle={`${tasks.length} tasks · auto-generated from par levels`} actions={<><Btn>Print</Btn><Btn variant="primary">Send to Stations</Btn></>}/>
      <Grid cols="repeat(auto-fit, minmax(260px, 1fr))" gap={12}>
        {stations.map(s => {
          const list = tasks.filter(t => t.station === s);
          return (
            <Card key={s} title={s} subtitle={`${list.length} tasks`} action={<Pill tone={list.some(t => t.urgency === "high") ? "bad" : "neutral"}>{list.length}</Pill>}>
              {list.length === 0 ? <div style={{ fontSize: 12, color: ui.muted, padding: "8px 0" }}>All stocked.</div> :
                list.map(t => (
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

function SalesIntel() {
  const { sales, items, menu } = useApp();
  const byMenu = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of sales) m[r.menuId] = (m[r.menuId] || 0) + r.qty;
    return menu.map(mn => ({ ...mn, qty: m[mn.id] || 0, revenue: (m[mn.id] || 0) * mn.price })).sort((a, b) => b.qty - a.qty);
  }, [sales, menu]);
  const hourly = useMemo(() => { const arr = Array(24).fill(0); for (const r of sales) arr[r.hour] += r.qty; return arr; }, [sales]);
  const burn = useMemo(() => {
    const b: Record<string, number> = {};
    for (const r of sales) { const m = menu.find(mm => mm.id === r.menuId); if (!m) continue; for (const ing of m.recipe) b[ing.itemId] = (b[ing.itemId] || 0) + ing.qty * r.qty; }
    return items.map(i => ({ ...i, burned: b[i.id] || 0 })).filter(x => x.burned > 0).sort((a, b) => b.burned - a.burned);
  }, [sales, items, menu]);

  const totalRev = byMenu.reduce((s, x) => s + x.revenue, 0);
  const totalQty = byMenu.reduce((s, x) => s + x.qty, 0);

  return (
    <div>
      <PageHeader title="Sales Intelligence" subtitle="Hourly velocity, item mix, ingredient burn" actions={<Pill tone="info">Toast · synced live</Pill>}/>
      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Net Sales" value={`$${totalRev.toFixed(0)}`} trend={{ dir: "up", v: "12.4%", good: true }}/>
        <Stat label="Items Sold" value={String(totalQty)}/>
        <Stat label="Avg Ticket" value={`$${totalQty ? (totalRev/totalQty).toFixed(2) : "0.00"}`}/>
        <Stat label="Rush Risk" value="MED" sub="Next 45 min · +18% expected"/>
      </Grid>
      <Card title="Hourly Sales Velocity" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160 }}>
          {hourly.map((v, i) => { const max = Math.max(...hourly, 1); const isPeak = v === max && v > 0; return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: 2, background: isPeak ? ui.ink : "#CBD0D7", borderRadius: 3 }}/>
              <div style={{ ...ui.mono, fontSize: 9, color: ui.muted }}>{i}h</div>
            </div>
          ); })}
        </div>
      </Card>
      <Grid cols="1fr 1fr" gap={16}>
        <Card title="Top Menu Items">
          {byMenu.slice(0, 8).map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <span style={{ ...ui.mono, fontSize: 11, color: ui.faint, width: 18 }}>{String(i+1).padStart(2,"0")}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: ui.muted }}>{m.station} · ${m.price.toFixed(2)}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ ...ui.mono, fontSize: 13, fontWeight: 600 }}>{m.qty}</div><div style={{ ...ui.mono, fontSize: 10, color: ui.muted }}>${m.revenue.toFixed(0)}</div></div>
            </div>
          ))}
        </Card>
        <Card title="Ingredient Burn Rate" action={<Pill tone="info">Recipe Engine</Pill>}>
          {burn.length === 0 ? <div style={{ fontSize: 13, color: ui.muted, padding: 12 }}>Waiting for sales…</div> :
            burn.slice(0, 8).map(b => (
              <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                  <span style={{ ...ui.mono, fontSize: 12, color: ui.ink2 }}>−{b.burned.toFixed(1)} {b.unit}</span>
                </div>
                <div style={{ height: 3, background: ui.lineSoft, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (b.burned / b.max) * 100)}%`, height: "100%", background: ui.bad }}/>
                </div>
              </div>
            ))
          }
        </Card>
      </Grid>
    </div>
  );
}

function RecipeEngine() {
  const { menu, items, setMenu } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(menu[0]?.id ?? null);
  useEffect(() => { if (!menu.find(m => m.id === selectedId)) setSelectedId(menu[0]?.id ?? null); }, [menu]);
  const m = menu.find(mm => mm.id === selectedId);
  const cost = m ? m.recipe.reduce((s, r) => { const it = items.find(i => i.id === r.itemId); return s + (it ? it.costPerUnit * r.qty : 0); }, 0) : 0;
  const margin = m && m.price > 0 ? ((m.price - cost) / m.price) * 100 : 0;

  return (
    <div>
      <PageHeader title="Recipe Engine" subtitle="Map menu items to inventory · auto-deduct on sale" actions={<Pill tone="info">Scan recipes in AI Scanner</Pill>}/>
      <Grid cols="280px 1fr" gap={16}>
        <Card title={`Menu (${menu.length})`} pad={0}>
          {menu.map(mm => (
            <button key={mm.id} onClick={() => setSelectedId(mm.id)} style={{
              width: "100%", textAlign: "left", padding: "12px 16px", border: "none",
              background: selectedId === mm.id ? ui.panel2 : "transparent",
              borderLeft: `3px solid ${selectedId === mm.id ? ui.ink : "transparent"}`,
              borderBottom: `1px solid ${ui.lineSoft}`, cursor: "pointer",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{mm.name}</div>
              <div style={{ fontSize: 11, color: ui.muted, marginTop: 2 }}>{mm.station} · ${mm.price.toFixed(2)} · {mm.recipe.length} ing</div>
            </button>
          ))}
        </Card>
        <div>
          {!m ? <Card><div style={{ fontSize: 13, color: ui.muted }}>Select or scan a recipe.</div></Card> : (
            <>
              <Grid cols="repeat(auto-fit, minmax(140px, 1fr))" gap={10} style={{ marginBottom: 16 }}>
                <Stat label="Menu Price" value={`$${m.price.toFixed(2)}`}/>
                <Stat label="Recipe Cost" value={`$${cost.toFixed(2)}`}/>
                <Stat label="Margin" value={`${margin.toFixed(1)}%`} sub={margin > 65 ? "Healthy" : "Review"}/>
                <Stat label="POS Map" value={m.posMap.toast || "—"} sub="Toast SKU"/>
              </Grid>
              <Card title={`${m.name} · Ingredient Map`} subtitle="Deducted automatically when this item is rung in" pad={0} action={<Btn size="sm" variant="danger" onClick={() => setMenu(prev => prev.filter(x => x.id !== m.id))}>Delete</Btn>}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                    <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
                      <Th>Ingredient</Th><Th>Station</Th><Th align="right">Qty / sale</Th><Th align="right">Unit cost</Th><Th align="right">Sale cost</Th>
                    </tr></thead>
                    <tbody>
                      {m.recipe.map(r => {
                        const it = items.find(i => i.id === r.itemId);
                        if (!it) return <tr key={r.itemId}><td colSpan={5} style={{ padding: 12, fontSize: 12, color: ui.muted }}>Missing item</td></tr>;
                        return (
                          <tr key={r.itemId} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{it.name}</td>
                            <td style={{ padding: "12px 16px", fontSize: 12, color: ui.muted }}>{it.station}</td>
                            <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12 }}>{r.qty} {it.unit}</td>
                            <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, color: ui.muted }}>${it.costPerUnit.toFixed(2)}</td>
                            <td style={{ padding: "12px 16px", textAlign: "right", ...ui.mono, fontSize: 12, fontWeight: 600 }}>${(it.costPerUnit * r.qty).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </Grid>
    </div>
  );
}

function Forecast() {
  const { items } = useApp();
  const proj = items.map(i => {
    const avg7 = i.usage.reduce((s, v) => s + v, 0) / 7;
    const hoursLeft = avg7 > 0 ? (i.current / avg7) * 24 : 999;
    return { ...i, avg7, hoursLeft };
  }).sort((a, b) => a.hoursLeft - b.hoursLeft);

  return (
    <div>
      <PageHeader title="Forecasting" subtitle="AI projections · depletion · reorder · demand"/>
      <Grid cols="repeat(auto-fit, minmax(220px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Tomorrow Covers" value="312" sub="Forecast · 94% confidence" trend={{ dir: "up", v: "+8%", good: true }}/>
        <Stat label="Weather Factor" value="+12%" sub="Clear, 72°F · patio demand"/>
        <Stat label="Event Boost" value="+24%" sub="Concert · 8pm 3mi away"/>
        <Stat label="Items at Risk" value={String(proj.filter(p => p.hoursLeft < 24).length)} sub="< 24h projected supply"/>
      </Grid>
      <Card title="Projected Depletion Timeline" subtitle="Based on 7-day usage × live sales velocity" pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
              <Th>Item</Th><Th>Station</Th><Th align="right">On Hand</Th><Th align="right">Avg/Day</Th><Th align="right">Runway</Th><Th align="right">Reorder</Th>
            </tr></thead>
            <tbody>
              {proj.slice(0, 12).map(p => {
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
        </div>
      </Card>
    </div>
  );
}

function Reports() {
  const { items } = useApp();
  return (
    <div>
      <PageHeader title="Reports" subtitle="Operational analytics across stations, items, and labor" actions={<><Btn>Export PDF</Btn><Btn>Email Daily</Btn></>}/>
      <Grid cols="repeat(auto-fit, minmax(220px, 1fr))" gap={12} style={{ marginBottom: 16 }}>
        <Stat label="Waste %" value="2.4%" sub="Industry avg 5.8%" trend={{ dir: "down", v: "0.6%", good: true }}/>
        <Stat label="COGS" value="28.2%" sub="Target 30%" trend={{ dir: "down", v: "1.1%", good: true }}/>
        <Stat label="Labor Ratio" value="22.8%" sub="vs net sales"/>
        <Stat label="Prep Accuracy" value="94%" sub="Actual vs predicted"/>
      </Grid>
      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 16 }}>
        <Card title="7-Day Usage by Item" subtitle="Top consumers">
          {items.slice(0, 8).map(i => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
              <div style={{ flex: 1, fontSize: 12 }}>{i.name}</div>
              <Bars data={i.usage} w={140} h={28}/>
              <span style={{ ...ui.mono, fontSize: 11, color: ui.muted, width: 40, textAlign: "right" }}>{i.usage.reduce((s, v) => s + v, 0)}</span>
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
    </div>
  );
}

function Deliveries() {
  const { vendors } = useApp();
  return (
    <div>
      <PageHeader title="Deliveries" subtitle="Incoming POs · scanning · receiving" actions={<Btn variant="primary">+ New PO</Btn>}/>
      <Grid cols="repeat(auto-fit, minmax(320px, 1fr))" gap={16}>
        {vendors.length === 0 ? <Card><div style={{ fontSize: 13, color: ui.muted }}>No vendors yet. Add vendors in Settings.</div></Card> :
          vendors.slice(0, 4).map(v => (
            <Card key={v.id} title={v.name} subtitle="No scheduled deliveries" action={<Pill tone="neutral">Idle</Pill>}>
              <div style={{ fontSize: 13, color: ui.muted, marginBottom: 12 }}>Use the AI Scanner to receive a delivery — snap one photo of the invoice and every line item will be added to inventory.</div>
              <Btn variant="primary" size="sm">{Icon.camera(14)} Scan invoice</Btn>
            </Card>
          ))
        }
      </Grid>
    </div>
  );
}

function Integrations({ integrations, setIntegrations, posLive, setPosLive }: any) {
  const { menu } = useApp();
  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect POS, accounting, and supplier systems"/>
      <Card title="POS Sync Status" action={<Pill tone={posLive ? "ok" : "neutral"}>{Icon.dot(posLive ? ui.ok : ui.muted)} {posLive ? "Live" : "Paused"}</Pill>} style={{ marginBottom: 16 }}>
        <Grid cols="repeat(auto-fit, minmax(160px, 1fr))" gap={10}>
          <div><div style={kvLabel}>Active POS</div><div style={kvValue}>Toast</div></div>
          <div><div style={kvLabel}>Last sync</div><div style={{ ...kvValue, ...ui.mono, fontSize: 14 }}>8s ago</div></div>
          <div><div style={kvLabel}>Records / day</div><div style={{ ...kvValue, ...ui.mono, fontSize: 14 }}>1,284</div></div>
          <div><div style={kvLabel}>Webhook latency</div><div style={{ ...kvValue, ...ui.mono, fontSize: 14 }}>p95 · 142ms</div></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}><Btn size="sm" onClick={() => setPosLive((v: boolean) => !v)}>{posLive ? "Pause" : "Resume"}</Btn></div>
        </Grid>
      </Card>

      {["POS", "Accounting", "Supplier"].map(cat => {
        const list = integrations.filter((i: Integration) => i.category === cat);
        if (list.length === 0) return null;
        return (
          <Card key={cat} title={cat === "POS" ? "Point of Sale" : cat} subtitle={`${list.length} available`} style={{ marginBottom: 16 }} pad={0}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {list.map((ig: Integration) => (
                <div key={ig.id} style={{ padding: 16, borderRight: `1px solid ${ui.lineSoft}`, borderBottom: `1px solid ${ui.lineSoft}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, background: "#F1F2F4", borderRadius: 6, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, color: ui.ink2 }}>{ig.name[0]}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{ig.name}</div>{ig.lastSync && <div style={{ fontSize: 10, color: ui.muted, ...ui.mono }}>sync · {ig.lastSync}</div>}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Pill tone={ig.status === "connected" ? "ok" : ig.status === "error" ? "bad" : "neutral"}>{ig.status === "connected" ? "Connected" : ig.status === "error" ? "Error" : "Available"}</Pill>
                    {ig.status === "connected"
                      ? <Btn size="sm" variant="ghost">Configure</Btn>
                      : <Btn size="sm" onClick={() => setIntegrations((prev: Integration[]) => prev.map(p => p.id === ig.id ? { ...p, status: "connected", lastSync: "just now" } : p))}>Connect</Btn>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Card title="Menu Item Mapping" subtitle="Map POS SKUs to KitchenIntel recipes" pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
            <thead><tr style={{ background: ui.panel2, borderBottom: `1px solid ${ui.line}` }}>
              <Th>POS SKU</Th><Th>POS Name</Th><Th>Mapped Recipe</Th><Th>Status</Th>
            </tr></thead>
            <tbody>
              {menu.map(m => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${ui.lineSoft}` }}>
                  <td style={{ padding: "12px 16px", ...ui.mono, fontSize: 12, color: ui.muted }}>{m.posMap.toast || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>{m.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{m.name} <span style={{ color: ui.muted, fontWeight: 400 }}>· {m.recipe.length} ing</span></td>
                  <td style={{ padding: "12px 16px" }}>{m.posMap.toast ? <Pill tone="ok">Mapped</Pill> : <Pill tone="warn">Unmapped</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
const kvLabel: React.CSSProperties = { fontSize: 11, color: ui.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.6 };
const kvValue: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginTop: 4 };

/* ============================================================
   SETTINGS — full admin
   ============================================================ */
function Settings() {
  const app = useApp();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Brand, locations, stations, categories, vendors, users"/>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 16 }}>
        <Card title="Brand">
          <Field label="Restaurant / Brand name" value={app.brand} onChange={app.setBrand}/>
        </Card>
        <Card title="API & Webhooks">
          <Field label="API Key" value={"ki_live_••••••••3f8a"} onChange={() => {}}/>
          <Field label="Webhook URL" value={"https://api.kitchenintel.io/v1/hooks"} onChange={() => {}}/>
          <Pill tone="ok">{Icon.dot(ui.ok)} 4 webhooks active</Pill>
        </Card>
      </Grid>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 16 }}>
        <LocationsAdmin/>
        <StationsAdmin/>
      </Grid>
      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 16 }}>
        <CategoriesAdmin/>
        <VendorsAdmin/>
      </Grid>

      <Card title="Users & Roles">
        {[
          { n: "Owner", r: "Full access" }, { n: "Manager", r: "All operations" }, { n: "Prep Lead", r: "Prep · receiving · scanner" }, { n: "Line Cook", r: "Read-only · station view" }
        ].map(u => (
          <div key={u.n} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{u.n}</div><div style={{ fontSize: 11, color: ui.muted }}>{u.r}</div></div>
            <Btn size="sm" variant="ghost">Manage</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

function LocationsAdmin() {
  const { locations, setLocations, activeLocationId, setActiveLocationId } = useApp();
  const [name, setName] = useState(""); const [address, setAddress] = useState("");
  const add = () => { if (!name.trim()) return; const loc: Location = { id: uid("loc"), name: name.trim(), address: address.trim() || undefined, active: true }; setLocations(prev => [...prev, loc]); setName(""); setAddress(""); };
  return (
    <Card title="Locations" subtitle={`${locations.length} restaurant${locations.length === 1 ? "" : "s"}`}>
      {locations.map(l => (
        <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name} {l.id === activeLocationId && <Pill tone="ok">active</Pill>}</div>
            {l.address && <div style={{ fontSize: 11, color: ui.muted }}>{l.address}</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {l.id !== activeLocationId && <Btn size="sm" onClick={() => setActiveLocationId(l.id)}>Set active</Btn>}
            {locations.length > 1 && <Btn size="sm" variant="danger" onClick={() => { setLocations(prev => prev.filter(x => x.id !== l.id)); if (activeLocationId === l.id) setActiveLocationId(locations.find(x => x.id !== l.id)?.id ?? null); }}><Icon.x/></Btn>}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input placeholder="Location name" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}/>
        <input placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}/>
        <Btn variant="primary" onClick={add}><Icon.plus/> Add</Btn>
      </div>
    </Card>
  );
}

function StationsAdmin() {
  const { stations, setStations } = useApp();
  const [name, setName] = useState("");
  const add = () => { const v = name.trim(); if (!v || stations.includes(v)) return; setStations(prev => [...prev, v]); setName(""); };
  return (
    <Card title="Stations" subtitle={`${stations.length} stations`}>
      {stations.map(s => (
        <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
          <span style={{ fontSize: 13 }}>{s}</span>
          {stations.length > 1 && <Btn size="sm" variant="ghost" onClick={() => setStations(prev => prev.filter(x => x !== s))}><Icon.x/></Btn>}
        </div>
      ))}
      <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
        <input placeholder="e.g. Pastry" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }}/>
        <Btn variant="primary" onClick={add}><Icon.plus/> Add</Btn>
      </div>
    </Card>
  );
}

function CategoriesAdmin() {
  const { categories, setCategories } = useApp();
  const [name, setName] = useState("");
  const add = () => { const v = name.trim(); if (!v || categories.includes(v)) return; setCategories(prev => [...prev, v]); setName(""); };
  return (
    <Card title="Categories" subtitle={`${categories.length} categories`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {categories.map(c => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", border: `1px solid ${ui.line}`, borderRadius: 999, fontSize: 12, background: "#fff" }}>
            {c}
            {categories.length > 1 && <button onClick={() => setCategories(prev => prev.filter(x => x !== c))} style={{ background: "none", border: "none", cursor: "pointer", color: ui.muted, display: "inline-flex" }}><Icon.x/></button>}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="e.g. Spirits" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }}/>
        <Btn variant="primary" onClick={add}><Icon.plus/> Add</Btn>
      </div>
    </Card>
  );
}

function VendorsAdmin() {
  const { vendors, setVendors } = useApp();
  const [name, setName] = useState(""); const [contact, setContact] = useState("");
  const add = () => { if (!name.trim()) return; setVendors(prev => [...prev, { id: uid("v"), name: name.trim(), contact: contact.trim() || undefined }]); setName(""); setContact(""); };
  return (
    <Card title="Vendors" subtitle={`${vendors.length} suppliers`}>
      {vendors.map(v => (
        <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ui.lineSoft}` }}>
          <div><div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>{v.contact && <div style={{ fontSize: 11, color: ui.muted }}>{v.contact}</div>}</div>
          <Btn size="sm" variant="ghost" onClick={() => setVendors(prev => prev.filter(x => x.id !== v.id))}><Icon.x/></Btn>
        </div>
      ))}
      <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input placeholder="Vendor name" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }}/>
        <input placeholder="Contact (optional)" value={contact} onChange={e => setContact(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }}/>
        <Btn variant="primary" onClick={add}><Icon.plus/> Add</Btn>
      </div>
    </Card>
  );
}

function FieldLabel({ children }: any) {
  return <div style={{ fontSize: 11, color: ui.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{children}</div>;
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <FieldLabel>{label}</FieldLabel>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle}/>
    </div>
  );
}
