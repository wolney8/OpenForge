# OpenForge Phase 2 — Calculation Engine Boundaries

_Last updated: 2026-06-30_

## Purpose

This document defines the calculation-engine boundaries required before implementation starts.

The aim is to prevent OpenForge from collapsing workbook behaviour into one oversized service or into generic calculator code that loses parity.

## Engine layers

### 1. Row calculation layer

Pure functions that calculate one row at a time.

Coverage:

- sportsbook current value
- free-bet current value
- casino row net value
- cash-adjustment signed value
- row helper values such as:
  - lay status
  - counts-as-open
  - is-overdue
  - week label
  - date-range tag when context is supplied

Constraints:

- no cross-profile aggregation
- no report-period aggregation
- deterministic fixture coverage required

### 2. Selected-range aggregation layer

Pure aggregation functions for one selected profile and one resolved date range.

Coverage:

- dashboard selected-range P&L
- open counts
- overdue counts
- part-laid counts
- current liability/exposure summary
- selected cash-adjustment totals
- cash snapshot and operational balances
- profit-tracker selected-range activity summaries

Inputs:

- resolved profile context
- resolved date-range context
- already calculated/resolved row outputs

### 3. Formal reporting layer

Aggregation functions for formal report periods.

Coverage:

- weekly sportsbook totals
- weekly free-bet totals
- weekly casino totals
- weekly withdrawals
- weekly costs/subscriptions
- weekly retained profit
- monthly rollups from weekly outputs

Rules:

- preserve workbook free-bet weekly inclusion rules
- preserve workbook retained-profit sign semantics
- keep weekly outputs as the basis for monthly outputs

### 4. Cross-profile analytics layer

Read-model style aggregation across many profiles.

Coverage:

- combined weekly/monthly/range summaries
- profile breakdowns
- category/module breakdowns
- bookmaker breakdowns where safe
- combined open positions
- combined overdue counts
- combined expiring free-bet counts
- combined exposure/liability summaries
- fee-aware post-fee earnings views

Rules:

- aggregate profile-scoped outputs
- do not become a mixed operational row workflow
- preserve ability to drill back to owning profile context

## Module boundaries

Recommended module grouping:

- `row_calculations`
- `selected_range_aggregations`
- `report_aggregations`
- `cross_profile_aggregations`
- `calculation_audit_support`

Recommended subdomains:

- sportsbook
- free bets
- casino
- cash adjustments
- accounts/balances
- reports
- profile analytics

## Input/output separation

Each calculation layer should consume stable inputs from the layer below it.

Expected flow:

1. workbook-shaped source rows or persisted rows
2. row calculation outputs
3. per-profile selected-range aggregates and weekly outputs
4. monthly outputs and cross-profile outputs

No higher layer should recreate lower-layer formulas ad hoc.

## Fee-aware reporting boundary

Fee application belongs in reporting/analytics aggregation, not row-level bet calculations.

That means:

- do not inject fee logic into sportsbook/free-bet/casino row PnL calculations
- compute gross profit first
- compute deductions/top-ups/withdrawals separately
- compute fee-aware outputs at profile and combined-report levels

Recommended derived report outputs:

- gross profit
- total deductions
- total top-ups
- net earnings before fee
- management fee amount
- investment fee amount
- post-fee earnings

## Date-range boundary

Date-range resolution is a reusable support concern.

It should feed:

- dashboard selected-range aggregations
- profit-tracker selected-range views
- import/export reconciliation helpers where needed

Formal weekly/monthly reporting should not depend on the dashboard date range directly.

## Audit boundary

Calculation audit should capture:

- contract version
- input snapshot
- output snapshot
- override reason
- `profile_id`

Audit belongs alongside money-impacting row and report calculations, not just UI actions.

## Non-goals for MVP planning

- no live odds-matching engine
- no bookmaker scraping engine
- no autonomous bet-placement logic
- no general-purpose BI warehouse

## Validation checklist

- every workbook rule maps to one layer only
- fee logic is absent from row-level bet calculations
- weekly reporting is distinct from selected-range dashboard aggregation
- cross-profile analytics do not bypass profile-isolation rules
