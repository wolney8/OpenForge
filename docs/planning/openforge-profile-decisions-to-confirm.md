# OpenForge Profile Decisions To Confirm

**Last updated:** 2026-09-16 15:37 BST

## Purpose

This document lists profile-related decisions that must be reviewed with the user before they are treated as approved architecture.

This keeps Phase 2 aligned with:

- `M2 - Profile-Scoped Architecture`
- the GitHub milestone and issues already created
- the explicit instruction that profile-function decisions must be run by the user first

## Current understanding of the profiles function

Profiles (or 'Subscribers', 'Operational Entities') are intended to represent separate operational betting entities, representing a distinct logical container with its own isolated data silo, managed by a Fund Manager/operator.

Each profile must have:

- isolated tracker (OddsForge Tracker) data
- isolated balances
- isolated sportsbook/free-bet/casino/cash-adjustment history
- isolated reports and notes

The `/profiles` screen is a 'master roster' or control surface for reviewing metrics, modifying settings, selecting and comparing profiles. It is not a replacement for the selected profile's tracker. Selecting a profile dynamically loads a dedicated instance of the OddsForge Tracker that mirrors all standard features.

## Approval-gated decisions

### 1. Profile record shape

Approved for MVP:

- `display_name`
- `profile_code`
- `contact_email`
- `contact_phone`
- `contact address`
- `registered_accounts_email`
- `status`
- `tracking_start_date`
- `starting_bankroll`
- `notes`
- `management_fee`
- `investment_fee`

Not included in MVP:

- additional contact-person fields

### 2. Profile fee modelling

Approved for MVP:

- store `management_fee`
- store `investment_fee`
- treat both as percentage-point values
- use them in derived reporting planning

Working interpretation:

- `40.00` means `40%`
- not decimal-ratio storage
- not basis-point storage

### 3. Profile overview metrics

Approved minimum profile overview scope:

- gross profit
- total deductions
- total top-ups
- net earnings
- current cash snapshot
- current operational balances
- open position count
- overdue count
- expiring free-bet count
- last activity

Expanded MVP direction:

- `/profiles` for fund managers must support combined cross-profile analytics, not just a simple headline roster
- combined cross-profile views may include date-based, category-based, bookmaker-based, and profile-based aggregate drilldowns
- detailed row-level operational work still remains inside the selected profile tracker

### 4. Mug bets treatment

Approved default:

- keep mug bets inside `sportsbook_bets`
- expose mug bets as a filtered view in the UI if needed
- mug bets are known for 'account health' 

### 5. Cross-profile reporting

Approved direction:

- `/profiles` remains the aggregate control and combined-analytics surface
- MVP planning should include combined cross-profile reporting
- combined analytics may include full MVP aggregate drilldown coverage
- cross-profile views must not become mixed operational row-entry/edit surfaces
- The most important metric for `/profiles` will be the Fund Manager's view of management fee and investment fee earnings from each profile in local rounded currency

### 6. Archive vs delete behaviour

Approved default:

- support archive first
- avoid hard delete in normal UI flow

### 7. Profile settings scope

Current draft:

- per-profile date preset defaults
- free-bet expiry alert window
- main bank-account reference

To confirm:

- do you want profile-level tracker settings in MVP at all? [Yes]
- or should all defaults stay global until tracker parity is achieved?

## Safe defaults until confirmed

Until you approve otherwise, the planning assumption should remain:

1. one local operator
2. many profiles
3. archive rather than hard delete
4. mug bets remain inside sportsbook ledger
5. `/profiles` supports combined cross-profile analytics
6. fee fields are percentage-point values used in derived reporting planning
7. no postal address fields in MVP
8. no additional contact-person fields in MVP

## Next approval boundary

Before implementation or final schema locking, the following need your explicit sign-off:

- archive/delete semantics
- mug-bet treatment in the UI
- first-release profile-level settings scope
- exact non-action wording for account-health states beneath the mug-bet threshold

## CP-011 owner schema decisions

These are decision-ready proposals only. Neither migration is implemented.

### PD-QA-018 — Profile-scoped imported parent identity

**Example.** Profile A imports Sportsbook source row `X`, then imports a Free Bet whose qualifying
parent is source row `X`. The import first finds `Profile A + Sportsbook Bets + X`, then stores the
native Profile-A Sportsbook ID on the child. If Profile B also imports `X`, its key is
`Profile B + Sportsbook Bets + X`; it cannot be selected for Profile A.

The existing `import_source_records` table is retained and its identity boundary is rebuilt. The
existing `free_bets.origin_qual_bet_id` remains the unmodified external parent ID.

| Field | Type | Required? | Meaning / need |
|---|---|---:|---|
| `import_source_records.profile_id` | text Profile ID | Yes | Existing owner; becomes part of the source identity key so another Profile cannot collide |
| `source_sheet` | constrained text | Yes | Existing source namespace/type, such as `Sportsbook Bets`; becomes part of the key |
| `source_record_id` | text | Yes | Existing original external source ID; becomes part of the key |
| `source_hash` | text checksum | Yes | Existing immutable-input evidence used to recognise the same source on retry |
| `import_batch_id` | text | Yes for legacy workbook imports | Existing batch provenance; retained for compatibility |
| `import_run_id` | text | Optional | New stable modern import/retry operation identity where the full Profile importer has one |
| `entity_type` | constrained text | Yes | Existing native target type |
| `entity_id` | text | Optional until written | Existing native target ID produced by that import |
| `free_bets.origin_qual_bet_id` | text | Yes when a parent was supplied | Existing intended parent external ID; never rewritten into a native ID |
| `origin_qual_bet_source_namespace` | constrained text | Yes when a parent was supplied | New namespace that gives the external ID its meaning |
| `origin_qual_bet_native_id` | text Sportsbook ID | Optional | New resolved native parent; null when not safely resolved |
| `origin_qual_bet_resolution_state` | constrained text | Yes | New `resolved`, `missing`, `ambiguous`, `legacy_unresolved` or `not_applicable` state |
| `origin_qual_bet_resolution_json` | versioned validated JSON | Yes | New candidate IDs, mapping version, evidence and review reason; not a substitute for the native key |
| `origin_qual_bet_import_run_id` | text | Optional | New link to the import/retry attempt that made the resolution decision |

The database uniqueness rule is: the same external ID may exist in two Profiles, but the
combination of **Profile + source namespace + external ID** is the identity boundary. A composite
same-Profile foreign key from the child to `(profile_id, sportsbook_bet_id)` prevents a cross-Profile
native link.

- One same-Profile candidate: store `resolved` and its native ID.
- Same ID in another Profile: ignore it; it belongs to a different identity boundary.
- No candidate: store `missing`, retain the external ID and show “Parent not found”.
- Several candidates: store `ambiguous`, retain candidate evidence and show “Several possible
  parents — review required”.
- Parent imported later: remain unresolved until an explicit re-resolution action or governed retry;
  never guess during a read.
- Export: carry the external identity, resolution state/evidence and resolved native ID.
- Portable restore: remap the native ID only when the corresponding parent is restored inside the
  same Profile; otherwise retain the external identity and an explicit unresolved state.
- Retry: use the Profile-scoped source key, checksum and import/run identity to reuse the operation;
  reject conflicting source contents rather than silently relink or duplicate.

Migration rebuilds the existing source table key and adds nullable/defaulted child columns on
disposable SQLite/PostgreSQL first. Existing children become `legacy_unresolved`. Historical data
does not prove which same-looking row was intended, so there is no automatic backfill. Rollback must
retain the columns and mappings; an older application may read existing rows but must not write or
export this boundary if it would discard the new evidence.

**RECOMMENDATION:** Approve this smallest extension of the existing source-identity store.

**APPROVAL EFFECT:** Authorises additive/rebuild migrations and implementation first on disposable
SQLite/PostgreSQL data, plus import/export/restore/UI handling; it does not authorise normal-data or
hosted migration.

**RISK IF WE DO NOTHING:** Imported children remain unlinked or tempting to link by an unsafe global
external ID, weakening navigation, safe removal and recovery.

**RISK OF IMPLEMENTING:** A faulty key migration or downgrade could mis-scope or discard lineage;
composite constraints, old-schema upgrade fixtures and data-preserving rollback are mandatory.

**State:** PROPOSED — NOT IMPLEMENTED — OWNER APPROVAL REQUIRED.

### PD-QA-021 — append-only financial lifecycle history

The current per-ledger audit tables are attached to deletable rows with cascading foreign keys.
Extending them would require separate, inconsistent rebuilds and would still let deletion erase the
evidence. The recommendation is one bounded append-only history table for governed financial
ledgers, not a generic event platform.

| Field | Type | Required? | Purpose |
|---|---|---:|---|
| `history_id` | text UUID | Yes | Immutable primary key |
| `profile_id` | text Profile ID | Yes | Isolation and query boundary; Profile deletion is separately governed |
| `ledger_type` | constrained text | Yes | Sportsbook, Free Bet, Extra Place, Casino or Cash Adjustment; later types require an explicit contract change |
| `activity_id` | text | Yes | Stable native financial-row identity; deliberately no foreign key to a deletable row |
| `operation` | constrained text | Yes | Applicable lifecycle meaning: `created`, `edited`, `placement_recorded`, `settled`, `corrected`, `voided`, `archived`, `removed` or `reversed` |
| `occurred_at` | UTC timestamp | Yes | Server-owned event time |
| `schema_version` | integer | Yes | Snapshot interpretation version |
| `before_snapshot_json` | validated JSON or JSON null | Yes | Immutable complete prior state; null only for creation |
| `after_snapshot_json` | validated JSON or JSON null | Yes | Immutable complete new state; null only when the active row is removed |
| `reporting_effect_before_json` | validated money-state JSON | Yes | The governed report contribution before the operation |
| `reporting_effect_after_json` | validated money-state JSON | Yes | The governed report contribution after the operation |
| `source_identity_json` | validated JSON | Yes | Award/import/conversion/source identifiers known to the row |
| `provenance_json` | validated JSON | Yes | UI/API/import/system route and calculation/version evidence |
| `reason` | text | Yes, may be empty where policy permits | Correction, void/archive or removal reason |
| `actor_type` | constrained text | Yes | `owner`, `import`, `system` or another contract-approved source |
| `actor_id` | text | Optional | Authenticated actor where genuinely available; never invented |
| `operation_id` | text | Yes | Stable retry/idempotency identity, unique with Profile |

History stores full versioned before/after snapshots plus explicit reporting effects rather than a
money delta alone. **History is evidence. It is never independently summed as another financial
transaction.** Reports continue to read current governed rows or explicit reversal state.

Example lifecycle for a £10 activity:

| Stage | Current ledger | Reports | Immutable history |
|---|---|---|---|
| Created at £10 | Active £10 row | Current governed £10 meaning, if that ledger/status is reportable | `created`: null → £10 snapshot |
| Edited | Active edited row | Recomputed current contribution only | `edited`: £10 snapshot → edited snapshot |
| Settled at +£6 | Settled row showing +£6 | +£6 once | `settled`: prior state → settled +£6 |
| Corrected to +£5 | Corrected settled row showing +£5 | +£5 once, replacing +£6 as current truth | `corrected`: +£6 → +£5; both facts remain evidence |
| Archived/removed | Hidden from active view or retained as archived | Explicit current exclusion/reversal; never +£6 + £5 | `archived`/`removed`: +£5 → null/archived state |

Correction changes the current truth. Void records that the activity should have no governed
financial result. Archive removes it from normal active work while retaining the business row where
supported. Physical deletion removes the live row but not its append-only history and is permitted
only for an eligible mistaken/unplaced draft (including the governed #80 unused-child case). After
settlement or protected actual activity, normal UI/API operations must use correction, void/reversal
or archive—not physical deletion. Whole-Profile legal/owner erasure remains a separate explicit
retention workflow.

`UNIQUE(profile_id, operation_id)` makes retries idempotent. Indexes cover
`(profile_id, ledger_type, activity_id, occurred_at)` and `(profile_id, occurred_at)`. Database
guards reject history updates/deletes. Existing deleted rows cannot be reconstructed; there is no
invented backfill. Existing live rows gain their first baseline snapshot on their next governed
mutation. Migration creates the table additively and routes one ledger at a time only after tests.
Rollback preserves the table and disables incompatible old writes rather than dropping evidence.
Storage grows by one bounded row per governed mutation. Portable export/restore carries history,
remaps Profile identity and preserves history/activity/operation IDs; collisions are rejected.

Current source review shows Account and Profile archive keep their rows/audits, and fee revisions
already use durable revision rows. Sportsbook, standalone/unlinked Free Bet, Cash Adjustment, Extra
Place and Casino deletion can erase their row-bound audit history; those are the initial consumers.

**RECOMMENDATION:** Approve the bounded append-only table and make archive/void/correction the normal
post-settlement operations.

**APPROVAL EFFECT:** Authorises the additive table, governed writers/read API, report interpretation
and portable export/restore tests first on disposable SQLite/PostgreSQL; it does not authorise
normal-data or hosted migration.

**RISK IF WE DO NOTHING:** Permitted deletion can erase the explanation for historical financial
changes and make reports impossible to reconstruct confidently.

**RISK OF IMPLEMENTING:** Incorrect report queries could double-count snapshots, and incomplete
writer coverage could create gaps; append-only enforcement, idempotency and ledger-by-ledger gates
are mandatory.

**State:** PROPOSED — NOT IMPLEMENTED — OWNER APPROVAL REQUIRED.

### Why these remain separate

```text
IMPORT IDENTITY                         FINANCIAL HISTORY
external source                         native financial record
      ↓                                           ↓
Profile-scoped identity                 append-only lifecycle evidence
      ↓                                           ↓
native parent/child relationship        current ledger + reporting interpretation
```

They share Profile and provenance identifiers, but identity resolution decides which records belong
together while history records later lifecycle changes. Combining them into generic metadata would
weaken constraints, make queries ambiguous and couple import recovery to unrelated financial edits.
