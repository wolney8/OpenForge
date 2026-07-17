# Fixture Spec: Accounts Import Update Approval

Last updated: 2026-07-17

All fixtures are synthetic and contain no credentials or real account-holder data.

| ID | Scenario | Expected Result |
|---|---|---|
| AIU-001 | Existing balance and status change | Staged `update` with exact before/after diff |
| AIU-002 | Changed row left unselected | Account unchanged; staged row audited as skipped |
| AIU-003 | Changed row individually selected | Verified backup, atomic update, audit and lineage replacement |
| AIU-004 | Changed row belongs to another profile | Blocked |
| AIU-005 | Workbook helper-only change | No operational update |
| AIU-006 | Invalid changed balance | Blocked before confirmation |

Executable cases live in `tests/fixtures/accounts-import-update-approval-fixtures.json`.

