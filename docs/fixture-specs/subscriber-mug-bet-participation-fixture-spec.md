# Fixture Spec: Subscriber Mug-Bet Participation

_Last updated: 2026-07-26_

## Contracts covered

- `docs/contracts/subscriber-mug-bet-participation-contract.md`
- `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`

## Purpose

Define deterministic synthetic cases for the later subscriber mug-bet preference, suggestion, and activity-logging workflows.

These fixtures are planning evidence only. They must be converted into automated tests when M9 subscriber access is activated.

## Global fixture rules

- all data is synthetic
- all records must be profile-scoped
- subscriber-created data must include `subscriber_user_id`
- Fund Manager review data must include reviewer identity where applicable
- no fixture may include credentials, real bookmaker accounts, real personal data, raw workbook rows, or screenshots

## Fixture cases

### `SMB-001` Preference suggestion accepted

Purpose:

- prove a subscriber can suggest mug-bet frequency/aggressiveness and a Fund Manager can accept it

Expected assertions:

- preference is scoped to `PROFILE-001`
- status moves from `submitted` to `accepted`
- Fund Manager review metadata is recorded

### `SMB-002` High-risk preference declined

Purpose:

- prove Fund Manager can decline an overly aggressive subscriber preference

Expected assertions:

- preference remains auditable
- status becomes `declined`
- Fund Manager note is required

### `SMB-003` Mug-bet suggestion approved and converted

Purpose:

- prove a subscriber suggestion does not mutate sportsbook rows until Fund Manager approval

Expected assertions:

- suggestion status becomes `converted_to_mug_bet`
- converted row is profile-scoped
- converted row source is `subscriber_suggestion`
- subscriber cannot approve their own suggestion

### `SMB-004` Mug-bet suggestion rejected for restricted account

Purpose:

- prove account-health restrictions can block a suggested mug bet

Expected assertions:

- suggestion status becomes `declined`
- no sportsbook row is created
- rejection reason is retained

### `SMB-005` Subscriber logged mug activity accepted

Purpose:

- prove subscriber-entered mug activity can be reviewed and accepted

Expected assertions:

- original subscriber stake/odds/result are retained
- reviewed activity becomes reportable only after Fund Manager acceptance
- cash result can be negative

### `SMB-006` Subscriber logged mug activity corrected by Fund Manager

Purpose:

- prove Fund Manager correction preserves original subscriber input and records the corrected value

Expected assertions:

- status becomes `corrected_by_fund_manager`
- original value is retained
- corrected value is used for reporting after review
- correction note is required

### `SMB-007` Profile mismatch blocked

Purpose:

- prove subscriber cannot submit mug activity against an unlinked profile

Expected assertions:

- write is blocked before persistence
- error code is `profile_access_denied`
- no cross-profile record is created

### `SMB-008` Locked activity requires correction route

Purpose:

- prove report-included mug activity cannot be silently edited

Expected assertions:

- direct edit is denied
- correction route is required
- original locked activity remains immutable

## Required future automated tests

- `subscriber_mug_preference_review_is_profile_scoped`
- `subscriber_mug_suggestion_conversion_requires_fund_manager`
- `subscriber_mug_activity_acceptance_controls_report_inclusion`
- `subscriber_mug_activity_correction_preserves_original_values`
- `subscriber_mug_activity_blocks_unlinked_profile`
- `subscriber_mug_activity_locked_period_requires_correction`
