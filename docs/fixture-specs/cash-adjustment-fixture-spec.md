# Fixture Spec: Cash Adjustment Aggregation

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/cash-adjustment-aggregation-contract.md`

## Purpose

Define the synthetic cash-adjustment cases needed to prove signed values, date-range inclusion, weekly grouping, and selected dashboard/report aggregates.

## Fixture cases

### `CA-001` Top-up cash in

Purpose:

- prove incoming adjustment remains positive

Inputs:

```yaml
profile_id: PROFILE-001
record_id: CA-001
adjustment_date: 2026-07-01
direction: In
amount: 50.00
adjustment_type: TopUp
```

Expected assertions:

- `signed_amount = 50.00`

### `CA-002` Withdrawal cash out

Purpose:

- prove outgoing adjustment is negative

Inputs:

```yaml
profile_id: PROFILE-001
record_id: CA-002
adjustment_date: 2026-07-02
direction: Out
amount: 30.00
adjustment_type: Withdrawal
```

Expected assertions:

- `signed_amount = -30.00`

### `CA-003` In-range dashboard cash-adjustment set

Purpose:

- prove dashboard selected adjustment sum uses selected types only

Inputs:

```yaml
resolved_start_date: 2026-07-01
resolved_end_date: 2026-07-07
rows:
  - profile_id: PROFILE-001
    record_id: CA-003-A
    adjustment_date: 2026-07-01
    direction: Out
    amount: 10.00
    adjustment_type: Deduction
  - profile_id: PROFILE-001
    record_id: CA-003-B
    adjustment_date: 2026-07-02
    direction: In
    amount: 20.00
    adjustment_type: TopUp
  - profile_id: PROFILE-001
    record_id: CA-003-C
    adjustment_date: 2026-07-03
    direction: In
    amount: 15.00
    adjustment_type: Deposit
```

Expected assertions:

- dashboard selected cash adjustments include A and B
- dashboard selected cash adjustments exclude Deposit if workbook logic remains unchanged

### `CA-004` Week label grouping case

Purpose:

- prove week label derives from adjustment date

Inputs:

```yaml
profile_id: PROFILE-001
record_id: CA-004
adjustment_date: 2026-07-08
direction: Out
amount: 7.50
adjustment_type: Subscription
```

Expected assertions:

- `week_label` resolves to the correct week-commencing string

### `CA-005` Profile isolation pair

Purpose:

- prove cash-adjustment aggregates remain profile scoped

Inputs:

```yaml
rows:
  - profile_id: PROFILE-001
    record_id: CA-005-A
    adjustment_date: 2026-07-01
    direction: Out
    amount: 10.00
    adjustment_type: Withdrawal
  - profile_id: PROFILE-002
    record_id: CA-005-B
    adjustment_date: 2026-07-01
    direction: Out
    amount: 25.00
    adjustment_type: Withdrawal
```

Expected assertions:

- each profile aggregate includes only its own signed values
