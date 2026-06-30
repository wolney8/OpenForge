# Fixture Spec: Sportsbook Current Value

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/sportsbook-current-value-contract.md`

## Purpose

Define the synthetic sportsbook cases needed to prove cash-first current value, settlement handling, override behaviour, and profile isolation.

## Shared assumptions

- currency rounded to 2 decimals
- commission represented as decimal ratio
- all examples are synthetic only

## Fixture cases

### `SB-001` Standard open qualifying bet

Purpose:

- prove open sportsbook rows use conservative current value

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-001
status: Placed
result: Pending
offer_type: Sign up / Welcome
bet_type: Single
back_stake: 10.00
back_odds: 2.00
match_strategy: Standard
lay_odds_1: 2.10
lay_commission_1: 0.02
lay_actual: null
date_settled: 2026-07-03
```

Expected assertions:

- standard lay stake is derived
- liability 1 is derived
- bookie-win scenario is derived
- lay-win scenario is derived
- `projected_current_pnl = min(bookie_win_scenario, lay_win_scenario)`
- `counts_as_open = true`
- `is_overdue = false` if tested before `2026-07-03`

### `SB-002` Settled back-win row

Purpose:

- prove settled sportsbook rows resolve by result rather than open-state minimum

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-002
status: Settled
result: Back Won
offer_type: Sign up / Welcome
bet_type: Single
back_stake: 10.00
back_odds: 2.20
match_strategy: Standard
lay_odds_1: 2.30
lay_commission_1: 0.02
date_settled: 2026-07-04
```

Expected assertions:

- resolved `NetPnL` equals bookie-win scenario
- row does not use open-state `MIN(...)`
- `counts_as_open = false`

### `SB-003` Settled lay-win row

Purpose:

- prove settled lay/no-selection path uses lay-win scenario

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-003
status: Settled
result: Lay Won
offer_type: Sign up / Welcome
bet_type: Single
back_stake: 10.00
back_odds: 2.40
match_strategy: Standard
lay_odds_1: 2.50
lay_commission_1: 0.02
date_settled: 2026-07-05
```

Expected assertions:

- resolved `NetPnL` equals lay-win scenario
- no current-value minimum used

### `SB-004` Void row

Purpose:

- prove void rows resolve to zero

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-004
status: Settled
result: Void
back_stake: 12.00
back_odds: 2.10
match_strategy: Standard
lay_odds_1: 2.20
lay_commission_1: 0.02
date_settled: 2026-07-06
```

Expected assertions:

- resolved `NetPnL = 0.00`

### `SB-005` Manual override row

Purpose:

- prove final override replaces formula output and remains auditable

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-005
status: Settled
result: Back Won
back_stake: 10.00
back_odds: 2.00
match_strategy: Standard
lay_odds_1: 2.10
lay_commission_1: 0.02
manual_override_value: -0.75
manual_override_reason: Manual correction after settlement review
date_settled: 2026-07-07
```

Expected assertions:

- resolved `NetPnL = -0.75`
- underlying scenario values remain calculable
- override reason required

### `SB-006` No-lay mug-bet review case

Purpose:

- freeze the known workbook caveat for later implementation review

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-006
status: Settled
result: Back Won
offer_type: Mug Bet
bet_type: Single
back_stake: 10.00
back_odds: 3.00
match_strategy: No Lay
date_settled: 2026-07-08
```

Expected assertions:

- fixture marked as workbook-parity review case
- implementation must assert workbook-approved behaviour once final decision is locked

### `SB-007` Multilay open row

Purpose:

- prove open multi-lay rows use minimum across active scenarios

Inputs:

```yaml
profile_id: PROFILE-001
record_id: SB-007
status: Placed
result: Pending
back_stake: 10.00
back_odds: 5.00
match_strategy: Multilay
lay_odds_1: 5.20
lay_commission_1: 0.02
lay_odds_2: 5.10
lay_commission_2: 0.02
outcome_count: 2
date_settled: 2026-07-09
```

Expected assertions:

- scenario values exist for outcome 1 and lay outcome 2
- projected current value equals minimum active scenario

### `SB-008` Profile isolation pair

Purpose:

- prove same-style sportsbook rows do not leak across profiles

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: SB-008-A
    status: Placed
    result: Pending
    back_stake: 10.00
    back_odds: 2.00
    match_strategy: Standard
    lay_odds_1: 2.10
    lay_commission_1: 0.02
  - profile_id: PROFILE-002
    record_id: SB-008-B
    status: Placed
    result: Pending
    back_stake: 20.00
    back_odds: 2.00
    match_strategy: Standard
    lay_odds_1: 2.10
    lay_commission_1: 0.02
```

Expected assertions:

- PROFILE-001 queries only return `SB-008-A`
- PROFILE-002 queries only return `SB-008-B`
