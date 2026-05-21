
-- Square OAuth connections (one row per connected Square location)
CREATE TABLE public.square_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  location_id TEXT,
  merchant_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, merchant_id, location_id)
);
CREATE INDEX square_connections_project_idx ON public.square_connections(project_id);
CREATE INDEX square_connections_merchant_idx ON public.square_connections(merchant_id);

-- Square catalog → internal menu SKU mapping
CREATE TABLE public.square_catalog_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  square_object_id TEXT NOT NULL,
  square_variation_id TEXT,
  square_name TEXT NOT NULL,
  menu_sku TEXT,
  ignored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, merchant_id, square_object_id, square_variation_id)
);
CREATE INDEX square_catalog_map_project_idx ON public.square_catalog_map(project_id);

-- Inbound webhook event log
CREATE TABLE public.square_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  merchant_id TEXT,
  location_id TEXT,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);
CREATE INDEX square_webhook_events_merchant_idx ON public.square_webhook_events(merchant_id);
CREATE INDEX square_webhook_events_received_idx ON public.square_webhook_events(received_at DESC);

-- Normalized POS order feed (Square + future sources)
CREATE TABLE public.pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'square',
  external_id TEXT NOT NULL,
  merchant_id TEXT,
  location_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);
CREATE INDEX pos_orders_project_idx ON public.pos_orders(project_id, ordered_at DESC);

-- Enable RLS on all tables; no public policies — access only via server functions
-- holding the service role key. This locks out anon/authenticated direct access.
ALTER TABLE public.square_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.square_catalog_map     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.square_webhook_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders             ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_square_connections_touch BEFORE UPDATE ON public.square_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_square_catalog_map_touch BEFORE UPDATE ON public.square_catalog_map
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable realtime for the normalized order feed so the UI updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_orders;
