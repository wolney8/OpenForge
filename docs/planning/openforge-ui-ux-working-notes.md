# OpenForge UI/UX Working Notes

_Last updated: 2026-07-04_

## Purpose

This document records the current working interpretation of OpenForge UI/UX
expectations as they are discussed during build and testing.

These notes are:

- important enough to preserve across sessions
- not final product law
- expected to evolve through review, testing, and workbook-parity checks

If a later decision changes these notes, update this document rather than
assuming older chat context will be remembered.

## Standing interpretation

### Workbook parity first

- Preserve workbook structure, workflow order, and table expectations before
  applying broader UX enhancement.
- Default column ordering and alignment should follow the original tracker sheets
  as closely as practical.
- Enhancement is welcome only after parity is preserved or consciously
  trade-tested.

### Material and accessibility baseline

- Web UI should follow Google Material design principles as the primary UI
  system direction.
- Accessibility expectations should be aligned with WCAG guidance.
- Navigation, forms, tables, toolbars, focus states, contrast, and keyboard
  flow should be treated as first-class concerns, not late polish.

### Working interpretation, not fixed specification

- The user expects ongoing UI/UX refinement during development.
- Current layout, visual direction, controls, and table behaviour are working
  interpretations, not permanent final decisions.
- Design decisions should remain easy to revisit after smoke testing.

## Current tracker UI expectations

### Tracker section toolbar

- Each profile tracker needs a clear toolbar above the tracker row area.
- The toolbar should allow movement between tracker sections such as:
  - dashboard
  - accounts
  - sportsbook bets
  - free bets
  - casino offers
  - cash adjustments
  - reports
  - profit tracker
- This should be implemented with accessibility-safe navigation and Material-like
  interaction patterns.

### Table layout and workbook alignment

- Tracker modules are expected to render in table form.
- Default columns should mirror the corresponding workbook sheet structure.
- Row and column presentation should remain flexible for later enhancement.
- Adjustable table behaviour is expected later, but it should not break default
  workbook-style alignment.

### Filtering and pagination

- Tracker tables are expected to support data filtering.
- Tracker tables are expected to support pagination or another clear row-volume
  management pattern.
- These controls should be designed as part of the core tracker table
  experience, not as an afterthought.

### Add-row workflow

- Users should be able to add new rows from the tracker modules.
- The current shell-level draft-row affordance is only a bridge toward the real
  workflow.
- Final row-entry UX should still reflect workbook logic and field structure.
- On ledger routes, the default reading order should be:
  - review bar and quick operational summary
  - ledger table
  - create/edit workflow only when explicitly opened
- Clicking a row should load it into the workflow without hiding the table by
  default.
- Double-clicking a row may still collapse the table and focus the workflow for
  faster keyboard-heavy editing.

### Theming and user presentation settings

- Light mode and dark mode are required early for daily use and testing.
- Row/value colouring, emphasis styling, and motion can evolve later.
- Date formatting should be settings-driven, including support for regional
  preferences such as UK vs US display.
- Until profile/user presentation settings exist, tracker scaffolds should
  default to UK-style date display where practical because that matches the
  current workbook operator workflow more closely.
- Future personal tracker theming should be treated as a configurable
  presentation layer, not a structural replacement for workbook parity.
- Later UI enhancement may add animated outcome emphasis such as green/gold
  shimmer for positive outcome-hit cards and red shimmer for negative ones,
  using vector runtime animation tooling such as Lottie or Rive if approved at
  that stage.
- Financial values should eventually use explicit currency formatting,
  including `GBP`/`£`, visible plus/minus signs, and colour treatment that
  differentiates positive and negative outcomes accessibly.

## How to use this document

- Review this document before making major tracker UI changes.
- Update it when the user clarifies expectations or reverses an earlier UI
  assumption.
- Treat contradictions between this note and implementation as issues to surface
  explicitly.
# Additional workbook-parity notes

- `/profiles/:profileId/tracker` should resolve directly into the active
  profile's sportsbook ledger rather than acting as a separate landing page.
- Dashboard, Profit Tracker, and Reports should behave like workbook-driven
  operational/reporting surfaces rather than placeholder summary pages.
- Dashboard and Profit Tracker are expected to converge into one practical
  dashboard surface over time, even if separate routes remain temporarily for
  parity and transition reasons.
- Accounts, Free Bets, Casino Offers, and Cash Adjustments should follow the
  same review-first page structure used by Sportsbook Bets:
  - route title and action
  - review chips and search
  - quick operational summary strip
  - ledger table
  - create/edit workflow beneath when opened
- Dashboard/profit/report date-range control should live in profile Settings as the single source of truth, with any later top-bar shortcut reading and updating the same saved setting.
- Free-bet expiry alerts, mug-bet-needed account-health alerts, and sportsbook-offer expiry alerts remain deferred notification-system work rather than current scaffold scope.
- Controlled lists should keep moving toward workbook named-range authorities even while the current exported list set remains incomplete.
- The Fund Manager should be treated as the default authority for adding, removing, and modifying profile Accounts, Groups, and Platforms.
- Later subscriber/profile access may allow adding new Accounts, Groups, or Platforms, or updating operational fields such as balance, channel, and status, without implying authority to freely rewrite older shared authorities.
- Cash-adjustment review should support focused passes such as:
  - withdrawals
  - costs
  - investment-affecting rows
  - cash-snapshot-affecting rows
- Casino-offer review should support focused passes by campaign family such as:
  - wagering
  - reward-led
  - cashback
  - overdue
  - settling soon

## Deferred first-release expansion candidates

- `2UP` should be treated as a likely first-release sportsbook expansion even though it is not present in the current workbook source system.
- `Extra Places` should be treated as a later sportsbook expansion candidate alongside `2UP`.
- `Each Way` should be treated as a priority sportsbook expansion family because it is a common real-world operator workflow and will need a dedicated calculator family rather than being forced into generic sportsbook entry.
- `BOG / Best Odds Guaranteed` should be treated as a dedicated sportsbook expansion family, not folded into generic win/lose or price-boost handling.
- Special-offer knowledge should be able to drive operator shortcuts in sportsbook workflows, such as:
  - known-bookmaker pills for offer families like DD/HH, boosts, cashback, or refund offers
  - profile-aware suppression when those bookmakers are gubbed, bonus restricted, or otherwise unavailable on that profile
  - later editable knowledge authorities rather than permanently hard-coded mappings
- Neither should be implemented as calculator logic without:
  - a calculation contract
  - deterministic fixtures
  - explicit cash-first current-value behaviour
  - clear result/state wording for open and settled rows
- Until contracts exist, treat both as planned extensions rather than workbook-parity defaults.

## Deferred post-parity workflow expansions

- `2UP Offers` need a dedicated sportsbook contract, fixtures, result vocabulary, and cash-first current-value rules before implementation.
- `Each Way` needs a dedicated sportsbook contract, fixtures, place-term authority model, and cash-first open/settled branch wording before implementation.
- `BOG / Best Odds Guaranteed` needs a dedicated sportsbook contract, fixtures, and settlement wording that distinguishes taken odds from starting-price uplift before implementation.
- `Sequential Laying` for accas should be treated as a later workflow module requiring:
  - timing-aware state transitions
  - next-leg alerts/notifications
  - dedicated contracts and fixtures for partial and sequential lay states
- `Blackjack Strategy Calculator` should stay outside current workbook parity scope until a standalone calculator contract and deterministic decision fixtures exist.
- `Casino Spin Counter` should stay deferred until there is an approved, safe browser-overlay design and a clear rule about what game state can be observed locally without scraping or unsafe automation.
