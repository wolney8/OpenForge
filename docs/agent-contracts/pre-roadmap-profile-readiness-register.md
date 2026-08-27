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
- Automated evidence: Accounts/profile Settings and catalogue E2E specs, catalogue API tests,
  web lint/typecheck/build and `git diff --check` passed on 2026-08-27. The UI items remain
  `NEEDS VERIFICATION` pending Fund Manager visual review.
