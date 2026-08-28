# Global Search Results Workspace

_Recorded 2026-08-28. Implementation is deferred until the pre-auth hardening gate is signed off._

## Boundary

Extend the current authorized shell search into an actionable `/search` workspace without adding a
second search datastore. The first implementation should federate existing Profile, global
provider, Profile Account, ledger and reporting queries. PostgreSQL-backed query adapters may
replace local sources later without changing the result contract.

## Contract direction

- Search only data authorized for the current server-validated identity.
- Support current Profile, selected Profile and all-authorized Profile scopes.
- Group providers, Profiles, accounts, Sportsbook, Free Bet, Extra Place, Casino, Cash Adjustment
  and report results where existing schemas expose searchable fields.
- Reuse canonical Search, filters, chips, provider branding, stat cards, date controls, tables,
  pagination and action links.
- Results should open a row/Profile/report or deep-link to a deterministic filtered ledger.
- Aggregates such as balance, exposure, P&L and fees must come from existing contracted reporting
  calculations. Unsupported totals remain unavailable rather than inferred.
- Keep founder-scale queries simple. Do not introduce Elasticsearch, Algolia or another external
  index without measured need.

## Tracked slices

- `PD-FR-012A`: searchable domain inventory and field contract.
- `PD-FR-012B`: federated authorized search service/API.
- `PD-FR-012C`: Search Results workspace and actions.
- `PD-FR-012D`: cross-Profile scoping.
- `PD-FR-012E`: contracted report/aggregate integration.

## Dependencies

Pre-auth hardening must be signed off first. Neon may improve query durability/performance, but the
search contract must not depend on a new duplicate index. Future Subscriber access requires
Profile grants and row-level authorization before subscriber-scoped search is enabled.
