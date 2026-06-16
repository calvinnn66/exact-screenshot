# KitchenIntel — Session State Handoff

_Updated: 2026-06-15 · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `36ba85a` | docs: update SESSION_STATE.md — Step 4 Phase 1 complete, Phase 2 plan |
| `8c29b84` | feat(db): add idx_pos_orders_location — Step 4 Phase 1 |
| `d5c3535` | feat(toast): token-expired banner with reconnect prompt (Step 3D) |
| `d516e36` | feat(toast): wire Sync Status card to real getToastStatus data (Step 3B) |
| `74ca79a` | feat(toast): wire real webhook URL from getToastStatus into Settings (Step 3C) |
| `afec3e0` | feat(toast): derive toast status from getToastStatus (Step 3A) |
| `85c4df1` | feat(persistence): wire Supabase write-through sync |
| `49d3aa9` | feat(auth): wire Supabase Auth — login, signup, logout, session persistence |

---

## Completed P1 work

### Auth
- Login / signup / logout via Supabase Auth
- Session persistence across page reloads (Supabase session listener)
- `authUser` and `authChecked` state in `KitchenIntel` root component

### Database Persistence (Step 2)
- **Migration applied** to live Supabase: `supabase/migrations/20260613120000_add_projects_persistence.sql`
  - `public.projects` — one row per restaurant workspace, owned by `auth.users.id`
  - `public.project_state` — serialized `Persist` JSONB blob, 1:1 with `projects`
  - RLS: `auth.uid()` policies on both tables
  - `touch_updated_at()` trigger function, `idx_projects_user` index
- `src/lib/projects-db.ts` — browser Supabase CRUD
- 800 ms debounced write-through; `newProjectId()` → `crypto.randomUUID()`

### Toast Integration — Steps 3A–3D ✓
- **3A**: Real badge status (connected / error / available) from `getToastStatus()` on mount
- **3B**: `formatAgo` helper; `toastStatusData` state; POS Sync Status card wired to live data
- **3C**: Settings webhook URL field reads `res.webhookUrl` from `getToastStatus()`
- **3D**: `ToastPanel`: red expired-token banner with Reconnect button; `tokenExpiresIn` shows `"Expired"` not `"0m"`

### Location / Project Separation — Step 4

#### Phase 1 ✓ — DB index committed and applied to live Supabase
- Migration file: `supabase/migrations/20260615000000_add_pos_orders_location_idx.sql`
- Index: `idx_pos_orders_location ON public.pos_orders(project_id, location_id, ordered_at DESC)`

#### POS schema bootstrap ✓ — All tables deployed and verified in live Supabase
Applied manually via Supabase SQL Editor (tables were missing from live DB; original migrations had never been applied):

| Table | Status |
|---|---|
| `public.square_connections` | ✓ Deployed (created in earlier bootstrap attempt) |
| `public.square_catalog_map` | ✓ Deployed |
| `public.square_webhook_events` | ✓ Deployed |
| `public.pos_orders` | ✓ Deployed (with both indexes) |
| `public.toast_connections` | ✓ Deployed |
| `public.toast_menu_map` | ✓ Deployed |
| `public.toast_webhook_events` | ✓ Deployed |
| `idx_pos_orders_location` | ✓ Applied |
| `pos_orders` added to `supabase_realtime` publication | ✓ Applied |
| RLS enabled on all POS/Toast tables | ✓ Applied |
| Triggers (`touch_updated_at`) on connections + map tables | ✓ Applied |

**Root cause of missing tables:** Migrations `20260521215705` and `20260521220339` were never applied to the live Supabase project. Only `20260613120000` (projects/project_state) had been applied. Bootstrap SQL was applied directly via SQL Editor.

---

## Supabase status

| Item | Status |
|---|---|
| `public.projects` / `public.project_state` | ✓ Live |
| All POS/Toast tables (7 tables) | ✓ Live |
| `idx_pos_orders_location` (Phase 1 index) | ✓ Live |
| RLS on all tables | ✓ Active |
| Supabase project ID | `muklqaivygnxpubkphbx` |
| Service role key (local dev) | Not required for project CRUD; required for POS server functions |

---

## Step 4 — Location / Project Separation: remaining phases

### Architecture gap (summary)
Two separate location namespaces that never intersect:
- **Client** `Persist.locations[].id` — `"loc_abc1234"` format, UI-managed
- **POS** `pos_orders.location_id` — real external IDs (`restaurant_guid` for Toast, Square location ID for Square)

`activeLocationId` cannot be passed directly to any DB query.

### Phase completion status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | DB index `idx_pos_orders_location` | ✓ Complete |
| **Phase 2** | `getLivePosFeed`: add optional `locationId?: string` param + conditional `.eq()` | **Next** |
| **Phase 3** | `Location` type: add `posLocationId?: string` field | Pending Phase 2 |
| **Phase 4** | Wire `restaurant_guid` from `getToastStatus` response into active `Location.posLocationId` | Pending Phase 3 |
| **Phase 5** | Thread `posLocationId` into `livePosFn` call | Pending Phase 4 |

### Phase 2 plan (ready to implement)
Single edit to `src/lib/pos.functions.ts`:
1. Input schema: add `locationId: z.string().optional()`
2. After `.eq("project_id", data.projectId)`: add `.eq("location_id", data.locationId)` only when `data.locationId` is set and non-empty
3. Backward compatible — omitting `locationId` returns all project orders as before

---

## Remaining P1 roadmap

| Priority | Item |
|---|---|
| Step 4 Phases 2–5 | Location filter wired end-to-end |
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
| `listRecentToastOrders` / `listRecentOrders` / `getToastStatus.orders24h` — no location filter | ToastPanel + SquarePanel order tabs still show project-wide data; defer to later step |

---

## Exact next task

**Phase 2** — edit `src/lib/pos.functions.ts`: add optional `locationId` param to `getLivePosFeed` input schema and conditional `.eq("location_id", data.locationId)` filter.
