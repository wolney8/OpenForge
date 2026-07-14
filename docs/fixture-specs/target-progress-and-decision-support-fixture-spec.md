# Fixture Spec: Target Progress and Decision Support

_Last updated: 2026-07-14_

## Contracts covered

- `docs/contracts/target-progress-calculation-contract.md`
- `docs/workflows/offer-decision-support-workflow-contract.md`

The fixtures verify deterministic target progress and safety gates. They do not encode an unapproved strategy recommendation scoring model.

| ID | Scenario | Expected result |
|---|---|---|
| TARGET-001 | Half period, ahead of pace | Progress and `ahead` status |
| TARGET-002 | Half period within tolerance | `on_track` |
| TARGET-003 | Late period below pace | `behind` |
| TARGET-004 | Target reached | `complete` |
| TARGET-005 | Invalid zero target | Calculation blocked |
| TARGET-006 | Current-value vs settled basis | Outputs remain separately labelled |
| TARGET-007 | Recommendation lacks approved scoring model | `human_review_required` |
| TARGET-008 | Exposure limit breached | `avoid_or_defer` safety state |
| TARGET-009 | AI evidence missing | Deterministic progress works; AI-dependent evidence omitted |

