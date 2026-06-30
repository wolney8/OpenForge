# OpenForge Fixture Specs

_Last updated: 2026-06-30_

## Purpose

Fixture specs define the synthetic test cases that will later become automated regression fixtures.

They translate approved calculation contracts into:

- concrete inputs
- explicit expected outputs
- known edge cases
- profile-isolation checks

## Relationship to contracts

- calculation contract = rule
- fixture spec = example proving the rule
- automated test = executable check using the fixture

Each fixture spec should reference one or more approved calculation contracts.

## Rules

- synthetic values only
- no real workbook row copies
- no real personal or operational data
- deterministic outputs only
- include profile-isolation cases where relevant

## Expected structure

Each fixture spec should include:

- contract(s) covered
- fixture id
- scenario name
- purpose
- input rows
- expected derived values
- expected inclusion/exclusion behaviour
- notes on why the case exists

## Current fixture-spec set

- `sportsbook-current-value-fixture-spec.md`
- `free-bet-current-value-fixture-spec.md`
- `liability-exposure-fixture-spec.md`
- `cash-adjustment-fixture-spec.md`
- `dashboard-selected-range-pnl-fixture-spec.md`
