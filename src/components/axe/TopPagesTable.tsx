"use client";

/*
  The sortable table of every page on the site.

  This is the "table view" the palette's light-mode contrast WARN obliges, and
  it is also the answer to a real question the bar chart above it cannot
  address: the chart shows the TOP pages, and the pages worth finding are often
  the ones at the bottom — high traffic, no leads. A chart that only ever shows
  the winners hides exactly that.

  Client Component because sorting is local state. The rows themselves are
  computed on the server and passed in; nothing is fetched here.
*/

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Breakdown } from "@/lib/axe/queries";

// The columns that can be sorted, as a union rather than a string. A typo in a
// click handler would otherwise silently sort by a field that does not exist,
// which renders as "sorting did nothing" and is awkward to track down.
type SortKey = "label" | "value" | "visitors";
type SortDirection = "asc" | "desc";

export default function TopPagesTable({ rows }: { rows: Breakdown[] }) {
  // Defaults to most-viewed first: that is what the table is opened to see, and
  // making the founder click once before it is useful is pure friction.
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [direction, setDirection] = useState<SortDirection>("desc");

  // useMemo because sorting 48 rows on every keystroke elsewhere in the tree is
  // wasted work — and because a fresh array identity each render would defeat
  // any future memoisation of the row components.
  const sorted = useMemo(() => {
    // Copied before sorting: Array.prototype.sort mutates in place, and
    // mutating a prop is how a parent's data quietly changes underneath it.
    return [...rows].sort((a, b) => {
      // Text sorts by locale, numbers sort numerically. Comparing paths with a
      // subtraction would produce NaN and leave the order untouched.
      if (sortKey === "label") {
        const result = a.label.localeCompare(b.label);
        return direction === "asc" ? result : -result;
      }
      // ?? 0 because visitors is optional on the Breakdown type; undefined in a
      // subtraction yields NaN, which sort treats as "equal" and scrambles the
      // list non-deterministically.
      const aValue = (sortKey === "visitors" ? a.visitors : a.value) ?? 0;
      const bValue = (sortKey === "visitors" ? b.visitors : b.value) ?? 0;
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [rows, sortKey, direction]);

  /*
    Clicking a header sorts by it; clicking the ACTIVE header flips direction.

    New columns start descending rather than ascending, because every column
    here is a count and "most first" is what someone means by sorting it.
  */
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("desc");
  }

  /*
    A header cell that is also a sort control.

    Extracted because there are three of them and the accessibility attributes
    are the part most likely to be got wrong on a copy-paste — particularly
    aria-sort, which is what makes the current ordering perceivable to a screen
    reader rather than only to someone who can see the arrow.
  */
  function SortableHead({
    columnKey,
    children,
    numeric = false,
  }: {
    columnKey: SortKey;
    children: React.ReactNode;
    numeric?: boolean;
  }) {
    const active = sortKey === columnKey;
    return (
      <TableHead
        // aria-sort must be "none" on inactive columns, not omitted — that is
        // what tells assistive tech the column is sortable but not sorted.
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
        className={cn(numeric && "text-right")}
      >
        {/* A real button, not a div with onClick: it is focusable, it responds
            to Enter and Space, and it is announced as actionable — all for free,
            and none of which a clickable div gets. */}
        <button
          type="button"
          onClick={() => toggleSort(columnKey)}
          className={cn(
            "inline-flex items-center gap-1 font-medium hover:text-foreground",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {children}
          {/* An arrow on the active column only. Showing a neutral glyph on every
              column makes it harder, not easier, to see which one is live. */}
          {active ? <span aria-hidden>{direction === "asc" ? "↑" : "↓"}</span> : null}
        </button>
      </TableHead>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">All pages</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Scroll container on the table, not the page. A wide table inside a
            card would otherwise make the whole dashboard scroll sideways on a
            phone, which breaks every other card on the page too. */}
        <div className="max-h-[420px] overflow-auto">
          <Table>
            {/* Sticky header so the column meanings survive scrolling a 48-row
                table — without it, the numbers halfway down are unlabelled. */}
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <SortableHead columnKey="label">Path</SortableHead>
                <SortableHead columnKey="value" numeric>
                  Views
                </SortableHead>
                {/* "Visitor-days", not "Visitors". These are per-day uniques
                    summed, the same semantics as the headline tile, so they do
                    NOT add up to it — one person reading three pages in a day
                    counts once in the tile and three times down this column.
                    The header has to say which of the two it is, or someone
                    will eventually sum it and trust the answer. */}
                <SortableHead columnKey="visitors" numeric>
                  Visitor-days
                </SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  {/* Spans the full width so the message sits under the table
                      rather than squeezed into the first column. */}
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    No pageviews recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((row) => (
                  // Keyed by path, which is unique per row by construction —
                  // the aggregation upstream groups on it.
                  <TableRow key={row.label}>
                    <TableCell className="font-mono text-xs">{row.label}</TableCell>
                    {/* tabular-nums so the digits form a readable column rather
                        than a ragged edge down 48 rows. */}
                    <TableCell className="text-right tabular-nums">
                      {row.value.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(row.visitors ?? 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
