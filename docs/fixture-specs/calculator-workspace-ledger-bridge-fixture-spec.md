# Fixture Spec: Calculator Workspace and Ledger Bridge

_Last updated: 2026-08-16_

## Contract covered

- `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
- Calculator-specific calculation contracts referenced by `calculator_contract`

| ID | Scenario | Expected result |
|---|---|---|
| CALC-001 | Standalone standard calculator | Reference result only; no ledger mutation |
| CALC-002 | SNR calculator bridged to free bets | Inputs mapped; row remains unsaved |
| CALC-003 | Target profile commission differs | Recalculate using target profile setting |
| CALC-004 | Suggested lay copied | Clipboard value labelled; no actual stake inferred |
| CALC-005 | Calculator lacks approved contract | Calculator unavailable |
| CALC-006 | Ambiguous destination offer mapping | User review required |
| CALC-007 | Advanced sportsbook calculator exposes underlay/standard/overlay/custom | All branches render as reference values; no ledger placement |
| CALC-008 | Profit Boost percentage-only calculator | Reference boosted odds calculated from base odds, stake and percentage |
| CALC-009 | Profit Boost displayed-odds calculator | Displayed boosted odds become effective reference odds |
| CALC-010 | Multi-lay standalone calculator | Outcome branches render reference stakes and results; no placement state |
