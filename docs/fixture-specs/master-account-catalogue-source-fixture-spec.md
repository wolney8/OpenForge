# Fixture Spec: Master Account Catalogue Source

Last updated: 2026-07-16

## Contract Covered

- `docs/contracts/master-account-catalogue-source-contract.md`

## Cases

| ID | Scenario | Expected Result |
|---|---|---|
| MAC-001 | Valid Exchange and Bank records | Source loads and records retain controlled types |
| MAC-002 | Duplicate catalogue id | Entire source is rejected |
| MAC-003 | Duplicate brand within one type | Entire source is rejected |
| MAC-004 | Same brand across different types | Allowed when ids remain unique |
| MAC-005 | Invalid or low-contrast colour pair | Entire source is rejected |
| MAC-006 | Missing source file | Explicit not-found response; no runtime mutation |
| MAC-007 | Profile account state supplied in source | Schema rejects unsupported sensitive/operational fields once strict-extra validation is enabled |
| MAC-008 | Archived authority | Retained for history but excluded from new-account choices |
| MAC-009 | GB mobile-only provider vs web-only profile | Provider is not eligible |
| MAC-010 | US provider restricted to US-NJ | Requires matching profile subdivision |
| MAC-011 | Unknown jurisdiction/channel lists | Provider is excluded from automatic recommendations |
| MAC-012 | Verified record without evidence | Source is rejected |
| MAC-013 | Fund Manager adds a valid synthetic record | Record is persisted and previous source is backed up |
| MAC-014 | Fund Manager edits or archives an existing record | Stable id is retained, source is replaced atomically, and backup is created |
| MAC-015 | Fund Manager adds a duplicate id or same-type brand | Request is blocked and source is not mutated |
| MAC-016 | Edit payload attempts to change the stable catalogue id | Request is blocked and source is not mutated |

Executable synthetic cases live in
`tests/fixtures/master-account-catalogue-source-fixtures.json`. No real profile account data is
permitted.
