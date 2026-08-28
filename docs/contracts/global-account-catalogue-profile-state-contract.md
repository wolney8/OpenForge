# Global Account Catalogue and Profile State Contract

Status: Implemented ownership boundary; master Account Catalogue is the new-selection authority

## Purpose

Plum Duff must keep provider identity separate from an individual profile's operational account.
This prevents duplicate bookmaker, exchange, and bank definitions while preserving profile
isolation and historical account state.

### Current implementation boundary

- `data/reference/master-account-catalogue.json` is the validated Fund Manager source for
  provider metadata and supports Exchange, Bank, and Bookmaker records.
- New Profile onboarding and new Profile account creation resolve Bookmakers, Exchanges and Banks
  only from the active Fund Manager Account Catalogue using stable `catalogue_id` values.
- The legacy SQLite `bookmaker_catalogue` remains a compatibility/display source for existing
  Bookie records until its references are migrated. It must not supply additional onboarding or
  Add Account options, and it must never override master-catalogue identity by display name.
- Existing legacy rows are preserved until the workbook/account reconciliation can map each one
  to a stable master-catalogue identity without inventing or silently changing a provider.

## Fund Manager-owned catalogue

The Fund Manager owns the canonical provider catalogue. A catalogue record has a stable
`catalogue_id` and may represent a Bookmaker, Exchange, or Bank. It owns:

- canonical brand and display name;
- provider type, operator/group, platform, risk team, URL, and availability metadata;
- canonical foreground/background badge colours and logo metadata;
- default exchange commission where provided by the catalogue;
- active/archived lifecycle and evidence metadata.

Catalogue records must have unique stable IDs and unique `(account_type, brand_name)` pairs.
Archiving preserves existing profile references and only prevents new selection where the
workflow requires an active provider.

## Profile-owned account state

Each account record remains profile scoped and owns:

- selected catalogue/provider reference;
- signed-up, lifecycle, access channel, restriction, and stake-limit state;
- balances, pending withdrawal, cash-inclusion state, and last balance update;
- profile-specific notes, promotion activity, and permitted commission override.

Profile records never mutate global provider metadata. A profile may only select catalogue
records compatible with its account type and operational eligibility.

Each Profile may have only one relationship to a canonical provider. Creation is rejected when
the same `catalogue_id`, or an unmigrated legacy row with the same provider name and type, already
exists for that Profile. This invariant is enforced again inside the persistence write boundary so
repeated or concurrent Create actions cannot create a second relationship.

Profile account removal is archival: the relationship is marked Archived, excluded from current
cash totals, and retained for historical ledger/audit references. The final active Exchange cannot
be removed because calculation workflows require an explicit Profile Exchange and commission.
Reactivating an archived provider updates the existing relationship rather than creating another.

Offer availability displayed for a Profile account is resolved from the existing Fund Manager
Common Bet Combo / Quick Action authority and its Profile eligibility overrides. It is not copied
into the account row as another source of provider or offer metadata.

## Transfer rules

- Global catalogue export returns the validated master source with stable IDs.
- Import must validate the whole replacement catalogue before any write, reject duplicate IDs
  or type/name pairs, and report changed/removed/archived IDs and profile-reference impact.
- A destructive catalogue replacement requires a separate explicit confirmation workflow.
- Existing profile account records retain their provider reference through stable IDs. A missing
  imported provider is a conflict, never silently recreated or re-mapped by display name.

## Settings ownership

- Fund Manager Settings: global catalogue and global template/loadout definitions.
- Profile Accounts: the sole Profile relationship/state management surface. It adds canonical
  providers, edits balances/status/restrictions, displays resolved offer availability, and archives
  relationships without exposing global provider identity fields for editing.
- Profile Settings: demographics, profile defaults, spreadsheet transfer, profile commission
  overrides, and profile eligibility/favourite loadout controls. A legacy `#accounts` deep link
  redirects to Profile Accounts rather than maintaining a second account editor.
- Profile lookup lists must not create global providers, exchanges, groups, or platforms.

## Import boundary

Profile spreadsheet import resolves provider names and aliases against the Fund Manager Account
Catalogue. It may create Profile account state only after staging, reconciliation, explicit
confirmation, and conflict review. It must not create a new canonical provider from a workbook
value. Workbook rows supply Profile-owned status, restrictions, balances and ledger activity;
they do not supply or replace global provider identity.
