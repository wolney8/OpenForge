#!/usr/bin/env python3
"""Run an isolated authenticated API for notification persistence acceptance."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

import uvicorn


ROOT = Path(__file__).resolve().parents[1]
API_SOURCE = ROOT / "apps/api/src"
PROFILE_ID = "profile-notification-acceptance"
RECORD_ID = "sportsbook-notification-acceptance"
OWNER_EMAIL = "notification-acceptance@example.invalid"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--runtime-directory", type=Path, required=True)
    arguments = parser.parse_args()
    runtime = arguments.runtime_directory.resolve()
    runtime.mkdir(parents=True, exist_ok=False)

    os.environ.update(
        {
            "OPENFORGE_AUTH_OWNER_EMAILS": OWNER_EMAIL,
            "OPENFORGE_AUTH_REQUIRED": "true",
            "OPENFORGE_AUTH_SESSION_SECRET": (
                "synthetic-notification-acceptance-secret-not-used-in-production"
            ),
            "OPENFORGE_CORS_ALLOW_ORIGINS": "http://127.0.0.1:3120",
            "OPENFORGE_DATABASE_MODE": "local",
            "OPENFORGE_DATABASE_URL": f"sqlite:///{runtime / 'acceptance.sqlite3'}",
        }
    )
    sys.path.insert(0, str(API_SOURCE))

    from openforge_api.auth import create_session_token  # noqa: PLC0415
    from openforge_api.db import (  # noqa: PLC0415
        connect,
        create_profile_with_onboarding,
        create_sportsbook_bet,
        get_sportsbook_bet,
        update_sportsbook_partial_lay_reminder,
    )
    from openforge_api.main import app  # noqa: PLC0415

    create_profile_with_onboarding(
        {
            "profile_id": PROFILE_ID,
            "display_name": "Synthetic Notification Profile",
            "profile_code": "SYNTHETIC-NOTIFICATION",
            "tracking_start_date": "2026-09-01",
            "current_cash_snapshot": "100.00",
            "iteration_number": 1,
            "starting_bankroll": "100.00",
            "main_bank_catalogue_id": "",
            "enabled_modules": ["sportsbook-bets"],
            "accounts": [],
            "exchange_commissions": [],
            "quick_actions": [],
        }
    )
    with connect() as connection:
        connection.execute(
            "INSERT INTO fund_manager_profile_links VALUES (?, ?, 1, ?)",
            (OWNER_EMAIL, PROFILE_ID, "2026-09-06T08:00:00Z"),
        )
    create_sportsbook_bet(
        PROFILE_ID,
        {
            "sportsbook_bet_id": RECORD_ID,
            "event_name": "Synthetic persistence event",
            "offer_text": "Synthetic notification acceptance",
            "bookmaker": "Bookmaker A",
            "offer_type": "Bet & Get",
            "bet_type": "Single",
            "fixture_type": "Football",
            "status": "Placed",
            "result": "Pending",
            "back_stake": "10.00",
            "back_odds": "2.10",
            "match_strategy": "Partial Lay",
            "lay_odds_1": "2.20",
            "lay_actual": "9.63",
            "lay_matched_stake_1": "4.78",
            "exchange_name": "Exchange A",
            "date_settled": "2099-09-07T20:00:00Z",
            "user_notes": "Synthetic acceptance record",
            "manual_override_value": "",
            "manual_override_reason": "",
        },
    )
    update_sportsbook_partial_lay_reminder(
        PROFILE_ID,
        RECORD_ID,
        state="Active",
        due_at="2099-09-07T18:00:00Z",
        reason="Synthetic persistence reminder",
        resolution_note="",
        actor_id="notification-acceptance",
    )
    source = get_sportsbook_bet(PROFILE_ID, RECORD_ID)
    assert source is not None

    token = create_session_token(
        subject="synthetic-notification-acceptance",
        email=OWNER_EMAIL,
        name="Synthetic Fund Manager",
    )
    token_file = runtime / "session-token"
    token_file.write_text(token, encoding="utf-8")
    token_file.chmod(0o600)
    (runtime / "source-state.json").write_text(
        json.dumps(
            {
                "profile_id": PROFILE_ID,
                "record_id": RECORD_ID,
                "reminder_state": source.partial_lay_reminder_state,
                "reminder_due_at": source.partial_lay_reminder_due_at,
                "updated_at": source.updated_at,
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    uvicorn.run(app, host="127.0.0.1", port=arguments.port, log_level="warning")


if __name__ == "__main__":
    main()
