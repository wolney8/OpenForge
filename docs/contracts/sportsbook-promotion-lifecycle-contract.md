# Sportsbook Promotion Lifecycle Contract

Status: CP-075 release-candidate contract
Last updated: 2026-10-04

## Authority and entry model

One executed bet remains one Sportsbook Bet. `OfferGroupID` links the activity and
`BetRole` is one of `Standalone`, `Trigger`, `Wagering`, or `RewardUse`. Wagering is a
role, never an offer type. The Trigger owns the versioned
`sportsbook-promotion-v1` terms; linked wagering rows do not duplicate those terms.
The optional Offer Groups sheet is supporting enrichment. Its absence never invalidates
an otherwise valid Sportsbook row. Missing terms produce `Promotion details required`.
Contradictory source and internal terms require review rather than last-write-wins.

## Position definitions

- **Cash P&L Now**: settled linked bet economics recognised by existing ledger rules.
- **Open/Locked Reward Face Value**: confirmed promotional balance not yet released;
  it is not cash profit.
- **Estimated Convertible Value**: locked face value multiplied by the explicit Bonus
  Retention assumption.
- **Projected Final Offer P&L**: Cash P&L Now plus currently outstanding estimated
  convertible value. Released value replaces the estimate; it is never layered on top.
- **Wagering Progress**: eligible completed contribution / explicit target / remaining.
- **Open Exposure**: existing unresolved scenario values; it is not realised cash.

For ordinary placed wagering rows, contribution defaults to actual back stake when
bookmaker/group/minimum-odds eligibility is satisfied. An explicit contribution is
required for partial/different eligibility. `Reward` basis derives its base from reward
face value. `Deposit`, `DepositPlusReward`, `FixedAmount`, and `Other` require an explicit
base or target; Plum Duff never guesses it.

## CB503 synthetic fixture

A sanitised trigger uses £100 at 4.50, lay 5.20, actual lay £79.81, zero commission,
50% refund capped at £50, 70% retention, 2× Reward wagering and minimum odds 1.60.
The existing Sportsbook calculator is authoritative: bookmaker-win scenario £14.80;
qualifying-loss cash -£20.19; locked face £50; estimated conversion £35; projected
final £14.81; initial wagering £0 / £100.

## Reward routing and lifecycle

Supported reward types are Cash, BonusFunds, SiteCredit, FreeBetSNR, FreeBetSR and
Unknown. FreeBetSNR/SR use the existing Free Bets award path with the same OfferGroupID.
Other reward types never create a fake Free Bet. Stored external state may be Pending,
Not Earned, Awarded, Locked, Wagering, Released, Expired or Forfeited. Eligibility and
wagering progress may derive Locked/Wagering/Released; external award confirmation is
never invented.

## Safety

Profile scope and existing write authorization apply to every linked row and position
read. Stable group identity is scoped to the Profile. PromoCode is metadata only.
Missing values remain unknown. Existing settled values and History are not rewritten.
