# Fixture Spec: Local Database and Cloud Backup

_Last updated: 2026-07-14_

## Contract covered

- `docs/contracts/local-database-cloud-backup-contract.md`

## Synthetic control data

Use two profiles with synthetic row counts and financial control totals. Backup fixtures contain metadata and expected decisions only; they do not contain a database archive or cloud credential.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| BACKUP-001 | Valid consistent local snapshot | Verified local backup recorded |
| BACKUP-002 | Integrity check fails | Upload blocked; backup not marked verified |
| BACKUP-003 | Cloud upload fails | Verified local backup retained; visible failure recorded |
| BACKUP-004 | Restore checksum mismatch | Restore blocked before database replacement |
| BACKUP-005 | Restore schema too new | Restore blocked with compatibility error |
| BACKUP-006 | Valid restore | Profile row counts and control totals match manifest |
| BACKUP-007 | Retention proposes deleting final verified copy | Deletion blocked |

## Acceptance

- Counts must match exactly.
- Money control totals must match exactly to `0.01` after restoration.
- No profile may gain rows owned by another profile.

