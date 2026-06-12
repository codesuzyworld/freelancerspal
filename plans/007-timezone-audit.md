# Plan 007: Standardize timesheet date handling on UTC

> **Executor instructions**: This plan finishes a partially-completed bug fix. The previous attempts (commits `542d448` and `046303c`) addressed the calendar display but did not standardize how `taskDate` is written to and read from the database. Follow the steps carefully — date bugs are easy to "fix" in one place while breaking another.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- 'app/(main)/project/[id]/addTime/page.tsx' 'app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx' 'components/timeSheetcalendar/page.tsx'`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — date handling is fragile; off-by-one bugs are easy to introduce
- **Depends on**: 001 (need typecheck script for verification)
- **Category**: bug
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

Commits `542d448` ("okay fixed by turning things into UTC with ISOString") and `046303c` ("got some issues with timezone conflict with client calendar vs supabase UTC timezone, will fix tmr") are the visible trace of a known unresolved problem: tasks recorded near midnight local time can appear on the wrong day in the calendar, and edits double-shift the date.

The current state is a half-fix:

- `components/timeSheetcalendar/page.tsx:86-99` and `:149-155` carefully convert calendar dates to UTC strings (`Date.UTC(...)`, `toISOString().split('T')[0]`).
- `app/(main)/project/[id]/addTime/page.tsx:119` writes `taskDate: values.taskDate` — a JS Date object — directly. Supabase serializes JS Date with the runtime's timezone offset, NOT as a midnight-UTC date.
- `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx:119` reads with `new Date(task.taskDate + 'T00:00:00')` — string concatenation hack assuming `taskDate` is a `YYYY-MM-DD` date string. This breaks if Supabase returns a full ISO timestamp.

The inconsistency means:
1. A task added at 10pm in PST might be written as `2026-06-12T05:00:00Z` (i.e. June 13 in UTC), then displayed by the calendar on June 13.
2. Editing that task tries to parse `2026-06-12T05:00:00Z + 'T00:00:00'` which produces an invalid date string.

The fix is to pick **one** representation and use it consistently end-to-end. Recommended: **`taskDate` is a `DATE`-typed column in Postgres, stored and read as `YYYY-MM-DD` strings, treated as a calendar date (no time, no zone).** This matches how the calendar already treats it.

## Current state

### File 1: `app/(main)/project/[id]/addTime/page.tsx` (the WRITER)

Relevant block (lines 114-124):
```tsx
const { data, error } = await supabase
  .from('tasks')
  .insert([{
      userID: user.id,
      projectID: id,
      taskName: values.taskName,
      taskDate: values.taskDate,        // ← JS Date object, written as-is
      hourSpent: values.hourSpent,
      taskDesc: values.taskDesc,
  }])
  .select();
```

`values.taskDate` is a JS `Date` from react-hook-form's date picker (`Calendar mode="single"`). Supabase's JS client serializes JS Date by calling `.toISOString()`, which produces `2026-06-12T07:00:00.000Z` if you're in PDT and picked June 12.

### File 2: `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx` (the READER, for edit)

Relevant block (line 119):
```tsx
form.reset({
  taskName: task.taskName,
  taskDate: new Date(task.taskDate + 'T00:00:00'),    // ← string-concat hack
  hourSpent: task.hourSpent,
  taskDesc: task.taskDesc
});
```

This presumes `task.taskDate` is a string `'2026-06-12'`. If the column is timestamp-typed and was written with a JS Date, it could be `'2026-06-12T07:00:00.000Z'`, and `taskDate + 'T00:00:00'` becomes `'2026-06-12T07:00:00.000ZT00:00:00'` — invalid.

### File 3: `components/timeSheetcalendar/page.tsx` (the CALENDAR DISPLAY)

Relevant blocks (lines 86-99 and 149-155):
```tsx
// Filter:
const utcDate = new Date(Date.UTC(
  selectedDate.getFullYear(),
  selectedDate.getMonth(),
  selectedDate.getDate()
));
const filteredTasks = tasks.filter(task => {
  const taskDate = new Date(task.taskDate);
  return taskDate.toISOString().split('T')[0] === utcDate.toISOString().split('T')[0];
});

// Per-day count:
const utcDate = new Date(Date.UTC(
  date.getFullYear(),
  date.getMonth(),
  date.getDate()
)).toISOString().split('T')[0];
const tasks = tasksByDate[utcDate];
```

This works ONLY if `task.taskDate`, after `new Date()` round-trip, lands on the intended day in UTC. For a record written as a JS Date in PDT, the round-trip is broken.

## The fix, conceptually

Standardize on `YYYY-MM-DD` strings end to end:

- **Write**: instead of passing the JS Date to Supabase, format it as `YYYY-MM-DD` using the picker's local calendar values (no timezone conversion needed).
- **Read** (for edit): instead of string-concatenating `T00:00:00`, parse the `YYYY-MM-DD` string as a local-time midnight Date for display purposes.
- **Calendar display**: compare `YYYY-MM-DD` strings directly; no `Date.UTC` ceremony.

The "local date with no zone" semantics matches user expectations: a freelancer who logged 3 hours on June 12 expects that record to be on June 12 regardless of where they fly the next day.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | clean |
| Build | `npm run build` | exit 0 |
| Manual smoke test | `npm run dev` → add/edit/view a task across days | dates stay on the intended day |

## Scope

**In scope** (the only files you may modify):
- `app/(main)/project/[id]/addTime/page.tsx`
- `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx`
- `components/timeSheetcalendar/page.tsx`
- `lib/date.ts` (create — small utility module)

**Optional in scope** (if exists post-plan-005): the `addTime/actions.ts` server action.

**Out of scope**:
- Migrating the `taskDate` column type in Supabase. If it's currently `timestamptz`, leave it; we operate at the application layer. Document this limitation in `docs/SECURITY.md` if it exists (plan 004 artifact), otherwise in `lib/date.ts` comments.
- `projectDate` field on projects. Visually it has the same issue but is read-only after creation in most flows — flag for a follow-up plan, don't fix here.
- Any other date-handling code outside these four files.

## Git workflow

- Branch: `advisor/007-timezone-utc`
- One commit per file is acceptable, or one atomic commit. Suggested message: `fix(timesheet): use local YYYY-MM-DD strings end-to-end for taskDate`.
- Do NOT push or open a PR.

## Steps

### Step 1: Verify the actual Postgres column type

Before changing anything, find out what type `tasks.taskDate` is.

If `supabase` CLI access is set up:
```bash
psql "$SUPABASE_DB_URL" -c "\d tasks"
```
Note the type of `taskDate`. It will be one of:
- `date` — easiest, the rest of the plan assumes this. Supabase's JS client serializes/deserializes `date` columns as `YYYY-MM-DD` strings.
- `timestamp` / `timestamptz` — harder, the column accepts full timestamps. The plan still works but the "read" side may need an extra parse.

If no PSQL access: look at one existing row's `taskDate` value in the Supabase Studio UI or via a curl to the rest endpoint. If it looks like `2026-06-12` it's a date; if it looks like `2026-06-12T07:00:00.000Z` it's a timestamp.

Set `COLUMN_TYPE` in your notes for use below. If `timestamptz`, also note: the migration to convert to `date` is out of scope; leave the column as-is and handle the parse in `lib/date.ts`.

### Step 2: Create `lib/date.ts`

Create `lib/date.ts` with two utility functions:

```ts
/**
 * Format a JS Date as a local-calendar YYYY-MM-DD string. Does NOT apply a
 * timezone shift — interprets the Date's year/month/day in the local zone.
 * Use when writing dates to a Postgres `date`-typed column, or comparing
 * calendar days.
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse a `YYYY-MM-DD` string into a JS Date set to local midnight on that
 * calendar day. Use when populating a date picker from a stored date.
 *
 * If the input is a full ISO timestamp (e.g. `2026-06-12T07:00:00.000Z`),
 * the leading YYYY-MM-DD portion is used and the time discarded — this
 * preserves the displayed calendar day for legacy rows where the writer
 * incorrectly stored a timestamp.
 */
export function parseLocalDate(s: string): Date {
  const ymd = s.slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
```

These two functions are the entire policy: write via `formatLocalDate`, read via `parseLocalDate`.

**Verify**: `npm run typecheck` clean.

### Step 3: Fix the writer — `app/(main)/project/[id]/addTime/page.tsx`

Edit line 119 in the insert block. Change:
```tsx
taskDate: values.taskDate,
```
to:
```tsx
taskDate: formatLocalDate(values.taskDate),
```

Add the import at the top:
```tsx
import { formatLocalDate } from "@/lib/date";
```

**Verify**: `npm run typecheck` clean.

### Step 4: Fix the edit-form reader — `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx`

Edit line 119 (the `form.reset(...)` block). Change:
```tsx
taskDate: new Date(task.taskDate + 'T00:00:00'),
```
to:
```tsx
taskDate: parseLocalDate(task.taskDate),
```

Add the import:
```tsx
import { parseLocalDate } from "@/lib/date";
```

Also, when this form submits its edits, the update must use `formatLocalDate` the same way addTime does. Find the `handleSubmit` block at lines 143-154:
```tsx
const { data, error } = await supabase
  .from('tasks')
  .update([{
      // ...
      taskDate: values.taskDate,   // ← same bug, change this too
      // ...
  }])
  ...
```
Change to:
```tsx
taskDate: formatLocalDate(values.taskDate),
```

And update the import to include both:
```tsx
import { formatLocalDate, parseLocalDate } from "@/lib/date";
```

**Verify**: `npm run typecheck` clean.

### Step 5: Fix the calendar — `components/timeSheetcalendar/page.tsx`

Replace the UTC ceremony with direct string comparisons.

In `filterTasksForDate` (lines 86-101), replace:
```tsx
const utcDate = new Date(Date.UTC(
  selectedDate.getFullYear(),
  selectedDate.getMonth(),
  selectedDate.getDate()
));
const filteredTasks = tasks.filter(task => {
  const taskDate = new Date(task.taskDate);
  return taskDate.toISOString().split('T')[0] === utcDate.toISOString().split('T')[0];
});
```
with:
```tsx
const selectedYmd = formatLocalDate(selectedDate);
const filteredTasks = tasks.filter(task => task.taskDate.slice(0, 10) === selectedYmd);
```

In `tasksByDate` reducer (lines 111-118), replace:
```tsx
const date = new Date(currentTask.taskDate).toISOString().split('T')[0];
```
with:
```tsx
const date = currentTask.taskDate.slice(0, 10);
```

In the `DayContent` component (lines 149-157), replace:
```tsx
const utcDate = new Date(Date.UTC(
  date.getFullYear(),
  date.getMonth(),
  date.getDate()
)).toISOString().split('T')[0];
const tasks = tasksByDate[utcDate];
```
with:
```tsx
const ymd = formatLocalDate(date);
const tasks = tasksByDate[ymd];
```

In the `hasTask` modifier (line 139-141), replace:
```tsx
hasTask: (date) => {
  return tasksByDate[date.toDateString()] !== undefined;
}
```
(That `date.toDateString()` is already-broken — `toDateString()` produces `"Fri Jun 12 2026"`, not a YYYY-MM-DD. This modifier likely never matched anything. Replace with):
```tsx
hasTask: (date) => {
  return tasksByDate[formatLocalDate(date)] !== undefined;
}
```

Add the import at top of the file:
```tsx
import { formatLocalDate } from "@/lib/date";
```

The `Task` interface (line 11-18) declares `taskDate: Date` but now we're storing it as a string. Update the type:
```tsx
interface Task {
  taskID: string;
  taskName: string;
  taskDate: string;   // YYYY-MM-DD (column type: date), or YYYY-MM-DDTHH:MM:SS for legacy rows
  hourSpent: number;
  taskDesc: string;
  projectID: string;
}
```

**Verify**: `npm run typecheck` clean. `npm run build` exits 0.

### Step 6: Manual smoke test — the critical step

Date bugs hide. Walk through these scenarios in a logged-in dev session:

1. **Add a task on today's date**, with hourSpent = 1. Confirm:
   - In the dashboard calendar (`/dashboard`), the task appears on today's cell with a "1 tasks" badge.
   - Clicking today shows the task in the table below.

2. **Add a task on yesterday's date** (use the date picker). Confirm:
   - Calendar shows it on yesterday, not today, not two days ago.
   - Selecting yesterday in the calendar shows the task.

3. **Edit yesterday's task** and confirm the edit form pre-populates with yesterday. Save; calendar still shows it on yesterday.

4. **Change your machine's clock to a different timezone** (or simulate via DevTools: F12 → Sensors → Location → "Other..." → Sydney). Reload the page. Confirm yesterday's task still shows on yesterday's cell — NOT shifted by 13 hours.

5. **At 10pm local time, add a task for "today".** Confirm it lands on today's cell, not tomorrow.

If any of these fail, do not mark the plan done; trace the failure and fix.

### Step 7: Update `plans/README.md`

Change the 007 row's Status from `TODO` to `DONE`.

## Test plan

No automated tests in this plan (deferred). The smoke test in step 6 is the gate.

Future tests for `lib/date.ts` should be very high value because the functions are tiny and pure:
- `formatLocalDate(new Date(2026, 5, 12))` → `'2026-06-12'`.
- `parseLocalDate('2026-06-12')` → `new Date(2026, 5, 12)`.
- `parseLocalDate('2026-06-12T07:00:00.000Z')` → `new Date(2026, 5, 12)` (legacy timestamp case).

## Done criteria

ALL must hold:

- [ ] `lib/date.ts` exists with `formatLocalDate` and `parseLocalDate`.
- [ ] `app/(main)/project/[id]/addTime/page.tsx` writes `taskDate` via `formatLocalDate(values.taskDate)`.
- [ ] `app/(main)/project/[id]/tasks/[taskID]/edit/page.tsx` reads via `parseLocalDate(task.taskDate)` and writes via `formatLocalDate(values.taskDate)`.
- [ ] `components/timeSheetcalendar/page.tsx` no longer calls `Date.UTC(...)` or `.toISOString().split('T')[0]` on task dates — all comparisons go through `formatLocalDate` or string `.slice(0, 10)`.
- [ ] The `Task` interface in the calendar component declares `taskDate: string`.
- [ ] `npm run typecheck` clean. `npm run build` exits 0.
- [ ] Step 6 manual smoke test passes for all five scenarios.
- [ ] `plans/README.md` status row for 007 updated to DONE.

## STOP conditions

- Step 1 reveals the column is `timestamptz` AND existing rows have a non-zero time component (e.g. some rows are `2026-06-12T05:00:00Z`, others are `2026-06-12T00:00:00Z`). The `.slice(0, 10)` approach assumes the leading 10 chars are the intended day — for legacy rows written in non-UTC zones, this may shift the displayed day. If you see this pattern, STOP and ask whether to also migrate the existing data (out-of-scope SQL migration).
- A test scenario in step 6 fails after one fix attempt. Date bugs compound; the second mistake is usually worse than the first. Stop, capture the symptom precisely (exact timezone, exact date entered, exact day it landed on), and re-plan.
- The codebase uses `taskDate` somewhere this plan didn't anticipate (e.g. the dashboard column definitions in `app/(main)/dashboard/taskDayTable/columns.tsx`). Sweep with `grep -rn taskDate app/ components/` first; if any callsite outside Scope renders `taskDate`, evaluate before touching.

## Maintenance notes

- `projectDate` on projects has the same shape of bug but is less visible (it's set once at creation and rendered as a formatted string). Flag a follow-up plan if a user reports it.
- The `lib/date.ts` policy is "local-calendar dates, no zone." This is the right call for time-sheet semantics; it would be the WRONG call for a multi-user calendar with shared scheduling. If the app evolves that direction, revisit.
- Reviewer should scrutinize: (1) every `new Date(taskDate...)` callsite has been updated, (2) the `Task` interface type matches actual runtime shape, (3) the smoke test was actually performed (not just claimed).
- Watch out for `date-fns` `format(...)` calls in the date picker — those operate on JS Date and are unaffected by this plan; do not change them.
