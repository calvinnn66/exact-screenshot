# KitchenIntel — Session State Handoff

_Updated: 2026-06-16 · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `b69902e` | feat(pos): per-location order filtering in POS panels (P2-D) |
| `76139c9` | feat(pos): poll getToastStatus every 15 s to keep badge fresh (P2-C) |
| `a439c78` | feat(inventory): add full item CRUD modals (P2-A) |
| `c5efd1a` | feat(ui): replace all window.prompt/confirm with proper modal dialogs |
| `8a7d8df` | docs: update SESSION_STATE.md — P1 complete, post-P1 roadmap |

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

## Completed P2 work

### P2-A — Item CRUD modals ✓ (commit `a439c78`)
- `ItemForm` component handles add and edit modes (name, unit, on hand, par, max, cost/unit, vendor, category, station)
- Delete confirmation modal replaces the previous silent inline delete
- Edit (pencil) and delete buttons wired in both desktop table rows and mobile cards
- `+ Add Item` button in PageHeader opens the add form
- `Icon.pencil` added to the icon set

### P2-C — `getToastStatus` polling ✓ (commit `76139c9`)
- `getToastStatus` useEffect in Shell converted from one-shot to 15 s interval (`setInterval`)
- Badge, expiry state, and POS Sync Status card stay fresh without a page reload

### P2-D — Per-location order filtering in POS panels ✓ (commit `b69902e`)
- `listRecentToastOrders` and `listRecentOrders` both accept optional `locationId`; conditionally apply `.eq("location_id")` using the same `let query; if (locationId) query = query.eq(...)` pattern established in `pos.functions.ts`
- `ToastPanel` accepts `posLocationId` prop and passes it to the orders query; interval restarts when locationId changes
- `SquarePanel` self-derives `locationId` from `status.connection.location_id` — no new prop required
- `Integrations` derives `posLocationId` from the active location and threads it to `ToastPanel`

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
| `getToastStatus.orders24h` | Still project-wide (not per-location filtered) |
| `*.client.*` filenames blocked by TanStack Start SSR | New browser-only Supabase helpers must be named `*-db.ts` |

---

## Post-P2 roadmap

| Priority | Item | Scope |
|---|---|---|
| P2-B | **Recipe editor** — proper recipe ingredient UI (currently read-only in most views) | UI only |
| P3-A | **PR to main** — review and merge `clawbot-dev` into `main` | Git only |
| P3-B | **`pos_orders.project_id` UUID migration** — align project_id column type with `crypto.randomUUID()` format | Migration + backfill |
