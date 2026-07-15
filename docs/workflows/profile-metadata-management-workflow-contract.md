# Workflow Contract: Profile Metadata Management

_Last updated: 2026-07-15_

## Status and scope

- Status: Approved first-pass behaviour
- User: Fund Manager only
- Entry point: `/profiles` profile details drawer
- Profile scoped: Yes; every update requires one explicit `profile_id`

## Editable MVP fields

- subscriber/profile display name
- operational status
- management fee percentage
- investment fee percentage

Every successful update is persisted immediately and writes a before/after profile audit record.
No edit changes tracker rows, settled values, cash snapshots, or historical fee-period snapshots.

## Status authority

| Status | Meaning |
|---|---|
| `Active` | Onboarding complete and currently managed |
| `Pending` | Waiting for documentation, funding, verification, or initial setup |
| `Inactive` | Not currently managed; operational work should not normally be added |
| `Paused` | Temporary Fund Manager hold while retaining an expected return to activity |
| `Archived` | Historical profile retained for audit/reporting; later enforcement should make it read-only |

Detailed pending or inactive reasons must become separate fields later rather than new ambiguous
status strings.

## Fee rules

- Percentages use percentage points: `40.00` means `40%`.
- Each fee must be between `0` and `100`, inclusive.
- Management and investment fees combined must not exceed `100`.
- Editing a percentage changes the current profile setting only. It must not rewrite locked or
  crystallised historical fee periods.
- Fee calculation remains governed by
  `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`.

## Interaction rules

1. Select the edit icon for one field.
2. Edit one value using an appropriate text, status, or numeric control.
3. Autosave when the inline control loses focus or the Fund Manager presses Enter.
4. Escape abandons the pending keyboard edit without persistence.
5. Keep the drawer open and display the returned persisted value.
6. Show API validation failures beside the profile details without discarding the entered value.

## Future fields

Address, phone, onboarding evidence, weekly targets, strategy aggressiveness, mug-bet frequency,
investment start date, and subscriber-access permissions are deferred. They require explicit data
classification, visibility, validation, and audit decisions before implementation.

## Tests

- update name and status for one profile without changing another
- update each fee independently
- reject combined fees above `100`
- cancel creates no change
- successful update creates one audit record
- subscriber-facing routes cannot invoke Fund Manager metadata updates
