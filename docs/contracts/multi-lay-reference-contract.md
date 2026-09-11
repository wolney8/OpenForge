# Multi-Lay Reference Calculation Contract

_Last updated: 2026-09-11_

## Status and authority

- Status: approved for the bounded `multi-lay-v2` standalone and new-planner reference path.
- Authority: current MBB Multi-Lay calculator/guide and public bundle SHA-256
  `bf394de676a0f434a174628c280d50973ba88350e6a4174371b4cffe126101b4`.
- Additional comparison: current public Outplayed calculator bundle SHA-256
  `5938f3b88a9351132404617ab588941a1016a2e29dd0035465ef8e7c67cdd15a`.
- Issues: #35, #38, #113; #36 where a configuration is destination-compatible.
- Existing persisted rows without `calculationVersion: "multi-lay-v2"` retain the historical
  workbook calculation. No historical row is recalculated or migrated.

## Product context

Multi-Lay models one bookmaker back bet and two or more mutually exclusive lay outcomes. The
standalone result is reference-only. A new embedded planner may persist the same versioned inputs,
but actual placed stakes remain explicit and settlement remains the ledger authority.

## Inputs

| Field | Meaning |
|---|---|
| `backing_type` | `normal`, `free_bet_snr`, or `money_back` |
| `back_stake`, `back_odds` | original backing stake and decimal odds |
| `profit_boost_percent` | optional boost of the profit portion; zero is valid |
| `refund_amount`, `retention_percent` | Money Back reward and estimated retained value |
| `strategy` | `standard`, `underlay`, `overlay`, or `custom` |
| `custom_multiplier` | uniform multiplier applied to every unrounded Standard lay stake |
| `outcomes[]` | editable label, lay odds, and commission decimal for each mutually exclusive outcome |

Two outcomes are required. The technical request cap is 20, matching the current MBB public
bundle; it is not a financial maximum. Commission defaults to the selected canonical Exchange
value and remains independently editable per outcome.

## Formula

Let `B` be stake, `O = 1 + (back_odds - 1) × (1 + boost/100)`, `Li` a lay price, and `ci` its
commission decimal. Let retained refund `R = refund_amount × retention/100`.

Bookmaker and Standard stake bases are:

| Backing type | bookmaker win | bookmaker loss | stake base |
|---|---:|---:|---:|
| Normal | `B × (O − 1)` | `−B` | `B × O` |
| Free Bet SNR | `B × (O − 1)` | `0` | `B × (O − 1)` |
| Money Back | `B × (O − 1)` | `−B + R` | `B × O − R` |

The unrounded Standard stake for leg `i` is `base_i = stake_base / (Li − ci)`.

- Standard multiplier: `1`.
- Underlay multiplier: `−bookmaker_loss / Σ(base_i × (1 − ci))`.
- Overlay multiplier: `−bookmaker_win / [−base_1 × (L1 − 1) + Σ(i>1)(base_i × (1 − ci))]`.
- Custom multiplier: explicit user value. The default displayed slider bounds extend 1.5 times
  beyond the Standard-to-endpoint distances, exactly as the current MBB control; edited bounds
  alter the control range only, never the endpoint equations.

If an endpoint denominator is zero or the resulting multiplier is negative/non-finite, that
endpoint is unavailable. When both otherwise valid source endpoints fall below Standard, the
current MBB control substitutes its documented display range of `0.8×` to `1.2×`; this is a
control-range fallback, not a newly derived break-even claim. Every selected lay stake is
`round_half_up(base_i × multiplier, £0.01)`.

For each leg: liability is `round_half_up(stake_i × (Li − 1), £0.01)` and lay-win component is
`round_half_up(stake_i × (1 − ci), £0.01)`. Each scenario total is the sum of its penny-rounded
bookmaker and lay components, rounded half-up to a penny. Current/reference value is the minimum
of Back loses and every named lay-wins scenario.

## Exposure and outcomes

Following the current MBB reference, maximum exchange exposure for outcome `i` is
`liability_i − Σ(j≠i) stake_j`; `maximum_exchange_exposure` is the largest positive result, not the
sum of mutually exclusive liabilities. This represents the source calculator's gross same-market
reservation convention; outcome P&L continues to use commission-adjusted lay-win components.
Multiple exchange-account netting is not inferred.

Outcome rows expose Bookmaker, every lay component, and Total. Retained Money Back value is an
estimated future reward component, not realised cash. Copy acts on the selected penny lay stake.

## Validation and persistence

Odds must be greater than 1; stake must be positive; boost/refund must be non-negative; retention
and every commission must be 0–100% in UI and 0–1 decimals at the API. Malformed inputs fail
closed. Version, backing type, boost, reward/retention, strategy, multiplier, per-leg commissions,
and labels survive pop-out/source snapshots. Conversion is blocked when the destination cannot
represent the complete configuration; fields are never silently dropped.

## External differences

Outplayed exposes Normal, Normal Underlay and Free Bet SNR with two to four outcomes. MBB exposes
Normal, Free Bet SNR, Money Back, Profit Boost, per-leg commission, up to 20 technical legs and the
advanced multiplier control. MBB's `Cashback` field is already-retained value; Plum Duff keeps
reward amount and retention explicit and compares by entering `R` at MBB. Exact binary-JavaScript
rounding differences remain external observations rather than changes to Decimal arithmetic. A
2026-09-11 live MBB black-box run of `£10 @ 4.00`, lays `2.50 / 3.00`, both at `5%`, displayed
stakes `£16.33 / £13.56`, first liability `£24.49`, all totals `£18.39`, and maximum exposure
`£10.93`. The independently governed Decimal/half-up result is `£24.50`, totals
`£18.39 / £18.38 / £18.39`, and maximum exposure `£10.94`; therefore this penny-boundary case is
an explicit 1p external mismatch, not a parity claim. The source bundle applies binary-number
rounding at the half-penny boundary.
