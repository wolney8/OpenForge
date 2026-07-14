# Calculation Contract: M14 Odds Converter

_Last updated: 2026-07-14_

## 0. Contract status

- Status: Draft - human approval required
- Owner: OpenForge M14 Calculator Workspace
- Financial authority: helper conversion only; never tracker P&L authority
- Related evidence: `docs/reference/m14-calculator-research/mbb-odds-converter.packet.json`

## 1. Purpose

Convert one valid odds representation into decimal, fractional, American, and
implied-probability reference values for calculator input assistance.

## 2. Input authority

Exactly one source representation is authoritative per conversion:

- fractional numerator and denominator
- decimal odds
- American odds
- implied probability percentage

Changing a different source field starts a new conversion. Rounded output from
a previous conversion must not silently become the next source value.

## 3. Normalisation

Let `D` be unrounded decimal odds.

- fractional `a/b`: `D = 1 + (a / b)`
- decimal: `D = decimal_odds`
- American `A >= 100`: `D = 1 + (A / 100)`
- American `A <= -100`: `D = 1 + (100 / abs(A))`
- probability `P`: `D = 100 / P`

Derived values:

- probability: `P = 100 / D`
- positive American where `D >= 2`: `A = 100 * (D - 1)`
- negative American where `1 < D < 2`: `A = -100 / (D - 1)`
- fractional ratio: `(D - 1) / 1`, reduced to an approved rational display

## 4. Validation

- decimal odds must be greater than `1`
- fractional numerator must be zero or greater and denominator greater than `0`
- probability must be greater than `0` and less than `100`
- American odds must be `>= 100` or `<= -100`
- whitespace and a leading `+` may be normalised before numeric validation
- blank, zero, NaN, infinity, and out-of-range values return a validation error,
  not partial conversion outputs

The public page's observed retention of decimal `0` is not adopted.

## 5. Rounding and display

- retain unrounded `D` through all derived calculations
- decimal display: 2 decimal places
- probability display: 2 decimal places
- American display: up to 2 decimal places; include `+` for positive display
- fractional display: reduced exact ratio when the source is exact
- approximation policy for arbitrary repeating decimals: To confirm before implementation

Do not derive one output from another rounded output.

## 6. Deterministic reference cases

The accepted packet cases are:

- `MBB-OC-001`: `5/2` -> `3.50`, `+250`, `28.57%`
- `MBB-OC-002`: `3.75` -> `11/4`, `+275`, `26.67%`
- `MBB-OC-003`: `+250` -> `5/2`, `3.50`, `28.57%`
- `MBB-OC-004`: `-140` -> `5/7`, `1.71`, `58.33%`
- `MBB-OC-005`: `62.5%` -> `3/5`, `1.60`, `-166.67`

`MBB-OC-006` is retained only as third-party invalid-input evidence. OpenForge
must reject it.

## 7. Acceptance tolerance

- exact rational inputs: exact before display rounding
- decimal/probability/American displays: `0.01`
- invalid inputs: exact validation-error category; no numeric tolerance

## 8. UI and audit requirements

- identify the active source field
- show format labels and signs explicitly
- do not imply that probability is a prediction; it is odds-implied probability
- copied values must identify their format
- no conversion writes tracker money fields or bet placement fields

## 9. Human approval gate

Approve the arbitrary-decimal fractional approximation policy and leading-plus
normalisation before implementation.

