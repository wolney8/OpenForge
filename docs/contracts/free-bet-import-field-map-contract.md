# Contract: Free Bet Import Field Map

_Last updated: 2026-07-16_

## Status and scope

- Application: Plum Duff
- Milestone: M7 Reporting and Import/Export
- Source sheet: `Free Bets`
- Mapping version: `free-bets-v1`
- Calculation authority: `docs/contracts/free-bet-current-value-contract.md`
- Round-trip authority: `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

This contract maps one workbook free-bet row into one explicitly selected profile. It does not
import `SignupUsers`, infer a missing retention mode, or accept workbook helper values as financial
authority.

## Identity and profile isolation

- `FreeBetID` is the stable source identity.
- Confirmed rows receive a Plum Duff `free_bet_id`; source identity remains in import lineage.
- Identity is scoped by `profile_id` and source sheet.
- A source identity already registered to another profile blocks the row.
- Re-importing unchanged entered fields is a no-op.
- Changed existing rows remain blocked until an explicit audited update workflow exists.

## Entered-field mapping

| Workbook field | Plum Duff field | Rule |
|---|---|---|
| `DateSettling` | `date_settled` | Preserve date/time |
| `ExpiryDateTime` | `expiry_datetime` | Preserve date/time; do not infer |
| `EventName` | `event_name` | Required |
| `Offer` | `offer_text` | Preserve |
| `Bookmaker` | `bookmaker` | Required |
| `OfferType` | `offer_type` | Preserve |
| `BetType` | `bet_type` | Preserve |
| `OfferName` | `offer_name` | Preserve |
| `FixtureType` | `fixture_type` | Preserve |
| `Status` | `status` | Validate against free-bet statuses |
| `Result` | `result` | Validate through `FreeBetPayload` |
| `FreeBetRetentionMode` | `retention_mode` | Required `SNR` or `SR`; never infer |
| `FreeBetValue` | `free_bet_value` | Preserve entered decimal text |
| `BackOdds` | `back_odds` | Preserve entered decimal text |
| `MatchStrategy` | `match_strategy` | Validate through `FreeBetPayload` |
| `LayOdds1` | `lay_odds_1` | Preserve entered decimal text |
| `Exchange` | `exchange_name` | Preserve; commission resolves from profile settings |
| `Lay (Actual)` | `lay_actual` | Preserve explicit actual value |
| `LayMatchedStake1` | `lay_matched_stake_1` | Preserve explicit matched value |
| `FinalNetPnL` | `manual_override_value` | Requires an explicit override reason |
| `ManualOverrideReason` | `manual_override_reason` | Plum Duff extension for safe round trip |
| `OriginQualBetID` | `origin_qual_bet_id` | Preserve source link |
| `OfferGroupID` | `offer_group_id` | Preserve source group |
| `UserNotes` | `user_notes` | Preserve |

## Recomputed fields

The following remain staged audit/reference values and are never written as source authority:

- `BetRetention%`
- `LayStake1`
- `LayStatus`
- `Liability1`
- scenario P&L columns
- `CalcNetPnL`
- `NetPnL`
- `LayRemainingStake1`
- `LayCommission1`
- `CountsAsOpen`
- `IsOverdue`
- `DateRangeTag`
- `WeekLabel`

Plum Duff recomputes current/projected, settled/final, reporting, liability, lay status, open state,
and overdue state from the free-bet calculation contract.

## Blocking rules

- Missing `FreeBetID`, `EventName`, `Bookmaker`, status, result, or retention mode blocks import.
- A retention mode other than `SNR` or `SR` blocks import.
- A manual override without a reason blocks import.
- `Partial Lay` requires an actual or matched lay stake; otherwise it blocks as incomplete.
- Unknown statuses/results/strategies block through controlled payload validation.
- Profile collisions and changed existing identities block.

## Confirmation and export

- A verified local backup is mandatory immediately before confirmation.
- Only selected, compatible new rows are inserted.
- Confirmation, audit, source lineage, and batch state update in one transaction.
- Export preserves entered fields, source identity, origin links and override reason.
- Export labels current/projected, settled/final and reporting values separately.
- Export/re-import of unchanged rows must produce no-ops.

## Acceptance tolerance

- Entered source text is preserved exactly where the database contract stores text.
- Recomputed money values use the upstream free-bet calculation contract and `0.01` tolerance.
- No silent rounding, commission default, retention-mode inference, or P&L normalisation.

