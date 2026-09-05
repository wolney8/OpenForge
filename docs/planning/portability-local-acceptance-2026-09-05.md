# Local portability acceptance — 2026-09-05

## Decision and evidence boundary

Status: **LOCAL ACCEPTANCE PASSED**

Evidence labels in this report mean:

- **PROVEN** — executed in the stated environment with observable assertions.
- **CODE-VERIFIED** — inspected in current source or schema, without runtime execution.
- **DOCUMENTED** — supported only by authoritative external documentation.
- **INFERRED** — reasoned but not directly demonstrated.
- **UNVERIFIED** — not tested or unknown.

Acceptance IDs:

- `PORTABILITY-ACCEPT-001`: baseline and private-input integrity — COMPLETE.
- `PORTABILITY-ACCEPT-002`: non-mocked browser-to-API working-workbook download — COMPLETE.
- `PORTABILITY-ACCEPT-003`: field coverage and fail-closed projection review — COMPLETE.
- `PORTABILITY-ACCEPT-004`: local Profile eligibility review — COMPLETE WITH LIMITATION.
- `PORTABILITY-ACCEPT-005`: consolidated local portability decision — COMPLETE.

Google runtime, hosted behavior, stale-workbook merge, Notifications, and secret rotation are not
part of this local decision.

## Baseline and private authority

- **PROVEN in this tranche:** `main` started at
  `11b62a48b9e2dba5dfc4856654d582f1a174f224`, equal to `origin/main` with divergence `0/0`.
- **PROVEN in this tranche:** the approved September workbook SHA-256 remained
  `7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a`.
- **PROVEN in this tranche:** the supplied helper SHA-256 remained
  `9635a565f860e9927a2e01d4a8d5b4b5f796890b3612cb12ce8d8d5b38258122`.
- **PROVEN in this tranche:** rebuilding from that helper and the current structure manifest
  produced hardened candidate SHA-256
  `c9b17ac0be73a771912cfcc31df544575a32f89176ddec9ed339143d2237c14d` without changing the
  supplied helper.
- **PROVEN in this tranche:** both private inputs remain ignored and absent from the committed
  evidence.

## Acceptance matrix

### `founder-snapshot-v8`

- Accepted scope: September workbook analysis/import mapping, attempt-scoped persistence, financial
  reconciliation, and operational-health reconciliation into a fresh Profile.
- Evidence: **PROVEN previously** at `3110fc1` and its prerequisite importer commits; **PROVEN in
  this tranche** by rerunning the private-enabled synthetic September regression.
- Fixture: `tests/fixtures/founder-snapshot-v8-september-regression.json`, which is synthetic and
  private-data-free.
- Pinned effective-date controls: Week `40.96`; Year and total equivalent P&L `1145.31`; other
  included states `-8.60`; open current/worst-case `31.92`; exposure `490.08`; accounted `747/747`;
  duplicates/missing `0/0`; financial reconciliation PASS; operational-health reconciliation PASS.
- Integrity/isolation: **PROVEN by automated fixtures** for row accounting and Profile-scoped
  writes. The `747` control is source accounting, not an exported transaction-row count.
- Limitations: **UNVERIFIED** for Google or workbook-template formula results; importer acceptance
  does not prove working-workbook coverage.

### `profile-portable-export-v1`

- Accepted scope: read-only, deterministic, product-neutral XLSX projection of supported
  Profile-owned state with canonical rows, sheet checksums, aggregate checksum, and reference-only
  global authorities.
- Evidence: **PROVEN previously** at `d9ed60b`; **PROVEN in this tranche** by rerunning its focused
  API tests with synthetic Profiles.
- Integrity/isolation: **PROVEN by tests** for repeat logical checksum, stable ordering,
  null/empty/zero handling, decimal/timestamp encoding, selected-Profile isolation, and no business
  mutation.
- Limitations: internal execution/checkpoint machinery and transient audit records are deliberately
  not portable business state.

### `profile-portable-restore-v1`

- Accepted scope: validated portable backup into a newly created Profile only, runtime-ID remap,
  explicit global-reference review, attempt-scoped recovery, financial/operational acceptance, and
  normalized re-export parity.
- Evidence: **PROVEN previously** at `0100a0d`; **PROVEN in this tranche** by rerunning the focused
  restore tests.
- Integrity/isolation: **PROVEN by tests** for manifest/checksum validation, fresh-target boundary,
  transaction/rollback isolation, missing-reference review, financial parity, operational-health
  checks, and normalized re-export logical parity.
- Limitations: restoring into a populated Profile and incremental/stale-workbook merge remain out of
  scope.

### `workbook-template-export-v1`

- Accepted scope: current authorized Profile state projected into a fresh approved September XLSX
  template copy, with fail-closed field coverage, sanitization, ID/link allocation, and package
  preservation.
- Evidence: **PROVEN previously** at `11b62a4` for focused API/package and mocked UI behavior;
  **PROVEN in this tranche** through a non-mocked browser, authenticated local session, real API
  endpoint, real package generator, and downloaded-package verifier.
- The real local path used an isolated temporary SQLite database, synthetic catalogue, synthetic
  Profile, separate local API/web ports, and the approved private template. It verified the response
  byte and logical checksums, expected financial/source inputs, IDs and links, historical Extra
  Places transformation, lifecycle/restriction separation, package structure, exact classification,
  source fingerprints, and unchanged Profile/global business-state fingerprints.
- The browser and API both validated the same short-lived Fund Manager session token with an
  isolated test-only owner allowlist and secret. No authentication bypass or Production credential
  was used.
- The browser test retains the existing mocked UI tests but does not treat their
  `synthetic-xlsx-content` response as package-generation evidence.
- Required private-template tests executed; no required test was accepted through a skip.
- Output classification remains exactly:

  `STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING`

- Limitations: formula caches are cleared and recalculation requested, but **UNVERIFIED** in a
  spreadsheet engine. XLSX does not contain a bound Apps Script project. Google copy/runtime and
  hosted delivery are **UNVERIFIED**.

## Projection coverage decision

**CODE-VERIFIED in this tranche:** the field coverage contract matches the current projection and
blocker paths.

- Supported: Profile workbook control cells, iteration, exchange commissions, Accounts/current
  balances, Sportsbook, Free Bets, Casino, Cash Adjustments, source identities, dates, supported
  money inputs, and supported cross-record links.
- Transformed: one representable Active Account restriction is encoded in legacy Account status
  without changing lifecycle semantics; complete imported-historical Extra Places return to their
  original Sportsbook shape with audited imported P&L.
- Intentionally platform-only and retained by the portable backup: balance history, display and
  other tracker settings without template controls, Profile lookups, Quick Actions/loadouts,
  opportunity links/workflow state, and transient import/reconciliation machinery.
- Blocking: fee history, native/incomplete Extra Places, unrepresentable Account restrictions,
  separate override reasons, multi-lay state, richer Sportsbook calculation branches, richer Casino
  calculation state, unresolved links, missing bootstrap state, unknown fingerprints, structural
  drift, comments/identity metadata, and unsupported formula syntax.

Stored decimals remain unrounded canonical input; dates/timestamps use explicit encodings; empty
cells are not invented as zero. Source-input parity is separate from spreadsheet-engine results.

## Current local Profile eligibility

- **PROVEN in this tranche:** the authorized local database contained three active Profiles. A
  read-only in-memory attempt produced one structurally valid export and two deliberate rejections
  because required onboarding state was absent. No Profile-owned state changed.
- **UNVERIFIED:** no active local Profile is named `Will` or marked as the Founder Profile, and the
  local schema has no authoritative Founder designation. Therefore the current Founder Profile's
  eligibility cannot be attributed from this store. The synthetic and anonymous aggregate checks
  are not promoted into proof for a specific real Profile.

## Commands and cleanup

### Acceptance commands executed in this tranche

- `./scripts/run-python.sh -m pytest -q -ra apps/api/tests/test_workbook_template_export.py
  apps/api/tests/test_workbook_template_structure_tools.py
  apps/api/tests/test_profile_portable_export.py
  apps/api/tests/test_profile_portable_restore.py
  apps/api/tests/test_profile_workbook_cutover.py::test_founder_snapshot_v8_september_baseline_reconciles_at_scale`
  — **PROVEN:** 41 passed, 0 failed, 0 skipped.
- `./scripts/run-python.sh scripts/run_workbook_template_export_acceptance.py` — **PROVEN:**
  1 passed, 0 failed, 0 skipped. This is the real browser/auth/API/package path.
- `pnpm exec playwright test tests/e2e/working-workbook-export.spec.ts` — **PROVEN:**
  2 passed, 0 failed, 0 skipped. These remain mocked-response UI behavior tests.
- Python compilation plus focused Ruff for the three acceptance scripts — **PROVEN:** passed.
- `pnpm build:web` — **PROVEN:** passed. The existing dynamic-filesystem tracing warning remains.
- `pnpm typecheck` — web type generation and TypeScript passed; API mypy failed on three existing
  `accounts.py` findings outside this tranche.
- `pnpm lint` — web ESLint passed; API Ruff failed on 29 existing E501 findings in
  `common_bet_combos.py`, `security_policy.py`, and `test_common_bet_combos.py`.

Additional lessons-audit checks were intentionally kept separate from portability acceptance:

- A first four-file API run inherited the repository's authenticated `.env` and produced 30
  authentication failures. Re-running with `OPENFORGE_AUTH_REQUIRED=false` produced 29 passes and
  one failure: a test assumes the currently modified local catalogue contains `10Bet`, while that
  working catalogue returns no matching authority. The catalogue is an unrelated pre-existing
  change and was not altered by this tranche.
- A combined working-workbook/Free-Bet-bridge Playwright run produced 2 working-workbook passes and
  5 bridge failures because the expected editor dialog was not present. The clean scoped
  working-workbook run above passed 2/2; the unrelated bridge failures are not hidden or treated as
  portability evidence.
- A Prettier check could not run because no `prettier` command is installed in this workspace.

The real browser gate is run with:

`./scripts/run-python.sh scripts/run_workbook_template_export_acceptance.py`

The runner creates its database, catalogue, session token, and download under OS temporary
directories. The downloaded XLSX is validated before cleanup. **PROVEN in this tranche:** temporary
database, token, catalogue, test workbook, and generated helper outputs were absent after their
respective commands completed.

## Deferred Google checklist

Do not execute this as part of local acceptance:

1. Make a disposable Google Drive copy of the approved Google template container.
2. Confirm that the bound helper is the hardened candidate with SHA-256
   `c9b17ac0be73a771912cfcc31df544575a32f89176ddec9ed339143d2237c14d` and that its menu is present.
3. Populate the copy through the same declared `workbook-template-export-v1` input/control zones;
   testing an unchanged old template is not validation of the new exported projection.
4. Perform one normal edit and one new-row action.
5. Confirm Google recalculation of formula/helper cells and visible reporting outputs.
6. Run one representative helper workflow against the populated disposable copy.
7. Capture non-sensitive evidence and delete the disposable copy.

A second account/project/OAuth setup is not presumed necessary. Bound-script copying, triggers,
authorization, properties, recalculation, and runtime execution remain **UNVERIFIED** until this
exact populated-copy smoke is executed.
