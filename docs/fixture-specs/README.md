# Plum Duff Fixture Specs

_Last updated: 2026-07-15_

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
- `fund-manager-authentication-fixture-spec.md`
- `local-database-cloud-backup-fixture-spec.md`
- `spreadsheet-import-export-roundtrip-fixture-spec.md`
- `fund-manager-fee-calculation-and-withdrawal-fixture-spec.md`
- `multi-profile-ledger-entry-fixture-spec.md`
- `profile-metadata-management-fixture-spec.md`
- `target-progress-and-decision-support-fixture-spec.md`
- `common-bet-combo-fixture-spec.md`
- `calculator-workspace-ledger-bridge-fixture-spec.md`
- `m14-external-calculator-reference-fixture-spec.md`
- `financial-value-presentation-fixture-spec.md`
- `material-accessible-ledger-editor-fixture-spec.md`
- `guided-entry-focus-fixture-spec.md`
- `master-account-catalogue-source-fixture-spec.md`
- `cash-adjustment-import-field-map-fixture-spec.md`

External calculator observation packets are classified by
`tests/fixtures/m14/m14-external-calculator-reference-fixtures.json`. Only its
`accepted_reference` entries may be used for external regression comparisons;
blocked and research-only cases are not approved expected-money fixtures.
