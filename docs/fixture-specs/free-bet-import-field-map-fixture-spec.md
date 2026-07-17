# Fixture Spec: Free Bet Import Field Map

_Last updated: 2026-07-16_

## Contract covered

- `docs/contracts/free-bet-import-field-map-contract.md`
- `docs/contracts/free-bet-current-value-contract.md`
- `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

## Required deterministic cases

| ID | Scenario | Expected result |
|---|---|---|
| FI-001 | Valid placed SNR row | Entered values map; derived helpers excluded |
| FI-002 | Valid available SR row with expiry | Expiry and retention mode preserved |
| FI-003 | Manual final value without reason | Blocking override error |
| FI-004 | Partial lay without actual/matched stake | Blocking incomplete-placement error |
| FI-005 | Export then re-import unchanged row | Source identity retained; no-op |
| FI-006 | Source id already belongs to another profile | Blocking profile-isolation error |

## Safety assertions

- Fixtures are synthetic only.
- Commission is not imported as a row-owned value.
- Workbook P&L/helper fields remain staged audit only.
- Confirmation requires a verified local backup.
- No fixture accesses or stages `SignupUsers`.

