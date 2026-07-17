# Contract: Sportsbook Workbook Import Field Map

_Last updated: 2026-07-15_

## Status and scope

- Status: Approved implementation baseline for issue `#12`
- Parent contract: `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`
- Workbook source: `Sportsbook Bets`
- Mapping version: `sportsbook-v1`
- Target: one explicitly selected `profile_id`

This mapping supports standard single-lay and no-lay workbook rows. Advanced rows are accepted
only when a Plum Duff export supplies the branch-preserving JSON extension; workbook branch
columns are never flattened into a single-lay row.

## Source identity

| Workbook field | Import role |
|---|---|
| `QualBetID` | Required source record id; retained in import lineage |

The application generates its own `sportsbook_bet_id`. Identity and idempotency use selected
`profile_id` + `Sportsbook Bets` + `QualBetID`.

## Authoritative field map

| Workbook field | Plum Duff field | Authority |
|---|---|---|
| `DateSettling` | `date_settled` | entered |
| `EventName` | `event_name` | entered |
| `Market` | `market` | entered |
| `Offer` | `offer_text` | entered |
| `Bookmaker` | `bookmaker` | entered |
| `OfferType` | `offer_type` | entered |
| `BetType` | `bet_type` | entered |
| `OfferName` | `offer_name` | entered |
| `FixtureType` | `fixture_type` | entered |
| `Status` | `status` | entered and validated |
| `Result` | `result` | entered and validated |
| `BackStake` | `back_stake` | entered |
| `BackOdds` | `back_odds` | entered |
| `MatchStrategy` | `match_strategy` | entered and validated |
| `LayOdds1` | `lay_odds_1` | entered |
| `Exchange` | `exchange_name` | entered |
| `Lay (Actual)` | `lay_actual` | entered override |
| `LayMatchedStake1` | `lay_matched_stake_1` | entered |
| `UserNotes` | `user_notes` | entered |
| `ManualOverrideValue` | `manual_override_value` | override; reason required |
| `ManualOverrideReason` | `manual_override_reason` | override audit |
| `BonusTrigger` | `bonus_trigger` | Plum Duff round-trip extension |
| `MaximumBonus` | `maximum_bonus` | Plum Duff round-trip extension |
| `BonusRetentionRate` | `bonus_retention_rate` | Plum Duff round-trip extension |
| `MultiLayOutcome1Name` | `multi_lay_outcome_1_name` | Plum Duff round-trip extension |
| `MultiLayOutcomesJson` | `multi_lay_outcomes_json` | branch-preserving Plum Duff extension |

## Recomputed and audit-only source fields

These source values may remain in staged audit payloads but must not become application authority:

- `MatchRating%`
- `LayStake1`
- `LayStatus`
- `Liability1`
- scenario P&L fields
- `CalcNetPnL`
- `NetPnL`
- `LayCommission1`
- `LayRemainingStake1`
- strategy reference stakes
- `CountsAsOpen`
- `IsOverdue`
- `Date Range Tag`
- `WeekLabel`

`FinalNetPnL` is not silently converted into an override. A source override must be supplied through
`ManualOverrideValue` with `ManualOverrideReason`.

## Required validation

- `QualBetID`, `EventName`, `Bookmaker`, `Status`, `Result` and `MatchStrategy` are required.
- Status, result and strategy must pass the current sportsbook API authorities.
- Money/odds text must pass the existing sportsbook payload and calculation validation.
- A manual override without a reason blocks the row.
- Existing changed source identity blocks until the Fund Manager explicitly approves an update.

## Advanced-row gate

Rows are review-blocked when any of these are present:

- `MatchStrategy` is `Partial Lay`, `Multilay` or `Multilay-Underlay`
- `OutcomeCount` is greater than `1`
- any populated `LayOdds2`, `LayOdds3`, `LayStake2`, `LayStake3`, `PnL_IfLay2Wins` or
  `PnL_IfLay3Wins` field

Those rows require the branch-preserving `MultiLayOutcomesJson` extension or a later dedicated
workbook-column mapper. The extension must be a non-empty JSON list and remains subject to the
current sportsbook payload validation.

## Export boundary

- Export uses the workbook field names above and preserves original `QualBetID` lineage.
- Native Plum Duff rows use their stable sportsbook id as `QualBetID`.
- Current/projected, settled/final and reporting values are separate export columns and are never
  imported as entered authority.
- Re-importing an unchanged profile export stages every existing row as a no-op.

## Confirmation gate

Confirmation requires:

1. a `dry_run_ready` batch using mapping version `sportsbook-v1`;
2. no review-blocked or changed rows;
3. explicit Fund Manager confirmation;
4. a newly created verified local SQLite backup;
5. one atomic database transaction for ledger rows, source lineage and batch status.
