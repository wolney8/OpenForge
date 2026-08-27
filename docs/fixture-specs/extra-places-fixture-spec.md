# Fixture Spec: Each Way / Extra Place Ledger

_Last reconciled: 2026-08-27_

## Authoritative Contract And Fixtures

- Contract: `docs/contracts/each-way-extra-place-ledger-contract.md`
- Calculation fixtures: `tests/fixtures/each-way-extra-place-fixtures.json`
- Calculation tests: `apps/api/tests/test_each_way_extra_place_calculation.py`
- Workflow/API tests: `apps/api/tests/test_each_way_extra_place_workflow.py`
- UI parity tests: `tests/e2e/extra-place-ledger-parity.spec.ts`

## Implemented Deterministic Cases

| ID | Evidence | Coverage |
| --- | --- | --- |
| EWP-MBB-001 | Matched Betting Blog reference example | 1/5 terms, zero commission, suggested lay stakes, rating, implied odds, and all Extra Place outcome values. |
| EWP-EP-CATCHER-001 | Synthetic EP Catcher historical actual-leg regression | Actual win/place lay stakes override suggestions for final Extra Place value. |
| EWP-SETTLEMENT-001 | API calculation regression | Extra Place settlement and Void/NR final-value branches. |
| EWP-POSITION-001 | API calculation regression | Explicit bookmaker/exchange paid-place gap derives Win, Standard Place, Extra Place, and Unplaced boundaries. |
| EWP-WORKFLOW-001 | Profile-scoped API workflow | Create, list isolation, settlement, settled-row deletion reason guard, and deletion. |

## Deliberately Deferred Branches

Rule 4, dead heat, changed terms after placement, and unsupported settlement branches are not
implemented. They remain manual-review branches under the ledger contract and must not be inferred
or assigned financial values automatically.

## Fixture Safety

Fixtures are synthetic. The `EP Catcher` worksheet remains a regression and future migration
source only; raw personal operational data must not be committed.
