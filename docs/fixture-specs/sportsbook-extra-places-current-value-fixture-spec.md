# Fixture Spec: Sportsbook Extra Places Current Value

_Last updated: 2026-07-11_

## Contracts covered

- `docs/contracts/sportsbook-extra-places-current-value-contract.md`

## Purpose

Define the synthetic extra-places sportsbook cases needed to prove:

- ordinary-vs-promotional place modelling
- conservative open-state current value
- extra-place-only settlement handling
- void/non-runner handling
- override behaviour
- profile isolation

## Shared assumptions

- currency rounded to 2 decimals
- commission represented as decimal ratio
- extra-places rows are stored as one sportsbook row with internal win/place legs
- all examples are synthetic only

## Fixture cases

### `XP-001` Open standard extra-places row

Purpose:

- prove open extra-places rows use the conservative minimum across win, extra-place-only, and unplaced scenarios

Inputs:

```yaml
profile_id: PROFILE-001
record_id: XP-001
status: Placed
result: Pending
offer_type: Extra Places
bet_type: Each Way
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 9.00
ordinary_place_terms_numerator: 1
ordinary_place_terms_denominator: 4
ordinary_place_count: 3
promotional_place_count: 4
match_strategy: Standard
win_lay_odds: 9.30
place_lay_odds: 3.10
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-08-05
```

Expected assertions:

- derived place odds are calculated
- ordinary and promotional place counts are both retained
- win, extra-place-only, and unplaced scenarios are derived
- `projected_current_pnl = min(win, extra_place_only, unplaced)`
- `counts_as_open = true`

### `XP-002` Settled win branch

Purpose:

- prove win settlement resolves the win branch rather than the open-state minimum

Inputs:

```yaml
profile_id: PROFILE-001
record_id: XP-002
status: Settled
result: Win
offer_type: Extra Places
bet_type: Each Way
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 7.00
ordinary_place_terms_numerator: 1
ordinary_place_terms_denominator: 5
ordinary_place_count: 3
promotional_place_count: 4
match_strategy: Standard
win_lay_odds: 7.20
place_lay_odds: 2.60
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-08-06
```

Expected assertions:

- resolved value equals `scenario_pnl_if_wins`

### `XP-003` Settled extra-place-only branch

Purpose:

- prove extra-places rows support a promotional place-only branch

Inputs:

```yaml
profile_id: PROFILE-001
record_id: XP-003
status: Settled
result: Extra Place Hit
offer_type: Extra Places
bet_type: Each Way
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 11.00
ordinary_place_terms_numerator: 1
ordinary_place_terms_denominator: 4
ordinary_place_count: 3
promotional_place_count: 4
match_strategy: Standard
win_lay_odds: 11.40
place_lay_odds: 3.50
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-08-07
```

Expected assertions:

- resolved value equals `scenario_pnl_if_hits_extra_place_only`
- stored result vocabulary must support an explicit extra-place branch before implementation

### `XP-004` Settled unplaced branch

Purpose:

- prove losing both bookmaker legs resolves to the unplaced scenario

Inputs:

```yaml
profile_id: PROFILE-001
record_id: XP-004
status: Settled
result: Lose
offer_type: Extra Places
bet_type: Each Way
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 13.00
ordinary_place_terms_numerator: 1
ordinary_place_terms_denominator: 5
ordinary_place_count: 4
promotional_place_count: 5
match_strategy: Standard
win_lay_odds: 13.40
place_lay_odds: 4.00
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-08-08
```

Expected assertions:

- resolved value equals `scenario_pnl_if_unplaced`

### `XP-005` Void / non-runner review case

Purpose:

- freeze void/non-runner semantics for approval before implementation

Inputs:

```yaml
profile_id: PROFILE-001
record_id: XP-005
status: Settled
result: Void
offer_type: Extra Places
bet_type: Each Way
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 10.00
ordinary_place_terms_numerator: 1
ordinary_place_terms_denominator: 4
ordinary_place_count: 3
promotional_place_count: 4
match_strategy: Standard
win_lay_odds: 10.20
place_lay_odds: 3.20
win_lay_commission: 0.02
place_lay_commission: 0.02
date_settled: 2026-08-09
```

Expected assertions:

- fixture marked as review-required until `Void` vs `Non Runner` semantics are approved
- default draft expectation is `0.00`

### `XP-006` Manual override case

Purpose:

- prove override replaces formula output and remains auditable

Inputs:

```yaml
profile_id: PROFILE-001
record_id: XP-006
status: Settled
result: Win
offer_type: Extra Places
bet_type: Each Way
fixture_type: Horse Racing
each_way_stake_per_leg: 5.00
back_odds_win: 8.00
ordinary_place_terms_numerator: 1
ordinary_place_terms_denominator: 4
ordinary_place_count: 3
promotional_place_count: 4
match_strategy: Standard
win_lay_odds: 8.20
place_lay_odds: 2.90
win_lay_commission: 0.02
place_lay_commission: 0.02
manual_override_value: 2.10
manual_override_reason: Settlement correction after bookmaker statement review
date_settled: 2026-08-10
```

Expected assertions:

- resolved value equals `2.10`
- underlying scenarios remain calculable
- override reason required

### `XP-007` Profile isolation pair

Purpose:

- prove extra-places rows remain strictly profile scoped

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: XP-007-A
    status: Placed
    result: Pending
    offer_type: Extra Places
    bet_type: Each Way
    fixture_type: Horse Racing
    each_way_stake_per_leg: 5.00
    back_odds_win: 9.00
    ordinary_place_terms_numerator: 1
    ordinary_place_terms_denominator: 4
    ordinary_place_count: 3
    promotional_place_count: 4
    match_strategy: Standard
    win_lay_odds: 9.20
    place_lay_odds: 3.10
    win_lay_commission: 0.02
    place_lay_commission: 0.02
  - profile_id: PROFILE-002
    record_id: XP-007-B
    status: Placed
    result: Pending
    offer_type: Extra Places
    bet_type: Each Way
    fixture_type: Horse Racing
    each_way_stake_per_leg: 10.00
    back_odds_win: 15.00
    ordinary_place_terms_numerator: 1
    ordinary_place_terms_denominator: 5
    ordinary_place_count: 4
    promotional_place_count: 5
    match_strategy: Standard
    win_lay_odds: 15.40
    place_lay_odds: 4.50
    win_lay_commission: 0.02
    place_lay_commission: 0.02
```

Expected assertions:

- PROFILE-001 queries only return `XP-007-A`
- PROFILE-002 queries only return `XP-007-B`
