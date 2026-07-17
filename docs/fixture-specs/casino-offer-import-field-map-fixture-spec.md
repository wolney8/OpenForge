# Fixture Spec: Casino Offer Import Field Map

_Last updated: 2026-07-16_

| ID | Scenario | Expected result |
|---|---|---|
| CI-001 | Valid in-progress wager offer | Entered/reference fields map; helpers excluded |
| CI-002 | Prospecting free-spin offer with blank current value | Compatible placeholder row |
| CI-003 | Unknown status/result | Blocked by controlled payload validation |
| CI-004 | Cross-profile source identity | Blocked |
| CI-005 | Confirm, export and unchanged re-import | Backup, lineage and no-op round trip |
| CI-006 | Blank settling date | Preserved API fallback to start date on confirmation |

Fixtures must be synthetic. They must not claim independent validation of deferred casino formulas.

