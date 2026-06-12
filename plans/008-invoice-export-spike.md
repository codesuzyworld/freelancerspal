# Plan 008: Spike — design an invoice/CSV export for project totals

> **Executor instructions**: This is a **design spike**, not a build plan. The deliverable is a decision document + a tiny proof-of-concept CSV download. Do not implement PDF rendering, email delivery, or anything beyond what the spike requires. Follow steps in order. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- 'app/(main)/project/[id]/page.tsx'`

## Status

- **Priority**: P3
- **Effort**: M (spike + POC)
- **Risk**: LOW
- **Depends on**: 001 (verification baseline)
- **Category**: direction
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

`app/(main)/project/[id]/page.tsx:106-120` and `app/clientPortal/[id]/page.tsx:79-93` both compute `totalAmount = totalHours * projects.ratePerHour` from per-task `hourSpent` rows. The number is rendered prominently in the UI (project page line 354-356, client portal line 290-292). But there is no way for the freelancer (or the client) to *get the math out of the app* — no download, no email, no shareable URL.

For a tool whose tagline is "manage and deliver your projects with ease," the invoice / billable-hours summary is the natural artifact a freelancer takes from the app to their client / accountant. Adding it closes the loop the brand promises.

This spike scopes the smallest sensible first step (CSV export of one project's tasks), validates that the data flow works end-to-end, and writes a decision doc for whether to next pursue PDF, email, or something else.

## Current state

- Data model has everything needed:
  - `projects` row has `projectName`, `projectDate`, `ratePerHour`, `projectDesc`.
  - `tasks` rows scoped by `projectID` have `taskName`, `taskDate`, `hourSpent`, `taskDesc`.
- Server fetches the same data twice in `project/[id]/page.tsx:88-104` (links, tasks, files). The `tasks` array is already on the server when the page renders.
- No download infrastructure exists today — no API routes, no file-streaming endpoints, no PDF deps.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | clean |
| Build | `npm run build` | exit 0 |
| Smoke test | `npm run dev`, log in, hit Download button | CSV downloads |

## Scope

**In scope**:
- `docs/INVOICE-SPIKE.md` — written decision document
- `app/(main)/project/[id]/invoice/route.ts` — a single Next.js Route Handler that returns CSV
- A "Download invoice CSV" button somewhere on `app/(main)/project/[id]/page.tsx` that links to the route

**Out of scope**:
- PDF rendering. Don't add `@react-pdf/renderer`, `jspdf`, or any PDF dep.
- Email delivery / Stripe integration / invoicing-platform export. Not now.
- Client-portal access to the invoice. Define the question in the spike doc and answer it later.
- Per-project / per-client branding (logos, theming).
- Multi-project / time-range export.
- Persisting invoices as DB rows.
- Tests.

## Git workflow

- Branch: `advisor/008-invoice-spike`
- Two commits: one for the doc, one for the POC. Keep them separable.
- Do NOT push or open a PR.

## Steps

### Step 1: Write the decision doc

Create `docs/INVOICE-SPIKE.md`. Cover:

```markdown
# Invoice / billable-hours export — spike

## What we want
A freelancer should be able to download a structured summary of a project's
billable hours and total amount, in a format they can give to a client or
their own accounting tool.

## What ships first (this spike)
CSV. Single project, all tasks. No styling, no branding. One Route Handler,
one Download button on the project detail page.

Why CSV first:
- Zero new dependencies. Native CSV is built from strings.
- Every accounting tool imports CSV.
- Validates the data flow end-to-end without committing to a layout.

## What's next, in order
1. **PDF (single project)**. After CSV proves the data flow, add a printable
   PDF. Tradeoff: introduces a render dep (`@react-pdf/renderer` is the
   leading option; `jspdf` for client-side; HTML→print via the browser is
   free but produces inconsistent output).
2. **Client-portal access**. Should the public `clientPortal/[id]` page also
   show a download? Answer depends on whether clients should see hourly
   detail or just the bottom line. Open question for the maintainer.
3. **Bulk export** — all projects for a date range. Useful for year-end
   bookkeeping.
4. **Invoice number / due date metadata**. Currently not in the data model.
   Adding it implies a new `invoices` table (or extra columns on `projects`)
   plus number-sequencing logic.

## Decisions deferred
- Currency. Currently rendered as `$` — fine for the spike, but a future
  multi-currency feature requires a `currency` column on `projects`.
- Tax (GST/VAT/sales tax). Not in the data model.
- "Invoice number" as a stable identifier per project — would require a
  monotonic counter and decisions about scope (per-user, per-client).

## CSV schema (the artifact of this spike)
Columns: `taskDate, taskName, taskDesc, hourSpent, ratePerHour, lineAmount`.
First row: header. Last two rows: a blank row, then a totals row
`,,,Total,,${totalAmount}`. This keeps the file diffable and importable.
```

This doc IS the deliverable. Keep it focused.

### Step 2: Build the POC route

Create `app/(main)/project/[id]/invoice/route.ts`:

```ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("projectName, ratePerHour, userID")
    .eq("projectID", id)
    .single();

  if (projectError || !project) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Server-side ownership check; RLS should already enforce this but be
  // explicit for the invoice endpoint specifically.
  const { data: adminCheck } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (project.userID !== user.id && !adminCheck) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("taskDate, taskName, taskDesc, hourSpent")
    .eq("projectID", id)
    .order("taskDate", { ascending: true });

  if (tasksError) {
    return new NextResponse("Error fetching tasks", { status: 500 });
  }

  const rate = Number(project.ratePerHour) || 0;
  const rows = tasks ?? [];

  // CSV escape: wrap in quotes if value contains comma, quote, or newline;
  // double-up internal quotes.
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = "taskDate,taskName,taskDesc,hourSpent,ratePerHour,lineAmount";
  const lines = rows.map((t) => {
    const hours = Number(t.hourSpent) || 0;
    const lineAmount = hours * rate;
    return [t.taskDate, t.taskName, t.taskDesc, hours, rate, lineAmount.toFixed(2)]
      .map(esc)
      .join(",");
  });

  const totalAmount = rows.reduce(
    (sum, t) => sum + (Number(t.hourSpent) || 0) * rate,
    0
  );
  const totalsRow = `,,,Total,,${totalAmount.toFixed(2)}`;

  const body = [header, ...lines, "", totalsRow].join("\n");

  const safeName = project.projectName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${safeName}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
```

Notes:
- Server route, not a server action — Route Handlers can return arbitrary `Content-Type` and `Content-Disposition`, which actions can't cleanly.
- Auth check is explicit even though RLS should enforce it. The downstream cost (one extra query) is paid once per download.
- CSV escaping is implemented inline (no dep). The escape rule handles commas, quotes, newlines — sufficient for `taskDesc` free-text.
- Filename is sanitized to ASCII-safe chars; `projectName.replace(...)` strips problematic chars.

**Verify**: `npm run typecheck` clean. `npm run build` exits 0.

### Step 3: Add the Download button

Edit `app/(main)/project/[id]/page.tsx`. Find the action button row (around line 186-191, where `EditProjectBtn`, `DeleteProjectBtn`, etc. live). Add a new button:

```tsx
<a
  href={`/project/${projects.projectID}/invoice`}
  className="..."   // use the same classes/Button component as adjacent buttons
  download
>
  Download CSV
</a>
```

Look at the adjacent buttons (`EditProjectBtn`, etc.) to figure out the right wrapping Button component or className. Match the style of its neighbors — don't introduce a new visual treatment.

If the existing buttons use a `<Button>` wrapper around children, use:
```tsx
<Button asChild variant="outline">
  <a href={`/project/${projects.projectID}/invoice`} download>
    Download CSV
  </a>
</Button>
```

The `download` attribute hints to the browser this is a file, not a navigation.

**Verify**: visual smoke test in step 4.

### Step 4: Manual smoke test

1. `npm run dev`.
2. Log in. Navigate to a project that has at least 2 tasks with different `hourSpent` values.
3. Click "Download CSV".
4. Open the downloaded file. Confirm:
   - First line is the header.
   - Each task appears once with correctly-computed `lineAmount`.
   - The totals row shows the same number as the project page's "Total Amount" display.
   - A task with a comma in `taskDesc` (add one if none exist) is properly quoted.
5. Log in as a different user and try `GET /project/<other-users-id>/invoice` directly via URL. Confirm 403.
6. Hit the endpoint while logged out. Confirm 401.

### Step 5: Update `plans/README.md`

Change the 008 row's Status from `TODO` to `DONE`. In the doc index, link to `docs/INVOICE-SPIKE.md` so the maintainer can find the "what next" decisions.

## Test plan

Deferred. The CSV format is stable enough that, when tests are added, a test should:
- Fixture: a project with 3 tasks.
- Assertion: GET the route → expected body is the deterministic CSV string.
- Assertion: GET as a different user → 403.

## Done criteria

ALL must hold:

- [ ] `docs/INVOICE-SPIKE.md` exists with the sections in step 1.
- [ ] `app/(main)/project/[id]/invoice/route.ts` exists and returns CSV.
- [ ] A Download button on the project page links to the invoice route.
- [ ] `npm run build` exits 0.
- [ ] Smoke test scenarios 1-6 in step 4 pass.
- [ ] `plans/README.md` status row for 008 updated to DONE.

## STOP conditions

- The smoke test step 6 (401 for logged-out) fails — RLS or middleware is misconfigured and the route is leaking data. Report and stop; do not ship the button.
- Step 4 scenario "a comma in taskDesc" fails — escaping is broken. Fix before continuing; don't ship partial.
- The project has zero tasks and the CSV is just `header,Total,0.00` — this is an OK degenerate case; ship it.
- The maintainer reverses course and wants PDF first — stop, throw away the POC, plan PDF separately.

## Maintenance notes

- `docs/INVOICE-SPIKE.md` lists deferred decisions (PDF, client-portal access, multi-currency). The next invoice plan should resolve them, not invent more.
- The route is named `/project/[id]/invoice` so a future `/project/[id]/invoice.pdf` route can sit next to it cleanly.
- The auth check is duplicated with what RLS should enforce. When `docs/SECURITY.md` (plan 004) confirms RLS is solid, this redundant check can be removed — but until then, it's the second lock.
- Reviewer should scrutinize: (1) CSV escape is correct, (2) auth check happens before any data is read, (3) Content-Disposition filename is sanitized.
