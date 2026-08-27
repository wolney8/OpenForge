# Quick Add Loadout Favourites Plan

_Status: implemented; validation in progress._

## Purpose

Let the Fund Manager choose up to four frequently used Quick Add Loadouts per profile and ledger.
The visible ledger chips are a presentation preference over the existing Common Bet Combo authority;
they are not a second template store.

## Current Authority

- Global combo/loadout definition: `fund_manager_combo_presets`.
- Global Quick Add configuration: `quick_add_json`.
- Profile enable/hide, eligible-bookmaker and default overrides:
  `profile_quick_add_loadout_overrides`.
- Global editing: Fund Manager Settings > Common Bet Combos / Quick Add Loadouts.
- Profile configuration: Profile Settings > Quick Add Loadouts.

## Proposed Addition

Add `profile_quick_add_loadout_favourites`, keyed by `profile_id`, `preset_id`, and
`ledger_type`, with a one-based `favourite_order`.

This separate presentation table is necessary because one global template can support multiple
ledgers. Favouriting it for Casino must not also favourite it for Extra Place, Sportsbook, Free
Bets, or Cash Adjustments.

The profile settings row gains a favourite control and ordering action. A ledger control bar renders
only the first four enabled, eligible favourites for that profile and ledger, ordered by
`favourite_order`; an empty favourite set falls back to the existing global `sort_order` list.

## Rules

- A favourite is scoped to one profile and one supported ledger.
- A favourite must be enabled, unarchived, supported by the current ledger and profile-eligible.
- Blocked or gubbed account states remove the loadout from quick entry and show the reason in
  Settings; no silent substitute bookmaker is selected.
- Limited accounts may remain a favourite but show the existing warning when opened.
- The Fund Manager can still use all eligible loadouts from the normal add/loadout picker.
- Global template edits keep flowing to profiles; favourite/order never changes global data.
- A profile cannot receive another profile's favourite, default or bookmaker override.
- Existing row audit keeps its copied preset/version data after a loadout is unfavourited or archived.

## UI

- **Fund Manager Settings:** create, edit, archive and order the global templates, including their
  Quick Add mapping.
- **Profile Settings:** enable/hide, choose an eligible bookmaker/defaults, mark favourite and
  order favourites for the selected profile.
- **Ledger controls:** a maximum of four branded loadout chips above the table. The chips use the
  current profile account/bookmaker theme. `More loadouts` opens the existing picker.

## Required Contract and Test Changes

- Update `docs/workflows/common-bet-combo-workflow-contract.md` and
  `docs/workflows/ledger-quick-add-workflow-contract.md`.
- Add synthetic fixtures for global ordering, per-profile favourites, hidden/blocked favourites,
  archived history and fallback ordering.
- Add API tests for profile isolation and favourite ordering.
- Add Playwright coverage for Settings edits, maximum-four rendering, fallback behaviour and
  branded chip parity across Sportsbook, Free Bets, Casino, Cash Adjustments and Extra Place.

## Approval Boundary

Approved and implemented as a narrowly scoped schema/API extension. Remaining validation covers
the API, profile settings, and existing compact-entry consumers.
