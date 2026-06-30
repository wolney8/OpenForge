# OpenForge Workbook Ledger Import/Export Map

_Last updated: 2026-06-30_

## Purpose

This document captures the workbook-shaped import/export considerations for the three core day-to-day ledgers:

- `Sportsbook Bets`
- `Free Bets`
- `Casino Offers`

It is planning guidance only. It does not define implementation yet.

## Guiding rule

Import/export must preserve workbook meaning, not just field names.

That means preserving:

- row identity
- profile scope
- dates and status fields
- strategy mode
- outcome/result values
- current/final value separation
- manual override fields
- helper fields if needed or safely recomputable

## 1. Sportsbook Bets import/export map

### Must preserve

- `QualBetID`
- `DateSettling`
- `EventName`
- `Market`
- `Offer`
- `Bookmaker`
- `OfferType`
- `BetType`
- `OfferName`
- `FixtureType`
- `Status`
- `Result`
- `BackStake`
- `BackOdds`
- `MatchStrategy`
- `LayOdds1`
- `Exchange`
- `Lay (Actual)`
- `LayMatchedStake1`
- `FinalNetPnL`
- `RelatedFreeBetID`
- `Offer Group ID`
- `UserNotes`

### Recomputable or derived if import rules allow

- `MatchRating%`
- `LayStake1`
- `LayStatus`
- `Liability1`
- scenario pnl fields
- `CalcNetPnL`
- `NetPnL`
- commission lookups
- `LayRemainingStake1`
- strategy reference stake fields
- `CountsAsOpen`
- `IsOverdue`
- `Date Range Tag`
- `WeekLabel`

### Import notes

- do not discard actual/manual lay values
- do not discard `FinalNetPnL`
- preserve multi-lay branch columns when present
- preserve `OutcomeCount`
- preserve DDHH scenario branches when present

## 2. Free Bets import/export map

### Must preserve

- `FreeBetID`
- `DateSettling`
- `ExpiryDateTime`
- `EventName`
- `Offer`
- `Bookmaker`
- `OfferType`
- `BetType`
- `OfferName`
- `FixtureType`
- `Status`
- `Result`
- `FreeBetRetentionMode`
- `FreeBetValue`
- `BackOdds`
- `MatchStrategy`
- `LayOdds1`
- `Exchange`
- `Lay (Actual)`
- `LayMatchedStake1`
- `FinalNetPnL`
- `OriginQualBetID`
- `OfferGroupID`
- `UserNotes`

### Recomputable or derived if import rules allow

- `BetRetention%`
- `LayStake1`
- `LayStatus`
- `Liability1`
- scenario pnl fields
- `CalcNetPnL`
- `NetPnL`
- `LayRemainingStake1`
- `LayCommission1`
- `CountsAsOpen`
- `IsOverdue`
- `DateRangeTag`
- `WeekLabel`

### Import notes

- `SNR` vs `SR` is mandatory and cannot be inferred safely later
- expiry values must be preserved accurately
- actual/manual lay values and overrides must not be dropped

## 3. Casino Offers import/export map

### Must preserve

- `CasinoOfferID`
- `OfferGroupID`
- `DateStarted`
- `DateSettling`
- `ExpiryDateTime`
- `Bookmaker`
- `OfferType`
- `OfferName`
- `Game`
- `CashStake`
- `CreditAmount`
- `BonusAmount`
- `WagerMultiplier`
- `WagerTarget`
- `Required Spins`
- `SpinStake`
- `Free Spins Awarded`
- `Free Spins Value`
- `Status`
- `Result`
- `FinalNetPnL`
- `UserNotes`

### Recomputable or derived if import rules allow

- `CalcNetPnL`
- `NetPnL`
- `CountsAsOpen`
- `IsOverdue`
- `DateRangeTag`
- `WeekLabel`

### Import notes

- `DateSettling` may default from `DateStarted`, but import should preserve explicit value if present
- keep override values rather than forcing recomputation

## 4. Shared import rules

- target profile must be explicit before import starts
- imported raw row values must not be merged across profiles
- helper fields can be recomputed after import if calculation contracts are approved
- unresolved ambiguous workbook values should be imported, not silently normalised away
- `WeekLabel` and dashboard-driven `DateRangeTag` values should be treated as recomputable helpers, not imported authority values
- import must preserve the dates, statuses, and override fields needed to rebuild both selected-range tracker views and weekly/monthly reports

## 5. Shared export rules

- export should preserve workbook-shaped columns where needed for reconciliation
- export should preserve override fields and notes
- export should not silently omit strategy-dependent or outcome-dependent columns
- export and reconciliation docs should distinguish source fields from regenerated helper fields
- report-sensitive legacy values such as cash-adjustment type `Costs` may still need to round-trip safely for workbook parity

## 6. Known high-risk areas

- sportsbook `Mixed`
- sportsbook no-lay mug-bet branch
- DDHH/multi-outcome sportsbook rows
- free-bet `SNR` vs `SR`
- free-bet weekly report inclusion rules
- free-bet expiry and overdue behaviour
- casino offer subtype variation
