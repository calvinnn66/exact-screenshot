import { supabase } from "@/integrations/supabase/client";

// ---------- types ----------------------------------------------------------

export type DbProjectRow = {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProjectStateRow = {
  project_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  updated_at: string;
};

// ---------- read -----------------------------------------------------------

/**
 * Fetch all projects (with their state blobs) for the currently authenticated
 * user. Returns an empty array if the user has no projects or if Supabase is
 * unreachable. Throws on auth/network errors so the caller can fall back to
 * localStorage.
 */
export async function fetchUserProjects(): Promise<
  Array<DbProjectRow & { state: unknown }>
> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_state(state)")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const stateRows = (row as { project_state?: { state: unknown }[] })
      .project_state;
    const state =
      Array.isArray(stateRows) && stateRows.length > 0
        ? stateRows[0].state
        : {};
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      state,
    };
  });
}

// ---------- write ----------------------------------------------------------

/**
 * Create or update a project row and its state blob. Safe to call
 * repeatedly; uses ON CONFLICT upsert so it is idempotent.
 */
export async function upsertProject(
  projectId: string,
  userId: string,
  name: string,
  type: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any,
): Promise<void> {
  // 1. Upsert the project metadata row.
  const { error: projError } = await supabase.from("projects").upsert(
    { id: projectId, user_id: userId, name, type: type ?? null },
    { onConflict: "id" },
  );
  if (projError) throw projError;

  // 2. Upsert the state blob.
  const { error: stateError } = await supabase.from("project_state").upsert(
    { project_id: projectId, state },
    { onConflict: "project_id" },
  );
  if (stateError) throw stateError;
}

// ---------- delete ---------------------------------------------------------

/**
 * Delete a project (cascades to project_state via FK).
 */
export async function deleteProjectFromDb(projectId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw error;
}
