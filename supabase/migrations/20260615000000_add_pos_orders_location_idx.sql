-- Add compound index to support filtering pos_orders by location_id.
-- Required before Phase 2 (getLivePosFeed location filter) is deployed.
-- The existing pos_orders_project_idx covers (project_id, ordered_at DESC) only;
-- a location_id predicate on that index forces a heap re-scan of all project rows.
CREATE INDEX IF NOT EXISTS idx_pos_orders_location
  ON public.pos_orders(project_id, location_id, ordered_at DESC);
