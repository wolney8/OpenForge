# Fixture Spec: Sportsbook Multi-Fixture, Outright and Long-Duration Offers

_Last updated: 2026-08-21_

## Purpose

Define synthetic sportsbook scenarios that are not standard single-fixture rows.

## Required cases

| Case ID | Scenario | Expected |
|---|---|---|
| SMFO-001 | Multi-fixture weekly goals boost | Bet setup stores multiple fixture labels and remains open until final fixture completes |
| SMFO-002 | Season outright | Start date and expected finish are tracked without false overdue state |
| SMFO-003 | Golf outright with estimated finish only | Row stays open until estimated finish passes |
| SMFO-004 | Multi-leg accumulator | Legs remain visible and reporting still treats the row as one sportsbook record |
| SMFO-005 | Delayed bookmaker settlement after event finish | Issue view highlights unsettled state without losing the original event context |

## Notes

- Use synthetic competitions and teams only.
- Calculation fixtures remain separate; this fixture spec is workflow/reporting-oriented first.
