# Oddsmatcher Reverse Engineering Summary

_Last updated: 2026-10-23_

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
- Delivery tracking now lives in GitHub. Repository documentation retains the approved M8
  blueprint, contracts, fixtures, and reverse-engineering evidence rather than duplicate issue
  payloads.

## CP-081 bounded current evidence — 2026-10-23

The initial authenticated desktop capture is retained privately at
`data/private/evidence/cp081-mbb-20261023/`. CP-081A resumed with an independently running,
reconnectable CDP browser and step manifest under
`data/private/evidence/cp081a-mbb-20261023/`; raw screenshots and DOM notes remain ignored.

**OBSERVED NOW:** the beta rollout label reported 60 bookmakers, six markets and two exchanges;
the mode choices were `Normal/Qualifying Bet` and `Free Bet`; the Selection filter exposed Sport,
Competition, Event, Market, Selection and Exclude draws; Start time exposed Any time, 30-minute,
1/2/4/8/12/24-hour, Today, Tomorrow, three-day and custom-range choices; Back exposed 63 current
bookmaker choices plus min/max odds; Lay exposed Matchbook and Smarkets plus min/max odds and
minimum liquidity; Rating exposed min/max and Show arbs with the account-health explanation.
Settings exposed default stake, exchange commissions and gubbed-provider exclusions. My Filters
exposed `Save` and `Save as...`; persistence was not exercised.

The table columns were Date, Event, Bet, Back Odds, Lay Odds, Rating and actions. No sortable
column control or sort-state indicator was observable, and clicking Rating did not reorder the
rows. Pagination changed the result page and exposed First, Previous and Next navigation. Bet
Summary exposed qualifying-bet inputs, automatic quote toggles, liquidity, calculated lay stake,
liability, two outcome tables, total profit, copy-lay-stake and bookmaker/exchange deep links. Its
Advanced view exposed Underlay, Standard and Overlay, the stake slider and range bounds. Calculator
Settings offered Decimal, Fractional and Moneyline independently for back and lay odds. The
responsive layout changed the table to stacked rows and filters to a contained full-screen drawer
without page-level horizontal overflow. Loading and reversible no-results states were observed;
an error state was not intentionally induced. Place-lay and provider links were observed but never
activated.

**Installed Alpha parity delta:** Plum Duff implements Profile-authorised real Match Odds discovery,
server-side Account eligibility, commission-aware calculation and idempotent Prospecting drafts.
It remains narrower than the observed MBB surface: three competitions, one market, no Free Bet
mode, no saved-filter persistence, no automatic refresh, no verified liquidity and no direct lay
placement. The unknown-liquidity and Prospecting-only boundaries remain intentional. Current MBB
quote-staleness presentation, saved-filter load/manage behaviour and genuine provider error state
remain **UNVERIFIED**.

## Matched-betting workflow coverage after CP-081 Alpha

`Owner acceptance` records the existing critical-journey state; automated evidence does not change
it.

| Workflow | Calculation | Ledger lifecycle | Reports | Workbook | Owner acceptance | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| Standard qualifying | Existing commission-aware single-lay authority; CP-081 uses it | Prospecting plus existing place/settle/correct | Existing governed P&L | Existing Sportsbook fields | CODE-VERIFIED ONLY | Alpha has real Match Odds discovery but liquidity remains unknown. |
| Free Bet SNR | Existing calculator | Existing linked Free Bet workflow | Existing Free Bet P&L | Existing Free Bet ledger | CODE-VERIFIED ONLY | Not an Alpha discovery mode. |
| Free Bet SR | Existing calculator | Existing Free Bet workflow | Existing Free Bet P&L | Existing Free Bet ledger | CODE-VERIFIED ONLY | Not an Alpha discovery mode. |
| Refund/cashback | Existing refund and CP-075 promotion authorities | Trigger → reward → wagering → release | Actual/projected separation | CP-075 fields preserved | IMPLEMENTED — OWNER ACCEPTANCE PENDING | Not an Alpha discovery mode. |
| Price boost | Existing qualifying inputs and Sportsbook offer taxonomy | Existing Sportsbook lifecycle | Existing Sportsbook P&L | Offer type preserved | CODE-VERIFIED ONLY | No boost-specific matcher ranking. |
| Profit boost | Existing Sportsbook/calculator foundations | Existing Sportsbook lifecycle | Existing Sportsbook P&L | Offer type preserved | CODE-VERIFIED ONLY | No boost-specific matcher ranking. |
| 2UP / Early Payout | Ordinary Sportsbook settlement authority only | Can record the bet/result | Existing settled P&L | Ledger fields preserved | DOCUMENTED / NOT IMPLEMENTED | Early-payout-specific matching and settlement evidence are absent. |
| Extra Places | Existing each-way/extra-place calculator and ledger | Existing Extra Place lifecycle | Existing reporting sources | Supported ledger data | CODE-VERIFIED ONLY | Not an Alpha market. |
| Each-way | Existing each-way calculation foundations | Existing sportsbook/extra-place records | Existing governed results | Supported fields | CODE-VERIFIED ONLY | No horse-racing matcher or live terms. |
| Partial lays | Existing placement-state authority | Existing Sportsbook actual-fill lifecycle | Existing exposure/P&L | Supported Sportsbook fields | CODE-VERIFIED ONLY | Alpha is single-lay planning only. |
| Multilays | Existing multilay calculator and Sportsbook legs | Existing multilay save/settle support | Existing Sportsbook P&L | Supported Sportsbook fields | CODE-VERIFIED ONLY | Alpha excludes multilay opportunities. |
| Accumulators | Can be represented as a Sportsbook bet | Existing generic lifecycle | Existing Sportsbook P&L | Bet type preserved | CODE-VERIFIED ONLY | No accumulator solver or matcher feed. |
| Bet Builders | Can be represented; multilay foundations overlap | Existing generic lifecycle | Existing Sportsbook P&L | Bet type preserved | DOCUMENTED / NOT IMPLEMENTED | Bet Builder Buddy and combinatorial matching remain deferred. |
| Reload offers | Existing promotion metadata can represent them | Existing Sportsbook/promotion lifecycle | Existing actual/projected rules | CP-075 metadata preserved | IMPLEMENTED — OWNER ACCEPTANCE PENDING | No matcher discovery/ranking. |
| Wager-to-earn reward | Existing CP-075 wagering target authority | Trigger → linked wagering → confirmation | Actual/projected separation | CP-075 round trip | IMPLEMENTED — OWNER ACCEPTANCE PENDING | No matcher discovery mode. |
| Casino wagering | Existing Casino and promotion records are separate authorities | Existing Casino workflow | Existing Casino reporting | Existing Casino ledger | CODE-VERIFIED ONLY | No cross-product wagering matcher. |

`Double boom` remains an **UNVERIFIED** community term, likely associated with 2UP/Early Payout.
It is not a separate implemented workflow without a sourced definition and settlement example.
