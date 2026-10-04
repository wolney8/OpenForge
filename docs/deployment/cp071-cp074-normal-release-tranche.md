# CP-071/CP-072/CP-074 Normal Release Tranche

Last checked: 2026-10-04 12:14:56 BST (Europe/London)

## Release identity

- Normal baseline: `a874b037c61bb0ff7ba6adb2717f5a0ade0bb9d6`
- Release branch: `release/cp071-cp074-fund-manager-scale`
- Curated release commit: the commit containing this record
- Source evidence: accepted CP-071, CP-072 and CP-074 implementation checkpoints

## Included capability

- Daily Tasks compact Fund Manager action surface with Today, Upcoming, Overdue and Completed
  lifecycle views, filters, search and bounded pagination.
- Aggregate-first Reports with Active Profiles as the default scope, deliberate Inactive, All and
  Custom scopes, a bounded Profile comparison table and preserved drilldown context.
- One server-authorised combined Reports summary projection for broad Profile scopes.

## Explicit exclusions

- CP-057 through CP-070 workbook portability, reviewed Apply, Google helper and OddsMatcher work.
- Subscriber registration V2, CP-073 Account catalogue nullability and CP-075 promotion lifecycle.
- Owner-review video/media infrastructure, candidate-only routes and historical candidate status.
- Predictive Tasks, AI Decision Support and external odds-provider work.

## Schema and data impact

This tranche changes no database schema, migration, financial calculation or workbook format. It
uses existing task evidence and existing governed reporting projections. Normal data must remain
unchanged during deployment.

## Known pre-existing Normal defect

`apps/api/tests/test_profiles.py::test_profile_delete_requires_archive_and_exact_name_then_cascades`
fails unchanged on Normal because `subscriber_applications.profile_id` and
`subscriber_access_grants.profile_id` use `ON DELETE NO ACTION`, while the test asserts that every
Profile foreign key cascades. CP-071/072/074 do not touch or depend on Profile deletion or these
tables. The defect remains separately tracked and is not part of this schema-free tranche.

## Release evidence

Checks run against this exact branch:

- 535 web unit/component tests passed across 73 files, including deterministic 64-Profile
  financial equivalence and one-request combined loading.
- 15 focused API authorization/combined-Reports tests passed; 12 isolated backup, package,
  verification and restore tests passed.
- Daily Tasks compact lifecycle/filter/pagination smoke passed. Its actual record deep-link,
  permission, state persistence and refresh journey passed on an isolated rerun.
- Aggregate-first Reports with 64 Profiles passed; two real-data Explorer/drilldown/return tests
  and the Period P&L reconciliation journey passed.
- Full web typecheck and production build passed. Focused ESLint and Ruff passed.
- The unchanged Normal Profile-deletion invariant failure was reproduced separately and was not
  included in the passing totals.

## Backup and rollback

Immediately before promotion, create and reverify a full Normal backup through the established
Fund Manager backup service. If the release must be withdrawn, stop the new application process
and restore application revision `a874b03`. No database rollback is required because this tranche
has no migration or new persisted shape. The verified database backup remains the recovery point
for an independent operational failure; it is not consumed by an ordinary application rollback.
