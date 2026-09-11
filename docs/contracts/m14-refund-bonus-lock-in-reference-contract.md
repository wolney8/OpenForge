# Calculation Contract: M14 Refund / Bonus Lock-In Reference Calculator

_Last updated: 2026-09-11_

## 0. Contract status

- Status: Approved for Normal backing bets with Back Loses/Back Wins rewards across
  Standard, Underlay, Overlay, Custom and explicit Part Lay; approved for Free Bet
  (SNR) Standard and explicit Part Lay only
- Owner: OpenForge M14 Calculator Workspace
- Related evidence: `docs/reference/m14-calculator-research/teamprofit-refund.packet.json`
- Current authority: the public Outplayed Bonus Lock-In calculator and its linked
  `bonusaccumulator.com/calc/outplayed/bonuslockin` implementation, independently
  reconciled with the branch equations below
- Tracker authority: workbook cash-first sportsbook contract remains authoritative
- Explicit exclusions: Free Bet (SR), and SNR Underlay/Overlay/Custom bounds remain
  blocked because the public source exposes only Normal and Free Bet (SNR), while its
  SNR Advanced capital-target policy is not explained sufficiently to govern those bounds.

## 1. Purpose

Size an equalised reference lay for a refund-if-back-loses offer where a future
cash refund, bonus or free-bet award is represented by an explicit retained value.

This is a standalone calculator/reference model. It must not cause a pending
sportsbook tracker row to recognise speculative future bonus value as cash now.

## 2. Inputs

- backing basis: Normal cash stake or Free Bet (SNR)
- reward trigger: Back Loses or Back Wins
- back stake/free-bet face value `B`
- back odds `O_b`
- lay odds `O_l`
- lay commission ratio `c`
- actual reward amount for this calculation `A`
- assumed retention ratio `r`

All values are synthetic in fixtures. Percentages are converted to ratios before
calculation. `A` is cash value when the reward is cash (`r=100%`), or the nominal bonus/free-bet
amount when future conversion is estimated by `r`. The UI stake-to-reward seed is an ephemeral
default only; the entered reward remains a separate formula input and can be overridden.

## 3. Approved branch model

Effective future award value:

`R = A * r`

Before the prospective reward, the bookmaker components are:

- Normal: `BW = B * (O_b - 1)` and `BL = -B`
- Free Bet SNR: `BW = B * (O_b - 1)` and `BL = 0`

The retained reward is added only to its selected trigger branch. Equalised reference:

`L_standard = (BW - BL + R_back_wins - R_back_loses) / (O_l - c)`

For a Normal backing bet, the Advanced endpoints solve the two cash break-even boundaries:

`L_lay_branch_zero = -(BL + R_back_loses) / (1 - c)`

`L_back_branch_zero = (BW + R_back_wins) / (O_l - 1)`

`L_underlay = min(L_lay_branch_zero, L_back_branch_zero)`

`L_overlay = max(L_lay_branch_zero, L_back_branch_zero)`

For the supplied Back Loses example (`B=5`, `O_b=9.24`, `O_l=10.5`, `c=0`,
`A=5`, retention `70%`), these produce Standard `4.07`, Underlay `1.50`, and
Overlay `4.34`. A Custom or explicit Part Lay uses the entered lay stake and the
same branch components; it never switches to the generic qualifying-bet engine.

Reference liability:

`liability = L * (O_l - 1)`

Scenario values:

- back wins: `BW - liability + R_back_wins`
- back loses: `BL + L * (1 - c) + R_back_loses`

Only Standard targets equal outcomes before penny placement. Underlay/Overlay intentionally
redistribute value. A penny residual at a break-even endpoint is possible because the recommended
lay is placed to two decimals. Exchange commission applies only to a winning lay.

## 4. Validation

- `B > 0`
- `O_b > 1`
- `O_l > 1`
- `0 <= c < 1`
- `A >= 0`
- `0 <= r <= 1`
- denominator `O_l - c` must be positive
- missing retention is invalid in OpenForge; do not silently coerce it to zero
- every selected/reference stake must be finite and greater than zero; an infeasible endpoint is
  unavailable rather than coerced to a penny or passed to the generic calculator
- Free Bet SR and SNR Advanced reference bounds fail closed with a specific unsupported message

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

The linked public Outplayed implementation retrieved 2026-09-11 (JavaScript SHA-256
`522ebe7f06386f13c44e0c493609776dbf50a77c86d41750b11b000bcd784124`) exposes Normal/Free Bet
(SNR), Back Wins/Back Loses, Standard/Underlay/Overlay/Custom, and calculates outcomes from its
placed two-decimal lay. Its non-zero-commission lower endpoint multiplies by `(1+c)`; the approved
contract instead uses the independently exact division by `(1-c)`. This deliberate source
difference is recorded rather than silently copying an approximation.

## 8. Fixtures and compatibility

Fixture coverage is registered in
`tests/fixtures/m14/m14-external-calculator-reference-fixtures.json` and the independent
Normal Back Wins/Back Loses strategy outputs are in
`tests/fixtures/bonus-lock-in-reference-fixtures.json`.

The standalone `money_back` API value is a compatibility alias for this contract;
it is not a separate engine or UI mode. The current UI canonicalises legacy `money_back` state to
`bonus_lock_in`.

The reference result remains prospective. Bridge mapping and pending sportsbook current value keep
their existing cash-first authority and must not recognise the retained reward as current cash.
