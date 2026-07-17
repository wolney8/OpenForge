# Plum Duff UI Review

## Purpose

Use this skill for every Plum Duff UI feature, bug fix, route, dialog, table, form, navigation,
loading state or accessibility review.

## Required reading

1. `AGENTS.md`
2. `docs/agent-contracts/plum-duff-ui-accessibility-contract.md`
3. `docs/agent-contracts/plum-duff-ui-implementation-checklist.md`
4. `docs/agent-contracts/plum-duff-known-ui-pitfalls.md`
5. relevant workflow/calculation contract

## Review sequence

1. Identify the user workflow and process-state preconditions.
2. Search current, sibling and shared implementations for equivalent controls.
3. Identify existing components, CSS primitives and semantic tokens before editing.
4. Check public-facing Plum Duff naming.
5. Check semantic structure, labels, accessible names, keyboard/focus and `data-pd-id` coverage.
6. Check light/dark contrast, responsive reflow and page/dialog/table overflow.
7. Define enabled, disabled, loading, success and error states.
8. Add focused unit/Playwright coverage, including geometry/style parity for repeated defects.
9. Complete the UI checklist and update the pitfalls/backlog documents when needed.

## Stop conditions

Stop and escalate when:

- the change requires a large design-system migration not approved in scope;
- an accessibility requirement conflicts with a financial/workflow contract;
- a new dependency is required without approval;
- the same pattern has divergent requirements that are not documented.

## Output

Report changed primitives/routes, equivalent instances reviewed, M3/WCAG evidence, tests run,
manual checks still required and backlog items created.
