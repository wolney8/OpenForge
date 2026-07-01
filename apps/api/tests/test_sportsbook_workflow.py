from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_sportsbook_workflow_create_update_and_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "event_name": "Demo Match",
        "offer_text": "Welcome Qualifier",
        "bookmaker": "Bookmaker A",
        "offer_type": "Sign up / Welcome",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "exchange_name": "Exchange A",
        "date_settled": "2026-07-10",
        "user_notes": "Initial sportsbook workflow entry",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    create_response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["sportsbook_bet_id"]

    list_profile_one = client.get("/profiles/profile-demo-001/sportsbook-bets")
    assert list_profile_one.status_code == 200
    assert any(
        row["sportsbook_bet_id"] == created["sportsbook_bet_id"]
        for row in list_profile_one.json()
    )

    list_profile_two = client.get("/profiles/profile-demo-002/sportsbook-bets")
    assert list_profile_two.status_code == 200
    assert all(
        row["sportsbook_bet_id"] != created["sportsbook_bet_id"]
        for row in list_profile_two.json()
    )

    updated_payload = {
        **payload,
        "status": "Settled",
        "result": "Back Won",
        "manual_override_value": "-0.75",
        "manual_override_reason": "Manual correction after settlement review",
    }
    update_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{created['sportsbook_bet_id']}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["manual_override_value"] == "-0.75"
    assert updated["manual_override_reason"] == "Manual correction after settlement review"

    wrong_profile_response = client.get(
        f"/profiles/profile-demo-002/sportsbook-bets/{created['sportsbook_bet_id']}"
    )
    assert wrong_profile_response.status_code == 404

    assert count_audit_rows("profile-demo-001", created["sportsbook_bet_id"]) >= 2


def test_override_reason_is_required(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "event_name": "Manual Override Match",
        "offer_text": "",
        "bookmaker": "Bookmaker A",
        "offer_type": "",
        "status": "Settled",
        "result": "Back Won",
        "back_stake": "10.00",
        "back_odds": "2.20",
        "match_strategy": "Standard",
        "lay_odds_1": "2.30",
        "exchange_name": "Exchange A",
        "date_settled": "2026-07-12",
        "user_notes": "",
        "manual_override_value": "-0.50",
        "manual_override_reason": "",
    }

    response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert response.status_code == 422


def test_seed_rows_load_into_dedicated_sportsbook_table(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/profile-demo-001/sportsbook-bets")
    assert response.status_code == 200
    assert response.json()

    connection = sqlite3.connect(settings.database_path)
    count = connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0]
    connection.close()
    assert count > 0
