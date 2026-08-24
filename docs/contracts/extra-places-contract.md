# Product Contract: Extra Places

_Last updated: 2026-08-24_

## Status

- Status: Superseded for the implemented dedicated ledger
- Human approval required before implementation: No
- Module: Each Way / Extra Places ledger
- Money-impacting: Yes
- Authoritative implementation contract: `docs/contracts/each-way-extra-place-ledger-contract.md`
- Workbook parity: Extension beyond the current workbook source pack

## Purpose

Extra Places supports each-way-style promotions where the bookmaker pays more places than the ordinary market. Plum Duff must track the offer terms, the win/place legs, exchange lays, scenario values and settlement branch without losing the workbook cash-first principle.

This retained document describes the earlier proposed sportsbook-row integration. New work must use
the dedicated Each Way / Extra Places contract and calculation engine; it must not fork this draft
or reintroduce another set of money rules.

## Scope

Included:

- ordinary place terms and promotional extra-place terms;
- win, ordinary place, extra-place-only and unplaced outcomes;
- non-runner, Rule 4, dead heat and changed place terms as explicit branches;
- partial exchange matching and manual override audit;
- sportsbook row integration and later standalone calculator workspace.

Excluded until later approval:

- live race-card scraping;
- automated bookmaker/exchange placement;
- automatic result scraping;
- each-way ARB recommendation engine.

## Required fields

| Field | Required | Notes |
|---|---:|---|
| `profile_id` | Yes | mandatory isolation key |
| `sportsbook_bet_id` | Yes | row linkage |
| `bookmaker` | Yes | from account authority |
| `event_name` | Yes | race/event |
| `each_way_stake_per_leg` | Yes | total stake is two legs |
| `back_odds_win` | Yes | bookmaker win odds |
| `place_terms` | Yes | numerator/denominator |
| `ordinary_place_count` | Yes | ordinary market places |
| `promotional_place_count` | Yes | must exceed ordinary count |
| `win_lay_odds` | Required unless no-lay | exchange win lay |
| `place_lay_odds` | Required unless no-lay | exchange place lay |
| `result` | Yes | explicit settlement branch |

## Result vocabulary

Initial approved vocabulary for fixture review:

- `Pending`
- `Win`
- `Ordinary Place`
- `Extra Place Hit`
- `Unplaced`
- `Non Runner`
- `Void`
- `Dead Heat`
- `Rule 4 Adjustment`
- `Changed Place Terms`
- `Manual Review`

## Cash-first rule

- Pending/open rows must show the conservative current value across all supported scenarios.
- Settled rows must show the result-resolved final value.
- Current value and final value remain visually and semantically separate.
- Missing terms, unsupported settlement branches or unresolved matching must show review-required rather than guessed P&L.

## Scenario handling

- `Win`: bookmaker win and place returns, less exchange liabilities.
- `Ordinary Place`: bookmaker place return only, with win lay return and place lay liability.
- `Extra Place Hit`: bookmaker promotional place return only, with win lay return and place lay liability.
- `Unplaced`: bookmaker stake lost, exchange win/place lay returns.
- `Non Runner` / `Void`: default draft is stake returned and P&L `0.00`, but must remain review-required until bookmaker-specific settlement is confirmed.
- `Rule 4 Adjustment`: apply approved reduction before money output.
- `Dead Heat`: apply approved dead-heat factor before money output.
- `Changed Place Terms`: block final value until terms are confirmed.

## UI requirements

- Extra-place entry must use a calculator-style grid, not a wall of generic fields.
- Ordinary terms and promotional terms must be visible together.
- Result cards must show the named branch and P&L.
- Settlement modal must make extra-place-only distinct from ordinary place.
- The calculator workspace can create a sportsbook row only after required offer identity and profile/account validation are satisfied.

## Tests required

- win;
- ordinary place;
- extra-place-only finish;
- unplaced;
- non-runner/void review case;
- Rule 4;
- dead heat;
- partial exchange matching;
- changed place terms;
- unsupported scenario blocked;
- profile isolation.

## Account capability interaction

Extra Places must also be represented as an Account Health Intelligence capability.

Allowed capability states include:

- `Working`
- `WorkingWithLimits`
- `Unavailable`
- `NotChecked`
- `InsufficientTooling`

`InsufficientTooling` is the correct state when the Fund Manager can see that Extra Places may be relevant but Plum Duff does not yet have an approved matcher, catcher or calculator to assess whether the account is profitable for that route.

Do not infer Extra Places capability from ordinary horse-racing access, enhanced-place visibility or account-level `Active` state. Once an actual Extra Places sportsbook row is placed and settled, the row may update capability evidence, but realised P&L remains sourced from the sportsbook ledger.
