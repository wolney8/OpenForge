# Sportsbook placement evidence — CP-117 / #118

Owner approval: 21 November 2026. This contract records source evidence; it does not alter a calculator formula, place a wager or infer a missing confirmation.

## Fields and meaning

- `back_placement_confirmed`: nullable Boolean on the Profile-owned Sportsbook record. `true` means the user explicitly confirmed an external Back placement. `null` means no independent confirmation was recorded. Existing `Placed` records remain `null`; their status is never backfilled into this field. A transition to or from `true` is audited with the record's existing actor/time and source history. `false` is not a persisted state.
- `requested_lay_stake`: nullable decimal string, entered by the user as the amount requested at the exchange. `null` means Not recorded. It is distinct from calculator planned/recommended stake and actual matched stake. It uses the existing money parser and preserves the parser's canonical precision. It is not derived from `lay_actual` on older records.
- `lay_matched_stake_1` and existing partial-fill legs remain actual matched evidence. The visible amount must be entered or explicitly confirmed before the established Save command records a fill. A requested amount does not itself establish a match.

## Lifecycle and calculation boundary

- Back-only, Lay-only, Back→Lay and Lay→Back are valid evidence combinations. A shared `Placed` status may coexist with either confirmed side; it does not establish the other side. The UI displays each side from its own evidence.
- The existing Sportsbook calculation engine continues to use its established source inputs. New evidence fields are not a substitute calculation authority. A £10 calculator plan, £8 recorded Lay request and £5 matched Lay fill remain three separate values after reload. Existing cash-first/current and settled/final definitions, commission and correction rules are unchanged.
- A recorded request is positive, finite and uses the existing decimal money validation. A matched fill is validated by the existing placement/partial-lay path. A planned amount never silently becomes the requested or matched amount.
- Terminal-record changes to either placement field require the existing explicit correction reason and audited correction command. Profile permission and row identity checks remain on the server.

The dedicated Multi-Lay actual-fill command is a separate boundary. A disposable `Placed` Multi-Lay v2 record without actual per-leg execution is rejected with HTTP 422: placement/settlement requires an approved actual per-leg cash contract. When execution is present, the current actual calculation uses Back stake/odds without checking `back_placement_confirmed`; it produces financial outcomes using that Back stake. The V2 Multi-Lay Start guard therefore still requires independently confirmed Back evidence. Removing only the browser guard would make Lay-first actual fills appear financially complete while Back placement remains unknown. Enabling Lay-first dedicated Multi-Lay execution requires a separately reviewed command/calculation contract for provisional actuals and their displayed values. Ordinary single-lay evidence and Back/Lay confirmation order remain independent.

## Storage, migration and recovery

The additive SQLite migration adds exactly two nullable `sportsbook_bets` columns and does not backfill historical rows. It runs as an explicit offline operation after a protected verified backup, never implicitly on normal API startup. The existing financial record and audit tables remain authoritative. Synthetic migration tests assert old row values, null new fields, integrity and foreign keys; recovery preserves newer owner activity.

## Deterministic acceptance fixtures

Use independent synthetic authentication and disposable storage. A standard draft with Back stake £10, odds that yield a £10 calculator plan, a recorded £8 Lay request and a confirmed £5 match must reopen with those exact distinct amounts and a partial-fill state. Cover Back-only, Lay-only and both confirmation orders; unknown older records; validation of malformed/negative request amounts; foreign Profile rejection; terminal correction reason and audit history; flag-OFF rendering and unchanged financial calculations. Owner Design and Interaction Acceptance remain separate.
