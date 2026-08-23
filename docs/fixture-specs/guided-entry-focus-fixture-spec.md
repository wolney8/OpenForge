# Fixture Spec: Guided Entry Focus

_Last updated: 2026-08-23_

## Contract covered

- `docs/workflows/guided-entry-focus-workflow-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| GUIDE-001 | Empty sportsbook draft | Offer is next required field |
| GUIDE-002 | No-lay selected | Lay fields hidden and not required |
| GUIDE-003 | Multi-lay selected | Branch planner required; single lay field hidden |
| GUIDE-003B | Multi-lay outcomes complete but one branch unplaced | Branch placement group is next required |
| GUIDE-004 | Invalid save | First invalid field identified without colour alone |
| GUIDE-005 | User actively typing | Guidance does not move focus |
| GUIDE-006 | Offer/strategy contradiction | Review required; no guessed next step |
| GUIDE-007 | Reduced motion | No pulsing/glow animation |
| GUIDE-008 | Partial-lay strategy with missing actual lay | Actual lay stake is next required field |
| GUIDE-009 | Settled row without settlement date or with Pending outcome | Settlement group is next required field |
| GUIDE-009B | No-lay settled row without final outcome | Settlement group is next required field while lay fields remain hidden |
| GUIDE-011 | Standard single-lay row with setup and exchange complete | Lay odds is next required field |
| GUIDE-012 | Underlay row with setup, exchange and lay odds complete | Actual lay stake is next required field |
