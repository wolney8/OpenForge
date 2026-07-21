# Fixture Spec: Fund Manager Notification Centre

_Last updated: 2026-07-21_

## Purpose

Define deterministic synthetic notification-centre cases without changing the underlying reminder
or any financial output.

## Safety boundary

- all profile, row and offer details are synthetic
- view actions never mutate reminder state or money values
- source resolution remains an audited profile-scoped sportsbook action

## Required assertions

- active future reminder produces an unread warning notification
- active overdue reminder produces an unread danger notification
- reading a notification removes only its unread state
- a pointer pass shorter than 750 ms leaves a notification unread
- a 750 ms pointer dwell marks the notification read
- opening the notification panel defaults to `New`
- a read reminder re-enters unread state on its due day, four hours before due and two hours before
  due
- a reminder that is still unread at a later threshold remains one card and contributes one badge,
  not an additional notification
- clearing a notification removes only its local visibility
- mark-all-read retains all visible cards and removes the bell badge
- read retained notifications keep the active bell icon without a red badge
- completing a task resolves the source and retains the card under `Done` until settlement
- resolving from the sportsbook ledger produces the same `Done` state as the notification action
- completed tasks disappear at or after their related settlement timestamp
- task clearing requires explicit inline confirmation
- dismissing the source removes it from the feed without presenting it as completed
- notification copy uses the sportsbook event name, not reminder reason or synthetic helper copy
- a refreshed/reopened reminder has a new identity and becomes unread
- unread counts above nine display as `9+`
- links retain both `profile_id` and sportsbook record identity
- every feed item is explicitly scoped to the `fund_manager` audience
- the bell remains available through shared application chrome on login, Fund Manager and tracker
  routes
- a future subscriber consumer cannot read the cross-profile Fund Manager feed

## Fixture source

- `tests/fixtures/fund-manager-notification-centre-fixtures.json`
