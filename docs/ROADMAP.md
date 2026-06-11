# KitchenIntel — Audit & Prioritized Roadmap

_Audited: 2026-06-11 · Branch: clawbot-dev_

---

## Audit Summary

### Fully implemented
- Multi-project workspace (create, open, duplicate, rename, delete — localStorage)
- Onboarding flow (first-run brand + location setup)
- Station management (templates, custom, drag-to-reorder, hide/show, duplicate, cascade rename)
- Full Inventory view (search, filter, delete)
- Station view (per-station table, +/− adjustments, status pills, sparklines)
- Prep List (auto-generated from par levels, per-station, checkboxes, urgency)
- AI Scanner (camera + file, Gemini 2.5 Flash via Lovable Gateway, recipe/product/invoice modes, review + save)
- Recipe Engine (ingredient map, cost calc, margin display, delete)
- Square integration (full OAuth, webhook, catalog sync, order normalization, mapping UI)
- Toast integration (client_credentials, webhook, order normalization, mapping UI)
- Live POS feed polling (8s interval → recipe-driven inventory deduction)
- Demo POS simulator (5s random sales for local testing)
- Mobile-responsive layout (sidebar overlay, bottom tab bar, responsive grids)
- Categories and Vendors admin (full CRUD)
- Locations admin (add, set active, delete)

### Partially implemented
| Area | What works | What doesn't |
|---|---|---|
| Sales Intelligence | Real sales feed, top items, hourly chart, ingredient burn | Trend percentages, "Rush Risk", avg ticket are hardcoded |
| Forecasting | Depletion timeline from real usage data | Tomorrow covers (312), weather factor, event boost are all hardcoded |
| Reports | 7-day usage bars use real item data | Waste %, COGS, Labor Ratio, Prep Accuracy, labor chart are all hardcoded |
| Dashboard | Stat counts are real; hourly chart is real | "Toast · Live" badge and AI insights shown regardless of connection state; sales feed minutes display uses `Math.random()` |
| Deliveries | Shows vendor list | No PO management, no scheduled deliveries, no receiving workflow |
| Integrations | Toast + Square are real | Clover, Lightspeed, Revel, Shopify, NCR, QuickBooks "Connect" only toggles local component state; resets on refresh |
| Settings — API & Webhooks | Brand field saves | API key (`ki_live_••••••••3f8a`), webhook URL, and "4 webhooks active" are all fake/hardcoded |
| Settings — Users & Roles | Displays 4 roles | "Manage" button is inert; no real auth or role enforcement |
| Inventory actions | Delete works | "Export CSV" and "+ Add Item" buttons have no `onClick` |
| Prep actions | Checkboxes work | "Print" and "Send to Stations" buttons have no `onClick` |
| Reports actions | — | "Export PDF" and "Email Daily" have no `onClick` |
| Recipe editing | View and delete | No way to edit ingredients, price, or station |
| Item editing | Delete works | No edit modal — can't change name, par, station, category, unit cost |

### Hardcoded values that should be dynamic
- `projectId = "aa475a88-be51-4f31-9bb2-d0266a47d1be"` hardcoded in two places in `index.tsx` (lines 758, 1850) — should come from active project/user context
- Dashboard "Hourly Item Velocity" always says "Toast · Live" regardless of connection state
- Dashboard "Live Sales Feed" always says "Streaming from Toast POS"
- Sales Intelligence always shows "Toast · synced live"
- POS Sync Status card: "8s ago", "1,284 records/day", "p95 · 142ms" are hardcoded strings
- Forecasting stats: 312 covers, +12% weather, +24% event boost
- Reports: Waste 2.4%, COGS 28.2%, Labor Ratio 22.8%, Prep Accuracy 94%, labor chart `[42,51,48,63,71,58,67]`
- Dashboard AI Insights: all three cards have hardcoded text
- 7-day `usage` arrays on seed items: static values that never update from real sales

### Native browser dialogs (should be replaced)
- `window.prompt()` — project rename (line 547), station rename (line 2035)
- `window.confirm()` — project delete (line 599), station remove with items (line 2048)

### Missing entirely
- Auth system (`auth-attacher.ts` and `auth-middleware.ts` exist but are unwired)
- Server-side data persistence (all state is localStorage — changing browser loses everything)
- Item edit modal
- Recipe edit (ingredient/price editing)
- CSV export
- PDF/print export
- Email reporting
- Barcode lookup against a product database
- Real PO/delivery scheduling and receiving workflow
- Real user management and role enforcement
- Real forecasting engine (weather API, cover counts, event data)
- Real AI insights (computed from live inventory + sales, not hardcoded)
- Real COGS/waste/labor calculations
- Supplier ordering workflow from Forecast
- Clover, Lightspeed, Revel, Shopify POS, NCR Aloha, QuickBooks integrations

---

## Prioritized Roadmap

### P0 — Correctness bugs (fix before anything else)

| # | Issue | File | Effort |
|---|---|---|---|
| 1 | `projectId` hardcoded in `Integrations` and `Shell` — breaks multi-project; Square/Toast connect to wrong project if user has multiple | `index.tsx:758,1850` | XS |
| 2 | Sales feed minutes display uses `Math.random()` — causes hydration mismatches and flicker on every render | `index.tsx:1086` | XS |
| 3 | Non-POS integrations (Clover, etc.) "Connect" saves to local component state only — connection lost on page refresh, misleads users | `index.tsx:1888` | S |
| 4 | Dashboard connection-status badges ("Toast · Live", "Streaming from Toast POS") always shown regardless of actual connection | `index.tsx:1057,1081,1634` | S |

---

### P1 — Core missing CRUD (blocks daily use)

| # | Issue | Effort |
|---|---|---|
| 5 | **Item edit modal** — no way to edit name, unit, par, max, station, category, or cost after creation | M |
| 6 | **"+ Add Item" dialog** — Inventory button is inert; users must use scanner to add items | M |
| 7 | **Recipe edit** — can view/delete but cannot change ingredients, quantities, price, or station mapping | M |
| 8 | Replace `window.prompt()` / `window.confirm()` with inline modals (project rename, station rename, delete confirms) | S |

---

### P2 — Data integrity & persistence

| # | Issue | Effort |
|---|---|---|
| 9 | **Server-side persistence** — all data lives in localStorage; loses everything on new browser/incognito/device | L |
| 10 | **Auth system** — `auth-attacher.ts` and `auth-middleware.ts` exist but are completely unwired; no login, no user sessions | L |
| 11 | **Usage array update from real sales** — 7-day `usage[]` on items never updates; only seed data fills it | M |
| 12 | **Real POS Sync Status** — "8s ago / 1,284 records / 142ms" are hardcoded; replace with live stats from Supabase | S |

---

### P3 — Partial features to complete

| # | Issue | Effort |
|---|---|---|
| 13 | **CSV export** — Inventory "Export CSV" button wired up with real item data download | S |
| 14 | **Prep print** — "Print" triggers `window.print()` with a print-friendly prep list layout | S |
| 15 | **Sales Intelligence** — Replace hardcoded trend % and Rush Risk with real calculations from sales feed | M |
| 16 | **Forecasting** — Replace hardcoded cover count + factors with real 7-day rolling average; remove weather/event placeholders or mark clearly as "coming soon" | M |
| 17 | **Reports** — Compute COGS, waste %, and labor ratio from real inventory + sales + cost data | M |
| 18 | **Dashboard AI Insights** — Generate from live inventory (critical items, burn rate, velocity) instead of hardcoded strings | M |
| 19 | **Deliveries** — Wire "Scan invoice" button to scanner; add basic PO create/receive flow per vendor | L |

---

### P4 — Settings & admin completeness

| # | Issue | Effort |
|---|---|---|
| 20 | **API & Webhooks section** — Show real webhook URLs for Toast/Square (already computed in server); remove fake API key | S |
| 21 | **Users & Roles** — Wire to real Supabase auth once auth is in place; enforce read-only vs manager roles | L |
| 22 | **"Send to Stations"** — Prep list notification or export by station (print, share, or push notification) | M |
| 23 | **Email Daily** — Reports daily summary via email (requires email service integration) | L |

---

### P5 — New integrations

| # | Integration | Notes | Effort |
|---|---|---|---|
| 24 | **Clover POS** | OAuth similar to Square; public API available | L |
| 25 | **Lightspeed** | OAuth; decent API documentation | L |
| 26 | **QuickBooks** | OAuth; COGS / expense sync | L |
| 27 | **Barcode lookup** | UPC/EAN → product name + category via Open Food Facts or USDA API | M |
| 28 | **Real forecasting data** | Weather API + Google Events API for local event detection | XL |

---

### P6 — Polish (last)

| # | Issue | Effort |
|---|---|---|
| 29 | Replace emoji in scanner mode picker buttons (📦 📝 🧾) with icons consistent with the rest of the UI | XS |
| 30 | Empty state for Deliveries page when no vendors exist | XS |
| 31 | Inventory item count badge in sidebar nav | XS |
| 32 | Notification/alert system for critical inventory (bell icon is rendered but non-functional) | M |

---

## Effort key
- **XS** — < 1 hour, isolated change
- **S** — 2–4 hours
- **M** — half day to full day
- **L** — 2–3 days
- **XL** — week+, requires external API contracts
