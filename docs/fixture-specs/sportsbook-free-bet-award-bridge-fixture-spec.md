# Fixture Spec: Sportsbook to Free-Bet Award Bridge

_Last updated: 2026-07-23_

## Contract

- `docs/contracts/sportsbook-free-bet-award-bridge-contract.md`

## Purpose

Define deterministic synthetic cases for copying sportsbook award rows into
one or more linked free-bet rows.

## Fixture File

- `tests/fixtures/sportsbook-free-bet-award-bridge-fixtures.json`

## Required Cases

1. Single award
   - source sportsbook row advertises `GBP 5`;
   - creates one `GBP 5` free-bet row;
   - source remains `Placed` for settlement-timing awards.

2. Placement award
   - source sportsbook row advertises `GBP 5`;
   - creates one `GBP 5` free-bet row;
   - source becomes `Free Bet Awarded`.

3. Split award exact total
   - source sportsbook row advertises `GBP 5`;
   - creates `GBP 3` football bet-builder row and `GBP 2` horse-racing row;
   - both rows share the same `source_award_group_id`.

4. Under-allocation
   - source advertises `GBP 5`;
   - split total is `GBP 4`;
   - blocked without reason;
   - allowed with reason.

5. Over-allocation
   - source advertises `GBP 5`;
   - split total is `GBP 6`;
   - blocked without reason;
   - allowed with reason.

6. Duplicate award group
   - same source row and same award group submitted twice;
   - second submission is blocked.

7. Explicit second award group
   - same source row creates a second award group through `Copy another award`;
   - allowed only when the user explicitly starts a new award group.

8. Profile isolation
   - source row belongs to `profile-demo-001`;
   - target rows cannot be created under `profile-demo-002`.

## Synthetic Data Rules

- Use synthetic profile IDs only.
- Use placeholder bookmaker names only unless already synthetic in fixtures.
- Do not use live bookmaker account data.
- Use ISO timestamps.
- Money values are strings with two decimal places.

## Validation Expectations

- JSON parses.
- Case IDs are unique.
- Split totals are deterministic.
- Every created free-bet row has:
  - `source_sportsbook_bet_id`;
  - `source_award_group_id`;
  - `source_award_split_index`;
  - `source_award_split_total`.

## Playwright Expectations

- Modal displays one split row by default.
- `Add split free bet` adds a row without horizontal page overflow.
- Split row labels are accessible and context-specific.
- Footer action reflects target row count.
- Success toast confirms source row and created target count.
