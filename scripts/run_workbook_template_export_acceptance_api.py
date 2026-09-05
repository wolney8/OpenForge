#!/usr/bin/env python3
"""Run an isolated authenticated API for the real workbook export browser gate."""

from __future__ import annotations

import argparse
import json
import os
from hashlib import sha256
from pathlib import Path
import sqlite3
import sys
from typing import Any

import uvicorn


ROOT = Path(__file__).resolve().parents[1]
API_SOURCE = ROOT / "apps/api/src"
PROFILE_ID = "profile-working-export-browser"
OWNER_EMAIL = "workbook-export-acceptance@example.invalid"
TIMESTAMP = "2026-09-05T09:30:00+00:00"


def _database_table_fingerprints(database_path: Path) -> dict[str, str]:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    result: dict[str, str] = {}
    for record in connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'sqlite_sequence' "
        "ORDER BY name"
    ).fetchall():
        table = str(record["name"])
        rows = connection.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
        payload = [dict(row) for row in rows]
        result[table] = sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
    connection.close()
    return result


def _write_catalogue(path: Path) -> None:
    path.write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic workbook export acceptance catalogue",
                "updated_at": "2026-09-05",
                "default_operating_context": {
                    "jurisdiction": "GB",
                    "subdivision": "",
                    "channels": ["web"],
                },
                "records": [
                    {
                        "catalogue_id": "BOOKMAKER-SYNTHETIC-001",
                        "account_type": "Bookmaker",
                        "operating_jurisdictions": ["GB"],
                        "operating_subdivisions": [],
                        "operating_channels": ["web"],
                        "brand_name": "Bookmaker A",
                        "short_display_name": "Bookmaker A",
                        "risk_team": "Synthetic Risk Team",
                        "foreground_colour": "#FFFFFF",
                        "background_colour": "#455A64",
                        "source": "Synthetic acceptance fixture",
                    }
                ],
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )


def _sportsbook_payload(record_id: str, event_name: str) -> dict[str, Any]:
    return {
        "sportsbook_bet_id": record_id,
        "event_name": event_name,
        "offer_text": "Synthetic qualifying bet",
        "bookmaker": "Bookmaker A",
        "offer_type": "Signup",
        "bet_type": "Qualifying Bet",
        "offer_name": "Synthetic offer",
        "fixture_type": "Football",
        "market": "Match Odds",
        "status": "Settled",
        "result": "Won",
        "back_stake": "10.0000",
        "back_odds": "2.0000",
        "match_strategy": "Standard",
        "lay_odds_1": "2.1000",
        "lay_actual": "9.5000",
        "lay_matched_stake_1": "9.5000",
        "exchange_name": "Exchange A",
        "date_settled": "2026-09-05T09:00:00+00:00",
        "user_notes": "Synthetic sportsbook note",
        "manual_override_value": "",
        "manual_override_reason": "",
    }


def _seed_profile() -> None:
    from openforge_api.db import (  # noqa: PLC0415
        connect,
        create_account,
        create_cash_adjustment,
        create_casino_offer,
        create_free_bet,
        create_profile_with_onboarding,
        create_sportsbook_bet,
    )

    create_profile_with_onboarding(
        {
            "profile_id": PROFILE_ID,
            "display_name": "Synthetic Browser Export Profile",
            "profile_code": "SYNTHETIC-BROWSER-EXPORT",
            "tracking_start_date": "2026-01-02",
            "current_cash_snapshot": "100.0000",
            "iteration_number": 3,
            "starting_bankroll": "100.0000",
            "main_bank_catalogue_id": "BOOKMAKER-SYNTHETIC-001",
            "enabled_modules": [
                "sportsbook-bets",
                "free-bets",
                "casino-offers",
                "cash-adjustments",
            ],
            "accounts": [],
            "exchange_commissions": [
                {"exchange_name": "Exchange A", "commission_rate": "0.0200"}
            ],
            "quick_actions": [],
        }
    )
    with connect() as connection:
        connection.execute(
            "UPDATE profile_tracker_settings SET active_date_preset = 'Week (Mon-Sun)', "
            "custom_start_date = '2026-09-01', custom_end_date = '2026-09-05', "
            "range_back_days = 7, range_forward_days = 2 WHERE profile_id = ?",
            (PROFILE_ID,),
        )
    create_account(
        PROFILE_ID,
        {
            "account_id": "account-runtime-001",
            "catalogue_id": "BOOKMAKER-SYNTHETIC-001",
            "account": "Bookmaker A",
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Bonus Restricted",
            "lifecycle_status": "Active",
            "signup_offer_status": "Yes",
            "restrictions_json": '["Bonus Restricted"]',
            "current_balance": "10.2300",
            "pending_withdrawal_amount": "0.0000",
            "last_balance_update": TIMESTAMP,
            "group_name": "Synthetic Group",
            "platform": "Synthetic Platform",
            "sign_up_date": "2026-01-03",
            "notes": "Synthetic account note",
        },
    )
    create_sportsbook_bet(
        PROFILE_ID,
        _sportsbook_payload("sportsbook-runtime-imported", "Imported synthetic event"),
    )
    create_sportsbook_bet(
        PROFILE_ID,
        _sportsbook_payload("sportsbook-runtime-native", "Native synthetic event"),
    )
    create_free_bet(
        PROFILE_ID,
        {
            "free_bet_id": "free-runtime-imported",
            "event_name": "Synthetic free bet event",
            "offer_text": "Synthetic free bet",
            "bookmaker": "Bookmaker A",
            "offer_type": "Free Bet",
            "bet_type": "SNR",
            "offer_name": "Synthetic offer",
            "fixture_type": "Football",
            "status": "Settled",
            "result": "Won",
            "retention_mode": "Standard",
            "free_bet_value": "10.0000",
            "back_odds": "5.0000",
            "match_strategy": "Standard",
            "lay_odds_1": "5.1000",
            "lay_actual": "7.8000",
            "lay_matched_stake_1": "7.8000",
            "exchange_name": "Exchange A",
            "expiry_datetime": "2026-09-06T12:00:00+00:00",
            "date_settled": "2026-09-05T10:00:00+00:00",
            "origin_qual_bet_id": "sportsbook-runtime-imported",
            "offer_group_id": "DEMO-GROUP-001",
            "user_notes": "Synthetic free bet note",
            "manual_override_value": "",
            "manual_override_reason": "",
        },
    )
    create_cash_adjustment(
        PROFILE_ID,
        {
            "cash_adjustment_id": "cash-runtime-native",
            "adjustment_date": "2026-09-04",
            "direction": "In",
            "amount": "12.3400",
            "adjustment_type": "Other",
            "affects_investment": False,
            "affects_cash_snapshot": True,
            "linked_account": "Bookmaker A",
            "description": "Synthetic adjustment",
        },
    )
    create_casino_offer(
        PROFILE_ID,
        {
            "casino_offer_id": "casino-runtime-native",
            "offer_group_id": "DEMO-GROUP-002",
            "date_started": "2026-09-01T09:00:00+00:00",
            "date_settling": "2026-09-05T09:00:00+00:00",
            "expiry_datetime": "2026-09-10T09:00:00+00:00",
            "bookmaker": "Bookmaker A",
            "offer_type": "Casino",
            "offer_name": "Synthetic casino offer",
            "game": "Synthetic game",
            "cash_stake": "10.0000",
            "credit_amount": "0.0000",
            "bonus_amount": "5.0000",
            "wager_multiplier": "1.0000",
            "wager_target": "5.0000",
            "required_spins": "5",
            "spin_stake": "1.0000",
            "free_spins_awarded": "5",
            "free_spins_value": "1.0000",
            "status": "Settled",
            "result": "Completed",
            "calc_net_pnl": "2.5000",
            "final_net_pnl": "2.5000",
            "user_notes": "Synthetic casino note",
        },
    )
    with connect() as connection:
        connection.execute(
            "CREATE TABLE fund_manager_profile_links ("
            "email TEXT NOT NULL, profile_id TEXT NOT NULL, is_primary INTEGER NOT NULL, "
            "created_at TEXT NOT NULL, PRIMARY KEY (email, profile_id))"
        )
        connection.execute(
            "INSERT INTO fund_manager_profile_links VALUES (?, ?, 1, ?)",
            (OWNER_EMAIL, PROFILE_ID, TIMESTAMP),
        )
        connection.execute(
            "INSERT INTO each_way_extra_places VALUES ("
            + ",".join("?" for _ in range(32))
            + ")",
            (
                "extra-runtime-historical",
                PROFILE_ID,
                "2026-08-20T15:10:00+00:00",
                "Synthetic Runner",
                "Synthetic Race",
                "Bookmaker A",
                "Bookmaker A",
                "Extra Place",
                "5.0000",
                "10.0000",
                "",
                "",
                "",
                "",
                "Exchange A",
                "11.0000",
                "",
                "8.1800",
                "",
                "",
                "",
                "",
                "Settled",
                "Unplaced",
                "",
                "-8.6000",
                "imported_historical",
                "import-run-synthetic",
                "Sportsbook Bets:IT3-QB-0015:synthetic-fingerprint",
                "Synthetic historical migration evidence",
                TIMESTAMP,
                TIMESTAMP,
            ),
        )
        for index, row in enumerate(
            (
                {
                    "source_sheet": "Accounts",
                    "source_record_id": "IT3-AC-0007",
                    "entity_type": "account",
                    "entity_id": "account-runtime-001",
                },
                {
                    "source_sheet": "Sportsbook Bets",
                    "source_record_id": "IT3-QB-0009",
                    "entity_type": "sportsbook_bet",
                    "entity_id": "sportsbook-runtime-imported",
                },
                {
                    "source_sheet": "Free Bets",
                    "source_record_id": "IT3-FB-0004",
                    "entity_type": "free_bet",
                    "entity_id": "free-runtime-imported",
                },
            )
        ):
            connection.execute(
                "INSERT INTO profile_portable_restored_provenance "
                "(target_profile_id, sheet_name, row_key, row_json, sort_order, created_at) "
                "VALUES (?, 'Source Identities', ?, ?, ?, ?)",
                (PROFILE_ID, f"source-{index}", json.dumps(row), index, TIMESTAMP),
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--runtime-directory", type=Path, required=True)
    arguments = parser.parse_args()
    runtime = arguments.runtime_directory.resolve()
    runtime.mkdir(parents=True, exist_ok=False)
    database = runtime / "acceptance.sqlite3"
    catalogue = runtime / "catalogue.json"
    token_file = runtime / "session-token"
    baseline_file = runtime / "baseline.json"
    _write_catalogue(catalogue)

    os.environ.update(
        {
            "OPENFORGE_ACCOUNT_CATALOGUE_SOURCE": str(catalogue),
            "OPENFORGE_AUTH_OWNER_EMAILS": OWNER_EMAIL,
            "OPENFORGE_AUTH_REQUIRED": "true",
            "OPENFORGE_AUTH_SESSION_SECRET": "synthetic-acceptance-secret-that-is-not-production",
            "OPENFORGE_CORS_ALLOW_ORIGINS": "http://127.0.0.1:3110",
            "OPENFORGE_DATABASE_MODE": "local",
            "OPENFORGE_DATABASE_URL": f"sqlite:///{database}",
            "OPENFORGE_WORKBOOK_TEMPLATE_FIELD_COVERAGE": str(
                ROOT / "docs/contracts/workbook-template-export-v1-field-coverage.json"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_HELPER_SOURCE": str(
                ROOT / "_input/MB Helpers.gs"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_SOURCE": str(
                ROOT / "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_STRUCTURE_MANIFEST": str(
                ROOT / "docs/contracts/workbook-template-export-v1-ledger-structure.json"
            ),
        }
    )
    sys.path.insert(0, str(API_SOURCE))
    from openforge_api.auth import create_session_token  # noqa: PLC0415
    from openforge_api.common_bet_combos import seed_default_combos  # noqa: PLC0415
    from openforge_api.fund_manager_lookup_values import (  # noqa: PLC0415
        seed_default_authorities,
    )
    from openforge_api.main import app  # noqa: PLC0415

    _seed_profile()
    seed_default_combos()
    seed_default_authorities()
    token = create_session_token(
        subject="synthetic-workbook-export-acceptance",
        email=OWNER_EMAIL,
        name="Synthetic Fund Manager",
    )
    token_file.write_text(token, encoding="utf-8")
    token_file.chmod(0o600)
    baseline_file.write_text(
        json.dumps(
            {
                "catalogue_sha256": sha256(catalogue.read_bytes()).hexdigest(),
                "database_table_sha256": _database_table_fingerprints(database),
                "helper_sha256": sha256(
                    (ROOT / "_input/MB Helpers.gs").read_bytes()
                ).hexdigest(),
                "profile_id": PROFILE_ID,
                "template_sha256": sha256(
                    (ROOT / "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx").read_bytes()
                ).hexdigest(),
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    uvicorn.run(app, host="127.0.0.1", port=arguments.port, log_level="warning")


if __name__ == "__main__":
    main()
