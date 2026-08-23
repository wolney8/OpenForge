# Workflow Contract: Sportsbook Multi-Fixture, Outright and Long-Duration Offers

_Last updated: 2026-08-21_

## Status

- Status: Draft
- Scope: Sportsbook ledger, calculator workspace and reporting
- Related planning:
  - `docs/planning/account-extra-places-fund-manager-discovery.md`
  - `docs/planning/github-contract-coverage-audit-2026-08-21.md`

## Purpose

Support sportsbook bets and offers that are not a single normal fixture:

- multi-fixture boosts
- accumulators with explicit legs
- outrights
- long-duration markets such as golf, cricket, politics and season winners

This workflow extends the ledger and route behaviour only. It must not create new money logic
without a matching calculation contract.

## User goals

- place and track offers tied to multiple fixtures
- track outrights that start on one day and settle much later
- record estimated finish windows when no exact settlement timestamp is known yet
- keep exposure and overdue logic intelligible for long-running bets

## Workflow shape

- `Bet Setup` supports:
  - explicit fixture mode: `Single Fixture`, `Multi Fixture`, `Outright`, `Long Duration`
  - multiple fixture labels where applicable
  - start date
  - expected finish or estimated finish where applicable
- `Matching` behaves like the standard sportsbook modal and reuses the shared calculator model
- `Settlement` must allow late or delayed bookmaker settlement without falsely implying the event is
  unknown

## Route and reporting rules

- long-duration bets remain visible in issue/load reporting until resolved or explicitly parked
- tracker range views must distinguish:
  - rows placed in range
  - rows still open during range
  - rows settled in range
- overdue logic must not mark an outright overdue simply because it spans many days; it becomes
  overdue only when the expected finish/settle window has passed

## Acceptance criteria

- operator can choose a non-single fixture mode without abusing free-text fields
- exposure and open-position reporting remain correct for long-duration bets
- multi-fixture labels remain readable in ledgers and reports
- no route or issue view assumes every sportsbook row is a single fixture
