# Plum Duff Definition of Done

## Documentation tasks

Done means:

- scope is covered clearly and concisely
- references to source-pack inputs are stated
- contradictions or unknowns are called out
- no sensitive raw data is copied into the output

## Schema tasks

Done means:

- profile isolation is explicit
- key tables and relationships are described
- derived metrics vs stored values are distinguished
- risky assumptions are visible
- review points are called out before implementation

## Calculation tasks

Done means:

- a calculation contract exists
- spreadsheet equivalent is stated where known
- inputs and outputs are explicit
- projected/current vs settled/final values are separated
- assumptions are visible
- rounding rules are stated
- fixtures are defined
- tests are defined
- acceptance tolerance is stated where needed
- human review is requested

## UI tasks

Done means:

- workflow contract exists for user-facing flow
- route context is clear
- profile context is clear where relevant
- empty, error, and edge states are identified
- Playwright path is defined if the UI is part of scope
- `docs/agent-contracts/plum-duff-ui-accessibility-contract.md` was followed
- the UI implementation checklist was completed
- existing Plum Duff primitives and semantic tokens were used or an exception was justified
- Material 3 states and WCAG 2.2 AA were checked in light and dark modes
- keyboard order, focus visibility, accessible names and form labels were checked
- important controls/regions have stable `data-pd-id` identifiers
- no unintended page horizontal overflow was introduced
- wide content and tables use intentional scroll viewports with shrinking grid/flex ancestors
- dialog geometry, body scroll and visible action footer were checked where relevant
- enabled, disabled, loading, success and error conditions match actual process preconditions
- equivalent controls in current and related routes were searched and updated or documented
- known repeated mistakes were added to the pitfalls register with a regression test

## Data import tasks

Done means:

- source columns/fields are mapped
- validation and status handling are described
- profile attachment rules are explicit
- sensitive-data handling is explicit
- fixtures or sample imports are synthetic
- failure modes are documented

## Reporting tasks

Done means:

- date range logic is defined
- current/projected vs settled/final inclusion rules are defined
- profile aggregation rules are defined
- KPI definitions are explicit
- calculation dependencies are linked
- test expectations are defined

## Testing tasks

Done means:

- deterministic fixtures exist or are specified
- assertions are traceable to contracts or workflow rules
- relevant edge cases are covered
- profile isolation is covered when applicable
- anything not tested is explicitly stated

## Mandatory bar for financial work

Financial or calculation work is not done unless it has:

- a calculation contract
- deterministic fixtures
- automated tests
- visible assumptions
- stated result tolerance where relevant
- human review
