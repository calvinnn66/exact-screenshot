-- Projects: one row per restaurant workspace, owned by a Supabase Auth user.
CREATE TABLE public.projects (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  type       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project state: serialized Persist blob (inventory, recipes, locations, etc.)
CREATE TABLE public.project_state (
  project_id UUID        PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  state      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: each user can only see and modify their own projects.
-- The anon key (browser client) is sufficient — no service role key needed for this data.
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_own_user"
  ON public.projects FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK(user_id = auth.uid());

CREATE POLICY "project_state_own_user"
  ON public.project_state FOR ALL
  USING     (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK(project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- updated_at triggers (touch_updated_at already exists from migration 1)
CREATE TRIGGER trg_projects_touch
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_project_state_touch
  BEFORE UPDATE ON public.project_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_projects_user ON public.projects(user_id);
