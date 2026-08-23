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
