# OpenForge Workbook Settings, Dashboard and Profit Tracker Findings

_Last updated: 2026-06-30_

## Purpose

This document records a direct workbook-inspection pass over the non-ledger surfaces that shape day-to-day use of the tracker:

- `Settings`
- `Dashboard`
- `Profit Tracker`

The goal is to preserve the spreadsheet's operational control flow without assuming the future web UI must copy the workbook layout exactly.

## Sources checked

- `_input/WO_MB_Tracker_May2026.xlsx`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/FIRST_PASS_SCHEMA_REVISED_TRACKER_ONLY_MAY2026.md`

## 1. Settings is operational infrastructure, not a passive lookup sheet

### Confirmed workbook config keys

The workbook stores explicit configuration keys in `Settings`, including:

- `DefaultDatePreset`
- `FreeBetExpiryAlertWindowDays`
- `UseGlobalDateRangeToggle`
- `ThisMonthMode`
- `DefaultMugFrequencyDays`
- `DefaultFreeBetUnderlayFactor`
- `DefaultFreeBetOverlayFactor`
- `DefaultBonusRetention%`

### Confirmed named ranges

Named ranges confirmed directly from the workbook include:

- `DatePresetList`
- `BookmakerList`
- `ActiveBookmakers`
- `ActiveExchanges`
- `CommissionDefaults`
- `AccountTypeList`
- `StatusList_Account`
- `BetTypeList`
- `FixtureTypeList`
- `OfferTypeList`
- `SportsbookStatusList`
- `OfferNameList`
- `CasinoStatusList`
- `AdjustmentTypeList`
- `DirectionList`
- `ResultList`
- `FreeBetRetentionModeList`
- `EPStatusList`
- `OutcomeCountList`
- `DateRangeList`
- `LayStatusList`
- `MatchStrategyList`
- `MatchStrategyFreeBetsList`
- `FilteredBanksAndExchanges`

### Build implication

- OpenForge should treat `Settings` as a source document for controlled values, defaults, and alert behaviour
- future application settings should be separated into:
  - workbook-derived operational lists/defaults
  - app-specific settings introduced later with explicit approval

## 2. Dashboard is the date-range controller and quick-state surface

### Confirmed control inputs

Direct workbook inspection shows `Dashboard` drives the active range using:

- `Active Date Preset`
- `Custom Start Date`
- `Custom End Date`
- `Range Back Days`
- `Range Forward Days`
- `Base Resolved Start Date`
- `Base Resolved End Date`
- `Resolved Start Date`
- `Resolved End Date`

The key working control is the date preset in `Dashboard!D4`, validated from the workbook preset list.

### Confirmed quick-view blocks

`Dashboard` contains three summary blocks:

- account quick view
  - bookie balances
  - exchange balances
  - bank balances
  - pending withdrawals
  - cash snapshot
- profit quick view
  - sportsbook PnL
  - free-bet PnL
  - casino PnL
  - gross PnL
- bet quick view
  - unsettled bets
  - overdue bets
  - part-laid bets
  - current exchange exposure
  - deductions

### Confirmed operational lists

`Dashboard` also includes:

- expiring free-bets list
- settling/open activity list combined from sportsbook and free bets

### Build implication

- workbook `Dashboard` is a control-and-alert surface more than a full drilldown page
- the future web route can merge this role with profit-review tooling, but the date-range controller and alert blocks must survive

## 3. Profit Tracker is the actual recent-activity drilldown

### Confirmed range dependency

`Profit Tracker` does not define its own independent date range. It reads:

- `Date Preset` from `Dashboard!D4`
- `Start Date` from `Dashboard!H6`
- `End Date` from `Dashboard!H7`

This means workbook profit review is downstream from dashboard date control.

### Confirmed summary metrics

`Profit Tracker` contains summary rows for:

- sportsbook PnL
- free-bet PnL
- casino PnL
- gross betting PnL
- top ups
- costs
- withdrawals
- account earning percentage share
- account PnL
- total profit
- costs and subscriptions
- retained profit

### Confirmed activity blocks

The sheet includes separate recent-activity blocks for:

- sportsbook bet settling/activity
- free-bet settling/expiring activity
- casino activity
- cash adjustments
- account health activity

### Account health finding

The account-health block is not generic. It derives bookmaker-health cues from sportsbook activity, including:

- last offer activity
- last mug bet
- days since mug bet
- suggested action
- last offer type
- last offer name
- last offer result

The threshold for mug-bet recency is driven by `Settings`.

### Build implication

- workbook `Profit Tracker` is the primary explanation surface for "what changed"
- if the web UI combines dashboard and profit tracker, it still needs:
  - top-line metrics
  - recent-activity breakdowns
  - account-health tooling

## 4. Export artefacts exist and must not be mistaken for design intent

### Direct workbook inspection findings

The `.xlsx` export contains:

- many ledger data validations showing `#REF!`
- `__xludf.DUMMYFUNCTION(...)` wrappers around Google Sheets dynamic-array formulas

### Interpretation

- these are export/interoperability artefacts
- they do not mean the workbook lacked dropdowns or dynamic list logic in its live Google Sheets form
- current source-pack documentation and direct formula intent should be used to reconstruct behaviour, not the broken exported validation references alone

### Build implication

- OpenForge should reconstruct controlled values from the named ranges and source-pack documentation
- it should not copy broken `#REF!` validation state into the application model

## 5. UI design implications now clarified

The workbook evidence supports the user's stated direction:

- workbook `Dashboard` is important for control, alerts, and date state
- workbook `Profit Tracker` is the real PnL-and-activity review surface
- workbook `Settings` is the hidden dependency that powers both

For OpenForge, this supports a future tracker UI where:

- dashboard becomes a stronger tooling and metrics surface
- profit-review behaviour remains easy to reach and explain
- settings/list definitions are preserved centrally
- sportsbook, free-bet, and casino ledgers remain the daily operational inputs

## Recommended next deconstruction uses

- extend import/export mapping with dashboard-controlled date-range dependencies
- draft report parity notes around retained profit, withdrawals, and costs/subscriptions
- capture account-health logic as an explicit workflow or calculation contract later
- keep `SignupUsers` excluded from all tracker architecture and fixtures
