# Workflow Contract: Subscriber Mug-Bet Participation

_Last updated: 2026-07-26_

## 0. Contract status

- Status: Deferred draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related milestone: M9 Platform Expansion: Subscriber Access and Self-Service
- Related fixture spec: `docs/fixture-specs/subscriber-mug-bet-participation-fixture-spec.md`
- Related fixtures: `tests/fixtures/subscriber-mug-bet-participation-fixtures.json`
- Related source: no direct workbook equivalent; extends sportsbook mug-bet workflow with subscriber-limited access

## 1. Product context

- Application: Plum Duff
- Module: Subscriber access, profile tracker, sportsbook mug-bet workflow
- Profile scoped: Yes
- Fund Manager visible: Yes
- Subscriber visible: Later, role dependent
- Approved for current implementation: No

This contract plans a later subscriber-facing capability. It must not be implemented until subscriber login, role visibility, and profile isolation are explicitly approved.

## 2. Purpose

Allow profile subscribers to participate in mug-bet activity without weakening Fund Manager control, profile isolation, or financial safety.

The planned rollout has two stages:

- Stage 1: subscribers can suggest mug-bet aggressiveness/frequency preferences and propose candidate mug bets for Fund Manager review.
- Stage 2: subscribers can log mug bets and mug activity they have manually performed, subject to Fund Manager review, correction, locking, and audit.

## 3. Non-goals

- No autonomous bet placement.
- No bookmaker login, credential storage, scraping, or session automation.
- No subscriber access to other profiles.
- No subscriber access to Fund Manager-only combined analytics.
- No subscriber edit access to Fund Manager-only notes, fee withdrawals, risk-team notes, import batches, or calculation audit internals.
- No direct subscriber change to profile account status, bankroll setup, fee package, or account catalogue records.

## 4. Roles and permissions

| Role | Stage 1 permissions | Stage 2 permissions | Restrictions |
|---|---|---|---|
| `fund_manager` | Review, accept, decline, supersede preferences and suggestions | Review, accept, correct, reject, lock, or route corrections | Full profile-owned access only inside managed profiles |
| `managed_subscriber_read_only` | Suggest preferences and candidate mug bets if enabled | Not allowed unless promoted to a logging permission | Cannot edit existing tracker rows |
| `managed_subscriber_mug_logger` | Suggest preferences and candidate mug bets | Log mug activity for linked profiles only | Cannot finalise reports, withdraw fees, edit account authorities, or edit other ledgers |
| `subscriber_self_service` | Suggest or set own preferences, subject to configured policy | Log own mug activity | Cannot access Fund Manager combined control surfaces |

Permission names are planning labels. Implementation must use the approved auth/role model when M9 is activated.

## 5. Profile isolation

Every record created by this feature must include `profile_id` and must be validated against the subscriber's allowed profile links.

Required isolation rules:

- a subscriber can only create suggestions/activity for explicitly linked profiles
- `subscriber_user_id` must be recorded for subscriber-originated data
- `fund_manager_id` or reviewer identity must be recorded for review decisions
- profile mismatch must block the write before persistence
- cross-profile comparison remains Fund Manager-only

## 6. Stage 1 workflow: preferences and suggestions

### 6.1 Mug-bet preference suggestion

Subscriber can suggest:

- mug-bet aggressiveness: `low`, `medium`, `high`
- preferred mug-bet frequency: numeric days between mug bets
- preferred account-health intent: `maintain_account`, `reduce_restriction_risk`, `manual_review_only`
- notes explaining their preference

Fund Manager can:

- accept
- decline
- supersede with Fund Manager preference
- request more information

Preference statuses:

- `draft`
- `submitted`
- `fund_manager_reviewed`
- `accepted`
- `declined`
- `superseded`

### 6.2 Mug-bet candidate suggestion

Subscriber can suggest a candidate mug bet with:

- bookmaker/account
- event name
- fixture type
- market
- stake
- odds
- proposed placement date/time
- reason
- optional external reference note

Fund Manager can:

- approve for tracking
- decline
- convert to a profile-scoped sportsbook mug-bet row
- archive

Suggestion statuses:

- `suggested`
- `under_review`
- `approved_for_tracking`
- `declined`
- `converted_to_mug_bet`
- `archived`

## 7. Stage 2 workflow: subscriber mug-bet activity logging

Subscriber can log mug activity they have manually performed:

- bookmaker/account
- event name
- fixture type
- market
- stake
- odds
- placed date/time
- settled date/time when known
- outcome
- cash result
- notes

Fund Manager can:

- accept the activity as submitted
- correct values with an audit note
- reject the activity
- lock the activity after report inclusion
- create a correction route when a locked period is affected

Activity statuses:

- `logged_by_subscriber`
- `needs_review`
- `accepted`
- `corrected_by_fund_manager`
- `rejected`
- `locked`

## 8. Data model planning

Recommended future tables or equivalent models:

### `subscriber_mug_preferences`

| Field | Required? | Notes |
|---|---:|---|
| `preference_id` | Yes | Stable id |
| `profile_id` | Yes | Mandatory isolation key |
| `subscriber_user_id` | Yes | Originating subscriber |
| `suggested_aggressiveness` | Yes | `low`, `medium`, `high` |
| `suggested_frequency_days` | Yes | Positive integer |
| `account_health_intent` | Yes | Controlled list |
| `subscriber_notes` | No | Subscriber-visible |
| `review_status` | Yes | Controlled status |
| `fund_manager_decision` | No | Fund Manager review outcome |
| `fund_manager_notes` | No | Fund Manager-only unless explicitly surfaced |
| `reviewed_by` | No | Fund Manager user id |
| `submitted_at` | Yes | Timestamp |
| `reviewed_at` | No | Timestamp |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |

### `subscriber_mug_suggestions`

| Field | Required? | Notes |
|---|---:|---|
| `suggestion_id` | Yes | Stable id |
| `profile_id` | Yes | Mandatory isolation key |
| `subscriber_user_id` | Yes | Originating subscriber |
| `bookmaker_account_id` | Yes | Must resolve inside this profile |
| `event_name` | Yes | Synthetic in fixtures |
| `fixture_type` | No | Controlled list |
| `market` | No | Free text initially |
| `stake` | Yes | Money |
| `odds` | Yes | Decimal odds |
| `proposed_placed_at` | No | Timestamp |
| `subscriber_reason` | No | Subscriber-visible |
| `status` | Yes | Controlled status |
| `fund_manager_notes` | No | Fund Manager-only unless explicitly surfaced |
| `converted_sportsbook_bet_id` | No | Set only after conversion |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |

### `subscriber_mug_activity`

| Field | Required? | Notes |
|---|---:|---|
| `activity_id` | Yes | Stable id |
| `profile_id` | Yes | Mandatory isolation key |
| `subscriber_user_id` | Yes | Originating subscriber |
| `bookmaker_account_id` | Yes | Must resolve inside this profile |
| `sportsbook_bet_id` | No | Optional linked tracker row |
| `event_name` | Yes | Synthetic in fixtures |
| `fixture_type` | No | Controlled list |
| `market` | No | Free text initially |
| `stake` | Yes | Money |
| `odds` | Yes | Decimal odds |
| `placed_at` | Yes | Timestamp |
| `settled_at` | No | Timestamp |
| `outcome` | No | `pending`, `win`, `lose`, `void` |
| `cash_result` | No | Money, may be zero or negative |
| `status` | Yes | Controlled status |
| `subscriber_notes` | No | Subscriber-visible |
| `fund_manager_review_note` | No | Required for correction/rejection |
| `reviewed_by` | No | Fund Manager user id |
| `reviewed_at` | No | Timestamp |
| `created_at` | Yes | Timestamp |
| `updated_at` | Yes | Timestamp |

## 9. Financial and calculation rules

Mug-bet participation remains money-impacting.

Required rules:

- no user-visible profit/loss output without a calculation contract and deterministic fixtures
- subscriber-entered money values must be treated as user-entered actuals, not trusted final report values
- Fund Manager review determines whether subscriber-entered mug activity is reportable
- corrections must preserve original subscriber input and corrected Fund Manager value
- locked/report-included activity cannot be silently edited
- voided/cancelled activity must be distinct from zero-profit settled activity

This contract does not define a new mug-bet P&L formula. It extends the existing sportsbook mug-bet row workflow and audit path.

## 10. Subscriber visibility rules

Subscriber-visible by default:

- their own submitted preferences
- their own submitted mug suggestions
- their own logged mug activity
- review status and approved/rejected outcome
- Fund Manager comments explicitly marked subscriber-visible

Fund Manager-only by default:

- internal account-health notes
- gub/restriction risk-team notes
- cross-profile comparisons
- fee withdrawal internals
- calculation audit payloads
- import/export metadata
- internal rejection/correction notes unless explicitly shared

## 11. Audit trail requirements

Every stage must record:

- `profile_id`
- actor user id
- actor role
- source route or workflow
- prior value and new value for corrections
- review decision
- timestamp
- contract version

## 12. Acceptance criteria

- subscriber cannot create, view, or edit records for unlinked profiles
- subscriber suggestions do not alter sportsbook ledgers until Fund Manager approval/conversion
- subscriber logged activity is marked as subscriber-originated and requires review before report inclusion
- Fund Manager correction preserves the original subscriber entry
- locked/report-included activity requires correction workflow rather than silent edit
- no credentials, bookmaker passwords, session tokens, or full bank/card details are stored

## 13. Required tests before implementation

- profile isolation tests for every read/write path
- role-permission tests for read-only, mug-logger, self-service, and Fund Manager roles
- preference review transition tests
- suggestion conversion tests
- activity correction/rejection tests
- locked-period correction tests
- subscriber visibility tests
- Playwright path for subscriber suggestion and Fund Manager review

## 14. Open questions

- exact subscriber role labels and invite/auth implementation
- whether managed subscribers can suggest mug bets by default or only when enabled per profile
- whether subscriber-visible Fund Manager comments need a separate visibility toggle
- whether self-service subscriber mug activity can be auto-reportable or still requires review
