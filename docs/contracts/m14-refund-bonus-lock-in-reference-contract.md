# Calculation Contract: M14 Refund / Bonus Lock-In Reference Calculator

_Last updated: 2026-07-14_

## 0. Contract status

- Status: Research draft - human approval required
- Owner: OpenForge M14 Calculator Workspace
- Related evidence: `docs/reference/m14-calculator-research/teamprofit-refund.packet.json`
- Tracker authority: workbook cash-first sportsbook contract remains authoritative

## 1. Purpose

Size an equalised reference lay for a refund-if-loses offer where a future
bonus/free-bet award is represented by an explicit retained value.

This is a standalone calculator/reference model. It must not cause a pending
sportsbook tracker row to recognise speculative future bonus value as cash now.

## 2. Inputs

- back stake `B`
- back odds `O_b`
- lay odds `O_l`
- lay commission ratio `c`
- maximum/refund award `A`
- assumed retention ratio `r`

All values are synthetic in fixtures. Percentages are converted to ratios before
calculation.

## 3. Candidate formula

Effective future award value:

`R = A * r`

Equalised reference lay stake:

`L = (B * O_b - R) / (O_l - c)`

Reference liability:

`liability = L * (O_l - 1)`

Scenario values:

- bookmaker/back wins: `B * (O_b - 1) - liability`
- exchange/lay wins and refund is awarded: `-B + L * (1 - c) + R`

The unrounded scenario values should be equal apart from display rounding.

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

## 6. Rounding

- calculate with unrounded inputs and intermediates
- display lay stake, liability, and scenario values to 2 decimal places
- packet comparison tolerance: GBP `0.01`, except a documented provider display
  discrepancy may be retained for review rather than normalised away
- OpenForge implementation tolerance remains subject to human approval

## 7. Covered evidence

Cases `TP-RF-001` through `TP-RF-005` reproduce the candidate equation to the
provider's displayed precision, allowing for a one-penny provider display
difference. `TP-RF-006` is invalid-input evidence only.

## 8. Fixtures and approval

Fixture coverage is registered in
`tests/fixtures/m14/m14-external-calculator-reference-fixtures.json`.

Human approval is required for:

- whether `A` means the advertised cap or the actual award for the row
- retention default and whether it may be profile/settings owned
- final OpenForge rounding order
- bridge mapping into sportsbook and later free-bet rows

