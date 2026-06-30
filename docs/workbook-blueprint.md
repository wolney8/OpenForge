# OpenForge Workbook Blueprint

_Last updated: 2026-06-30_

## Purpose

This document records the current workbook structure that OpenForge Tracker must mirror and improve.

It is based on the current authoritative source pack and a local inspection of `_input/WO_MB_Tracker_May2026.xlsx`.

Related focused deconstruction notes:

- `docs/workbook-ledger-deconstruction-findings.md`
- `docs/workbook-targeted-findings-unresolved-areas.md`
- `docs/workbook-dashboard-settings-profit-tracker-findings.md`
- `docs/workbook-reporting-parity-findings.md`

## Scope

Included workbook surfaces:

- `Settings`
- `Reload Templates`
- `Dashboard`
- `Profit Tracker`
- `Reports`
- `Accounts`
- `Cash Adjustments`
- `Sportsbook Bets`
- `Free Bets`
- `Casino Offers`

Explicitly excluded:

- `SignupUsers`
  - sensitive
  - out of scope for tracker reconstruction
  - do not use for fixtures, schema design, or examples

Legacy/non-primary workbook surfaces:

- `Central Dashboard - KPI`
- `Profit Tracker - KPI`

These legacy KPI sheets contain broken or alternate references and must not be treated as the primary operational source.

## Workbook role

The workbook is not just a historical ledger. It is an operational tracker that combines:

- account balances
- sportsbook bet tracking
- free bet tracking
- casino offer tracking
- cash adjustments
- open and overdue monitoring
- current-value and settled-value profit views
- weekly, monthly, and yearly reports

The workbook is also cash-first. OpenForge must preserve the rule:

`What is this row worth to the bankroll right now?`

## Sheet inventory

| Sheet | Role | Primary purpose | Status |
|---|---|---|---|
| `Settings` | Configuration | Named lists, defaults, commissions, statuses, strategies, date presets | Primary |
| `Reload Templates` | Templates | Reusable reload/promotion templates | Primary support sheet |
| `Dashboard` | Operational control | Daily overview, date-range controller, cash snapshot, liability, open/overdue counts, expiring items | Primary |
| `Profit Tracker` | Activity drilldown | Selected-range recent activity across ledgers and account health | Primary |
| `Reports` | Reporting | Weekly, monthly, yearly rollups and retained profit | Primary |
| `Accounts` | Ledger/config source | Current balances, account health, pending withdrawals, metadata | Primary |
| `Cash Adjustments` | Ledger | Withdrawals, subscriptions, deductions, deposits, top-ups, corrections | Primary |
| `Sportsbook Bets` | Ledger | Qualifying bets, mug bets, advanced matched-betting rows, multi-lay rows | Primary |
| `Free Bets` | Ledger | SNR/SR free bets, expiry, lay status, current value, settlement | Primary |
| `Casino Offers` | Ledger | Casino campaign and offer outcomes | Primary |
| `Central Dashboard - KPI` | Legacy KPI | Alternate KPI surface with broken references | Non-primary |
| `Profit Tracker - KPI` | Legacy KPI | Alternate KPI surface with broken references | Non-primary |
| `SignupUsers` | Sensitive archive | Sign-up/onboarding style data | Excluded |

## Workbook architecture

The workbook is built around a small number of primary ledgers plus derived operational sheets.

Core ledgers:

- `Accounts`
- `Cash Adjustments`
- `Sportsbook Bets`
- `Free Bets`
- `Casino Offers`

Config and support:

- `Settings`
- `Reload Templates`

Derived operational/reporting surfaces:

- `Dashboard`
- `Profit Tracker`
- `Reports`

## Operational model

### `Settings`

`Settings` provides:

- named dropdown lists
- commission defaults
- date preset values
- sportsbook and free-bet strategy lists
- result lists
- account status lists
- adjustment type lists
- retention mode lists

This sheet is the main source for enum-style values that should later become controlled application values.

It must be treated as core source-of-truth infrastructure rather than a minor helper sheet, because it governs:

- valid list values used in multiple ledgers
- commission and strategy defaults
- date preset behaviour that later drives dashboard/report logic
- future settings/tooling surfaces in the web UI

Direct workbook config keys confirmed locally include:

- `DefaultDatePreset`
- `FreeBetExpiryAlertWindowDays`
- `UseGlobalDateRangeToggle`
- `ThisMonthMode`
- `DefaultMugFrequencyDays`
- `DefaultFreeBetUnderlayFactor`
- `DefaultFreeBetOverlayFactor`
- `DefaultBonusRetention%`

### `Accounts`

`Accounts` is the current balance authority.

It stores:

- account identity
- account type
- inclusion in cash totals
- current balance
- pending withdrawal amount
- status and platform metadata
- notes

The dashboard cash snapshot derives from this sheet rather than from bet rows alone.

### `Cash Adjustments`

`Cash Adjustments` records non-bet cash movement such as:

- withdrawals
- subscriptions
- deductions
- deposits
- top-ups
- corrections

It derives signed values from direction and contributes to selected-range and retained-profit reporting.

### `Sportsbook Bets`

`Sportsbook Bets` is the largest and most complex ledger.

It combines:

- standard qualifying bets
- no-lay rows
- mug bets
- custom and partial lay rows
- multi-lay rows
- open-state and settlement-state calculations

This is the main matched-betting calculation surface.

### `Free Bets`

`Free Bets` tracks:

- `SNR` and `SR`
- expiry
- free-bet availability and placement
- lay status
- current value before settlement
- final settled value

### `Casino Offers`

`Casino Offers` tracks:

- cash stake and credits
- bonus and wagering targets
- status and result
- current/final net outcome

### `Dashboard`

`Dashboard` is a workbook operational control screen, but not necessarily the direct shape of the future web UI.

It includes:

- date preset selection
- custom start and end dates
- range back and range forward day controls
- resolved start and end dates
- account balance blocks
- profit quick view
- bet quick view
- expiring free bets list
- settling/open activity list

Current user guidance:

- the spreadsheet `Dashboard` is reportedly seldom used in practice
- however, its logic still matters because it contains date-range, quick-view, liability, and cash-summary behaviour that should inform the web UI

### `Profit Tracker`

`Profit Tracker` is a selected-range drilldown page summarising recent activity across:

- sportsbook bets
- free bets
- casino offers
- cash adjustments
- account health activity

It reads its active date preset and resolved date range from `Dashboard`.

Current user guidance:

- in the spreadsheet, `Profit Tracker` is the place a spreadsheet user would most likely go to inspect P&L and related metrics
- for the web UI, this may merge with workbook `Dashboard` ideas into a more capable dashboard/tooling surface instead of remaining a separate page

### `Reports`

`Reports` produces:

- weekly P&L
- monthly P&L
- yearly P&L
- withdrawals
- costs and subscriptions
- retained profit

The workbook reporting model is layered:

- weekly rows are generated from ledger week labels and resolved row values
- monthly rows roll up weekly rows
- selected-range tracker summaries remain separate from formal week/month report periods

## Tracker rules to preserve

OpenForge must preserve these workbook behaviours:

1. The dashboard date preset resolves a live date range.
2. `Accounts[Counts In Cash Total]` controls whether balances contribute to cash snapshot totals.
3. `Cash Adjustments[SignedAmount]` is derived from direction, not typed sign.
4. `CountsAsOpen` and `IsOverdue` are calculation flags, not cosmetic labels.
5. `DateRangeTag` and `WeekLabel` are derived helper values used heavily in reporting.
6. `NetPnL` may represent current conservative value before settlement.
7. `FinalNetPnL` can override formula output.
8. Multi-lay logic exists inside sportsbook rows, not in a separate table.
9. Mug-bet/no-lay behaviour is part of sportsbook workflow, not a standalone ledger.
10. `Profit Tracker` inherits dashboard date control and should not be treated as a disconnected report.
11. Broken `.xlsx` `#REF!` validations and `__xludf.DUMMYFUNCTION(...)` wrappers are export artefacts, not intended application behaviour.
12. Formal reports are downstream from ledger calculations and do not replace selected-range tracker summaries.

## OpenForge mapping summary

Workbook to web-app module mapping:

- `Dashboard` -> Tracker dashboard tooling/state inputs and summary blocks
- `Accounts` -> Tracker accounts
- `Sportsbook Bets` -> Sportsbook/qualifying bets module
- `Free Bets` -> Free bets module
- `Casino Offers` -> Casino offers module
- `Cash Adjustments` -> Cash adjustments module
- `Profit Tracker` -> Profit and activity summary surface, likely merged into a stronger web dashboard
- `Reports` -> Reports module
- `Settings` -> controlled app settings/config source and list-definition source
- `Reload Templates` -> later template/reload support

Platform additions not in workbook:

- local login
- profile list
- profile selection
- profile-scoped routing
- cross-profile overview

## Web UI interpretation note

OpenForge should not assume a one-to-one workbook sheet-to-page mapping.

Current likely direction:

- workbook `Dashboard` logic
- workbook `Profit Tracker` metrics/activity role
- workbook `Settings` list/default logic

may combine into richer web surfaces such as:

- Fund Manager dashboard/tooling view
- profile-level dashboard/tooling view
- settings-driven forms and controls across tracker modules

The workbook remains the source of truth for behaviour and data meaning, even if the web navigation structure becomes cleaner than the spreadsheet layout.

## Source references

Primary references:

- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/FIRST_PASS_SCHEMA_REVISED_TRACKER_ONLY_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`
- `_input/WO_MB_Tracker_May2026.xlsx`
