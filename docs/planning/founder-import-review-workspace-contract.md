# Founder Import Review Workspace Contract

_Status: hosted Profile workflow implemented; deployment verification pending_

## Boundary

The authenticated workspace at
`/profiles/{profile_id}/imports/{import_run_id}/review` reviews a workbook dry run for one explicit
target Profile. It does not import into Profile, Account, catalogue or ledger tables. The legacy
top-level route redirects to Profiles and is not a production data source.

Production uploads are accepted as authenticated `.xlsx` request bytes, checked for size/type,
checksummed, analysed by the persisted import-run job in memory and discarded when analysis completes. Raw workbook bytes are
not stored in PostgreSQL, the Vercel filesystem, Git or a public object URL. The Fund Manager must
re-upload the same checksum during a separately approved real-import tranche. Existing private
artifacts under `data/private/imports/founder/dry-run-2026-08-29-1605` remain developer regression
evidence only.

## Deterministic identity and decisions

Each exception carries:

- the workbook checksum and mapping version;
- its existing deterministic import ID;
- a review item ID derived from import ID plus issue category;
- a source fingerprint derived from the complete source row.

Hosted import runs, exception context and decisions are stored in Neon in
`profile_import_runs`, `profile_import_review_items` and `profile_import_review_decisions`.
Decisions are reapplied only when checksum, mapping version, review item ID and source fingerprint
still match. A changed source fingerprint leaves the item unreviewed and reports the prior decision
as stale. Local artifact decisions remain development evidence, not production authority.

Decision states are:

- `UNREVIEWED`
- `REVIEWED_ACCEPTED`
- `REVIEWED_OVERRIDDEN`
- `DEFERRED`
- `EXCLUDED`
- `BLOCKED`

Every saved decision records action, target, typed overrides, note/reason, actor and audit
timestamps. Exclusion, deferral, reclassification and historical-provider treatment require a
reason. Mapping a provider requires an existing validated catalogue ID. Creating a provider
candidate remains blocked until the normal Account Catalogue workflow validates it.

## Historical records

Trusted source realised P&L is preserved with `imported_historical` calculation provenance. The
review layer never invents strategy, lay inputs, commission, place terms, finishing position or
other modern calculation values.

The two embedded Sportsbook EP rows have explicit choices:

1. Historical Extra Place with unsupported current fields left null.
2. Retained historical Sportsbook row with `EP (Extra Places)` and no duplicate EP row.
3. Explicit reasoned reclassification, including Mug Bet only when manually selected.

Full over-length source text remains in audit context. The approved batch rule stores a canonical
200-character-field transformation while preserving the original. Casino fallback uses
`Historical Casino Offer` only when explicitly approved and marks the label as generated.

## Safe batch boundary

Batch review is limited to unambiguous patterns:

- advanced/missing-strategy rows retained as historical imported calculations;
- legacy text preserved with the documented canonical shortening rule;
- missing casino offer names assigned the generated historical label.

The confirmation shows count, issue, transformation and representative examples. Provider,
historical EP, manual override and arbitrary financial decisions cannot be batch-applied.

## Rerun and readiness

Initial analysis and review rerun persist their current stage, genuine percentage boundaries and
rows analysed/total where known. They do not invent elapsed-time estimates. The authenticated UI
polls the persisted run, may be left safely, and emits Fund Manager notifications for start,
completion, review-required and failure states. Every notification deep-links to the same Profile
and import run.

Rerun recomputes review readiness in the background from the persisted immutable exception snapshot and compatible
decisions. It reports original/resolved/remaining partials, excluded and deferred rows, row-count
impact, P&L impact and stale decisions. It never writes production data. A later approved import
must re-upload and verify the original checksum before applying records.

Review decisions are auto-saved individually. A selected or complete reset uses the shared warning
dialog, deletes only persisted review decisions and records actor, scope, count and timestamp in the
run audit summary. It cannot change the source workbook or Profile data. A zero P&L impact means
exactly `£0.00 change to imported P&L`; a non-zero impact lists each contributing defer/exclude
decision and requires explicit acknowledgement at the later approval gate.

Import review is ready only when no item remains `UNREVIEWED` or `BLOCKED`. Deferred and excluded
items are accepted only through an explicit reasoned decision and remain visible in reconciliation.

## Workbook-first financial reconciliation

The workbook effective timestamp is source metadata and selects the report period; it is not an
import or reporting cutoff. Every parsed ledger row remains accounted for, including an open row
whose event or settlement date is later than the snapshot timestamp.

Reconciliation follows the workbook formulas and the established cash-first contracts:

- Sportsbook and Casino report rows by their workbook week label/date axis and include the row's
  resolved current value, whether that value is final or still current/worst-case.
- Free Bets include the workbook's reportable `Placed` and `Settled` states and resolve final value
  before current value.
- Month reports sum workbook week buckets whose week-start belongs to that month; year reports sum
  the corresponding month/week buckets.
- Reconciliation presents settled/realised P&L, open current/worst-case P&L and the workbook-equivalent
  total separately. The two financial states must not be conflated.

The earlier £2.18 trace was caused by applying an unsupported `row date <= snapshot timestamp`
filter. Removing that cutoff makes the existing private snapshot reconcile exactly to the workbook's
£1,080.18 annual result. The previously observed December dates were corrected source-data errors;
they do not define a migration rule. Generic validation still marks a future-dated settled row for
review, while a future-dated open row is valid and does not enter the exception queue.

## Production authority and session boundary

Provider resolution calls the canonical Account Catalogue loader. In Neon mode this reads the
Fund Manager-managed `account_catalogue_documents` record; the version-controlled catalogue is
only the seed used when that document does not yet exist. Profile import never creates a competing
provider list.

The authenticated session cookie has a fixed absolute lifetime, but it is not the session
authority. Every protected API request validates the matching `fund_manager_sessions` row and the
Fund Manager's persisted inactivity preference. When Auto Logout is enabled, the effective expiry
is the earlier of the absolute deadline and the server-calculated inactivity deadline. Browser
state cannot extend an already expired server session. The Account UI only changes its displayed
preference after the server confirms the Neon write, preventing browser/server policy drift.
