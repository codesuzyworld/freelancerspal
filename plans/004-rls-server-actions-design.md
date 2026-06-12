# Plan 004: Design spike — RLS posture & server-action migration for mutations

> **Executor instructions**: This is a **design / spike plan**, not a build plan. The deliverable is a written design document and a tiny vertical-slice proof-of-concept — not a broad refactor. Follow steps in order and produce the artifacts described. STOP conditions are real: if RLS turns out to already be configured correctly and reviewable, scope this plan down accordingly.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- 'app/(main)/project/**' 'utils/supabase/**'`
> If the CRUD pages or Supabase utilities have been substantially refactored, re-read them before designing.

## Status

- **Priority**: P1
- **Effort**: L (multi-day — but bounded; this plan is a spike, not a full migration)
- **Risk**: MED — touches authorization architecture; getting it wrong is worse than not changing it
- **Depends on**: 001, 003
- **Category**: security / architecture
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

Every data mutation in this app — creating projects, editing tasks, uploading files, adding links, deleting anything — runs in a `'use client'` component using the **browser Supabase client with the anon key**. See for example:

- `app/(main)/project/addProject/page.tsx:103-113` — `supabase.from('projects').insert([{ userID: user.id, ... }])`
- `app/(main)/project/[id]/addFile/page.tsx:106-135` — file upload to `projectFiles` storage bucket then row insert
- `app/(main)/project/[id]/editProject/page.tsx:153-163` — `supabase.from('projects').update(...).eq('projectID', id)`
- `app/(main)/project/[id]/deleteProject/page.tsx` — same pattern for delete
- 10+ more identical mutations across the `[id]/*` subpages

The in-JS `if (!user)` guard at the top of each handler is **advisory** — any user can open DevTools, instantiate their own Supabase client with the anon key (which is public, by design), and call `supabase.from('projects').update(...).eq('projectID', someoneElsesID).update({...})` directly. Authorization is therefore enforced entirely by **Supabase Row Level Security (RLS) policies on the database itself.**

There are no RLS policies in this repo. They live in the Supabase project console. Whether they are correctly configured is unknowable from reading this code — which is the load-bearing problem. A reviewer cannot verify the security model.

The goal of this plan is **not** to migrate every mutation (that is plan 005). It is to:
1. Make the RLS posture visible and reviewable by committing the policies into the repo as SQL migrations.
2. Decide whether to additionally migrate mutations to server actions (which would let the codebase enforce authz in TypeScript on the server, with the anon key as a defense-in-depth backstop rather than the sole control).
3. Prove the decision with one vertical slice (one mutation migrated) so plan 005 can scale the pattern.

## Current state

### Supabase clients

- `utils/supabase/server.ts:1-29` — `createClient()` for server components, uses cookies for session.
- `utils/supabase/client.ts:1-7` — `createClient()` for browser, uses `createBrowserClient` with anon key.
- `utils/supabase/middleware.ts:1-62` — middleware that refreshes session and handles `/protected` + `/` routing.
- No `supabase/` directory at repo root. No migrations. No `supabase/config.toml`.

### Tables inferred from code

Queries reference these tables:
- `projects` (columns observed in queries: `projectID`, `userID`, `projectName`, `projectDate`, `ratePerHour`, `projectTags`, `projectDesc`, `projectPhoto`, `clientPortal`, `created_at`)
- `tasks` (columns: `taskID`, `projectID`, `userID`, `taskName`, `taskDate`, `hourSpent`, `taskDesc`)
- `links` (columns: `linkID`, `projectID`, `userID`, `linkName`, `link`)
- `files` (columns: `fileID`, `projectID`, `userID`, `fileName`, `filePath`, `fileType`)
- `user_roles` (columns: `user_id`, `role` — observed values include `'admin'`)
- `role_permissions` (columns: `role`, `permission` — observed in `app/test-auth/page.tsx:29-34`)

Plus a Supabase Storage bucket named `projectFiles` (see `app/(main)/project/[id]/addFile/page.tsx:107`).

### Mutations to inventory

Search command:
```bash
grep -rn "supabase\.\(from\|storage\)" app/ components/ | grep -E "\.(insert|update|delete|upload|remove)"
```
Expected to surface ~14 mutation callsites across the in-scope pages. Each one bypasses any server-side check today.

### Reads

Server-component reads also use the anon-key client (via cookies), but in those cases the *current session's* identity is presented to Supabase, so RLS can correctly scope results. Reads are less broken than writes if RLS is configured at all.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| List Supabase project schemas (if `supabase` CLI installed) | `supabase db pull --schema public` | writes a migration file mirroring current DB |
| Or: PSQL direct query for RLS | `psql "$SUPABASE_DB_URL" -c "SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';"` | shows all RLS policies |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |

If neither `supabase` CLI nor direct Postgres access is available to the executor: STOP at step 1 and report. You cannot complete this plan without seeing the current RLS state. Ask the operator to either run `supabase db pull` themselves and paste the output, or grant access.

## Scope

**In scope** (artifacts to create):
- `docs/SECURITY.md` (or `docs/RLS.md`) — written design document
- `supabase/migrations/<timestamp>_initial_rls.sql` — the current RLS policies, exported from the live database
- `supabase/migrations/<timestamp>_<topic>.sql` — any *new* policies required to close gaps
- ONE vertical-slice migration: convert ONE mutation (recommended: `addProject`) from client-side to a server action. Keep the old client code path as a fallback removable in plan 005.

**Out of scope:**
- Migrating the other ~13 mutations. Plan 005 does that.
- Changing read pages.
- Adding tests (separate plan).
- Adding API routes — server actions are the chosen mechanism.

## Git workflow

- Branch: `advisor/004-rls-server-actions-design`
- Multiple commits OK (one per artifact). Commit message style: informal.
- Do NOT push to remote until the design doc has been reviewed by the maintainer.

## Steps

### Step 1: Export current RLS state from Supabase

Option A (preferred — requires `supabase` CLI and `supabase login`):
```bash
supabase link --project-ref <PROJECT_REF>
supabase db pull
```
Result: a timestamped SQL file under `supabase/migrations/` mirroring the current public schema, including any RLS policies.

Option B (PSQL direct access):
```bash
psql "$SUPABASE_DB_URL" -c "SELECT * FROM pg_policies WHERE schemaname = 'public';" > /tmp/current-policies.txt
```
Manually translate the output into a SQL migration file at `supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_rls.sql`.

If neither option is available — STOP. You cannot proceed without ground truth on what RLS currently allows.

**Verify**: the migration file exists and contains `CREATE POLICY` statements for at least the `projects`, `tasks`, `files`, `links`, and `user_roles` tables, OR explicitly lists "no policies defined for table X" as a finding.

### Step 2: Audit the RLS policies you just exported

For each table (`projects`, `tasks`, `files`, `links`, `user_roles`, `role_permissions`), answer:

1. Is RLS **enabled** on the table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)? If not, that is an immediate critical finding.
2. What policies exist for each of `SELECT`, `INSERT`, `UPDATE`, `DELETE`?
3. Do the policies correctly scope each operation to `auth.uid() = userID` (or the admin role)?
4. For `projects`, is there a policy that ALSO allows anonymous `SELECT` when `clientPortal = true`? That's required for the public client portal to work.
5. For Storage bucket `projectFiles`, what bucket policies exist? (Storage policies live in a separate table; check `storage.policies`.)

Record findings in the design doc (step 4).

### Step 3: Identify gaps

Common gaps for this app's architecture (predict, then verify):

- `INSERT` policies should require `userID = auth.uid()` so a user can't insert a row claiming someone else's `userID`. Without this, the client-side `userID: user.id` is just decoration.
- `UPDATE` and `DELETE` policies on `projects` should require `userID = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')`. Same for `tasks`, `files`, `links`.
- The `clientPortal` access path needs an anon-readable `SELECT` policy gated on `clientPortal = true`.
- The `user_roles` table should NOT allow self-promotion to admin — `INSERT/UPDATE` on `user_roles` should be admin-only.

For each gap, draft a `CREATE POLICY` statement. Put them in a NEW migration file: `supabase/migrations/$(date +%Y%m%d%H%M%S)_close_rls_gaps.sql`.

**Important**: do NOT apply this migration to the live database in this plan. The maintainer needs to review it first.

### Step 4: Write `docs/SECURITY.md`

Outline:

```markdown
# Security & RLS

## Threat model
- Untrusted clients can call Supabase directly with the anon key. The browser bundle exposes the key by design; it is not a secret.
- All authorization MUST be enforced by Supabase RLS policies, not by client-side checks.

## Tables & policies (current state)
- `projects` — RLS enabled: <yes/no>. Policies:
  - SELECT: <...>
  - INSERT: <...>
  - UPDATE: <...>
  - DELETE: <...>
(repeat for each table)

## Gaps identified
- <list of gaps from step 3, each with the proposed CREATE POLICY>

## Mutation architecture decision
- Option A: keep client-side mutations, rely on RLS only.
- Option B: migrate mutations to Next.js server actions, RLS as defense in depth.
- Decision: <Option B for the freelancer-only paths; Option A is fine for the client-portal-only paths because there are none yet>.
- Reasoning: <...>

## Server-action pattern (when used)
- Server action receives form data, validates with Zod, calls supabase server client (still anon key, but bound to the cookie session), returns Result.
- Why this is safer than current code: <the in-JS `if (!user)` check now runs server-side, where a user can't bypass it by skipping the call>.

## How to add a new mutation
- Step-by-step pattern using the vertical-slice example from step 5.

## Open questions
- <...>
```

This document is the deliverable that makes plan 005 executable.

### Step 5: Build ONE vertical-slice server action

Recommended target: **`addProject`** — the simplest mutation, no nested entity, sets the pattern others follow.

Create `app/(main)/project/addProject/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const schema = z.object({
  projectName: z.string().min(1),
  projectDate: z.coerce.date(),
  ratePerHour: z.coerce.number().min(0),
  projectTags: z.string().min(1),
  projectDesc: z.string().min(1),
});

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Not authenticated" } as const;
  }

  const parsed = schema.safeParse({
    projectName: formData.get("projectName"),
    projectDate: formData.get("projectDate"),
    ratePerHour: formData.get("ratePerHour"),
    projectTags: formData.get("projectTags"),
    projectDesc: formData.get("projectDesc"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors } as const;
  }

  const { error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, userID: user.id });

  if (error) {
    return { error: error.message } as const;
  }

  redirect("/project");
}
```

Refactor `app/(main)/project/addProject/page.tsx` to a thin shell that uses the action. The simplest path that preserves the existing toast UX is to **leave the existing client component in place** and have its `handleSubmit` call the server action via `useTransition`, instead of calling Supabase directly:

```tsx
import { createProjectAction } from "./actions";
import { useTransition } from "react";
// ...
const [isPending, startTransition] = useTransition();
const handleSubmit = (values: z.infer<typeof formSchema>) => {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => fd.append(k, v instanceof Date ? v.toISOString() : String(v)));
  startTransition(async () => {
    const result = await createProjectAction(fd);
    if (result && "error" in result) {
      toast({ title: "Error", description: typeof result.error === "string" ? result.error : "Validation failed", variant: "destructive" });
      return;
    }
    // server action's redirect handles navigation
  });
};
```

The point is to **prove the pattern works end-to-end**, not to make it pretty. Plan 005 will refactor for elegance.

**Verify**:
- Manual: `npm run dev`, log in, create a project via the form, confirm it appears in `/project`.
- DevTools network tab: the POST hits the server action endpoint (Next.js encodes this as a POST to the same URL), not a direct Supabase call.
- `npm run typecheck` exits with the same baseline.
- `npm run build` exits 0.

### Step 6: Document the open questions for the maintainer

Append to `docs/SECURITY.md` an "Open questions" section listing anything the executor could not decide alone:

- Should admin users bypass `userID = auth.uid()` checks via a separate `auth.role()` JWT claim instead of a join to `user_roles` (which is currently per-query)? Joining to `user_roles` inside every RLS policy adds DB load.
- Storage bucket `projectFiles` policy: should clients viewing the public client portal be allowed to fetch files? The current code uses `getPublicUrl()` which implies "yes," but RLS on the `files` table must align.
- Is the audit log of who-changed-what something to add now (a `audit_log` table with INSERT-only RLS)?

Do not answer these in this plan — just surface them.

### Step 7: Update `plans/README.md`

Change the 004 row's Status from `TODO` to `DONE`. Add a note in the Dependency section that **plan 005 cannot start until the maintainer reviews `docs/SECURITY.md` and approves the proposed gap-closing migration.**

## Test plan

- Manual smoke test in step 5.
- Document in `docs/SECURITY.md` how a future test would verify each RLS policy by hitting Supabase with a token for user A and asserting they cannot read/write user B's rows.

## Done criteria

ALL must hold:

- [ ] `supabase/migrations/<timestamp>_initial_rls.sql` exists and reflects the current live RLS state.
- [ ] `supabase/migrations/<timestamp>_close_rls_gaps.sql` exists with the proposed fixes (NOT yet applied to live DB).
- [ ] `docs/SECURITY.md` exists with sections: threat model, current RLS state per table, identified gaps, mutation architecture decision, server-action pattern, open questions.
- [ ] `app/(main)/project/addProject/actions.ts` exists and implements the server action.
- [ ] `app/(main)/project/addProject/page.tsx` calls the server action instead of `supabase.from('projects').insert(...)` directly.
- [ ] Manual smoke test: a new project can be created end-to-end through the UI.
- [ ] `npm run typecheck` and `npm run build` exit 0.
- [ ] `plans/README.md` status row for 004 updated to DONE.

## STOP conditions

- Step 1 fails: no way to access the live Supabase RLS state. (Report and ask.)
- Step 2 reveals RLS is *not enabled* on one of the data tables. This is a critical incident; report immediately rather than continue the design — that needs to be fixed in production NOW, ahead of any tooling work.
- Step 3 surfaces a gap whose fix requires changing the public schema in a way that would break the running app (e.g. renaming a column). Stop and ask.
- Server action POC in step 5 fails for an unexpected runtime reason (e.g., FormData encoding of Date), and resolving it requires more than 30 minutes of trial-and-error. Stop, document the blocker.

## Maintenance notes

- This plan deliberately stops at one vertical slice. Plan 005 will scale the pattern.
- `docs/SECURITY.md` is now the source of truth for the architecture. Future PRs that add new tables or mutations must update it.
- The `supabase/migrations/` directory is now a contract: any policy change must land in a new migration committed to the repo, not directly in the Supabase console.
- Reviewer should scrutinize: (1) does the gap-migration SQL look correct, (2) does the server-action POC actually run, (3) is the design doc honest about what's currently broken vs. what's just untidy.
- Watch in code review: anyone who edits a mutation page should be redirected to use a server action.
