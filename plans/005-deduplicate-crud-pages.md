# Plan 005: Deduplicate the 12 near-identical CRUD form pages

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result. If anything in "STOP conditions" occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- 'app/(main)/project/**' 'components/**'`
> If the CRUD form pages have been heavily refactored since `296a6e5`, re-read them before applying this plan's pattern.

## Status

- **Priority**: P2
- **Effort**: L (multi-day)
- **Risk**: MED — touches every CRUD path
- **Depends on**: 001 (verification baseline), 003 (null-deref fixes), 004 (server-action design + approved RLS gaps)
- **Category**: tech-debt
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

Twelve client-component pages under `app/(main)/project/[id]/**` follow nearly identical scaffolding:

1. `'use client'` + import `createClient` from `@/utils/supabase/client`.
2. Read the dynamic `[id]` (and sometimes `[taskID]` / `[linkID]` / `[fileID]`) via `use(params)`.
3. One or two `useEffect` blocks that call `supabase.from(...).single()` to populate breadcrumb state and form defaults.
4. `useForm<z.infer<typeof formSchema>>` + Shadcn `<Form>` JSX.
5. `handleSubmit` that calls `supabase.from(table).insert(...)` / `.update(...)` / `.delete(...)`, then `toast(...)` and `router.push(...)`.
6. ~70 lines of repeated breadcrumb + header JSX.

Adding a new field, changing error-handling style, or updating the breadcrumb structure currently requires touching all 12 files. New contributors copy whichever variant they last saw, which is how the variants drifted.

Reduce the surface to: ONE shared form scaffold + per-page schema + per-page server action.

**This plan assumes plan 004 has produced an approved server-action pattern.** Without that, the deduplication would just re-pack the same client-side anon-key mutation problem. If 004 is not approved, do not start this plan.

## Current state

The 12 files in scope, by category:

### Add pages (5)
- `app/(main)/project/addProject/page.tsx` (293 lines) — already migrated by plan 004 as the vertical slice. Use this as the reference.
- `app/(main)/project/[id]/addFile/page.tsx` (231 lines) — note: also handles `supabase.storage` upload, not just a row insert.
- `app/(main)/project/[id]/addlink/page.tsx` (225 lines)
- `app/(main)/project/[id]/addTime/page.tsx` (301 lines)
- `app/(main)/project/[id]/addCoverImage/page.tsx` (225 lines) — also storage.

### Edit pages (4)
- `app/(main)/project/[id]/editProject/page.tsx` (349 lines)
- `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx` (333 lines)
- `app/(main)/project/[id]/links/[linkID]/edit/page.tsx` (261 lines)
- `app/(main)/project/[id]/files/[fileID]/edit/page.tsx` (240 lines)

### Delete pages (3)
- `app/(main)/project/[id]/deleteProject/page.tsx` (250 lines) — confirms then deletes.
- `app/(main)/project/[id]/tasks/[taskID]/delete/page.tsx` (184 lines)
- `app/(main)/project/[id]/links/[linkID]/delete/page.tsx` (185 lines)
- `app/(main)/project/[id]/files/[fileID]/delete/page.tsx` (244 lines) — also removes storage object.

### Excerpt of the duplicated scaffold (`addlink/page.tsx`)

```tsx
"use client";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
// ... (~30 lines of imports identical across all 12)

const formSchema = z.object({ /* ... per-page ... */ });

export default function AddLink({ params }: AddLinkProps) {
  const router = useRouter();
  const supabase = createClient();
  const { id } = use(params);
  const [projectName, setProjectName] = useState<string>("");

  // ~15 lines: useEffect fetches project to populate breadcrumb
  useEffect(() => { /* ... */ }, [id]);

  const form = useForm<z.infer<typeof formSchema>>({ /* ... */ });

  const handleSubmit = async (values) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { /* toast + return */ }
      const { error } = await supabase.from("links").insert([{ ... }]).select();
      if (error) { /* toast + return */ }
      toast({ title: "Success", ... });
      router.push(`/project/${id}`);
      router.refresh();
    } catch { /* toast */ }
  };

  return (
    <>
      <header>...breadcrumb (~50 lines)...</header>
      <Form {...form}>
        <form onSubmit={...}>
          {/* per-page <FormField> blocks */}
          <Button type="submit">Add Link</Button>
        </form>
      </Form>
    </>
  );
}
```

### Target pattern (after this plan)

```tsx
// app/(main)/project/[id]/addlink/page.tsx — final shape
import { addLinkAction } from "./actions";
import { addLinkSchema } from "./schema";
import { ProjectFormShell } from "@/components/project/ProjectFormShell";
import { LinkFields } from "./fields";

export default async function AddLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProjectFormShell
      projectID={id}
      breadcrumbLeaf="Add New Link"
      action={addLinkAction}
      schema={addLinkSchema}
      submitLabel="Add Link"
    >
      <LinkFields />
    </ProjectFormShell>
  );
}
```

— a server component thin wrapper. ~10 lines.

The shared `<ProjectFormShell>` handles: breadcrumb, project-name fetch (server-side, no useEffect), `<Form>` setup, toast, and submit-to-server-action wiring.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | no NEW errors vs. baseline |
| Lint | `npm run lint` | no NEW warnings |
| Build | `npm run build` | exit 0 |
| Smoke test | `npm run dev` then exercise each form in browser | all work |

## Scope

**In scope** (create + modify):
- `components/project/ProjectFormShell.tsx` (create) — shared scaffold
- `components/project/ProjectBreadcrumb.tsx` (create) — extracted breadcrumb
- For each of the 12 pages: split into `page.tsx` (thin), `actions.ts` (server action), `schema.ts` (Zod), and `fields.tsx` (page-specific form fields).
- `docs/SECURITY.md` — append the new server actions to the inventory.

**Out of scope**:
- Changing routes or URL shapes.
- Migrating storage uploads to a different mechanism. (Storage uploads currently live in client code because `supabase.storage.from(...).upload(File)` needs the browser File API. The CLEAN solution is a presigned-URL flow, but that is its own plan. For this plan, addFile + addCoverImage + deleteFile keep the storage call in a client *fields component* that uploads, then calls the server action with the resulting public URL. Document this carve-out in `docs/SECURITY.md`.)
- Changing toast text, redirect destinations, or error UX beyond what the consolidation requires.
- Touching pages outside the 12 in Current state.

## Git workflow

- Branch: `advisor/005-deduplicate-crud-pages`
- One commit per migrated page is recommended (12 commits) so individual reverts are possible if a regression surfaces. Larger atomic commits are acceptable if the executor is confident.
- Do NOT push or open a PR until manual smoke test in step 7 passes for every form.

## Steps

### Step 1: Extract the breadcrumb component

Create `components/project/ProjectBreadcrumb.tsx`. Inputs: `projectID: string`, `projectName: string`, `leaf: string` (e.g. `"Add New Link"`). Output: the breadcrumb JSX that today is copy-pasted into every CRUD page.

Source the JSX from any existing page — e.g. `app/(main)/project/[id]/addlink/page.tsx:142-181` is the canonical version. Match exactly so the visual layout doesn't shift.

**Verify**: `npm run typecheck` exits with no new errors.

### Step 2: Build `ProjectFormShell`

Create `components/project/ProjectFormShell.tsx`. This is a **client component** (`'use client'`) because react-hook-form requires client-side state. Its responsibilities:

- Receive `projectID`, `projectName`, `breadcrumbLeaf`, `action` (a server action), `schema` (Zod schema), `submitLabel`, plus `children` for the form fields.
- Wrap `<Form>` setup, `useForm({ resolver: zodResolver(schema) })`, `useTransition` for the action call.
- Render breadcrumb (via `<ProjectBreadcrumb>`), the form with the children fields inside `<FormProvider>` so the children can `useFormContext`.
- On submit: serialize values to FormData, call the server action, toast on error, redirect on success (the server action does its own `redirect`).

**Important**: `projectName` is now resolved server-side (passed in as a prop), so the in-effect fetch in every old page goes away. The page-level server component fetches the project and passes the name in.

**Verify**: `npm run lint` no new warnings; `npm run typecheck` clean.

### Step 3: Apply to the simplest case — `addlink`

`addlink` is the simplest because it has no nested entity, no storage upload, and no edit-default-values requirement.

Create:
- `app/(main)/project/[id]/addlink/schema.ts` — exports the Zod schema (move from the current `page.tsx`).
- `app/(main)/project/[id]/addlink/actions.ts` — exports `addLinkAction(formData: FormData)`. Pattern from plan 004's `addProject` server action: get user from server Supabase client, parse with Zod, insert, handle error, redirect.
- `app/(main)/project/[id]/addlink/fields.tsx` — `'use client'`, renders the two `<FormField>` blocks for `linkName` and `link`. Uses `useFormContext`.
- `app/(main)/project/[id]/addlink/page.tsx` — rewrite to the thin server component shape shown in Target Pattern above. Server-fetch the project (with the `.single()` null guard from plan 003) and pass `projectName` into `<ProjectFormShell>`.

**Verify**:
- `npm run build` exits 0.
- `npm run dev` → navigate to `/project/<some-id>/addlink` → submit → confirm the link appears in `/project/<id>`.

If this works, the pattern is locked in.

### Step 4: Apply to the other add/edit/delete pages

Order: simplest first.

1. `addTime` — similar to addlink, one extra date field.
2. `editProject` — like addProject (plan 004's POC) but UPDATE not INSERT, and needs to pre-populate form defaults. The server component fetches the project, passes both `projectName` and `defaultValues` to `<ProjectFormShell>`.
3. `tasks/[taskID]/edit` — same as editProject pattern but for `tasks` table.
4. `links/[linkID]/edit` — same for `links`.
5. `files/[fileID]/edit` — same for `files`.
6. `deleteProject` — simpler: confirmation page with a single "Delete" button that posts to a `deleteProjectAction`. No form fields. Make a `<ConfirmDeleteShell>` variant of the form shell if it helps; otherwise hand-roll.
7. `tasks/[taskID]/delete`, `links/[linkID]/delete`, `files/[fileID]/delete` — same as deleteProject. The files delete also removes the storage object — keep that logic in the server action: `supabase.storage.from('projectFiles').remove([...])` runs server-side just fine.
8. `addFile` and `addCoverImage` — special-cased. Storage upload needs the browser File API. Build a `<FileUploadFields>` client child that:
   - Uploads to `supabase.storage` via the browser client (RLS on the storage bucket protects this).
   - On success, gets the public URL.
   - Passes URL + file metadata to the server action via FormData.
   - The server action only does the row insert into `files` (or update `projects.projectPhoto`).
   Document the rationale in `docs/SECURITY.md`: bucket-level RLS is the only thing protecting uploads since the browser must hold the File object.

After each page is migrated, run:
```bash
npm run build
```
and exercise the form in the browser. Don't batch — catching a regression in one form is much easier than catching it in five.

### Step 5: Sweep for leftover client-side mutations

```bash
grep -rn "from('projects')\|from(\"projects\")" app/ | grep -v actions.ts | grep -E "\.(insert|update|delete)"
grep -rn "from('tasks')\|from(\"tasks\")" app/ | grep -v actions.ts | grep -E "\.(insert|update|delete)"
grep -rn "from('links')\|from(\"links\")" app/ | grep -v actions.ts | grep -E "\.(insert|update|delete)"
grep -rn "from('files')\|from(\"files\")" app/ | grep -v actions.ts | grep -E "\.(insert|update|delete)"
```

Expected: zero matches. Every match must be inside an `actions.ts` (server action). If a match is in a `page.tsx` or component, you missed one.

### Step 6: Update the security doc

Append to `docs/SECURITY.md`:
- Inventory of new server actions: file path, what it mutates, which RLS policies it relies on.
- Document the storage upload carve-out for `addFile` / `addCoverImage`.
- Mark the "Option B" decision from plan 004 as fully implemented.

### Step 7: Manual smoke test of every form

Walk through each of the 12 flows in a logged-in browser session:
1. Create a project → confirm it shows in `/project`.
2. Edit it → confirm the new values stick.
3. Add a link → confirm.
4. Edit the link → confirm.
5. Delete the link → confirm.
6. Add a task → confirm appears in `/project/[id]` time tab.
7. Edit task, delete task.
8. Add a file → confirm upload + row.
9. Edit file metadata (rename).
10. Delete file → confirm both row and storage object are gone.
11. Add cover image → confirm `projects.projectPhoto` updates and image renders.
12. Delete the project → confirm cascading deletes (links/tasks/files should disappear if RLS / DB cascades are set up; if not, document the gap).

### Step 8: Update `plans/README.md`

Change the 005 row's Status from `TODO` to `DONE`.

## Test plan

No automated tests in this plan (deferred). The smoke test in step 7 is the gate.

Future tests should:
- For each server action: mock the Supabase server client, assert the action returns `redirect` on success and `{ error }` on each failure mode.
- For `<ProjectFormShell>`: assert that submitting calls the passed-in `action` exactly once with the expected FormData entries.

## Done criteria

ALL must hold:

- [ ] `components/project/ProjectFormShell.tsx` exists.
- [ ] `components/project/ProjectBreadcrumb.tsx` exists.
- [ ] Each of the 12 in-scope pages has: a thin `page.tsx` server component, an `actions.ts` with the server action, a `schema.ts` (where applicable), a `fields.tsx` (where applicable). The old monolithic 200+-line `page.tsx` is gone.
- [ ] No `page.tsx` under `app/(main)/project/` directly calls `supabase.from(...).insert/update/delete`. Use `grep -rn "supabase\.from" app/(main)/project | grep -v actions.ts | grep -E "\.(insert|update|delete)"` to confirm — should return zero.
- [ ] `npm run build` exits 0.
- [ ] `npm run typecheck` no new errors vs. baseline.
- [ ] `npm run lint` no new warnings.
- [ ] Manual smoke test in step 7 passes for all 12 flows.
- [ ] `docs/SECURITY.md` updated with new action inventory.
- [ ] `plans/README.md` status row for 005 updated to DONE.

## STOP conditions

- Plan 004's design doc (`docs/SECURITY.md`) does not exist or does not include the server-action pattern. (Cannot proceed; design needs to land first.)
- The RLS gap migration from plan 004 has not been applied to the live Supabase project. (Without it, the migration may produce auth bypass holes — verify before migrating each table's mutation.)
- A form turns out to require behavior that the shared shell can't accommodate without invasive parameterization (e.g. one form needs a multi-step wizard). Stop, surface the requirement, and decide whether to special-case that page or extend the shell.
- Storage upload semantics turn out to differ between `addFile` and `addCoverImage` in a way that breaks the shared client child. Stop, ask.
- A migration causes a regression in form behavior (validation, navigation, toast text) that the smoke test catches. Revert that page's commit; don't power through.

## Maintenance notes

- New CRUD pages henceforth use this pattern. Document in `docs/SECURITY.md` and link from `CLAUDE.md` if it exists (plan 006 adds CLAUDE.md).
- The `<ProjectFormShell>` is the single point where breadcrumb structure / form chrome / toast text changes. Reviewers should push back if a new page re-implements its own scaffold.
- The storage carve-out is a known concession; revisit when the team decides to move to presigned uploads (a separate future plan).
- Reviewer should scrutinize the auth model in each new `actions.ts`: every action begins with `getUser()` + null guard. Missing this is the #1 regression class.
