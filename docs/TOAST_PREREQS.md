# Toast Integration Prerequisites — P1 Plan

_Created: 2026-06-11 · Branch: `clawbot-dev`_

Five areas that must be complete before a real restaurant can connect Toast
and trust the data. Listed in dependency order.

---

## 1. Auth (M)

**Why it's first:** Without user identity, `toast_connections` rows are
unowned — any browser can query any restaurant's tokens. Nothing else can
be properly scoped.

**What to build:**
- Wire Supabase Auth (email/password or magic link — client already configured)
- Add login/signup screen before the project picker
- Attach `user.id` to projects so they are user-scoped
- Protect all server functions that call `supabaseAdmin` behind a valid session
- Add logout

**Constraint:** Do not change persistence yet. Keep `localStorage` as the
project store. Auth wraps the outside of the app; persistence is a separate
step.

**Files involved:**
- `src/integrations/supabase/auth-attacher.ts` (exists, unwired)
- `src/integrations/supabase/auth-middleware.ts` (exists, unwired)
- `src/integrations/supabase/client.ts` (already configured for session storage)
- `src/routes/index.tsx` (add auth gate before project picker)
- `src/routes/__root.tsx` (may need session context)

---

## 2. Server-side persistence (L)

**Why it's needed:** All inventory, stations, recipes, vendors, categories,
and sales live in `localStorage`. A new browser or device loses everything.
`project_id` is a client-generated string (`prj_abc123`), not a real
Supabase UUID — `toast_connections` cannot reference it as a proper
foreign key.

**What to build:**
- `projects` table in Supabase (id UUID, user_id, name, type, created_at)
- `project_state` table or JSONB column for the serialized `Persist` object
- Migrate `loadProjects`/`saveProjects` to read/write Supabase
- Keep `localStorage` as a write-through cache for offline/fast startup
- `project_id` becomes a real Supabase UUID

**Depends on:** Auth (#1) — projects must be owned by `user.id`.

---

## 3. POS connection model (M)

**Why it's needed:** The integration tile grid hardcodes Toast as
`status: "connected"` regardless of DB state. The POS Sync Status card
shows hardcoded metrics. Settings shows a fake webhook URL.

**What to build:**
- Remove hardcoded `status: "connected"` for Toast in `INTEGRATIONS_SEED`
- Derive tile status from `getToastStatus` server function response
- Wire POS Sync Status card to real `toast_webhook_events` counts from Supabase
- Show real webhook URL (`publicBaseUrl() + "/api/public/toast/webhook"`) in Settings
- Add a reconnect prompt when token refresh fails silently

**Depends on:** Auth (#1), Persistence (#2) — `project_id` must be a real
UUID before `toast_connections` FK integrity is possible.

---

## 4. Location / project separation (S–M)

**Why it's needed:** `pos_orders.location_id` is set to `restaurant_guid`
for Toast orders, but `getLivePosFeed` ignores it — all orders for all
locations collapse into one feed. The active location switcher in the header
changes a label but nothing else.

**What to build:**
- Filter `getLivePosFeed` query by `location_id` matching active location
- Map Toast `restaurant_guid` explicitly to a KitchenIntel `locationId`
- Single-location mapping is sufficient for now

**Does NOT require:** Per-location inventory scoping, per-location par
levels, per-location Reports — those come later.

**Depends on:** Persistence (#2), POS connection model (#3).

---

## 5. Error handling and logging (S)

**Why it's needed:** Server function errors are largely swallowed. The live
feed catches failures with `console.warn` and retries silently. Webhook
errors are written to `toast_webhook_events.error` but never shown in UI.
A restaurant operations team cannot trust an integration they cannot observe.

**What to build:**
- Surface `toast_webhook_events` error count + last error in Integrations panel
- Add consecutive-failure counter to live feed poll; show a warning badge
  after N failures instead of silent degradation
- Standardize all server function error shapes to `{ ok: boolean, error?: string }`
- Show a reconnect prompt when `toast_connections` token is expired or invalid

**Depends on:** POS connection model (#3) for integration-specific surfaces.

---

## Dependency order

```
1. Auth
   └── 2. Persistence
         └── 3. POS connection model
               └── 4. Location separation
                     └── 5. Error handling  (can parallel with #4)
```

## Effort summary

| # | Area | Effort | Hard block for Toast? |
|---|---|---|---|
| 1 | Auth | M | Yes — tokens are unowned without user identity |
| 2 | Persistence | L | Yes — project_id must be a real UUID |
| 3 | POS connection model | M | Yes — status wiring + real webhook URL |
| 4 | Location separation | S–M | Soft — orders flow but location attribution wrong |
| 5 | Error handling | S | No — but required for production confidence |
