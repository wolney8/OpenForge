# Data Handling

`data/` is for local-only operational data handling guidance and non-sensitive structure notes.

## Committed reference data

`data/reference/master-account-catalogue.json` is the Fund Manager-maintained, non-sensitive
authoring source for known bookmakers, exchanges, and banks. It may contain public brand metadata,
accessible display colours, platform/group/risk-team references, and verification notes, but never
profile account status, balances, credentials, personal data, or login details.

- The file is editable outside Plum Duff and is read on each API request, so a browser reload can
  see valid changes without restarting the API.
- The starter list is intentionally not described as exhaustive. Add or archive records as the
  Fund Manager's operating catalogue changes.
- `Bookmaker` source rows do not silently overwrite the linked database catalogue. A later Fund
  Manager Settings workflow must preview and explicitly synchronise changes.
- `Exchange` and `Bank` source rows may be used as universal account choices while profile account
  state remains isolated in the database.
- Availability uses ISO alpha-2 countries (`GB`, `IE`, `US`), optional ISO 3166-2 subdivisions
  (`US-NJ`), and explicit `web`, `mobile`, or `retail` channels. Empty arrays mean unknown and must
  not drive automatic recommendations.
- Edit `default_operating_context` to set the immediate Fund Manager-wide eligibility context.
  Leave it blank until deliberately chosen. Profile-specific overrides require separate approval.

Do not commit:

- raw workbook exports
- private account dumps
- local database files
- sensitive screenshots
- unapproved derived exports

Use subdirectories such as `data/raw/`, `data/private/`, and `data/exports/` for local-only work when needed. They are expected to stay ignored by Git.

Database handling direction:

- tracker runtime data will later require a local application database
- local database files must remain uncommitted
- periodic local backups should also remain outside committed repo state

Recommended local-only subdirectories when implementation begins:

- `data/private/db/`
- `data/private/backups/`

Longer-term architecture note:

- local database storage should be designed so the tracker can later migrate to a reliable managed online database without redesigning the domain model
