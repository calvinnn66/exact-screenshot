
CREATE TABLE public.toast_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  restaurant_guid text NOT NULL,
  management_group_guid text,
  environment text NOT NULL DEFAULT 'sandbox',
  client_id text NOT NULL,
  client_secret text NOT NULL,
  access_token text,
  expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, restaurant_guid)
);
ALTER TABLE public.toast_connections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER touch_toast_connections BEFORE UPDATE ON public.toast_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.toast_menu_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  restaurant_guid text NOT NULL,
  toast_item_guid text NOT NULL,
  toast_item_name text NOT NULL,
  menu_sku text,
  ignored boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, restaurant_guid, toast_item_guid)
);
ALTER TABLE public.toast_menu_map ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER touch_toast_menu_map BEFORE UPDATE ON public.toast_menu_map
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.toast_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  restaurant_guid text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);
ALTER TABLE public.toast_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_toast_menu_map_project ON public.toast_menu_map(project_id, restaurant_guid);
CREATE INDEX idx_toast_connections_project ON public.toast_connections(project_id);
