# Fixture Spec: Liability And Exposure

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/liability-exposure-contract.md`

## Purpose

Define the synthetic cases needed to prove per-row liability and profile-scoped current exposure aggregation.

## Fixture cases

### `LE-001` Single-branch sportsbook liability

Purpose:

- prove row liability matches lay stake and lay odds

Inputs:

```yaml
profile_id: PROFILE-001
row_type: sportsbook
record_id: LE-001
status: Placed
counts_as_open: true
lay_stake_1: 9.52
lay_odds_1: 2.10
```

Expected assertions:

- `liability_1 = round(9.52 * 1.10, 2)`

### `LE-002` Free-bet liability

Purpose:

- prove free-bet lay liability uses same row formula

Inputs:

```yaml
profile_id: PROFILE-001
row_type: free_bet
record_id: LE-002
status: Placed
counts_as_open: true
lay_stake_1: 8.33
lay_odds_1: 5.00
```

Expected assertions:

- `liability_1 = round(8.33 * 4.00, 2)`

### `LE-003` Open aggregate baseline

Purpose:

- prove profile current liability includes open sportsbook/free-bet first-liability branches only

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    row_type: sportsbook
    counts_as_open: true
    liability_1: 10.47
  - profile_id: PROFILE-001
    row_type: free_bet
    counts_as_open: true
    liability_1: 7.20
  - profile_id: PROFILE-001
    row_type: sportsbook
    counts_as_open: false
    liability_1: 9.10
```

Expected assertions:

- `profile_current_liability = 17.67`
- settled/not-open row excluded

### `LE-004` Multi-lay review case

Purpose:

- freeze the workbook-vs-improved-dashboard exposure decision

Inputs:

```yaml
profile_id: PROFILE-001
row_type: sportsbook
record_id: LE-004
counts_as_open: true
liability_1: 12.00
liability_2: 9.50
liability_3: 0.00
```

Expected assertions:

- row total liability can be derived as `21.50`
- dashboard baseline currently uses `liability_1` only until approved otherwise

### `LE-005` Profile isolation exposure pair

Purpose:

- prove liability aggregate is profile scoped

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    row_type: sportsbook
    counts_as_open: true
    liability_1: 10.00
  - profile_id: PROFILE-002
    row_type: sportsbook
    counts_as_open: true
    liability_1: 20.00
```

Expected assertions:

- PROFILE-001 current liability = `10.00`
- PROFILE-002 current liability = `20.00`
