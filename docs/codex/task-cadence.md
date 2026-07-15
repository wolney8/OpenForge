# OpenForge Task Cadence

Use this sequence for normal Codex work in this repository:

1. Restate the objective in OpenForge terms.
2. Update from `origin/main` and confirm the next branch starts from the latest merged baseline.
3. Identify the exact files and source-pack inputs involved.
4. Identify financial, data-safety, and profile-isolation risks.
5. Propose a short plan.
6. Wait for approval when the task touches architecture, schema, calculations, auth, imports, reporting, or other money-sensitive behaviour.
7. Implement only the approved scope.
8. Run the narrowest relevant tests or checks.
9. After switching branches or integrating source, restart long-running development servers and
   verify shared imports plus the critical smoke route from a fresh module graph.
10. Report changed files.
11. Report test results and anything not run.
12. Merge approved work back to `main` before starting the next issue branch.
13. Stop for review before expanding scope.

Extra guardrails:

- Do not skip source-pack inspection when workbook behaviour is relevant.
- Do not invent formulas, rounding rules, or status logic when the source pack is silent.
- Do not commit without explicit human approval.
