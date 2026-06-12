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
 *
 * Note: this module standardizes the application layer on "local-calendar
 * dates, no zone." If the `tasks.taskDate` Postgres column is currently
 * `timestamptz` rather than `date`, we still operate purely on the
 * leading YYYY-MM-DD portion — migrating the column type is out of scope.
 */
export function parseLocalDate(s: string): Date {
  const ymd = s.slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
