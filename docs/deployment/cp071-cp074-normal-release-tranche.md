# CP-071/CP-072/CP-074 Normal Release Tranche

Last checked: 2026-10-04 13:02:35 BST (Europe/London)

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
- CP-076 compatibility handling preserves the former per-Profile reporting failure boundary: a
  Profile whose stored source no longer satisfies a response contract is returned as
  `source_validation_failed`; valid authorised Profile sources remain available, while complete
  summary values remain unavailable until every selected Profile is ready.

## Explicit exclusions

- CP-057 through CP-070 workbook portability, reviewed Apply, Google helper and OddsMatcher work.
- Subscriber registration V2, CP-073 Account catalogue nullability and CP-075 promotion lifecycle.
- Owner-review video/media infrastructure, candidate-only routes and historical candidate status.
- Predictive Tasks, AI Decision Support and external odds-provider work.

## Schema and data impact

This tranche changes no database schema, migration, financial calculation or workbook format. It
uses existing task evidence and existing governed reporting projections. Normal data must remain
unchanged during deployment. Malformed numeric text is neither coerced nor included as zero.

## Known pre-existing Normal defect

`apps/api/tests/test_profiles.py::test_profile_delete_requires_archive_and_exact_name_then_cascades`
fails unchanged on Normal because `subscriber_applications.profile_id` and
`subscriber_access_grants.profile_id` use `ON DELETE NO ACTION`, while the test asserts that every
Profile foreign key cascades. CP-071/072/074 do not touch or depend on Profile deletion or these
tables. The defect remains separately tracked and is not part of this schema-free tranche.

## Release evidence

Checks run against this exact branch:

- 536 web unit/component tests passed across 73 files, including deterministic 64-Profile
  financial equivalence and one-request combined loading.
- Seven focused combined/individual Reports API tests and 12 subscriber route-denial cases passed.
  The malformed regression covers `bad` and a second non-numeric money string without changing the
  stored value.
- Daily Tasks compact lifecycle/filter/pagination smoke passed. Its actual record deep-link,
  permission, state persistence and refresh journey passed on an isolated rerun.
- Aggregate-first Reports with 64 Profiles and the malformed-Profile UI boundary passed. Two
  real-data Explorer/drilldown/return tests and the Period P&L reconciliation journey passed.
- The verified pre-release Normal backup reproduced the original boundary: the individual endpoint
  returns 500 for the archived synthetic Profile. Corrected combined Active, Inactive, All and
  Custom calls return 200; 41 valid Profile payloads exactly match their individual endpoints and
  the malformed Profile is identified without contributing a fabricated value.
- Full web typecheck and production build passed. Focused ESLint and Ruff passed.
- The unchanged Normal Profile-deletion invariant failure was reproduced separately and was not
  included in the passing totals.

The first promotion attempt was rolled back to `a874b03` after the retained archived synthetic
Casino record exposed the combined-request failure. This replacement release has not been promoted.

## Backup and rollback

Immediately before promotion, create and reverify a full Normal backup through the established
Fund Manager backup service. If the release must be withdrawn, stop the new application process
and restore application revision `a874b03`. No database rollback is required because this tranche
has no migration or new persisted shape. The verified database backup remains the recovery point
for an independent operational failure; it is not consumed by an ordinary application rollback.
