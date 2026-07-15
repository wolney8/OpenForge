# Fixture Spec: Cross-Profile Reporting

_Last updated: 2026-07-15_

## Contract covered

- `docs/contracts/cross-profile-reporting-contract.md`

## Fixture source

- `tests/fixtures/cross-profile-reporting-fixtures.json`
- All identities and values are synthetic.

## Cases

### `CPR-001` Two-profile selected-range comparison

- Aggregate one positive and one negative profile without losing profile rows.
- Keep open current value separate from settled final value.
- Sum cash snapshot, open positions, overdue rows, expiring free bets, and liability.

### `CPR-002` Category and bookmaker grouping

- Sum matching bookmaker names across profiles.
- Keep sportsbook, free-bet, casino, and cash-adjustment categories separate.
- Preserve bookmaker open-position counts.

### `CPR-003` Formal period aggregation

- Group matching weekly and monthly `periodKey` values.
- Preserve signed withdrawals and costs.
- Recompute combined total P&L and retained profit from the aggregated components.

### `CPR-004` Failed profile visibility

- A failed profile load must be listed as a load error.
- It must not be represented as a successful zero-value summary.

### `CPR-005` Balance snapshot isolation

- Snapshot rows retain profile ownership and optional profile-owned account references.
- Cross-profile account references are rejected.
- Snapshot amounts do not alter current cash snapshot, P&amp;L, or retained profit.

### `CPR-006` Profile inclusion selection

- All available profiles are selected by default.
- Excluding `PROFILE-002` removes its values from every combined output.
- The final selected profile cannot be deselected.
- Restoring all profiles restores the original deterministic totals.

## Acceptance

- Money tolerance: `0.01`.
- Counts: exact integer equality.
- Profile ids and labels: exact equality.
- No real workbook identities or operational data.
