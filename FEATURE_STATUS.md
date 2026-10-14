# Feature Status — Plum Duff / OpenForge — Doc ID: FS-CODEX-001

> 2026-10-14 local correction: Selected Range is migrating to the persisted Fund Manager setting
> (`Week (Mon-Sun)` default, nullable Custom bounds). Profile-specific range columns remain only for
> compatibility/history. Common financial readiness, stable chart interaction and self-contained
> working-workbook identity passed bounded automated verification. The additive local migration
> was applied after verified backup `BACKUP-5DE8D6D5`; canonical runtime smoke and owner acceptance
> remain pending.

**Last updated:** 2026-09-26 23:29:27 BST

## Operational summary

| Area | Current state |
| --- | --- |
| LOCAL | **Running**: frontend 3010 / API 8010, frontend `534a5f4` / API `534a5f4+dirty` (generated files only); additive relationship schema, all prior operational data preserved; no September import |
| PROTECTED PREVIEW | **Running**: [existing protected Preview](https://plum-duff-cp028-preview-homelab11.vercel.app), frontend/API `b6437e8`; isolated synthetic-only PostgreSQL; CP-055 promotion held for fresh DB recovery and synthetic session resources; no secret transfer |
| PERSONAL CUTOVER | **Blocked**: Has Will ever used ALPHA-001 for genuine personal betting activity beyond test/import work? Preserve ALPHA; no merge/archive/delete/import until answered and the exact cutover is approved |
| CORE DAILY USE | Accounts, Sportsbook, Free Bets, Casino, Cash, Reports and Daily Tasks: **Ready in scope**. Calculators: **Partial** as detailed below |
| AI / SUBSCRIBERS / PRODUCTION | AI: **Planned, not active**. Subscribers: **Planned/decision-ready, not active**. Production: **Not deployed** |

Accepted CP-052 rehearsal and CP-053 comparison are unchanged. The 39 unresolved records remain unresolved; no genuine ALPHA-only activity is confirmed.
Likely personal target: **Will — Personal / WILL-PERSONAL**, September workbook, explicit 0% management / 0% investment, actual Exchange commission and costs retained. Fees do not determine ownership/access.
Missing historical parents remain explicit and non-blocking. Normal Google/session interaction, VoiceOver, #96 rotation and Git deployment isolation remain separate limitations.

## Feature overview

States describe the listed scope, not whole-issue closure. Local means localhost:3010; Preview is protected and synthetic-only.
CP-055 verifies local migration/data/auth/served-source and isolated workflows. Preview health/protection/login/assets remain verified at `b6437e8`; new screens and Preview hygiene are unverified. CP-052/053 evidence is reused.
Hosted per-ledger confirmation still returns 409 before writes when its required local SQLite backup is unavailable; full-workbook checkpoints are a separate path.

| Feature group | Usable now and where | Missing / decision | Linked issues |
| --- | --- | --- | --- |
| Profile ownership/access | **Ready in listed scope locally**: persisted Personal / Managed subscriber relationship, explicit Add Profile/import setup, isolated data; legacy relationships unclassified | Relationship grants no access; subscriber grants absent; new relationship not yet on Preview | [#8](https://github.com/wolney8/OpenForge/issues/8) [#13](https://github.com/wolney8/OpenForge/issues/13) [#14–18](https://github.com/wolney8/OpenForge/issues/14) [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Fees | **Ready in listed scope**: preview/crystallise/reopen/correct/withdraw and immutable revisions; new local Personal requires 0/0, Managed requires explicit rates | Existing periods unchanged; managed rates need agreement. Fresh whole fee-operation browser acceptance differs from display proof | [#23](https://github.com/wolney8/OpenForge/issues/23) [#24](https://github.com/wolney8/OpenForge/issues/24) |
| Workbook import | **Partial**: mapped review, controlled import/checkpoint/reconciliation and retry; synthetic local/Preview proof | Private rehearsal accepted; complete legacy comparison leaves exact real/test-purpose decision before target/action approval. No merge engine planned | [#12](https://github.com/wolney8/OpenForge/issues/12) [#104](https://github.com/wolney8/OpenForge/issues/104) [#109](https://github.com/wolney8/OpenForge/issues/109) |
| Export/restore | **Ready in listed scope**: portable Profile XLSX, canonical identity/history, CP-047 additions and terminal Void recovery | Working-workbook/Google-script compatibility and incremental merge remain bounded gaps | [#12](https://github.com/wolney8/OpenForge/issues/12) [#94](https://github.com/wolney8/OpenForge/issues/94) [#95](https://github.com/wolney8/OpenForge/issues/95) |
| Accounts/restrictions | **Ready in listed scope**: Profile Accounts, shared Catalogue, lifecycle/stake/promo access and eligibility | Wider capability intelligence and quick Account actions remain partial | [#70](https://github.com/wolney8/OpenForge/issues/70) [#82](https://github.com/wolney8/OpenForge/issues/82) [#85](https://github.com/wolney8/OpenForge/issues/85) [#109](https://github.com/wolney8/OpenForge/issues/109) |
| Accounts-only import/export | **Ready in listed scope locally**: selected Profile XLSX → dry-run → exact/approved-alias provider review → explicit backup/confirm → fresh-Profile/retry; Bookmaker/Exchange/Bank authority reused | Latest balance/evidence only; full history uses Profile backup. Hosted confirm backup limitation persists; no global Catalogue mutation | [#64](https://github.com/wolney8/OpenForge/issues/64) [#104](https://github.com/wolney8/OpenForge/issues/104) [#109](https://github.com/wolney8/OpenForge/issues/109) |
| Balance observations | **Partial**: exact server-timed, atomic/retry-safe confirmations/history from Sportsbook and Accounts; local/Preview | Free Bets/Casino entry points, freshness and trends; balance changes are not P&L | [#85](https://github.com/wolney8/OpenForge/issues/85) [#106](https://github.com/wolney8/OpenForge/issues/106) |
| Sportsbook ledger | **Ready in listed scope**: Prospecting/Placed/Settled, actual values, explicit Save/Discard, corrections/History | Unsupported calculator destinations remain blocked | [#10](https://github.com/wolney8/OpenForge/issues/10) [#21](https://github.com/wolney8/OpenForge/issues/21) [#36](https://github.com/wolney8/OpenForge/issues/36) [#91](https://github.com/wolney8/OpenForge/issues/91) [#117](https://github.com/wolney8/OpenForge/issues/117) |
| Free Bets ledger | **Ready in listed scope**: awards/parent linkage, supported SNR/SR placement/settlement, expiry and correction | Missing/ambiguous imported parents need review, never guessed lineage | [#10](https://github.com/wolney8/OpenForge/issues/10) [#36](https://github.com/wolney8/OpenForge/issues/36) [#49](https://github.com/wolney8/OpenForge/issues/49) [#80](https://github.com/wolney8/OpenForge/issues/80) [#88](https://github.com/wolney8/OpenForge/issues/88) [#91](https://github.com/wolney8/OpenForge/issues/91) |
| Casino ledger | **Ready in listed scope**: offers, actual results/costs, corrections, History and Blackjack conversion | Balance observations are not Casino activity; wider offer intelligence remains future work | [#10](https://github.com/wolney8/OpenForge/issues/10) [#36](https://github.com/wolney8/OpenForge/issues/36) [#40](https://github.com/wolney8/OpenForge/issues/40) [#91](https://github.com/wolney8/OpenForge/issues/91) |
| Cash Adjustments | **Ready in listed scope**: governed funding/withdrawal/cost types, signed values and correction once | Does not automatically change linked observed Account balances | [#10](https://github.com/wolney8/OpenForge/issues/10) [#23](https://github.com/wolney8/OpenForge/issues/23) [#91](https://github.com/wolney8/OpenForge/issues/91) |
| Each Way / Extra Places | **Ready in listed scope**: plan, explicit actual legs/terms/result, settlement/Void/History/Reports | Missing historical terms are unknown; unsupported branches remain explicit | [#36](https://github.com/wolney8/OpenForge/issues/36) [#38](https://github.com/wolney8/OpenForge/issues/38) [#88](https://github.com/wolney8/OpenForge/issues/88) |
| Standard calculator | **Ready in listed scope**: Normal/SNR/SR, Standard/Underlay/Overlay/Custom/Part Lay and supported bridge | Reference/Copy is not placement; configuration matrix remains authoritative | [#35](https://github.com/wolney8/OpenForge/issues/35) [#36](https://github.com/wolney8/OpenForge/issues/36) [#37](https://github.com/wolney8/OpenForge/issues/37) [#113](https://github.com/wolney8/OpenForge/issues/113) |
| Cashback / Bonus Lock-In / Profit Boost | **Partial**: governed Normal rewards and boost derivations, supported conversion | Bonus SNR destination lacks backing basis; ungoverned combinations remain blocked | [#35](https://github.com/wolney8/OpenForge/issues/35) [#36](https://github.com/wolney8/OpenForge/issues/36) [#37](https://github.com/wolney8/OpenForge/issues/37) [#113](https://github.com/wolney8/OpenForge/issues/113) |
| Multi-Lay | **Partial**: Normal Standard/Underlay 2–20 outcomes, one Account/market, changed-odds actuals through settlement/restore | Other backing/reward/Custom/Overlay actuals and multiple Accounts/markets unsupported | [#36](https://github.com/wolney8/OpenForge/issues/36) [#38](https://github.com/wolney8/OpenForge/issues/38) [#113](https://github.com/wolney8/OpenForge/issues/113) |
| Sequential Lay | **Partial**: standalone governed Standard/Lock In planning | No lossless ordered conditional-leg ledger destination | [#35](https://github.com/wolney8/OpenForge/issues/35) [#36](https://github.com/wolney8/OpenForge/issues/36) [#38](https://github.com/wolney8/OpenForge/issues/38) [#39](https://github.com/wolney8/OpenForge/issues/39) |
| Early Payout / 2UP | **Partial**: standalone Exchange Lay/2-Way Dutch model | Full trigger/live-position/slider/part-back conversion incomplete | [#35](https://github.com/wolney8/OpenForge/issues/35) [#36](https://github.com/wolney8/OpenForge/issues/36) [#38](https://github.com/wolney8/OpenForge/issues/38) |
| Multiples / Accumulator | **Partial**: governed standalone selections/calculations | Ledger destination and optional advanced each-way/Rule 4/fold/bonus combinations incomplete | [#35](https://github.com/wolney8/OpenForge/issues/35) [#36](https://github.com/wolney8/OpenForge/issues/36) [#38](https://github.com/wolney8/OpenForge/issues/38) |
| Dutching | **Partial**: standalone Normal/SNR planning | No ledger destination retaining multiple bookmaker back positions | [#35](https://github.com/wolney8/OpenForge/issues/35) [#36](https://github.com/wolney8/OpenForge/issues/36) [#38](https://github.com/wolney8/OpenForge/issues/38) |
| Odds / Probability | **Ready in listed scope**: utility conversion; local/Preview | Intentionally no activity conversion | [#35](https://github.com/wolney8/OpenForge/issues/35) [#37](https://github.com/wolney8/OpenForge/issues/37) |
| Blackjack | **Ready in listed scope**: strategy/session tooling and completed actual session → one Casino activity | Simulation remains a utility; optional modes retain explicit limits | [#36](https://github.com/wolney8/OpenForge/issues/36) [#40](https://github.com/wolney8/OpenForge/issues/40) |
| Conversion / placement / editing / History | **Partial**: supported adapters retain source identity; actual actions explicit; five-ledger Save/Discard/History | Unsupported destinations listed above; history is not a second transaction | [#36](https://github.com/wolney8/OpenForge/issues/36) [#80](https://github.com/wolney8/OpenForge/issues/80) [#90](https://github.com/wolney8/OpenForge/issues/90) [#91](https://github.com/wolney8/OpenForge/issues/91) [#117](https://github.com/wolney8/OpenForge/issues/117) |
| Profile / combined Reports | **Ready in listed scope**: signed selected-scope totals, weekly-P&L points/records/drilldown/return context; local/Preview | Combined results are not personal owner-income allocation; local Explorer V1 now adds London Today/Week/Month/Custom, realised P&L/Activities/costs/withdrawals, canonical filters and provider/module/bet-type groups; reporting-date counts, not historical actual placement; new explorer not yet on Preview | [#11](https://github.com/wolney8/OpenForge/issues/11) [#22](https://github.com/wolney8/OpenForge/issues/22) [#105](https://github.com/wolney8/OpenForge/issues/105) [#110](https://github.com/wolney8/OpenForge/issues/110) [#111](https://github.com/wolney8/OpenForge/issues/111) |
| Search / Quick Actions | **Ready in listed scope**: authorised scoped search, reusable combos and Account eligibility | CP-048 completes named Catalogue/Combo form checks; unified task deck is separate | [#76](https://github.com/wolney8/OpenForge/issues/76) [#77](https://github.com/wolney8/OpenForge/issues/77) [#92](https://github.com/wolney8/OpenForge/issues/92) [#108](https://github.com/wolney8/OpenForge/issues/108) |
| Notifications | **Ready in listed scope**: scoped current events, read/clear and durable History | Daily tasks reuses these states; current source disappears when resolved, History remains | [#86](https://github.com/wolney8/OpenForge/issues/86) [#90](https://github.com/wolney8/OpenForge/issues/90) [#99](https://github.com/wolney8/OpenForge/issues/99) |
| Decision support | **Ready in listed scope**: `/tasks` unifies recorded expiry, unsettled bets and missing Account evidence, with Profile filters/reasons/source actions | Broader#86 dispositions/routines remain; identical recurring cleared condition stays cleared. Recorded Free Bet window (default 3) differs from Combo opportunity look-ahead 7 | [#25–31](https://github.com/wolney8/OpenForge/issues/25) [#78](https://github.com/wolney8/OpenForge/issues/78) [#81](https://github.com/wolney8/OpenForge/issues/81) [#82](https://github.com/wolney8/OpenForge/issues/82) [#86](https://github.com/wolney8/OpenForge/issues/86) |
| AI assistance | **Planned**: contracts/proposals only; no operational AI adviser | Provider/model, approved data, spending cap and permitted advisory action need approval; no provider calls | [#31](https://github.com/wolney8/OpenForge/issues/31) |
| Subscriber requests | **Needs decision**: contracts and honest placeholder only | Private invitation → own request → review → separate Profile linkage/access; exact schema/role approval needed | [#14–18](https://github.com/wolney8/OpenForge/issues/14) [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Subscriber funding/commercial terms | **Planned**: separate contract concepts | No auto-funding, billing, paid-SaaS assumption, raw identity-document intake or public registration | [#16](https://github.com/wolney8/OpenForge/issues/16) [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Deployment / recovery | **Partial**: protected synthetic Preview, normal local runtime, verified source/evidence/DB backups | No Production release; Git isolation, [#96](https://github.com/wolney8/OpenForge/issues/96) and off-device recovery custody remain separate | [#20](https://github.com/wolney8/OpenForge/issues/20) [#62](https://github.com/wolney8/OpenForge/issues/62) [#75](https://github.com/wolney8/OpenForge/issues/75) [#96](https://github.com/wolney8/OpenForge/issues/96) [#115](https://github.com/wolney8/OpenForge/issues/115) |
| Material audit/UI | **Ready in listed scope**: CP-047 retained; [#105](https://github.com/wolney8/OpenForge/issues/105) named engineering pass complete; [#117](https://github.com/wolney8/OpenForge/issues/117) scoped acceptance retained | VoiceOver unexecuted, broader acceptance separate; recorded discovery/reconciliation complete; maintenance/external gates retained, no demonstrated executable Critical/High product defect | [#92](https://github.com/wolney8/OpenForge/issues/92) [#105](https://github.com/wolney8/OpenForge/issues/105) [#114](https://github.com/wolney8/OpenForge/issues/114) [#116](https://github.com/wolney8/OpenForge/issues/116) [#117](https://github.com/wolney8/OpenForge/issues/117) |

Local hygiene:42 Profiles /175 Profile Accounts /139 canonical providers /266 retained synthetic operational rows, unchanged. Zero timestamped test Account labels; 39 archived fixture Profiles retain evidence. ALPHA preserved. Preview counts not inspected.

## Personal and managed meaning

Personal / Managed subscriber is an economic relationship, not lifecycle, login role or subscription tier. New Personal creation requires 0%/0%; Managed requires explicit agreed rates. Add Profile and new-workbook Profile Setup use one persisted field, preserved by portable restore.
Retain profit/loss signs, costs and Exchange commission; funding and observed balances are separate. Do not count personal profit again as Fund Manager fee income.
Managed rates require agreement. The economic relationship is now persisted locally; beneficiary identities, subscriber access and owner-income aggregation are separate. Existing Profiles remain unclassified and previous fee periods unchanged.

## Workbook import readiness

- Approved source: `WO_MB_Tracker_3Sept2026_1013AM.xlsx`, SHA-256 `7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a`; original/local-only. All source decisions remain approved and checksum/fingerprint-bound.
- CP-052 full source/financial reconciliation, historical treatment, Notes/reopen, settlement/correction, Reports and fresh restore/retry PASS. Source identity/native remapping and missing-parent provenance retained; compatible shared Catalogue required for recovery.
- CP-053 legacy comparison COMPLETE; exact unresolved purpose set retained privately. No repeated comparison is needed. Ask only the ALPHA-use question above; preserve all records/history meanwhile.
- Normal cutover remains unapproved. Any later approval must specify source→exact target/create action→duplicate/legacy reporting treatment→fresh verified backup and recovery. No assumed merge/replace, fee rewrite or hosted private-workbook upload.

## Next delivery outcomes

1. Restore dedicated Preview backup/session capability, promote tested CP-055 and finish only changed-workflow/hygiene verification.
2. Resolve ALPHA purpose and obtain the exact personal cutover approval; preserve every existing activity meanwhile.
3. Review the existing invited-request state/visibility/role/storage proposal before its separate implementation; AI remains inactive.

## Separate approval boundaries

**Existing invited-request proposal:** only invited, identified applicants submit minimal request/contact notes; the assigned Fund Manager reviews. Submission → pending review → request information / decline / approve uses the established contract states; choose the first-slice state exposure before implementation.
Required additions remain invitation token hashes/expiry/revocation, request/applicant/reviewer/server timestamps/private-review notes, append-only decisions and explicit granted/revoked identity–Profile links; applicant/read-only subscriber role and visibility approval are needed.
Profile linkage and access become effective only through their explicit approved grant, separate from the request, commercial terms and funding. No public signup, identity documents, bookmaker credentials, billing or automatic funding.
**Existing AI proposal:** explain verified task evidence with source references, uncertainty and deterministic failure fallback. Decide provider/model, approved data fields, spending limit and permitted advisory action; no paid call/private-data transmission authorised. Deterministic Daily tasks is not AI.

## Will handover notes — owner editable

This section is Will's scratchpad for observations and requests. Entries are not approved implementation scope until reviewed.
Use: `- [ ] YYYY-MM-DD | PRIORITY | Screen/feature — note`. Priority can be High, Medium or Low; no issue number or technical analysis is needed.
Example only: `- [ ] 2026-09-26 | High | Sportsbook editor — Account selector feels too slow when entering a new bet.`
The next AI owns classification (BUG / UX CHANGE / NEW FEATURE / QUESTION), existing issue links, deduplication, plans and tests. Never delete an original note or silently change its meaning. When implemented, tick it and link the issue/checkpoint; if rejected/superseded, retain it and explain why.

### Bugs / fixes

### Changes / refinements

### New features / additions

### Questions / decisions

## Complete detail and evidence

- [Project Status](PROJECT_STATUS.md) · [Roadmap](PROJECT_ROADMAP.md) · [Audit Register](AUDIT_REGISTER.md)
- [All 117 issues and canonical requests](docs/planning/plum-duff-next-issue-tracking-register.md#cp-048-complete-issue-reconciliation)
- [Calculator/bridge matrix](docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md) · [Fee contract](docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md)
- [Detailed evidence](docs/audits/platform-quality-audit.md) · [GitHub](https://github.com/wolney8/OpenForge/issues)

All 117 issues were reconciled (77 open / 40 closed; paginated 100/17/0). Closed planning is not implementation.
PD-FUTURE-001–018 remain source-unresolved under [#102](https://github.com/wolney8/OpenForge/issues/102); their original wording has not been invented.
