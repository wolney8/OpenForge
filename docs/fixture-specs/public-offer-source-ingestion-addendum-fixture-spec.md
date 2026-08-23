# Fixture Spec: Public Offer Source Ingestion Addendum

_Last updated: 2026-08-21_

## Purpose

Define synthetic reviewed-source cases for curated public offer ingestion.

## Required cases

| Case ID | Scenario | Expected |
|---|---|---|
| POSI-101 | Welcome offer from approved public source | Candidate is created with source lineage and bookmaker reconciliation state |
| POSI-102 | Duplicate reload offer from second source | Candidate is marked duplicate, not re-created as a new authoritative offer |
| POSI-103 | Discord post with incomplete terms | Candidate is marked needs review |
| POSI-104 | Rejected source candidate | Candidate remains auditable and does not enter active combos or workflows |

## Notes

- Keep all fixture offers synthetic.
- This fixture spec supplements, not replaces, `public-offer-source-ingestion-fixture-spec.md`.
