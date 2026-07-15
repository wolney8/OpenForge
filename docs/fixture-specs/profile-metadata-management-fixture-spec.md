# Fixture Spec: Profile Metadata Management

_Last updated: 2026-07-15_

## Contract covered

- `docs/workflows/profile-metadata-management-workflow-contract.md`
- `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| PM-001 | Active profile changed to Pending | Status persists; one profile audit row |
| PM-002 | Display name changed | Owning profile changes; other profiles unchanged |
| PM-003 | Management 35 and investment 10 | Both persist as percentage-point decimals |
| PM-004 | Management 80 and investment 30 | Rejected because combined fees exceed 100 |
| PM-005 | Edit cancelled | No persistence or audit row |
| PM-006 | Unknown status | Rejected by status authority |
