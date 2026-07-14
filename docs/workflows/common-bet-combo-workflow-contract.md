# Workflow Contract: Common Bet Combos

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for human review
- Milestone: M13 Common Bet Combos and Quick Actions
- Profile scoped: Yes

## User goal

Choose a recognised recurring offer such as a synthetic weekly bet builder or loss-back promotion and prefill a new ledger draft, while still reviewing eligibility, prices, calculation inputs and placement manually.

## Preset ownership

- Fund Manager can create, edit, archive and order presets in Settings.
- A preset has a short name, ledger type, offer taxonomy, optional bookmaker/platform, fixture/bet defaults and allowed strategies.
- Presets must use controlled authority values where those lists exist.
- Presets are templates, not historical rows and not betting instructions.

## Application rules

1. Select a profile and ledger.
2. Show presets valid for that ledger and current profile.
3. Check bookmaker/account eligibility and status.
4. Apply mapped descriptive fields to a new unsaved draft.
5. Leave profile-variable and market-variable values for review, especially stake, odds, exchange, commission, expiry and settlement date.
6. Run the normal contract-backed calculator after required inputs exist.
7. Require the normal explicit save and placement actions.

If all known bookmakers for a special offer are unavailable, show a clear blocked-state warning. Do not silently choose another bookmaker.

## Safety and audit

- Applying a preset never saves, places or confirms a bet.
- A stale/deleted authority value blocks application until remapped.
- Record preset id/version on the draft for audit, but the created row owns copied values independently.
- Subscriber permissions are deferred to the subscriber-access contracts.

## Tests and Playwright path

- valid sportsbook preset fills approved fields only
- inactive/gubbed/bonus-restricted bookmaker is excluded
- all known bookmakers unavailable warning
- stale authority value blocks application
- profile-specific exchange and commission are not copied from the preset
- preset change does not rewrite existing rows
- UI: selected profile -> add row -> choose quick action -> inspect prefill -> complete calculator -> save draft

