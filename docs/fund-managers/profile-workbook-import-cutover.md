# Profile Workbook Import Cutover

## Scope

This workflow writes an approved Profile workbook plan only after review decisions and financial
reconciliation are persisted. Uploaded workbook bytes remain transient and are not stored in Git,
Neon or deployment artifacts.

## Controlled Import

The server, not the browser, reloads the approved import run, decisions and canonical write plan.
The state transition is:

`READY_APPROVED -> IMPORTING -> RECONCILING -> COMPLETE`

Before writes, Plum Duff stores a checksum-protected application checkpoint containing the target
Profile settings, exchange commissions, Accounts and supported ledger rows. Profile settings,
Account creates/updates and ledger inserts then execute in one runtime database transaction. A
failure before commit rolls the transaction back automatically.

Every changed entity has an import write-audit entry containing the ImportRunID, deterministic
source/import key, target Profile, operation and before/after state. Reusing a run or deterministic
entity identity is blocked.

## Post-Import Reconciliation

After commit, Plum Duff re-reads persisted rows from the active runtime database. It compares the
approved plan with Profile Account counts/balances, imported ledger identities and counts,
workbook-equivalent week/month/year values, open/current and settled/realised values, future open
positions, review decisions and source-row accounting.

The persisted report ends with exactly one of:

- `POST-IMPORT RECONCILIATION: PASSED`
- `POST-IMPORT RECONCILIATION: FAILED`

A failed reconciliation does not mark cutover complete and leaves scoped rollback available.

## Rollback

Normal rollback uses the application checkpoint and write audit, not a whole-database restore. It:

- removes rows created solely by the ImportRun;
- restores prior Profile settings and Account fields changed by the ImportRun;
- verifies the resulting Profile checksum against the pre-import checkpoint;
- records a durable rollback event;
- prevents repeat rollback.

Rollback is deliberately blocked if Profile data changed after the import, because silently
overwriting later edits would be unsafe. Such a case requires Fund Manager review and an
infrastructure recovery decision.

## Neon Backstop

No Neon management API or named restore-point integration is configured in Plum Duff. The durable
application checkpoint is therefore the tested first-choice rollback mechanism. Neon platform
restore remains a manual, plan-dependent disaster-recovery backstop and must not be represented as
available until it is separately verified immediately before the real cutover.

Neon's current published Backup & Restore model includes instant restore plus snapshots; its
October 2025 product documentation states that Free projects include one snapshot and that new
Free projects default to a six-hour instant-restore window. These limits can change and Plum Duff
cannot infer the project's current console configuration. Verify the active project's Restore
window and available snapshot slot in the Neon console before cutover:
<https://neon.com/docs/changelog/2025-10-31>.

Before importing a real workbook, verify the active Neon project's current retention/restore
capabilities in the Neon console and record that recovery reference alongside the ImportRun.
