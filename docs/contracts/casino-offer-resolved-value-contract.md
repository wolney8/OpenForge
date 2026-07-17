# Calculation Contract: Casino Offer Resolved Value

_Last updated: 2026-07-16_

## Status and scope

- Application: Plum Duff
- Source sheet: `Casino Offers`
- Status: Approved parity boundary for import, display and reporting
- Deferred: complete per-offer casino calculator formulas

## Purpose

Resolve the value used by the casino ledger and reports without claiming formula coverage that the
workbook deconstruction has not established.

## Spreadsheet equivalent

`NetPnL = IF(FinalNetPnL <> "", FinalNetPnL, CalcNetPnL)`

## Inputs

- `profile_id`
- `casino_offer_id`
- `status`
- `date_started`
- `date_settling`
- `expiry_datetime`
- `calc_net_pnl`: workbook/application current reference value
- `final_net_pnl`: explicit final override

## Outputs

- `resolved_net_pnl`
- `calculation_state`
- `counts_as_open`
- `is_overdue`
- `week_label`
- calculation notes

## Formula and authority

1. Parse explicit decimal values without silent coercion.
2. If `final_net_pnl` is present, it is the resolved value.
3. Otherwise use `calc_net_pnl` as the transitional current/reference value.
4. Quantise the resolved output to `0.01` using round-half-up.
5. A prospecting row with neither value resolves to `0.00` as a placeholder, not realised profit.
6. Any other row with neither value remains incomplete.

`calc_net_pnl` is not evidence that all casino mechanics have been independently recalculated by
Plum Duff. Complete wager, free-spin and game-specific calculations require later contracts and
fixtures before replacing this transitional reference input.

## Operational helpers

- Open statuses: `Prospecting`, `Started`, `In Progress`.
- Overdue: open and `expiry_datetime` is before the review time.
- Week label uses `date_settling`, falling back to `date_started`.

## Rounding and tolerance

- Output precision: `0.01`.
- Rounding: `ROUND_HALF_UP`.
- Acceptance tolerance: exact at two decimal places.

## Required fixtures

- prospecting blank-value placeholder
- current/reference value only
- final override wins
- open expired row
- settled row not open
- profile-isolation filtering

## UI requirements

- Label `calc_net_pnl` as current value, not guaranteed profit.
- Label `final_net_pnl` as final value override.
- Show incomplete state when an active/non-placeholder row has no usable value.
- Do not imply a deeper casino calculator has run unless a later calculation contract supports it.

## Human approval

Approved for workbook-parity value resolution and import/export only. Deeper casino-offer formula
automation remains gated.

