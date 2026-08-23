# Product Contract: Account Health Intelligence

_Last updated: 2026-08-03_

## Status

- Status: Draft
- Human approval required before implementation: Yes
- Module: Tracker accounts
- Profile scoped: Yes
- Money-impacting: Indirectly; any displayed stake limit or withdrawal amount requires fixtures and tests
- Related existing contract: `docs/contracts/account-health-review-contract.md`

## Purpose

Account Health Intelligence records evidence-backed bookmaker, exchange and bank account capability so the Fund Manager can decide whether a profile can safely use an offer, reload, mug bet, ARB, extra-place bet or withdrawal workflow.

It must explain the current account state, not just overwrite it.

## Scope

Included:

- active, pending, gubbed, blocked, limited and restricted account states;
- bonus restriction, stake restriction, KYC block, risk block, withdrawal restriction and login restriction evidence;
- observed maximum stakes including very low ARB limits such as `0.50`;
- withdrawal delay or payment friction observations;
- stale, insufficient or conflicting evidence;
- commercial viability classification for offer families.

Excluded until later approval:

- bookmaker login automation;
- scraping bookmaker account pages;
- storing passwords, session cookies, MFA secrets, bank/card data or KYC documents;
- automatically placing or confirming bets.

## Inputs

| Field | Required | Source | Notes |
|---|---:|---|---|
| `profile_id` | Yes | app context | mandatory isolation key |
| `account_id` | Yes | profile account | bookmaker/exchange/bank account |
| `bookmaker_id` | No | master catalogue | global brand metadata |
| `observed_at` | Yes | user/system | when the evidence was observed |
| `observation_type` | Yes | controlled list | stake limit, gubbed, login blocked, withdrawal delayed, etc. |
| `severity` | Yes | derived/entered | info, warning, blocked |
| `evidence_summary` | Yes | entered | short safe description |
| `amount_limit` | No | entered | max stake/deposit/withdrawal amount if relevant |
| `channel` | No | entered | web, mobile, retail |
| `confidence` | Yes | entered/derived | verified, likely, unverified |

## Derived outputs

| Output | Meaning |
|---|---|
| `can_login` | profile can access the account |
| `can_deposit` | profile can add funds |
| `can_withdraw` | profile can withdraw funds without known block |
| `can_take_bonus` | profile appears eligible for bonuses/reloads |
| `can_place_sportsbook` | profile can place sportsbook bets |
| `can_place_casino` | profile can use casino offers |
| `can_arb` | profile can place enough stake for ARB use |
| `stake_limit_band` | none, soft, severe, blocked, unknown |
| `commercial_viability_state` | good, caution, poor, blocked, unknown |
| `next_review_due_at` | when evidence should be refreshed |

## Status rules

- `Blocked`, `KYC Blocked`, `Risk Blocked` or `Login Restricted` evidence must block opportunity-first row creation unless the Fund Manager explicitly overrides in an audited future workflow.
- `Bonus Restricted` blocks reload, welcome and free-bet eligibility but may still allow mug bets, ARBs, extra places or ordinary each-way use.
- `Soft Limited` allows use with warning and must show stake-limit evidence.
- `Casino Only` and `Sportsbook Only` restrict offer families.
- `Pending Sign Up` can be selected for planning but must not be marked placed without a follow-up account setup task.
- Stale evidence must lower confidence, not silently block or approve the account.

## Audit requirements

- Every observation is append-only.
- Current capability is derived from observations and account state.
- Changing account status or restrictions creates an account audit row.
- The UI must show the observation sources that caused a block or warning.

## UI requirements

- Account-health surfaces must show a compact reason chip for warnings/blocks.
- The Fund Manager must be able to open a timeline of observations.
- The account catalogue and profile account list must remain separate: catalogue describes the brand; profile account intelligence describes this subscriber/profile's actual relationship with that brand.
- Subscriber views must not expose account intelligence until a later subscriber access contract approves specific fields.

## Tests required

- healthy account remains available;
- soft-restricted account warns but is usable;
- `0.50` ARB stake limit blocks ARB viability;
- login-restricted account blocks all operational use;
- delayed withdrawal shows warning without changing sportsbook P&L;
- stale evidence degrades confidence;
- conflicting observations require review;
- profile isolation prevents cross-profile observation leakage.

## Account Capability Intelligence and Profitability Review Engine

This section extends account health from a single account-level label into a capability-level review engine. A profile account may be restricted overall while still being commercially useful for a subset of capabilities such as casino offers, free spins, price boosts or ordinary low-stake sportsbook bets.

### Capability types

The initial capability vocabulary is:

- `LoginAccess`
- `DepositAccess`
- `WithdrawalAccess`
- `StandardSportsbookBetting`
- `ArbitrageBetting`
- `PriceBoosts`
- `ProfitBoosts`
- `GeneralSportsbookPromotions`
- `ReloadOffers`
- `BetClubs`
- `RefundOffers`
- `TwoUpOrEarlyPayout`
- `ExtraPlaces`
- `CasinoOffers`
- `FreeSpins`

Capability types should be stored as rows or controlled values, not unrelated Boolean columns. The model must allow new capability types without migrating the `accounts` table for each one.

### Capability fields

Each capability record should support:

- `capability_id`
- `profile_account_id`
- `profile_id`
- `capability_type`
- `current_state`
- `commercial_state`
- `last_checked_at`
- `last_successful_use_at`
- `last_observed_at`
- `last_profitable_use_at`
- `review_frequency`
- `next_review_at`
- `review_priority`
- `confidence`
- `evidence_count`
- `latest_observation_id`
- `notes`

### Capability operational states

- `Working`
- `WorkingWithLimits`
- `HeavilyRestricted`
- `VisibleButUnusable`
- `Unavailable`
- `Rejected`
- `Blocked`
- `NotApplicable`
- `NotChecked`
- `Unknown`
- `InsufficientTooling`

`NotChecked` must not be treated as `Unavailable`. `InsufficientTooling` must be used where the account might be usable but Plum Duff cannot yet assess the capability, for example Extra Places before a matcher/catcher or approved calculator exists.

### Account-level lifecycle and access state

Account-level state remains deliberately broad:

- `Active`
- `Restricted`
- `LoginIssue`
- `Blocked`
- `Dormant`
- `NotUsing`
- `Closed`
- `PendingSignUp`
- `NotSignedUp`
- `Unknown`

The account-level state is a summary and must not overwrite capability facts. For example, `Restricted` may coexist with standard betting working, price boosts stake-limited, casino working, ARBs rejected and withdrawals normal.

Derivation rule:

- hard access blocks such as login block or KYC block dominate account-level state;
- otherwise use capability evidence to derive `Active`, `Restricted`, `Dormant` or `Unknown`;
- if evidence is mixed or stale, show derived state plus confidence;
- manual override may change the summary state but must preserve the derived state, override reason, actor and timestamp.

### Profitability audit workflow

The Fund Manager audit workflow should support partial completion:

1. select account;
2. review login access;
3. record current balance;
4. inspect deposit access without requiring a deposit;
5. inspect withdrawal access without requiring a withdrawal;
6. review visible promotions;
7. test ordinary sportsbook stake without creating a fake sportsbook bet;
8. test a price/profit boost stake where one is available;
9. test an ARB stake only where a suitable opportunity exists;
10. record casino/free-spin availability;
11. record Extra Places, reloads, 2UP and refund-offer availability;
12. classify each tested capability;
13. derive or confirm overall commercial value;
14. assign review frequency;
15. calculate next review date.

Audit lifecycle states:

- `Planned`
- `InProgress`
- `PartiallyCompleted`
- `Completed`
- `NeedsFollowUp`
- `Abandoned`

Partial audits remain useful. Missing ARB opportunities, no visible price boost, zero balance or insufficient Extra Places tooling must not force false unavailable values.

### Audit observation fields

Capability evidence should be stored as structured observations with:

- `audit_observation_id`
- `audit_session_id`
- `profile_account_id`
- `profile_id`
- `capability_type`
- `observed_at`
- `observation_type`
- `test_context`
- `requested_stake`
- `displayed_maximum_stake`
- `submitted_stake`
- `accepted_stake`
- `odds`
- `expected_profit`
- `actual_profit`
- `offer_name`
- `offer_type`
- `public_maximum_stake`
- `personal_maximum_stake`
- `access_outcome`
- `evidence_source`
- `confidence`
- `user_notes`
- `created_at`
- `created_by`

Observation types:

- `LoginTest`
- `DepositPageCheck`
- `WithdrawalPageCheck`
- `StandardStakeTest`
- `ArbitrageStakeTest`
- `PriceBoostStakeTest`
- `ProfitBoostStakeTest`
- `PromotionVisibilityCheck`
- `CasinoOfferObserved`
- `CasinoOfferUsed`
- `FreeSpinsObserved`
- `FreeSpinsUsed`
- `ExtraPlacesAvailabilityCheck`
- `CapabilityManualReview`

### Stake access terminology

Standard sportsbook betting states:

- `Normal`
- `ReducedButUsable`
- `SmallStakesOnly`
- `MinimumStakeOnly`
- `Rejected`
- `NotChecked`
- `Unknown`

ARB states:

- `Usable`
- `LimitedButProfitable`
- `TinyStakes`
- `Rejected`
- `NoOpportunityToTest`
- `NotChecked`
- `Unknown`

Boost states:

- `FullPublicMaximum`
- `PersonallyStakeLimited`
- `VisibleButRejected`
- `Unavailable`
- `NoBoostAvailableToTest`
- `NotChecked`
- `Unknown`

The UI must show numerical evidence beside these labels, for example public maximum, personal maximum, accepted stake and expected profit.

### Commercial value model

Account-level commercial value should use explainable classifications:

- `StillProfitable`
- `WorthChecking`
- `LowValue`
- `EffectivelyDead`
- `NeedsReview`

The classification considers:

- standard betting availability;
- ARB availability;
- price/profit boost availability;
- casino/free-spin value;
- reloads, Extra Places, 2UP and refund offers;
- accepted stake size;
- recent realised profit;
- recent expected profit;
- effort required;
- opportunity frequency;
- account balance;
- access problems;
- withdrawal risk;
- evidence age;
- incomplete audits.

An explainable weighted score may be used later only if the weights are configurable and documented. The UI must show classification, score if used, main factors, confidence, missing tests and evidence age.

Manual override is allowed only with derived value, override value, reason, actor and timestamp retained.

### Profit evidence and thresholds

Small returns are not automatically worthless. A `1.00` price-boost stake producing `0.14` expected profit may be worth checking if it is quick and repeatable. Free spins producing `0.67` realised profit may justify periodic casino checks.

Configurable thresholds should include:

- `expected_profit`
- `actual_profit`
- `estimated_minutes_required`
- `expected_hourly_value`
- `opportunity_frequency`
- `user_minimum_profit_threshold`
- `user_minimum_hourly_value_threshold`

These are estimates and must be labelled as such.

### Review frequency engine

Review frequencies:

- `Weekly`
- `Fortnightly`
- `Monthly`
- `Quarterly`
- `SixMonthly`
- `Yearly`
- `ManualOnly`
- `DoNotReview`

Review frequency may be account-level, capability-level, profile default, derived recommendation or user override.

The engine derives:

- `next_review_at`
- `overdue_for_review`
- `review_priority`
- `review_reason`

Priority is elevated when:

- the account has money;
- evidence is stale;
- commercial value is high;
- capability state is unknown;
- a new relevant offer exists;
- a previously working capability has not been retested;
- withdrawal or login concern exists;
- the last audit was incomplete.

### Due-for-review queue

Initial implementation should be read-only and answer: which accounts or capabilities should I check next?

Suggested columns:

- Account
- Capability
- Current state
- Commercial value
- Last checked
- Next review
- Days overdue
- Current balance
- Recent opportunity type
- Last observed maximum stake
- Recent expected/actual profit
- Review reason
- Confidence

Suggested filters:

- due today;
- overdue;
- money held;
- still profitable;
- worth checking;
- unknown capability;
- ARBs;
- boosts;
- casino;
- Extra Places;
- operator group;
- platform;
- risk team.

Sort priority:

1. withdrawal/login risk with money held;
2. high commercial value and overdue;
3. accounts with balances;
4. unknown but potentially valuable capabilities;
5. routine low-value reviews;
6. effectively dead accounts due only for long-term recheck.

### Canonical ledger boundary

Audit observations may link to real sportsbook, free-bet or casino records when an audit leads to an actual bet or offer use. Realised P&L remains sourced from the canonical ledger, not the audit observation.

Audit observations may store expected profit, displayed stake, accepted stake and access-test evidence. They must not duplicate portfolio realised profit.

Bet-slip tests must not create fake sportsbook rows. A tested-but-not-placed access check remains an audit observation only.

### Extra Places interaction

`ExtraPlaces` is a capability even before the Extra Places calculator is implemented. Supported states include `Working`, `WorkingWithLimits`, `Unavailable`, `NotChecked` and `InsufficientTooling`.

Do not infer Extra Places profitability merely because normal horse-racing bets are accepted, enhanced places are visible or the account is active. Once Extra Places tooling exists, actual rows may feed capability evidence without duplicating P&L.

### Dashboard and detail views

Account detail should show a capability matrix with state, last evidence, max/limit, recent value and review schedule.

The guided audit view should use progressive sections:

1. Access
2. Money movement
3. Standard betting
4. ARBs
5. Boosts and promotions
6. Casino
7. Other value routes
8. Commercial review
9. Review scheduling

Dashboard widgets should include due capabilities, high-value restricted accounts, profitable capabilities by bookmaker, recent stake-limit changes, casino-only residual value, boost-only residual value, accounts becoming less usable, accounts becoming more usable, untested capabilities and accounts with money but stale reviews.
