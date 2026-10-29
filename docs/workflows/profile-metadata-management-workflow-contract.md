# Workflow Contract: Profile Metadata Management

_Last updated: 2026-07-15_

## Status and scope

- Status: Approved first-pass behaviour
- User: Fund Manager only
- Entry point: `/profiles` profile details drawer
- Profile scoped: Yes; every update requires one explicit `profile_id`

## Editable MVP fields

- subscriber/profile display name
- unique profile code
- operational status
- tracking start date
- management fee percentage
- investment fee percentage

Every successful update is persisted immediately and writes a before/after profile audit record.
No edit changes tracker rows, settled values, cash snapshots, or historical fee-period snapshots.

Profile codes use `3` to `32` uppercase letters, numbers or hyphens and must remain unique. The
stable `profile_id`, not the editable code, remains the ownership key. Tracking start dates cannot
be in the future. Editing either field is audited and must not rewrite historical rows, locked
reports or crystallised fee periods.

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
- update a unique profile code without changing `profile_id`
- update a non-future tracking start date
- reject duplicate/invalid profile codes and future tracking dates
- update each fee independently
- reject combined fees above `100`
- cancel creates no change
- successful update creates one audit record
- subscriber-facing routes cannot invoke Fund Manager metadata updates


## CP-055 economic relationship (owner approved 2026-09-26)

One persisted `profiles.profile_relationship`: `Personal`, `Managed subscriber`, or empty only for legacy/unreviewed rows and old portable backups. Never infer it from fees, lifecycle or login. New onboarding requires an explicit selection. No new access grant or applicant/contact fields.
Personal creation defaults to and requires management/investment fees 0%/0%; Managed creation requires both explicit agreed percentages, including a deliberately entered zero. Actual Exchange commission, costs, funding and ledger P&L are unchanged. Relationship/fee edits use the existing audited Profile metadata update; Personal rejects non-zero current fees, and changing to Managed requires both fee values. Immutable historical fee revisions are not rewritten.
The additive SQLite blueprint and PostgreSQL migration `20260926_007_profile_relationship` add only this field with empty legacy default. Existing financial columns/projections remain identical. Portable Profile export includes it; old backups validate their original checksums first and restore an empty/unreviewed relationship. Invalid or non-zero-fee Personal payloads reject before writes.
New-workbook setup reuses Add Profile's explicit Import path: relationship, name/code, existing tracking/start fields, fees, then review/create a new empty Profile and analyse the workbook. No implicit merge/replace or real cutover. The governed `Will — Personal` / `WILL-PERSONAL` Profile now exists with 0%/0% fees and an import review workspace; no workbook rows have been applied. An import-created Profile with no reviewed Accounts stores blank current cash (unknown), while an explicit Account-derived `£0.00` remains authoritative zero.
Independent acceptance: new Personal and explicit Managed creation, malformed/missing relationship and fees, legacy migration/retry, audited updates without historical fee changes, cross-Profile isolation, portable old/new restore and combined reporting. Browser: both creation paths, failure/retry, Cancel, persistence/reopen; themes/compact/enlarged/keyboard/reduced motion using existing controls.

### Deferred funded-account compatibility

Future onboarding and funding work must preserve three distinct states: blank/unavailable means a
value is not yet authoritative; `£0.00` is an authoritative zero; and separately governed funded
capital is neither owner starting bankroll nor P&L. A future funded Profile may therefore have an
owner starting bankroll of exactly `£0.00` while funding/advance records provide operational
capital. Do not use zero as an unknown sentinel, require starting bankroll to be greater than zero,
derive owner bankroll from external funding, or count funding injections as profit. Funding,
recovery and withdrawal rules require a separate approved financial contract before implementation.
