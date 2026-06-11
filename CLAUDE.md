# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working rules

- **Ask before major refactors** — explain the architectural change first; prefer phased, modular commits
- **Never delete files without asking**
- **Never expose secrets or `.env` values** in code, logs, or output
- **Create markdown docs for all major new systems**
- Development priority order: Stability → Architecture → Scalability → POS integrations → AI tooling → UI polish

## Commands

```bash
bun dev          # start dev server
bun build        # production build (Cloudflare Workers output)
bun build:dev    # development build
bun preview      # preview production build locally
bun lint         # ESLint
bun format       # Prettier
```

No test runner is configured.

## Architecture

**KitchenIntel** is an AI-powered kitchen operating system for restaurants. It is a TanStack Start SSR app deployed to Cloudflare Workers.

### Stack
- **Framework**: TanStack Start + TanStack Router (file-based routing, auto-generated `src/routeTree.gen.ts` — never edit manually)
- **Build**: Vite via `@lovable.dev/vite-tanstack-config`, which already includes TanStack Start, React, Tailwind CSS v4, tsConfigPaths, and Cloudflare plugins — do NOT add these manually in `vite.config.ts` or the build breaks
- **Runtime**: Bun; deployed as a Cloudflare Worker (`wrangler.jsonc`, entry `src/server.ts`)
- **Database**: Supabase (Postgres)

### State management
All application data (inventory items, station modules, recipes, sales, vendors, locations) lives in `localStorage` under the key `ki_projects_v1`. The multi-project store is loaded/saved in `KitchenIntel` (the root component in `src/routes/index.tsx`) and distributed via a React Context (`Ctx`/`useApp`). There is no server-side per-user state.

### Main app file
`src/routes/index.tsx` (~2200 lines) contains the entire UI: all views (Dashboard, Inventory, Stations, Scanner, Sales, Recipes, Forecast, Reports, Deliveries, Integrations, Settings), the app context, primitive components (`Card`, `Btn`, `Pill`, `Stat`, etc.), and the inline `ui` design token object. Navigation between views is tab-based (a `tab` string state), not separate routes.

### Server functions vs server-only helpers
- `src/lib/*.functions.ts` — `createServerFn` wrappers; callable from client via `useServerFn()`
- `src/lib/*.server.ts` — pure server helpers (Supabase admin access, POS API calls, HMAC signing); never import these from client code

### Supabase clients
- `src/integrations/supabase/client.ts` — browser client, uses `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key, respects RLS)
- `src/integrations/supabase/client.server.ts` — server-only admin client, uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

### POS integrations
- **Toast** (`src/lib/toast.server.ts`): client_credentials flow — restaurants supply their own `clientId`/`clientSecret` from Toast Web; tokens are stored in the `toast_connections` Supabase table and auto-refreshed
- **Square** (`src/lib/square.server.ts`): standard OAuth flow; tokens stored in `square_connections`; state is HMAC-signed with `SQUARE_APPLICATION_SECRET` to prevent CSRF
- Webhook receivers at `src/routes/api/public/square/webhook.ts` and `src/routes/api/public/toast/webhook.ts` verify HMAC signatures, insert raw events idempotently, then fetch + normalize the full order and upsert into `pos_orders`
- Orders are enriched with internal menu SKUs at query time via `toast_menu_map` / `square_catalog_map` tables

### AI scanning
`src/lib/scan.functions.ts` — calls the Lovable AI Gateway (`https://ai.gateway.lovable.dev`) with Gemini 2.5 Flash using structured tool-calling to extract recipes, products, or invoice line items from images. Requires `LOVABLE_API_KEY`.

### Live POS feed
`src/lib/pos.functions.ts` — polls Supabase for recent orders, enriches items with `menuSku`, and deducts inventory via the recipe engine in the client.

### UI / styling
The main app uses inline styles with a `ui` design token object defined at the top of `src/routes/index.tsx` (colors, shadows, font stacks). The `src/components/ui/` directory contains shadcn/ui components used in the integration panels; these follow Tailwind CSS classes. The `@` alias maps to `src/`.

### Environment variables
| Variable | Required | Where used |
|---|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Yes | Supabase clients |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Yes | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Admin Supabase client |
| `LOVABLE_API_KEY` | Yes (AI scanner) | `scan.functions.ts` |
| `SQUARE_APPLICATION_ID` | Square integration | `square.server.ts` |
| `SQUARE_APPLICATION_SECRET` | Square integration | `square.server.ts` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square webhooks | `square/webhook.ts` |
| `TOAST_WEBHOOK_SIGNATURE_KEY` | Toast webhooks | `toast/webhook.ts` |
| `PUBLIC_BASE_URL` | Optional | OAuth redirect + webhook URL (defaults to the Lovable app URL) |
