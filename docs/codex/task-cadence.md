# OpenForge Task Cadence

Use this sequence for normal Codex work in this repository:

1. Restate the objective in OpenForge terms.
2. Identify the exact files and source-pack inputs involved.
3. Identify financial, data-safety, and profile-isolation risks.
4. Propose a short plan.
5. Wait for approval when the task touches architecture, schema, calculations, auth, imports, reporting, or other money-sensitive behaviour.
6. Implement only the approved scope.
7. Run the narrowest relevant tests or checks.
8. Report changed files.
9. Report test results and anything not run.
10. Stop for review before expanding scope.

Extra guardrails:

- Do not skip source-pack inspection when workbook behaviour is relevant.
- Do not invent formulas, rounding rules, or status logic when the source pack is silent.
- Do not commit without explicit human approval.
