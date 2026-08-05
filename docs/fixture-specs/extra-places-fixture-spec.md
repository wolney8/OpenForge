# Fixture Spec: Extra Places

_Last updated: 2026-08-03_

## Contract covered

- `docs/contracts/extra-places-contract.md`
- `docs/contracts/sportsbook-extra-places-current-value-contract.md`

## Purpose

Define deterministic synthetic extra-places fixtures for workflow, settlement and cash-first current-value review.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| EP-001 | Pending extra-place row | conservative current value is minimum scenario |
| EP-002 | Win | final value uses win branch |
| EP-003 | Ordinary place | final value uses ordinary place branch |
| EP-004 | Extra-place finish | final value uses promotional extra-place branch |
| EP-005 | Unplaced | final value uses unplaced branch |
| EP-006 | Non-runner | review required until settlement semantics are confirmed |
| EP-007 | Rule 4 | applies explicit Rule 4 reduction |
| EP-008 | Dead heat | applies explicit dead-heat factor |
| EP-009 | Partial exchange matching | unresolved or partial state remains visible |
| EP-010 | Changed place terms | blocks final value until revised terms are approved |
| EP-011 | Unsupported branch | blocks value and raises manual review |

## Notes

- Extra Places is an approved planning extension, not workbook parity.
- Any production implementation must have exact numerical expectations before money values are visible.
