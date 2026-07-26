# OpenForge Future Subscriber Access Model

_Last updated: 2026-06-30_

## Status

- deferred future platform capability
- not part of current MVP
- planning only

## Purpose

This document captures a later platform expansion where OpenForge supports subscriber-facing access in addition to the Fund Manager/operator workflow.

The goal is to preserve the current approved MVP direction:

- one Fund Manager/operator
- profile-scoped tracker workflows
- aggregate control through `/profiles`

while defining a safe path to later subscriber access without weakening profile isolation.

## Future user modes

### 1. Fund Manager

Current approved role:

- logs in
- creates profiles
- opens a selected profile
- performs tracker workflows
- reviews profile-specific and combined reporting
- retains full operational control over managed profiles

### 2. Managed subscriber

Deferred future role:

- logs in to a subscriber-facing view
- is linked to one or more managed profiles owned by a Fund Manager
- sees a read-only subset of approved tracker and reporting data
- sees only their own linked profile data
- cannot edit operational tracker rows
- cannot see other subscribers or other Fund Manager data

### 3. Self-service subscriber

Deferred future role:

- signs up via secure invite or later approved sign-up flow
- completes registration and funding review before profile activation
- operates their own isolated profile tracker
- may be subject to a higher investment fee and an additional platform fee
- may have fewer administrative capabilities than a Fund Manager
- still uses the same underlying tracker model with strict profile isolation

## Role model draft

Recommended future role set:

- `fund_manager`
- `managed_subscriber_read_only`
- `subscriber_self_service`

Recommended relationship model:

- a Fund Manager may own many profiles
- a managed subscriber may be linked to one or more specific profiles
- a self-service subscriber may own their own profile set but not gain Fund Manager visibility

## Access model boundaries

### Managed subscriber read-only boundary

Managed subscribers should be able to:

- log in
- see their linked profile summary
- see approved performance metrics
- see approved reports and progress views
- see approved non-sensitive tracker data
- suggest mug-bet preferences or candidate mug bets only when the Fund Manager enables that future permission

Managed subscribers should not be able to:

- create profiles
- edit tracker rows
- edit balances
- edit notes intended for internal Fund Manager operations only
- see combined cross-profile control data outside their own allowed scope
- see other subscribers or other Fund Manager-owned profiles
- approve, convert, or settle their own mug-bet suggestions

### Self-service subscriber boundary

Self-service subscribers should be able to:

- access only their own isolated tracker
- perform approved tracker workflows for their own profile context
- see their own reports and metrics
- complete an approved registration/onboarding workflow before profile activation

Self-service subscribers should not be able to:

- access other subscriber profiles
- access Fund Manager combined control surfaces unless explicitly approved later
- bypass fee policy or platform fee logic
- create an active profile or approve funding without Fund Manager review

## Data-visibility model draft

Recommended future visibility tiers:

- `internal_operational`
  - full Fund Manager tracker details
- `subscriber_read_only`
  - approved safe subset for managed subscribers
- `subscriber_self_service`
  - approved editable self-service subset

Examples of likely subscriber-visible data:

- profile display name
- starting/carry-over bankroll summaries where approved
- gross profit
- net earnings or post-fee earnings views
- selected-range summaries
- weekly/monthly reports
- open-position summaries
- progress and performance trends

Examples of likely Fund Manager-only data unless later approved:

- internal audit notes
- manual override reasoning
- internal operational health notes
- cross-profile operator controls
- import batch details
- calculation audit raw payloads

## Future fee model direction

The later subscriber-facing platform may require:

- higher investment fee for self-service subscribers
- additional platform fee

Recommended future fee outputs:

- gross profit
- deductions/top-ups/withdrawals
- base earnings before subscriber-specific fees
- investment fee amount
- platform fee amount
- post-fee subscriber earnings

Important rule:

- fee application should remain a reporting/analytics concern, not a row-level bet-calculation concern

## Future mug-bet participation direction

Subscriber mug-bet participation is deferred and must remain Fund-Manager-reviewed.

Stage 1 should allow a subscriber to:

- suggest mug-bet aggressiveness and frequency
- suggest candidate mug bets
- see the review state of their own suggestions

Stage 1 must not allow a subscriber to:

- alter existing sportsbook rows
- approve their own suggestions
- see internal account-health or risk-team notes

Stage 2 should allow a subscriber to:

- log mug bets and mug activity they manually performed
- provide stake, odds, date/time, outcome and cash result
- see whether the Fund Manager accepted, corrected or rejected the activity

Stage 2 must not allow a subscriber to:

- write into another profile
- bypass Fund Manager review where the profile is managed
- silently edit locked/report-included activity
- access Fund Manager-only fee withdrawal, import, audit or combined analytics surfaces

Draft evidence:

- `docs/contracts/subscriber-mug-bet-participation-contract.md`
- `docs/fixture-specs/subscriber-mug-bet-participation-fixture-spec.md`
- `tests/fixtures/subscriber-mug-bet-participation-fixtures.json`

## Future registration and funding review direction

Subscriber registration and funding review is deferred and must remain Fund-Manager-controlled.

The planned registration workflow may allow a prospective subscriber to:

- submit demographics and contact details
- upload required documentation or image metadata through an approved private upload path
- enter how much they will fund themselves
- optionally tick a registration checkbox to request Fund-Manager-provided starting funds

The Fund Manager must be able to:

- review submitted details and document metadata
- approve, decline, archive or request more information
- create or link a profile only after review
- confirm whether the profile is subscriber-funded, Fund-Manager-float-funded or hybrid-funded
- apply only approved fee/recovery policies

Funding must not be modelled as part of profile tiers. Tiers/packages may exist elsewhere for fees
or service levels, but the subscriber funding request is a registration-form decision: the
subscriber states their own funding amount, optionally requests Fund-Manager-provided funding, and
the Fund Manager decides after reviewing registration documents.

Funding terminology must remain careful. A subscriber request for a "loaned amount" should be
modelled as a `fund_manager_provided_float_request` until legal/accounting approval confirms
whether Plum Duff can support a loan-like product. No repayment, recovery, higher-fee or priority
profit rule may be implemented without its own approved contract and fixtures.

Registration must not allow:

- public open sign-up
- automatic profile activation
- automatic funding approval
- raw document fixtures
- public storage of uploaded documents
- hidden fee uplift or repayment logic
- subscriber access to Fund Manager-only review notes

Draft evidence:

- `docs/contracts/subscriber-registration-and-funding-review-contract.md`
- `docs/fixture-specs/subscriber-registration-and-funding-review-fixture-spec.md`
- `tests/fixtures/subscriber-registration-and-funding-review-fixtures.json`

## Invite and onboarding direction

Deferred future subscriber onboarding should use:

- secure invite flow
- explicit profile linkage
- explicit role assignment

Not approved in current MVP:

- public open sign-up
- production multi-tenant billing
- broad SaaS onboarding flows

## Route direction for later planning

Possible later route families:

- `/login`
- `/subscriber`
- `/subscriber/profiles/:profileId`
- `/subscriber/profiles/:profileId/reports`
- `/subscriber/profiles/:profileId/progress`

These are deferred and should not replace the approved MVP route model.

## Risks to prevent

- subscriber access accidentally exposing other profiles
- read-only mode accidentally sharing internal Fund Manager notes
- fee logic being inconsistently applied between Fund Manager and subscriber views
- self-service subscribers getting access to control surfaces intended only for Fund Managers
- subscriber-facing routes weakening the approved profile-isolation contract
- document upload handling exposing sensitive identity or funding material
- Fund-Manager-provided float being treated as an approved loan/recovery product without legal/accounting approval

## Recommended later planning slices

1. subscriber role and relationship model
2. subscriber data-visibility matrix
3. managed subscriber read-only workflow
4. self-service subscriber workflow
5. subscriber fee-aware earnings contract
6. invite/auth boundary planning
7. subscriber mug-bet preferences, suggestions and activity logging
8. subscriber registration, document review and funding request processing
