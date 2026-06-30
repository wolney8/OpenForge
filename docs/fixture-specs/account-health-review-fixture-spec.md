# Fixture Spec: Account-Health Review

_Last updated: 2026-06-30_

## Contracts covered

- `docs/contracts/account-health-review-contract.md`

## Purpose

Define deterministic synthetic cases for bookmaker account-health review, especially mug-bet cadence and last-offer derivation.

## Fixture cases

### `AHR-001` Active account with no mug-bet history

Purpose:

- prove active account appears and derives `Never` style mug recency when no mug bet exists

Inputs:

```yaml
profile_id: PROFILE-001
default_mug_frequency_days: 14
accounts:
  - account_id: ACC-001
    account_name: Bookmaker A
    account_status: Active
sportsbook_rows:
  - bookmaker: Bookmaker A
    offer_type: Bet & Get
    offer_name: Demo Offer
    result: Lay Won
    date_settled: 2026-07-10
```

Expected assertions:

- account is included
- `last_offer_activity_at = 2026-07-10`
- `last_mug_bet_at = null`
- `days_since_mug_bet` is workbook-style `Never` equivalent

### `AHR-002` Account over mug-bet threshold

Purpose:

- prove workbook-style action prompt appears when cadence threshold is reached

Inputs:

```yaml
profile_id: PROFILE-001
today: 2026-07-20
default_mug_frequency_days: 14
accounts:
  - account_id: ACC-002
    account_name: Bookmaker B
    account_status: Active
sportsbook_rows:
  - bookmaker: Bookmaker B
    offer_type: Mug Bet
    offer_name: Mug Maintenance
    result: Back Won
    date_settled: 2026-07-01
```

Expected assertions:

- `days_since_mug_bet = 19`
- `suggested_action = Place Mug Bet`

### `AHR-003` Limited account under threshold

Purpose:

- prove limited accounts are still included and do not trigger the mug-bet prompt too early

Inputs:

```yaml
profile_id: PROFILE-001
today: 2026-07-20
default_mug_frequency_days: 14
accounts:
  - account_id: ACC-003
    account_name: Bookmaker C
    account_status: Limited
sportsbook_rows:
  - bookmaker: Bookmaker C
    offer_type: Mug Bet
    offer_name: Mug Maintenance
    result: Lay Won
    date_settled: 2026-07-15
  - bookmaker: Bookmaker C
    offer_type: Price Boost
    offer_name: Demo Boost
    result: Lay Won
    date_settled: 2026-07-18
```

Expected assertions:

- account is included
- `days_since_mug_bet = 5`
- `suggested_action` is not `Place Mug Bet`
- last non-mug offer metadata comes from the 2026-07-18 row

### `AHR-004` Inactive account excluded

Purpose:

- prove non-operational accounts do not appear in the workbook-style health list

Inputs:

```yaml
profile_id: PROFILE-001
default_mug_frequency_days: 14
accounts:
  - account_id: ACC-004
    account_name: Bookmaker D
    account_status: Closed
```

Expected assertions:

- account is excluded from the health review list

### `AHR-005` Profile isolation pair

Purpose:

- prove account-health review never reads sportsbook history from another profile

Inputs:

```yaml
profiles:
  PROFILE-001:
    default_mug_frequency_days: 14
    accounts:
      - account_id: ACC-005A
        account_name: Bookmaker E
        account_status: Active
    sportsbook_rows:
      - bookmaker: Bookmaker E
        offer_type: Bet & Get
        offer_name: Offer A
        result: Lay Won
        date_settled: 2026-07-12
  PROFILE-002:
    default_mug_frequency_days: 14
    sportsbook_rows:
      - bookmaker: Bookmaker E
        offer_type: Mug Bet
        offer_name: Offer B
        result: Back Won
        date_settled: 2026-07-19
```

Expected assertions:

- PROFILE-001 output excludes PROFILE-002 sportsbook history
- mug-bet recency for PROFILE-001 is based only on PROFILE-001 rows
