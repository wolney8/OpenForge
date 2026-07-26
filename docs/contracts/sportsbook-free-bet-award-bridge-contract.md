# Contract: Sportsbook to Free-Bet Award Bridge

_Last updated: 2026-07-23_

## Status

Planning baseline. Human approval required before implementation.

## Purpose

Define how a sportsbook qualifying row creates one or more linked free-bet rows
without losing profile isolation, source traceability, or reporting clarity.

This contract covers ordinary single-award copies and split awards such as:

- `Bet 10 Get 5` as one `GBP 5` free bet;
- `Bet 10 Get 5` as `GBP 3` football bet-builder free bet plus `GBP 2` horse-racing free bet;
- award totals that intentionally differ from the advertised value with an explicit reason.

## Workflow Context

- Source ledger: `sportsbook_bets`
- Target ledger: `free_bets`
- User: Fund Manager
- Route entry points:
  - sportsbook table row action: `Copy to Free Bets`
  - sportsbook editor action: `Create Free Bet`
- Profile context: mandatory. Source and target rows must share the same `profile_id`.

## Spreadsheet Equivalent

The workbook workflow expects the user to copy or re-enter qualifying-bet details
from `Sportsbook Bets` into `Free Bets` when an offer awards a free bet.

The workbook does not safely model split awards as a first-class object. Plum Duff
must improve this by keeping every generated free-bet row linked back to the same
source sportsbook award event.

## Source of Truth

- Existing sportsbook bridge workflow and Playwright coverage:
  - `tests/e2e/sportsbook-free-bet-bridge.spec.ts`
- Free-bet lifecycle contract:
  - `docs/workflows/free-bet-workflow-contract.md`
- Sportsbook lifecycle contract:
  - `docs/workflows/sportsbook-bet-workflow-contract.md`
- Free-bet current value contract:
  - `docs/contracts/free-bet-current-value-contract.md`

## Data Contract

### Source sportsbook row

Required fields:

- `profile_id`
- `sportsbook_bet_id`
- `bookmaker`
- `offer_type`
- `offer_text`
- `offer_name`
- `bet_type`
- `fixture_type`
- `event_name`
- `date_settled`
- `status`

Award-capable source statuses:

- `Placed`
- `Settled`
- `Free Bet Awarded`

Award timing:

- `placement`: source may be promoted to `Free Bet Awarded` immediately after target rows are created.
- `settlement`: source remains unchanged until settlement confirms award eligibility.

### Target free-bet rows

Each created target row must include:

- `profile_id`
- `source_sportsbook_bet_id`
- `source_award_group_id`
- `source_award_split_index`
- `source_award_split_total`
- `bookmaker`
- `offer_type`
- `offer_text`
- `offer_name`
- `bet_type`
- `fixture_type`
- `event_name`
- `free_bet_value`
- `retention_mode`
- `expiry`
- `status`

`source_award_group_id` must be stable for every target row created from the
same copy action. It must not be reused for unrelated copy actions.

## UI Behaviour

The bridge modal defaults to one target free-bet row.

The Fund Manager can select `Add split free bet` to add more target rows.

Each split row must show:

- value;
- bet type;
- fixture type;
- campaign tag / offer name;
- expiry;
- retention mode;
- optional restriction note.

Footer action wording must reflect the number of rows:

- one split row: `Create Free Bet`
- multiple split rows: `Create 2 Free Bets`, `Create 3 Free Bets`, etc.

After creation, the success toast must identify the source row and number of
free-bet rows created.

## Validation Rules

- Split values must be valid money values at two decimal places.
- Split values must be positive.
- Split total must be displayed before creation.
- If expected award value is known and split total equals it, the modal may create rows without extra warning.
- If split total is lower than expected award value, allow only with an under-allocation reason.
- If split total is higher than expected award value, warn and require an over-allocation reason.
- The Fund Manager may still proceed with a reason because real bookmaker awards can differ from advertised copy.
- Duplicate creation from the same source row and same `source_award_group_id` must be blocked.
- Creating a second award group from the same source row is allowed only through an explicit `Copy another award` action.

## Reporting Rules

- Free-bet rows drive free-bet P&L independently after creation.
- Source sportsbook P&L must not include the future value of the generated free bets unless a separate sportsbook contract explicitly says so.
- Reports may group free-bet rows by `source_award_group_id` for audit.
- The source sportsbook row should show `Free Bet Awarded` only when:
  - award timing is `placement`, or
  - settlement confirms the award, or
  - the Fund Manager explicitly marks the award complete.
- Split-award rows must not be double counted in sportsbook P&L.

## Audit Trail

Record:

- actor;
- timestamp;
- source sportsbook row id;
- target free-bet row ids;
- split values;
- expected award value if supplied;
- split-total variance;
- variance reason when required;
- award timing;
- source row status before and after copy.

## Tests Required

Unit / API:

- single `GBP 5` award creates one linked free-bet row;
- split `GBP 3 + GBP 2` award creates two linked rows with one shared award group;
- under-allocation requires reason;
- over-allocation requires reason;
- duplicate copy using the same award group is blocked;
- second explicit award group from the same source row is allowed;
- profile mismatch is blocked;
- source sportsbook row is promoted only when award timing rules allow it.

Playwright:

- bridge modal defaults to one row;
- `Add split free bet` creates another editable split row;
- footer action changes to `Create 2 Free Bets`;
- split rows persist to the free-bet ledger;
- source sportsbook row shows the correct award state;
- linked free-bet rows show source context for audit.

## Acceptance Criteria

- No user-visible financial value changes without fixture coverage.
- Existing one-row bridge behaviour remains valid.
- Split-award creation is explicit and auditable.
- Profile isolation is enforced.
- Split values are visible before row creation.
- Variance from expected award value is never silent.
