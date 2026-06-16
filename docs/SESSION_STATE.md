# KitchenIntel — Session State Handoff

_Updated: 2026-06-15 · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `c2eedd4` | feat(pos): add optional locationId filter to getLivePosFeed (Phase 2) |
| `0204c9a` | docs: record successful deployment of POS integration schema |
| `36ba85a` | docs: update SESSION_STATE.md — Step 4 Phase 1 complete, Phase 2 plan |
| `8c29b84` | feat(db): add idx_pos_orders_location — Step 4 Phase 1 |
| `d5c3535` | feat(toast): token-expired banner with reconnect prompt (Step 3D) |
| `d516e36` | feat(toast): wire Sync Status card to real getToastStatus data (Step 3B) |
| `74ca79a` | feat(toast): wire real webhook URL from getToastStatus into Settings (Step 3C) |
| `afec3e0` | feat(toast): derive toast status from getToastStatus (Step 3A) |

---

## Completed P1 work

### Auth
- Login / signup / logout via Supabase Auth
- Session persistence across page reloads
- `authUser` and `authChecked` state in `KitchenIntel` root component

### Database Persistence (Step 2)
- `public.projects` + `public.project_state` live in Supabase
- `src/lib/projects-db.ts` — browser Supabase CRUD
- 800 ms debounced write-through; `newProjectId()` → `crypto.randomUUID()`

### Toast Integration — Steps 3A–3D ✓
- **3A**: Real badge status from `getToastStatus()` on mount
- **3B**: POS Sync Status card wired to live Source / Last sync / Orders 24h / Errors 24h
- **3C**: Settings webhook URL reads `res.webhookUrl` from `getToastStatus()`
- **3D**: `ToastPanel` expired-token banner with Reconnect button

### Location / Project Separation — Step 4

#### Live Supabase schema — fully verified ✓

All POS/Toast tables confirmed present and operational in live Supabase project `muklqaivygnxpubkphbx`:

| Table | Triggers | Indexes |
|---|---|---|
| `public.square_connections` | `trg_square_connections_touch` | `square_connections_project_idx`, `square_connections_merchant_idx` |
| `public.square_catalog_map` | `trg_square_catalog_map_touch` ✓ | `square_catalog_map_project_idx` |
| `public.square_webhook_events` | — | `square_webhook_events_merchant_idx`, `square_webhook_events_received_idx` |
| `public.pos_orders` | — | `pos_orders_project_idx`, `idx_pos_orders_location` ✓ |
| `public.toast_connections` | `touch_toast_connections` ✓ | `idx_toast_connections_project` |
| `public.toast_menu_map` | `touch_toast_menu_map` ✓ | `idx_toast_menu_map_project` |
| `public.toast_webhook_events` | — | `idx_toast_webhook_events_restaurant`, `idx_toast_webhook_events_received` |

**Root cause of missing tables (resolved):** Migrations `20260521215705` and `20260521220339` had never been applied to the live project. Bootstrap SQL applied manually via Supabase SQL Editor. `CREATE OR REPLACE TRIGGER` syntax was incompatible with the live Postgres version; fixed by using plain `CREATE TRIGGER` with `DROP TRIGGER IF EXISTS` guards.

#### Phase completion status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | DB index `idx_pos_orders_location` | ✓ Committed `8c29b84` + applied to live DB |
| **Phase 2** | `getLivePosFeed`: optional `locationId` param + conditional `.eq()` | ✓ Committed `c2eedd4` |
| **Phase 3** | `Location` type: add `posLocationId?: string` | **Next** |
| **Phase 4** | Write `restaurant_guid` from `getToastStatus` response into active `Location.posLocationId` | Pending Phase 3 |
| **Phase 5** | Pass active `Location.posLocationId` as `locationId` to `livePosFn` | Pending Phase 4 |

---

## Supabase status

| Item | Status |
|---|---|
| `public.projects` / `public.project_state` | ✓ Live |
| All POS/Toast tables (7 tables) | ✓ Live and verified |
| `idx_pos_orders_location` (Phase 1 index) | ✓ Live |
| RLS on all tables | ✓ Active |
| Supabase project ID | `muklqaivygnxpubkphbx` |

---

## Remaining P1 roadmap

| Priority | Item |
|---|---|
| Step 4 Phases 3–5 | Location filter wired end-to-end (type → POS ID link → feed call) |
| Step 5 | Surface webhook errors: consecutive-failure counter in Toast panel |
| P1 CRUD | Item edit modal, Add Item dialog, recipe edit — replace all `window.prompt` / `window.confirm` |

---

## Known technical debt / risks

| Item | Risk |
|---|---|
| `pos_orders.project_id` is TEXT (old `prj_abc1234` format) | FK integrity not enforced; UUID migration needed before location filter is fully reliable |
| No conflict resolution in write-through | Last write wins if two browser tabs open as same user |
| `getToastStatus` fires once on mount only | Stale connection badge until page reload |
| `*.client.*` filenames blocked by TanStack Start SSR | New browser-only Supabase helpers must be named `*-db.ts` — never `*.client.ts` |
| `listRecentToastOrders` / `listRecentOrders` / `getToastStatus.orders24h` | Still show project-wide data; no location filter yet |

---

## Exact next task

**Step 4 Phase 3** — add `posLocationId?: string` to the `Location` type in `src/routes/index.tsx`. Additive, no call sites break.
