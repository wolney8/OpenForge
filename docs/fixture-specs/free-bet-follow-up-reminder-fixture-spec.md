# Fixture Spec: Free-Bet Follow-Up Reminder

_Last updated: 2026-07-21_

## Purpose

Define deterministic, synthetic cases for the manual Free Bet follow-up workflow without changing
any financial calculation.

## Required cases

- available free bet with future expiry accepts an active reminder before expiry
- placed free bet with future settlement accepts an active reminder before settlement
- reminder after the applicable lifecycle cutoff is rejected
- terminal free-bet status rejects a new reminder
- second active reminder is rejected
- active reminder resolves with an audit note and appears under notification `Done`
- active reminder dismisses and leaves the notification feed
- resolved reminder can reopen with a new identity
- wrong-profile access returns not found
- reminder lifecycle leaves every money and calculation field unchanged

## Synthetic data rule

Use only `PROFILE-001`, `FB-REMINDER-*`, `Bookmaker A`, `Exchange A` and synthetic event/offer
labels. Do not use workbook personal or operational data.

## Fixture file

- `tests/fixtures/free-bet-follow-up-reminder-fixtures.json`
