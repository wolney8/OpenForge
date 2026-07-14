# Calculation Contract: Fund Manager Target Progress

_Last updated: 2026-07-14_

## Contract status

- Status: Draft, approval required before implementation
- Milestone: M12 Fund Manager Target Engine and Offer Decision Support
- Spreadsheet equivalent: no direct workbook formula; uses approved workbook-parity reporting outputs
- Profile scoped: Yes, with an explicitly separate combined-report mode

## Purpose

Measure progress against a Fund Manager-set profit target for a weekly, biweekly, monthly or custom period. This calculation describes progress and pace only; it does not recommend or place a bet.

## Inputs

| Field | Type | Required | Notes |
|---|---|---:|---|
| `target_id` | id | Yes | Stable target identity |
| `profile_id` or combined scope | id/scope | Yes | Never ambiguous |
| `period_start` / `period_end` | datetime | Yes | Europe/London display baseline unless setting changes |
| `as_of` | datetime | Yes | Deterministic clock input |
| `target_profit` | money | Yes | Must be greater than zero |
| `actual_profit` | money | Yes | Approved reporting output |
| `reporting_basis` | enum | Yes | `current_value` or `settled_final` |
| `on_track_tolerance_percent` | decimal | Yes | Explicit policy input, never hidden |

## Formula

- `remaining_profit = target_profit - actual_profit`
- `progress_percent = actual_profit / target_profit * 100`
- `period_elapsed_fraction = clamp((as_of - period_start) / (period_end - period_start), 0, 1)`
- `pace_target = target_profit * period_elapsed_fraction`
- `pace_variance = actual_profit - pace_target`
- `pace_variance_percent_of_target = pace_variance / target_profit * 100`

Status:

- `ahead` when pace variance percentage is above the positive tolerance
- `on_track` when pace variance percentage is within the inclusive tolerance band
- `behind` when pace variance percentage is below the negative tolerance
- `complete` when `actual_profit >= target_profit`

## Cash-first and reporting rules

- `current_value` mode may include conservative open-position values from upstream contracts.
- `settled_final` mode includes only approved realised reporting values.
- The UI must label the selected basis; it must not mix the two unnoticed.
- Combined scope aggregates profile-level reporting outputs, not unscoped raw rows.

## Rounding and tolerance

- Money: two decimal places for display; preserve upstream precision until final display.
- Percentages: one decimal place for display; compare using unrounded values.
- Money acceptance tolerance: exact to `0.01` after stated rounding.

## Approval gates

- Approve default tolerance band.
- Approve which reporting basis is default for target progress.
- Approve target amendment/versioning rules.
- Approve whether negative prior-period carry affects a new target.

