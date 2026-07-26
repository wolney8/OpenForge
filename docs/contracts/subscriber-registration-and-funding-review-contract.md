# Workflow Contract: Subscriber Registration and Funding Review

_Last updated: 2026-07-26_

## 0. Contract status

- Status: Deferred draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related milestone: M9 Platform Expansion: Subscriber Access and Self-Service
- Related fixture spec: `docs/fixture-specs/subscriber-registration-and-funding-review-fixture-spec.md`
- Related fixtures: `tests/fixtures/subscriber-registration-and-funding-review-fixtures.json`
- Related source: no direct workbook equivalent; extends profile creation, subscriber access, documentation review and funding setup

## 1. Product context

- Application: Plum Duff
- Module: Subscriber registration, profile onboarding, document review and funding setup
- Profile scoped: Yes, once a registration is converted to a profile
- Fund Manager visible: Yes
- Subscriber visible: Later, role dependent
- Approved for current implementation: No

This contract plans a later subscriber registration workflow where a subscriber can submit profile setup information for Fund Manager review. It must not be implemented until subscriber auth, document handling, storage, retention and funding policy are explicitly approved.

## 2. Purpose

Allow a Fund Manager to process subscriber registration from a controlled form. The form may support:

- demographics and contact details
- document/image upload metadata
- requested funding amount
- self-funded profile setup
- managed-by-Fund-Manager profile setup
- a subscriber request for a Fund-Manager-provided funded amount where the subscriber cannot provide investment funds upfront

## 3. Non-goals

- No public open sign-up.
- No production KYC/AML decisioning.
- No automated identity verification.
- No credit underwriting or regulated lending workflow.
- No storage of raw document images in fixtures.
- No storage of full bank/card details.
- No automatic profile activation from subscriber submission.
- No automatic funding, loan approval, fee-package change or money movement.

## 4. Terminology

Avoid treating "loaned amount" as an implemented loan product until legal/accounting review is complete.

Planning terms:

- `subscriber_self_funding_amount`: the amount the subscriber says they will provide themselves
- `fund_manager_provided_float_requested`: a boolean checkbox on the registration form
- `fund_manager_provided_float_request_amount`: the amount the subscriber asks the Fund Manager/platform to provide, used only when the checkbox is selected
- `funding_model`: `subscriber_funded`, `fund_manager_provided_float`, `hybrid`, `declined`
- `recovery_model`: the approved way to recover Fund-Manager-provided float, if later approved

Potential recovery models, all deferred:

- higher management/investment fee
- fixed platform fee
- priority repayment from profits before fee calculation
- capped repayment schedule
- manual private arrangement outside Plum Duff

Any recovery model must be contract-gated before implementation.

## 5. Roles and permissions

| Role | Permissions | Restrictions |
|---|---|---|
| `fund_manager` | Review registrations, request changes, approve/decline, create/link profile, approve funding model | Must not bypass document/funding audit requirements |
| `prospective_subscriber` | Submit registration form, upload required document metadata, request funding amount | Cannot create active profile directly |
| `managed_subscriber_read_only` | View own registration status after approval where enabled | Cannot access Fund Manager-only review notes |
| `subscriber_self_service` | May complete onboarding for own profile when self-service is later approved | Cannot bypass fee/funding rules |

## 6. Registration workflow

Recommended statuses:

- `draft`
- `submitted`
- `needs_more_information`
- `under_fund_manager_review`
- `approved_pending_funding`
- `approved_profile_created`
- `declined`
- `withdrawn`
- `archived`

Required flow:

1. Subscriber completes registration form.
2. Subscriber uploads document/image metadata through an approved upload path.
3. Subscriber enters how much they will fund themselves.
4. Subscriber optionally ticks `Request Fund Manager-provided funding` and enters the requested amount.
5. Fund Manager reviews demographics, documentation metadata, funding request and risk notes.
6. Fund Manager approves, declines or requests more information after registration submission.
7. Approved registration may create or link a `profiles` record.
8. Profile remains inactive or pending until funding model is confirmed.

## 7. Data model planning

Recommended future tables or equivalent models:

### `subscriber_registrations`

| Field | Required? | Notes |
|---|---:|---|
| `registration_id` | Yes | Stable id |
| `subscriber_user_id` | Yes | Applicant/prospective subscriber |
| `fund_manager_id` | Yes | Reviewing Fund Manager |
| `profile_id` | No | Set only after profile creation/linking |
| `status` | Yes | Controlled registration status |
| `display_name` | Yes | Applicant-selected profile name or legal display label |
| `email` | Yes | Contact email |
| `phone` | No | Contact phone |
| `date_of_birth_status` | No | Store verification state, not unnecessary raw values where avoidable |
| `country_code` | Yes | ISO-3166 alpha-2 |
| `region_or_subdivision` | No | Optional jurisdiction/subdivision |
| `subscriber_notes` | No | Applicant-visible |
| `fund_manager_review_notes` | No | Fund Manager-only unless explicitly shared |
| `submitted_at` | No | Timestamp |
| `reviewed_at` | No | Timestamp |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |

### `subscriber_registration_documents`

| Field | Required? | Notes |
|---|---:|---|
| `document_id` | Yes | Stable id |
| `registration_id` | Yes | Parent registration |
| `profile_id` | No | Set after profile creation if retained |
| `document_type` | Yes | Controlled list |
| `storage_reference` | Yes | Local/private reference, not public URL |
| `original_filename` | No | Sanitised display only |
| `mime_type` | Yes | Validated allowed type |
| `file_size_bytes` | Yes | Size limit required |
| `checksum` | Yes | Integrity check |
| `review_status` | Yes | Controlled status |
| `uploaded_by` | Yes | Subscriber user id |
| `reviewed_by` | No | Fund Manager user id |
| `retention_policy` | Yes | Required before implementation |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |

Allowed document categories must be explicitly approved. Planning examples:

- `identity`
- `address`
- `funding_source`
- `bank_statement_summary`
- `risk_acknowledgement`
- `other_supporting_document`

### `subscriber_funding_requests`

| Field | Required? | Notes |
|---|---:|---|
| `funding_request_id` | Yes | Stable id |
| `registration_id` | Yes | Parent registration |
| `profile_id` | No | Set after profile creation |
| `subscriber_self_funding_amount` | Yes | Money entered by subscriber, can be zero |
| `fund_manager_provided_float_requested` | Yes | Registration checkbox |
| `fund_manager_provided_float_request_amount` | No | Money entered only when checkbox is selected |
| `fund_manager_approved_float_amount` | No | Money set only by Fund Manager after review |
| `funding_model` | Yes | Controlled list |
| `recovery_model` | No | Deferred and must be approved |
| `fee_adjustment_policy_id` | No | Later M10/M9 policy link |
| `status` | Yes | Controlled status |
| `fund_manager_decision` | No | Approved/declined/more info |
| `decision_note` | No | Required for decline or float approval |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |

Funding request statuses:

- `draft`
- `submitted`
- `needs_more_information`
- `approved_subscriber_funded`
- `approved_fund_manager_float`
- `approved_hybrid`
- `declined`
- `withdrawn`

## 8. Security and data safety

Document upload handling must be designed before implementation.

Required rules:

- do not commit uploaded documents
- do not place uploaded documents under public web assets
- use local/private storage until cloud storage is explicitly approved
- store metadata/checksums in fixtures, not raw files
- validate allowed MIME types and file size
- quarantine or block unsupported files
- avoid unnecessary retention of sensitive documents
- provide deletion/retention policy before production use
- do not store full card numbers, bank login credentials, bookmaker passwords, exchange passwords, session cookies or MFA secrets

## 9. Funding and fee safety

Fund-Manager-provided float is financially and legally sensitive.

Required rules:

- no automatic approval
- no hidden repayment logic
- no silent fee uplift
- no recovery from subscriber funds without explicit approved policy
- no fee calculation changes without M10 contract/fixture updates
- display funding model and recovery model distinctly
- preserve audit trail for every approval/decline/correction

If Fund-Manager-provided float is approved later, it must have a separate calculation contract before user-visible amounts are calculated.

## 10. Subscriber visibility rules

Subscriber-visible by default:

- their own registration status
- their own submitted form values
- document review status
- funding request status
- Fund Manager comments explicitly marked subscriber-visible

Fund Manager-only by default:

- internal review notes
- risk notes
- rejection rationale not marked subscriber-visible
- document storage internals
- cross-profile comparison
- fee-package internals
- funding recovery calculations until approved for subscriber view

## 11. Audit trail requirements

Every registration, document review and funding decision must record:

- actor user id
- actor role
- registration id
- profile id when available
- prior value and new value for status/funding/document review changes
- timestamp
- reason for decline, approval with float, or manual correction
- contract version

## 12. Acceptance criteria

- subscriber cannot create an active profile without Fund Manager approval
- submitted documents are represented by safe metadata only in tests/fixtures
- Fund Manager can approve, decline or request more information
- subscriber self-funding amount and requested Fund-Manager-provided float are separated
- Fund-Manager-provided float can only be approved after registration and document review
- self-funded, Fund-Manager-float and hybrid requests are distinguishable
- profile creation/linking preserves `profile_id` isolation
- no funding model changes fee calculations without an approved calculation contract
- subscriber cannot see Fund Manager-only review notes or other profiles

## 13. Required tests before implementation

- registration status transition tests
- document metadata validation tests
- document storage path safety tests
- profile creation/linking isolation tests
- subscriber access control tests
- funding request approval/decline tests
- Fund-Manager-provided float policy gate tests
- subscriber visibility tests
- Playwright path for registration submission and Fund Manager review

## 14. Open questions

- exact document types required for first release
- retention/deletion policy for uploaded documents
- whether registration is invite-only, Fund-Manager-created, or both
- whether Fund-Manager-provided float is legally/accounting-approved
- whether float recovery is fee uplift, repayment-first, fixed fee, or manual-only
- whether there should be validation/minimums for subscriber self-funding amounts
