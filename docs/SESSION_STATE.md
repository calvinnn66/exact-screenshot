# KitchenIntel — Session State Handoff

_Updated: 2026-06-15 · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `c5efd1a` | feat(ui): replace all window.prompt/confirm with proper modal dialogs |
| `c2eedd4` | feat(pos): add optional locationId filter to getLivePosFeed (Phase 2) |
| `0204c9a` | docs: record successful deployment of POS integration schema |
| `8c29b84` | feat(db): add idx_pos_orders_location — Step 4 Phase 1 |
| `d5c3535` | feat(toast): token-expired banner with reconnect prompt (Step 3D) |

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

### Location / Project Separation — Step 4 ✓ (all phases)
- Phase 1: `idx_pos_orders_location` index on `pos_orders(project_id, location_id, ordered_at DESC)`
- Phase 2: `getLivePosFeed` accepts optional `locationId`; conditionally filters `pos_orders`
- Phase 3: `Location` type extended with `posLocationId?: string`
- Phase 4: `getToastStatus` useEffect writes `restaurant_guid` into active `Location.posLocationId`
- Phase 5: `livePosFn` call derives `activePosLocId` from active location and passes it as `locationId`

### Webhook error surfacing — Step 5 ✓
- `getSquareStatus` / `getToastStatus` both return `consecutiveErrors: number`
- `SquarePanel` and `ToastPanel` both show an amber warning banner when `consecutiveErrors >= 3`
- Consecutive error count displayed in the Overview KV grid of both panels

### P1 CRUD modals ✓ (commit `c5efd1a`)
All `window.prompt` and `window.confirm` calls replaced with rendered modals:
- `Modal` primitive added to `src/routes/index.tsx` using `ui` design tokens
- `ProjectPicker`: rename project modal (pre-filled input + Save/Cancel), delete project confirmation
- `ManageStations`: rename station modal (with cascade to items/recipes), remove-used-station confirmation
- `SquarePanel`: disconnect confirmation modal (inline, self-contained)
- `ToastPanel`: disconnect confirmation modal (inline, self-contained)

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

## Known technical debt / risks

| Item | Risk |
|---|---|
| `pos_orders.project_id` is TEXT (old `prj_abc1234` format) | FK integrity not enforced; UUID migration needed for strict integrity |
| No conflict resolution in write-through | Last write wins if two browser tabs open as same user |
| `getToastStatus` fires once on mount only | Stale connection badge until page reload |
| `listRecentToastOrders` / `getToastStatus.orders24h` | Still project-wide (no per-location filter) |
| `*.client.*` filenames blocked by TanStack Start SSR | New browser-only Supabase helpers must be named `*-db.ts` |

---

## Post-P1 roadmap

All P1 items are complete. Suggested next priorities:

| Priority | Item | Scope |
|---|---|---|
| P2-A | **Item CRUD modals** — inline edit/add item form (currently no way to add/edit individual inventory items in-app) | UI only, no schema change |
| P2-B | **Recipe editor** — proper recipe ingredient UI (currently read-only in most views) | UI only |
| P2-C | **`getToastStatus` polling** — move from one-shot to interval refresh (15 s) to keep badge fresh | 3-line change in Shell |
| P2-D | **Per-location order filtering** for `listRecentToastOrders` / `listRecentOrders` in the POS panels | Functions + UI |
| P3-A | **PR to main** — review and merge `clawbot-dev` into `main` | Git only |
| P3-B | **`pos_orders.project_id` UUID migration** — align project_id column type with `crypto.randomUUID()` format | Migration + backfill |
