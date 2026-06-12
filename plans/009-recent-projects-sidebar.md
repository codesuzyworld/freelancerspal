# Plan 009: Either finish or remove the "Recent Projects" sidebar feature

> **Executor instructions**: This plan has TWO paths — finish the feature, or delete the dead code. The plan picks the FINISH path by default; if the maintainer has signaled they don't want the feature, switch to the DELETE path (described at the end of the plan) and complete that instead. Do not do both.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- 'components/sidebar/app-sidebar.tsx' 'components/sidebar/nav-projects.tsx'`

## Status

- **Priority**: P3
- **Effort**: S–M (depending on path)
- **Risk**: LOW
- **Depends on**: 001 (verification baseline); recommend 003 (null-deref fixes)
- **Category**: direction / tech-debt
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

The sidebar's "Recent Projects" feature is half-built. Specifically:

- `components/sidebar/nav-projects.tsx:28-98` — a complete, working `<NavProjects>` component that accepts a `projects: { name, url, icon }[]` prop and renders the list.
- `components/sidebar/app-sidebar.tsx:15` — imports `NavProjects`.
- `components/sidebar/app-sidebar.tsx:64-66` — declares `projects: []` in the static `data` object.
- `components/sidebar/app-sidebar.tsx:70-71` — declares `recentProjects` state and a `supabase` client that are NEVER read.
- `components/sidebar/app-sidebar.tsx:97` — `{/* <NavProjects projects={data.projects} /> */}` — commented out.

So the UI component exists, the import exists, and the data-shape contract is defined — but the data is never fetched, and the component is never rendered. The feature is a ghost.

Either complete it (so the sidebar shows the user's recent projects across all pages) or remove the dead code (so the next contributor doesn't have to figure out what was intended). Decide and commit.

## Path A: FINISH the feature (default)

The feature surface: in the sidebar, show the 5 most-recently-updated projects belonging to the current user. Each entry links to `/project/<id>`. The list updates on navigation.

### Current state — extra detail

The sidebar is a client component (`'use client'` at `app-sidebar.tsx:1`) wrapped in `<SidebarProvider>` from `app/(main)/layout.tsx`. It cannot directly `await` data — it must either:
- Lift the fetch to the layout (server) and pass projects in as a prop, OR
- Fetch on the client via `useEffect` (as the half-finished code attempted).

Recommended: **lift the fetch to the layout.** The layout is already a server component and already runs on every route under `(main)`. The sidebar receives projects as a prop. This avoids:
- A second auth/SQL round-trip on every navigation.
- The null-deref pattern from plan 003.
- Hydration mismatch risk on the first paint.

### Scope (Path A)

**In scope**:
- `app/(main)/layout.tsx` — convert to server component (verify it already is — currently it isn't `'use client'` so it is).
- `components/sidebar/app-sidebar.tsx` — accept `recentProjects` as a prop, remove dead state.
- `components/sidebar/nav-projects.tsx` — minor: accept projects with optional `icon` (currently typed as required `LucideIcon`).
- `app/(main)/layout.tsx` — wire up the fetch.

**Out of scope**:
- Showing recent projects in the client portal layout (a different tree).
- Real-time updates (the list refreshes when the user navigates to any `(main)` route; that's enough).
- Pagination / "View all" link.
- The dropdown menu items inside `<NavProjects>` (`View Project`, `Share Project`) — they're decoration and don't have handlers; leave them as-is or remove if they look wrong.

### Steps (Path A)

#### Step A.1: Fetch the recent projects in the layout

Edit `app/(main)/layout.tsx`. Currently it's a function component with no data fetching. Make it `async` (server components support that) and add the fetch:

```tsx
import { createClient } from "@/utils/supabase/server";
import { SquareTerminal } from "lucide-react";
// ...other imports unchanged...

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let recentProjects: { name: string; url: string; icon: typeof SquareTerminal }[] = [];
  if (user) {
    const { data } = await supabase
      .from("projects")
      .select("projectID, projectName")
      .eq("userID", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    recentProjects = (data ?? []).map((p) => ({
      name: p.projectName,
      url: `/project/${p.projectID}`,
      icon: SquareTerminal,
    }));
  }

  return (
    <div className="flex min-h-screen">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar recentProjects={recentProjects} className="flex-shrink-0" />
        {/* rest unchanged */}
```

Notes:
- The fetch is silent on error (`data ?? []`). The sidebar is decoration; a Supabase error shouldn't prevent the page from rendering.
- The fetch ordering uses `created_at` because all rows have it; `projectDate` is the user-entered date, which would be a different (also valid) sort. Match what the maintainer wants — if they prefer `projectDate`, change it. Recommendation: `created_at` for "recent" semantics.
- For admin users: skipping the `eq("userID", ...)` would show all projects. Decide based on UX desire — for the spike, scope to the user's own projects. Document the decision.

#### Step A.2: Update `AppSidebar` to accept the prop

Edit `components/sidebar/app-sidebar.tsx`:

```tsx
type RecentProject = { name: string; url: string; icon: typeof SquareTerminal };

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  recentProjects?: RecentProject[];
}

export function AppSidebar({ recentProjects = [], ...props }: AppSidebarProps) {
  // remove: const [recentProjects, setRecentProjects] = useState([]);
  // remove: const supabase = createClient();

  return (
    <Sidebar variant="inset" {...props}>
      {/* unchanged header */}
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={recentProjects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      {/* unchanged footer */}
    </Sidebar>
  );
}
```

Also delete the dead `projects: []` entry in the `data` object (lines 64-66) and the unused `createClient` import (line 30).

#### Step A.3: `<NavProjects>` empty state already works

The existing `nav-projects.tsx:39-50` already handles the empty case ("No recent projects"). Don't change the component unless typecheck complains about the icon-type mismatch — in which case widen `icon: LucideIcon` to accept the actual icon import.

#### Step A.4: Verify

```bash
npm run build
npm run dev
```

In the browser:
1. Log in. Navigate to `/project`. Sidebar should show "Recent Projects" with up to 5 items.
2. Create a new project (or update one). Navigate to `/dashboard`. The newly-touched project should appear at the top of the sidebar list (because the layout re-runs on navigation).
3. Log out, hit any route, log back in. Sidebar still works.
4. Click a sidebar project entry — should navigate to that project's detail page.

#### Step A.5: Update `plans/README.md`

Change the 009 row's Status from `TODO` to `DONE`. Note which path was taken (A or B).

### Done criteria (Path A)

- [ ] `app/(main)/layout.tsx` is `async` and fetches up to 5 recent projects from Supabase.
- [ ] `AppSidebar` accepts `recentProjects` as a prop and renders `<NavProjects>` with it.
- [ ] Dead `recentProjects` state, `supabase` client, and commented-out `<NavProjects>` line in `app-sidebar.tsx` are all gone.
- [ ] `npm run build` exits 0.
- [ ] Manual smoke test passes (sidebar shows the 5 most-recent projects, each link navigates).
- [ ] `plans/README.md` updated, path noted.

## Path B: DELETE the dead code (alternative)

Pick this path only if the maintainer has explicitly said they do not want the feature.

### Scope (Path B)

- `components/sidebar/nav-projects.tsx` — delete (98 lines).
- `components/sidebar/app-sidebar.tsx` — remove import (line 15), `data.projects` (lines 64-66), `useState` for `recentProjects` and `supabase` (lines 70-71), commented-out usage (line 97), unused `createClient` import (line 30).

### Steps (Path B)

1. `rm components/sidebar/nav-projects.tsx`.
2. Edit `components/sidebar/app-sidebar.tsx` per Scope.
3. Sweep for orphan references:
   ```bash
   grep -rn "NavProjects\|nav-projects" --include="*.ts" --include="*.tsx" .
   ```
   Expected: zero matches in source.
4. `npm run build` exits 0.
5. Manual smoke test: sidebar renders without the "Recent Projects" section. No console errors.

### Done criteria (Path B)

- [ ] `components/sidebar/nav-projects.tsx` removed.
- [ ] `AppSidebar` has no references to `NavProjects`, `recentProjects`, or `createClient`.
- [ ] `npm run build` exits 0.
- [ ] Manual smoke test passes.
- [ ] `plans/README.md` updated, path noted.

**Note**: Path B is partially redundant with plan 006 step H, which also removes dead state in `AppSidebar`. If plan 006 has already landed, Path B amounts to deleting `nav-projects.tsx` only.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | clean |
| Build | `npm run build` | exit 0 |
| Smoke test | `npm run dev` | sidebar renders correctly |

## Git workflow

- Branch: `advisor/009-recent-projects-sidebar`
- One commit if straightforward, two if Path A is split into "wire up fetch" + "update sidebar component". Match the repo's informal commit style.
- Do NOT push or open a PR.

## STOP conditions

- (Path A) The layout-level fetch causes a noticeable per-navigation latency hit (>50ms). Step back, ask whether to push the fetch into a `<Suspense>` boundary so the page renders without waiting for it.
- (Path A) The Supabase query fails on a fresh signup user with zero projects — should render the empty state, NOT crash. Verify by signing up a new test account.
- The maintainer has not chosen a path. Default to Path A; if it's wrong, Path B can land in a follow-up. Do not stall.

## Maintenance notes

- (Path A) The fetch lives in the layout. When new routes are added under `(main)/`, the sidebar list comes for free. New routes added under `clientPortal/` or other groups will NOT have the sidebar — by design (those layouts don't include `<AppSidebar>`).
- (Path A) "Recent" is defined as `created_at DESC LIMIT 5`. If the team wants "recently edited" instead, add an `updated_at` column and switch the sort. Document the decision.
- (Path A) Real-time updates: not in scope. The sidebar refreshes on navigation; that's enough. If real-time becomes a requirement, switch to a client component subscribing to Supabase's realtime channel for the `projects` table.
- (Path B) If a future plan wants this feature back, the implementation lives in this plan's Path A. Reference back when planning.
- Reviewer should scrutinize: (1) the data shape passed to `<NavProjects>` matches the typed prop, (2) the empty state renders for new users, (3) no infinite-render loops in the sidebar after navigation.
