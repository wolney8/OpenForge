# Profile Settings And Quick Actions Register

Status labels follow the corrective-change cadence in `AGENTS.md`. This register owns the
approved Settings and Quick Actions batch until it is signed off.

| ID | Surface | Requested behaviour / supplied reference | Status |
| --- | --- | --- | --- |
| PD-PR-001 | Profile Settings shell | Rename `Spreadsheet` to `Import/Export` without changing the existing staging/import workflow. | VERIFIED |
| PD-PR-002 | Profile Settings > Lists | Open Sportsbook/Free Bets and Casino offer-name lists in reusable modal list managers. `Add Value` must use canonical action styling. | VERIFIED |
| PD-PR-003 | Profile Settings copy | Remove explanatory preambles that repeat obvious list ownership. | VERIFIED |
| PD-PR-004 | Profile Settings > Commission | Accept decimal fractions such as `0.02`; debounce and blur save; retain an accessible saved tick and last-updated timestamp until refresh. | VERIFIED |
| PD-PR-005 | Profile / Fund Manager Settings | Centralise security metadata for Settings, catalogue, import/export, Quick Actions and notifications. Initial tags are `fund_manager_only`; no cosmetic runtime enforcement before authentication. | DONE |
| PD-PR-006 | Fund Manager Settings | Introduce section tabs matching Profile Settings, including a Quick Actions section backed by Common Bet Combos. | VERIFIED |
| PD-PR-007 | Profile Settings > Quick Actions | Rename `Quick Add` to `Quick Actions`; group actions by ledger; distinguish global and profile-owned actions. | VERIFIED |
| PD-PR-008 | Quick Action authority | Add required global enforcement, constrained profile overrides, typed profile-owned actions, ordering/archive/audit persistence and resolved API output. | VERIFIED |
| PD-PR-009 | Quick Action carousel | Resolve global required actions first, then profile favourites/actions, to a four-slot ledger carousel with blocked-provider explanations. | VERIFIED |
| PD-PR-010 | Fund Manager Common Bet Combos / Offer dialogs | Use a shared scrollable dialog table viewport with sticky headers so body rows cannot underlap headers. | NEEDS VERIFICATION |
| PD-PR-011 | Fund Manager Settings tabs | Move Quick Actions to the final tab position, matching Profile Settings. | VERIFIED |
| PD-PR-012 | Fund Manager Account Catalogue | Present catalogue records in the shared ledger table pattern: search, filter, sorting and eight-row pagination. | VERIFIED |
| PD-PR-013 | Fund Manager Tracker Lists | Present tracker lists in the shared ledger table pattern: search, filter, sorting and eight-row pagination. | VERIFIED |
| PD-PR-014 | Fund Manager Database Backup | Present backup history/status in the shared ledger table pattern: search, filter, sorting and eight-row pagination. | NEEDS VERIFICATION |
| PD-PR-015 | Fund Manager Site Settings | Add a clearly deferred Site Settings tab stub covering platform, Fund Manager, profile-admin, onboarding, billing, mail and announcement scope. | VERIFIED |
| PD-PR-016 | Profile Settings copy | Remove non-actionable load/ready preambles from Defaults and Lists. | VERIFIED |
| PD-PR-017 | Profile Defaults save state | Replace the Saved chip with the existing Save control, enabled only when data changes. | VERIFIED |
| PD-PR-018 | Profile Import/Export scope | Record whole-profile export/import as a workbook-cutover dependency; do not claim it is implemented. | DEFERRED |
| PD-PR-019 | Offer-name dialogs | Portal dialogs above the frame with correct modal layering, local scroll, focus and visible footer. | VERIFIED |
| PD-PR-020 | Offer-name dialog actions | Restore adding Sportsbook/Free Bet and Casino values, including error/success feedback and regression coverage. | VERIFIED |
| PD-PR-021 | Settings security tags | Extend the declarative module policy to the new Site Settings scope; runtime enforcement remains held for authentication. | VERIFIED |

## Boundaries

- The contract-backed ledger field lists are the only allowed Profile Quick Action fields.
- Existing global actions remain optional until a Fund Manager explicitly marks them required.
- Authentication and server-side enforcement remain held for the authentication workstream; this
  batch introduces only the security policy metadata needed to enforce them later.

## Verification Record

- API contracts: Common Bet Combo hierarchy, typed Profile actions, decimal commissions and policy
  metadata are covered by focused pytest tests.
- Web contracts: quick-action ordering/capping has unit coverage; Profile Settings keyboard tabs
  and deep links have focused Playwright coverage.
- Remaining Fund Manager review: visual geometry of the offer-name dialogs, commission saved state,
  Quick Action hierarchy and carousel at desktop/reduced widths.

## Requirement Mapping

- **Import/Export:** PD-PR-001 preserves the existing staging/review workflow under the corrected
  name; it does not claim founder-workbook readiness.
- **Offer-name settings:** PD-PR-002 owns both requested list modals and canonical `Add Value`
  treatment. PD-PR-003 removes the supplied explanatory preambles and equivalent non-actionable
  copy.
- **Commission:** PD-PR-004 owns decimal input, debounce/blur autosave, saved confirmation and
  session-scoped last-updated display.
- **Security methodology:** PD-PR-005 introduces a single server-readable policy registry. Tags
  are declarative until authentication exists; later API role/profile checks must enforce them.
- **Settings navigation:** PD-PR-006 owns Fund Manager section tabs and the Global Quick Actions
  entry point. PD-PR-007 owns the Profile Settings `Quick Actions` section.
- **Quick Actions hierarchy:** PD-PR-008 owns Fund Manager required actions, permitted Profile
  overrides and Profile-created typed actions, including Profile enable/disable and carousel
  selection. PD-PR-009 owns the ledger presentation limit, carousel ordering and explicit
  blocked-provider state.
- **Modal geometry:** PD-PR-010 owns the shared table viewport used by Common Bet Combos and the
  offer-name managers.

## Whole-Profile Transfer Boundary

Whole-profile export/import, including every ledger, account state, reports and audit history, is a
**workbook-cutover dependency**. The current Import/Export tab keeps the existing staged review
workflow only. It must not be represented as complete profile portability until the round-trip
contract, global-provider resolution and founder-workbook reconciliation gates are complete.
