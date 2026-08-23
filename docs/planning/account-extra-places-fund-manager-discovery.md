# Account Intelligence, Extra Places and Fund Manager Discovery

_Last updated: 2026-08-03_

## Status

- Status: Planning baseline
- Product name: Plum Duff
- Human approval required before implementation: Yes
- Application code changed by this document: No
- Database migration approved by this document: No

This discovery document converts the account-intelligence, extra-places and fund-manager planning prompt into repository-specific implementation guidance. It does not approve source code, schema migration or money logic implementation.

## Repository areas inspected

- Agent/process rules: `AGENTS.md`, `docs/codex/task-cadence.md`, `docs/codex/financial-safety-rules.md`
- API/persistence: `apps/api/src/openforge_api/db.py`, `accounts.py`, `bookmaker_catalogue.py`, `fund_manager_fee_periods.py`, `fee_period_store.py`
- Current database entities: `profiles`, `accounts`, `bookmaker_catalogue`, `sportsbook_bets`, `free_bets`, `casino_offers`, `cash_adjustments`, `balance_snapshots`, `fee_periods`, `fee_period_revisions`, `fee_corrections`, `fee_withdrawal_links`, `multi_profile_opportunities`
- Current web surfaces: profile dashboard, ledgers, settings, reports, account catalogue, notifications, fee review
- Current contracts and fixtures: account health review, sportsbook extra places, each way, BOG, 2UP, fund-manager fees, local backups, public offer ingestion, master account catalogue

## Existing components to reuse

- `accounts` and `account_audit` already hold profile-scoped account rows, statuses, restrictions, balances, pending withdrawals and bookmaker catalogue linkage.
- `bookmaker_catalogue` already holds global brand metadata, operator group, platform, risk team, display colours and logo path.
- `sportsbook_bets` already has fields for profit boost, bonus lock-in, multilay, reminders and combo-preset source data.
- `casino_offers` already has stake, credit, bonus, wager target, spins and final P&L fields.
- `fee_periods`, `fee_period_revisions`, `fee_corrections` and `fee_withdrawal_links` already implement monthly fee crystallisation and withdrawal audit concepts.
- `fund_manager_combo_presets` already provides common bet combo authority records that can later connect to account intelligence and opportunity templates.
- `notification-centre` and reminder patterns can be reused for account review, extra-place settlement follow-up and fund-manager task queues.

## Current gaps

- Account health is currently mostly account status plus workbook-style mug-bet recency. It does not yet model evidence-backed observations, stake limits, withdrawal delay, login friction, ARB viability or commercial value by offer family.
- Account health also needs first-class capability rows. A single label such as `Gubbed`, `Limited` or `Restricted` cannot describe mixed cases where boosts are stake-limited, casino still works, ARBs are untested and withdrawals are normal.
- Extra Places has a sportsbook current-value contract, but no wider workflow contract for opportunity setup, each-way place terms, result settlement UX, public calculator comparison or operational evidence.
- Fund Manager fees are covered for profile management/investment fees, but platform-level business finance is not yet separated into subscription revenue, owner contributions, processor fees, chargebacks, refunds, operating expenses and reconciliation.
- There is no unified feature-flag boundary for account intelligence, arbitrage tracking, extra places, fund-manager business finance, platform finance or live-odds integration.
- Subscriber visibility for account intelligence and platform finances must be explicitly denied until the subscriber-access milestone defines safe read-only surfaces.

## Naming and schema risks

- `status` is overloaded across profiles, accounts, ledgers, fee periods and reminders. New implementation should use explicit state names such as `account_operational_state`, `observation_state`, `finance_entry_state` and `extra_place_settlement_state` where new tables are proposed.
- `restrictions_json` currently stores account restrictions as a broad list. Account intelligence needs a typed observation/event stream so current capability can be traced rather than overwritten.
- `fund_manager` currently means operator of profile trackers. Platform finance adds owner/operator business accounting and must not mix platform money with subscriber/profile bankroll.
- Extra Places is not in the workbook source pack. It must be treated as an approved extension that preserves cash-first current-value semantics, not as workbook parity.

## Proposed schema

No migration is approved yet. Proposed tables are listed to guide a later schema issue.

### Account intelligence

- `account_health_observations`
  - `observation_id`, `profile_id`, `account_id`, `bookmaker_id`, `observed_at`, `observation_type`, `severity`, `source`, `evidence_summary`, `evidence_url`, `amount_limit`, `currency`, `channel`, `expires_at`, `confidence`, `created_by`, `created_at`
- `account_capability_snapshots`
  - `snapshot_id`, `profile_id`, `account_id`, `snapshot_at`, `can_login`, `can_deposit`, `can_withdraw`, `can_take_bonus`, `can_place_sportsbook`, `can_place_casino`, `can_arb`, `max_observed_stake`, `stake_limit_band`, `bonus_restriction_state`, `kyc_state`, `withdrawal_state`, `commercial_viability_state`, `source_observation_ids_json`
- `account_capabilities`
  - `capability_id`, `profile_id`, `account_id`, `capability_type`, `current_state`, `commercial_state`, `last_checked_at`, `last_successful_use_at`, `last_observed_at`, `last_profitable_use_at`, `review_frequency`, `next_review_at`, `review_priority`, `confidence`, `evidence_count`, `latest_observation_id`, `notes`, `created_at`, `updated_at`
- `account_profitability_audit_sessions`
  - `audit_session_id`, `profile_id`, `account_id`, `state`, `started_at`, `completed_at`, `derived_commercial_value`, `overridden_commercial_value`, `override_reason`, `created_by`, `created_at`, `updated_at`
- `account_profitability_audit_observations`
  - `audit_observation_id`, `audit_session_id`, `profile_id`, `account_id`, `capability_type`, `observed_at`, `observation_type`, `test_context`, `requested_stake`, `displayed_maximum_stake`, `submitted_stake`, `accepted_stake`, `odds`, `expected_profit`, `actual_profit`, `offer_name`, `offer_type`, `public_maximum_stake`, `personal_maximum_stake`, `access_outcome`, `evidence_source`, `confidence`, `user_notes`, `linked_ledger_type`, `linked_ledger_id`, `created_at`, `created_by`
- `account_health_tasks`
  - `task_id`, `profile_id`, `account_id`, `task_type`, `state`, `due_at`, `reason`, `resolved_at`, `resolved_by`, `resolution_note`

### Extra places

- `sportsbook_extra_place_terms`
  - `extra_place_terms_id`, `profile_id`, `sportsbook_bet_id`, `ordinary_place_count`, `promo_place_count`, `place_fraction_numerator`, `place_fraction_denominator`, `rule4_percent`, `dead_heat_factor`, `source`, `created_at`, `updated_at`
- `sportsbook_extra_place_legs`
  - `leg_id`, `profile_id`, `sportsbook_bet_id`, `leg_type`, `exchange_name`, `lay_odds`, `lay_stake`, `matched_stake`, `commission_rate`, `state`
- `sportsbook_extra_place_scenarios`
  - `scenario_id`, `profile_id`, `sportsbook_bet_id`, `scenario_key`, `scenario_label`, `bookmaker_pnl`, `exchange_pnl`, `net_pnl`, `is_current_value_candidate`

### Fund Manager and platform finance

- `platform_finance_accounts`
  - `platform_account_id`, `account_name`, `account_type`, `provider`, `currency`, `status`, `created_at`, `updated_at`
- `platform_finance_entries`
  - `finance_entry_id`, `entry_date`, `entry_type`, `category`, `amount`, `currency`, `direction`, `counterparty`, `linked_profile_id`, `linked_fee_period_id`, `linked_cash_adjustment_id`, `processor_fee_amount`, `state`, `notes`, `created_by`, `created_at`
- `subscriber_plan_assignments`
  - `assignment_id`, `profile_id`, `plan_id`, `plan_version`, `billing_period`, `price`, `discount_json`, `state`, `starts_at`, `ends_at`
- `platform_reconciliation_batches`
  - `batch_id`, `period_start`, `period_end`, `state`, `expected_total`, `observed_total`, `variance`, `created_at`, `completed_at`

## Proposed routes and UI modules

- `/profiles/:profileId/tracker/accounts/health`
  - account health board with account capability, latest evidence, required actions and ARB viability.
- `/profiles/:profileId/tracker/accounts/:accountId/intelligence`
  - evidence timeline, status/restriction changes, stake-limit observations and withdrawal/login issues.
- `/profiles/:profileId/tracker/accounts/review-queue`
  - read-only due-for-review queue by capability, balance risk, commercial value, evidence age and review priority.
- `/profiles/:profileId/tracker/accounts/:accountId/profitability-audit`
  - later guided audit workflow with partial-save support.
- `/profiles/:profileId/tracker/sportsbook-bets/extra-places`
  - optional filtered ledger/tooling surface for extra-place rows.
- `/profiles/:profileId/tracker/calculators/extra-places`
  - later calculator workspace entry point; bridge to sportsbook row only after fixtures are approved.
- `/fund-manager/finance`
  - platform-owner only view for subscriptions, processor fees, owner contributions, refunds, chargebacks and expenses.
- `/fund-manager/finance/reconciliation`
  - platform finance reconciliation queue.

## UX principles

- Account intelligence must show why an account is marked restricted, not only the final label.
- Capability intelligence must show mixed usefulness clearly. For example, an account can be restricted overall while price boosts remain worth checking and casino remains profitable.
- Bet-slip access tests must create audit observations only; they must not create fake sportsbook bets unless the bet is actually placed.
- Bookmaker risk-team relationships must be visible where they affect sign-up, reload or ARB recommendations.
- Extra Places must show ordinary place terms and promotional place terms side by side.
- Extra Places current value must show the conservative open value and the individual win/place/unplaced branches.
- Platform finance must never appear inside profile bankroll ledgers as ordinary P&L.
- Subscriber-facing views must hide platform finance and operational withdrawal metadata unless a later subscriber contract explicitly allows a limited disclosure.

## Calculation boundaries

- Account intelligence mostly derives state and risk classifications, not P&L. Money fields such as `max_observed_stake` and delayed withdrawal amount still require fixtures and tests before display.
- Extra Places is money-impacting and must reuse or extend `sportsbook-extra-places-current-value-contract.md` before implementation.
- Fund Manager profile fees remain under `fund-manager-fee-calculation-and-withdrawal-contract.md`.
- Platform finance is a separate accounting model and must not alter profile settled P&L, current value or cash-first sportsbook calculations.

## Pipeline and roadmap epics

### Epic A: Account Intelligence Foundation

1. Add evidence-backed account health observation contract and fixtures.
2. Add schema migration for capability rows, audit sessions, audit observations and capability snapshots.
3. Add fixture-backed derived capability state for partial audits, stale evidence, conflicting evidence and commercial value.
4. Add read-only capability matrix behind feature flag.
5. Add due-for-review queue with balance-aware priority.
6. Add guided profitability audit workflow only after persistence and read-only views are approved.
7. Connect account health to common bet combo availability and opportunity-first workflow.
8. Add notification tasks for stale evidence, withdrawal delay, login block and mug-bet cadence.

### Epic A2: Account Capability Intelligence and Profitability Review Engine

1. Slice 1: capability vocabulary and persistence plan.
2. Slice 2: audit observation fixtures and derived state.
3. Slice 3: read-only capability matrix.
4. Slice 4: due-for-review queue.
5. Slice 5: guided profitability audit.
6. Slice 6: canonical ledger linking without duplicate realised P&L.
7. Slice 7: configurable commercial scoring and recommendations.

### Epic B: Extra Places Tooling

1. Approve extra-place result vocabulary and fixture outputs.
2. Add schema for extra-place terms, legs and scenarios.
3. Build calculator panel inside sportsbook row.
4. Add dedicated calculator workspace bridge.
5. Add settlement modal for win, ordinary place, extra-place-only, unplaced, non-runner, Rule 4 and dead heat.

### Epic C: Fund Manager Platform Finance

1. Approve platform finance contract and fixtures.
2. Add platform finance schema separate from profile bankroll.
3. Add platform-owner finance route and role gate.
4. Add subscription/processor fee/refund/chargeback workflow.
5. Add reconciliation reports without changing tracker P&L.

### Epic D: Feature Flags and Access Control

1. Define feature flags for `accountIntelligence`, `arbitrageTracking`, `extraPlaces`, `fundManagerFinance`, `platformFinance`, `liveOddsIntegration`.
2. Add role/permission contract for Platform Owner, Fund Manager, Finance Admin, Support Admin, Read Only Auditor and Subscriber.
3. Add tests proving subscriber access cannot read account intelligence evidence or platform finance records unless explicitly allowed.

## Open decisions

- Whether account intelligence observations are Fund Manager-only forever or partially visible to future subscribers.
- Exact ARB viability bands and whether ARB recommendation belongs in Plum Duff or the deferred OddsForge boundary.
- Exact commercial-value thresholds for minimum profit, minimum stake, expected hourly value and review cadence.
- Whether commercial scoring should be numeric from the start or label-only until enough real audit data exists.
- Which account intelligence fields, if any, can be disclosed to subscribers later.
- Extra Places result vocabulary and settlement branch labels.
- Whether each-way and extra-place terms should be embedded in `sportsbook_bets` or normalized immediately.
- Platform finance route ownership: single Fund Manager local MVP versus later Platform Owner role.
- Whether subscription billing data is manual-only MVP or prepared for a payment provider later.

## Safe next implementation after approval

The safest first code slice is Account Intelligence Foundation, step 1 and 2:

- add `account_health_observations` and `account_capability_snapshots`;
- expose read-only derived account capability from synthetic fixtures;
- do not alter sportsbook calculations or profile reports.

This is safer than starting Extra Places because it is mostly state classification and audit, not immediate money calculation.
