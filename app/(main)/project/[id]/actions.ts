"use server";

import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

type Result =
  | { ok: true; clientPortal: boolean; token: string | null }
  | { ok: false; error: string };

/**
 * Enable / disable / regenerate a project's client-portal access.
 *
 * - When `enabled` is true, a fresh random token is generated and stored,
 *   replacing any previous token. The caller receives the new token to
 *   build the shareable URL.
 * - When `enabled` is false, the token is cleared and the flag set to false.
 *
 * Ownership: the caller must be the project owner OR an admin.
 */
export async function setClientPortalAccess(
  projectID: string,
  enabled: boolean
): Promise<Result> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Ownership/admin check (mirror the pattern in app/(main)/project/[id]/page.tsx).
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("userID")
    .eq("projectID", projectID)
    .single();
  if (projectError || !project) {
    return { ok: false, error: "Project not found" };
  }

  if (project.userID !== user.id) {
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminCheck) {
      return { ok: false, error: "Forbidden" };
    }
  }

  const newToken = enabled ? randomUUID() : null;

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      clientPortal: enabled,
      clientPortalToken: newToken,
    })
    .eq("projectID", projectID);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(`/project/${projectID}`);
  return { ok: true, clientPortal: enabled, token: newToken };
}
