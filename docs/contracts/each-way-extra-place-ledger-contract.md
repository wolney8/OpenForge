# Each Way / Extra Place Ledger Contract

_Status: Implementing. Approved: 2026-08-24._

## Scope

One profile-scoped ledger supports `Each Way` and `Extra Place`; it does not duplicate engines.
The user enters E/W stake per leg, back odds, fractional terms, win/place lay odds and optional
actual lay stakes. Preferred exchanges and commissions come from profile account settings.

## Derived calculation

- Total bookmaker outlay: `E/W stake * 2`.
- Place odds: `1 + ((back odds - 1) * term numerator / term denominator)`.
- Suggested win/place lay stakes: `(respective bookmaker return) / (lay odds - commission)`.
- Actual entered lay stakes replace suggestions for liabilities and final outcomes.
- Monetary legs and outputs use decimal half-up rounding to two places.
- Open value is the conservative minimum of supported outcome values; settled value is the selected outcome.

Extra Place outcomes are `Win`, `Standard Place`, `Extra Place`, `Unplaced`, and `Void/NR`.
Each Way uses `Win`, `Standard Place`, `Unplaced`, and `Void/NR`; it does not present an
extra-place-only outcome. Rule 4, dead heat and changed terms remain explicit review-required
future branches and must never be silently inferred.

## Workflow

1. **Calculate**: fast calculator, result matrix and copy controls. No runner or race required.
2. **Placement**: runner, race, date/time, bookmaker/accounts and per-leg placement status.
3. **Settlement**: outcome first, optional finishing position, calculated final P&L.

The ledger table shows date/time, runner/race, mode, bookmaker, stake, back odds, two lay odds,
qualifying loss, extra-place potential where applicable, status/result and realised value.

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
a primary field.
