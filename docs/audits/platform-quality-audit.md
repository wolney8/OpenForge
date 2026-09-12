# Platform quality audit — PLATFORM-QUALITY-AUDIT-001 / #114

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
No application implementation, financial revision, migration, real-record write, credential rotation,
hosted scan or issue closure is authorised by this report.

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
| D Priorities / next tranches | PD-QA-001–013 and three bounded proposed tranches, evidence/result kept distinct | DOCUMENTED recommendations, not implementation | Reprioritise if remaining journey probes find higher integrity risks |

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
| Free Bets / lineage / SNR/SR / settlement | Empty Profile ledger rendered; existing contracts/workflow inventoried | NOT TESTED populated native/imported/converted settlement and lineage removal this pass |
| Casino / activity / fees / manual override | Empty Profile ledger rendered; session bridge source/provenance inspected | NOT TESTED populated settlement/cash reconciliation and converted Blackjack activity this pass |
| Extra Places / Each Way | Dedicated empty ledger rendered; `NotChecked` capability source inspected | NOT TESTED placement/void/dead-heat/manual override journey; unavailable branches stay tracked |
| Cash Adjustments / fees / cash movements | Ledger shell rendered; fixture-backed cash/Casino/eligibility suite 7 PASS | PASS, PROVEN selected pure fixtures only; complete fee crystallisation/withdrawal/reports workflow NOT TESTED |
| Current Account balances / pending withdrawals / snapshots | Account malformed POST 201 and update 200 observed; separate snapshot API inspected | FAIL validation; #85/#106 freshness/atomic observation remains planned, NOT TESTED |
| Standalone calculator hub | Standard rendered at 1440/760/390; four widths × two themes measured; one literal independent stake fixture | PASS bounded integration; FAIL 320px/200% reflow; other families integration NOT TESTED; no #113 rerun |
| Embedded calculators / matching/copy | Native editor rendered, shared engines/primitives inventoried | NOT TESTED complete input→preview→copy→save→reopen for every ledger/family |
| Authenticated lean `/calculator` | Authenticated Standard shell rendered; anonymous client revalidation redirects to login | PASS, PROVEN sampled guard; server matcher omits `/calculator` but client auth guard denies it—no API bypass observed |
| Calculator conversion / #77 | Source envelopes, account IDs, operation idempotency and source-mode checks inventoried | CODE-VERIFIED; current-revision multi-Profile retry/partial failure and receipt end-to-end NOT TESTED here |
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

## D. Prioritised findings and bounded next tranches

Every row applies to main f7 unless explicitly development/planned. Severity is impact potential;
exposure and evidence prevent assuming a critical advisory means current exploitation.

| ID / area | Expected versus actual / reproducible evidence | Result / evidence | Severity; likelihood/exposure; impact | Effort/dependencies / recommendation / acceptance test | Issue |
|---|---|---|---|---|---|
| PD-QA-001 Dependencies | `pnpm audit --json`: affected Next/sharp and dev packages, 3 critical/13 high/4 moderate entries | FAIL / PROVEN lockfile; DOCUMENTED advisory, UNVERIFIED exploitability | Critical potential; conditional exposure; security/data integrity | Small–medium: authorised patched upgrade + exposure review; scoped auth/finance/restore regressions and fresh audit | #115, parent #114 |
| PD-QA-002 Account money | POST current_balance=`not-money` →201; PUT=`NaN` →200, string retained; should reject before write | FAIL / PROVEN isolated API | High; authorised malformed/import input plausible; misleading bankroll | Small per-surface contract; reject complete malformed/non-finite inputs, atomic no-write, current/summary explicitly incomplete rather than zero | #91/#85 |
| PD-QA-003 Missing Profile write | Valid-shaped Sportsbook POST to AUDIT-MISSING-PROFILE →500/FK failure rather than 404/422 | FAIL / PROVEN API | Medium; stale URL/direct request plausible; reliability, no successful phantom write observed | Small: canonical parent existence validation/error boundary; verify all ledgers with missing/stale Profile zero-write fixture | #114 |
| PD-QA-004 Modal focus/Escape | Native Add sportsbook row; at 760px after700ms actual focus remains toolbar button, Escape after1000ms leaves visible Create dialog | FAIL / PROVEN DOM + private render | High accessibility; every native add; keyboard task obstruction | Medium shared shell; focus containment/Escape/focus return and no competing invisible dialogs, both themes/widths | #57/#61/#92 |
| PD-QA-005 Text reflow | Standard at320px with root32px (200%) →document width399px in light/dark; 16px at390/760/1440 contained | FAIL / PROVEN geometry; exact offending track not yet isolated | Medium; narrow/enlarged use; unreadable/offscreen controls | Small–medium shared fields/rail; separate320px normal,200% desktop,combined stress, no page overflow/label clipping | #35/#92 |
| PD-QA-006 Synthetic test independence | Fresh audit worktree 74 selected tests →31pass/43fail; missing private seed makes demo Profile writes FK-fail. Independent auth/security/restore21pass; backups/PG9pass/5setupfail | FAIL harness / PROVEN | High assurance debt; new checkout/CI likely; hides product failures or sensitive-data dependency | Medium: explicit synthetic factories/catalogue/settings; fresh checkout with no private inputs passes focused suites; do not rewrite expectations | #113/#114/#93 |
| PD-QA-007 Financial aggregation authority | tracker-summary.ts:390 Number parse returns0 for malformed/non-finite; sums money separately from Decimal engines | FAIL invariant / CODE-VERIFIED; numeric divergence NOT TESTED | High potential; malformed value proven storable; misleading total/precision | Medium: independent aggregate/penny/large-value fixtures and explicit incomplete values before consolidation; preserve cash-first distinctions | #91/#11/#114 |
| PD-QA-008 Account access import | ACCOUNT_SOURCE_MAP omits Stake/Promo Access and LastPromoUsed not recomputed | BLOCKED mapping / CODE-VERIFIED + DOCUMENTED | High workflow; imports; lost eligibility evidence | Small–medium contract vocabulary/provenance first; synthetic restricted/unknown labels review + roundtrip isolated | #109/#82 |
| PD-QA-009 Balance intelligence | Mutable latest Account balance plus separate snapshot API do not establish atomic observations/freshness UI | NOT TESTED requested scope / CODE-VERIFIED partial | High operational; all manual balances; stale cash / misleading trends | Medium #85/#106 contract; preserve unexplained changes, same-value confirmation and auditable timestamps; no fake ledger activity | #85/#106 |
| PD-QA-010 Ledger/planner version gap | Rich v2 Multi-Lay standalone not wholly saveable/settleable; dev Normal per-leg planning slice not main | BLOCKED remaining contract / CODE-VERIFIED | High money workflow; new configs; silent flattening risk if guards bypassed | Contract-gated slice/explicit UI eligibility; v1 actual/history untouched, unsupported configurations zero writes, create-preview-copy-save-reopen | #36/#38/#113 |
| PD-QA-011 Durable notifications | Source completion/removal can end source-derived history despite reliable clear tombstones | NOT TESTED full requirement / DOCUMENTED gap | Medium; lifecycle completion; lost task/event context | Approved smallest event boundary; completion/removal keeps viewer-authorised history without source mutation | #90/#99 |
| PD-QA-012 Request truth / stale docs | Overview says capabilities deferred/open contrary to current code/live issue states; 18 unlocated requests remain | FAIL docs / CODE-VERIFIED; BLOCKED missing original text | Medium; every handoff; scope lost/false assurance | Small routed status update proposal, preserve history/IDs; link authority/current evidence; user supplies original text for #102 | #93/#98/#102/#113 |
| PD-QA-013 Credential rotation | #96 still open/current register NOT STARTED; no verification of invalidation | BLOCKED authorised remediation / DOCUMENTED | High potential; previously exposed credential; provider/security | Small separate secret-provider operation; invalidate old credential and verify secure new config without publishing values | #96 |

No product fixes were made. Recurring UI findings reuse existing #92/#57/#61 rather than create a
new style/policy system. New dependency remediation #115 was deduplicated against existing issue titles.

### Three proposed implementation tranches (approval required)

1. **Security/dependency and reproducible safety foundation:** #115 exposure/patched-version review;
   separately authorised #96 rotation; explicit synthetic test factories/settings and safe audit
   harness guards. Gates: protected f7 candidate unchanged, no real DB writes, auth/owner/expiry,
   source hashes, money fixtures, portable rollback and dependency triage. No hosted PASS.
2. **Financial input/API integrity + core ledger recovery:** #91 Account money first, canonical
   missing-Profile rejection, malformed-source summary must not become authoritative zero; shared
   native dialog focus/Escape containment. Gates: independent finite/blank/signed/penny fixtures,
   all touched ledger zero-write validation, both themes/half-width/keyboard/reflow and restore history.
3. **Account observation/access slice, then analytics:** #109 exact access mapping + provenance,
   #85/#106 atomic balance observation/current update and ledger-context confirmation. Gates:
   Profile isolation, same-value confirmation, unexplained balance changes, audit/roundtrip and
   no forced P&L reconciliation. #111 point-aware P&L can follow independently; broader #82/#86
   evidence/tasks depend on explicit sources. Do not substitute animation work for these outcomes.

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

**Exact next audit area:** B populated native/imported Free Bet SNR/SR → matching → copy → placement
→ settlement → lineage/report/notification, with controlled failures/retry; then Casino/Extra Places/
Cash fee journeys and full #77/#36 retry/partial-save receipts. Extend the same runner/report, using
explicit synthetic factories, not missing private demo seeds. Inspect all route containers both
themes at1440/760/390 and200% text, intermediate motion, stale reads and denied cross-Account IDs.
Then C true synthetic PostgreSQL/export/backup recovery and larger-data production-build performance;
finish remaining issue clarification triage, manual screen-reader checks (currentlyUNVERIFIED).

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

## Original issue scope index — identities preserved, not completion claims

This index retains every inventoried original issue and intended outcome by its original title/link.
Closed GitHub state does not establish a current workflow PASS. This is a coverage checklist, not
permission to implement deferred scope. Refer to A/B for examined requests and observable evidence;
remaining issue-specific clarification triage is explicitly pending. #115 is the new deduplicated
dependency finding, not a replacement for any original idea.

| Issue | Original requested outcome/title | Issue state on 2026-09-12 | Audit scope/evidence boundary |
|---|---|---|---|
+| [#1](https://github.com/wolney8/OpenForge/issues/1) | Audit current OpenForge source pack and freeze authoritative inputs | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
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
