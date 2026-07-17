# Fixture Spec: Cash Adjustment Import Field Map

Last updated: 2026-07-16

## Contracts Covered

- `docs/contracts/cash-adjustment-import-field-map-contract.md`
- `docs/contracts/cash-adjustment-aggregation-contract.md`
- `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

| ID | Scenario | Expected Result |
|---|---|---|
| CAI-001 | Valid incoming top-up | Compatible insert; signed amount recomputes positive |
| CAI-002 | Valid outgoing withdrawal | Compatible insert; signed amount recomputes negative |
| CAI-003 | Withdrawal with `In` direction | Blocked by payload validation |
| CAI-004 | Workbook helper values disagree | Entered row may stage; helper values are ignored/recomputed |
| CAI-005 | Duplicate unchanged source id | No-op |
| CAI-006 | Source id belongs to another profile | Blocked |
| CAI-007 | Partial selection | Only selected rows import after backup |
| CAI-008 | Export/re-import | Entered fields and identity round-trip; derived fields recompute |

Executable synthetic cases live in
`tests/fixtures/cash-adjustment-import-field-map-fixtures.json`.

