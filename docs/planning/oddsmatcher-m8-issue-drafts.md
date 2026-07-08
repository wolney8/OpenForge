# M8 Issue Drafts for Oddsmatcher Boundary

Use these as ready-to-paste issue payloads.

## Issue 1

**Title:** M8 - Approve Oddsmatcher shell, table, modal, and advanced-control contract

**Body:**

```md
## Goal
Approve the live oddsmatcher shell/table/modal/advanced boundary as the M8 implementation contract.

## Scope
- Lock rating ratio behavior and arb visibility defaults.
- Lock table columns, row actions, and nested modal layering.
- Lock advanced controls (`Underlay`, `Standard`, `Overlay`, slider, range min/max).

## Acceptance criteria
- Contract is approved and linked in the issue.
- No ambiguity remains about modal boundaries or close behavior.
- Conservative total-profit headline behavior is explicitly documented.

## Non-goals
- No direct bet placement automation.
- No live scraping.
- No tracker writes.
```

## Issue 2

**Title:** M8 - Implement deterministic oddsmatcher fixtures for rating, modal maths, and advanced controls

**Body:**

```md
## Goal
Create deterministic fixture coverage for oddsmatcher surface parity.

## Scope
- Rating ratio and arb visibility fixtures.
- Modal qualifying-bet fixture with conservative total output.
- Advanced control fixture for range controls and strategy buttons.

## Acceptance criteria
- Fixture spec updated and approved.
- Fixture JSON validates and is synthetic-only.
- Tests consume fixtures without live odds dependencies.

## Non-goals
- No bookmaker credentials.
- No exchange credentials.
- No tracker persistence.
```

## Issue 3

**Title:** M8 - Build Oddsmatcher component architecture (shell, drawers, table, bet summary modal)

**Body:**

```md
## Goal
Implement clone-ready component boundaries that mirror live oddsmatcher behavior.

## Scope
- `OddsmatcherShell`
- `FilterDrawerGroup`
- `OddsResultsTable`
- `BetSummaryModal`
- `CalculatorSettingsModal`

## Acceptance criteria
- Components map one-to-one to documented architecture.
- Row actions remain isolated from row selection behavior.
- Modal layers do not deadlock pointer interactions.

## Non-goals
- No settlement-ledger logic.
- No profile write path.
- No provider integrations.
```

## Issue 4

**Title:** M8 - Implement modal calculator math module with conservative headline total

**Body:**

```md
## Goal
Implement pure calculator functions for oddsmatcher modal outputs.

## Scope
- Rating ratio derivation.
- Lay stake and liability derivation.
- Scenario totals for back-win and lay-win branches.
- Conservative `total_profit` summary behavior.

## Acceptance criteria
- Module is pure and independently testable.
- Outputs match fixture tolerances.
- No hidden rounding or hidden commission defaults.

## Non-goals
- No settled P&L reporting.
- No bankroll ledger integration.
- No bet-placement workflow.
```

## Issue 5

**Title:** M8 - Implement advanced underlay/standard/overlay controls with bounded stake range

**Body:**

```md
## Goal
Implement advanced staking controls in the bet summary modal.

## Scope
- Advanced toggle behavior.
- Strategy buttons (`Underlay`, `Standard`, `Overlay`).
- Slider and range min/max controls.
- Reconciliation of selected range to lay stake/liability outputs.

## Acceptance criteria
- Controls appear only when Advanced is enabled.
- Strategy changes update outputs deterministically.
- Boundaries and slider mapping are covered by tests.

## Non-goals
- No hidden persistence.
- No account-level settings sync.
```

## Issue 6

**Title:** M8 - Add E2E coverage for modal layering, close controls, and row-action flows

**Body:**

```md
## Goal
Prevent regressions in modal layering and interaction reliability.

## Scope
- Open/close bet summary modal.
- Open/close calculator settings modal.
- Open/close shell settings modal.
- Validate row actions and deep links remain usable.

## Acceptance criteria
- E2E tests prove all modal close paths work.
- No pointer-intercept deadlocks remain.
- Advanced controls are exercised in at least one path.

## Non-goals
- No visual snapshot testing of third-party branding.
- No video artifact storage by default.
```