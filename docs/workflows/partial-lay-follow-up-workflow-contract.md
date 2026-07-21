# Workflow Contract: Partial-Lay Follow-Up Reminder

_Last updated: 2026-07-21_

## 1. Workflow name

- Name: Partial-lay follow-up reminder

## 2. User goal

Allow the Fund Manager to mark a genuinely part-laid sportsbook row for a time-bound recheck,
return to it before the event settles, and explicitly resolve or dismiss the reminder with an audit
note.

This is an operational safety workflow. It does not place a lay, change the bet, or calculate a new
financial value.

## 3. Current spreadsheet equivalent

- primary sheet: `Sportsbook Bets`
- workbook behaviour: part-laid rows retain visible remaining exposure and require manual
  follow-up
- Plum Duff improvement: persist the follow-up time and resolution instead of relying on an
  unstructured note or operator memory

## 4. Route and input screens

- route: `/profiles/:profileId/tracker/sportsbook-bets`
- screen: sportsbook row editor, `Placement` section
- save sequence: any valid unsaved row edits are persisted before the reminder update; failure to
  save the row blocks the reminder update and keeps the editor open
- table visibility: warning or overdue issue badge and an `Issue type` filter
- profile context required: yes, mandatory

## 5. Database tables

- `sportsbook_bets`: current reminder state, due time, reason, resolution note and resolution time
- `sportsbook_bet_audit`: append-only reminder action history

All reads and writes require both `profile_id` and `sportsbook_bet_id`.

## 6. Status transitions

| From status | Action | To status | Notes |
|---|---|---|---|
| `Not Set` | create reminder | `Active` | Row must currently resolve to `Part Laid`; due time required and reason optional |
| `Active` | change due time or reason | `Active` | Change is audited |
| `Active` | complete recheck | `Resolved` | Resolution note and timestamp required |
| `Active` | intentionally suppress | `Dismissed` | Dismissal note and timestamp required |
| `Resolved` or `Dismissed` | create reminder again | `Active` | Treated as an explicit reopened reminder |

The workflow must never silently resolve a reminder when the lay state changes. The Fund Manager
must record the resolution explicitly so the audit trail explains what happened.

## 7. Calculations touched

- no new calculation
- existing values may be displayed read-only from:
  - `docs/contracts/sportsbook-current-value-contract.md`
  - `docs/contracts/liability-exposure-contract.md`
- the reminder must not recalculate or override stake, liability, exposure, projected/current value,
  settled/final value, or reporting value

## 8. Reports touched

- no P&L or formal-report change
- operational sportsbook issue counts may include active and overdue reminder badges

## 9. Edge cases

- reminder attempted on a row that is not `Part Laid`: reject
- active reminder without a due time: reject
- default due time: two hours before settlement, or one hour before settlement when the two-hour
  point has passed; a safe near-term value is used when less than one hour remains
- reminder after a known settlement cutoff: reject
- resolve or dismiss without a note: reject
- reminder row belongs to another profile: return not found
- fully laid row still has an active reminder: keep reminder visible until explicitly resolved or
  dismissed
- deleted row: reminder state and its row-owned audit history follow existing sportsbook deletion
  behaviour

## 10. Audit notes

Retain:

- reminder action
- previous and new state
- due time
- reason
- resolution note
- acting Fund Manager identifier
- action timestamp

## 11. Tests required

- deterministic active, overdue, resolved, dismissed, invalid-cutoff and profile-isolation cases
- API tests for validation, persistence and audit-row increments
- helper tests for issue badge priority and filter matching
- Playwright test for create, reload, filter and resolve behaviour

## 12. Playwright path

1. open a synthetic part-laid sportsbook row
2. open `Placement`; reminder controls remain inline in the existing editor, never in a second modal
3. create a reminder before the settlement cutoff, leaving the optional reason blank if appropriate
4. confirm any unsaved row edits are autosaved once and the sportsbook editor remains open
5. return to the ledger and confirm the reminder issue badge
6. reload and confirm persistence
7. filter to `Lay Recheck`
8. reopen the row and resolve with a note
9. confirm the active issue badge is removed
### Reminder recurrence

- A part-laid row may have only one `Active` reminder at a time.
- An `Active` reminder must be resolved or dismissed before another can be created.
- A row whose previous reminder is `Resolved` or `Dismissed` may create a new reminder if it is
  still part laid; this is recorded as an audited reopen action with fresh due/reason values.
- A new reminder must not silently inherit the prior reminder reason or resolution note.
