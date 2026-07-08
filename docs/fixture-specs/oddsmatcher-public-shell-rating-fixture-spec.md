# Fixture Spec: Oddsmatcher Public Shell Rating and Arb Visibility

_Last updated: 2026-07-08_

## Contract(s) covered

- `docs/contracts/oddsmatcher-public-shell-rating-contract.md`

## Fixture set summary

These fixtures prove the visible rating ratio, the 100% boundary, and the arb suppression toggle.

They also include modal calculator and advanced-mode parity scenarios needed for M8 clone readiness.

## Fixture 1

- Fixture id: `oddsmatcher-rating-001`
- Scenario name: baseline near-match
- Purpose: prove standard display rating and green bucket behavior
- Input rows:
  - `back_odds`: `5.50`
  - `lay_odds`: `5.60`
  - `show_arbs`: `false`
- Expected derived values:
  - `display_rating_pct`: `98.21`
  - `rating_bucket`: `GREEN`
  - `is_arb`: `false`
  - `arb_visible`: `true`
- Expected inclusion/exclusion behaviour: visible
- Notes: matches the reference parity example

## Fixture 2

- Fixture id: `oddsmatcher-rating-002`
- Scenario name: tighter near-match
- Purpose: prove the ratio near the high end of the visible range
- Input rows:
  - `back_odds`: `1.67`
  - `lay_odds`: `1.73`
  - `show_arbs`: `false`
- Expected derived values:
  - `display_rating_pct`: `96.53`
  - `rating_bucket`: `PALE_GREEN`
  - `is_arb`: `false`
  - `arb_visible`: `true`
- Expected inclusion/exclusion behaviour: visible
- Notes: matches the reference parity example

## Fixture 3

- Fixture id: `oddsmatcher-rating-003`
- Scenario name: exact boundary
- Purpose: prove the 100% cutoff is not treated as an arb
- Input rows:
  - `back_odds`: `2.00`
  - `lay_odds`: `2.00`
  - `show_arbs`: `false`
- Expected derived values:
  - `display_rating_pct`: `100.00`
  - `rating_bucket`: `ARB_OR_STRONG_GREEN`
  - `is_arb`: `false`
  - `arb_visible`: `true`
- Expected inclusion/exclusion behaviour: visible
- Notes: boundary check for the hidden-results rule

## Fixture 4

- Fixture id: `oddsmatcher-rating-004`
- Scenario name: arb hidden by default
- Purpose: prove ratings above 100 are suppressed unless explicitly revealed
- Input rows:
  - `back_odds`: `2.10`
  - `lay_odds`: `2.00`
  - `show_arbs`: `false`
- Expected derived values:
  - `display_rating_pct`: `105.00`
  - `rating_bucket`: `ARB_OR_STRONG_GREEN`
  - `is_arb`: `true`
  - `arb_visible`: `false`
- Expected inclusion/exclusion behaviour: hidden
- Notes: matches the visible page rule that arbs are hidden by default

## Fixture 5

- Fixture id: `oddsmatcher-rating-005`
- Scenario name: arb revealed by toggle
- Purpose: prove the same arb becomes visible when the toggle is enabled
- Input rows:
  - `back_odds`: `2.10`
  - `lay_odds`: `2.00`
  - `show_arbs`: `true`
- Expected derived values:
  - `display_rating_pct`: `105.00`
  - `rating_bucket`: `ARB_OR_STRONG_GREEN`
  - `is_arb`: `true`
  - `arb_visible`: `true`
- Expected inclusion/exclusion behaviour: visible
- Notes: the toggle should only affect visibility, not the ratio

## Fixture 6

- Fixture id: `oddsmatcher-rating-006`
- Scenario name: muted low-priority result
- Purpose: prove a low ratio remains visible but lower priority
- Input rows:
  - `back_odds`: `9.00`
  - `lay_odds`: `9.40`
  - `show_arbs`: `false`
- Expected derived values:
  - `display_rating_pct`: `95.74`
  - `rating_bucket`: `PALE_GREEN`
  - `is_arb`: `false`
  - `arb_visible`: `true`
- Expected inclusion/exclusion behaviour: visible
- Notes: matches the reference parity example

## Shared notes

- Use synthetic odds only
- No bookmaker or exchange credentials belong in these fixtures
- Fixtures are deterministic and do not depend on live data

## Fixture 7

- Fixture id: `oddsmatcher-modal-007`
- Scenario name: qualifying modal conservative total
- Purpose: prove modal outputs and conservative total summary behavior
- Input rows:
  - `bet_mode`: `Qualifying Bet`
  - `back_stake`: `10.00`
  - `back_odds`: `6.50`
  - `lay_odds`: `7.00`
  - `back_commission_pct`: `0`
  - `lay_commission_pct`: `0`
  - `advanced_enabled`: `false`
- Expected derived values:
  - `lay_stake`: `9.29`
  - `liability`: `55.74`
  - `scenario_back_wins_total`: `-0.74`
  - `scenario_lay_wins_total`: `-0.71`
  - `total_profit`: `-0.74`
- Expected inclusion/exclusion behaviour: visible in bet summary modal
- Notes: captures conservative headline summary behavior

## Fixture 8

- Fixture id: `oddsmatcher-advanced-008`
- Scenario name: advanced range controls visible
- Purpose: prove Advanced mode reveals full staking-range controls
- Input rows:
  - `bet_mode`: `Qualifying Bet`
  - `advanced_enabled`: `true`
  - `match_strategy`: `Standard`
  - `lay_stake`: `9.29`
  - `range_min_stake`: `8.90`
  - `range_max_stake`: `11.42`
- Expected derived values:
  - `advanced_controls_visible`: `true`
  - `strategy_buttons`: `["Underlay", "Standard", "Overlay"]`
  - `slider_visible`: `true`
  - `range_min_visible`: `true`
  - `range_max_visible`: `true`
- Expected inclusion/exclusion behaviour: visible only when `advanced_enabled = true`
- Notes: exact slider transfer function remains an explicit test-harness item

## Fixture 9

- Fixture id: `oddsmatcher-modal-links-009`
- Scenario name: modal deep-link and copy controls
- Purpose: prove row-specific bookmaker/exchange links and copy controls are present
- Input rows:
  - `bookmaker_label`: `Bookmaker A`
  - `bookmaker_url`: `https://bookmaker-a.example.invalid`
  - `exchange_label`: `Exchange A`
  - `exchange_url`: `https://exchange-a.example.invalid/market/123`
  - `copy_lay_stake_enabled`: `true`
- Expected derived values:
  - `go_to_bookmaker_visible`: `true`
  - `go_to_exchange_visible`: `true`
  - `copy_lay_stake_visible`: `true`
- Expected inclusion/exclusion behaviour: visible in modal for selected row
- Notes: URL values must remain synthetic/anonymized in non-live fixture sets