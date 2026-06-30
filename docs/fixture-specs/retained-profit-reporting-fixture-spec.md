# Fixture Spec: Retained Profit Reporting

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/retained-profit-reporting-contract.md`
- supporting dependency on `docs/contracts/cash-adjustment-aggregation-contract.md`

## Purpose

Define deterministic synthetic cases for retained-profit reporting so sign handling cannot drift during implementation.

## Fixture cases

### `RPR-001` Betting PnL with no adjustments

Purpose:

- prove retained profit equals betting P&L when no relevant cash adjustments exist

Inputs:

```yaml
profile_id: PROFILE-001
period_type: weekly
period_start_date: 2026-07-06
sportsbook_period_pnl: 3.00
free_bet_period_pnl: 4.00
casino_period_pnl: 1.00
withdrawals_value: 0.00
costs_and_subscriptions_value: 0.00
```

Expected assertions:

- `total_betting_pnl = 8.00`
- `retained_profit = 8.00`

### `RPR-002` Withdrawal reduces retained profit via signed value

Purpose:

- prove signed negative withdrawals are added, not sign-flipped

Inputs:

```yaml
profile_id: PROFILE-001
period_type: weekly
period_start_date: 2026-07-06
sportsbook_period_pnl: 6.00
free_bet_period_pnl: 0.00
casino_period_pnl: 0.00
withdrawals_value: -2.50
costs_and_subscriptions_value: 0.00
```

Expected assertions:

- `retained_profit = 3.50`

### `RPR-003` Costs and subscriptions reduce retained profit

Purpose:

- prove signed negative costs are handled identically

Inputs:

```yaml
profile_id: PROFILE-001
period_type: weekly
period_start_date: 2026-07-06
sportsbook_period_pnl: 5.00
free_bet_period_pnl: 1.00
casino_period_pnl: 0.00
withdrawals_value: 0.00
costs_and_subscriptions_value: -1.75
```

Expected assertions:

- `retained_profit = 4.25`

### `RPR-004` Combined negative adjustment case

Purpose:

- prove both signed components are applied together

Inputs:

```yaml
profile_id: PROFILE-001
period_type: weekly
period_start_date: 2026-07-06
sportsbook_period_pnl: 4.00
free_bet_period_pnl: 3.00
casino_period_pnl: 1.00
withdrawals_value: -2.00
costs_and_subscriptions_value: -1.50
```

Expected assertions:

- `total_betting_pnl = 8.00`
- `retained_profit = 4.50`

### `RPR-005` Legacy Costs support case

Purpose:

- prove legacy `Costs`-style report contribution is tolerated

Inputs:

```yaml
profile_id: PROFILE-001
period_type: weekly
period_start_date: 2026-07-06
sportsbook_period_pnl: 2.00
free_bet_period_pnl: 2.00
casino_period_pnl: 1.00
withdrawals_value: 0.00
costs_and_subscriptions_value: -0.80
metadata:
  source_adjustment_types:
    - Costs
```

Expected assertions:

- `retained_profit = 4.20`
- fixture marked as legacy-report-support case
