# Profile portable restore v1 implementation register

Last updated: 2026-09-05

Scope: portable restore only. Working-workbook export, Google runtime validation, incremental
updates, stale-workbook merge, OAuth-secret rotation, Notifications, and general UX remain parked.

| ID | Area | Required behaviour | Signed-off equivalent | Risk | Status |
|---|---|---|---|---|---|
| PORTABLE-RESTORE-001 | Verification | Reject any format, manifest, sheet, canonical-value, or checksum mismatch before creating a Profile | Portable export integrity contract | HIGH | COMPLETE |
| PORTABLE-RESTORE-002 | Fresh target | Mint a new Profile and remap runtime IDs; never write into a populated Profile | Profile onboarding isolation | HIGH | COMPLETE |
| PORTABLE-RESTORE-003 | Global authority | Preserve global records as references and block on explicit restore reviews | Workbook provider review boundary | HIGH | COMPLETE |
| PORTABLE-RESTORE-004 | Recovery lineage | New attempt/checkpoint/audit identity for every try; failed target rolls back without crossing attempts | Attempt-scoped workbook recovery | HIGH | COMPLETE |
| PORTABLE-RESTORE-005 | Acceptance | Financial state, operational health, and normalized re-export parity must all pass | Dual import acceptance gate | HIGH | COMPLETE |
| PORTABLE-RESTORE-006 | UI | Fund Manager can verify, review, confirm, and open the fresh Profile with one mutation-owned busy state | Profile onboarding and portable export actions | MEDIUM | COMPLETE |
| PORTABLE-RESTORE-007 | Regression | Synthetic round trip, tamper, authority review, lifecycle rejection, rollback/retry, auth, keyboard and viewport coverage | Existing portability fixtures and UI gate | HIGH | COMPLETE |

The restore UI uses the existing Profile onboarding page shell, field controls, action groups,
button-owned spinner, status chip, checksum proof, and local error/status patterns. No new visual
variant or financial calculation was introduced.
