# Fixture Spec: Subscriber Access Control

_Last updated: 2026-06-30_

## Contracts covered

- `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`
- `docs/contracts/subscriber-fee-aware-earnings-contract.md`

## Purpose

Define deterministic synthetic cases for later subscriber-facing access control and role-limited visibility.

## Fixture cases

### `SAC-001` Managed subscriber sees linked profile only

Purpose:

- prove managed subscriber access is restricted to explicitly linked profiles

Inputs:

```yaml
subscriber_user:
  role: managed_subscriber_read_only
  linked_profile_ids:
    - PROFILE-001
profiles:
  PROFILE-001:
    display_name: Profile One
  PROFILE-002:
    display_name: Profile Two
```

Expected assertions:

- subscriber can access PROFILE-001
- subscriber cannot access PROFILE-002

### `SAC-002` Managed subscriber edit attempt denied

Purpose:

- prove managed subscriber mode remains read-only

Inputs:

```yaml
subscriber_user:
  role: managed_subscriber_read_only
  linked_profile_ids:
    - PROFILE-001
attempted_action:
  type: update_sportsbook_bet
  profile_id: PROFILE-001
```

Expected assertions:

- action is denied
- profile remains unchanged

### `SAC-003` Self-service subscriber isolated tracker access

Purpose:

- prove self-service subscriber can access only their own isolated profile context

Inputs:

```yaml
subscriber_user:
  role: subscriber_self_service
  linked_profile_ids:
    - PROFILE-010
profiles:
  PROFILE-010:
    display_name: Self Service Profile
  PROFILE-011:
    display_name: Other Profile
```

Expected assertions:

- subscriber can access PROFILE-010
- subscriber cannot access PROFILE-011

### `SAC-004` Subscriber fee-aware view case

Purpose:

- prove later subscriber-facing earnings view can display separated gross, fee, and post-fee values

Inputs:

```yaml
profile_id: PROFILE-010
subscriber_access_mode: subscriber_self_service
gross_profit: 100.00
net_earnings_before_fee: 100.00
investment_fee_percent: 45.00
platform_fee_percent: 5.00
```

Expected assertions:

- `investment_fee_amount = 45.00`
- `platform_fee_amount = 5.00`
- `post_fee_earnings = 50.00`

### `SAC-005` Fund Manager combined visibility remains separate

Purpose:

- prove subscriber-facing role does not inherit Fund Manager combined control visibility

Inputs:

```yaml
subscriber_user:
  role: managed_subscriber_read_only
  linked_profile_ids:
    - PROFILE-001
combined_profiles_view:
  includes_profiles:
    - PROFILE-001
    - PROFILE-002
    - PROFILE-003
```

Expected assertions:

- subscriber cannot access Fund Manager combined control view
- subscriber cannot inspect PROFILE-002 or PROFILE-003 through combined analytics
