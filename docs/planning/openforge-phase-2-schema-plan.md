# OpenForge Phase 2 — Schema Plan

_Last updated: 2026-06-30_

## Status

Phase:

- `Phase 2 - Schema Planning`

Purpose:

- turn the approved workbook and profile architecture into a decision-complete schema baseline for later implementation

Implementation status:

- planning only
- no database technology or migration tool locked yet

Database direction:

- local-first database required for tracker data
- initial storage should be designed for later migration to a reliable managed online database
- schema design must avoid SQLite-only shortcuts that would block later migration

## Schema principles

1. One local operator may manage many profiles.
2. Every profile-owned tracker record must carry `profile_id`.
3. Workbook parity outranks generic app simplification.
4. Stored values and derived values must remain explicitly separated.
5. Financial overrides must remain auditable.
6. Cross-profile analytics aggregate profile-scoped outputs and must not weaken row isolation.
7. Local storage must support periodic backup and restore.
8. Database naming and typing should stay portable enough for later migration to a managed online database.

## Database storage strategy

Recommended near-term storage model:

- SQLite for local-first MVP runtime storage
- one primary local application database
- optional backup metadata/log support later if needed

Required long-term compatibility goal:

- later migration to a managed online relational database must be feasible without redesigning the domain model

Practical schema-planning implications:

- use explicit primary keys and foreign-key relationships
- avoid encoding critical structure only in JSON blobs where relational fields are clearer
- keep money/date/boolean/status fields typed consistently
- keep profile isolation explicit in the relational model
- do not rely on SQLite-specific quirks as business rules

## Local backup direction

The local tracker database should later support periodic backups.

Planning baseline:

- backup scope includes tracker data and local profile metadata
- backups should be local-first and operator-controlled
- backups should be restorable into the same schema version path
- backup files should stay outside committed repo state

Recommended later backup characteristics:

- periodic snapshot schedule
- manual backup trigger
- restore validation path
- version-aware backup metadata

Not yet approved for MVP:

- automatic cloud sync
- third-party hosted backup replication
- silent online data export

## Core platform models

### `fund_managers`

Purpose:

- local operator identity and ownership root

Required fields:

- `fund_manager_id`
- `email`
- `password_hash`
- `display_name`
- `status`
- `created_at`
- `updated_at`

Notes:

- single-operator MVP is acceptable
- schema should still support multiple operators later without redesigning profile ownership

### `profiles`

Purpose:

- top-level operational container for each subscriber/profile tracker

Required stored fields:

- `profile_id`
- `fund_manager_id`
- `display_name`
- `profile_code`
- `email`
- `phone`
- `status`
- `tracking_start_date`
- `starting_bankroll`
- `carry_over_bankroll`
- `notes`
- `management_fee_percent`
- `investment_fee_percent`
- `created_at`
- `updated_at`
- `archived_at`

Field semantics:

- `management_fee_percent` and `investment_fee_percent` are percentage-point decimals
- example: `40.00` means `40%`
- not ratio storage and not basis-point storage in MVP

Derived-only profile metrics:

- `gross_profit`
- `total_deductions`
- `total_top_ups`
- `net_earnings`
- `post_fee_earnings`
- `current_cash_snapshot`
- `current_operational_balances`
- `open_position_count`
- `overdue_count`
- `expiring_free_bet_count`
- `last_activity_at`

## Profile-owned tracker models

### `accounts`

Purpose:

- workbook parity for balances, statuses, cash totals, and account metadata

Required stored fields:

- `account_id`
- `profile_id`
- `source_account_id`
- `account_name`
- `account_type`
- `counts_in_cash_total`
- `channel`
- `status`
- `current_balance`
- `pending_withdrawal_amount`
- `last_balance_update_at`
- `last_promo_activity_ref`
- `account_group`
- `platform`
- `risk_team`
- `signup_date`
- `notes`
- `created_at`
- `updated_at`

Derived-only fields:

- profile cash snapshot contributions
- account-health rollup support fields

### `sportsbook_bets`

Purpose:

- workbook parity for qualifying bets, mug bets, no-lay rows, multi-lay rows, and current-value logic

Required stored fields:

- `sportsbook_bet_id`
- `profile_id`
- `source_qual_bet_id`
- `date_settled`
- `event_name`
- `market`
- `offer_text`
- `bookmaker`
- `offer_type`
- `bet_type`
- `offer_name`
- `fixture_type`
- `status`
- `result`
- `back_stake`
- `back_odds`
- `match_strategy`
- `exchange`
- `lay_actual`
- `lay_matched_stake_1`
- `lay_odds_1`
- `lay_odds_2`
- `lay_odds_3`
- `lay_stake_1`
- `lay_stake_2`
- `lay_stake_3`
- `lay_commission_1`
- `lay_commission_2`
- `lay_commission_3`
- `liability_1`
- `liability_2`
- `liability_3`
- `scenario_pnl_outcome_1`
- `scenario_pnl_lay_win`
- `scenario_pnl_outcome_2`
- `scenario_pnl_outcome_3`
- `match_rating`
- `calc_net_pnl`
- `final_net_pnl`
- `resolved_net_pnl`
- `lay_status`
- `counts_as_open`
- `is_overdue`
- `date_range_tag`
- `week_label`
- `related_free_bet_id`
- `offer_group_id`
- `user_notes`
- `created_at`
- `updated_at`

Schema rule:

- mug bets remain inside this table
- no separate `mug_bets` table in MVP

### `free_bets`

Purpose:

- workbook parity for `SNR`, `SR`, expiry, current value, and settlement

Required stored fields:

- `free_bet_id`
- `profile_id`
- `source_free_bet_id`
- `date_settled`
- `expiry_at`
- `event_name`
- `offer_text`
- `bookmaker`
- `offer_type`
- `bet_type`
- `offer_name`
- `fixture_type`
- `status`
- `result`
- `retention_mode`
- `free_bet_value`
- `back_odds`
- `match_strategy`
- `exchange`
- `lay_actual`
- `lay_matched_stake_1`
- `lay_odds_1`
- `lay_stake_1`
- `lay_commission_1`
- `liability_1`
- `scenario_pnl_outcome_1`
- `scenario_pnl_lay_win`
- `calc_net_pnl`
- `final_net_pnl`
- `resolved_net_pnl`
- `lay_status`
- `counts_as_open`
- `is_overdue`
- `date_range_tag`
- `week_label`
- `origin_sportsbook_bet_id`
- `offer_group_id`
- `user_notes`
- `created_at`
- `updated_at`

### `casino_offers`

Purpose:

- workbook parity for casino offer lifecycle and net-PnL reporting

Required stored fields:

- `casino_offer_id`
- `profile_id`
- `source_casino_offer_id`
- `offer_group_id`
- `date_started`
- `date_settled`
- `expiry_at`
- `bookmaker`
- `offer_type`
- `offer_name`
- `game`
- `cash_stake`
- `credit_amount`
- `bonus_amount`
- `wager_multiplier`
- `wager_target`
- `required_spins`
- `spin_stake`
- `free_spins_awarded`
- `free_spins_value`
- `status`
- `result`
- `calc_net_pnl`
- `final_net_pnl`
- `resolved_net_pnl`
- `counts_as_open`
- `is_overdue`
- `date_range_tag`
- `week_label`
- `user_notes`
- `created_at`
- `updated_at`

### `cash_adjustments`

Purpose:

- workbook parity for non-bet cash movement and retained-profit inputs

Required stored fields:

- `cash_adjustment_id`
- `profile_id`
- `source_adjustment_id`
- `adjustment_date`
- `direction`
- `amount`
- `adjustment_type`
- `affects_investment`
- `affects_cash_snapshot`
- `linked_account_id`
- `description`
- `signed_amount`
- `date_range_tag`
- `week_label`
- `created_at`
- `updated_at`

### `balance_snapshots`

Purpose:

- explicit balance history for later audit/reporting and reconciliation

Required stored fields:

- `balance_snapshot_id`
- `profile_id`
- `snapshot_at`
- `snapshot_type`
- `account_id`
- `balance_amount`
- `notes`
- `created_at`

## Support and audit models

### `profile_settings`

Purpose:

- profile-level tracker defaults and alert preferences

Required stored fields:

- `profile_settings_id`
- `profile_id`
- `default_date_preset`
- `free_bet_expiry_alert_window_days`
- `main_bank_account_ref`
- `created_at`
- `updated_at`

Planning boundary:

- keep this limited to tracker defaults and alerting
- do not silently add fee or payout policy controls here in MVP planning

### `system_settings`

Purpose:

- app-level controlled values and config derived from workbook `Settings`

Required stored fields:

- `system_setting_id`
- `config_key`
- `config_value`
- `config_type`
- `created_at`
- `updated_at`

Examples:

- date preset definitions
- adjustment types
- match strategy lists
- retention mode lists
- commission defaults

### `calculation_audit`

Purpose:

- auditable storage of money-impacting calculation context

Required stored fields:

- `calculation_audit_id`
- `profile_id`
- `entity_type`
- `entity_id`
- `calculation_name`
- `contract_version`
- `input_snapshot_json`
- `output_snapshot_json`
- `manual_override_value`
- `manual_override_reason`
- `created_at`
- `created_by`

### `import_batches`

Purpose:

- profile-targeted import tracking and reconciliation

Required stored fields:

- `import_batch_id`
- `profile_id`
- `source_filename`
- `source_type`
- `mapping_version`
- `status`
- `row_count`
- `error_count`
- `started_at`
- `completed_at`

### `backup_snapshots`

Purpose:

- later local backup/restore tracking for the tracker database

Required stored fields when implemented:

- `backup_snapshot_id`
- `created_at`
- `backup_scope`
- `schema_version`
- `storage_path`
- `status`
- `notes`

Planning note:

- this is a future operational support model, not an MVP requirement to implement immediately
- the database/storage plan should still leave room for it from the start

## Stored vs derived rules

Store when:

- value is user-entered
- value is an approved override
- value is needed for audit/reconciliation
- value is needed to preserve workbook parity and not safely recomputable later

Derive when:

- value is a report helper such as `week_label`
- value is date-range-context dependent such as `date_range_tag`
- value is a dashboard/report aggregate
- value is a profile overview metric

Special rule:

- `calc_net_pnl`, `final_net_pnl`, and `resolved_net_pnl` must remain distinct

## Isolation and query rules

- every profile-owned query must filter on `profile_id`
- every write path must derive `profile_id` from route/context, not trust arbitrary client input
- cross-profile analytics aggregate from profile-scoped results and never bypass ownership checks
- imports must require a target `profile_id`

## Combined analytics schema boundary

Combined cross-profile analytics should be read-model driven.

For MVP planning:

- do not create separate writable combined-report tables
- derive combined analytics from profile-scoped tracker and report outputs
- keep operational rows anchored to their owning profile

## Migration-readiness boundary

The local database must be treated as a first deployment target, not the final database architecture boundary.

Implementation-prep rules:

- choose portable naming and field semantics
- keep schema evolution explicit and migration-friendly
- keep backup/restore compatibility in mind for schema changes
- avoid coupling business logic to one local file path or one SQLite-only feature

Possible later managed database targets are intentionally not locked yet, but the schema should be ready for that transition.

## Validation checklist

- every tracker-owned model includes `profile_id`
- every fee-bearing field is clearly typed as percentage-point input
- every money-facing PnL field distinguishes calculated, final override, and resolved value where relevant
- mug bets remain inside sportsbook storage
- no contact address fields appear in MVP profile schema
