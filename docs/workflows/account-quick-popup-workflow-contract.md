# Workflow Contract: Account Quick Popup and Bookmaker Hygiene

_Last updated: 2026-08-21_

## Status

- Status: Draft
- Scope: Fund Manager profile tracker workflows
- Related planning:
  - `docs/planning/account-extra-places-fund-manager-discovery.md`
  - `docs/planning/github-contract-coverage-audit-2026-08-21.md`
- Related contracts:
  - `docs/contracts/account-health-intelligence-contract.md`
  - `docs/contracts/account-health-review-contract.md`

## Purpose

Give the Fund Manager a fast, non-disruptive way to inspect and update bookmaker/exchange account
state while working inside profile-ledger workflows.

This popup is operational. It is not a replacement for the full Accounts route.

## Entry points

- click bookmaker/exchange identity from a Sportsbook, Free Bets or Casino row
- click a quick account action from the profile tracker shell
- later: access from subscriber-safe views only where explicitly approved

## Primary user goals

- confirm or adjust current bookmaker/exchange balance
- mark promo state, restriction state or customer-service state
- see recent operational context without leaving the current workflow
- jump to a fuller account view only when deeper work is needed

## Core popup contents

- account identity and profile context
- current balance
- promotional state
- restriction state
- support/live-chat request state
- recent placed/settled counts for the active tracker range
- recent offer count for the active tracker range
- quick account note field

## Workflow rules

- popup opens above the current workflow context; it must not create modal-on-modal confusion
- the current tracker modal remains the source workflow
- saving popup changes must autosave the account change only
- popup close must return focus to the invoking control
- no bookmaker password, session, cookie or sensitive credential fields are stored here

## Route and data rules

- account popup is profile-scoped
- tracker-range summaries shown in the popup must respect the current active tracker range
- popup balance is current-state account balance, not selected-range P&L
- later account reconciliation automation must remain explicit and auditable

## Acceptance criteria

- Fund Manager can open the popup from at least one ledger identity surface
- popup can update balance and status without leaving the current ledger
- recent account context respects the active tracker range
- popup does not introduce nested-scroll, focus-trap or hidden-footer regressions
- account quick actions remain distinct from full account-management routes


## Core balance observation slice — CP-047 owner-authorised

This bounded slice supersedes the earlier popup autosave wording for balance confirmation only:
enter an observed amount, optionally enter its genuine reason, then explicitly Confirm balance.
The bet draft remains independent and unchanged. Account access/restrictions remain visible;
quick settlement, speculative freshness prompts and trend aggregation are still later scope.

Reuse `balance_snapshots`, Account identity and `account_audit`; no SQL schema addition.
New observations have `snapshot_type=account-observation-v1:manual-confirmation` or
`account-observation-v1:account-editor`, canonical Profile/Account IDs, exact penny amount,
server UTC timestamp in both `snapshot_at`/`created_at`, and genuine free-text reason in `notes`.
Never backfill an observation from the mutable latest balance or infer an intervening balance.
Legacy/imported snapshots retain their original type/date and are labelled as such.

Explicit confirmation uses a UUID operation ID as its snapshot identity. Lock the Account and
atomically append observation, update current balance/server confirmation time, and audit.
An identical retry returns that same observation, without replaying its older balance after a
newer confirmation; changed payload under the same ID is rejected. Stale expected balance or
latest observation ID rejects without writes. Same-value new confirmation has a new timestamp
and zero balance change. Source is server-selected, never a guessed activity.

Ordinary Account edits append an observation only when a known current balance actually changes;
Notes/restriction edits do not confirm money. Client-authored confirmation timestamps are ignored.
Unknown/blank remains unknown; changing to unknown does not manufacture a zero observation.
Existing import/restore paths preserve their own original provenance and timestamps. Portable
Profile export/restore preserves existing snapshot IDs through its canonical ID remapping.

Independent fixture: confirm £208.51, confirm £208.68, confirm £208.68 again. History retains all
three exact observations; changes are unknown, +£0.17 and £0.00. Latest balance £208.68, no Casino
activity or betting P&L. Cover negative/zero/malformed amounts, stale and changed retries, rollback,
same-name Account disambiguation, Profile isolation, retained snapshots and real XLSX restoration.
Use the accepted Account summary, field, table, FinancialValue and native ModalBoundary patterns.


Implemented entry points in this slice: Sportsbook table bookmaker, Sportsbook Bet Setup review,
and the existing Profile Account editor. The Account summary is extracted unchanged and reused.
Same-name choices use canonical Profile Account IDs and require selection when ambiguous.
Free Bets/Casino identity entry points remain a named follow-on; no quick settlement is claimed.
Account editor saves carry their original `updated_at` and reject a newer server version; this
prevents an old full editor overwriting a subsequent quick confirmation. New server write times
have microsecond precision. Clearing a balance retains unknown and creates no numeric snapshot;
older observations remain visible. Existing snapshot source/date labels are retained on restore.
