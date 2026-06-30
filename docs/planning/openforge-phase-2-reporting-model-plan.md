# OpenForge Phase 2 — Reporting Model Plan

_Last updated: 2026-06-30_

## Purpose

This document defines the reporting model boundaries that implementation must preserve.

The reporting model must support workbook parity while also supporting the approved `/profiles` combined-analytics direction.

## Reporting surfaces

### 1. Profile selected-range summaries

Primary surfaces:

- tracker dashboard
- profit tracker

Characteristics:

- driven by resolved date range
- current-state aware
- may include current conservative `NetPnL` for open positions
- operationally focused

Outputs include:

- sportsbook/free-bet/casino selected-range P&L
- total P&L
- cash snapshot
- operational balances
- open counts
- overdue counts
- current liability/exposure
- selected cash-adjustment totals
- recent activity blocks
- account-health review

### 2. Profile formal reports

Primary surface:

- `/profiles/:profileId/tracker/reports`

Characteristics:

- period-based rather than ad hoc date-range only
- weekly summaries first
- monthly rollups from weekly outputs
- retains workbook reporting semantics

Outputs include:

- weekly sportsbook/free-bet/casino totals
- weekly total P&L
- weekly withdrawals
- weekly costs/subscriptions
- weekly retained profit
- monthly rollups of the same

### 3. Combined cross-profile analytics

Primary surface:

- `/profiles`

Characteristics:

- aggregate control and analytics view
- profile-safe drilldown reporting only
- not an operational tracker replacement

Outputs include:

- combined weekly/monthly/range totals
- profile comparisons
- module/category comparisons
- bookmaker comparisons where safe
- combined open positions
- combined overdue items
- combined expiring free bets
- combined exposure/liability summaries
- fee-aware earnings views

## Reporting dimensions

MVP planning dimensions:

- date range
- week
- month
- profile
- module/category
- bookmaker
- status-derived counts

Not approved as first-class custom analytics dimensions yet:

- arbitrary ad hoc cube-style analytics beyond the workbook-derived scope

## Definitions to preserve

### Gross profit

- aggregate of betting-module P&L before fee application

### Total deductions

- cash-adjustment deductions and related negative adjustment categories included by approved report rules

### Total top-ups

- positive top-up style cash adjustments

### Net earnings before fee

- gross profit adjusted by approved non-fee report components where applicable

### Fee amounts

- management and investment fee amounts derived from percentage-point profile inputs

### Post-fee earnings

- earnings view after applying approved fee logic at the reporting layer

## Inclusion boundaries

### Selected-range profile views

- use dashboard date resolver
- remain current-state aware

### Weekly profile reports

- use formal week boundaries
- preserve free-bet weekly inclusion contract

### Monthly profile reports

- roll up weekly outputs

### Combined profile analytics

- aggregate profile-safe outputs
- do not merge operational editing contexts

## Cross-profile drilldown boundary

Allowed:

- aggregate totals
- grouped comparisons
- drilldown to owning profile summaries
- grouped bookmaker/category views where the underlying data is safe to aggregate

Not allowed:

- mixed write/edit tables across profiles
- ambiguous row ownership
- combined views that hide which profile owns the underlying operational row

## Fee-aware reporting boundary

Profile and combined reports should distinguish:

- pre-fee values
- fee amounts
- post-fee values

The UI and planning model should never collapse these into one unlabeled number.

## Route responsibilities

- `/profiles`
  - combined analytics and profile selection
- `/profiles/:profileId/tracker/dashboard`
  - profile operational current-state summary
- `/profiles/:profileId/tracker/profit-tracker`
  - profile activity and explanatory summary
- `/profiles/:profileId/tracker/reports`
  - profile formal weekly/monthly reports

Planning note:

- dashboard and profit tracker may later merge in the web UI, but the reporting roles above still need to survive

## Validation checklist

- selected-range summaries and formal reports are distinct
- weekly outputs feed monthly outputs
- fee-aware report outputs are explicitly labeled
- combined analytics remain aggregate-only, never mixed operational editing
