# Feature Status — Plum Duff / OpenForge — Doc ID: FS-CODEX-001

**Last updated:** 2026-09-25 21:38 BST

## Personal daily-use readiness

**Not ready for a full normal-data import yet.** CP-050 accounts for every selected-source row and exclusion.
Full original validation collects20 review rows; no new operational import or accepted mapping exists.
The pre-simulation financial difference is explained as different known-value sets, with a terminal-Void defect repaired.
Private exact row/field/provider decisions and original evidence stay local; the compatible subset is not full-import proof.
Existing activity must not be duplicated; incremental conflict merge is not assumed to be supported.
For personal use explicitly choose management fee 0% and investment fee 0%; retain actual Exchange commission and costs.
Current onboarding defaults 25%/25% are unsuitable for Will's personal arrangement. No existing Profile was reclassified.
Normal-owner browser/VoiceOver, [#96](https://github.com/wolney8/OpenForge/issues/96) rotation and Git-triggered deployment isolation remain separate named gates.

## Feature overview

States describe the listed scope, not whole-issue closure. Local means localhost:3010; Preview is protected and synthetic-only.
Application `7da4d44` serves locally and on protected Preview;175 API tests/types/builds and scoped browser checks pass.
Local confirmation is proven; PostgreSQL per-ledger confirmation needs a local backup and explicitly returns409 without writes.
Full-workbook review/checkpoint capability remains separate. Fresh authenticated normal-owner interaction is unexecuted.

| Feature group | Usable now and where | Missing / decision | Linked issues |
| --- | --- | --- | --- |
| Profile ownership/access | **Partial**: isolated Profiles, Fund Manager links, Active/Archived lifecycle; local/Preview | Personal/Managed subscriber is not stored ownership or an auth role; subscriber grants absent | [#8](https://github.com/wolney8/OpenForge/issues/8) [#13](https://github.com/wolney8/OpenForge/issues/13) [#14–18](https://github.com/wolney8/OpenForge/issues/14) [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Fees | **Ready in listed scope**: preview/crystallise/reopen/correct/withdraw and immutable revisions; local/Preview | Explicit personal 0/0; managed rates need agreement. Fresh whole fee-operation browser acceptance differs from display proof | [#23](https://github.com/wolney8/OpenForge/issues/23) [#24](https://github.com/wolney8/OpenForge/issues/24) |
| Workbook import | **Partial**: mapped review, controlled import/checkpoint/reconciliation and retry; synthetic local/Preview proof | All-source accounting complete;20 review rows and approved mapping application/full rehearsal pending; no normal target/action approved | [#12](https://github.com/wolney8/OpenForge/issues/12) [#104](https://github.com/wolney8/OpenForge/issues/104) [#109](https://github.com/wolney8/OpenForge/issues/109) |
| Export/restore | **Ready in listed scope**: portable Profile XLSX, canonical identity/history, CP-047 additions and terminal Void recovery | Working-workbook/Google-script compatibility and incremental merge remain bounded gaps | [#12](https://github.com/wolney8/OpenForge/issues/12) [#94](https://github.com/wolney8/OpenForge/issues/94) [#95](https://github.com/wolney8/OpenForge/issues/95) |
| Accounts/restrictions | **Ready in listed scope**: Profile Accounts, shared Catalogue, lifecycle/stake/promo access and eligibility | Wider capability intelligence and quick Account actions remain partial | [#70](https://github.com/wolney8/OpenForge/issues/70) [#82](https://github.com/wolney8/OpenForge/issues/82) [#85](https://github.com/wolney8/OpenForge/issues/85) [#109](https://github.com/wolney8/OpenForge/issues/109) |
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
| Profile / combined Reports | **Ready in listed scope**: signed selected-scope totals, weekly-P&L points/records/drilldown/return context; local/Preview | Combined results are not personal owner-income allocation; general explorer remains partial | [#11](https://github.com/wolney8/OpenForge/issues/11) [#22](https://github.com/wolney8/OpenForge/issues/22) [#105](https://github.com/wolney8/OpenForge/issues/105) [#110](https://github.com/wolney8/OpenForge/issues/110) [#111](https://github.com/wolney8/OpenForge/issues/111) |
| Search / Quick Actions | **Ready in listed scope**: authorised scoped search, reusable combos and Account eligibility | CP-048 completes named Catalogue/Combo form checks; unified task deck is separate | [#76](https://github.com/wolney8/OpenForge/issues/76) [#77](https://github.com/wolney8/OpenForge/issues/77) [#92](https://github.com/wolney8/OpenForge/issues/92) [#108](https://github.com/wolney8/OpenForge/issues/108) |
| Notifications | **Ready in listed scope**: scoped current events, read/clear and durable History | Daily tasks reuses these states; current source disappears when resolved, History remains | [#86](https://github.com/wolney8/OpenForge/issues/86) [#90](https://github.com/wolney8/OpenForge/issues/90) [#99](https://github.com/wolney8/OpenForge/issues/99) |
| Decision support | **Ready in listed scope**: `/tasks` unifies recorded expiry, unsettled bets and missing Account evidence, with Profile filters/reasons/source actions | Broader#86 dispositions/routines remain; identical recurring cleared condition stays cleared. Recorded Free Bet window (default 3) differs from Combo opportunity look-ahead 7 | [#25–31](https://github.com/wolney8/OpenForge/issues/25) [#78](https://github.com/wolney8/OpenForge/issues/78) [#81](https://github.com/wolney8/OpenForge/issues/81) [#82](https://github.com/wolney8/OpenForge/issues/82) [#86](https://github.com/wolney8/OpenForge/issues/86) |
| AI assistance | **Planned**: contracts/proposals only; no operational AI adviser | Provider/model, approved data, spending cap and permitted advisory action need approval; no provider calls | [#31](https://github.com/wolney8/OpenForge/issues/31) |
| Subscriber requests | **Needs decision**: contracts and honest placeholder only | Private invitation → own request → review → separate Profile linkage/access; exact schema/role approval needed | [#14–18](https://github.com/wolney8/OpenForge/issues/14) [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Subscriber funding/commercial terms | **Planned**: separate contract concepts | No auto-funding, billing, paid-SaaS assumption, raw identity-document intake or public registration | [#16](https://github.com/wolney8/OpenForge/issues/16) [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Deployment / recovery | **Partial**: protected synthetic Preview, normal local runtime, verified source/evidence/DB backups | No Production release; Git isolation, [#96](https://github.com/wolney8/OpenForge/issues/96) and off-device recovery custody remain separate | [#20](https://github.com/wolney8/OpenForge/issues/20) [#62](https://github.com/wolney8/OpenForge/issues/62) [#75](https://github.com/wolney8/OpenForge/issues/75) [#96](https://github.com/wolney8/OpenForge/issues/96) [#115](https://github.com/wolney8/OpenForge/issues/115) |
| Material audit/UI | **Ready in listed scope**: CP-047 retained; [#105](https://github.com/wolney8/OpenForge/issues/105) named engineering pass complete; [#117](https://github.com/wolney8/OpenForge/issues/117) scoped acceptance retained | VoiceOver unexecuted, broader acceptance separate; 23/24 audit journeys is not product completion | [#92](https://github.com/wolney8/OpenForge/issues/92) [#105](https://github.com/wolney8/OpenForge/issues/105) [#114](https://github.com/wolney8/OpenForge/issues/114) [#116](https://github.com/wolney8/OpenForge/issues/116) [#117](https://github.com/wolney8/OpenForge/issues/117) |

## Personal and managed meaning

Personal / Managed subscriber describes the economic relationship, not lifecycle, login role or subscription tier.
No redundant flag is needed to configure a selected personal Profile financially: 0% management plus 0% investment fee.
A managed Profile needs its own agreed rates; existing test fixture 40%/0% is not a proposed subscriber price.
Personal positive, zero and negative results retain their sign; funding, Account observations and fees stay separate.
Independent API tests prove zero personal fees and immutable fee revisions; Report tests preserve costs/signs and selection.
Do not add managed gross P&L to Will's income or count both fee entitlement and its withdrawal as earnings.
A persisted owner/beneficiary relationship and owner-income aggregate need an explicit contract/schema decision.

## Workbook import readiness

- Exact selected source: `WO_MB_Tracker_3Sept2026_1013AM.xlsx`; SHA-256 `7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a`; original unchanged. May was not parsed/merged; no newer file needed for this rehearsal.
- Supported source areas: Accounts, Dashboard/Settings, Sportsbook Bets, Free Bets, Casino Offers, Cash Adjustments and Reports; Extra Place provenance/terms remain governed separately.
- Full original validation:20 explicit review rows, zero operational imports. Four Account rows contain six literal Unknown access cells; two providers lack evidence-backed Catalogue matches; actual-lay evidence and Casino final-value reasons need explicit source decisions.
- CP-049 omissions are completely accounted for privately: established legacy Account normalisation and cached-result validation drift are repaired; proven non-executed opportunities retain provenance and historical Extra Places use their governed destination. No missing parent, balance, commission or outcome is invented.
- Known-subtotal difference: two missing-commission results remain unavailable; a genuine terminal Void now resolves to zero. Different known-row sets explain the difference; no forced matching or post-simulation comparison.
- New proof: shared mapping/numeric representation/lifecycle fixtures; actual review Save/reopen, local confirmation/persistence, failure protection and compact/enlarged themes/keyboard/reduced motion. CP-049's compatible-subset daily-use/recovery chain is retained evidence, not a new full-workbook PASS.
- Hosted limitation: per-ledger confirmation's required full local SQLite backup is unavailable on PostgreSQL. It now rejects clearly before writes; governed full-workbook import has a separate Profile checkpoint path. This is documented capability scope, not divergent financial rules.
- Normal target/action: **unconfirmed**. Recommend a separately confirmed new personal Profile only if it will not duplicate existing activity; no existing-Profile merge/replace is assumed. Existing full-import review/backup/checkpoint/rollback applies; portable restore itself always creates a new Profile.
- Cutover approval must state: selected source → exact Profile → create/merge/replace → duplicate handling → checksum-verified backup and tested rollback. No normal writes authorised now.

## Next three delivery outcomes

1. **Full personal rehearsal:** resolve the named source review decisions and reconcile the full selected workbook without guessed inputs.
2. **Controlled personal cutover:** confirm the exact target/action, explicit 0%/0% and recovery once full rehearsal passes; use Daily tasks for supported current evidence.
3. **Controlled subscriber request:** approve the existing minimal invite/request and separate linkage/access boundary, then prove denied/unlinked/cross-Profile access before rollout.

## Separate approval boundaries

**Existing invited-request proposal:** only invited, identified applicants submit minimal request/contact notes; the assigned Fund Manager reviews. Submission → pending review → request information / decline / approve uses the established contract states; choose the first-slice state exposure before implementation.
Required additions remain invitation token hashes/expiry/revocation, request/applicant/reviewer/server timestamps/private-review notes, append-only decisions and explicit granted/revoked identity–Profile links; applicant/read-only subscriber role and visibility approval are needed.
Profile linkage and access become effective only through their explicit approved grant, separate from the request, commercial terms and funding. No public signup, identity documents, bookmaker credentials, billing or automatic funding.
**Existing AI proposal:** explain verified task evidence with source references, uncertainty and deterministic failure fallback. Decide provider/model, approved data fields, spending limit and permitted advisory action; no paid call/private-data transmission authorised. Deterministic Daily tasks is not AI.

## New ideas / decisions — editable by Will

- Idea / outcome wanted:
- Priority and example:
- Decision or constraint:

Ideas here are proposals, not automatic implementation approval.

## Complete detail and evidence

- [Project Status](PROJECT_STATUS.md) · [Roadmap](PROJECT_ROADMAP.md) · [Audit Register](AUDIT_REGISTER.md)
- [All 117 issues and canonical requests](docs/planning/plum-duff-next-issue-tracking-register.md#cp-048-complete-issue-reconciliation)
- [Calculator/bridge matrix](docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md) · [Fee contract](docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md)
- [Detailed evidence](docs/audits/platform-quality-audit.md) · [GitHub](https://github.com/wolney8/OpenForge/issues)

All 117 issues were reconciled (77 open / 40 closed; paginated 100/17/0). Closed planning is not implementation.
PD-FUTURE-001–018 remain source-unresolved under [#102](https://github.com/wolney8/OpenForge/issues/102); their original wording has not been invented.
