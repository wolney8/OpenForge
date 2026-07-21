# Fixture Spec: Partial-Lay Follow-Up Reminder

_Last updated: 2026-07-21_

## Purpose

Define deterministic synthetic cases for the operational reminder applied to a sportsbook row whose
existing contract-backed lay state is `Part Laid`.

## Safety boundary

- These fixtures do not introduce or alter a money formula.
- Any liability, target lay or remaining-exposure value is an existing calculated/reference value.
- Reminder actions must not change any financial output.
- All identifiers and examples are synthetic.

## Required assertions

- only a profile-owned, part-laid row can receive an active reminder
- active reminders require a due timestamp; reason is optional
- the default is two hours before settlement, falling back to one hour before settlement after the
  two-hour point passes
- legacy rows with a primary matched stake and no serialized leg show that stake as the first leg
- a known settlement timestamp is an upper cutoff for the reminder
- active future reminders produce a warning badge
- active overdue reminders produce a danger badge
- resolve and dismiss actions require notes and remain auditable
- state survives list/get reloads
- saving a reminder persists valid dirty row fields once before the reminder and keeps the editor open
- another profile cannot read or change the reminder

## Fixture source

- `tests/fixtures/partial-lay-follow-up-fixtures.json`
