# OpenForge Workbook Workflow Map

_Last updated: 2026-06-30_

## Purpose

This document maps the human workflow represented by the workbook so OpenForge can preserve the operational order, not just the field names.

`SignupUsers` is excluded.

## High-level workflow

The workbook supports a repeating daily operating loop:

1. Review profit and operational state
2. Check balances and pending withdrawals
3. Review open and overdue positions
4. Enter or update sportsbook bets
5. Enter or update free bets
6. Enter or update casino offers
7. Record cash adjustments
8. Review selected-range profit/activity view
9. Review weekly/monthly reports

## Sheet-level workflow roles

### `Settings`

Workflow role:

- provides allowed values and defaults
- shapes entry consistency across ledgers
- defines lists and configuration used elsewhere in the workbook

OpenForge implication:

- `Settings` is not only a hidden support sheet
- it should inform web tooling, controlled form values, and future settings surfaces
- it also drives mug-bet cadence, free-bet expiry alerting, and default date behaviour that affect operational review

### `Accounts`

Workflow role:

- maintain current balances
- track account state
- track pending withdrawals
- provide cash-snapshot inputs

### `Sportsbook Bets`

Workflow role:

- prospect offers
- record qualifying bets and mug/no-lay bets
- enter match strategy and odds
- track lay progress
- hold current-value and final-value logic
- link to follow-on free bets

### `Free Bets`

Workflow role:

- record free-bet availability
- capture expiry
- enter usage and outcome
- compute current and final value
- link back to origin qualifying bet where relevant

### `Casino Offers`

Workflow role:

- track non-sportsbook campaign opportunities
- capture wager requirements and outcomes
- surface open/overdue casino activity

### `Cash Adjustments`

Workflow role:

- record non-bet cash movements
- support bankroll, retained-profit, and withdrawal reporting

### `Dashboard`

Workflow role:

- daily control surface
- choose date range
- resolve effective start/end dates from preset plus manual offsets
- review cash snapshot
- review P&L
- review open and overdue items
- review expiring free bets

Current user guidance:

- workbook `Dashboard` is not the main place the spreadsheet user typically goes day to day
- but its control logic and summary blocks remain important inputs to the web UI design

### `Profit Tracker`

Workflow role:

- recent selected-range activity review
- operator cross-check of what moved profit and cash state
- account-health review based on sportsbook recency and mug-bet cadence

Current user guidance:

- this is the workbook area the user is more likely to use when checking P&L and related metrics
- OpenForge may merge `Profit Tracker` and workbook `Dashboard` concepts into a single stronger dashboard-style web surface

### `Reports`

Workflow role:

- weekly summary
- monthly summary
- yearly summary
- retained-profit style rollups

## Workflow sequences to preserve

### Daily dashboard / profit review

1. Select date preset or custom range
2. Review account balances and cash snapshot
3. Review open bets and overdue items
4. Review current liability
5. Review expiring free bets
6. Review selected-range P&L totals
7. Review recent activity that explains those totals

### Sportsbook bet workflow

1. Create or locate sportsbook row
2. Enter event, offer, bookmaker, stake, odds, and match strategy
3. Enter exchange/lay odds or actual lay value
4. Check lay status and liability
5. Review current conservative value while open
6. Settle with result later
7. Apply final override only if needed and explain it in notes
8. Link resulting free bet if applicable

### Free-bet workflow

1. Create or locate free-bet row
2. Record availability, expiry, retention mode, and amount
3. Enter back/lay values and strategy
4. Review current conservative value while open
5. Track overdue state from expiry
6. Settle later and preserve final value separately

### Casino offer workflow

1. Create offer/campaign row
2. Capture stakes, credits, spins, and wagering requirements
3. Track in-progress state
4. Settle or close with final outcome

### Cash adjustment workflow

1. Record date, direction, amount, and type
2. Link account if needed
3. Let workbook derive signed reporting value
4. Allow reporting and retained-profit rollups to consume it

### Reporting workflow

1. Dashboard or report sheet derives a selected range
2. Ledgers contribute `NetPnL` or `SignedAmount`
3. Weekly/monthly/yearly rollups group by `WeekLabel` and date
4. Retained profit incorporates withdrawals and costs/subscriptions
5. Weekly and monthly report views do not fully replace selected-range dashboard/profit-review views

## Cross-sheet workflow relationships

Important relationships:

- `Dashboard` depends on `Accounts`, `Sportsbook Bets`, `Free Bets`, `Casino Offers`, and `Cash Adjustments`
- `Profit Tracker` inherits the selected range from `Dashboard` and then summarises activity from the main ledgers
- `Reports` aggregates sportsbook, free-bet, casino, and cash-adjustment outputs
- `Reports` rolls month summaries from week summaries rather than jumping straight from raw ledgers for every view
- `Free Bets` can link back to `Sportsbook Bets` through origin/reference fields
- `Accounts` can reflect latest activity from sportsbook/free-bet/casino usage
- `Settings` affects both dashboard control behaviour and profit-tracker account-health logic

## OpenForge workflow implications

Required application workflows:

- local login
- profile list
- select profile
- tracker dashboard and profit/tooling review
- account balance maintenance
- sportsbook entry and settlement
- qualifying-to-free-bet transition
- free-bet entry and settlement
- casino entry and settlement
- cash adjustment entry
- report review
- profit tracker review

## Workflow risks to preserve during rebuild

- do not delay all P&L visibility until settlement if the workbook currently shows current conservative value
- do not turn cash adjustments into a hidden background mechanism; they are explicit operational entries
- do not split mug bets away from sportsbook logic prematurely
- do not make reports independent of the same ledger logic used by dashboard views
- do not treat workbook `Dashboard` and `Profit Tracker` as mandatory separate web pages if a combined dashboard/tooling surface preserves the underlying workflow better
- do not copy broken `.xlsx` validation `#REF!` artefacts as if they were intentional workflow rules
- do not assume dashboard selected-range totals and formal weekly/monthly reports always use identical inclusion rules
