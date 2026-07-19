# Calculation Contract: Casino Offer Resolved Value

_Last updated: 2026-07-16_

## Status and scope

- Application: Plum Duff
- Source sheet: `Casino Offers`
- Status: Approved parity boundary for import, display and reporting
- Deferred: complete per-offer casino calculator formulas

## Purpose

Resolve the value used by the casino ledger and reports without claiming formula coverage that the
workbook deconstruction has not established.

## Spreadsheet equivalent

`NetPnL = IF(FinalNetPnL <> "", FinalNetPnL, CalcNetPnL)`

## Inputs

- `profile_id`
- `casino_offer_id`
- `status`
- `date_started`
- `date_settling`
- `expiry_datetime`
- `calc_net_pnl`: workbook/application current reference value
- `final_net_pnl`: explicit final override

## Outputs

- `resolved_net_pnl`
- `calculation_state`
- `counts_as_open`
- `is_overdue`
- `week_label`
- calculation notes

## Formula and authority

1. Parse explicit decimal values without silent coercion.
2. If `final_net_pnl` is present, it is the resolved value.
3. Otherwise use `calc_net_pnl` as the transitional current/reference value.
4. Quantise the resolved output to `0.01` using round-half-up.
5. A prospecting row with neither value resolves to `0.00` as a placeholder, not realised profit.
6. Any other row with neither value remains incomplete.

`calc_net_pnl` is not evidence that all casino mechanics have been independently recalculated by
Plum Duff. Complete wager, free-spin and game-specific calculations require later contracts and
fixtures before replacing this transitional reference input.

## Operational helpers

- Open statuses: `Prospecting`, `Started`, `In Progress`.
- Overdue: open and `expiry_datetime` is before the review time.
- Week label uses `date_settling`, falling back to `date_started`.

## Rounding and tolerance

- Output precision: `0.01`.
- Rounding: `ROUND_HALF_UP`.
- Acceptance tolerance: exact at two decimal places.

## Required fixtures

- prospecting blank-value placeholder
- current/reference value only
- final override wins
- open expired row
- settled row not open
- profile-isolation filtering
- accepted workflow expansion cases in
  `tests/fixtures/casino-offer-workflow-expansion-fixtures.json`

## UI requirements

- Label `calc_net_pnl` as reference net value, not guaranteed profit.
- Label `final_net_pnl` as `Net Result (Profit/Loss)` so zero and negative
  settled results are explicit and are not confused with gross winnings.
- Show incomplete state when an active/non-placeholder row has no usable value.
- Do not imply a deeper casino calculator has run unless a later calculation contract supports it.

## Human approval

Approved for workbook-parity value resolution and import/export only. Deeper casino-offer formula
automation remains gated.

## Approved casino workflow expansion boundary

A later schema revision may add operational planning fields, but it must preserve
`final_net_pnl` as the authoritative confirmed **Net Result (Profit/Loss)** used by
reports and fee calculations.

`Cash Returned` is optional audit/reference information: the withdrawable cash
remaining or returned from the campaign. It is not interchangeable with Net Result.
For example, spending `5.00` and returning `4.90` means Cash Returned is `4.90` and
Net Result is `-0.10`.

Plum Duff must not silently derive the authoritative Net Result. Where complete cash
spent and returned inputs exist, the UI may show a non-authoritative suggestion for
Fund Manager confirmation.

The approved expansion may add:

- optional withdrawable cash returned;
- own cash committed to the campaign, excluding repeated turnover of the same funds;
- bonus or credit awarded;
- spin stake and required spin count;
- wager target and wager multiplier;
- game RTP as an optional reference input with source/audit metadata;
- derived qualification spins (`wager target / spin stake`) with explicit rounding rules.

Qualification requirements are composable because one campaign may require more
than one step:

- Opt In / Claim
- Deposit
- Wager Cash
- Wager Bonus
- Complete Spins or Hands
- Lose / Net Loss Trigger
- No Qualification
- Other / Custom

Reward types:

- Cash
- Withdrawable Cashback
- Bonus Credit
- Cashback as Bonus Credit
- Free Spins
- Free Play / Token
- Loyalty Points
- Prize or Draw Entry
- No Reward
- Other / Custom

Initial editable presets:

- Wager and Get Free Spins
- Wager and Get Bonus
- Deposit Match
- Deposit and Get
- Lossback / Risk Free
- Net Loss Cashback
- Free Spins
- Free Play
- Reload Bonus
- Loyalty / VIP Reward
- No Offer / Mug Play
- Custom

Approved lifecycle statuses are `Prospecting`, `Qualifying`, `Awaiting Reward`,
`Playing Reward`, `Settled`, `Expired`, `Cancelled` and `Error`. Approved result
values are `Pending`, `Profit`, `Loss`, `Break-even` and `Void`.

Open rows use **Expected Completion**; settled rows use **Completed At**; campaign
or reward deadlines use **Expiry**.

`required_spins = CEILING(wager_target / spin_stake)` for one fixed spin stake in
MVP. Multiple stake segments remain deferred.

Games are master-catalogue entities. RTP and availability attach to the combination
of game, provider, bookmaker and jurisdiction because operator variants may differ.
Each RTP entry requires source, verification date and confidence metadata.

RTP must not be used to promise or silently calculate realised winnings. Slot/game outcomes remain
actual user-entered results.

Missing optional Cash Returned, spin-planning or RTP data must not block monthly fee
review. A settled Casino row blocks fee review only when its completion date or
confirmed Net Result is unresolved.
