# Project Status

## Current calculator UI consistency repair — 2026-09-15 / LOCAL ONLY

A separate test branch now gives Standard and Multi-Lay one compact reference-card presentation.
Multi-Lay places Bet Type, Mode and Exchange before its content, with Back Stake/Odds in a clean
stack. Standard's top controls have readable spacing. Standard, Underlay, Overlay and Custom Lay
use short headings, contextual help, shorter fixed chevrons and separate value/copy columns; only
the main Outcomes section retains full tabular headings. Custom includes direct Copy and its slider.

Product **c7d923eb3e381abead2b7482d704c6db47418cd7** passes focused rendering at desktop,
half-width, narrow and enlarged-text sizes, both themes, keyboard and reduced motion. Native
Multi-Lay and real Standard Normal/SNR conversion, reopen, placement and settlement checks pass.
No calculation or historical data changed. This local-only branch is not merged into the normal
3010 application, main or Vercel; the existing normal service remains untouched. Richer Multi-Lay
placement/reward modes and other previously recorded calculator feature gaps remain queued.

## Current normal local Plum Duff — 2026-09-15

`http://localhost:3010` now serves the assembled application from
`integration/local-plum-duff-20260915` with the normal local sign-in and Will's normal local
database. Port 3040 is retired as an owner-review address; its synthetic API could not complete a
normal Google sign-in, which caused the `Unable to continue` response.

Before the switch, the normal database was backed up and restored to a separate verification copy.
The four additive planning columns were applied to a clone twice, with identical repeat-migration
schema and unchanged old-field fingerprints for Profiles, Accounts, Sportsbook, Free Bets, Casino
and Cash Adjustments. The same migration was then applied to the normal database; existing rows
remain unversioned/null and their previous financial fields and identities are unchanged.

The local application includes the accumulated Account, Free Bet, Sportsbook, award, Blackjack,
latest-edit, modal/reflow, calculator, planning, Profit Boost, conditional Cashback, Multi-Lay and
conversion protections through **c73b0943a711e37ec29070c8c421506e892e87fc**. Health, normal login
redirect, production build, clone-data ledger/report reads and the focused financial suite pass.
The mixed legacy API run passed 399 checks but retains 20 obsolete seed/display-name fixture
failures; these are test-maintenance gaps, not promoted to product PASS.

Still unfinished: reward-aware Bonus planning, Multi-Lay actual per-leg placement and richer saved
reward/boost modes, Early Payout full source persistence, split Cashback award-group receipt
linkage, changed-odds/multiple-fill handling, full screen-reader evidence and the remaining #114
import/recovery/security coverage. Main and Vercel are unchanged; this is the normal local runtime,
not a published release.

## Current exact Standard calculator screen — LOCAL ONLY

The separate test version at `http://localhost:3040/fund-manager/calculators` now shows the requested
order: Calculator and Bet Type, Mode, aligned Back/Lay inputs, paired Underlay/Overlay, one full-width
Custom Lay section containing its slider, then full-width Outcomes. The obsolete selected-strategy/
Part Lay control and decimal-rate guidance are absent. Exchange commission is entered as a percentage.

Product **a8d5c72167c454c9937f24cc58f630294c4cd71f** passed the exact-screen check in standalone,
pop-out, native Sportsbook and native/converted Free Bet editors at desktop, half-width and narrow
sizes, both themes and enlarged text. The full synthetic workflow also passed copy, save/reopen,
explicit placement, settlement and report with SNR 6.25/10.20/9.00 references and canonical 2% =
0.02 persistence. The production build succeeds. Main/normal local and Vercel remain unchanged.
Bonus planning, Multi-Lay placement and Early Payout persistence remain queued.

Launcher: `cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`

## Current calculator experience — LOCAL ONLY

The separate test version now serves the assembled calculator work at
`http://localhost:3040/fund-manager/calculators`. Standard Normal/SNR, Profit Boost and conditional
Cashback retain their shared planning, save/reopen and explicit-placement behaviour. Native
Sportsbook Add Row now exposes a real Single lay / Multi-Lay choice and the current Multi-Lay v2
planner; named legs and 5%/2%/0% commissions survive save/reopen. Sequential Lay, Multiples,
Dutching and Odds remain utilities because no faithful ledger destination exists.

The result is not whole-suite parity. Bonus Lock-In still lacks a reward-aware editable ledger-plan
contract. Multi-Lay actual per-leg placement/settlement and richer reward/boost plans are blocked by
the destination contract. Early Payout full planner state and a current-build populated Extra Place
rerun remain outstanding. The normal application and Vercel are unchanged. Current application
sources: API `1199af0af7cb51978794ac576755a0fe65460468`, frontend
`bab34939d0542a7cc320e5ed1da320e38ac5ad8b`.

[Current family matrix](docs/audits/platform-quality-audit.md#current-calculator-experience-reconciliation--2026-09-15--local-only).
Audit coverage remains 46/87 reviewed, 8/24 full tasks exercised/passing, 15/27 competitor cells
and 24/133 requests. These figures describe audit coverage, not the percentage of the application
finished. Next: define the smallest Bonus/Multi-Lay actual-planning contracts, then finish Early
Payout/Extra Place evidence and return to the wider populated-ledger audit.

Launcher: `cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`

## Historical useful Profit Boost / Cashback bundle — LOCAL ONLY

The separate test version now carries four-source Profit Boost and conditional Cashback through
native entry and conversion, saved planning, reopen, explicit placement and settlement/report.
Copying and moving the Custom slider cannot pretend an exchange fill occurred. Original bookmaker
return, conservative hedge odds and accepted odds remain distinct. Eligible Cashback and Free Bet
credit are not treated as received cash; changing receipt kind clears incompatible values.

Tested product **85eb33cf790e54b44414d009bbc9b5a836d6f2df**; browser evidence harness
**be5a013b2d7e6171f69dc412c9733a196cbfa663**; PostgreSQL harness
**4c07d319fb02f0326d2c538df21ddc0b154aa68e**. Browser/API/SQLite checks pass at desktop light,
half-width dark, narrow light and 200% text, including all four sources, converted-row settlement,
£8 confirmed Cashback receipt, the £15.34 settled report total after conversion/reload and genuine
award retry/removal. Seventy focused tests,
TypeScript, production build
and disposable PostgreSQL 18.6 migration/persistence pass. Populated Casino entry-to-report also
passes, but fees/full change history remain untested. Split Cashback award groups still need a
group-capable receipt link. The normal app and Vercel do not contain these changes.
Review-launch identity guard: **e5e75f6552cd53d50817240bce22e5da1490ca08**. Narrow evidence
proves page containment; it is not a full internal-clipping certification. Reduced-motion preference
is present, but a changed transition was not exercised in this bundle.

[Current checklist and evidence](docs/audits/platform-quality-audit.md#current-useful-delivery-bundle--2026-09-15--local-only).
Audit coverage remains 46/87 reviewed (53%), 8/24 full tasks exercised/passing (33%), 15/27
competitor cells (56%) and 24/133 requests (18%). These are coverage figures, not a percentage of
the application finished. Next: changed-odds/multiple-fill partial matching and the next populated
Cash Adjustment/import/accessibility audit package.

Existing current-candidate launcher: `cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`

Everything below is historical unless explicitly revalidated above.

## Historical visible calculator/ledger repair — LOCAL ONLY

The shared planner now appears in native/versioned Normal Sportsbook and SNR Free Bet editors,
as well as the existing standalone/pop-out: Simple/Advanced, simultaneous Underlay/Overlay/Custom,
live slider, Commission (%), clipboard-only Copy and explicit actual placement. Corrected plans
retain strategy and commission after reopening. Producteb86c6045e5b6f4db939c733d20e5e8e67b526d4
inherits UI7f4ff6f and validated planning storage3f2eaca; unplaced plans now correctly show Not Laid.
The fixed-source core browser gate passes:
eight native/conversion journeys, four hub/pop-out variants, six embedded geometry/keyboard cases
and four genuine award journeys. This is scoped engineering evidence, not automatic acceptance.
The [current audit](docs/audits/platform-quality-audit.md#current-visible-core-calculator-checkpoint--2026-09-14--local-only)
records exact evidence and limitations. Owned3040/8039 is current; existing synthetic data retained.

Main/normal, frozen manual and3034 builds remain unchanged/unfixed. No push/merge/deployment.
No action needed from Will; no further bulk comparison required. C08 Cashback and broader C01/C02
network/modal cases remain next, followed by wider audit coverage. Coverage remains46/87 reviewed,
8/24 exercised/passing,14/27 competitors,24/133 requirements; this is not platform sign-off.

Launcher: `cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`

Everything below is historical unless explicitly revalidated above.

## Historical approved planning-storage checkpoint — LOCAL ONLY

We are implementing core calculator/ledger parity. Backend source3f2eaca9fe2b7e00a957202ce84e09246751fbca
adds the two approved nullable planning fields, validated exact-decimal plans, corrected
SNR API conversion, actual-commission preservation and native portable metadata.
Isolated SQLite and PostgreSQL18.6 tests establish the scoped backend results in the
[current audit](docs/audits/platform-quality-audit.md#current-approved-lay-plan-implementation-checkpoint--2026-09-14--local-only).
The embedded controls/native UI and fixed-build browser integration gate are still
unfinished. There is no new tested browser candidate; existing3040/8039 retains its
prior API/data. Main/normal, manual and3034 services remain unchanged/unfixed.

Next: shared versioned embedded planner and explicit actual placement, then complete
browser save/reopen/settlement/report verification on a new isolated runtime. C08 and
broader C01/C02 cases remain queued. Wider audit is on hold during this core gate.
No action needed from Will; no bulk comparison, publication or integration authorised.
Coverage remains46/87 reviewed,8/24 exercised/passing,14/27 competitor,24/133 requests.

Everything below is historical unless explicitly revalidated above.

## Historical calculator-correction engineering checkpoint — 2026-09-14 / LOCAL ONLY

Partial user observations received; no further bulk owner entry required; engineering reference
verification and fixes active; final acceptance pending. Original JSON/workbook remain private
and unchanged. Observed3010 build is UNKNOWN, not assumed to be this candidate.

We are repairing the calculator workflow on `repair/calculator-corrections-113`, stacked on award
candidate3a5fddc. Current tested product24385bf72a5161a6e14e22175f40def2fcb808db, API reference
source72a924e6e2ea8f769136575f8192726a785974c4. SNR preset references corrected6.25/10.20;
conditional Cashback cash/credit separated; standalone everyday/percentage/Advanced controls added.
Casino52a87af now passes all6 Escape variants; shared geometry/focus-entry/Escape18/18 pass.
Current focused22 API cases (19 numerical and3 blocker probes),15 money/percentage unit cases,
4 real hub/pop-out variants, typecheck/targeted lint and production build pass. Prior113-case
family/bridge evidence is historical and unchanged, not universal acceptance.
Frozen66fc5dd genuine award rerun passes4 full variants:5.30/10.30 children plus-1.18 qualifying
result gives14.42 report; rollback/retry/removal remain correct. No source edits during that run.
Shared references now use full-width Outcomes geometry; drafts retain the result shell and stale
copy/apply is disabled. Actual Normal/SNR loss clipboard is−2.64, not the positive lay stake10.20.
Full correction remains blocked at NEW-plan persistence: native Free Bet Underlay/Overlay reopen
as6.66/9.33 and row5% commission is discarded for Profile2%. No separate versioned plan exists.
Operational remaining hedges, broader live-drag/state variants and full embedded parity remain.
Main/normal3010, frozen manual3020 and existing3034 review remain unchanged/unfixed.

Next: approval of the minimal versioned planning-field proposal in the existing Free Bet contract,
then C05/C06 embedded controls/planning and core C09 save/reopen/actual-settlement parity.
C08 Cashback receipts/caps and mode-transition proof remain next; C01/C02 broader cases remain.
C03 workbook SR discrepancy/receipt provenance remains explicit; corrected SNR Underlay/Overlay
conversion fails closed pending a faithful destination planning contract. Wider #114 review is on hold during this
corrective checkpoint, not cancelled. Only the NEW-plan schema/policy approval is needed from Will;
no bulk comparison assignment or engineering regression task.
Coverage remains46/87 reviewed,8/24 exercised/passing,14/27 competitor,24/133 requests.

[Current evidence and remaining IDs](docs/audits/platform-quality-audit.md#current-calculator-correction-checkpoint--2026-09-14--local-only).
Optional existing-data engineering launcher (not an owner acceptance assignment):
`cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/calculator-corrections-113 && node scripts/open_modal_repair_review.mjs --calculator-corrections`
opens an authenticated synthetic browser on3040/8039 without resetting data/services. It prints
the full checkout SHA and last reference-control run source; API reference source72a924e is unchanged.
It fails safely if that owned runtime/session is absent. Corrected SNR Underlay/Overlay conversion
remains blocked, not bypassed. No migration/push/merge/deployment.

Everything below is historical unless revalidated in the current checkpoint.

## Current award-integrity checkpoint — local only

Award server repair **8276e2a1f9a3eb7fe018021c616e4c180d0216c9**, harness/contract
**eca15d6d022d240c5a22676c9a9232656f82a84e**, on `repair/award-integrity-91` stacked on
**1295e2679db1856f67da0cb2cda82e4ad8cabdf9**. Atomic split/retry/concurrency/removal tests pass
on isolated SQLite and actual PostgreSQL18.6;227 focused inherited/award API checks pass.
Genuine award-review controls pass desktop/half-width, both themes, including refresh and lost response.
**Full PQA-J11 stays PARTIAL:** existing PD-QA-019 stale child autosave blocks matching; desktop modal
left clipping also remains visible under PD004/005/#92. No false complete-journey or manual acceptance.
Coverage unchanged:46/87 assessed,8/24 exercised,8/24 passing,14/27 competitors,24/133 requests.
[Current detailed evidence and limits](docs/audits/platform-quality-audit.md#current-award-integrity-repair--2026-09-14--local-only).
Main/normal app remains unfixed pending reviewed integration. Protected manual/review services/data
and _input observations unchanged. Manual comparison deferred by Will, no scheduled date.
Next: return to remaining workbook/populated-ledger audit; PD018/019 and modal clipping are retained
repair gates, security #115/#96 and publication approval separate. No action needed from Will.
No push/merge/deploy. Prior checkpoints below are historical.

## Historical repair checkpoint (local only)

Current local-only repair cb0f29068d5d4a24a61ec3e2a66afa91c3265a71 on repair/sportsbook-safe-91, based on 81af076cf67b5d0951aef9f1a8bca6fdafb841bc. Sportsbook saves validate and prepare before commit; legacy invalid rows remain visible with incomplete totals. Native browser desktop/half-width light/dark, isolated SQLite and actual PostgreSQL evidence are in the existing audit. Main/normal services remain unfixed pending reviewed integration. Coverage46/87 assessed,8/24 exercised,8/24 passing,14/27 competitor,24/133 requests; only J07 passing changes (+1/+4 points). Next PD-QA-017 award integrity; PD018/019 and wider audit/security/publication gates remain open. Manual comparison deferred by Will, no date. No action needed from Will. Older current wording below is historical.

## Historical preceding checkpoints

_Last updated: 2026-09-13_

This is the short entry point for current state and acceptance. Use the
[milestone readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md) for full
sequencing and the [request register](docs/planning/plum-duff-next-issue-tracking-register.md) for
durable requirements.

## Current state

Current audit: assessments46/87 (53%); journeys8/24 exercised (33%),7/24 passing (29%);
competitors14/27 (52%:12 documentation,2 hands-on); requests24/133 (18%).
New populated native Sportsbook controls/financials pass, but malformed creation commits then500;
row/list/export500 and missing-Profile500 remain. Genuine split awards duplicate5 credit on child
failure/retry; API source deletion orphans four children. These are OPEN, not repaired.
Actual native XLSX uploads/review/backup/import/reopen/report/browser export exercised; full Profile
workbook journey stays PARTIAL, imported parent ID unresolved and #109 access mapping gap retained.
Main/normal app remains unfixed; product6d2276e00d0a1a540f48f7ecc253e864ad30d5e3 unchanged.
Incoming combined c460f2a3074ede07bf7db9e30cec8c7e137ed6fa/report b476b18ddb4eccadba0aff24b136bb27eb33effd;
outgoing exact local-only commits in #114 living summary. No push/merge/deployment.
See [current populated audit checkpoint](docs/audits/platform-quality-audit.md#populated-sportsbook-awards-and-native-xlsx-checkpoint--2026-09-13).
Next: scoped Sportsbook atomic validation proposal, then server award integrity; independent full
synthetic Profile workbook/other populated ledgers audit continues. PostgreSQL scoped recovery
already passes; no repeat. Manual comparison deferred by Will, no date; no testing assignment.
Protected3034 review data/services and _input observations unchanged. #115/#96/Vercel publication
prerequisites remain separate. No action needed from Will for further local audit.

### Historical preceding checkpoint (not current totals)


Current reporting: audit/platform-quality-114 (documentation only). Modal candidate:
repair/modal-boundary-114, based on f57e71ad1b7d35070154b96d3e4f33b15f780d24.
Current product revision6d2276e00d0a1a540f48f7ecc253e864ad30d5e3, LOCAL ONLY; exact reporting
commit/link is maintained in #114 living comment5652511529 (unpublished files cannot have a live GitHub blob link).
Normal app remains unfixed. The isolated candidate is at http://localhost:3034 (API8034).
Current local-only measured review: assessments42/87 (48%); complete journeys exercised and passing7/24
(29% each); competitor cells14/27 (52%:12 documentation,2 hands-on); requests18/133 (14%).
This checkpoint adds actual PostgreSQL assessments PQA-D06/D07 and backend recovery journey J21;
no new competitor/request count. Initial baseline33/5/7/4 is historical; change+10/+8/+26/+11 points.
These are coverage measures, not readiness or estimated time remaining. See the
[current detailed audit](docs/audits/platform-quality-audit.md#actual-isolated-postgresql-execution--2026-09-13).
Native pointer Save/focus and populated financial journeys now have candidate evidence;
Shared200% root-text header and combined320px sizing defects are fixed on the candidate, not main.
PQA-J12 partial failure/retry/new-intent browser flow passes; J06 financial flow passes at7.40/17.40
and report24.80. Source Notes are reachable in Settlement → Advanced controls at desktop/half-width
in both themes, with unchanged business/audit rows. J06 remains PARTIAL: full record-change history
has no user-facing consumer (PD-QA-016). Approved local PostgreSQL18.6 installation now enables
actual Account rejection, Free Bet rollback, concurrent Blackjack exclusion and dump/SECOND DB
restore/restart/post-restore rollback checks: A–E PASS on an isolated synthetic port60936 cluster,
now stopped. SNR/SR reopen10.60/20.60;3 distinct Casino sessions create3 rows/notifications, no clones.
No existing dependencies/database upgraded, default cluster or background service enabled.
Broader import/cloud/browser recovery, reader and remaining journeys stay open. No engineering regressions
are assigned to Will; optional3034 review and its records remain unchanged.
Vercel reports previous repair/audit deployments: pushes withheld to avoid unapproved Preview.
Preview BLOCKED: safe Git-trigger configuration and isolated hosted API/PG/auth;
#115 disposition and #96 provider credential rotation remain prerequisites. Owner-only prerequisites:
the existing redacted Vercel deployment metadata request and separate #115/#96 disposition;
local PostgreSQL approval has been supplied and its scoped tests pass. No secret values or calculator comparison.
Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit request.
Historical entries below retain their original revision-specific evidence.

### Historical earlier repair receipts (not current checkpoints)

The Account, Free Bet and completed-Blackjack duplicate repairs are stacked on separate reviewable
branches; the normal app does not contain them yet. Blackjack retry/concurrency/rollback evidence
is recorded in the [existing audit](docs/audits/platform-quality-audit.md). Next: shared modal repair,
independent combined-candidate verification, then an integration proposal and post-integration smoke.
No action needed from Will for this repair. Calculator comparison remains deferred without a date.
Current repair: `repair/blackjack-source-91`, fix `c03470a`;19 focused completed-source cases and135
inherited tests pass. Actual PostgreSQL/new browser acceptance remain untested.

- **#91 / #114 Free Bet repair (stacked, not integrated):** `repair/free-bet-atomic-91`
  starts at Account checkpoint `c4b9bb4412cb0e29c78df4919624c58db57633d6`, containing
  Account fix102848a. Added fix `b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f` validates effective Free Bet inputs and prepares
  calculation/response/JSON before transaction commit; legacy invalid P&L is explicitly unavailable.
  Independent SNR/SR/converted settlement and atomicity regressions pass. Desktop editor correction/
  Save/reopen passes in both themes; half-width pointer Save is **BLOCKED under PD-QA-004** in both
  themes, despite working associated validation. Actual PostgreSQL, full workbook import/award-group
  execution and full keyboard/Escape acceptance remain NOT TESTED. See the
  [same audit / Free Bet addendum](docs/audits/platform-quality-audit.md).
  **Main/normal services remain unfixed pending approved Account-first, Free-Bet-second integration.**
  PD-QA-015 is now stacked above this checkpoint; shared modal repair remains next. GitHub #91/#114/#36/#92 evidence synced on 2026-09-12; issues remain open.

- **#91 Account repair (not integrated):** branch `repair/account-money-91` based on application
  `f7a3b35073ecc87cdf8f8f881129f221ec44d395`; original audit checkpoints c65169f/7d75b5a
  remain evidence. Canonical exact-cent validation and incomplete cash totals have focused API/unit
  and actual Account-editor checks. **Main/normal services remain unfixed until approved integration.**
  [Same audit report / repair addendum](docs/audits/platform-quality-audit.md) records evidence limits.
  Fix `102848a1214730e5065e9db04a66047dce6cd82b` pushed; #91/#114/#92 comments5648267278/5648268451/5648268545 synced.
- Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit
  request. Frozen manual f7/3020/8020, original observations and unmerged Multi-Lay
  `215193b7fcb5b11a28e23a4531d2a45434545dc1` remain protected; no calculator sign-off.
- Next separate repairs: PD-QA-015 completed-source
  uniqueness/concurrency; PD-QA-004 modal focus/Escape/pointer access; #115 dependency exposure;
  #96 owner/provider rotation. #114 remaining audit coverage is not complete.
- Monday comparison checkpoint is verified as full commit
  `f7a3b35073ecc87cdf8f8f881129f221ec44d395`, protected by
  `manual/calculator-candidate-2026-09-12` and a separate pristine worktree. Development is on
  `calculator/multi-lay-normal-parity`; main/daily-use services are not updated in this tranche.
  [Baseline launch and evidence boundary](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md#2026-09-12-manual-checkpoint-and-normal-planning-persistence)
  uses separate ports/database. Will's Monday results remain the acceptance gate.
  The [editable worksheet](docs/audits/calculator-manual-comparison.md) retains parent case IDs;
  HTML/Excel/guide files have not been supplied locally and are pending links, not rebuilt.
  Normal v2 Standard/Underlay new-record planning now retains per-leg commission through the
  existing bridge and shared embedded calculator. Placement/settlement and richer v2 save modes
  remain blocked rather than flattened; unstamped v1 rows retain their prior workflow.

- Multi-Lay reference expansion PD-FIX-101–106 is locally implemented at the 2026-09-11 source
  snapshots. Versioned `multi-lay-v2` supports Normal, Free Bet SNR and Money Back, zero/non-zero
  Profit Boost, two to 20 named legs, per-leg commission and Standard/Underlay/Overlay/Custom
  allocation with editable multiplier bounds. It exposes component Outcomes, source-defined maximum
  exchange exposure, live copy/slider updates, Reset/help and pop-out state. Thirteen bounded v2
  configuration fixtures pass; the live MBB penny-boundary comparison is documented rather than
  called exact parity. Existing persisted Sportsbook rows remain on v1. Embedded/save/conversion is
  limited to Normal Standard/Underlay planning (v2 now retains individual commissions);
  richer v2 configurations fail closed until the destination contract can retain them. The existing
  [#113 audit](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md) and
  [manual worksheet](docs/audits/calculator-manual-comparison.md) carry the evidence and gaps.
- Standard control/parity tranche PD-FIX-093–100 is locally verified pending Will's comparison.
  Standard now separates Normal/Free Bet SNR/Free Bet SR `Bet Type` from Simple/Advanced
  presentation; Simple is explicitly equalised Standard, while Advanced exposes the shared
  Underlay/Overlay references, Custom slider and Part Lay path. Bonus Lock-In exposes Normal/SNR,
  Loses/Wins, 70% retention and canonical Smarkets 0% defaults, with one offer-aware strategy
  engine. The bounded #113 extension now passes 96 supported configuration fixtures and keeps 10 Bonus
  Free Bet SR cells blocked. Will's editable observation worksheet is
  [Calculator manual comparison](docs/audits/calculator-manual-comparison.md). GitHub #35/#37/#113,
  shared-containment evidence for #92, and the unchanged SNR conversion blocker for #36 are pending
  sync because `gh` and an authenticated token are unavailable in this environment; no hosted claim
  is made.
- Current corrective tranche PD-FIX-085–092 repairs the Bonus Lock-In routing defect, exposes the
  governed Profit Boost derivation, and tightens the existing #36 review/completion boundary. Normal
  Bonus Lock-In now uses one offer-aware engine for both triggers and Standard/Underlay/Overlay/
  Custom/Part Lay; the synthetic £5 @ 9.24/10.5, £5 reward, 70%, 0% fixture resolves to £4.07,
  £1.50 and £4.34. Free Bet SNR is calculator-supported across all five strategies but remains
  conversion-blocked because the Sportsbook destination has no backing-basis field; Free Bet SR
  Bonus remains explicitly unsupported. This supersedes earlier broad “29 modes”
  assurance: #113 proves representative fixtures, not every cross-product.
- Current #36 conversion reconciliation records one authoritative family/mode matrix in the
  existing bridge contract. The shared Standard adapter now creates native Free Bets Prospecting
  rows for governed SNR/SR modes; maps Cashback, back-loses Bonus Lock-In/Money Back and every
  Profit Boost derivation into their supported destination fields; preserves explicit Custom/Part
  Lay input; and embeds the audited reference result in the immutable SHA-256 source envelope.
  Source/envelope mode mismatches and unsupported Bonus backing bases fail before any write. Existing
  Multi-Lay, Each Way / Extra Place and completed Blackjack adapters retain their Profile rules,
  source identity, linked Notifications and retry idempotency. Sequential Lay, Early Payout / 2UP,
  Multiples and Dutching remain losslessly blocked; Odds / Probability and Blackjack Simulation
  remain utilities. Will's local/hosted acceptance is pending; #36 stays open.

- Calculator UI follow-up PD-FIX-081–084 is locally verified pending Will's recheck. The shared
  family carousel now contains the complete active/focus halo and selects adjacent calculators from
  fixed non-wrapping arrows; Standard and Early Payout use content-driven subgrid rows without tall
  trailing panel space; and Extra Place / Each Way restores its last presentation scheme through the
  existing ThemeProvider preference path without resetting mode or inputs. Calculations, validation,
  #113 audit results and #36 bridge behaviour remain unchanged.
- Current presentation correction: [#35 Calculator Workspace](https://github.com/wolney8/OpenForge/issues/35)
  and [#92 shared UI consistency](https://github.com/wolney8/OpenForge/issues/92). PD-FIX-076–080
  are locally verified pending Will's recheck: Standard/Early Payout share explicit aligned segment
  rows; Multi-Lay/Sequential Lay reuse the canonical BACK BET eyebrow; Extra Place reuses the
  embedded presentation selector without resetting state; Multiples/Dutching preserve exposed
  outer radii; and calculator families use bounded slide paging, fixed disabled boundary arrows and
  an anchored ellipsis menu. Its earlier back-wins hiding decision is superseded by the current
  Outplayed-backed Normal/SNR trigger contract. Other financial calculations remain unchanged.
  Evidence is synced to #35 and #92; Will's acceptance recheck remains pending.
- Current feature: [#113 independent calculator verification audit](https://github.com/wolney8/OpenForge/issues/113).
  The durable audit now combines 25 existing non-Standard independent cases with a 60-cell
  Standard backing/trigger/source/strategy matrix. The result is 85 supported configuration
  fixtures passing, with 10 required Bonus Free Bet SR configurations blocked rather than omitted.
  Shared money quantization still canonicalises rounded signed zero. Current Outplayed source plus
  independent branch equations now govern Normal and SNR backing for both reward triggers; the
  `money_back` compatibility alias remains governed. Eight external comparisons remain explicit in
  `docs/audits/issue-113-independent-calculator-verification-2026-09-10.md`. No unrelated formula changed.
  #36 manual acceptance remains on hold until this audit and worksheet are reviewed.
- Prior feature: [#40 Blackjack acceptance reconciliation](https://github.com/wolney8/OpenForge/issues/40),
  a bounded correction before returning to [#36](https://github.com/wolney8/OpenForge/issues/36).
  The Fund Manager hub now contains the locally verified core catalogue: Standard, Multi-Lay,
  Extra Place / Each Way, Sequential Lay, Early Payout / 2UP, Multiples / Accumulator, Simple
  Dutching, Odds / Probability and Blackjack Strategy. Blackjack Live/Free Play now reports
  contract-derived or explicitly overridden per-hand returns and running cash/credit totals. Natural
  Blackjack natural payout defaults explicitly to 1:1, with 3:2, 6:5, 2:1 and validated Custom
  presets in Session Setup; ordinary wins remain 1:1. Last Hand is a smoothly animated full-width
  shared disclosure that leaves Dealer/Player geometry unchanged. Session History exposes committed
  STAKED, RETURNED and NET P&L values in money modes, and UP-CARD/CARD N correction uses the existing
  undo path through one shared, label-neutral overlay control. Live/Free outcome settlement now keeps
  the completed cards and outcome visible while updating history and running totals; a new hand starts
  only from Player-header `Rebet & Deal Again` or `Double & Deal Again` (with the standalone Rebet path
  removed). Last Hand appears only after that explicit transition and never reserves a table column.
  Card correction now preserves the mandatory Card 1/Card 2 slot skeleton: clearing Card 1 or using
  banner Undo after the initial three-card entry cannot remove the Card 2 input.
  Current manual-acceptance correction keeps compact card/banner undo targets fixed on hover, groups
  Reset Session beside Reset Hand, and uses one measured persistent 540ms recommendation window so pending and
  current-hand states lift/collapse without replacing the outer panel. Session History now places its
  disclosure chevron inside HAND, gives OUTCOME the flexible desktop width, and expands details across
  the complete table width; constrained rows stack without page overflow. Compact history now reports
  final class/total, the complete chosen action sequence and the outcome independently; terminal Bust
  is no longer appended to recommendations. Money modes retain plain Deal Again when no valid previous
  stake exists, and only expose rebet/double shortcuts for a proven stake. Running summaries fill equal
  4/2/1-column tracks, redundant conversion/history copy is removed, and Odds / Probability defaults
  and resets to Fractional odds while explicit saved/pop-out state remains authoritative.
  React now receives `inert` as a boolean, eliminating the disclosure console warning. Strategy matrices remain unchanged;
  `blackjack-session-v1` is additively extended with payout/return provenance and totals. Copy/check glyphs use one geometrically
  centred 44px shared action. Optional Accumulator Each Way/Rule 4/fold/bonus rules and Advanced
  Dutching weighting remain blocked rather than inferred. User/hosted acceptance is pending.
- #36 manual-acceptance defects are locally corrected: compact Casino VALUE cells no longer let
  generic table typography shrink odometer digits or fixed badge minimums clip accounting-negative
  values; Profile choices deliberately stack name/code; Account choices retain stable `account_id`
  identity even when provider labels repeat. Bridge source snapshots, destination validation and
  idempotency are unchanged. Will's recheck remains required.
- Current implementation base before this tranche: `80816b4` on `main`.
- On hold: calculator redesign and audited financial maths. Notification/session user acceptance
  and captured visual work remain tracked, but are not the active feature.
- Return point: [#36](https://github.com/wolney8/OpenForge/issues/36) remains active for focused
  local acceptance, then targeted hosted acceptance. Unresolved destination capabilities remain
  visible under #36/#38/#39 rather than being flattened into Standard rows.
- Current Blackjack evidence is synced to [#40](https://github.com/wolney8/OpenForge/issues/40#issuecomment-5608374894)
  and [#36](https://github.com/wolney8/OpenForge/issues/36#issuecomment-5608375042). Earlier #77 evidence
  remains separate; neither issue is closed and Will's local acceptance is still required.
- Evidence-comment sync for the current Blackjack correction to #40/#92/#36 is pending: no authenticated GitHub integration
  is available in this session and `gh` is not installed. Local tracking retains the full tranche.
- Notification History alignment [#100](https://github.com/wolney8/OpenForge/issues/100) is corrected
  with focused local automated and rendered synthetic evidence; Will reports it “looks better”,
  while #100 remains open and no session/notification acceptance is inferred.
- Notification clearing acceptance [#99](https://github.com/wolney8/OpenForge/issues/99) is `BLOCKED`:
  no actionable notification exists. The established isolated persistence runner is self-cleaning
  and cannot leave a manual fixture alongside the canonical Next development server without a
  separate runtime/build handoff, which is outside this bounded correction.
- Login initiation is restored: **PROVEN locally**, the real control reaches Google's authorization
  flow. The Google callback/session and Will's renewed acceptance remain **UNVERIFIED**.
- Local runtime: web `http://localhost:3010`; API `http://127.0.0.1:8010`; local SQLite; required
  Google/session configuration present without exposing its values. At handoff both services are
  running in named detached terminal sessions; their prior unexplained stop cause remains unknown.
- Start/recover from the repository in two separate persistent Terminal tabs with `pnpm dev:api`
  and `pnpm dev:web`; stop only the applicable process with `Ctrl-C`. Check with `curl -f
  http://127.0.0.1:8010/healthz` and `curl -f http://localhost:3010/login`. Do not let disposable
  test teardown own or stop these normal sessions. See [#101](https://github.com/wolney8/OpenForge/issues/101).
- Hosted state: not deployed or tested in this batch. User acceptance remains pending below.

## Project plan

- Current: #36 calculator-to-ledger bridge. The same immutable source/review/idempotency path now
  converts Standard Sportsbook modes and Free Bet SNR/SR to their native Prospecting ledgers,
  Multi-Lay to Sportsbook, Extra Place / Each Way to their native Profile ledger, and completed
  Blackjack Free/Live to one Casino activity. Odds /
  Probability is utility-only. Sequential Lay, Early Payout / 2UP, Multiples and Dutching remain
  blocked on faithful destination contracts.
- Next queue: local then hosted #36 acceptance; then #85 + #106 Account
  reconciliation/history/trends, and #86 Fund Manager task deck.
- Reporting roadmap: [#111](https://github.com/wolney8/OpenForge/issues/111) starts with an
  interactive point-aware Profile P&L time series, then one period-P&L Reports preset, followed by
  a reusable metric/granularity/filter model. Account balance charts remain dependent on the
  separate observation source in [#106](https://github.com/wolney8/OpenForge/issues/106).
- Deferred: durable notification history [#90](https://github.com/wolney8/OpenForge/issues/90),
  remaining numerical validation [#91](https://github.com/wolney8/OpenForge/issues/91), Google and
  hosted workbook acceptance [#94](https://github.com/wolney8/OpenForge/issues/94), stale-workbook
  merge design [#95](https://github.com/wolney8/OpenForge/issues/95), and secret rotation
  [#96](https://github.com/wolney8/OpenForge/issues/96).

## Features and issues

- Login/session: [#62](https://github.com/wolney8/OpenForge/issues/62) — implementation evidence is
  separate from the pending manual result.
- Notification clearing: `NOTIFICATION-FIX-001` retains prior local automated evidence, but manual
  acceptance is `BLOCKED` by the missing actionable fixture in [#99](https://github.com/wolney8/OpenForge/issues/99);
  source-independent history remains [#90](https://github.com/wolney8/OpenForge/issues/90).
- Notification filter layout: `NOTIFICATION-LAYOUT-001` is locally corrected at `630bde8`; [#100](https://github.com/wolney8/OpenForge/issues/100)
  stays open pending Will's recheck and remains related, not folded into, [#92](https://github.com/wolney8/OpenForge/issues/92).
- Retrospective composed-layout work remains partial under `UI-CONSISTENCY-001`; the visible
  unchecked surface list is in the [UI audit backlog](docs/agent-contracts/plum-duff-ui-audit-backlog.md).
- `FINANCIAL-MOTION-001` [#105](https://github.com/wolney8/OpenForge/issues/105) retains one shared
  odometer with static-equivalent geometry and canonical clipboard text. It now has persisted
  default-On Fund Manager control, reduced-motion override, neutral-zero replay and coordinated
  card/row replay across targeted active dashboard, ledger, report, Account, drawer and dialog
  paths. The current correction retains sign and width while digits roll from zero, leaves neutral
  `£ -` static, and adds persisted replay-pause, roll-duration and digit-cascade controls with
  1.5-second/520ms/80ms defaults. Future/new-surface adoption and user acceptance remain open.
  Nearest card/row entry replays contained values together, with early re-entry suppressed by the
  configured delay while every appropriate container click remains an immediate replay.
  `FINANCIAL-CHART-MOTION-001` [#110](https://github.com/wolney8/OpenForge/issues/110) now has its
  shared Dashboard slice on Target Progress, Module Mix and peer bars, Operational Focus ring and
  the selected-range line/area graph. Chart travel is slower than digit rolling; broader chart
  rollout and user/hosted acceptance remain open.
  Extra Places rails [#108](https://github.com/wolney8/OpenForge/issues/108) now use persisted activity,
  positive Account balances and deterministic ordering with maximum-three paging. Import access
  semantics [#109](https://github.com/wolney8/OpenForge/issues/109) remains untouched.
- `FINANCIAL-ANALYTICS-EXPLORER-001` [#111](https://github.com/wolney8/OpenForge/issues/111) is
  captured for a point-aware Dashboard time series and reusable Reports explorer. It remains
  planned only; [#106](https://github.com/wolney8/OpenForge/issues/106) separately owns persisted
  Account balance observations and freshness.
- Profit Boost and strict input: [#83](https://github.com/wolney8/OpenForge/issues/83) retains its
  full scope and is now assigned to M14; remaining cross-surface validation is [#91](https://github.com/wolney8/OpenForge/issues/91).
- Full current blockers and recent IDs are in the [canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md).

## What changed

- The expanded #36 bridge retains one immutable conversion-source boundary and one guided modal
  based on the existing #77 Profile/Account selection pattern. Standard conversion requests missing
  destination identity, checks Account eligibility, creates Profile-isolated Prospecting rows and
  reruns the destination Sportsbook contract. Completed Blackjack Free/Live sessions choose exactly
  one Profile/Casino Account and retain the verified `blackjack-session-v1` checksum; Simulation is
  ineligible, promotions require identity, and own-cash sessions map to `Manual Play / No Offer`.
  Successful targets emit one durable Notification and retries reuse the created row. Calculator and
  session state remain intact. Multi-Lay now preserves all represented outcome legs in Sportsbook;
  Extra Place / Each Way preserve mode, stakes, terms, places, exchange/lay state and provenance in
  their native Prospecting ledger. Sequential Lay, Early Payout / 2UP, Multiples and Dutching have
  no faithful current destination representation and expose no conversion action; Odds /
  Probability remains a non-convertible utility.

- Blackjack now has explicit Simulation, Free Play and Live Play session modes. Simulation exposes no
  money and cannot convert; Free Play separates free credit from withdrawable value; Live Play
  records actual stakes/returns and derives the reviewed result from ending minus starting balance.
  Optional Digital/RNG or Live Dealer provenance does not affect strategy. `blackjack-session-v1`
  produces a deterministic immutable source snapshot for #36 without creating a business row.
  Casino mapping uses existing `Fixed Spins Or Free Play` and the new controlled `Manual Play / No
  Offer` type, so Live Play need not masquerade as a promotion. How to use is collapsed and the
  current recommendation, fallback and legal actions now share the Player region. The recommendation
  itself invokes the same existing action path as its matching action button. That single action panel
  is now a full-width strip above both Dealer and Player at every supported viewport, with the same
  outer edges as their combined row and no reserved Player-side column. In completed state, its status
  and outcome controls align compactly beside Current Hand. Recording an outcome archives exactly once,
  updates the hand count and opens a blank next hand immediately while preserving session-level choices.
  A shared snapshot-based, top-right icon Undo reverses the latest card/action/outcome transition; explicit
  status rows and picker emphasis identify the next required card without shifting the banner. The aligned,
  compact Last Hand recap uses the shared card artwork and fades after the next dealer/two player cards are
  entered. Session History is open by default, collapsible and retained across refresh in the same authenticated
  session. Bust is recognised, shown briefly with reduced-motion protection and archived automatically.
  Live Play additionally totals committed stakes from actual actions. Outcome-based gross returns now
  derive only from the explicit payout contract (default 1:1 plus 3:2/6:5/2:1/Custom natural-Blackjack rules),
  while a manually entered Actual Return remains authoritative. Free Play reports the same arithmetic as
  chip/credit value without implying withdrawable cash. Fixed stake cap and Use Winnings remain advisory;
  Rebet & Deal Again and Double & Deal Again prepare calculator state only. Last Hand is a full-width shared
  disclosure using the canonical height/opacity transition; it never changes Dealer/Player tracks, briefly opens, auto-collapses before interaction,
  and thereafter respects the user's manual state without a separate Keep open control. The top controls
  now use the requested four semantic grid rows with Session Mode and Reset Hand first.
  Card ranks alone use the requested Times serif face. Outcome controls use semantic M3 treatments, and
  `Blackjack Win` appears only for an original two-card natural; Push remains available for a dealer tie.
- Blackjack session mode now uses the compact canonical select. Touched money fields use the shared
  bounded financial-input surface with centred, unclipped currency adornment; optional routine help
  is anchored to each field instead of permanently occupying calculator space. Dealer and Player card
  labels share the canonical calculator label hierarchy.
- Blackjack keeps Session Mode and a compact Session Setup action above the card table. In Live Play,
  only Stake and Actual Return remain as high-frequency inputs; Activity Source, Table Type, starting/
  ending balances and play-limit settings use the shared settings-modal shell. Free Play credit/result
  setup follows the same density rule. Shared Blackjack cards retain their established motion.
- Blackjack money entry now uses the shared commit-time normaliser (`.50`/`.5`/`0.5` → `0.50`)
  while malformed text remains available for inline validation. Convertible sessions expose an
  explicit, unset-by-default activity source independent of table type; Digital/RNG versus Live
  Dealer has moved into a compact Session details disclosure. The blocked-mode error stays attached
  to Session Mode and offers the existing confirmed Reset Session flow.
- Blackjack top controls retain Session Mode/Reset Hand, hand count/Surrender and Soft 17 rows; Deal
  Again has moved to a collision-safe Player-header grid and reflows below the Player label at narrow
  container widths. The banner's
  icon-only Undo uses the canonical centred icon box and remains outside layout flow. One responsive size/aspect token materially enlarges
  the 13-rank picker, dealer/player cards and empty/add-card backs; dark mode now uses a tokenised
  charcoal face and high-contrast rank/suit treatment rather than white-card glare. Stake/accounting
  remains removed; completed and split hands retain explicit
  session-only outcomes which do not grade strategy recommendations. The M3 rule switches retain
  their proven booleans, shared help is anchored to its trigger, and Deal Again has a prominent tonal
  action. Authoritative logout/expiry still clears session history. User/hosted acceptance remains
  pending under [#40](https://github.com/wolney8/OpenForge/issues/40).
- Blackjack Session History reports summaries in classification/total → action → outcome order, adds
  committed STAKED, RETURNED and NET P&L only for Free/Live Play, and expands through bounded responsive detail cards.
  Dealer UP-CARD and Player CARD N clear icons use the overlaid shared centred control and existing undo
  reducer, clearing dependent state. The additive `blackjack-session-v1` envelope preserves payout preset,
  custom multiplier, last deal shortcut, return source, per-hand net and running cash/credit totals for #36.
- Calculator headers no longer repeat `Reference only`. Open in new tab now uses an authenticated
  minimal shell preserving the active family/state with only calculator-local controls and theme;
  full navigation, Profiles and notifications remain outside that shell.
- Odds / Probability now converts exact decimal, fractional, American and implied-probability
  sources without Profile or ledger writes, retains unrounded source precision through conversion,
  rejects malformed input and preserves current state when opened in a new tab.
- The canonical icon-only action now centres both copy and success glyphs within the same stable
  target; representative standalone and embedded calculator consumers share that primitive.
- #35 now presents **Fund Manager → Calculators → Standard**. Standard reuses the Sportsbook
  custom lay slider, resolves Smarkets/0% from the system exchange authority, calculates valid
  inputs automatically and exposes contract-backed Outcomes for Bonus Lock-In, Cashback and all
  four Profit Boost price sources. Each Way / Extra Place uses
  shared same-family ledger presentation sections and Multi-Lay uses the ledger planner/table
  composition; focused family-specific visual acceptance remains pending Will's recheck.
- Early Payout / 2UP now keeps Initial/LIVE Reference aligned as a peer of Outcomes while slider
  previews update in place. Extra Place / Each Way defaults to Extra Place, uses the shared
  segmented mode control and preserves full Place Terms quick-choice labels through bounded paging.
- #35 uses the Fund Manager calculator route. The old Profile URL redirects;
  calculator state can open in a separate tab without persistence. #112 adds fractional and
  unambiguous decimal-comma entry while keeping canonical server-validated decimal odds.
- [`630bde8`](https://github.com/wolney8/OpenForge/commit/630bde854a76ef8551a677690a060c3cf167a55a): separates peer fields from the action row so Search,
  Type and Status align while actions wrap independently; prior containment/focus coverage remains.
- Tracking now includes local runtime handoff [#101](https://github.com/wolney8/OpenForge/issues/101),
  request-coverage recovery [#102](https://github.com/wolney8/OpenForge/issues/102), and deferred
  rebranding decision [#103](https://github.com/wolney8/OpenForge/issues/103). The previously
  unlinked Founder import baseline is preserved in [#104](https://github.com/wolney8/OpenForge/issues/104).
- This page is the navigation summary; Git commits and linked contracts/registers retain detailed
  history.

## What Will should test

Environment: local `http://localhost:3010`; this slice's delivery revision is recorded in its
commit. Manual status: `NOT RUN`.

1. Open **Fund Manager → Calculators → Blackjack Strategy**, record Hit/Double/Stand and use Undo; expect
   the prior cards, recommendation and highlighted waiting target to return.
2. Record an outcome. Expect one History row, a compact Last Hand recap and a blank new hand; enter its dealer
   and first two player cards and expect the recap to fade. Refresh and confirm Session History remains.

Record each manual result as `PASS`, `FAIL`, or `BLOCKED`; automated results never replace Will's
result.
