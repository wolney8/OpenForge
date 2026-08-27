# Each Way / Extra Place Ledger Contract

## Product Naming And Editor Parity

The user-facing ledger is **Extra Place**. The internal API and compatibility route remain
`each-way-extra-places` while existing integrations migrate, but no navigation, page title, or
user-facing label should expose the older combined name.

The editor follows the shared Plum Duff ledger-modal contract:

- **Calculate & Place** and **Settlement** are the only primary steps.
- Guided entry identifies the next missing required field and moves the user to its step.
- E/W stake, lay stakes, and liabilities are neutral amounts; only outcome, profit, and loss
  values use positive/negative semantic colours.
- The ledger table does not carry a duplicate status column. The established row action state and
  issue-row treatment communicate incomplete, placed and settlement-required work.
- Actions provide the same edit and destructive controls as signed-off ledgers, plus a compact
  Extra Place-specific result selector. Its options are restricted to the selected mode and the
  configured bookmaker place count.
- The modal owns scrolling, has a fixed viewport-constrained shell, and keeps its header and
  footer controls visible.
- Incomplete or unresolved rows are visibly marked as requiring action and can be filtered.

Initial quick-select loadouts are safe defaults. Their durable ownership is the existing
Fund-Manager Quick Add Loadout/Common Bet Combo authority; profile availability must later honour
the selected account's eligibility and restrictions.

_Status: Implementing. Approved: 2026-08-24._

## Scope

One profile-scoped ledger supports `Each Way` and `Extra Place`; it does not duplicate engines.
The user enters E/W stake per leg, back odds, fractional terms, win/place lay odds and optional
actual lay stakes. Preferred exchanges and commissions come from profile account settings.

- Terms are entered as `1 / denominator`; the default is `1 / 5`, with `1/4`, `1/5`, and `1/6`
  quick selections. Runner, race and date/time belong in the compact racing-details segment above
  the calculator so the user can calculate and place without moving to a duplicate metadata step.
- **Payout fraction and paid places are independent inputs.** `1 / 5` determines the derived
  bookmaker place odds; it must never be used to infer the number of paid places. `Bookmaker
  Pays` and `Exchange Pays` are explicit place-count fields. In Extra Place mode, positions
  `exchange_places + 1` through `bookmaker_places` are Extra Place; positions above
  `bookmaker_places` are Unplaced. In Each Way mode, bookmaker and exchange place counts resolve
  to the same boundary.
- Standard Extra Place presets are `4 instead of 3`, `5 instead of 4`, `6 instead of 4`, `6
  instead of 5`, `8 instead of 5`, and `10 instead of 8`. They set only place counts, never odds
  or the each-way payout fraction.
- Commission is resolved from the selected profile exchange/account. The normal entry flow has
  no manual commission fields.

## Derived calculation

- Total bookmaker outlay: `E/W stake * 2`.
- Place odds: `1 + ((back odds - 1) * term numerator / term denominator)`.
- Suggested win/place lay stakes: `(respective bookmaker return) / (lay odds - commission)`.
- Actual entered lay stakes replace suggestions for liabilities and final outcomes.
- Rating %: `(1 + qualifying loss / total bookmaker outlay) * 100`, rounded half-up to two decimals.
- Implied Odds: `1 + extra place profit / abs(qualifying loss)` when qualifying loss is non-zero,
  rounded half-up to two decimals. It is unavailable when there is no qualifying loss.
- Monetary legs and outputs use decimal half-up rounding to two places.
- Open value is the conservative minimum of supported outcome values; settled value is the selected outcome.

Extra Place outcomes are `Win`, `Standard Place`, `Extra Place`, `Unplaced`, and `Void/NR`.
Each Way uses `Win`, `Standard Place`, `Unplaced`, and `Void/NR`; it does not present an
extra-place-only outcome. Rule 4, dead heat and changed terms remain explicit review-required
future branches and must never be silently inferred.

## Workflow

1. **Calculate & Place**: compact runner/race/date-time details, fast calculator, account choices,
   result matrix and copy controls. A trailing valid 24-hour race time such as `Sandtown 14:10`
   proposes local Today and Tomorrow date/time choices. It only fills an empty or parser-owned
   date/time and never replaces a manually selected value.
2. **Settlement**: outcome first, optional finishing position, calculated final P&L.

Settlement position quick actions contain position only (`1st`, `2nd`, and so on). Selecting one
derives the valid settlement result from the explicit paid-place gap, highlights its
outcome-matrix row, and sets the displayed outcome amount. For example, under `Paying 6 instead
of 4`, fifth and sixth are Extra Place and seventh is Unplaced. Notes are advanced-only.

The ledger table shows date/time, runner/race, mode, bookmaker, per-way stake and total outlay,
back odds, two lay odds, qualifying loss, extra-place potential where applicable and realised
value. It is row-click editable. The result matrix separates contract-calculated Bookie,
Exchange and Total values, with individual win and place legs visible for audit; React must not
calculate those values.

Incomplete rows remain visible as `Needs action` even where their date/time is blank or outside
the current tracker range. This exception applies only to the operational table; tracker-range
cards, reporting and financial totals remain strictly range-scoped.

## Operational Visibility And Weekly Loss Budget

- A placed row shows a quiet `Race finishing` cue from five minutes after its scheduled race
  time, changing to `Result due` after ten minutes. This is an advisory manual-settlement cue,
  not an automated result source or notification replacement.
- The resolved-value card remains strictly selected-range scoped. It separately shows selected
  range qualifying loss and realised Extra Place outcome, so neither changes its established
  resolved-value calculation.
- Each profile has an advisory weekly Extra Place loss budget, defaulting to `£15`. It measures
  the current Monday-Sunday qualifying loss independently of the selected tracker range and shows
  the amount left or that the budget is reached. It never blocks betting, changes P&L, fees, or
  reports.

## EP Catcher evidence

Only `docs/reference/MatchedBetting_Tracker.xlsx`, worksheet `EP Catcher`, is in scope. `Week`
is reporting-derived. Historical win/place lay stakes may be actuals and therefore override the
suggested calculation; they are regression/migration evidence, not generic formula authority.

The MBB reference fixture: Extra Place, E/W stake 10, back odds 6, 1/5, win lay 2.3, place lay
4.5, zero commission yields suggested stakes 26.09 and 4.44. With penny leg rounding it resolves
to First Place 10.54, Standard Place 10.55, Extra Place 30.53 and Unplaced 10.53.

## Migration

Future EP Catcher import maps runner/race/terms/accounts/actual legs/finishing data to this record,
runs a dry calculation comparison, requires selected-profile approval, and never imports `Week` as
a primary field. The detailed source-column classification and dry-run gate are recorded in
`docs/planning/each-way-extra-place-import-preparation.md`.

## Reporting Integration

Each Way / Extra Place is a distinct portfolio and report module. Its selected-range and formal
reporting date is `placed_at` until a separate settlement timestamp is introduced by an approved
contract change. A pending row contributes `current_value`; a resolved or void row contributes
`final_value`. It must not be relabelled as Sportsbook in dashboards, top-bar totals, bookmaker
breakdowns, or formal reports. Cash snapshot remains a current account-state value, not ledger P&L.
