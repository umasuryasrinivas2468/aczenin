/*
  /axe/careers — job applications from the /careers form.

  Same shape as /axe/leads: a Server Component with a plain GET search form, so
  filtering happens in the database query and the URL is bookmarkable. Unlike
  Leads, these rows carry contact details — that is the point of the page.
*/

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasAxeSession } from "@/lib/axe/guard";
import { getApplications } from "@/lib/careers/applications";
import { findRole } from "@/lib/careers/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Asia/Kolkata explicitly, so the time does not depend on the server's region.
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The resume link is applicant-supplied; only render it as a link when it is
// http(s), so a stored "javascript:" URL can never become clickable.
function safeHref(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

export default async function AxeCareersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Defence in depth: the query must not depend on the layout not rendering us.
  if (!(await hasAxeSession())) {
    return null;
  }

  const params = await searchParams;
  const single = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const q = single(params.q);
  const page = Number(single(params.page)) || 1;

  const result = await getApplications(q, page);

  const pageHref = (target: number): string => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    next.set("page", String(target));
    return `/axe/careers?${next.toString()}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Applications submitted at /careers, newest first.
      </p>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 basis-64">
          <label htmlFor="axe-careers-q" className="mb-1.5 block text-sm font-medium">
            Search
          </label>
          <Input
            id="axe-careers-q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, email, skill or role ID"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q ? (
          <Button type="button" variant="ghost" asChild>
            <a href="/axe/careers">Clear</a>
          </Button>
        ) : null}
      </form>

      {result.rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {q ? "No applications match this search." : "No applications yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map((app) => {
            const resume = safeHref(app.resume_url);
            return (
              <Card key={app.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">{app.full_name}</h2>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                        {app.role_id
                          ? `${app.role_id} · ${findRole(app.role_id)?.title ?? "Retired role"}`
                          : "General application"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <a href={`mailto:${app.email}`} className="break-all hover:text-foreground hover:underline">
                          {app.email}
                        </a>
                        <a href={`tel:${app.phone}`} className="hover:text-foreground hover:underline">
                          {app.phone}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTimestamp(app.submitted_at)}
                      </span>
                      {resume ? (
                        <Button size="sm" variant="outline" asChild>
                          {/* noreferrer so the resume host does not learn the /axe URL. */}
                          <a href={resume} target="_blank" rel="noopener noreferrer">
                            Resume
                          </a>
                        </Button>
                      ) : (
                        <span className="break-all font-mono text-xs">{app.resume_url}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{app.skills}</p>
                  </div>

                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
                      Projects
                    </summary>
                    <p className="mt-1 whitespace-pre-line text-sm">{app.projects}</p>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {result.page > 1 || result.hasMore ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {result.page}</p>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <a href={pageHref(result.page - 1)}>Previous</a>
              </Button>
            ) : null}
            {result.hasMore ? (
              <Button variant="outline" size="sm" asChild>
                <a href={pageHref(result.page + 1)}>Next</a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
