# Financial Risk Review

## Purpose

Use this skill for any Plum Duff feature that can affect money values, exposure, balances, reports, or user decisions.

## Review questions

1. What money values can this feature change or display?
2. Which calculation contracts govern those values?
3. Are projected/current and settled/final values clearly separated?
4. Are profile isolation rules enforced?
5. Are rounding, commission, and liability rules visible?
6. Can this feature hide uncertainty or stale values from the user?
7. Are deterministic fixtures and automated tests defined?
8. Could this feature leak sensitive data?

## Output format

Provide:

- risk summary
- severity by issue
- blocking issues
- non-blocking issues
- required evidence before approval

## Stop conditions

Stop and escalate if there is no contract, no fixture strategy, or no clear user-visible distinction between current and final value.
