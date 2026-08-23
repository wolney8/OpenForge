# Fixture Spec: Sportsbook Profit Boost

_Last updated: 2026-08-21_

## Purpose

Define deterministic fixture coverage for Profit Boost sportsbook rows.

Formula authority remains:

- `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md`

Workflow authority remains:

- `docs/contracts/sportsbook-profit-boost-contract.md`

## Required fixture families

### 1. Displayed boosted odds

- bookmaker shows boosted odds directly
- standard lay mode
- underlay mode
- overlay mode
- custom lay mode

### 2. Percentage-only boost

- base odds plus boost percent
- calculated boosted odds shown as reference
- no cap applied
- cap applied

### 3. Actual accepted odds override

- placed price differs from displayed/calculated boosted price
- current value and settlement use accepted odds

### 4. Open-state current value

- unplaced reference-only state
- placed open state
- partially matched lay where applicable

### 5. Settled branches

- back wins
- lay wins
- void
- manual override

### 6. Validation and edge coverage

- missing base odds in percentage mode
- missing boost percent in percentage mode
- missing boosted odds in displayed mode
- invalid numeric entry
- zero/empty cap

## Required fixture fields

- offer type
- profit boost mode
- back stake
- base back odds
- boosted back odds
- profit boost percent
- maximum boost winnings
- actual accepted back odds
- lay odds
- commission
- expected lay stake
- expected liability
- expected back-win outcome
- expected lay-win outcome
- expected current value
- expected final value by result branch

## Acceptance

- All user-visible values match the calculation contract rounding rules.
- Workflow fixtures prove both displayed-odds and percentage-only modes.
- Result cards in the ledger and calculator workspace can reuse the same expected outputs.
