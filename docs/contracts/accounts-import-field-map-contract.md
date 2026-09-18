# Accounts Import Field Map Contract

**Last updated:** 2026-09-18 10:21 BST

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
| `Stake Access` | `stake_access` | Entered capability | Controlled `Normal`, `Limited`, `Severely Limited`, `Blocked`, `Not Checked`; never alters lifecycle |
| `Promo Access` | `promo_access` | Entered capability | Controlled `Full`, `Restricted`, `None`, `Not Checked`; never alters lifecycle |
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
- Apply the approved, type-scoped historical alias map before declaring a provider missing. The
  workbook name remains import provenance while the Profile Account uses the canonical catalogue
  identity. In particular, bookmaker `BetDragon` resolves to `DragonBet`; this never creates a
  second catalogue provider.
- Map workbook `Bookie` to catalogue `Bookmaker`; `Exchange` and `Bank` map directly.
- Unknown or wrong-type catalogue records block confirmation. Archived records remain importable
  for historical profile parity, produce a warning, and must not be suggested for new sign-ups.
- `Group`, `Platform`, and `RiskTeam` mismatches remain visible warnings; imported account
  `group_name` and `platform` use current catalogue values.
- The import must not modify the universal Account Catalogue.

## Financial and Data Safety

- `CurrentBalance` is imported exactly as entered after decimal validation. A workbook blank remains
  blank except for `Pending Sign Up`, where it is deterministically represented as `0.00` because
  no funded account exists yet. A Pending Sign Up account is excluded from cash totals and remains
  eligible for the existing opt-in signup Opportunity workflow. No P&L calculation may replace it.
- `PendingWithdrawalAmount` is not converted into a cash adjustment.
- No silent rounding, currency conversion, or sign correction.
- `LastPromoUsed` is never persisted from the workbook.
- The September Accounts shape maps Stake and Promo Access independently of Status. Historical
  `Soft Limited`/`Heavily Limited`/`Minimum Only` and `Some Promos`/`Boosts Only`/`No Promos`
  spellings map to the approved broad capability with an import-review warning; the source row
  remains provenance. Any other value blocks confirmation.
- Notes must remain profile-scoped and must not contain passwords, tokens, bank credentials or card
  details.
- Existing unchanged source identities are no-ops; changed rows remain blocked until the separate
  explicit-update workflow is approved.
- Import source identity is Profile-scoped. The same external record ID may exist in another
  Profile and must remain isolated; a native identity must never cross Profile boundaries.

## #109 access vocabulary and precedence

**APPROVED — IMPLEMENTED IN THE LOCAL INTEGRATION CANDIDATE**

Read-only inspection of the approved 3 September workbook found these source values:

- `Stake Access`: `Normal`, `Soft Limited`, `Heavily Limited`, `Minimum Only`, `Not Checked`,
  `Unknown`.
- `Promo Access`: `Full`, `Some Promos`, `Boosts Only`, `No Promos`, `Unknown`.

The revised recommendation separates broad capability from restriction evidence. Store one
controlled capability state for each access area, with structured restriction details and evidence
alongside it. Use `Not Checked` for no reliable observation. Do not add a second `Unknown` state:
blank or unsupported import text remains a review error/provenance fact until the user deliberately
records `Not Checked`. `LastPromoUsed` remains ledger-derived and is not part of this proposal.

### Stake Access

| Value | Plain-English meaning | Typical example | Decision support | Import representation |
|---|---|---|---|---|
| `Normal` | Ordinary stakes are accepted with no known material limit | A normal qualifying stake is accepted | Eligible subject to normal Account and offer checks | Exact controlled value |
| `Limited` | Betting remains possible but useful stakes are reduced | Stakes are accepted below the intended amount | Warn and use separately recorded restriction detail | Canonical value; map approved `Soft Limited` source text here |
| `Severely Limited` | Only materially small stakes are normally accepted | Most qualifying stakes are declined or a £1 cap is observed | Strong warning; do not assume the intended stake is available | Canonical value; map approved `Heavily Limited` and `Minimum Only` source text here while preserving the exact source value |
| `Blocked` | The Account is reachable but will not accept a bet | A bookmaker rejects all attempted stakes without a separate login/KYC lifecycle block | Exclude from stake-led opportunities | Exact controlled value |
| `Not Checked` | No current stake-access observation has been made | A newly opened Account has not been tested | Prompt verification before relying on it | Exact controlled value |

### Promo Access

| Value | Plain-English meaning | Typical example | Decision support | Import representation |
|---|---|---|---|---|
| `Full` | The normal promotion range is available | Signup and recurring promotions are offered | Eligible subject to the individual offer rules | Exact controlled value |
| `Restricted` | Promotions are selectively available | Boosts remain but Free Bets or reload offers are unavailable | Require offer-specific confirmation using separate restriction details | Canonical value; map approved `Some Promos` and `Boosts Only` source text here while preserving the exact source value |
| `None` | Promotions are unavailable | The Account can bet but receives no promotional offers | Exclude from promotion-led opportunity suggestions | Canonical value; map approved `No Promos` source text here |
| `Not Checked` | No reliable current promotion observation exists | A new or stale Account has not been checked | Do not infer offer eligibility | Exact controlled value |

### Ownership boundaries

- `Status` continues to own lifecycle and operational conditions such as Active, Pending Sign Up,
  KYC, login/risk blocks and closure. An Account blocked from login is not described merely as
  limited stake or promo access.
- A precise cap such as £1, odds-dependent/market-dependent cap or bookmaker-selected amount does
  not become an enum member. It belongs in separate nullable restriction detail: restriction kind,
  maximum amount where fixed, evidence notes, `access_observed_at` and `access_source`.
- Promo details separately record which categories remain available (for example boosts, Free Bets,
  reloads or selected promotions). `Boosts Only` is evidence beneath `Restricted`, not a top-level
  capability state.
- `Status` wins for lifecycle blocks: closed, suspended, KYC-blocked or login-blocked Accounts are
  unusable regardless of their last observed access capability. Stake `Blocked` is reserved for an
  otherwise operational Account that refuses wagers; the observation does not overwrite Status.
- Freshness belongs to `access_observed_at`, source and notes. It never creates another enum value.
- Stake and Promo Access guide eligibility; they do not mutate balances, settle activity or replace
  a user decision about a particular offer.
- Import accepts the controlled values after normal whitespace/case normalisation and the listed
  historical aliases. Unsupported text remains a blocking review item and is never silently
  coerced.

## Profile Snapshot Reconciliation

Before approval, the dry run compares every workbook Account against the selected Profile and
classifies it as create, update, unchanged, or blocked. Balance/status changes are listed
explicitly. Existing Profile Accounts absent from the workbook require one recorded strategy:
leave unchanged, archive, or deactivate. Leave unchanged is the safe default; absence never
silently deletes an Account.

The eventual approved import may replace point-in-time Profile balances and supported operational
state from the workbook snapshot. It must not copy or mutate global provider branding, operator,
platform, risk, colour, or identity metadata; those remain Account Catalogue authority.

## Export

Export the workbook-compatible `Accounts` shape including canonical Stake and Promo Access.
`LastPromoUsed` is exported as a
derived display value only when Plum Duff can compute it; otherwise it remains blank. Group,
Platform, and RiskTeam use current catalogue metadata and are non-authoritative on re-import.
The portable Profile export additionally retains structured restrictions, evidence source/notes
and the last-checked timestamp; a fresh restore validates and reopens them unchanged.

## Acceptance

- valid bookmaker, exchange and bank rows stage and import into only the selected profile
- current balance and pending withdrawal round-trip without rounding
- catalogue metadata mismatch warns and catalogue authority wins
- unknown catalogue account blocks; archived historical account warns and remains importable
- `LastPromoUsed` cannot override derived state
- sign-up date and notes round-trip
- approved capability values and structured evidence survive save/reopen and portable restore
- unsupported access text blocks rather than becoming `Unknown`
- hard Account Status blocks take precedence; Stake and Promo capability are evaluated only for an
  otherwise operational Account
- unchanged export/re-import is a no-op
- selected rows import only after verified backup; unselected rows remain audited as skipped
