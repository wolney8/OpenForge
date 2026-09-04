# Profile portable export v1 implementation register

Last updated: 2026-09-04

Scope: Tranche 3 only. Portable restore, working-workbook export, workbook merge/update,
Notifications, and the general UX backlog remain parked.

| ID | Area | Required behaviour | Signed-off equivalent | Risk | Status |
|---|---|---|---|---|---|
| PORTABLE-EXPORT-001 | Contract | Stable product-neutral XLSX sheets and lossless logical serialization | Existing profile-scoped XLSX exports plus the approved portability architecture | MEDIUM | COMPLETE |
| PORTABLE-EXPORT-002 | Integrity | Per-sheet, aggregate logical, and separate file-byte SHA-256 checksums | Import reconciliation checksum conventions | MEDIUM | COMPLETE |
| PORTABLE-EXPORT-003 | Authority | Global catalogue, preset, and opportunity records remain reference-only | Existing Profile/global authority boundary | MEDIUM | COMPLETE |
| PORTABLE-EXPORT-004 | Read safety | Fund Manager-only, selected-Profile-only reads with no workflow or audit mutations | Existing recovery diagnostic authorization boundary | MEDIUM | COMPLETE |
| PORTABLE-EXPORT-005 | UI | One owned generating state, duplicate-submit lock, local result/error, accessible download | Database backup action and Import/Export panel primitives | LOW | COMPLETE |
| PORTABLE-EXPORT-006 | Regression | Serialization, ordering, checksum, domain, security, no-mutation, theme and viewport evidence | Existing API fixture and Profile Settings Playwright patterns | MEDIUM | COMPLETE |

The nearest UI reference is the verified database-backup action: its own button owns its spinner,
busy state disables repeat submission, and completion is announced. The existing Profile Settings
Import/Export panel supplies the page shell and alignment. No new visual variant is authorized.

## Completion evidence

- The service uses a query-only SQLite/PostgreSQL connection that skips schema initialization,
  rolls back on close, and cannot commit export-side changes.
- The API fixture compares the complete SQLite dump and catalogue bytes before and after download.
- The synthetic representative includes lifecycle/restriction separation, historical Extra Place
  provenance, historical Void Free Bet state, ledgers, fees, cash adjustment, null/empty/zero,
  global references, review provenance, and financial/operational reconciliation metadata.
- Backend tests independently recompute a payload-sheet checksum and the aggregate checksum.
- Playwright proves keyboard activation, one request while busy, button-owned spinner/disable state,
  stable busy geometry, local retryable error, downloaded filename/verification, dark mode, 390px
  viewport containment, and 44px minimum action height.
- UI review reused `content-subpanel`, `workflow-panel-header`, `modal-primary-button`,
  `icon-text-action`, `button-spinner`, `spreadsheet-backup-proof`, and existing status tokens. The
  only new layout rule reserves the export feedback region to prevent loading-state layout shift.

No repeated cross-surface inconsistency was introduced or discovered, so the known-pitfalls
register did not require a new entry.
