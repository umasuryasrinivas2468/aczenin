# Aczen AI Studio — progress and open items

*Status as of **2026-09-30 14:45 IST**. How it works:
[ai-studio-architecture.md](ai-studio-architecture.md).*

Each claim below carries a tag:

| Tag | Meaning |
|---|---|
| **VERIFIED** | A command output or pasted query result shows it |
| **CLAIMED** | A session said it, but nothing proves it |
| **INFERRED** | Reasoned from the code, not tested |

## Headline

**The code is deployed but the endpoint does not work.**
- VERIFIED 2026-09-30: `POST https://www.aczen.in/api/ai/v1/chat/completions` returns `503 service_unavailable` to every caller.
- That code comes from the `harnessConfig()` gate ([gateway.ts:222-226](../src/lib/ai-studio/gateway.ts#L222-L226)). It runs before the key check.
- So `AI_HARNESS_URL` / `AI_HARNESS_API_KEY` are **not set in Vercel production**. The kill switch would have returned `service_paused` instead.

**Update 15:20 IST: root cause of the login 503 found.**
- VERIFIED: `POST /api/ai-studio/auth/login` returns 503 even for a made-up email, so the failure comes before any user lookup.
- [vercel-env-upload.env](../vercel-env-upload.env) has only the two Supabase variables, and they point at the correct project. There are no `AI_STUDIO_*` or `AI_HARNESS_*` variables.
- So `hashEmail()` throws `AI_STUDIO_KEY_PEPPER is not set`, and the route turns that into the 503.
- `bb6efcd` (pushed) adds `AI_HARNESS_AUTH_SCHEME=none`, because the harness wants a bare `x-api-key`. It also moves the quickstart to `POST /ask {question, mode}` on `www`.
- Harness wiring follows `aczen_slm` Q-14: `AI_HARNESS_URL=https://aczen-finance-api-114219376928.asia-south1.run.app/v1`, `ALLOWED_PATHS=ask`, `AUTH_HEADER=x-api-key`, `AUTH_SCHEME=none`, and an org key from the harness `API_KEYS` secret.
- Streaming is gone from the quickstart: the harness doesn't stream.

## Progress by area

| Area | State | Evidence |
|---|---|---|
| Code (console, gateway, admin, cron) | **Done.** 77 files, +9,416 lines | VERIFIED: commit `4224365 "AI STDIO"`, merged 2026-09-29 |
| Deployed to production | **Yes** | VERIFIED 2026-09-30: `/ai-studio/login` and `/ai-studio/axe` return 200; the gateway answers |
| DB migration | **Applied** to `jgwvyyqagabtpnomdwgo` | VERIFIED from `information_schema` output Teja pasted (session 990cfe4d, 2026-09-30). The `ai_*` tables sit next to the Finathon tables |
| First user | `m.teja@aczen.in` inserted: `status=active`, `must_change_password=true`, no password yet | VERIFIED (pasted row, 2026-09-30 05:17Z) |
| Harness connection (upstream model) | **Not configured in prod.** Every call returns 503 | VERIFIED (live probe above) |
| `AI_STUDIO_*` secrets in Vercel | **Unknown.** Never checked | Pages render, but no login attempt has been made |
| Admin portal | Built; unused as far as any record shows | CLAIMED |
| End-to-end call with a real key | **Never done** | none |
| Tests | **None** exist (no `*.test`/`*.spec`, no test script) | VERIFIED |

## Where it came from

No Claude session in this project wrote AI Studio.

- It arrived from upstream as the single commit `4224365` (repo owner: umasuryasrinivas2468; migration dated 2026-09-27).
- Session fbab3cfb merged it on 2026-09-29. The one conflict was in `src/components/ChatbaseEmbed.tsx`, where both sides added a hidden route; the merge kept both.
- Since then sessions have only read it, reused its login design for Nova (`ebbbb4c`), and inserted the first user row.

## Open items, in order

1. **Set the harness env vars in Vercel production** (`AI_HARNESS_URL`, `AI_HARNESS_API_KEY`, plus `_AUTH_HEADER` / `_AUTH_SCHEME` / `_MODEL` if the `aczen_slm` harness needs them), then redeploy.
   - **Blocker:** the Vercel project is under the repo owner's account. Teja has a login, but no session has verified env access.
2. **Check that the `AI_STUDIO_*` secrets are set.** If they aren't, generate them with `node scripts/ai-studio-secrets.mjs --admin`.
   - Without `AI_STUDIO_SESSION_SECRET` and `AI_STUDIO_KEY_PEPPER`, login and key creation will fail even once the harness works (INFERRED).
3. **Teja: sign in at `www.aczen.in/ai-studio/login` and set a real password.** Until he does, anyone who knows the email can sign in and claim the account (see Risks).
4. **Fix the quickstart base URL.** [quickstart/page.tsx:12](../app/ai-studio/(console)/quickstart/page.tsx#L12) hard-codes `https://aczen.in/api/ai/v1`.
   - VERIFIED 2026-09-30: bare `aczen.in` answers with a 308 redirect to `www`, and clients drop the `Authorization` header on the host change.
   - Every sample a user copies will then fail with 401 (INFERRED; Nova hit the same problem and fixed it in `f4d1f29`).
   - The same bare domain appears in error messages and emails.
5. **Set the token prices in `/ai-studio/axe/controls`.** They default to 0, so spend reads ₹0 and the budget alert / throttle / hard stop can never trigger. The code sends a `prices_unset` email for this.
6. **Run one end-to-end call** once steps 1–4 are done: create a key → `POST /chat/completions` → check `/usage` and `ai_usage_event`.
7. **Decide on the `feat/harness-api-keys` branch** (`6e9aacf`, local only, worktree `../aczenin-harness-keys`).
   - It adds separate per-Finathon-team keys: plain sha256, and a lookup function granted to **anon**.
   - It was cancelled on 2026-09-29 because AI Studio's key system already covers the need. It still merges cleanly.
   - Recommendation: delete it once someone confirms that no team needs harness access without going through AI Studio. The keep-or-delete question from 2026-09-29 was never answered.

## Risks and gaps

| # | Issue | Where | Severity |
|---|---|---|---|
| R1 | Initial password = the account's email. Whoever signs in first sets the password, and `reset_password` re-opens the same window. It's deliberate, but it rests entirely on nobody else knowing a lead's email | [login/route.ts:8-11, 70-76](../app/api/ai-studio/auth/login/route.ts#L70-L76) | High for any account not yet claimed |
| R2 | The build ignores type and lint errors (`ignoreBuildErrors`, `ignoreDuringBuilds`), so broken types ship silently | [next.config.mjs:121-122](../next.config.mjs#L121-L122) | Medium |
| R3 | Admin sessions are stateless: logout doesn't revoke them, and a stolen cookie stays valid for up to 30 min. There is one shared admin password and no per-admin identity | `session.ts`, `admin-guard.ts` | Medium |
| R4 | The invalid-key limiter lives in each serverless instance, so it isn't a shared limit | [gateway.ts:297-319](../src/lib/ai-studio/gateway.ts#L297-L319) | Low (the DB limits still apply) |
| R5 | The request-size cap compares characters (`bodyText.length`), not bytes | [gateway.ts:439](../src/lib/ai-studio/gateway.ts#L439) | Low |
| R6 | Local `tsc` fails because `nodemailer` isn't installed locally. CLAIMED to be fine on Vercel | `src/lib/ai-studio/mail.ts` | Low |
| R7 | No tests at all for a gateway that handles money (budget, metering) | none | Medium |

## Corrections to earlier records

- `.remember` has "m.teja@aczen.in → AI Studio ✓". That is **only the row insert**: no sign-in or password change has been confirmed.
- One peer brief called `zpkvshwmbgomrycoeqqd` the live DB. **Wrong**: the live DB is `jgwvyyqagabtpnomdwgo`.
- Memory said the harness-keys PR had started. **Wrong**: it was cancelled before any push.
