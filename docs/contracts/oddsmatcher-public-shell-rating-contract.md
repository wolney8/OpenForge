# Calculation Contract: Oddsmatcher Public Shell, Table, and Modal Boundary

_Last updated: 2026-07-08_

## 0. Contract status

- Status: Draft for M8 planning approval
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: Oddsmatcher public shell, table, and modal workflow
- Related spreadsheet source: N/A
- Related source-pack file: `OpenForge_Oddsmatcher_Codex_Technical_Spec.md`
- Related issue/task: `M8 - Deferred OddsForge Boundary`

## 1. Product context

- Application: OpenForge
- Module: Future/deferred OddsForge
- Profile scoped: No for the public shell, yes for the future tracker-entry module
- Profile-owned table(s): None yet
- Required `profile_id` handling: Deferred until authenticated odds rows are integrated into tracker flows
- Fund Manager visible? No
- Subscriber/profile tracker visible? No

## 2. Purpose

This contract defines the visible oddsmatcher shell behavior, authenticated table shell, modal calculator boundary, and advanced-mode control branch observable on the live site.

It supports:

- reference display rating for bookmaker back odds vs exchange lay odds
- arb suppression / reveal behavior
- filter UI state that wraps the public shell

It does not define settlement-ledger math, but it captures all clone-critical values and interactions needed to reconstruct calculator behavior.

## 3. Workflow context

- encountered on the public Oddsmatcher page and the authenticated oddsmatcher table
- triggered by the top-of-page filter shell, row actions, and modal calculator controls
- shown in the public page header, filter drawers, authenticated results table, and bet-summary modal
- this is reference-tool parity logic, not tracker settlement logic

## 4. Spreadsheet equivalent

- Source behavior comes from the external oddsmatcher reference, not the current workbook tracker
- No current workbook sheet maps directly to this shell state
- The visible rating behavior corresponds to the reference tool’s ratio-based rating pill
- The authenticated page exposes row-level deep links, copy action, and calculator modal behavior

## 5. Cash-first/current-value behaviour

- What is this row worth to the bankroll right now? The modal exposes current calculator outputs, but not tracker settlement values
- Does this calculation apply before settlement? Yes, for the calculator UI only
- Does it calculate multiple scenario outcomes? Yes, in the modal outcome tables
- Which value is shown for open/pending rows? The table shows rating and liquidity; the modal shows current lay stake and scenario totals
- Is a conservative `MIN()` style outcome used? The modal summary shows conservative total profit behavior for the selected bet type
- How is current/projected value separated from final/settled value? The calculator is projected/current; tracker settlement remains deferred
- What should reports include before settlement? Not applicable to the oddsmatcher surface itself
- What should reports include after settlement? Not applicable to the oddsmatcher surface itself

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `back_odds` | decimal | Yes | oddsmatcher row or fixture | calculated or supplied | No | bookmaker decimal price |
| `lay_odds` | decimal | Yes | oddsmatcher row or fixture | calculated or supplied | No | exchange decimal price |
| `show_arbs` | boolean | No | filter state | user-entered | No | reveals ratings above 100% |
| `min_rating_pct` | decimal | No | filter state | user-entered | No | lower bound for visible results |
| `max_rating_pct` | decimal | No | filter state | user-entered | No | upper bound for visible results |
| `bet_mode` | enum | Yes | modal and header selector | user-entered | No | `Qualifying Bet` and `Free Bet` are visible modes |
| `back_stake` | money | Yes | modal calculator | user-entered | No | default `£10` in the live modal |
| `back_commission` | decimal | Yes | modal calculator | user-entered | No | default `0%` in the live modal |
| `lay_commission` | decimal | Yes | modal calculator | user-entered | No | default `0%` in the live modal |
| `auto_update_back_odds` | boolean | Yes | modal calculator | user-entered | No | live update toggle |
| `auto_update_lay_odds` | boolean | Yes | modal calculator | user-entered | No | live update toggle |
| `advanced_enabled` | boolean | Yes | modal calculator | user-entered | No | reveals advanced controls |
| `match_strategy` | enum | Yes | modal calculator advanced controls | user-entered | No | `Underlay`, `Standard`, `Overlay` observed |
| `range_min_stake` | money | No | modal calculator advanced controls | user-entered | No | lower stake bound in advanced mode |
| `range_max_stake` | money | No | modal calculator advanced controls | user-entered | No | upper stake bound in advanced mode |
| `range_slider_value` | decimal | No | modal calculator advanced controls | user-entered | No | slider value mapping into lay stake range |
| `liquidity` | money | No | row and modal quote data | calculated or supplied | No | read-only on the visible row |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `display_rating_pct` | decimal | rating pill | reference | derived | `back_odds / lay_odds * 100` |
| `rating_bucket` | string | rating pill color | reference | derived | threshold label for display only |
| `is_arb` | boolean | rating filter and visibility rule | reference | derived | `display_rating_pct > 100` |
| `arb_visible` | boolean | results table | reference | derived | depends on `show_arbs` |
| `shell_state` | string | public page | reference | derived | `gate`, `filters_only`, or `results` |
| `lay_stake` | money | modal summary | current/projected | derived | live calculator output |
| `liability` | money | modal summary | current/projected | derived | live calculator output |
| `scenario_back_wins_total` | money | modal summary table | current/projected | derived | visible in the back-win branch |
| `scenario_lay_wins_total` | money | modal summary table | current/projected | derived | visible in the lay-win branch |
| `total_profit` | money | modal summary | current/projected | derived | conservative summary value (worst-case style) |

## 8. Formula source

- oddsmatcher reference-site observation
- source-spec parity rule from the technical specification

The reference rating is intentionally ratio-based, not an expected-value or probability calculation.

## 9. Formula

Base formula:

- `display_rating_pct = (back_odds / lay_odds) * 100`

Visibility formula:

- `is_arb = display_rating_pct > 100`
- `arb_visible = show_arbs || !is_arb`

Bucket formula:

- `>= 100` = arb / strong green
- `97.00 - 99.99` = green
- `94.00 - 96.99` = pale green
- `90.00 - 93.99` = amber
- `< 90.00` = muted

Error / blank handling:

- if either odds input is missing or zero, return blank display values rather than guessed values

Observed modal math behavior:

- `liability = lay_stake * (lay_odds - 1)`
- `bookmaker_if_back_wins = back_stake * (back_odds - 1)`
- `exchange_if_back_wins = -liability`
- `bookmaker_if_lay_wins = -back_stake`
- `exchange_if_lay_wins = +lay_stake` (commission-aware adjustment deferred if non-zero commission is used)
- `total_profit = min(total_if_back_wins, total_if_lay_wins)` (conservative headline style observed)

## 10. Assumptions

- no commission-aware rating is shown in the public shell
- arbs are hidden by default for account-health reasons
- filter drawers do not change any financial value; they only constrain visibility
- the public shell does not yet calculate lay stake, liability, or outcome totals
- advanced slider mapping algorithm is not fully observable from UI snapshots and must be implemented behind an explicit parity test harness

## 11. Rounding rules

- rating display: 2 decimal places
- odds inputs: decimal values preserved internally
- rounding affects display only for this contract

## 12. Commission rules

- commission is not part of the public display rating
- commission-aware calculations belong to the modal and tracker modules

## 13. Liability/exposure rules

- liability is shown in the calculator modal as `lay stake * (lay odds - 1)`
- liquidity is shown read-only beside the lay odds and may be unknown

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Standard near-match | `display_rating_pct < 100` | ratio formula | Yes | Yes |
| Arb hidden | `display_rating_pct > 100` and `show_arbs = false` | ratio formula + visibility gate | No | No |
| Arb visible | `display_rating_pct > 100` and `show_arbs = true` | ratio formula + visibility gate | Yes | Yes |
| Qualifying modal | `bet_mode = Qualifying Bet` | live calculator outputs | Yes | Yes |
| Free bet modal | `bet_mode = Free Bet` | live calculator outputs | Yes | Yes |
| Advanced underlay/standard/overlay | `advanced_enabled = true` | live calculator outputs + range controls | Yes | Yes |

## 15. Status and reporting inclusion

- open positions: not applicable yet on the odds tool surface
- overdue positions: not applicable yet on the odds tool surface
- current-value reports: not applicable yet on the odds tool surface
- realised P&L reports: not applicable yet on the odds tool surface
- selected date range: not applicable yet on the odds tool surface
- weekly summary: not applicable yet on the odds tool surface
- monthly summary: not applicable yet on the odds tool surface
- profile overview: not applicable yet on the odds tool surface
- cross-profile comparison: not applicable yet on the odds tool surface

## 16. Fixtures required

- minimum valid near-match case
- exact 100% boundary case
- arb hidden-by-default case
- arb revealed-by-toggle case
- low-priority muted case
- qualifying modal defaults case
- free bet modal mode-switch case
- advanced-controls case
- advanced-range-controls case
- advanced-mode-buttons case
- go-to-link case
- copy-stake case
- row-actions case

## 17. Test cases

- `display_rating_pct` matches the technical-spec examples
- `display_rating_pct(5.50, 5.60)` rounds to `98.21`
- `display_rating_pct(1.67, 1.73)` rounds to `96.53`
- `display_rating_pct(2.88, 3.05)` rounds to `94.43`
- `display_rating_pct(9.00, 9.40)` rounds to `95.74`
- ratings above 100 are hidden until `show_arbs = true`
- switching the bet mode changes the modal labels and downstream calculator output set
- opening advanced reveals underlay / overlay controls in the modal
- opening advanced reveals `Underlay`, `Standard`, and `Overlay` controls plus slider and range min/max inputs
- go-to links target bookmaker and exchange destinations for the selected row
- close actions work from all three modal layers (`settings`, `calculator settings`, `bet summary`)

## 18. Acceptance tolerance

- exact equality is not required for all decimals
- `toBeCloseTo` with 2 decimal places is acceptable for display rating
- no tolerance is needed for the visibility rule

## 19. UI display requirements

- visible label: `Rating`
- helper text: explain that the visible value is a price-spread ratio, not EV
- rating pill color should intensify as the value approaches 100%
- the public shell should show the arb suppression explanation near the rating filter
- modal labels should separate back and lay sides clearly and show live values without a calculate button
- the modal should preserve the table context behind it rather than replacing the page
- advanced controls should render inline in the lay panel, not as a separate modal

## 20. Audit trail requirements

- none for the public shell itself
- if filter preferences or calculator defaults are later persisted, record the user, timestamp, and profile scope separately

## 22. UI structure and close selectors

Observed modal classes and close paths that should be mirrored in the clone architecture:

- `.mbb-odds-matcher-calc__modal`
- `.mbb-odds-matcher__settings-modal`
- `.mbb-odds-matcher__calculator-settings-modal`
- `.mbb-odds-matcher-calc__modal .close`
- `.mbb-odds-matcher__settings-modal .close`
- `.mbb-odds-matcher__calculator-settings-modal .close`

These selectors are not strict implementation requirements for OpenForge naming, but their layer model is contract-critical.

## 21. Human approval

- Reviewer: pending
- Review date: pending
- Approval outcome: pending
- Follow-up required before implementation: yes