# aczen.in — documentation index

One file per topic. Add a line here when you add a file.

| Document | What it covers |
|---|---|
| [finathon-blanks.md](finathon-blanks.md) | Every placeholder still to be filled on `aczen.in/Finathon`, in priority order, with file and line references. |
| [finathon-registration-schema.md](finathon-registration-schema.md) | The applied `finathon_registration` table — verification evidence, the unsafe insert-error path that blocks it, and live-vs-repo schema drift. **Partly stale as of 2026-09-22 — see the rework design doc.** |
| [finathon-registration-rework-design.md](finathon-registration-rework-design.md) | Design for the two-step team registration (₹499 UPI, screenshot upload, UTR), the team/participant schema, the private storage bucket, and the security fixes the change forces. |
| [axe-analytics-dashboard-design.md](axe-analytics-dashboard-design.md) | Design of the /axe founder analytics dashboard. |
| [finathon-step0-inventory.md](finathon-step0-inventory.md) | The read-only inventory queries run against the live database before any DDL. Replaces §3 of the rework design, which named columns nobody had seen. |
| [finathon-team-registration-migration.sql](finathon-team-registration-migration.sql) | **Runnable.** Additive DDL for finathon_team / finathon_participant / finathon_register_attempt, forced RLS, the atomic insert function, and the private payments bucket. Applied 2026-09-22. |
| [finathon-legacy-copy.sql](finathon-legacy-copy.sql) | **Runnable.** Pre-flight checks plus the idempotent copy of the 7 pre-existing registrations into the new tables. Applied and verified 7/7/7 on 2026-09-22. |
| [finathon-contrast-audit.md](finathon-contrast-audit.md) | Computed WCAG 2.2 contrast ratios for every Finathon colour pair, verification of the ratios asserted in finathon.css comments, and the two fixes worth making. |
