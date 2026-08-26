# Extra Place Ledger Signoff Register

This is the active record for the final Extra Place ledger/modal signoff. It supplements the general corrective register and is updated with each corrective batch.

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
| PD-FIX-054 | Race readiness | Define a non-intrusive post-race visibility rule. | NEEDS-INFO |
| PD-FIX-055 | Runner/race paste | Parse Smarkets and MBB copy blocks without replacing a manually chosen date. | DONE |
| PD-FIX-056 | Weekly loss control | Separate selected-range P&L from a persistent weekly loss-factor control. | NEEDS-INFO |
| PD-FIX-057 | Extra Place theme | Make table-scroll arrows visible with a bordered, tokenised blurred interior distinct from table cells. | DONE |
| PD-FIX-058 | Extra Place resolved value | Add an EP-specific range breakdown: qualifying loss, settled outcome, and weekly loss-factor progress. | NEEDS-INFO |
| PD-FIX-059 | EP race details | Correct dark EP-theme contrast for `.extra-place-race-details` headings and spans. | DONE |
| PD-FIX-060 | Shared row issues | Give issue chips a blurred elevation; use neutral `X+ Issues` overflow chip across bet ledgers. | DONE |
| PD-FIX-061 | Shared ledger loadouts | Define Fund Manager-authorable, profile-eligible review-chip/loadout management and favourites. | INVESTIGATING |
| PD-FIX-062 | Extra Place list loading | Prevent stale list reuse after a draft save and batch profile commission defaults for list calculations. | DONE |

## Decision Boundaries

- **PD-FIX-054:** Proposed safe behaviour is one amber `Race due to settle` indicator from ten minutes after the scheduled race time until the row is settled. It would not infer a result, scrape a bookmaker, or send repeated alerts. Approval is required before implementation.
- **PD-FIX-056:** `Resolved Value` remains the existing tracker value. A separate EP loss-factor card should use the calendar week and a persisted profile default of `-£15.00`, exposing qualifying loss, settled EP outcome, remaining budget, and a stop suggestion. This alters financial/settings behaviour and requires a calculation contract decision before implementation.
- **PD-FIX-061:** Keep one global template authority (the existing Common Bet Combo/Quick Add model), add ledger-specific loadout mappings and profile-level enable/hide/default overrides, then expose a Fund Manager Settings editor with archived history. The ledger control bar shows only the profile's enabled favourites, capped at four, with the remaining eligible loadouts behind a `More` control. This changes persisted workflow authority and requires a contract/schema approval before implementation.
