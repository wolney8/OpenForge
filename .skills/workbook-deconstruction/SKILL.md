# Workbook Deconstruction

## Purpose

Use this skill when analysing the uploaded workbook and tracker-only source pack to reconstruct OpenForge tracker behaviour safely.

## Required reading order

1. `AGENTS.md`
2. `docs/codex/workbook-deconstruction-plan.md`
3. relevant `_input/` tracker-only source-pack files
4. uploaded workbook, if locally available

## Required outputs

Capture:

- sheet inventory
- header and field map
- formula hotspots
- named ranges if present
- dropdown or validation values
- dashboard KPI sources
- cross-sheet relationships
- cash-first current-value behaviour

## Safety rules

- Do not copy sensitive raw workbook content into committed outputs.
- Prefer redacted summaries and structural descriptions.
- Use synthetic examples in docs.

## Review focus

- user-entered vs calculated fields
- scenario-conservative formulas such as `MIN()` patterns
- reporting periods and aggregation logic
- places where manual overrides or notes affect outcome interpretation

## Stop conditions

Stop and escalate if the workbook and tracker-only source pack materially contradict each other.
