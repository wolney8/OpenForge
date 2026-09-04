# Import Baseline Regression Tranche

_Last updated: 2026-09-04_

## Active register

| ID | Area | Requested outcome | Status |
|---|---|---|---|
| IMPORT-BASELINE-001 | Import mapping | Pin the signed-off `founder-snapshot-v8` mapping contract | COMPLETE |
| IMPORT-BASELINE-002 | Financial reconciliation | Assert the approved September aggregate controls using synthetic data | COMPLETE |
| IMPORT-BASELINE-003 | Operational health | Require every post-import operational probe to pass | COMPLETE |
| IMPORT-BASELINE-004 | Integrity | Account for 747 source rows with zero duplicates or missing rows | COMPLETE |

This tranche is intentionally limited to regression data and automated checks. It does not
implement export, restore, workbook lineage, reporting UX, notification behaviour, or merge writes.
