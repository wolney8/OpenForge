# Oddsmatcher Reverse Engineering Summary

_Last updated: 2026-07-08_

## Executive result

- The oddsmatcher surface is now sufficiently reverse engineered for M8 planning and issue creation.
- The table shell, row actions, modal calculator, advanced controls, calculator settings, close behaviors, and visible math outputs are all captured.
- The remaining unknowns are implementation-level internals that do not block clone-ready architecture and acceptance criteria.

## What was confirmed on the live site

- Authenticated oddsmatcher is a live results grid, not a static promo shell.
- The page defaults to hiding ratings above 100%, with an explicit `Show hidden results` path.
- Primary top controls are `Settings`, `Refresh`, `My filters`, plus filter drawers: `Selection`, `Start time`, `Back`, `Lay`, `Rating`.
- Every row exposes bookmaker/exchange links, shared-odds indicator state, `Copy bet info`, and `View bet details`.
- `View bet details` opens a calculator modal with live recalculation.

## Filter drawer inventory

- Selection drawer:
	- Sport
	- Competition
	- Event Name
	- Market
	- Selection
	- Exclude draws toggle
- Start time drawer:
	- Event start time selector (`Any time` observed)
- Back drawer:
	- Bookmaker selector
	- Min/Max back odds inputs
- Lay drawer:
	- Exchange selector
	- Min/Max lay odds inputs
	- Min lay liquidity input
- Rating drawer:
	- Min/Max rating inputs
	- `Show arbs` toggle
	- explanatory text and deep link about hidden arbs

## Bet summary modal inventory

- Header:
	- Title: `Bet Summary`
	- `Close` button (`x`)
- Settings row:
	- Bet type selector (`Qualifying Bet` observed)
	- Advanced toggle
	- Calculator settings trigger
- Back section:
	- Go-to bookmaker link
	- Back stake, back odds, back commission
	- Auto-update back odds toggle
- Lay section:
	- Go-to exchange link
	- Lay odds, refresh lay odds, liquidity
	- Lay commission
	- Auto-update lay odds toggle
	- Copy lay stake button
	- Place lay bet CTA
- Outcome section:
	- Back-wins table (`Bookmaker`, `Exchange`, `Total`)
	- Lay-wins table (`Bookmaker`, `Exchange`, `Total`)
	- `Total Profit` summary

## Advanced mode capture

- Enabling `Advanced` adds a lay-staking control strip under the lay stake block.
- Additional controls observed:
	- `Underlay` button
	- `Standard` button
	- `Overlay` button
	- Slider control
	- `Range Min` input
	- current lay stake midpoint display
	- `Range Max` input
- In the captured state:
	- current lay stake: `£9.29`
	- range min: `£8.90`
	- range max: `£11.42`

## Confirmed math behavior

- Rating formula parity remains ratio-based and display-first:
	- `rating_pct = (back_odds / lay_odds) * 100`
- Example from captured modal state:
	- Back stake `£10`
	- Back odds `6.5`
	- Lay odds `7`
	- Lay stake `£9.29`
	- Liability `£55.74`
- Outcome rows captured:
	- If back wins: `+£55.00`, `-£55.74`, total `-£0.74`
	- If lay wins: `-£10.00`, `+£9.29`, total `-£0.71`
	- Total Profit displayed: `-£0.74`
- This confirms conservative headline total behavior (worst-case style summary) rather than symmetric arbitrage display.

## Styling and layout capture (clone-relevant)

- Modal classes observed:
	- `.mbb-odds-matcher-calc__modal`
	- `.mbb-odds-matcher__settings-modal`
	- `.mbb-odds-matcher__calculator-settings-modal`
- Advanced toggle label context observed:
	- `.custom-control-label`
	- approx dimensions: width `78px`, height `30px`
	- font size `17px`
- Settings-modal Cancel button context observed:
	- class `.btn.btn-outline-secondary`
	- approx padding `12.75px 28.05px`
	- approx border radius `8.5px`
	- approx border `1.5px`
- Close glyph context observed across modals:
	- `.close > span` with visible `x`
	- approx font size `25.5px`

## Close behavior capture

- Reliable close targets confirmed:
	- settings modal close (`.mbb-odds-matcher__settings-modal .close`)
	- calculator settings close (`.mbb-odds-matcher__calculator-settings-modal .close`)
	- bet summary close (`.mbb-odds-matcher-calc__modal .close`)
- Also confirmed:
	- settings modal has a `Cancel` footer button path.

## Architecture reconstruction

- The surface is best modeled as four composable areas:
	- `OddsmatcherShell` (header + search + utilities)
	- `FilterDrawerGroup` (five drawer components)
	- `OddsResultsTable` (row model + row actions)
	- `BetSummaryModal` with nested `CalculatorSettingsModal`
- Financial logic should live in pure calc modules consumed by modal UI state, not embedded in UI rendering.
- Row actions are independent commands and should remain separate from row selection semantics.

## Residual unknowns that do not block M8 issue creation

- Full bet-type enum list in all account states.
- Exact slider-to-stake mapping internals for Underlay/Standard/Overlay transitions.
- Any hidden persistence behavior for calculator settings beyond visible format selectors.

## M8-ready deliverables linked

- Contract: `docs/contracts/oddsmatcher-public-shell-rating-contract.md`
- Fixture spec: `docs/fixture-specs/oddsmatcher-public-shell-rating-fixture-spec.md`
- Fixture data: `tests/fixtures/oddsmatcher-public-shell-rating-fixtures.json`
- Blueprint: `docs/planning/oddsmatcher-development-blueprint.md`
- Issue drafts: `docs/planning/oddsmatcher-m8-issue-drafts.md`
- GitHub prompts: `docs/planning/oddsmatcher-m8-github-issue-prompts.md`