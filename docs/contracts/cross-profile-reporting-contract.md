# Calculation Contract: Cross-Profile Reporting Aggregation

_Last updated: 2026-07-16_

## 0. Contract status

- Status: Approved implementation baseline for issue `#11`
- Human approval required before formula changes: Yes
- Related contracts:
  - `docs/contracts/dashboard-selected-range-pnl-contract.md`
  - `docs/contracts/free-bet-weekly-reporting-contract.md`
  - `docs/contracts/retained-profit-reporting-contract.md`
  - `docs/contracts/liability-exposure-contract.md`

## 1. Purpose and boundary

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

The Fund Manager directory's `open-position count` is a current-state operational count, not the
broader workbook `counts_as_open` reporting flag and not a selected-range count:

- sportsbook/free-bet: `status = Placed`, `result = Pending`, valid settlement time `> now`
- casino: `status = Started`, `result = Pending`, valid settlement time `> now`
- overdue, missing-date, prospecting/available and settled rows are excluded from Open positions
- excluded problem rows remain represented by the ledger-specific Actions indicators

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
- Group the Fund Manager surface into accessible `Profiles`, `Performance`, `Exposure`, and
  `Formal Reports` views without changing the calculations or resolved range behind each view.
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
