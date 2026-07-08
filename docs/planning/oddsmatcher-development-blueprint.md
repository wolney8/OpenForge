# Oddsmatcher Development Blueprint (M8)

_Last updated: 2026-07-08_

## 1. Objective

Reconstruct the oddsmatcher experience as a clone-ready M8 boundary with parity on:

- shell/filter interaction model
- authenticated row-table model
- bet summary modal behavior
- advanced stake controls
- conservative calculator output behavior

This blueprint is scoped for planning and issue execution only.

## 2. Clone-ready architecture

## 2.1 Route and page shell

- Route equivalent target: oddsmatcher surface under deferred OddsForge area.
- Shell sections:
  - heading/info area
  - search and utility row
  - drawer filter row
  - results table
  - contextual about/help content

## 2.2 Primary components

- `OddsmatcherShell`
  - top utility actions: `Settings`, `Refresh`, `My filters`
  - free-text search box
  - bet-mode selector
- `FilterDrawerGroup`
  - Selection
  - Start time
  - Back
  - Lay
  - Rating
- `OddsResultsTable`
  - columns: Date, Event, Bet, Back Odds, Lay Odds, Rating, Row Actions
  - row actions: `Copy bet info`, `View bet details`
- `BetSummaryModal`
  - settings row + back/lay calculator + outcome tables
- `CalculatorSettingsModal`
  - odds format controls (back/lay)

## 2.3 Modal layering model

- Modal layer 1: shell settings
- Modal layer 2: bet summary
- Modal layer 3: calculator settings

Close paths must exist for all modal layers and never deadlock pointer interactions.

## 3. Control and interaction map

## 3.1 Filter drawers

- Selection drawer:
  - sport
  - competition
  - event name
  - market
  - selection
  - exclude draws
- Start time drawer:
  - event start time
- Back drawer:
  - bookmaker selector
  - min/max back odds
- Lay drawer:
  - exchange selector
  - min/max lay odds
  - min lay liquidity
- Rating drawer:
  - min/max rating
  - show arbs toggle
  - arb explanation text

## 3.2 Row and modal actions

- Row-level deep links to bookmaker and exchange
- Row-level copy action
- Row-level details action opens bet summary modal
- Modal deep links preserved in back/lay section headers
- Modal copy-lay-stake action

## 4. Math and data behavior

## 4.1 Public/display rating behavior

- Formula:
  - `rating_pct = (back_odds / lay_odds) * 100`
- Visibility:
  - `is_arb = rating_pct > 100`
  - `arb_visible = show_arbs || !is_arb`
- Display precision:
  - 2 decimal places

## 4.2 Modal calculator behavior (qualifying)

Observed parity example:

- back stake: `10.00`
- back odds: `6.50`
- lay odds: `7.00`
- lay stake: `9.29`
- liability: `55.74`

Outcome totals:

- back wins: `+55.00` / `-55.74` / `-0.74`
- lay wins: `-10.00` / `+9.29` / `-0.71`
- total profit headline: `-0.74`

This confirms conservative total-headline behavior.

## 4.3 Advanced mode behavior

When `Advanced` is enabled, the lay section adds:

- strategy buttons: `Underlay`, `Standard`, `Overlay`
- slider
- range min stake input
- current lay stake midpoint display
- range max stake input

Observed values in captured state:

- range min: `8.90`
- current lay stake: `9.29`
- range max: `11.42`

Exact slider transfer function remains implementation-defined and must be parity-tested.

## 5. Styling and layout parity anchors

Use these as parity anchors rather than strict class-name requirements:

- Advanced label context:
  - class family: custom control label
  - approx `17px` type scale
- Settings cancel button:
  - approx padding `12.75px 28.05px`
  - approx radius `8.5px`
  - approx border `1.5px`
- Modal close glyph:
  - class family: close button span
  - approx `25.5px` glyph size

## 6. Data model boundary for M8

- M8 oddsmatcher is reference-tool parity, not settlement/tracker accounting.
- Do not mix ledger settlements into oddsmatcher module.
- Keep calculator logic in pure modules with deterministic fixture tests.

## 7. Test blueprint

## 7.1 Unit/logic tests

- rating ratio and arb visibility
- qualifying modal parity values
- conservative total headline selection
- advanced control visibility and bounds

## 7.2 Component tests

- drawer open/close behavior
- row actions and modal launch
- nested modal interactions

## 7.3 E2E tests

- open details modal from table row
- toggle advanced and validate controls
- open calculator settings and close
- close all modal layers and ensure table remains interactive

## 8. Risks and mitigations

- Risk: modal pointer interception regressions.
  - Mitigation: explicit E2E close-path coverage.
- Risk: advanced slider mapping drift.
  - Mitigation: fixture-bound mapping tests.
- Risk: hidden assumptions in rounding/commission.
  - Mitigation: explicit contract defaults and test assertions.

## 9. Definition of done (M8 oddsmatcher slice)

- Contract approved.
- Fixture spec approved.
- Fixture JSON validated.
- Architecture boundary implemented.
- Unit/component/E2E coverage in place for rating, modal math, advanced controls, and close paths.
- No no-bet-automation, no-scraping, and financial safety rules violated.
