# Platform quality audit — PLATFORM-QUALITY-AUDIT-001 / #114

## CP-031 authenticated protected Preview completion — 2026-09-22 14:22 BST

The final protected Preview is deployment `dpl_HfBLDGQvCDjf3RV2cCXshuG4rb7V`, source
`659d0eafaac8a354ee7a901566c23de17dd7c568`, role `preview`, database
`preview:plum_duff_preview_cp028` and schema `account-access-v1`. Production, its aliases/data and
the frozen localhost baseline were untouched. The verified pre-disruption Preview backup has SHA-256
`5b055f684303fb6be06900d20ae973406b75cc1a3a887544e42cdc74c4be4561` and 345 restore-list entries.

CP-030's Reports and £6→£5 correction evidence remains valid. A final-source regression additionally
changed reduced-motion preference, navigated away/back and rendered populated Reports with no React
185, listener/request storm or browser diagnostic. Independent hosted groups proved supported
Standard/SNR, Profit Boost, Cashback and Multi-Lay planning; settlement/history/reporting; Guided
Onboarding, Profile lifecycle, #109 Account eligibility, awards, imported lineage and portable
restore; and Global Search, Casino Quick Action, chart inspection/drilldown and return context.
The complete functional browser set passed 8/8 in 10.3 minutes on the preceding `96bad5e` repair;
the final `659d0ea` change affects only eligibility scope, and its Group C/access plus unchanged
Reports checks passed 3/3 after deployment.

| Original CP-029 hosted journey | State | Evidence boundary |
|---|---|---|
| 1–5 Onboarding, Profile lifecycle, Account/#109, Standard | PASS | Browser/API persistence and reload |
| 6 Multi-Lay | PARTIAL | Supported plan/save/reopen passes; richer reward and actual-placement configurations remain unimplemented |
| 7–12 Plan, placement, settlement, correction, History, Reports | PASS | Supported ledgers; CP-030 proves correction exactly once |
| 13–16 Profit Boost, Cashback, awards, imported lineage | PASS | Retry, Profile scope and restore/remap checked |
| 17–22 Search, Quick Action, chart, drilldown, export, restore | PASS | Real UI plus independent persisted-state reads |

Two load-amplification defects were repaired. Free Bet list assembly performed lineage/audit reads
per child; batched Profile-scoped evidence reduced the 250-child tracker summary from 70.78s to
5.81s. Multi-Profile eligibility read all 83 Profiles and their Accounts/exchanges; it now uses the
three active Profiles, returning 200 in 11.88s/1,427 bytes instead of timing out at 90 seconds.
Focused API evidence passes 39/39 across both repairs; mypy remains 0/82 and TypeScript passes.
The known 600-row Sportsbook response remains 4.03s/~1.30MB: usable, but retained pagination/capacity
debt rather than a verified unlimited-scale claim.

Responsive browser evidence passed at desktop, half/narrow widths, 200% text, both themes and reduced
motion with no overflow or accepted calculator-contract regression. Fresh session/logout evidence is
200/204/401; unauthenticated access is 401, owned multi-Profile navigation succeeds, mismatched
record identity is 404/empty scoped history, and malformed money is rejected without a write.
CP-028's unchanged-schema database-unavailable/readiness/restore proof is reused; CP-031 also proved
a fresh runtime deployment without reseeding. The final 500-log sample is all info (480×200,
20×304), with no 5xx, React/hydration/duplicate-key warning or sensitive-label signal.

**Verdict:** PROTECTED PREVIEW VERIFIED WITHIN THE LISTED SCOPE. This is not Production readiness.
Owner Google PASS remains separately sourced owner evidence; VoiceOver spoken output, richer
Multi-Lay behaviour, the 600-row capacity item, Preview teardown and any Production promotion remain
outside this verification claim.

## CP-030 Reports repair and hosted cash-correction proof — 2026-09-22 11:57 BST

The deployed failure was reproduced on the exact hosted sequence and traced to
`FinancialValue`: every rendered value installed its own reduced-motion media-query listener. A
preference transition on populated Reports synchronously notified hundreds of listeners and caused
React error 185. `FinancialMotionPreferenceProvider` now owns one listener and shares the result;
`FinancialValue` and `ReplayableProgress` consume it without changing financial calculations,
filters, chart inspection, drilldown or visual semantics.

The deterministic 600-row local regression passes 4/4. TypeScript, mypy (0/82) and the production
web build pass; the existing Turbopack dynamic-filesystem warning remains unchanged. Protected
Preview deployment `dpl_CkBF3rMPxACgeawU77WbLSZY49hb` serves revision
`b9e58e77c8fff3bd647138c8b1d8cc38f22812be`, role `preview`, database
`preview:plum_duff_preview_cp028` and schema `account-access-v1`. The stable protected alias and
explicit `OPENFORGE_INTERNAL_API_BASE_URL` preserve authenticated server rendering; Production and
the accepted localhost baseline were untouched.

Hosted focused evidence passes 2/2 in 4.2 minutes. Direct Reports settled with no React/page error
and all observed report requests returned 200. A synthetic TopUp was persisted at £6, reopened,
corrected to £5, shown as Created then Corrected in History, and shown as one £5 Cash Adjustment in
Reports after reload. Replaying the same correction idempotency key returned the same result;
independent row/history reads proved one activity at £5 and exactly `created`, `corrected` events.
Seven failed-run synthetic Profiles were retained safely as archived; none remains active. The
remaining CP-029 hosted journeys, recovery, authorisation, performance and log review remain queued.

## CP-029 evidence-recovery correction — 2026-09-22 08:02 BST

Retained evidence confirms branch `repair/import-history-012`, HEAD `5d190cb`, deployed application
revision `d35eed7` and active Preview deployment `dpl_Gs9Rf6P5fPJSxWyD6j2MFNtSXcif`. The only
working-tree change is generated `apps/web/tsconfig.typecheck.tsbuildinfo`; it is preserved and was
not committed. No CP-029 test process remains running.

The owner Google PASS is an owner assertion supplied in the CP-029 request, not a capture from the
engineering browser. The engineering browser used a synthetic hosted session cookie. Its retained
Playwright result is **failed**, not passed; it reached Profiles, Dashboard, Accounts, Standard,
Multi-Lay and Reports before the end-of-run diagnostic assertion exposed React error 185. Three
rendered screenshots and the failed-result JSON remain. The full 22 hosted mutation journeys did not
run to completion. CP-029 did not freshly rerun financial mutation/reconciliation or database-outage
recovery; those statements reuse CP-028 evidence on the unchanged Preview database/schema.

The retained latest log sample contains 100 requests with 88×200, 2×204, 6×304, 2×401 and 2×404,
and no 5xx/error-level record. Exact direct-API response bodies and the performance command output
were not retained; timings survive only in the contemporaneous CP-029 audit entry and therefore are
not independently reproducible from raw artifacts. Resume at focused Reports error reproduction and
stack capture on `d35eed7`, before any further broad hosted journey run.

## Current CP-029 authenticated protected Preview verification — 2026-09-21 15:24 BST

Will completed the genuine Google-owned interaction on the protected Preview and returned to Plum
Duff. This is recorded separately from CP-028's application-owned state/PKCE/callback evidence:
**HOSTED GOOGLE AUTH: PASS**. Synthetic hosted session evidence then proved session read 200,
authenticated Profiles access 200, logout 204 and subsequent revoked-session access 401. No token,
code, cookie value or provider secret was recorded.

The authenticated pass exposed a real hosted integration defect. Browser API calls carried the
session, but Next server rendering used an inherited project-level internal API base and forwarded
only a narrow cookie path, so protected Profile routes rendered `Unable to continue / Profile API
unavailable`. Revision `d35eed7e4b17d7bfeefbcf17548b9b70b680a7d0` now forwards the trusted
incoming Cookie and Vercel protection context, while the deployment explicitly selects the stable
Preview `/api` endpoint. The stable Preview alias now targets deployment
`dpl_Gs9Rf6P5fPJSxWyD6j2MFNtSXcif`; role remains `preview`, database identity remains
`preview:plum_duff_preview_cp028` and schema remains `account-access-v1`. Production aliases,
credentials and data were not touched.

An engineering diagnostic initially followed the legacy project-wide PostgreSQL URL rather than the
deployment's explicit CP-028 database name. Eight exact-prefix synthetic auth-session rows were
created in that legacy hosted database, then revoked and removed; post-cleanup count is zero. No
Profile or financial row was read or changed there. The lesson is retained as evidence that every
hosted diagnostic must assert the same safe database identity as the runtime before access.

The authenticated UI now renders Profiles, Profile Dashboard, Accounts, Standard, Multi-Lay and
Reports. Deterministic visual checks confirm the accepted Multi-Lay hierarchy, inline help,
same-level section bounds, paired semantic accents and no narrow/200%-text overflow. The serial
browser timings were Profiles 7.86s, Profile Dashboard 6.00s, Accounts 7.39s, Standard 5.98s,
Multi-Lay 4.53s and Profile Reports 7.05s, with no branded recovery event. These are slower than the
CP-028 shell/API baseline but remained practically interactive. The existing 600-row Sportsbook
boundary remains about 3.88s/1.30MB and stays recorded for pagination/capacity work.

The gate is not green. The production Reports page emits React error 185, `Maximum update depth
exceeded`, during the authenticated render. The hosted Playwright gate now treats React, hydration,
duplicate-key, unhandled and token/secret diagnostics as failures, so this defect cannot be hidden by
otherwise visible content. A separate four-worker broad run also saturated five functions to their
300-second limit (auth session, matched-betting preview, notifications, notification preferences and
exchanges); the later serial run recovered and the latest 100 deployment records contain 88×200,
2×204, 6×304, two expected 401 and two expected isolation 404 responses, with no 5xx or server log
error. The parallel result is retained as a hosted capacity finding rather than described as normal
single-user success.

Preview data remains synthetic-only: 66 Profiles (3 active/63 archived), 176 Accounts, 311 immutable
financial-history events and 91 source mappings. Direct authorization evidence proves an owned Cash
Adjustment 200 and the same ID under another Profile 404; Global Search, history and source identity
retain their Profile boundaries. Existing CP-028 database evidence still proves £6→£5 reports £5
once, immutable History retains both meanings, archive does not reverse P&L, retries do not duplicate
Cash Adjustments or awards, and imported identity is Profile scoped. The authenticated 22-item hosted
mutation set was stopped rather than over-claimed once the Reports diagnostic failed.

TypeScript passes, mypy is 0/82 and the production dependency audit is zero known advisories. The
latest deployment log sample contains no secret/token leakage. CP-028 database backup,
DB-unavailable readiness and restore evidence remain valid because the schema/database did not
change. The verdict is **PROTECTED PREVIEW: NOT READY**. Smallest next action: repair the bounded
Reports render loop, rerun the serial authenticated journey set, then assess the recorded parallel
capacity boundary before owner Preview smoke.

## Current CP-028 protected hosted Preview verification — 2026-09-21 13:02 BST

The frozen CP-027 normal-owner baseline remained available and healthy throughout. Hosted work used
an exact committed archive rather than the normal runtime or owner database. The live protected
deployment is `https://plum-duff-cp028-preview-homelab11.vercel.app`, Vercel deployment
`dpl_5BzzGWKe1Voi59Y7TdxaTcEFTrD3`, source `e6a42064d49b55a41470acc25f906890ab1cde51`
and target `preview`. No Production alias was changed. The app reports `preview`, PostgreSQL,
database identity `preview:plum_duff_preview_cp028`, fingerprint `c3b647ca129cf41c`, schema
`account-access-v1`, Preview endpoints/config source and the stable Preview OAuth callback. Both
root and API readiness are database-aware rather than process-only.

The hosted safety contract fails closed unless Preview supplies an explicit PostgreSQL target whose
database name matches its `preview:` identity, HTTPS endpoints, complete auth, source revision and
Preview environment. Focused isolation/readiness tests pass **20/20**; the combined
runtime/health/Vercel selection passes **34/34** after the bounded financial-retry repair. A missing
database produces 503 readiness, and role/database mismatches are rejected before normal operation.
The existing Vercel project still has legacy variables scoped broadly, so CP-028 supplies explicit
per-deployment Preview values; the runtime identity check prevents an inherited mismatched database
from being accepted. Production storage and normal-owner SQLite were never used.

The dedicated database was migrated from fresh state. The current migration hash
`76fade2854b9e88b0f2d9a7024c0c692c34d3e2e4c2815f7f6ba2147e42f49ec` is stable across the
intended repeat. During recovery rehearsal the dedicated Preview database alone was made
unavailable: readiness returned 503, it was recreated/restored, migrations were reapplied twice,
required history/identity tables returned and readiness recovered. The current-schema rollback
checkpoint is `preview-current-schema-20260921-124344-BST.dump`, SHA-256
`33071cdd3143a589c0525ec2e757513c1436619065f22b8783f3b55e6166cd3c`; its private path and
credentials are deliberately omitted.

Only deterministic synthetic data was seeded. After hosted write evidence the retained Preview has
66 Profiles (3 active/63 archived), 176 Accounts, 600 Sportsbook rows, 250 Free Bets, 150 Casino
rows, 102 Cash Adjustments, one Extra Place row, 311 history events, 91 Profile-scoped source
mappings and 52 notification events; duplicate history operation identities are zero. Same-Profile
imported lineage resolves without using native IDs as portable identity. The data is clearly
synthetic and safe to destroy. No local owner or Production data was uploaded.

Hosted correction rehearsal found and repaired a real boundary defect: the persistence layer had a
stable history operation identity, but Cash Adjustment HTTP/UI saves did not carry it. A lost
response could append duplicate correction evidence. `Idempotency-Key` now survives the browser/API
boundary, identical create/update retries return the established result, and changed contents under
the same key return conflict. Deployed replay proves one `created` plus one `corrected` event for a
single activity and current £5.00 after £6.00→£5.00; current reporting reads the £5.00 ledger state
once and does not ingest history as another transaction. Append-only UPDATE/DELETE enforcement
still rejects mutation. Focused history/identity/runtime tests pass **34/34**, mypy **0/82**,
TypeScript passes, the complete web unit suite passes **432/432**, and the deployed production graph
has zero known dependency advisories (Next 16.3.3).

Mature-data hosted measurements before the recovery cycle were: `/profiles` 2.12s/9.9KB,
Dashboard shell 0.50s/9.4KB, Reports shell 0.44s/9.7KB, Profile Dashboard 1.50s/10.8KB and Profile
Reports 1.11s/11.1KB. `/api/profiles` took 2.53s/17.3KB. A deliberately large 600-row Sportsbook
response took 3.88s and 1.30MB; that remains a capacity/pagination boundary, not a hidden PASS.
Archived Profiles did not recreate the CP-022 all-Profile request storm.

Application-owned hosted OAuth evidence passes initiation: Google is targeted with PKCE/state and
the exact callback
`https://plum-duff-cp028-preview-homelab11.vercel.app/api/auth/google/callback`; synthetic hosted
session persistence also passes. The deployment is protected and a genuine provider-owned sign-in
has not been observed. Guided Onboarding and the remaining authenticated hosted browser journey set
therefore cannot truthfully be marked hosted PASS yet. CP-028 stops at **OWNER ACTION REQUIRED**:
Will must verify/add that redirect URI in the Google OAuth client, open the protected Preview and
sign in once. Engineering then completes the defined hosted journey and responsive checks.

Resources are one Vercel Preview deployment plus one dedicated Neon/PostgreSQL database and its
private backup. They may consume the provider plans' deployment, compute, storage and transfer
allowances; no claim of zero cost is made. Teardown removes the Preview alias/deployment, dedicated
database and backup, losing only synthetic data/evidence. They are retained for owner inspection.
Production, its aliases/data, subscriber access and #96 rotation were untouched.

## Current CP-027 owner acceptance and frozen local baseline — 2026-09-21 10:44 BST

Owner acceptance is recorded separately from engineering evidence. Will visually accepted the
CP-023–CP-026 Multi-Lay/calculator presentation: shared Back/Lay bounds, inline heading/help,
paired semantic accents, financial result styling, conditional Effective Odds, separate detailed
Outcomes and secondary Advanced allocation. Will also completed a genuine fresh Google sign-in and
returned successfully to Plum Duff. PQA-J15 therefore moves from owner-pending to **PASS**; actual
VoiceOver spoken output remains PQA-J23 **UNVERIFIED / OWNER-MANUAL EVIDENCE REQUIRED**. The
canonical journey score is **23/24 (96%)**, comprising **22/22 engineering-controlled journeys
passing**, one provider-owned journey accepted by the owner and one remaining manual journey.

The owner-accepted application revision is `49b9af53cd84da48cdf0e8385edd48ab1779cb21`, containing
the committed CP-023–CP-026 source line. The normal contract is `normal-owner`, canonical local
SQLite, schema `account-access-v1`, frontend `http://localhost:3010` and API
`http://127.0.0.1:8010`. CP-027 adds records only; it changes no application source or owner data.

Focused final evidence passes: **67/67 API** authentication/session, immutable-history/report,
Account-access and eligibility tests; **432/432 web tests**; **14/14** isolated browser calculator
and shared-geometry tests; **2/2** focused stale-protected-request/Search and Quick Action browser
checks; TypeScript PASS; mypy **0/82**. The first browser command was deliberately rejected by the
auth-required normal runtime because it was not supplied the isolated test contract; no owner write
succeeded. The canonical rerun used explicit disposable storage and passed.

The normal database was then checked read-only. It remains at the CP-022 baseline: 42 Profiles
(3 active), 175 Accounts, 538 Sportsbook rows, 291 Free Bets, 90 Casino rows, 58 Cash Adjustments,
123 Extra Place rows and 305 immutable history events. `PRAGMA integrity_check` is `ok` and the
foreign-key check returns zero violations. No owner financial record or count changed.

This verification envelope proves the integrated local normal-owner application, canonical SQLite
data, local Google authentication, `account-access-v1`, reviewed calculator/ledger/report/recovery
workflows and owner acceptance for the named visual surfaces. It does not prove Vercel, Neon,
hosted OAuth, hosted rollback, Production or VoiceOver spoken output. Protected Preview remains
uncreated and requires separate approval.

## Current CP-026 calculator visual contract enforcement — 2026-09-19 12:41 BST

Owner-smoke findings PD-FIX-263–265 are repaired on the current normal-owner source without changing
calculator inputs, formulae, rounding, copy values, persistence or authentication. The visible help
defect came from two heading implementations: reference cards used a flex row, while the shared table
shell nested its title/help inside an unstyled block. `CalculatorSectionHeading` now owns both, plus
the embedded Sportsbook Multi-Lay Outcome/Result headings. Title and optional help remain one
non-wrapping, keyboard-accessible semantic heading row.

Multi-Lay's Back Bet was formerly in one calculator band while Lay Outcomes and later sections were
inside a second band/panel. They now share one `calculator-content-grid`; internal field/table columns
remain purpose-specific while the outer left/right bounds match. The accepted paired semantic rule is
retained: Back/Bookmaker uses `--back-panel-*`, Lay/Exchange uses `--lay-panel-*`, and neutral result
surfaces remain neutral. No one-off Multi-Lay border colour was added.

Rendered structural evidence passes at 1440px desktop, 720px half-width, 390px narrow and 200% root
text in both light and dark themes with reduced motion: heading/help centres align, flex remains
non-wrapping, Back/Lay bounds match to the rounded pixel, both semantic borders are present and no
page-level horizontal overflow occurs. Shared calculator Playwright is **4/4** and an isolated
authenticated Sportsbook embedded-calculator parity journey is **1/1**. Web tests are **432/432**;
TypeScript and mypy 0/82 pass; web lint has zero errors and retains eight pre-existing warnings.

Google authentication source was not changed. PQA-J15 remains **PARTIAL — OWNER INTERACTION
PENDING**. Hosted Preview remains paused.

## Current CP-025 owner-blocking local Google sign-in — 2026-09-19 07:57 BST

Owner evidence correctly reopened PQA-J15: a fresh sign-in on normal `localhost:3010` returned
HTTP 503 JSON `{"detail":"Unable to continue"}` from `/api/auth/google/login` before the browser
left Plum Duff. The exact branch was incomplete Google client configuration. The normal-owner API
was running the intended CP-024 worktree and canonical owner database, but `Settings` only looked
for `.env` in that worktree. The worktree has no private `.env`; the canonical private owner file
is in the primary checkout. `run-api-runtime.py` labelled an environment source without loading
one, leaving Google credentials, the session secret, owner allowlist and auth-required flag at
defaults. CP-023's session gate did not contribute: it only reads `/auth/session` after protected
page entry and never touches the login initiation/state cookie.

The role-bound launcher now makes the source real. Normal-owner uses the source checkout `.env`
when present, otherwise the primary checkout's private owner `.env`; candidate/test roles never
inherit that file and may only use an explicitly named alternative. The canonical owner database
also resolves from the primary checkout when an approved worktree supplies the code. Normal-owner
startup now fails closed unless authentication is required, an owner is allowed, the session
secret is at least 32 bytes and both Google client values exist. Safe health evidence reports role,
revision, database identity/schema, endpoint pair, environment classification, auth readiness and
callback URL without returning credentials or a private path.

Live 3010 evidence after repair: health is 200 as `normal-owner`, schema `account-access-v1`, source
`297cc470…+dirty`, environment `primary-checkout-owner-env`, authentication required/configured and
callback `http://localhost:3010/api/auth/google/callback`. Sign-in returns 302 to
`accounts.google.com`, supplies that exact callback, PKCE S256 and a fresh signed state, and sets a
local HTTP-only SameSite=Lax state cookie without `Secure` (correct for local HTTP). A headless
provider-boundary check reached Google's genuine **Sign in - Google Accounts** surface and found no
`redirect_uri_mismatch`. Hosted HTTPS cookie behaviour is unchanged.

State/PKCE evidence is held in the signed short-lived cookie; the application does not persist an
OAuth state row in the financial database. It consumes the browser state by deleting the cookie
on success or failure. A separate nonce is not applicable because the flow exchanges the code with
PKCE and reads Google's user-info endpoint rather than accepting an ID token. Fund-manager session
persistence remains database-backed and its disposable integration test proves the callback-created
cookie is readable through `/auth/session`. No duplicate live initiation/callback request was
observed; sequential callback replay is rejected.

Application-owned failure paths now redirect to the branded login panel for missing configuration,
invalid/mismatched/expired/replayed state, provider denial, missing code, token exchange, identity
lookup and local session-persistence failure. Raw provider/backend detail remains server-side.
Rendered desktop/narrow evidence shows the Plum Duff mark, concise safe error and retry link; the
CP-023 delayed branded session gate still passes 10/10 browser checks.

Evidence: focused auth/runtime/health **34/34**, full API **1,085 passed / 12 intentional skips / 0
failed / 0 errors**, auth/launcher **22/22**, web **432/432**, pre-auth Playwright **10/10**,
TypeScript PASS and mypy 0/82. A final fresh owner Google completion
is still required because engineering cannot supply or automate Will's provider interaction.
PQA-J15 is therefore **PARTIAL — OWNER INTERACTION PENDING**, not PASS. Hosted Preview remains paused.

## Current CP-024 Multi-Lay visual consistency correction — 2026-09-19 06:48 BST

Owner-smoke findings PD-FIX-258–260 are repaired locally without changing calculator inputs,
formulae, rounding, allocation or persistence. `Lay outcomes` and detailed `Outcomes` now share the
same `CalculatorTableSection` heading, radius, edge alignment and responsive shell while retaining
appropriate input/result surfaces. The 20-outcome limit and detailed scenario explanation remain
available through keyboard/click/touch `ContextHelp` rather than permanent header/preamble text.

Unmodified Back odds no longer produce a redundant Effective odds row. A modifier that changes the
price exposes a semantic label/value pair using the shared sportsbook two-decimal display rule.
Compact Result rows use label/value structure: lay stake and liability are neutral instructions or
exposure, while final outcome and summary positions use canonical positive/negative/zero financial
tones. Copy retains the exact governed numeric value.

Focused evidence: TypeScript and API mypy pass; the isolated calculator selection contains 12/12
standalone/shared checks passing. Four ledger-editor cases require their dedicated authenticated
fixture runtime and were not counted as calculator regressions. Rendered desktop, half-width,
narrow, 200%-equivalent reflow, light, dark and reduced-motion views were inspected with no page
overflow; Normal, Normal Underlay, Free Bet SNR, Profit Boost effective odds, 2/3-leg commission,
Custom allocation and Standard shared-shell regressions retain their existing arithmetic.

## Current CP-023 owner-smoke session, identity and Multi-Lay corrections — 2026-09-18 15:48 BST

The resumed owner smoke exposed three local acceptance defects tracked under existing #116, #35 and
#92. Hosted Preview remained paused. No calculation formula, schema, normal owner record or service
ownership boundary changed.

The protected shell performs one authoritative session request when it first mounts or refreshes.
Measured normal authenticated navigation did not repeat that request: first load was about 916ms,
refresh 420ms and a client route transition 363ms with zero session requests. The problem was the
initial fallback itself: it appeared immediately and reused an absolute ledger overlay without brand
or application context. The gate now delays visible fallback for 250ms, so a short successful check
does not flash a blank page. A noticeable check displays one compact Plum Duff-branded shared status;
existing authenticated route navigation retains the mounted shell, and unavailable/expired states
still retry or redirect without mounting protected content. Light/dark, narrow and reduced-motion
rendering, live status semantics and secure transitions pass.

The duplicate-key warning came from Account cash-health grouping, not from an Account uniqueness
constraint: records were grouped by Account ID but the rendered `<li>` key had been reduced back to
the display name. Tracker summary rows had the same latent name-key pattern. Both now carry and use
the canonical Account ID. A deterministic browser fixture renders two distinct Accounts with the
same `10Bet` label, selects and edits the correct first ID, removes the second ID and observes no
duplicate-key warning. The normal-data labels classify as distinct old synthetic fixture Accounts:
one earlier row and a later generated archived cluster. They were not deleted or merged because
display equality is not identity and historical ledger provenance still uses provider text in places.

Multi-Lay retains the independently tested `multi-lay-v2` engine, two-to-20 outcomes, per-leg
commission, exposure, penny placement and Standard/Underlay/Overlay/Custom allocation. Its default
information architecture now leads with **Normal**, **Normal Underlay** or **Free Bet SNR**, followed
by Exchange, Back Stake/Odds, compact lay inputs and a primary Result. Each result exposes outcome
name, liability, that outcome's final position and a directly copyable lay stake; total liability,
back/free-bet-loses position and lowest final position appear before the detailed Outcomes table.
The permanent Simple/Advanced Mode selector and large `Use X allocation` cards are gone. Profit
Boost/Money Back remain under `Reward modifiers`; validated allocation endpoints, Custom multiplier
and synchronised slider/input remain under one collapsed `Advanced allocation` disclosure. Opening a
disclosure does not mutate selection.

Focused evidence: session browser **4/4**, same-label Account identity **1/1**, Multi-Lay browser
**1/1**, shared Standard/calculator visual parity **1/1** and calculation API **17/17** pass.
TypeScript and mypy pass. Web lint has no errors and retains eight existing warnings; the separately
classified API Ruff maintenance backlog is still 200 findings. Rendered desktop, 390px, light/dark
and reduced-motion screenshots were inspected after animations settled. Normal `localhost:3010`
continues to use the `normal-owner` runtime and normal authentication; the disposable calculation API
used only explicit isolated storage. Owner smoke is ready to continue, while hosted Preview remains
paused. The closed audit coverage scorecard remains 87/87 assessments, 22/24 passing journeys,
27/27 reviewed competitor cells and 133/133 reconciled requirements.

## Current CP-022 owner stability and data-health gate — 2026-09-18 14:48 BST

GitHub #116 became owner-blocking after the normal Profiles page showed `3 / 66`, repeated Account
cash warnings and Dashboard reporting remained globally loading. Untouched authenticated baseline
measurement found Dashboard useful content at **10.448s** and reporting settled at **49.354s**;
Reports settled at **34.012s**. Each route made **78 API requests**, including **66 per-Profile
summary requests**, and transferred about **2.63 MB**.

The delay was cumulative load amplification, not one cosmetic loader: the browser requested a full
bundle for all 66 Profiles although only three were active; each summary fanned into nine readers;
SQLite initialised the complete schema on ordinary reads; and linked Free Bet response construction
opened another initialising connection per row. The UI then held the whole analytics surface inert
and rendered every blank Account cash observation as a critical repeated sentence with an internal
Account ID.

The repaired boundary requests active or explicitly visible/selected Profiles only. Read-only API
paths avoid schema initialisation, retain read-your-writes inside explicit mutations and remove the
Free Bet initialisation N+1. Optional reporting has its own loading/error boundary, leaving the page
shell usable. Account cash health now groups affected Accounts by user-facing name: malformed money
is an error, blank/not-recorded money is an incomplete-information warning, and missing freshness
evidence is not labelled stale without a governed threshold.

The 66 Profiles classified as **3 active owner Profiles** and **63 explicitly labelled archived
synthetic/test Profiles**. Of the archived set, 39 contain 167 financial rows and 305 immutable
history events and remain archived/protected. Twenty-four contained no financial rows or history.
The governed deletion plan was first executed on a fresh normal-data clone, preserving the owner
projection and all financial/history counts with `PRAGMA integrity_check = ok` and zero foreign-key
violations. After a fresh verified backup, the same 24 IDs were removed from normal-owner storage.
The resulting database has 42 Profiles (3 active owner, 39 archived protected synthetic), 175
Accounts, 538 Sportsbook rows, 291 Free Bets, 90 Casino rows, 58 Cash Adjustments, 123 Extra Place
rows and 305 history events. Owner IDs, active counts and representative financial projections are
unchanged.

Active owner cash evidence contains 76 Accounts: current balance is known for 23 and unknown/not
recorded for 53; pending withdrawal is known for 12 and unknown/not recorded for 64. There are zero
malformed stored money values. Fifty-seven Accounts lack a balance-observation timestamp; that is
missing freshness evidence, not automatically a stale value. The grouped default warning covers 15
cash-counting Accounts and exposes no raw internal IDs.

Three repeated authenticated post-repair runs produced:

- Profiles: useful **1.130–1.399s**, settled **1.940–2.822s**;
- Dashboard: useful **1.014–1.127s**, settled **1.825–2.433s**;
- Reports: useful **1.044–1.092s**, settled **2.453–2.530s**;
- every route: **15 requests**, **3 Profile summaries**, about **2.16 MB**;
- Profile switch **0.799s** and Global Search **0.314s** in the final stability run.

The byte reduction is deliberately modest because one populated active Profile owns most of the
valid report payload; the decisive scaling change is 66 summaries to 3. The deterministic mature
fixture represents three active plus 63 archived Profiles, 175 Accounts, 1,100 financial rows, 305
history events, 91 lineage rows and 52 notifications. It proves default active scope, deliberate
archived selection and visible-page loading without private data. Actual 3010 regression evidence
also passes keyboard disclosure, dark theme, reduced motion, 390px layout and 200% text without
page-level overflow.

Final normal data health is `integrity_check = ok`, zero foreign-key issues, zero orphaned resolved
lineage, zero duplicate history operation identities and both append-only history guard triggers
present. Reports continue to read current ledger meaning rather than history evidence; cleanup
removed no financial row and changed no owner financial projection. The audit coverage scorecard
remains 87/87 reviewed assessments, 22/24 passing journeys, 27/27 reviewed competitor cells and
133/133 reconciled requirements. Owner smoke is ready to resume; protected hosted Preview remains
paused and no hosted work occurred.

## Current CP-021 local audit closure and pre-hosted readiness — 2026-09-18 13:10 BST

The versioned local audit matrix is now fully reviewed: **87/87 assessments** have an explicit
PASS, PARTIAL, BLOCKED, UNVERIFIED or NOT APPLICABLE disposition. This is review coverage, not a
claim that every capability passes. Later evidence closes stale OPEN labels for authorised combined
cash, Search/Quick Actions, local crash/stale-response recovery and the calculator/bridge scope;
the remaining rows are truthfully bounded as local partials, hosted-only checks, owner/manual
evidence, external-provider interaction or deliberately deferred product scope.

The 27 competitor cells are also fully reviewed. The final evidence mix is **14 authoritative
documentation cells, 3 hands-on public cells and 10 reviewed-but-inaccessible cells**. Outplayed's
public calculator documentation confirms the Standard/Underlay/Overlay/Custom arrangement;
OddsMonkey documents mobile support and Profit Tracker integration, filters and drilldown. Exact
member keyboard, cash-correction and recovery interactions that cannot be reached publicly remain
UNVERIFIED rather than being inferred.

The canonical 133-request inventory is fully reconciled by linking the preserved original issue
index to the CP-021 disposition map in the request register. Implemented-local, owner-pending,
hosted-pending, partial, planned, deferred, superseded and source-unresolved states remain distinct.
The eighteen `PD-FUTURE-*` entries are reconciled as source-unresolved: their missing original text
is preserved as a gap and has not been reconstructed from numbering.

PQA-J15 and PQA-J23 remain the only non-PASS complete journeys. The application-owned Google path
passes initiation, callback configuration, state validation, denial, session creation/expiry and
recovery; one fresh provider-owned interaction is owner/manual evidence. Keyboard, semantic,
responsive, reduced-motion and error evidence is complete for the accessibility boundary, but
actual VoiceOver spoken output remains owner/manual and UNVERIFIED. The canonical score therefore
stays **22/24**, while **22/22 engineering-controlled journeys pass**.

#111 currently includes selected-range totals, accessible point inspection, reconciled-record
drilldown and retained return context. The approved next bounded slice is one period-P&L Reports
preset. A general metric/granularity/filter query model and saved explorer presets remain later
design work; daily/weekly/monthly/yearly semantics are not sufficiently specified for audit-closure
implementation and were not guessed.

Local security/recovery closure retains zero known production dependency advisories, fail-closed
runtime/database ownership, database-aware health, SQLite/PostgreSQL recovery evidence, session
recovery and stale-response protection. Vercel runtime security, Neon recovery, hosted OAuth,
hosted rollback and #96 provider credential rotation remain outside the local verification envelope.
The existing Vercel/Neon readiness contract now defines explicit Preview and Production roles,
isolated database ownership, observable revision/schema/config identity and a protected Preview
approval gate; no deployment or hosted migration occurred.

The 12 Ruff F811 findings are deliberate pytest fixture imports shadowed by test parameters. The
fixtures are selected by pytest and the affected broad suite is green; they are test-only style
debt, not evidence of selecting the wrong fixture. No mass Ruff cleanup was performed.

Focused closure evidence: **23/23 auth/runtime-health API tests** and **429/429 web tests** pass.
Normal `localhost:3010` remains healthy as `normal-owner` on `account-access-v1`. Coverage is now
**87/87 assessments reviewed (100%)**, **22/24 complete journeys passing (92%)**, **27/27 competitor
cells reviewed (100%)** and **133/133 requirements reconciled (100%)**. These are audit coverage
figures, not product-completion or owner/hosted acceptance percentages.

GitHub CP-021 summary sync remains pending for #114, #111 and #115. The already externally synced
CP-020 #114/#109 comments are not duplicated by this local checkpoint.

## Current CP-020 combined access/award, search and external-boundary closure — 2026-09-18 12:56 BST

PQA-J18 now passes through the real authenticated 3010 browser. A fresh six-sheet synthetic Profile
workbook imported #109 Status, Stake Access, Promo Access, structured restriction evidence and the
source activity; the restricted Account remained selectable with its warning, one award operation
created its child once across lost/concurrent retries, changed content conflicted, £7.18 settled P&L
reported once, and export→portable restore remapped native IDs while retaining logical lineage.
Two bounded defects found by this journey are repaired: unsupported imported report presets now fail
before writes, and timezone-aware Casino dates no longer break portable restore.

PQA-J16 also passes through the normal authenticated UI. A Profile Quick Action was saved, reopened,
used to prefill the existing Casino editor, validated, saved and removed; Profile ownership and the
combined Severely Limited/Promo Restricted explanation survived navigation. Global Search passes
exact/partial/no-result, keyboard selection, narrow layout and delayed-old-response ordering. Ordinary
search had exposed archived synthetic Profiles; it now excludes them at the API boundary and has a
focused regression. The protected synthetic Profiles were governed-archived after evidence.

Google OIDC initiation on the configured normal runtime targets Google with the expected callback,
minimal scopes and state cookie. Twelve auth tests cover callback success, allowlist denial, invalid
state, expiry, logout and local session recovery. A fresh provider-owned Google interaction is not
fabricated: PQA-J15 remains an external/owner boundary. VoiceOver is installed, but this environment
cannot capture or verify spoken output reliably; engineering keyboard/semantic evidence is complete,
while actual assistive-technology output remains owner/manual evidence under PQA-J23.

Ruff produced 208 findings at the CP-020 measurement point: 170 line-length, 25 import-order,
12 test-fixture shadowing and one ambiguous test variable. Eight bounded touched/test findings were
repaired; 200 remain (168 line-length, 20 import-order and 12 test-only fixture-shadow findings), with
no undefined-name or other demonstrated runtime-correctness finding. This is classified debt, not a
mass-formatting tranche.

The final ordinary regression gate is **1,074 API tests passed, 0 failed, 0 errors and 12 authorised
private-source skips = 1,086 outcomes**; web tests pass **429/429**, the new real-browser stale-search
regression passes, mypy reports 0 errors across 82 files and TypeScript passes.

Requirement reconciliation adds #48, #71, #76 and #77: current Quick Actions now surface Account
capability context, but the broader special-offer suggestion and linked risk-team/operator warning
scope remains partial; Global Search is the approved bounded navigation/Profile/catalogue surface,
not the full #76 command-menu roadmap; Profile Quick Actions preserve context but do not substitute
for the complete #77 multi-Profile opportunity workflow. #109 and award/import state are refreshed
from the combined evidence without being counted twice.

PQA-D09 and PQA-M09 are now assessed; PQA-J16 and PQA-J18 move to PASS. Coverage is **68/87
assessments (78%)**, **22/24 complete journeys (92%)**, **18/27 competitor cells (67%)** and
**77/133 requirements reconciled (58%)**. Competitor coverage is unchanged because no new qualifying
public evidence was established. These are audit-coverage figures, not product completion.

## Current CP-019 Account access, test hermeticity and journey closure — 2026-09-18 11:20 BST

#109 is integrated locally with separate Account Status, Stake Access and Promo Access ownership.
Stake uses Normal/Limited/Severely Limited/Blocked/Not Checked; Promo uses Full/Restricted/None/Not
Checked. Hard lifecycle, login, KYC and risk blocks win before access classifications. Structured
caps, restriction kind, promotion categories, evidence source/note and last-checked time remain
separate from the enums. Unknown import vocabulary is rejected for review; old workbooks remain
compatible. SQLite migration/repeat/rollback, PostgreSQL 18.6 and clone projections pass, and
import→reopen→export→portable restore retains the governed states and evidence.

The broad API suite is now hermetic and fully classified: the CP-018 result of **1,044 passed,
21 failed, 0 errors, 12 skipped = 1,077** becomes **1,070 passed, 0 failed, 0 errors, 12 skipped =
1,082** after five new regressions. The twelve skips are authorised opt-in private workbook/template
acceptance boundaries with documented inputs and commands; they are not ordinary CI dependencies.
The repaired families were fee-period setup, import contracts, XLSX round trips, SNR independent
references and isolated catalogue/backup/lookup cases. No private source was committed.

Guided onboarding now passes its canonical browser journey, including saved landing/reopen and one
shared confirmed-discard route from the navigation drawer. The deterministic 200-record browser run
proves request B survives delayed request A, a 503 is shown, focus recovery reloads B and old data
never repaints. #111 selected points now expose reconciled underlying records, Profile-scoped ledger
links and useful back-navigation context with keyboard/pointer parity. Module/metric/granularity
controls remain separately tracked future slices, not invisible additions to this journey.

Requirement reconciliation advances four further requests using current evidence:

| Request | Original outcome and later clarification | Current integrated state and evidence | Remaining gap |
|---|---|---|---|
| #78 | Govern the Casino wagering/EV calculator through its approved financial contract | Native Casino settlement, fee correction, History and reporting are exercised; this does not substitute for the separate full wagering/EV calculator | The approved calculator implementation and complete browser journey remain planned |
| #79 | Accept source-created offer intelligence with durable provenance and safe ingestion boundaries | Source namespace/provenance contracts and Profile-scoped imported identity are integrated and portable | No approved live source-ingestion workflow is implemented; unsafe scraping remains prohibited |
| #81 | Replace disruptive browser route guards with an in-application confirmation | Guided onboarding now uses the shared confirmation boundary and proves confirmed discard navigation in the browser | Other independently implemented browser-native guards, if found, remain separate consumers to migrate |
| #84 | Support multi-fixture and outright sportsbook offers without confusing them with Multi-Lay | Existing records and calculations were checked against the request boundary; Multi-Lay remains a distinct exchange allocation workflow | Dedicated multi-fixture/outright offer entry and settlement remain unimplemented |

PQA-J13, J22 and J24 move to PASS. PQA-J18 remains PARTIAL only because the newly approved #109
fields still need one combined authenticated multi-sheet browser import/award rerun. Coverage is
**66/87 assessments (76%)**, **20/24 complete journeys (83%)**, **18/27 competitor cells (67%)**
and **73/133 requirements reconciled (55%)**. Competitor coverage is unchanged because no new
authoritative public evidence was found. These are audit-coverage figures, not product completion.

## Current CP-018 reproducibility, Profile lifecycle and notification history — 2026-09-18 09:15 BST

The broad API baseline is now fully accounted for: **922 passed, 143 failed, 12 skipped,
0 errors and 0 expected failures = 1,077**. The twelve skips are explicit private-workbook/template
acceptance boundaries, not concealed failures. Explicit committed synthetic catalogue/tracker seeds,
fresh function-scoped databases and shared Account/Profile factories removed the largest hidden-state
family. The final broad run is **1,044 passed, 21 failed, 12 skipped, 0 errors and 0 expected
failures = 1,077**. Remaining failures group into fee-period fixtures (6), import contract drift (6),
XLSX round trips (2), independent SNR references (2), and five single catalogue/backup/calculator/
lookup/dry-run cases. Assertions were not skipped or weakened.

Profile lifecycle is PASS through create/populate, archive, active-navigation exclusion, retained
historical reporting, recover and permitted empty-Profile deletion; protected financial history is
not erased. Durable notification history is integrated locally using a bounded notification-event
store, separate from financial history. Source active→dismiss/reload→resolved retains the readable
event; exact retry creates one event and another viewer receives none. SQLite, PostgreSQL 18.6 and
a fresh normal-data clone passed before the additive normal-local table was initialised. Normal
3010 health, integrity and authenticated current/history endpoints pass.

Guided onboarding remains PARTIAL: seven of eight browser checks pass, including creation stages,
validation, catalogue authority, both themes, compact field geometry and cancel guard. Drawer
navigation after confirming discard still remains on `/profiles/new`; the canonical saved first
action/reopen step also remains unexercised. No PASS is claimed. #109 is revised but unimplemented:
Stake Access = Normal/Limited/Severely Limited/Blocked/Not Checked; Promo Access = Full/Restricted/
None/Not Checked; exact caps/categories, evidence source, notes and checked time are separate details.
`Minimum Only` and `Boosts Only` are restriction details, not top-level capability states.

Current coverage is **65/87 assessments (75%)**, **17/24 complete journeys (71%)**,
**18/27 competitor cells (67%)** and **69/133 requirements (52%)**. These remain audit coverage,
not product-completion percentages.

## Current CP-017 award, cash-reconciliation and Casino-fee package — 2026-09-17 15:59 BST

The three named normal-local journeys now pass on authenticated `localhost:3010`. PQA-J11 created
a fresh £10 split award (£6 SNR and £4 SR), reused one logical result after a lost response and
concurrent retry, rejected changed contents under the same identity, settled both children to a
combined £12.92, retained protected history, exported/restored the Profile and reopened both
children against the remapped native parent. A restored Sportsbook editor initially showed zero
children because it filtered on the retained legacy identity. PD-FIX-244 now consumes the proven
native parent first and never guesses missing, ambiguous or legacy-unresolved links.

PQA-J10 proves that Cash Adjustment reconciliation is a linked cash-movement control, not an
implicit Account-balance write: Bank A remains £200.00 while +£25 corrected to +£20 and a separate
£7 withdrawal report as net +£13. Exact retry creates one row; changed retry conflicts; malformed
money fails before write; History retains Created/Corrected. The prior duplicate create caused an
SQLite integrity failure and is repaired with exact-content idempotency plus cross-Profile/content
conflict rejection.

PQA-J08 proves the existing Casino activity fee boundary: £10 committed and £17 returned gives £7
gross; £1 costs gives £6 retained, then corrected £2 costs gives £5. Reports contain current £5
once; History contains Created/Corrected. Malformed or negative settlement money now fails before
write, and settled financial changes are labelled Corrected rather than Edited. Portable Casino
export now preserves the valid categorical `CashStake` wagering base instead of parsing it as money.

Focused API regressions pass 17/17, web unit tests pass 428/428, TypeScript and mypy pass, and the
complete CP-017 browser evidence is PASS. A deliberate broad API run passed 922/1,077 with 12
skips and exposed 143 historical setup failures still assuming implicit demo Profiles/catalogues.
The four current Casino cases were converted to committed synthetic setup; the remaining broad
fixture debt stays explicit and is not represented as product regression or a clean full suite.

PQA-F13 and PQA-F16 become assessed PASS; PQA-F17 changes from demonstrated failure to PASS.
PQA-J08/J10/J11 become PASS without changing their definitions. Coverage is **63/87 assessments
(72%), 15/24 complete journeys passing (63%), 18/27 competitor cells reviewed (67%) and 64/133
requirements reconciled (48%)**. Competitor coverage is unchanged because this package generated
no new authoritative external evidence.

Requirement reconciliation advances #64–#69 as one coherent platform/account-opportunity group:

| Request | Original outcome and clarification | Current local state / evidence | Remaining gap |
|---|---|---|---|
| #64 | One authoritative provider catalogue and compact ledger identity | Master catalogue, stable Account relationship and shared provider identity are integrated and regression-covered | Hosted/owner acceptance not inferred |
| #65 | Public product name Plum Duff while preserving compatibility safely | Public UI uses Plum Duff; internal OpenForge identifiers remain deliberately compatible | Any future rename beyond Plum Duff is deferred under #103 |
| #66 | Material navigation drawer with stable destinations | Authenticated drawer, bounded recent Profiles and canonical destinations are integrated and browser-covered | Wider command-menu scope is #76 |
| #67 | Govern public offer-source ingestion before implementation | Contract and fixtures define safe public-source provenance and prohibit unsafe scraping | Implementation remains planned; contract is not a live feed |
| #68 | Manual-first offer intelligence catalogue | Existing offer/account metadata are usable building blocks | Full reviewed offer catalogue and freshness workflow remain unimplemented |
| #69 | Connect welcome offers to Profile signup opportunity flow | Account signup-offer candidate rules exist with Profile-scoped eligibility | Complete guided first-action onboarding remains PQA-J13 PARTIAL |

The #109 vocabulary is decision-ready but remains unimplemented. Stake Access preserves
`Normal`, `Soft Limited`, `Heavily Limited`, `Minimum Only`, `Not Checked`, `Unknown`; Promo Access
preserves `Full`, `Some Promos`, `Boosts Only`, `No Promos`, `Unknown`. Exact stake caps remain
separate restriction detail, and lifecycle/login/KYC state remains Account Status.

## Previous CP-016 complete-journey and archive-reporting package — 2026-09-17

**Checkpoint timestamp:** 2026-09-17 14:46 BST

The frozen 24-journey denominator was converted into an explicit closure matrix below; its acceptance
steps were not expanded. Two journeys are newly complete. PQA-J06 passes the authenticated converted
SNR and retained legacy-SR route through copy, recorded placement, settlement, readable History,
Reports and reload. PQA-J09 passes native Extra Place create, actual win/place lays, settle £29.79,
Void £0.00, readable Created/Settled/Voided history and report reload. The run exposed and repaired a
real defect: a Void/NR change had been described as generic “Edited” history. The persistence boundary
now records `voided` with a factual reason; 8/8 focused API tests and the browser journey pass.

Archived Profiles now have separate navigation and financial-reporting semantics. Active Profiles are
the default selection for owner directory totals and combined analytics. Archived Profiles and their
settled history remain available only through deliberate selection; archiving never reverses P&L.
The rendered Profile lifecycle suite and chart suite pass 10/10. Governed synthetic browser data uses
disposable storage where possible; protected financial fixtures are clearly synthetic, archived after
execution, absent from normal navigation and excluded from ordinary active-only totals.

#111 point awareness is **implemented and integrated**, not merely planned. Selected-range points are
keyboard focusable and pointer selectable, expose date/value through an accessible name and visible
detail, retain selected-period consistency, and have a readable empty state. Record drilldown, module
filter and governed metric/granularity controls remain separate gaps.

Production dependency audit remains zero. Five high advisories are confined to ESLint development
paths: three through `minimatch@3.1.5 → brace-expansion@1.1.15` and two through
`@eslint/eslintrc@3.3.1 → js-yaml@4.3.0`. They do not ship in the production dependency graph. Current
direct ESLint/Next tooling is already supported/current in this source; forced transitive overrides
would bypass upstream compatibility ownership, so the bounded disposition is accepted development-
only risk pending upstream resolution rather than risky dependency surgery.

Coverage is **61/87 assessments (70%), 12/24 complete journeys passing (50%), 18/27 competitor cells
reviewed (67%) and 58/133 requirements reconciled (44%)**. Competitor review now records three
inaccessible public-evidence boundaries as reviewed/unverified; it does not claim those capabilities.
These are audit-coverage figures, not product completion or owner/hosted acceptance.

## Current CP-015 user-usable history, lineage and reporting slice — 2026-09-17

**Checkpoint timestamp:** 2026-09-17 13:33 BST

Normal `localhost:3010` was inspected through its authenticated frontend/API pairing before changes.
PD-QA-021 history existed only as API/database evidence and PD-QA-018 states were not presented in a
complete ordinary workflow. One shared read-only History panel now serves Sportsbook, Free Bet,
Extra Place, Casino and Cash Adjustment editors. It translates immutable events into action, local
time, reason and previous/current financial meaning without exposing raw JSON, hashes or IDs.

Imported Free Bets now show linked, missing, ambiguous and historical-evidence-insufficient states
in plain language. Explicit re-resolution lists only same-Profile Sportsbook candidates, requires a
choice when ambiguous, retains evidence and is retry-safe. It never guesses legacy links. A real
normal-schema browser run rendered the legacy state and explicit action, and a £6 Cash Adjustment
corrected to £5 showed both events while Reports contained one current Cash Adjustment row and no
£11 double count. Desktop 1440, half-width 760, narrow 390, light/dark, keyboard focus and reduced
motion passed. The shared editor wiring covers all five ledgers; the canonical end-to-end journey
count remains 10/24 because award-group, Cash Account reconciliation and Casino fee allocation gaps
still prevent honest promotion of the affected complete tasks.

The first approved #111 slice is integrated: selected-range chart points are keyboard-focusable and
clickable, with selected date/value shown visually and announced non-visually. Record drilldown,
module filters and governed metric/granularity controls remain planned. A lifecycle defect found
during cleanup is fixed: an archived Profile with retained financial history now receives a clear
409 refusal instead of an uncontrolled trigger error. Four retained synthetic Profiles remain
archived, excluded from normal recent-Profile navigation and clearly named; permanent deletion is
correctly blocked because their protected evidence must not be erased.

Supported security patches move Next/eslint-config-next 16.3.2→16.3.3, Vitest 4.0.4→4.1.11 and
sharp 0.35.3→0.35.4. Production dependency audit is zero; the full development graph retains five
high transitive brace-expansion/js-yaml advisories through ESLint tooling. Web unit 423/423,
typecheck, production build, API mypy 0/82 and the combined Profile/identity selection 31/31 pass.
The browser acceptance script passes; the build retains the known dynamic-filesystem tracing warning.

Official OddsMonkey documentation was rechecked for tracker logging and irreversible reset/history
behaviour. It strengthens an already-reviewed documentation cell but does not prove member-only
interaction, so competitor coverage remains 15/27. #13–#18 are now reconciled against their current
contracts: the Profile/Fund Manager foundation exists locally, while subscriber roles, routes,
invites and fee policy remain explicitly deferred. Coverage is **61/87 assessments (70%), 10/24
complete journeys passing (42%), 15/27 competitor cells (56%) and 51/133 requirements reconciled
(38%)**. These are audit-coverage figures, not product completion or owner/hosted acceptance.

## Current CP-014 normal-local migration and cutover — 2026-09-17

**Checkpoint timestamp:** 2026-09-17 12:20 BST

The owner-approved PD-QA-018 and PD-QA-021 migrations are now applied to the normal local SQLite
database. Writes were stopped first. A fresh readable rollback backup was taken at 12:02 BST with
integrity `ok` and SHA-256
`f9d0c6196bdd491e43bf63e3ffeb0e2b8f30272c69177746c178e0b5e62eab7e`. Before opening storage,
the fixed source identified itself as `normal-owner`, selected the canonical owner database and
reported source `279b1f9649d1a7ed280e51e70d7187df9f21ea4c`.

### Migration and existing-data result

- Health reports schema `import-history-v1`, normal-owner classification and the same safe database
  fingerprint through both API 8010 and the 3010 frontend proxy.
- Every old-column projection matched the stopped-write backup after migration. Original counts and
  IDs remain Profiles 3, Accounts 76, Sportsbook 508, Free Bets 231, Casino 62, Cash Adjustments 15
  and Extra Place 117; representative stored financial aggregates and all pre-existing summary
  source fields are unchanged.
- Migration created **zero** financial-history events. The 131 pre-existing Free Bets with supplied
  parent references are `legacy_unresolved`; no historical parent was inferred.
- Authenticated browser reads opened Dashboard, Accounts, Sportsbook, Free Bet, Casino, Cash
  Adjustment, Extra Place and Reports, including four representative existing editors and reload.
  No historical row was edited.

### Live normal-schema feature evidence

Three governed synthetic Profiles were created for the gate and archived afterwards; their
financially meaningful records were retained rather than physically deleted. Profile-scoped source
identity passed same-Profile resolution, identical retry, changed-retry rejection, cross-Profile
collision isolation, missing and ambiguous retention, explicit later re-resolution and portable
restore with remapped native IDs. The first restore attempt rolled itself back because the test
Profile lacked normal onboarding metadata; completing the synthetic fixture made financial,
operational and logical restore reconciliation pass. This was fixture setup debt, not an owner-data
failure.

Cash Adjustment, Sportsbook and Casino recorded append-only history. A synthetic Sportsbook result
settled at £6 and corrected to £5; current reporting returned £5 once while history retained both
states. A £10-out Cash Adjustment corrected to £5-in likewise reports current £5. Archive evidence
did not change the current row or P&L. Ordinary SQL UPDATE and DELETE of a history event were rejected,
the same operation identity produced one event, and settled Sportsbook deletion returned the
governed conflict. `tracker-summary-sources` contains no history collection.

The focused identity/history, portable-restore and health selection passes **16/16**. A final stopped-
write migrated baseline at 12:19 BST has integrity `ok`, schema `import-history-v1` and SHA-256
`b255c9aba6a9f51d5aa3bbb438a881e6ed0c94108d11e41ce33ce12d78293f02`; the pre-migration copy is the
rollback checkpoint. Normal 3010/8010 were restarted on the exact tested source and health pairing.

Coverage remains **60/87 assessments (69%), 10/24 complete journeys passing (42%), 15/27 competitor
cells (56%) and 45/133 requirements reconciled (34%)**. This gate integrates already assessed work;
it does not manufacture a new audit denominator or hosted/owner acceptance.

## Current CP-013 runtime-isolation safety gate — 2026-09-17

**Checkpoint timestamp:** 2026-09-17 08:15 BST

The CP-012 near-miss was reproduced as a configuration-ownership failure, not a lasting data
incident. Pydantic settings gave explicit `OPENFORGE_*` process variables precedence over `.env`
and defaults. The mistaken candidate restart supplied an absolute
`OPENFORGE_DATABASE_URL` for the normal owner file; the API had no runtime role, source-revision or
database-identity check before `connect()` initialised schema. `.env` discovery and relative paths
also depended on process working directory. Recovery evidence remains unchanged: the process was
stopped, additive objects were reversed and all old-table projections matched the safety copy.

### Repaired boundary and observable identity

Configuration now reads `.env` and relative database/backup/catalogue paths from the running source
checkout, not the current directory. The role-bound launcher declares source revision, purpose,
frontend/API endpoints, database engine/target, non-secret database identity and environment source.
Candidate/test launches without an explicit isolated target fail before startup; owner-file targets
are rejected. The same validation runs on direct read/write connections, covering scripts and
workers that do not start FastAPI. Normal-owner use remains deliberate and is restricted to the
canonical owner file; a non-primary checkout additionally needs its exact approved revision.

`/healthz` now proves database reachability and returns safe role/revision/engine/identity,
fingerprint, schema and endpoint data without credentials or sensitive target paths. Unavailable or
mismatched storage returns 503. A fixed detached build at
`c5ab904afb29487ebd03bc691f4f0ca8959602f8` reported candidate + isolated SQLite clone +
`import-history-v1`; an attempted candidate launch against the owner file failed before connection.

### Fixtures, database and regression evidence

- The four CP-012 failures were setup debt: three notification cases and one Sportsbook odds case
  lacked the Account/catalogue context previously supplied by private seed state. A committed
  synthetic factory now creates only `example.invalid`/Bookmaker A/Matchbook/Smarkets data. The two
  affected files pass 46/46; the combined financial/award/history selection passes **344/344**.
- Every API test session starts from a disposable copy of the committed synthetic seed with an
  explicit test role. Separate-process Blackjack workers carry the same contract; 19/19 pass.
- CP-012 SQLite identity/history/portable coverage is included in the 96-case focused safety set,
  which passes. Mypy reports **0 errors in 82 files**; changed/new files pass Ruff, while the existing
  repository-wide style backlog is not relabelled as this repair.
- Actual disposable PostgreSQL 18.6 at product `c5ab904…` again passes scoped identity retry,
  separate-process operation reuse, append-only UPDATE denial, current-£5 reporting and repeat
  migration. The cluster was stopped.
- A fresh clone of the normal database migrated twice with integrity `ok`; all old-column row
  projections and counts stayed unchanged (Profiles 3, Accounts 76, Sportsbook 508, Free Bets 231,
  Casino 62, Cash 15, Extra Place 117). Restore rollback retained no CP-012 table.
- The real normal database was inspected read-only at the end: the same counts, integrity `ok`, no
  `financial_activity_history` table and no `source_namespace` column. Its common ledger projections
  match the CP-012 safety copy. Fresh backup SHA-256 is
  `816de071fbcc674961177dce89df8ca93c76b2a8d4d2d3cced9d15e4f20e76f5`.

PQA-M06 is now **ASSESSED; PASS for the current migration/financial gate**. PQA-S09 becomes
**ASSESSED; PARTIAL**: runtime diagnostics and reviewed authentication/import errors avoid secrets
and raw database targets, but no central log retention/redaction policy or hosted log evidence
exists. This adds one assessed package without promoting a complete journey. Coverage is **60/87
assessments (69%), 10/24 complete journeys passing (42%), 15/27 competitor cells (56%) and 45/133
requirements reconciled (34%)**.

**Normal-local migration gate:** READY FOR APPROVAL. Current backup, runtime isolation, disposable
SQLite/PostgreSQL, fresh-clone repeat migration, rollback, public synthetic fixtures and unchanged
reporting-row projections all pass. The migration remains unperformed. Rollback is: stop the upgraded
API, verify and atomically restore the pre-migration backup, restart the last compatible approved
source, then verify runtime identity, integrity, counts and representative totals. Older source must
not write an upgraded database because schema-capability triggers deliberately reject it.

## Current CP-012 isolated identity and financial-history implementation — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 16:50 BST

PD-QA-018 and PD-QA-021 are implemented and tested on the isolated
`repair/import-history-012` application commit
`a4739301434a25e881ed168ae25982114c75b8ad`. They are **not migrated into the normal 3010
database**, main, Neon or Vercel.

### Import identity and recovery

The existing source map now keys logical records by **Profile + stable source namespace + external
ID**. Physical workbook sheet names remain provenance only. Identical retries and lost responses
reuse the existing mapping; changed contents under the same identity are rejected, including under
separate-process PostgreSQL concurrency. The same external ID in two Profiles creates two isolated
identities.

Imported Free Bets retain external parent identity, optional same-Profile native parent, explicit
`resolved`/`missing`/`ambiguous`/`legacy_unresolved`/`not_applicable` state and versioned evidence.
A later parent import does not silently relink a child; explicit re-resolution is required. Portable
export/restore remaps native IDs while preserving logical identity and unresolved evidence. Existing
unknown rows become `legacy_unresolved`; no historical link is inferred.

### Append-only financial history

One bounded history contract now covers Cash Adjustments, Extra Places, Casino, Sportsbook and Free
Bets. SQLite and PostgreSQL reject ordinary history UPDATE/DELETE. Profile-scoped operation identity
deduplicates the same event and rejects changed reuse. Versioned before/after snapshots retain the
governed row's calculation and financial fields; reports continue to read current ledger state and
do not sum history rows. The independent correction fixture proves current £5, not £15 or a movement
of -£5, while the prior £10 state remains evidence.

Cash Adjustments are not physically deletable. The other four ledgers allow physical removal only
for eligible non-financial drafts and retain a removal event; placed, settled or otherwise financial
records receive a controlled 409. This also repairs a real gap where an unlinked settled Free Bet
could previously be deleted. The shared contract prevents an `archived` event from implying a
financial reversal; these five ledger APIs do not currently expose a general archive operation, so
no unsupported archive UI is claimed. Existing rows receive a truthful `baseline_observed` only on
their first governed mutation; no fake past events or timestamps are created.

### Database and regression evidence

- SQLite/portable identity-history suite: **18/18 passed**; scoped safety/financial selection:
  **340 passed**, with four separate missing-demo-Profile fixture failures retained as PD-QA-006.
- Actual disposable PostgreSQL 18.6: logical identity, same-operation concurrency, changed retry,
  one-current-result reporting, append-only enforcement and repeat migration **PASS**; cluster stopped.
- Fresh clone of the normal SQLite database: all 65 old tables, three Profiles, IDs, row counts and
  financial projections unchanged; 131 existing parent references became `legacy_unresolved`, zero
  history events were fabricated, repeat migration and restore-based rollback passed.
- A brief normal-runtime path mistake applied the candidate migration to the normal file. The API was
  stopped immediately; the additive objects were reversed transactionally and every old-table data
  projection matched the safety backup. Normal 3010 now runs the CP-011 API with integrity `ok`; no
  CP-012 table remains. This exposes a portability risk in worktree-relative database selection.
- Changed source passes focused mypy (8 files), F/E9 lint and PostgreSQL harness checks. Older broad
  seed-dependent failures remain test-infrastructure debt and are not weakened or called product
  failures.

PQA-M04 is now **ASSESSED; PASS for isolated SQLite/PostgreSQL/clone migration and rollback, PARTIAL
for operational/hosted deployment**. PQA-D08 and PQA-D11 move from proven gaps to **repaired on the
isolated candidate**, but their full browser journey and normal integration evidence remain partial;
no journey numerator changes. Current coverage is **59/87 assessments (68%), 10/24 complete journeys
exercised/passing (42%), 15/27 competitor cells (56%) and 45/133 requirements reconciled (34%)**.

The detailed contract and rollback boundary are in the existing
[Profile decisions record](../planning/openforge-profile-decisions-to-confirm.md#cp-012-isolated-implementation-result).
Live issue synchronisation remains pending because publication is forbidden and authenticated GitHub
CLI access is unavailable.

## Current CP-011 schema-decision and independent audit package — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 15:37 BST

PD-QA-018 and PD-QA-021 remain **PROPOSED — NOT IMPLEMENTED — OWNER APPROVAL REQUIRED**. Their
owner-readable fields, examples, constraints, lifecycle, migration, export/restore and rollback
semantics now live in the existing
[Profile decisions record](../planning/openforge-profile-decisions-to-confirm.md#cp-011-owner-schema-decisions).
No schema, application data or normal service configuration changed.

### Remaining ledger traceability

Source and current contract review now covers every present financial-ledger deletion boundary:

| Area | Current correction/archive evidence | Current deletion evidence | Disposition |
|---|---|---|---|
| Profile | Archive keeps ledgers and audits readable; restore exists | Permanent owner deletion has a separate Profile deletion audit and explicitly erases Profile-scoped data | Adequate for current explicit Profile lifecycle; not a normal ledger-delete model |
| Account | Archive updates the live row and writes `account_audit` | Normal UI/API does not physically delete the Account | Adequate traceability for the current archive workflow |
| Fee periods | Immutable numbered revisions and withdrawal links survive correction/reopen and portable export | No ordinary destructive fee-period delete path | Adequate for the tested revision workflow |
| Sportsbook | Updates and specialised reminder/award actions write row-bound audit | Ordinary unprotected deletion writes `deleted`, then removes the audit rows and live row | History loss; wait for PD-QA-021. Protected award sources are correctly denied |
| Free Bet | Updates/reminders write row-bound audit; eligible linked-child removal copies evidence to its source audit | Standalone/unlinked deletion removes the child audit and live row | History loss; linked award handling is a useful special case, not a general solution |
| Cash Adjustment | Edits write row-bound audit; linked fee withdrawals are protected | Delete explicitly removes audit and live row | History loss; wait for PD-QA-021 |
| Extra Place | Updates write row-bound audit; settled delete requires a reason | Live-row deletion cascades the just-written deletion audit | History loss despite the reason; wait for PD-QA-021 |
| Casino | Updates write row-bound audit | Delete explicitly removes audit and live row | History loss; wait for PD-QA-021 |

No safe source-only repair can retain evidence after the owning row disappears: the necessary
boundary is the unimplemented append-only store. This completes PQA-D11 as an **ASSESSED FAIL / PROVEN
source boundary** rather than leaving it unexamined. It also broadens PD-QA-021's initial consumer
list to Sportsbook and standalone/unlinked Free Bets; Accounts, Profiles and fee revisions do not
need to be forced into the new table.

A combined legacy-ledger test selection produced **25 passes / 37 fixture failures**. Every failure
shown used the removed private `profile-demo-001` seed or dependent catalogue rows; this is retained
PD-QA-006 test-infrastructure debt, not relabelled as 37 product failures. The already-independent
CP-004 browser/API evidence remains valid. No assertion was skipped or weakened.

### Reporting / #111 current boundary

The current implementation has selected-date-range Profile and combined totals, module and bookmaker
breakdowns, weekly/monthly/yearly formal report tables, period/result filters, readable loading/error
cells, empty-table messages and links from summary values to the relevant ledger. The independently
expected CP-005/006 arithmetic evidence remains valid, and the focused current summary, dashboard,
cross-Profile and formal-filter suites pass **38/38**.

The Selected Range chart is still a static `role=img` with a readable text summary. It has no
focusable data points, point inspection/pinning, record-aware drilldown or selected-point state.
Existing formal-report period filtering is not a chart module/dimension filter. Weekly/monthly/yearly
tables exist, but the chart's financial metric and granularity are not selectable. Empty and failed
tables have explicit text; the chart does not yet provide the complete interactive no-data/error
model required by #111. The smallest later implementation slice remains one keyboard-focusable
selected-range P&L series with text-equivalent point details and a governed link to the filtered
records. No #111 feature was invented in this checkpoint.

### Competitor recovery/history review

Current public official sources were deliberately rechecked on 2026-09-16. Outplayed documents a
member Profit Tracker with filters, graph, editable profits, calculator handoff and a separate
Balance Sheet, but public material does not establish history restoration; member behaviour remains
inaccessible. OddsMonkey documents an explicit destructive “Delete All Entries” reset that cannot
be undone; it is documentation evidence, not a performed reset or restoration test. MBB's public
calculator remains accessible, but an authoritative public financial-history/export/recovery
equivalent remains unlocated. PQA-C06 is therefore now **ASSESSED; DOCUMENTED/BLOCKED**: the available
evidence and exact inaccessible limits are known, while the two member/equivalent cells remain
UNVERIFIED. No new capability×provider cell is promoted, so competitor coverage remains 15/27.
Outplayed's current public Pro Data page additionally documents expected-versus-actual views and
tool/bookmaker filters. That refresh strengthens the already-counted Outplayed C04 documentation
cell; it is not relabelled as member interaction or counted a second time.

### Requirement reconciliation

The CP-011 coherent request group is recorded in the canonical register: #4, #9, #10, #11, #19,
#22, #24 and #107. The implemented local shell, Profile isolation, reports and workflows are matched
to their original requests; remaining hosted, interactive-report, fixture-isolation and durable
history gaps stay explicit. Review remains distinct from implementation, local integration, hosted
verification and owner acceptance.

Current coverage is **58/87 assessments (67%), 10/24 complete journeys exercised/passing (42%),
15/27 competitor cells (56%) and 45/133 requirements reconciled (34%)**. PQA-D11 and PQA-C06 are
the two newly evidence-complete assessments; no journey is promoted.

Live #12/#80/#111/#114 issue-comment synchronisation is pending because the repository's
authenticated GitHub CLI is unavailable in this worktree. The canonical register and this section
are the local authoritative handoff; no issue was closed or its status changed.

## Current CP-010 engineering debt, recovery and schema-decision package — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 15:22 BST

The integrated local application remains healthy at `localhost:3010`; the normal API remains on
`localhost:8010`. Normal data was not edited. The local SQLite backup and its recovery clone both
have SHA-256 `db31fa8c8434d3b13f9bc38d0cba34b1855ddcdffff07857b309ba544fa22f87`, and
Profile identity and API-response checksums were unchanged across the isolated API restart.

### Engineering debt and recovery evidence

Early Payout mypy debt reduced from the original **39 errors in seven files**, through **22 errors
in one file at CP-009**, to **0 errors in 78 source files**. The repaired annotations narrow
validated optional odds, give heterogeneous outcome tuples their real shape and keep Decimal sums
Decimal-valued. The equations and rounding policy did not change; 10/10 focused Early Payout tests
and the final combined relevant API/calculator/health/authentication run passes 147/147.

The web unit suite is now **420/420**. Its sole blank-input failure mixed two contracts: a missing
required amount should produce a field-specific required message, while malformed non-empty text
should produce an invalid-number message. The fixture and regression now test those states
separately. Two fresh-database calculator failures were also test-fixture debt: they assumed the
removed private demo Profile. They now use the canonical synthetic Profile/Account factory.

Recovery was exercised against an SQLite backup clone. Frontend and API restarts retained the same
data and identifiers. An isolated unavailable-database probe found that the local health endpoint
could return healthy without opening its selected database. It now performs a real `SELECT 1` for
every configured backend and returns a generic 503 when unavailable; the failed probe made no
write, and the same clone reopened unchanged. This is local reliability evidence, not hosted
disaster-recovery proof.

VoiceOver is installed and accessibility UI scripting is available. VoiceOver could be started,
but this environment exposes neither a reliable spoken-output stream nor an observable application
reader session. **VOICEOVER — UNVERIFIED.** Automated semantics remain evidence for their own
boundary and are not relabelled as a reader pass.

### PD-QA-018 decision pack — PROPOSED / NOT IMPLEMENTED / OWNER APPROVAL REQUIRED

**Current deficiency.** `import_source_records` is globally keyed by source sheet and external ID,
while an imported Free Bet retains an external qualifying-bet ID but no Profile-scoped resolved
Sportsbook identity. Thus `SB-001` in Profile A and Profile B cannot be represented safely, and a
missing or ambiguous parent cannot be distinguished from an unattempted lookup.

**Recommended smallest-safe model.** Rebuild the existing source-identity key rather than create a
second mapping store, then add explicit resolution fields to imported Free Bets:

| Field | Type / nullability | Purpose and scope | Constraint / index |
|---|---|---|---|
| `import_source_records.profile_id` | text, non-null | Owns the external identity | Composite primary/unique key member; Profile FK |
| `source_sheet` | text, non-null | Source namespace/type | Composite primary/unique key member |
| `source_record_id` | text, non-null | Original external ID | Composite primary/unique key member |
| `import_run_id` | text, nullable | Modern retry/import provenance; legacy batch remains | Indexed with Profile where used for retry |
| `free_bets.origin_qual_bet_source_namespace` | text, non-null, default empty | Namespace of the retained external parent ID | Validated with resolution state |
| `origin_qual_bet_native_id` | text, nullable | Resolved native Sportsbook parent | Composite same-Profile FK; `ON DELETE RESTRICT` |
| `origin_qual_bet_resolution_state` | constrained text, non-null | `resolved`, `missing`, `ambiguous`, `legacy_unresolved`, `not_applicable` | Check constraint and state index |
| `origin_qual_bet_resolution_json` | versioned JSON text, non-null | Candidate IDs, evidence, mapping version and review reason | Server validated; never used as the native key |
| `origin_qual_bet_import_run_id` | text, nullable | Links the resolution attempt to its retry/import operation | Profile-scoped lookup index |

Source mappings are written first inside the import transaction. Lookup is strictly
`profile_id + namespace + external ID`: one candidate resolves, none becomes `missing`, and several
become `ambiguous` with null native ID. A retry uses the stable import/source identity and cannot
duplicate or silently relink a resolved child. A parent appearing later requires an explicit
re-resolution action; reads never guess. Existing rows become `legacy_unresolved`, with no invented
backfill. Export retains the external identity and resolution evidence; restore remaps a native ID
only when its parent is restored inside the same Profile. The UI shows the linked parent,
“Parent not found”, or “Several possible parents — review required”. Rollback retains the new data;
older write code must be read-only for this boundary or receive a forward fix rather than dropping
columns.

| Example | Result |
|---|---|
| One same-Profile parent | `resolved`; native and external IDs retained |
| Same external ID in two Profiles | Two independent Profile-scoped mappings |
| Missing parent | `missing`; null native ID; evidence retained |
| Two candidate parents | `ambiguous`; null native ID; candidate IDs retained |
| Portable restore | Profile/native IDs remapped together or state becomes explicitly unresolved |

### PD-QA-021 decision pack — PROPOSED / NOT IMPLEMENTED / OWNER APPROVAL REQUIRED

The current Cash Adjustment, Extra Place and Casino audit tables reference the live business row
with cascading deletion; two delete paths also remove audit rows explicitly. Extending each table
would require three divergent rebuilds and would still bind history to a deletable owner. The
recommended bounded design is one append-only `financial_activity_history` table—not a general
event platform:

| Field | Type / nullability | Purpose / constraint |
|---|---|---|
| `history_id` | text UUID, non-null | Immutable primary key |
| `profile_id` | text, non-null | Profile FK with restricted deletion; all reads Profile-scoped |
| `ledger_type`, `activity_id` | constrained text, non-null | Stable ledger/entity identity; deliberately no FK to a deletable row |
| `operation` | constrained text, non-null | `create`, `edit`, `settle`, `correct`, `void`, `archive`, `remove`, `reverse` |
| `occurred_at` | UTC timestamp, non-null | Server-owned event time |
| `schema_version` | integer, non-null | Snapshot contract version |
| `before_snapshot_json`, `after_snapshot_json` | validated JSON, non-null | Immutable before/new state; JSON `null` where inapplicable |
| `reporting_effect_before_json`, `reporting_effect_after_json` | validated JSON, non-null | Explicit governed financial effect, not a second ledger total |
| `source_identity_json`, `provenance_json` | validated JSON, non-null | Source/import/relationship evidence |
| `reason` | text, non-null, default empty | User/system reason where available |
| `actor_type`, `actor_id` | constrained text non-null / text nullable | Known human/system origin without inventing identity |
| `operation_id` | text, non-null | Retry identity; unique with Profile |

Indexes cover `(profile_id, ledger_type, activity_id, occurred_at)` and
`(profile_id, occurred_at)`; database rules reject updates/deletes. Create/edit/settle/correct each
append before/after evidence while the current row and report use only current governed state.
Correction changes current truth and preserves the prior value. Void/archive/removal hides or
removes the current row only where policy allows and applies an explicit zero/reversal reporting
effect; history survives and is never counted as another financial event. There is no guessed
backfill for already deleted rows; an existing live row receives its first snapshot on its next
governed mutation. Portable export/restore carries events, remaps the Profile and preserves event,
activity and operation identities. Growth is one bounded record per mutation. Rollback retains the
table and requires old code to be read-only for governed ledgers or a forward fix.

PD-QA-018 answers **which external/native record this belongs to**. PD-QA-021 answers **what
happened to a financial record over time**. They may share Profile, activity and import identifiers,
but neither schema depends on the other.

### Requirements and competitor evidence

Five further requests are reconciled without confusing review with implementation: #20 local
database/backup readiness, #38 Early Payout and advanced calculator scope, #81 in-app confirmation
dialogs, #83 Profit Boost source/helper behaviour and #112 shared odds normalisation. Their current
local evidence, remaining UI/ledger gaps and hosted/owner limits are recorded in the canonical
register. Requirements coverage is now **37/133 (28%)**.

Current official public Outplayed and OddsMonkey material was rechecked for reporting, tracker
reset/history and account continuity. It clarifies documented behaviour but does not establish a
new hands-on capability/provider cell or source-independent restore/history flow. MBB member-only
behaviour remains inaccessible. Competitor coverage therefore remains honestly **15/27 (56%)**.

Current coverage is **56/87 assessments (64%), 10/24 complete journeys exercised/passing (42%),
15/27 competitor cells (56%) and 37/133 requirements reconciled (28%)**. These are audit-coverage
figures, not product-completion percentages.

## Current CP-009 accessibility, persistence and recovery package — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 14:54 BST

The integrated local application remained healthy at `localhost:3010`; its normal web/API
processes and database were not changed by the isolated probes. VoiceOver is installed and macOS
accessibility scripting is enabled, but this environment could not capture or verify the reader's
spoken output through a complete application flow. Actual screen-reader behaviour therefore remains
**UNVERIFIED**. It is not replaced by DOM or automated accessibility assertions.

### Accessibility, settings and session recovery

All **12/12** isolated browser checks passed against a live temporary web/API pair: light/dark
ledger and toast contrast, protected-shell settlement, expired-session denial, neutral public error
states, inactivity warning, cross-tab logout, stale logout/401 recovery and optimistic Auto Logout
failure rollback. The required-storage notice mixed viewport-width sizing with the narrower document
content box; its shared CSS now uses the same containing-block boundary and the rendered 390 px
screen is centred without clipping. The session-resume regression now models the real blur→focus
transition rather than dispatching focus while the page was never inactive. Existing
CP-004 keyboard, modal, 200% text, narrow reflow, target, error and reduced-motion evidence remains
valid for unchanged code. PQA-F20 is now an evidence-complete **PARTIAL** assessment; PQA-J23 stays
PARTIAL rather than entering the passing numerator.

| Setting | Scope | Storage owner | Reload / new session | Missing, stale or malformed state |
|---|---|---|---|---|
| Theme | Browser-global | `openforge-theme` local storage | Survives navigation/restart in that browser | Only `light`/`dark`; otherwise dark |
| Back/lay colour treatment | Browser-global | `openforge-back-lay-theme` local storage | Survives navigation/restart | Only Smarkets/Betfair choices; otherwise Smarkets |
| Each Way presentation | Browser-global | `plum-duff-each-way-presentation` local storage | Survives navigation/restart | Only supported modes; otherwise Extra Place |
| Financial motion | Fund Manager account | API/database preference | Survives reload/login; optimistic failure rolls back | Server supplies bounded defaults |
| Auto Logout | Fund Manager account; local fallback only when server use is unavailable | API/database, or email-keyed local storage fallback | Survives reload/login in configured mode | Normalised to off/30 minutes; session lifetime remains server-owned |
| Ledger collapse/filter/view | Profile + ledger + browser | Profile-keyed local storage | Survives route/restart for that Profile | Booleans are validated; JSON state parses safely but consumer shape validation varies |
| Guided entry | Profile + browser | Profile-keyed local storage | Survives route/restart for that Profile | Unsupported value becomes `on` |
| Blackjack draft hand | Authenticated browser session | session storage | Survives navigation, not a new browser session/logout | Invalid snapshot is ignored; it is not business settlement state |

The distinction is intentional: presentation belongs to the browser, Profile workflow views are
Profile-keyed, financial motion and Auto Logout belong to the signed-in Fund Manager, and the
server session lifetime is not a UI preference. The historical report of “Auto Logout off but
session expired quickly” was not reproduced and remains historical/unreproduced, not disproved.

### Static analysis and regression boundary

API mypy reduced from **39 errors in seven files to 22 errors in one file**. Clear narrowing/type
errors in Account, Sportsbook, Free Bet, Casino and calculator integration paths were corrected
without changing their contracts. All 22 remaining errors are the pre-existing Early Payout typing
cluster and remain tracked debt. The selected API run produced 244 passes and 32 failures caused by
the already-recorded removed-demo-Profile fixture dependency; focused atomic/current-value paths in
that run passed. Web unit evidence remains 419/420 with the existing blank payout-input expectation.
No assertion was weakened.

### Decision-ready storage boundaries — PROPOSED / NOT IMPLEMENTED

**PD-QA-018 — Profile-scoped imported parent identity.** Rebuild the existing
`import_source_records` key as `(profile_id, source_namespace, external_source_id)` and retain the
existing source hash/entity mapping plus nullable `import_run_id`. Add to an imported Free Bet the
nullable resolved native Sportsbook ID, a constrained state
`resolved|missing|ambiguous|legacy_unresolved|not_applicable`, and versioned provenance containing
candidate IDs and the import/retry operation. One same-Profile match resolves; the same external ID
in another Profile is a different key; zero or multiple matches remain explicit review states.
Portable export carries both external identity and resolution evidence and remaps only a resolved
native ID. Existing rows receive no guessed backfill. A code rollback must preserve the added data;
dropping columns or the rebuilt key is not an acceptable rollback.

| Import case | Stored result |
|---|---|
| One same-Profile Sportsbook parent | `resolved` plus that native ID and retained external ID |
| Same external ID in two Profiles | Two independent Profile-scoped mappings; never a cross-link |
| No same-Profile parent | `missing`, null native ID and retained provenance for review/retry |
| Multiple same-Profile candidates | `ambiguous`, null native ID and candidate IDs in provenance |
| Portable Profile restore | External identity retained; resolved native ID remapped only inside the restored Profile |

**PD-QA-021 — durable financial activity history.** Existing ledger audit rows cannot safely own
this because their foreign keys cascade and Cash/Casino deletion removes them. Add the previously
specified append-only `financial_activity_history` record: Profile, ledger/type, record/source
identity, `create|settle|correct|archive|remove|reverse` operation, event timestamp, actor/source,
reason, schema version, immutable before/after snapshots, reporting values and unique Profile-scoped
operation ID. It deliberately has no foreign key to the deletable row. Current ledger screens show
current state; history shows the immutable sequence; reports use the governed current/reversal
treatment and do not count the history snapshot as a second financial event. No backfill is
invented. Code rollback disables new writes but retains stored history.

| Stage | Current ledger | History | Report treatment |
|---|---|---|---|
| Create | Live row | Immutable create event | Current governed value only |
| Settle | Settled row | Settle event with before/after | Settled P&L once |
| Correct | Corrected row | Correction event preserves prior value | Corrected current P&L; prior value is evidence, not another total |
| Archive/remove | Hidden or absent where policy permits | Archive/remove snapshot survives | Governed exclusion/reversal is explicit; history is never silently counted |

Both designs are **PROPOSED — NOT IMPLEMENTED — OWNER APPROVAL REQUIRED**. No schema was changed.

### Requirements, competitors and portability

Six further requests are reconciled from their original issue text and current evidence: #60
shared ledger/modal WCAG review (implemented/scoped evidence, not blanket compliance), #61 guided
entry (implemented core preference; several named paths remain), #62 optional Google OIDC (normal
local flow exists; provider callback and hosted path unverified), #63 verified local backup (local
SQLite and disposable PostgreSQL recovery proven; encrypted cloud recovery unverified), #75 Neon
cutover (planning and isolated PostgreSQL evidence only; runtime cutover deliberately absent), and
#101 local service handoff (3010/8010 healthy; process lifetime still operational evidence, not a
guarantee). Public competitor material added useful evidence but no new matrix cell: Outplayed
documents browser/account tracking and a separate balance sheet; OddsMonkey documents destructive
Profit Tracker reset, not restoration; MBB member history/settings remain unverified.

The existing OAuth deployment guide now contains one non-secret configurable local runtime
contract covering web/API endpoints, database selection, OAuth origin, environment-variable names,
startup, health and test isolation. Fixed helper ports, macOS/Rosetta Python discovery and provider
coupling remain portability concerns.

Current coverage is **56/87 assessments (64%), 10/24 complete journeys exercised/passing (42%),
15/27 competitor cells (56%) and 32/133 requirements reconciled (24%)**. Newly completed assessment
row: PQA-F20. PQA-U08 and the actual screen-reader pass remain UNVERIFIED. No hosted, owner or whole-
platform acceptance is inferred.

## Current CP-006 reporting, notification and security/reliability package — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 14:02 BST

Application and reusable audit-harness checkpoint:
**87d5e103b0c283d269ebd6cc78987433963433eb** on the local integration branch. The normal local
application remained available at `localhost:3010`; synthetic CP-006 Profiles were removed by the
harness. Main/origin, Vercel and owner acceptance are unchanged.

### Reporting and #111

An authenticated synthetic Profile contained independently expected settled values of Sportsbook
£2.20, Free Bet £7.40 and Casino £1.90, plus a −£4.00 Cash Adjustment. The Profile report agreed at
**£11.50 gross / £7.50 retained** through Today/All Dates and reload. Module and bookmaker breakdowns,
keyboard access to the range control and a two-Profile selected total of **£14.60** passed. The
selected-range chart exposes an accessible textual point summary (`2026 Q3: £11.50`) and its
no-points fallback is implemented, but it is a single `role=img` SVG: there are no focusable points,
inspection/pinning, record drilldown, metric/granularity control or module filter. PQA-U11 is now an
evidence-complete FAIL assessment and PQA-J22 remains PARTIAL. The smallest #111 slice remains one
point-aware P&L series with pointer/keyboard detail and a link to the contributing period/records;
it should reuse the existing range source before adding more metrics.

### Notifications — current display, clearing and history are different states

A genuine part-laid Sportsbook row produced exactly one Profile-scoped notification and the correct
row link. Repeating the active reminder returned 409, a foreign-Profile update returned 404 and a
placed source deletion returned 409 without removing financial activity. Clearing passed browser
reload and left its durable viewer tombstone. Resolving the source then replaced the generated event
with a new current-state notification: the earlier cleared row disappeared from Notification
History while its tombstone remained. This proves #99 clearing reliability and the #90 failure
boundary independently: current source projection plus clear tombstones is not durable event
history. PQA-F21 is assessed FAIL/PARTIAL; PQA-J17 stays PARTIAL. #100's layout implementation and
existing focused visual evidence are unaffected, but owner/hosted acceptance is not inferred.

### Security and reliability

`pnpm audit --json` still reports 3 critical, 13 high and 4 moderate entries. Installed versions are
Next 16.3.2, sharp 0.35.3 and Vitest 4.0.4. The official-maintainer minima retained by #115 are Next
16.3.3 for the AVIF/Windows advisories, sharp 0.35.4 for its bundled HEIF advisories, and **at least
Vitest 4.1.11**, because the newer mocker/path advisory supersedes the earlier 4.1.0-only minimum.
The local optimiser remains anonymously reachable: a benign local PNG request to `/_next/image`
returned 200 and 28,073 bytes. Local macOS does not meet the Windows-hosted Next condition. No
Vitest UI/API server or browser mode is configured/observed. Hosted OS, image-input trust and
deployment exposure remain UNVERIFIED, not cleared. The smallest remediation is a separately
authorised lockfile update to those supported minima or later compatible versions, followed by
auth/proxy, image, calculator/FinancialValue, modal and import/restore regressions. #96 remains the
separate owner/provider credential rotation.

Authentication/owner guards and safe database-error classification passed 17 focused API tests;
web session and notification state passed 19 focused tests. A broader 65-test API selection yielded
55 passes and 10 **fixture/setup failures** caused by older tests expecting removed demo Profiles,
not security assertions. The full web unit run yielded 419 passes and one existing blank-input
expectation failure. These are retained as fixture/source failures, not weakened or called PASS.

The worktree Python runner was the mypy infrastructure blocker: ignored `.venv` state is not copied
into Git worktrees. It now resolves an explicit `OPENFORGE_PYTHON`, a worktree-local environment or
the primary checkout's shared environment without a hard-coded user path. Mypy now executes and
reports 39 genuine existing errors across seven files (principally Early Payout plus shared ledger
typing). PQA-M07 is assessed FAIL rather than “tool unavailable”. PQA-M11 is assessed RISK with an
exact dependency disposition; no dependency changed.

### Schema proposals — PROPOSED / NOT IMPLEMENTED

**PD-QA-018 imported parent identity.** Rebuild `import_source_records` through the existing
SQLite/PostgreSQL migration mechanism so its primary key is
`(profile_id, source_sheet, source_record_id)` rather than the current global
`(source_sheet, source_record_id)`; retain `source_hash`, `entity_type`, `entity_id`, `imported_at`
and add nullable `import_run_id` while keeping legacy `import_batch_id` nullable for the old path.
Use existing `free_bets.origin_qual_bet_id` as the immutable external parent ID. Add to `free_bets`:
`origin_qual_bet_native_id TEXT NOT NULL DEFAULT ''`,
`origin_qual_bet_resolution_state TEXT NOT NULL DEFAULT 'legacy_unresolved'` constrained to
`not_applicable|resolved|missing|ambiguous|legacy_unresolved`, and
`origin_qual_bet_resolution_json TEXT NOT NULL DEFAULT '{}'` for same-Profile candidate IDs/review
reason. Atomic import writes the Sportsbook mapping first and resolves only one same-Profile match;
zero/multiple matches retain the external ID and explicit state with no native link. Portable
export/restore carries the mapping and remaps only resolved native IDs. No backfill: old rows stay
`legacy_unresolved`. Rollback must revert application code while retaining unknown columns/data;
dropping the replacement key/columns would be destructive and is not the rollback.

**PD-QA-021 durable deletion/correction history.** Existing per-ledger audits cannot simply be
extended because their row foreign keys cascade, and Cash/Casino deletes explicitly erase them.
Add one append-only `financial_activity_history` table with
`history_id`, `profile_id`, `ledger_type`, `record_id`, `event_type`, `operation_id`, `occurred_at`,
`actor_id`, `reason`, `schema_version`, `source_identity_json`, `before_snapshot_json`,
`after_snapshot_json`, `prior_audit_json`, `reporting_value_before` and `reporting_value_after`.
It has a Profile foreign key but deliberately no foreign key to the deletable business row, plus a
unique `(profile_id, operation_id)` retry boundary. Existing per-ledger audits continue to own live
edits; a permitted delete/reversal writes this immutable snapshot and prior correction trail in the
same transaction before removing the row. Current reports exclude deleted activity but link/label
the retained historical contribution and reversal; they do not silently present it as current P&L.
No historical backfill: existing deletions remain unknowable, and live rows gain history only on a
future governed action. Code rollback must keep writing disabled while preserving the new table;
dropping it would erase the evidence the change exists to protect.

### Reconciliation and coverage

| Request | Original/later intent → current evidence → remaining gap |
|---|---|
| #90 | Source-independent read/cleared/completed history → source-change failure proven → exact durable event boundary above remains unimplemented |
| #99 | Clear survives refetch/reload/stale consumers → real browser reload and monotonic tests pass → normal local evidence only; hosted/owner acceptance remains |
| #100 | Notification controls must not overlap or obscure focus → existing focused geometry evidence retained → no behaviour/history claim and owner acceptance open |
| #111 | Inspectable reusable time series and report explorer → arithmetic/range/breakdowns/text summary pass → point interaction, drilldown, filters and later metrics remain planned |
| #115 | Affected packages plus reachability/exposure disposition → current lock/audit and reachable image optimiser proven → authorised upgrade and hosted metadata remain |

Current coverage is **55/87 assessments (63%), 10/24 complete journeys exercised/passing (42%),
15/27 competitor cells (56%) and 26/133 requirements reconciled (20%)**. Newly completed assessment
rows are PQA-F21, PQA-U11, PQA-M07 and PQA-M11. #100 and #115 are the two newly reconciled requests;
#90/#99/#111 update existing rows and are not counted twice. No qualifying new competitor evidence
was added. Evidence checksum:
`b1e55f4310b97ae2f0320fc1acfbf05d704509d8518876604264ba01f083ed1e`.
GitHub issue mutation remains pending because no authenticated GitHub integration or `gh` is
available; direct public issue bodies were read on 2026-09-16. No push or hosted change occurred.

## Current CP-005 reporting, larger-data and evidence-boundary package — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 12:52 BST

Application and reusable audit-harness checkpoint:
**943583d9de0a149d311a81c020b03cc697b479ab** on the local integration branch. The final report
checkpoint is documentation-only and is recorded in the CP-005 handoff.

A fresh authenticated synthetic Profile combined settled Sportsbook £2.20, Free Bet £7.40, Extra
Place £30.40 and Casino £1.90 with a −£4.00 Subscription. Independent arithmetic and the rendered
Profile report agreed at **£41.90 gross / £37.90 retained**. Voiding the Extra Place row changed the
same reloaded report to **£11.50 / £7.50**. Selecting exactly that corrected Profile and a separate
£3.10 Casino Profile in the authorised Fund Manager view produced **£14.60 gross / £10.60 retained**.
Account cash, cash adjustments, projected/current values and settled/final P&L remained separately
labelled; promotional face value was not counted as realised profit. This completes PQA-F18 as a
scoped assessment, not the requested #111 interactive analytics feature.

A second synthetic Profile contained 200 records: 30 Sportsbook, 30 Free Bet, 30 Extra Place, 50
Casino and 60 Cash Adjustment rows. The combined source API returned in 169 ms. Authenticated local
route readiness ranged from 0.93–2.12 seconds on the first measured pass and 1.00–2.28 seconds on a
same-browser pass; Cash pagination, Direction filtering and search passed at half width/dark/reduced
motion. No repeated combined-source read was observed on the warm navigation pass. These are local
development timings, not Core Web Vitals or production capacity evidence. PQA-M08 is assessed for
this boundary; PQA-J24 stays PARTIAL because chart interaction, very large volumes, stale-request
stress and hosted performance remain untested.

The report tables had implicit but not explicit column-header relationships. The shared report shell
now emits `scope="col"` on direct and generated headers. Browser checks pass explicit scopes,
accessible financial-value names, reduced motion and contained half-width layout. An actual screen
reader remains **UNVERIFIED**; PQA-U08 is not promoted.

PD-QA-021 cannot be repaired with the current per-ledger audit rows: Cash Adjustment and Casino
deletion explicitly remove their audits, while Extra Place deletion loses them by cascading foreign
key. The smallest recommended change is one Profile-scoped deletion-history table containing ledger
type, native ID, source/provenance IDs, immutable pre-delete snapshot, reason, actor and timestamp,
written in the same transaction but without a foreign key to the deleted row. That additive schema
and deletion policy are not authorised here, so removal/history remains blocked rather than hidden.

PD-QA-018 also needs persistence authority. Full Profile import has run/write audits but does not
populate the older `import_source_records`; that table's key omits Profile. The smallest proposal is
to make external identity Profile-scoped and populate external→native mappings during the atomic full
import, resolving only a unique same-Profile Sportsbook parent. Missing or multiple candidates stay
review items, and original IDs survive export/restore. This requires an approved SQLite/PostgreSQL
migration; no historical identifier was guessed or rewritten.

For #109, the approved workbook vocabulary is now bounded by read-only inspection. Stake Access is
`Normal`, `Soft Limited`, `Heavily Limited`, `Minimum Only`, `Not Checked` or `Unknown`; Promo Access
is `Full`, `Some Promos`, `Boosts Only`, `No Promos` or `Unknown`. The recommended contract preserves
the two controls separately with source/observation provenance and blocks unrecognised text.
`LastPromoUsed` remains ledger-derived. This is a decision proposal, not an implemented import map.

Current coverage is **51/87 assessments (59%), 10/24 complete journeys exercised/passing (42%),
15/27 competitor cells (56%) and 24/133 requirements reconciled (18%)**. New assessment IDs are
PQA-F18 and PQA-M08; no journey or requirement numerator was increased. No new qualifying competitor
evidence was available. Redacted evidence checksum:
`5eeeefca60b1ff136df5c4adf0cb666c4893702bef67948c294fdad06ac32e0a` for the final CP-005 JSON.
GitHub synchronisation remains pending because `gh` is unavailable; no push or hosted change occurred.

## Historical CP-004 import, populated-ledger and accessibility package — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 12:19 BST

Application, fixture and reusable audit-harness checkpoint:
**14ab674cec912ced8420f83790219f67d59ed844** on the local integration branch. The final report
checkpoint is documentation-only and is recorded in the CP-004 handoff.

The integrated local application was exercised with a genuine synthetic six-sheet Profile workbook
through browser file selection, review, approval, import, ledger reopen, Reports, export, portable
restore, report reload and re-export. Two Profiles carrying the same external source identifier
produced distinct native record IDs and no cross-Profile native link. The original external ID is
retained, but a linked imported Free Bet still does not resolve to its native Sportsbook parent:
`import_source_records` is unused by full Profile import and its key is not Profile-scoped. This
confirms PD-QA-018 and bounds the repair to a Profile-scoped external-to-native identity mapping;
no historical IDs were guessed or rewritten.

An invalid Account money value originally survived workbook analysis as a ready import because the
write plan dropped row validation metadata. The import analyser and final confirmation now retain
that metadata and reject the whole mixed workbook before any business write. Browser evidence shows
identical before/after counts and an idempotent repeated rejection; 24 cutover and 10 Cash Adjustment
safety regressions pass. Account `Status` imports. `Stake Access` and `Promo Access` remain blocked on
the #109 vocabulary/provenance decision, while `LastPromoUsed` remains a derived, ignored input by
contract; catalogue-owned Group/Platform/RiskTeam were not moved into Profile authority.

Populated browser evidence now covers Extra Place actual win/place stakes, four independently
expected outcomes, settlement, Void correction and report reload; Cash Adjustment positive entry,
negative correction and report reload; and native Casino calculated, actual, settled and corrected
values. Malformed Cash money previously persisted; complete-string money/date validation now rejects
it before record or audit writes. The three ledgers still lack durable row-deletion history because
their audit rows cascade with deletion (PD-QA-021). Their creation/correction/report slices pass, but
the requested removal/history journeys remain PARTIAL rather than being promoted.

Scoped browser accessibility evidence passes at 1440, 760, 390 and 200% root text in light/dark and
reduced-motion modes: no page overflow, unnamed visible controls or sub-24px targets were found.
Cash, Extra Place and Casino dialogs pass keyboard focus entry/containment, pristine Escape and focus
return. Cash server errors are now inside the dialog, associated with Amount, and retain the entered
text. The shared modal boundary now also wraps backwards from a focused dialog container. An actual
screen-reader pass is **UNVERIFIED**; automated DOM checks do not substitute for it or certify WCAG.

| Request | Original/later intent → current evidence → retained gap |
|---|---|
| #12 import/export | Reviewed, approved Profile migration with reconciliation → full browser import/export/portable recovery now exercised → native imported-parent resolution and bound-script runtime remain |
| #80 lineage/removal | Preserve source/child identity and safe removal → external identity and cross-Profile isolation proven → PD-QA-018 native parent and PD-QA-021 durable deletion history remain |
| #88 Extra Places | Record actual win/place activity and financial outcomes → native actual/settle/Void/report proven → Rule 4/dead heat/changed terms retain their existing tracked scope |
| #90/#99 notifications | Clear state and durable history are distinct → existing clear evidence unchanged; these ledger deletions confirm source-independent history is still missing → no issue is treated as closed |
| #91 validation | Reject invalid money before business mutation → Cash Adjustment complete-decimal validation and atomic regressions added → other write-boundary rows remain as recorded |
| #109 Account import fields | Keep lifecycle/access/provenance meanings distinct → Status proven; catalogue authority preserved → Stake/Promo Access vocabulary and historical provenance decision remain |

Current coverage is **49/87 assessments (56%), 10/24 complete journeys exercised/passing (42%),
15/27 competitor cells (56%) and 24/133 requirements reconciled (18%)**. Only PQA-F15 is newly
evidence-complete; PQA-J08/J09/J10/J18 stay partial at their named missing boundaries. Main/origin,
Vercel and owner acceptance remain separate. GitHub #12/#80/#88/#90/#91/#99/#109/#114 summaries
remain pending because `gh` is unavailable; no publication was attempted.

## Historical local integration milestone — 2026-09-16

**Checkpoint timestamp:** 2026-09-16 11:07 BST

Will's normal application at `http://localhost:3010` now serves frontend product
**2ba999326c0c9389185e49517ef9f274afc05bd9** and unchanged API product
**1199af0af7cb51978794ac576755a0fe65460468** from the local integration branch. This is locally
integrated, not merged to main, hosted, or owner accepted. The final web correction keeps a reviewed
plan's strategy and versioned plan consistent, prevents a remounted slider from selecting Custom
without a real pointer/keyboard action, and prevents manual Save from draining an older queued
calculator autosave afterwards.

Data evidence: fresh backup `openforge-pre-integration-switch-20260916-100108.sqlite3` passes SQLite
integrity with SHA-256 `efb197e0fcbede68a32eeb3b3a136f0be07ffe3ab2ac31088c4bdb0238d7f51c`.
The clone/repeat/restore gate retained identical schema and row hashes for six representative ledgers.
After the authenticated synthetic runs and API-owned cleanup, the normal database is back to its
unchanged 3/76/508/231/62/15 Profile/Account/Sportsbook/Free Bet/Casino/Cash Adjustment counts and
passes integrity.

Current gate evidence on application source `f3b92b7e000dfc2644d9717b2a98eda9a7afa958` and reusable
harness checkpoint `a0645f072accc4518681c758b485d9fbc3a23d7f`: the two missing-Account calculator fixtures now
use canonical synthetic Account/catalogue creation and pass 2/2. Authenticated 3010 conversion passes
for Normal and SNR Underlay/Overlay/Standard/Custom through receipt, destination reopen, copy-only
planning, explicit actual 6.00 placement, 19.20 liability, 10.80 Back Won settlement, report reload
and retry identity. Profit Boost all four sources and conditional Cashback pass the same browser/API/
database/report boundary at 1440/760/390, both themes and 200% text. This closes the local integration
engineering gate; main/origin, Vercel and owner acceptance remain separate.

The next #114 package also ran: 38 isolated Profile import/cutover/portable-restore cases pass; one
private-workbook oracle is intentionally skipped because that workbook is not committed. A real
authenticated browser portable restore copied 2 Accounts, 1 Sportsbook and 3 Free Bets, preserved
financial inputs/plans, passed financial/operational/logical reconciliation, reopened Reports,
re-exported, then archived/deleted only the restored synthetic Profile. PQA-J19 is now complete.
The earlier verified SQLite backup→separate-copy restore/reopen evidence is reconciled as PQA-F23,
PQA-D02 and PQA-J20 PASS. Full multi-sheet workbook browser import, cross-Profile source collisions,
#109 access fields and imported parent resolution PD-QA-018 remain untested/open. Current totals are
48/87 assessments, 10/24 journeys exercised and passing, 15/27 competitor cells and 24/133 requests.
Redacted local evidence checksums: core conversion
`f68b249f0fb511cfaf1a194a6328b2a42f1f95ba3c5ff2b69ed31977023204f5`, Profit Boost/Cashback
`5679abf939fcd81200718b6cac968dbe07ea46f2bd410d69dea186b3201e4c47`, portable recovery
`9a7a70edd5ef561e8b09022105de751541b3d0f514bf1ce1ad1193e5d5942b3f`.
GitHub #114 synchronisation is pending because `gh` is unavailable in this checkout; no repeated
authentication attempt was made and this section is the exact local handoff.

## Historical calculator visual-contract tranche — 2026-09-15 / LOCAL ONLY

The shortened-chevron reference-card checkpoint was an acceptance failure and is historical.
Frozen product **8f5dc5876a2830947fbfb79a88a89b4da171858d** now renders Underlay, Standard and Overlay as
three equal plain summary cards, followed by full-width Custom/input/Copy/slider and then detailed
Outcomes. The cards have no chevrons, `Total`, permanent guidance or Apply/Use-plan actions. Offer
replaces the ambiguous inner Calculator label. Multi-Lay keeps only its necessary all-leg allocation
actions and otherwise shares the hierarchy and card primitive.

Evidence: focused browser suite 7/7; embedded Sportsbook/Free Bet modal geometry 6/6 at 1440, 760,
390 and 200% text, light/dark, keyboard/focus, failed-save recovery and real retry; production build,
typecheck and changed-component lint pass. A first enlarged-text run exposed real internal overflow;
the rem-aware calculator container reflow fixed it and the frozen rerun passed. Three broader
Multi-Lay ledger tests remain harness-blocked by absent seeded routes in this disposable runtime;
the focused Multi-Lay interaction test passed. Normal 3010, main and Vercel remain unchanged.

## Historical local integration gate — 2026-09-15

Will's normal application is now `http://localhost:3010`; it serves the reviewed integration stack
at **c73b0943a711e37ec29070c8c421506e892e87fc** with the normal API, authentication settings and
local database. The former 3040/8039 pair is stopped and is no longer an owner handoff. Its fresh
normal-browser failure was reproduced: 3040 proxied to the award-integrity synthetic API, which had
no ordinary Google OAuth/public-auth configuration, so login returned 503 `Unable to continue`.

Data gate: SQLite backup
`data/private/backups/openforge-pre-integration-final-20260915-153928.sqlite3` has SHA-256
`b097528c2b078505c361ae9197c9b5095fa20be9000cfeff5782a519cdcf9dec` and passes integrity checks.
An ignored clone and a second restored copy were verified before the normal switch. The additive
`sportsbook_bets.lay_plan_json`, `sportsbook_bets.profit_boost_source_json`,
`sportsbook_bets.conditional_benefit_json` and `free_bets.lay_plan_json` columns migrated twice with
an identical schema. All old columns in Profiles, Accounts, Sportsbook, Free Bets, Casino and Cash
Adjustments retained identical row fingerprints; representative clone routes and report sources
returned 200. Historical new-metadata count remains zero. The migrated normal database passes
integrity and the same old-field comparison.

Engineering evidence: production web build PASS; 399/419 mixed focused API checks PASS. The 20
failures are retained as fixture debt: legacy workflow tests assume private seed display names and
now conflict with canonical Profile Account validation. The current independent safety/calculation
suites passed within that run; this is not recorded as an all-green broad-suite result. Existing
frozen browser/PostgreSQL evidence remains applicable because the only new product change selects
the intended local database path for a worktree-served web process. Main/hosted remain unchanged.

Rollback: stop 3010/8010, restore the verified pre-integration backup, and restart the previous
f7a3b35 source. Do not drop additive columns if new planning metadata has since been created; use
the backup only as an immediate local rollback with Will's later work accounted for.

## Current exact Standard screen correction — 2026-09-15 / LOCAL ONLY

The earlier broad UI status did not establish the screen shown in Will's latest screenshot. Git
history and served-bundle inspection show that the screenshot used an older reachable frontend;
the current source had removed the old selector strings but still retained a generic commission
label, a stacked Advanced layout, a detached Custom slider and a duplicated selected-result card.

Product **a8d5c72167c454c9937f24cc58f630294c4cd71f** removes those remaining defects through the
shared reference/Outcomes composition. Advanced is Underlay/Overlay as an equal pair, followed by
one bordered Custom section containing the editable stake and slider, then Outcomes. Simple shows
only Standard and Outcomes. Mode occupies its deliberate row. No strategy dropdown or Part Lay
choice remains in this calculator; operational matched/remaining handling is unchanged.

Evidence: exact DOM/rendered-order and geometry checks pass at 1280/720/390 with enlarged text and
both theme states; pop-out state restores 2% from canonical 0.02. A real synthetic 3040/8039 run
passes native Normal/SNR and converted Standard/Underlay/Overlay/Custom creation, copy, save/reopen,
explicit actual 6.00 placement, settlement/report and idempotent conversion. Independent SNR values
remain Standard 7.18, Underlay 6.25, Overlay 10.20 and Custom 9.00. TypeScript and the webpack
production build pass. This replaces only contradictory current UI claims; prior numerical evidence
and wider audit counts are unchanged. Main, normal services and Vercel do not contain the repair.

## Current calculator experience reconciliation — 2026-09-15 / LOCAL ONLY

The separate test version now includes the previously isolated Multi-Lay v2 planning work without
replacing the newer Account, Free Bet, Sportsbook, award, modal, Profit Boost or Cashback repairs.
Native Sportsbook Add Row has an ordinary **Hedge calculator** choice, so Multi-Lay is no longer
reachable only through a prepared row or hidden branch. Its shared standalone/ledger planner keeps
two to twenty named outcomes, percentage commission per leg, Standard/Underlay references, copy,
liability and every outcome through save/reopen. Copy remains planning only.

| Family / agreed scope | Standalone and pop-out | Ledger entry / reopen | Current result and exact gap |
|---|---|---|---|
| Standard Normal / Free Bet SNR | Shared Simple/Advanced, simultaneous Underlay/Overlay/Custom, percentage commission | Native and converted versioned plans; actual placement remains separate | PROVEN for bounded core workflow; historical SR remains readable but is not an everyday option |
| Bonus Lock-In, Normal/SNR back-loses | Offer-aware standalone references | Existing ledger calculator is not backed by a reward-aware editable plan | PARTIAL: standalone numbers/controls proven; plan/save parity needs a versioned reward basis, amount, retention and trigger contract |
| Conditional Cashback | Shared qualifying hedge plus conditional cash/credit outcomes | Native/conversion metadata, receipt and report preserved | PROVEN for one cash or one linked-credit receipt; split award-group receipt remains unsupported |
| Profit Boost, four sources | Source breakdown and accepted-odds precedence | Native/conversion plan, reopen, placement and report | PROVEN on the current assembled source |
| Multi-Lay | v2 Normal/SNR/refund, boost, 2–20 legs, per-leg commission and advanced allocation | Native Normal, no reward/boost, Standard/Underlay planning is browser-proven with three mixed-commission legs; conversion/idempotency is API-proven | PARTIAL: 20-leg persistence is contract/code-verified only; actual per-leg placement/settlement and richer configurations lack a faithful destination contract |
| Extra Place / Each Way | Family-specific calculator | Existing Extra Place destination | CODE-VERIFIED; full current-build populated browser rerun remains outstanding |
| Sequential Lay | Family-specific live leg calculator | No faithful destination | UTILITY / BLOCKED destination; no state is flattened into Sportsbook |
| Early Payout / 2UP | Family-specific initial/live and part-back calculator | Existing Sportsbook offer workflow differs from the full standalone planner | PARTIAL; complete source-state save/reopen parity remains outstanding |
| Multiples / Accumulator | Standalone utility proven | No faithful destination | UTILITY / BLOCKED destination |
| Dutching | Standalone utility proven | No faithful destination | UTILITY / BLOCKED destination |
| Odds / Probability | Standalone utility proven | No intended financial destination | UTILITY ONLY |
| Blackjack | Strategy/session UI and existing Casino conversion | Completed Live/Free session only; Simulation excluded | Existing bounded bridge evidence retained; no strategy maths changed |

Current product commits: API **1199af0af7cb51978794ac576755a0fe65460468**; frontend
**bab34939d0542a7cc320e5ed1da320e38ac5ad8b**. Browser checks on the assembled checkout prove
native Multi-Lay selection/save/reopen plus mixed 5%/2%/0% commissions at 1440/760/390 in both
themes and reduced motion; shared calculator geometry/carousel 3/3 PASS; seven representative
family calculations 7/7 PASS after correcting old tests that entered decimal ratios into visible
percentage fields. The four-source Profit Boost/Cashback browser-to-report harness passes again on
checkout **40a5958a35ffff6f1f39674ef3b90952a9377479**. TypeScript and 39 focused API/reference/
conversion cases pass. Repository-wide mypy and Ruff still contain pre-existing errors outside this
assembly; they are not relabelled as passes. Coverage denominators remain unchanged because this is
implementation/evidence against existing checks, not new audit scope.

## Historical useful Profit Boost / Cashback bundle — 2026-09-15 / LOCAL ONLY

The separate test version now provides the complete bounded Profit Boost and conditional Cashback
workflow through Sportsbook native entry and calculator conversion. Product commit
**85eb33cf790e54b44414d009bbc9b5a836d6f2df** is exercised by browser harness
**be5a013b2d7e6171f69dc412c9733a196cbfa663**; focused
PostgreSQL harness checkpoint **4c07d319fb02f0326d2c538df21ddc0b154aa68e**. It is not in main
or Vercel; no operational
database was migrated. The approved nullable metadata migrations were exercised only on disposable
SQLite and PostgreSQL 18.6 databases. Rollback must revert the application while retaining the
nullable columns/data; dropping them would discard new planning provenance.
The authenticated launcher verifies the independently running frontend and API product paths at
**e5e75f6552cd53d50817240bce22e5da1490ca08** rather than mistaking a harness-only SHA difference
for a product mismatch.

Actual browser→API→SQLite→reopen→placement→settlement/report evidence passes at 1440 light,
760 dark and 390 light, plus 200% desktop text without page overflow. All four Profit Boost sources
save through native and conversion entry and reopen with their original inputs, blank actual stake
and a versioned plan;
£27.86/£10 retains raw odds 2.786, conservative hedge odds 2.78 and accepted odds 2.79 separately.
Copy and Custom-slider actions update the plan only. Explicit actual lay £9.00 then settles at
−£0.10. The converted total-return row settles at −£0.20, converted Cashback settles at £8.82,
and the browser verifies the resulting £15.34 settled report value after reload. Cashback retains
£10 eligibility, £8 cap and a separately confirmed £8 cash receipt;
settlement is £6.82. Switching receipt kind clears incompatible receipt fields. Pending Free Bet
credit remains promotional credit, not cash, and its linked identity survives portable restore.
Native and converted plans preserve blank actual stake until placement.

Evidence: **70 focused API/portable/calculation tests PASS**, direct TypeScript and the Next 16.3.2
webpack production build PASS, real browser bundle PASS, genuine four-variant award regression PASS,
and disposable PostgreSQL offer-plan/metadata fresh/repeat/old-schema checks PASS on port 53460
(cluster stopped). A populated Casino check (PQA-J08) also passes create/reopen, calculated £2.40,
confirmed £2.10, settlement and report/reload in both width/theme variants. J08 remains PARTIAL:
fee allocation and a complete change-history consumer are untested. Cashback split-award receipts
still have only one linked-credit identity; creating/linking a whole split group in one editor action
is outside this approved storage slice. The 390 check proves page containment, not every internal
control bound; reduced-motion preference is verified but no changed transition is exercised here.

Coverage remains **46/87 assessments (53%), 8/24 full tasks exercised (33%), 8/24 passing (33%),
15/27 competitor cells (56%), 24/133 requests (18%)**. These measure audit coverage, not how much of
the application is finished. GitHub summary sync for #35/#36/#83/#114 remains pending because `gh`
is unavailable; this section is the exact queued summary.

## Historical calculator engineering continuation — 2026-09-14 / LOCAL ONLY

Current separate test version checkpoint **3f7a71104ed07682aed256baea1a0dc71ce035f8**:
frontend product **4bb0109598115b9bbd317e94e12b493502310633**, API product
**eb86c6045e5b6f4db939c733d20e5e8e67b526d4** unchanged. New product commits9577566,
26aa070,534c978,71c5c41,9625b16,9c8994e are separately scoped UI/recovery repairs;9483edf
and25744bb are earlier test harness checkpoints;4bb0109 adds the same-odds operational Copy boundary.
No financial engine, operational database or historical
result changed. Main/frozen candidate remainf7a3b35073ecc87cdf8f8f881129f221ec44d395;
unmerged Multi-Lay215193b remains untouched. No publication, integration or deployment.

**Partial user observations received; no further bulk owner entry required; engineering reference
verification and fixes active; final acceptance pending.** Owner review, recordings, worksheets
and launcher troubleshooting are not progression gates. The previous79-case campaign is not a
delivery requirement. The current engineering gate below replaces older broad remaining-work
wording without erasing its revision-limited evidence.

Original JSON hash95112328fe4e9b61ad5dfe0c90b45ff70b35beaefca5d082692a9de76dffa6ac
and workbook7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a remain
unchanged, private and read-only. CASHBACK-001 output indices0/1/2 are selected stake9.00,
liability28.80, back-win1.20; observed build remains UNKNOWN (localhost3010/blank build IDs).
Its stated Standard setup conflicts with those observed Custom-compatible numbers. Current-build
offer switching reproduced a leaked Custom9 draft, but does not prove the original observation's cause.

### New reproduced defects and fixes

- Profit Boost had a separate unguarded request effect: old32.00 remained current during a held
  4.00-odds response, and failures were unhandled. Exact input-key invalidation, abort/revision
  guards and an inline error now preserve the persistent breakdown without presenting stale odds.
- Disabling a focused Save lost active-dialog focus. Shared focus lifecycle keeps observing
  focusability/structural changes and skips disabled targets/nested dialogs. Nested confirmation
  Tab also reached the presentation wrapper; ModalBoundary now cycles its actual controls.
- Sportsbook failed Save errors appeared only in a hidden award tab; Free Bet errors were outside
  the modal. Canonical footer alerts expose HTTP/network failure and preserve the draft for retry.
- A real5% reference response held while choosing Back Won dropped the dropdown autosave intent
  (database stayed Pending). The existing latest-draft queue now drains only after valid planning
  readiness, retaining independently confirmed actual2% commission and actual-stake results.
- Selected SNR390light showed Revert overlapping Previous/Next; empty Add-modal geometry passed
  and did not cover it. The shared footer uses explicit tracks, full-width errors and container-based
  action/navigation stacking. New pairwise overlap assertions cover selected as well as empty rows.
- Changing offers leaked Custom stake/bounds and reward assumptions. An explicit different offer
  starts Standard, clears offer-specific drafts and seeds Cashback's editable cap from stake;
  shared odds/Exchange/commission and explicit saved/pop-out state remain untouched. Cashback
  labels now say Without cashback and Eligible refund amount / cap, with finishing-position guidance.

### C08 actual receipt / operational boundary — exact blocker, not a backend PASS

Read-only workbook SportsBookU2/W2/X2/Y2/Z2/AA2/AC2/AF2 and FreeBetsV3/X2/Y2/Z2/AA2/AD2
confirm reference/actual precedence, cash-first settlement and same-odds subtraction. SportsBookZ2
`Lay Won + Cashback` assumes full-stake cash returned; Free Bet refund is not face-value cash profit.
Existing `maximum_bonus` is an eligible cap, not a receipt; strict `lay-plan-v1` forbids refund-kind,
receipt and award-link fields. The smallest outstanding C08 proposal is typed conditional-benefit
storage on the existing ledger (kind, eligibility/cap, actual receipt identity/date/amount and awarded
credit linkage), explicitly versioned, no backfill. That additional schema is NOT approved by the two
lay-plan-column approval and is not implemented. Cash-cap legacy behaviour remains readable;
credit-refund conversion stays422 before writes. Do not claim embedded actual-receipt/credit parity.

C05 now has a bounded same-odds operational slice on product
**4bb0109598115b9bbd317e94e12b493502310633**. Versioned Normal/SNR rows visibly separate the
reviewed plan, matched amount, unknown unmatched order and same-odds remainder. Copying the remainder
is clipboard-only. The legacy partial-lay Copy action also no longer creates or changes a matched leg.
Real native browser/API/SQLite runs on 1440/760, light/dark prove planned6.25 with actual6.00 leaves
0.25, and planned9.57 with actual6.00 leaves3.57; database actuals remain6.00 after Copy. The complete
8-path native/conversion/placement/settlement/report gate remains PASS on the unchanged calculation
source. Changed-odds remaining hedge, persisted known unmatched orders and multiple fills remain
unsupported because no approved contract/storage represents them; no fill is fabricated.

C07 embedded four-source Profit Boost remains a contract/storage blocker rather than a UI-only task.
The row stores only `displayed_odds`/`percentage` and cannot restore bookmaker total-return or
profit-only source values; conversion keeps the immutable source envelope, but native rows and the
editor have no editable source record. Recommended smallest proposal: add nullable, versioned,
server-validated Profit Boost source metadata to the existing Sportsbook row and its native portable
export/restore path, without backfill or settlement rewrite. This affects NEW Profit Boost planning
rows, editor/bridge/API validation and saving/restoring exported data. Exact permission required:
approve that additive typed persistence/contract change on disposable SQLite/PostgreSQL databases.
Until then the two richer modes remain standalone only and must not be presented as save/reopen parity.

C01 lost-save-acknowledgement/reload is now bounded PASS on the current checkpoint. A real Free Bet
PUT committed7.60, the intercepted browser response was deliberately lost, the active editor retained
7.60 and showed its existing error, and a reload recovered7.60 from persistence. The four existing
1440/760 light/dark delayed-old-response and footer-containment cases also pass. This is not evidence
for simultaneous edits in two browser windows; that case remains untested.

### Current external interaction / coverage

Accessed2026-09-14: the public iframe linked by
[Outplayed calculator page](https://outplayed.com/round-robin-bet-calculator) is
[odds-calculator-v3](https://bonusaccumulator.com/calc/outplayed/odds-calculator-v3/index.php).
Actual public Chromium760/390, SNR10/back4/lay4.2/back commission0%/lay2%, Advanced:
Standard7.18/22.98/7.02/7.04; Underlay6.25/20.00/10.00/6.13;
Overlay10.20/32.64/**−2.64**/10.00; keyboard Custom9.00/28.80/1.20/8.82;
pointer Copy Underlay writes6.25, no horizontal page overflow at390. The visual minus is present;
raw innerText omits generated accounting punctuation, so raw2.64 is not a positive observed profit.
This is fresh bounded black-box evidence, separate from supplied observations/source inspection.
Native-select values used browser select events; numeric/slider keyboard and pointer Copy are
recorded separately. Full keyboard/assistive-technology certification remains UNVERIFIED.

[MBB public calculator](https://matchedbettingblog.com/matched-betting-calculator/) actual390px
keyboard Space selects Free Bet; identical10/4/4.2/0%/2% shows stake7.18, exchange liability22.97
and7.03/7.03 outcomes. These differ by1p from penny-placed Outplayed/Plum Duff; independent raw
equalisation30/4.18 is consistent with MBB's displayed balanced totals (internal order INFERRED,
not freshly source-proven). Do not force different endpoint/precision behaviour into a parity PASS.
Unconditional MBB refund-if-loses is not conditional racing cashback.

One newly completed provider cell: **PQA-C08 / Outplayed public mobile interaction**. C07 Outplayed
full keyboard remains partial, member tracker/recording remains inaccessible/unverified. Coverage:
46/87 assessments53%,8/24 exercised33%,8/24 passing33%,**15/27 competitor cells56%**
(12 documentation-only,3 hands-on),24/133 requirements18%. Change:+1 competitor cell/+4 points;
no repair/test count promotes an assessment, journey or requirement. Larger-data/accessibility,
imports/restores/PD018, remaining populated ledgers and historical clarification coverage remain queued.

### Historical preceding visible core checkpoint (eb86c60)

The following sections describe prior revisions, not the current continuation above. Their old
remaining-work statements do not undo verified repairs; exact outstanding IDs remain in the current
C01–C09 table. No owner login/video/review gate is current authority.

Application source **eb86c6045e5b6f4db939c733d20e5e8e67b526d4** inherits UI7f4ff6f17be61d5b3e4c6faf36b7bb80c2b9f3a2,
shared planner0baffd2 and validated planning storage3f2eaca9fe2b7e00a957202ce84e09246751fbca.
eb86c60 corrects only NEW versioned-plan lay-status classification: unplaced planned stakes must
not produce Fully Laid. Five independent pre-fix assertions failed;23 core-plan cases pass after.
No financial equation, schema, actual stake, legacy row result or placed history was changed.
Verified starting checkpoint43ce6376bdaf597baf7aaea90296f4fe1e8c8078 and report25bb681a2e576e05249a9eb7cd399c489e427f07
are historical. Main/frozenf7a3b35073ecc87cdf8f8f881129f221ec44d395 and Multi-Lay215193b7fcb5b11a28e23a4531d2a45434545dc1
remain untouched. All commits local only; no operational migration/publication/integration.

The accepted standalone components now power native/versioned Normal Sportsbook and SNR Free Bet editors.
Simple/Advanced, all three full-width references, Custom followed by its slider, percentage inputs,
clipboard-only copy, explicit plan apply and explicit actual-placement confirmation are implemented.
Historical null plans remain legacy unless an eligible unplaced record is explicitly replanned.
Backend storage is consumed, not merely exposed. A saved commission override is part of the editor's
dirty/revision state; response acknowledgement preserves newer drafts. Identical apply/Exchange events
no longer leave the planner permanently busy. An unchanged saved plan's reference refresh does not
prevent actual settlement; edited inputs still invalidate stale Copy/Apply/Save.

### Current C01–C09 correction checklist

| ID | Current result / evidence | Exact remaining work |
|---|---|---|
| C01 | Delayed old response and lost save acknowledgement/reload PASS / PROVEN on 3f7a711 | Simultaneous edits in two browser windows remain NOT TESTED; no universal autosave claim |
| C02 | Active/pending/nested focus and selected-footer repairs implemented; new six-variant checks | Outgoing gate below; interrupted close/reopen intermediate motion and pending destructive-confirm error remain specific untested variants |
| C03 | PARTIAL / DOCUMENTED | Exact workbook SR discrepancy retained; no historical calculation rewrite; Cashback provenance remains |
| C04 | Core numerical/display/copy/conversion/reopen/actual/report PASS / PROVEN | Fresh bounded public Outplayed four-reference black-box match recorded above; MBB penny difference explicit, not parity PASS; unsupported rare configurations remain tracked |
| C05 | Core plan/actual controls PASS / PROVEN; same-odds operational remainder PASS / PROVEN on 4bb0109 | Changed-odds hedge, persisted unmatched order and multi-fill accounting remain unsupported; Copy never records a fill |
| C06 | Core percentage/override save-reopen PASS retained; actual PostgreSQL actual-commission/default-change PASS | Actual6/4.2/2% retains19.20/10.80/5.88 when default changes5%; full default-change browser variants still required |
| C07 | Four Profit Boost sources save/reopen in native and converted Sportsbook rows; accepted/source/hedge odds remain distinct; planned Copy/Custom slider never marks placement. PASS / PROVEN on be5a013 over product 85eb33c | Historical rows remain unchanged; a full screen-reader check is NOT TESTED |
| C08 | Conditional Cashback kind/eligibility/cap and confirmed cash or linked-credit receipt persist; kind switches clear incompatible receipt state; cash settlement and portable linked-ID remap PASS / PROVEN on 85eb33c | Split-award linkage is still one linked credit ID; whole-group receipt creation/linking and complete history UI remain outside this bounded bundle |
| C09 | Native and converted browser→API→database→reopen→explicit placement→settlement/report PASS for Profit Boost and cash Cashback on be5a013/product 85eb33c, including the £15.34 report value after reload; pending credit conversion and genuine award regression PASS | Portable round-trip is API/persistence-proven, not a browser file-import journey; broader recovery, assistive technology and remaining ledger tasks continue under #114 |

### Historical outgoing evidence receipt — source d3a6b5d

No application source edits during this outgoing run. The final JSX fix preserves visible copy;
capturing the original modal opener removes the cleanup lint warning and is covered by real conversion
focus-return/nested dialog tests. Current API source remains eb86c6045e5b6f4db939c733d20e5e8e67b526d4.
Typecheck, changed-code lint and Next16.3.2 production build PASS; installed tools used directly to
avoid pnpm's attempted dependency-link replacement. No dependency change or hosted build claim.

Core real browser/API/independent SQLite persistence PASS8 on this final source: Normal/SNR native
plans and Standard/Underlay/Overlay/Custom reviewed conversions; preserved immutable source identity,
receipt/dialog close/focus, clipboard-only Copy, saved commission override and blank actuals until
explicit confirmation. Actual6@4.2/2% remains19.20 liability and10.80 Back Won; SNR Lay Won5.88,
Normal Lay Won−4.12. A held5% planning refresh while selecting Back Won now retains the queued result
and confirmed2% actuals. Evidence01387214ea8c17f2b2bf1c9e4defd397629481e0d2bbd3f1b5be3a1e5f1d1fc1.

Profit Boost PASS2 on this final source: four independent source equations/accepted override without
lay inputs; immediate old-output invalidation, held late response ignored, malformed/HTTP503 failure
and correction recovery. Evidencef70b5fefd202340f9a4886e409277bed814eaf9a4306ee2bd92bdc34e2fbd4a8.
Cashback switch/reset PASS2: Standard9.57 qualifying−0.62, cash eligible10→9.38/cap5→4.38,
credit5 face value/estimated3.50 remain separate from unchanged cash−0.62; changing offers clears
Custom9/reward-kind/bounds rather than inheriting them. Evidence
4dbb55557ce506276d9eabc28a90269a1fd8843c601a39b60e871ff8873d8538.

PQA-J12 existing full journey rerun PASS on this candidate at760dark: real multi-Profile review,
Account closed after review→one success/one failure; successful target retained; retry submits only
unresolved target/same intent; dialog closes with two row links; deliberately new exploratory intent
creates another row. Independent SQLite counts2/1 and exactly three linked notifications; source
values retained. Already-saved retry reuses IDs. Evidence
0487c41493df473e506a8a95a486156f7d562bcd26da7e801cbf88872467eef7.
This re-verifies an existing journey, not an additional journey numerator.

Genuine award outgoing PASS4 on exactly d3a6b5de3007c0f53cf33231a888c9af631707f4 at3040/8039,
1440/760 both themes: real source award creation, single10 removal, split5SNR+5SR face value10,
injected second-child rollback and same-operation refresh retry, lost committed response reuse in
one variant, no removed-child resurrection, copy3.86/4.83 with explicit actual3.50, reopen/settle
5.30/10.30 and qualifying−1.18 included in offer14.42, parent-linked list/protected removal disabled,
source deletion409 unchanged persistence/report/reload. No application edits during runs.
Evidence5a2cf806d2c3cdba09cf1d69758387b4e15307083d44ff2b97e6e8add47c977d.
This is bounded actual browser/SQLite proof, not a new concurrent PostgreSQL award run or full history UI.

37 focused shared money/commission/latest-edit tests and23 existing core-plan backend cases PASS;
unaffected prior199 atomicity/legacy cases retain their revision/scope rather than being rerun.
Earlier18 empty footer and4 latest-edit variants on25744bb remain valid for unchanged CSS/latest-edit
paths; final d3a6b5d six selected variants additionally exercise the modal opener change. These test
counts are not configuration/whole-platform acceptance. Self-review used; no independent agent review
claimed. Screen-reader execution remains NOT TESTED.

Serving frontend PID31797 and API PID48094 are the owned repair worktree3040/8039; API manifest
checkout d3a6b5d/API producteb86c60 matches the final8-path browser evidence. Authenticated launcher
check succeeds and browser real requests use8039. Canonical healthz8039/8020/8034 returns200;
normal3010 login returns200. Protected services/data were not restarted/migrated. Existing synthetic
session renewed only through strict database-backed fixture auth; fresh production Google callback
is not configured/tested in this fixture and is not claimed repaired. Launcher remains
`cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`.

New selected-editor geometry PASS6 on d3a6b5de3007c0f53cf33231a888c9af631707f4:1440/760/390,
both themes, desktop200% and half-width200% separately. Pending Escape/focus; repeated nested
Tab/Shift-Tab/Escape; HTTP503 and transport failure preserve Custom9 draft and original persisted
plan; pointer retry saves the plan with blank actuals. All footer button pairs are non-overlapping.
Screenshot390light inspected: Delete/Revert and Previous/Next occupy separate rows, no rank/label
or action collision; editor body scroll is deliberate, not hidden overflow.
Evidence SHA2568a62ceb289bd96b2930aeb0f745ba0a712f39dc7c98d96941968054833de45d2.

Actual PostgreSQL18.6/Homebrew test execution at harness9483edf4bb3d8b8f69cf71738e5d6a47e1ada8f1,
unchanged API eb86c60: dedicated loopback52818, disposable cluster, synthetic current-schema DB and
SECOND populated old-schema DB. All four SNR plans retain empty actuals; injected response preparation
rolls back row/audit changes; fresh-connection reopen works. Confirmed actual6@4.2/2% remains19.20 liability,
10.80/5.88 branches despite planning/default5%. Two approved nullable planning columns upgrade populated
old-schema data twice; legacy actual7/back5/lay5.2/2% Back Won10.60 and original snapshot unchanged.
PASS / PROVEN for these boundaries; cluster stopped. Retained redacted evidence checksum
35ec858e5edd10d7e9f1d22fe022a87031f7a270cb2dfc1e2d28727cec4f87dc.
Prior wider backup/restore evidence is retained, not rerun/promoted by these transaction tests.

Public Outplayed bounded black-box controls/copy and four-reference numbers PASS2 (760/390):
evidence68db025b3a39089b6dc91f09c70bf926f257876ac5add3d9d23d87d04123d2cf.
MBB observed different liability22.97 and balanced7.03/7.03 at matching settings: comparison
DOCUMENTED mismatch, not mathematical failure inferred from rounding alone. Evidence
fb489921a777b35278f773817cf5caadb5937288e0b9fb648788d02fd5733c27.
Observations, private synthetic screenshots/DB/cookies and workbook are not committed.

J11 protected-removal/source-result and user-visible linked-child list are exercised by the genuine
award runner; full change-history UI is still absent under PD-QA-016. Its existence must not be
invented from source IDs or audit rows. J11 remains PARTIAL in this conservative full-history scope;
current explanation is missing history consumer, not superseded autosave failure. No journey count
increase. Unsupported imported-parent reconciliation PD-QA-018 remains separate.

Exact next executable IDs: C05.versioned-operational-adapter (actual fills/unmatched orders/governed
changed-odds hedge), C07.embedded-profit-boost-four-source, C01.after-commit-lost-ack-reload and
C01.cross-editor-ordering, C02.interrupted-dialog-motion and C02.pending-destructive-confirm-error,
C09.portable-browser-roundtrip. C08.embedded-receipt is BLOCKED by additional unapproved typed
conditional-benefit storage, not by owner comparison. Wider next audit package remains populated
Casino/EachWay/Cash ledgers, Profile-workbook restore/parent resolution and large-data/accessibility
plus retained request/competitor/security checks. No owner engineering assignment.

Owned review3040/8039 retains its existing disposable synthetic database, backed up before loading
the approved additive migrations. API startup review-source.json identifies loaded checkout and API
source; browser genuine conversion/SQL checks establish the network target, not health alone.
Existing legitimate synthetic session verification is required on BOTH frontend and API. The first
restart omitted frontend verification settings and redirected tests to login: launch failures, not
passing journeys. Award fault injection initially patched only free_bets' function, missing the award
module's imported reference: the corrected test-only runner patches both. Neither is a financial fix.

Rendered narrow probing reproduced a shared42rem Outcomes minimum and auto grid track expansion.
The shared matrix now bounds tracks and stacks complete labelled rows by container width; auxiliary
fields and the shared Custom slider reflow by available width/rem units at enlarged text. No hidden content, smaller typography,
route offsets or global shell rewrite. Existing Multi-Lay/Sequential/Early Payout calculations unchanged.

41 focused money/commission/latest-edit/plan unit checks and23 core-plan backend checks pass;
typecheck, changed-code lint and the initial0baff production build pass. Final source is frozen for
browser and outgoing-build checks. These counts are not configuration completeness or owner acceptance.
Private synthetic screenshots/runtime evidence contain no operational observations. Durable final
redacted results/checksums are below. The original JSON/workbook remain unchanged/private.

### Final frozen-source observable evidence — producteb86c60 / 2026-09-14

All application source remained unchanged throughout these final runs. The independent SQLite
reader initially failed immediately on another test's brief writer lock; its test-only connection
now uses busy_timeout5000. No business assertion or expected value was weakened. Earlier interrupted
geometry attempts during API restart encountered catalogue/request failures and remain harness
failures, not passes. Final runs below use stable owned services.

| Probe | Result / evidence | Exact scope | SHA-256 of retained private synthetic result |
|---|---|---|---|
| verify_core_lay_planner_ui_113.mjs | PASS / PROVEN,8 journeys | Four native + four real conversions; database assertions, copy-only/Not Laid, source checksum, same-intent retry IDs, dialog close/focus/receipt, actual6 placement, settlement/report/reload; held older response,0/2/5/2.125% override save/reopen, keyboard slider and presentation transitions | e554dab15916bf207489aa913755536c19b691d3413218e96a620d553539e34a |
| verify_core_reference_controls_113.mjs | PASS / PROVEN,4 variants | Hub/pop-out, desktop/half-width, both themes/reduced motion, four SNR references, Normal/SNR negative accessible/copy outcome−2.64, percentage requests, retained result shell | aad430375735364a43164db999a0ea7db478a8cbe6d026f6133f5ba540c06c20 |
| verify_core_planner_geometry_113.mjs | PASS / PROVEN,6 variants | Native/versioned editors1440/760/390px; desktop200% root-text separately from half-width200%; bounded inputs/body/page, full-width references, pointer Save, Tab/Shift-Tab, dirty Escape/Keep Editing | a5c5cf364691cbe2ecf5197b1c5b63a503da664647ddcd4f188d227046946d2c |
| verify_core_shared_consumers_113.mjs | PASS / PROVEN,8 presentation checks | Standard/Multi-Lay/Sequential/Early Payout at1440light/760dark: accepted eyebrow, paired heading alignment where applicable, no page overflow; NOT numerical/external parity | 811ed81da561de46ce6e299634607d7974eac1ccb969a1d17b1a35699857c9ef |
| verify_award_integrity_91.mjs | PASS / PROVEN,4 genuine journeys | Single10 removal, split5SNR+5SR, injected second-child rollback, refresh retry same operation, lost committed response reused IDs in one variant, reopen/actual3.50/settlement, protected removals/source409, report/reload | 93f3fc286d757362a6095360b28cae9e159877b18550c88ab828455ed0e0756a |

Independent SNR10/back4/lay4.2/c2% references: Standard7.18/22.98/7.02/7.04;
Underlay6.25/20.00/10.00/6.13; Overlay10.20/32.64/−2.64/10.00;
Custom9.00/28.80/1.20/8.82 (stake/liability/back-win/lay-win). Embedded saved Underlay6.25
and actual6 coexist; actual liability19.20, Back Won10.80, Lay Won5.88. Normal actual6
has Back Won10.80 and Lay Won−4.12. Eight final Back Won records report86.40, independently
8×10.80. Every supported converted source retained its hash and empty actuals until confirmation.

J11 assertion reconciliation: genuine generation, split basis/face values, failure/rollback/retry,
refresh, explicit child placement/settlement, unused removal without replay resurrection and protected
source/child denial/report totals are exercised. Child5.30 + child10.30 + source−1.18 = offer14.42;
the source result is INCLUDED, not erased. Existing unchanged database concurrency/authority/removal
tests retain their prior revision-specific evidence; browser tests are not concurrency proof. Full
change-history UI PD-QA-016 and imported-source resolution PD-QA-018 remain separate findings.
Broader autosave/network interruption C01 is not claimed universally repaired by J11's synchronised
placement steps; the old superseded autosave blocker is not the explanation for this passing run.

Final frontend7f4ff6f production build, typecheck and changed-code lint PASS; its application tree is
identical in combined sourceeb86c60. The new status regression plus199 affected financial/atomicity
cases pass: no changed legacy financial expectations. One interrupted final award attempt hit a
Playwright response-body resource error; the complete rerun passed without weaker assertions.
The owned local review
uses the canonical Next development command: this repository's API rewrite is development-only,
so a bare local production start cannot supply /api/auth/session. That attempted startup produced
a controlled session-service error; no bypass was used. Production-build success is not a hosted
or production-runtime verification claim. The authenticated development review is the tested pair.
Test-harness-only checkpoint71f18ba1f13c7119dda095e6429b208d4348d777 does not change product code.

Final screenshots were inspected directly in both standalone and embedded layouts. Screen-reader
testing remains UNVERIFIED. No owner acceptance, hosted result or whole-platform numerical claim.

Current launcher (refuses a stale/nonpassing core evidence build):
`cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`

Coverage unchanged46/87 reviewed,8/24 journeys exercised/passing,14/27 competitors,24/133 requests.
Wider audit resumes after the core/C08 integration gate. No bulk owner comparison required.
Everything below is historical unless explicitly revalidated above.

## Historical approved lay-plan implementation checkpoint — 2026-09-14 / LOCAL ONLY

Product source **3f2eaca9fe2b7e00a957202ce84e09246751fbca** is a direct child of
verified checkpoint47b4495642d15456938210a1150945b7dd57d65b, which directly inherits
tested24385bf72a5161a6e14e22175f40def2fcb808db. Prior reportc8664a54ff6583db0b02188d70c0caec0d8263cf
is historical. This is an implementation checkpoint, **not full core parity**.

Will's two-field approval is implemented in the backend: nullable TEXT lay_plan_json
on Sportsbook/Free Bets, typed lay-plan-v1, server reference validation, immutable
source identity, revision checks, planning/actual separation and retained actual
commission in the existing lay_commission_1 column. No additional business columns.
No backfill, operational migration, push, merge or deployment. Main/normal remains
unfixed; protected3034/8034 and frozen3020/8020 are unchanged.

| ID | Current result / evidence | Exact remaining work |
|---|---|---|
| C01 | Existing scoped PASS / PROVEN retained | Broader stale/network/cross-editor cases; new plan revision acknowledgement must be integrated with latest-edit handling |
| C02 | Existing scoped PASS / PROVEN retained | Dirty/pending/nested confirmation/focus return/text-enlargement cases remain |
| C03 | PARTIAL / DOCUMENTED | Workbook SR conflict and Cashback receipt/cap provenance remain separate; original inputs unchanged |
| C04 | Backend plan/reference PASS / PROVEN; UI PARTIAL | New API conversions preserve Standard7.18, Underlay6.25, Overlay10.20, Custom9.00, strategy and source; embedded UI still needs versioned plan consumption |
| C05 | PARTIAL / CODE-VERIFIED | Native API planning is available; native UI defaults and explicit actual-placement/copy-only controls not implemented; multi-fill/changed-odds remaining hedge still unsupported |
| C06 | Backend override PASS / PROVEN; UI PARTIAL | Plan ratios0/.05/.02125 persist; actual .02 does not follow changed Profile default. Embedded percentage inputs and browser save/reopen/pop-out still unfinished |
| C07 | Existing standalone scoped PASS / PROVEN; embedded PARTIAL | Reuse the accepted shared controls for new native/versioned embedded rows; live drag/stale apply/save and revision-state handling remain |
| C08 | Existing API scoped PASS / PROVEN; UI PARTIAL | Conditional Cashback receipt/cap/credit, embedded mode-switch/reset and no double counting remain |
| C09 | PARTIAL / PROVEN backend only | Fixed-source browser conversion/reopen/copy/actual placement/settlement/report, enlarged text, reduced motion, genuine award rerun and changed-code build remain NOT TESTED for this product |

### Actual isolated migration and persistence evidence

Fixed source3f2eaca: **235 focused API/backend checks PASS**, including23 new core-plan
cases, Account/Free Bet/Sportsbook atomic safety, supported conversion and three
unchanged unversioned legacy-plan regressions. This count is not a configuration or
journey completion claim. The source was not edited during this final test run.

New parametrised test_core_lay_plans.py uses independent exact literals, real HTTP
handlers and database inspection. It covers all four SNR references, Normal planning,
zero/5%/fractional overrides, invalid/tampered/foreign/version conflicts, response
rollback, revision rejection, actual6.00 precedence (liability19.20, Back Won10.80,
Lay Won5.88), source/idempotent API conversion, native portable restore with Exchange
ID remapping, and synthetic SQLite old-schema repeat upgrade without changing actuals.

Actual PostgreSQL18.6 PASS on fixed source3f2eaca, unused loopback port54921, owned
disposable directory /private/tmp/openforge-pqa-pg-114-j808ymjz. Fresh schema/four SNR
references/blank actuals, injected response rollback, repeat migration/fresh-connection
reads and second disposable old-column schema upgrade pass. Cluster stopped in finally.
The second PostgreSQL upgrade fixture has empty ledger tables; preservation of populated
old-schema PostgreSQL rows, full restart, actual-commission settlement and portable
restore on PostgreSQL remain NOT TESTED. SQLite does not establish those results.

Existing portable suite has 12 fixture-setup failures: its legacy seed calls protected
create with result Won, four-decimal money and an Exchange not owned by the Profile.
Assertions were not weakened. The new valid synthetic native portable plan round-trip
passes; legacy artifact compatibility and all old portable assertions remain unverified.

Native portable exports now retain plans and restore remaps Exchange Account IDs.
Legacy ledger workbook export rejects planned rows with a native-portable alternative,
rather than dropping metadata. Older native v1 missing-plan columns are accepted only
after original checksum validation; an explicit legacy-file regression remains needed.
Rollback must retain columns/plans; older code must not edit new versioned plans.

No new corrected browser candidate is running:3040/8039 still serves the prior API72a924e,
with existing data retained. The existing launcher is historical-review only, not a
launch of3f2eaca. Next implementation: shared embedded versioned planner, native automatic
plan creation, percentage/explicit placement controls, coherent revision acknowledgement
and source-preserving bridge UI; then an isolated new runtime and fixed-candidate browser
gate. No further schema approval or bulk owner comparison is required.

Coverage unchanged46/87 assessments,8/24 journeys exercised/passing,14/27 competitor
cells,24/133 requirements. Wider audit resumes after core integration gate.
Everything below is historical unless explicitly revalidated above.

## Historical calculator-correction checkpoint — 2026-09-14 / LOCAL ONLY

Reporting branch audit/platform-quality-114 is documentation-only. Current tested product candidate
**24385bf72a5161a6e14e22175f40def2fcb808db**; API reference source
**72a924e6e2ea8f769136575f8192726a785974c4**. Verified starting checkout
9ffaad7e726a8c0482ac22ba1da0cf18063622aa differs from prior tested product
66fc5ddb34900e6c11f3d87c71c4370eee24cbf4 only in documentation/launcher;
prior reporting checkpoint1512015295b97aa7f09f0ceb2b3121faab6c6fb4 is historical.
Previous3e678d2 / reportf633016 are historical
checkpoints, not the current implementation. No repository pushes. Normal/main remains unfixed.
GitHub summary sync confirmed: #355662640708, #365662640861, #375662641234, #925662641772,
#1055662641037, #1135662641608, #1145662641374. Remote summaries label all commits LOCAL ONLY.
Final runtime checks: normal3010/login, manual3020/login+8020/healthz, review3034/login+8034/healthz,
candidate3040/login+8039/healthz all200; no protected-service restarts or protected-data changes.
Only owned8039 was resumed from current API source, retaining its disposable synthetic database.
Local bundle is refreshed after this report commit using explicit committed repair/report refs;
no environment files/runtime databases/private inputs are included.

**Explicit engineering checkpoint, not the whole requested calculator correction.** Governing
clarifications: #1135662334267, #355662339238, #1145662344208. Partial user observations received;
no further bulk owner entry required; engineering reference verification and fixes active;
final acceptance pending. The79-case owner campaign is no longer a delivery requirement.

Verified base3a5fddc27ea898aad01f7a186cc06c62c5e66aec includes award application
8276e2a1f9a3eb7fe018021c616e4c180d0216c9, but **no PD-QA-019 repair**. New separate branch
repair/calculator-corrections-113: latest-edit37a495ee656c6850c6c670539bb5ec1ce6716330,
footerda196a97216fb9eb48e18bf2cf53bb74c29d492d, reusable harness/launcher
9ce17661239f71663908b0265552ac1cecc2e1b6. New calculator-only SNR reference boundary811ef5c,
conditional cashback/custom reference72a924e, everyday controls/percentage commission66fc5dd,
and Casino shared modal52a87af. Historical workbook/actual placed/settled engines are unchanged.
Main and frozen candidate remainf7a3b35073ecc87cdf8f8f881129f221ec44d395;
unmerged Multi-Lay215193b7fcb5b11a28e23a4531d2a45434545dc1 remains untouched.
Existing normal/manual3020/8020 and3034/8034 data/services, private observations and earlier
invalid audit fixtures are protected. Only owned disposable8039/3040 is used for these probes.

| Requirement | Result / evidence | Exact remaining scope |
|---|---|---|
|C01 PD019 latest-edit/autosave|PASS / PROVEN for the executed delayed-response cases|Cross-editor/network-failure and rapid settlement variants not established by these cases|
|C02 modal clipping|Scoped PASS / PROVEN|18/18 geometry/focus-entry/Escape variants now pass, including Casino6/6; dirty/pending/nested confirmation/focus-return and text-enlargement/interrupted-motion variants remain untested|
|C03 ingest/workbook|PARTIAL / DOCUMENTED|Current workbook normal/refund/same-odds remaining formulas traced below; receipt/cap provenance and SR internal workbook discrepancy require explicit resolution|
|C04 SNR presets/sign|Reference PASS / PROVEN; destination BLOCKED|19 independent numerical cases pass; desktop/half-width hub/pop-out show all four required references. Actual Normal and SNR loss clipboard is−2.64 with accessible accounting parentheses. Native embedded Under/Overlay still6.66/9.33; precise schema proposal below. No fresh external parity claim|
|C05 core scope/operational partial match|PARTIAL / CODE-VERIFIED|Standalone ordinary controls Normal/SNR; saved SR/bonus-win retained disabled. Part Lay dropdown removed; full embedded scope/actual fills/different-odds remaining hedge and all preset transitions need work|
|C06 percentage commission|Standalone PASS / PROVEN; embedded BLOCKED|12 exact helper cases plus browser0/2/5/2.125 percentages→0/.02/.05/.02125. Explicit ratio-tagged hub/pop-out state restores2%. Native row5% is discarded and reopens Profile2%; versioned per-plan override policy required. Full save/reopen round trips not established|
|C07 Simple/Advanced|Scoped standalone PASS / PROVEN; embedded PARTIAL|Shared CalculatorOutcomes full-width reference rows replace narrow nested cards; Under/Overlay/Custom coexist, slider follows Custom. Advanced preserves Standard; Simple restores equalised stake and preserves Custom draft. Mounted result identity survives invalid edits; copy/apply disabled pending/invalid. One held real response is superseded safely. Continuous pointer drag, enlarged-text and embedded parity remain unverified|
|C08 conditional racing Cashback|API PASS / PROVEN; UI PARTIAL|Three independent cases ordinary hedge then conditional cash/credit; separate credit face/retained estimate and cash-first total. UI reward selector added but embedded/receipt/cap and mode-leakage end-to-end not established; original CASHBACK-001 intent UNKNOWN|
|C09 engineering full acceptance|BLOCKED at destination planning contract|Frozen24385bf production build/typecheck/targeted lint pass;22 focused API cases (19 numerical +3 blocker probes),15 financial/percentage unit cases,4 real hub/pop-out variants pass. No source edits during final tests. Corrected plan save/reopen/actual settlement parity remains blocked; no PostgreSQL persistence change executed. Earlier frozen66fc5dd award evidence reconciled below, not relabelled as a new24385bf full journey|

### C04–C07 / core C09 — precise destination blocker, 2026-09-14

Result **BLOCKED**, evidence **PROVEN** for isolated SQLite native create/reopen;
**CODE-VERIFIED** for the schema/write-policy constraint. Three disposable regression
probes in `apps/api/tests/test_core_snr_parity_contract_gap.py` independently inspect
stored actual fields and schema: unplaced Underlay6.66 versus required6.25, Overlay9.33
versus10.20; explicit commission0.05 is cleared and returns Profile0.02. Passing
reproduction tests demonstrate a parity FAIL, not a working destination.

`db.create_free_bet/update_free_bet` clear row commission; Sportsbook equivalents
also clear it. Neither core ledger has a separately versioned authoritative planned
stake. Conversion target envelopes preserve original reference inputs/checksum but
native preview/reopen do not consume them as editable planning authority. Existing
Custom conversion uses `lay_actual`: that is not proof of planned-versus-actual parity.
Existing embedded copy/apply placement semantics must be separated under the new
planning policy, not silently treated as confirmation that an exchange filled an order.

**Smallest approval proposal**, recorded in the existing
[Free Bet contract](../contracts/free-bet-current-value-contract.md#core-new-plan-parity-proposal--approval-required-not-implemented):
one nullable versioned `lay_plan_json` field on each existing core ledger, preserving
contract version, basis, original planning inputs/odds/commission, selected strategy,
explicit reviewed planned stake and source identity. Existing actual fields keep
settlement precedence; unversioned historical rows retain their original lookup and
math. No backfill, migration, Notes workaround, strategy relabelling or guard bypass
was implemented. Corrected SNR Underlay/Overlay conversion remains422 before writes.
Approval of this schema/policy is required to continue NEW-plan persistence work.

Bounded runtime evidence: `verify_core_reference_controls_113.mjs` uses the real
owned8039 API and authenticated3040 hub/pop-out,1440/760px, both themes and motion
preferences. It verifies reference edges within1px, all supplied SNR stake/liability/
branch expectations, copy6.25 and actual loss−2.64, Custom9.00 selection, mode/draft
preservation, editable invalid odds with blocked stale copy, percentage requests and
no page overflow. One delayed real response is held while a newer request completes;
copy/apply stay disabled and the older result cannot replace11.96. This is not a
universal stale/network or live-pointer-drag proof. No browser-to-destination journey
or PostgreSQL NEW-plan claim is made. Original observations/workbook remain unchanged.
Redacted runtime evidence checksum8cc4058c6fa0af10b9e2b579523132ead1b2dc739baafcfa099546bf0d534353;
the durable summary above records method/build/results without private tokens or dumps.

No runtime/database/schema/financial-engine changes; only shared UI plus isolated
probes. Required enlarged-text, broader live drag/reset/saved-state variants and
native embedded parity remain explicitly unverified. C08 receipt/cap/conditional
cash-versus-credit work and C01/C02 additional network/confirmation gates remain queued.

### Current numerical, workbook and conversion evidence — 2026-09-14

Independent SNR outcome-target contract is versioned `snr-outcome-target-v1`, not a change to
historical workbook Free Bet engine. For F=10,B=4,O=4.2,c=0.02:
Standard7.18 / liability22.98 / back7.02 / lay7.04;
Underlay6.25 /20.00 /10.00 /6.13;
Overlay10.20 /32.64 /-2.64 /10.00;
Custom9.00 /28.80 /1.20 /8.82.
Raw endpoints F*(B-2)/(O-1) and F/(1-c), then existing HALF_UP penny placement; negative
or undefined endpoints are unavailable, not invented. Existing ledger legacy factor presets are
unchanged: corrected SNR Underlay/Overlay conversion explicitly422 before writes until a versioned
destination planning contract can preserve them. Standard/explicit Custom and legacy SR bridge
regressions still pass. Credit cashback cannot be saved as cash cashback; server guard rejects it.

Scoped run: `test_snr_outcome_target_reference.py`, `test_conditional_cashback_reference.py`,
`test_standard_calculator_configuration_matrix.py`, `test_calculator_conversions.py`:113 PASS.
An initial16 conversion setup failures came from absent implicitly seeded demo Profiles; harness now
explicitly creates isolated synthetic Profiles. An accidental uncommitted Each Way reference variable
caused2 failures, was corrected before checkpoint, and the complete focused run then passed.
These counts are test cases, not all-input or all-configuration acceptance.
Exact percentage helper12 PASS; TypeScript and targeted ESLint PASS; production Next16.3.2 webpack
build PASS with explicit isolated8039 API target. Existing4 C01 delayed-response variants reused.
Real modal18 variants:1440/760/390 x light/dark x Sportsbook/FreeBet/Casino;
body scrollWidth equals clientWidth, scrollLeft0, footer actions contained, no page overflow,
focus enters, Escape closes. Additional modal variants above remain untested.
Real half-width Standard: SNR selection/commission2/Advanced yields6.25,10.20,Custom visible;
Normal Overlay in both themes exposes accessible accounting loss(2.64) and selected stake clipboard
10.20. Original observed+2.64 JSON remains unchanged; no sign-code correction was made.
Source inspection and supplied observations are not a fresh live Outplayed/MBB execution.

Read-only approved workbook hash7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a,
original observation hash95112328fe4e9b61ad5dfe0c90b45ff70b35beaefca5d082692a9de76dffa6ac,
both reverified unchanged. Sportsbook master formulas U2/W2/X2/Y2/Z2/AA2/AC2 shared to row3:
actual S precedence, equalised M*N/(P-AB), HALF_UP-equivalent ROUND2, liability U*(P-1),
cash back/lay branches; Z2 maps `Lay Won + Cashback` to U*(1-AB), implicitly full stake
cash refund. AC2=MAX(U-T,0) only same-odds remaining; this is not an order-fill observation or
a general different-odds hedge equation. AE3 SettingsB10 retention, AF2 stake-seeded reward.
Free Bet V3: actual T precedence; Standard IF(SR,N*O,N*(O-1))/(Q-AE), then ROUND2;
legacy Under/Overlay multiply unrounded Standard by SettingsB8/B9. X2 liability, Y2/Z2
branch components, AA2/AB2 current/final/override and AD2=MAX(V-U,0).
**Workbook discrepancy retained:** SR Y2 uses gross N*O-liability, while SR AA2 settled branch
subtracts N again. No historical SR reinterpretation is authorised by this reference correction.
Named CommissionDefaults=SettingsH3:I1002; ResultList=BE3:BE1002; LayStatusList=BP3:BP5.
Original3010 observed build remains UNKNOWN.

Frozen candidate66fc5ddb34900e6c11f3d87c71c4370eee24cbf4: genuine award runner
`PQA_AWARD_WEB_PORT=3040 node scripts/verify_award_integrity_91.mjs` exited0.
Four variants1440/light,760/dark,1440/dark,760/light pass: single10 removal, second-child failure
rollback, refresh retry same operation, exactly5 SNR+5 SR, copy3.86/4.83, explicit actual3.50,
final5.30/10.30, qualifying-1.18 included in report14.42, pointer Save/no page overflow.
Lost committed response identity reuse exercised in the first variant only.
Synthetic evidence SHA25611dc2da77b5cde3fd07660ee05afb798ee17947866cd4a74398832518d6c1820;
raw evidence stays private/local. No application source edits during build/browser runs.
These executed award variants do not establish universal autosave or calculator acceptance.

**Exact next implementation:** obtain the minimal NEW-plan schema/policy approval before
core save/reopen parity; retain the server guard meanwhile. Complete corresponding
embedded controls and operational remaining hedges against that versioned representation.
C08 trace actual cap/receipt/credit award source semantics and mode transitions; keep
C03 SR discrepancy separate from core Normal/SNR, then C09 full fixed-candidate gates.
No owner bulk entry required. Wider #114 imports/ledgers/competitors/backlog coverage resumes afterward.

#### J11 fixed-build assertion reconciliation — not a new journey promotion

|Existing assertion|Valid revision/evidence|Exact limit|
|---|---|---|
|Single10, split5 SNR+5 SR, second-child failure/rollback/retry|Frozen66fc5dd,4 real variants|All4 pass; not repeated on24385bf|
|Committed-response loss and refresh preserve operation/IDs|Frozen66fc5dd first variant;8276e2a backend|Browser first variant only|
|Concurrent same operation, changed payload, deliberate later award|8276e2a SQLite and actual PostgreSQL18.6 backend|Not browser-concurrency proof|
|Unused-child removal/replay without resurrection|Frozen66fc5dd browser;8276e2a backend|Protected child/source UI denial still requires its explicit browser assertion|
|Protected source/child deletion, deletion-placement/issuance races, authority denials|8276e2a SQLite/PostgreSQL backend|Browser race/denial variants not established by ordinary Save|
|Child matching/copy/actual placement/settlement/report/reload|Frozen66fc5dd4 variants:3.86/4.83 copied,3.50 actual,5.30/10.30 + qualifying−1.18 =14.42|No autosave blocker for these bounded synchronized cases; broader stale/network safety remains C01|
|Legacy partial-group review/import lineage/full change-history consumer|Contracts/backend where applicable; PD018/PD016 retained|Imported source resolution and complete visible history remain distinct open gaps|

PQA-J11 remains PARTIAL until required user-visible protected-removal/history assertions
are reached; superseded pre37a495e autosave/clipping failures are historical, not the
current explanation. Audit denominators/totals unchanged46/87,8/24,14/27,24/133.

### Historical preceding reproduction and fixes — before52a87af/811ef5c

PD019 save used an older rendered form snapshot, then replaced current state with the server
acknowledgement and reloaded/rehydrated it. Later dropdown changes were dropped by the saving lock.
The repair keeps a synchronous current-form reference, reconciles only acknowledged fields,
invalidates pre-save reads and serialises the latest queued dropdown. A later draft prevents an
explicit Save from silently closing the editor. Unconfirmed saves keep the draft and show recovery
wording; this does not assert that a response lost after commit means nothing was saved.

The shared sticky footer was inside the form/body grid but used expanded width and negative inline
margins. It enlarged body.scrollWidth; keyboard focus scrolled the body horizontally, cropping
fields and actions. The shared footer now fits its parent grid with existing tokens. No hidden
overflow, text shrinking, z-index escalation or family-specific CSS. Casino's native panel has no
ModalBoundary integration and fails Escape; this is retained under PD-QA-004, not obscured by
successful geometry. No unrelated Casino focus/confirmation redesign was attempted.

### Historical preceding executed evidence — finite cases, not platform/calculator sign-off

- latest-edit.test.ts:3 independent form reconciliation cases PASS (later text, blank, zero,
  malformed draft; server normalization). TypeScript and targeted ESLint PASS, no warnings.
- verify_free_bet_latest_edit_113.mjs:4/4 current actual authenticated browser variants PASS,
 1440/light,760/dark,1440/dark,760/light; reduced motion on light. Gate a **real committed PUT**
  acknowledgement, enter5.00/5.20/7.00 before releasing it, queue another Exchange, then assert
  latest UI and independent GET. Edit actual7.50, real pointer Save/reopen GET and reference7.72
  PASS. Independent reference40/(5.20−0.02), penny7.72. No page errors. Body1180/660px has equal
  client/scroll widths, scrollLeft0, contained footer buttons and no page horizontal overflow.
- verify_shared_footer_geometry_113.mjs:18/18 geometry checks PASS: Sportsbook/FreeBet/Casino ×
 1440/760/390 × both themes. Keyboard focus stays in panel; contained44px-high action targets.
  Body clientWidth=scrollWidth1180/660/290, scrollLeft0. Escape12/12 Sportsbook/FreeBet PASS;
  Casino6/6 FAIL. Runner retains failing assertions, exits1, and reports geometry separately.
- Earlier development-state award harness4 full variants passed issuance/fault rollback/retry/
  lost-response/removal and child matching/actual placement/settlement/report. Children5.30/10.30
  plus qualifying−1.18=14.42 per offer. This run spanned uncommitted UI edits: **not exact frozen
  outgoing-build evidence**, not grounds to promote PQA-J11. Reusable harness now accepts3040.
- Harness-only setup errors (missing Account required fields, incorrect Betfair catalogue name,
  wrong free-bet reference response field, missing hyphen in Add free-bet accessible name) were
  corrected without weakening financial assertions. Casino Escape is a product failure, not one
  of those setup errors. No PostgreSQL suite rerun: server transaction code unchanged.

### Immutable observations and authority boundary

Original calculator-results-2026-09-14.json SHA256
95112328fe4e9b61ad5dfe0c90b45ff70b35beaefca5d082692a9de76dffa6ac retained privately.
79 embedded case definitions;37 session entries:12 Recorded,23 Blocked,1 Needs review,1 Not started.
Indices are interpreted using the embedded definitions. Blank is unknown, never0. Original
inconsistent status annotations and numerical strings are preserved. localhost3010/blank build
IDs make the observed source revision **UNKNOWN**; candidate reruns are separate evidence.

Latest original workbook WO_MB_Tracker_3Sept2026_1013AM.xlsx SHA256
7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a, read-only ZIP/XML.
FreeBets!V3 gives explicit actualT priority, else SNR/SR equalisation, with old Underlay/Overlay
factors Settings!B8/B9 applied **before** ROUND(...,2); AE uses Account commission lookup.
This establishes operational legacy semantics, not approval of the newly requested OP reference
presets. Other requested workbook mappings remain C03. No operational records imported or rewritten.

Read-only current API reproduction, source8276e2a, synthetic10/back4/lay4.2/commission.02:
SNR Underlay6.66, Overlay9.33: **confirmed mismatch** to supplied OP targets6.25/10.20. Current
adapter applies0.928/1.300 to the unrounded equalised stake. Requested targets instead derive
from specified branch targets; correction must be isolated from historical actual/settled values.
Normal Overlay with explicit10.20 returns back-win**−2.64** correctly at the API. Will's+2.64
observation stays unchanged; current rendered/accounting/copy provenance investigation remains.
Bonus-on-loss observations agree with supplied OP readings; do not alter them. MBB full-refund vs
70% retention explanation remains a hypothesis until identical reference settings are observed.
Public OP/MBB guidance/source inspection is DOCUMENTED, **not new black-box parity execution**.

### Checklist/handoff and unchanged scope

UI checklist: existing editor/ModalBoundary/form/FinancialValue equivalents reused; equivalent
footers searched; no new controls/icons/colours/financial equations. Theme/geometry/focus/real
FreeBet Save evidence above. Complete modal/production-build/motion gate remains incomplete, so no
owner smoke-test request. Optional existing-data launcher is in PROJECT_STATUS; --check succeeds
with legitimate private synthetic session. It prints full checkout SHA and never resets services.

Counts remain46/87 assessments53%,8/24 exercised and passing33%,14/27 competitor52% (12 docs,
2 hands-on),24/133 requirements18%; no denominator change or journey promotion this checkpoint.
No main integration, hosted verification, owner acceptance, push/PR/deployment or issue closure.
Next work is C03–C09 plus retained Casino PD004 gap; then resume workbook/ledger/award/import,
accessibility, competitor and requirement review. PD018 imported sources, #115 exposure,
#96 credential action and Vercel publication approval remain separate. No action needed from Will.

All earlier CURRENT headings/scorecards below are historical unless revalidated above.

## Current award-integrity repair — 2026-09-14 / LOCAL ONLY

Candidate branch `repair/award-integrity-91`; application fix
**8276e2a1f9a3eb7fe018021c616e4c180d0216c9** (atomic operation7a818fe2dd873ce7f7b6babb1962414e01f79f9c;
contextual recoveryb3397bd0e566129680f3593dbfe8bfc5852aba59).
Harness/contract checkpoint **eca15d6d022d240c5a22676c9a9232656f82a84e**.
Verified base **1295e2679db1856f67da0cb2cda82e4ad8cabdf9** contains Sportsbook
cb0f29068d5d4a24a61ec3e2a66afa91c3265a71 and inherited Account/Free Bet/Blackjack/modal repairs.
Previous report **a3084de1e409710408499aba436ed3703370aadc** is historical.
Exact outgoing report SHA is maintained in #114 living comment5652511529.
No product merge into the documentation-only audit branch.

| Coverage measure | Current | Whole % | Change this checkpoint |
|---|---|---|---|
| Evidence-complete assessments |46/87|53%|0 items / 0 points|
| Fully exercised journeys |8/24|33%|0 / 0|
| Passing journeys |8/24|33%|0 / 0|
| Competitor cells |14/27|52%|0 / 0;12 documentation,2 hands-on|
| Reconciled requests |24/133|18%|0 / 0|

**PQA-J11 stays PARTIAL, not promoted from an API test count.** The latest complete browser
attempt passed real award issuance/removal, injected failure/refresh/retry and lost-response
recovery, then failed at child matching: older autosave cleared entered lay odds (PD-QA-019).
A separately labelled award-review-only matrix checks the bounded award controls; it does
not substitute for placement/settlement/history/report steps. Earlier three-theme/width
ordered-entry settlement observations are retained as historical evidence, not current full
journey sign-off. PD-QA-016 full change-history and PD-QA-018 imported-parent resolution stay separate.

### PD-QA-017: reproduction, repair and disposition

**Result PASS / PROVEN for the executed server transaction/identity/removal matrix; current
full browser journey FAIL / PROVEN at the existing PD-QA-019 boundary.** No whole-platform claim.
Before edits five baseline failures exposed independent child POSTs minting15 credit for
a reviewed10 on retry, source204/orphans/history loss, unavailable atomic route, and the
source-placement child-removal guard. The first UI static test also had an incorrect repository
path (harness failure, corrected before the genuine source guard assertion).

New reviewed groups use one authenticated, Profile-scoped server operation:
`POST /profiles/:profile/sportsbook-bets/:source/free-bet-awards`.
Existing sportsbook audit primary-key identity stores canonical SHA-256-bound pending/committed
intent and the committed original child IDs. Durable pending intent is **not issued credit**.
All child validation/Account authority, existing calculation/response preparation, child writes,
source update and successful business audits share one mutation transaction. Nested existing
create/read helpers explicitly reuse its connection; no independent child commit or new engine.
Expected face value and explained variance remain reviewed values, not realised profit.

Same operation retries/concurrent processes reuse IDs; changed reviewed contents409. An explicitly
new later award gets a new operation and remains possible. Browser review/identity survives refresh
in session-local storage; ambiguous delivery keeps inputs and contextual error inside the active
editor. The first post-success click explicitly opens a new review rather than silently issuing it.

Removal rechecks child lifecycle, actual values AND retained placement history while holding the
Profile/database lock. An unused child can be removed even when its source is placed. Its complete
raw snapshot/audit history is retained on the source; committed replay reports removed IDs without
resurrection. Protected descendants deny409 without mutation. Source activity/award history cannot
be hard-deleted or reset to Pending/Prospecting to erase financial history; qualifying classification
cannot be cleared to bypass protection. Recorded qualifying activity is protected even before the
award claim, closing source-deletion-versus-issuance financial loss. Ordinary non-award deletion
and genuinely unplaced qualifying drafts retain their existing policy.

Two additional bypass regressions protect immutable child source/group/split identifiers and flag
legacy partial groups for explicit review; neither original-group retry nor a fresh full-group
request silently completes ambiguous credit. No duplicates, historical values or imported source
identifiers were automatically repaired. Replay after legitimate removal cannot remint credit.

### Executed evidence, independent values and exact limits

- Final application8276e2a: **227 focused API regressions PASS**, including17 award tests and inherited
  Account/Free Bet/Blackjack/Sportsbook safety. Targeted TypeScript/ESLint and new Python Ruff PASS.
- SQLite and **actual PostgreSQL18.6** each passed the same11 grouped assertion boundaries:
  second-child500 rollback; exactly two children/10 on retry; committed lost-response replay;
  changed-payload409; simultaneous same operation through separate processes/connections;
  deliberate later single10; unused removal/replay; protected/source deletion zero mutation;
  deletion-versus-placement and source-deletion-versus-issuance races; controlled missing/archived/
  foreign authority; final source response-preparation fault rollback/retry. State independently
  queried through sqlite3/psycopg, not inferred from HTTP status.
- PostgreSQL private loopback63474, synthetic test database, current schema only; test cluster stopped.
  No reinstall, hosted DSN, default5432, operational database, migration or unchanged recovery rerun.
- Independently: source actual9 at back10/back5/lay5.20/commission2%, Lay Won =−10+9×0.98=**−1.18**.
  Each generated5 child actual3.50, Back Won: SNR5×(5−1)−3.50×(5.20−1)=**5.30**;
  SR5×5−3.50×4.20=**10.30**. Whole offer =−1.18+5.30+10.30=**14.42**.
  Standard reference/copy children**3.86/4.83**; face value10 is promotional credit, not cash profit.
- Latest full browser attempt is retained separately in owned runtime `browser-evidence.json`:
  actual authenticated editor, genuine single/split generation (never seeded child links),500 injection,
  retained review/operation after refresh, real post-commit network abort/retry-original IDs, normal
  pointer/keyboard; child matching blocked by PD019. No forced clicks, hidden assertion failures or
  substitute API call counted as a complete browser step.
- Separate scoped award-review evidence **PASS / PROVEN** for all four1440/760 light/dark variants,
  private run2026-09-14; normal pointer Create and keyboard containment; genuine single10/removal,
  split5SNR+5SR, injected second-child failure/refresh/retry, no duplicate children, source Delete
  disabled. Actual first-variant post-commit network abort/retry reused original IDs. No page errors.
  It checks1440/760, light/dark, contained focus, real pointer Create, review/retry/removal,
  protected source Delete disabled and page containment. It deliberately does NOT claim child settlement.
- Private screenshot inspection also found a retained desktop modal clipping defect: left edges of
  Expiry/Expected Award Value/Notes labels and the disabled Save button are cropped at1440/dark
  (1440/light similar). The half-width screenshots retain readable aligned actions. Page-level
  overflow assertions alone did not establish modal containment. This is **FAIL / PROVEN by rendered
  pixels**, root sizing/scroll cause UNVERIFIED, existing PD-QA-004/005/#92 follow-up; no new CSS
  introduced or whole-modal acceptance claimed. No forced click or screenshot-only repair.
- Existing setup errors (missing onboarding module, unchanged-select event wait, calculator draft
  incorrectly assumed to autosave, original nested SQLite seed-lock) are distinguished from product
  defects. Calculator inputs are not assumed to issue an API update on blur. The unfixed PD019 rapid
  entry loss remains a product finding, not a harness skip.
- No screen reader, all numeric inputs, external calculator parity, hosted behaviour, complete import/
  restore/award history UI or operational historical records verified by this repair. Account lifecycle
  changes after committed issuance can still deny replay under current authority revalidation; the
  existing result is retained, no duplicate credit. This edge remains NOT TESTED.

Durable redacted evidence summary/checksums (no DB/token/screenshots committed):
SQLite `/private/tmp/openforge-award-91-pv_mr1f4/evidence.json`
SHA-256 `65b6cfab56f43d8280b479cc8ffc197b55b26149325e58c3bcbc0fe110c978a0`;
PostgreSQL `/private/tmp/openforge-pqa-pg-114-wxsk0yef/evidence.json`
SHA-256 `a0a80751cb44a2b882ec5be7ad682519a163acca77c785adf999219852540c66`.
Both explicitly identify application8276e2a. Raw artifacts remain isolated local-only.
Scoped browser `/tmp/openforge-award-integrity-91-20260914/award-review-evidence.json`
SHA-256 `b39c3c5c07e3918a789e0f2e448c88e1d42aabd3370a9f923b4a6056ab9733d5`;
full failed browser `browser-evidence.json`
SHA-256 `689e97f4bd0892665e019e02b47b64f34c7b0d3256aa8ef844b24ef76d0b03c6`.
Synthetic profile `profile-66fa7e6c3fd5`, four genuine group operations/each exactly two5 children;
first lost-response single retained IDs before legitimate removal. Captures are private troubleshooting
evidence, not committed raw screenshots. No actual user comparison observations were touched.

### Safety, integration and next return point

Main/manual candidate **f7a3b35073ecc87cdf8f8f881129f221ec44d395**, unmerged Multi-Lay
**215193b7fcb5b11a28e23a4531d2a45434545dc1**, normal/manual3020/8020 and review3034/8034
data/services and all _input originals/observations remain unchanged. Main/normal app does NOT
contain this repair. Owned synthetic award runtime3039/8039 is separate, authentication required.
Bundle verification and exact report/branch checkpoint are maintained in the handoff.

No push/PR/merge/deployment or issue closure. Future integration requires review of the inherited
stack and scoped product commits; rollback uses reverse reverts on an authorised review branch,
not historical data rewrite. No schema migration is required. #115 dependency/exposure, #96
owner/provider rotation and Vercel publication prerequisites remain separate and uncleared.

Next bounded repair **PD-QA-019 stale Free Bet autosave** is the genuine PQA-J11 browser blocker;
**PD-QA-018 imported-parent resolution** and the remaining full workbook/populated ledgers,
competitor/request/accessibility/recovery audit remain queued. No calculator comparison date.
No engineering regression assignment or action needed from Will for continued local work.

## Historical Sportsbook safety repair — 2026-09-13 / LOCAL ONLY

Branch `repair/sportsbook-safe-91`; verified base81af076cf67b5d0951aef9f1a8bca6fdafb841bc,
inherited application6d2276e00d0a1a540f48f7ecc253e864ad30d5e3,
harness92a170c7e839693b9f7451a909d4f192b6f3fcad, prior reporte1a461e028730bb046cb665c939a2d8343474ab3.
Repair product/tests **cb0f29068d5d4a24a61ec3e2a66afa91c3265a71**.
Main/normal app remains UNFIXED until reviewed integration. No push/merge/deployment,
migration, formula change, historical correction or manual calculator sign-off.

| Measure | Current | % | Change this repair |
|---|---|---|---|
| Assessments |46/87|53%|0 items / 0 points|
| Journeys exercised |8/24|33%|0 / 0|
| Journeys passing |8/24|33%|+1 / +4 points|
| Competitor cells |14/27|52%|0 / 0;12 documentary,2 hands-on|
| Requirements |24/133|18%|0 / 0|

PD-QA-020 fixed on branch; PD-QA-003 Sportsbook missing-Profile subcase repaired.
PQA-J07 native gates now pass on this candidate; original failing evidence below is
historical and retained. Other modules are not certified by sharing a helper.
PD-QA-017/018/019, wider workbook/ledger/recovery/accessibility/request review,
#115/#96 and publication prerequisites remain OPEN. Calculator manual comparison
remains deferred by Will with no date.

### Root cause, field policy and boundaries

Seven initial failing regressions reproduced malformed/non-finite creation500,
missing-Profile500, post-write preparation fault retaining a row/audit, and bad-row
unreadability before production edits. DB create/update committed before calculation/
response validation. Effective records now receive complete-string exact-decimal
validation; calculation, model validation and JSON prepare within the mutation
transaction. Unexpected faults remain honest500 with rollback; bad input is field-specific
4xx. Missing/archived/foreign Profile/Account denial leaves no business write.
Supported conversion shares the same create boundary; identity/idempotency remain unchanged.

[Existing Sportsbook field-policy contract](../contracts/sportsbook-current-value-contract.md):
new money precision is pennies; stakes/rewards non-negative, signed manual overrides
retained. Explicit zero valid, omitted update retained, null rejected, blank unknown
where lifecycle permits. Placed/Settled requires backing stake/existing odds prerequisites,
not a fully matched lay. Odds/commission/retention/boost preserve separate ranges/precision;
nested placed/matched stakes, odds and commission validated. No partial parsing or silent
rounding. Historical valid precision remains readable.

Legacy invalid fixtures retain raw identity/value; diagnostic review-required response
has null financial calculations. Relevant Sportsbook/exposure/current/combined summaries
are unavailable, never a silently complete subtotal; unrelated cash is not invalidated.
Migration totals also retain missing counts and unavailable totals. Native/portable export
rejects invalid data with record diagnostics. Explicit correction restores completeness;
no historical repair/deletion.

### Evidence and exact limits

- Sportsbook isolated SQLite safety matrix71 passed; inherited Account/Free Bet/current-value
  suites rerun. Blackjack source suite19 passed. Web focused money/summary/decimal42 passed;
  targeted lint/typecheck passed.
- Actual PostgreSQL18.6 targeted17 checks: synthetic private-loopback cluster, independent
  SQL snapshots, invalid create/update, calculation/model/JSON failure rollback,9.65reference,
  actual9.00/liability37.80, Back Won2.20, Lay Won−1.18, reopen and missing-Profile zero-write.
  No reinstall or unchanged recovery-suite repeat.
- Actual authenticated browser1440/light,760/dark,1440/dark,760/light:
  malformed text stays editable with associated error; keyboard correction/pointer Save;
  copied9.65, persistedactual9.00/liability37.80, settlement2.20/correction−1.18;
  reopen/report/reload; no page overflow/console errors. Separate legacy browser preserved
  not-money, showed record-ID incomplete notice and explicitly corrected to2.20.
- Browser artifacts: /tmp/openforge-sportsbook-safe-91-20260913/
  browser-four-variants-evidence.json and legacy-evidence.json. Redacted observations
  are durable here; no private DB/token/screenshots committed.
- Existing demo-seed-dependent tests are harness-blocked: conversion/workflow27 failures
  before applicable flows/1 pass; odds input41 pass/1 missing-demo-Profile fixture failure.
  Not reported as product mathematical failures or passing journeys.
- Unsynchronised Exchange autosave can erase newer odds; positive path synchronises on
  actual save response. PD-QA-019 remains OPEN, not fixed by successful slow tests.
- Import confirmation preparation is inside the transaction (CODE-VERIFIED);
  staged-import injected-fault runtime probe NOT TESTED. PostgreSQL legacy-list/export,
  wider nested-configuration and network-loss coverage are not inferred from17 native checks.

### Bounded related-path review

| Ledger | Write/validation entry | Transaction/response | Legacy-invalid handling | Evidence / next missing test |
|---|---|---|---|---|
| Accounts | Native create/update/pending withdrawal canonical policy | Inherited pre-success validation/preparation | Raw diagnostics, incomplete cash, controlled export | Inherited SQLite/UI/prior PG; alternate paths remain reviewed scope |
| Sportsbook | Native create/update/placement/settlement/shared conversion, import confirmation | Effective record + same-transaction calculation/model/JSON | Review-required rows/unavailable totals/export denial | SQLite, actual PG17, browser4 variants; import injected fault NOT TESTED |
| Free Bets | Native/update/placement/shared conversion/award | Inherited atomic preparation | Diagnostic/incomplete results | Inherited regressions; PD019 autosave and PD017 award-group integrity OPEN |
| Casino | Native and completed-session bridge | Inherited global source claim/atomic completed activity | General native legacy handling not fully assessed | Blackjack inherited source tests; native malformed/update/fault next |
| Extra Places | Native Each Way/Extra Place and bridge | Separate destination boundary, not certified here | Not fully assessed | Dedicated invalid-write/response rollback/legacy probe next |
| Cash Adjustments | Native create/update | Existing route constructs response after mutation | Not fully assessed | Injected preparation failure/legacy export probe next |

Next PD-QA-017: intended£10 split award must not become£15 on failure/retry;
concurrent/repeated attempts cannot duplicate; source deletion cannot orphan protected
children or erase financial history; legitimate unplaced removal follows#80.
PD018 imported-parent resolution and PD019 stale autosave remain separate.
Protected main/frozen f7/development/review3034/databases/_input unchanged.
No action needed from Will. Earlier current headings below are historical.

Final execution: focused SQLite211 passed plus Blackjack19 passed. Actual PostgreSQL18.6
runtime /private/tmp/openforge-pqa-pg-114-15yesosk,port54155, app cb0f29068d5d4a24a61ec3e2a66afa91c3265a71:
17 passed, cluster stopped. Evidence SHA2568131528cb8c55166d3742c1a493d95e73a8210221f80e8a524251e5ef4bcff8a;
browser-four-variants SHA256136cd2661eaefaa4149a4865b09486a0e241060043610faa5e873aac7a988902;
legacy SHA256b1aa847dee14e6e8dacc26c44febd22a85c0190e29999028399e757791488064.
Review8034 and owned8038 health200. Protected runtimes untouched.



## Populated Sportsbook, awards and native XLSX checkpoint — 2026-09-13

CURRENT / LOCAL ONLY. Application source remains `6d2276e00d0a1a540f48f7ecc253e864ad30d5e3`;
verified incoming combined candidate `c460f2a3074ede07bf7db9e30cec8c7e137ed6fa` and report
`b476b18ddb4eccadba0aff24b136bb27eb33effd`. This tranche changes audit harnesses/documentation
only; current harness commit `92a170c7e839693b9f7451a909d4f192b6f3fcad` is not a new application revision.
Outgoing full harness/candidate/report SHAs are in #114 living comment5652511529 and the
receipt; an unpublished report has no live GitHub blob link. Main/manual remain
`f7a3b35073ecc87cdf8f8f881129f221ec44d395`; Multi-Lay development remains
`215193b7fcb5b11a28e23a4531d2a45434545dc1`. Product ancestry and clean intended diffs verified.
No push, PR, merge, deployment, migration, policy/formula change or historical repair.

| Coverage measure | Current / planned | Whole % | Change from incoming / initial baseline |
|---|---|---|---|
| Evidence-complete assessments |46/87|53%|+4 / +15 percentage points|
| Complete journeys exercised |8/24|33%|+1 / +12 points|
| Journeys passing required checks |7/24|29%|0 / +8 points|
| Competitor cells |14/27|52%|0 / +26 points;12 documentary,2 hands-on|
| Requests reconciled |24/133|18%|+6 / +15 points|

New assessment IDs **PQA-F14/F17/D08/R04**: a reproduced defect completes an assessment,
not a successful journey. Areas: functional14/24, UX7/12, security6/12, data8/12,
sustainability5/12, requirements4/6, competitor2/9. Denominators unchanged.
**PQA-J07** is fully exercised but FAIL overall: positive numerical/control path passes;
malformed business write and missing-Profile denial fail. **J11/J18 remain PARTIAL**, not new
complete journeys. J11 cannot finish approved safe removal; J18 covers actual single-ledger XLSX
uploads, not the entire multi-sheet Profile migration/recovery path. Twenty retained findings:
15 open,5 fixed on candidate branches,0 full combined-candidate gates,0 integrated locally,
0 hosted verified,0 owner accepted. Deferred #113 comparison/sign-off is not counted.

### Reproducible setup, exact expectations and observed boundaries

New owned dataset/API `/tmp/openforge-populated-audit-114-20260913/acceptance.sqlite3`,
API8036 and web3036 in detached `.worktrees/populated-audit-114` at c460f2a; existing real
synthetic owner-session launcher reused, authentication required, no bypass. No private/demo
operational data, hosted target or inherited database. Original3034/8034 review/browser/data,
other protected runtimes, intentionally invalid earlier evidence and _input observations unchanged.
Initial setup failures (pnpm symlink check, Turbopack symlink root, missing web-side synthetic
session verifier configuration) are HARNESS failures, not product findings. Existing webpack dev
command and matching test-only verifier fixed setup; no packages/configuration changed.
Several old e2e labels target superseded controls; source inspection and visible active-tab
locators corrected the harness. No forced clicks. The wrong guessed report-summary API was
discarded: actual reports consume existing ledger sources.

| Stable case / method | Independently expected | Actually observed / result |
|---|---|---|
|J07-NATIVE-001 actual browser new→canonical Single/Bet & Get/Football→matching→copy→explicit actual9→save/reopen|10×5/(5.20−0.02)=9.652509…→reference9.65; liability9.65×4.20=40.53; reference branches40−40.53=−0.53,9.65×0.98−10=−0.543→−0.54|Reference/copy9.65; copy explicitly marks placement, not clipboard-only; manual actual9.00 takes precedence. Actual liability37.80; Back Won2.20. PASS / PROVEN finite fixture|
|J07-CORRECTION-001 browser settled reopen→visible shared EDIT→Lay Won→persist|9×0.98−10=−1.18|Native persisted result Lay Won/actual9.00/P&L−1.18. Reports/reload verified below. PASS / PROVEN|
|J11-SINGLE-001 real Sportsbook Free Bet tab/footer award|One10.00 SNR child with real source/group identity; no seeded parent IDs|One child created with parent native Sportsbook ID, split1/1, Available; visible source context. PASS / PROVEN scoped|
|J11-SPLIT-FAIL-001 real UI5 SNR+5 SR, second POST503 then retry|Failure/retry must not create duplicate award value|Before2 children (including imported child); failed attempt3; retry5. First5 child retained in incomplete group1/2; fresh retry group adds5+5:15 credit created for intended10. FAIL / PROVEN|
|J11-CHILD-SNR-5 browser matching/copy→actual3.50→save/reopen→Back Won|5×(5−1)/(5.20−0.02)=3.861003…→3.86 reference;5×4−3.50×4.20=5.30 final|Copied3.86; final5.30; source/group unchanged. PASS / PROVEN|
|J11-CHILD-SR-5 same actual UI, half-width/dark|5×5/(5.20−0.02)=4.826254…→4.83;5×5−3.50×4.20=10.30|Copied4.83; final10.30; source/group unchanged. PASS / PROVEN|
|J07/J11/IMPORT-REPORT-001 actual weekly/monthly report/reload|Imported2.20−native1.18+SNR5.30+SR10.30=16.62; remaining unplanned Available children have governed0 current value|Rendered16.62 (17 formatted matches), reload unchanged. PASS / PROVEN scoped, not calculator sign-off|
|J11-REMOVE-001 real linked child controls|Settled descendants protected; unplaced/unsettled child removal as #80 permits|Settled controls disabled correctly. Available child ALSO disabled: “Remove sportsbook back and lay placement first.” No forced click. FAIL / PROVEN requirement mismatch; J11 PARTIAL|
|J11-SOURCE-DELETE-001 authorised disposable API/independent persisted child state→actual report|Source deletion must not orphan placed/settled descendants|DELETE204, source absent, four children retain dangling source; reported16.62 becomes17.80 because−1.18 source removed. FAIL / PROVEN. No repair/recreation of synthetic rows|
|J18-UPLOAD-001 actual file chooser→review→acknowledgement→verified backup/confirm|Approved native one-ledger XLSX headers/tables;2 Accounts (12.34 and explicit0),1 settled Sportsbook2.20,1 linked Available SNR; original source identities retained|Three real generated XLSX files imported through browser. Confirmed batches, UI artifacts and independent Account/ledger reads retained. No dump/direct fixture substituted for upload. PASS scoped; full Profile workbook migration NOT TESTED|
|J18-INVALID-001 separate malformed Account workbook|Dry run controlled, no Account/ledger writes|Blocking finite-decimal field error; independent before/after business lists identical. PASS / PROVEN|
|J18-RETRY-001 repeat same files|No duplicate source rows|All valid repeated rows no_op; original confirmed reviews retained. PASS / PROVEN|
|J18-LINK-001 imported child/source identities|Imported QualBetID must remain provenance AND resolve its intended native parent/consumer|Child origin=PQA-IMP-QB-001; native parent ID=SB-DD13C2DD. No native identity match. FAIL / PROVEN stored-identity mismatch; full consumer reconciliation remains required|
|J18-EXPORT-001 real Accounts selector→Export XLSX→browser download|Valid12.34 and explicit0 remain exportable|Downloaded plum-duff-profile-…-accounts.xlsx without failure; valid original identities/values preserved in read/export source. PASS / PROVEN scoped|
|J07-INVALID-001 direct malformed Placed write, independent SQL then individual/list/export|Controlled field4xx; no committed row/dependants|500; one not-money back_stake row committed. Subsequent individual/list/export all500. FAIL / PROVEN; intentionally malformed synthetic row retained|
|J07-DENIAL-001 missing Profile with same payload, independent SQL|Controlled denial; no write|500, no row added. FAIL / PROVEN under existing PD-QA-003|

Numerical expectations above use signed contracts and explicit branch equations, not production
functions as their own oracle. Existing production penny placement is not changed.
Actual copy also preserved matched stake9.65 while the explicit actual9.00 won calculation
precedence; these reference/placed fields are not represented as identical observations.

### Findings and exact next tests

|ID / area|Expected vs actual / reproducible evidence|Severity / exposure / impact|Recommendation / acceptance / existing issue|
|---|---|---|---|
|PD-QA-017 Award transaction/lineage safety, main and candidate|J11-SPLIT-FAIL-001 retained first child/new retry group; UI safe unplaced removal blocked; J11-SOURCE-DELETE-001 source204/orphans, source audit removal boundary CODE-VERIFIED|High integrity; authorised award/retry/delete; inflated credit and financial history loss, not observed operational corruption|Bounded server-owned award attempt/group + transaction/idempotency; server child/source deletion guards aligned with #80, retained audit. Test child503 retry exactly2 children/10, concurrent retry, source/settled-child deny unchanged totals; safe Available removal. #49/#80/#91/#114. Extends previously recorded dangling-source failure rather than erasing it|
|PD-QA-018 Imported parent identity/consumer gap, integrated locally|J18-LINK-001 now resolves through Profile + logical namespace + external ID on normal 3010; legacy uncertainty remains explicit|Local lineage repair proven; main/hosted integration and the separate #109 access vocabulary remain open|Retain collision/retry/portable-restore regressions and never reinterpret `legacy_unresolved` rows. #12/#80|
|PD-QA-019 Free Bet autosave stale draft overwrite, candidate|Fast Back odds5→Exchange selection→Lay odds5.20: earlier Exchange PUT200 returns lay odds blank, subsequent preview200 has no plan; copy never appears. Source handler resets form from response. Later synchronised run waits for committed Exchange change before next input and passes; this does NOT repair race|Medium–high reliability; fast matching entry; erased draft, blank guidance “Complete calculator inputs: .”, copy unavailable|Latest-edit/response guard at existing shared state boundary, no second financial engine. Deterministic deferred PUT test must preserve5.20/newer input and latest copy. #91/#92/#114. Original race trace DOCUMENTED observable run + CODE-VERIFIED response reset; broader stale-request variants NOT TESTED|
|PD-QA-020 Sportsbook monetary pre-commit/legacy reads, main and candidate|J07-INVALID-001500 after INSERT; same bad row poisons individual/list/export500|High financial integrity; authenticated native creation; persistent corruption blocks unrelated readable rows/export|First small repair: field-specific complete-decimal validation/effective record, calculation/response preparation inside existing transaction, useful legacy-invalid diagnostics. Reuse Account/Free Bet patterns, no formulas/migration. Regression invalid create/update/injected prepare fault zero writes, valid actual9 final2.20/−1.18 unchanged, readable incomplete report. #91/#114; missing-Profile500 extends PD-QA-003|
|PD-QA-021 Ledger deletion-history loss, integrated locally|Normal 3010 now writes Profile-scoped append-only evidence for five financial ledgers and denies physical deletion of meaningful activity|Durable storage/report semantics pass locally; full chronological history presentation remains PD-QA-016 and hosted state is unchanged|Retain append-only/idempotency/report-once regressions while completing the separate history viewer. #80/#90/#114|

No destructive correction of historical/operational data. New unsafe-source deletion and malformed
writes were deliberately executed only against this tranche's disposable synthetic records.
No product fixes in this audit. Safe unplaced removal, protected reversal, actual child-delete
server denial, concurrent award requests and network-loss award recovery remain NOT TESTED/BLOCKED
or FAIL as specified, not inferred from the creation/copy pass.

### Requirement reconciliation — original scope and later clarifications

Six newly reconciled request IDs; #109 already counted and not counted again. Review disposition is
DOCUMENTED, not implementation PASS. Original issue bodies and all available comments read this
tranche; no historical thread outside this coherent package reread.

|Request / intended outcome|Authority, current implementation/plans/evidence|Remaining functionality/UX/dependency|
|---|---|---|
|#49 generated Free Bets from a qualifying row, defaults/editability/typed lineage/status timing/duplicate safety|Original +5561926348 editor-entry verification recurrence. Existing real typed Free Bet tab/footer reached; genuine single/split SNR/SR issuance exercised|Partial child failure leaves incomplete group; retry duplicate and source status becomes Free Bet Awarded. Preserve closed implementation history, outstanding #80/PD-QA-017 verification; no claim old editor presence proves whole workflow|
|#80 safe removal/source-group/placed-descendant protection|Original has no comments; linked source panel/removal guards and actual API tested|Unplaced child blocked by source placements; API source deletion orphans descendants; audit retention guard required. Planned repair, not silently narrowing allowed child removal|
|#12 controlled Profile import/export/staging/mapping/validation/lineage|Original has no comments; approved roundtrip/map contracts; actual single-ledger upload/review/backup/confirm/reopen/report/export|Full multi-sheet Profile workbook, cross-Profile source collisions and invalid multi-ledger atomic batch remain NOT TESTED; imported parent alias unresolved; #109 mapping/access gap retained|
|#94 workbook runtime/hosted delivery/Profile eligibility|Original three preserved IDs WORKBOOK-RUNTIME-001/WORKBOOK-HOSTED-001/PROFILE-EXPORT-ELIGIBILITY-001; no comments; existing portability gates reviewed|DEFERRED provider/template/explicit Profile authorisation; local XLSX structure is not Google bound-script edits/recalc/disposable-row delete or hosted parity. Do not use private Founder inputs|
|#95 three-way source snapshot/current/incoming conflict review|Original WORKBOOK-MERGE-DESIGN-001 has no comments; snapshot/identity/source-authority design contract reviewed|DESIGN ONLY, no merge writes authorised/implemented. Manual conflict decisions, stable IDs/formulas-as-reference, no deletion or guessed financial truth|
|#104 preserve accepted Founder September financial AND operational readiness baseline|Original FOUNDER-IMPORT-BASELINE-001, no comments; retained onboarding/import/source evidence and synthetic isolation|ONGOING SAFETY BASELINE; no reimport of operational records, no assertion new minimal fixture verifies all Founder cases; keep #109 and explicit import/recovery checks|

### Durable redacted evidence and reproducibility

Harnesses: scripts/verify_populated_sportsbook_award_import_114.mjs (native/award and --import,
--inspect/--removal resumable probes), scripts/verify_genuine_award_child_114.mjs,
scripts/build_populated_import_audit_114.py, scripts/verify_sportsbook_write_denial_audit_114.mjs
(--reads avoids repeating malformed write). Source-linked children come ONLY from genuine browser
award generation. Existing synthetic XLSX exporter builds files, never expected money answers.
Initial observations file was overwritten by a concurrent diagnostic harness run; confirmed batch
audit and original browser confirmed screenshots recover that evidence. Separate outputs and
runs.jsonl now retain audit runs; this harness failure is not a product pass/fail.
The report itself retains redacted observations, equations, failure state and checksums below;
temporary screenshots/DB artifacts are supplementary, not the sole durable evidence.
Session tokens, environment values, private observations and database dumps are not committed.

|Retained artifact identity (owned synthetic runtime only)|SHA-256 at evidence checkpoint|
|---|---|
|populated-evidence.json|8165b6bb5119be9da01101edf80d816c7b9378af02972338e32dd46595d8f576|
|import-evidence.json|0880ad73abc0164cf4594c59bbb2cddb99dd83e2d919a5be908b1be57db2b26b|
|inspect-evidence.json|06c293a112f86a4c49b58d595fb8dad47edd81374e600c9ad55ba6bf2eeffae5|
|genuine-child-evidence.json|ca9aca8bda0a53574a9664709c5b82ccc45f56373aa75695d1203bacad7fdd0f|
|browser-accounts-export.xlsx|a1ff3127a56b49061a01b69f7fd01de9b16e5f3591588be346a44ab990037a51|
|sportsbook-write-denial-evidence.json (including downstream reads)|062b371ba6054d9d3079ec3d3ee19c36eedc44f0cbc419999096ba23df97cfa2|

Actual authenticated browser: native/issued/imported editors, pointer Save/copy, Escape and focus;
reopened Sportsbook/Free Bet/Accounts at1440 light and760 dark, no page overflow, focus in dialogs;
screenshots privately inspected. Report data readiness explicitly awaited; initial empty shell
screenshots were NOT counted. UI/artifact evidence is finite, not full accessibility certification.
No unrelated modal/reflow suites or unchanged PostgreSQL suite rerun.
PG18.6 transaction/backup/restore evidence from preceding checkpoint remains scoped PASS.
Screen-reader, larger/imported datasets, award concurrency/recovery, full multi-sheet workbook
migration/export/import, external Google workbook runtime and remaining109 request reconciliations
are not implied PASS. Remaining request count is109 (133−24); orphaned source requirements remain.

Next highest-value implementation proposal: PD-QA-020 Sportsbook pre-commit and controlled
missing-Profile/legacy reads first, then PD-QA-017 server award integrity in a separate tranche.
Next independent audit package: full synthetic Profile workbook migration/recovery + cross-Profile
source-ID/parent resolution, remaining Casino/Extra Places/Cash movements and large-data/accessibility.
No manual testing assignment. #113 manual comparison deferred by Will, no date; resume only on
supplied results/explicit request. Vercel publication metadata/branch exclusions, #115 dependency
exposure/remediation and #96 owner/provider rotation remain separate BLOCKED prerequisites.


Historical preceding checkpoint: [2026-09-13 actual PostgreSQL checkpoint](#actual-isolated-postgresql-execution--2026-09-13).
Reporting branch audit/platform-quality-114; repair branch repair/modal-boundary-114.
Main remains unfixed and owner calculator comparison remains deferred indefinitely.

## Actual isolated PostgreSQL execution — 2026-09-13

HISTORICAL CHECKPOINT / LOCAL ONLY. Will explicitly approved a local server installation solely for isolated audit
tests, with no service activation, existing database changes or hosted access. Product source remains
`6d2276e00d0a1a540f48f7ecc253e864ad30d5e3`; incoming combined checkpoint
`2d3bb086923b3baaeca72e0736fdc81f4d9940df`, report parent
`6c025c03d66a93a196e1f273d74b6fe6095cba07`. Outgoing exact combined/report commits are maintained
in #114 living comment5652511529 and the receipt. Changes are test-harness/documentation only.
Main/frozen f7, development215193b, normal/manual/review services/databases and observations remain
protected. No push, PR, merge, deployment, formula change or calculator sign-off.

| Measure | Current / planned | Whole % | Change this checkpoint |
|---|---|---|---|
| Evidence-complete assessments |42/87|48%|+2 assessments / +2 points|
| Complete journeys exercised |7/24|29%|+1 journey / +4 points|
| Journeys passing required checks |7/24|29%|+1 journey / +4 points|
| Competitor cells |14/27|52%|0;12 documentary/2 hands-on|
| Requests reconciled |18/133|14%|0|

New complete IDs **PQA-D06/D07 and PQA-J21**, with actual backend runtime recovery evidence below.
J21 is the explicitly backend writes/concurrency→backup/restore→read/rollback journey, not a
browser import/restore or deployment disaster-recovery certification. Denominators remain87/24/27/133.
Area assessment: functional12/24, UX7/12, security6/12, data7/12, sustainability5/12,
requirements3/6, competitor packages2/9. Initial baseline33/5/7/4 changes are+10/+8/+26/+11
percentage points. Finding stages unchanged:16 retained,11 unfixed,5 candidate-branch repairs,
0 full combined-candidate verification gates,0 integrated locally/hosted verified/owner accepted.

### Installation and isolated target safety

PostgreSQL **18.6 (Homebrew), x86_64 macOS** actually executed; `SELECT version()` retained.
The initial ordinary Homebrew install stopped on an API/formula error and proposed unrelated
dependency upgrades. No such upgrade occurred. The official bottle was fetched with SHA-256
`3d6375c9f23f3904465f26e99eed103f13568abf6aa42b5f4fc703b5b183c99e`.
A private extraction showed unrelocated install paths; the final server was installed in its own
`/usr/local/Cellar/postgresql@18/18.6` keg with dependencies skipped and post-install skipped.
Homebrew reported symlink conflicts with existing libpq; **no unlink/overwrite/forced link** was used.
Only previously absent server-specific share/library links were supplied; existing libpq18.4 and
seven runtime library versions remain unchanged. No default `/usr/local/var/postgresql@18` cluster
was created. No `brew services start`, launch agent or persistent background service enabled.

Final isolated runtime: `/private/tmp/openforge-pqa-pg-114-9lt0fep4`, port**60936**, loopback only,
private socket, synthetic role `pqa114_owner`, databases `pqa114_primary` and `pqa114_restored`.
The harness rejects port5432/non-test targets and checks database/role/port/unique marker identity
before application use. Inherited PG/application configuration is removed from tool commands;
application configuration explicitly selects the disposable DSN. Only synthetic factories used.
Current application schema initialized through the existing PostgreSQL adapter/migration boundary.
Actual API handlers run through authenticated TestClient against real psycopg connections; SQL
snapshots are independent of HTTP responses. Concurrency uses two spawned processes, not mocks.

Reproduce without touching protected data:
`scripts/run-python.sh scripts/verify_platform_postgres_114.py --pg-bin /usr/local/Cellar/postgresql@18/18.6/bin`.
Each invocation creates a new directory/port/database pair; it does not reuse the old test cluster.
Final artifacts: `evidence.json`, `postgres.log`, `synthetic-backup.dump` in the isolated runtime,
retained locally and not committed. The server was stopped in finally; `pg_ctl status` is checked
independently. Server installation alone is not hosted approval or a persistent service request.
Executed harness checkpoint `df1cb0ade86c222d3d57f0668c8a5e61b8f7cb46`; harness SHA-256
`73317a82e5756618e567177f5b2ad92911c582e61167391d033c640a4af67531`.

### Actual results — PASS / PROVEN for these finite boundaries

| Boundary | Execution and independent evidence | Result |
|---|---|---|
| A Account create/update | Balance and pending-withdrawal not-money/NaN/±Infinity/unsupported precision/null return422. Independent SQL snapshots of records/dependants/audits unchanged; valid prior balance retained. | PASS |
| B Free Bet atomic save | Malformed value and invalid actual-lay update422; injected calculation/response JSON faults create/patch500, unchanged native SQL records/audits. Legitimate500 not disguised as422. | PASS |
| C Completed Blackjack | Fault after successful-claim SQL produces500 with no Casino/audit/notification or successful claim. Retry succeeds once; sequential retry returns same ID. Other Profile/Account409 without business mutation. Separate-process same-target and cross-target races each200/409; retry returns successful row. Three distinct snapshots yield3 rows, total45.00,3 notifications with exact Profile/record links. | PASS |
| D Valid saved/reopened values | £10 at5.00/5.20,2% commission, actual lay7.00: SNR reference7.72/final10.60; SR9.65/20.60. Native persisted inputs rechecked; independently derived back-win cash minus actual lay liability confirms31.20 combined. Derived Free Bet P&L is not a stored column. | PASS |
| E Backup/restore/restart/rollback | pg_dump custom-format → SECOND database pg_restore; server restarted with explicit logfile. Exact selected business/audit/source row snapshots equal. Restored counts:2 Profiles,9 Accounts/9 Account audits,2 Free Bets/4 audits,3 Casino/3 audits,3 conversion claims. Values reopen unchanged; injected post-restore response failure rolls back; same-source retry returns original ID, other target409. | PASS |

Final backup SHA-256: `7b083b56fc0f00dd7c055eae60e22641ec90c34d8b4006936c64f0a2cf32006f`.
Prepared-harness assumptions were corrected without changing application logic: explicit server
tool/share/library paths, canonical /tmp marker identity, Path/string normalization, and SQL source
checks instead of an imaginary stored Free Bet final_net_pnl column. An added restart initially
inherited a captured stdout pipe; only that disposable server was stopped, logfile routing corrected,
and the full final run passed. These earlier setup/control failures are harness failures, not product
financial defects. Prior failed artifact/log directories remain as historical evidence; none is PASS.

### Remaining checks and next work

This does not verify all field/configuration combinations on PostgreSQL, account legacy-incomplete
aggregation variants, browser hosted recovery, cloud/deployment rollback, workbook/award imports,
backup privacy/custody/retention, provider auth/network-loss or large datasets. Those named checks
stay OPEN/PARTIAL, not inferred PASS. PQA-J06 still lacks the full change-history consumer (PD-QA-016);
visible source Notes and £24.80 financial slice remain evidenced separately. Other populated ledgers,
genuine award linkage/removal and imported lineage are the next independent audit package.
Preview/publication remains BLOCKED by prior Vercel deployment disposition/approved Git-trigger
guard, isolated authenticated deployment configuration, #115 exposure disposition and #96 owner/provider
rotation. Actual local PostgreSQL is no longer that prerequisite's blocker. Normal app remains unfixed
until reviewed integration and post-integration smoke; no automatic integration. No engineering
regression assignment for Will. Manual calculator comparison remains DEFERRED/no date.

## Historical lineage, PostgreSQL and task/intelligence checkpoint

CURRENT / LOCAL ONLY, 2026-09-13. Verified incoming combined candidate
`f7c6bb3e7bdc6425272d943e697dcc8de9481693`, report parent
`73d71aae101e36f75f1db604ba1ad14880f3a19f`; both descend from the previously reported checkpoints.
Product source remains `6d2276e00d0a1a540f48f7ecc253e864ad30d5e3`: this tranche adds audit harnesses
and documentation, not application changes. Exact outgoing combined/report SHAs are maintained in
#114 living comment5652511529 and the delivery receipt. No push, PR, merge or deployment.
Main/frozen manual candidate `f7a3b35073ecc87cdf8f8f881129f221ec44d395`, development
`215193b7fcb5b11a28e23a4531d2a45434545dc1`, protected databases, review3034/8034 and original
comparison observations are unchanged. Manual comparison deferred by Will; no scheduled date;
resume on supplied results or explicit request. Optional local review does not block engineering.

### Current measured coverage

| Measure | Evidence-complete / planned | Whole coverage | Change this tranche | Change from initial baseline |
|---|---|---|---|---|
| Assessments |40/87|46%|+2; +2 points|+7; +8 points|
| Journeys fully exercised |6/24|25%|0|+1; +4 points|
| Journeys passing required checks |6/24|25%|0|+1; +4 points|
| Competitor cells |14/27|52%|+1; +4 points|+7; +26 points|
| Requests reconciled |18/133|14%|+9; +7 points|+14; +11 points|

The incoming baseline was38/87,6/24,13/27,9/133. Denominators remain87/24/27/133;
no exclusions or scope additions. Area assessment: functional12/24, UX7/12, security6/12,
data5/12, sustainability5/12, requirements3/6, competitor packages2/9. Newly assessed IDs
**PQA-R03, PQA-C03** are documentary reviews, not implementation/runtime PASS. Competitor cells:
12 documentation-only,2 hands-on,3 blocked,10 unresolved/unexamined. No new hands-on competitor
cell or complete journey is claimed. PQA-J06 remains PARTIAL; PQA-J21 remains BLOCKED.
Finding stages:16 retained findings (new PD-QA-016),11 unfixed,5 repaired on candidate branches,
0 full combined-candidate gate completions,0 integrated locally,0 hosted verified,0 owner accepted.
Stages measure different evidence; they are not additive readiness scores.

### PQA-J06: source consumer reached; full change history missing

Result PARTIAL. The existing financial slice (£7.40 SNR + £17.40 SR = £24.80) was not replayed.
Source-driven rendered checks exercise the actual native editor path:
**Settlement → Advanced controls → Notes**. Keyboard activation opens/closes that disclosure;
the read-only Notes textbox exposes the persisted calculator source ID/SHA-256 in its accessible
name/value tree. The structured immutable envelope remains in `calculator_conversion_targets`.
Both SNR/SR records were checked at1440/760px in both themes:8 observations, no page overflow,
Escape close, source note matching API and business rows/audits unchanged. No reader execution.
Artifact: `/tmp/openforge-modal-114-repair/free-bet-lineage-surfaces.json`; runner:
`scripts/verify_free_bet_lineage_surfaces_114.mjs`. An initial getByLabel locator included nested
textarea text; inspection of the actual accessibility tree resolved this harness error with the
existing named textbox. It was not evidence of absent Notes or a new application label defect.

These calculator-converted records legitimately have no qualifying-bet award parent. A calculator
source is not a sportsbook-issued award; no synthetic parent should be invented. Separate native
award-group/source removal coverage remains open. SQL confirms each converted record has one
created and three updated audit entries. The editor exposes no full chronological record-change
consumer, and the available reminder-audit endpoint is not that consumer.

| ID / branch | Expected versus actual | Result / evidence | Impact / priority | Recommendation / acceptance | Issue |
|---|---|---|---|---|---|
| PD-QA-016 / combined candidate | Authorised row change history reachable; four business audit entries per row exist but no full editor/history consumer connects them. Calculator Notes source is reachable. | FAIL; CODE-VERIFIED absent connection and PROVEN bounded rendered surface | Medium; correction/lineage review lacks visible audit context; no new financial misstatement established | Proposal only: reuse governed read-only detail/history pattern. Created/updated/placed/settled history chronological, Profile isolated and reloadable; source identity shown; award parent only for genuine award; no recalculation. | #36/#114, existing lineage scope |

### Real PostgreSQL attempt: missing server, not a transaction PASS

Result BLOCKED / PROVEN environment prerequisite. `initdb`, `pg_ctl`, `psql`, `pg_dump` and
`pg_restore` are client toolkit18.4. Actual initdb failed before cluster creation:
`program "postgres" is needed by initdb but was not found in the same directory as
"/usr/local/Cellar/libpq/18.4/bin/initdb"`. The matching `postgres` binary is absent; scoped searches
of installed package/application locations found no alternative server distribution. Earlier tool
availability was insufficient evidence of an executable local server. PostgreSQL **server version
UNVERIFIED**. No operational/inherited DSN, port5432, hosted access or real data was used.

`scripts/verify_platform_postgres_114.py` is a prepared, NOT EXECUTED transaction harness. It uses
a uniquely created /tmp directory, private socket, unused loopback port, synthetic role/two databases,
explicit identity/comment checks, independent SQL snapshots, separate-process race connections and
finally cleanup limited to its own cluster. The current guard exits2/BLOCKED before startup when
the matching server is absent. Artifact `/tmp/openforge-pqa-pg-114-a08gh_xx/evidence.json` records
client18.4, incoming app checkpointf7c6bb3, port50432 and the missing-server path. Syntax compilation
passes; that is not PostgreSQL evidence. Only this tranche's empty runtime/artifact directories
were created; no server was started or protected service/database changed.

| Required PostgreSQL boundary | Actual execution | Next test / prerequisite |
|---|---|---|
| A Account rejection / unchanged values and audits | NOT TESTED | Matching existing local server path, or approval to install a server distribution; then explicit test-only cluster |
| B Free Bet preflight and injected-failure rollback | NOT TESTED | Same prerequisite; persisted SQL snapshots independently of HTTP |
| C Blackjack retry / cross-target / separate-process race | NOT TESTED | Same prerequisite; separate real PostgreSQL connections |
| D Saved/reopened £10.60 SNR and £20.60 SR | NOT TESTED | Same prerequisite; independent totals and SQL reads |
| E Dump → second database restore / identities / duplicate protection | NOT TESTED | Same prerequisite; pg_dump/pg_restore, exact counts/source claims and post-restore retries |

PQA-D06/D07 and J21 cannot advance from this attempt. No adapter mock, SQLite result or prepared
harness is substituted for real PostgreSQL. After execution J21 still needs every required recovery
step, not merely transaction tests. No package installation was authorised or performed.

### PQA-R03: retained task/intelligence requirements

All nine original issues were read; #86 clarification5569417310 was read (the other eight had no
comments). Existing draft target/decision-support contracts and fixture specs were inspected,
including `target-progress-calculation-contract.md`, `offer-decision-support-workflow-contract.md`
and `target-progress-and-decision-support-fixture-spec.md`. A draft fixture plan is not executable
financial authority. Current Dashboard has basic weekly/monthly/annual target progress; this is
not the requested biweekly/versioned target lifecycle or offer-aware decision engine. Common Bet
Combos, reminders and Notifications are partial building blocks, not proof of the whole package.

| Request | Original user benefit and retained clarification | Current implementation / plan | Missing capability / dependency / disposition |
|---|---|---|---|
| #25 | Explainable target-driven offer decisions, weekly/biweekly/monthly, Profile/combined risk and cash-first scenarios | M12 draft decision workflow; basic target cards | Offer-aware advice, cadence/risk/downside thresholds and approvals; depends #26–30/account eligibility; planned, not implemented |
| #26 | Target scope/status/history, safe/stretch amounts, rollover/archive and explicit current versus settled basis | Basic settings/progress; draft target contract | Biweekly/custom lifecycle, versioned target entity and history; approve tolerance/report basis/carry policy |
| #27 | Standard/underlay/overlay/no-lay and explicitly approved casino recycle choices with target/risk explanations | Calculator strategies exist; decision workflow draft | No verified target-aware ranking/reason trail; casino advice needs #29 and governed scenarios; strategy availability is not advice evidence |
| #28 | Historical cadence/seasonality with confidence, visible evidence and weak-data fallback | Future planning only | Historical/time-window/source-confidence model; no hidden weights or scoring before approval |
| #29 | Withdraw/partial/full/fixed winnings or own-cash recycling with safe/downside/upside and explicit extra-risk consent | Draft workflow, not an advice consumer | Scenario/financial contract, own-cash permission, audit/report trail; no automated wagering |
| #30 | Six governed recommendation/target contracts plus ahead/on/behind and risk fixtures | Target/decision fixture draft exists | Full six-contract set, thresholds/weights and independently approved fixtures; preserve uncovered scenarios |
| #31 | Optional DDHH fixture/player/racing AI context, baseline/delta/source/confidence/human confirmation and offline fallback | Deferred advisory plan | Provider/cache/privacy/search/structured outputs approval; no credentials, autonomous action or AI financial oracle |
| #72 | Daily/weekly/free-to-play opportunity catalogue with source freshness, per-Profile eligibility and reviewed ledger draft/reminder creation | Common Combo presets/reminders/opportunity workflow partially exist | Full fresh-source filters, stale reverify/archive, account warnings/blocks and review linkage; depends #70/#82/#85/#106; profitability not inferred |
| #86 | Explainable tasks plus compact Kanban Complete/Ignore/Skip/No-Low-Value, reasons/value/RTP, cadence/preferences/history; optional later AI | Reminders/dashboard actions exist; task deck draft | Unified task engine and governed dispositions, preferences/history and source-account/balance freshness; clarification5569417310 retained, no hidden auto-priority |

Requests are reviewed as plans/partial building blocks, not runtime PASS. Separate future Bonus SR,
Accumulator/reference gaps, #113 deferral and unlocated historical source requests remain visible.

### PQA-C03: recording and recovery comparison, with limits

Public evidence accessed2026-09-13. Outplayed describes MyBets expected value and actual outcomes
([official tools guide](https://outplayed.com/blog/outplayed-pro-tools-data), updated2026-08-20).
OddsMonkey describes recorded profit/time/tool filters
([official tracker](https://www.oddsmonkey.com/matched-betting/profit-tracker/)). These existing
documentation cells were deepened, not counted again; member interaction remains inaccessible.
Newly located [MBB homepage](https://matchedbettingblog.com/) documents offer-progress tracking.
**C03/MBB advances to DOCUMENTED limited progress capability**, not a financial ledger or proven
expected-versus-actual tracker. The latter remains unlocated/UNVERIFIED; no absent-equivalent claim.
No new hands-on recording/recovery interaction, login bypass or numerical parity is asserted.

OddsMonkey's [2023 reset guidance](https://help.oddsmonkey.com/hc/en-gb/articles/10263028145181-How-Do-I-Reset-My-Profit-Tracker)
describes a member Settings deletion path; its
[2026-01-28 guidance](https://oddsmonkey2.zendesk.com/hc/en-gb/articles/32997810911633-How-Do-I-Reset-My-Profit-Tracker)
directs users to support. Both warn recovery is unavailable. This is a documented version/app-generation
difference, not an observed current member workflow. Existing C06/OddsMonkey stays documentary;
no extra comparison numerator. Our implications: explicit reviewed activity state, distinct projected
versus actual cash performance, explainable task dispositions and correction/history recovery matter
more than copying vendor totals or irreversible reset. #86/#111 and source freshness dependencies
remain the relevant retained requirements; no autonomous wager recommendations.

### Next bounded audit work and publication gates

First unblock actual PostgreSQL with an existing matching server distribution/path or explicit
installation approval; no Will regression assignment. Continue independent populated Casino/Cash
Adjustment/Extra Place ledgers and genuine award-group/source removal/import/restore checks while
that prerequisite is unresolved. Retain network-loss recovery, full combined reports, large data,
screen-reader execution and orphaned historical requirements as named OPEN/BLOCKED rows below.
Do not repeat the already accepted modal/reflow gate absent a regression.
Normal app still lacks the repair stack. Preview remains BLOCKED: prior Vercel deployment disposition
and approved Git-trigger rule, isolated authenticated API/PostgreSQL, #115 exposure disposition and
#96 owner/provider credential rotation. Existing redacted deployment-metadata owner request remains
open; no secrets requested. Local review3034/8034 and its prepared records are preserved, optional.

## Historical checkpoint — deployment safety, reflow and populated journeys

CURRENT, local-only: reporting branch `audit/platform-quality-114`; candidate product revision
`6d2276e00d0a1a540f48f7ecc253e864ad30d5e3` on `repair/modal-boundary-114`. Exact full report/candidate commits are recorded in #114 living
comment5652511529 and the checkpoint receipt. No repository push, PR, merge or deployment is authorised.
Earlier b08962df0ad9658661ec75d7774189116c5aa414 /8b81bfccf0d277889c92ca12fac33eb74bdb20e3
are historical parents, not competing current checkpoints. Main/frozen candidate remain
f7a3b35073ecc87cdf8f8f881129f221ec44d395; development remains
215193b7fcb5b11a28e23a4531d2a45434545dc1. Protected runtime/data mapping below is unchanged.

### Current measured coverage (same denominators; no scope exclusions)

| Measure | Evidence-complete / planned | Whole coverage | Change from initial baseline |
|---|---|---|---|
| Assessment review |38/87|44%|+5 assessments; +6 percentage points|
| Journeys fully exercised |6/24|25%|+1 journey; +4 points|
| Journeys passing required sampled checks |6/24|25%|+1 journey; +4 points|
| Competitor cells |13/27|48%|+6 cells; +22 points|
| Original requests with applicable clarification review |9/133|7%|+5 requests; +4 points|

Area review: functional12/24 (50%), UX7/12 (58%), security6/12 (50%), data5/12 (42%),
sustainability5/12 (42%), requirements2/6 (33%), competitor packages1/9 (11%).
These are coverage, not readiness/time remaining. New complete assessment IDs: PQA-U05/U06/U07,
PQA-R02 and PQA-C02. New complete journey PQA-J12. PQA-J06 remains PARTIAL, not added to numerator.
Competitor breakdown11 documentation-only,2 hands-on,3 blocked,11 unresolved/unexamined.
Finding stages remain cumulative:15 original findings;5 repairs on branches,0 full combined-candidate
verification gate completions,0 integrated locally,0 hosted verified,0 owner accepted. Scoped rendered
checks do not certify the entire combined candidate. Initial scorecard v1 below is historical.

### Reflow/modal gate and evidence

Result PASS / PROVEN for the tested shared gate, not accessibility certification.
At1440px root font-size200% (NOT browser zoom), the identity trigger shrank while its label retained
intrinsic width: arrow right1496.5px exceeded button right1440.7px. Shared intrinsic trigger sizing
and wrapped action-group layout resolve the source, preserving controls/text. Separate320px reflow
passes. Combined320px+200% text independently exposed the shared Add Row min-width8.75rem;
bounded intrinsic minimum and wrapping resolve it without hidden overflow, smaller fonts or removed
actions. Correct attribution: **PD-QA-005 is reflow; PD-QA-003 is missing-Profile handling**.

Artifacts in `/tmp/openforge-modal-114-repair`, synthetic only, not committed:
`free-bet-browser.json` (1440/760/390 both themes), `free-bet-stress-browser.json`
(1440 root text200% and separate320), `free-bet-combined-stress-browser.json` (320+text200%,
document307px/client320px, actual pointer Save200, reopened actual6.00).
Associated invalid text stays editable; correction permits Save. Fixed-delay field assertions were
replaced with polling the same aria-invalid/error/save conditions, not weakened or forced clicks.
`modal-motion-browser.json` records six native Sportsbook/conversion theme-width cases, actual
Escape close/reopen and RAF geometry; observed opacity/transform frames distinguish animation
from settled states. `modal-stress-browser.json` asserts reduced-motion reveal animation:none,
opacity1/transform:none. `modal-interrupted-frame-browser.json` separately captures a controlled
60ms reveal frame and closes/reopens from that interrupted frame at760px both themes. Because
the natural reveal can finish before locator readiness, this dedicated probe restarts the existing
CSS animation before pausing it (opacity0.457636, translateY-5.42364), rather than substituting a
new animation. An earlier late-animation harness failure is retained; it was not a product failure.
Native Free Bet dirty nested Keep Editing/Tab recovery and conversion pending Escape/503 retry,
receipt/async focus return pass. Actual Blackjack UI→Casino receipt/source exclusion/report passes
on this synthetic candidate. Screen-reader execution, every modal variant and broader interrupted
financial animation remain NOT TESTED; these are separate retained checks, not inferred PASS.
Production build and focused TypeScript check pass; unchanged backend Account/Free Bet/completed-source
finite regressions are reused at their inherited revisions, not a new whole-platform test claim.

### Two populated journeys

**PQA-J06 PARTIAL / PROVEN financial/browser slice:** converted SNR/SR £10, back3.00, lay3.10,
commission2%; independent reference stakes6.49/9.74; actual lay6.00; Back Won finals7.40/17.40;
combined report24.80 after reload. Browser performs conversion, destination opening, required
Available state, matching/copy, explicit placement and settlement. Persistence is independently
read; immutable calculator source remains attached. Required history/lineage UI display has NOT
been evidenced: native editor exposes setup/matching/settlement, not an assumed History tab.
An earlier missing Notes locator was a harness assumption, not a discovered financial failure.
One SR settlement wait timed out in a concurrent probe run; cause UNVERIFIED. Unchanged sequential
rerun passes both financial flows. Neither that timeout nor missing history is silently erased.
Next: exercise actual existing lineage/history surface, or record its exact missing consumer under
the retained lineage issue; do not fabricate a new feature or promote the whole journey.

**PQA-J12 PASS / PROVEN:** actual half-width dark review selects two exact Account IDs; one Account
becomes closed after review, causing HTTP200 succeeded/failed targets. First Profile has1 row,
second0. Dialog remains editable; restore synthetic Account eligibility and retry submits only
unresolved target with same intent. Receipt closes/focus returns; counts1/1. Already-saved retry
returns same ID. A deliberate new exploratory intent creates another row: counts2/1. Three actual
notification links each open their corresponding native destination. Inputs retain10.00.
`conversion-partial-journey.json` records UI/API/persistence assertions. It does not substitute
exploratory retry semantics for completed-Blackjack single-session protection. Network-lost-after-
commit browser recovery and actual PostgreSQL concurrency remain separate untested gates.

### Earlier Vercel deployments — read-only disposition

| Source / branch | Confirmed evidence | Target/aliases/protection/auth/API/DB/test configuration |
|---|---|---|
| f57e71ad1b7d35070154b96d3e4f33b15f780d24 / repair/blackjack-source-91 | GitHub Vercel success; [dashboard93AK28L3bWtCK1GqKT61MvuFTs5u](https://vercel.com/homelab11/plum-duff/93AK28L3bWtCK1GqKT61MvuFTs5u) | UNVERIFIED; authorised owner metadata unavailable |
| 7d75b5a54db466b1a47c6d7786ddc633f3dc7122 / audit/platform-quality-114 | GitHub Vercel success; [dashboardGPNAjWmuNa7kGxjKupUngdEU5W3e](https://vercel.com/homelab11/plum-duff/GPNAjWmuNa7kGxjKupUngdEU5W3e) | UNVERIFIED; authorised owner metadata unavailable |

Private dashboard access was unavailable; no endpoint exploits, hosted test writes, live-data copy
or secret values were attempted. Success status alone proves neither production promotion/public
access/data isolation nor a security incident. Repo vercel.json has no branch exclusion. Hosted
source forces auth and requires PostgreSQL configuration, but deployment environment/actual running
auth remain unknown. Test launcher injects synthetic settings locally; no evidence establishes
whether Vercel project environment had test-only settings. Prior deployments need owner disposition,
not merely a future push embargo. One redacted metadata request covers both dashboards: target,
aliases, protection and API/database environment target names, never secrets.

Smallest proposed rule, NOT applied: `git.deploymentEnabled` with `audit/**:false` and
`repair/**:false` in the effective approved Vercel project configuration. Other deliberate release/
approved Preview branches remain governed normally. Verify effective root/overlapping true rules
before any push: Vercel documents minimatch branch rules and true taking precedence over false.
[Official Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration),
accessed2026-09-13. No integration disconnect/broad project change. Publication/Preview BLOCKED
pending owner disposition and approved branch safeguard, isolated API/Postgres/auth configuration,
actual isolated PG transactions, #115 dependency/exposure disposition and #96 provider rotation.
Neither unavailable access nor local optimizer consumers clear exposure.

Unpublished commit-only backup verified at root `.git/local-backups/audit-repairs-20260913.bundle`;
five repair/report refs and f7 prerequisite, no databases/environment/private input observations.
Final refreshed bundle is recorded in checkpoint receipt. Normal/frozen/development/audit records
remain untouched. No product merge is used to synchronise audit documentation.

### Competitor slice — source/date and method separation

Accessed2026-09-13. **C02** three new documentation comparisons:
[Outplayed feature guidance](https://outplayed.com/features) describes offer calendars/step guidance,
catcher filters and progress/expiry handoff; useful context, not observed member interaction or
profit guarantees. [MBB qualifying-bet guidance](https://matchedbettingblog.com/qualifying-bets/)
(updated2023-01-26) separates terms, event/stake/odds constraints and liability/qualifying loss;
historical examples are not current offers. [OddsMonkey Racing Matcher guide](https://help.oddsmonkey.com/hc/en-gb/articles/11145715428509-The-Racing-Matcher-Guide)
(updated2023-07-26) documents dependent offer/race filters, bounded stake, commission and advanced
review. Vendor wager integration does not authorise our autonomous wagering/scraping.
**C06 OddsMonkey** [reset guide](https://help.oddsmonkey.com/hc/en-gb/articles/10263028145181-How-Do-I-Reset-My-Profit-Tracker)
documents explicit Yes Delete confirmation; reset was not executed, restoration/undo remains unknown.
Outplayed/MBB recovery equivalents remain unlocated, not declared absent.
**C07/C08 MBB hands-on:** real Chromium1440/390 at
[public calculator](https://matchedbettingblog.com/matched-betting-calculator/), controls stake10,
back3, lay3.1, back commission0%, lay2%; Tab from stake reaches back odds; Space selects Free Bet
then Normal; inputs stay within viewport. `public-calculator-usability.json` records controls/bounds.
No observed numerical parity, screen-reader/contrast certification or authenticated tracker activity.
Comparison: our contained modal/review/copy/receipt path adds explicit destination identity; requested
#111 interactive actual-performance analytics and #85/#106 balance observations remain gaps.

### Requirement reconciliation — original scope retained

Five new traceability reviews, not five implemented features. Original bodies and every available
clarification read: #70(no comments), #82(comment5569414794), #85(5561926423), #106(5574966194),
#111(no comments). This raises reconciled requests4→9, not whole historical backlog completion.

| Request / intended outcome | Current code/plans and evidence | Retained gap/dependency |
|---|---|---|
|#70 account restriction/gub evidence|Lifecycle/restriction arrays and generic Account audits/eligibility exist; CODE-VERIFIED|Requested chronological previous/new status, reasons/evidence/date/affected families/related-brand warnings are not proven as the full event workflow. Preserve all statuses and IDs; #71/#77 consumers|
|#82 restrictions ≠ commercially dead|Draft Account health/ACPI fixture specs, Extra Place health adapter; DOCUMENTED plans, CODE-VERIFIED bounded NotChecked consumer|Numerical/odds-dependent stake observations, residual capabilities, confidence/profitability reasons and #86 task consumption missing. User-reported brand limits are not global facts|
|#85 quick Account reconciliation|Account editor/audit exists; last_balance_update is request-supplied optional text, CODE-VERIFIED|Ledger-context popup, linked review/quick settle, server-authored financial timestamps remain requested. Account validation repair does not implement observation authority|
|#106 balance observations/freshness|Mutable current balance+generic audit and separate snapshots are not an atomic observation workflow; draft/planned review|Same-value confirmation semantics, atomic append/current update, correction provenance, configured-age/activity freshness, account/Profile/combined trends and no-fake-P&L principle retained; #85/#86 coordination|
|#111 interactive Dashboard/Reports|DashboardChartSurface renders static role=img ReplayableGraph/last-five labels; reports exist, CODE-VERIFIED|Point focus/pin/drilldown, range/grain/metrics/canonical dimensions/presets/data fallback remain planned. Account series depends#106; no fabricated OHLC/difficulty or settled-vs-current conflation; #110 motion|

R02 completes the reviewed Account restriction/balance clarification package. R03 stays OPEN:
reviewing #111 does not complete unread task/AI original clarifications. Fixture specs are not runtime
passes. Source scope, request IDs and orphan requirements remain in the canonical register.

### Local review and exact next gates

Scoped local review READY for the sampled modal/financial UI, not platform/calculator sign-off.
URL http://localhost:3034; API8034; existing isolated synthetic data/token and prepared converted
Profile. Launch without reseed/reset/new auth:
`node /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/modal-boundary-repair/scripts/open_modal_repair_review.mjs`.
`--check` verifies existing authenticated access and prepared records. Optional5–10minute review,
at most three actions: (1) reopen prepared SNR/SR at half width; inspect matching/settlement values
and pointer access; (2) switch light/dark and open/close editor with Escape; (3) inspect prepared
report24.80 and local modal/Blackjack receipt recording. No real wager or full regression assignment.
Local troubleshooting recording lives under `/tmp/openforge-modal-114-repair/review-video`;
synthetic only, not committed/hosted. Earlier before-fix geometry is recorded above; no invented
before screenshot. Known limits: J06 history/lineage, full native pending variants, reader, larger
data, imported/award-group recovery and network-loss paths.

Actual PostgreSQL NOT TESTED. Local initdb/pg_ctl/psql are available; concrete prerequisite is a
new disposable cluster/directory, dedicated loopback port/private socket (e.g.55434), synthetic role/
database and explicit test-only DSN, plus rollback/concurrency/backup/restore fixtures. No5432,
hosted/operational database fallback. Do not claim adapter tests as PG transaction evidence.
Next bounded work: J06 actual history surface; award/import/recovery, PG isolated transaction setup,
remaining populated ledgers/large datasets/reader and historical request reviews. Independent
combined-candidate verification precedes a reviewed integration proposal/post-integration smoke.
No push/deploy/integration/manual acceptance; #115/#96 remain separate.

Audit date: 2026-09-12. Owner acceptance is not implied. Evidence level and test result are separate.

## Executive summary — resumable audit checkpoint

This audit starts from cumulative **main**, not unmerged calculator development. The product remains a
local-first, Profile-isolated reconstruction of the tracker workbook: cash-first current value,
explicit actual placement/settlement, auditable money and human decisions. Oddsmatcher, subscriber
expansion and advisory AI retain their separately approved/deferred boundaries.

Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit request.
Final calculator sign-off remains pending. Prior finite #113 fixtures do not establish every strategy
combination, all numeric inputs, external parity or owner acceptance.

Checkpoint achieved: repository/issue inventory, isolated native API and rendered route probes,
synthetic portable-restore/security tests, standards/vendor review and prioritisation. This is a
**partial execution checkpoint**, not whole-platform acceptance. Untested areas below must not be
read as passing. The immediate priorities are affected dependencies/credential remediation,
malformed persisted money, controlled API rejection and modal accessibility—not animation polish.

The current audit is executing in batches A–D. Untested areas below must not be read as passing.
Historical initial audit boundary (later bounded repairs are separately authorised above): no application implementation, financial revision, migration, real-record write, credential rotation,
hosted scan or issue closure is authorised by this report.

### Batch 2 executive addendum — populated financial flows

Audit parent `e5218bc1156e1d15ca115219cd4b912e436b8c21`; exercised application source remains
main `f7a3b35073ecc87cdf8f8f881129f221ec44d395`, not unmerged development. On 2026-09-12,
independent synthetic Account, SNR/SR Free Bet and conversion probes establish **financial integrity
failures**, not whole-platform readiness. Invalid Account values persist and incomplete cash totals
look complete; invalid Free Bet creation commits before its 500 response and subsequently breaks
reads/reports; the same completed Blackjack snapshot creates Casino activity in two Profiles.
Clean SNR/SR preview/copy/save/reopen and explicit actual-stake settlement agree with independent
fixtures. Standard conversion retry/new-intent and desktop receipt/focus work in sampled paths;
half-width pointer Save is intercepted by navigation chrome, while keyboard recovery succeeds.

The affected image optimizer is anonymously reachable locally, but attacker-controlled AVIF input
and actual deployed platform/exposure are **UNVERIFIED**. No exploit, upgrade, migration, production
scan, secret rotation or product fix was performed. First proposed implementation: bounded Account
monetary write validation and incomplete-aggregation safety; urgently clarify #115 deployment/input
exposure separately. Free Bet atomic validation and completed-session global duplicate protection
are subsequent independent high-priority repairs, not cosmetic work.

## Protected checkpoint and runtime ownership

| Layer | Full SHA / branch | Runtime and data | Protection |
|---|---|---|---|
| Main / origin/main | `f7a3b35073ecc87cdf8f8f881129f221ec44d395` | Normal 3010 / 8010; root `.env` configures `sqlite:///data/private/db/openforge.sqlite3`; process override not independently inspected | Unrelated dirty files preserved; no main merge |
| Frozen candidate | same full `f7a3b35073ecc87cdf8f8f881129f221ec44d395`; `manual/calculator-candidate-2026-09-12` | `.worktrees/manual-calculator-baseline`; 3020 / 8020; `/tmp/openforge-manual-f7a3b35.hUMolA/runtime/acceptance.sqlite3`; persistent authenticated browser | Unchanged; generated Next type declaration is not an application revision |
| Unmerged development | `215193b7fcb5b11a28e23a4531d2a45434545dc1`; `calculator/multi-lay-normal-parity`, five commits ahead | `.worktrees/multi-lay-normal-parity`; 3013 / 8013; `/tmp/openforge-multilay-parity-20260912.sqlite3` | No merge; dependency symlinks/generated Next declaration left alone |
| Audit | main SHA above; `audit/platform-quality-114` | `.worktrees/platform-quality-audit`; dedicated 3024 / 8024; `/tmp/openforge-platform-audit-20260912-runtime/acceptance.sqlite3` | Existing synthetic authenticated fixture; no shared operational/manual DB |

Original private comparison files remain in root `_input`: `calculator-comparison.html`,
`calculator-comparison.xlsx`, `calculator-manual-comparison-repaired.md`. They are neither duplicated
nor committed. Observations and stable parent case IDs must be retained. Development's launcher remains
`node /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/multi-lay-normal-parity/scripts/open-manual-calculator.mjs`.
It reuses the preserved authenticated runtime/browser without reseeding. Do not launch a different
revision against that database. Historical Monday references are historical only.

Original capture links (local only): [HTML](</Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-comparison.html>),
[Excel](</Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-comparison.xlsx>),
[supplied Markdown](</Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-manual-comparison-repaired.md>).

## Coverage and execution ledger

| Batch | Coverage achieved | Result / evidence | Exact next work |
|---|---|---|---|
| A Goals / inventory / requests | #114 full brief, #113 current deferral, README/status/register/roadmap; protected branch/runtime checkpoint; original #1–114 identities; explicit Account/balance/analytics/task/import requests/clarifications | DOCUMENTED; detailed remaining historical clarification triage pending | Remaining issue-specific clarification triage, no invented missing requests |
| B Functional / rendered / accessibility | Actual isolated API/native rows/refresh and 17 route shells; geometry/themes, lean guard and modal focus/Escape; named auth/restore/backup/eligibility tests | PROVEN scoped PASS/FAIL; full workflows incomplete | Populated Free Bet SNR/SR complete lifecycle first, then other ledgers/bridge/recovery |
| C Architecture / operations / standards / competitors | API/router/Account/summary/SQLite/PG/migration sources, dependency registry/maintainer advisories, official WCAG/WAI/web.dev/ASVS and public vendor pages | CODE-VERIFIED / DOCUMENTED; actual PG/field performance/member journeys UNVERIFIED | True isolated PG recovery, larger-data production benchmark and assistive technology |
| B2 Financial flows / exposure | Eight Account money forms; pending withdrawals; native SNR/SR and converted SNR; populated Standard/Free Bet/Blackjack conversion, retry/partial failure/new intent; desktop/light and half-width/dark dialog | PROVEN scoped PASS/FAIL; blocked and unattempted branches below | Other populated ledgers; actual award-split lineage; stale/timeout/concurrent browser paths; PostgreSQL/large data/reader |
| D Priorities / next tranches | PD-QA-001–015, refined after financial-flow failures | DOCUMENTED recommendations, not implementation | Keep each repair bounded; unknown security exposure remains visible |
| B3 Stacked completed-source repair | PD-QA-015 global target exclusion, same-target retry, independent-process SQLite concurrency and atomic Casino/audit/success rollback; inherited Account/Free Bet regression suites | PROVEN scoped SQLite/API; main still FAIL/unintegrated. No new rendered or actual PostgreSQL execution | PD-QA-004, independent combined candidate, reviewed integration proposal and post-integration smoke; open-gate tests in PD-QA-015 addendum |

## Evidence convention

- PROVEN: current-revision focused observable execution; specify the tested scope.
- CODE-VERIFIED: source inspected, not a whole journey execution.
- DOCUMENTED: authoritative issue/contract/vendor statement, not observed runtime.
- INFERRED: reasoned risk, not established failure.
- UNVERIFIED: source, assistive technology or execution unavailable.

Results: PASS / FAIL / BLOCKED / NOT TESTED / NOT APPLICABLE. Planned scope is NOT TESTED, not PASS.
Screen-reader behaviour, hosted deployments, real PostgreSQL recovery and complete competitor
member journeys remain UNVERIFIED unless explicitly evidenced later.

## A. Goal and request traceability

Canonical feature authority remains the [request register](../planning/plum-duff-next-issue-tracking-register.md)
and [milestone map](../planning/openforge-milestone-contract-fixture-readiness.md), not this audit.
Issue identities #1–#114 were inventoried from both GitHub collection pages. Original issue scope
is retained by links in the appendix; detailed original bodies/current clarifications were inspected
for the explicit Account/balance/task/analytics/import requests and current audit authority. Other
issue-specific historical clarification reconciliation remains explicit next-pass work, not presumed.

| Original request → intended outcome | Current implementation/planned work | Evidence / result | Remaining gap/dependency / issue |
|---|---|---|---|
| Workbook tracker / isolated Profiles | Profile-owned ledgers, current vs settled value, onboarding and reporting | Native two same-name Profiles + 30-row API fixture: PROVEN for tested isolation; whole workflow NOT TESTED | Complete all placement/settlement/report journeys; #1–#13 |
| #70 restrictions / gub log → safe residual use | Lifecycle and restriction arrays/audit coexist; #77 eligibility and Extra Place adapter consume them | CODE-VERIFIED; pure eligibility fixtures PASS | Full chronological restriction-event fields, affected families and related-brand evidence NOT TESTED; #70/#71 |
| #82 capability/profitability → restricted does not mean dead | Draft observation/viability contract; Extra Place explicitly stays `NotChecked` | DOCUMENTED planned; NOT TESTED | Numerical stake evidence, confidence, commercial value and task integration missing; not global bookmaker limits; #82 |
| #85 quick Account reconciliation | Account CRUD and audit exist; timestamp accepted from request | CODE-VERIFIED partial; NOT TESTED complete popup | Ledger-context popup, multi-row review, server-authored balance-change timestamps; #85 |
| #106 observations/freshness → preserve unexplained balance changes | `balance-snapshots` API exists separately from mutable current Account balance | CODE-VERIFIED partial; NOT TESTED requested workflow | Atomic current-balance observation/confirmation, same-value freshness semantics, prompts/trends missing; #106, consumes #85/#86 |
| #111 interactive Dashboard/Reports explorer | Dashboard/report routes and current P&L chart exist | Rendered route shell PROVEN; explorer NOT TESTED/planned | Point keyboard interaction, metric/grain/filter/drilldown and saved presets; balance series depends on #106; #111/#110 |
| #86 tasks / #31 optional advisory AI | Notifications, quick actions and deterministic summary logic exist; draft target/intelligence contracts | DOCUMENTED planned; NOT TESTED full deck/AI | Complete/Ignore/Low Value dispositions, cadence and explainable evidence; AI provider/privacy/cost decision, baseline fallback; #25–#31/#72/#86 |
| #109 Accounts import access → no lost restrictions | `ACCOUNT_SOURCE_MAP` preserves Status, balance, dates; omits Stake Access/Promo Access | CODE-VERIFIED gap; BLOCKED mapping decision | Exact vocabulary + historical LastPromoUsed provenance; catalogue Group/Platform/RiskTeam must stay catalogue-owned; #109/#104 |
| #88 Extra Places recording/settlement | Dedicated ledger, calculator, branching and health adapter exist | Rendered empty ledger PROVEN; settlement NOT TESTED this pass | Rule 4/dead heat/changed terms deferred; capability engine #82; catching/discovery is separate, not delivered by this ledger |
| Catching/discovery / public offer sources | Approved public-source ingestion contracts; source-created offer/Discord work planned | DOCUMENTED; NOT TESTED | #67/#79/#87; OddsForge #52–#56/M8 remains explicitly deferred—vendor catchers do not authorise scraping |
| Calculator/ledger bridge | Existing source envelope, #77 review, destination adapters and idempotency | CODE-VERIFIED; one basic UI/request/copy probe executing | Main v1 versus unmerged v2 boundary below; destination-missing families remain blocked; #35–#40/#113 |
| Notification history | Source-derived events plus durable clear tombstones | CODE-VERIFIED partial; auth-protected endpoint PROVEN | Survive disappearance of source requires durable event boundary, distinct from clear fix; #90/#99/#100 |
| Strict numeric validation | Standard/Sportsbook full-string odds paths; Account money strings still unvalidated | PROVEN FAIL: Account persists malformed/non-finite money | Surface-specific money/rate contract/validation; #91/#112, PD-FUTURE-021/022 |
| Portability / import / restore | Audited XLSX, portable Profile restore, local verified backups and recovery routes | Synthetic portable restore/security tests PROVEN PASS for named cases | Google workbook runtime, hosted template/eligibility #94; three-way merge #95 is design-only; no cloud-sync claim |
| Repository maintenance / truthful status | Canonical status/register exist alongside stale README/roadmap summaries | CODE-VERIFIED FAIL documentation consistency | Routing/bloat review #93; unresolved workbook KPI/product choices #97; no deletion of literal `-` directory |
| Future subscriber/billing/AI | Registration/request surfaces plus deferred role/fee/funding contracts | DOCUMENTED planned; NOT TESTED subscriber operation | #14–#18/#73/#74, separate fee visibility #23 and platform finance contract; no multi-tenant readiness claim |
| Unlocated future requests | PD-FUTURE-001–018 preserved in canonical register | DOCUMENTED BLOCKED | Original text unavailable; #102 remains explicit; do not manufacture requirements |

Contradictions/stale claims: README still lists standalone calculators/bridge and multi-Profile entry
as deferred although code exists. The milestone overview still calls several now-closed issues open
and describes broad backup/auth work as drafted without reflecting later scoped implementation.
Historical statements remain evidence of their date, not current completion gates. #113 finite
family counts are superseded in scope by its configuration extension, not erased. #105/#59 overlap
financial presentation; #90/#99 are different requirements; #106 owns observation data and #111 owns
exploration; #82/#88 are not interchangeable. PD-FUTURE-001–018 remain orphaned-source requests.

## B. Whole-product coverage matrix

Source inventory: **23 page files**, including dynamic Profile tracker/import routes, plus dynamic
tracker modules Dashboard, Accounts, Sportsbook, Free Bets, Casino, Extra Places, Cash Adjustments,
Reports/Profit Tracker/Settings/calculators. Isolated OpenAPI inventory exposes **167 paths / 208
operations**. Enumeration is CODE-VERIFIED, not a test of every operation.

| Route/module or boundary | Current evidence | Result / outstanding execution |
|---|---|---|
| `/login`, session, logout, protected APIs | 12 auth tests plus security-policy test; anonymous Profiles/calculator exchanges/notifications/Accounts all 401 | PASS, PROVEN named checks; real Google callback/provider outage and browser expiry/re-entry NOT TESTED |
| `/register`, `/profiles/requests`, `/cookies` | Page files and registration planning inventoried | NOT TESTED; future subscriber identity/permissions not runtime PASS |
| `/`, `/profiles`, `/profiles/new`, detail/manage | Two same-name synthetic Profiles created with distinct codes via onboarding API; directory rendered | PASS, PROVEN creation/identity fixture; guided fresh Account selection/archive/delete browser journey NOT TESTED |
| Profile lifecycle / denied writes | Auth middleware and archived-Profile middleware inspected | CODE-VERIFIED; archived save/recovery/purge full flow NOT TESTED; unknown-Profile write FAIL below |
| Profile/owner data boundary | Profile-owned API routes; other same-name Profile has zero of 30 native Sportsbook rows | PASS, PROVEN tested isolation only; malicious cross-Account ID, future multi-owner PostgreSQL scope NOT TESTED |
| Catalogue / Accounts / restrictions | Current catalogue endpoint and Account create/update observed; restriction arrays/adapter inspected | FAIL, PROVEN malformed money; complete brand-duplicate selection, health warnings, Account lifecycle UI NOT TESTED |
| Search / navigation / Quick Actions / filters/loadouts | `/search` is protected by server middleware; canonical global search/header rendered at half width | CODE-VERIFIED authority; keyboard search, saved loadouts, stale results, deep-link routing NOT TESTED |
| Dashboard / `/performance` | Profile/combined routes rendered; first rapid probe saw unresolved shell, later probe settled on Dashboard | PASS, PROVEN settled shell; finance semantics/point interaction NOT TESTED; do not label intermediate load empty |
| Sportsbook / opportunity / placement / settlement / undo | 30 synthetic Prospecting rows created, isolated and retained through real browser refresh; native Add Row opened | PASS for persistence; FAIL modal focus/Escape; lifecycle/actual settlement/history/undo NOT TESTED end-to-end |
| Free Bets / lineage / SNR/SR / settlement | Batch2 native SNR/SR real UI preview/copy/Save/reopen; actual7.00 settlement/report31.20; converted SNR API settlement7.40; malformed retained rows break read | PASS scoped numerical/persistence; FAIL atomic malformed write and dangling source; imported/automatic split lineage, stale/concurrent UI NOT TESTED |
| Casino / activity / fees / manual override | Batch2 signed completed Blackjack snapshot saves reviewed10.00 activity and same-target retry; same snapshot other Profile creates duplicate | FAIL completed-session uniqueness; PASS scoped API mapping/provenance; actual played UI conversion and other fee/override journeys NOT TESTED |
| Extra Places / Each Way | Dedicated empty ledger rendered; `NotChecked` capability source inspected | NOT TESTED placement/void/dead-heat/manual override journey; unavailable branches stay tracked |
| Cash Adjustments / fees / cash movements | Ledger shell rendered; fixture-backed cash/Casino/eligibility suite 7 PASS | PASS, PROVEN selected pure fixtures only; complete fee crystallisation/withdrawal/reports workflow NOT TESTED |
| Current Account balances / pending withdrawals / snapshots | Batch2 eight balance forms traced persistence/read/Profile cash/export; four invalid withdrawal strings accepted | FAIL validation/incomplete cash aggregation; combined summary BLOCKED, Account UI input probe BLOCKED; #85/#106 atomic observation remains planned |
| Standalone calculator hub | Standard rendered at 1440/760/390; four widths × two themes measured; one literal independent stake fixture | PASS bounded integration; FAIL 320px/200% reflow; other families integration NOT TESTED; no #113 rerun |
| Embedded calculators / matching/copy | Native editor rendered, shared engines/primitives inventoried | NOT TESTED complete input→preview→copy→save→reopen for every ledger/family |
| Authenticated lean `/calculator` | Authenticated Standard shell rendered; anonymous client revalidation redirects to login | PASS, PROVEN sampled guard; server matcher omits `/calculator` but client auth guard denies it—no API bypass observed |
| Calculator conversion / #77 | Batch2 API partial/retry/new-intent/source/Account denial plus lean dialog saves at1440light/760dark | PASS scoped API and desktop receipt/focus; FAIL half-width pointer interception and Casino clone; keyboard recovery PASS; injected timeout/concurrent and hub/partial UI NOT TESTED |
| Blackjack / current/Last Hand/history/snapshot | Existing proven matrix and session snapshot code inventoried | NOT TESTED live/session financial UI this pass; strategy correctness remains bounded #113 evidence, not UX acceptance |
| `/reports`, Profile Reports/Profit Tracker | Report route shells rendered; approved settled-date/retained-profit sources identified | NOT TESTED all metric aggregates, date/grain/account filters, charts/table drilldown |
| Imports / founder review / checkpoint / recovery | Import/review/recovery pages and API inventory; Account map gap inspected | CODE-VERIFIED; native XLSX/import fallback/browser resume and larger imported dataset NOT TESTED |
| `/profiles/restore` / portable export/restore | Eight synthetic restore tests PASS: checksums, remapped IDs, financial/operational gates, missing authority, rollback/retry, active-attempt and role controls | PASS, PROVEN named tests; browser whole restore walkthrough and Google interoperability NOT TESTED |
| Backups / database restore | 7 backup tests + 2 PostgreSQL adapter tests PASS; 5 backup tests lack required seeded fixture or auth setup | Mixed harness result, not restored operational readiness; actual PostgreSQL restore NOT TESTED |
| Notifications / preferences/history | Route rendered; anonymous endpoint 401; source-generated history/clear distinction inspected | PASS guard/shell; clear race/source removal/retry/notification-link journey NOT TESTED |
| Settings / Account / administration | Profile Settings, Settings and My Account rendered | PASS route shells; persisted toggles, failure rollback, authority edits/provider administration NOT TESTED |
| Subscriber / billing / AI / odds sourcing | Planned contracts and distinct current scope mapped | NOT TESTED / NOT APPLICABLE runtime where deliberately deferred |

Dataset limitation: 30 native Sportsbook records is a modest paginated fixture, **not** a realistic
thousand-row performance benchmark. Imported records were exercised through synthetic portable
restore tests, not a complete imported browser ledger journey. Empty ledgers were explicitly separate.
Partial requests/repeated submissions/stale-response injection and every important API denial remain
next-pass execution work. No score/count certifies full accessibility or all business workflows.

Independent spot-check `PQA-STD-01` (not a whole #113 parity rerun): Normal/Simple/Standard,
stake10, back3, lay3.1, commission0.02 decimal. Exact independent lay30/3.08=9.740259…,
placed/reference penny stake9.74; liability9.74×2.1=20.454; cash branches20−20.454=−0.454 and
−10+9.74×0.98=−0.4548. Approved money quantisation gives liability20.45 and both displayed
branches−0.45. Actual API200 gives9.74/20.45/−0.45/−0.45; actual lean UI request uses
qualifying/Standard/commission0.02 and clipboard contains exactly`9.74`: **PASS / PROVEN** for
this finite integration case only. The earlier zero-commission UI probe independently gives
30/3.1→9.68, liability20.33 and branches−0.33/−0.32; no exact external comparison claimed.

### Calculator integration readiness (main versus unmerged development)

| Family/configuration | Main state | Unmerged development distinction / remaining authority |
|---|---|---|
| Standard Normal/SNR/SR, S/U/O/Custom/Part Lay | Standalone and governed destination paths exist; source mode/default and selected stake governed | Specific current control→API→copy sample only; all conversion retries not reproved here |
| Bonus Normal/SNR × loses/wins | Offer-aware references exist; deferred SR distinct; SNR destination basis remains missing | Old back-wins blocker statement is superseded by later calculator authority, not permission to convert unsupported destination basis |
| Cashback / Money Back / Profit Boost four sources | Governed alias/boost derivation and accepted odds/source provenance present | Exact external comparisons and strategy routing retain #113 evidence boundaries |
| Multi-Lay | v2 standalone richer than embedded/saveable legacy Normal, uniform commission Standard/Underlay | Dev 215193b adds native Normal/no boost/reward planning opt-in and per-leg commission JSON; placement/settlement/richer configurations stay blocked; not merged main functionality |
| Extra Place / Each Way | Native dedicated destination preserves place provenance | Rule 4/dead heat/changed terms remain tracked; broader capability intelligence not delivered |
| Sequential Lay | Standalone Standard/Lock In, planned legs/per-leg commission | Destination lacks complete sequential lifecycle representation; conversion BLOCKED |
| Early Payout / 2UP | Exchange Lay/Dutch trigger/reference modelling | Exploratory trigger cannot become real occurrence; lossless full destination state BLOCKED |
| Multiples / Accumulator | Deterministic core accumulator only | Full bet types/Each Way/Rule 4/bonuses/selection destination remain unresolved/blocked optional extensions |
| Dutching | Simple Normal/SNR 2/3-way with contracted rounding | Advanced allocation authority and full multi-back destination BLOCKED |
| Odds / Probability | Conversion utility, Fractional default | UTILITY ONLY, no ledger action |
| Blackjack | Simulation utility; sufficiently complete Free/Live source → one reviewed Casino activity | Single Profile/session duplicate protection; actual session financial fields, not simulated win estimates |

## C. Standards, external usefulness and sustainability

All web sources accessed **2026-09-12**. No authenticated competitor operation or live bookmaker
scraping was performed. Public page text is directly observed; described member features are
vendor-documented, not executed. External mathematical parity was not rerun by this whole-platform audit.

| Authority / version | Applicable benchmark | Evidence/result |
|---|---|---|
| [Material Design 3 foundations](https://m3.material.io/foundations/) | Existing semantic surfaces, hierarchy, tokens, targets and stateful controls | Official page required JavaScript in text access; foundations text UNVERIFIED. Repository M3 contract and rendered equivalent controls inspected; no M3 certification |
| [WCAG 2.2 Recommendation, 12 December 2024](https://www.w3.org/TR/WCAG22/) | Keyboard, reflow, contrast, focus visibility/order, error identification/prevention, target sizes, announcements | 320px/200% combined stress FAIL and native modal focus/Escape FAIL; contrast and screen-reader behaviour NOT TESTED comprehensively |
| [WAI APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Focus enters dialog, contained keyboard traversal, Escape and focus return | Native Add Row did not move actual focus in observed probe; no reader validation; not fixed during audit |
| [web.dev Core Web Vitals](https://web.dev/articles/vitals), current guidance | LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at 75th percentile | No field distribution or production build benchmark. Development compilation/reloads are not valid field performance PASS |
| [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/), released 30 May 2025 | Auth/session, authorisation, validation, configuration, data protection and safe operations | Named session tests PASS; input persistence FAIL; broad ASVS coverage NOT TESTED, not certified |
| [Outplayed public tools](https://outplayed.com/matched-betting-tools), [features](https://outplayed.com/features) | Advanced calculators, offer review, tracking and discovery are useful distinct tasks | Public descriptions DOCUMENTED. Member offer/record/recovery workflows unavailable. Our tracker-first/isolated cash authority matters more than catchers/feature counts |
| [MBB calculator](https://matchedbettingblog.com/matched-betting-calculator/) | Transparent stake/odds/commission, scenario reference and advanced controls | Public controls/guidance DOCUMENTED; bounded #113 exact comparisons retained separately; no tracking/member parity inferred |
| [OddsMonkey Profit Tracker](https://www.oddsmonkey.com/matched-betting/profit-tracker/) | Expected vs actual, manual/history entry and tools/sport drilldown | Vendor-documented usefulness; authenticated interaction, failure recovery and specific provenance unavailable |

Competitor recommendations: keep reference→review→record effort low, explicit expected/actual values
and usable drilldown; do not equate importing calculator estimates with recognised cash. Offer
discovery/catchers are separate gaps, not implicit #88 scope, and never justify autonomous wagering.

| Sustainability boundary | Inspected evidence | Risk / next check |
|---|---|---|
| Money single source of truth | Decimal engines/contracts, but `tracker-summary.ts:390` parses through Number and returns 0 for invalid values | CODE-VERIFIED aggregation/precision risk; malformed persisted Account value can be omitted as zero; independent reconciliation fixture needed |
| Schema/version/legacy | db.py 9,409 lines; Multi-Lay v1/v2 markers and actual/planning guards; checksum/advisory-lock PostgreSQL migration machinery | CODE-VERIFIED; no legacy migration run. Import/restore contracts must preserve marker/provenance; no historical recalculation |
| SQLite concurrency/read cost | Each ordinary connection opens SQLite, acquires process RLock and initialises schema/seed | CODE-VERIFIED; repeated read cost/scaling INFERRED, not measured. Benchmark before pooling/refactor; PG adapter tests do not prove PG transactional parity |
| PostgreSQL deployment/rollback | Adapter and migration signatures inspected; hosted persistence health fails closed in auth tests | Actual PostgreSQL data/restore/rollback NOT TESTED; separate synthetic PG environment required, never normal remote DB |
| Privacy/backups/retention | Local verified/checksummed backups and portable restore tests; ignored private inputs | PASS scoped restore safety; encryption/cloud custody, retention/deletion/access of backup files and disaster recovery NOT TESTED |
| Auth/role evolution | Owner allowlist/server session protects API independently; future subscriber contracts deferred | PASS sampled owner guard. Future multi-owner/subscriber row authority needs dedicated adversarial tests before exposure |
| Secrets / logging / observability | #96 unresolved credential issue; auth response hides failure details; no secret values read/output | Credential remediation DOCUMENTED unresolved. Log redaction, request IDs, retention and incident recovery NOT TESTED |
| Dependencies | Registry audit 3 critical/13 high/4 moderate entries; pinned Next 16.3.2/sharp 0.35.3/Vitest 4.0.4 | PROVEN affected lockfile; exploitability/exposure distinct, below |
| Test portability/isolation | Fresh worktree lacks private seed expected by numerous old tests; synthetic restore tests self-seed | PROVEN harness debt. Never solve by copying operational workbook exports; provide explicit safe factories/settings restoration |
| Typing/lint/flaky tests | Pinned toolchains and existing tests inventoried; Rosetta Next warning observed | Full typing/lint/flakiness census NOT TESTED; no unrelated broad reruns |
| Dense tables / charts / requests | 30-row browser fixture and containers sampled; initial fast shell queries can still be unsettled | No thousand-row/dense-chart/request-storm benchmark. Intermediate motion NOT TESTED comprehensively |
| Agent/docs sustainability | 269 tracked docs + AGENTS; globals.css 15,794 lines; stale overview assertions | Size is CODE-VERIFIED, maintenance severity INFERRED; routed authority index/safe dedup proposals only (#93), not bulk cleanup |
| External data / hosting / AI costs | Source ingestion/AI/platform-finance drafts and scope boundaries | Provider terms, caching/privacy/cost limits/outage fallback unresolved product decisions; no SaaS/AI scale assumption |

### Dependency exposure distinction

Registry advisory entries are not distinct exploited vulnerabilities. Three critical entries:

- Next 16.3.2: [maintainer AVIF image optimisation advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), patched 16.3.3. Existing next/image consumers use `unoptimized`; endpoint exposure still needs review. No exploit executed.
- Next 16.3.2: [Windows-hosted filesystem advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), patched 16.3.3. Local macOS is not the described Windows condition; other deployments UNVERIFIED.
- Vitest 4.0.4: [maintainer UI/API advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp), patched 4.1.0 for this advisory. Applies to exposed UI/API or Windows Browser/UI conditions; no such server observed. Other advisory minima must also be checked before choosing a version.

## Batch 2 — financial data flow, populated journeys and applicability

All following observations use disposable `AUDIT2-*` Profiles/Accounts in the dedicated 8024 DB.
No operational or manual-candidate records were read or changed. Intentionally invalid values
remain intact; clean lifecycle evidence uses a separate Profile, not repaired corruption.
Original checkpoint SHAs and private comparison files are preserved. Reusing a factory does not
prove native onboarding; UI/API expectations are assessed separately.

### #115 applicability — bounded read-only check

Official maintainer advisories accessed 2026-09-12; versions below are installed/locked evidence,
not a recommendation to bundle upgrades into financial work.

| Dependency / authority | Applicable conditions / local evidence | Reachability / deployment | Supported patch |
|---|---|---|---|
| Next 16.3.2; [AVIF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) | Affected; sharp HEIF loader enabled in image optimizer. Installed sharp 0.35.3 reports heif 1.23.1. No global `images.unoptimized` in Next config; remote patterns empty, local patterns unrestricted by explicit config | Anonymous benign `/_next/image?url=%2Fbrand%2Fplum-duff-wordmark-cropped-v2.png&w=640&q=75` →200 PNG, 28,073 bytes on 3024: PROVEN reachable. Attacker AVIF delivery/exploitability and hosted runtime UNVERIFIED | Next 16.3.3 / 15.5.24 per advisory |
| Next 16.3.2; [Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) | Windows filesystem/runtime condition; local installed platform is Darwin, so that condition is NOT APPLICABLE locally | Deployment OS/config unknown; do not extrapolate local platform | Next 16.3.3 / 15.5.24 |
| sharp 0.35.3; [HEIF advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | Affected version; Linux/glibc exploitation prerequisites not established by Darwin check | HEIF loader CODE-VERIFIED enabled; untrusted image route/input and deployed prerequisites UNVERIFIED | sharp >=0.35.4; libheif 1.23.2 |
| Vitest 4.0.4; [UI/API advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) | Affected version; checked config uses jsdom and `vitest run`, no explicit API host/UI exposure | Applicable UI/API/browser configuration not observed in checked config; deployment/process exposure NOT exhaustively verified | 4.1.0 / 3.2.5 for this advisory; not an all-advisory clean-version claim |

Unoptimized consumers do **not** prove optimizer absence. Immediate risk notice was given during
the audit. No urgent exploitable RCE was established, and unknown exposure is not “safe.” Separate
bounded proposal: owner-authorised deployment OS/version/image-input inventory and patched-version
remediation with representative auth/image/financial regressions; no exploit or production scan.

#96 remains separately BLOCKED pending the owner/provider action: rotate/reset the exposed Google
OAuth client secret in Google Cloud Console, invalidate the old secret, securely update authorised
runtime configuration and verify sign-in/callback plus old-secret invalidation. This audit neither
reads out secret values nor performs rotation; provider permissions and completion remain unverified.

### Account money — PD-QA-002 and PD-QA-007

Independent expectation: a supplied balance must be contract-valid finite money or explicitly
supported absence. Malformed/non-finite money must fail before writes; an invalid constituent must
not produce an apparently complete cash total. This adds no rounding, coercion or null policy.

Each tested Profile has a valid £10 Bank A plus a separate tested Lloyds Bank Account. The null
POST fails; a separate valid £0 control is then used to test null PUT rejection, not to repair
invalid data. Read-only SQLite queries establish persistence after each actual API mutation.

| Supplied `current_balance` | POST / PUT | Persisted / Account read / summary sources | Profile cash UI / export | Result / evidence |
|---|---|---|---|---|
| `12.34` | 201 / 200 | exact string; GET200; sources200 | Bankroll and dashboard £22.34; XLSX200 | PASS / PROVEN |
| `0.00` | 201 / 200 | explicit zero preserved; GET200 | £10.00; XLSX200 | PASS / PROVEN |
| blank `""` | 201 / 200 | blank retained; GET200 | £10.00; XLSX200 | Supported write observed; absence/zero aggregate semantics require product clarification |
| null | 422 / 422 | null rejected; valid control unchanged | control £10.00; XLSX200 | PASS rejection / PROVEN; no claim null is supported |
| `not-money` | 201 / 200 | invalid string retained; GET200; sources200 | Individual cell “Unavailable”; Bankroll £10.00 and “2 accounts included”; dashboard cash £10.00; XLSX409 invalid decimal | FAIL / PROVEN |
| `NaN` | 201 / 200 | same invalid persistence/read | “Unavailable”; apparent complete £10.00; dashboard £10.00; XLSX409 non-finite | FAIL / PROVEN |
| `Infinity` | 201 / 200 | same invalid persistence/read | first Account capture still loading, not valid cell evidence; settled dashboard £10.00; XLSX409 non-finite | FAIL write/export/aggregation / PROVEN; individual rendered cell UNVERIFIED |
| `-Infinity` | 201 / 200 | same invalid persistence/read | “Unavailable”; Bankroll £10.00 / 2 included; initial settled dashboard £10.00; XLSX409 non-finite | FAIL / PROVEN |

`pending_withdrawal_amount` PUT also accepts all four malformed/non-finite strings (200), verified
persisted exactly. UI money entry attempt did **not** reach Save: audited page remained in loading
state before the Account edit button appeared. Thus UI enforcement is BLOCKED by probe/runtime
readiness, not inferred from API acceptance or source inspection. Profile Reports P&L zero is **not**
an Account cash balance; no assertion that it coerces cash to P&L. Combined Fund Manager summary was
attempted but not settled before subsequent malformed Free Bet rows caused source reads to fail:
combined aggregate numeric result remains BLOCKED, rather than claimed £0 or complete.

Impact: authenticated malformed balances/withdrawals survive successful writes, cash totals omit
them without an incomplete warning, and portable export later fails. Account writes do not crash;
export rejects later. Traceable individual “Unavailable” display does not fix aggregate truth.
Future regression: finite £12.34 + £10 = £22.34; explicit zero control; each invalid input rejects
atomically; previously invalid constituent makes cash summary explicitly incomplete; report/export
give controlled diagnostics. Null/blank policy must be explicit, not guessed.

### Populated Free Bets — independent fixtures and persistence

Inputs: £10 free stake, back5.00, lay5.20, commission **2% = 0.02**, Standard; actual stake remains
unset until Save/placement. Independent penny placement: SNR `10*(5-1)/(5.2-.02)` →7.72;
SR `10*5/(5.2-.02)` →9.65; liability placed stake *4.2 then monetary rounding.

| Journey / input distinction | Expected | Actual | Result / evidence |
|---|---|---|---|
| Native SNR preview | lay7.72; liability32.42; back-win7.58 / lay-win7.57 | exact API components; UI clipboard7.72 | PASS / PROVEN |
| Native SR preview | lay9.65; liability40.53; back-win9.47 / lay-win9.46 | exact API components; UI clipboard9.65 | PASS / PROVEN |
| Both: copy → Save → reread | actual draft not persisted before Save; saved actual equals copied stake | UI Save closes, API statusPlaced with7.72/9.65; subsequent reopen | PASS / PROVEN sampled path |
| Explicit actual7.00 → Back Won settlement | liability29.40; SNR40-29.40=10.60; SR50-29.40=20.60; lay branch6.86 | API/reopened Settlement display10.60/20.60; combined Profile Free Bet report31.20 | PASS / PROVEN; reference != actual != final |
| Repeated settlement / cross-Profile read / missing required identity | one row; denied foreign read; invalid identity no row | repeated PUT200 one ID; foreign GET404; missing event/strategy422 | PASS / PROVEN scoped |
| Converted SNR: stake10, back3, lay3.1, c.02 | reference20/3.08 →6.49, liability13.63; actual6.00 settledBackWon gives20-12.60=7.40 | preview/placement/settlement/retry200; provenance unchanged; one row7.40 | PASS / PROVEN API; converted-row full browser lifecycle NOT TESTED |
| Malformed native Placed valueNaN | controlled422, zero writes | POST500 **after persistence**; row/list/source-summary500; later UI/reports blocked | FAIL / PROVEN, PD-QA-014 |
| Separate malformed `not-money` / missing Profile | malformed422 zero writes; missing Profile controlled denial | malformed500 after persistence; missing Profile500 with zero row | FAIL / PROVEN; no partially-created missing-Profile record |
| Blank stake / foreign-only brand name | incomplete preview truthful; new placement authority needs review | blank Placed201, calculation incomplete/null; foreign-only bookmaker name201, commission missing/null calculation | CODE-VERIFIED contract gap / PROVEN response, not evidence of cross-Profile data disclosure |
| Archived Profile mutation | deny no write |409, zero row | PASS / PROVEN |
| Award source deletion / linkage | preserved auditable award lineage or governed safe-removal response | synthetic source DELETE204, two linked free rows survive pointing at removed source ID | FAIL audit linkage / PROVEN; actual award-split path/deletion policy BLOCKED pending dedicated authority |

Clean Profile C was introduced only after the original Profile A's invalid persisted Free Bets
broke reads. That blockage is a product failure, not private-seed setup failure. Original A remains
unchanged as evidence. Native source linkage used an explicit synthetic qualification source;
automatic award splitting, imported workbook lineage and transactional source removal were NOT
TESTED. Notifications endpoint was read, but a settlement-specific notification requirement was not
established; no claim of full settlement notification coverage. Stale-preview and concurrent-submit
browser assertions remain NOT TESTED. No actual casino/bookmaker wager is executed by these probes.
The native button's actual accessible name is **“Copy Standard free-bet lay stake and mark placed”**:
its handler applies the reference to actual-stake draft fields and sets draftPlaced; Save persists
that explicit combined action. This is not evidence of clipboard-only behaviour or a separately
confirmed placement step. Pure-copy versus combined apply/mark semantics need explicit workflow
review; later actual£7 placement in this audit was a separate directAPI entry, not a real wager.

### #36/#77 conversion — retries, identity, receipts and failure

| Probe | Actual / independent invariant | Result / evidence |
|---|---|---|
| Standard10/back3/lay3.1/c.02 | reference30/3.08 →9.74; destinationProspecting; canonical Profile/Account IDs and SHA-256 source retained | PASS / PROVEN API + browser sampled save |
| Two targets, second Bonus Restricted | HTTP200 contains succeeded A / failed B; B no row. Retry keeps A same record and B failure | PASS partial-result semantics / PROVEN API; partial-review browser recovery NOT TESTED |
| Deliberate new intent, identical fixed source/hash | second operation creates a distinct exploratory row; successful targets not recreated on same-operation retry | PASS / PROVEN API |
| Foreign Account ID / unsupported Bonus SR |422 before target/business rows | PASS / PROVEN |
| Native Free Bet destination | SNR source → Free Bet Prospecting with provenance; subsequent explicit actual placement and settlement above | PASS / PROVEN API |
| Completed Blackjack Live own_cash | signed synthetic one-hand snapshot, balances100→110: settled Casino Manual Play / No Offer, result10.00; checksum retained; same-target retry one record/event | PASS / PROVEN API; actual played Blackjack UI-to-save NOT TESTED |
| Same completed Blackjack snapshot, other Profile | **200 creates second Casino row**, same source/checksum and+10 result. Should409/already-saved globally, no duplicate real activity | FAIL / PROVEN, PD-QA-015 |
| Tampered Blackjack mode with original checksum |422 checksum guard | PASS tamper rejection only; correctly signed Simulation guard NOT TESTED by this probe |
| Desktop1440/light conversion | modalfocus inside; Save200 closes once; focus returns; inputs10/back3 intact; calculator receipt identifies Profile/Account/Sportsbook and Open row link | PASS / PROVEN sampled path |
| Half-width760/dark conversion | modal `[24,752]`, top16/bottom984; Save44px target atx522.6/y917.4; `elementFromPoint` finds `tracker-nav tracker-nav-right`; pointer click times out. KeyboardEnter saves/closes/returnsfocus with receipt | FAIL pointer access / PROVEN; keyboard recovery PASS; extends PD-QA-004/#92 |
| Notification / retry | one source-linked conversion notification for each created record; exact replay does not add another row/event; href retained | PASS scoped / PROVEN API/source evidence |

Blackjack failure root is CODE-VERIFIED: `save_blackjack` starts idempotency with target Profile and
Account identity; there is no completed-source global claim before that target-specific operation.
Single-Profile UI selection prevents cloning in one dialog but does not enforce single real activity
across API calls. No Casino P&L is silently repaired. Same visible brand in different Profiles is
tested with distinct canonical IDs; same-brand distinct Accounts **within** one Profile remain NOT
TESTED. Timeout/ambiguous network delivery and simultaneous double-submit were not injected:
replays occurred after confirmed commits. Normal hub bridge and actual Blackjack UI completion are
remaining browser paths; sampled rendered conversions were on authenticated lean `/calculator`.

### Probe execution / harness and reflow boundaries

Reusable observation runner: `scripts/audit_platform_quality_batch2.mjs` modes `money`, `boundaries`,
`lifecycle`, `lifecycle-clean`, `conversion`, `api-followup`, `ui`, `money-ui`, `money-ui-direct`,
`reflow`, `verify`. Runtime/fixed owner guards prevent fallback to operational8010. It does not
reset/repair data and emits diagnostic JSON only to the isolated runtime, not committed secrets.
`verify` rechecks captured synthetic outputs against fixed independent assertions, never production
calculation functions. 28 bounded assertions:19PASS/9FAIL (four invalid balances, four invalid
withdrawals, one cross-Profile completed-session duplicate). These are **not** whole-journey totals.

Fixture/probe failures separately recorded: early exact-label mismatch in canonical select locator,
initial unhandled response-wait error, reading plain500 as JSON, and later20s navigation/load or
8s/20s Account readiness timeouts (including a follow-up after login/health recovered). No
assertions were weakened to call pointer interception a PASS;
keyboard recovery was exercised and labelled separately. Switching navigation wait to DOM content
readiness avoids waiting on unrelated resource completion, but does not fix slow product requests.

Reflow observations on sampled Standard lean page:320px at100% document305px; desktop1440 at200%
document1425px: no page overflow observed in these two conditions. Combined320/200% was attempted
but navigation stalled before usable content: BLOCKED, not a WCAG failure/pass. Separate batch1
399px overflow remains historical sampled evidence; untested populated-modal combined stress,
all focus states, animation intermediate frames and screen-reader output remain UNVERIFIED.
Audit and protected web processes remained listening; later login health requests timed out during
local stalls. This is not proof that normal services stopped, and none were terminated/restarted.

## D. Prioritised findings and bounded next tranches

Every row applies to main f7 unless explicitly development/planned. Severity is impact potential;
exposure and evidence prevent assuming a critical advisory means current exploitation.

| ID / area | Expected versus actual / reproducible evidence | Result / evidence | Severity; likelihood/exposure; impact | Effort/dependencies / recommendation / acceptance test | Issue |
|---|---|---|---|---|---|
| PD-QA-001 Dependencies | `pnpm audit --json`: affected Next/sharp and dev packages, 3 critical/13 high/4 moderate entries | FAIL / PROVEN lockfile; DOCUMENTED advisory, UNVERIFIED exploitability | Critical potential; conditional exposure; security/data integrity | Small–medium: authorised patched upgrade + exposure review; scoped auth/finance/restore regressions and fresh audit | #115, parent #114 |
| PD-QA-002 Account money | Batch2 POST/PUT accept not-money/NaN/±Infinity, retained; withdrawalPUT accepts same; Account GET200, export409 later | FAIL / PROVEN isolated API/persistence/downstream; UI write BLOCKED readiness | High; authenticated malformed/import input plausible; misleading bankroll/export failure | Small per-surface contract; reject before write; incomplete summaries explicit; no coercion or historical rewrite | #91/#85 |
| PD-QA-003 Missing Profile write | Valid-shaped Sportsbook POST to AUDIT-MISSING-PROFILE →500/FK failure rather than 404/422 | FAIL / PROVEN API | Medium; stale URL/direct request plausible; reliability, no successful phantom write observed | Small: canonical parent existence validation/error boundary; verify all ledgers with missing/stale Profile zero-write fixture | #114 |
| PD-QA-004 Modal focus/Escape/pointer containment | Batch1 native editor focus/EscapeFAIL; batch2 lean conversion760dark Save hit belongs to tracker-nav-right; keyboardEnter recovers, closes and restoresfocus | FAIL / PROVEN DOM/hit geometry; recoveryPASS | High keyboard/native workflow; medium pointer conversion obstruction; half-width use | Medium shared shell; portal/stacking/viewport/focus/Escape regressions; don't force-click or hide navigation | #57/#61/#92/#36 |
| PD-QA-005 Text reflow | Standard at320px with root32px (200%) →document width399px in light/dark; 16px at390/760/1440 contained | FAIL / PROVEN geometry; exact offending track not yet isolated | Medium; narrow/enlarged use; unreadable/offscreen controls | Small–medium shared fields/rail; separate320px normal,200% desktop,combined stress, no page overflow/label clipping | #35/#92 |
| PD-QA-006 Synthetic test independence | Fresh audit worktree 74 selected tests →31pass/43fail; missing private seed makes demo Profile writes FK-fail. Independent auth/security/restore21pass; backups/PG9pass/5setupfail | FAIL harness / PROVEN | High assurance debt; new checkout/CI likely; hides product failures or sensitive-data dependency | Medium: explicit synthetic factories/catalogue/settings; fresh checkout with no private inputs passes focused suites; do not rewrite expectations | #113/#114/#93 |
| PD-QA-007 Financial aggregation authority | Batch2 invalid stored balance + valid£10 yields apparent complete£10 cash / two Accounts included; source API retains invalid string, export409 | FAIL / PROVEN Profile runtime; combined summary BLOCKED | High; malformed balance accepted; understated/unknown bankroll looks reviewed | Small bounded incomplete-aggregation handling alongside Account validation; independent known/unknown/null fixtures, no silent coercion | #91/#11/#114 |
| PD-QA-008 Account access import | ACCOUNT_SOURCE_MAP omits Stake/Promo Access and LastPromoUsed not recomputed | BLOCKED mapping / CODE-VERIFIED + DOCUMENTED | High workflow; imports; lost eligibility evidence | Small–medium contract vocabulary/provenance first; synthetic restricted/unknown labels review + roundtrip isolated | #109/#82 |
| PD-QA-009 Balance intelligence | Mutable latest Account balance plus separate snapshot API do not establish atomic observations/freshness UI | NOT TESTED requested scope / CODE-VERIFIED partial | High operational; all manual balances; stale cash / misleading trends | Medium #85/#106 contract; preserve unexplained changes, same-value confirmation and auditable timestamps; no fake ledger activity | #85/#106 |
| PD-QA-010 Ledger/planner version gap | Rich v2 Multi-Lay standalone not wholly saveable/settleable; dev Normal per-leg planning slice not main | BLOCKED remaining contract / CODE-VERIFIED | High money workflow; new configs; silent flattening risk if guards bypassed | Contract-gated slice/explicit UI eligibility; v1 actual/history untouched, unsupported configurations zero writes, create-preview-copy-save-reopen | #36/#38/#113 |
| PD-QA-011 Durable notifications | Source completion/removal can end source-derived history despite reliable clear tombstones | NOT TESTED full requirement / DOCUMENTED gap | Medium; lifecycle completion; lost task/event context | Approved smallest event boundary; completion/removal keeps viewer-authorised history without source mutation | #90/#99 |
| PD-QA-012 Request truth / stale docs | Overview says capabilities deferred/open contrary to current code/live issue states; 18 unlocated requests remain | FAIL docs / CODE-VERIFIED; BLOCKED missing original text | Medium; every handoff; scope lost/false assurance | Small routed status update proposal, preserve history/IDs; link authority/current evidence; user supplies original text for #102 | #93/#98/#102/#113 |
| PD-QA-013 Credential rotation | #96 still open/current register NOT STARTED; no verification of invalidation | BLOCKED authorised remediation / DOCUMENTED | High potential; previously exposed credential; provider/security | Small separate secret-provider operation; invalidate old credential and verify secure new config without publishing values | #96 |
| PD-QA-014 Free Bet atomic financial validation | PlacedNaN and not-money POST500 **after commit**; retained rows cause list/source/report500. Missing Profile500 no row. Clean SNR/SR fixtures pass separately | FAIL / PROVEN API + persistence + UI downstream; mainf7 | High; authorised malformed input; ledger/report availability and unknown financial state | Small dedicated Free Bet pre-write finite validation/calculation and transaction boundary; each invalid submission controlled4xx + zero writes; independent SNR/SR actual settlement/report regressions | #91/#114; Free Bet/bridge #36 |
| PD-QA-015 Completed Casino duplicate activity | Same Blackjack checksum+session saves+£10 Casino result into two Profiles; same-target retry dedup works | FAIL / PROVEN API/SQL; root CODE-VERIFIED target-only claim | High; authorised repeated/cross-target save; double recognised activity/P&L | Small independent bridge global completed-source claim; reject second target while preserving same-target retry and new exploratory intent | #36/#40/#114 |

No product fixes were made. Recurring UI findings reuse existing #92/#57/#61 rather than create a
new style/policy system. New dependency remediation #115 was deduplicated against existing issue titles.

### Three proposed implementation tranches (approval required)

Batch1's bundled recommendations are superseded in priority/scope, not erased as historical
evidence. Each recommendation below is a separate implementation approval; no upgrade/harness/modal
redesign bundled into money validation.

1. **Account monetary input and incomplete aggregation (#91, PD-QA-002/007):** first repair unless
   #115 review establishes urgent reachable exploit conditions. Finite complete-string validation
   on create/update/withdrawals; controlled unknown summaries for already-invalid sources. Gates:
   UI/directAPI invalid zero-write, explicit zero/blank/null policy, £22.34 independent control,
   export diagnostics, Profile isolation, no historical balance rewrite. No framework refactor.
2. **Free Bet atomic validation (#91/#36, PD-QA-014):** validate/calculation failure before commit,
   controlled missing Profile and invalid money response. Gates: NaN/Infinity/not-money zero writes;
   populated SNR/SR preview/copy/actual placement/finalreport; award lineage safely retained; no
   silent recalculation of historical rows. Separate from Account implementation.
3. **Completed-session global idempotency (#36, PD-QA-015):** one real Blackjack snapshot cannot
   create multiple Casino activities. Gates: same-target retry stable, second Profile/Account no
   write, concurrent claim test, exploratory new-intent remains legitimate, source checksum and
   Notifications unchanged. Modal pointer/focus fixes belong in another focused #92 tranche.

Conditional urgent security repair remains separate #115: maintainer patch + exposure evidence and
scoped regressions only. Credential rotation #96 is its own provider/owner operation. Subsequent
Account access/observations #109/#85/#106, analytics #111 and advisory tasks #82/#86 remain visible;
these audit priorities do not delete or silently deprioritise the original requests.

Product decisions still unresolved: Account access vocabulary/historical promo fallback; same-value
balance confirmations; capability evidence confidence/expiry; subscriber/fee-role exposure; saved
Reports presets; external source/AI terms, costs and retention; lossless richer calculator destination
representations; Accumulator specialised bets and Dutch Advanced allocation; original 18 requests.

## Reproduction, limits and exact next checkpoint

Existing isolated authenticated fixture was launched from this audit worktree:

```sh
./scripts/run-python.sh scripts/run_notification_persistence_acceptance_api.py --port 8024 --runtime-directory /tmp/openforge-platform-audit-20260912-runtime
```

That command creates/seeds **once** and refuses an existing directory. Do not rerun it to reset this
runtime or the protected candidate. Audit web uses canonical Next dev on3024 with
`OPENFORGE_INTERNAL_API_BASE_URL=http://127.0.0.1:8024` and the existing synthetic auth fixture config.
It must never fall back to8010. Fixture cookie remains a private0600 file, never an audit attachment.

`node scripts/audit_platform_quality.mjs` reuses the dedicated8024 runtime and records synthetic
observations to its local `audit-evidence.json`. It does not reset data; intentionally invalid
Account money is restricted to AUDIT-114-B. That file is diagnostic, not committed/private-cookie
evidence. Findings may be FAIL although the observation runner exits normally.

Focused commands/results:

- Auth/security/portable restore:21PASS (12auth +1policy +8restore), at current main source.
- Backup/PostgreSQL adapter:9PASS/5fixture-or-auth-setupFAIL; actual PostgreSQL NOT TESTED.
- Cash/Casino values/eligibility:7PASS, exact existing synthetic fixtures only.
- Initial combined selection:31PASS/43FAIL, retained as harness evidence rather than product assurance.
- Actual browser/API: two same-name distinct Profiles,30native rows, isolation/refresh,17route shells,
  Standard reflow widths/themes, lean auth and native editor focus/Escape. No console errors observed
  on these sampled paths; this does not clear all runtime warnings everywhere.

**Exact next audit area after batch2:** first complete the blocked Account UI finite-input and
combined-summary probes without repairing retained invalid synthetic rows; then native award-split/
imported Free Bet lineage and safe removal, correctly signed Simulation denial, actual Blackjack
UI-to-Casino save, normal-hub bridge and partial-review recovery. Test concurrent/ambiguous delivery,
stale previews and same-brand distinct Accounts within one Profile. Then populated Casino/Extra
Places/Cash-fee workflows, complete modalfocus/Escape/reflow/intermediate motion both themes,
true isolated PostgreSQL recovery, larger-data production performance, remaining historical request
clarifications and actual screen-reader testing (UNVERIFIED). These are not passed by indexing titles
or by the28 independent assertion checks above.

### #113 return instructions — no scheduled date

On supplied comparisons or Will's explicit resumption: launch the preserved f7 candidate using the
existing wrapper above; choose the original HTML/XLSX files from `_input`; retain original parent
case IDs, tested full commit/date and user observations. Compare any newer candidate separately
with its own DB. Retest affected development cases (Multi-Lay per-leg Normal save/reopen/native
Add Row) rather than borrowing f7 acceptance. Sequential2/4,2UPDutch/slider edges,DutchSNR/3-way,
ProfitBoost strategy/cap and full Blackjack rules remain explicit repeat coverage;79runs is not
exhaustive. BonusSR stays separately deferred. Review every unexplained mismatch before sign-off.

## GitHub sync / delivery boundary

Authenticated sync succeeded: [#114 checkpoint comment](https://github.com/wolney8/OpenForge/issues/114#issuecomment-5646238440),
[#91 money finding](https://github.com/wolney8/OpenForge/issues/91#issuecomment-5646238510),
[#92 rendered findings](https://github.com/wolney8/OpenForge/issues/92#issuecomment-5646238590),
[#113 evidence/deferral](https://github.com/wolney8/OpenForge/issues/113#issuecomment-5646238654);
deduplicated dependency remediation [#115](https://github.com/wolney8/OpenForge/issues/115).
No closure, hosted deployment or product implementation. Intended checkpoint files are this report,
PROJECT_STATUS, the existing canonical register and the isolated audit observation runner only.

Batch2 authenticated sync: [#114](https://github.com/wolney8/OpenForge/issues/114#issuecomment-5646667540),
[#91](https://github.com/wolney8/OpenForge/issues/91#issuecomment-5646667609),
[#36](https://github.com/wolney8/OpenForge/issues/36#issuecomment-5646667680),
[#92](https://github.com/wolney8/OpenForge/issues/92#issuecomment-5646667760),
[#115](https://github.com/wolney8/OpenForge/issues/115#issuecomment-5646667823),
[#96](https://github.com/wolney8/OpenForge/issues/96#issuecomment-5646667890).
No new competing issue/report, product implementation, merge, issue closure or hosted claim.
Final read-only health recheck: normal3010/8010, development3013/8013, manual3020/8020 and
audit3024/8024 all returned200 on `/login` (web) / `/healthz` (API), after earlier transient stalls.
No service was restarted or data reset; earlier probe blockers remain evidence of their attempt.

## Original issue scope index — identities preserved, not completion claims

This index retains every inventoried original issue and intended outcome by its original title/link.
Closed GitHub state does not establish a current workflow PASS. This is a coverage checklist, not
permission to implement deferred scope. Refer to A/B for examined requests and observable evidence;
remaining issue-specific clarification triage is explicitly pending. #115 is the new deduplicated
dependency finding, not a replacement for any original idea.

| Issue | Original requested outcome/title | Issue state on 2026-09-12 | Audit scope/evidence boundary |
|---|---|---|---|
| [#1](https://github.com/wolney8/OpenForge/issues/1) | Audit current OpenForge source pack and freeze authoritative inputs | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#2](https://github.com/wolney8/OpenForge/issues/2) | Create workbook blueprint and sheet inventory for OpenForge Tracker | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#3](https://github.com/wolney8/OpenForge/issues/3) | Create workbook field map, formula map, workflow map, and cash-first map | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#4](https://github.com/wolney8/OpenForge/issues/4) | Draft profile-scoped OpenForge schema and route architecture | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#5](https://github.com/wolney8/OpenForge/issues/5) | Write calculation contract for sportsbook cash-first current value | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#6](https://github.com/wolney8/OpenForge/issues/6) | Write calculation contract for free bet cash-first current value | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#7](https://github.com/wolney8/OpenForge/issues/7) | Create synthetic fixture pack for sportsbook and free bet regression tests | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#8](https://github.com/wolney8/OpenForge/issues/8) | Implement first pure sportsbook calculation module with unit tests | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#9](https://github.com/wolney8/OpenForge/issues/9) | Build local-first Login -> Profiles -> Tracker application shell | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#10](https://github.com/wolney8/OpenForge/issues/10) | Build Tracker MVP modules with profile isolation | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#11](https://github.com/wolney8/OpenForge/issues/11) | Build reporting parity for per-profile and cross-profile summaries | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#12](https://github.com/wolney8/OpenForge/issues/12) | Add spreadsheet-shaped import/export with audit trail | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#13](https://github.com/wolney8/OpenForge/issues/13) | Lock confirmed profiles/subscribers foundation for OpenForge | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#14](https://github.com/wolney8/OpenForge/issues/14) | Deferred: Define Subscriber Role and Access Model | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#15](https://github.com/wolney8/OpenForge/issues/15) | Deferred: Define Subscriber Visibility Matrix and Read-Only Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#16](https://github.com/wolney8/OpenForge/issues/16) | Deferred: Define Self-Service Subscriber Fee Model | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#17](https://github.com/wolney8/OpenForge/issues/17) | Deferred: Plan Secure Invite and Subscriber Onboarding Boundary | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#18](https://github.com/wolney8/OpenForge/issues/18) | Deferred: Add Subscriber Access Control and Fee Regression Fixtures | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#19](https://github.com/wolney8/OpenForge/issues/19) | Build local-first Login -> Profiles -> Tracker shell with scaffold and local DB baseline | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#20](https://github.com/wolney8/OpenForge/issues/20) | Add local database and backup-ready storage baseline for OpenForge shell | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#21](https://github.com/wolney8/OpenForge/issues/21) | Implement first pure calculation with approved fixtures and tests | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#22](https://github.com/wolney8/OpenForge/issues/22) | Implement first profile-scoped tracker workflow slice | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#23](https://github.com/wolney8/OpenForge/issues/23) | Plan Fee Calculation Visibility and Explicit Fee Withdrawal Workflow | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#24](https://github.com/wolney8/OpenForge/issues/24) | Plan Multi-Profile Bet Entry Workflow With Account Eligibility Checks | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#25](https://github.com/wolney8/OpenForge/issues/25) | Define Target Engine scope, safety boundaries, and decision-support rules | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#26](https://github.com/wolney8/OpenForge/issues/26) | Design Fund Manager target-setting model for weekly, biweekly, and monthly periods | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#27](https://github.com/wolney8/OpenForge/issues/27) | Plan recommendation modes for standard, underlay, overlay, and upside-chasing decisions | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#28](https://github.com/wolney8/OpenForge/issues/28) | Plan historical cadence and seasonality inputs for target decision support | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#29](https://github.com/wolney8/OpenForge/issues/29) | Plan casino recycling and winnings-allocation decision logic | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#30](https://github.com/wolney8/OpenForge/issues/30) | Create contracts and fixtures plan for target engine decision support | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#31](https://github.com/wolney8/OpenForge/issues/31) | Plan optional AI-assisted context layer for target engine recommendations | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#32](https://github.com/wolney8/OpenForge/issues/32) | Add Common Bet Combo Buttons for Sportsbook Bets and Casino Offers | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#33](https://github.com/wolney8/OpenForge/issues/33) | UI polish: animated outcome cards and currency-first financial value formatting | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#34](https://github.com/wolney8/OpenForge/issues/34) | Sportsbook: Profile-aware special-offer bookmaker suggestions | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#35](https://github.com/wolney8/OpenForge/issues/35) | Calculator Workspace: Add profile-scoped standalone calculators surface | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#36](https://github.com/wolney8/OpenForge/issues/36) | Calculator Workspace: Create sportsbook draft row from calculator state | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#37](https://github.com/wolney8/OpenForge/issues/37) | Calculator Contracts and Fixtures: Standalone calculator families | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#38](https://github.com/wolney8/OpenForge/issues/38) | Advanced Calculator Backlog: Each-way, dutching, sequential lay, and later sportsbook expansions | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#39](https://github.com/wolney8/OpenForge/issues/39) | Sequential Lay Planning: acca timing, next-leg workflow, and notifications | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#40](https://github.com/wolney8/OpenForge/issues/40) | Casino Utility Backlog: blackjack strategy calculator and spin counter | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#41](https://github.com/wolney8/OpenForge/issues/41) | Sportsbook: Add pending placed date-range quick filter in table | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#42](https://github.com/wolney8/OpenForge/issues/42) | Sportsbook: Enable sortable column headers for operational triage | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#43](https://github.com/wolney8/OpenForge/issues/43) | Sportsbook: Add row highlighting for risk and workflow states | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#44](https://github.com/wolney8/OpenForge/issues/44) | Sportsbook: Add placement workflow actions for back and lay lifecycle | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#45](https://github.com/wolney8/OpenForge/issues/45) | Sportsbook: Add partial-lay follow-up reminder and liability recheck prompts | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#46](https://github.com/wolney8/OpenForge/issues/46) | Sportsbook: Clarify offer type vs bet type taxonomy and option sets | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#47](https://github.com/wolney8/OpenForge/issues/47) | Sportsbook: Add qualifying-loss match rating indicator in calculator panel | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#48](https://github.com/wolney8/OpenForge/issues/48) | Sportsbook: Fix special-offer bookmaker suggestion visibility and guidance | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#49](https://github.com/wolney8/OpenForge/issues/49) | Sportsbook to Free Bets: Add conversion action for free-bet-awarding offers | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#50](https://github.com/wolney8/OpenForge/issues/50) | Sportsbook: Redesign multi-lay planner for branch-first entry and mapping | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#51](https://github.com/wolney8/OpenForge/issues/51) | Sportsbook: Add custom lay slider with editable bounds and live feedback | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#52](https://github.com/wolney8/OpenForge/issues/52) | Approve Oddsmatcher shell, table, modal, and advanced-control contract | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#53](https://github.com/wolney8/OpenForge/issues/53) | Implement deterministic oddsmatcher fixtures for rating, modal maths, and advanced controls | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#54](https://github.com/wolney8/OpenForge/issues/54) | Build Oddsmatcher component architecture (shell, drawers, table, bet summary modal) | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#55](https://github.com/wolney8/OpenForge/issues/55) | Implement modal calculator math module with conservative headline total | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#56](https://github.com/wolney8/OpenForge/issues/56) | Implement advanced underlay/standard/overlay controls with bounded stake range | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#57](https://github.com/wolney8/OpenForge/issues/57) | Add E2E coverage for modal layering, close controls, and row-action flows | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#58](https://github.com/wolney8/OpenForge/issues/58) | Define Currency and Animated Financial Value Contract | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#59](https://github.com/wolney8/OpenForge/issues/59) | Build Shared Animated Financial Value Primitive | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#60](https://github.com/wolney8/OpenForge/issues/60) | Material 3/WCAG Ledger and Editor Density Review | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#61](https://github.com/wolney8/OpenForge/issues/61) | Deterministic Guided Entry Focus Engine | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#62](https://github.com/wolney8/OpenForge/issues/62) | Add Optional Google OIDC for Existing Fund Manager Login | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#63](https://github.com/wolney8/OpenForge/issues/63) | Implement Verified Local and Encrypted Cloud Database Backups | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#64](https://github.com/wolney8/OpenForge/issues/64) | Add Bookmaker Brand Catalogue and Compact Ledger Identity | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#65](https://github.com/wolney8/OpenForge/issues/65) | Rename OpenForge Platform to Plum Duff and Apply Supplied Branding | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#66](https://github.com/wolney8/OpenForge/issues/66) | Convert Global Burger Menu to a Material 3 Left Navigation Drawer | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#67](https://github.com/wolney8/OpenForge/issues/67) | Draft Public Offer Source-Ingestion Contract | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#68](https://github.com/wolney8/OpenForge/issues/68) | Build Manual-First Offer Intelligence Catalogue | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#69](https://github.com/wolney8/OpenForge/issues/69) | Integrate Welcome Offers With Profile Sign-Up Opportunity Flow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#70](https://github.com/wolney8/OpenForge/issues/70) | Implement Profile Account Restriction and Gub Log | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#71](https://github.com/wolney8/OpenForge/issues/71) | Add Linked Risk-Team and Operator-Group Warnings to Offer Workflows | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#72](https://github.com/wolney8/OpenForge/issues/72) | Add Reload, Daily, and Free-to-Play Offer Review Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#73](https://github.com/wolney8/OpenForge/issues/73) | Subscriber Mug-Bet Preferences, Suggestions, and Activity Logging | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#74](https://github.com/wolney8/OpenForge/issues/74) | Subscriber Registration, Document Review, and Funding Request Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#75](https://github.com/wolney8/OpenForge/issues/75) | Implement Safe Neon Runtime Cutover and Database Maintenance Strategy | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#76](https://github.com/wolney8/OpenForge/issues/76) | Implement Profile Navigation Command Menu and Global Burger Cleanup | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#77](https://github.com/wolney8/OpenForge/issues/77) | Implement Multi-Profile Opportunity Quick Add V2 | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#78](https://github.com/wolney8/OpenForge/issues/78) | Implement Casino Wagering and EV Calculator From Approved Contract | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#79](https://github.com/wolney8/OpenForge/issues/79) | Implement Source-Created Offer Intelligence Ingestion | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#80](https://github.com/wolney8/OpenForge/issues/80) | Implement Free-Bet Award Lineage and Safe Removal | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#81](https://github.com/wolney8/OpenForge/issues/81) | Replace Browser Route Guards With In-App Confirmation Dialogs | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#82](https://github.com/wolney8/OpenForge/issues/82) | Implement Account Capability Profitability Audit | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#83](https://github.com/wolney8/OpenForge/issues/83) | Implement Profit Boost Offer Type and Calculator Flow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#84](https://github.com/wolney8/OpenForge/issues/84) | Implement Multi-Fixture and Outright Sportsbook Offer Support | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#85](https://github.com/wolney8/OpenForge/issues/85) | Add Quick Account Popup and Bookmaker Reconciliation Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#86](https://github.com/wolney8/OpenForge/issues/86) | Build Fund Manager Decision-Support Task Deck | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#87](https://github.com/wolney8/OpenForge/issues/87) | Implement Approved Offer Source Ingestion and Discord Intake Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#88](https://github.com/wolney8/OpenForge/issues/88) | Implement Extra Places Ledger, Calculator and Settlement Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#89](https://github.com/wolney8/OpenForge/issues/89) | Enable Subscriber Mug Bet Suggestion and Mug Activity Logging | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#90](https://github.com/wolney8/OpenForge/issues/90) | Retain Durable Notification History After Source Lifecycle Ends | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#91](https://github.com/wolney8/OpenForge/issues/91) | Apply Field-Specific Money and Rate Validation Beyond Sportsbook Odds | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#92](https://github.com/wolney8/OpenForge/issues/92) | Review Redundant Interface Copy and Repeated Component Drift in Bounded Batches | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#93](https://github.com/wolney8/OpenForge/issues/93) | Audit Repository and Agent-Document Routing Before Any Cleanup | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#94](https://github.com/wolney8/OpenForge/issues/94) | Complete Deferred Working-Workbook Google and Hosted Acceptance | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#95](https://github.com/wolney8/OpenForge/issues/95) | Design Three-Way Incremental Workbook Synchronization Without Merge Writes | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#96](https://github.com/wolney8/OpenForge/issues/96) | Rotate the Exposed OAuth Client Secret as a Separate Security Task | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#97](https://github.com/wolney8/OpenForge/issues/97) | Review Workbook KPI and Formula-Driven Workflows for Product Decisions | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#98](https://github.com/wolney8/OpenForge/issues/98) | Maintain One Discoverable Project Status and Acceptance Entry Point | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#99](https://github.com/wolney8/OpenForge/issues/99) | Verify Durable Notification Clearing Across Normal and Hosted Use | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#100](https://github.com/wolney8/OpenForge/issues/100) | Notification History: prevent Type and Status filter overlap | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#101](https://github.com/wolney8/OpenForge/issues/101) | Keep Canonical Local Development Services Available Across Handoffs | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#102](https://github.com/wolney8/OpenForge/issues/102) | Recover the original requirements for PD-FUTURE-001–018 | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#103](https://github.com/wolney8/OpenForge/issues/103) | Decide the future product name and compatibility-safe rebranding scope | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#104](https://github.com/wolney8/OpenForge/issues/104) | Preserve the Founder workbook import acceptance baseline | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#105](https://github.com/wolney8/OpenForge/issues/105) | Extend shared financial digit-roll animation to first load and all signed-money displays | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#106](https://github.com/wolney8/OpenForge/issues/106) | Add Account Balance History, Freshness Prompts and Coinbase-style Trend Reporting | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#107](https://github.com/wolney8/OpenForge/issues/107) | Prevent synthetic Account fixtures from leaking into daily-use Profile authorities | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#108](https://github.com/wolney8/OpenForge/issues/108) | Bound large Account option chip sets with a compact carousel / more control | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#109](https://github.com/wolney8/OpenForge/issues/109) | Preserve September Accounts access/restriction semantics through workbook import | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#110](https://github.com/wolney8/OpenForge/issues/110) | Add coordinated pie/donut/progress chart reveal and replay motion | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#111](https://github.com/wolney8/OpenForge/issues/111) | Build interactive financial time-series and Reports chart explorer | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#112](https://github.com/wolney8/OpenForge/issues/112) | Add canonical odds input normalizer with fractional-to-decimal conversion | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#113](https://github.com/wolney8/OpenForge/issues/113) | Calculator independent verification audit: formulas, fixtures and source parity | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#114](https://github.com/wolney8/OpenForge/issues/114) | Whole-platform audit: usability, functionality, accessibility, roadmap coverage and sustainability | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#115](https://github.com/wolney8/OpenForge/issues/115) | Remediate reachable dependency advisories without overstating application exposure | open (GitHub, not audit acceptance) | Production graph remediated locally; ESLint-only transitive findings accepted pending safe upstream fixes; hosted exposure unverified |

## #91 Account repair addendum — isolated implementation, not main acceptance

Implementation commit: `102848a1214730e5065e9db04a66047dce6cd82b` (pushed repair branch).
GitHub evidence sync: #91 comment5648267278, #114 comment5648268451, #92 comment5648268545.
Original audit findings are preserved; only this addendum records branch-specific repair results.

Date: 2026-09-12. Repair branch `repair/account-money-91` is based on application
`f7a3b35073ecc87cdf8f8f881129f221ec44d395`. Audit evidence checkpoints `c65169f` /
`7d75b5a54db466b1a47c6d7786ddc633f3dc7122` are documentation/probes, not a different tested
application. The audit above remains historical evidence; this authorised repair changes only its
Account findings on the separate branch. Main/normal services remain unfixed until integration.

### Repair scope and observable evidence

| Finding / scope | Before | Repair result / evidence |
|---|---|---|
| PD-QA-002 Account create/update | Focused regression reproduced POST201 for not-money before editing; original Batch2 observed all four malformed/non-finite values retained | PASS / PROVEN: 25 synthetic Account API tests reject malformed/non-finite, excess precision, commas, exponents and null with422; prior Account/audit/timestamps unchanged on rejection; catalogue/onboarding/direct persistence controls included |
| PD-QA-007 included cash | Independent pre-fix suite had9 failed assertions: invalid+£10 looked complete, or malformed syntax was partially interpreted | PASS / PROVEN: independent £12.34+£10=£22.34, zero+£10=£10, signed control; included invalid/unknown gives Unavailable and separately labelled Known subtotal; excluded invalid does not contaminate included cash |
| Authorised combined / ledger separation | Combined execution was blocked in original audit | PASS / PROVEN focused unit execution: incompleteness propagates through authorised combined inputs; unrelated ledger P&L remains0. Whole combined browser journey NOT TESTED this repair |
| Legacy source and export | Accepted invalid money later caused409 export | PASS / PROVEN: isolated SQL fixture retains rawNaN across reads/UI/summary; XLSX409 until explicit correction, then200; no automatic repair/drop/zero substitution |
| Real Account editor | Original audit readiness blocked input execution | PASS / PROVEN actual Playwright:1440/light and760/dark; pointer Edit/Save without force; invalid text preserved, associated inline error, Save disabled; pending Infinity independently blocked; .50 commits0.50; correction saves12.34 and Dashboard22.34 |
| Display geometry | Canonical FinancialTextInput / FinancialValue unchanged | PASS / PROVEN: £ prefix contained and centre delta0.0078125px; modal within viewport; document width1425/1440 and745/760; keyboard Tab exercised; no page errors; reduced-motion enabled |
| SQLite / PostgreSQL | Shared persistence connects through SQLite or PostgreSQL adapters | SQLite PASS / PROVEN. Shared pre-transaction validation/rollback paths CODE-VERIFIED. Two PostgreSQL row/placeholder adapter unit tests PASS, **actual PostgreSQL database execution NOT TESTED**: no available authorised isolated PostgreSQL environment used |
| Alternate writes | Catalogue/onboarding/import/shared create/update could bypass one route | Catalogue/onboarding/direct create/update PASS / PROVEN; complete selected Account-import preflight before business writes CODE-VERIFIED, end-to-end importer confirmation NOT TESTED; historical restore/seed intentionally remains lossless |

Focused commands in repair worktree:

```sh
./scripts/run-python.sh -m pytest apps/api/tests/test_account_money_safety.py apps/api/tests/test_postgres_runtime.py -q
cd apps/web
node node_modules/vitest/vitest.mjs run lib/account-money-safety.test.ts lib/tracker-summary.test.ts lib/cross-profile-reporting.test.ts lib/decimal-input.test.ts
node node_modules/typescript/bin/tsc --noEmit --project tsconfig.typecheck.json
```

Results:27 Python tests (25 Account +2 adapter-only),47 web tests (18 new Account tests +29 existing
summary/decimal regressions), TypeScript PASS, focused Ruff PASS, new monetary module strict mypy PASS.
These counts are bounded regressions, not whole-platform readiness or calculator acceptance.
Browser runner: `node scripts/verify_account_money_repair.mjs`; guard requires the dedicated
synthetic owner on8026 and fixture-only DB `/tmp/openforge-account-money-91-repair/acceptance.sqlite3`.
Diagnostic JSON stays in that temporary runtime. Web3026/API8026 are separate from3010/8010,
3020/8020,3013/8013 and3024/8024. It deliberately fixtures invalid legacy data **only** in the repair DB;
it never opens the audit's retained invalid DB or operational/manual data.

Harness corrections are separate from product fixes: initial factory omitted required module/source
fields; owner export guard needed the synthetic session; a pending-field locator incorrectly used
“amount”; a new test passed a string instead of the existing resolved-date-range object. A large-number
negative display fixture was corrected from a representable formatted amount to90071992547409.93,
which JavaScript would incorrectly display .94; the exact-cent display guard reports Unavailable.
No production assertion was weakened. Browser capture is headless actual Chromium; screen-reader,
all-platform keyboard/dialog behaviour and desktop text enlargement remain NOT TESTED here.

### Field policy, inclusion and integration

The existing Account catalogue/state contract contains the policy table: omitted money/timestamp
updates preserve values; zero is a valid observation; explicit blank is unknown; null rejects;
signed Account-editor balances/withdrawals retain existing allowance; onboarding retains non-negative
limits/defaults. Complete exact cents only, no partial parsing, unsupported-precision rounding or
new low cap. Existing40-character field representation limit remains. Leading decimals normalise
only on commit. Invalid text remains editable. Huge valid entries outside exact numeric presentation
are Unavailable, not fabricated numbers. Account-specific raw history remains explicitly correctable.
Accounts-page pending totals retain all-row scope; Profile/combined pending totals retain included
scope. No unrelated ledger P&L is marked incomplete.

Integration is deferred: review repair branch diff against the verifiedf7 main, then merge only with
Will's approval and restart normal application from reviewed main. No schema migration is required.
Rollback is a reviewed revert of repair commits; no data rewrite accompanies either direction.
This branch retains the exact existing7d75 audit report plus this addendum at the **same canonical path**;
reconcile that addendum rather than replacing history when integrating the separate audit branch.

Next independent repair: PD-QA-014 Free Bet pre-commit validation/controlled failure. PD-QA-015
completed Blackjack cross-Profile/Account uniqueness including concurrency, PD-QA-004 modal focus/
Escape/pointer obstruction, #115 exposure/dependency work and #96 owner/provider credential rotation
remain queued separately. Other populated ledgers, large data, PostgreSQL recovery, screen-reader
and request clarification audit coverage stays unexamined, not passed.

Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit request.
Original comparison files, launcher, parent IDs, frozenf7 candidate and observations remain untouched.

## PD-QA-014 repair addendum — Free Bet pre-commit validation / 2026-09-12

**Branch-specific evidence; main remains unfixed.** This extends the same audit, preserving Batch2's
failures and the Account addendum. Result and evidence are separate. No calculator formula, settled
record, schema, bridge architecture, operational database, secret or dependency change was made.

### Revision and protected environments

- Application main/frozen candidate: f7a3b35073ecc87cdf8f8f881129f221ec44d395, unchanged.
- New branch `repair/free-bet-atomic-91` begins exactly at Account checkpoint
  c4b9bb4412cb0e29c78df4919624c58db57633d6; `git merge-base --is-ancestor` proves inherited
  Account fix102848a1214730e5065e9db04a66047dce6cd82b. Account branch/commits unchanged.
- Added fix: b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f. Worktree:
  `/Users/will_work/Scripts/Homelab/OpenForge/.worktrees/free-bet-atomic-repair`.
- Audit7d75b5a54db466b1a47c6d7786ddc633f3dc7122 / c65169f and intentionally invalid audit fixtures
  remain untouched. Multi-Lay215193b7fcb5b11a28e23a4531d2a45434545dc1 remains unmerged.
- Disposable repair runtime: API8030/web3030, database
  `/tmp/openforge-free-bet-atomic-91-repair/acceptance.sqlite3`. No shared mutable database with
  normal3010/8010, frozen3020/8020, development3013/8013, audit3024/8024 or Account3026/8026.
  All six API `/healthz` and web `/login` checks200 at the checkpoint. No protected service restarted.
- `_input` originals/observations, capture launcher and parent case IDs unchanged.
  Manual comparison deferred by Will; no scheduled date; resume only on supplied results or request.

### Reproduce-before-fix and root cause

The initial focused regression run had **8 failed tests before production editing**. NaN, Infinity,
-Infinity and not-money Placed creates returned500 **and each retained one Free Bet**; subsequent
individual/list/source-summary reads500. Missing Profile returned500 with zero Free Bets. Invalid
actual-lay update contaminated a valid record. Injected response-preparation RuntimeError returned500
after retaining the new row. These are independently asserted SQLite states, not inferred from HTTP.

Root: unconstrained financial strings entered persistence; create/update committed row+business audit
before engine/response construction. The response model inherited write validators, so corrupt or
legacy records could fail again during reads. Missing Profile fell through to persistence failure.

### Field and transaction policy

The existing [Free Bet contract](../contracts/free-bet-current-value-contract.md) has the compact policy.
Money is complete exact-cent decimal, non-negative except explicit reasoned final override.
Zero remains valid; blank is unknown/optional, not fabricated stake. Null/malformed/non-finite,
comma/exponent and unsupported money precision reject. Odds use the existing complete decimal
>=1.01 contract with arbitrary supported decimal precision; commissions retain precision as0..1 ratios
and still resolve from Profile Exchange settings. No two-decimal odds/commission truncation.

PATCH merges omitted fields with the stored record before validating the effective lifecycle and
financial dependencies. PUT retains required identity/lifecycle fields while preserving omitted
optional fields. Placed/Settled require value/back odds unless a reasoned override provides value;
positive actual lay requires odds/Exchange, **not a fully matched position**. Unlaid/partial workflows
remain possible. Date syntax is checked before saving. Profile/Account/source identity checks are
Profile-scoped; missing404, archived/ineligible controlled4xx, foreign Account cannot be substituted.

Shared native/create/update/placement and conversion/opportunity/award child writes now validate
before Free Bet mutation. Existing engine + response-model validation + JSON preparation run **inside
the same row/business-audit transaction**, returning the prepared native response after commit.
Conversion checks destination calculation readiness inside that callback rather than recalculating
after commit. Foreseeable input/domain errors are controlled4xx; injected unexpected internal faults
remain honest500 and roll back. No save-then-delete workaround or new financial equations.
Profile calculation settings/cache are prepared before opening the Free Bet transaction, avoiding
lazy default-setting writes inside a second SQLite connection.

New staged Free Bet import validates selected fields and prepares each response inside its existing
batch transaction. Two-row probes show second-row failure rolls back the earlier row, audit/source
records, staged changes and batch completion. It does not retrofit modern lifecycle/source policies
onto historical import or rewrite raw snapshots. Full importer/browser confirmation remains NOT TESTED.
Award UI still submits child Free Bets through the protected native endpoint, then updates its
Sportsbook source. **This is per-child save atomicity, not a claim of atomic multi-request award groups.**
Group splitting/retry and the separately recorded dangling-source deletion policy remain open.

Lost network delivery after a successful commit is a distinct ambiguous-delivery case. Existing
conversion intent/target identity is unchanged: retry retains one successful destination. No promise
that a lost response means nothing was saved; no new native/award idempotency architecture introduced.

### Independent numerical expectations and observable results

Expected values below are user/audit fixtures and desk equations, not production functions as oracle.
Approved penny placement/engine equations are unchanged.

| Case | Independent equation / expected | Actual | Result / evidence |
|---|---|---|---|
| Native SNR £10, back5, lay5.2, c.02 |40/5.18 →7.72 reference; actual7 liability7×4.2=29.40; Back Won40−29.40=10.60 |7.72 /10.60 after save/reopen/place/settle | PASS / PROVEN API + SQLite |
| Native SR same inputs |50/5.18 →9.65 reference; actual7 Back Won50−29.40=20.60 |9.65 /20.60 | PASS / PROVEN API + SQLite |
| Combined native settled report |10.60+20.60=31.20 |31.20 formal monthly fee-base result;31.20 formatted client aggregate | PASS / PROVEN focused API/unit |
| Converted SNR £10, back3, lay3.1, c.02, actual6 |20−6×2.1=7.40 |7.40; retry same ID/one row | PASS / PROVEN conversion API |
| Additional converted SR same inputs |30−6×2.1=17.40 |17.40; retry same ID/one row | PASS / PROVEN conversion API |
| Invalid create/update fields | Supplied invalid value →4xx, no new row or changed record/timestamp/audit/report | All supplied money/odds/commission malformed/non-finite tests422; previous report unchanged | PASS / PROVEN API + independent SQL |
| Unexpected calculation / response-JSON fault |500 with transaction rollback, not disguised422 | Create/update row+audit unchanged; failed conversion no destination or success notification fields | PASS / PROVEN injected boundary |
| Foreign actual Profile/Accounts | Existing money-b row inaccessible via money-a; foreign Account denied for money-a | GET/PATCH404; create422, zero own rows; foreign row unchanged | PASS / PROVEN API |
| Existing malformed financial row | Preserve raw identity/input; derived value unavailable; complete total cannot omit it | RawNaN unchanged; reads200/review_required; source values null, client P&L/liability unavailable; formal fee base blocked; export409 | PASS / PROVEN SQL/API/unit/browser |
| Explicit correction | Human correction10.00 restores governed total |31.20 again | PASS / PROVEN API |
| Historical finite precision | New writes10.000 reject; existing10.000 retains old governed engine/read behaviour without migration | Raw10.000 unchanged, final10.60 readable | PASS / PROVEN API |

### Actual native editor / shared UI gate

Nearest equivalents: existing Free Bet/Sportsbook guided ledger fields, associated errors, native
Save flow, shared FinancialValue/Outcomes; inherited Account incomplete-status pattern for diagnostics.
No new input styling, generic component system, button/copy semantics or global CSS.

| Rendered probe | Result / evidence |
|---|---|
|1440/light +1440/dark, populated native editor | PASS / PROVEN: normal pointer Matching; invalid NaN/Infinity/-Infinity/not-money/1.234 stays editable, field name stable, aria-invalid/associated visible error, Save disabled; correction and actual-lay edit Save200, reopen6.00 |
|760/light +760/dark | Associated validation and viewport containment PASS / PROVEN; **pointer Save BLOCKED under PD-QA-004**: no PUT after corrected200 preview, native form checkValidity true, no page error. No forced click/keyboard substitute used to claim pointer acceptance |
| Modal geometry | Desktop left92.5/right1332.5, half-width left24/right744; top50/bottom950 within1000 height; page widths1425/1440 and745/760. Focus/Tab exercised; shared control dimensions unchanged |
| Legacy-invalid ledger → Dashboard → Reports,760/dark | PASS / PROVEN actual Chromium: financial Unavailable + record-identity correction diagnostic; no page/console errors; rawNaN retained |
| Full keyboard focus trap / Escape / reader / all text scales | NOT TESTED; remain PD-QA-004/remaining audit gates. Tab was exercised, not certified keyboard/reader acceptance |
| Copy/apply/mark placed | Existing code semantics preserved / CODE-VERIFIED; no new complete clipboard/placement UI claim in this repair |

The editor's nested error originally altered its implicit accessible label. Explicit visible field
names plus described-by errors fix that without moving controls. The consistency enforcer and
known-pitfalls register retain this invariant. The browser runner deliberately exits nonzero when
half-width Save is blocked; those cases are not silently skipped or counted as PASS.

### Focused commands / evidence limits

```sh
./scripts/run-python.sh -m pytest apps/api/tests/test_free_bet_atomic_safety.py apps/api/tests/test_account_money_safety.py apps/api/tests/test_free_bet_current_value.py apps/api/tests/test_postgres_runtime.py -q
cd apps/web
node node_modules/vitest/vitest.mjs run lib/free-bet-input.test.ts lib/account-money-safety.test.ts lib/tracker-summary.test.ts lib/cross-profile-reporting.test.ts lib/decimal-input.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json
```

135 Python PASS =95 Free Bet +25 inherited Account +13 unchanged engine +2 adapter-only tests.
58 focused web PASS =11 Free Bet +18 Account +29 existing summary/decimal. Focused Ruff, ESLint,
TypeScript and money/Free Bet module mypy PASS. These are bounded regressions, not all numeric inputs,
all strategy configurations, whole-platform readiness or calculator manual sign-off.

SQLite transaction execution PROVEN. Shared PostgreSQL adapter/context path CODE-VERIFIED; two adapter
unit tests PASS, **actual isolated PostgreSQL execution NOT TESTED**. No operational/hosted database used.
Full native/imported award lifecycle, complete XLSX/import/restore confirmation, concurrent native
submissions/network-loss delivery and all other #114 journeys remain NOT TESTED.

Browser: `node scripts/verify_free_bet_atomic_repair.mjs`; `--legacy-only` isolates the legacy/report
probe. Fixture launcher is the existing notification acceptance API script on8030, own runtime above;
same-session restart uses uvicorn with that already-existing database, not reseeding. Diagnostic JSON
stays there, never committed. Web3030 uses existing authenticated environment/internalAPI8030 and
webpack with shared installed dependencies; no normal/manual runtime touched.

Harness issues were recorded separately: initial synthetic Account lacked mandatory lifecycle;
old test used wrong DTO reference key/omitted required PUT fields/persisted-state casing; Turbopack
rejected out-of-root dependency symlinks so existing webpack support was used. An intermediate repair
opened lazy Profile settings inside the SQL write and hit SQLite locking; preload/cache fixed it.
An isolated runtime also logged concurrent default-lookup seeding's UNIQUE failure; no lookup
implementation changed or whole-bootstrap assurance claimed. No numerical expectation was replaced
with production output, no broad harness rewrite, no private inputs copied.

### Integration / rollback / remaining repairs

No automatic merge. Review Account checkpoint first, then this stacked Free Bet delta
`c4b9bb4..b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f`; integrate only with approval. Existing main/normal services remain vulnerable to
the original findings until integration. No schema migration or data cleanup accompanies it.
Rollback is a reviewed revert of the Free Bet fix (then Account only if separately necessary), not
source deletion, recalculation or balance rewriting. Preserve this canonical audit addendum when
later reconciling the separate audit branch; do not replace Batch2 history.

Next bounded implementation: PD-QA-015 completed Blackjack global source uniqueness across
Profiles/Accounts including concurrent attempts. PD-QA-004 remains open for modal/focus/Escape and
half-width Save; #115 exposure/dependencies and #96 owner/provider credential rotation stay separate.
Other populated ledgers, PostgreSQL recovery, large datasets, screen-reader and historical request
clarifications remain outstanding. GitHub evidence synced on 2026-09-12: #91 comment5648522825,
#114 comment5648522892, #36 comment5648522984, #92 comment5648523060. No automatic issue closure.

## PD-QA-015 repair addendum — completed Blackjack source uniqueness / 2026-09-12

### Revision, scope and root cause

Separately reviewable branch `repair/blackjack-source-91`, worktree
`/Users/will_work/Scripts/Homelab/OpenForge/.worktrees/blackjack-source-repair`.
Exact base **c84b9eda268b3cfae7b45d74d583a44ce46f11df**, verified descendant of Account fix
102848a1214730e5065e9db04a66047dce6cd82b and Free Bet fix
b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f. Added fix
**c03470a338eeebf9ef89e2e3fcf0ed6d189ef5c6**. The Account and Free Bet branch tips remain
c4b9bb4412cb0e29c78df4919624c58db57633d6 and c84b9eda268b3cfae7b45d74d583a44ce46f11df.
Main/manual stay f7a3b35073ecc87cdf8f8f881129f221ec44d395; development stays
215193b7fcb5b11a28e23a4531d2a45434545dc1; audit branch stays
7d75b5a54db466b1a47c6d7786ddc633f3dc7122. No protected runtime/DB/input/observation was changed.
Only pytest-owned disposable SQLite fixtures were used; no new shared persistent runtime or DB.

The prior unique target tuple included Profile and Account, so one completed source reserved multiple
claims. Casino creation and successful claim/notification updates also committed independently.
Pre-fix API regressions reproduced a second Account save200 and simultaneous cross-Profile200/200;
the existing Batch2 independent SQL duplication evidence remains above. The initial test setup
failed404 because an older test helper assumed absent demo Profiles. That was a **harness blocker**,
not a product result; explicit synthetic factories and the inherited isolated Account fixture removed
that dependency before reproducing/fixing the product defect. A missing synthetic Exchange commission
also produced expected failed exploratory targets; the factory now explicitly supplies2%.

### Persistence invariant and evidence

No financial equations, Blackjack session schema/UI, destination model, table/index migration or
historical cleanup. Existing signed SHA-256 snapshot verification and Account/Profile permissions
run before claiming. New completed-source claims use the full checksum as a deterministic existing
table **primary key**, independent of target; actual Profile/Account IDs remain stored. Primary-key
conflict and conditional Failed→Pending retry enforce exclusion across connections/processes, not
just a browser flag or SQLite process lock. Legacy successful/pending claims are checked globally;
legacy orphaned Casino rows are refused read-only. No cross-Profile target details enter the409.
Historical duplicates are not deleted, recalculated or retrospectively corrected.

Casino row, Casino business audit, Succeeded claim, linked notification fields and prepared response
JSON now use the same connection/transaction. Injected internal failures, including ValueError at
response preparation, produce an honest500 and rollback; only the diagnostic Failed claim remains.
Same-target successful retry returns the existing record, other targets409, and a failed no-row
transaction may retry a reviewed target. Exploratory source/intent/per-target identity is unchanged.

| Probe | Independent expected behaviour | Actual | Result / evidence |
|---|---|---|---|
| Live completed source: second Account/other Profile/retry | One15.00 activity (115−100); other targets409; same retry same ID | One Casino row/Succeeded claim, preserved checksum; Profile report source15.00, other Profile empty | PASS / PROVEN API + SQL + report-source transport |
| Free Play equivalent | One4.00 withdrawable-result activity; no cash loss from10 credit | Second targets409; one4.00 row; separate source/monetary provenance retained | PASS / PROVEN finite fixture |
| Concurrent requests, same or different Profile, Live/Free | One activity/event; same-target in-flight409 or existing-ID200; other target409 | Four barrier-driven threaded HTTP cases pass | PASS / PROVEN SQLite/FastAPI |
| Separate process requests | Same exclusion without a shared in-process lock | Two spawn-interpreter HTTP cases, independent DB connections: one activity/Succeeded claim/notification | PASS / PROVEN SQLite, **not PostgreSQL evidence** |
| Failure after success-claim SQL / JSON / internal response ValueError | No row/audit/success/link; retry safely creates one row | Three injected failures500, Casino/audit0, claim Failed/destination NULL/notification empty; retry other Profile200 | PASS / PROVEN transaction rollback |
| Legacy random-ID Succeeded claim / orphaned activity | Reuse legacy success; no cross-target clone or silent orphan recreation | Same ID returned; cross-target409; orphan409; original synthetic legacy ID/row unchanged | PASS / PROVEN isolated fixture |
| Integrity, identities, denial | Tampered checksum/foreign Account/missing identity/auth/archival/Simulation: zero business writes | Signature and six denial cases precede claim; unauthenticated/nonapproved sessions401, archived409, foreign ID/Simulation422 | PASS / PROVEN tested boundaries; future subscriber authority is not certified |
| Retry notification/provenance | One linked event after repeated retry; canonical source retained | Three retries same ID, one source-completion notification/link, exact canonical monetary result/checksum retained | PASS / PROVEN API/SQL; no new rendered receipt evidence |
| Deliberate new exploratory opportunity | Retry one intent reuses row; new intent creates another | Standard results succeeded→already_succeeded→succeeded, two distinct rows | PASS / PROVEN finite API fixture; not a new Blackjack activity intent |

Focused command:

```sh
./scripts/run-python.sh -m pytest apps/api/tests/test_blackjack_source_safety.py apps/api/tests/test_free_bet_atomic_safety.py apps/api/tests/test_account_money_safety.py apps/api/tests/test_free_bet_current_value.py apps/api/tests/test_postgres_runtime.py -q
```

**154 PASS**:19 new completed-source cases +95 Free Bet +25 Account +13 unchanged Free Bet engine
+2 PostgreSQL mapping/placeholder adapter tests. Ruff changed Python paths PASS; mypy changed bridge
module with follow-imports=silent PASS. Counts describe only these fixtures, not all modes/inputs,
whole-platform readiness or calculator acceptance. No new UI code: browser/theme/focus/half-width
acceptance is **NOT TESTED on this repair**, inherited Free Bet half-width Save remains **BLOCKED
PD-QA-004**. Actual PostgreSQL transactions/concurrency are **NOT TESTED**.

### Original audit coverage retained — next tests / exact blockers

The original whole-product matrix and Batch2 failures remain authoritative for their recorded
revision. B3 adds repair-branch evidence, not main PASS. No title-index inventory is promoted to
full historical-requirement reconciliation. The following historical B3 checkpoint retained remaining
coverage at that revision; current stable checklist/status is above/below, including later modal and PostgreSQL evidence:

| Existing gap / issue | Current result | Exact next test or blocker |
|---|---|---|
| PD-QA-004 shared modals | FAIL / PROVEN previous desktop focus/Escape + half-width Save | Repair shared pointer/focus boundary, then populated Free Bet native invalid→correct→Save/reopen at desktop/half-width both themes; no forced clicks |
| Combined repair candidate / integration | NOT TESTED | Independently run Account/Free Bet/Blackjack API→browser→report paths on the stacked candidate after PD-QA-004; propose reviewed Account→Free Bet→Blackjack→modal integration; post-integration smoke before claiming main fixed |
| Other populated ledgers #1–13/#88 | NOT TESTED end-to-end | Native/imported Sportsbook, Casino promotion/manual/free-credit, Extra Place/Each Way, Cash Adjustment: preview/copy/save/reopen/place/settle/void/undo/report with independent values; unavailable special branches retain exact contract blockers |
| Award lineage / dangling source | NOT TESTED full group lifecycle; existing FAIL retained | Explicit SNR/SR award factories: source→split awards→partial failure/retry→placement→settlement→source removal; inspect child/business audit/notification state, preserve existing deletion policy until approved repair |
| Imports / restores #104/#109 | NOT TESTED full browser/import scope | Synthetic staged workbook mapping→confirm→reopen; whole portable restore retry/rollback/browser; missing Account access vocabulary/historical promo fallback is a product-contract blocker, not zero/default permission |
| Actual PostgreSQL / backup recovery — historical B3 | Then NOT TESTED / UNVERIFIED | Superseded for scoped local execution by current A–E PostgreSQL18.6 evidence. Full hosted/import/browser recovery remains separate, never operational substitutes |
| Concurrent/network-loss/recovery | PARTIAL: new SQLite request races PASS; other paths NOT TESTED | Kill disposable worker after Pending reservation; lose response after committed Casino save then retry; disconnect during exploratory partial multi-Profile save; confirm same intent, one destination/event and controlled Pending recovery. Automatic timeout takeover is deliberately not added |
| Combined reports / reconciliation #85/#106/#111 | NOT TESTED complete browser flow | Two Profiles with valid/invalid included balances, Free Bets and unique Casino activity: authorised combined cash/P&L completeness, filters/drilldown/export, refresh/correction, reviewed balance vs hand-result distinction; planned observation/explorer features are not runtime PASS |
| Large data / performance | NOT TESTED | Isolated1000+ native/imported synthetic rows across modules; measure first render, filtering/scroll/pagination/charts/request count, half-width responsiveness; existing30-row fixture is not a scale benchmark |
| Accessibility / themes / responsive / motion | PARTIAL old rendered probes; reader UNVERIFIED | PD-QA-004 first, then keyboard/focus/Escape/tooltips/targets/announcements, both themes, half-width,320px, desktop200% text and combined stress separately; inspect intermediate motion; actual reader required before claiming screen-reader verification |
| Auth / lifecycle / catalogue / search / settings | NOT TESTED complete journeys | Synthetic authorised/denied onboarding, duplicate brands, archive/recover, search stale results/loadouts, settings rollback; real Google callback/provider outage unavailable to synthetic-only execution, explicitly UNVERIFIED |
| Notifications / source-history #90/#99 | PARTIAL new completion idempotency PASS | Clear/remove-source/refresh/retry races, preference persistence and every destination link with viewer isolation; durable source-independent history remains separate requested scope |
| #115 dependency/deployment exposure | UNVERIFIED deployment/input exposure; existing applicability evidence retained | Separate bounded remediation: maintainer-supported patch and reachability/input/deployment evidence with authorisation; unavailable deployment access is not safe/clearance; no exploit or dependency change in this repair |
| #96 credentials | BLOCKED owner/provider operation | Owner/provider must revoke/rotate the separately identified credential and record completion; never read out, request or commit its value. Not bundled or cleared by this repair |
| Historical requests / plans | DOCUMENTED index, remaining bodies/clarifications NOT TESTED | Reconcile next bounded original issue-body/clarification set against canonical register, including18 orphaned-source ideas; retain contradictions/dependencies. Subscriber/billing/AI/Oddsmatcher deferred scope stays NOT APPLICABLE runtime, not delivered |
| Calculator integration / #113 | PARTIAL existing finite evidence; manual DEFERRED | Engineering combined hub/pop-out/embedded/conversion regressions separate from external/manual parity; preserve main-v1 vs unmerged-v2 planning/placement/settlement gaps. Resume manual comparison only on supplied results or explicit request; unchanged launcher/files/parent IDs, no date or assignment |

No automatic merge/deployment. Normal app still lacks all stacked repairs. Review Account first,
Free Bet second, Blackjack source third; modal fix/independent combined-candidate gate precede any
integration proposal. Rollback is a reviewed revert of the applicable source repair(s), not data
deletion, historical recalculation or source cleanup. All normal/protected services are left running.
Next work is PD-QA-004, not another calculator feature or manual-comparison request.

## Measured scorecard v1 — 2026-09-13 / #114 comment5652511529

Historical baseline only; current counts are at the top. This is the **first frozen denominator**, not an invented change from0%. Earlier checkpoints had
no comparable percentage. Methods and stable IDs below now cover the original audit mandate.
These are bounded assessment packages (one domain boundary/invariant family), not tests or route
shells. An evidenced failure completes an assessment; an interrupted fixture or unavailable
required execution does not. Review/plan evidence never means implementation PASS.
Never average these overlapping coverage measures or describe them as product readiness.

| Measure | Evidence-complete / planned | Whole coverage |
|---|---|---|
| Audit assessments |33/87 |38% |
| Complete journeys exercised |5/24 |21% |
| Complete journeys passing required recorded steps |5/24 |21% |
| Competitor capability×provider cells |7/27 |26% |
| Original request + applicable clarification reconciliation |4/133 |3% |

### Assessment area breakdown and required methods

| Area | Assessed/planned | Coverage |
|---|---|---|
| Functional | 12/24 | 50% |
| UX/accessibility | 4/12 | 33% |
| Security | 6/12 | 50% |
| Data/recovery | 5/12 | 42% |
| Sustainability | 5/12 | 42% |
| Requirements | 1/6 | 17% |
| Competitor assessment | 0/9 | 0% |

- F: API+SQL unless explicitly browser/lifecycle; plans use source/contract review.
- U: Actual browser pointer/keyboard/geometry; reader requires actual reader.
- S: Scoped source/config+authorised negative/local probes; hosted needs actual hosted evidence.
- D: Disposable persistence/restore/export/fault probes; PG requires real isolated PG.
- M: Source/contract/config review; cost/performance/flakiness need measured execution.
- R: Original issue+applicable clarifications→retained scope/plans/code/evidence/issues.
- C: All three provider cells for the capability; documented and interaction methods distinct.

Scope changelog: v1 freezes87assessment packages,24journeys and9capabilities×3providers.
Requirements denominator is original issue identities#1–114 +18retained unlocated
PD-FUTURE-001–018 +#115 security follow-up =133. Meta/umbrella issues remain review units, not
claims that every child feature is implemented. No requirement was removed. Future additions need
an explicit denominator/version entry. No N/A exclusions in these coverage denominators; deliberately
deferred subscriber/AI/odds-sourcing runtime is reviewed as a planning boundary, not a runtime PASS.
#113 owner numerical comparison is deferred indefinitely and is a **separate sign-off gate**, never
part of an automated numerator. Tests cover finite fixtures, not every possible numeric input.

### Versioned assessment checklist

Evidence references below resolve to the existing sections/addenda or the local probe artifacts
under /tmp/openforge-modal-114-repair. Original main failures remain recorded above. API/source
evidence is reused only for unchanged inherited code. Required browser checks are not completed
by API tests. Every OPEN entry retains its named next boundary; the exact blocker/next-test table
in the PD-QA-015 addendum still applies (PG, provider access, imported sources, reader, large data).

| ID | Scoped check | Assessment/result | Evidence or exact next check |
|---|---|---|---|
| PQA-F01 | Session/owner API guard | ASSESSED; PASS scoped | B auth/security named probes |
| PQA-F02 | Browser expiry/re-authentication recovery | ASSESSED; PARTIAL / EXTERNAL BOUNDARY | CP-009 expiry/cross-tab/stale recovery and CP-025 live initiation plus deterministic state, callback, denial and session tests pass after repairing normal-owner config; genuine Google-owned completion remains owner/manual |
| PQA-F03 | Onboarding duplicate-name identity | ASSESSED; PASS scoped | B onboarding two distinct IDs |
| PQA-F04 | Account monetary write atomicity | ASSESSED; PASS scoped | Account repair addendum +139-case candidate regression |
| PQA-F05 | Account cash completeness/correction UI | ASSESSED; PASS scoped | money-repair-browser.json;12.34+10=22.34 |
| PQA-F06 | Authorised combined cash browser | ASSESSED; PASS scoped | CP-005 authorised two-Profile combined report £14.60/£10.60 plus CP-016 active/archive selection and report-once evidence |
| PQA-F07 | Native SNR/SR numerical lifecycle | ASSESSED; PASS scoped | PD-QA-014 independent fixture table |
| PQA-F08 | Free Bet pre-commit rollback faults | ASSESSED; PASS scoped | PD-QA-014 injected faults |
| PQA-F09 | Legacy-invalid Free Bet read/report | ASSESSED; PASS scoped | free-bet-browser.json legacy three routes |
| PQA-F10 | Exploratory conversion retry/new intent | ASSESSED; PASS scoped | B2 conversion+PD-QA-015 exploratory intents |
| PQA-F11 | Governed Free Bet conversion API | ASSESSED; PASS scoped | PD-QA-014 converted SNR/SR cases |
| PQA-F12 | Completed Casino source global uniqueness | ASSESSED; PASS scoped | PD-QA-015 thread/process race+actual UI retry |
| PQA-F13 | Other Casino fees/override lifecycle | ASSESSED; PASS scoped | CP-017 £7 gross − £1/£2 costs = £6/£5 retained; correction History and report-once behaviour pass |
| PQA-F14 | Sportsbook actual placement/settlement | ASSESSED; PASS scoped after repair | Native copy9.65/actual9, Win2.20/correction−1.18/report pass; later atomic-write and Profile validation regressions cover the earlier malformed/missing-Profile defects |
| PQA-F15 | Extra Places placement/settlement | ASSESSED; PASS scoped | CP-004 actual browser create, win/place actuals26.00/4.40, four independent outcomes, settle30.40, Void0.00 and report/reload; durable deletion history remains PD-QA-021 |
| PQA-F16 | Cash movements and matching | ASSESSED; PASS scoped | CP-017 +25→+20 correction and −7 withdrawal reconcile as cash movement without silently mutating the linked Account; retry/History/report pass |
| PQA-F17 | Award lineage/removal lifecycle | ASSESSED; PASS scoped | CP-017 fresh split SNR/SR award, lost/concurrent/changed retries, protected removal, settlement, export/restore and remapped editor lineage pass |
| PQA-F18 | Combined report reconciliation | ASSESSED; PASS / PROVEN scoped | CP-005 Profile £41.90/£37.90, Void £11.50/£7.50 and authorised two-Profile £14.60/£10.60; #111 interaction remains planned |
| PQA-F19 | Search/filter/loadout/Quick Actions | ASSESSED; PASS scoped | CP-020 authenticated exact/partial/no-result search, loadout/action save/reopen, Profile context, keyboard/narrow and delayed-response evidence |
| PQA-F20 | Settings persistence/error recovery | ASSESSED; PARTIAL / PROVEN boundary | CP-009 inventory and 12/12 isolated browser checks; ownership/defaults, mutation rollback and focus revalidation evidenced, while full new-session/browser restart remains partial |
| PQA-F21 | Notification clear/history lifecycle | ASSESSED; PASS scoped after repair | CP-018 source→dismiss/reload→resolve retains the immutable readable event; current state, dismissal and history are separate, retry-safe and Profile-isolated |
| PQA-F22 | Synthetic portable restore validation | ASSESSED; PASS scoped | B portable-restore/security named fixtures |
| PQA-F23 | Actual SQLite backup recovery | ASSESSED; PASS / PROVEN scoped | Verified backup→separate copy restore, repeated additive migration, unchanged six-ledger row hashes and representative reopen; current backup checksum/integrity reverified at CP-003 |
| PQA-F24 | Subscriber/billing/advisory-AI plan boundary | ASSESSED; PASS scoped | C future-scope contracts; plan only |
| PQA-U01 | Free Bet modal keyboard/dirty recovery | ASSESSED; PASS scoped | free-bet-browser.json six width/theme cases |
| PQA-U02 | Sportsbook/conversion modal focus/close | ASSESSED; PASS scoped | modal-conversion-browser.json six cases |
| PQA-U03 | Account financial field error/prefix geometry | ASSESSED; PASS scoped | money-repair-browser.json prefix delta0.0078125px |
| PQA-U04 | Half-width/narrow pointer containment | ASSESSED; PASS scoped | Free Bet+conversion geometry1440/760/390 |
| PQA-U05 | Desktop text enlargement and320px separately | ASSESSED; PASS / PROVEN scoped | Current addendum: separate root-text200%,320 and combined stress artifacts; PD-QA-005 |
| PQA-U06 | Nested confirmation/pending/error recovery | ASSESSED; PASS / PROVEN scoped | Current addendum: dirty nested Keep Editing, Tab, conversion pending/503 retry and focus return |
| PQA-U07 | Interrupted/intermediate modal motion | ASSESSED; PASS / PROVEN scoped | Current addendum: RAF frames, controlled60ms close/reopen and static reduced-motion assertion |
| PQA-U08 | Screen-reader announcements/navigation | ASSESSED; UNVERIFIED manual boundary | Names, order, headers, errors, financial values, keyboard and dynamic-state semantics are locally evidenced; actual VoiceOver spoken output requires owner/manual observation |
| PQA-U09 | Contrast/targets/charts audit | ASSESSED; PARTIAL / PROVEN local | Light/dark, target geometry, chart values/focus and 200%/narrow evidence pass across selected surfaces; this is not blanket WCAG certification or hosted rendering proof |
| PQA-U10 | Drag alternatives and tooltip association | ASSESSED; PASS scoped | Custom lay slider has editable keyboard/input alternatives and named values; calculator help controls use accessible associations; unchanged specialist drag surfaces are outside this slice |
| PQA-U11 | Chart keyboard/drilldown usability | ASSESSED; PASS approved local slices / PARTIAL roadmap | CP-016 point inspection and CP-019 reconciled-record drilldown, keyboard/pointer parity, retained context and empty state pass; general module/metric/granularity policy remains later #111 scope |
| PQA-U12 | All other ledger modal equivalence | ASSESSED; PARTIAL / PROVEN breadth | Cash, Extra Place, Casino, Sportsbook and Free Bet share focus, containment, Escape/return and History patterns; exhaustive dirty/pending permutations remain regression breadth, not an unreviewed assessment |
| PQA-S01 | Protected API anonymous denials | ASSESSED; PASS scoped | B protected401 probes |
| PQA-S02 | Owner role vs signed authentication | ASSESSED; PASS scoped | B security policy/owner guard |
| PQA-S03 | Cross-Profile/Account mutation denial | ASSESSED; PASS scoped | PD-QA-014/015 denial fixtures |
| PQA-S04 | Locked dependencies/benign image reachability | ASSESSED; PASS local production graph / HOSTED UNVERIFIED | CP-015 supported patches leave zero known production advisories; development-only ESLint transitives are accepted pending upstream and hosted exposure remains untested |
| PQA-S05 | Exposed credential remediation prerequisites | ASSESSED; RISK/BLOCKED | #96 exact owner/provider action, not rotated |
| PQA-S06 | ASVS broader request/session boundaries | ASSESSED; PARTIAL / LOCAL | Owner guards, expiry, state validation, denial, session recovery and protected-route tests pass; a complete ASVS certification and hosted edge configuration remain outside this audit |
| PQA-S07 | Portable import malicious-container validation | ASSESSED; PASS scoped | B restore/security fixtures |
| PQA-S08 | CSRF/cross-site request boundaries | ASSESSED; PARTIAL / LOCAL | OAuth state and configured-origin boundaries are tested; a hosted cookie/origin/edge matrix remains hosted acceptance and no certification is claimed |
| PQA-S09 | Logging/redaction/retention inspection | ASSESSED; PARTIAL / PROVEN local boundary | CP-013 runtime diagnostics exclude secrets/target paths and reviewed error logs use bounded IDs/types; central retention/redaction and hosted log evidence remain absent |
| PQA-S10 | Actual hosted OS/input/exposure | ASSESSED; UNVERIFIED HOSTED | No hosted deployment was authorised; Vercel build/runtime, edge exposure and hosted inputs require a protected Preview |
| PQA-S11 | Future subscriber isolation design | ASSESSED; DEFERRED / CONTRACT ONLY | Profile isolation is locally proven; subscriber identity, visibility and billing remain explicitly deferred #14–#18 scope |
| PQA-S12 | AI/billing/data-provider threat/cost boundary | ASSESSED; DEFERRED / NOT APPLICABLE CURRENT RUNTIME | Advisory AI, subscriber billing and live data providers are not current runtime capabilities; contracts and no-bet/no-scraping boundaries are retained |
| PQA-D01 | Synthetic portable restore invariants | ASSESSED; PASS scoped | B portable-restore fixtures |
| PQA-D02 | Actual backup→restore→reopen | ASSESSED; PASS / PROVEN scoped | Local integration backup restored to separate verification copy; schema/row hashes and representative ledger/report reads retained; not hosted recovery proof |
| PQA-D03 | SQLite write/claim fault rollback | ASSESSED; PASS scoped | PD-QA-014/015 fault rollback |
| PQA-D04 | Legacy-invalid source preservation | ASSESSED; PASS scoped | Account/Free Bet legacy fixtures remain raw |
| PQA-D05 | Valid/invalid export diagnostics | ASSESSED; PASS scoped | Account browser export409/200 |
| PQA-D06 | Actual isolated PostgreSQL transactions | ASSESSED; PASS / PROVEN scoped | Real PostgreSQL18.6 Account/Free Bet preflight/rollback, independent persisted values and separate-process Blackjack retry/races; current A–D evidence |
| PQA-D07 | PostgreSQL disaster recovery | ASSESSED; PASS / PROVEN scoped local database recovery | Actual dump/second-database restore, exact counts/financial/source claims, restart, post-restore read/rollback/duplicate protection; cloud/deployment/import recovery separate |
| PQA-D08 | Populated workbook import/award reconciliation | ASSESSED; PASS scoped local | CP-020 authenticated six-sheet #109 import, Profile-scoped award lineage/retry, report, export and portable restore/native-ID remap pass on normal 3010 |
| PQA-D09 | Google/workbook fallback roundtrip | ASSESSED; PARTIAL / EXTERNAL BOUNDARY | CP-020 normal Google initiation/callback/session responsibilities and authenticated workbook portability pass; live Google interaction and hosted acceptance remain external/unverified |
| PQA-D10 | Immutable conversion source checksum | ASSESSED; PASS scoped | PD-QA-015 immutable SHA/source table |
| PQA-D11 | Retention/deletion/privacy recovery | ASSESSED; PASS scoped local | Normal 3010 uses append-only history, governed deletion denial and shared readable History across five ledgers; CP-016 proves Extra Place Void history and active-only archive reporting without reversing retained P&L |
| PQA-D12 | Crash/network-loss/concurrent browser recovery | ASSESSED; PASS scoped local | CP-019 deterministic delayed A/B browser, 503/focus recovery and reload plus CP-020 stale Global Search evidence; hosted network behaviour remains separate |
| PQA-M01 | Calculation/reference/actual single authority | ASSESSED; REVIEWED | C money authority source review |
| PQA-M02 | Schema/version/legacy compatibility boundary | ASSESSED; REVIEWED | C v1/v2 and migration inspection |
| PQA-M03 | SQLite connection/initialisation architecture | ASSESSED; REVIEWED | C RLock/schema-init inspection; measured cost unknown |
| PQA-M04 | PostgreSQL deployment/rollback assumptions | ASSESSED; PASS LOCAL / PARTIAL HOSTED | CP-014 applies the proven SQLite migration to normal local data after a fresh verified backup; actual PostgreSQL 18.6 remains disposable evidence only, while Neon and hosted rollback remain untested and unauthorised |
| PQA-M05 | Backup custody/encryption/retention | ASSESSED; PARTIAL / LOCAL | Verified local backup/checksum/restore and rollback checkpoints exist; off-device encryption, custody and hosted retention remain security/operations work |
| PQA-M06 | Test fixture isolation/readiness | ASSESSED; PASS ordinary regression boundary | CP-019/020 ordinary API regression is hermetic: 1,074 pass, zero fail/error and 12 explicit opt-in private-source acceptance skips; no owner data is required |
| PQA-M07 | Typing/lint/flakiness census | ASSESSED; PASS types/tests / BOUNDED STYLE DEBT | Mypy 0/82, TypeScript and 429/429 web pass; Ruff retains 168 line length, 20 import order and 12 deliberate pytest fixture-shadow findings |
| PQA-M08 | Large-table/chart performance | ASSESSED; PASS scoped local boundary | CP-005 200 records, source API169ms, routes0.93–2.28s, pagination/filter/search; not production CWV/capacity |
| PQA-M09 | Request storms/stale-response census | ASSESSED; PASS scoped local | CP-019 200-record report A/B delay and CP-020 Global Search delayed-old-response browser evidence retain the newest state; hosted capacity remains separate |
| PQA-M10 | Routed docs/instruction contradictions | ASSESSED; REVIEWED | A stale docs/orphan IDs; no bulk cleanup |
| PQA-M11 | Dependency/provider maintenance disposition | ASSESSED; PASS production graph / ACCEPTED DEV RISK | CP-015 Next16.3.3, sharp0.35.4 and Vitest4.1.11 leave zero known production advisories; five ESLint-only transitives await safe upstream resolution |
| PQA-M12 | Subscriber/hosting/AI sustainability decision | ASSESSED; DEFERRED / DECISION REQUIRED | Local owner runtime is the current product; subscriber, hosted operations and advisory AI costs remain later governed milestones, not current defects |
| PQA-R01 | Notification original+clarified scope | ASSESSED; REVIEWED | #90 original;#99 original+5567517442/5567729491 |
| PQA-R02 | Account restriction/balance clarification set | ASSESSED; DOCUMENTED review, not runtime PASS | Current addendum#70/#82/#85/#106 original+all available clarifications, source/contracts/gaps retained |
| PQA-R03 | Dashboard/reports/tasks/AI original scope | ASSESSED; DOCUMENTED planned/partial, not implementation PASS | #111 prior review plus #25–31/#72/#86 originals and #86 clarification5569417310; contracts/source/gaps/dependencies in current checkpoint |
| PQA-R04 | Import/recovery original scope | ASSESSED; DOCUMENTED review, not runtime PASS | Original #12/#94/#95/#104 plus award dependencies #49/#80 fully available issue/clarification sources→contracts/code/plans/current evidence/gaps; #109 not counted twice |
| PQA-R05 | Calculator/bridge coverage scope | ASSESSED; REVIEWED MIXED | Standard/Multi-Lay/conversion contracts and local journeys are evidenced; advanced calculator and Oddsmatcher items remain separately planned/deferred rather than hidden acceptance additions |
| PQA-R06 | Unlocated/future requests and source recovery | ASSESSED; BLOCKED SOURCE / PRESERVED | `PD-FUTURE-001`–`018` lack recoverable original text; #102 retains the gap and no intent was fabricated |
| PQA-C01 | Public calculator configuration comparison | ASSESSED; DOCUMENTED | Outplayed authoritative public guidance confirms Normal/SNR/SR inputs plus Advanced Underlay/Standard/Overlay/Custom; MBB/OddsMonkey public guidance remains separately cited |
| PQA-C02 | Public offer evaluation comparison | ASSESSED; DOCUMENTED | Current addendum: three vendor guidance cells, not member hands-on |
| PQA-C03 | Activity-recording comparison | ASSESSED; DOCUMENTED comparison, not hands-on | Outplayed/OddsMonkey tracker documentation versus MBB limited offer-progress documentation; financial equivalence/member interactions unverified |
| PQA-C04 | Expected vs actual performance comparison | ASSESSED; DOCUMENTED / access boundary | Outplayed and OddsMonkey authoritative public documentation describe performance filtering/drilldown; an equivalent authoritative MBB member workflow was not publicly locatable and remains UNVERIFIED |
| PQA-C05 | Cash/balance workflow comparison | ASSESSED; DOCUMENTED / access boundary | Outplayed documents a separate balance workflow; MBB and OddsMonkey member interaction required for exact correction semantics remains inaccessible and UNVERIFIED |
| PQA-C06 | History/recovery comparison | ASSESSED; DOCUMENTED / BLOCKED limits | CP-011 OddsMonkey destructive reset is documented; Outplayed member recovery is inaccessible and an authoritative MBB equivalent remains unlocated. No restoration interaction inferred |
| PQA-C07 | Hands-on keyboard workflow | ASSESSED; REVIEWED / MEMBER LIMIT | MBB public calculator hands-on evidence is retained; Outplayed/OddsMonkey full member keyboard workflows are inaccessible and capability remains UNVERIFIED |
| PQA-C08 | Hands-on mobile workflow | ASSESSED; REVIEWED MIXED | Outplayed/MBB public calculator hands-on evidence is retained; OddsMonkey authoritative guidance says the service is mobile-friendly, while exact member interaction remains unverified |
| PQA-C09 | Hands-on evaluate→record→performance | ASSESSED; REVIEWED / MEMBER LIMIT | All three end-to-end tracker paths require member access; documentation is retained but no hands-on capability or parity is inferred |

### Complete-journey denominator — v1

A completed journey includes the stated start, mutation/recovery, persistence/reopen and final
display/report steps. It must finish its required steps; incidental access failure is not completion.
Shared width/theme variants are recorded in the modal addendum, not inflated into separate journeys.

| ID | Journey | State | Last executed evidence | Exact missing step | Gap type | Smallest next action |
|---|---|---|---|---|---|---|
|PQA-J01|Account invalid value→correction→save→cash/export/reopen|PASS|CP-003 money repair, £22.34|—|—|Retain regression|
|PQA-J02|Native SNR→copy→actual placement→settlement→report/reload|PASS|CP-003 authenticated Free Bet, £10.60|—|—|Retain regression|
|PQA-J03|Native legacy SR→copy→actual placement→settlement→report/reload|PASS|CP-003 authenticated Free Bet, £20.60|—|—|Retain legacy regression|
|PQA-J04|Standard calculator→target review→save/receipt→destination/reopen|PASS|CP-003 conversion browser, three widths/themes|—|—|Retain regression|
|PQA-J05|Blackjack UI→hand→Casino conversion→retry→history/report/reload|PASS|CP-003 one −£5 activity; duplicate/foreign Account denied|—|—|Retain regression|
|PQA-J06|Converted SNR/legacy SR→actual placement→settlement→lineage/history/report|PASS|CP-016 `free-bet-converted-journey.json`: plans 6.49/9.74, actual 6.00, P&L 7.40/17.40; Created/Placement/Settled|—|—|Retain current SNR plus historical-SR compatibility regression|
|PQA-J07|Sportsbook native→copy→actual placement→settle/correct→report|PASS|CP-003 integrated browser/API/SQLite/PostgreSQL evidence|—|—|Retain regression|
|PQA-J08|Casino activity→fees/override→settle/reopen→report|PASS|CP-017 browser/API: £7 gross, £1 cost→£6 retained, corrected £2 cost→£5; History/report/reload and invalid-before-write pass|—|—|Retain regression|
|PQA-J09|Extra Place native→actual win/place lays→settle→Void→History/report/reload|PASS|CP-016 browser: 26.00/4.40, settled 29.79, Void 0.00, Created/Settled/Voided|—|—|Retain regression|
|PQA-J10|Cash movement→Account reconciliation→fees/matching→report|PASS|CP-017 browser/API: linked Bank A remains £200; +25→+20 correction and −7 withdrawal report net +13 once, with History/retry/invalid-write evidence|—|—|Retain cash-movement versus observed-balance boundary regression|
|PQA-J11|Award group→SNR/SR descendants→settlement→safe removal/history|PASS|CP-017 fresh £6 SNR + £4 SR group; lost/concurrent retry reuse, changed retry rejection, settlement/history, protected removal, export/restore and remapped lineage UI pass|—|—|Retain native/logical identity and no-resurrection regressions|
|PQA-J12|Multi-Profile conversion failure→retry→new intent→notifications|PASS|CP-003 browser/API/persistence counts 2/1|—|—|Retain regression|
|PQA-J13|Onboarding→catalogue Accounts→permissions→first action/reopen|PASS|CP-019 complete browser onboarding, saved landing/reopen and shared drawer discard navigation|—|—|Retain deterministic catalogue, validation, focus, narrow and 200% regressions|
|PQA-J14|Profile archive/recover/delete→denied writes→directory/search isolation|PASS|CP-018 23 API plus 3 authenticated browser lifecycle checks|—|—|Retain active/archive/report/delete-boundary regression|
|PQA-J15|Login→expiry→denial→re-authentication→state recovery|PARTIAL|CP-025 normal 3010 initiation reaches Google's sign-in surface; invalid/expired/replayed state, denial, callback/session persistence and CP-009 expiry/cross-tab recovery pass|One genuine fresh owner Google completion and return|External provider / owner-manual boundary|Click Sign in with Google once and report whether Plum Duff returns|
|PQA-J16|Global search→filter/loadout→Quick Action→correct Profile record|PASS|CP-020 authenticated browser: restricted Profile action save/reopen/prefill/validation/record, Profile isolation, exact/partial/no-result search, keyboard/narrow and delayed-response ordering|—|—|Retain access-precedence, archived-search and stale-response regressions|
|PQA-J17|Notification create→clear/reload→source lifecycle→history|PASS|CP-018 active→dismiss/reload→resolve durable event; retry and viewer isolation|—|—|Retain current/dismissed/history separation regression|
|PQA-J18|Workbook import→review/write→lineage→reopen/report/export|PASS|CP-020 authenticated six-sheet #109 import→award retry/settlement→History/report→export/portable restore with native-ID remap and £7.18 counted once|—|—|Retain report-preset preflight, timezone restore and scoped-lineage regressions|
|PQA-J19|Portable restore→reopen tracker→report/re-export→recovery|PASS|CP-004/014 authenticated portable restore and identity remap|—|—|Retain regression|
|PQA-J20|SQLite backup→restore→read/reconcile→rollback|PASS|CP-014 normal clone/migration/rollback|—|—|Retain recovery drill|
|PQA-J21|PostgreSQL writes/concurrency→backup/restore→read/rollback|PASS|CP-013 PostgreSQL 18.6 second-database restore|—|—|Retain isolated recovery drill|
|PQA-J22|Combined reports→chart point/filter/drilldown→record/source|PASS|CP-019 point selection→reconciled records→Profile ledger search link→back context; keyboard/pointer/no-data covered|—|—|Retain regression; module/metric/granularity controls remain separate #111 roadmap items|
|PQA-J23|Settings→failed mutation recovery→refresh/new session|PARTIAL|CP-009 ownership, rollback, expiry/cross-tab/restart plus current semantic/keyboard evidence|Actual VoiceOver spoken-output pass|Owner/manual assistive-technology boundary|Run one bounded VoiceOver check when a human can verify speech; do not substitute automation|
|PQA-J24|Large dataset→filter/page/chart→responsive/stale recovery|PASS|CP-019 deterministic 200-record browser: delayed A cannot overwrite B; 503, focus recovery and reload retain B|—|—|Retain abort/request-version and recovery regression|

### Competitor workflow slice — public evidence, accessed2026-09-13

Each C capability has one cell per Outplayed/MBB/OddsMonkey (27total).
D = completed documentation-only comparison; H = completed hands-on workflow;
B = required interaction inaccessible/blocked; U = unexamined or unresolved. D is not H.
Historical first baseline counts:7D,0H,3B,17U. CP-021 closes review coverage at 27/27:
14 documentation, 3 hands-on and 10 reviewed-inaccessible cells; no `U` cell remains.
No private login, trial signup, wager or authentication bypass.
A public URL/access failure is evidence of inaccessibility, never proof that the feature is absent.

| Capability / method | Outplayed | MBB | OddsMonkey |
|---|---|---|---|
|C01 public configuration/guidance|D [Normal/SNR/SR plus Advanced Underlay/Standard/Overlay/Custom](https://outplayed.com/alphabet-betting-calculator)|D [public controls/guidance](https://matchedbettingblog.com/matched-betting-calculator/)|D [normal/SNR/SR/commission guidance](https://www.oddsmonkey.com/matched-betting/calculator/)|
|C02 offer-review workflow documentation|D retained2026-09-13 features/calendar/offer guidance|D retained qualifying-bet terms/stake/odds/liability guidance|D retained Racing Matcher offer/terms/review guidance|
|C03 activity recording documentation|D [Store in Profit Tracker / My Bets](https://outplayed.com/blog/matched-betting-spreadsheet)|D limited [offer progress](https://matchedbettingblog.com/); financial tracker equivalent remains unlocated, not declared absent|D [tool/manual/historical entry](https://help.oddsmonkey.com/hc/en-gb/articles/11151091597085-Keep-On-Track-With-Our-Profit-Tracker)|
|C04 expected versus actual documentation|D [Pro Data expected/actual and filters](https://outplayed.com/pro-data-tool)|B member workflow reviewed; no authoritative public equivalent located, capability UNVERIFIED|D [expected/actual +tool/sport drilldown](https://www.oddsmonkey.com/matched-betting/profit-tracker/)|
|C05 cash/balance documentation|D [separate Balance Sheet, cosmetic cash transfers](https://outplayed.com/blog/matched-betting-spreadsheet)|B member workflow reviewed; exact balance/correction behaviour inaccessible and UNVERIFIED|B [Profit Tracker statistics are documented](https://www.oddsmonkey.com/matched-betting/profit-tracker/); exact cash-balance correction semantics remain member-only and UNVERIFIED|
|C06 recovery/history documentation|B member recovery reviewed; public guidance does not expose the member interaction, capability UNVERIFIED|B public forum/spreadsheet material is not an authoritative recovery workflow; member capability UNVERIFIED|D retained public reset guide/Yes Delete confirmation; not an executed reset or restoration test|
|C07 actual keyboard interaction|B public calculator inspection is incomplete and the full member workflow is inaccessible; capability UNVERIFIED|H retained public calculator1440/390 Tab/Space/field bounds plus fresh390 numeric entry|B member workflow inaccessible; capability UNVERIFIED|
|C08 actual mobile interaction|H public linked calculator390: numeric entry, Advanced presets, Custom slider and Copy; current engineering continuation above|H retained public calculator1440/390 plus fresh keyboard390; no member tracking|D [authoritative mobile-friendly guidance](https://help.oddsmonkey.com/hc/en-gb/articles/10385544081309-Can-I-Matched-Bet-From-My-Mobile-Phone); exact member tracker interaction UNVERIFIED|
|C09 actual evaluate→record→performance interaction|B member tracker documented login; attempted public entry unavailable|B recording endpoint/equivalent unlocated; guessed spreadsheet URL failed, forum anecdotes not authority|B [Profit Tracker redirects to login](https://members.oddsmonkey.com/account/login?&returnurl=%2ftools%2fprofittracker)|

Useful pattern: contextual evaluate→record handoff and explicit expected/actual graph/report, with
separate balance accounting. Our source→review→ledger bridge reduces re-entry, but pending
#111 drilldown/analytics and#85/#106 balance observations need their own authority; forecast,
placed cash and settled result must not be collapsed. No competitor superiority/parity or autonomous
wagering recommendation. Next bounded comparison: public offer-review and recovery help, then
authorised member interactions only when legitimately available.

### Historical clarification reconciliation — bounded slice

Historical first baseline: four full review units qualified: #90,#99,#109 and#114 (original audit brief plus current
living scorecard5652511529). All other issue titles/index entries remain **unreconciled**, not completed.
This conservative baseline intentionally does not promote the indexed backlog into scope evidence.

| Original request→outcome | Applicable clarification | Implementation/plans/evidence→remaining issue |
|---|---|---|
|#90 NOTIFICATION-HISTORY-001→history survives source disappearance|Original issue has no comments; current body reviewed2026-09-13|Bounded durable notification events are integrated locally; source resolution no longer erases readable history. Hosted and owner acceptance remain separate |
|#99 NOTIFICATION-FIX-001→clear-one/all stays cleared across refetch/reload/new context|5567517442 and5567729491 supersede login-only blocker with no reachable actionable fixture|Clear/reload remains monotonic and is now explicitly separate from immutable event history; hosted/owner acceptance remains pending |
|#109 ACCOUNTS-IMPORT-ACCESS-001→preserve access/restrictions after September import|5570274337: Stake/Promo Access omitted; LastPromoUsed not recomputed|Decision-ready capability/detail model recorded; enums remain NOT IMPLEMENTED pending owner decision, so combined import journey stays partial |
|#114 PLATFORM-QUALITY-AUDIT-001→whole product evidence/priority handoff|5652511529/current authorised task|Stable scorecard+retained gaps, scoped safety repair; scope beyond current checks remains open |

Next original+clarified source set: #70/#82 restriction intelligence, #85/#106 observation/freshness,
#111 analytics. PD-FUTURE-001–018 source gaps remain visible; nothing is merged/deleted/deprioritised.

### Current online handoff receipt — 2026-09-13

#114 living5652511529 updated; #91 comment5652681682, #36 comment5652681735,
#92 comment5652681789. Published handoff explicitly identifies local-only report745a382 and
candidate46149c3; no fabricated GitHub file link or push/deployment claim.
Protected API8010/8020/8013/8024/8026/8030 and candidate8034 health200; candidate3034 login200.
Latest complete modal probe JSON includes six width/theme conversion records and actual Blackjack
report/retry/refresh; half-dark injected503 preserved form and pending Escape, then retry succeeded.

### PD-QA-004 candidate evidence and review gates — 2026-09-13

Product repair commit a7a4e74fe633c410056889c500912e53dc01ba99 (local only; push withheld).
Repair base f57e71ad1b7d35070154b96d3e4f33b15f780d24; isolated3034/8034,
/tmp/openforge-modal-114-repair/acceptance.sqlite3. Main, frozen candidate and all protected
databases are unchanged. The same report is synchronised to audit/platform-quality-114 by
documentation-only changes; no product integration.

Root cause: ordinary overlay stacking allowed navigation to intercept Save; focus ran before
the active panel mounted. Async Blackjack snapshot preparation also lost the original opener.
Shared native top-layer ModalBoundary, mounted-panel focus lifecycle and explicit async opener
ref preserve existing surfaces and dirty/pending confirmation rules. Header fallback permits
bounded modal scrolling without obscuring actions. No formulas/schema/authentication changed.

| Probe | Result / evidence | Remaining boundary |
|---|---|---|
| Pre-fix760px native Free Bet, both themes | FAIL / PROVEN initial focus outside; real Save produced no PUT | Original baseline JSON retained in isolated runtime |
| Native Free Bet1440/760/390px, both themes | PASS / PROVEN pointer Save, invalid text/error/correction, nested dirty Escape, Tab, reopen | No forced clicks |
|320px reflow, both themes | PASS / PROVEN independent unscaled reflow | Combined320px/200% NOT TESTED |
| Desktop200% text — historical pre-next-checkpoint | FAIL / PROVEN document1497px vs1440px; modal Save hit target unobstructed | Attribution corrected to PD-QA-005 reflow; repaired candidate evidence in current addendum; PD-QA-003 remains missing Profile |
| Account1440light/760dark | PASS / PROVEN real correction/save, legacy invalid preserved until correction,22.34 complete cash total, export rejection/correction | All Account variants not a UI certification |
| Native SNR/SR full financial journey | PASS / PROVEN copied7.72/9.65; actual7; Back Won10.60/20.60; report31.20 after refresh | Award/removal/import lineage remains separate |
| Standard conversion six width/theme variants | PASS / PROVEN canonical Account identity, real Save/receipt/focus/row, state retained | Partial multi-Profile browser journey remains open |
| Actual Blackjack UI760dark | PASS / PROVEN Live20→15, one Casino activity-5, same-target retry same row, another Account409, history refresh/report | Other Profile concurrency has inherited SQLite tests, actual PG open |
| Backend repair regressions | PASS / PROVEN139 focused SQLite tests (Account25, Free Bet95, Blackjack19) | Not all workflows/inputs; no PostgreSQL execution |
| Typecheck and production build | PASS / PROVEN direct local TypeScript and Next build | No deployment |

Artifacts are local synthetic-only JSON and private temporary screenshots/video under the runtime
directory, not committed observations or operational records. Scripts are reproducible isolated
probes. One earlier invalid-input timing assertion failed during parallel build activity; unchanged
sequential six-case assertions pass, but the timing cause is UNVERIFIED, not an erased PASS.
Screen-reader behaviour remains UNVERIFIED; reduced-motion rendered contexts tested, broader
non-reduced-motion/interruption and accessibility checks remain open.

Finding stages (cumulative, not disjoint):15 original findings open;4 fixes on inherited repair
branches; modal004 partially verified fifth repair;0 findings fully combined-candidate verified
against every required gate;0 integrated locally;0 hosted verified;0 owner accepted. Scoped
SQLite/browser successes above do not erase original findings or imply integration.

Local engineering handoff remains BLOCKED by200% page reflow and remaining required UI checks.
Prepared candidate URL http://localhost:3034 uses the existing authenticated synthetic fixture;
no public authentication shortcut or reseeding of protected data. No Will regression assignment.

Preview BLOCKED. GitHub reports Vercel success deployments for previous f57e71a repair and7d75b5a
audit commits; repository has no branch-ignore rule. Pushes are withheld to avoid unapproved Preview.
Current deployment exposure/protection/environment remain UNVERIFIED, not safe by assumption.
Before any release push: confirm safe Git-trigger behaviour; reviewed combined build; isolated Preview
API/database with no production fallback; genuine authentication and deployment protection; actual
isolated PostgreSQL transaction tests;#115 dependency/exposure disposition;#96 owner/provider rotation;
rollback to prior approved revision and synthetic test cleanup plan; authorised targeted hosted smoke.
No secrets inspected, settings changed, merge, deployment or closure.

Next bounded tranches: (1) finish shared reflow/modal acceptance with unchanged financial regressions;
(2) isolated PostgreSQL/award/import/recovery journeys and combined reports, preserving legacy values;
(3) retained requirement clarifications#70/#82,#85/#106,#111 and offer/recovery competitor cells.
Return-to-development prioritisation requires every87 assessment to have evidence or explicit blocker,
visible journey/competitor limits, retained issue mapping and concrete security/financial dispositions.
The current first measured baseline has no comparable preceding percentage; it adds a denominator,
five fully exercised journeys, seven documented competitor cells and four fully reconciled requests.
#113 manual sign-off stays deferred by Will without a date.

GitHub evidence synced on2026-09-12: #91 comment5648926365, #114 comment5648926454,
#36 comment5648926501, #40 comment5648926573. Issues remain open. Read-only final health checks:
8010/8020/8013/8024/8026/8030 healthz200;3010/3020/3013/3024/3026/3030 login200.
