# Founder Import Review Workspace Contract

_Status: implementation complete; Fund Manager review decisions pending_

## Boundary

The authenticated Fund Manager workspace at `/imports/founder/review` reviews the point-in-time
founder workbook dry run. It does not import into Profile, Account, catalogue or ledger tables.
The workbook and original dry-run artifacts remain input-only.

The workspace reads the private artifacts under the configured founder review directory. The
default local source is `data/private/imports/founder/dry-run-2026-08-29-1605`. Neither workbook
content nor review decisions may be committed.

## Deterministic identity and decisions

Each exception carries:

- the workbook checksum and mapping version;
- its existing deterministic import ID;
- a review item ID derived from import ID plus issue category;
- a source fingerprint derived from the complete source row.

`review-decisions.json` is written atomically beside the private artifacts. A decision is reapplied
only when checksum, mapping version, review item ID and source fingerprint still match. A changed
source fingerprint leaves the item unreviewed and reports the prior decision as stale.

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

Rerun rebuilds the read-only founder dry run from the immutable workbook, verifies its checksum,
and reapplies compatible decisions. It reports original/resolved/remaining partials, excluded and
deferred rows, row-count impact, P&L impact and stale decisions. It never writes production data.

Import review is ready only when no item remains `UNREVIEWED` or `BLOCKED`. Deferred and excluded
items are accepted only through an explicit reasoned decision and remain visible in reconciliation.
