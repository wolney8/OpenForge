# Plum Duff Task Cadence

Use this sequence for normal Codex work in this repository:

1. Restate the objective in Plum Duff terms.
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

- Owner-facing local Plum Duff handoffs use the one established authenticated application at
  `http://localhost:3010` with its API on `localhost:8010`, existing owner session and normal-owner
  database unless the owner explicitly chooses another environment. Temporary ports may be used
  internally for tests but are not a substitute handoff application and must be stopped afterwards.
- Run tests non-interactively by default. A generated or downloaded file stays closed unless the
  owner gives fresh permission to open the exact disposable file in the named desktop application.
  Do not control, hide, focus, save, close, or terminate an owner workbook, browser, or application
  session. Before any necessary visible desktop test, explain the evidence gap, application, file,
  and interruption, then wait for bounded approval; otherwise leave that check pending and continue
  independent work.
- Reuse still-applicable interactive evidence instead of reopening desktop applications for a new
  screenshot or report. Report package structure, cached values, calculation-engine recalculation,
  and Excel/Google interactive runtime as separate evidence classes.
- Do not skip source-pack inspection when workbook behaviour is relevant.
- Do not invent formulas, rounding rules, or status logic when the source pack is silent.
- Do not commit without explicit human approval.
- Before any UI work, read the mandatory Plum Duff UI/accessibility contract and complete its
  implementation checklist.
- Invoke `.skills/plum-duff-ui-consistency-enforcer/SKILL.md` for every UI change and satisfy its
  fail-closed evidence gate before handoff.
- Search for existing platform primitives and equivalent controls before adding markup or CSS.
- For every UI fix, search current, sibling and shared implementations; update equivalent patterns
  or document why they intentionally differ.
- Add repeated UI mistakes and their regression test to the known-pitfalls register.
- Record larger M3/WCAG/layout debt in the UI audit backlog rather than silently deferring it.
- Report concise human smoke-test steps in chat. Do not create issue handover or smoke-guide files
  unless the user explicitly requests a durable testing artefact.
