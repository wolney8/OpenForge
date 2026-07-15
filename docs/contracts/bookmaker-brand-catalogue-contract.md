# Bookmaker Brand Catalogue Contract

Last updated: 2026-07-15

## Status

- Approved product decision: Fund Manager-global display default with optional profile override
- Related GitHub issue: `#64 Add Bookmaker Brand Catalogue and Compact Ledger Identity`
- Financial calculation impact: none

## Purpose

Provide one Fund Manager-owned bookmaker authority without mixing profile-owned operational
account data into the shared catalogue. Replace contradictory independent bookmaker, group,
platform, and risk-team entry for bookmaker accounts with a linked catalogue record.

## Ownership and isolation

- Catalogue records are Fund Manager-global and contain no profile-owned balances, status,
  restrictions, notes, credentials, or bet history.
- Profile account rows may reference one catalogue record through `bookmaker_id` and retain
  profile-specific status, balance, channel, restriction state, and audit history.
- A profile display override affects presentation only and must not alter another profile.
- Ledger rows retain their historical bookmaker text; catalogue matching enhances display but
  never rewrites historical financial records silently.

## Catalogue fields

- `bookmaker_id`
- `brand_name`
- `short_display_name`
- `legal_operator`
- `operator_group`
- `platform`
- `risk_team`
- `licence_reference`
- `licence_status`
- `canonical_domain`
- `status`: `Active` or `Archived`
- `foreground_colour`
- `background_colour`
- `logo_asset_path`: optional approved local asset only
- `source`
- `confidence`: `Verified`, `Likely`, or `Unverified`
- `last_verified_date`
- `created_at`
- `updated_at`

## Compatibility and migration

- Existing accounts and ledgers remain readable without a catalogue match.
- Local initialization creates unverified catalogue entries from distinct existing bookmaker
  names and backfills matching bookmaker account references.
- No personal or operational row data is copied into catalogue metadata.
- Archived catalogue records remain resolvable for historical accounts and ledgers.
- New bookmaker accounts select a catalogue record; catalogue-owned brand, group, and platform
  values are copied into legacy text columns for backward-compatible reporting.

## Display resolution

- Global mode: `Name`, `Brand badge`, or `Logo`.
- Profile override: `Inherit`, `Name`, `Brand badge`, or `Logo`.
- Resolved mode uses the profile override unless it is `Inherit`.
- Fallback order in `Logo` mode: approved local logo, accessible themed badge, plain name.
- Fallback order in `Brand badge` mode: accessible themed badge, plain name.
- Every visual identity retains an accessible bookmaker name and never relies on colour alone.
- Foreground/background pairs must meet WCAG AA text contrast of at least `4.5:1`.

## Safety

- Do not hotlink or copy third-party logos.
- Do not infer operator, platform, risk-team, licence, or domain facts without a source.
- Unknown imported/local values use `Unverified` confidence and blank unverifiable metadata.
- Catalogue mutation is a Fund Manager operation; subscriber access is out of scope here.

## Acceptance evidence

- migration/backfill test for an existing bookmaker account
- global catalogue CRUD and archive-preservation tests
- profile isolation test for display overrides
- account-link consistency test for brand/group/platform
- WCAG colour validation test
- Playwright coverage for catalogue management and name/badge/profile-override display
