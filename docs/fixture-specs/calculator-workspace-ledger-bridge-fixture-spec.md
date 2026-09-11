# Fixture Spec: Calculator Workspace and Ledger Bridge

_Last updated: 2026-09-11_

## Contract covered

- `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
- Calculator-specific calculation contracts referenced by `calculator_contract`

| ID | Scenario | Expected result |
|---|---|---|
| CALC-001 | Standalone standard calculator | Reference result only; no ledger mutation |
| CALC-002 | SNR/SR calculator bridged to Free Bets | Reviewed source becomes an idempotent native Prospecting row; retention mode and source identity are preserved |
| CALC-003 | Target profile commission differs | Recalculate using target profile setting |
| CALC-004 | Suggested lay copied | Clipboard value labelled; no actual stake inferred |
| CALC-005 | Dutching has an approved calculator contract but no lossless ledger destination | Calculator remains usable; conversion action is absent and no row is created |
| CALC-006 | Governed Cashback source converted to Sportsbook | Offer type is locked to Cashback, destination recalculates, and retry is idempotent |
| CALC-007 | Advanced sportsbook calculator exposes underlay/standard/overlay/custom | All branches render as reference values; no ledger placement |
| CALC-008 | Profit Boost percentage-only calculator | Reference boosted odds calculated from base odds, stake and percentage |
| CALC-009 | Profit Boost displayed-odds calculator | Displayed boosted odds become effective reference odds |
| CALC-010 | Multi-lay standalone calculator | Outcome branches render reference stakes and results; no placement state |
| CALC-011 | Core accumulator with Winner/Loser/Void selections | Deterministic total stake/return/profit; no Profile or ledger mutation |
| CALC-012 | Simple two/three-way Normal or SNR Free Bet Dutching | Deterministic rounded stakes and covered-outcome results; no placement state |
| CALC-013 | Blackjack hard/soft/pair hand under selected rule controls | Published strategy action plus temporary Simulation history; no money or business write |
| CALC-014 | Blackjack Free Play session | Free credit stays separate from optional withdrawable result; eligible for later reviewed Casino conversion |
| CALC-015 | Blackjack Live Play balance review | Exact ending-minus-starting session result; recommendations do not change committed stake |
| CALC-016 | Blackjack actual Double/Split | Only recorded actions change per-hand committed stakes; optional returns remain entered evidence |
| CALC-017 | Blackjack source snapshot | Canonical immutable history and mode-specific money yield a deterministic checksum; Simulation is non-convertible |

Shared calculator odds-entry cases are maintained in
`tests/fixtures/calculator-odds-normalization-fixtures.json`. They cover decimal, fractional and
unambiguous decimal-comma input plus ambiguous separators, malformed fractions and non-finite text.
The bounded source fixtures for CALC-011 through CALC-013 are maintained in
`tests/fixtures/standalone-calculator-families-v1.json`.
