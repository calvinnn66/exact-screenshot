# KitchenIntel — Session State Handoff

_Updated: 2026-06-16 (P0 bug fixes) · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `cf974f9` | fix(p0): sales persistence, simulator guard, usage tracking, consecutiveErrors scope |
| `f2fa01f` | docs: update SESSION_STATE.md — P2-B complete, all P2 done |
| `c2951fd` | feat(recipes): add editable recipe ingredient UI (P2-B) |
| `b69902e` | feat(pos): per-location order filtering in POS panels (P2-D) |
| `76139c9` | feat(pos): poll getToastStatus every 15 s to keep badge fresh (P2-C) |

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

### P2-B — Recipe editor ✓ (commit `c2951fd`)
- `MenuItemForm` modal for creating and editing menu item meta (name, station, price)
- `RecipeEngine` ingredient table is now fully editable: ingredient `<select>`, qty `<input>`, remove `×` button per row
- Add-ingredient row at the bottom of the table; only lists items not already in the recipe
- New Recipe button in PageHeader opens the add form and auto-selects the new item
- Delete confirmation modal replaces the previous silent direct delete
- Pencil button on the card header opens the edit-meta modal

### P2-D — Per-location order filtering in POS panels ✓ (commit `b69902e`)
- `listRecentToastOrders` and `listRecentOrders` both accept optional `locationId`; conditionally apply `.eq("location_id")`
- `ToastPanel` accepts `posLocationId` prop and passes it to the orders query; interval restarts when locationId changes
- `SquarePanel` self-derives `locationId` from `status.connection.location_id` — no new prop required
- `Integrations` derives `posLocationId` from the active location and threads it to `ToastPanel`

---

## Completed P0 audit fixes (commit `cf974f9`)

### P0-1 — Sales persistence ✓
- `sales: SalesRow[]` added to `Persist` type
- `emptyPersist()` initialises `sales: []`
- `ProjectWorkspace` initialises `sales` from `init.sales ?? []` (not `[]`)
- Write-through `useEffect` includes `sales: sales.slice(0, 500)` in patch and `sales` in deps
- Sales now survive page reloads

### P0-2 — Simulator / real POS double-processing guard ✓
- `realPosConnectedRef` (useRef) tracks whether Toast or Square is live
- Updated by a `useEffect` that watches `toastStatusData?.connection` and new `squareConnected` state
- Simulator interval tick returns early when `realPosConnectedRef.current === true`
- `SquarePanel` gains `onConnectionChange?: (connected: boolean) => void` prop; calls it after every `getSquareStatus` refresh
- Prop threaded: `Shell → Integrations (onSquareConnected) → SquarePanel (onConnectionChange)`

### P0-3 — Inventory usage tracking ✓
- Real POS feed tick now writes `usage[day] += qty_burned` alongside `current` deduction
- `new Date().getDay()` index (0 = Sunday … 6 = Saturday)
- Usage array is shallow-cloned (`[...p.usage]`) before mutation so React detects the change

### P0-4 — `consecutiveErrors` scope ✓
- Moved `let consecutiveErrors = 0` from inside the `if (conn)` block to alongside `webhookCount`/`webhookErrors`
- `getToastStatus` return value is now always `{ ..., consecutiveErrors: number }` — never `undefined`

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
| Simulator updates `current` but not `usage[]` | Only real POS feed now tracks usage; simulator deductions remain untracked |

---

## Open P1 issues (from audit, not yet fixed)

| # | Issue | Effort |
|---|---|---|
| P1-A | Dashboard AI insights — all three cards are hardcoded strings | M |
| P1-B | Forecast header stats — 312 covers, +12% weather, +24% event are hardcoded | S |
| P1-C | Reports stats — Waste 2.4%, COGS 28.2%, Labor 22.8%, Prep Accuracy 94%, labor chart static | M |
| P1-D | Export CSV for Inventory (button is inert) | S |
| P1-E | Print Prep List (button is inert) | S |
| P1-F | Send to Stations (button is inert) | S |
| P1-G | Prep List checkbox state resets on tab switch | S |
| P1-H | Settings API Key is fake (`ki_live_••••••••3f8a`) | XS |
| P1-I | "4 webhooks active" badge in Settings is hardcoded | XS |
| P1-J | Hide Deliveries nav tab or show "Coming Soon" overlay | XS |
| P1-K | Remove duplicate Menu Item Mapping table from Integrations view | XS |

---

## Post-P0 roadmap

| Priority | Item | Scope |
|---|---|---|
| P3-A | **PR to main** — review and merge `clawbot-dev` into `main` | Git only |
| P3-B | **`pos_orders.project_id` UUID migration** — align project_id column type with `crypto.randomUUID()` format | Migration + backfill |
| P3-C | **P1 polish pass** — work through P1-A … P1-K in priority order | UI only |
