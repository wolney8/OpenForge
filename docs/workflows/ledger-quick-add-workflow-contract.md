# Workflow Contract: Template-Driven Ledger Quick Add

_Last updated: 2026-08-23_

## Purpose

Provide a fast, controlled way to create common tracker rows without creating a second ledger
model or bypassing the normal add/edit workflow.

## Initial supported template

### Casino: Free Spins

- Route: `/profiles/:profileId/tracker/casino-offers`
- Entry: `Quick add` beside `Add Row`.
- The compact dialog records a no-deposit free-spins result.
- Required inputs: bookmaker, number of spins, spin stake and converted win amount.
- Optional inputs: offer name and game/slot.
- Defaults: `Free Spins`, current date/time, `0.10` spin stake, `0.00` own cash committed,
  `Settled` status and `Win` result.
- The converted win amount is copied to `free_spins_value` and the explicit `final_net_pnl`.
  It is therefore the confirmed net result for this zero-own-cash template, not a calculated EV.
- A `£ 0.00` shortcut records no converted return and changes the result to `Lose`.
- Save creates one Casino row and returns to the ledger. `More details` opens the normal Casino
  editor with the same unsaved values; it does not save a row.

## Guardrails

- The bookmaker list is profile-scoped and uses existing account authorities.
- Quick Add must not create a bookmaker account, place a bet, infer an RTP, infer a fee or
  calculate a wagering result.
- This template is not for deposit, bonus, wagering, cashback or refund offers. Those stay in
  the normal offer-type workflow until their calculator contract permits a template.
- The normal Casino editor remains the authoritative detailed workflow and persistence path.
- Numeric currency inputs use two-decimal validation and existing Plum Duff financial display.

## Template authority

Fund Manager-created reusable quick-add templates are represented by the existing Common Bet Combo
authority. A `quick_add` configuration enables a combo for one or more compact ledger flows and
stores its label, ordering, compact fields and defaults. A later `Save as Quick Add` action from a
detailed editor must write a Common Bet Combo, not an unrelated template store.

- Global templates are Fund Manager-owned.
- Profiles inherit global templates but may hide one, select a profile-eligible bookmaker, or
  override explicitly permitted compact defaults.
- A global edit flows to every profile except overridden fields. Profile edits never rewrite the
  global template.
- The compact modal only displays loadouts valid for the profile's account lifecycle/restrictions.
  A limited account is selectable with a warning; blocked, gubbed, closed or
  promotion-ineligible accounts are disabled with an explanation.
- Archived loadouts remain available for historical audit only and cannot create a new row.

## States

- Disabled: no eligible profile bookmaker or a required field is blank/invalid.
- Loading: the save action is disabled and shows its existing saving indicator.
- Success: the compact dialog closes and the ledger refreshes with the new row.
- Error: preserve entered values and show the API validation error in the compact dialog.

## Financial boundary

`final_net_pnl` remains the authoritative confirmed Net Result under
`docs/contracts/casino-offer-resolved-value-contract.md`. This quick path writes only an explicit
user-entered result; it does not introduce a new casino calculation.

## Tests

- no-deposit Free Spins prefill maps converted win to `free_spins_value` and `final_net_pnl`;
- zero shortcut maps to a settled loss with `0.00` final value;
- profile account options are used for bookmaker selection;
- More details does not persist;
- save refreshes the ledger and uses no page-level overflow.
