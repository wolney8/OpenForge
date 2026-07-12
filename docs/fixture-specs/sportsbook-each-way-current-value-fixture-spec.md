# Fixture Spec: Sportsbook Each-Way Current Value

_Last updated: 2026-07-11_

## Contracts covered

- `docs/contracts/sportsbook-each-way-current-value-contract.md`

## Purpose

Define the synthetic each-way sportsbook cases needed to prove:

- two-leg win/place modelling
- conservative open-state current value
- place-only settlement handling
- void/non-runner handling
- override behaviour
- profile isolation

## Shared assumptions

- currency rounded to 2 decimals
- commission represented as decimal ratio
- each-way rows are stored as one sportsbook row with internal win/place legs
- all examples are synthetic only

## Fixture cases

### `EW-001` Open standard each-way row

Purpose:

- prove open each-way rows use the conservative minimum across win/place/unplaced scenarios

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EW-001
status: Placed
result: Pending
offer_type: Each Way
bet_type: Single
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 9.00
place_terms_numerator: 1
place_terms_denominator: 4
place_places: 4
match_strategy: Standard
win_lay_odds: 9.40
place_lay_odds: 3.20
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-07-18
```

Expected assertions:

- derived place odds are calculated
- win-lay and place-lay reference stakes are calculated
- win, place-only, and unplaced scenarios are all derived
- `projected_current_pnl = min(win, place_only, unplaced)`
- `counts_as_open = true`

### `EW-002` Settled win branch

Purpose:

- prove win settlement resolves the win-and-place branch rather than the open-state minimum

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EW-002
status: Settled
result: Win
offer_type: Each Way
bet_type: Single
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 7.00
place_terms_numerator: 1
place_terms_denominator: 5
place_places: 3
match_strategy: Standard
win_lay_odds: 7.40
place_lay_odds: 2.60
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-07-19
```

Expected assertions:

- resolved value equals `scenario_pnl_if_wins`
- no open-state minimum is used

### `EW-003` Settled place-only branch

Purpose:

- prove each-way rows support a place-only result branch

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EW-003
status: Settled
result: Placed Only
offer_type: Each Way
bet_type: Single
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 11.00
place_terms_numerator: 1
place_terms_denominator: 4
place_places: 4
match_strategy: Standard
win_lay_odds: 11.50
place_lay_odds: 3.60
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-07-20
```

Expected assertions:

- resolved value equals `scenario_pnl_if_places_only`
- stored result vocabulary must support a place-only branch before implementation

### `EW-004` Settled unplaced branch

Purpose:

- prove losing both bookmaker legs resolves to the unplaced scenario

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EW-004
status: Settled
result: Lose
offer_type: Each Way
bet_type: Single
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 13.00
place_terms_numerator: 1
place_terms_denominator: 5
place_places: 5
match_strategy: Standard
win_lay_odds: 13.50
place_lay_odds: 4.10
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-07-21
```

Expected assertions:

- resolved value equals `scenario_pnl_if_unplaced`

### `EW-005` Void / non-runner review case

Purpose:

- freeze the void/non-runner semantics for approval before implementation

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EW-005
status: Settled
result: Void
offer_type: Each Way
bet_type: Single
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 10.00
place_terms_numerator: 1
place_terms_denominator: 4
place_places: 4
match_strategy: Standard
win_lay_odds: 10.50
place_lay_odds: 3.30
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-07-22
```

Expected assertions:

- fixture marked as review-required until `Void` vs `Non Runner` semantics are approved
- default draft expectation is `0.00`

### `EW-006` Manual override case

Purpose:

- prove each-way override replaces formula output and remains auditable

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EW-006
status: Settled
result: Win
offer_type: Each Way
bet_type: Single
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 8.00
place_terms_numerator: 1
place_terms_denominator: 4
place_places: 4
match_strategy: Standard
win_lay_odds: 8.30
place_lay_odds: 2.90
win_lay_commission: 0.02
place_lay_commission: 0.02
manual_override_value: 2.15
manual_override_reason: Settlement correction after bookmaker statement review
date_settled: 2026-07-23
```

Expected assertions:

- resolved value equals `2.15`
- underlying scenarios remain calculable
- override reason required

### `EW-007` Profile isolation pair

Purpose:

- prove each-way rows remain strictly profile scoped

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: EW-007-A
    status: Placed
    result: Pending
    offer_type: Each Way
    bet_type: Single
    fixture_type: Horse Racing
    each_way_stake_per_leg: 5.00
    back_odds_win: 9.00
    place_terms_numerator: 1
    place_terms_denominator: 4
    place_places: 4
    match_strategy: Standard
    win_lay_odds: 9.20
    place_lay_odds: 3.10
    win_lay_commission: 0.02
    place_lay_commission: 0.02
  - profile_id: PROFILE-002
    record_id: EW-007-B
    status: Placed
    result: Pending
    offer_type: Each Way
    bet_type: Single
    fixture_type: Horse Racing
    each_way_stake_per_leg: 10.00
    back_odds_win: 17.00
    place_terms_numerator: 1
    place_terms_denominator: 5
    place_places: 5
    match_strategy: Standard
    win_lay_odds: 17.50
    place_lay_odds: 4.80
    win_lay_commission: 0.02
    place_lay_commission: 0.02
```

Expected assertions:

- PROFILE-001 queries only return `EW-007-A`
- PROFILE-002 queries only return `EW-007-B`
