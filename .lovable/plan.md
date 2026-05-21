# Real Square POS Integration

Turn the Integrations module from a mocked status panel into a working Square connection: OAuth, live order webhooks, catalog sync, and automatic inventory deduction driven by real sales.

## What the user needs to do (one-time)

1. Create a Square developer app at https://developer.squareup.com/apps
2. From the app dashboard, copy:
   - **Application ID**
   - **Application Secret**
   - **Webhook Signature Key** (after we give them the webhook URL)
3. Set the OAuth Redirect URL in Square to the callback we expose
4. Paste those three values into Lovable when prompted (stored as secrets)

I'll surface the exact URLs to paste into Square *before* asking for secrets, so they have everything ready in one pass.

## What I'll build

### 1. Enable Lovable Cloud
Required for:
- Persisting OAuth tokens per location (can't live in localStorage — they're secrets and need refresh)
- Storing the inbound webhook event log
- Mapping Square `catalog_object_id` → our internal menu/recipe items
- Multi-device sync (today everything is single-browser localStorage)

### 2. Database schema
```text
square_connections        merchant_id, location_id, access_token, refresh_token,
                          expires_at, project_id, scopes
square_catalog_map        square_object_id  →  project menu_sku  (per project)
square_webhook_events     event_id (unique), type, payload, processed_at, error
pos_orders                source ('square'), external_id, location_id, items[],
                          total, created_at  — normalized order log
```
RLS: scoped by `project_id` + authenticated user.

### 3. OAuth flow
- `GET /api/square/connect` → redirects user to Square authorize URL with state token
- `GET /api/square/callback` → exchanges code for tokens, stores in `square_connections`, redirects back to Integrations panel
- Background refresh: server fn that refreshes tokens nearing expiry

### 4. Webhook receiver
- `POST /api/public/square/webhook` (public prefix so Square can reach it)
- Verifies `x-square-hmacsha256-signature` using the Webhook Signature Key (HMAC-SHA256 of notification URL + raw body)
- Idempotent: dedupes on `event_id`
- Handles `order.created` and `order.updated`:
  1. Fetch full order from Square Orders API
  2. Map each line item via `square_catalog_map` → our `MENU` recipe
  3. Deduct ingredients from inventory (same engine the simulation uses today)
  4. Append to `pos_orders` + Sales Intelligence feed

### 5. Catalog sync
- Server fn `syncSquareCatalog(locationId)` pulls Square catalog
- UI in Integrations → Square shows a mapping table: each Square item gets dropdown to bind to a project menu SKU (or "Ignore")
- "Auto-map by name" button for first-time setup

### 6. Integrations UI rework
- Replace the fake status indicators with real ones backed by:
  - `connected` (token valid)
  - last webhook received timestamp
  - 24h event count + error count from `square_webhook_events`
- "Connect Square" button → kicks off OAuth
- "Disconnect" → revokes token + clears mapping
- Catalog mapping subpage

### 7. Stop the simulator when real data is flowing
- If a Square connection exists for the active location, disable the `posLive` setInterval and source the Sales Intelligence feed from `pos_orders` instead.

## Technical notes

- Square uses standard OAuth 2.0 with refresh tokens; access tokens expire in 30 days. We'll refresh on use if `< 7 days` remaining.
- Webhook signature: `HMAC_SHA256(notification_url + raw_body, signature_key)` then base64 — must compute on the **raw** body, so the route handler reads `request.text()` before any JSON parse.
- Square sandbox vs production: we'll add an `environment` field on the connection so users can test with sandbox creds first.
- All Square API calls go through `connect.squareupsandbox.com` or `connect.squareup.com` depending on environment.
- The webhook URL we give the user will be the stable preview/prod URL: `project--<id>.lovable.app/api/public/square/webhook`.

## Out of scope for this pass

- Toast, Clover, Shopify POS (same pattern, ~80% reusable once Square is done)
- Real-time refunds/voids reversing inventory deductions
- Multi-location token management UI beyond the active project's locations
- Vendor/accounting integrations (QuickBooks, etc.)

## Order of execution

1. Enable Lovable Cloud + create tables
2. Ask user for Square app credentials (after showing them the redirect + webhook URLs to paste into Square first)
3. OAuth routes
4. Webhook route + signature verification
5. Catalog sync + mapping UI
6. Order → inventory deduction wiring
7. Integrations panel rework + simulator gating
