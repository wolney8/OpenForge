# Fixture Spec: M14 External Calculator Reference Evidence

_Last updated: 2026-07-14_

## Contracts covered

- `docs/contracts/m14-external-calculator-reference-values-contract.md`
- `docs/contracts/m14-odds-converter-reference-contract.md`
- `docs/contracts/m14-refund-bonus-lock-in-reference-contract.md`
- owning OpenForge calculator contracts named by the fixture manifest

## Purpose

Register synthetic public-calculator observations without allowing unresolved
captures to become approved OpenForge expected-money fixtures.

Observation packets contain the exact synthetic input/output pairs. The JSON
manifest classifies which packet cases a test runner may dereference.

## Fixture classes

### `accepted_reference`

- reactive observations with a reproducible equation
- used only as external regression comparisons
- must name an owning OpenForge contract
- must define a display tolerance
- does not override owning OpenForge fixtures

### `contract_draft`

- evidence supports a candidate equation
- may be used to review the draft contract
- not available to the calculator registry until human approval

### `research_only`

- values were captured, but exact mode/formula/rounding is unresolved
- may not be asserted as OpenForge expected money

### `blocked`

- non-reactive, anomalous, wrong-mode, or insufficient evidence
- must include a reason and follow-up requirement
- must never be loaded by deterministic financial tests

## Accepted reference families

| Family | Cases | Owning contract | Tolerance |
|---|---|---|---:|
| TeamProfit Normal | `TP-N-001` to `TP-N-005` | sportsbook current value | GBP `0.02` external reconciliation band |
| TeamProfit Free Bet SNR | `TP-SNR-001` to `TP-SNR-005` | free-bet current value | GBP `0.02` external reconciliation band |
| MBB odds converter | `MBB-OC-001` to `MBB-OC-005` | M14 odds converter | `0.01` display comparison |

Invalid-input cases are retained as research evidence because OpenForge must
reject them rather than copy the third-party output.

The TeamProfit band reflects observed provider headline rounding differences;
it does not change the exact `0.01` tolerance of an owning OpenForge contract.

## Promoted family

TeamProfit Refund cases `TP-RF-001` to `TP-RF-005` support the candidate
refund/bonus-lock-in equation. The refund-if-back-loses Standard mode was promoted on 2026-09-10
after the current source established reward/retention meaning and penny-placement order. Approved
OpenForge outputs live in `tests/fixtures/bonus-lock-in-reference-fixtures.json`; the retained
external manifest classification remains historical source evidence. Reward-if-back-wins remains
blocked and is not promoted.

## Required validation

- all JSON parses with `jq`
- fixture and case IDs are unique within their class
- every referenced packet and case ID exists
- every accepted reference names an existing owning contract
- no blocked case appears in `accepted_reference`
- values remain synthetic
- packet `validation_state` is not used as financial approval

## Follow-up gates

- independently reproduce any case promoted from `research_only`
- isolate formulas with controlled one-input changes
- add invalid and boundary behaviour to the owning OpenForge fixture pack
- approve calculator-specific current-value semantics before ledger bridging
