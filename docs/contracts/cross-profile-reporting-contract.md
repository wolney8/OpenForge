# Calculation Contract: Cross-Profile Reporting Aggregation

_Last updated: 2026-09-24 11:08 BST_

## 0. Contract status

- Status: Approved implementation baseline for issue `#11`
- Human approval required before formula changes: Yes
- Related contracts:
  - `docs/contracts/dashboard-selected-range-pnl-contract.md`
  - `docs/contracts/free-bet-weekly-reporting-contract.md`
  - `docs/contracts/retained-profit-reporting-contract.md`
  - `docs/contracts/liability-exposure-contract.md`

## 1. Purpose and boundary

### CP-038 approved bounded period-P&L preset — 2026-09-24 10:53 BST

The owner's #111 implementation request approves a preset over the **existing formal weekly
Reports**, not a new realised-only measure. Weeks remain Monday–Sunday: Sportsbook/Free Bets use
their recorded settlement date (Free Bet status Placed/Settled); Casino uses settling date; Extra
Place uses placed date. Missing formal dates do not acquire Dashboard date fallbacks.

Betting P&L uses canonical row reporting values (including governed corrections/voids and eligible
current values); row-level commission/Casino costs are not subtracted twice. Extra Place remains
included, as in the integrated four-ledger reporting baseline. Signed cash costs and withdrawals
are separate and added to betting P&L for retained profit. Funding and append-only History do not
become profit. Management/investment fees remain separate from this pre-fee view.

Reuse existing all/latest-N formal-period filtering, with an explicit week selection (including
empty weeks) and positive/negative filtering. Points, source records and totals share one canonical
projection; source links always address the owning Profile. Existing UI preference persistence
retains period/filter/point and authorised scope on return/reload; no user-created preset model.
Active/non-archived scope remains the default under CP-016; explicit historical selection is retained,
but a formerly active Profile becoming archived does not gain historical inclusion automatically.
Unavailable money stays unavailable, never zero. Metric/granularity/cumulative explorer work remains
outside this slice and #111 stays open.

Provide the Fund Manager with comparable, read-only reporting across profiles without mixing profile-owned operational rows.

- One shared resolved date range is applied to every profile comparison.
- Each profile is summarized independently using the existing profile reporting contracts.
- Combined values are sums of those completed profile summaries.
- Drilldown links return to a single owning profile.
- Cross-profile row creation, editing, settlement, and deletion are prohibited on this surface.

## 2. Inputs

| Input | Required | Rule |
|---|---:|---|
| `profile_id` | Yes | Stable ownership and comparison key |
| `display_name` | Yes | Fund Manager-facing profile label |
| `profile_status` | Yes | Displayed without changing financial inclusion |
| `resolved_start_date` | Yes | Identical for every selected-range profile summary |
| `resolved_end_date` | Yes | Identical for every selected-range profile summary |
| `profile_summary` | Yes | Output of the contract-backed per-profile summary engine |
| `included_profile_ids` | Yes | Explicit Fund Manager selection; defaults to all available profiles |

## 3. Outputs

Per-profile comparison rows expose:

- pre-fee gross betting P&L
- retained profit
- current cash snapshot
- open current value
- settled final value
- open-position count
- overdue count
- expiring-free-bet count
- current liability
- sportsbook rows requiring action
- free-bet rows requiring action
- casino-offer rows requiring action

The Fund Manager directory's `open-position count` uses the same shared committed-exposure
membership as Profile Operations and Reports. It does not depend on a future due date:

- sportsbook/free-bet/Extra Place: domain-authoritative `Placed`
- casino: domain-authoritative `Started` or `In Progress`
- overdue and missing-date committed rows remain open; planning and realised rows are excluded
- planning reminders remain represented by ledger-specific Actions indicators

Combined outputs expose sums of the same fields plus:

- sportsbook, free-bet, casino, and cash-adjustment category totals
- bookmaker totals and open-position counts
- weekly and monthly formal report totals
- profile-owned balance snapshot history for the shared range, without summing snapshots

## 4. Formula

For any additive field `x`:

`combined_x = SUM(profile_summary[x] for each explicitly included profile)`

- At least one available profile remains selected.
- Removing a profile from the picker removes its completed summary from every combined total,
  breakdown, formal period, and balance-snapshot list.
- Profile selection does not modify or archive the profile.

Bookmaker and formal-period rows are grouped by stable keys before summing:

- bookmaker key: exact normalized bookmaker string emitted by the profile summary
- weekly/monthly key: existing `periodKey`

Formal report fields retain their existing signed-value semantics:

- `total_pnl = sportsbook_pnl + free_bet_pnl + casino_pnl`
- `retained_profit = total_pnl + withdrawals + costs`

## 5. Cash-first and settled-value behaviour

- Selected-range gross P&L may contain conservative current values for open rows.
- Open current value and settled final value remain separate outputs.
- Formal report rows retain their existing workbook inclusion rules.
- Cross-profile aggregation must not recalculate, reinterpret, or round profile values.

## 6. Fees

- All issue `#11` combined earnings are labelled pre-fee.
- Management, investment, platform, package, crystallisation, loss carry-forward, and fee withdrawal calculations are outside this contract.
- M10 fee outputs may later consume these pre-fee values through their own approved contract.

## 7. Rounding and tolerance

- Do not round profile values before aggregation.
- Display money to two decimal places.
- Automated acceptance tolerance: `0.01` for money and exact equality for counts.

## 8. Profile isolation and audit requirements

- The aggregator accepts completed profile summaries, never unscoped raw rows.
- Each comparison row retains `profile_id` and profile label.
- UI drilldowns must include the owning `profile_id`.
- Operational action counts remain separated by ledger; an aggregate overdue count must not guess a
  destination ledger.
- No combined table may provide operational row mutation controls.
- Balance snapshots retain their owning `profile_id`; historical snapshot amounts are not added to current cash snapshot or P&amp;L.
- The combined surface is classified `internal_operational` and must not be rendered on subscriber routes.
- UI metadata and badges communicate classification but are not authorization controls.
- Future subscriber authorization must be enforced before data retrieval and default-deny combined analytics.
- Failed profile loads remain visible as errors and must not silently appear as zero-value profiles.

## 9. Required fixtures and tests

- two-profile positive/negative aggregation
- open-current versus settled-final separation
- signed withdrawals and costs in formal retained profit
- bookmaker grouping across profiles
- missing/failed profile exclusion reported explicitly
- no mutation actions on the combined UI
- direct sportsbook, free-bet and casino action links apply `view=issues&issue=all-issues`
- destination ledger distinguishes `All rows` from `All issues`

## 10. UI requirements

- Identify the shared resolved range.
- Identify how many profiles are included and provide an accessible inclusion picker.
- Label gross and retained values as pre-fee.
- Keep profile rows and combined totals visually distinct.
- Provide profile-safe drilldown links.
- Do not imply that current cash snapshot, P&L, and exposure are interchangeable.
- Use human-readable British dates in report labels and tables while retaining stable machine period keys.
- Surface concise action-needed indicators for overdue or expiring work without treating all open
  positions as errors.
- Group the Fund Manager surface into accessible `Profiles`, `Performance`, `Exposure`, `Fees`,
  and `Formal Reports` views without changing the calculations or resolved range behind each view.
- Keep profile management, operational issue links, dashboard navigation, report navigation and
  the profile-details drawer exclusively in the `Profiles` directory view.
- The directory combines ledger issue actions and dashboard/report navigation into one `Actions`
  column. Clicking non-interactive row space opens profile details; nested controls retain their
  own destinations and must not also open the drawer.
- `Profiles` contains the all-profile headline values above the directory. Gross P&amp;L is
  sportsbook + free-bet + casino reporting value; retained profit adds signed withdrawals and
  qualifying costs; cash snapshot is the current included account balance total.
- `Exposure` may compare profile-level exposure values, but must not duplicate generic ledger
  actions or tracker navigation. Operational resolution starts from the `Profiles` directory.
- Keep profile inclusion independent from directory search, status filters, pagination, and
  session pinning. Directory controls must never silently add or remove a profile from totals.
- Present the profile roster as a paginated directory with basic metrics and profile-safe
  drilldowns rather than one permanently expanded card per profile.
- Treat pinning as presentation-only behaviour. Quick profile details may update only the fields
  approved by `profile-metadata-management-workflow-contract.md`; those updates do not mutate
  tracker rows or silently change reporting inclusion.
- Report-only watchlists may remain on the dashboard, but root-profile operational links must open
  the owning sportsbook, free-bet or casino ledger directly with an explicit issue filter.
- An external action link overrides persisted table mode/filter state for that navigation. It must
  show all dates so an overdue row cannot remain hidden by the reporting date range.
- Action links do not mutate rows, settle bets, or bypass the destination workflow's profile scope.
- A future multi-profile offer action must hand off to the approved sequential multi-profile-entry
  contract. Combined reporting must never create or bulk-confirm operational rows directly.

## CP-055 Reports / Activity explorer V1

Owner-authorised scope: reuse the summary response and canonical row outputs; no new calculation
engine or report requests. The existing weekly/formal report remains unchanged.

- Ranges Today, This Week (Monday–Sunday), This Month and inclusive Custom use Europe/London
  calendar dates. Date-only/local workbook dates retain their stated calendar day; offset timestamps
  convert to London. No browser-timezone-dependent boundaries.
- Realised betting P&L sums authoritative final values of settled/terminal-void betting records,
  once per Profile/module/native ID. Missing final values remain unknown; no projected fallback.
  Cash funding/balances/History never contribute. Cash costs and withdrawals use their existing
  governed signed types as separate optional metrics; no invented owner-income measure.
- Activity count counts current operational records (Sportsbook/Free Bet Placed or Settled,
  Casino Started/In Progress/Settled, Extra Place Placed/Settled, Cash adjustments). Void/cancelled
  and prospecting/unplaced awards are excluded from counts; a Void's genuine financial result may
  still contribute to realised P&L. One record, never a lay leg/history event.
- **Date basis is reporting date**, not a claim about actual placement time: Sportsbook/Free Bets
  date_settled, Casino date_settling, Extra Place placed_at, Cash adjustment_date. SB/FB lack an
  independently recorded placement date. Exact historical “placed this week” remains unavailable;
  never substitute created_at/import/history time. Missing reporting dates are shown as undated
  candidates and make the selected-range result incomplete, with a labelled known subtotal retained.
- Filters/grouping expose only canonical fields: recorded bookmaker/provider, module, bet type,
  offer type, fixture type, status and result. Missing category values are labelled Not recorded.
  No fuzzy provider resolution or claimed Account ID when a ledger stores only bookmaker text.
- Combined scope reuses authorised Profile selection, including deliberate archived inclusion.
  Failed/loading selected data cannot display cached totals as current. Empty ready scope is zero.
  Personal/Managed combined P&L is Profile performance, not Fund Manager income or fee entitlement.
- Range/filter/group/expanded source selection persists using existing UI preference storage.
  Source links retain owning Profile and ledger/native ID; browser Back restores explorer context.

Independent fixtures before implementation: London midnight and DST week/month boundaries;
settled +12.34 and -2.34 =10.00, genuine zero; unknown final makes total unavailable while known
subtotal stays10.00; prospecting/Void excluded from counts; corrected canonical row counted once;
Personal+Managed aggregate without applying fees; undated row prevents a complete range total;
empty range, provider/type filters, failed/rapid scope and browser drilldown/return.

Authoritative financial outputs are already currency values at two-decimal precision. Aggregate in
integer pennies, then divide by100 for display; no new per-record financial rounding or equation.
The existing Sportsbook No Lay + None/Mug Bet cash-return win branch is unchanged; explorer uses
its governed final output and must not claim independent recalculation or resolve that old caveat.

## CP-078 Reports organisation, recipes and bounded lists

- Each report block has one primary home: Profiles owns directory/workload/cash/balance history;
  Performance owns selected-range performance, Explorer, one governed P&L breakdown, bookmaker
  breakdown and Profile comparison; Exposure owns open-position comparison; Fees owns fee position
  and monthly status; Formal Reports owns Period P&L and weekly/monthly/yearly formal tables.
- Main sections remain visible in their tab. Record-level inspection and optional controls may use
  progressive disclosure; primary reports must not be hidden in accordions.
- Explorer date chips preserve other criteria. Named recipes are explicit versioned filter
  definitions. The first recipe set is `Free Bets Today`, `Free Bets`, `Price Boosts`, `Profit
  Boosts`, `Bet & Get`, `Refund If Loses`, `Bet Builders`, `Accumulators`, `Free Bet Builders`,
  `Singles`, `Cashback`, `Insurance`, `Mug Bets`, and `DD / HH`. Recipes use canonical module,
  offer-type and bet-type values; they never depend on a historical combo/template identity.
  `Free Bets Today` means reporting date Today AND module Free Bets AND bet type Single AND status
  (Placed OR Settled). It is the only initial recipe that replaces the selected date range. Other
  recipes preserve that range. Applying a recipe clears unspecified option filters, preserves
  authorised Profile scope and updates the visible controls atomically.
- Multiple selections within one filter dimension use OR; different dimensions use AND. Legacy
  persisted scalar selections normalise to one-element lists. Relative dates resolve in
  Europe/London when applied or restored.
- Matching records and aggregate eligibility remain distinct: explicitly requested Placed records
  remain inspectable while realised P&L continues to use only governed realised results. Legacy
  `Free Bet Awarded` sportsbook execution evidence is visible under the Placed activity selection;
  an award is not settlement and never contributes a realised result by that status alone.
- Growing report/detail lists use the shared 16-row pagination control. Sorting and filtering occur
  before pagination; totals cover the full governed scope; list pages are independent and reset or
  clamp safely when their governing criteria change.

## CP-104 operational partial-readiness boundary

- Operational Selected Range Performance and retained-profit summaries expose an explicit
  aggregate of known value, known row count and unknown row count. A partial result shows the
  known subtotal and the unknown count; an unknown row is never assigned zero.
- A complete result has no unknown applicable rows. `Unavailable` is reserved for a completed
  read with no authoritative values, or an explicit source failure. Loading remains a separate
  state until the current Profile/scope request resolves.
- Formal report values retain their existing strict completeness semantics. The operational
  partial aggregate does not change formal accounting membership or permit an incomplete formal
  total to be presented as complete.
- Cross-Profile financial summaries are hydrated from the current no-store request. Module-level
  cached sources cannot be presented as current, and aborted or superseded requests cannot update
  the active Profile/scope result.
