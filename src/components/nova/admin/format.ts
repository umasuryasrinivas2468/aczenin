/*
  Date and number formatting for the Nova admin panels.

  Pinned to en-IN and Asia/Kolkata on purpose. These components render on the
  server (UTC on Vercel) AND hydrate in the browser (the admin's zone); an
  unpinned toLocaleString would produce two different strings and a hydration
  mismatch. IST also matches how the usage chart buckets days.
*/

// Built once: Intl formatters are comparatively expensive to construct.
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  // "29 Sept 2026, 14:05" — date and minute are the useful resolution here.
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

// Date only, for "added on" columns where the time is noise.
const DATE_ONLY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

// Indian digit grouping (1,23,456), matching the rest of the site.
const COUNT = new Intl.NumberFormat("en-IN");

// A timestamp, or a caller-chosen word for "never" (null last_used_at).
export function formatDateTime(iso: string | null, empty = "Never"): string {
  // Null is a real state ("never used"), not an error, so it gets words.
  return iso ? DATE_TIME.format(new Date(iso)) : empty;
}

// A date without the time.
export function formatDate(iso: string): string {
  return DATE_ONLY.format(new Date(iso));
}

// A request count with grouping separators.
export function formatCount(n: number): string {
  return COUNT.format(n);
}
