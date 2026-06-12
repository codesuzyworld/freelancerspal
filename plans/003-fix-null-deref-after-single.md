# Plan 003: Fix null-deref crashes after `.single()` on project lookups

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result. If anything in "STOP conditions" occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 296a6e5..HEAD -- 'app/**/page.tsx' 'app/clientPortal/**'`
> If any in-scope file has been modified since `296a6e5`, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (need `typecheck` script)
- **Category**: bug
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

Every page that fetches a single project / task / link / file by ID uses Supabase's `.single()` method, which returns `data: null, error: { code: 'PGRST116', ... }` when no row matches (not found, or filtered out by Row Level Security). The pages **access properties on the returned `data` before checking whether it is null or whether `error` is set.** Result: a missing or RLS-blocked ID produces an unhandled "Cannot read properties of null (reading '…')" exception instead of a graceful redirect or error UI.

The canonical example, `app/(main)/project/[id]/page.tsx`, fetches the project at line 66, computes `hasAccess = projects.userID === user.id || adminCheck` at **line 81**, but only checks `projectError` at **line 124** — by which point the page has already crashed if the project is null.

The same pattern repeats across 12+ pages. Fix the pattern uniformly: check `error` and null *immediately* after every `.single()` call.

## Current state

The 12 files with this bug, with the load-bearing lines highlighted. **Open each file before editing it** — line numbers may have shifted slightly if other plans have landed.

### Server components (read pages)

**`app/(main)/project/[id]/page.tsx`** — the most important fix. Excerpt:

```tsx
// Lines 66-85 (current):
const { data: projects, error:projectError } = await supabase
  .from("projects")
  .select()
  .eq("projectID", id)
  .single();

// Add authorization check
const { data: adminCheck } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .single();

// Check if user has access to this project
const hasAccess = projects.userID === user.id || adminCheck;  // ← line 81: crashes if projects is null

if (!hasAccess) {
  return redirect("/project");
}

// ... many more property accesses on `projects` follow ...

// Error handling appears at line 124 — too late
if (projectError) {
  console.error("Error fetching project:", projectError);
  return <div>Error loading project</div>;
}
```

**`app/clientPortal/[id]/page.tsx`** — the only public-facing page; getting this wrong is highest-impact. Excerpt:

```tsx
// Lines 48-58 (current):
const { data: projects, error:projectError } = await supabase
  .from("projects")
  .select()
  .eq("projectID", id)
  .eq("clientPortal", true)
  .single();

// If client portal is not toggled, then just show message
if (projectError || !projects) {
    return redirect("/sign-in");
}
```

Note: this file *almost* has the right pattern (the `projectError || !projects` check at line 56-58 — keep that). But later, at line 93, `const totalAmount = totalHours * projects.ratePerHour;` is fine because the early return already eliminated the null case. The fix for this file is mostly to verify and not break what's working — but the same `.split(',')` issue (plan 007 covers) exists.

### Client components (CRUD forms)

Each of these has a `useEffect` that calls `.single()` and immediately accesses a property to populate `projectName` state:

```tsx
// Pattern repeated in:
//   app/(main)/project/[id]/addFile/page.tsx:58-72
//   app/(main)/project/[id]/addlink/page.tsx:62-76
//   app/(main)/project/[id]/addTime/page.tsx:70-84
//   app/(main)/project/[id]/editProject/page.tsx:75-89
//   app/(main)/project/[id]/addCoverImage/page.tsx:60-67 (verify)
//   app/(main)/project/[id]/deleteProject/page.tsx:77-84 (verify)
//   app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx:71-84
//   app/(main)/project/[id]/tasks/[taskID]/delete/page.tsx:54-66 (verify)
//   app/(main)/project/[id]/links/[linkID]/edit/page.tsx:62-75 (verify)
//   app/(main)/project/[id]/links/[linkID]/delete/page.tsx:54-66 (verify)
//   app/(main)/project/[id]/files/[fileID]/edit/page.tsx:62-69 (verify)
//   app/(main)/project/[id]/files/[fileID]/delete/page.tsx:54-66 (verify)

useEffect(() => {
    async function getProject() {
        const { data: project } = await supabase
            .from("projects")
            .select()
            .eq("projectID", id)
            .single();
        // Let's set the project name after getting it from supabase
        setProjectName(project.projectName);   // ← crashes if project is null
    }
    getProject();
}, [id]);
```

Several files have a *second* `useEffect` that ALSO calls `.single()` with the same null-deref pattern (e.g. `editProject/page.tsx:105-135` fetches the project a second time to call `form.reset(...)`). The fix in this plan addresses both effects in each file. **The duplicate fetch itself is finding #13 / plan 006 — do not try to consolidate the effects here.**

### Conventions to match

When a server page can't render because data is missing, the codebase uses `redirect("/project")` (see `app/(main)/project/[id]/page.tsx:84`) or `redirect("/sign-in")` (see `app/clientPortal/[id]/page.tsx:57`). Match that.

When a client page can't load data, the codebase uses a `toast({ title: "Error", description: "...", variant: "destructive" })` followed by `return` (see `app/(main)/project/[id]/editProject/page.tsx:116-122`). Match that.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 OR same pre-existing errors as the baseline |
| Build | `npm run build` | exit 0 |
| Lint | `npm run lint` | exit 0 with no NEW warnings |

If plan 001 has not yet landed, fall back to `npx tsc --noEmit` for typecheck.

## Scope

**In scope** (the only files you may modify):

Server pages:
- `app/(main)/project/[id]/page.tsx`

Client form pages:
- `app/(main)/project/[id]/addFile/page.tsx`
- `app/(main)/project/[id]/addlink/page.tsx`
- `app/(main)/project/[id]/addTime/page.tsx`
- `app/(main)/project/[id]/addCoverImage/page.tsx`
- `app/(main)/project/[id]/editProject/page.tsx`
- `app/(main)/project/[id]/deleteProject/page.tsx`
- `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx`
- `app/(main)/project/[id]/tasks/[taskID]/delete/page.tsx`
- `app/(main)/project/[id]/links/[linkID]/edit/page.tsx`
- `app/(main)/project/[id]/links/[linkID]/delete/page.tsx`
- `app/(main)/project/[id]/files/[fileID]/edit/page.tsx`
- `app/(main)/project/[id]/files/[fileID]/delete/page.tsx`

**Out of scope** (do NOT touch):
- `app/clientPortal/[id]/page.tsx` — already has a correct early-return pattern (see Current state). Verify but do not modify in this plan; if you find the pattern broken on inspection, mark it as a STOP condition for re-planning.
- Any change to redirect destinations, toast text, or error UI beyond what is required to add the null/error guard.
- Refactoring the double `useEffect` into a single fetch (that's plan 005 / 006).
- Touching any non-page file (`components/`, `hooks/`, `utils/`).
- Changing the Supabase query itself (`.select()`, `.eq()`, etc.).

## Git workflow

- Branch: `advisor/003-fix-null-deref-after-single`
- Commit per logical unit — e.g., one commit for server-page fixes, one for client-page fixes, OR one commit per file. The repo's commit messages are informal; match the style (lowercase, descriptive).
- Do NOT push or open a PR.

## Steps

### Step 1: Establish the typecheck/build baseline before changing anything

```bash
npm run typecheck > /tmp/baseline-typecheck.txt 2>&1 || true
npm run build > /tmp/baseline-build.txt 2>&1 || true
```

These outputs are your "no NEW errors" gate. Glance at the bottom of each — note the error count if any. After your edits, re-run and confirm the count has not gone up.

### Step 2: Fix the canonical server-page case — `app/(main)/project/[id]/page.tsx`

Open `app/(main)/project/[id]/page.tsx`. Find the block at lines 66-85 (the `.single()` call on `projects` followed by `hasAccess` computation).

Insert a guard *immediately after the `.single()` query and before any use of `projects`*. Target shape:

```tsx
const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select()
  .eq("projectID", id)
  .single();

if (projectError || !projects) {
  return redirect("/project");
}

// Add authorization check
const { data: adminCheck } = await supabase
  .from('user_roles')
  // ... unchanged ...
```

Then **remove the now-dead `if (projectError)` block at the original line 124** (the one that returns `<div>Error loading project</div>`). It is unreachable after the new guard. Leave the `linkError` / `taskError` / `fileError` checks below intact — those are still needed because `links`, `tasks`, `files` queries use `.select()` not `.single()` and can legitimately return empty arrays with no error.

**Verify**:
- `grep -n "projects.userID" app/\(main\)/project/\[id\]/page.tsx` — should still show line ~81 (you didn't move it).
- `grep -n "projectError ||" app/\(main\)/project/\[id\]/page.tsx` — should show exactly ONE match (the new guard).
- `grep -n "Error loading project" app/\(main\)/project/\[id\]/page.tsx` — should return nothing (the dead block was removed).

### Step 3: Fix the client-form pattern (apply to each in-scope client page)

For each file listed under "Client form pages" in Scope, open it and find every `useEffect` that calls `supabase.from(...).single()`. For each one, add a guard.

**Pattern to apply** (showing `addlink/page.tsx:62-76` as the reference; other files have the same shape with different table names):

Before:
```tsx
useEffect(() => {
    async function getProject() {
        const { data: project } = await supabase
            .from("projects")
            .select()
            .eq("projectID", id)
            .single();
        setProjectName(project.projectName);
    }
    getProject();
}, [id]);
```

After:
```tsx
useEffect(() => {
    async function getProject() {
        const { data: project, error } = await supabase
            .from("projects")
            .select()
            .eq("projectID", id)
            .single();
        if (error || !project) {
            toast({
                title: "Error",
                description: "Failed to load project",
                variant: "destructive",
            });
            return;
        }
        setProjectName(project.projectName);
    }
    getProject();
}, [id]);
```

Key requirements:
1. Capture `error` from the destructure (add `, error` after `data: project`).
2. Guard with `if (error || !project) { toast(...); return; }` BEFORE any property access.
3. Use the existing `toast` import (it's already at the top of each file — see e.g. `addlink/page.tsx:22`). Do not add new imports unless the file is missing the toast import (it shouldn't be).
4. Keep the rest of the function body unchanged.

For files with a *second* `useEffect` that calls `.single()` (notably `editProject/page.tsx:105-135`, plus the `tasks/[taskID]/edit`, `links/[linkID]/edit`, `files/[fileID]/edit` pages that fetch the specific entity in addition to the project), apply the same guard pattern. Some of those files already have a partial guard — verify, leave correct ones alone.

**For `.../edit/page.tsx` files specifically**: the second fetch retrieves the entity being edited (e.g. `task`, `link`, `file`). If that entity is null, the form should not call `.reset()` with null values. Match the existing toast-and-return pattern.

**For `.../delete/page.tsx` files specifically**: same fix; if the entity to delete doesn't exist, toast and return (or redirect to `/project/${id}`).

### Step 4: Apply the same fix to each remaining file, one at a time

Go through the Scope list. For each file, open it, find every `.single()` call, and add the guard. **Do not batch with sed/find-replace** — the surrounding code differs file-to-file (toast text, table name, redirect target). Hand-edit each.

After each file, run:
```bash
npm run typecheck 2>&1 | tail -20
```
If new errors appear, fix them in the file you just touched before moving on. Do not accumulate errors.

### Step 5: Re-run the baseline checks

```bash
npm run typecheck > /tmp/after-typecheck.txt 2>&1 || true
npm run build > /tmp/after-build.txt 2>&1 || true
diff /tmp/baseline-typecheck.txt /tmp/after-typecheck.txt | head -40
diff /tmp/baseline-build.txt /tmp/after-build.txt | head -40
```

Expected: the diffs show no NEW errors. Lines may have shifted (line numbers in error messages may differ); what matters is the error count and identity.

### Step 6: Sweep for any missed `.single()` callsites

```bash
grep -rn "\.single()" app/ components/ | grep -v ".test." | grep -v ".spec."
```

For each match, open the file and confirm:
- Either the `data` is checked for null OR `error` is checked before any property access, OR
- The match is in a context where null is impossible (e.g. immediately followed by an `if (!data)` guard).

If you find a `.single()` callsite that does NOT have a guard and is NOT in the Scope list above — STOP. Report the file and line. Do not silently expand scope.

### Step 7: Manual smoke test

```bash
npm run dev
```

In a browser, visit:
- `http://localhost:3000/project/nonexistent-id-12345` — should redirect to `/project` (or `/sign-in` if logged out), NOT show a server error.
- `http://localhost:3000/project/nonexistent-id-12345/editProject` — should show a destructive toast and the form should not populate, NOT show a server error.

Stop the dev server.

### Step 8: Update `plans/README.md` status row

Change the 003 row's Status from `TODO` to `DONE`.

## Test plan

No new tests are added in this plan (tests are a future plan). Verification is the manual smoke test in step 7 plus the diff of typecheck/build output.

When tests are added later, the regression tests for this plan should be:
- Render `app/(main)/project/[id]/page.tsx` with a `id` that does not exist → assert `redirect("/project")` was called.
- Render the same page with an `id` belonging to another user (RLS would block) → same expectation.
- For each client-form page, simulate a `null` response from the `.single()` mock → assert the toast is shown and the form is not populated.

## Done criteria

ALL must hold:

- [ ] `app/(main)/project/[id]/page.tsx` has a guard `if (projectError || !projects) { return redirect("/project"); }` immediately after the `.single()` call on the projects table.
- [ ] The old `if (projectError) { console.error... return <div>Error loading project</div>; }` block in that file is removed (it is unreachable after the new guard).
- [ ] Every file in the Scope list has a guard immediately after each `.single()` call before any property access on the returned data.
- [ ] `grep -rn '\.single()' app/ | wc -l` count matches the baseline; no `.single()` calls were added or removed by this plan, only guarded.
- [ ] `npm run typecheck` has no NEW errors compared to baseline (diff is empty or differs only in line numbers).
- [ ] `npm run build` exits 0.
- [ ] Smoke test of step 7 passes.
- [ ] `plans/README.md` status row for 003 updated to DONE.

## STOP conditions

- A file in the Scope list has been substantially refactored since `296a6e5` (no longer matches the "Current state" excerpts) — re-plan.
- Step 6 finds a `.single()` callsite outside the Scope list that is also unguarded. (Report it; do not expand scope silently.)
- After applying the guard, the page intentionally needs to render something OTHER than "redirect" or "toast and return" — e.g. you discover that an edit page should pre-populate with empty fields when the entity doesn't exist. Don't invent behavior; ask.
- Any guard would require importing a module not already imported in that file (other than `redirect` from `next/navigation`, which is universally available).

## Maintenance notes

- The codebase's current pattern is "fetch, then check error later." That pattern is broken; this plan inverts it. When new pages are added, follow the pattern this plan establishes: guard immediately after every `.single()`.
- Plan 004 considers migrating these client-side fetches into server actions, which would eliminate the entire class of bugs (server components do not have the same shape of effect-then-mutate flow). If 004 lands, several of these guards become superseded — that is fine; leave them, they are defensive.
- Reviewer should scrutinize: (1) each `.single()` has exactly one guard, (2) the guard uses `error || !data` (not just one or the other), (3) no property access on the `.single()` return precedes the guard.
- Out-of-scope follow-up: the `.eq("clientPortal", true)` filter in `app/clientPortal/[id]/page.tsx` is enforced at the app layer; finding #6 / plan 004 considers whether to push that to RLS.
