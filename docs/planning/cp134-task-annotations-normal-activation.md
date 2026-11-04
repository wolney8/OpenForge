# CP-134 normal task-annotation activation request

Status: **approval required**. The implementation in `apps/api/src/openforge_api/task_annotations.py` is mounted only when `OPENFORGE_TASK_ANNOTATIONS_ISOLATED_ENABLED=true`, and every request requires a runtime classified as isolated candidate/test. The normal API and normal-owner database are unchanged.

## Exact proposed authority

- Add the SQLite `task_annotations` table and index defined by `SCHEMA` in `task_annotations.py` to the normal-owner database through a reviewed, backed-up migration. Primary key: authenticated viewer email, exact owning Profile ID and source occurrence key. Fields: source key, title snapshot, tracked flag, `To Do | In Progress | Blocked | Do Later`, optional blocked reason/review date, version and UTC update time. The Profile foreign key deletes annotations only when that Profile itself is deleted under its existing authority.
- Mount `GET /fund-manager/tasks/annotations` and `PATCH /fund-manager/tasks/annotations` on normal API 8010 only after migration approval. GET returns only annotations in currently authorised active Profiles and labels each source `active`, `resolved` (only when source says done), `changed` (same source, new occurrence), or `unavailable`. PATCH accepts 1–32 changes, rechecks the current source occurrence and Profile scope, commits the batch atomically, treats identical retries as idempotent and returns 409 on stale versions or a disappeared source. It never updates notification read/clear, bet settlement, financial records or source task state.
- Approved normal activation must replace the isolated-only runtime guard with a specific normal-owner enablement control, add the normal migration/rollback and decide whether these personal annotations are included in normal database backup/recovery and Profile export. A disabled flag must leave the routes unavailable and the V2 UI must state that tracking is awaiting activation.

The source currently uses SQLite syntax for the isolated candidate. PostgreSQL migration and use require separate implementation and review if a hosted deployment is later authorised. No hosted deployment is part of CP-134.
