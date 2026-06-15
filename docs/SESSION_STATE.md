# KitchenIntel — Session State Handoff

_Updated: 2026-06-15 · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `8c29b84` | feat(db): add idx_pos_orders_location — Step 4 Phase 1 **(current)** |
| `d5c3535` | feat(toast): token-expired banner with reconnect prompt (Step 3D) |
| `d516e36` | feat(toast): wire Sync Status card to real getToastStatus data (Step 3B) |
| `74ca79a` | feat(toast): wire real webhook URL from getToastStatus into Settings (Step 3C) |
| `afec3e0` | feat(toast): derive toast status from getToastStatus (Step 3A) |
| `fb9fdc7` | docs: add PERSISTENCE.md |
| `85c4df1` | feat(persistence): wire Supabase write-through sync |
| `49d3aa9` | feat(auth): wire Supabase Auth — login, signup, logout, session persistence |

---

## Completed P1 work

### Auth
- Login / signup / logout via Supabase Auth
- Session persistence across page reloads (Supabase session listener)
- `authUser` and `authChecked` state in `KitchenIntel` root component

### Database Persistence (Step 2)
- **Migration applied** to live Supabase project: `supabase/migrations/20260613120000_add_projects_persistence.sql`
  - `public.projects` — one row per restaurant workspace, owned by `auth.users.id`
  - `public.project_state` — serialized `Persist` JSONB blob, 1:1 with `projects`
  - RLS: `auth.uid()` policies on both tables (anon key is sufficient — no service role key needed)
  - `touch_updated_at()` triggers and `idx_projects_user` index
- `src/lib/projects-db.ts` — browser Supabase CRUD (`fetchUserProjects`, `upsertProject`, `deleteProjectFromDb`)
- `src/integrations/supabase/types.ts` — `projects` + `project_state` types added
- `src/routes/index.tsx` changes:
  - `readLocalStore()` — synchronous localStorage read with legacy migration
  - `loadProjects(userId)` — async, Supabase-first with one-time localStorage → Supabase import
  - `lastSyncedProjectsRef` — seeded on load to prevent spurious initial upsert
  - 800 ms debounced write-through: diffs `store.projects` against ref, upserts changed, deletes removed
  - `newProjectId()` → `crypto.randomUUID()` at all 3 project-creation sites (replaces `uid("prj")`)

### Toast Integration — Steps 3A–3D ✓
- **3A**: `INTEGRATIONS_SEED` seed corrected; `Shell` calls `getToastStatus()` on mount to set real badge status (connected / error / available)
- **3B**: `formatAgo` helper; `toastStatusData` state in `Shell`; POS Sync Status card wired to live Source / Last sync / Orders 24h / Errors 24h
- **3C**: Settings webhook URL field replaced: reads `res.webhookUrl` from `getToastStatus()`; falls back to `window.location.origin + "/api/public/toast/webhook"`
- **3D**: `ToastPanel`: `tokenExpired` boolean + red banner with Reconnect button when `expires_at` is past; `tokenExpiresIn` now returns `"Expired"` instead of `"0m"`

### Location / Project Separation — Step 4 Phase 1 ✓
- **Migration applied** (pending apply to live Supabase): `supabase/migrations/20260615000000_add_pos_orders_location_idx.sql`
  - `CREATE INDEX IF NOT EXISTS idx_pos_orders_location ON public.pos_orders(project_id, location_id, ordered_at DESC)`
  - Prerequisite for Phase 2: without this index, a `location_id` filter on `pos_orders` causes a heap re-scan of all project rows via the existing `pos_orders_project_idx`

---

## Supabase status

| Item | Status |
|---|---|
| Migration `20260613120000` | Applied and verified in live project |
| Migration `20260615000000` | **Committed — must be applied to live Supabase before Phase 2** |
| RLS on `projects` + `project_state` | Active |
| Supabase project ID | `muklqaivygnxpubkphbx` |
| Service role key (local dev) | Not required for project CRUD; required for POS server functions |

---

## Step 4 — Location / Project Separation

### Architecture gap (established in audit)

Two separate "location" concepts that never intersect:

| | Client locations (`Persist.locations[]`) | POS location IDs (`pos_orders.location_id`) |
|---|---|---|
| ID format | `"loc_abc1234"` (`uid("loc")`) | `"restaurant-guid-xyz"` or `"LXYZ789"` |
| Created by | User in Settings UI | Square OAuth / Toast credential flow |
| Stored in | localStorage + Supabase JSONB blob | `pos_orders.location_id` column |
| Used to filter orders | Never | Not yet |

`activeLocationId` from `Persist` is a client-side string with no link to any POS identifier. It **cannot** be passed directly to `getLivePosFeed` as a DB filter.

### Phase completion status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | DB index: `idx_pos_orders_location` on `pos_orders(project_id, location_id, ordered_at DESC)` | ✓ Committed `8c29b84` — apply migration to live DB |
| **Phase 2** | Server: add optional `locationId?: string` param to `getLivePosFeed`; `.eq("location_id", ...)` when set | Next |
| **Phase 3** | Client type: add `posLocationId?: string` to `Location` type in `Persist` | Pending Phase 2 |
| **Phase 4** | Wire POS location ID into active `Location` via `getToastStatus` useEffect response | Pending Phase 3 |
| **Phase 5** | Thread `posLocationId` from active location into `livePosFn` call | Pending Phase 4 |

### Phase 2 implementation plan (approved at audit, ready to apply after migration is live)

Single edit to `src/lib/pos.functions.ts`:

1. Input schema: add `locationId: z.string().optional()`
2. After `.eq("project_id", data.projectId)`: add conditional `.eq("location_id", data.locationId)` when `data.locationId` is set and non-empty
3. Backward compatible: omitting `locationId` preserves current all-project behavior

---

## Remaining P1 roadmap

| Priority | Item |
|---|---|
| Step 4 Phases 2–5 | Location filter wired end-to-end (server fn → client type → POS ID link → feed call) |
| Step 5 | Surface webhook errors: consecutive-failure counter in Toast panel |
| P1 CRUD | Item edit modal, Add Item dialog, recipe edit — replace all `window.prompt` / `window.confirm` |

---

## Known technical debt / risks

| Item | Risk |
|---|---|
| `toast_connections`, `square_connections`, `pos_orders` use `project_id TEXT` (old `prj_abc1234` format) | FK integrity not enforced; will need UUID migration before location filter can be fully trusted |
| No conflict resolution in write-through | Last write wins if two browser tabs open as same user |
| `getToastStatus` fires once on mount only | Stale connection badge persists until page reload |
| `*.client.*` filenames blocked by TanStack Start SSR import-protection | Any new browser-only Supabase helpers must be named `*-db.ts` or similar — never `*.client.ts` |
| `listRecentToastOrders` / `listRecentOrders` / `getToastStatus.orders24h` — no location filter | ToastPanel + SquarePanel order tabs and status counts still show project-wide data; defer to later step |

---

## Exact next recommended task

**Apply migration `20260615000000` to live Supabase**, then begin **Phase 2** — single edit to `src/lib/pos.functions.ts` adding optional `locationId` param to `getLivePosFeed`.
