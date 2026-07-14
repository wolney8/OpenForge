# Fixture Spec: Multi-Profile Ledger Entry

_Last updated: 2026-07-14_

## Contract covered

- `docs/workflows/multi-profile-ledger-entry-workflow-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| MP-001 | Two eligible profiles with different odds | Two independent drafts and calculations |
| MP-002 | Target bookmaker inactive | Target blocked; source unaffected |
| MP-003 | Target bookmaker bonus restricted | Offer-dependent target blocked |
| MP-004 | Target exchange differs | Target exchange/commission used |
| MP-005 | User cancels second review | First remains created; second absent |
| MP-006 | Attempted one-click bulk confirmation | Rejected by sequential-confirmation rule |

