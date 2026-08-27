# Workflow Contract: Founder Profile Onboarding and Operational Migration

_Last updated: 2026-08-27_

## Status and scope

- Status: Planned; implementation requires a secure hosted runtime and owner authentication.
- Owner: Fund Manager.
- Profile scoped: Yes.
- Related planning gate: `docs/planning/founder-operational-migration-readiness.md`.
- Related authorities: `docs/contracts/fund-manager-tracker-authorities-contract.md`.

## User goal

The Fund Manager creates their own operational profile, configures its permitted modules, accounts,
balances and defaults, then safely stages and reconciles their current tracker workbook before a
parallel workbook/Plum Duff run.

## Scope

The workflow must use the existing profile model. It must not create a second registration system
or expose subscriber registration, public sign-up, account credentials, or automatic account
creation.

Required onboarding inputs:

- profile display name, code, tracking start and fee settings;
- enabled modules: Sportsbook, Free Bets and Cash Adjustments always enabled; Casino and Extra
  Place separately toggleable;
- weekly Extra Place loss budget where Extra Place is enabled;
- profile-account relationships selected from the global catalogue, with lifecycle, restriction
  and opening-value data entered explicitly;
- profile Quick Add Loadout enablement and permitted default overrides.

## Route and states

- Entry: Fund Manager Dashboard -> Add profile -> founder onboarding.
- States: `profile_details`, `modules`, `accounts_and_opening_values`, `loadouts`,
  `review_ready`, `created`.
- The importer may only open after a profile has reached `created` and has a verified pre-import
  backup.

## Migration workflow

1. Receive the operational workbook through the sensitive source path; inspect sheet names and
   headings only until a source map is approved.
2. Create the founder profile and its explicit module/account authority.
3. Map workbook sheets to the existing import contracts. Unknown source columns remain visible in
   review; they are never silently discarded.
4. Stage a dry run to the selected profile and present counts, unmatched identities, rejected
   values, date assumptions, current/final value differences and control totals.
5. Create a verified local backup. The Fund Manager explicitly approves the import.
6. Write only approved staged rows and retain source-row audit references.
7. Reconcile per-ledger row counts, settled P&L, open rows and opening values against the staged
   controls.
8. Run the workbook and Plum Duff in parallel for a defined period before retiring the workbook.

## Security and persistence gates

- Hosted migration is blocked until the Neon runtime adapter is live, verified and fail-closed.
- Hosted migration is blocked until authenticated owner sessions enforce server-side profile
  ownership on every profile, account, ledger, backup and import endpoint.
- An unlinked Google identity may not create, select or inspect tracker data.
- Local recovery access and verified local backups remain required; no silent Neon-to-SQLite
  fallback is permitted.

## Import and reporting rules

- Existing field-map and reconciliation contracts remain authoritative for each ledger.
- Imported data belongs to exactly one selected profile.
- Tracker reporting derives periods from source dates; a source workbook `Week` column is legacy
  information and must not become a required platform field.
- Financial control totals must reconcile before imported values become operationally trusted.

## Audit requirements

Audit profile creation, module changes, profile-account authority changes, opening-value entries,
dry-run creation, backup identity, import approval, import result and reconciliation outcome.
Never audit secrets or raw workbook cell dumps.

## Tests required

- founder profile creation does not bypass profile/account authority validation;
- disabled modules are unavailable to the profile but do not remove historical data;
- global catalogue edits do not mutate profile overrides;
- one profile's onboarding changes cannot affect another profile;
- import is blocked without a verified backup, approved map and explicit approval;
- staged reconciliation detects counts or financial controls that differ;
- hosted endpoints reject unauthenticated and cross-owner access.

## Playwright path

Use synthetic profiles/accounts only: create founder profile -> configure modules/accounts/opening
values -> review -> create -> start dry run -> inspect blocked/approved states. The workbook import
path must use synthetic fixtures and never a real workbook.
