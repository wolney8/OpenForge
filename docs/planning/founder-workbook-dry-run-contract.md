# Founder Workbook Dry-Run Contract

Last updated: 2026-08-29

## Scope

The founder workbook dry run is a read-only analysis. It parses the supplied point-in-time XLSX,
maps rows in memory, validates current Plum Duff contracts, calculates deterministic source
identities, reconciles cached report values and writes review artifacts only beneath the ignored
`data/private/imports/founder/` directory. It never confirms an import or writes Profile data.

## Source ownership

- `Accounts` is the source for Profile-specific account state and balances. Provider identity and
  branding remain owned by the global Account Catalogue.
- `Dashboard` supplies supported Profile onboarding/settings values.
- `Reports` is reconciliation-only; cached report totals are not imported.
- `Sportsbook Bets`, `Free Bets`, `Casino Offers` and `Cash Adjustments` map through their current
  import payload contracts.
- Sportsbook rows with an Extra Place offer type are also assessed against the current Extra Place
  contract. Missing place terms, place boundaries, place-lay data or finishing position are not
  inferred.

## Provider resolution

Resolution is type-scoped and classified as `EXACT`, `ALIAS`, `NORMALIZED`, `AMBIGUOUS` or
`MISSING`. Only explicit global catalogue IDs can become Profile Account relationships. Ambiguous
or missing providers block cutover approval.

## Transformations

The dry run records, rather than hides, approved legacy normalizations. Current initial mappings
include legacy restricted/dormant account statuses and app-only channel terminology. Advanced lay
branches, over-length source text and incomplete rows remain partial until a lossless target rule is
approved.

## Idempotency

Each row key combines source sheet, stable source record ID (or source row fallback), and a
canonical field hash. Repeating the identical snapshot must classify every key as an existing
no-op; changed source data yields a changed key and requires review.

## Private artifacts

Each run writes schema discovery, field mapping, provider resolution, row validation, financial
reconciliation, Extra Place migration and import-readiness reports. These artifacts may contain
sensitive source values and must never be committed.
