# Fixture Spec: Account Quick Popup and Bookmaker Hygiene

_Last updated: 2026-08-21_

## Purpose

Define synthetic cases for the account quick-popup workflow before implementation is considered
complete.

## Required cases

| Case ID | Scenario | Expected |
|---|---|---|
| AQP-001 | Open popup from sportsbook ledger row | Popup shows account identity, balance and profile context |
| AQP-002 | Update current balance | Balance saves without closing the parent tracker route |
| AQP-003 | Mark restriction state | Restriction state persists and is visible in later popup open |
| AQP-004 | Record support/live-chat outstanding state | Support state persists and remains distinct from restriction state |
| AQP-005 | Tracker range is weekly | Recent counts in popup respect weekly range only |
| AQP-006 | Popup closes | Focus returns to invoking bookmaker/account control |
| AQP-007 | Popup opened from modal workflow | No modal-on-modal overflow or trapped footer regression |

## Notes

- Use synthetic accounts only.
- Do not include bookmaker credentials or real support transcripts.
- Final implementation should add Playwright coverage for popup geometry, focus and save behaviour.


## CP-047 core observation acceptance

- AQP-008: £208.51 → £208.68 → same £208.68; exact snapshots, +£0.17/£0.00 changes,
  server timestamps and no Casino/betting P&L; browser and SQLite/PostgreSQL fixtures.
- AQP-009: identical retry after a newer confirmation returns original receipt plus current Account;
  changed reuse, stale expected observation and stale full-editor save reject without writes.
- AQP-010: failure after snapshot insert rolls back current balance, history and audit together;
  browser rejected confirmation retains the full draft for retry.
- AQP-011: same-name Accounts in different Profiles never alias; unknown and zero remain distinct;
  supplied confirmation timestamps and malformed amounts reject.
- AQP-012: original imported snapshot/time/reason and new confirmations survive real XLSX restore,
  with canonical Account/snapshot identity remapping and no invented intermediate observations.
- AQP-013: review from a dirty Sportsbook editor creates zero parent bet writes; Discard/Escape
  return focus and retain its Notes draft; compact/enlarged fields remain within the panel/footer.

Automated paths: `test_account_observations.py`, `account-observations-workflow.spec.ts`, and the
existing Account editor/Notes/weekly Reports regression group. Quick-settle, access-state editing,
activity-count summaries, Free Bets/Casino entry points and trend/freshness remain broader #85/#106.
