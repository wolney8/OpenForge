# Contract: Sportsbook Profit Boost Workflow

_Last updated: 2026-09-15_

## Purpose

Define the approved Profit Boost sportsbook workflow so Plum Duff can support:

- bookmaker-displayed boosted odds
- bookmaker total-return and profit-only displays
- percentage-only boosts where the bookmaker shows the uplift but not the final odds

This contract is workflow-facing. The formula source remains:

- `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md`

## Scope

- profile-scoped sportsbook rows only
- fund manager entry and later subscriber-safe read visibility
- ledger modal matching calculator
- Fund Manager standalone calculator workspace

## Modes

### Displayed boosted odds

The bookmaker already shows the final boosted decimal odds.

Required user inputs:

- back stake
- boosted back odds
- lay odds
- exchange
- commission

Optional:

- actual accepted back odds if the placed price differs

The compatibility value `displayed_odds` now means the explicit final boosted-odds entry path. Its
UI label is `Entered boosted odds`: a user may type bookmaker-provided odds or explicitly apply the
temporary payout helper. The persisted identifier is unchanged.

### Bookmaker total return

- Stores the bookmaker's total-potential-return input in `profit-boost-source-v1`.
- Supports cash-stake returns including returned stake only; profit-only winnings and
  stake-not-returned free-bet payouts are invalid.
- Shows raw implied odds and the conservative two-decimal floored hedge odds.
- Preserves the bookmaker return separately from the odds-based conservative return.

### Bookmaker profit

- Stores potential profit excluding returned stake in `profit-boost-source-v1`.
- Uses `1 + profit / stake` before the ordinary four-decimal odds rule.
- Does not apply the total-return flooring rule.

### Percentage-only boost

The bookmaker shows the base odds and a boost percent, but not the final boosted odds.

Required user inputs:

- back stake
- base back odds
- profit boost percent
- lay odds
- exchange
- commission

Optional:

- maximum boost winnings cap
- actual accepted back odds

All four sources are available in standalone, conversion and native Sportsbook planning. The
nullable source document is versioned and server validated. Historical rows without it retain
their existing behaviour and are not backfilled.

## Required UX behaviour

- Offer Type must expose `Profit Boost` as a first-class sportsbook offer type.
- Matching calculator must clearly show whether it is using:
  - displayed boosted odds
  - calculated boosted odds from percentage
  - calculated boosted odds from total return or profit-only input in standalone mode
- Calculated boosted odds must be labelled as a reference value, not a confirmed bookmaker value.
- Copying a lay suggestion must use the same Outplayed-style result cards and copy interaction as the standard sportsbook calculator.
- Advanced calculator mode must continue to support:
  - Underlay
  - Standard
  - Overlay
  - Custom
- No-lay mode must remain available when the workflow intentionally does not lay the bet.

## Status and settlement rules

- Open rows use existing sportsbook cash-first current-value logic.
- Placed rows use actual accepted odds where supplied.
- Settled rows resolve through the existing sportsbook result branches.
- Profit Boost must not create a free-bet bridge by itself unless the offer type also awards a free bet.

## Required downstream compatibility

- dashboards
- reports
- issue filters
- profile summaries
- calculator workspace reuse

## Related documents

- `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md`
- `docs/workflows/sportsbook-bet-workflow-contract.md`
- `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
