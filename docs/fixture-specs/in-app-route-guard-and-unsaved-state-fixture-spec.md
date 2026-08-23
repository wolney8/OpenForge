# Fixture Spec: In-App Route Guard and Unsaved State Handling

_Last updated: 2026-08-21_

## Purpose

Define synthetic cases for replacing browser-native leave warnings with a Plum Duff in-app guard.

## Required cases

| Case ID | Scenario | Expected |
|---|---|---|
| IARG-001 | Open row, make no changes, navigate away | No leave prompt |
| IARG-002 | Edit sportsbook row and try to change ledger | In-app guard appears |
| IARG-003 | Edit free-bet row, cancel guard | Editor remains open and state preserved |
| IARG-004 | Comparable persisted state unchanged despite helper-state changes | No leave prompt |
| IARG-005 | Save then navigate away | No leave prompt after successful save |

## Notes

- This fixture spec is workflow/UI only.
- It should be paired with Playwright route-guard coverage before the browser-native guard is fully
  removed.
