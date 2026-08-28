# Workflow Contract: Profile Onboarding and Founder Operational Migration

_Last updated: 2026-08-28_

## Status and scope

- Status: Reusable Profile onboarding implemented locally and awaiting Fund Manager verification. Hosted
  operational use still requires owner authentication and the Neon runtime.
- Owner: Fund Manager.
- Profile scoped: Yes.
- Related planning gate: `docs/planning/founder-operational-migration-readiness.md`.
- Related authorities: `docs/contracts/fund-manager-tracker-authorities-contract.md`.

## User goal

The Fund Manager creates an isolated Profile, configures its permitted modules, accounts, balances
and defaults, and may repeat the same workflow for later subscriber Profiles. The founder's first
Profile then safely stages and reconciles the current tracker workbook before a parallel
workbook/Plum Duff run.

## Scope

The workflow uses one reusable Profile model and is not founder-exclusive. A Fund Manager can use
it repeatedly for managed subscribers and can create an ordinary tracker Profile for their own
operational data. A later subscriber registration is a reviewed request: approval invokes the same
Profile provisioning service and schema rather than a second onboarding implementation. It must
not activate a Profile or grant access before Fund Manager approval.

Fund Manager authority belongs to the authenticated user identity and server-side role/allowlist,
not to a client-editable Profile toggle. A Fund Manager may also be linked to their own tracker
Profile, but that Profile link does not confer administrative authority. Subscriber identities are
linked only to approved Profile IDs and cannot acquire the Fund Manager role through onboarding.

Required onboarding inputs:

- profile display name, code, tracking start and fee settings;
- operating jurisdiction, initially GB, which limits selectable providers to active catalogue
  records supporting that jurisdiction;
- enabled modules: Sportsbook, Free Bets and Cash Adjustments always enabled; Casino and Extra
  Place separately toggleable;
- weekly Extra Place loss budget where Extra Place is enabled;
- profile-account relationships selected from the global catalogue, with lifecycle, restriction
  and opening-value data entered explicitly;
- at least one selected Exchange, with an explicit Profile-owned decimal commission rate for each
  selected Exchange; no silent commission default is permitted;
- required global Quick Action inheritance and up to four optional Profile favourites per enabled
  ledger. Profile-specific permitted-default overrides remain managed in Profile Settings after
  creation.

## Route and states

- Entry: Fund Manager Dashboard -> Add profile -> Profile onboarding. Later subscriber registration
  enters the same provisioning boundary only after approval.
- States: `profile_details`, `modules`, `accounts_and_opening_values`, `quick_actions`,
  `review_ready`, `created`.
- The page uses an in-page stepper, guided access, deterministic keyboard order, Cancel, and an
  unsaved-change route guard; it is not a modal.
- The importer may only open after a profile has reached `created` and has a verified pre-import
  backup.
- Profile creation persists selected accounts and Exchange commissions atomically. Existing
  Profiles use Settings > Accounts to add, reactivate or archive catalogue-backed relationships;
  the final active Exchange cannot be archived.
- The Accounts ledger Add Account editor is an equivalent canonical-provider entry point. It uses
  one grouped selector for eligible Bookmakers, Exchanges and Banks, infers immutable provider
  identity/type/group/platform from the Fund Manager Account Catalogue, and requires an explicit
  Profile Exchange commission before an Exchange relationship can be created.

## Migration workflow

1. Receive the operational workbook through the sensitive source path; inspect sheet names and
   headings only until a source map is approved.
2. Create the selected Profile and its explicit module/account authority.
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

- repeated Profile creation does not bypass Profile/account authority validation or leak state;
- disabled modules are unavailable to the profile but do not remove historical data;
- global catalogue edits do not mutate profile overrides;
- onboarding rejects a missing Exchange or missing Exchange commission without partially writing
  the Profile;
- Profile Settings account changes cannot mutate global provider metadata or remove the final
  active Exchange;
- one profile's onboarding changes cannot affect another profile;
- import is blocked without a verified backup, approved map and explicit approval;
- staged reconciliation detects counts or financial controls that differ;
- hosted endpoints reject unauthenticated and cross-owner access.

## Playwright path

Use synthetic profiles/accounts only: create two isolated Profiles -> configure modules/accounts/
opening values -> review -> create -> start founder dry run -> inspect blocked/approved states. The
workbook import path must use synthetic fixtures and never a real workbook.
