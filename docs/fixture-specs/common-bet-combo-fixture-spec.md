# Fixture Spec: Common Bet Combos

_Last updated: 2026-07-20_

## Contract covered

- `docs/workflows/common-bet-combo-workflow-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| COMBO-001 | Valid recurring sportsbook preset | Descriptive fields prefilled; no save/placement |
| COMBO-002 | Bookmaker unavailable on profile | Preset hidden or blocked |
| COMBO-003 | Every known bookmaker unavailable | Explicit profile warning |
| COMBO-004 | Stale controlled-list value | Mapping required before use |
| COMBO-005 | Preset edited later | Existing ledger row unchanged |
| COMBO-006 | Target profile has different exchange | Profile setting wins |
| COMBO-007 | Free-text campaign tag entered | Row stores text; no authority row is created |
| COMBO-008 | Legacy Refund preset loaded | Display/save mapping resolves to Bonus Lock-In |
| COMBO-009 | Legacy Reload preset loaded | Display/save mapping resolves to Weekly Reload |
| COMBO-010 | Active account with Soft Limited restriction | Usable with explicit warning |
| COMBO-011 | Active account with Bonus Restricted restriction | Promotional preset blocked; mug bet allowed |
| COMBO-012 | Casino Only account used for sportsbook | Blocked with capability explanation |
| COMBO-013 | Profile relationship changed | Other profile relationship unchanged |
| COMBO-014 | Archived universal authority | Historical row retained; new preset application blocked |
| COMBO-015 | Direct sportsbook draft applies a preset | Fields prefill without save; explicit save records preset id/version |
| COMBO-016 | Preset has several known bookmakers | Eligible bookmakers are shown for explicit selection; unavailable bookmakers are excluded; no bookmaker is silently selected |
| COMBO-017 | Default preset catalogue is seeded | Workbook-backed/currently routed templates exist; all are bookmaker-neutral and never save or place a row |
| COMBO-018 | Advanced offer family has a contract but no approved implementation | It remains a documented candidate and is not seeded as production-ready |
| PB-001 | Displayed boosted odds | Displayed odds drive sportsbook scenarios |
| PB-002 | 15% boost on odds 3.00, stake 10 | Reference boosted odds 3.3000; extra profit 3.00 |
| PB-003 | PB-002 capped at 2.00 | Reference boosted odds 3.2000; extra profit 2.00 |
| PB-004 | Accepted odds override calculated odds | Accepted odds drive P&L; reference retained |
| PB-005 | Placed percentage boost | Conservative current value uses effective boosted odds |
| PB-006 | Settled Profit Boost | Selected result branch becomes final value |
| PB-007 | Invalid or missing percentage inputs | Calculation incomplete; no money output |
| PB-008 | Manual override with reason | Override wins and remains auditable |
| PB-009 | Cross-profile record mismatch | Calculation rejected by profile isolation guard |
