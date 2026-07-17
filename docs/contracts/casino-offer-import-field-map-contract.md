# Contract: Casino Offer Import Field Map

_Last updated: 2026-07-16_

## Status and scope

- Application: Plum Duff
- Milestone: M7 Reporting and Import/Export
- Source sheet: `Casino Offers`
- Mapping version: `casino-offers-v1`
- Value contract: `docs/contracts/casino-offer-resolved-value-contract.md`

## Identity and isolation

- `CasinoOfferID` is the stable source identity.
- All staging, confirmation, lineage and inserted rows require the selected `profile_id`.
- Cross-profile identity collisions block.
- Unchanged re-imports are no-ops; changed rows require a later explicit update decision.

## Entered-field mapping

| Workbook field | Plum Duff field | Rule |
|---|---|---|
| `OfferGroupID` | `offer_group_id` | Preserve |
| `DateStarted` | `date_started` | Required |
| `DateSettling` | `date_settling` | Preserve; fallback to start only when blank |
| `ExpiryDateTime` | `expiry_datetime` | Preserve |
| `Bookmaker` | `bookmaker` | Required |
| `OfferType` | `offer_type` | Required controlled value |
| `OfferName` | `offer_name` | Required |
| `Game` | `game` | Preserve |
| `CashStake` | `cash_stake` | Preserve |
| `CreditAmount` | `credit_amount` | Preserve |
| `BonusAmount` | `bonus_amount` | Preserve |
| `WagerMultiplier` | `wager_multiplier` | Preserve |
| `WagerTarget` | `wager_target` | Preserve transitional entered/reference value |
| `Required Spins` | `required_spins` | Preserve transitional entered/reference value |
| `SpinStake` | `spin_stake` | Preserve |
| `Free Spins Awarded` | `free_spins_awarded` | Preserve |
| `Free Spins Value` | `free_spins_value` | Preserve |
| `Status` | `status` | Validate through `CasinoOfferPayload` |
| `Result` | `result` | Validate through `CasinoOfferPayload` |
| `CalcNetPnL` | `calc_net_pnl` | Preserve as current/reference value under resolved-value contract |
| `FinalNetPnL` | `final_net_pnl` | Preserve explicit final override |
| `UserNotes` | `user_notes` | Preserve; must explain an imported `FinalNetPnL` until a dedicated reason field exists |

## Recomputed fields

- `NetPnL` from the resolved-value contract
- `CountsAsOpen`
- `IsOverdue`
- `DateRangeTag`
- `WeekLabel`

The source `NetPnL` or Plum Duff export `ResolvedNetPnL` is compared with the value resolved from
`CalcNetPnL` and `FinalNetPnL` under
`docs/contracts/casino-offer-import-reconciliation-contract.md`. It remains comparison-only.

## Confirmation and round trip

- Verified local backup precedes one atomic confirmation transaction.
- Only selected compatible rows are inserted.
- Audit and source lineage record the batch and workbook identity.
- Export separates `CalcNetPnL`, `FinalNetPnL` and `ResolvedNetPnL`.
- Export/re-import of unchanged entered/reference fields is a no-op.
- An imported `FinalNetPnL` without explanatory `UserNotes` is blocked. This is the safe transitional
  audit rule until the casino schema gains a dedicated override-reason field.
- Dry-run review labels source and Plum Duff resolved totals separately and never treats a mismatch
  as permission to overwrite entered values.

## Known boundary

This map preserves wager/spin inputs but does not infer or silently calculate missing wager targets,
spin counts or offer P&L. Those require offer-specific calculation contracts.
