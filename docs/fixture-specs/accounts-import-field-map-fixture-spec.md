# Fixture Spec: Accounts Import Field Map

Last updated: 2026-07-17

## Contracts Covered

- `docs/contracts/accounts-import-field-map-contract.md`
- `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

All cases are synthetic and contain no real account-holder data or credentials.

| ID | Scenario | Expected Result |
|---|---|---|
| AI-001 | Valid active bookmaker account | Compatible insert with exact balance values |
| AI-002 | Valid exchange account | Compatible insert scoped to selected profile |
| AI-003 | Workbook group/platform/risk differ from catalogue | Compatible with warnings; catalogue metadata wins |
| AI-004 | Workbook supplies `LastPromoUsed` | Compatible; helper value ignored |
| AI-005 | Invalid current balance | Blocked without rounding or coercion |
| AI-006 | Unknown account authority | Blocked |
| AI-007 | Duplicate unchanged source id | No-op |
| AI-008 | Source identity belongs to another profile | Blocked |
| AI-009 | Partial row selection | Only selected rows import after backup |
| AI-010 | Export/re-import | Entered fields and source identity round-trip; unchanged row is no-op |
| AI-011 | Blank current balance | Compatible and remains blank; never coerced to zero |
| AI-012 | Archived historical account authority | Compatible with warning; excluded from new sign-up suggestions |

Executable synthetic cases live in `tests/fixtures/accounts-import-field-map-fixtures.json`.
