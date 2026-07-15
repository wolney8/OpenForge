# OpenForge Workbook Parity Gap Register

_Last updated: 2026-07-06_

## Purpose

Track workbook-parity completion and open gaps by domain so implementation can stay contract-first and fixture-backed.

## Current Parity Status

Overall status: **partial**.

Completed/in-progress parity slices exist across sportsbook workflow UX, tracker date settings, authority list settings, and reporting shell scaffolding.

Workbook parity is **not complete** end to end yet.

## Domain Register

### 1) Settings-Owned Authorities (Bookmakers, Exchanges, Offer Names, Platforms/Groups)

Status: **partial**

What exists:

- Profile-scoped authority list API and UI for lookup values.
- Profile-scoped account authority and exchange commission settings.
- Ledger forms already consume authority sources in several key flows.

Open gaps:

- Verify complete workbook named-range coverage and taxonomy consistency (especially sportsbook offer-type/bet-type boundaries).
- Add parity fixtures asserting authority propagation into every dependent selector.
- End-to-end smoke coverage now exists for Settings-owned campaign-tag propagation into sportsbook, free-bet, and casino selectors. Remaining coverage gap: broader authority types beyond campaign tags.
- Current profile lookup API supports only six lookup types (`bookmaker`, `exchange`, `offer_name`, `casino_offer_name`, `group`, `platform`), while workbook settings define additional named lists that still remain hardcoded in web constants (status, result, strategy, offer-type, bet-type, fixture-type, retention-mode, lay-status, outcome-count, direction).

### 2) Tracker Settings Parity (date presets, range offsets, mug cadence)

Status: **in place, needs broader parity verification**

What exists:

- Tracker settings API and settings UI.
- Date range now drives sportsbook "Placed in range" review mode.

Open gaps:

- Verify all intended dashboard/profit/reports surfaces consume identical settings logic in parity scenarios.
- Add fixtures for preset/custom/offset combinations and expected report windows.
- Workbook-derived config keys are now persisted; `free_bet_expiry_alert_window_days` is consumed in summary alert logic. Remaining downstream parity work: global date-range toggle semantics, this-month mode semantics, and ledger-default usage for underlay/overlay/bonus settings.

### 3) Sportsbook Workflow Parity

Status: **active**

What exists:

- Quick-view strip.
- Placement actions (back placed, lay fully placed, lay partially placed).
- Sortable headers and row-state highlights.
- Placed-in-range review chip wired to profile date settings.
- Deterministic unit tests for placement transitions and range filter behavior.
- Spreadsheet-style partial-lay workflow controls in matching plan with repeatable per-leg exchange/odds/matched-stake entries.
- Leg-aware partial-lay execution summary now keeps target stake, cumulative matched stake, remaining stake, and next recommended stake separate.
- Deterministic sportsbook helper tests now cover partial-lay target inference and remaining/next recommendation behavior.
- Final lay completion now blocks duplicate final legs and syncs final-leg exchange/odds into primary lay inputs.

Open gaps:

- Contract/fixture-backed reminder/follow-up model for partial lays and exposure recheck.
- Offer-type and bet-type rationalization per workbook usage.
- `OfferType`, `BetType`, and `OfferName` ownership remains a live parity gap:
  - workbook preserved all three fields
  - workbook did not keep their semantic boundaries clean enough
  - OpenForge needs explicit authority ownership and relation rules before more selector/calculator work
- Sportsbook taxonomy still needs explicit separation between:
  - offer flows
  - strategy types
  - result branches
  - calculator families
- Multi-lay and bridge workflows still incomplete.
- Remaining taxonomy work is now broader authority ownership: additional workbook lists still need migration from hardcoded constants into settings-owned profile authorities.
- Contract-backed money logic still needs expansion to natively consume multiple partial lay legs for full strategy-preserving recalculation across mixed-odds legs.
- Advanced sportsbook offer families remain missing dedicated contracts and fixtures:
  - Each Way fixture/contract draft now exists; still not approved or implemented
  - 2UP / Early Payout fixture/contract draft now exists; still not approved or implemented
  - BOG / Best Odds Guaranteed fixture/contract draft now exists; still not approved or implemented
  - Extra Places fixture/contract draft now exists; still not approved or implemented
  - explicit horse-racing refund subtypes such as money back if 2nd/3rd

### 3a) Free-Bet Multi-Lay Expansion

Status: **explicitly gated; not workbook parity**

Current boundary:

- The workbook and current Free Bet contract support single-lay strategies through
  `Partial Lay`; multi-lay calculations are defined only for Sportsbook Bets.
- The Free Bet API, calculation engine, fixtures, and storage model do not currently
  support multiple named lay branches.
- The shared wide/resizable editor, reduced nested visual noise, and accessible loading
  state apply to Free Bets now, but no unsupported `Multi Lay` option is exposed.

Required before implementation:

- approved Free Bet multi-lay cash-first contract covering both `SNR` and `SR`
- deterministic multi-outcome scenario, liability, placement, and settlement fixtures
- version-tolerant profile-scoped branch persistence and API/schema design
- unit, API, profile-isolation, and Playwright coverage

### 4) Reporting Parity

Status: **foundation present, parity closure pending**

What exists:

- Tracker summary/reporting shell and core aggregation model.
- Existing report-oriented tests in web lib.

Open gaps:

- Confirm complete workbook parity for weekly/monthly/yearly retained-profit behavior against source pack.
- Expand deterministic fixtures for unresolved workbook reporting edge cases.
- Add explicit traceability mapping from workbook fields to UI-presented values for each report surface.
- Validate that formal report outputs match workbook report-table boundaries (`PnL_by_Week`, `PnL_by_Month`, `PnL_by_Year`) for edge periods and partial windows.

### 5) Cross-Ledger Bridge Workflows

Status: **not complete**

Open gaps:

- Sportsbook -> Free Bets bridge for award-on-place vs award-on-settle offer families.
- Contract + fixture + UI flow requirements still pending before implementation.

## Immediate Execution Order

1. Add deterministic tests for newly added sportsbook table review/filter paths (done for placement + placed-in-range + sorting/highlight assertions).
2. Run focused UI smoke and append evidence for placed-in-range mode (done).
3. Expand profile-scoped settings model/contracts for missing workbook config keys, then add deterministic fixtures.
4. Convert remaining hardcoded workbook taxonomies to settings-owned authorities with propagation tests.
5. Expand reporting parity fixtures for unresolved workbook edge areas and report-table boundary checks.
6. Implement approved bridge/reminder workflows only after contract + fixtures are approved.
7. Write advanced sportsbook offer-family contracts in priority order: Each Way, 2UP / Early Payout, BOG, Extra Places.
8. Approve and implement the `OfferType / BetType / OfferName` ownership model before broader sportsbook selector cleanup.

## Concrete Mismatch Snapshot (2026-07-06)

Workbook-derived expectations vs current implementation:

- Implemented profile lookup authority types: bookmaker, exchange, offer_name, casino_offer_name, group, platform.
- Workbook named-range lists not yet represented as profile-owned authorities: account types/statuses, sportsbook/free-bet/casino statuses, result list, lay status, offer types, bet types, fixture types, direction list, adjustment type list, retention mode list, outcome count list.
- Tracker settings currently persisted: active preset, custom start/end, range back/forward, mug cadence.
- Tracker settings currently persisted: active preset, custom start/end, range back/forward, mug cadence, free-bet expiry alert window, global date-range toggle, this-month mode, default free-bet underlay/overlay factors, default bonus retention.
- Workbook taxonomy drift currently visible in web constants:
	- resolved in constants on 2026-07-06 for direction (`Correction`), casino statuses (`Expired`/`Cancelled`/`Error`), and sportsbook results (`Outcome 1 Won`).
- Sportsbook taxonomy drift still present in planning/implementation:
	- `Partial Lay`, `Multilay`, and `Multilay-Underlay` are strategy types, not offer flows.
	- `Bet Builder` and `Acca` currently behave like offer-type values even though they also describe bet shape.
	- `Reload` is too broad for long-term sportsbook taxonomy.

## Guardrails

- No money-impacting logic without contract.
- No parity claims without deterministic fixtures.
- No cross-ledger workflow implementation without explicit profile-isolation checks.
