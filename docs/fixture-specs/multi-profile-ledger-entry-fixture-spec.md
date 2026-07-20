# Fixture Spec: Multi-Profile Ledger Entry

_Last updated: 2026-07-19_

## Contract covered

- `docs/workflows/multi-profile-ledger-entry-workflow-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| MP-001 | Existing source plus two eligible targets with different odds | Source remains unchanged; two independent target rows and calculations |
| MP-002 | Target bookmaker inactive | Target blocked; source unaffected |
| MP-003 | Target bookmaker bonus restricted | Offer-dependent target blocked |
| MP-004 | Target exchange differs | Target exchange/commission used |
| MP-005 | User cancels second review | First remains created; second absent |
| MP-006 | Attempted one-click bulk confirmation while copying an existing saved row | Rejected by sequential-confirmation rule; opportunity-first placement remains separately available |
| MP-007 | Candidate selection launched from Fund Manager directory | Reporting selection and pin state ignored; target account eligibility controls the review list |
| MP-008 | Opportunity setup with two eligible profiles and one inactive bookmaker account | Two Prospecting rows created; blocked profile receives no row |
| MP-009 | Stage 2 back odds below optional minimum | Draft autosaves, but placement is blocked with a visible reason |
| MP-010 | Two valid standard rows selected for placement recording | Both rows become Placed; no external placement occurs |
| MP-011 | One valid row and one incomplete row selected | Valid row becomes Placed; incomplete row remains Prospecting with a reason |
| MP-012 | Complex strategy opened in a profile editor | Other target drafts remain saved and the opportunity remains resumable |
| MP-013 | Exchange default resolution | Profile setting wins, then most-used active exchange, then first active exchange |
| MP-014 | Delete an opportunity containing only unplaced rows | Draft rows and workflow container are physically deleted |
| MP-015 | Delete a mixed opportunity containing placed and unplaced rows | Placed rows remain; unplaced drafts are deleted; workflow container is archived |
| MP-016 | Mug Bet with two bookmakers for the same profile | Two isolated sportsbook targets are created, both defaulting to No Lay |
| MP-017 | Copy first placement row down to profiles with different commissions | Shared non-authoritative fields copy; lay stake clears; each target recalculates its own suggestion |
| MP-018 | Enter back odds 5.1 and lay odds 5 | Values persist and display as 5.10 and 5.00 |
| MP-019 | Three or more resumable opportunities exist | Two most recently updated batches show by default; expand reveals all without mutation |
| MP-020 | Change a Prospecting target bookmaker | Eligible active replacement updates target and linked sportsbook row; blocked replacement is rejected |
| MP-021 | Strategy and odds edits produce overlapping autosaves | Latest edit remains authoritative and its suggested lay stays visible |
| MP-022 | Copy-down source row is incomplete | Copy-down remains visible but disabled with a specific accessible reason |
| MP-023 | A lay strategy is selected while the stored exchange is blank | The profile's active resolved default exchange is persisted and the target-specific suggested lay becomes available |
| MP-024 | A suggested lay was accepted, then a calculation input changes | Accepted lay and stale projections clear immediately; a new suggestion appears only after the latest contract-backed calculation resolves |
| MP-025 | Master catalogue and profile account statuses differ | All catalogue bookmakers remain discoverable; Active is usable, Pending Sign Up and Limited are usable with warnings, and blocked, gubbed or unconfigured accounts are unavailable |
| MP-026 | Reset a Prospecting target after entering placement values | Row remains linked; entered values clear while opportunity defaults are restored |
| MP-027 | Remove and then re-add an unplaced opportunity target | Original sportsbook row is deleted; target leaves the placement table and can be restored as a new profile-scoped Prospecting row |

## Implementation evidence

- Pure eligibility rules: `apps/api/tests/test_multi_profile_entry_rules.py`
- Profile isolation, batch audit and sequential target submission: `apps/api/tests/test_multi_profile_sportsbook_entry.py`
- Fund Manager selection and review path: `tests/e2e/sportsbook-multi-profile-entry.spec.ts`
- Fund Manager opportunity-first path: `tests/e2e/sportsbook-opportunity-first.spec.ts`
- Opportunity creation, isolation and placement rules: `apps/api/tests/test_multi_profile_opportunities.py`
