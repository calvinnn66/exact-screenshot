# KitchenIntel — Developer Handoff

_Updated: 2026-06-16 · Branch: `clawbot-dev`_

---

## Current Branch

```
clawbot-dev  →  target merge: main
```

The Lovable project is connected to `calvinnn66/exact-screenshot` on GitHub.
Do not merge `clawbot-dev` → `main` without a review pass on the open P1 items.

---

## Latest Commit

```
cf974f9  fix(p0): sales persistence, simulator guard, usage tracking, consecutiveErrors scope
```

All four P0 audit bugs are fixed. Working tree is clean. Branch is up to date with remote.

---

## Recently Modified Files

| File | Last change |
|---|---|
| `src/routes/index.tsx` | P0-1 sales persistence, P0-2 simulator guard, P0-3 usage tracking |
| `src/components/SquarePanel.tsx` | P0-2 `onConnectionChange` prop wired |
| `src/lib/toast.functions.ts` | P0-4 `consecutiveErrors` scope fixed |

---

## Project Overview

KitchenIntel is an AI-powered kitchen operating system for restaurants.

**Stack:** TanStack Start (SSR) · React 19 · Tailwind CSS v4 · Supabase · Cloudflare Workers · Bun

**Key architectural facts:**
- All user app state lives in `localStorage` under `ki_projects_v1`, Supabase-write-through (800 ms debounce)
- `src/routes/index.tsx` (~2700 lines) is a monolith containing all UI views, context, types, and primitives
- Navigation is tab-based state (`tab` string in `Shell`), not separate routes
- Server functions in `src/lib/*.functions.ts` are callable from the client via `useServerFn()`
- Server-only helpers in `src/lib/*.server.ts` must never be imported client-side
- `src/integrations/supabase/client.server.ts` is **auto-generated** — do not edit
- `src/routeTree.gen.ts` is **auto-generated** — do not edit
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config` — do NOT add TanStack/React/Tailwind/Cloudflare plugins manually

**Local dev:**
```bash
bun install
bun dev          # starts on port 8080
bun run build    # Cloudflare Workers production build (NOT bun build)
bun lint
bun format
```

`SUPABASE_SERVICE_ROLE_KEY` is not required locally. Missing it triggers a one-time warning via `src/lib/admin-guard.ts`. All localStorage/Supabase features work via the anon key.

---

## Environment Variables

| Variable | Required locally | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Admin server functions (POS sync, webhooks) |
| `LOVABLE_API_KEY` | Optional | AI Scanner (Gemini 2.5 Flash via Lovable Gateway) |
| `SQUARE_APPLICATION_ID` | Optional | Square OAuth |
| `SQUARE_APPLICATION_SECRET` | Optional | Square OAuth + HMAC state signing |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Optional | Square webhook verification |
| `TOAST_WEBHOOK_SIGNATURE_KEY` | Optional | Toast webhook verification |
| `PUBLIC_BASE_URL` | Optional | OAuth redirect + webhook URL (defaults to Lovable app URL) |

---

## Completed Milestones

### Infrastructure
- Supabase Auth — email/password login, signup, logout, session persistence
- Server-side persistence — `public.projects` + `public.project_state`, 800 ms write-through
- `src/lib/admin-guard.ts` — warn-once guard for server functions lacking service role key
- `CLAUDE.md` — full architecture reference, dev rules, env var table

### Toast Integration — Steps 3A–5 ✓
- Real badge status from `getToastStatus()`
- POS Sync Status card wired to live Supabase counts
- Webhook URL in Settings from server response
- Expired-token banner with Reconnect button
- 15 s polling so badge stays fresh without page reload
- `consecutiveErrors` surfaced in both Toast and Square panels

### Location / Project Separation — all 5 phases ✓
- `idx_pos_orders_location` index
- `getLivePosFeed` + `listRecentToastOrders` + `listRecentOrders` accept optional `locationId`
- `Location` type has `posLocationId?: string`
- Toast `restaurant_guid` written into active location on status refresh
- `ToastPanel` and `SquarePanel` filter orders by location

### P1 CRUD modals ✓
- All `window.prompt`/`window.confirm` replaced with rendered `Modal` primitive
- Project rename/delete, station rename/remove, disconnect confirmation for both panels

### P2 Milestones ✓
- **P2-A**: Item CRUD — `ItemForm` for add + edit + delete with full 9-field form
- **P2-B**: Recipe editor — `MenuItemForm`, editable ingredient table, add/remove/qty rows, delete confirm
- **P2-C**: Toast status polling — 15 s `setInterval` in `Shell`
- **P2-D**: Per-location order filtering in both POS panels

### P0 Audit Fixes ✓ (commit `cf974f9`)
- **P0-1**: `sales: SalesRow[]` added to `Persist` type; restored from persisted state; write-through with 500-row cap
- **P0-2**: Simulator suppressed when real POS is connected (`realPosConnectedRef`; `SquarePanel.onConnectionChange`)
- **P0-3**: Real POS feed tick now updates `item.usage[day]` in addition to `item.current`
- **P0-4**: `consecutiveErrors` moved outside `if (conn)` in `getToastStatus` — always defined in return value

---

## Open Issues

### P1 — High Priority (no blockers, bounded scope)

| ID | Issue | File(s) | Effort |
|---|---|---|---|
| P1-A | Dashboard AI insights — all three cards are hardcoded strings | `index.tsx` Dashboard component | M |
| P1-B | Forecast header stats — 312 covers, +12% weather, +24% event hardcoded | `index.tsx` Forecast component | S |
| P1-C | Reports stats — Waste 2.4%, COGS 28.2%, Labor 22.8%, Prep Accuracy 94% static | `index.tsx` Reports component | M |
| P1-D | Inventory "Export CSV" button is inert | `index.tsx` Inventory component | S |
| P1-E | Prep "Print" button is inert | `index.tsx` Prep component | S |
| P1-F | "Send to Stations" button is inert | `index.tsx` Prep component | S |
| P1-G | Prep List checkboxes reset on tab switch | `index.tsx` Prep component | S |
| P1-H | Settings API Key is fake (`ki_live_••••••••3f8a`) | `index.tsx` Settings component | XS |
| P1-I | "4 webhooks active" badge hardcoded | `index.tsx` Settings component | XS |
| P1-J | Deliveries tab has no implementation — should show Coming Soon or be hidden | `index.tsx` nav + Deliveries component | XS |
| P1-K | Duplicate Menu Item Mapping table at bottom of Integrations view | `index.tsx` Integrations component | XS |

### P2 — Data integrity

| ID | Issue | Effort |
|---|---|---|
| P2-A | `pos_orders.project_id` is TEXT — UUID migration needed for FK integrity | L (migration + backfill) |
| P2-B | `getToastStatus.orders24h` is project-wide, not per-location filtered | S |
| P2-C | No conflict resolution in write-through (last write wins) | L |

### P3 — Git / release

| ID | Item |
|---|---|
| P3-A | PR `clawbot-dev` → `main` — review and merge |

### P4 — New features (not started)

- Clover POS, Lightspeed, QuickBooks integrations
- Barcode lookup (UPC → product)
- Real forecasting engine (weather + events API)
- Email daily summary
- Role-based access (Supabase RLS user roles)
- Supplier ordering / PO workflow from Forecast / Deliveries

---

## Supabase Schema

Supabase project ID: `muklqaivygnxpubkphbx`

All tables use RLS. Access via service role key on server functions, anon key + user session for `projects`/`project_state`.

```
public.projects              — one row per restaurant workspace (UUID PK, owner = auth.uid())
public.project_state         — serialised Persist JSON blob, 1:1 with projects
pos_orders                   — normalised order feed (Toast + Square)
square_connections           — Square OAuth tokens per project
square_catalog_map           — Square catalog item → internal menu SKU mapping
square_webhook_events        — inbound Square webhook log
toast_connections            — Toast client credentials + access token per project
toast_menu_map               — Toast item GUID → internal menu SKU mapping
toast_webhook_events         — inbound Toast webhook log
```

Migration files in `supabase/migrations/`.

---

## POS Integration Status

### Toast
- **OAuth flow**: client_credentials (restaurant supplies clientId + clientSecret + restaurantGuid)
- **Token storage**: `toast_connections` table, auto-refreshed on expiry
- **Status polling**: `getToastStatus` every 15 s in Shell
- **Webhook**: `/api/public/toast/webhook` — HMAC-verified, idempotent insert, order normalization
- **Location filtering**: `restaurant_guid` written into `Location.posLocationId` on status refresh
- **Consecutive errors**: surfaced in `ToastPanel` amber banner when `>= 3`
- **Outstanding**: `orders24h` is project-wide; per-location count not yet implemented (P2-B)

### Square
- **OAuth flow**: standard OAuth2 with HMAC-signed state (CSRF protection)
- **Token storage**: `square_connections` table
- **Status polling**: `getSquareStatus` every 15 s in `SquarePanel`
- **Webhook**: `/api/public/square/webhook` — HMAC-verified, idempotent insert, order normalization
- **Location filtering**: `location_id` self-derived from `status.connection.location_id`
- **Consecutive errors**: surfaced in `SquarePanel` amber banner when `>= 3`
- **Simulator guard**: `SquarePanel` now reports connection status to Shell via `onConnectionChange` prop; simulator is suppressed when Square is live

---

## Persist Type (current shape)

```typescript
type Persist = {
  brand: string;
  locations: Location[];
  activeLocationId: string | null;
  stationModules: StationModule[];
  categories: string[];
  vendors: Vendor[];
  items: Item[];         // usage: number[7] now updated by real POS feed
  menu: MenuItem[];
  sales: SalesRow[];     // ← added P0-1; capped at 500 rows in write-through
};
```

---

## Recommended Next Task

**P1 polish pass** — work through P1-J, P1-K, P1-H, P1-I first (all XS, 30 min total), then P1-D, P1-E, P1-G (S-sized, each ~2 h). Defer P1-A/B/C (computed analytics) until those quick wins are done.

**Recommended next prompt for a new session:**

```
Continue KitchenIntel from branch clawbot-dev (latest commit cf974f9).
Read docs/HANDOFF.md and docs/SESSION_STATE.md before writing any code.

Start with P1 polish — fix the open P1 issues in priority order:

1. P1-J: Deliveries nav — add a "Coming Soon" overlay or hide the tab.
2. P1-K: Remove the duplicate Menu Item Mapping table from the bottom of the
         Integrations view (keep the one inside each panel; remove the standalone Card).
3. P1-H: Remove fake API key from Settings API & Webhooks card.
4. P1-I: Replace hardcoded "4 webhooks active" badge with a dynamic count derived
         from toastStatusData.webhookCount + squareStatus.webhookCount.
5. P1-D: Wire Inventory "Export CSV" to download a real CSV of the current item list.
6. P1-E: Wire Prep "Print" to window.print() with a print-only stylesheet.
7. P1-G: Persist Prep List checkbox state in a local ref so it survives tab switches.

Rules:
- Surgical edits only — no unrelated refactors.
- Run bun run build after each fix to verify clean compile.
- Commit each fix with a clear message (fix(p1): ...).
- Push after each commit.
- Update docs/SESSION_STATE.md and docs/HANDOFF.md when all P1 fixes are done.
```
