# Accounts Import Field Map Contract

Last updated: 2026-07-17

## Status

- Status: Approved implementation baseline
- Mapping version: `accounts-v1`
- Source sheet: `Accounts`
- Profile scoped: Yes
- Financial authority: `CurrentBalance` and `PendingWithdrawalAmount` are manual entered values

## Purpose

Import and export profile-owned bookmaker, exchange and bank accounts without allowing derived
workbook helpers or stale universal metadata to overwrite Plum Duff authority. Confirmed imports use
the same row selection, verified local backup, atomic write, source lineage and immutable audit
boundary as the other issue #12 ledgers.

## Field Map

| Workbook Column | Plum Duff Field | Authority | Rule |
|---|---|---|---|
| `AccountID` | source identity | Workbook | Required and preserved in import lineage |
| `Account` | `account` | Entered | Must resolve to an active master Account Catalogue record of the same type |
| `Type` | `type` | Entered | Controlled `Bookie`, `Exchange`, or `Bank` |
| `Counts In Cash Total` | `counts_in_cash_total` | Entered | Controls dashboard cash totals |
| `Channel` | `channel` | Entered | Controlled `Online`, `Retail`, or `Unknown` |
| `Status` | `status` | Entered | Controlled profile account-health status |
| `CurrentBalance` | `current_balance` | Entered financial authority | Blank means not recorded; otherwise require a valid decimal and preserve precision/sign without rounding |
| `PendingWithdrawalAmount` | `pending_withdrawal_amount` | Entered financial authority | Optional valid decimal; preserve precision and sign without rounding |
| `LastBalanceUpdate` | `last_balance_update` | Entered audit value | Optional date/date-time text from workbook |
| `LastPromoUsed` | derived | Plum Duff | Ignore as input; recompute from tracker ledgers |
| `Group` | `group_name` | Master catalogue | Workbook value is comparison-only; catalogue value wins |
| `Platform` | `platform` | Master catalogue | Workbook value is comparison-only; catalogue value wins |
| `RiskTeam` | staged comparison only | Master catalogue | Never stored on the profile account; mismatch produces a warning |
| `SignUpDate` | `sign_up_date` | Entered | Optional ISO date |
| `Notes` | `notes` | Entered | Optional profile-scoped operational notes; no credentials or secrets |

## Master Catalogue Resolution

- Match `Account` case-insensitively to `brand_name` or `short_display_name`.
- Map workbook `Bookie` to catalogue `Bookmaker`; `Exchange` and `Bank` map directly.
- Unknown or wrong-type catalogue records block confirmation. Archived records remain importable
  for historical profile parity, produce a warning, and must not be suggested for new sign-ups.
- `Group`, `Platform`, and `RiskTeam` mismatches remain visible warnings; imported account
  `group_name` and `platform` use current catalogue values.
- The import must not modify the universal Account Catalogue.

## Financial and Data Safety

- `CurrentBalance` is imported exactly as entered after decimal validation; a workbook blank remains
  blank and must not be silently converted to zero. No P&L calculation may replace it.
- `PendingWithdrawalAmount` is not converted into a cash adjustment.
- No silent rounding, currency conversion, or sign correction.
- `LastPromoUsed` is never persisted from the workbook.
- Notes must remain profile-scoped and must not contain passwords, tokens, bank credentials or card
  details.
- Existing unchanged source identities are no-ops; changed rows remain blocked until the separate
  explicit-update workflow is approved.
- Cross-profile source or native account identity collisions block.

## Export

Export the workbook-compatible fifteen-column `Accounts` shape. `LastPromoUsed` is exported as a
derived display value only when Plum Duff can compute it; otherwise it remains blank. Group,
Platform, and RiskTeam use current catalogue metadata and are non-authoritative on re-import.

## Acceptance

- valid bookmaker, exchange and bank rows stage and import into only the selected profile
- current balance and pending withdrawal round-trip without rounding
- catalogue metadata mismatch warns and catalogue authority wins
- unknown catalogue account blocks; archived historical account warns and remains importable
- `LastPromoUsed` cannot override derived state
- sign-up date and notes round-trip
- unchanged export/re-import is a no-op
- selected rows import only after verified backup; unselected rows remain audited as skipped
