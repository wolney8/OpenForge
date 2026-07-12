# OpenForge OfferType / BetType / OfferName Model

_Last updated: 2026-07-11_

## Purpose

The workbook preserved three adjacent sportsbook/free-bet fields:

- `OfferType`
- `BetType`
- `OfferName`

Those fields are useful, but the workbook did not keep their boundaries clean
enough. OpenForge should preserve the fields while improving their purpose,
authority ownership, and UI behaviour.

This document defines:

- why each field exists
- what kind of values belong in each field
- how their dropdowns should work
- how they should relate to each other
- where the workbook taxonomy is currently muddy

## 1. The three-field model

### `OfferType`

`OfferType` describes the **promotion mechanic** or **offer family**.

It answers:

- what kind of bookmaker promotion or special settlement rule is this?

Examples:

- `Bet & Get`
- `Price Boost`
- `Cashback`
- `Refund`
- `Double Delight / Hat-trick Heaven`
- `2UP / Early Payout`
- `BOG / Best Odds Guaranteed`
- `Each Way`

It should drive:

- result vocabulary
- calculator family
- offer-specific extra fields
- free-bet awarding rules
- special bookmaker knowledge

It should **not** describe:

- the shape of the wager
- the human nickname of a recurring campaign
- the matching strategy

### `BetType`

`BetType` describes the **shape of the wager**.

It answers:

- what kind of bet is being placed?

Examples:

- `Single`
- `Bet Builder`
- `Accumulator / Multiple`
- `Correct Score`
- `First Goalscorer`
- later placement-context combinations such as:
  - `In Play + Single`
  - `In Play + Bet Builder`
- later `Each Way` could either be:
  - a sportsbook offer flow only, or
  - a bet shape plus offer flow

OpenForge should prefer:

- bet-market structure in `BetType`
- promotion mechanics in `OfferType`

Important nuance:

- `In Play` does not behave like a standalone wager shape
- it behaves like a placement/timing modifier that can apply to more than one
  base bet shape
- because the workbook only gives limited adjacent fields, OpenForge may need
  to preserve `In Play` within the current `BetType` surface initially while
  planning a cleaner long-term split

### `OfferName`

`OfferName` describes the **campaign tag**, **named recurring promotion**, or
**operator-facing reusable label**.

It answers:

- which specific recurring promo or labelled campaign is this row using?

Examples:

- `Friday Bet Club`
- `Midweek Acca Reload`
- `Daily 5 Pound Refund`
- `Betfred DDHH`
- `Saturday Boost`

It should drive:

- operator recall
- repeat workflow shortcuts
- bridge defaults
- bookmaker/offer knowledge hints

It should **not** be used as the primary source of:

- settlement mechanics
- wager shape
- matching strategy

## 2. Why all three fields are still worth keeping

These fields are not duplicates once their boundaries are cleaned up.

### Example 1

- `OfferType = Bet & Get`
- `BetType = Single`
- `OfferName = Friday 5er Reload`

Meaning:

- mechanic: bet and receive a free bet
- wager shape: single
- operator label: this specific recurring Friday version

### Example 2

- `OfferType = Refund`
- `BetType = In Play + First Goalscorer`
- `OfferName = Midnite First Goal Refund`

Meaning:

- mechanic: refund/bonus trigger
- wager shape: first goalscorer
- operator label: specific named recurring promo

### Example 3

- `OfferType = Double Delight / Hat-trick Heaven`
- `BetType = First Goalscorer`
- `OfferName = Betfred DDHH`

Meaning:

- mechanic: DDHH settlement family
- wager shape: first goalscorer
- operator label: bookmaker-specific campaign name

### Example 4

- `OfferType = Bet & Get`
- `BetType = In Play + Single`
- `OfferName = Bet 10 Get 5 In Play`

Meaning:

- mechanic: place a qualifying bet and receive a free bet
- wager shape/timing: an in-play single
- operator label: specific recurring campaign wording

## 3. OpenForge field ownership rules

### `Offer`

Keep `Offer` as free text.

It is the operator’s live row label or shorthand text for what they are
currently doing.

Examples:

- `Haaland first goal boost`
- `Saturday horse refund`
- `England v Spain 2UP`

`Offer` is the row title.

### `OfferType`

Keep `OfferType` controlled.

It should come from an authority-owned list because it changes:

- workflow logic
- calculator selection
- result branches
- bridge rules

### `BetType`

Keep `BetType` controlled.

It should come from an authority-owned list because it affects:

- market assumptions
- calculator layout
- placement workflow
- result branch availability

### `OfferName`

Keep `OfferName` controlled but optional.

It should come from a profile-safe authority list and behave like a campaign
tag library.

It should remain optional because:

- many rows are one-off offers
- the operator may know the mechanic and wager shape without wanting to tag the
  campaign

## 4. Current workbook/platform problems

### Problem 1: `OfferType` currently contains non-mechanic values

Current values such as:

- `Bet Builder`
- `Acca`
- `Reload`
- `None`
- `Mug Bet`

are not all the same kind of thing.

Issues:

- `Bet Builder` and `Acca` often belong in `BetType`
- `Reload` is too broad and hides multiple mechanic families
- `None` is a placeholder, not a promotion family
- `Mug Bet` is closer to an operational mode than a promotion mechanic

### Problem 2: `OfferName` is doing too much

In practice `OfferName` has been used for:

- genuine named campaigns
- generic labels
- operator notes
- fallback row descriptors

That makes the dropdown noisy and weakens its usefulness.

### Problem 3: `BetType` and `OfferType` partially overlap

Examples:

- `Bet Builder` appears as both a bet concept and an offer-type value
- `Acca` appears as both a bet concept and promotion shorthand
- `Each Way` will need a clear rule before implementation

## 5. Recommended OpenForge model

### Sportsbook `OfferType`

Use `OfferType` for offer families/mechanics only.

Recommended direction:

- `Sign up / Welcome`
- `Bet & Get`
- `Price Boost`
- `Enhanced Price`
- `Cashback`
- `Refund`
- `Double Delight / Hat-trick Heaven`
- `2UP / Early Payout`
- `BOG / Best Odds Guaranteed`
- `Each Way`
- `Extra Places`
- `Acca Insurance`
- `Money Back If 2nd/3rd`
- `Mug Bet`

Needs review:

- whether `Mug Bet` should remain an `OfferType` or become a dedicated
  operational mode later

Should be removed from `OfferType` long term:

- `Bet Builder`
- `Acca`
- broad `Reload`
- `None`

### Sportsbook `BetType`

Use `BetType` for wager shape only.

Recommended direction:

- `Single`
- `Bet Builder`
- `Accumulator / Multiple`
- `Correct Score`
- `First Goalscorer`
- near-term workbook-compatible composite values where needed:
  - `In Play + Single`
  - `In Play + Bet Builder`
  - later, if genuinely needed:
    - `In Play + Accumulator / Multiple`
- later:
  - `Each Way` only if the product decides that each-way must also be modelled
    as a wager shape instead of offer-flow-only

Long-term preferred model:

- base bet shape:
  - `Single`
  - `Bet Builder`
  - `Accumulator / Multiple`
  - etc
- placement context:
  - `Pre Match`
  - `In Play`

But until a dedicated placement-context field exists, the safest parity path is
to allow workbook-compatible composite `BetType` values such as
`In Play + Single` and `In Play + Bet Builder`.

### Sportsbook `OfferName`

Use `OfferName` for named campaign tags only.

Recommended direction:

- authority-owned values imported from workbook `OfferNameList`
- later expanded by Fund Manager settings
- filtered by bookmaker and, where safe, by offer family

UI wording should continue to prefer:

- label: `Campaign tag`
- stored field: `offer_name`

## 6. Dropdown relation rules

### `OfferType` -> `BetType`

`OfferType` may narrow allowed or suggested `BetType` values.

Examples:

- `Double Delight / Hat-trick Heaven`
  - strongly suggests `First Goalscorer`
- `Bet Builder` offer family should eventually disappear, but if legacy rows
  still use it, it should force or suggest `Bet Builder`
- `Acca Insurance`
  - should suggest `Accumulator / Multiple`
- `2UP / Early Payout`
  - likely suggests `Single`
- `BOG / Best Odds Guaranteed`
  - likely suggests `Single`

Rule:

- `OfferType` can suggest or restrict `BetType`
- `BetType` must not silently rewrite `OfferType` unless an approved mapping
  explicitly exists

### `BetType` -> calculator layout

`BetType` should drive:

- visible market helpers
- calculator arrangement
- expected result branches

Examples:

- `First Goalscorer` allows DDHH and multi-lay outcome naming flows
- `Correct Score` allows multi-lay outcome naming flows
- `Accumulator / Multiple` later connects to sequential-lay and acca workflows

### `OfferType` + `Bookmaker` -> `OfferName`

`OfferName` should be filtered primarily by:

1. bookmaker
2. offer type

but should still allow full list fallback when scoped matches are empty.

That preserves usability without inventing overly hard restrictions.

### `OfferName` naming pattern

Good `OfferName` values usually combine:

1. campaign or promo family
2. qualifier value if important
3. timing cue if important
4. recurrence label if important

Good examples:

- `Bet 10 Get 5 In Play`
- `Weekly Reload`
- `Friday Bet Club`
- `5 Pound Refund If Lose`
- `Midweek Acca Insurance`
- `Saturday Horse Refund`
- `Betfred DDHH`
- `Early Payout Single`
- `Price Boost Daily Reload`

Poor `OfferName` examples:

- `Single`
- `Football`
- `Underlay`
- `Refund`
- `Haaland`

Those belong in other fields:

- wager shape -> `BetType`
- sport/context -> `FixtureType` or `Offer`
- strategy -> `MatchStrategy`
- offer mechanic -> `OfferType`
- event/selection detail -> `Offer` or `EventName`

## 7. Validation rules

### Required

- `Offer` should remain required as the operator row title
- `OfferType` should remain required for sportsbook and free-bet ledgers
- `BetType` should remain required for sportsbook and free-bet ledgers

### Optional

- `OfferName` should remain optional

### Disallowed behaviour

- do not infer financial logic from `OfferName` alone
- do not let `OfferName` silently replace `OfferType`
- do not let `BetType` and `OfferType` duplicate each other without review

## 8. Immediate cleanup targets

Before further sportsbook parity work:

1. rationalise the `OfferType` authority list
2. keep `Bet Builder` and `Acca` moving toward `BetType`
3. keep `OfferName` as optional campaign-tag metadata
4. preserve workbook compatibility for stored fields while improving UI wording
5. add explicit mapping docs for:
   - allowed `OfferType -> BetType` suggestions
   - allowed `OfferType -> Result` branches
   - allowed `OfferType -> Calculator family`
   - approved composite `In Play + ...` `BetType` values until placement-context
     is modelled separately

## 9. Safe implementation order

1. approve this field-ownership model
2. write/update authority-list planning for `OfferType`, `BetType`, and `OfferName`
3. update runtime selector behaviour without changing money logic
4. then update bridge and calculator flows to consume the cleaned model
