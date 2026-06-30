# Fixture Spec: Free Bet Current Value

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/free-bet-current-value-contract.md`

## Purpose

Define the synthetic free-bet cases needed to prove `SNR/SR`, current-value minimum behaviour, settlement handling, expiry handling, and profile isolation.

## Fixture cases

### `FB-001` Open `SNR` standard case

Purpose:

- prove open `SNR` free bets use minimum scenario value

Inputs:

```yaml
profile_id: PROFILE-001
record_id: FB-001
status: Placed
result: Pending
retention_mode: SNR
free_bet_value: 10.00
back_odds: 5.00
match_strategy: Standard
lay_odds_1: 5.20
lay_commission_1: 0.02
expiry_datetime: 2026-07-10T18:00:00
date_settled: 2026-07-10
```

Expected assertions:

- `SNR` lay stake formula used
- back-win and lay-win scenarios derived
- `CalcNetPnL = min(back_win_scenario, lay_win_scenario)`
- `counts_as_open = true`

### `FB-002` Open `SR` standard case

Purpose:

- prove `SR` uses different lay stake and back-win logic from `SNR`

Inputs:

```yaml
profile_id: PROFILE-001
record_id: FB-002
status: Placed
result: Pending
retention_mode: SR
free_bet_value: 10.00
back_odds: 5.00
match_strategy: Standard
lay_odds_1: 5.20
lay_commission_1: 0.02
expiry_datetime: 2026-07-11T18:00:00
date_settled: 2026-07-11
```

Expected assertions:

- `SR` lay stake formula used
- result differs from equivalent `SNR` case
- `CalcNetPnL = min(back_win_scenario, lay_win_scenario)`

### `FB-003` Settled back-win `SNR`

Purpose:

- prove settled `SNR` back-win path resolves correctly

Inputs:

```yaml
profile_id: PROFILE-001
record_id: FB-003
status: Settled
result: Back Won
retention_mode: SNR
free_bet_value: 5.00
back_odds: 6.00
match_strategy: Standard
lay_odds_1: 6.20
lay_commission_1: 0.02
date_settled: 2026-07-12
```

Expected assertions:

- resolved `NetPnL` equals `SNR` back-win scenario
- does not use open-state minimum

### `FB-004` Settled lay-win `SR`

Purpose:

- prove settled `SR` lay-win path resolves correctly

Inputs:

```yaml
profile_id: PROFILE-001
record_id: FB-004
status: Settled
result: Lay Won
retention_mode: SR
free_bet_value: 5.00
back_odds: 4.50
match_strategy: Standard
lay_odds_1: 4.70
lay_commission_1: 0.02
date_settled: 2026-07-13
```

Expected assertions:

- resolved `NetPnL` equals lay-win scenario

### `FB-005` Open overdue free bet

Purpose:

- prove overdue logic follows expiry while row remains open

Inputs:

```yaml
profile_id: PROFILE-001
record_id: FB-005
status: Available
result: Pending
retention_mode: SNR
free_bet_value: 5.00
back_odds: 4.00
match_strategy: No Lay
expiry_datetime: 2026-07-01T09:00:00
date_settled: 2026-07-02
```

Expected assertions:

- `counts_as_open = true`
- `is_overdue = true` when evaluated after expiry

### `FB-006` Manual override case

Purpose:

- prove free-bet override replaces formula output

Inputs:

```yaml
profile_id: PROFILE-001
record_id: FB-006
status: Settled
result: Back Won
retention_mode: SR
free_bet_value: 10.00
back_odds: 3.50
match_strategy: Standard
lay_odds_1: 3.70
lay_commission_1: 0.02
manual_override_value: 4.20
manual_override_reason: Final settlement correction
date_settled: 2026-07-14
```

Expected assertions:

- resolved `NetPnL = 4.20`
- override reason required

### `FB-007` Profile isolation pair

Purpose:

- prove free-bet rows remain scoped per profile

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: FB-007-A
    status: Placed
    result: Pending
    retention_mode: SNR
    free_bet_value: 10.00
    back_odds: 5.00
    match_strategy: Standard
    lay_odds_1: 5.20
    lay_commission_1: 0.02
  - profile_id: PROFILE-002
    record_id: FB-007-B
    status: Placed
    result: Pending
    retention_mode: SR
    free_bet_value: 8.00
    back_odds: 4.00
    match_strategy: Standard
    lay_odds_1: 4.10
    lay_commission_1: 0.02
```

Expected assertions:

- each profile sees only its own row
