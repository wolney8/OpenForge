# Plum Duff UI Consistency Audit

Date: 2026-08-28

This is a bounded repeated-pattern audit. It records inconsistencies without authorising a broad
redesign of signed-off surfaces.

| ID | Pattern / canonical reference | Mismatch | Risk | Disposition |
| --- | --- | --- | --- | --- |
| PD-AUD-001 | Top-level Fund Manager Settings tab: `content-panel stack` in Lists and Database | Account Catalogue and Site Settings used `content-subpanel stack` despite being peer tabs. | LOW | Fixed by reusing `content-panel stack`; nested cards remain subpanels. |
| PD-AUD-002 | Settings authority toolbar: search left, filters right | Catalogue, Lists, Database and Quick Actions used different grids, field order and widths. | LOW | Fixed with one shared `settings-table-toolbar` geometry and existing field controls. |
| PD-AUD-003 | Database inline authority table with top/bottom `LedgerPagination` | Quick Actions exposed only stat cards and duplicated its table inside a manager dialog. | LOW | Fixed: table and pagination are inline; modal now owns add/edit only. |
| PD-AUD-004 | Inline authority page plus focused editor modal | Tracker Lists still duplicates the full table inside its management modal as well as on the page. | MEDIUM | Leave unchanged pending a focused workflow review; recommend editor-only modal conversion. |
| PD-AUD-005 | Viewport modal shells and focus lifecycle | Settings dialogs use several shells (`fund-manager-settings-modal`, catalogue modal and workflow editor variants). | HIGH | Do not mass-consolidate. Specify a shared Settings dialog contract/component before migration. |
| PD-AUD-006 | Shared toolbar class for semantically equivalent controls | Route-specific toolbar classes duplicate responsive layout declarations. | LOW | Shared layout consolidated; route classes retained only as stable hooks/local semantics. |
| PD-AUD-007 | Nested secondary cards use `content-subpanel stack` | Site Settings contains nested subpanels inside its top-level panel. | LOW | Intentionally retained: these are genuine secondary cards, not peer tab containers. |

## Inventory Result

- Panels: top-level Settings parity corrected; nested panel distinction documented.
- Tables/toolbars/search/filters/pagination: corrected across the four Fund Manager data tabs.
- Modals: Quick Actions changed to editor-only; broader shell consolidation is deferred due to
  focus, scroll and workflow blast radius.
- Buttons, fields, chips, stat cards and typography: existing platform primitives retained; no new
  visual variants introduced.
- Themes/responsive/accessibility: covered by focused desktop, dark/reduced viewport, keyboard and
  overflow checks in the Settings Playwright tranche.
