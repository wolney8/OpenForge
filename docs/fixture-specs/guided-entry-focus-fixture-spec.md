# Fixture Spec: Guided Entry Focus

_Last updated: 2026-07-14_

## Contract covered

- `docs/workflows/guided-entry-focus-workflow-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| GUIDE-001 | Empty sportsbook draft | Offer is next required field |
| GUIDE-002 | No-lay selected | Lay fields hidden and not required |
| GUIDE-003 | Multi-lay selected | Branch planner required; single lay field hidden |
| GUIDE-004 | Invalid save | First invalid field identified without colour alone |
| GUIDE-005 | User actively typing | Guidance does not move focus |
| GUIDE-006 | Offer/strategy contradiction | Review required; no guessed next step |
| GUIDE-007 | Reduced motion | No pulsing/glow animation |

