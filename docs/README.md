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
| [finathon-team-code-column.sql](finathon-team-code-column.sql) | **Runnable.** Freezes each team's `ACZCGP-AIM-26xxx` code into a stored `team_code` column with a sequence default, so deleting a team leaves a gap instead of renumbering. Must run before the `data.ts` change that reads it is deployed. |
| [nova-api-architecture.md](nova-api-architecture.md) | Design of the read-only Nova sandbox API (`aczen.in/nova-api/v1`), the allowlisted developer portal, the `/nova-api/axe` admin portal, the database schema, the security model and the build plan. |
| [nova-finathon-data-coverage.md](nova-finathon-data-coverage.md) | Live coverage of the 54 Finathon problem statements by the Nova seed (Tier 0 + Tier 1 live): coverage matrix, live resource inventory, planted-anomaly catalogue with per-team counts, and the remaining Tier 2/3 build list. |
| [nova-tier1-build-contract.md](nova-tier1-build-contract.md) | **Binding** contract for the Tier 0 + Tier 1 data build: table names, columns, per-team volumes, run order, file ownership, who plants which anomaly, the admin-only answer-key table, and the verify loop. |
| [nova-tier2-build-contract.md](nova-tier2-build-contract.md) | **Binding** contract for the Tier 2 data build (files 009–013: spend, gateway, sourcing/roles/integration, debt, ledger): run order and read sets, soft cross-file references, per-file size budgets under the 500 MB cap, every table and column, registry keys, the A11/A15/A16/A17/A19 catalogue, the verify loop, coverage and the known bank-statement gaps. |
| [ai-studio-architecture.md](ai-studio-architecture.md) | Map of Aczen AI Studio (`/ai-studio` console, `/api/ai/v1` gateway, `/ai-studio/axe` admin): routing, the 12 `ai_*` tables and RPCs, the harness upstream, admission order and limits, keys/sessions, env vars. |
| [ai-studio-status.md](ai-studio-status.md) | AI Studio progress as of 2026-09-30: deployed, but every gateway call returns 503 because the harness env vars are unset; the ordered to-do list, risks (email-as-initial-password), and corrections to earlier records. |
| [finathon-contrast-audit.md](finathon-contrast-audit.md) | Computed WCAG 2.2 contrast ratios for every Finathon colour pair, verification of the ratios asserted in finathon.css comments, and the two fixes worth making. |
