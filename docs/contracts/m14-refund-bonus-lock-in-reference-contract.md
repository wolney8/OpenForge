# Calculation Contract: M14 Refund / Bonus Lock-In Reference Calculator

_Last updated: 2026-09-10_

## 0. Contract status

- Status: Approved for the refund-if-back-loses Standard reference mode only
- Owner: OpenForge M14 Calculator Workspace
- Related evidence: `docs/reference/m14-calculator-research/teamprofit-refund.packet.json`
- Current authority: `https://www.teamprofit.com/calculator` and
  `https://www.teamprofit.com/welcome-offers/refunds-offers-guaranteed-profit-method`
- Tracker authority: workbook cash-first sportsbook contract remains authoritative
- Explicit exclusion: reward-if-back-wins remains blocked; no current source establishes its
  reward meaning or equalisation rule.

## 1. Purpose

Size an equalised reference lay for a refund-if-back-loses offer where a future
cash refund, bonus or free-bet award is represented by an explicit retained value.

This is a standalone calculator/reference model. It must not cause a pending
sportsbook tracker row to recognise speculative future bonus value as cash now.

## 2. Inputs

- back stake `B`
- back odds `O_b`
- lay odds `O_l`
- lay commission ratio `c`
- actual reward amount for this calculation `A`
- assumed retention ratio `r`

All values are synthetic in fixtures. Percentages are converted to ratios before
calculation. `A` is cash value when the reward is cash (`r=100%`), or the nominal bonus/free-bet
amount when future conversion is estimated by `r`. The UI stake-to-reward seed is an ephemeral
default only; the entered reward remains a separate formula input and can be overridden.

## 3. Approved formula

Effective future award value:

`R = A * r`

Equalised reference lay stake:

`L = (B * O_b - R) / (O_l - c)`

Reference liability:

`liability = L * (O_l - 1)`

Scenario values:

- bookmaker/back wins: `B * (O_b - 1) - liability`
- exchange/lay wins and refund is awarded: `-B + L * (1 - c) + R`

The unrounded scenario values should be equal apart from lay placement and display rounding. The
reward applies only to the exchange/lay-wins branch because that is the back-bet-loses branch.
Exchange commission applies only to the winning lay stake.

## 4. Validation

- `B > 0`
- `O_b > 1`
- `O_l > 1`
- `0 <= c < 1`
- `A >= 0`
- `0 <= r <= 1`
- denominator `O_l - c` must be positive
- missing retention is invalid in OpenForge; do not silently coerce it to zero

## 5. Cash-first tracker boundary

- `R` is an assumption about future conversion, not current cash.
- The standalone calculator may show both reference scenarios with that
  assumption visibly labelled.
- A bridged sportsbook row must rerun the approved tracker contract.
- Pending tracker current value must use its approved conservative branches and
  must not automatically add `R`.
- The eventual free bet is tracked separately when actually awarded.

## 6. Rounding and placement

- calculate `R` and the equalisation equation from unrounded decimal inputs;
- round the recommended lay stake half-up to 2dp because it is the placed reference stake;
- calculate liability, lay return and both branch totals from that placed 2dp lay stake;
- round monetary components and totals half-up to 2dp for serialization/display;
- canonical rounded zero has no negative sign;
- OpenForge expected-output tolerance is exact at the serialized penny.

## 7. Covered evidence

Cases `TP-RF-001` through `TP-RF-005` reproduce the equation and placement order. The current
TeamProfit calculator source (retrieved 2026-09-10, SHA-256
`e264b67a9d69542b367a88013f02c720381b0a93be7e972d2e27401a52aa979f`) computes retained reward
before the hedge, rounds the lay stake to pennies, then derives liability and outcome totals from
that placed stake. `TP-RF-006` remains invalid-input evidence because OpenForge does not coerce a
blank retention percentage to zero.

## 8. Fixtures and compatibility

Fixture coverage is registered in
`tests/fixtures/m14/m14-external-calculator-reference-fixtures.json` and the approved independent
outputs are in `tests/fixtures/bonus-lock-in-reference-fixtures.json`.

The standalone `money_back` API value is a compatibility alias for this exact back-loses contract;
it is not a separate engine or UI mode. The current UI canonicalises legacy `money_back` state to
`bonus_lock_in`. Both inputs reject `Back Wins` until a separately approved inverse-trigger
contract exists.

The reference result remains prospective. Bridge mapping and pending sportsbook current value keep
their existing cash-first authority and must not recognise the retained reward as current cash.
