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

Managed subscribers should not be able to:

- create profiles
- edit tracker rows
- edit balances
- edit notes intended for internal Fund Manager operations only
- see combined cross-profile control data outside their own allowed scope
- see other subscribers or other Fund Manager-owned profiles

### Self-service subscriber boundary

Self-service subscribers should be able to:

- access only their own isolated tracker
- perform approved tracker workflows for their own profile context
- see their own reports and metrics

Self-service subscribers should not be able to:

- access other subscriber profiles
- access Fund Manager combined control surfaces unless explicitly approved later
- bypass fee policy or platform fee logic

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

## Recommended later planning slices

1. subscriber role and relationship model
2. subscriber data-visibility matrix
3. managed subscriber read-only workflow
4. self-service subscriber workflow
5. subscriber fee-aware earnings contract
6. invite/auth boundary planning
