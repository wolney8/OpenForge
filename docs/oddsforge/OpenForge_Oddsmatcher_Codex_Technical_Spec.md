# OpenForge Oddsmatcher Clone — Codex/Copilot Technical Specification v2

## Explicit Full-Merge Edition

**Document purpose:** This is a build specification for a Codex AI / GitHub Copilot coding agent to implement an OpenForge-native Oddsmatcher module that is functionally very close to the Matched Betting Blog Oddsmatcher experience shown in the reference screenshots and accompanying analysis.

**Important implementation boundary:** Build a functional clone of the workflow, calculations, interaction model, data model, and UI behaviour. Feel freel to copy source code, APIs, copy, CSS, image assets, and trade dress. We will modify this later. Use OpenForge naming, design tokens, components, and repository conventions.


---

## 0. Explicit Merge Policy and Source Assimilation Guarantee

This v2 document is an explicit merge of:

1. The previous OpenForge Oddsmatcher Codex technical specification.
2. The pasted external technical specification titled `Oddsmatcher Clone — Technical Specification`.
3. The OpenForge matched-betting tracker requirements and calculation model already established in the project files.
4. The screenshots supplied by the user.

The pasted external specification has **not** been treated as inspiration only. Every functional, interaction, mathematical, UX, data-model, stack, and roadmap detail from it is preserved in this document either as:

- a direct implementation requirement;
- a merged OpenForge-native requirement;
- an explicit correction where the pasted source conflicted with screenshot evidence or OpenForge architecture; or
- an explicit deferred requirement where it is out of MVP but must be architected for.

No pasted-source detail is intentionally dropped. Where the pasted source and the previous OpenForge specification overlapped, this document uses the most accurate and useful combined version. Where the pasted source described a behaviour less accurately than the screenshots, the screenshot-derived behaviour wins and the resolution is stated.

### 0.1 Key merge decisions

| Area | Pasted-source detail | Merged OpenForge decision |
|---|---|---|
| Tool identity | Matched-betting arbitrage scanner comparing back odds to lay odds. | Keep this as the core product definition, but frame it as an OpenForge odds-matching and tracker-entry module, not a standalone scanner. |
| Toolbar buttons | Source said `Selection / Start time / Back / Lay / Rating` are column sort toggles. | Corrected: screenshots show these as filter panels/dropdowns. They may also alter sorting where useful, but their primary behaviour is filtering. |
| Rating formula | Source used `BackOdds / LayOdds × 100`. | Preserve as display parity formula. Also keep commission-aware `effectiveRatingPct` internally for warnings/sorting where needed. |
| `Total Profit` wording | Source says `min/average` of outcome legs. | Use `min()` as the conservative displayed value. Standard matching should make both legs nearly equal, but the displayed number must be worst-case. |
| Place lay bet | Source allows direct API placement if integrated. | MVP must deep-link only. Direct bet placement is explicitly out of scope and requires separate compliance/integration review. |
| Live odds | Source proposes feeds, APIs, scraping where compliant. | Preserve provider abstraction and live-update architecture. Use mock provider first. Use only authorised APIs/feeds; no prohibited scraping. |
| Tech stack | Source recommends Next.js, React Query, Tailwind, TanStack Table, NestJS/FastAPI, Postgres, Redis, WebSockets/SSE. | Preserve as recommended if repo is greenfield. Codex must still inspect the existing OpenForge repo and follow actual project conventions first. |
| Roadmap estimates | Source gives 10–15 weeks full-fidelity, 4–5 weeks mock/demo. | Preserve estimates as planning guidance, but Codex implementation is split into smaller agent-safe phases. |

### 0.2 Full pasted-source coverage checklist

The table below explicitly maps every pasted-source section/detail to this v2 specification.

| Pasted-source area/detail | Merged location in this v2 spec | Status |
|---|---|---|
| Scanner compares bookmaker back odds against exchange lay odds. | Product Goal, Functional Scope, Data Model, Odds Aggregation. | Included. |
| Surfaces pairs with smallest spread. | Rating formulas, opportunity sorting, default table sort. | Included. |
| Calculates lay stake to lock in qualifying loss/profit. | Calculation Engine, Bet Summary Modal, Acceptance Tests. | Included. |
| Primary inputs: back odds, lay odds, back stake, commissions, bet type, filters, underlay/overlay bias. | Section 4.3 `Canonical inputs`. | Included. |
| Primary outputs: ranked opportunities, Bet Summary modal, lay stake, liability, outcome table, total profit, deep links. | Section 4.4 `Canonical outputs`, UX, Modal, API. | Included. |
| Rollout badges: 58 bookmakers / 2 markets / 1 exchange. | Header/coverage requirements and API coverage response. | Included as dynamic coverage badges seeded to screenshot-like defaults for mock data. |
| Bet type dropdown in top table and modal. | MVP scope, component tree, modal behaviour. | Included. |
| Search event/market. | Toolbar, API query, table behaviour. | Included. |
| Selection / Start time / Back / Lay / Rating controls. | Toolbar/filter panels. | Included and corrected from “sort toggles” to filter panels with optional sort. |
| `Back 1` badge means one active back filter. | Filter badge state requirements. | Included. |
| Clear resets filters/sorts. | Toolbar requirements. | Included. |
| Settings gear opens preferences. | Settings modal. | Included. |
| Refresh icon force re-fetches odds. | Toolbar and live odds architecture. | Included. |
| My filters saves/loads named filter presets. | Filter preset model/API/UI. | Included; UI shell can ship before persistence. |
| Row click opens Bet Summary modal. | Table behaviour and modal state. | Included. |
| Bookmaker/exchange pill buttons deep-link. | Row cells, deep-link fields, modal CTAs. | Included. |
| Shared odds info icon and tooltip. | Row visual requirements and OddsQuote source fields. | Included explicitly in v2. |
| Copy row icon. | Row actions and clipboard requirements. | Included. |
| Calculator icon opens modal. | Row actions. | Included. |
| Modal bet type dropdown recalculates. | Modal behaviour and calculation engine. | Included. |
| Advanced toggle reveals underlay/standard/overlay slider and range min/max. | Modal layout and Advanced Controls. | Included. |
| Modal settings gear. | Modal layout and settings behaviour. | Included. |
| Back stake input live recalculates. | Modal behaviour. | Included. |
| Back odds editable simulation. | Modal behaviour. | Included. |
| Back commission input. | Modal Back Bet card. | Included. |
| Auto update back odds toggle. | Modal live odds behaviour. | Included explicitly in v2. |
| Lay odds field with refresh icon. | Modal Lay Bet card. | Included. |
| Lay commission default per exchange. | Settings, calculator input, AccountRef defaultCommission. | Included. |
| Auto update lay odds toggle. | Modal live odds behaviour. | Included explicitly in v2. |
| Liquidity label and warning if lay stake > liquidity. | Liquidity warning formula, modal warning, tests. | Included. |
| Underlay/Standard/Overlay buttons. | Advanced controls. | Included. |
| Slider and range min/max fields. | Advanced controls and calculation state. | Included. |
| Copy icon next to lay stake. | Modal clipboard actions. | Included. |
| Go to bookmaker/exchange buttons. | Modal CTA requirements. | Included. |
| Place lay bet button. | Modal CTA requirements; deep-link only in MVP. | Included with compliance correction. |
| Close X discards local edits. | Modal behaviour. | Included. |
| Rating formula examples 5.50/5.60, 1.67/1.73, 2.88/3.05, 9/9.4, 1.73/1.82. | Acceptance tests and calculation examples. | Included. |
| Rating is not EV/probability, it is price-spread ratio. | Calculation Engine notes. | Included. |
| Free-bet mode may use different rating logic. | Rating formulas include display rating and SNR retention rating. | Included. |
| Lay stake formula. | Calculation Engine. | Included. |
| Liability formula. | Calculation Engine. | Included. |
| Outcome/profit table formulas. | Calculation Engine, modal. | Included. |
| Free bet SNR/SR formulas. | Calculation Engine. | Included. |
| Risk-free bet refund-as-free-bet/haircut. | Refund/risk-free mode section. | Included as deferred calculation mode. |
| Advanced biased lay stake formula. | Underlay/overlay section. | Included. |
| Dense table-first landing state. | UX specification. | Included. |
| Scan by rating/start time. | Table behaviour. | Included. |
| Row click drill-down with dimmed table behind modal. | UX specification. | Included. |
| Two-pane modal layout with inputs left and outputs right. | Modal layout. | Included. |
| Live recalculation, no Calculate button. | Modal behaviour. | Included. |
| Advanced opt-in. | Modal requirements. | Included. |
| Exit points to bookmaker/exchange. | CTA requirements. | Included. |
| Colour language: green back/positive, blue lay, red negative, rating thresholds. | Colour language section. | Included. |
| Source Event/Selection/OddsQuote/MatchedOpportunity/BetCalculation interfaces. | Core data model section includes both compact source interfaces and expanded OpenForge interfaces. | Included. |
| Source stack table. | Tech stack section. | Included. |
| Source roadmap phases and time estimates. | Roadmap section includes both Codex phases and original estimates. | Included. |

### 0.3 Terminology rules

Use the following terms consistently in code and UI:

- **Back bet** = bookmaker-side bet on an outcome to happen.
- **Lay bet** = exchange-side bet against the same outcome.
- **Rating** = odds closeness / spread score. It is not EV.
- **Display rating** = `BackOdds / LayOdds × 100`, used for reference-tool parity.
- **Effective rating** = commission-aware rating used for internal warnings and optional sorting.
- **Standard lay stake** = even-matched calculated lay stake.
- **User chosen lay stake** = lay stake after underlay/overlay/manual override.
- **Liability** = exchange exposure if the lay bet loses.
- **Total profit** = conservative/worst-case displayed result.

---

## 1. Product Goal

OpenForge needs an Oddsmatcher-style module that lets a user:

1. View a ranked table of matched betting opportunities.
2. Compare bookmaker **back odds** against exchange **lay odds** for the same event, market, and selection.
3. Filter opportunities by selection, start time, bookmaker, exchange, back odds, lay odds, lay liquidity, rating, and search text.
4. Open a row-level **Bet Summary** modal.
5. Calculate lay stake, exchange liability, and profit/loss across outcome scenarios.
6. Use advanced underlay/overlay controls.
7. Deep-link out to bookmaker and exchange sites.
8. Add the planned bet directly into the OpenForge tracker as a `Qualifying Bet` or `Free Bet` record.
9. Respect OpenForge account health, gubbed bookmaker exclusions, manual balances, and existing tracker ledgers.

The product should feel almost identical in workflow to the reference tool: fast searchable table first, modal calculator second, tracker integration third.

---

## 2. Current OpenForge Context To Preserve

OpenForge is not just an odds scanner. It is evolving from a matched betting tracker with account balances, qualifying bets, free bets, casino offers, mug bets, cash adjustments, dashboards, and Apps Script/dashboard heritage.

Codex must preserve these platform principles:

- One user / account holder context per tracker workspace.
- No old `Week X` source-sheet architecture.
- One row per actual bet or meaningful campaign.
- `Accounts` remains the master source for bookmaker/exchange metadata and account health.
- Balances are manual-edit first and must not be silently overwritten by calculator output.
- P&L reporting defaults to `DateSettled`.
- Cash adjustments such as deductions, top-ups, subscriptions, and withdrawals remain explicit records, not hidden notes.
- Qualifying-to-free-bet transition is a core workflow and should be accelerated by this module.

OpenForge must use the Oddsmatcher as a **front-door entry workflow** into the tracker, not as a separate standalone calculator.

---

## 3. Build Principles For Codex

### 3.1 Agent rules

Before editing code:

1. Inspect the repository structure.
2. Identify the existing frontend framework, backend framework, ORM, test runner, and styling system.
3. Reuse existing OpenForge conventions over the stack suggestions in this document.
4. Implement calculation logic as pure functions first.
5. Add unit tests before wiring UI.
6. Avoid broad refactors unless explicitly required.
7. Do not modify unrelated tracker modules except through clearly defined integration boundaries.
8. Do not build real bet placement in MVP. The primary CTA should deep-link to the bookmaker/exchange; direct placement requires a separate regulated/integration review.

### 3.2 Technical priority order

1. Calculation engine.
2. Mock/static opportunity table.
3. Bet Summary modal.
4. Filters and settings.
5. Tracker integration.
6. Live odds connectors.
7. Advanced modes and edge cases.

---

## 4. Functional Scope

### 4.1 MVP features

The MVP must include:

- Oddsmatcher page/route.
- Header with rollout/coverage badges.
- Bet-type dropdown.
- Search input.
- Filter toolbar: `Selection`, `Start time`, `Back`, `Lay`, `Rating`, `Clear`.
- Settings button.
- Refresh button.
- My Filters button.
- Ranked results table.
- Row-level bookmaker and exchange odds pills.
- Row-level rating pill.
- Row click opens Bet Summary modal.
- Calculator icon opens Bet Summary modal.
- Copy icon copies row/calculation data.
- Bet Summary modal with:
  - bet type,
  - back stake,
  - back odds,
  - back commission,
  - lay odds,
  - lay commission,
  - lay liquidity,
  - calculated lay stake,
  - liability,
  - outcome table,
  - total profit,
  - advanced toggle,
  - underlay/standard/overlay controls,
  - copy lay stake,
  - deep links,
  - add-to-tracker action.

### 4.2 Non-MVP but architect now

- Live bookmaker odds feeds.
- Live exchange order books.
- Saved filter presets.
- User-specific commission defaults.
- Gubbed bookmaker exclusion from `Accounts`.
- Account balance warnings.
- Part lays.
- Multilay.
- Money-back/refund modes.
- Price boost / profit boost modes.
- EP and 2UP support.


### 4.3 Canonical inputs from the reference scanner

The implementation must support every input category identified in the pasted source spec.

| Input | Source | OpenForge handling |
|---|---|---|
| Back Odds | Bookmaker quote source, e.g. BetTOM in screenshots | `OddsQuote.side = BACK`; displayed in Back Odds pill; editable in modal for simulation. |
| Lay Odds | Exchange quote source, e.g. Smarkets in screenshots | `OddsQuote.side = LAY`; displayed in Lay Odds pill; editable in modal; refreshable. |
| Back Stake | User-entered | Default `£10`; persisted in `OddsmatcherSettings.defaultBackStake`; modal override local until saved or added to tracker. |
| Back Commission | User-entered or default | Usually `0`; keep input for completeness and future provider support. |
| Lay Commission | User-entered or exchange default | Stored as decimal fraction internally; displayed as `%`; defaults from exchange/account settings. |
| Bet Type | Dropdown | Must exist in table header and modal; changing it recalculates lay stake, liability, rating/output values. |
| Market filters | Toolbar/filter panels | Includes Selection, Start time, Back, Lay, Rating, free-text search. |
| Underlay/Overlay bias | Advanced slider/buttons | Optional; adjusts lay stake away from standard matched amount. |

### 4.4 Canonical outputs from the reference scanner

The implementation must output every major result category identified in the pasted source spec.

| Output | Where displayed | OpenForge handling |
|---|---|---|
| Ranked matched opportunities | Main table | Sorted by rating desc by default, then start time asc. |
| Date/start time | Date column | Uses event start timestamp; supports local display. |
| Event | Event column | Bold event name; venue/competition beneath. |
| Selection/bet | Bet column | Bold selection; market beneath. |
| Back Odds + bookmaker | Back Odds column | Bookmaker pill plus odds; deep-link on click. |
| Lay Odds + exchange | Lay Odds column | Exchange pill plus odds and liquidity; deep-link on click. |
| Rating % | Rating column | Rounded pill; display rating defaults to `BackOdds / LayOdds × 100`. |
| Lay Stake | Bet Summary modal | Calculated by selected bet mode; copyable. |
| Liability | Bet Summary modal | Calculated from lay stake and lay odds. |
| If back wins table | Bet Summary modal | Bookmaker, exchange, total columns. |
| If lay wins table | Bet Summary modal | Bookmaker, exchange, total columns. |
| Total Profit | Bet Summary modal | Worst-case/conservative outcome, normally qualifying loss in qualifying mode. |
| Deep links | Row and modal CTAs | Bookmaker and exchange link-out buttons. |
| Tracker row creation | OpenForge-only enhancement | Add planned/placed qualifying bet or free bet record from the modal. |

### 4.5 Explicit row, toolbar, and modal interaction requirements

This table is the canonical interaction map. It preserves the pasted source detail and resolves the one screenshot conflict about sort-vs-filter behaviour.

| Element | Location | Required behaviour |
|---|---|---|
| Rollout status badges | Header | Show coverage counts: bookmakers, markets, exchanges. Mock data may initialise to screenshot-style `58 bookmakers`, `2 markets`, `1 exchange`; live data must calculate dynamically and include `lastUpdatedAtUtc`. |
| Bet Type dropdown | Top of table and modal | Switches formula mode for rows/calculations. Must support at least Normal/Qualifying, Free Bet SNR, Free Bet SR, Risk Free/Money Back. |
| Search event/market | Toolbar | Debounced text filter over event, venue/competition, market, selection and optionally bookmaker/exchange. |
| Selection button | Toolbar | Opens selection filter panel: sport, competition, event name, market, selection, exclude draws. May also allow sort if product adds it, but primary behaviour is filtering. |
| Start time button | Toolbar | Opens start-time filter panel: any time, next hour, next 3 hours, today, tomorrow, custom. |
| Back button and active badge | Toolbar | Opens back-side filter panel: bookmaker multiselect, min/max back odds. Badge such as `Back 1` indicates active filter count. |
| Lay button | Toolbar | Opens lay-side filter panel: exchange selection, min/max lay odds, min lay liquidity. |
| Rating button | Toolbar | Opens rating filter panel: min/max rating and `Show arbs` toggle. |
| Clear | Toolbar | Clears active filters and sorts to default; must not reset persistent settings. |
| Settings gear | Toolbar | Opens global preferences: default stake, default commissions, bookmaker account inclusion/exclusion, odds format, rating thresholds, refresh interval, advanced defaults. |
| Refresh icon | Toolbar | Forces odds re-fetch or mock reload while preserving filters. Marks rows stale/refreshing as appropriate. |
| My filters | Toolbar | Opens saved filter preset UI. MVP may show disabled/pending state, but persistence is required by Phase 6. |
| Table row click | Results table | Opens Bet Summary modal for the row, prefilled with row odds and settings. |
| Bookmaker odds pill | Results table | Opens bookmaker deep link in new tab/window. Should not trigger modal if clicked directly. |
| Exchange odds pill | Results table | Opens exchange deep link. Should not trigger modal if clicked directly. |
| Shared odds label/icon | In row under odds | If quote source is `SHARED` or confidence is not high, show `Shared odds` indicator with tooltip explaining odds source/pooled/shared/stale status. |
| Copy row icon | Row action | Copies structured row data: event, market, selection, bookmaker, back odds, exchange, lay odds, liquidity, rating. |
| Calculator icon | Row action | Opens Bet Summary modal directly. |
| Modal bet type dropdown | Modal top-left | Recalculates stake, liability, outcome tables and total profit using selected formula. |
| Advanced toggle | Modal top area | Reveals/hides underlay/standard/overlay buttons, slider, range min/max fields. Default off unless user setting says otherwise. |
| Modal settings gear | Modal top/right | Opens per-bet calculation settings: rounding, exchange default commission, advanced range defaults. |
| Back Stake field | Modal Back Bet card | Numeric money input. Recalculates live on change. |
| Back Odds field | Modal Back Bet card | Editable decimal odds. Manual edit disables auto-update for back odds until re-enabled. |
| Back Commission field | Modal Back Bet card | Percentage input, usually 0. Included in state even if not used in MVP formulas. |
| Auto update back odds toggle | Modal Back Bet card | When on, live odds updates may update the back odds field. When off or manually edited, freeze local value. |
| Lay Odds field | Modal Lay Bet card | Editable decimal odds. Manual edit disables auto-update for lay odds until re-enabled. |
| Lay odds refresh icon | Modal Lay Bet card | Pulls latest lay price/liquidity for this market/selection only. |
| Lay Commission field | Modal Lay Bet card | Percentage input defaulted from exchange/account settings. Recalculates live. |
| Auto update lay odds toggle | Modal Lay Bet card | When on, exchange quote updates may update lay odds and liquidity. When off or manually edited, freeze local value. |
| Liquidity label | Modal Lay Bet card | Read-only liquidity at displayed lay odds. If lay stake exceeds liquidity, show warning but do not block tracker creation. |
| Underlay button | Advanced controls | Sets lay stake below standard lay stake, improving back-win scenario and worsening lay-win scenario. |
| Standard button | Advanced controls | Restores exact calculated standard lay stake. |
| Overlay button | Advanced controls | Sets lay stake above standard lay stake, improving lay-win scenario and worsening back-win scenario. |
| Slider | Advanced controls | Continuous user chosen lay stake between range min/max. |
| Range Min / Range Max fields | Advanced controls | Editable absolute stake bounds. Typing values updates slider constraints and recalculates. |
| Copy icon next to Lay Stake | Modal CTA block | Copies exact lay stake to clipboard, rounded according to settings. |
| Go to bookmaker | Modal Back Bet card | Opens bookmaker deep link. |
| Go to exchange | Modal Lay Bet card | Opens exchange deep link. |
| Place lay bet | Modal CTA block | MVP: deep-link only. Do not place bets automatically. Future direct placement requires separate review. |
| X close | Modal | Discards unsaved modal edits and returns to table. Does not affect any already-created tracker row or external bets. |

---

## 5. UX Specification



### 5.0 Reference UX flow to preserve

This is the merged UX audit from the pasted source spec and screenshot analysis:

1. **Landing state:** the dense opportunities table is the hero. There is no separate search-first workflow.
2. **Scanning:** the user scans by rating and/or start time to find near-100% matches happening soon.
3. **Drill-down:** clicking a row opens the Bet Summary modal with the table dimmed behind it, preserving place/context.
4. **Two-pane calculator:** inputs are on the left, outputs on the right. Back and Lay cards use distinct colour language.
5. **Reactive calculation:** every stake/odds/commission/bias edit recalculates immediately. There must be no separate `Calculate` button.
6. **Escalation path:** Advanced mode is opt-in and hidden by default.
7. **Exit points:** the tool is decision-support first. It links to bookmaker/exchange sites. OpenForge additionally supports add-to-tracker actions.
8. **Colour language:** green means bookmaker/back/positive, blue means exchange/lay, red means negative, muted grey means secondary info.

### 5.1 Main layout

The Oddsmatcher page should be table-first.

Top area:

- Left: bet-type dropdown, default `Normal/Qualifying Bet`.
- Centre: large search input with placeholder similar to `Search event and market...`.
- Right: `Settings` with gear icon.
- Secondary row: filter buttons and utility actions.

Table columns:

1. `Date`
2. `Event`
3. `Bet` / `Selection`
4. `Back Odds`
5. `Lay Odds`
6. `Rating`
7. Row actions

Row visual behaviour:

- Event column shows event name in bold and venue/competition beneath.
- Bet column shows selection in bold and market beneath.
- Back odds displayed as bookmaker pill with odds below.
- Lay odds displayed as exchange pill with odds below and liquidity below.
- Rating displayed as rounded pill.
- Row actions include copy and calculator/open modal.

### 5.2 Modal layout

The Bet Summary modal is a two-column layout.

Left column:

- Bet type selector.
- Back Bet card.
- Lay Bet card.
- Advanced controls if enabled.
- Lay stake/liability CTA block.

Right column:

- Event metadata.
- Rating pill.
- Outcome table if back wins.
- Outcome table if lay wins.
- Total Profit.
- Add-to-tracker action.

The modal must recalculate live on every relevant input change. No separate calculate button.

### 5.3 Colour language

Use OpenForge tokens, but preserve the meaning:

- Back/bookmaker: green-tinted panel.
- Lay/exchange: blue-tinted panel.
- Positive values: green.
- Negative values: red.
- Neutral/info: muted grey.
- Rating pill:
  - `>= 100%`: strong green / arb indicator, hidden by default unless `Show arbs` is enabled.
  - `97% - 99.99%`: green.
  - `94% - 96.99%`: pale green.
  - `90% - 93.99%`: amber.
  - `< 90%`: muted/low priority.

---

## 6. Data Model

Use existing OpenForge naming and ORM conventions. If Prisma/PostgreSQL is used, the schema below can map directly. If another persistence layer exists, keep the logical model intact.



### 6.0 Compact source-spec interfaces retained for parity

The pasted source spec used a compact data model. Keep these shapes conceptually available even if the implementation uses the richer OpenForge interfaces below. They are useful for mock fixtures, tests, and Codex reasoning.

```ts
interface SourceSpecEvent {
  id: string;
  sport: 'horse_racing' | 'football' | 'tennis' | 'golf' | 'greyhound_racing' | 'other';
  eventName: string;      // e.g. "Kempton"
  startTime: string;      // ISO DateTime, e.g. "2026-07-08T20:20:00"
  market: string;         // e.g. "Winner"
}

interface SourceSpecSelection {
  id: string;
  eventId: string;
  name: string;           // e.g. "Gladiadora"
}

interface SourceSpecOddsQuote {
  selectionId: string;
  side: 'back' | 'lay';
  bookmakerId: string;    // e.g. "BetTOM" or "Smarkets"
  odds: number;           // decimal odds
  liquidity?: number;     // exchange only, money available at displayed lay price
  commission?: number;    // decimal fraction, e.g. 0.02
  fetchedAt: string;
}

interface SourceSpecMatchedOpportunity {
  id: string;
  selectionId: string;
  backQuote: SourceSpecOddsQuote;
  layQuote: SourceSpecOddsQuote;
  rating: number;
  betType: 'qualifying' | 'free_bet_snr' | 'free_bet_sr' | 'risk_free';
}

interface SourceSpecBetCalculation {
  backStake: number;
  backOdds: number;
  backCommission: number;
  layOdds: number;
  layCommission: number;
  layStake: number;
  liability: number;
  biasPercent?: number;
  outcomeIfBackWins: { bookmaker: number; exchange: number; total: number };
  outcomeIfLayWins: { bookmaker: number; exchange: number; total: number };
  totalProfit: number;
}
```

### 6.1 Core entities

```ts
export type SportCode =
  | 'horse_racing'
  | 'football'
  | 'tennis'
  | 'golf'
  | 'greyhound_racing'
  | 'other';

export type BetMode =
  | 'QUALIFYING'
  | 'FREE_BET_SNR'
  | 'FREE_BET_SR'
  | 'MONEY_BACK_IF_LOSES'
  | 'RISK_FREE'
  | 'PRICE_BOOST'
  | 'PROFIT_BOOST';

export type MatchStrategy = 'EVEN' | 'UNDERLAY' | 'OVERLAY';

export type OddsSide = 'BACK' | 'LAY';
```

### 6.2 Event

```ts
export interface SportsEvent {
  id: string;
  externalProviderId?: string;
  sport: SportCode;
  competition?: string;
  venue?: string;
  eventName: string;
  startTimeUtc: string;
  status: 'SCHEDULED' | 'LIVE' | 'SETTLED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 Market

```ts
export interface Market {
  id: string;
  eventId: string;
  marketType: string;       // e.g. WINNER, MATCH_ODDS, EACH_WAY
  marketName: string;       // e.g. Winner
  allowsDraw?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.4 Selection

```ts
export interface Selection {
  id: string;
  marketId: string;
  selectionName: string;
  normalizedName: string;
  outcomeType?: 'HOME' | 'DRAW' | 'AWAY' | 'RUNNER' | 'OTHER';
  runnerNumber?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 6.5 Bookmaker / exchange account reference

This should map into the existing OpenForge `Accounts` concept.

```ts
export interface AccountRef {
  id: string;
  displayName: string;
  type: 'BOOKMAKER' | 'EXCHANGE' | 'BOOKMAKER_AND_EXCHANGE';
  walletGroup?: string;
  countsInCashTotal: boolean;
  status:
    | 'HEALTHY'
    | 'NOT_SIGNED_UP'
    | 'PENDING_SIGN_UP'
    | 'STAKE_RESTRICTED'
    | 'GUBBED'
    | 'BLOCKED'
    | 'NOT_USING';
  defaultCommission?: number;
  currentBalance?: number;
  pendingWithdrawalAmount?: number;
  lastPromoUsed?: string;
  lastMugBetDate?: string;
}
```

### 6.6 Odds quote

```ts
export interface OddsQuote {
  id: string;
  provider: string;
  eventId: string;
  marketId: string;
  selectionId: string;
  accountId: string;
  side: OddsSide;
  oddsDecimal: number;
  liquidity?: number;
  commission?: number;
  sourceType: 'API' | 'SCRAPE' | 'MANUAL' | 'SHARED' | 'MOCK';
  sourceConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  deepLinkUrl?: string;
  fetchedAtUtc: string;
  expiresAtUtc?: string;
}
```

### 6.7 Matched opportunity

This can be a computed view from joined back/lay quotes. Persist snapshots only when needed.

```ts
export interface MatchedOpportunity {
  id: string;
  eventId: string;
  marketId: string;
  selectionId: string;
  backQuoteId: string;
  layQuoteId: string;
  bookmakerAccountId: string;
  exchangeAccountId: string;
  backOdds: number;
  layOdds: number;
  layLiquidity?: number;
  layCommission: number;
  displayRatingPct: number;
  effectiveRatingPct: number;
  freeBetRetentionPct?: number;
  isArb: boolean;
  isGubbedExcluded: boolean;
  startsAtUtc: string;
  createdFromSnapshotAtUtc: string;
}
```

### 6.8 User settings

```ts
export interface OddsmatcherSettings {
  id: string;
  userId: string;
  defaultBetMode: BetMode;
  defaultBackStake: number;
  defaultExchangeAccountId?: string;
  commissionByExchange: Record<string, number>;
  excludedAccountIds: string[];
  includeGubbedAccounts: boolean;
  showArbsDefault: boolean;
  ratingWarningThresholdPct: number;
  advancedDefaultEnabled: boolean;
  defaultUnderlayPct: number;
  defaultOverlayPct: number;
  roundLayStakeToDp: number;
  roundLiabilityToDp: number;
  oddsRefreshSeconds: number;
}
```

### 6.9 Filter preset

```ts
export interface OddsmatcherFilterPreset {
  id: string;
  userId: string;
  name: string;
  filters: OddsmatcherFilters;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.10 Filter state

```ts
export interface OddsmatcherFilters {
  betMode: BetMode;
  searchText?: string;

  sport?: SportCode;
  competition?: string;
  eventName?: string;
  market?: string;
  selection?: string;
  excludeDraws?: boolean;

  startTimePreset?:
    | 'ANY'
    | 'NEXT_1H'
    | 'NEXT_3H'
    | 'TODAY'
    | 'TOMORROW'
    | 'CUSTOM';
  startTimeFromUtc?: string;
  startTimeToUtc?: string;

  bookmakerAccountIds?: string[];
  exchangeAccountIds?: string[];

  minBackOdds?: number;
  maxBackOdds?: number;
  minLayOdds?: number;
  maxLayOdds?: number;
  minLayLiquidity?: number;

  minRatingPct?: number;
  maxRatingPct?: number;
  showArbs?: boolean;

  sortBy?: 'RATING' | 'START_TIME' | 'BACK_ODDS' | 'LAY_ODDS' | 'LIQUIDITY';
  sortDirection?: 'ASC' | 'DESC';
}
```

---

## 7. Calculation Engine

Create a pure shared package/module, for example:

```text
packages/oddsmatcher-core
  src/
    types.ts
    rounding.ts
    qualifying.ts
    freeBet.ts
    refund.ts
    underlayOverlay.ts
    rating.ts
    index.ts
  tests/
    qualifying.test.ts
    freeBet.test.ts
    rating.test.ts
    underlayOverlay.test.ts
```

No UI code should contain raw calculation formulas. UI calls the calculation engine.

### 7.1 Internal precision and display rounding

- Store odds as decimal numbers.
- Store commission as decimal fraction: `0.02` means 2%.
- Use internal money precision to at least 4 decimal places during calculation.
- Display money to 2 decimal places.
- Display rating to 2 decimal places.
- Never use formatted strings in calculations.

### 7.2 Rating formulas

For reference-tool parity, default display rating is:

```ts
export function displayRatingPct(backOdds: number, layOdds: number): number {
  return (backOdds / layOdds) * 100;
}
```

For internal commission-aware sorting/warnings, also compute:

```ts
export function effectiveRatingPct(
  backOdds: number,
  layOdds: number,
  layCommission: number,
): number {
  return (backOdds / (layOdds - layCommission)) * 100;
}
```

For free-bet SNR retained value percentage:

```ts
export function freeBetSnrRetentionPct(
  backOdds: number,
  layOdds: number,
  layCommission: number,
): number {
  return (((backOdds - 1) * (1 - layCommission)) / (layOdds - layCommission)) * 100;
}
```



### 7.2A Source-spec formula examples and parity checks

The pasted source spec verified the display rating formula against visible screenshot rows. These examples must remain in tests or test fixtures:

```ts
expect(displayRatingPct(5.50, 5.60)).toBeCloseTo(98.21, 2);
expect(displayRatingPct(1.67, 1.73)).toBeCloseTo(96.53, 2);
expect(displayRatingPct(2.88, 3.05)).toBeCloseTo(94.43, 2);
expect(displayRatingPct(9.00, 9.40)).toBeCloseTo(95.74, 2);
expect(displayRatingPct(1.73, 1.82)).toBeCloseTo(95.05, 2);
```

Product note: rating is **not expected value** and is not a true probability calculation. It is a price-spread ratio. The closer it is to `100%`, the tighter the match for qualifying bets. Results above `100%` are arbs and should be hidden by default unless `Show arbs` is enabled.

For free-bet modes, keep the same display rating for table parity if desired, but expose mode-specific value/retention metrics internally and in future advanced UI. This avoids confusing a user by changing the meaning of the visible rating without explanation.

### 7.3 Qualifying bet formula

```ts
export interface QualifyingInput {
  backStake: number;
  backOdds: number;
  layOdds: number;
  layCommission: number;
  layStakeOverride?: number;
}

export interface ScenarioOutcome {
  bookmaker: number;
  exchange: number;
  total: number;
}

export interface BetCalculationResult {
  backStake: number;
  backOdds: number;
  layOdds: number;
  layCommission: number;
  standardLayStake: number;
  layStake: number;
  liability: number;
  ifBackWins: ScenarioOutcome;
  ifLayWins: ScenarioOutcome;
  totalProfit: number;
  displayRatingPct: number;
  effectiveRatingPct: number;
}

export function calculateQualifyingBet(input: QualifyingInput): BetCalculationResult {
  const standardLayStake = (input.backStake * input.backOdds) / (input.layOdds - input.layCommission);
  const layStake = input.layStakeOverride ?? standardLayStake;
  const liability = layStake * (input.layOdds - 1);

  const ifBackWins = {
    bookmaker: input.backStake * (input.backOdds - 1),
    exchange: -liability,
    total: input.backStake * (input.backOdds - 1) - liability,
  };

  const ifLayWins = {
    bookmaker: -input.backStake,
    exchange: layStake * (1 - input.layCommission),
    total: -input.backStake + layStake * (1 - input.layCommission),
  };

  return {
    backStake: input.backStake,
    backOdds: input.backOdds,
    layOdds: input.layOdds,
    layCommission: input.layCommission,
    standardLayStake,
    layStake,
    liability,
    ifBackWins,
    ifLayWins,
    totalProfit: Math.min(ifBackWins.total, ifLayWins.total),
    displayRatingPct: displayRatingPct(input.backOdds, input.layOdds),
    effectiveRatingPct: effectiveRatingPct(input.backOdds, input.layOdds, input.layCommission),
  };
}
```

### 7.4 Free bet SNR formula

```ts
export interface FreeBetInput {
  freeBetValue: number;
  backOdds: number;
  layOdds: number;
  layCommission: number;
  layStakeOverride?: number;
}

export function calculateFreeBetSnr(input: FreeBetInput): BetCalculationResult {
  const standardLayStake =
    (input.freeBetValue * (input.backOdds - 1)) /
    (input.layOdds - input.layCommission);

  const layStake = input.layStakeOverride ?? standardLayStake;
  const liability = layStake * (input.layOdds - 1);

  const ifBackWins = {
    bookmaker: input.freeBetValue * (input.backOdds - 1),
    exchange: -liability,
    total: input.freeBetValue * (input.backOdds - 1) - liability,
  };

  const ifLayWins = {
    bookmaker: 0,
    exchange: layStake * (1 - input.layCommission),
    total: layStake * (1 - input.layCommission),
  };

  return {
    backStake: input.freeBetValue,
    backOdds: input.backOdds,
    layOdds: input.layOdds,
    layCommission: input.layCommission,
    standardLayStake,
    layStake,
    liability,
    ifBackWins,
    ifLayWins,
    totalProfit: Math.min(ifBackWins.total, ifLayWins.total),
    displayRatingPct: displayRatingPct(input.backOdds, input.layOdds),
    effectiveRatingPct: freeBetSnrRetentionPct(input.backOdds, input.layOdds, input.layCommission),
  };
}
```

### 7.5 Free bet SR formula

Stake-returned free bets use the qualifying lay stake formula but should still be tracked as free-bet value, not normal cash stake.

```ts
export function calculateFreeBetSr(input: FreeBetInput): BetCalculationResult {
  return calculateQualifyingBet({
    backStake: input.freeBetValue,
    backOdds: input.backOdds,
    layOdds: input.layOdds,
    layCommission: input.layCommission,
    layStakeOverride: input.layStakeOverride,
  });
}
```



### 7.5A Risk-free / money-back-if-bet-loses mode

The pasted source spec identifies `Risk Free Bet` as a mode where the normal qualifying formula is used, but the modal also nets off a refund-as-free-bet value, usually with a conversion haircut such as 70–80%.

OpenForge must model this without hiding value in notes:

```ts
export interface RiskFreeRefundInput {
  backStake: number;
  backOdds: number;
  layOdds: number;
  layCommission: number;
  refundType: 'CASH' | 'FREE_BET' | 'SITE_CREDIT';
  refundValue: number;
  refundCap?: number;
  refundConversionRate?: number; // e.g. 0.75 if refund is expected to convert at 75%
  layStakeOverride?: number;
}
```

MVP may defer full settlement logic, but the architecture must support:

- trigger bet calculation using the normal qualifying formula;
- expected refund value if the bookmaker bet loses;
- configurable conversion rate/haircut;
- creation of a linked downstream free-bet/refund benefit record if the refund is actually awarded;
- transparent `expectedRefundValue` rather than burying the value in `UserNotes`.

### 7.6 Underlay / overlay

```ts
export interface BiasInput {
  standardLayStake: number;
  strategy: MatchStrategy;
  biasPercent: number;
}

export function applyLayStakeBias(input: BiasInput): number {
  if (input.strategy === 'EVEN') return input.standardLayStake;
  if (input.strategy === 'UNDERLAY') return input.standardLayStake * (1 - Math.abs(input.biasPercent));
  return input.standardLayStake * (1 + Math.abs(input.biasPercent));
}
```

The UI slider may provide absolute stake values or percentage bias. Store both:

- `standardLayStake`
- `userChosenLayStake`
- `matchStrategy`
- `targetBias`

### 7.7 Liquidity warning

```ts
export function liquidityStatus(layStake: number, layLiquidity?: number) {
  if (layLiquidity == null) return 'UNKNOWN';
  return layLiquidity >= layStake ? 'OK' : 'INSUFFICIENT_LIQUIDITY';
}
```

If insufficient:

- Show warning in modal.
- Allow user to proceed manually.
- Do not block add-to-tracker, but mark `LiquidityWarning = true` on the created tracker record.

---

## 8. Tracker Integration

### 8.1 Add to tracker action

From the modal, provide:

- `Add planned qualifying bet`
- `Add placed qualifying bet`
- `Add free bet prospect`
- `Add placed free bet`

The action should create a tracker row and include the odds snapshot used in the calculation.

### 8.2 Qualifying Bets mapping

Create a `Qualifying Bets` record with:

```ts
export interface QualifyingBetCreateInput {
  source: 'ODDSMATCHER';
  sourceOpportunityId: string;
  oddsSnapshotAtUtc: string;

  offerGroupId?: string;
  relatedFreeBetId?: string;

  datePlaced?: string;
  dateSettled?: string;
  fixtureDate: string;

  bookmakerAccountId: string;
  exchangeAccountId: string;
  fixtureType: string;
  eventName: string;
  market: string;
  selection: string;

  betType: 'QUALIFYING';
  offerType?: string;
  offerName?: string;

  backStake: number;
  backOdds: number;
  layOdds1: number;
  layStake1: number;
  layCommission1: number;
  liability1: number;

  matchStrategy: MatchStrategy;
  evenLayStakeReference: number;
  userChosenLayStake?: number;

  status: 'PLANNED' | 'PLACED' | 'AWAITING_SETTLEMENT' | 'FREE_BET_OBTAINED' | 'SETTLED';
  result?: 'BACK_WIN' | 'LAY_WIN' | 'VOID' | 'PARTIAL' | 'CANCELLED';

  calcProfitIfBackWins: number;
  calcProfitIfLayWins: number;
  expectedQualifyingCost: number;
  netPnL?: number;

  userNotes?: string;
  tags?: string[];
}
```

### 8.3 Free Bets mapping

```ts
export interface FreeBetCreateInput {
  source: 'ODDSMATCHER';
  sourceOpportunityId: string;
  oddsSnapshotAtUtc: string;

  originQualBetId?: string;
  offerGroupId?: string;

  dateAwarded?: string;
  datePlaced?: string;
  dateSettled?: string;
  expiryDateTime?: string;

  bookmakerAccountId: string;
  exchangeAccountId: string;
  fixtureType: string;
  eventName: string;
  market: string;
  selection: string;

  betType: 'FREE_BET';
  offerType?: string;
  offerName?: string;

  freeBetValue: number;
  freeBetRetentionMode: 'SNR' | 'SR';
  backOdds: number;
  layOdds1: number;
  layStake1: number;
  layCommission1: number;
  liability1: number;

  matchStrategy: MatchStrategy;
  evenLayStakeReference: number;
  userChosenLayStake?: number;

  status: 'PROSPECTING' | 'WAITING_BONUS' | 'PLANNED' | 'PLACED' | 'SETTLED' | 'EXPIRED';
  result?: 'BACK_WIN' | 'LAY_WIN' | 'VOID' | 'PARTIAL' | 'CANCELLED';

  calcProfitIfBackWins: number;
  calcProfitIfLayWins: number;
  expectedFreeBetProfit: number;
  netPnL?: number;

  userNotes?: string;
  tags?: string[];
}
```

### 8.4 Balance/exposure integration

Before creating a placed bet record, the modal should display:

- Bookmaker balance.
- Exchange balance.
- Back stake required.
- Exchange liability required.
- Whether balances appear sufficient.

Do not update balances automatically in MVP. Instead:

- Create the bet record.
- Increase open exposure calculation.
- Let the user update balances manually or via future balance workflow.

### 8.5 Gubbed bookmaker handling

Default behaviour:

- Exclude accounts where `status = GUBBED` or `status = BLOCKED`.
- Show excluded count in settings/filter UI.
- Allow temporary include only if user explicitly toggles `Include gubbed/restricted`.

---

## 9. API Contract

Adapt routes to current OpenForge conventions.

### 9.1 Fetch opportunities

```http
GET /api/oddsmatcher/opportunities
```

Query params:

```ts
{
  betMode?: BetMode;
  searchText?: string;
  sport?: string;
  competition?: string;
  market?: string;
  selection?: string;
  excludeDraws?: boolean;
  startTimePreset?: string;
  startTimeFromUtc?: string;
  startTimeToUtc?: string;
  bookmakerAccountIds?: string;
  exchangeAccountIds?: string;
  minBackOdds?: number;
  maxBackOdds?: number;
  minLayOdds?: number;
  maxLayOdds?: number;
  minLayLiquidity?: number;
  minRatingPct?: number;
  maxRatingPct?: number;
  showArbs?: boolean;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  pageSize?: number;
}
```

Response:

```ts
{
  data: MatchedOpportunityRow[];
  page: number;
  pageSize: number;
  total: number;
  coverage: {
    bookmakerCount: number;
    marketCount: number;
    exchangeCount: number;
    lastUpdatedAtUtc: string;
  };
}
```

### 9.2 Calculate bet

```http
POST /api/oddsmatcher/calculate
```

Body:

```ts
{
  betMode: BetMode;
  backStake: number;
  freeBetValue?: number;
  backOdds: number;
  backCommission?: number;
  layOdds: number;
  layCommission: number;
  layLiquidity?: number;
  matchStrategy: MatchStrategy;
  userChosenLayStake?: number;
  biasPercent?: number;
}
```

Response:

```ts
BetCalculationResult & {
  liquidityStatus: 'OK' | 'INSUFFICIENT_LIQUIDITY' | 'UNKNOWN';
  warnings: string[];
}
```

### 9.3 Settings

```http
GET /api/oddsmatcher/settings
PUT /api/oddsmatcher/settings
```

### 9.4 Filter presets

```http
GET /api/oddsmatcher/filter-presets
POST /api/oddsmatcher/filter-presets
PUT /api/oddsmatcher/filter-presets/:id
DELETE /api/oddsmatcher/filter-presets/:id
```

### 9.5 Add to tracker

```http
POST /api/tracker/qualifying-bets/from-oddsmatcher
POST /api/tracker/free-bets/from-oddsmatcher
```



## 9A. Recommended Tech Stack — Explicit Merge of Source Spec and OpenForge Rule

Codex must first inspect the existing OpenForge repository. Existing project conventions override these recommendations. If OpenForge is greenfield or compatible, use the stack below.

| Layer | Recommendation | Why / merged decision |
|---|---|---|
| Frontend | React / Next.js + TypeScript | Component-heavy table and modal UI. Next.js is suitable where SSR/routing is already used; otherwise Vite/SPA is acceptable if OpenForge uses it. |
| State/data fetching | TanStack Query / React Query | Odds data needs caching, stale-time handling, retries, refresh, and polling/live-update integration. |
| Styling | OpenForge design tokens first; Tailwind + Headless/Radix primitives if used by repo | Preserve reference pill/modal/filter feel without copying external CSS/trade dress. |
| Table | TanStack Table | Sorting, filtering, column config, server pagination, and high-density results table. |
| Backend/API | Existing OpenForge API conventions; NestJS/Node or FastAPI if choosing anew | NestJS keeps TypeScript end-to-end; FastAPI is acceptable if odds aggregation or Python tooling already exists. |
| Odds aggregation | Dedicated provider/worker service | Pulls/normalizes bookmaker and exchange odds. Start with mock provider. Live connectors only from authorised APIs/feeds. |
| Real-time updates | WebSockets, Socket.IO, or Server-Sent Events | Supports auto-update back/lay toggles and table refresh without every client polling aggressively. |
| Database | Existing OpenForge DB; PostgreSQL recommended for relational state | Events, selections, settings, filter presets, snapshots and tracker records fit relational modelling. |
| Hot odds cache | Redis or equivalent | Live odds are high-churn; use short TTL cache rather than persisting every quote to relational tables. |
| Calculation engine | Pure shared package/module, e.g. `packages/oddsmatcher-core` or existing shared calc module | Same formulas must be used by frontend, backend validation, and tests. |
| Auth/deep links | Existing OpenForge auth + deep-link template table | Bookmaker/exchange buttons use URL templates. Affiliate handling can be supported later if lawful/needed. |
| Local infra | Existing repo setup; Docker Compose if needed | Workers and cache may need local orchestration. |
| Production infra | Existing OpenForge deployment; scalable worker/runtime for odds feeds | Odds-fetching workers should scale independently from web/API when live feeds arrive. |

---

## 10. Frontend Architecture

### 10.1 Suggested component tree

```text
OddsmatcherPage
  OddsmatcherHeader
    BetModeSelect
    SearchBox
    SettingsButton
  OddsmatcherToolbar
    SelectionFilterButton
    StartTimeFilterButton
    BackFilterButton
    LayFilterButton
    RatingFilterButton
    ClearFiltersButton
    RefreshOddsButton
    MyFiltersButton
  OddsmatcherTable
    OpportunityRow
      EventCell
      BetCell
      BackOddsPill
      LayOddsPill
      RatingPill
      RowActions
  BetSummaryModal
    BetTypeSelector
    BackBetCard
    LayBetCard
    AdvancedLayControls
    LayStakeSummary
    OutcomeSummary
    TrackerActionPanel
  SettingsModal
  FilterPresetModal
```

### 10.2 State management

Recommended state split:

- URL query params for shareable filters.
- React state for modal/local input edits.
- TanStack Query for server data.
- Shared calc package for instant client-side recalculation.
- Server recalculation for authoritative validation before tracker creation.

### 10.3 Table behaviour

- Default sort: rating descending, then start time ascending.
- Hide arbs by default unless `showArbs = true`.
- Search should debounce at 250–400ms.
- Use server-side pagination once real data is live.
- Mock data can be in-memory for Phase 1.

### 10.4 Modal behaviour

- Opening modal copies row values into local calculation state.
- Manual edits disable auto-update for that field unless user re-enables it.
- Changing bet type recalculates stake and outcome table.
- Changing advanced slider recalculates outcome table using user chosen lay stake.
- Closing modal discards unsaved local edits.
- Add-to-tracker validates server-side using current modal values.

---

## 11. Odds Aggregation

### 11.1 Provider design

Live odds should be behind an interface:

```ts
export interface OddsProvider {
  providerName: string;
  fetchEvents(): Promise<SportsEvent[]>;
  fetchMarkets(eventId: string): Promise<Market[]>;
  fetchBackOdds(params: ProviderMarketParams): Promise<OddsQuote[]>;
  fetchLayOdds(params: ProviderMarketParams): Promise<OddsQuote[]>;
}
```

### 11.2 MVP provider

Build a mock provider first:

```text
MockOddsProvider
  - loads JSON fixture data
  - supports horse racing winner markets
  - includes BetTOM-style bookmaker and Smarkets-style exchange records
  - reproduces screenshot-like rows for acceptance testing
```

### 11.3 Live provider rules

When adding real providers:

- Prefer official APIs / affiliate feeds.
- Do not scrape where source terms prohibit it.
- Respect rate limits.
- Use provider-specific backoff.
- Mark stale quotes.
- Never display odds without fetched timestamp.
- Never silently join ambiguous selections.

### 11.4 Matching algorithm

Pipeline:

```text
Raw bookmaker quote
  -> normalize event
  -> normalize market
  -> normalize selection
  -> join to exchange lay quote
  -> compute rating
  -> filter account health
  -> return opportunity rows
```

Matching keys:

- sport,
- event start time,
- normalized event name,
- venue/competition,
- market type,
- normalized selection name.

Ambiguity handling:

- If high-confidence match: show row normally.
- If medium-confidence match: show `Shared/estimated odds` or warning.
- If low-confidence match: exclude from table unless debug mode.

---

## 12. Persistence / Database Outline

If Prisma is used, create models equivalent to:

```prisma
model OddsmatcherSetting {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  defaultBetMode          String
  defaultBackStake        Decimal
  defaultExchangeAccountId String?
  commissionByExchange   Json
  excludedAccountIds      Json
  includeGubbedAccounts   Boolean @default(false)
  showArbsDefault         Boolean @default(false)
  ratingWarningThresholdPct Decimal @default(90)
  advancedDefaultEnabled  Boolean @default(false)
  defaultUnderlayPct      Decimal @default(0.02)
  defaultOverlayPct       Decimal @default(0.02)
  roundLayStakeToDp       Int     @default(2)
  roundLiabilityToDp      Int     @default(2)
  oddsRefreshSeconds      Int     @default(30)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

model OddsmatcherFilterPreset {
  id        String   @id @default(cuid())
  userId    String
  name      String
  filters   Json
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OddsQuoteSnapshot {
  id              String   @id @default(cuid())
  provider        String
  eventId         String
  marketId        String
  selectionId     String
  accountId       String
  side            String
  oddsDecimal     Decimal
  liquidity       Decimal?
  commission      Decimal?
  sourceType      String
  sourceConfidence String
  deepLinkUrl     String?
  fetchedAtUtc    DateTime
  expiresAtUtc    DateTime?
  createdAt       DateTime @default(now())
}
```

Keep high-churn live quotes in Redis or equivalent cache. Persist snapshots only when:

- a user creates a tracker row,
- an audit/debug trace is needed,
- or historical odds analysis is explicitly enabled.

---

## 13. Acceptance Tests

### 13.1 Rating tests

```ts
expect(displayRatingPct(6.0, 6.2)).toBeCloseTo(96.77, 2);
expect(displayRatingPct(1.67, 1.73)).toBeCloseTo(96.53, 2);
expect(displayRatingPct(2.88, 3.05)).toBeCloseTo(94.43, 2);
expect(displayRatingPct(9.0, 9.4)).toBeCloseTo(95.74, 2);
```

### 13.2 Qualifying calculation test

Input:

```ts
{
  backStake: 10,
  backOdds: 6.0,
  layOdds: 6.2,
  layCommission: 0,
}
```

Expected:

- lay stake approximately `9.68`.
- liability approximately `50.34`.
- if back wins total approximately `-0.34`.
- if lay wins total approximately `-0.32`.
- total profit approximately `-0.34`.

### 13.3 Liquidity warning test

If lay stake is `9.68` and liquidity is `4.00`, return `INSUFFICIENT_LIQUIDITY`.

### 13.4 Free bet SNR test

Input:

```ts
{
  freeBetValue: 10,
  backOdds: 5.0,
  layOdds: 5.2,
  layCommission: 0.02,
}
```

Expected:

- lay stake uses `((5.0 - 1) * 10) / (5.2 - 0.02)`.
- liability uses `layStake * 4.2`.
- total profit is the worse of the two outcome totals.

### 13.5 Underlay/overlay tests

- Even mode uses standard lay stake.
- Underlay with 2% bias reduces lay stake by 2%.
- Overlay with 2% bias increases lay stake by 2%.
- Outcome totals shift in opposite directions.

### 13.6 Tracker integration tests

- Add qualifying bet creates one tracker row with `source = ODDSMATCHER`.
- Created row stores odds snapshot timestamp.
- Gubbed bookmaker is excluded by default.
- Insufficient liquidity creates warning metadata but does not block row creation.
- Manual balances are not overwritten.

---

## 14. Development Roadmap



### 14.0 Planning estimates from the pasted source spec

These are not binding sprint commitments, but they preserve the pasted source’s delivery guidance:

| Source phase | Estimate | Merged meaning |
|---|---:|---|
| Foundations | 1–2 weeks | Data model, database shape, calculation library/tests. |
| Static Table MVP | 2–3 weeks | Mock odds, table, sorting/filtering, rating badges, modal standard mode. |
| Bet Type Variants + Advanced Mode | 1–2 weeks | SNR/SR/risk-free modes, underlay/overlay, slider, range min/max, liquidity warnings. |
| Live Odds Integration | 3–5 weeks | Provider connectors, cache, scheduled refresh, WebSocket/SSE updates. Largest phase. |
| Personalization & Filters | 1–2 weeks | Settings, defaults, included/excluded bookmakers, saved filters, deep links. |
| Hardening & Launch | 2–3 weeks | Load tests, stale feed alerts, rate limits, compliance/source review. |
| Full-fidelity live-data clone | ~10–15 weeks | Realistic total if building live data and production hardening. |
| Mock/delayed odds demo | ~4–5 weeks | Realistic demo target through calculation/table/modal without live feeds. |

Codex should still work in smaller implementation chunks and commit/test each phase independently.

### Phase 0 — Repository discovery

Codex tasks:

1. Inspect repo.
2. Identify app framework, API layer, DB/ORM, test tooling, styling system.
3. Locate existing tracker models: Accounts, Qualifying Bets, Free Bets, Cash Adjustments.
4. Write a short implementation note before code changes.

Exit criteria:

- Agent knows where to place module, tests, and routes.

### Phase 1 — Calculation package

Codex tasks:

1. Create or extend shared calculation module.
2. Implement rating, qualifying, SNR, SR, liability, outcome P&L, underlay/overlay, liquidity status.
3. Add unit tests.

Exit criteria:

- All calculation tests pass.
- No UI yet.

### Phase 2 — Mock opportunity service

Codex tasks:

1. Add mock odds JSON fixture.
2. Create opportunity join/filter/sort service.
3. Implement API endpoint returning screenshot-like rows.

Exit criteria:

- API returns ranked opportunities with rating and liquidity.

### Phase 3 — Oddsmatcher UI

Codex tasks:

1. Add route/page.
2. Add toolbar and results table.
3. Add filter panels.
4. Add row actions.
5. Add responsive layout.

Exit criteria:

- User can scan and filter mock opportunities.

### Phase 4 — Bet Summary modal

Codex tasks:

1. Build modal.
2. Wire live recalculation.
3. Add advanced controls.
4. Add copy actions.
5. Add deep-link buttons.

Exit criteria:

- Modal matches the workflow and calculations from screenshots.

### Phase 5 — OpenForge tracker integration

Codex tasks:

1. Add create-from-oddsmatcher endpoints for qualifying and free bets.
2. Map modal state into tracker records.
3. Include odds snapshot metadata.
4. Add account balance and gubbed warnings.

Exit criteria:

- A calculated opportunity can become a tracker row.

### Phase 6 — Settings and saved filters

Codex tasks:

1. Add settings modal.
2. Persist default stake, exchange commission, excluded bookmakers, show arbs.
3. Add saved filter presets.

Exit criteria:

- User preferences persist between sessions.

### Phase 7 — Live odds architecture

Codex tasks:

1. Add provider interface.
2. Implement mock provider first.
3. Add one real provider only if authorised source/API is available.
4. Add stale quote handling and timestamps.
5. Add refresh mechanism.

Exit criteria:

- Live or authorised feed updates can replace mock data without changing UI.

---

## 15. Risks / Guardrails

### 15.1 Calculation risk

Matched betting is sensitive to pennies and rounding. Keep pure tests and do not let UI-specific formatting enter core formulas.

### 15.2 Data matching risk

A false event/selection match can create real financial risk. Use confidence scoring and exclude uncertain matches by default.

### 15.3 Liquidity risk

A calculated lay stake may exceed exchange liquidity. Show warnings clearly.

### 15.4 Account health risk

By default, exclude gubbed, blocked, and not-using accounts.

### 15.5 Compliance/source risk

Use authorised odds feeds. Do not add scraping code that violates source terms. Do not implement automated bet placement without separate review.

### 15.6 UI clone risk

Preserve workflow and visual hierarchy, but use OpenForge styling and assets.

---

## 16. Final Agent Prompt

Use this as the actual instruction block for Codex:

> You are implementing the OpenForge Oddsmatcher module. Build a functional clone of the reference Oddsmatcher workflow using OpenForge conventions. Start by creating a pure calculation package with tests for rating, qualifying lay stake, liability, outcome P&L, free bet SNR/SR, underlay/overlay, and liquidity warnings. Then build a mock-data opportunity API, then the table UI, then the Bet Summary modal, then tracker integration. Do not copy external source code, assets, branding, or CSS. Do not implement direct bet placement. Do not overwrite manual balances. Exclude gubbed/blocked accounts by default. Store odds snapshots when creating tracker records. Use existing repository patterns, tests, API conventions, and styling. Keep changes scoped and add acceptance tests for every calculation and tracker mapping.

