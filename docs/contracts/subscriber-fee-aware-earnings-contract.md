# Calculation Contract: Subscriber Fee-Aware Earnings

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Deferred draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`
- Related spreadsheet source: no direct workbook equivalent; derived from OpenForge reporting layer
- Related source-pack file: workbook-derived reporting and fee planning docs
- Related issue/task: `Define subscriber fee-aware earnings model`

## 1. Product context

- Application: OpenForge
- Module: Tracker platform
- Future/deferred module: subscriber-facing platform access
- Profile scoped: Yes
- Profile-owned table(s): `profiles`, reporting aggregates, cash-adjustment/report outputs
- Required `profile_id` handling: all subscriber-facing earnings must remain scoped to allowed profile context
- Fund Manager visible? Yes
- Subscriber/profile tracker visible? Later, role dependent

## 2. Purpose

This calculation defines later subscriber-facing earnings views where:

- a managed or self-service subscriber sees fee-aware profile earnings
- a higher investment fee and an additional platform fee may apply to self-service access

It supports:

- subscriber-facing earnings view
- post-fee reporting
- Fund Manager comparison between gross and subscriber-facing net values

## 3. Workflow context

- encountered in later subscriber-facing progress/reporting views
- recalculated when underlying report outputs or fee values change
- shown in subscriber earnings summaries and approved reports
- reporting-time logic only

## 4. Spreadsheet equivalent

- no direct workbook equivalent
- uses workbook-parity reporting outputs as the base
- extends approved OpenForge fee-aware reporting direction

## 5. Cash-first/current-value behaviour

- base earnings should inherit workbook-parity reporting outputs
- this contract does not change row-level cash-first current-value logic
- it applies fee adjustments after gross/profile earnings are derived
- current/projected vs final/settled behaviour is inherited from upstream reporting mode

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `gross_profit` | money | Yes | reporting layer | derived | Yes | pre-fee aggregate |
| `total_deductions` | money | Yes | reporting layer | derived | Yes | negative or zero aggregate |
| `total_top_ups` | money | No | reporting layer | derived | Yes | separate reporting component |
| `net_earnings_before_fee` | money | Yes | reporting layer | derived | Yes | upstream resolved value |
| `investment_fee_percent` | decimal | Yes | profile metadata | entered | Yes | percentage-point value |
| `platform_fee_percent` | decimal | No | later platform metadata | entered | Yes | percentage-point value |
| `subscriber_access_mode` | enum | Yes | role/context | derived | Yes | managed read-only or self-service |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `investment_fee_amount` | money | subscriber reports | derived | derived | fee component |
| `platform_fee_amount` | money | subscriber reports | derived | derived | fee component |
| `post_fee_earnings` | money | subscriber reports | derived | derived | subscriber-visible net output |

## 8. Formula source

- approved OpenForge reporting model
- approved profile fee semantics
- later subscriber-platform business rule

## 9. Formula

Baseline:

- `investment_fee_amount = net_earnings_before_fee * (investment_fee_percent / 100)`
- `platform_fee_amount = net_earnings_before_fee * (platform_fee_percent / 100)` when platform fee applies
- `post_fee_earnings = net_earnings_before_fee - investment_fee_amount - platform_fee_amount`

Conditional rule:

- managed subscriber views may use existing Fund Manager-managed fee configuration
- self-service subscriber views may apply higher investment fee and additional platform fee

## 10. Assumptions

- fee percentages are percentage-point values
- fee logic belongs in reporting/analytics, not row-level bet calculations
- exact managed-subscriber versus self-service fee policy remains a later approval item

## 11. Rounding rules

- fee component rounding: 2 decimal places
- post-fee earnings display: 2 decimal places
- no hidden fee rounding beyond stated component rounding

## 12. Commission rules

- not applicable directly
- commission effects are already included in upstream gross/profile earnings values

## 13. Liability/exposure rules

- not a liability calculation
- must not be conflated with bankroll, cash snapshot, or exposure

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Managed subscriber fee view | managed subscriber profile | base fee-aware earnings | Yes | Yes |
| Self-service subscriber fee view | self-service mode | higher fee + platform fee where configured | Yes | Yes |
| No platform fee | platform fee unset | investment fee only | Yes | Yes |

## 15. Status and reporting inclusion

- selected date range:
  - inherited from upstream report mode
- weekly summary:
  - supported later
- monthly summary:
  - supported later
- profile overview:
  - supported later
- cross-profile comparison:
  - Fund Manager only unless later approved

## 16. Fixtures required

- managed subscriber fee case
- self-service higher fee case
- self-service platform fee case
- zero platform fee case
- profile isolation case

## 17. Test cases

- `subscriber_fee_uses_percentage_point_values`
- `subscriber_post_fee_earnings_subtracts_investment_fee`
- `subscriber_post_fee_earnings_subtracts_platform_fee_when_present`
- `subscriber_fee_view_is_profile_scoped`

## 18. Acceptance tolerance

- money tolerance: exact to 0.01

## 19. UI display requirements

- show gross, fee components, and post-fee earnings distinctly
- do not collapse fee deductions into unlabeled net values
- make subscriber-facing fee treatment understandable and auditable

## 20. Audit trail requirements

- selected `profile_id`
- applied fee percentages
- upstream earnings inputs
- output fee amounts
- contract version
- timestamp

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm exact managed-subscriber and self-service fee policy
