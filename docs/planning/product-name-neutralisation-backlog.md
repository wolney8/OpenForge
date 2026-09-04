# Product-name Neutralisation Backlog

_Last updated: 2026-09-04_

## Scope boundary

New portability contracts, schemas, database objects, routes, and generated artefacts use
product-neutral names. Existing product-named package paths, environment variables, cookies,
database paths, and historical documentation remain unchanged until a dedicated compatibility
migration is approved.

## Parked register

| ID | Area | Future outcome | Status |
|---|---|---|---|
| NAMING-CLEANUP-001 | Existing `openforge_api` package and configuration names | Migrate with backward-compatible imports and deployment configuration | NOT STARTED |
| NAMING-CLEANUP-002 | Existing product-named cookies, paths, and generated artefacts | Inventory consumers and migrate without invalidating active sessions or backups | NOT STARTED |
| NAMING-CLEANUP-003 | Historical contracts and documentation | Retain historical meaning while making current maintained terminology neutral | NOT STARTED |

This work is outside the export/round-trip tranches and must not be performed opportunistically.
