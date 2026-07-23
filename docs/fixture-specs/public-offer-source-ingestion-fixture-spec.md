# Fixture Spec: Public Offer Source Ingestion

_Last updated: 2026-07-22_

## Contract covered

- `docs/contracts/public-offer-source-ingestion-contract.md`

## Fixture rules

Fixtures must use synthetic offer data only. They must not contain real account data, credentials,
cookies, session tokens, screenshots, raw HTML, or raw workbook exports.

Synthetic source names should use placeholders such as `Public Reload Source A`, `Bookmaker A`,
`Demo Welcome Offer`, and `DEMO-OFFER-001`.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| POSI-001 | Source record is approved for manual collection only | Automated ingestion is blocked; manual catalogue entry remains allowed |
| POSI-002 | Source record has explicit automated approval | Ingestion job may run using the stated rate-limit and field policy |
| POSI-003 | Source terms/robots review is missing | Source cannot be collected automatically |
| POSI-004 | Logged-in/session source is proposed | Source is rejected; no credential or cookie storage path exists |
| POSI-005 | Welcome offer contains bookmaker, title, minimum stake and evidence | Draft intelligence record is stored with supported fields and `Verified` confidence |
| POSI-006 | Offer has unsupported minimum odds | Field remains `To confirm`; no inferred value is saved |
| POSI-007 | Bookmaker name cannot map to the master account catalogue | Offer remains unmapped and cannot create profile rows automatically |
| POSI-008 | Offer evidence is stale | Offer is visible but blocked from new draft application until reverified |
| POSI-009 | Daily offer stale-after period passes | Offer enters recheck-required state after one day |
| POSI-010 | Weekly reload stale-after period passes | Offer enters recheck-required state after seven days |
| POSI-011 | Welcome offer stale-after period passes | Offer enters recheck-required state after thirty days |
| POSI-012 | Profile has Active matching bookmaker account | Offer can create a Prospecting draft for that profile |
| POSI-013 | Profile is not signed up to bookmaker | Offer shows not-signed-up state and does not silently create a row |
| POSI-014 | Profile account is Bonus Restricted | Reload/welcome promotional offer is blocked with visible reason |
| POSI-015 | Profile account is Soft Limited | Offer remains selectable only with stake-risk warning |
| POSI-016 | Profile account is Gubbed / Promotions Removed | Promotional offer is blocked by default |
| POSI-017 | Related brand shares risk team with gubbed account | Offer shows linked-risk warning but is not silently blocked |
| POSI-018 | Casino-only account receives sportsbook offer | Application is blocked with capability reason |
| POSI-019 | Sportsbook-only account receives casino free-to-play offer | Application is blocked with capability reason |
| POSI-020 | Advanced offer family lacks calculation contract | Descriptive draft is allowed; specialist financial output is suppressed |
| POSI-021 | Offer applied to Common Bet Combo | Preset stores source evidence and creates no placed ledger row |
| POSI-022 | Offer applied to multi-profile Opportunity workflow | Only eligible profiles get Prospecting draft rows; warnings and blocks are visible |
| POSI-023 | Fund Manager manually overrides stale offer | Override note and reviewer are required before application |
| POSI-024 | Raw HTML or screenshot is submitted as evidence | Rejected unless a future redacted evidence policy explicitly allows it |
| POSI-025 | Source record contains real credentials or cookies | Fixture and validation fail immediately |

## Acceptance

- Source ingestion creates draft intelligence only.
- No fixture claims profitability or final ledger value.
- No fixture bypasses the normal profile account eligibility and calculation-contract gates.
- Profile-owned account restrictions remain separate from universal source intelligence.
