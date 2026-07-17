# Cash-First Calculation Review

## Purpose

Use this skill to verify that Plum Duff preserves the tracker's cash-first current-value calculations instead of replacing them with generic matched-betting calculator behaviour.

## Review questions

1. What is the row worth to the bankroll right now?
2. Does the logic work before settlement, after settlement, or both?
3. Are scenario outcomes calculated explicitly?
4. Does the workbook use conservative `MIN()`-style or equivalent current-value logic?
5. Are projected/current and settled/final values stored or displayed separately?
6. Are calculator/reference values separated from actual entered values?
7. Are manual overrides explicit and auditable?
8. Do reports state whether they include projected/current or settled/final values?

## Failure patterns to catch

- equal-profit lay stake logic substituted for workbook logic
- open rows treated as zero until settlement
- final P&L reused as current bankroll value
- hidden assumptions about commission or liability
- overrides that erase the underlying calculation trail

## Output format

Provide:

- preserved cash-first behaviours
- missing cash-first behaviours
- contradictions against workbook/source-pack evidence
- blocking issues before implementation approval
