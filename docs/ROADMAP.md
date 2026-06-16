# KitchenIntel — Prioritized Roadmap

_Updated: 2026-06-16 · Branch: `clawbot-dev`_

---

## Status Legend

- ✅ Complete (committed + pushed)
- 🔄 In progress
- ⬜ Not started

---

## Fully Complete

| Item | Commit(s) |
|---|---|
| ✅ Multi-project workspace (create, open, duplicate, rename, delete) | early Lovable |
| ✅ Onboarding flow (first-run brand + location) | early Lovable |
| ✅ Station management (templates, reorder, hide/show, cascade rename) | early Lovable |
| ✅ Full Inventory view (search, filter, delete) | early Lovable |
| ✅ Station view (per-station table, ±adjustments, status pills, sparklines) | early Lovable |
| ✅ Prep List (auto-generated from par levels, per-station, urgency) | early Lovable |
| ✅ AI Scanner (camera + file, Gemini 2.5 Flash, recipe/product/invoice modes) | early Lovable |
| ✅ Mobile-responsive layout (sidebar overlay, bottom tab bar) | early Lovable |
| ✅ Categories and Vendors admin (full CRUD) | early Lovable |
| ✅ Locations admin (add, set active, delete) | early Lovable |
| ✅ Square integration (full OAuth, webhook, catalog sync, order normalization, mapping UI) | early Lovable |
| ✅ Toast integration (client_credentials, webhook, order normalization, mapping UI) | early Lovable |
| ✅ Live POS feed polling (8 s interval → recipe-driven inventory deduction) | early Lovable |
| ✅ Demo POS simulator (5 s random sales for local testing) | early Lovable |
| ✅ `projectId` in context (was hardcoded) | `bfca90d` |
| ✅ Sales feed `ts` timestamps (was `Math.random()`) | `90142e1` |
| ✅ Non-POS integrations show "Coming soon" (was fake connect) | `bcaf6f4` |
| ✅ POS connection badges conditional on real data | `da4d61c` |
| ✅ Supabase Auth — email/password login, signup, logout | earlier session |
| ✅ Server-side persistence — `projects` + `project_state` in Supabase | earlier session |
| ✅ `admin-guard.ts` — warn-once guard for missing service role key | earlier session |
| ✅ All `window.prompt`/`window.confirm` replaced with proper modals | `c5efd1a` |
| ✅ Item CRUD — `ItemForm` for add + edit + delete (9 fields) | `a439c78` (P2-A) |
| ✅ Recipe editor — editable ingredient table, `MenuItemForm`, delete confirm | `c2951fd` (P2-B) |
| ✅ Toast status polling every 15 s (badge stays fresh) | `76139c9` (P2-C) |
| ✅ Per-location order filtering in Toast + Square panels | `b69902e` (P2-D) |
| ✅ Location/project separation — all 5 phases (`posLocationId`, location filter) | `d4d6eaa`, `770b5f4` |
| ✅ Webhook `consecutiveErrors` surfaced in Toast + Square panel banners | `1029385` |
| ✅ Sales persistence (`sales: SalesRow[]` in `Persist`, survives reload) | `cf974f9` (P0-1) |
| ✅ Simulator guard — suppressed when real POS is connected | `cf974f9` (P0-2) |
| ✅ Inventory usage tracking from real POS feed (`usage[day]`) | `cf974f9` (P0-3) |
| ✅ `consecutiveErrors` always defined in `getToastStatus` return value | `cf974f9` (P0-4) |

---

## P1 — Polish pass (next sprint)

Quick wins and trust-building fixes. No new backend required.

| ID | Issue | Where | Effort |
|---|---|---|---|
| P1-J | Deliveries tab — show "Coming Soon" overlay or hide from nav | `index.tsx` nav + Deliveries | XS |
| P1-K | Remove duplicate Menu Item Mapping table from bottom of Integrations view | `index.tsx` Integrations | XS |
| P1-H | Settings API Key — remove fake `ki_live_••••••••3f8a` value | `index.tsx` Settings | XS |
| P1-I | "4 webhooks active" badge — derive from live `webhookCount` from both panels | `index.tsx` Settings + Shell | XS |
| P1-D | Inventory "Export CSV" — download real CSV of current item list | `index.tsx` Inventory | S |
| P1-E | Prep "Print" — trigger `window.print()` with a print-only stylesheet | `index.tsx` Prep | S |
| P1-G | Prep List checkboxes — persist across tab switches (useRef or useState lifted) | `index.tsx` Prep | S |
| P1-F | "Send to Stations" — print/share prep list filtered by station | `index.tsx` Prep | S |
| P1-B | Forecast header stats — compute from real 7-day usage/sales data | `index.tsx` Forecast | S |
| P1-A | Dashboard AI insights — compute from live inventory + sales (critical, burn rate) | `index.tsx` Dashboard | M |
| P1-C | Reports — COGS, waste %, labor ratio from real inventory + sales cost data | `index.tsx` Reports | M |

---

## P2 — Data integrity

| ID | Issue | Effort |
|---|---|---|
| P2-A | `pos_orders.project_id` UUID migration — align TEXT column with `crypto.randomUUID()` format | L (migration + backfill) |
| P2-B | `getToastStatus.orders24h` — filter by `location_id` to match per-location context | S |
| P2-C | Conflict resolution in write-through — last write wins when two tabs open as same user | L |

---

## P3 — Git / release

| ID | Item |
|---|---|
| P3-A | PR `clawbot-dev` → `main` — review and merge |

---

## P4 — New integrations

| ID | Integration | Notes | Effort |
|---|---|---|---|
| P4-A | Clover POS | OAuth similar to Square; public API available | L |
| P4-B | Lightspeed | OAuth; decent API docs | L |
| P4-C | QuickBooks | OAuth; COGS / expense sync | L |
| P4-D | Barcode lookup | UPC/EAN → product name + category (Open Food Facts / USDA) | M |
| P4-E | Real forecasting data | Weather API + local events for cover count prediction | XL |

---

## P5 — Admin completeness

| ID | Issue | Effort |
|---|---|---|
| P5-A | Email Daily summary — Reports export via email (requires email service) | L |
| P5-B | Users & Roles — wire to Supabase RLS user roles; enforce read-only vs manager | L |
| P5-C | Deliveries — scan invoice + basic PO create/receive flow per vendor | L |

---

## P6 — Polish (last)

| ID | Issue | Effort |
|---|---|---|
| P6-A | Replace emoji in Scanner mode picker with SVG icons | XS |
| P6-B | Deliveries empty state when no vendors exist | XS |
| P6-C | Inventory item count badge in sidebar nav | XS |
| P6-D | Bell/notification system for critical inventory (bell icon renders, non-functional) | M |

---

## Effort key

- **XS** < 30 min, isolated change
- **S** 1–3 hours
- **M** half day to full day
- **L** 2–3 days
- **XL** week+, requires external API contracts
