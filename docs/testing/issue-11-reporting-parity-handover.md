# Issue 11 Reporting Parity Handover

_Updated: 2026-07-15_

## Working state

- Branch: `feature/11-reporting-parity`
- Baseline: merged `origin/main` commit `97c5de3`
- Commit status: human sign-off received; approved for commit and merge
- Local URLs:
  - web: `http://localhost:3010`
  - API: `http://127.0.0.1:8010`

## Implemented in this tranche

- Added a contract-backed cross-profile reporting aggregator.
- Added deterministic synthetic fixtures for profile, category, bookmaker, weekly, and monthly aggregation.
- Added `/profiles` combined reporting with one shared range across all loaded profiles.
- Added pre-fee gross P&L, retained profit, cash snapshot, open/overdue, exposure, and expiry summaries.
- Added profile-safe comparison and drilldown.
- Added category and bookmaker breakdowns.
- Added combined weekly and monthly formal reports.
- Added profile-scoped balance snapshot storage and API routes.
- Added balance snapshot history to profile and combined reports without changing live cash snapshot calculations.
- Failed profile loads are visible and excluded rather than represented as zero-value profiles.
- Combined and profile reporting shells are tagged `internal_operational` and visibly labelled
  `Fund Manager only` in preparation for M9 subscriber access.
- Combined analytics has an explicit profile inclusion picker, with all profiles selected by default.
- Report-facing dates use human-readable British labels while stable period keys remain unchanged.
- Overdue and expiring report cards show concise action-needed indicators.
- Replaced the permanently expanded profile-card roster with a searchable, status-filtered,
  paginated profile directory.
- Added accessible `Overview`, `Performance`, `Exposure`, and `Formal Reports` tabs.
- Added session-only profile pinning and a quick-details drawer with audited metadata editing and
  tracker/report links.
- Consolidated profile inclusion, directory controls, and date range into one Fund Manager control
  bar while keeping directory filtering independent from financial inclusion.
- Added action links from combined alerts into Exposure and from profile exposure rows into the
  owning dashboard watchlists or the Free Bets ledger with `Expiring soon` applied.
- Added compact drawer actions and inline profile-field edit affordances.
- Profile name, status, management fee, and investment fee support low-noise inline editing in the
  drawer through an audited profile API. Blur or Enter autosaves; Escape abandons the pending
  keyboard edit. Combined fees above `100%` are rejected.
- Profile statuses are controlled as `Active`, `Pending`, `Inactive`, `Paused`, and `Archived`;
  detailed onboarding/inactivity reasons remain deferred separate metadata.
- Drawer navigation shows a blocking progress indicator while the selected tracker/report route
  loads, and its two actions use compact controls rather than tracker navigation pills.
- Profile comparison and directory overdue counts are underlined action links. Mixed-module counts
  open the owning dashboard watchlist; each watchlist row then opens the exact ledger with its
  reference pre-applied as a search filter.
- Cross-checked the M11 sequential multi-profile-entry contract and added fixture `MP-007` proving
  that directory reporting selection and session pinning cannot affect target-account eligibility.

## Financial boundaries

- Selected-range totals continue to consume the existing cash-first profile summary engine.
- Open current and settled final values remain separate.
- Formal free-bet and retained-profit rules remain unchanged.
- Combined totals aggregate completed profile summaries, not mixed raw operational rows.
- Fee calculations remain deferred to M10; issue 11 values are labelled pre-fee.
- Balance snapshot amounts are audit history only and do not alter P&L or current cash snapshot.

## Automated evidence

- Web lint: passed
- Web typecheck: passed
- Web unit tests: `81 passed`
- API Ruff: passed
- API mypy: passed
- API tests: `69 passed`
- Focused Playwright profiles/reporting regression: `4 passed` in the final focused run

## Human smoke test

1. Open `/profiles`.
2. Confirm `Combined profile analytics` loads both demo profiles.
3. Change `Date range` between `Week (Mon-Sun)`, `Last Week`, and `This Month`.
4. Open the `Profiles` picker, remove one profile, and confirm every combined table recalculates.
5. Select all profiles again and confirm the original comparison returns.
6. Confirm all profiles use the same displayed range.
7. Confirm gross P&L and retained profit are labelled pre-fee.
8. Confirm open current and settled final remain separate in the profile comparison.
9. Confirm category and bookmaker tables align at the top and update with the range.
10. Confirm weekly labels use forms such as `Week commencing; Monday 20th July 2026`.
11. Confirm overdue or expiring work displays `Action needed`.
12. Confirm combined weekly and monthly report tables remain formal-period views.
13. Confirm `Open` links navigate to the owning profile dashboard.
14. Confirm there are no add/edit/delete/settle actions in combined analytics.
15. Confirm combined analytics, Dashboard, and Reports show `Fund Manager only`.
16. Open `/profiles/profile-demo-001/tracker/reports` and confirm `Balance snapshots` is visible.
17. Confirm an empty snapshot list is explicit and does not change the live cash snapshot.
18. Use directory search and status controls; confirm combined totals and profile inclusion do not
    change.
19. Pin a profile, open its Details drawer, and confirm tracker and report links resolve to that
    profile only.
20. Switch among all four analytics tabs using mouse and keyboard arrow keys.
21. From Exposure, open a profile's overdue count and confirm its dashboard overdue watchlist is
    targeted.
22. Open a profile's expiring-free-bet count and confirm the Free Bets filter opens as
    `Expiring soon`.
23. Confirm profile drawer actions are compact and inline field edit icons have no visible circular
    background.
24. Inline-edit subscriber name, status, and each fee; confirm blur or Enter autosaves and Escape
    abandons a pending edit.
25. Confirm an attempted combined fee above `100%` displays a validation error and does not persist.
26. Open an overdue count, then follow a watchlist row action and confirm the owning ledger opens
    with a populated search field.

## Next action

- Complete the deferred human smoke flow when scheduled.
- Human sign-off was received on 15 July 2026; commit, merge, and issue closure are approved.
- Start issue `#12` import/export from the new `origin/main` tip.

## Implemented `/profiles` scaling layout

The route now uses three layers:

1. A compact Fund Manager control bar for profile inclusion, date range, status filter, and search.
2. Combined analytics grouped into Overview, Performance, Exposure, and Formal Reports tabs or
   collapsible sections so every table is not rendered as one long page.
3. A paginated profile directory showing basic metrics and actions, with session pinning and a
   side drawer for quick profile details.

The directory provides tracker and report drilldowns while keeping operational row editing inside
the selected profile tracker. Pinning remains session-only. Approved profile name, status, and fee
metadata edits are persisted and audited; broader subscriber details remain future settings work.
