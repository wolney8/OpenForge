# Data Handling

`data/` is for local-only operational data handling guidance and non-sensitive structure notes.

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
