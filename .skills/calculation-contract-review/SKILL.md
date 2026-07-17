# Calculation Contract Review

## Purpose

Use this skill when reviewing a calculation contract for Plum Duff money logic.

## Required inputs

- the target calculation contract
- related source-pack references, if available
- affected workflow or report context

## Review checks

1. Confirm the contract is profile scoped and names `profile_id` handling.
2. Confirm spreadsheet equivalent is stated.
3. Confirm cash-first current-value behaviour is explicit.
4. Confirm projected/current and settled/final values are separated.
5. Confirm assumptions, rounding, commission, and liability rules are visible.
6. Confirm manual override handling and audit trail requirements exist.
7. Confirm deterministic fixtures and automated test cases are defined.
8. Confirm UI display requirements do not hide financial ambiguity.

## Output format

Report:

- pass/fail summary
- missing fields
- contradictions with source-pack guidance
- unsafe assumptions
- required follow-up before implementation

## Stop conditions

Stop and escalate if:

- formula logic is implied but not stated
- profile isolation is missing
- projected/current vs final/settled values are merged
- rounding or commission rules are not defined
