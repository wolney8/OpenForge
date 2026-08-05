# Fixture Spec: Account Health Intelligence

_Last updated: 2026-08-03_

## Contract covered

- `docs/contracts/account-health-intelligence-contract.md`

## Purpose

Define deterministic synthetic fixtures for evidence-backed profile account health and capability classification.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| AHI-001 | Healthy active account | usable for sportsbook, casino, withdrawal and reload workflows |
| AHI-002 | Soft-restricted account | usable with warning and stake-limit band |
| AHI-003 | `0.50` ARB stake limit | ARB viability blocked, ordinary low-stake use may remain warning-only |
| AHI-004 | Login-restricted account | all operational use blocked |
| AHI-005 | Delayed withdrawal | withdrawal warning shown without changing P&L |
| AHI-006 | Stale evidence | capability confidence lowered and review task raised |
| AHI-007 | Conflicting observations | review required until Fund Manager resolves |
| AHI-008 | Profile isolation | another profile's restriction evidence is ignored |

## Notes

- Fixtures must use synthetic bookmaker names and profile ids.
- Evidence text must be safe and must not include real account screenshots, login data or personal details.
- Money values are capability evidence, not P&L.
