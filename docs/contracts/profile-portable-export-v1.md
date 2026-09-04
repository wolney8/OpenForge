# Profile portable export v1

Last updated: 2026-09-04

## Status

Approved for read-only export. Restore, working-workbook generation, and workbook merge/update
remain outside this contract.

## Purpose

`profile-portable-export-v1` is a product-neutral XLSX snapshot of one selected Profile's
authoritative operational state. It is intended for backup, portability, and a future restore into
a fresh Profile.

## Workbook structure

The workbook contains `Manifest` and `Sheet Manifest` verification sheets followed by these
stable payload sheets, including empty sheets where a supported domain has no rows:

- `Profile`
- `Tracker Settings`
- `Onboarding`
- `Display Settings`
- `Exchange Commissions`
- `Accounts`
- `Balance Snapshots`
- `Sportsbook`
- `Free Bets`
- `Casino`
- `Extra Places`
- `Cash Adjustments`
- `Fee Periods`
- `Fee Revisions`
- `Fee Corrections`
- `Fee Withdrawals`
- `Profile Lookups`
- `Quick Actions`
- `Loadout Overrides`
- `Loadout Favourites`
- `Opportunity Links`
- `Source Identities`
- `Workbook Lineage`
- `Review Decisions`
- `Reconciliation`

Payload columns use stable product-neutral field names. Authoritative sheets contain values only;
they contain no formulas.

## Logical serialization

- Decimal fields are validated and stored as exact fixed-point text without float conversion or
  rounding.
- Timestamp fields are ISO-8601 UTC text ending in `Z`. Date-only fields remain ISO dates.
- JSON fields are parsed and re-serialized as compact canonical JSON with sorted object keys.
- Boolean fields are the text `true` or `false`.
- SQL `NULL` and an empty string both render as blank cells, but each payload row carries a
  `null_fields_json` list. A field named in that list is null; a blank field not in the list is an
  intentional empty string. Numeric zero remains explicit decimal or integer text.
- Rows are ordered by their stable primary identity (or stable composite identity).
- Existing Profile and source record IDs are the portable identities. Internal checkpoints,
  execution attempts, rollback events, and transient write audits are not portable business state.

## References to global authorities

Global catalogue records, presets, and opportunities are never exported as Profile-owned rows.
Profile rows retain their stable reference IDs. Where a referenced global record is available, the
export adds its schema/version and a SHA-256 fingerprint so a future restore can verify or raise a
review item without overwriting global authority.

## Integrity

Each payload sheet has a SHA-256 logical checksum over its sheet name, ordered columns, and
canonical ordered rows. `Sheet Manifest` records every payload sheet's row count, column count,
authority role, and checksum.

The aggregate logical checksum is SHA-256 over the ordered Sheet Manifest payload. It excludes the
export timestamp and XLSX packaging, so repeated exports of unchanged Profile state have the same
logical checksum. The byte-level SHA-256 checksum covers the completed XLSX file and is returned in
the download response headers; it is not embedded into the file it hashes.

## Safety and authority

- Export requires an authenticated Fund Manager session.
- The route accepts one Profile ID and every Profile-owned query is filtered by that ID.
- Export performs only read queries and filesystem reads of the configured catalogue document.
- No ImportRun, checkpoint, audit row, balance, or workflow state is created or changed.
- Credentials, sessions, database configuration, raw workbook bytes, unrelated Profiles, and
  private global-authority content are excluded.
