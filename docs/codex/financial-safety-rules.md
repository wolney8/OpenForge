# OpenForge Financial Safety Rules

## Purpose

OpenForge handles money-impacting tracker logic. A bad assumption can cause real losses. These rules apply to planning, implementation, testing, review, and documentation.

## Core rules

- No calculation without a written calculation contract.
- No user-visible money value without deterministic fixtures and automated tests.
- No hidden assumptions about fees, commission, stakes, settlement timing, or statuses.
- No silent rounding.
- No mixing projected/current values with settled/final values.
- No generic calculator substitution where the workbook uses cash-first logic.

## Calculation design rules

- Name every calculation explicitly.
- State the workflow context and affected screens or reports.
- Record the spreadsheet/source-pack equivalent where known.
- Separate user-entered fields, calculator/reference fields, derived projected/current fields, and derived settled/final fields.
- Define blank, error, partial, void, and manual-override behaviour.

## Money values

For any displayed or stored financial value, define:

- meaning
- source inputs
- currency precision
- stored precision
- display precision
- whether value is derived or entered
- whether value is projected/current or settled/final

## Rounding

- State rounding method and precision.
- State whether rounding is display-only or storage-affecting.
- Never round silently inside business logic without documenting it.
- If workbook rounding cannot yet be proven, document `To confirm` and stop short of implementation.

## Liability and exposure

- Liability rules must be explicit.
- Exposure aggregation rules must be explicit.
- Open positions, overdue positions, and pending withdrawals/top-ups must state whether they count toward exposure or cash snapshot.
- Cross-profile summaries must be derived from profile-scoped records, never merged ad hoc.

## P&L and bankroll

- Gross profit, deductions, and net earnings must each have distinct definitions.
- Current bankroll or cash snapshot must be traceable to source fields and statuses.
- Do not present realised P&L as current bankroll if the underlying rows are still open or pending.

## Projected/current values vs actual/final values

OpenForge must preserve the workbook's cash-first tracker behaviour:

- open or pending rows may still have a current value
- scenario outcomes may need to be calculated before settlement
- conservative current value may use a `MIN()`-style outcome
- final settled value must remain separate
- reports must state whether they are showing projected/current or settled/final values

## Manual overrides

- Manual override values must never silently replace computed values.
- Require a reason field and audit notes.
- Keep both original calculated value and override value available for review where appropriate.

## Automation and scraping bans

- No autonomous bet placement.
- No auto-confirmation of bets.
- No live bookmaker scraping in MVP.
- No unsafe browser automation against third-party platforms.

## Sensitive data and examples

- Use synthetic examples only.
- Never place real workbook data, credentials, or personal data in fixtures, screenshots, or sample contracts.

## Required evidence before completion

For any money-impacting feature, completion requires:

- approved calculation contract
- deterministic fixtures
- automated tests
- explicit assumptions
- stated tolerance where relevant
- human review sign-off
