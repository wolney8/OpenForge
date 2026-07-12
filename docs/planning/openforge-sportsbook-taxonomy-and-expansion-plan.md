# OpenForge Sportsbook Taxonomy and Expansion Plan

_Last updated: 2026-07-11_

## Purpose

Separate sportsbook:

- offer flows
- strategy types
- result branches
- calculator families

This prevents OpenForge from conflating promotion mechanics with matching
mechanics and gives future calculator work a contract-first expansion path.

## 1. Taxonomy rules

### Offer flows

Offer flows describe the bookmaker promotion or settlement mechanic.

They answer:

- what kind of sportsbook offer is this?
- what trigger or payout rule makes this row special?

Offer flows are **not** matching strategies.

### Strategy types

Strategy types describe how the operator matches or intentionally does not
match the sportsbook position.

They answer:

- how is this bet being laid or managed?

Strategy types are **not** offer flows.

### Result branches

Result branches describe the settlement path that actually happened, or the
available projected outcome paths while a row is still open.

They answer:

- which outcome resolved?
- which branch should drive final value?

Result branches are **not** offer flows and are **not** strategies.

### Calculator families

Calculator families are the interaction surfaces used to work out suggested
lay stakes, liabilities, and scenario outcomes.

One calculator family may support more than one offer flow and more than one
strategy.

## 2. Workbook-backed sportsbook offer flows

These are already present in the current workbook/source-pack or are already
represented in the current OpenForge sportsbook implementation.

| Offer flow | Workbook/source-pack backing | Current OpenForge state | Notes |
|---|---|---|---|
| `Sign up / Welcome` | Yes | Present in authorities | Qualifying/welcome style flow |
| `Bet & Get` | Yes | Present | Core qualifying-to-free-bet bridge family |
| `Enhanced Price` / `Price Boost` | Yes | Present | Likely rationalise later into one clearer family label |
| `Cashback` | Yes | Present | Needs explicit trigger/result wording per row |
| `Refund` / bonus lock-in style | Yes | Present | Uses retained-bonus assumptions and trigger mode |
| `Double Delight / Hat-trick Heaven` | Yes | Present | Special multi-outcome settlement family |
| `Bet Builder` | Workbook-adjacent | Present | More likely a bet shape plus offer wrapper than a pure offer flow |
| `Acca` | Workbook-adjacent | Present | More likely a bet shape plus offer wrapper than a pure offer flow |
| `Reload` | Yes | Present | Too broad as a final taxonomy label; should later split into clearer sub-families |
| `Mug Bet` | Yes | Present | Special operational/no-lay flow rather than promotion mechanic |
| `None` | Yes | Present | Placeholder only; not a true offer family |

## 3. Workbook-backed sportsbook strategy types

These are the current sportsbook matching strategies and should remain separate
from offer-flow terminology.

| Strategy type | Workbook/source-pack backing | Notes |
|---|---|---|
| `Standard` | Yes | Standard matched qualifying shape |
| `Underlay` | Yes | Intentional positive upside / lower qualifying certainty |
| `Overlay` | Yes | Intentional front-loaded loss reduction / later upside trade-off |
| `Custom` | Yes | Operator-supplied lay stake |
| `No Lay` | Yes | Mug/unmatched path |
| `Partial Lay` | Yes | Only part of target lay is matched or intentionally entered |
| `Multilay` | Yes | Multi-outcome lay plan |
| `Multilay-Underlay` | Yes | Multi-outcome lay plan using underlay branch stakes |

## 4. Current sportsbook result-branch set

### Workbook-backed sportsbook result branches

These are the source-pack sportsbook result values currently evidenced in the
workbook deconstruction.

- `Pending`
- `Outcome 1 Won`
- `Outcome 2 Won`
- `Outcome 3 Won`
- `No Selection Won`
- `Back Won`
- `Lay Won`
- `Lay Won + Cashback`
- `Win`
- `Lose`
- `Mixed`
- `Void`

### OpenForge implementation note

OpenForge sportsbook code also contains a `Back Won + Cashback` branch for
cashback/refund-style handling.

That branch should be treated as **implementation-supported but still needing
explicit parity confirmation** because the current workbook/source-pack wording
is clearer on `Lay Won + Cashback` than on a separate `Back Won + Cashback`
stored result value.

## 5. What is currently being conflated

The current platform still has some taxonomy drift:

- `Bet Builder` and `Acca` appear as offer-flow values even though they are
  often bet-shape descriptors.
- `Reload` is too broad and hides materially different offer mechanics.
- `Mug Bet` behaves more like an operational handling mode than a promotion
  family.
- `OfferName` currently behaves partly like a campaign tag and partly like a
  generic label, so it needs a tighter role.
- `Partial Lay`, `Multilay`, and `Multilay-Underlay` were being discussed as
  offer flows, but they are strategy types.
- cashback/refund/DDHH result branches are still partly expressed using generic
  result values rather than a cleaner named branch vocabulary.

## 6. Advanced sportsbook offer flows to add after contract approval

These should be planned as **new offer flows**, not strategy values.

### High-priority sportsbook expansion families

| Offer flow | Why it matters | Contract status |
|---|---|---|
| `Each Way` | Common horse-racing/golf matched-betting workflow with place terms and dual-leg economics | Draft contract + fixture spec |
| `2UP / Early Payout` | Important early-payout/2-goal-head-start style offer family | Draft contract + fixture spec |
| `BOG / Best Odds Guaranteed` | Needs starting-price vs taken-price settlement handling | Draft contract + fixture spec |

### Other likely sportsbook offer-flow candidates

| Offer flow | Why it is likely needed | Contract status |
|---|---|---|
| `Extra Places` | Horse-racing place-term variant closely related to each-way flows | Draft contract + fixture spec |
| `Money Back If 2nd/3rd` | Distinct refund/cashback horse-racing family that should not be hidden inside generic cashback | Missing |
| `Acca Insurance` / `One Leg Loses` refund | Common acca-specific refund family | Missing |
| `Bet Club` / loyalty sportsbook reload | Broad reload category that may need explicit subtypes later | Missing |
| `Scorecast` / same-game outcome booster | Often requires custom multi-outcome branch vocabulary | Missing |

### Keep deferred, but already recognised elsewhere

- `Sequential Laying`
- standalone `Dutching`
- later calculator-workspace-only bet exploration tools

These are better treated as dedicated calculator/workflow families rather than
simple sportsbook offer-type dropdown additions.

## 7. Calculator-family plan

OpenForge should eventually support these in two places:

1. embedded inside sportsbook/free-bet row workflows when a row uses that
   family
2. separately in a calculator workspace that can later bridge into a row

### Current calculator families already represented

- standard qualifying calculator
- free-bet SNR/SR calculator
- cashback/refund / bonus-lock-in style calculator
- DD/HH branch calculator
- multi-lay calculator

### Missing advanced calculator families

- each-way calculator
- 2UP / early-payout calculator
- BOG calculator
- extra-places calculator
- sequential-lay calculator

## 8. Result-branch improvement plan

The current sportsbook result set is functional but not complete enough for
future advanced offer families.

### Result-branch rules going forward

- Keep stored result values deterministic and contract-backed.
- Keep UI wording branch-specific and human-readable.
- Allow named scenario labels in the calculator while preserving a stable
  stored result vocabulary.
- Avoid creating result labels that duplicate strategy labels or offer-flow
  labels.

### Known branch gaps for future offer families

| Offer flow | Missing branch vocabulary/examples |
|---|---|
| `Each Way` | win branch, place-only branch, full miss branch, void/non-runner treatment |
| `2UP / Early Payout` | early-payout triggered, comeback loss after early payout, ordinary back win, ordinary lay win |
| `BOG / Best Odds Guaranteed` | taken price wins, starting-price uplift wins, no uplift, void/non-runner |
| `Extra Places` | placed-in-extra-places branch vs full miss |

## 9. Contract and fixture backlog

Before implementation, each new advanced offer family needs:

- a dedicated calculation contract
- deterministic fixtures
- explicit cash-first current-value wording
- settlement-branch vocabulary
- UI copy rules for open vs settled rows
- Playwright path coverage if user-facing

### Priority contract backlog

1. `sportsbook-each-way-current-value-contract.md`
2. `sportsbook-2up-early-payout-current-value-contract.md`
3. `sportsbook-bog-current-value-contract.md`
4. `sportsbook-extra-places-current-value-contract.md`

### Priority fixture backlog

1. open/pending current-value cases
2. settled branch cases for every branch family
3. void/non-runner or cancelled equivalents where relevant
4. profile-isolation pair cases
5. import/export round-trip cases once those workflows exist

## 10. Immediate implementation guidance

Until those contracts exist:

- do not add `Each Way`, `2UP`, `BOG`, or `Extra Places` as live calculation
  options
- do not fake those flows by forcing them into `Cashback`, `Refund`, or
  generic `Reload`
- do keep the platform taxonomy ready for them by separating:
  - offer flow
  - strategy
  - result branch
  - calculator family

## 11. Recommended next safe slice

The next safe contract-first slice is:

1. rationalise sportsbook offer-flow taxonomy in planning/docs
2. keep strategy labels unchanged in code until contract updates are approved
3. write the first advanced offer contract for `Each Way`
4. then fixture it before any calculator UI implementation
