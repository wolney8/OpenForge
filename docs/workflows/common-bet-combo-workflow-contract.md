# Workflow Contract: Common Bet Combos

_Last updated: 2026-07-20_

## Status and scope

- Status: Implemented pending human smoke review
- Milestone: M13 Common Bet Combos and Quick Actions
- Profile scoped: Yes

## User goal

Choose a recognised recurring offer such as a synthetic weekly bet builder or loss-back promotion and prefill a new ledger draft, while still reviewing eligibility, prices, calculation inputs and placement manually.

## Preset ownership

- Fund Manager can create, edit, archive and order presets in Settings.
- A preset has a short name, ledger type, offer taxonomy, zero or more known bookmakers, fixture/bet defaults and allowed strategies.
- No known bookmakers means the preset can be used with any eligible bookmaker. One known bookmaker may prefill after profile validation. Several known bookmakers must be presented as explicit choices; the platform must not silently choose one.
- Presets must use controlled authority values where those lists exist.
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
- legacy taxonomy aliases load but save using the approved display value
- account lifecycle and restriction combinations produce the contracted eligibility result
- UI: selected profile -> add row -> choose quick action -> inspect prefill -> complete calculator -> save draft
