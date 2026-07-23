# Workflow Contract: Common Bet Combos

_Last updated: 2026-07-22_

## Status and scope

- Status: Implemented pending human smoke review
- Milestone: M13 Common Bet Combos and Quick Actions
- Profile scoped: Yes
- Current recurring source reference: `https://matchedbettingblog.com/reload-offers/`
- Current seeded catalogue verified: `2026-07-20`

Public reload listings are discovery evidence for descriptive defaults only. They are not calculation, profitability, eligibility, or settlement authority. The Fund Manager must recheck current terms before placing a bet.

## Deferred external offer intelligence

Plum Duff should later support a Fund Manager-maintained offer intelligence layer for:

- common weekly reloads
- common daily reloads
- free-to-play daily offers, usually casino-led
- welcome/sign-up and free-bet offer catalogues
- account/risk-team warnings that affect which profiles can use those offers

This is not live odds matching and is not autonomous betting. It must remain a planning and tracker
prefill aid unless a later approved milestone changes that boundary.

Allowed later sources may include public matched-betting offer pages and public bookmaker welcome
offer pages. Any automated collection must be explicitly approved, must respect source terms and
robots policy, and must not use login sessions, bookmaker credentials, cookies, account scraping, or
bet-placement automation. If a source cannot be collected safely, the Fund Manager must be able to
maintain the offer catalogue manually.

Welcome offer capture from public sources such as `https://www.oddschecker.com/free-bets` is a
deferred candidate only. It is governed by
`docs/contracts/public-offer-source-ingestion-contract.md` before implementation. That
source-ingestion contract defines:

- whether the source permits automated access
- fields captured, including bookmaker, offer description, minimum stake, minimum odds, award timing,
  expiry and qualifying restrictions
- how stale offers expire or require re-verification
- evidence URL, checked date and confidence
- how profile-specific availability is checked against the profile account state
- how linked operator group, platform and risk-team data influence warnings
- how a welcome-offer template can create Prospecting rows through the multi-profile opportunity
  workflow without confirming placement

## Deferred account restriction intelligence

Plum Duff needs a strong profile-specific restriction log for bookmaker account health. This must
distinguish at least:

- Active
- Pending Sign Up
- Pending Verification
- Bonus Restricted
- Soft Limited / Stake Restricted
- Gubbed / Promotions Removed
- Blocked by KYC
- Blocked by Risk Team
- Closed
- Casino Only
- Sportsbook Only

Restriction state belongs to the profile account record, not the universal bookmaker catalogue.
The universal catalogue may store operator group, platform and risk-team links so Plum Duff can warn
that one restriction may imply higher risk on related brands. These warnings must never silently
block unrelated profile rows without showing the Fund Manager the reason.

Some restricted accounts may still be useful for non-promotional workflows such as extra places,
arbs or ordinary mug bets. Eligibility therefore depends on both account status and offer family:
Bonus Restricted may block reloads but not necessarily ordinary betting; Soft Limited may allow an
offer with a warning if the expected stake is low enough; Gubbed or Blocked accounts should be
blocked from promotional workflows by default.

## User goal

Choose a recognised recurring offer such as a synthetic weekly bet builder or loss-back promotion and prefill a new ledger draft, while still reviewing eligibility, prices, calculation inputs and placement manually.

## Preset ownership

- Fund Manager can create, edit, archive and order presets in Settings.
- A preset has a short name, ledger type, offer taxonomy, zero or more known bookmakers, fixture/bet defaults and one optional preferred strategy.
- No known bookmakers means the preset can be used with any eligible bookmaker. One known bookmaker may prefill after profile validation. Several known bookmakers must be presented as explicit choices; the platform must not silently choose one.
- Offer type, bet type and fixture type must use controlled authority values. Offer Name is optional free text and is not constrained to a lookup list.
- Controlled authorities are Fund Manager-owned and shared across profiles. Profile account
  availability remains isolated and is checked when a preset is applied.
- Campaign tag is optional free text and is never a preset authority or controlled list. A preset
  may supply an initial campaign tag, but applying it must not create a lookup authority.
- Presets are templates, not historical rows and not betting instructions.

## Application rules

1. Select a profile and ledger, or open the Fund Manager multi-profile opportunity workflow.
2. Show presets valid for that ledger and current profile or target set.
3. Check bookmaker/account eligibility and status.
4. If several known bookmakers remain eligible, require the Fund Manager to choose one before checking profile availability or saving.
5. Apply mapped descriptive fields to a new unsaved draft.
6. Leave profile-variable and market-variable values for review, especially stake, odds, exchange, commission, expiry and settlement date.
7. Run the normal contract-backed calculator after required inputs exist.
8. Require the normal explicit save and placement actions.

The preferred strategy is a starting value only. It must never remove strategies from the normal
ledger editor or prevent the Fund Manager changing the strategy after applying the combo. A
preferred `Multi Lay` strategy may create the draft, but complex placement remains in the full
profile sportsbook editor.

## Known bookmaker coverage

- Known bookmakers are universal associations maintained with the combo; they are not profile account states.
- The universal Settings picker must support search, selection and removal without pretending to know a profile's eligibility.
- When the combo is applied, Plum Duff compares those associations with the selected profile's accounts.
- Active and eligible accounts are available.
- Soft-limited or otherwise usable-with-warning accounts remain selectable with an explicit warning.
- Gubbed, blocked, closed, inactive, casino-only or promotion-ineligible accounts are blocked with a reason.
- A bookmaker not configured for the profile is shown as not signed up, not silently treated as unavailable or active.
- In the multi-profile Opportunity workflow, the setup view shows aggregate eligible-profile coverage and Stage 2 shows the exact status for each target profile.
- State must never be communicated by colour alone; visible text or an accessible explanation is required.

If all known bookmakers for a special offer are unavailable, show a clear blocked-state warning. Do not silently choose another bookmaker.

## Approved taxonomy baseline

- Offer types include `Profit Boost`, `Price Boost`, `Bonus Lock-In`, `Weekly Reload`, `Bet & Get`,
  `Cashback`, `Double Delight / Hat-trick Heaven`, `2UP / Early Payout`,
  `BOG / Best Odds Guaranteed`, `Each Way`, `Extra Places`, `Mug Bet`, and welcome/enhanced-price
  families.
- Legacy `Refund` maps to `Bonus Lock-In`; legacy `Reload` maps to `Weekly Reload` for new editing.
- Fixture types include the workbook values plus golf, motor racing, cricket, rugby, darts,
  snooker, boxing/MMA, greyhound racing, major US sports, politics, public events, virtual sports,
  and eSports.
- `Weekly Reload` describes recurrence; the selected underlying offer mechanic remains responsible
  for financial calculation routing.

## Seeded baseline templates

The initial catalogue supplies bookmaker-neutral templates for recurring workflows that already
have a safe descriptive route through the tracker: Bet & Get single, bet builder, in-play single
and accumulator; price and profit boosts; horse-racing cashback; DD/HH first goalscorer;
account-health mug bets; weekly reloads; welcome offers; enhanced prices; and bonus lock-in.

- Defaults never assert that a particular bookmaker runs an offer. The Fund Manager may add one or
  more evidenced bookmakers to a preset in Settings.
- Preset stake and minimum-odds values are starting defaults only and remain editable before save.
- `2UP / Early Payout`, `BOG / Best Odds Guaranteed`, `Each Way`, and `Extra Places` remain approved
  preset candidates, but must not be seeded as production-ready workflows until their calculation
  contracts, fixtures and UI branches have been implemented and approved.
- Public calculator families may inform taxonomy and test research, but do not override the workbook
  or become calculation authority without an approved Plum Duff calculation contract and fixtures.

## Safety and audit

- Applying a preset never saves, places or confirms a bet.
- A stale/deleted authority value blocks application until remapped.
- Record preset id/version on the draft for audit, but the created row owns copied values independently.
- Subscriber permissions are deferred to the subscriber-access contracts.

## Casino Offer application

- A Casino combo is a descriptive starting point for a new unsaved Casino Offer row.
- It may prefill offer type, free-text Offer Name, game/slot and the campaign quantities explicitly
  stored on the preset: cash stake, credit, bonus, wager multiplier, required spins, spin stake,
  free spins awarded and free-spin value.
- It must not prefill start, settlement or expiry dates, result, calculated P&L, final P&L or notes.
- Applying a Casino combo must run the normal offer-type branching first so fields irrelevant to
  the selected offer family remain cleared.
- Known bookmaker coverage is resolved for casino use. Active and Casino Only accounts are
  available; Bonus Restricted and limited accounts require a warning; Sportsbook Only, gubbed,
  blocked, inactive and unsigned accounts cannot be silently selected.
- Several eligible bookmakers require explicit selection. One eligible bookmaker may be selected
  automatically. No eligible bookmaker blocks application with a visible reason.
- Preset application never saves the Casino Offer and never claims a financial result.

## Tests and Playwright path

- valid sportsbook preset fills approved fields only
- inactive/gubbed/bonus-restricted bookmaker is excluded
- all known bookmakers unavailable warning
- several known bookmakers show explicit eligible choices without silently selecting one
- stale authority value blocks application
- profile-specific exchange and commission are not copied from the preset
- preset change does not rewrite existing rows
- direct sportsbook draft stores the source preset id/version only when the row is explicitly saved
- campaign tag remains free text and is not added to a shared list
- Offer Name remains free text and is not rejected because it is absent from a lookup authority
- preferred strategy defaults the draft but does not restrict the strategy selector
- preferred Multi Lay creates a draft and routes complex placement to the full editor
- universal known bookmakers resolve independently for each profile as available, warning, blocked or not signed up
- legacy taxonomy aliases load but save using the approved display value
- account lifecycle and restriction combinations produce the contracted eligibility result
- UI: selected profile -> add row -> choose quick action -> inspect prefill -> complete calculator -> save draft
- Casino UI: selected profile -> Casino Offers -> add row -> choose Casino combo -> verify
  profile bookmaker coverage and descriptive prefill -> complete dates/result -> explicitly save
