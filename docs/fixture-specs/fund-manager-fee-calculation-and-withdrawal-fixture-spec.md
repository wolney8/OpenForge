# Fixture Spec: Fund Manager Fee Calculation and Withdrawal

_Last updated: 2026-07-14_

## Contract covered

- `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`

Fixtures supply approved settled/final `eligible_period_profit` explicitly. Weekly estimates, monthly crystallisation, loss carry-forward, package validation and subscriber withdrawal reserves follow the approved policy in the contract.

UI assertions must preserve the contract terminology:

- `provisional_fee_reserve` / open-month estimates display as **Estimated Fees** and are not withdrawable.
- `total_fee_due` for locked monthly periods contributes to **Fees Earned**.
- `fee_outstanding_amount` displays as **Available to Withdraw**.
- `fee_withdrawn_amount` displays as **Fees Withdrawn** in Fund Manager views.
- subscriber views display crystallised amounts as **Fees Charged** and hide physical withdrawal metadata.

| ID | Scenario | Key expectation |
|---|---|---|
| FEE-001 | Positive supplied base | Component fees use percentage-point semantics |
| FEE-002 | Negative supplied base | No negative fee entitlement |
| FEE-003 | Calculated only | Cash snapshot unchanged |
| FEE-004 | Partial received withdrawal | Outstanding fee reduced once |
| FEE-005 | Complete received withdrawal | Outstanding fee is zero |
| FEE-006 | Cross-profile withdrawal link | Link rejected |
| FEE-007 | Base not supplied | Calculation blocked pending approved reporting base |
| FEE-008 | Physical withdrawal after crystallisation | Gross cash and liability fall; subscriber net is unchanged |
| FEE-009 | Subscriber fee view | Fee disclosure shown; operational withdrawal metadata hidden |
| FEE-010 | Package percentage changes | Locked period retains snapshotted package/version and percentages |
| FEE-011 | Profit exceeds opening loss carry-forward | Only recovered excess becomes fee base |
| FEE-012 | Negative month with opening loss | Loss carry-forward increases; no fee |
| FEE-013 | Profit does not fully recover loss | Remaining loss carries forward; no fee |
| FEE-014 | Combined package fees exceed 100% | Package and calculation blocked |
| FEE-015 | Combined package fees equal 100% | Package accepted; fee components remain separate |
| FEE-016 | Mid-period subscriber withdrawal | Provisional fees and crystallised outstanding fees are reserved |
| FEE-017 | Weekly provisional breakdown | Estimate shown without fee crystallisation |
| FEE-018 | Reopen before withdrawal | Fund Manager reason creates revision 2 and retains revision 1 |
| FEE-019 | Reopen without reason | Reopen is blocked |
| FEE-020 | Reopen after withdrawal | Historical period is immutable; correction route required |
| FEE-021 | Post-withdrawal overcharge | Future fee credit is created |
| FEE-022 | Post-withdrawal undercharge | Future fee debit is created |
| FEE-023 | Closing profile with overcharge | Unused credit becomes refund due |
| FEE-024 | Fund Manager confirmation | Ready period becomes crystallised Fees Earned |
| FEE-025 | Positive weekly impact | Informational positive impact without crystallisation |
| FEE-026 | Negative weekly impact | Informational negative impact without creating a credit |
| FEE-027 | Monthly authority | Calendar month calculation remains unwithdrawable before confirmation |
| FEE-028 | Viewing range independence | Date-range changes do not alter fee-period boundaries |
| FEE-029 | Atomic partial withdrawal | Component Cash Adjustments and links are created together |
| FEE-030 | Withdrawal exceeds outstanding | Entire withdrawal is rejected without partial writes |
| FEE-031 | Linked adjustment mutation | Direct update/delete is blocked; correction workflow required |
