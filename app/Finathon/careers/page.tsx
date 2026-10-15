import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ApplicationForm from "@/components/careers/ApplicationForm";
import { ROLES, findRole } from "@/lib/careers/roles";

/*
  Route shell for /Finathon/careers — open roles, their job descriptions, and
  the application form with a role picker.

  Fonts and finathon.css come from app/Finathon/layout.tsx; `fin` is applied
  here because the layout deliberately does not (see its header). Roles and IDs
  live in src/lib/careers/roles.ts; applications post to the same
  /api/careers/apply route as /careers, with the role ID attached.
*/

export const metadata: Metadata = {
  title: "Careers — Finathon 2026 | Aczen",
  description:
    "Open roles at Aczen: Cyber Security Engineer, AI Engineer, Full Stack Engineer and Cloud Engineer. Read the job descriptions and apply with the role ID.",
  alternates: { canonical: "/Finathon/careers" },
};

function JdList({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <h4 className="fin-meta">{heading}</h4>
      <ul className="fin-body mt-3 list-disc space-y-2 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function FinathonCareersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.role) ? params.role[0] : params.role;
  // Only a published ID preselects the picker; anything else is ignored.
  const selectedRoleId = findRole(requested)?.id ?? "";

  return (
    <div className="fin">
      <Navbar />

      <main style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="fin-shell py-16 sm:py-24">
          <Link className="fin-meta" href="/Finathon">
            &larr; Finathon 2026
          </Link>

          <h1 className="fin-serif fin-h2 mt-6">Careers at Aczen</h1>
          <p className="fin-lede mt-4">
            We are hiring engineers to build India&rsquo;s unified financial OS for SMBs. Read
            the job descriptions below and apply with the role ID of the position you want.
          </p>

          {/* Index of open roles, each with its ID, linking to the full JD. */}
          <nav aria-label="Open roles" className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--rule)" }}>
            {ROLES.map((role) => (
              <a
                key={role.id}
                href={`#${role.id}`}
                className="block p-5 transition-colors hover:opacity-80"
                style={{ background: "var(--paper)" }}
              >
                <span className="fin-meta">{role.id}</span>
                <span className="fin-serif fin-h3 mt-2 block">{role.title}</span>
                <span className="fin-body mt-1 block text-sm">
                  {role.type} · {role.experience}
                </span>
              </a>
            ))}
          </nav>

          {ROLES.map((role) => (
            <section
              key={role.id}
              id={role.id}
              aria-labelledby={`${role.id}-title`}
              className="fin-track scroll-mt-28"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 id={`${role.id}-title`} className="fin-serif fin-h2">
                  {role.title}
                </h2>
                <span className="fin-meta" style={{ color: "var(--ink)" }}>
                  Role ID: {role.id}
                </span>
              </div>

              <dl className="fin-body mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {[
                  ["Team", role.team],
                  ["Location", role.location],
                  ["Type", role.type],
                  ["Experience", role.experience],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="font-semibold">{label}:</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="fin-lede mt-6">{role.summary}</p>

              <div className="mt-8 grid gap-8 lg:grid-cols-3">
                <JdList heading="What you will do" items={role.responsibilities} />
                <JdList heading="What we are looking for" items={role.requirements} />
                <JdList heading="Nice to have" items={role.niceToHave} />
              </div>

              <p className="mt-8">
                <Link className="fin-cta" href={`/Finathon/careers?role=${role.id}#apply`}>
                  Apply for {role.id}
                </Link>
              </p>
            </section>
          ))}

          <section id="apply" aria-labelledby="apply-title" className="fin-track scroll-mt-28">
            <h2 id="apply-title" className="fin-serif fin-h2">
              Apply
            </h2>
            <p className="fin-body mt-4 max-w-2xl">
              Pick the role ID you are applying for, then tell us about yourself and what you
              have built. We read every application.
            </p>
            <div className="mt-10 max-w-3xl">
              {/* Keyed on the role so following an "Apply for" link re-seeds the picker. */}
              <ApplicationForm
                key={selectedRoleId}
                roles={ROLES.map(({ id, title }) => ({ id, title }))}
                defaultRoleId={selectedRoleId}
              />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
