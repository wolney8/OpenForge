# Fixture Spec: Free-Bet Weekly Reporting

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/free-bet-weekly-reporting-contract.md`
- supporting dependency on `docs/contracts/free-bet-current-value-contract.md`

## Purpose

Define deterministic synthetic cases for workbook-parity weekly free-bet reporting, especially the narrower status filter that differs from generic dashboard summaries.

## Fixture cases

### `FBR-001` Placed row included in weekly report

Purpose:

- prove workbook-parity weekly reporting includes `Placed` free-bet rows

Inputs:

```yaml
profile_id: PROFILE-001
week_start_date: 2026-07-06
free_bet_rows:
  - free_bet_id: FB-001
    date_settled: 2026-07-08
    status: Placed
    net_pnl: 7.20
    final_net_pnl: null
```

Expected assertions:

- `weekly_free_bet_reporting_value = 7.20`

### `FBR-002` Settled row included in weekly report

Purpose:

- prove settled row inclusion remains active

Inputs:

```yaml
profile_id: PROFILE-001
week_start_date: 2026-07-06
free_bet_rows:
  - free_bet_id: FB-002
    date_settled: 2026-07-09
    status: Settled
    net_pnl: 5.10
```

Expected assertions:

- `weekly_free_bet_reporting_value = 5.10`

### `FBR-003` Available row excluded from weekly report

Purpose:

- prove non-reporting statuses do not leak into weekly totals

Inputs:

```yaml
profile_id: PROFILE-001
week_start_date: 2026-07-06
free_bet_rows:
  - free_bet_id: FB-003
    date_settled: 2026-07-08
    status: Available
    net_pnl: 9.99
```

Expected assertions:

- `weekly_free_bet_reporting_value = 0.00`

### `FBR-004` Final override wins over calculated net PnL

Purpose:

- prove weekly report consumes resolved row value rather than raw calculated value

Inputs:

```yaml
profile_id: PROFILE-001
week_start_date: 2026-07-06
free_bet_rows:
  - free_bet_id: FB-004
    date_settled: 2026-07-10
    status: Settled
    net_pnl: 6.25
    final_net_pnl: 5.80
```

Expected assertions:

- `weekly_free_bet_reporting_value = 5.80`

### `FBR-005` Profile isolation pair

Purpose:

- prove weekly report never mixes free-bet rows between profiles

Inputs:

```yaml
profiles:
  PROFILE-001:
    week_start_date: 2026-07-06
    free_bet_rows:
      - free_bet_id: FB-005A
        date_settled: 2026-07-08
        status: Placed
        net_pnl: 2.00
  PROFILE-002:
    week_start_date: 2026-07-06
    free_bet_rows:
      - free_bet_id: FB-005B
        date_settled: 2026-07-08
        status: Placed
        net_pnl: 8.00
```

Expected assertions:

- PROFILE-001 total excludes PROFILE-002 data
- PROFILE-002 total excludes PROFILE-001 data
