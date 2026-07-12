# OpenForge Sportsbook Selector Mapping Plan

_Last updated: 2026-07-11_

## Purpose

Define the approved planning map for:

- `OfferType -> BetType`
- `OfferType -> Result branches`
- `OfferType -> Calculator family`

This is a planning reference for later selector cleanup and should be used
before changing runtime dropdown behaviour.

## Rules

- `OfferType` owns promotion mechanics
- `BetType` owns wager shape
- `OfferName` is campaign-tag metadata only
- `MatchStrategy` stays separate from all three
- if a mapping is unclear, the selector should prefer safe fallback rather than
  forced inference

## 1. Current workbook-backed families

| OfferType | Allowed / suggested BetType | Result branch notes | Calculator family |
|---|---|---|---|
| `Sign up / Welcome` | `Single` default; other simple bet shapes allowed if approved later | ordinary sportsbook result branches | standard qualifying |
| `Bet & Get` | `Single`, `Bet Builder`, `Accumulator / Multiple`, `In Play + Single`, `In Play + Bet Builder` | ordinary sportsbook result branches plus later free-bet-award workflow | standard qualifying |
| `Enhanced Price` | `Single` default; `First Goalscorer` or `Correct Score` if operator chooses | ordinary sportsbook result branches | standard qualifying |
| `Price Boost` | `Single`, `First Goalscorer`, `Correct Score`, `Accumulator / Multiple` where sensible | ordinary sportsbook result branches | standard qualifying / multi-lay where relevant |
| `Cashback` | `Single`, `First Goalscorer`, `Accumulator / Multiple`, `In Play + Single` | cashback-specific branches such as `Lay Won + Cashback`; implementation currently also supports `Back Won + Cashback` but parity still needs confirmation | cashback / bonus-lock-in |
| `Refund` | `Single`, `First Goalscorer`, `Accumulator / Multiple`, `In Play + Single` | refund trigger branches; wording should be trigger-specific | cashback / bonus-lock-in |
| `Double Delight / Hat-trick Heaven` | `First Goalscorer` strongly suggested | `Outcome 1 Won`, `Outcome 2 Won`, `Outcome 3 Won`, plus lay/no-selection paths where relevant | DDHH |
| `Mug Bet` | `Single` default | ordinary win/lose paths with no-lay handling | no-lay / mug-bet |
| `Bet Builder` legacy value | `Bet Builder` only while legacy rows remain | ordinary result branches | standard qualifying |
| `Acca` legacy value | `Accumulator / Multiple` only while legacy rows remain | ordinary result branches | standard qualifying |
| `Reload` legacy broad value | fallback only until split into clearer families | depends on actual mechanic; do not infer strongly from this label alone | depends on actual mechanic |
| `None` legacy placeholder | `Single` fallback only | ordinary result branches or mug/no-offer path depending on row | standard qualifying / no-lay |

## 2. Advanced planned families

| OfferType | Allowed / suggested BetType | Result branch notes | Calculator family |
|---|---|---|---|
| `Each Way` | `Each Way` initially; later possibly `In Play + Each Way` only if approved | needs `Placed Only` and likely `Non Runner` support | each-way |
| `2UP / Early Payout` | `Single` strongly suggested; later `In Play + Single` only if a real operator use case exists | needs explicit trigger-held and trigger-reversed branches | 2UP / early-payout |
| `BOG / Best Odds Guaranteed` | `Single` strongly suggested | ordinary win/lose plus settlement-time uplift and likely `Non Runner` | BOG |
| `Extra Places` | `Each Way` strongly suggested | needs `Extra Place Hit` and likely `Non Runner` | extra-places |
| `Money Back If 2nd/3rd` | `Single` or horse-racing-specialised shape | needs dedicated refund/place-result branches | horse-racing refund |
| `Acca Insurance` | `Accumulator / Multiple` strongly suggested | needs one-leg-loses or refund-awarded branches | acca insurance |

## 3. Composite `BetType` values approved for parity-safe interim use

Until a separate placement-context field exists, these composite `BetType`
values are allowed in planning:

- `In Play + Single`
- `In Play + Bet Builder`
- later only if justified:
  - `In Play + Accumulator / Multiple`

These should be treated as workbook-compatible bridge values, not the final
ideal data model.

## 4. Mapping cautions

- `OfferType` must not silently inherit from `OfferName`
- `BetType` must not silently rewrite `OfferType` unless an approved mapping
  exists
- `Reload` should not drive strong calculator or result assumptions
- legacy `Bet Builder` / `Acca` `OfferType` values should be tolerated for old
  rows but not treated as the preferred long-term taxonomy

## 5. Next runtime-safe implementation sequence

1. rationalise sportsbook `OfferType` options
2. introduce approved composite `BetType` values such as `In Play + Single`
3. update selector defaults to follow this mapping plan
4. only then widen result vocabularies and calculator selection for advanced
   offer families
