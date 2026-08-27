# Pre-Roadmap Profile Readiness Register

_Started: 2026-08-27. Scope: Profile Accounts, Fund Manager account catalogue, Cash Adjustments,
Reports, Profile Settings, and import/export readiness. Hosted persistence, authentication and
workbook cutover are explicitly excluded._

| ID | Area | Requested outcome | Status |
| --- | --- | --- | --- |
| PD-PR-001 | Profile Accounts toolbar and modal | Canonical Add Account action, modal workflow and toolbar geometry. | NEEDS VERIFICATION |
| PD-PR-002 | Profile Accounts table | Header/row/action alignment, branded chips, horizontal controls and canonical pagination. | NEEDS VERIFICATION |
| PD-PR-003 | Profile Accounts filters | Filter dialog, custom filters, search-right and Restricted/Active/Bookie/Exchange loadouts. | NEEDS VERIFICATION |
| PD-PR-004 | Profile Accounts summary | Five profile-scoped, non-misleading account stat cards. | NEEDS VERIFICATION |
| PD-PR-005 | Global account ownership | Contract and UI ownership boundary recorded; legacy bookmaker runtime source remains a pre-cutover consolidation task. | COMPLETE |
| PD-PR-006 | Global catalogue transfer | Validated export and non-mutating import preflight available; confirmed bulk apply is deferred. | COMPLETE |
| PD-PR-007 | Cash Adjustments table | Existing shared ledger table alignment, action reachability and horizontal behaviour audited. | NEEDS VERIFICATION |
| PD-PR-008 | Profile Reports | Actionable open/action-required metrics and canonical bookmaker badges. | NEEDS VERIFICATION |
| PD-PR-009 | Profile Settings data integrity | Deduplicate exchange option values before rendering to remove duplicate `10Bet` React keys. | NEEDS VERIFICATION |
| PD-PR-010 | Profile Settings ownership | Remove global catalogue/exchange definitions from Profile Settings while retaining profile authority and overrides. | NEEDS VERIFICATION |
| PD-PR-011 | Quick Add ownership | Existing global templates with profile enablement, eligible bookmaker selection and favourites confirmed. | COMPLETE |
| PD-PR-012 | Spreadsheet readiness | Audit complete: PARTIAL, with cutover gaps recorded. | COMPLETE |
| PD-PR-013 | EP sign-off | Fund Manager approval recorded. Live GitHub #88 remains open in M14 pending an authenticated close. | COMPLETE |
| PD-PR-014 | Profile Accounts toolbar | Search/loadouts sit left; Add Account/filter sit right; canonical pagination remains above and below. | NEEDS VERIFICATION |
| PD-PR-015 | Profile Accounts table | Structured columns have explicit widths, uniform rows and neutral balance chips. | NEEDS VERIFICATION |
| PD-PR-016 | Profile Accounts table controls | Recent view, full filter controls and permitted visible-column controls implemented. | NEEDS VERIFICATION |
| PD-PR-017 | Profile Accounts catalogue data | New accounts require an active canonical provider. Existing duplicate/synthetic profile rows are preserved for manual review, not deleted automatically. | PARTIALLY COMPLETE |
| PD-PR-018 | Profile Accounts editor fields | Provider identity is inherited/read-only, restrictions use shared chips, and operating channels are multi-select from Fund Manager context. | NEEDS VERIFICATION |
| PD-PR-019 | Profile Accounts editor geometry | Signed-off modal footer/close pattern and contained editor overflow implemented. | NEEDS VERIFICATION |
| PD-PR-020 | Profile Reports | Canonical bookmaker badges and module-specific operational links, including Extra Place, implemented. | NEEDS VERIFICATION |
| PD-PR-021 | Fund Manager Dashboard actions | Extra Place action count/link with `chess_knight` implemented. | NEEDS VERIFICATION |
| PD-PR-022 | Quick Add settings warning | Duplicate provider labels are grouped to one canonical account option with a stable account ID key. | NEEDS VERIFICATION |
| PD-PR-023 | Profile Settings account access | Remove the Account Access section; the supplied sentence ends mid-requirement, so final account-status ownership needs confirmation. | NEEDS-INFO |
| PD-PR-024 | All ledger tables | Accounts now has uniform rows, column resizing and asc/desc sorting; established bet ledgers already use matching controls. | NEEDS VERIFICATION |
| PD-PR-025 | Quick Add profile bookmaker options | Canonical grouping and stable account-ID keys are covered with the duplicate-key regression path. | NEEDS VERIFICATION |
| PD-PR-026 | Accounts table controls | Column dragging now uses the rendered header width, default pagination is eight rows, and Type/Status widths protect chips. | DONE |
| PD-PR-027 | Accounts editor | Restrictions are M3 pressed chips; Channel and editor-open toasts are removed; horizontal editor overflow is contained. | DONE |
| PD-PR-028 | Profile provider inheritance | New accounts only select global catalogue providers; Not Signed Up filtering is available. Legacy duplicate/synthetic rows remain for an explicit, audited reconciliation. | PARTIALLY COMPLETE |
| PD-PR-029 | Accounts toolbar and filters | Search/loadouts/actions use stable toolbar slots; active controls carry the shared red badge/glow; issue filtering and modal spacing match ledger controls. | DONE |
| PD-PR-030 | Accounts provider badges | The API overlays legacy bookmaker IDs with canonical global presentation metadata, so Accounts and ledger badges share one palette. | DONE |
| PD-PR-031 | Extra Places operational routing | Fund Manager and report links use the `all-issues` Extra Places route state, which the ledger reads deterministically. | DONE |
| PD-PR-032 | Extra Places navigation identity | Profile command route and ledger title now use `chess_knight` and "Extra Places". | DONE |
| PD-PR-DEFER-001 | Provider source consolidation | Safely migrate legacy `bookmaker_catalogue` and master catalogue into one stable-ID persisted authority. | DEFERRED |
| PD-PR-DEFER-002 | Global catalogue apply | Add audited, confirmed bulk apply with profile-reference impact resolution after source consolidation. | DEFERRED |
| PD-PR-DEFER-003 | Extra Place transfer | Add staged Extra Place import/export mapping and fixture reconciliation before founder cutover. | DEFERRED |

## Protected behaviour

- Profile account records remain isolated by `profile_id`.
- The master account catalogue remains Fund Manager authority; a Profile selects providers and
  records local operational state, rather than creating global providers.
- Existing ledger financial logic, EP sign-off, notification work, hosted persistence, OAuth and
  real-workbook cutover are out of scope.

## Evidence notes

- The master catalogue currently persists through `data/reference/master-account-catalogue.json`
  and is validated by `account_catalogue_source.py`. Existing Bookie profile accounts and branded
  ledger identity still read the legacy persisted `bookmaker_catalogue` runtime source.
- Profile account state currently persists in the `accounts` table and carries balance, lifecycle,
  restrictions, channel, notes and profile display/commission overrides.
- Any catalogue mutation remains local-runtime only until the later PostgreSQL/hosted cutover.
- Legacy profile account rows are not deleted or silently reassigned. A later catalogue reconciliation
  must present canonical-match conflicts and require an explicit Fund Manager confirmation before any
  profile financial record is changed or removed.
- Automated evidence: Accounts/profile Settings, table-control, Extra Place deep-link and catalogue
  E2E specs; Accounts API tests; web unit tests/typecheck/lint/build; and `git diff --check` passed
  on 2026-08-27. The UI items remain `NEEDS VERIFICATION` pending Fund Manager visual review.
