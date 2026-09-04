# Hosted approval, session bootstrap, and import consistency correction

Date: 2026-09-04

This batch is limited to the current dry-run approval lifecycle, authoritative session bootstrap,
and the existing Profile Import/Export and Import Review presentation. It does not authorize an
import or any Profile-data mutation.

| ID | Area | Requested behaviour | Canonical equivalent | Status |
|---|---|---|---|---|
| PD-FIX-218 | Dry-run approval | One authoritative approval request settles as ready, failed, or interrupted; a stale request is retryable and never spins indefinitely | Persisted import state and resumable execution status | COMPLETE |
| PD-FIX-219 | Approval requests | Remove duplicate/unbounded approval polling and expose the actual server validation stage without fake percentages | Canonical pending-action and indeterminate progress patterns | COMPLETE |
| PD-FIX-220 | Session bootstrap | Validate the authoritative server session before protected shell/data/navigation mounts | Protected route loading gate and session inactivity policy | COMPLETE |
| PD-FIX-221 | Import History actions | Use the canonical compact table action dimensions, action gap, tooltip, and contextual accessible name | Ledger `table-action-row` / `table-action-button` | COMPLETE |
| PD-FIX-222 | Import tables | Restore canonical cell padding, stacked primary/secondary spacing, chip minimum geometry, wrapping, and row alignment | Shared `data-table`, `table-cell-stack`, and `table-chip` primitives | COMPLETE |
| PD-FIX-223 | Import shells/dialogs | Reuse canonical page/panel alignment and modal body/footer spacing at desktop and narrow widths | Existing content shell and `ConfirmationDialog` | COMPLETE |
| PD-FIX-224 | Consistency prevention | Make table action, action gap, stacked-cell, chip, table-padding, modal-spacing, and shared-shell rules permanent | Plum Duff consistency enforcer and known-pitfalls register | COMPLETE |

## Production evidence captured before changes

- Current Profile API identity: `profile-ccd633e402fc`.
- Current ImportRun: `profile-import-71161b292f32517cc8a2fc5ea0623918`.
- The approval POST reached Production and remained in the function for 300 seconds before Vercel
  terminated it (`Vercel Runtime Timeout Error`).
- After termination, serial workspace GETs continued returning HTTP 200 about every 6.7 seconds;
  no second approval POST or import POST was observed.
- On the earlier session failure, the first authoritative `/api/auth/session` and protected data
  reads returned 401 while the protected Next.js shell had already rendered. A later authenticated
  load returned 200 and activity writes succeeded, proving initial shell trust and authoritative
  API validation were out of order.

## Signed-off references

- Table row actions: ledger `table-action-row` and `table-action-button`.
- Stacked cell content: shared `table-status` hierarchy with a grid-owned gap.
- Status labels: shared `table-chip` minimum height and non-shrinking inline geometry.
- Approval progress: `LedgerLoadingIndicator` plus persisted stage copy.
- Destructive confirmation: `ConfirmationDialog`.
- Protected loading: route-critical loader which intercepts interaction until required authority
  settles.
