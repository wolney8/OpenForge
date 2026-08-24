# Each Way / Extra Place EP Catcher Import Preparation

_Status: prepared for a future dry-run importer; no operational workbook import is enabled._

## Source Boundary

Only `docs/reference/MatchedBetting_Tracker.xlsx`, worksheet `EP Catcher`, is in scope. It is a
historical migration source and regression oracle, not a UI template.

## Field Classification

| EP Catcher column | Plum Duff classification | Destination / treatment |
|---|---|---|
| Week | F. Legacy | derive reporting periods from `placed_at`; retain only in import audit metadata if needed |
| Date | A. User input | `placed_at` |
| Bet (Runner) | A. User input | `runner` |
| Race | A. User input | `race` |
| Bet Status | E. Lifecycle | map to `Prospecting`, `Placed`, `Settled`, or `Void` |
| E/W Stake (£) | A. User input | `each_way_stake`, per each-way leg |
| Bookmaker | A. User input | validate against the profile account authority before import |
| Back Odds | A. User input | `back_odds` |
| Place Term | A. User input | parse fractional numerator/denominator |
| Place Odds | C. Derived | recalculate from back odds and terms; compare for variance |
| Win Lay Exchange | B. Profile/account default or A. imported actual | `win_exchange`; retain imported value |
| Win Lay Odds | A. User input | `win_lay_odds` |
| Win Lay Stake (£) | C. Derived / imported actual | `actual_win_lay_stake` only when materially different from suggestion |
| Win Lay Liability (£) | C. Derived | recalculate and reconcile |
| Place Lay Exchange | B. Profile/account default or A. imported actual | `place_exchange`; retain imported value |
| Place Lay Odds | A. User input | `place_lay_odds` |
| Place Lay Stake (£) | C. Derived / imported actual | `actual_place_lay_stake` only when materially different from suggestion |
| Place Lay Liability (£) | C. Derived | recalculate and reconcile |
| Imp Odds | F. Legacy/calculator reference | preserve only in import audit if a future investigation requires it |
| Qual Loss (£) | C. Derived | recalculate and compare |
| Extra Place Profit (£) | C. Derived | recalculate and compare for Extra Place rows |
| Result | D. Settlement | map to the ledger result vocabulary; unmapped values block import review |
| Net P/L (£) | C. Derived settlement | recalculate from selected result; mismatches require review |
| Bookie Places | A. User input | `bookmaker_places` |
| Exchange Places | A. User input | `exchange_places` |
| Finishing Pos | D. Settlement | `finishing_position`; do not infer a result when terms are ambiguous |
| Win Lay Comm % | B. Profile/account default or A. imported actual | `win_commission` |
| Place Lay Comm % | B. Profile/account default or A. imported actual | `place_commission` |

## Dry-Run Workflow

1. Detect the `EP Catcher` sheet and exact column headings.
2. Map each row to the dedicated Each Way / Extra Places payload.
3. Validate profile-scoped bookmaker and exchange authority.
4. Recalculate stakes, liabilities, outcome matrix and final value.
5. Flag missing terms, unmapped results, or monetary variances beyond documented rounding.
6. Display rows for selected-profile approval only.
7. Create a verified local backup, import approved rows, and produce a reconciliation report.

No row may silently create a new account, default a missing commission, or convert an ambiguous
historical result.
