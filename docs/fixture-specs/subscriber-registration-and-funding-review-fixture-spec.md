# Fixture Spec: Subscriber Registration and Funding Review

_Last updated: 2026-07-26_

## Contracts covered

- `docs/contracts/subscriber-registration-and-funding-review-contract.md`
- `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`
- `docs/contracts/subscriber-fee-aware-earnings-contract.md`

## Purpose

Define deterministic synthetic cases for later subscriber registration, document review, profile creation/linking and funding request workflows.

These fixtures are planning evidence only. They must be converted into automated tests when M9 subscriber access and registration are activated.

## Global fixture rules

- all data is synthetic
- fixtures must contain document metadata only, never raw uploaded documents
- no credentials, full bank/card details, real addresses, real IDs or real personal data
- registration approval must be Fund Manager controlled
- funding model must be explicit and auditable
- Fund-Manager-provided float must remain policy-gated

## Fixture cases

### `SRF-001` Subscriber-funded registration approved

Purpose:

- prove a submitted registration can be approved and linked to a new profile when the subscriber provides their own funding amount

Expected assertions:

- registration becomes `approved_profile_created`
- profile is created with the correct `profile_id`
- funding model is `subscriber_funded`
- uploaded document records are metadata only

### `SRF-002` Registration needs more information

Purpose:

- prove Fund Manager can pause registration when required documentation is incomplete

Expected assertions:

- registration becomes `needs_more_information`
- missing document type is surfaced
- active profile is not created

### `SRF-003` Fund-Manager-provided float request requires approval gate

Purpose:

- prove a subscriber can tick a Fund-Manager-provided funding request without the platform treating it as automatically approved

Expected assertions:

- funding request status remains `submitted`
- profile is not active
- approval requires Fund Manager decision note
- recovery model is not inferred

### `SRF-004` Fund-Manager-provided float approved with explicit recovery model

Purpose:

- prove a float-style funding request can only be approved by the Fund Manager after registration review, with explicit funding and recovery metadata

Expected assertions:

- funding model becomes `fund_manager_provided_float`
- approved amount is recorded
- recovery model is recorded
- decision note is required
- fee calculation remains blocked unless a fee/recovery contract exists

### `SRF-005` Hybrid funding approved

Purpose:

- prove subscriber self-funding and Fund-Manager-provided float can be separated

Expected assertions:

- funding model becomes `hybrid`
- subscriber amount and Fund Manager float amount are distinct
- total starting funding matches the requested profile setup amount

### `SRF-006` Document upload rejected for unsafe metadata

Purpose:

- prove unsupported file types or public paths are blocked

Expected assertions:

- document review status becomes `rejected`
- registration remains blocked
- public storage path is rejected

### `SRF-007` Subscriber cannot approve own registration

Purpose:

- prove role boundaries prevent subscriber self-activation

Expected assertions:

- attempted approval is denied
- status remains unchanged
- audit event records denial

### `SRF-008` Declined registration remains auditable

Purpose:

- prove declined registration and funding request retain safe audit metadata

Expected assertions:

- registration becomes `declined`
- profile is not created
- decision note is retained
- subscriber-visible reason is controlled separately from Fund Manager-only notes

## Required future automated tests

- `subscriber_registration_approval_creates_profile_only_after_fund_manager_review`
- `subscriber_registration_blocks_missing_documents`
- `subscriber_registration_document_metadata_rejects_public_storage_paths`
- `subscriber_funding_request_does_not_infer_recovery_model`
- `subscriber_float_approval_requires_policy_and_decision_note`
- `subscriber_cannot_self_approve_registration`
- `subscriber_registration_visibility_hides_internal_review_notes`
