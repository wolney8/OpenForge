# Extra Place Ledger Signoff Register

This is the active record for the final Extra Place ledger/modal signoff. It supplements the general corrective register and is updated with each corrective batch.

## Fund Manager Approval

The Fund Manager accepted the Extra Place ledger UX and functionality on 2026-08-27. Issue #88 is
ready for closure once its committed implementation is pushed and live GitHub mutation is available.

## 2026-08-26 Operational Visibility and Contrast

| ID | Area | Requested change | Status |
| --- | --- | --- | --- |
| PD-FIX-045 | Shared table navigation | Opaque, blurred left/right table-scroll controls in both themes. | DONE |
| PD-FIX-046 | Date / time | Compact local display: `Today at 14:10` or `Thu 27th 12:45`. | DONE |
| PD-FIX-047 | Table row issues | Show concrete missing-field/outcome chips. | DONE |
| PD-FIX-048 | Back/Lay dark mode | Contrast-safe calculator headings, labels and helper copy. | DONE |
| PD-FIX-049 | EP dark mode | Contrast-safe Place Terms heading and prefix. | DONE |
| PD-FIX-050 | Rating | Neutral treatment when a rating cannot be calculated. | DONE |
| PD-FIX-051 | Shared parity | Check adjacent table/modal behaviour after shared styling changes. | DONE |
| PD-FIX-052 | Table row issues | Cap visible issues at four; remainder count; more than four is danger/red. | DONE |
| PD-FIX-053 | Theme contrast | Verify all modal `h3`/label/helper combinations under both themes and colour modes. | DONE |
| PD-FIX-054 | Race readiness | Show `Race finishing` after five minutes and `Result due` after ten minutes without inferring a result. | COMPLETE BUT NEEDS VERIFICATION |
| PD-FIX-055 | Runner/race paste | Parse Smarkets and MBB copy blocks without replacing a manually chosen date. | DONE |
| PD-FIX-056 | Weekly loss control | Show the persisted Monday-Sunday weekly loss budget independently of selected-range P&L. | COMPLETE BUT NEEDS VERIFICATION |
| PD-FIX-057 | Extra Place theme | Make table-scroll arrows visible with a bordered, tokenised blurred interior distinct from table cells. | DONE |
| PD-FIX-058 | Extra Place resolved value | Show selected-range qualifying loss and settled outcome alongside weekly loss-budget progress. | COMPLETE BUT NEEDS VERIFICATION |
| PD-FIX-059 | EP race details | Correct dark EP-theme contrast for `.extra-place-race-details` headings and spans. | DONE |
| PD-FIX-060 | Shared row issues | Give issue chips a blurred elevation; use neutral `X+ Issues` overflow chip across bet ledgers. | DONE |
| PD-FIX-061 | Shared ledger loadouts | Common Bet Combo templates provide global authoring, profile eligibility/overrides, and up to four ordered favourites per ledger. | COMPLETE BUT NEEDS VERIFICATION |
| PD-FIX-062 | Extra Place list loading | Prevent stale list reuse after a draft save and batch profile commission defaults for list calculations. | DONE |

## 2026-08-26 Historical Decision Boundaries

- **PD-FIX-054:** The approved safe behaviour is one amber race/result advisory after the scheduled race time. It does not infer a result, scrape a bookmaker, or send repeated alerts.
- **PD-FIX-056:** `Resolved Value` remains the existing tracker value. The separate EP loss-factor card uses the calendar week and a persisted profile default of `-£15.00`, exposing qualifying loss, settled EP outcome, remaining budget, and a stop suggestion.
- **PD-FIX-061:** One global template authority (the existing Common Bet Combo/Quick Add model) provides ledger-specific mappings and profile-level enable/hide/default overrides. The ledger control bar shows the profile's enabled favourites, capped at four, with the remaining eligible loadouts behind `More`.

## 2026-08-27 Completion Reconciliation

- **PD-FIX-054:** Implemented under the current Each Way / Extra Place contract. The table shows
  advisory cues only; it does not infer results or create notifications.
- **PD-FIX-056 and PD-FIX-058:** Implemented under the current contract. The selected-range
  resolved value remains unchanged, while Extra Place exposes separate selected-range and
  Monday-Sunday loss-budget details.
- **PD-FIX-061:** Implemented through the Common Bet Combo/Quick Add authority, the Fund Manager
  template editor, and profile-level eligibility, bookmaker override, enablement, favourite, and
  ordering controls. Extra Place consumes eligible favourites. Final visual and functional review
  remains required before signoff.
- **Live GitHub:** issue [#88](https://github.com/wolney8/OpenForge/issues/88) is open in
  `M14 Calculator Workspace and Ledger Bridge`. The Fund Manager has approved the ledger; the issue
  remains open only because no authenticated GitHub mutation client is available. Live state was
  read through the public GitHub API.

## Deliberately Deferred

| ID | Area | Boundary | Status |
| --- | --- | --- | --- |
| PD-EP-DEFER-001 | Exceptional settlement | Rule 4, dead heat, changed terms, and unsupported settlement handling remain outside the approved EP contract. | NOT STARTED |
