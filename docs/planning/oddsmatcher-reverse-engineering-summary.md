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

## CP-082 architecture and interface correction — 2026-10-24

The Alpha now has one canonical top-level `/oddsmatcher` tool beside Calculators. With no Profile
selected it returns all supported provider opportunities without applying a Profile restriction or
commission and disables draft creation. Selecting a Profile applies existing Account eligibility
and commission server-side; the older Profile route redirects to this same implementation with
that context preselected. Exact event/market/selection identity remains available for a later
deterministic `Already in Tracker` check; fuzzy matching was not added.

The desktop hierarchy now follows the observed MBB behaviour: mode/search/settings, a second row of
counted filter buttons, compact provider status, seven table columns with liquidity nested under
the lay quote, and secondary pagination. Narrow layouts use one `Filters N` control and stacked
opportunity cards. Plum Duff styling, Account evidence, quota status and the Prospecting boundary
remain distinct. Free Bet mode, saved-filter persistence, automatic refresh, verified liquidity,
additional markets and direct placement remain parity gaps. No provider, calculation or ledger
lifecycle authority changed.

## CP-083 retained-evidence parity checklist — 2026-10-25

This checklist uses the committed CP-081A derived observations above. The referenced raw private
CP-081A screenshot directory is not present in the current worktree or local repository storage, so
a new pixel-level side-by-side canvas is **UNVERIFIED**. The Plum Duff captures are private under
`data/private/evidence/cp083-visual-parity-20261025/`.

| MBB element | Plum Duff implementation | Desktop | Narrow | Functional | Deliberate difference |
| --- | --- | --- | --- | --- | --- |
| Mode selector | Normal / Qualifying control in primary row | Yes | Yes | Yes | Free Bet mode remains unimplemented and is not shown as selectable. |
| Large search | Dominant debounced opportunity search | Yes | Yes | Yes | Uses Plum Duff field/token treatment. |
| Settings | Material Settings dialog action | Yes | Yes | Yes | Alpha-supported settings only. |
| Selection / Start time / Back / Lay / Rating | Counted filter buttons opening one contained drawer | Yes | `Filters N` | Yes | Only Alpha-supported fields are exposed. |
| Clear / Refresh / My Filters | Secondary utility group | Yes | Yes | Clear/Refresh yes | My Filters is deliberately disabled because persistence is deferred. |
| Date / Event / Bet | Separate compact columns; football icon and competition context in Event | Yes | Stacked card | Yes | Material football icon replaces any proprietary asset. |
| Back quote | Account-themed provider header, external link and positive quote surface | Yes | Yes | Yes | Profile eligibility reason may appear as Plum Duff evidence. |
| Lay quote and liquidity | Exchange-themed header, odds and nested liquidity | Yes | Yes | Yes | Liquidity remains explicitly unknown because the provider supplies no depth. |
| Rating | Explicit percentage pill plus commission warning line | Yes | Yes | Yes | Uses governed Plum Duff bands/tokens. |
| Copy / calculator | Compact accessible actions | Yes | Yes | Yes | External links live inside quote blocks. |
| Pagination | Shared 16-row pagination below/above results | Yes | Yes | Yes | Uses Plum Duff shared pagination. |
| Stacked narrow row / filter drawer | Cards before seven columns become unreadable; contained drawer | N/A | Yes | Yes | Switch occurs at 64rem to avoid horizontal table dependence. |
| Bet Summary | Existing qualifying authority, Advanced strategies and Prospecting-only action | Yes | Contained | Yes | No placed-bet/direct exchange action. |

Provider behaviour, ranking, exact event/selection matching, quota handling, stale/last-good state,
Profile eligibility, unknown liquidity and Prospecting idempotency were not changed by CP-083.

## CP-084 filter, settings and density correction — 2026-10-25

The Alpha now implements the observed Selection, Start time, Back, Lay and Rating filter families
against the already loaded provider snapshot. Different dimensions combine with AND; provider and
selection choices within a dimension combine with OR. Numeric minimum liquidity excludes unknown
liquidity rather than treating it as zero or sufficient. Arbs remain hidden by default with an
explicit reveal action. Search is debounced across competition, event, market, selection,
bookmaker and exchange; these client controls do not spend provider credits.

Fund Manager Oddsmatcher preferences use the server-owned, versioned
`oddsmatcher_preferences_json` v1 contract. It stores the approved stake, canonical commission
ratios, provider exclusions, arb/Advanced defaults and named filter definitions. Saved filters have
stable IDs and unique case-insensitive names, support load/rename/delete, and deliberately exclude
Profile context. Profile Account restrictions and exchange commission remain authoritative when a
Profile is selected. Malformed or unknown persisted structures fail closed for review.

Plum Duff private captures and computed geometry are under
`data/private/evidence/cp084-oddsmatcher-parity-20261025/`. The promised current MBB desktop and
narrow references were compared using relative proportions because the chat client resized the
source images. Row, column, quote, gap and rating proportions meet the bounded comparison; the
compact Plum Duff row remains about 12% taller to retain 44px actions and Material card padding.
The additive preference field and bounded UI are installed locally; owner visual acceptance remains
**UNVERIFIED**. Free Bet mode, live liquidity, auto-refresh, direct placement, additional markets
and Bet Summary visual acceptance remain outside this correction.

## CP-085 interaction and containment correction — 2026-10-25

The existing provider, ranking, calculation and Prospecting boundaries are unchanged. The desktop
table now reserves explicit space for Rating and Actions and changes to the established opportunity
card hierarchy at 72rem. Rating pills contain the percentage only. Clicking or keyboard-activating
a non-interactive part of a result opens Bet Summary; child actions remain independent.

Selection, Start time, Back, Lay and Rating use anchored desktop surfaces with inline active counts.
My Filters uses an anchored preset menu with deterministic load, update, rename and delete. Save
as uses a compact Name plus optional Description editor. Descriptions extend the existing validated
version 1 preference contract and remain backward compatible with v1 entries that omit them.

Private browser captures, responsive geometry and the retained MBB-relative comparison are under
`data/private/evidence/cp085-oddsmatcher-parity-20261025/`. Automated evidence is verified; owner
visual acceptance remains **UNVERIFIED**.

## CP-086 filter interaction correction — 2026-10-26

The five filter families retain the CP-085 anchored desktop surfaces and narrow shared sheet.
Back, Lay and Selection-family fields now use the same searchable token combobox rather than fixed
option-chip walls. Start time uses the observed grouped preset hierarchy and reveals the existing
Europe/London custom controls only for Custom range. Per-family Reset and global Clear retain their
separate scopes; filtering remains client-side and does not spend provider credits.

Logical badge counts, dependent Selection pruning and saved-filter restoration operate on the one
canonical filter state. Private captures are under
`data/private/evidence/cp086-oddsmatcher-filter-parity-20261026/`. Automated evidence is verified;
owner interaction and visual acceptance remain **UNVERIFIED**.

## CP-088 status and Bet Summary presentation — 2026-10-26

The owner accepted the CP-087 shared combobox open/close, selection and focus-return contract at
component level. Overall Oddsmatcher acceptance remains pending. Manual Refresh now uses a contained
busy state, coalesces repeat activation and retains last-good opportunities. Unknown liquidity uses
a compact status below the lay quote with a portalled, focusable explanation. With no Profile,
Back and Lay commission are explicit 0%. With a selected Profile, Lay commission resolves
server-side from Profile Account, then validated Oddsmatcher default, then explicit 0%. Missing
Profile context gates Tracker creation rather than calculation.

Bet Summary retains the existing matched-betting preview endpoint and Prospecting-draft mutation.
Its presentation is a responsive two-pane calculator: Back/Lay inputs and Advanced strategy controls
on the left; event/rating context, authoritative outcome components, conservative Total Profit and
the Profile-gated Prospecting action on the right. Advanced adds strategy controls without removing
normal fields or results. Deliberate MBB differences remain Prospecting instead of placement,
unknown-liquidity truth, Profile eligibility and Plum Duff tokens. Private comparison evidence is
under `data/private/evidence/cp088-owner-smoke-followup-20261026/`. The approved qualifying
contract supports zero bookmaker commission; the visible Back Commission field blocks a non-zero
value with an adjacent explanation rather than silently ignoring it.

## CP-089 Bet Summary interaction boundary — 2026-10-26

Bet Summary now includes a disabled `Place lay bet` parity area showing calculated stake and
liability. It has no request or mutation path; Prospecting remains the only Tracker action. Standard
matching alone shows the conservative Total Profit headline. Underlay, Overlay and Custom stakes
retain both outcome tables and omit that single-number headline.

The Settings action opens a compact calculator-display surface with independent Back and Lay
Decimal, Fractional and Moneyline formats. Canonical decimal odds remain the calculation and draft
authority; invalid formatted edits block preview requests. Format choices are local to the open Bet
Summary and default to Decimal on the next summary. Private headless evidence is under
`data/private/evidence/cp089-bet-summary-format-parity-20261026/`; owner acceptance remains pending.

## CP-090 filter, quote and Advanced layout correction — 2026-10-26

Oddsmatcher filter surfaces now constrain their shared grids and composite fields without a
horizontal scrollbar while preserving vertical option scrolling. Desktop and card quotes reserve
the same status-slot height, so unknown-liquidity evidence no longer shifts Lay relative to Back.

Normal and Advanced Bet Summary are compacted for the 1440×1000 owner-like viewport; Advanced
expands within the safe area and short viewports retain contained scrolling. Its visible Min,
current and Max values are the calculator response's Underlay, Standard and Overlay references.
Untouched ranges follow new previews; manually edited bounds persist and fail visibly when they no
longer contain Standard. Private headless evidence is under
`data/private/evidence/cp090-oddsmatcher-layout-state-20261026/`. Owner visual acceptance remains
**UNVERIFIED**.
