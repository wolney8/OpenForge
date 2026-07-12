# Fixture Spec: Sportsbook BOG / Best Odds Guaranteed Current Value

_Last updated: 2026-07-11_

## Contracts covered

- `docs/contracts/sportsbook-bog-current-value-contract.md`

## Purpose

Define the synthetic BOG sportsbook cases needed to prove:

- no speculative open-state uplift
- taken-price vs starting-price settlement comparison
- uplift-applied and no-uplift winning branches
- ordinary lay-win handling
- override behaviour
- profile isolation

## Shared assumptions

- currency rounded to 2 decimals
- commission represented as decimal ratio
- BOG is modelled as one sportsbook row with a later settlement comparison
- all examples are synthetic only

## Fixture cases

### `BOG-001` Open BOG row before starting price

Purpose:

- prove open BOG rows behave like ordinary sportsbook rows until settlement comparison exists

Inputs:

```yaml
profile_id: PROFILE-001
record_id: BOG-001
status: Placed
result: Pending
offer_type: BOG / Best Odds Guaranteed
bet_type: Single
fixture_type: Horse Racing
back_stake: 10.00
back_odds: 6.00
starting_price_odds: null
match_strategy: Standard
lay_odds_1: 6.20
lay_commission_1: 0.02
bog_eligible: true
date_settled: 2026-07-30
```

Expected assertions:

- open back-win and lay-win scenarios are derived
- `projected_current_pnl` equals ordinary conservative minimum
- no uplift is included

### `BOG-002` Settled back win without uplift

Purpose:

- prove a BOG row stays on taken price when starting price is not better

Inputs:

```yaml
profile_id: PROFILE-001
record_id: BOG-002
status: Settled
result: Back Won
offer_type: BOG / Best Odds Guaranteed
bet_type: Single
fixture_type: Horse Racing
back_stake: 10.00
back_odds: 7.00
starting_price_odds: 6.50
match_strategy: Standard
lay_odds_1: 7.30
lay_commission_1: 0.02
bog_eligible: true
date_settled: 2026-07-31
```

Expected assertions:

- resolved value equals `scenario_pnl_if_back_wins_taken_price`
- `bog_uplift_applied = false`

### `BOG-003` Settled back win with uplift

Purpose:

- prove a BOG row uses the better starting price when it exceeds the taken price

Inputs:

```yaml
profile_id: PROFILE-001
record_id: BOG-003
status: Settled
result: Back Won
offer_type: BOG / Best Odds Guaranteed
bet_type: Single
fixture_type: Horse Racing
back_stake: 10.00
back_odds: 5.00
starting_price_odds: 6.50
match_strategy: Standard
lay_odds_1: 5.20
lay_commission_1: 0.02
bog_eligible: true
date_settled: 2026-08-01
```

Expected assertions:

- resolved value equals `scenario_pnl_if_back_wins_bog_price`
- `bog_uplift_applied = true`

### `BOG-004` Settled lay-win row

Purpose:

- prove losing bookmaker rows do not use any BOG uplift logic

Inputs:

```yaml
profile_id: PROFILE-001
record_id: BOG-004
status: Settled
result: Lay Won
offer_type: BOG / Best Odds Guaranteed
bet_type: Single
fixture_type: Horse Racing
back_stake: 10.00
back_odds: 8.00
starting_price_odds: 9.50
match_strategy: Standard
lay_odds_1: 8.40
lay_commission_1: 0.02
bog_eligible: true
date_settled: 2026-08-02
```

Expected assertions:

- resolved value equals `scenario_pnl_if_lay_wins`
- uplift path is ignored

### `BOG-005` Void / non-runner review case

Purpose:

- freeze void/non-runner semantics for approval before implementation

Inputs:

```yaml
profile_id: PROFILE-001
record_id: BOG-005
status: Settled
result: Void
offer_type: BOG / Best Odds Guaranteed
bet_type: Single
fixture_type: Horse Racing
back_stake: 10.00
back_odds: 9.00
starting_price_odds: null
match_strategy: Standard
lay_odds_1: 9.40
lay_commission_1: 0.02
bog_eligible: true
date_settled: 2026-08-03
```

Expected assertions:

- default draft expectation is `0.00`
- fixture marked as review-required until `Void` vs `Non Runner` semantics are approved

### `BOG-006` Manual override case

Purpose:

- prove override replaces formula output and remains auditable

Inputs:

```yaml
profile_id: PROFILE-001
record_id: BOG-006
status: Settled
result: Back Won
offer_type: BOG / Best Odds Guaranteed
bet_type: Single
fixture_type: Horse Racing
back_stake: 10.00
back_odds: 6.00
starting_price_odds: 7.20
match_strategy: Standard
lay_odds_1: 6.30
lay_commission_1: 0.02
bog_eligible: true
manual_override_value: 2.25
manual_override_reason: Settlement correction after bookmaker statement review
date_settled: 2026-08-04
```

Expected assertions:

- resolved value equals `2.25`
- underlying scenarios remain calculable
- override reason required

### `BOG-007` Profile isolation pair

Purpose:

- prove BOG rows remain strictly profile scoped

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: BOG-007-A
    status: Placed
    result: Pending
    offer_type: BOG / Best Odds Guaranteed
    bet_type: Single
    fixture_type: Horse Racing
    back_stake: 10.00
    back_odds: 6.00
    starting_price_odds: null
    match_strategy: Standard
    lay_odds_1: 6.20
    lay_commission_1: 0.02
    bog_eligible: true
  - profile_id: PROFILE-002
    record_id: BOG-007-B
    status: Settled
    result: Back Won
    offer_type: BOG / Best Odds Guaranteed
    bet_type: Single
    fixture_type: Horse Racing
    back_stake: 20.00
    back_odds: 8.00
    starting_price_odds: 9.00
    match_strategy: Standard
    lay_odds_1: 8.30
    lay_commission_1: 0.02
    bog_eligible: true
```

Expected assertions:

- PROFILE-001 queries only return `BOG-007-A`
- PROFILE-002 queries only return `BOG-007-B`
