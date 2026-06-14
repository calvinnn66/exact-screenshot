# KitchenIntel — Session State Handoff

_Updated: 2026-06-14 · Branch: `clawbot-dev`_

---

## What works end-to-end

| Feature | Status |
|---|---|
| Auth (login / signup / logout / session persistence) | Working |
| Multi-project store (localStorage + Supabase write-through) | Working |
| One-time localStorage → Supabase UUID migration | Working |
| Toast POS status derived from `getToastStatus()` | Working (Step 3A) |
| Live POS feed polling (`getLivePosFeed` every 8 s) | Working (no-op locally without service role key) |
| AI scanner (Gemini 2.5 Flash via Lovable AI Gateway) | Working |
| Square OAuth + webhooks | Working |
| Toast webhook receiver + `pos_orders` upsert | Working |

---

## Recent commits

| Hash | Description |
|---|---|
| `afec3e0` | feat(toast): derive toast status from getToastStatus |
| `fb9fdc7` | docs: add PERSISTENCE.md |
| `85c4df1` | feat(persistence): wire Supabase write-through sync |
| `3f494e9` | feat(persistence): async loadProjects with Supabase-first + one-time localStorage import |
| `63ddbe2` | feat(persistence): add projects-db.ts — browser-side Supabase CRUD |
| `f5fa21b` | feat(db): add projects and project_state tables (Supabase migration) |

---

## Completed checkpoints (this session)

### Step 2 — Database Persistence

- `supabase/migrations/20260613120000_add_projects_persistence.sql` — applied to live Supabase project
- `src/lib/projects-db.ts` — `fetchUserProjects`, `upsertProject`, `deleteProjectFromDb` (browser anon key, RLS-scoped)
- `src/integrations/supabase/types.ts` — `projects` + `project_state` table types added
- `src/routes/index.tsx` — `readLocalStore` + async `loadProjects(userId)`, `lastSyncedProjectsRef`, 800 ms debounced write-through, `newProjectId()` → `crypto.randomUUID()` at all 3 project-creation sites
- `docs/PERSISTENCE.md` — architecture doc committed

### Step 3A — Remove fake Toast connected state

- `INTEGRATIONS_SEED` Toast entry: `status` changed from `"connected"` to `"available"`, fake `lastSync`/`records` fields removed
- `Shell` component: `useServerFn(getToastStatus)` wired; on mount it fetches real connection status and updates `integrations` state; expires_at check for `"error"` status
- Commit: `feat(toast): derive toast status from getToastStatus`

---

## Pending: Step 3B — Wire Sync Status card to real data

**Approved plan, not yet applied.** Five targeted edits to `src/routes/index.tsx`:

1. **`formatAgo` helper** — convert ISO timestamp to "Xs ago / Xm ago / Xh ago"; add after `const newProjectId = ...`
2. **`toastStatusData` state** in `Shell` — typed state holding full `getToastStatus` response
3. **Store response** — add `setToastStatusData(res)` inside existing `getToastStatus` useEffect
4. **Prop passthrough** — add `toastStatusData={toastStatusData}` to `<Integrations>` render
5. **Sync Status card** — replace 4 hardcoded stat divs with live values: Source, Last sync (formatted), Orders 24h, Errors 24h (colored red if > 0)

---

## Remaining Step 3 items (not yet started)

| Step | Description |
|---|---|
| 3C | Replace hardcoded `https://api.kitchenintel.io/v1/hooks` with `window.location.origin + "/api/public/toast/webhook"` in Settings |
| 3D | Show "Token expired — reconnect" prompt in ToastPanel when `expires_at` is past |

---

## After Step 3 — backlog order

| Priority | Item |
|---|---|
| Step 4 | Location/project separation: filter `getLivePosFeed` by `location_id` |
| Step 5 | Surface webhook errors: consecutive-failure counter in Toast panel |
| P1 CRUD | Item edit modal, Add Item dialog, recipe edit, replace `window.prompt`/`window.confirm` |

---

## Known technical debt

- `toast_connections`, `square_connections`, `pos_orders` still use `project_id TEXT` (pre-migration `prj_abc1234`-style IDs). These columns will need UUID FK migration when project IDs are used as FK references in POS queries.
- No conflict resolution: last write wins if two browser tabs are open as the same user.
- `getToastStatus` useEffect in `Shell` fires once on mount. It does not re-poll; a stale connection state persists until page reload.

---

## Critical architecture notes

- `*.client.*` filenames are blocked from SSR route imports by TanStack Start's `import-protection` plugin. Name browser-only Supabase helpers `*-db.ts` or similar — never `*.client.ts`.
- `src/lib/projects-db.ts` uses the browser anon key + RLS. No service role key required for project CRUD.
- `touch_updated_at()` trigger must exist in the database before the projects migration runs (it is created by migration 1).
- `lastSyncedProjectsRef` is seeded immediately after `loadProjects` returns to prevent a spurious upsert on the first render.
