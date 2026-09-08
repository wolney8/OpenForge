# Standalone Calculator Families v1

_Approved implementation scope: 2026-09-08_

## Boundary

These Fund Manager calculators produce reference values only and perform no Profile or ledger
writes. Exact `Decimal` arithmetic precedes the stated display/placement rounding. Source inputs
are synthetic in fixtures.

## Multiples / Accumulator core

Authority: the current [Matched Betting Blog Bet Calculator](https://matchedbettingblog.com/bet-calculator/)
and its public calculation bundle.

- one all-to-win bet with at least two selections;
- `combined odds = product(selection decimal odds)`;
- Winner contributes its odds, Void contributes `1`, and any Loser makes return `0`;
- `total return = stake × settled multiplier`; `total profit = total return - stake`;
- money displays round half-up to GBP `0.01`; odds are not rounded internally.

Each Way, Rule 4, fold permutations and bookmaker bonuses are optional extensions and remain
blocked until separately contracted. They do not change the accepted core accumulator.

## Simple Dutching core

Authority: [Outplayed's current Dutching guide](https://outplayed.com/dutching-calculator-guide)
(two/three way, Normal/Free Bet, Simple, rounding)
and the current Matched Betting Blog Dutching calculation bundle for deterministic arithmetic.

- first-selection stake is fixed;
- `effective odds = 1 + ((odds - 1) × (1 - commission))`;
- for the first SNR Free Bet only, returned-stake `1` is omitted;
- `target return = first stake × first effective odds`;
- each later stake is `target return / its effective odds`, rounded half-up to a penny or the
  selected nearest `£1`, `£5`, or `£10` increment;
- placed-stake returns are floored to GBP `0.01`; outcome profit is rounded half-up to GBP `0.01`.

Advanced breakeven weighting remains an optional blocked extension: the guide states the outcome
but does not expose enough reactive values to distinguish allocation and rounding rules.

## Blackjack Strategy

Authority: Outplayed's live [Blackjack calculator](https://outplayed.com/blackjack-strategy-calculator)
bundle and [published strategy tables](https://outplayed.com/profit-accumulator-blackjack-strategy/).
Representative behavior was reverified against the current public implementation on 2026-09-08.

- rules: surrender allowed/not allowed and dealer stands/hits Soft 17;
- dealer up-card and two or more player cards;
- hard, soft, pair, H17/S17 and surrender matrices return Hit, Stand, Double, Split, Surrender or
  Bust; conditional Double/Split/Surrender actions expose the published fallback;
- default rules are no surrender and dealer stands on Soft 17;
- no wager, P&L, automation or outcome guarantee.

The public calculator exposes Surrender and dealer H17/S17 only. Its matrix treats Double as an
initial two-card action with the published Hit/Stand fallback and uses “Split if double after split
is allowed, otherwise Hit” for the applicable pairs. This implementation therefore assumes DAS is
allowed, models one split into two independently played hands, and does not infer resplitting. Once
a Hit adds a third card, Surrender, Split and Double are no longer legal recommendations. Session
stake tracking is temporary reference state: normal hand `1 × base stake`, Double `2 ×`, and one
split `2 ×`; Surrender records an exact half returned and half forfeited without calculating P&L.
When a penny stake produces half a penny, the exact three-decimal amount is retained rather than
silently rounded.

Technical input caps (20 accumulator selections, 12 player cards) bound request size only and are
not financial rules.
