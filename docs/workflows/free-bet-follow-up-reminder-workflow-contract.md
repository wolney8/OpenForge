# Workflow Contract: Free-Bet Follow-Up Reminder

_Last updated: 2026-07-21_

## 1. Workflow name

- Name: Free-bet follow-up reminder
- Audience: Fund Manager only

## 2. User goal

Allow the Fund Manager to set one audited follow-up task on an unfinished free-bet row, receive the
task in the global notification centre, return to the exact profile and row, and explicitly resolve
or dismiss it.

This is a manual operational reminder. Automatic free-bet expiry alerts are a separate deferred
notification source and must not be inferred from this workflow.

## 3. Current spreadsheet equivalent

The workbook records expiry, settlement and notes on the Free Bets sheet, but follow-up timing is a
manual operator process. Plum Duff preserves those source fields and adds an explicit audited task
without changing workbook calculations.

## 4. Route and input screens

- route: `/profiles/:profileId/tracker/free-bets`
- entry point: `Follow-up` section inside the existing free-bet editor dialog
- inputs: due date/time and optional reason
- completion inputs: required resolution or dismissal note
- notification link: the affected Free Bets ledger row in the same profile

Reminder controls remain inline in the existing editor. They must not open a second modal.

## 5. Database tables

- `free_bets`: current reminder state, due time, reason, resolution note and resolution metadata
- `free_bet_audit`: append-only reminder lifecycle events

Every reminder is profile-scoped through the owning `free_bets.profile_id` row.

## 6. Status transitions

| From status | Action | To status | Notes |
|---|---|---|---|
| `Not Set` | Create reminder | `Active` | Due time required; reason optional |
| `Active` | Resolve | `Resolved` | Resolution note required |
| `Active` | Dismiss | `Dismissed` | Dismissal note required |
| `Resolved` or `Dismissed` | Create reminder | `Active` | Creates a fresh reminder lifecycle |

- Only one `Active` reminder is allowed per free-bet row.
- Reminder creation is allowed for `Not Yet Awarded`, `Prospecting`, `Available` and `Placed` rows.
- Terminal rows (`Settled`, `Expired`, `Void`, `Converted`, `Error`) cannot create a new reminder.
- For `Placed` rows with a settlement time, the due time cannot be after settlement.
- For pre-placement rows with an expiry time, the due time cannot be after expiry.
- If the applicable cutoff is absent, the Fund Manager may still set an explicit due time.

## 7. Calculations touched

None. Reminder actions must not alter free-bet value, lay values, liability, projected/current value,
settled/final value, reporting value or manual override fields.

## 8. Reports touched

No financial report values change. Active and overdue reminders may later contribute to operational
action counts only under an explicitly approved reporting change.

## 9. Edge cases

- wrong-profile row lookup returns not found
- duplicate active reminder is rejected
- active reminder without a due time is rejected
- due time after the relevant expiry or settlement cutoff is rejected
- terminal row reminder creation is rejected
- resolved or dismissed reminder may be reopened with a fresh due time
- deleting the owning free-bet row removes its row-owned reminder and audit history
- automatic expiry alerts must not duplicate a manual reminder card when added later

## 10. Audit notes

Record previous state, new state, due time, reason, resolution note, actor and action time for create,
resolve, dismiss and reopen actions.

## 11. Tests required

- create, resolve, dismiss and reopen lifecycle
- duplicate-active and terminal-row rejection
- settlement/expiry cutoff validation
- profile isolation
- no financial field changes after reminder actions
- notification-centre source, link, title and completion endpoint
- one active notification card per reminder lifecycle

## 12. Playwright path

1. Open an unfinished synthetic free-bet row.
2. Open `Follow-up` inside the existing editor.
3. Save a due time with no reason and confirm the editor remains the only dialog.
4. Confirm the notification appears with Free Bets, bookmaker and event context.
5. Return through the notification link and resolve it with an audit note.
6. Confirm it moves to `Done` until the row lifecycle cutoff.
