# Fixture Spec: Dashboard Selected-Range P&L

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/dashboard-selected-range-pnl-contract.md`
- supporting dependency on sportsbook, free-bet, liability, and cash-adjustment contracts

## Purpose

Define the synthetic dashboard cases needed to prove selected-range aggregation, open/overdue counts, cash snapshot logic, and profile isolation.

## Fixture cases

### `DB-001` Mixed in-range P&L aggregation

Purpose:

- prove dashboard sums module `NetPnL` values across sportsbook, free bets, and casino offers

Inputs:

```yaml
profile_id: PROFILE-001
resolved_start_date: 2026-07-01
resolved_end_date: 2026-07-07
sportsbook_rows:
  - net_pnl: -0.50
    date_settled: 2026-07-02
free_bet_rows:
  - net_pnl: 4.20
    date_settled: 2026-07-03
casino_rows:
  - net_pnl: 1.30
    date_settled: 2026-07-04
```

Expected assertions:

- `sportsbook_pnl = -0.50`
- `free_bet_pnl = 4.20`
- `casino_pnl = 1.30`
- `total_pnl = 5.00`

### `DB-002` Open-value dashboard case

Purpose:

- prove dashboard can include unresolved current conservative row values in selected-range totals

Inputs:

```yaml
profile_id: PROFILE-001
resolved_start_date: 2026-07-01
resolved_end_date: 2026-07-07
sportsbook_rows:
  - net_pnl: -0.42
    status: Placed
    result: Pending
    date_settled: 2026-07-05
```

Expected assertions:

- dashboard includes `-0.42` in sportsbook selected-range P&L
- fixture marked as cash-first current-value parity case

### `DB-003` Open, overdue, and part-laid counts

Purpose:

- prove helper-flag based counts drive dashboard operational metrics

Inputs:

```yaml
profile_id: PROFILE-001
sportsbook_rows:
  - counts_as_open: true
    is_overdue: false
    lay_status: Fully Laid
    date_range_tag: In Date Range
  - counts_as_open: true
    is_overdue: true
    lay_status: Part Laid
    date_range_tag: In Date Range
free_bet_rows:
  - counts_as_open: true
    is_overdue: false
    lay_status: Part Laid
    date_range_tag: In Date Range
casino_rows:
  - counts_as_open: false
    is_overdue: false
```

Expected assertions:

- `open_bet_count = 3`
- `overdue_bet_count = 1`
- `part_laid_count = 2`

### `DB-004` Account cash snapshot case

Purpose:

- prove account balances only contribute when `counts_in_cash_total = true`

Inputs:

```yaml
profile_id: PROFILE-001
account_rows:
  - type: Bookie
    current_balance: 100.00
    pending_withdrawal_amount: 0.00
    counts_in_cash_total: true
  - type: Exchange
    current_balance: 40.00
    pending_withdrawal_amount: 0.00
    counts_in_cash_total: true
  - type: Bank
    current_balance: 200.00
    pending_withdrawal_amount: 10.00
    counts_in_cash_total: true
  - type: Bookie
    current_balance: 999.00
    pending_withdrawal_amount: 0.00
    counts_in_cash_total: false
```

Expected assertions:

- excluded account does not affect balances
- pending withdrawals sum from included accounts only
- cash snapshot uses included accounts only

### `DB-005` Profile isolation dashboard pair

Purpose:

- prove dashboard summaries remain scoped to the selected profile

Inputs:

```yaml
profiles:
  PROFILE-001:
    sportsbook_rows:
      - net_pnl: 1.00
        date_settled: 2026-07-02
  PROFILE-002:
    sportsbook_rows:
      - net_pnl: 9.00
        date_settled: 2026-07-02
```

Expected assertions:

- PROFILE-001 dashboard total excludes PROFILE-002 data
- PROFILE-002 dashboard total excludes PROFILE-001 data
