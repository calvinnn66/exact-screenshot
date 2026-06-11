# KitchenIntel — Developer Handoff

_Created: 2026-06-11 · Branch: `clawbot-dev`_

---

## Current Branch

```
clawbot-dev  (ahead of main, not yet merged)
```

The Lovable project is connected to `calvinnn66/exact-screenshot` on GitHub.
Do not merge `clawbot-dev` → `main` without review.

---

## Recent Commits

```
da4d61c fix(P0-4): make POS live badges conditional on actual data flow
bcaf6f4 fix(P0-3): remove fake Connect button for unimplemented integrations
90142e1 fix(P0-2): replace Math.random() minutes with real timestamp in sales feed
bfca90d fix(P0-1): read projectId from app context instead of hardcoding
133b313 Fix local dev setup: gitignore .env, add admin guard, document Lovable Cloud backend
67b3a86 Add CLAUDE.md with architecture docs and dev rules
bf54d5f Made mobile-first layout fixes (Lovable)
b735718 Changes (Lovable)
52b7de5 Changes (Lovable)
10afe8e Changes (Lovable)
```

---

## Project Overview

KitchenIntel is an AI-powered kitchen operating system for restaurants.

**Stack:** TanStack Start (SSR) · React 19 · Tailwind CSS v4 · Supabase · Cloudflare Workers · Bun

**Key architectural facts:**
- All app state (inventory, stations, recipes, vendors, sales) lives in `localStorage` under `ki_projects_v1` — no server-side user data store yet
- `src/routes/index.tsx` (~2200 lines) is a single-file monolith containing all UI views, context, types, and primitives
- Navigation is tab-based state (`tab` string in `Shell`), not separate routes
- Server functions in `src/lib/*.functions.ts` are callable from the client via `useServerFn()`
- Server-only helpers in `src/lib/*.server.ts` (Supabase admin, POS API calls) must never be imported client-side
- `src/integrations/supabase/client.server.ts` and `client.ts` are **auto-generated** — do not edit
- `src/routeTree.gen.ts` is **auto-generated** by TanStack Router — do not edit
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config` which already bundles TanStack Start, React, Tailwind, Cloudflare — do not add these plugins manually or the build breaks

**Local dev:**
```bash
bun install
bun dev      # starts on port 8080 (or next available)
bun build    # Cloudflare Workers production build
bun lint
bun format
```

`SUPABASE_SERVICE_ROLE_KEY` is not required for local frontend dev. Missing it triggers a one-time warning (not spam) via `src/lib/admin-guard.ts`. All localStorage-based features work without it.

---

## Environment Variables

See `.env.example` for the full list with instructions.

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

`.env` is gitignored. It was previously committed (commit `53f39d0`) but only contained the anon key — no service role key was ever committed.

---

## Completed Work (this session)

### Infrastructure
- **CLAUDE.md** — full architecture reference, dev rules, env var table
- **docs/ROADMAP.md** — full audit with 32 prioritized items and effort estimates
- **.env.example** — all required vars with instructions and Lovable Cloud notes
- **.gitignore** — added `.env`, `.env.local`, `.env.*.local`
- **src/lib/admin-guard.ts** — `requireAdmin()` warn-once guard for server functions
- **`getLivePosFeed`** — applies `requireAdmin()` to stop 8s polling spam when service role key is absent

### P0 Bug Fixes (all committed separately)

| Commit | Bug | Root cause | Fix |
|---|---|---|---|
| `bfca90d` | Hardcoded `projectId` | `project.id` never added to app context; two sites pasted a Lovable UUID | Added `projectId: string` to `AppCtx`; set from `project.id` in `ProjectWorkspace` |
| `90142e1` | `Math.random()` in sales feed | `SalesRow` had no timestamp; display fabricated random minutes every render | Added `ts: number` to `SalesRow`, stamped at push time in sim and real POS handler |
| `bcaf6f4` | Fake "Connect" for unimplemented integrations | Button wrote only to `Shell` `useState`; state reset on every refresh | Added `implemented?: boolean` to `Integration` type; non-implemented show "Coming soon" |
| `da4d61c` | "Toast · Live" badge always shown | Three UI sites hardcoded the badge regardless of connection state | Badges now conditional on `sales.length > 0`; "Toast" name removed |

---

## Supabase Schema (existing tables)

All tables have RLS enabled. Access is service-role-only via server functions.

```
pos_orders          — normalized order feed (Toast + Square)
square_connections  — Square OAuth tokens per project
square_catalog_map  — Square catalog item → internal menu SKU mapping
square_webhook_events — inbound Square webhook log
toast_connections   — Toast client credentials + access token per project
toast_menu_map      — Toast item GUID → internal menu SKU mapping
toast_webhook_events — inbound Toast webhook log
```

Migrations are in `supabase/migrations/`. Supabase project ID: `muklqaivygnxpubkphbx`.

---

## Remaining Roadmap

Full detail in `docs/ROADMAP.md`. Summary by priority:

### P1 — Core missing CRUD (blocks daily use)
- **#5** Item edit modal — no way to edit name, unit, par, max, station, category, cost after creation · **M**
- **#6** "Add Item" dialog — Inventory button is inert; only AI Scanner can add items · **M**
- **#7** Recipe edit — can view/delete but cannot edit ingredients, quantities, price, or station · **M**
- **#8** Replace `window.prompt`/`window.confirm` — breaks iOS Safari PWA and Cloudflare Workers SSR · **S**

### P2 — Data integrity & persistence
- **#9** Server-side persistence — all data in localStorage; new browser/device loses everything · **L**
- **#10** Auth — `auth-attacher.ts` and `auth-middleware.ts` exist but completely unwired · **L**
- **#11** Update 7-day usage from real sales — `usage[]` arrays never update after seeding · **M**
- **#12** Real POS Sync Status card — "8s ago / 1,284 records / 142ms" are hardcoded · **S**

### P3 — Partial features to complete
- **#13** CSV export · **S**
- **#14** Prep print · **S**
- **#15** Sales Intelligence real calculations (trends, Rush Risk) · **M**
- **#16** Forecasting — replace hardcoded cover count + factors · **M**
- **#17** Reports — compute COGS, waste %, labor from real data · **M**
- **#18** Dashboard AI Insights — generate from live inventory instead of hardcoded strings · **M**
- **#19** Deliveries — wire "Scan invoice" + basic PO receive flow · **L**

### P4 — Settings completeness
- **#20** Show real webhook URLs in Settings (currently shows fake `api.kitchenintel.io`) · **S**
- **#21** Users & Roles — wire to Supabase auth once auth is in place · **L**
- **#22** "Send to Stations" — prep list export by station · **M**
- **#23** Email Daily summary · **L**

### P5 — New integrations
- **#24** Clover POS · **L**
- **#25** Lightspeed · **L**
- **#26** QuickBooks · **L**
- **#27** Barcode lookup (UPC → product info) · **M**
- **#28** Real forecasting data (weather API + events) · **XL**

### P6 — Polish
- **#29** Remove emoji from Scanner mode picker · **XS**
- **#30** Deliveries empty state · **XS**
- **#31** Inventory count badge in sidebar · **XS**
- **#32** Bell/notification system for critical inventory · **M**

---

## Known Issues

### Data model
- `project_id` in `toast_connections` and `square_connections` is `TEXT` storing client-generated IDs like `prj_abc123` — not a real Supabase UUID. Foreign key integrity is impossible until persistence moves to Supabase (#9).
- `SalesRow.ts` is epoch ms from the client clock, not from the POS order timestamp. Real order times from Toast/Square are in `pos_orders.ordered_at` but not surfaced to the sales feed yet.
- 7-day `usage[]` arrays on `Item` are set once at seed/scan time and never update from real sales data.

### UI / UX
- `window.prompt()` used for project rename (index.tsx:547) and station rename (index.tsx:2035) — breaks in iOS Safari PWA mode and Cloudflare Workers SSR.
- `window.confirm()` used for project delete (index.tsx:599) and station remove (index.tsx:2048) — same breakage.
- Inventory "Export CSV", "+ Add Item", Prep "Print", "Send to Stations", Reports "Export PDF", "Email Daily", Forecast "Order" buttons all have no `onClick` handler.
- Recipe editing is impossible — only view and delete.
- `INTEGRATIONS_SEED` initializes Toast as `status: "connected"` unconditionally. The tile grid for Toast/Square does not reflect real Supabase connection state (though `ToastPanel`/`SquarePanel` above it do).

### Hardcoded values still in the codebase
- `publicBaseUrl()` in `square.server.ts:20` and `toast.server.ts:20` falls back to the Lovable app URL — correct for production, but should be overridden via `PUBLIC_BASE_URL` in any custom deployment.
- Reports: Waste 2.4%, COGS 28.2%, Labor 22.8%, Prep Accuracy 94%, labor chart data are all static.
- Forecasting: 312 covers, +12% weather factor, +24% event boost are all static.
- Dashboard AI Insights: all three cards are hardcoded strings.
- POS Sync Status card: "8s ago", "1,284 records/day", "p95 · 142ms" are hardcoded.
- Settings API Key (`ki_live_••••••••3f8a`) and Webhook URL (`api.kitchenintel.io`) are fake.
- Users & Roles section: four hardcoded role cards, "Manage" button is inert.

### Auth / security
- No login, no user sessions. Any browser can access any project.
- `toast_connections` and `square_connections` have no user ownership — they're keyed only by `project_id` (a client-generated string).
- `auth-attacher.ts` and `auth-middleware.ts` exist in `src/integrations/supabase/` but are not imported or used anywhere.

---

## P1 Plan — Prerequisites for Real Toast Integration

Agreed plan from this session, in dependency order:

### 1. Auth (M)
Wire Supabase Auth (email/password or magic link). Add login screen before project picker. Attach `user.id` to projects. Protect server functions behind valid session. **Nothing else can be properly scoped without user identity.**

### 2. Server-side persistence (L)
Add `projects` and `project_state` tables to Supabase. Migrate `loadProjects`/`saveProjects` to read/write Supabase. Keep localStorage as write-through cache. `project_id` must become a real Supabase UUID so `toast_connections` can reference it as a proper foreign key.

### 3. POS connection model (M)
Remove hardcoded `status: "connected"` from Toast in `INTEGRATIONS_SEED`. Derive tile status from `getToastStatus` server function response. Wire real Sync Status card to `toast_webhook_events` counts. Show real webhook URL (`publicBaseUrl() + "/api/public/toast/webhook"`) in Settings. Add reconnect prompt when token refresh fails.

### 4. Location/project separation (S–M)
Filter `getLivePosFeed` by `location_id`. Map Toast `restaurant_guid` explicitly to `activeLocationId`. Single-location mapping is sufficient for now — full multi-location can come later.

### 5. Error handling (S)
Surface `toast_webhook_events.error` count in Integrations panel. Add consecutive-failure counter to live feed poll. Standardize all server function error shapes to `{ ok: boolean, error?: string }`.

---

## Next Recommended Tasks

In order:

1. **Commit `docs/`** — ROADMAP.md and HANDOFF.md are untracked
2. **P1-8 (S)** — Replace `window.prompt`/`window.confirm` with inline modals; quick win, unblocks iOS PWA use
3. **P1-5 + P1-6 (M)** — Item edit modal + Add Item dialog; together these make inventory actually usable without the AI scanner
4. **P1-7 (M)** — Recipe edit; required before real Toast SKU mapping is trustworthy
5. **P2-10 (M→L)** — Auth; the first hard dependency for everything server-side
6. **P2-9 (L)** — Server-side persistence; required for multi-device, multi-user, and proper `project_id` FK integrity
7. **P3-12 + P4-20 (S each)** — Real POS Sync Status + real webhook URL in Settings; quick, high trust-building value

---

## Effort Key

- **XS** < 1 hour
- **S** 2–4 hours
- **M** half to full day
- **L** 2–3 days
- **XL** week+
