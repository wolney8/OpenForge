# Calculation Contract: Casino Offer Wagering, RTP and EV Planning

_Last updated: 2026-08-09_

## Status and Scope

- Application: Plum Duff
- Ledger: Casino Offers
- Status: Draft implementation contract for planning helpers
- Source authority: workbook parity plus approved Casino modal workflow direction
- Realised P&L authority remains `docs/contracts/casino-offer-resolved-value-contract.md`

This contract defines Casino planning calculations only. It does not replace settled
`NetPnL`, fee reporting, or Profit Tracker resolved-value semantics.

## Calculation Boundary

These outputs are planning/decision-support values:

- wagering target;
- required spins;
- wagering remaining;
- RTP expected return;
- RTP expected loss;
- reward wagering target;
- reward required spins;
- campaign expected value.

They are not guaranteed outcomes and must not be shown as realised profit.

## Inputs

- `wagering_base`: one of `Bonus`, `Deposit`, `DepositPlusBonus`, `CashStake`, `FixedAmount`, `Custom`, `ConvertedReward`
- `bonus_amount`
- `deposit_amount`
- `cash_stake`
- `fixed_wager_target`
- `custom_wager_base`
- `converted_reward_amount`
- `wager_multiplier`
- `wager_target`
- `wager_completed`
- `spin_stake`
- `rtp_percent`
- `expected_reward_cash_value`
- `qualifying_expected_loss`
- `reward_expected_loss`
- `other_expected_costs`

Current MVP UI persists the existing Casino row fields plus the approved planning/audit fields
listed below. The persisted planning fields support traceability and future calculator review; they
do not change settled `NetPnL`, fee reporting, or resolved-value semantics.

## Persisted Planning Fields

The Casino Offers row schema includes these planning fields:

- `wagering_base`
- `custom_wager_base`
- `wagering_completed`
- `rtp_percent`
- `reward_type`
- `reward_wager_multiplier`
- `reward_wager_target`
- `reward_required_spins`
- `reward_wagering_completed`
- `reward_rtp_percent`
- `expected_reward_cash_value`
- `qualifying_expected_loss`
- `reward_expected_loss`
- `other_expected_costs`
- `campaign_ev`

Blank values are valid and mean the planning helper has not captured that source value yet.

## Formulae

### Wager Target

For multiplier-based wagering:

`WagerTarget = WagerBaseAmount * WagerMultiplier`

For fixed wagering:

`WagerTarget = FixedWagerTarget`

The wagering base must be explicit. Do not assume `Bonus * Multiplier` for every
deposit bonus.

### Spins Required

`ExactSpins = WagerTarget / SpinStake`

`ActionableSpins = CEILING(ExactSpins)`

The target remains unchanged. Only the operational spin count rounds upward.

### Wagering Remaining

`WagerRemaining = MAX(0, WagerTarget - WagerCompleted)`

`SpinsRemaining = CEILING(WagerRemaining / SpinStake)` where spin stake is known.

### RTP Expected Return and Loss

`RtpDecimal = RtpPercent / 100`

`ExpectedReturn = WagerTarget * RtpDecimal`

`ExpectedLoss = WagerTarget * (1 - RtpDecimal)`

RTP is a planning expectation, not a settlement value.

### Reward Wagering

Reward wagering is separate from qualifying wagering:

`RewardWagerTarget = ConvertedRewardAmount * RewardWagerMultiplier`

`RewardSpinsRequired = CEILING(RewardWagerTarget / RewardSpinStake)`

Do not reuse the original qualifying wager target invisibly.

### Campaign EV

When reward value is knowable:

`CampaignEV = ExpectedRewardCashValue - QualifyingExpectedLoss - RewardExpectedLoss - OtherExpectedCosts`

If expected reward value is unknown, return an explicit `unknown_reward_value`
state rather than presenting fake precision.

## States

Calculation helpers must return one of:

- `calculable`
- `partial`
- `invalid`
- `unknown_rtp`
- `unknown_reward_value`
- `incomplete_wagering_details`

Blank, zero stake, invalid RTP and unknown reward must never render as `NaN`,
infinity, or negative zero.

## Rounding

- Money outputs: two decimal places, display-rounded only.
- Spin counts: exact value retained where useful; actionable value uses `CEILING`.
- No silent rounding of stored user-entered source values.

## UI Requirements

- Editable values and calculated values must be visually distinct.
- Financial values use the shared Plum Duff financial display contract.
- Percentages use percentage labels such as `96.00%`.
- Settlement remains actual `NetPnL`; EV remains planning information.
- Missing RTP/EV must not block row settlement or fee review.
- Spin Helper remains a disabled future integration seam; no automation.

## Required Fixtures

See `tests/fixtures/casino-offer-wagering-ev-fixtures.json`.

Synthetic UK-market smoke rows for manual and automated scenario coverage are recorded in
`tests/fixtures/casino-offer-realistic-smoke-rows.json`. These rows model common casino offer
archetypes only; they are not evidence that a specific live operator offer is currently available.

## Remaining Deferred Schema Fields

Future schema work should consider durable fields for:

- offer subtype;
- reward wagering toggle/base and separate reward spin stake;
- Spin Helper progress.

These fields are not introduced in the current UI slice.
