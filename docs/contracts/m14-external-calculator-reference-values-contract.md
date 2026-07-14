# Calculation Contract: M14 External Calculator Reference Governance

_Last updated: 2026-07-14_

## 0. Contract status

- Status: Research evidence governance contract - human approval required
- Owner: OpenForge M14 Calculator Workspace
- Human approval required before implementation: Yes
- Related workflow: `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
- Related source pack: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Review matrix: `docs/reference/m14-calculator-research/openforge-coverage-review.md`

## 1. Purpose

Define how public-calculator observations may be retained and compared without
turning them into authoritative OpenForge money logic.

This contract governs evidence. It is not a substitute for a calculator-family
calculation contract.

## 2. Authority and precedence

Authority is fixed in this order:

1. current OpenForge workbook source pack and approved cash-first contract
2. approved OpenForge deterministic fixtures for the owning contract
3. independently reproduced external observations as comparison evidence
4. unresolved or single-session observations as research evidence only

There is no preferred external provider. If providers disagree, OpenForge must
record the discrepancy and resolve it against the owning OpenForge contract.
It must not silently choose the more favourable value.

## 3. Evidence states

| State | Meaning | Permitted use |
|---|---|---|
| `accepted-reference` | Reactive output and candidate equation are reproducible | Regression comparison against an owning OpenForge contract |
| `contract-draft` | Candidate equation reproduces observations but the family contract is not approved | Contract review and fixture drafting only |
| `research-only` | Output was captured but formula, mode, or rounding is unresolved | Documentation and targeted follow-up only |
| `blocked` | Controls were non-reactive, wrong-mode, anomalous, or insufficient | No deterministic fixture or implementation use |

An observation packet's `validation_state: pass` means only that the browser
capture completed. It does not mean the formula or OpenForge adaptation passed
financial review.

## 4. Current reviewed coverage

- TeamProfit Normal: `accepted-reference`; delegates to
  `docs/contracts/sportsbook-current-value-contract.md`.
- TeamProfit Free Bet SNR: `accepted-reference`; delegates to
  `docs/contracts/free-bet-current-value-contract.md`.
- TeamProfit Refund: `contract-draft`; governed by
  `docs/contracts/m14-refund-bonus-lock-in-reference-contract.md`.
- MatchedBettingBlog odds converter: `accepted-reference`; governed by
  `docs/contracts/m14-odds-converter-reference-contract.md`.
- MatchedBettingBlog each-way: `research-only`; compare with the existing
  OpenForge each-way draft, but do not import the observed outputs as formula
  authority.
- MatchedBettingBlog comparison, extra-place, sequential-lay, early-payout,
  and accumulator packets: `research-only` or `blocked` as recorded in the
  review matrix and fixture manifest.

## 5. Inputs and outputs

Research evidence records:

- provider, URL, access date, mode, and observation case ID
- exact synthetic inputs and rendered outputs
- capture limitations and OpenForge review state
- candidate equation, rounding evidence, and unresolved branches

When an accepted reference is shown in OpenForge, it must remain labelled
`Reference`. It must never populate actual stake, current value, final value,
balance, exposure, or reporting fields without the owning contract's normal
workflow and user confirmation.

## 6. Tolerance and rounding

- A same-provider recapture with identical inputs should match the exact
  displayed values.
- Candidate-equation reconciliation uses only the explicit band in the fixture
  manifest. TeamProfit headline values currently require up to GBP `0.02`
  because the provider's downstream rounding order is unresolved.
- Cross-provider differences are evidence, not automatic pass/fail results.
- OpenForge calculation acceptance uses the tolerance in the owning OpenForge
  contract, not a tolerance inferred from a public page.
- Hidden precision and intermediate rounding must not be inferred from display
  values alone.
- A one-penny discrepancy must remain visible during reconciliation.

## 7. Invalid inputs

Observed third-party invalid-input behaviour is not copied into OpenForge.
Negative lay stakes, negative liabilities, retained zero odds, and silent blank
coercion are research-only observations. OpenForge must reject unresolved or
invalid required inputs according to the owning contract.

## 8. Profile and audit boundary

Standalone research fixtures are not profile-owned. If a calculator result is
bridged into a tracker draft, the target `profile_id`, profile exchange
commission, and current authority lists must be resolved again. The bridge must
retain provider, case/formula version, and any discrepancy as audit metadata.

## 9. Fixtures

Use:

- `docs/fixture-specs/m14-external-calculator-reference-fixture-spec.md`
- `tests/fixtures/m14/m14-external-calculator-reference-fixtures.json`

Only entries under `accepted_reference` may be used as external regression
comparisons. `contract_draft`, `research_only`, and `blocked` entries must not
be loaded as approved expected-money fixtures.

## 10. Approval gates

Before a calculator family enters the M14 registry:

- approve its calculator-specific calculation contract
- approve deterministic OpenForge fixtures, including invalid inputs
- reconcile its values with the workbook/current-value owner
- define exact rounding and tolerance
- define bridge mapping and profile commission re-resolution
- add unit and Playwright coverage
