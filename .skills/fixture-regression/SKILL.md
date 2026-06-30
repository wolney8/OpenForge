# Fixture Regression

## Purpose

Use this skill when creating or reviewing deterministic OpenForge fixtures for financial or workflow regression tests.

## Core rules

- Fixtures must be synthetic or anonymised.
- Fixtures must be deterministic.
- Fixtures must exercise profile isolation where relevant.
- Fixtures must cover open/pending and settled/final states where relevant.

## Fixture checklist

1. Identify the workflow or calculation contract under test.
2. Identify the minimum input rows needed.
3. Include edge cases such as voids, refunds, expiries, or manual overrides when relevant.
4. Include explicit expected outputs.
5. Include at least one cross-profile isolation case when profile-owned data is involved.
6. Avoid real personal data, secrets, or raw workbook dumps.

## Output format

Produce:

- fixture intent
- fixture records
- expected assertions
- reason each case exists

## Stop conditions

Stop and escalate if expected outputs depend on undocumented formulas or silent rounding.
