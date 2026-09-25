/*
  GET /Finathon/axe/26/export?status=<filter> — the team roster as CSV.

  One row per participant: team code, team name, status, role, name, email.
  Route handlers do not pass through the gating layout, so the session is
  checked here before anything is fetched.
*/

import { hasFinathonSession } from "@/lib/finathon/gate";

import { assignTeamCodes, listTeams, sortRoster, toStatusFilter } from "../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADER = ["Team Code", "Team Name", "Status", "Role", "Name", "Email"];

/*
  Quotes one CSV cell. A leading = + - @ is prefixed with an apostrophe so a
  registrant-typed name cannot run as a formula when the file is opened in
  Excel or Sheets.
*/
function cell(value: unknown): string {
  let text = typeof value === "string" ? value : value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if ((await hasFinathonSession()) !== true) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Unlike the page, the export defaults to every team when no tab is given.
  const raw = new URL(request.url).searchParams.get("status");
  const status = raw === null ? "all" : toStatusFilter(raw);

  const all = await listTeams();
  // Codes come from the full set so a team keeps its code in every filtered view.
  const codes = assignTeamCodes(all);
  const teams = all
    .filter((team) => status === "all" || team.status === status)
    .sort((a, b) => (codes.get(a.id) ?? "").localeCompare(codes.get(b.id) ?? ""));

  const lines = [HEADER.map(cell).join(",")];
  for (const team of teams) {
    for (const person of sortRoster(team.finathon_participant)) {
      lines.push(
        [
          codes.get(team.id),
          team.team_name,
          team.status,
          person.is_lead === true ? "Lead" : "Member",
          person.full_name,
          person.email,
        ]
          .map(cell)
          .join(","),
      );
    }
  }

  // The BOM makes Excel read the file as UTF-8, so non-ASCII names survive.
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finathon-26-teams-${status}-${stamp}.csv"`,
      // Personal data: never cached by the browser or anything in between.
      "Cache-Control": "no-store",
    },
  });
}
