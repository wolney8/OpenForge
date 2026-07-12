# OpenForge Workbook Field Map

_Last updated: 2026-06-30_

## Purpose

This document maps the major workbook fields that OpenForge must preserve.

`SignupUsers` is intentionally excluded.

## Field classification guide

- User-entered: typed or selected by the operator
- Derived: calculated from row inputs or related sheet logic
- Override: manual value that can replace a calculated value
- Helper: derived support field used for reporting/filtering

## Settings

Key responsibilities:

- date presets
- commission defaults
- sportsbook match strategies
- free-bet match strategies
- result lists
- account types and statuses
- adjustment types and directions
- free-bet retention modes

Named ranges confirmed locally:

- `AccountTypeList`
- `ActiveBookmakers`
- `ActiveExchanges`
- `AdjustmentTypeList`
- `BetTypeList`
- `BookieValueType`
- `BookmakerList`
- `CasinoStatusList`
- `CommissionDefaults`
- `DatePresetList`
- `DateRangeList`
- `DirectionList`
- `EPStatusList`
- `FilteredBanksAndExchanges`
- `FixtureTypeList`
- `FreeBetRetentionModeList`
- `FreeBetStatusList`
- `LayStatusList`
- `MatchStrategyFreeBetsList`
- `MatchStrategyList`
- `OfferNameList`
- `OfferTypeList`
- `OutcomeCountList`
- `ResultList`
- `SportsbookStatusList`
- `StatusList_Account`

Important config values to preserve:

- default date preset
- free-bet expiry alert window
- global date-range toggle
- this-month mode
- default mug frequency days
- free-bet underlay factor
- free-bet overlay factor
- default bonus retention percentage

OpenForge implication:

- `Settings` is a core dependency sheet because it defines values reused across other workbook areas
- future web settings/tooling should distinguish:
  - system-level list/default definitions derived from workbook `Settings`
  - user-facing profile/tooling settings used in the web application
- broken `.xlsx` list validations in ledger sheets should be reconstructed from these named ranges, not copied literally

## Accounts

| Field | Classification | Notes |
|---|---|---|
| `AccountID` | User-entered/system key | Workbook key; later app key may differ |
| `Account` | User-entered | Bookmaker, exchange, or bank name |
| `Type` | User-entered | `Bookie`, `Exchange`, `Bank` |
| `Counts In Cash Total` | User-entered | Controls dashboard cash totals |
| `Channel` | User-entered | Online/in-store/other |
| `Status` | User-entered | Operational account status |
| `CurrentBalance` | User-entered | Current balance authority |
| `PendingWithdrawalAmount` | User-entered | Pending cash movement |
| `LastBalanceUpdate` | User-entered | Audit-style timestamp |
| `LastPromoUsed` | Derived | Cross-ledger latest promo/activity style field |
| `Group` | User-entered | Platform/bookmaker grouping |
| `Platform` | User-entered | Platform/vendor detail |
| `RiskTeam` | User-entered | Operational metadata |
| `SignUpDate` | User-entered | Account start date |
| `Notes` | User-entered | Free-text notes |

## Cash Adjustments

| Field | Classification | Notes |
|---|---|---|
| `AdjustmentID` | User-entered/system key | Workbook key |
| `AdjustmentDate` | User-entered | Main reporting date |
| `Direction` | User-entered | `In` or `Out` |
| `Amount` | User-entered | Unsigned value |
| `AdjustmentType` | User-entered | `Withdrawal`, `Subscription`, `Deduction`, `Deposit`, `TopUp`, `Correction` |
| `AffectsInvestment` | User-entered | Investment/roll-forward flag |
| `AffectsCashSnapshot` | User-entered | Cash snapshot inclusion flag |
| `LinkedAccount` | User-entered | Optional account link |
| `Description` | User-entered | Free-text explanation |
| `SignedAmount` | Derived | Positive/negative from `Direction` |
| `Date Range Tag` | Helper | In/out of dashboard date range |
| `WeekLabel` | Helper | Week commencing label |

## Sportsbook Bets

### Primary workflow fields

| Field | Classification | Notes |
|---|---|---|
| `QualBetID` | User-entered/system key | Workbook key |
| `DateSettling` | User-entered | Main reporting date |
| `EventName` | User-entered | Event descriptor |
| `Market` | User-entered | Market descriptor |
| `Offer` | User-entered | Offer text/source |
| `Bookmaker` | User-entered | Account/bookmaker name |
| `OfferType` | User-entered | Promotion mechanic / offer family; workbook values currently need rationalisation because some entries overlap with wager shape |
| `BetType` | User-entered | Wager shape such as single, builder, or multiple |
| `OfferName` | User-entered | Named campaign tag / recurring offer label; should not be treated as the primary mechanic field |
| `FixtureType` | User-entered | Sport/fixture type |
| `Status` | User-entered | Prospecting/not placed/placed/settled style state |
| `Result` | User-entered | Outcome selector |
| `BackStake` | User-entered | Main stake input |
| `BackOdds` | User-entered | Main odds input |
| `MatchStrategy` | User-entered | `Standard`, `Underlay`, `Overlay`, `Custom`, `No Lay`, `Partial Lay`, `Multilay`, `Multilay-Underlay` |
| `LayOdds1` | User-entered | First lay odds |
| `Exchange` | User-entered | Exchange name |
| `Lay (Actual)` | Override | Actual lay override value |
| `LayMatchedStake1` | User-entered/override | Part-laid tracking |
| `FinalNetPnL` | Override | Manual final override |
| `RelatedFreeBetID` | User-entered/link | Links to free-bet follow-on |
| `Offer Group ID` | User-entered/link | Offer grouping |
| `UserNotes` | User-entered | Audit and context notes |

### Derived money and status fields

| Field | Classification | Notes |
|---|---|---|
| `MatchRating%` | Derived | Simple back-vs-lay quality metric |
| `LayStake1` | Derived | Strategy-driven lay stake |
| `LayStatus` | Derived | `Not Laid`, `Part Laid`, `Fully Laid` |
| `Liability1` | Derived | First lay liability |
| `PnL If Bookie Wins / Outcome 1 Wins` | Derived | Scenario value |
| `PnL If Bookie Loses / No Selection Wins` | Derived | Scenario value |
| `CalcNetPnL` | Derived | Cash-first current or settled result |
| `NetPnL` | Derived/override-resolved | `FinalNetPnL` else `CalcNetPnL` |
| `LayCommission1` | Derived | Lookup from `CommissionDefaults` |
| `LayRemainingStake1` | Derived | Unmatched residual |
| `BonusRetention%` | Derived | Offer-specific helper |
| `MaximumBonus` | Derived | Offer-specific helper |
| `UnderlayRefLayStake` | Derived | Strategy reference |
| `StandardRefLayStake` | Derived | Strategy reference |
| `OverlayRefLayStake` | Derived | Strategy reference |
| `CustomLayStake` | Override helper | Mirrors actual custom value when used |
| `SelectedLayStake` | Derived | Resolved selected lay stake |
| `OutcomeCount` | Derived | Number of outcomes/lay branches |
| `LayOdds2` / `LayStake2` / `LayCommission2` / `Liability2` | User-entered + derived | Multi-lay support |
| `LayOdds3` / `LayStake3` / `LayCommission3` / `Liability3` | User-entered + derived | Multi-lay support |
| `PnL_IfLay2Wins / DD Result` | Derived | Multi-lay scenario |
| `PnL_IfLay3Wins / HH Result` | Derived | Multi-lay scenario |
| `CountsAsOpen` | Helper | Open-state flag |
| `IsOverdue` | Helper | Overdue flag |
| `Date Range Tag` | Helper | In/out of dashboard date range |
| `WeekLabel` | Helper | Week commencing label |

## Free Bets

### Primary workflow fields

| Field | Classification | Notes |
|---|---|---|
| `FreeBetID` | User-entered/system key | Workbook key |
| `DateSettling` | User-entered | Reporting date |
| `EventName` | User-entered | Event descriptor |
| `Offer` | User-entered | Offer text |
| `Bookmaker` | User-entered | Bookmaker name |
| `OfferType` | User-entered | Promotion mechanic / offer family |
| `BetType` | User-entered | Wager shape |
| `OfferName` | User-entered | Named campaign tag / recurring offer label |
| `FixtureType` | User-entered | Sport type |
| `Status` | User-entered | `Prospecting`, `Available`, `Placed`, `Settled` style states |
| `Result` | User-entered | Outcome selector |
| `ExpiryDateTime` | User-entered | Expiry and overdue logic |
| `FreeBetRetentionMode` | User-entered | `SNR` or `SR` |
| `FreeBetValue` | User-entered | Main stake/value input |
| `BackOdds` | User-entered | Main odds input |
| `MatchStrategy` | User-entered | `Standard`, `Underlay`, `Overlay`, `Custom`, `No Lay`, `Partial Lay` |
| `LayOdds1` | User-entered | Lay odds |
| `BetRetention%` | Derived | Retention helper |
| `Exchange` | User-entered | Exchange name |
| `Lay (Actual)` | Override | Actual lay override |
| `LayMatchedStake1` | User-entered/override | Part-laid tracking |
| `FinalNetPnL` | Override | Final override |
| `OriginQualBetID` | User-entered/link | Linked qualifying bet |
| `OfferGroupID` | User-entered/link | Offer grouping |
| `UserNotes` | User-entered | Free-text notes |

### Derived money and status fields

| Field | Classification | Notes |
|---|---|---|
| `LayStake1` | Derived | Strategy and `SNR/SR` dependent |
| `LayStatus` | Derived | Lay progress |
| `Liability1` | Derived | Lay liability |
| `PnL If Bookie Wins / Outcome 1 Wins` | Derived | Scenario value |
| `PnL If Bookie Loses / No Selection Wins` | Derived | Scenario value |
| `CalcNetPnL` | Derived | Cash-first current or settled result |
| `NetPnL` | Derived/override-resolved | `FinalNetPnL` else `CalcNetPnL` |
| `LayRemainingStake1` | Derived | Unmatched residual |
| `LayCommission1` | Derived | Commission lookup |
| `CountsAsOpen` | Helper | Open-state flag |
| `IsOverdue` | Helper | Expiry-driven overdue flag |
| `DateRangeTag` | Helper | In/out of date range |
| `WeekLabel` | Helper | Week label |

## Casino Offers

| Field | Classification | Notes |
|---|---|---|
| `CasinoOfferID` | User-entered/system key | Workbook key |
| `OfferGroupID` | User-entered/link | Offer grouping |
| `DateStarted` | User-entered | Start date |
| `DateSettling` | Derived/user-entered | Often defaults to `DateStarted` |
| `ExpiryDateTime` | User-entered | Expiry monitoring |
| `Bookmaker` | User-entered | Operator/bookmaker |
| `OfferType` | User-entered | Wager, free spins, none, etc. |
| `OfferName` | User-entered | Offer label |
| `Game` | User-entered | Game/context |
| `CashStake` | User-entered | Cash input |
| `CreditAmount` | User-entered | Credit input |
| `BonusAmount` | User-entered | Bonus amount |
| `WagerMultiplier` | User-entered | Wagering requirement |
| `WagerTarget` | Derived/user-entered | Wager target |
| `Required Spins` | Derived/user-entered | Spin requirement |
| `SpinStake` | User-entered | Spin value |
| `Free Spins Awarded` | User-entered | Award count |
| `Free Spins Value` | User-entered | Award value |
| `Status` | User-entered | `Prospecting`, `Started`, `In Progress`, `Settled` |
| `Result` | User-entered | Outcome |
| `CalcNetPnL` | Derived | Current/final formula output |
| `FinalNetPnL` | Override | Final override |
| `NetPnL` | Derived/override-resolved | `FinalNetPnL` else `CalcNetPnL` |
| `CountsAsOpen` | Helper | Open-state flag |
| `IsOverdue` | Helper | Overdue flag |
| `DateRangeTag` | Helper | In/out of date range |
| `WeekLabel` | Helper | Week label |
| `UserNotes` | User-entered | Free-text notes |

## Dashboard

Key fields and controls to preserve:

- `Active Date Preset`
- `Range Back Days`
- `Range Forward Days`
- `Custom Start Date`
- `Custom End Date`
- `Base Resolved Start Date`
- `Base Resolved End Date`
- resolved start/end dates
- account quick-view values
- profit quick-view values
- bets quick-view values
- expiring free bets
- settling/open bets list

Dashboard metrics derive from ledger/helper fields, not standalone manual totals.

## Profit Tracker

The workbook `Profit Tracker` is a derived activity surface rather than a primary ledger.

It must preserve grouped selected-range visibility for:

- inherited date preset/start/end state from `Dashboard`
- sportsbook bets
- free bets
- casino offers
- cash adjustments
- account-health activity

OpenForge interpretation:

- even if the web UI later merges `Profit Tracker` and workbook `Dashboard`, these fields and summary roles still need to survive

## Reports

The workbook `Reports` sheet stores derived rollups rather than new source data.

Key report fields to preserve:

- week/month/year period value
- sportsbook P&L
- free-bet P&L
- casino P&L
- total P&L
- withdrawals
- costs and subscriptions
- retained profit

## OpenForge modelling notes

- `profile_id` must be added to every profile-owned record in the app model.
- `WeekLabel` and `DateRangeTag` should be treated as derived helpers, not authoritative source inputs.
- `FinalNetPnL` must remain separate from formula output.
- Mug-bet behaviour stays inside sportsbook modelling unless a later design decision explicitly separates the UI.
