# OpenForge Phase 2 — Import/Export Planning Addendum

_Last updated: 2026-06-30_

## Purpose

This addendum extends the workbook import/export planning with the approved phase-2 profile and reporting architecture.

## Core rules

1. Every import must target one explicit `profile_id`.
2. No import may silently spread rows across profiles.
3. Workbook-shaped exports must preserve reconciliation ability without pretending helper fields are source authority.
4. Imported data must preserve enough detail to rebuild:
   - per-profile tracker views
   - per-profile reports
   - combined cross-profile analytics

## Profile metadata import/export

Profile metadata that should round-trip safely:

- `display_name`
- `profile_code`
- `email`
- `phone`
- `status`
- `tracking_start_date`
- `starting_bankroll`
- `carry_over_bankroll`
- `notes`
- `management_fee_percent`
- `investment_fee_percent`

Not part of MVP round-trip expectations:

- postal address
- extra contact-person fields

## Tracker row import rules

Must preserve:

- workbook/source row identifiers
- dates used for settlement, expiry, and reporting
- statuses
- result values
- strategy values
- overrides
- notes
- bookmaker/account references

Must not rely on imported values as authoritative when they are helper-derived:

- `WeekLabel`
- `DateRangeTag`
- dashboard-selected aggregates
- combined analytics outputs

## Reporting-safe round-tripping

Import must preserve enough information to rebuild:

- selected-range tracker summaries
- weekly report outputs
- monthly report outputs
- retained-profit outputs
- combined cross-profile analytics

Critical preserved inputs:

- `date_settled`
- `adjustment_date`
- status values
- `final_net_pnl`
- resolved cash-adjustment direction and amount
- profile fee percentages

## Fee-aware import/export rules

Fee fields are profile metadata, not row-level betting inputs.

Rules:

- import fee values as percentage-point values
- export fee values in the same semantic format
- do not flatten fee-adjusted report outputs into raw row exports without labeling them

## Combined analytics export boundary

If combined cross-profile analytics are exported later, they should be exported as report outputs, not as synthetic source rows.

That means:

- keep profile ownership visible
- keep aggregation dimensions visible
- do not emit combined analytics in a format that suggests they are original workbook tracker rows

## Import-batch audit expectations

Every import batch should be able to record:

- target `profile_id`
- source filename and source type
- mapping version
- row counts and error counts
- any skipped rows
- any unsupported legacy values such as `Costs`

## High-risk round-trip areas

- sportsbook multi-lay rows
- sportsbook DDHH rows
- no-lay mug-bet rows
- free-bet `SNR` vs `SR`
- free-bet weekly report inclusion dependencies
- legacy `Costs` reporting compatibility
- fee-aware profile reporting inputs

## Validation checklist

- imports cannot occur without a target profile
- exported workbook-shaped data distinguishes source fields from regenerated helpers
- fee fields round-trip in percentage-point semantics
- combined analytics exports remain clearly aggregate outputs
