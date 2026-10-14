from __future__ import annotations

import os

import psycopg
import pytest

from openforge_api.postgres_migrations import MIGRATION_ID, apply_postgres_migrations

POSTGRES_URL = os.environ.get("CP075_TEST_POSTGRES_URL", "")


def test_cp075_has_a_new_versioned_migration_marker() -> None:
    assert MIGRATION_ID == "20261014_010_universal_selected_range"


@pytest.mark.skipif(not POSTGRES_URL, reason="disposable CP-075 PostgreSQL is not configured")
def test_cp075_upgrades_existing_sportsbook_rows_and_is_idempotent() -> None:
    with psycopg.connect(POSTGRES_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute("DROP SCHEMA public CASCADE")
            cursor.execute("CREATE SCHEMA public")
    apply_postgres_migrations(POSTGRES_URL)

    with psycopg.connect(POSTGRES_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "ALTER TABLE sportsbook_bets DROP COLUMN promotion_json, "
                "DROP COLUMN wagering_contribution, DROP COLUMN bet_role, "
                "DROP COLUMN offer_group_id"
            )
            cursor.execute("DELETE FROM schema_migrations WHERE migration_id = %s", (MIGRATION_ID,))
            cursor.execute(
                """
                INSERT INTO schema_migrations (migration_id, schema_signature, checksum)
                VALUES ('20260927_008_invited_subscribers', 'old-head', 'old-checksum')
                ON CONFLICT (migration_id) DO NOTHING
                """
            )
            cursor.execute(
                """
                INSERT INTO profiles (
                  profile_id, display_name, profile_code, status, tracking_start_date,
                  management_fee_percent, investment_fee_percent, current_cash_snapshot,
                  profile_relationship
                ) VALUES (
                  'cp075-migration-profile', 'Synthetic Migration Profile',
                  'CP075-MIGRATION', 'Active', '2026-10-07', '0', '0', '0', 'Personal'
                )
                """
            )
            cursor.execute(
                "SELECT set_config('openforge.schema_capability', 'import-history-v1', true)"
            )
            cursor.execute(
                """
                INSERT INTO sportsbook_bets (
                  sportsbook_bet_id, profile_id, event_name, offer_text,
                  bookmaker, offer_type, bet_type, offer_name, fixture_type,
                  market, status, result, back_stake, back_odds, match_strategy,
                  lay_odds_1, lay_actual, lay_matched_stake_1, exchange_name, date_settled,
                  user_notes, manual_override_value, manual_override_reason,
                  created_at, updated_at
                ) VALUES (
                  'cp075-existing-bet', 'cp075-migration-profile', 'Synthetic Event', '',
                  'Bookmaker A', 'Normal', 'Single', '', 'Football',
                  'Match Odds', 'Prospecting', 'Pending', '10', '2', 'Standard',
                  '2.1', '', '', 'Exchange A', '2026-10-07T12:00:00Z', '', '', '',
                  '2026-10-07T09:00:00Z', '2026-10-07T09:00:00Z'
                )
                """
            )
    # A repeated application is the project-standard retry path.
    first_signature = apply_postgres_migrations(POSTGRES_URL)
    second_signature = apply_postgres_migrations(POSTGRES_URL)
    assert first_signature == second_signature

    with psycopg.connect(POSTGRES_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT offer_group_id, bet_role, wagering_contribution, promotion_json
                FROM sportsbook_bets WHERE sportsbook_bet_id = 'cp075-existing-bet'
                """
            )
            assert cursor.fetchone() == ("", "Standalone", "", None)
            cursor.execute(
                "SELECT COUNT(*) FROM schema_migrations WHERE migration_id = %s",
                (MIGRATION_ID,),
            )
            assert cursor.fetchone() == (1,)
