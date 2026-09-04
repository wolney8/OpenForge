# Fixture Spec: Sportsbook Import Field Map

_Last updated: 2026-07-15_

## Contract

- `docs/contracts/sportsbook-import-field-map-contract.md`

## Cases

| ID | Scenario | Expected |
|---|---|---|
| SI-001 | Valid standard single-lay row | Exact entered-field mapping; derived fields excluded |
| SI-002 | Missing `QualBetID` | Blocked source identity error |
| SI-003 | Workbook helper values supplied | Preserved in staged audit, excluded from write payload |
| SI-004 | Manual override without reason | Blocked |
| SI-005 | Multi-lay branch columns populated | Review-blocked; no flattening |
| SI-006 | Valid no-lay mug bet | Mapped without invented exchange or lay values |
| SI-007 | Plum Duff multi-lay round trip | Branch JSON retained without flattening |
| SI-008 | Bounded XLSX containing excluded sheet relation | Only sportsbook table is read |
| SI-009 | Confirm, export and re-import | Backup required; all exported rows become no-ops |
| SI-010 | Populated row beyond stale XLSX table range | Row staged with visible review warning |
| SI-011 | Historical Void with audited zero override and no reason | Imports as Void with no discretionary manual override and retains provenance |
| SI-012 | Terminal historical Extra Place with audited P&L but no modern calculator fields | Routes to imported-historical EP mode without a review decision or invented inputs |

All values are synthetic.
