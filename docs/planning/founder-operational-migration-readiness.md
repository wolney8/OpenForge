# Founder Operational Migration Readiness

_Status: planned release gate. This document authorises no real-data import or hosted cutover._

## Objective

Create the Fund Manager's own profile, configure its tracker authority, safely migrate the current
operational workbook, and run Plum Duff beside the workbook until reports and day-to-day entry
reconcile. The imported profile is the first real operational profile, not a different product
path.

## Current Safety Classification

**HOSTED PREVIEW ONLY - DO NOT IMPORT REAL DATA.**

The API still has a local SQLite runtime. Neon connectivity, schema rehearsal, staged loading and
verification exist, but the PostgreSQL runtime adapter and approved cutover are not complete.
Profile selection is also not a substitute for authenticated Fund Manager access.

## Founder Profile Onboarding

The Fund Manager creates the founder profile through the existing profile model, then configures:

- profile name, code, tracking start and fee settings;
- enabled ledger modules;
- weekly Extra Place loss budget;
- eligible bookmaker, exchange, bank and cash accounts, including account lifecycle/restriction
  status and opening balances;
- profile Quick Add Loadouts and account-specific overrides.

Proposed module policy for confirmation during implementation:

| Module | Onboarding rule |
| --- | --- |
| Sportsbook Bets | always enabled |
| Free Bets | always enabled with Sportsbook workflow support |
| Cash Adjustments | always enabled |
| Casino Offers | profile-toggleable |
| Extra Place | profile-toggleable |

No onboarding action may create an account silently or bypass the global account catalogue.

## Migration Sequence

1. **Workbook reconnaissance**: the Fund Manager supplies the workbook through the sensitive
   source path. Inspect its sheets and headings only for an approved source-map; do not commit raw
   data, screenshots or extracts.
2. **Profile setup**: create and configure the founder profile, its account authorities, opening
   values, enabled modules and defaults before any row import.
3. **Importer mapping**: map the supplied workbook to the existing account, Sportsbook, Free Bet,
   Casino, Cash Adjustment and Extra Place import contracts. Unknown columns remain visible in
   review and never disappear silently.
4. **Dry run**: stage all rows to the selected profile. Report source-to-destination counts,
   unresolved identities, rejected values, date assumptions, current/final-value differences and
   financial control totals.
5. **Explicit approval and snapshot**: create a verified local backup and require Fund Manager
   approval before the import write.
6. **Import and reconciliation**: import only approved rows, retain audit links to source rows,
   and compare per-ledger counts, settled P&L, open rows, account opening values and selected
   calculation fixtures.
7. **Shadow operation**: record in both the workbook and Plum Duff for a defined period. Reconcile
   weekly before treating Plum Duff as the primary operational tracker.

## Mandatory Gates Before Real Data

### Hosted persistence

- PostgreSQL runtime adapter supports representative CRUD for profiles, accounts, Sportsbook,
  Free Bets, Casino, Cash Adjustments, Extra Places, financial summaries and import staging.
- A staged SQLite-to-Neon load has exact row-count and content-fingerprint parity.
- Neon-side financial control totals reconcile with the local source.
- Cutover has a verified pre-cutover backup, documented recovery-local procedure and no silent
  Neon-to-SQLite fallback.

### Owner access

- Fund Manager authentication is implemented from
  `docs/contracts/fund-manager-authentication-contract.md`.
- Google OIDC is linked to an existing owner identity; an unlinked Google account cannot create or
  view tracker data.
- Hosted API routes enforce authenticated ownership server-side, including import, backup and
  profile/account access.
- Local recovery login remains available as the contract requires.

### Import safety

- The supplied workbook has a reviewed schema map and deterministic synthetic mapping fixtures.
- Each source ledger has an importer dry-run and reconciliation assertion.
- Any row that needs manual interpretation is blocked in review rather than defaulted.

## Existing Evidence To Reuse

- Authentication: `docs/contracts/fund-manager-authentication-contract.md`
- Neon and recovery: `docs/contracts/local-database-cloud-backup-contract.md`,
  `docs/fund-managers/neon-local-first-cutover-and-recovery.md`,
  `docs/deployment/neon-runtime-tranche-01.md`
- Workbook import: `docs/contracts/*-import-field-map-contract.md`,
  `docs/contracts/*-import-reconciliation-contract.md`,
  `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`
- Extra Place source migration: `docs/planning/each-way-extra-place-import-preparation.md`
- Profile and account authority: `docs/contracts/fund-manager-tracker-authorities-contract.md`

## Required Delivery Slices

1. Sign off Extra Place and remaining shared ledger UX parity.
2. Complete notification trigger/preference consistency for Fund Manager, retaining role/security
   tags for the later subscriber surface.
3. Build founder-profile onboarding contract, fixtures and implementation.
4. Complete Google OIDC and owner-only API session enforcement.
5. Complete PostgreSQL runtime adapter, staged Neon cutover and recovery verification.
6. Receive the real workbook, create its source-map and deterministic anonymised fixtures.
7. Dry-run import, reconcile, approve, import and shadow-run.

## Acceptance Criteria

The migration is ready only when the founder can create a profile, configure module/account
authority and opening values, dry-run the supplied workbook, approve a reconciled import, and use
the same profile securely through a Neon-backed hosted deployment. A two-week parallel run must
show no unexplained row-count or financial-total variance before the workbook is retired.

## Tracking

The local tracking register currently records Google OIDC as `#62` and Neon runtime/cutover as
`#75`; authenticated live GitHub reconciliation is required before relying on those references or
creating migration/onboarding duplicates. Founder onboarding and operational-workbook migration
need their own issue coverage if no current issue already covers the end-to-end acceptance criteria.
