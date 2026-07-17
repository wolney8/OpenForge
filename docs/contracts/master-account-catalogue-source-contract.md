# Master Account Catalogue Source Contract

Last updated: 2026-07-16

## Status

- Approved authoring source: `data/reference/master-account-catalogue.json`
- Related delivery: issue `#64` and future Fund Manager Settings restructure
- Financial calculation impact: none

## Purpose

Provide one editable Fund Manager authority for known bookmakers, exchanges, and banks without
mixing universal reference metadata with profile-owned account state.

## Ownership Boundary

The master source may contain public or Fund Manager-maintained reference metadata:

- stable catalogue id
- account type: `Bookmaker`, `Exchange`, or `Bank`
- operating jurisdictions using ISO 3166-1 alpha-2 codes such as `GB`, `IE`, and `US`
- optional ISO 3166-2 subdivision restrictions such as `US-NJ`
- operating channels using `web`, `mobile`, and `retail`
- brand and short display names
- legal operator, group, platform, and risk-team references
- licence and canonical-domain references
- active/archive state
- accessible display colours and approved local logo path
- source, confidence, and verification date

It must never contain profile ids, balances, restrictions, account-health state, credentials,
personal data, cookies, tokens, or login details. Those remain profile-scoped database records.

## Runtime Behaviour

- `GET /account-catalogue/source` reads and validates the JSON file on every request.
- `POST /account-catalogue/source/records` adds one validated Fund Manager catalogue record.
- `PUT /account-catalogue/source/records/:catalogueId` edits or archives one record while keeping
  its stable catalogue id.
- Every successful add or edit creates a timestamped local backup of the previous JSON source and
  replaces the source atomically only after full-catalogue validation passes.
- The Fund Manager Account Catalogue editor is the in-platform authoring surface for Bookmaker,
  Exchange, and Bank records. Profile account status, balances, restrictions, and credentials are
  not editable there.
- `default_operating_context` provides the immediate Fund Manager-wide jurisdiction, optional
  subdivision, and channel setting. Blank values disable catalogue-driven suggestions safely.
- Valid external file changes become available after the consuming screen reloads; API restart is
  not required.
- Exchange and Bank entries may populate universal choices in profile Accounts editors.
- Bookmaker source rows do not silently overwrite the linked database catalogue or historical
  account rows.
- A future Fund Manager Settings synchronisation action must show an add/change/archive preview,
  require explicit confirmation, create a verified backup, and audit the result.
- Runtime profile-account or legacy bookmaker-database edits must not be silently exported back
  into the authoring file.
- An empty jurisdiction or channel list means availability is unverified and blocks automatic
  recommendation; it never means worldwide or all-channel availability.
- A provider is eligible only when the profile jurisdiction and at least one enabled profile
  channel match. Providers with subdivision restrictions additionally require a matching profile
  subdivision.

## Validation

- schema version is `1.0`
- catalogue ids are unique and contain letters, numbers, or hyphens only
- brand names are unique within an account type
- jurisdictions use ISO alpha-2 codes; `IRE`, `USA`, and currency code `EUR` are invalid
- subdivisions use ISO 3166-2-style codes where country-level availability would be misleading
- channels are explicit `web`, `mobile`, and/or `retail` values; do not use a magic `all` value
- account type and state use controlled values
- colours use six-digit hex and meet WCAG AA `4.5:1` text contrast
- `Verified` records require at least one HTTPS evidence entry identifying the fields supported
- invalid JSON or schema returns a blocked response and leaves runtime records unchanged

## Completeness

The catalogue is a maintained authority, not a claim that every currently operating provider has
been independently verified. New or uncertain entries must use `Unverified` confidence until the
Fund Manager supplies an approved source.

## Authoring and Deferred Database Synchronisation

Direct Fund Manager JSON authoring is implemented with validated add, edit, archive/restore, and
local backup behaviour. Hard deletion is intentionally unavailable so historical references remain
resolvable.

The separate database synchronisation phase must still add:

- preview/import from the JSON source
- explicit add, update, and archive selections
- conflict handling for linked historical records
- export of a safe catalogue copy
- Bookmaker, Exchange, and Bank database links using a general account-catalogue id

## Gated Profile Availability Settings

Recommended model, pending explicit profile-architecture approval:

- Fund Manager defaults:
  - `default_operating_jurisdiction`, for example `GB`
  - optional `default_operating_subdivision`
  - `default_operating_channels`, for example `web` and `mobile`
- Profile overrides:
  - `operating_jurisdiction_override`
  - optional `operating_subdivision_override`
  - `operating_channels_override`
- Resolved profile availability inherits Fund Manager defaults unless an explicit profile override
  exists.
- These are operating-eligibility settings, not proof of residence, identity, licence eligibility,
  or a postal address.
- Changes must be Fund Manager-only, audited, and must not rewrite historical account or bet rows.
- Unknown provider availability must remain excluded from automated recommendations but may be
  manually reviewed by the Fund Manager.

`To confirm`: whether each profile may override jurisdiction and channels independently, or whether
the MVP should enforce one Fund Manager-wide jurisdiction/channel set for every managed profile.
