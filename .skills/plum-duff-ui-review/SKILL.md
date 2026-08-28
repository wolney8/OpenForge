---
name: plum-duff-ui-review
description: Review Plum Duff UI features and fixes against Material 3, WCAG 2.2 AA, platform primitives, process states, and the mandatory fail-closed UI consistency enforcer before handoff.
---

# Plum Duff UI Review

## Purpose

Use this skill for every Plum Duff UI feature, bug fix, route, dialog, table, form, navigation,
loading state or accessibility review.

## Required reading

1. `AGENTS.md`
2. `docs/agent-contracts/plum-duff-ui-accessibility-contract.md`
3. `docs/agent-contracts/plum-duff-ui-implementation-checklist.md`
4. `docs/agent-contracts/plum-duff-known-ui-pitfalls.md`
5. `.skills/plum-duff-ui-consistency-enforcer/SKILL.md`
6. relevant workflow/calculation contract

## Review sequence

1. Identify the user workflow and process-state preconditions.
2. Search current, sibling and shared implementations for equivalent controls.
3. Record every supplied issue ID, selector/reference and canonical signed-off equivalent before editing.
4. Identify existing components, CSS primitives and semantic tokens before editing.
5. Check public-facing Plum Duff naming.
6. Check semantic structure, labels, accessible names, keyboard/focus and `data-pd-id` coverage.
7. Check light/dark contrast, responsive reflow and page/dialog/table overflow.
8. Define enabled, disabled, loading, success and error states.
9. Add focused unit/Playwright coverage, including geometry/style parity for repeated defects.
10. Complete the UI checklist and update the pitfalls/backlog documents when needed.
11. Reconcile every issue ID and satisfy the consistency-enforcer evidence gate before smoke testing.

For retrospective audits, fix only unambiguous LOW-risk drift. Register MEDIUM/HIGH-impact
consolidation for explicit review instead of changing signed-off surfaces opportunistically.

## Stop conditions

Stop and escalate when:

- the change requires a large design-system migration not approved in scope;
- an accessibility requirement conflicts with a financial/workflow contract;
- a new dependency is required without approval;
- the same pattern has divergent requirements that are not documented.

## Output

Report changed primitives/routes, equivalent instances reviewed, M3/WCAG evidence, tests run,
manual checks still required and backlog items created.
