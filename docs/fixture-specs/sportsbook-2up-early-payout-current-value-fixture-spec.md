# Fixture Spec: Sportsbook 2UP / Early Payout Current Value

_Last updated: 2026-07-11_

## Contracts covered

- `docs/contracts/sportsbook-2up-early-payout-current-value-contract.md`

## Purpose

Define the synthetic 2UP / early-payout sportsbook cases needed to prove:

- no speculative pre-trigger value
- explicit trigger-state handling
- post-trigger conservative current value
- final hold vs reversal settlement
- override behaviour
- profile isolation

## Shared assumptions

- currency rounded to 2 decimals
- commission represented as decimal ratio
- early payout is modelled as one sportsbook row with a trigger state
- all examples are synthetic only

## Fixture cases

### `EP-001` Open row before trigger

Purpose:

- prove 2UP rows behave like ordinary sportsbook rows before the trigger is hit

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EP-001
status: Placed
result: Pending
offer_type: 2UP / Early Payout
bet_type: Single
back_stake: 10.00
back_odds: 3.50
match_strategy: Standard
lay_odds_1: 3.70
lay_commission_1: 0.02
early_payout_trigger_hit: false
date_settled: 2026-07-24
```

Expected assertions:

- ordinary back-win and lay-win scenarios are derived
- `projected_current_pnl` equals the ordinary conservative minimum
- no early-payout uplift or trigger value is included

### `EP-002` Open row after trigger hit

Purpose:

- prove post-trigger rows change current-value mode without requiring final settlement yet

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EP-002
status: Placed
result: Pending
offer_type: 2UP / Early Payout
bet_type: Single
back_stake: 10.00
back_odds: 4.20
match_strategy: Standard
lay_odds_1: 4.40
lay_commission_1: 0.02
early_payout_trigger_hit: true
early_payout_triggered_at: 2026-07-24T20:11:00
early_payout_branch_state: Triggered Awaiting Match Result
date_settled: 2026-07-24
```

Expected assertions:

- triggered-state scenarios are derived
- `projected_current_pnl` uses triggered-state minimum, not ordinary pre-trigger minimum
- row remains open until final result is resolved

### `EP-003` Settled row where early payout holds

Purpose:

- prove final value resolves correctly when the trigger hits and the original side still wins

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EP-003
status: Settled
result: Early Payout Held
offer_type: 2UP / Early Payout
bet_type: Single
back_stake: 10.00
back_odds: 3.80
match_strategy: Standard
lay_odds_1: 4.00
lay_commission_1: 0.02
early_payout_trigger_hit: true
early_payout_triggered_at: 2026-07-25T18:33:00
early_payout_branch_state: Triggered Confirmed
date_settled: 2026-07-25
```

Expected assertions:

- resolved value equals `scenario_pnl_if_early_payout_holds`
- stored result vocabulary must support an explicit held/confirmed branch before implementation

### `EP-004` Settled row where early payout reverses

Purpose:

- prove final value resolves correctly when the trigger hits but the match later turns around

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EP-004
status: Settled
result: Early Payout Reversed
offer_type: 2UP / Early Payout
bet_type: Single
back_stake: 10.00
back_odds: 5.00
match_strategy: Standard
lay_odds_1: 5.30
lay_commission_1: 0.02
early_payout_trigger_hit: true
early_payout_triggered_at: 2026-07-26T16:02:00
early_payout_branch_state: Triggered Reversed
date_settled: 2026-07-26
```

Expected assertions:

- resolved value equals `scenario_pnl_if_early_payout_reverses`
- stored result vocabulary must support an explicit reversed branch before implementation

### `EP-005` Void review case

Purpose:

- freeze void semantics for approval before implementation

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EP-005
status: Settled
result: Void
offer_type: 2UP / Early Payout
bet_type: Single
back_stake: 10.00
back_odds: 3.20
match_strategy: Standard
lay_odds_1: 3.40
lay_commission_1: 0.02
early_payout_trigger_hit: false
date_settled: 2026-07-27
```

Expected assertions:

- default draft expectation is `0.00`
- fixture marked as review-required until void behaviour is approved

### `EP-006` Manual override case

Purpose:

- prove override replaces formula output and remains auditable

Inputs:

```yaml
profile_id: PROFILE-001
record_id: EP-006
status: Settled
result: Early Payout Held
offer_type: 2UP / Early Payout
bet_type: Single
back_stake: 10.00
back_odds: 4.50
match_strategy: Standard
lay_odds_1: 4.80
lay_commission_1: 0.02
early_payout_trigger_hit: true
early_payout_triggered_at: 2026-07-28T19:45:00
early_payout_branch_state: Triggered Confirmed
manual_override_value: 1.60
manual_override_reason: Final settlement correction after bookmaker statement review
date_settled: 2026-07-28
```

Expected assertions:

- resolved value equals `1.60`
- underlying scenarios remain calculable
- override reason required

### `EP-007` Profile isolation pair

Purpose:

- prove early-payout rows remain strictly profile scoped

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: EP-007-A
    status: Placed
    result: Pending
    offer_type: 2UP / Early Payout
    bet_type: Single
    back_stake: 10.00
    back_odds: 3.50
    match_strategy: Standard
    lay_odds_1: 3.70
    lay_commission_1: 0.02
    early_payout_trigger_hit: false
  - profile_id: PROFILE-002
    record_id: EP-007-B
    status: Placed
    result: Pending
    offer_type: 2UP / Early Payout
    bet_type: Single
    back_stake: 20.00
    back_odds: 5.50
    match_strategy: Standard
    lay_odds_1: 5.80
    lay_commission_1: 0.02
    early_payout_trigger_hit: true
    early_payout_triggered_at: 2026-07-29T20:00:00
    early_payout_branch_state: Triggered Awaiting Match Result
```

Expected assertions:

- PROFILE-001 queries only return `EP-007-A`
- PROFILE-002 queries only return `EP-007-B`
