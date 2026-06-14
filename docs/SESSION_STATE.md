# KitchenIntel — Session State Handoff

_Updated: 2026-06-14 · Branch: `clawbot-dev`_

---

## Branch

`clawbot-dev` → target merge: `main`

---

## Latest commits

| Hash | Description |
|---|---|
| `4298c21` | docs: add SESSION_STATE.md (previous draft) |
| `afec3e0` | feat(toast): derive toast status from getToastStatus **(Step 3A)** |
| `fb9fdc7` | docs: add PERSISTENCE.md |
| `85c4df1` | feat(persistence): wire Supabase write-through sync |
| `3f494e9` | feat(persistence): async loadProjects with Supabase-first + one-time localStorage import |
| `63ddbe2` | feat(persistence): add projects-db.ts — browser-side Supabase CRUD |
| `f5fa21b` | feat(db): add projects and project_state tables |
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

### Toast Integration — Step 3A
- `INTEGRATIONS_SEED` Toast entry: `status` changed `"connected"` → `"available"`; fake `lastSync` / `records` fields removed
- `Shell` component: `useServerFn(getToastStatus)` called on mount (when `app.projectId` is set)
  - Sets Toast status to `"connected"`, `"error"` (expired token), or `"available"` from real DB data
  - Falls back silently if service role key absent or network error

---

## Supabase status

| Item | Status |
|---|---|
| Migration `20260613120000` | Applied and verified in live project |
| RLS on `projects` + `project_state` | Active |
| Supabase project ID | `muklqaivygnxpubkphbx` |
| Service role key (local dev) | Not required for project CRUD; required for POS server functions |

---

## Current Toast integration status

| Signal | Source |
|---|---|
| Badge (connected / available / error) | `getToastStatus()` → `toast_connections` table |
| Sync Status card — Source | **Hardcoded** ("Toast POS" always) |
| Sync Status card — Last sync | **Hardcoded** ("2 min ago") |
| Sync Status card — Records/day | **Hardcoded** ("1,284") |
| Sync Status card — Errors (24h) | **Hardcoded** ("None") |

Step 3B will replace all four hardcoded values with live data from `getToastStatus()`.

---

## Step 3B — approved plan, not yet applied

Five targeted edits to `src/routes/index.tsx`:

1. **`formatAgo` helper** — after `const newProjectId = ...`
   ```typescript
   function formatAgo(iso: string | null): string {
     if (!iso) return "—";
     const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
     if (s < 60) return `${s}s ago`;
     if (s < 3600) return `${Math.floor(s / 60)}m ago`;
     return `${Math.floor(s / 3600)}h ago`;
   }
   ```

2. **`toastStatusData` state** in `Shell`
   ```typescript
   const [toastStatusData, setToastStatusData] = useState<{
     connection: { expires_at: string } | null;
     webhookCount: number;
     webhookErrors: number;
     lastEventAt: string | null;
     orders24h: number;
   } | null>(null);
   ```

3. **Store full response** — add `setToastStatusData(res)` inside existing `getToastStatus` useEffect

4. **Prop passthrough** — add `toastStatusData={toastStatusData}` to `<Integrations>` render

5. **Sync Status card** — replace 4 hardcoded stat divs with live values (Source, Last sync, Orders 24h, Errors 24h colored red if > 0)

---

## Remaining Step 3 items

| Step | Description |
|---|---|
| **3B** (next) | Wire Sync Status card to real `getToastStatus()` — approved, ready to apply |
| 3C | Replace hardcoded webhook URL `https://api.kitchenintel.io/v1/hooks` with `window.location.origin + "/api/public/toast/webhook"` in Settings |
| 3D | Show "Token expired — reconnect" prompt in ToastPanel when `connection.expires_at` is in the past |

---

## Remaining P1 roadmap

| Priority | Item |
|---|---|
| Step 4 | Location / project separation: filter `getLivePosFeed` by `location_id` |
| Step 5 | Surface webhook errors: consecutive-failure counter in Toast panel |
| P1 CRUD | Item edit modal, Add Item dialog, recipe edit — replace all `window.prompt` / `window.confirm` |

---

## Known technical debt / risks

| Item | Risk |
|---|---|
| `toast_connections`, `square_connections`, `pos_orders` use `project_id TEXT` (old `prj_abc1234` format) | FK integrity not enforced; will need UUID migration before Step 4 |
| No conflict resolution in write-through | Last write wins if two browser tabs open as same user |
| `getToastStatus` fires once on mount only | Stale connection badge persists until page reload |
| `*.client.*` filenames blocked by TanStack Start SSR import-protection | Any new browser-only Supabase helpers must be named `*-db.ts` or similar — never `*.client.ts` |

---

## Exact next recommended task

**Apply Step 3B** — 5 targeted edits to `src/routes/index.tsx`, already approved. Run `bun build:dev`, commit as `feat(toast): wire Sync Status card to real getToastStatus data`, push.
