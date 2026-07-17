# Cash Adjustment Import Field Map Contract

Last updated: 2026-07-16

## Status

- Status: Approved implementation baseline
- Mapping version: `cash-adjustments-v1`
- Source sheet: `Cash Adjustments`
- Profile scoped: Yes
- Calculation dependency: `docs/contracts/cash-adjustment-aggregation-contract.md`

## Purpose

Import and export direct cash movements without importing workbook helper formulas as financial
authority. Every confirmed row belongs to the explicitly selected profile and is protected by the
spreadsheet-transfer backup and audit workflow.

## Field Map

| Workbook Column | Plum Duff Field | Authority | Rule |
|---|---|---|---|
| `AdjustmentID` | source identity | Workbook | Required and preserved in import lineage |
| `AdjustmentDate` | `adjustment_date` | Entered | Required reporting date |
| `Direction` | `direction` | Entered | Controlled `In` or `Out` |
| `Amount` | `amount` | Entered | Required unsigned money amount |
| `AdjustmentType` | `adjustment_type` | Entered | Controlled workbook/application type |
| `AffectsInvestment` | `affects_investment` | Entered | Boolean |
| `AffectsCashSnapshot` | `affects_cash_snapshot` | Entered | Boolean |
| `LinkedAccount` | `linked_account` | Entered | Optional account name/reference |
| `Description` | `description` | Entered | Optional human explanation |
| `SignedAmount` | derived | Plum Duff | Ignore as input; recompute from direction and amount |
| `Date Range Tag` | derived | Plum Duff | Ignore as input; recompute from active range |
| `WeekLabel` | derived | Plum Duff | Ignore as input; recompute from adjustment date |

## Validation and Safety

- Reject missing source id, date, direction, amount, or adjustment type.
- Validate through `CashAdjustmentPayload`; impossible direction/type combinations are blocked.
- Never infer direction from a signed source amount.
- Never import `SignedAmount`, `Date Range Tag`, or `WeekLabel` as stored authority.
- Compare the batch `SignedAmount` helper total against Plum Duff's contract-recomputed signed total
  under `docs/contracts/cash-adjustment-import-reconciliation-contract.md`; mismatches remain visible
  and never replace entered direction or amount.
- Existing unchanged source ids are no-ops; changed rows remain blocked pending explicit update UI.
- Cross-profile source-id collisions block.
- Only selected compatible rows may be confirmed after a verified local backup.
- Confirmed rows retain source sheet, source id, source hash, batch id, and backup id in audit.

## Export

Export workbook-compatible entered fields plus recomputed `SignedAmount` and `WeekLabel`. Exported
helper values are labelled by their column identity and remain derived on re-import.

## Acceptance

- valid incoming top-up imports with positive derived value
- valid outgoing withdrawal imports with negative derived value
- impossible direction/type combination blocks
- derived source helper columns cannot override Plum Duff calculations
- source and recomputed signed control totals are labelled separately in dry-run review
- deselected rows remain skipped and do not mutate the ledger
- profile isolation, backup, audit, export, and unchanged re-import are tested
