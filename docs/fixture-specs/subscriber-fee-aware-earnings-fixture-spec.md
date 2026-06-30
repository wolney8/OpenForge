# Fixture Spec: Subscriber Fee-Aware Earnings

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/subscriber-fee-aware-earnings-contract.md`

## Purpose

Define deterministic synthetic cases for later subscriber-facing fee-aware earnings outputs.

## Fixture cases

### `SFE-001` Managed subscriber base fee case

Purpose:

- prove percentage-point fee semantics for a managed subscriber-facing earnings view

Inputs:

```yaml
profile_id: PROFILE-001
subscriber_access_mode: managed_subscriber_read_only
net_earnings_before_fee: 80.00
investment_fee_percent: 40.00
platform_fee_percent: 0.00
```

Expected assertions:

- `investment_fee_amount = 32.00`
- `platform_fee_amount = 0.00`
- `post_fee_earnings = 48.00`

### `SFE-002` Self-service higher investment fee case

Purpose:

- prove later self-service model can support a higher investment fee

Inputs:

```yaml
profile_id: PROFILE-010
subscriber_access_mode: subscriber_self_service
net_earnings_before_fee: 80.00
investment_fee_percent: 50.00
platform_fee_percent: 0.00
```

Expected assertions:

- `investment_fee_amount = 40.00`
- `post_fee_earnings = 40.00`

### `SFE-003` Self-service platform fee case

Purpose:

- prove platform fee can be layered on top of investment fee

Inputs:

```yaml
profile_id: PROFILE-010
subscriber_access_mode: subscriber_self_service
net_earnings_before_fee: 120.00
investment_fee_percent: 45.00
platform_fee_percent: 5.00
```

Expected assertions:

- `investment_fee_amount = 54.00`
- `platform_fee_amount = 6.00`
- `post_fee_earnings = 60.00`

### `SFE-004` Profile isolation fee case

Purpose:

- prove subscriber fee-aware earnings stay profile-scoped

Inputs:

```yaml
profiles:
  PROFILE-001:
    net_earnings_before_fee: 100.00
    investment_fee_percent: 40.00
  PROFILE-002:
    net_earnings_before_fee: 200.00
    investment_fee_percent: 20.00
```

Expected assertions:

- PROFILE-001 fee outputs exclude PROFILE-002 data
- PROFILE-002 fee outputs exclude PROFILE-001 data
