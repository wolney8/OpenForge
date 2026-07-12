from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_casino_offer_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_casino_offer_workflow_create_update_and_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "offer_group_id": "CAS-GRP-001",
        "date_started": "2026-07-10 00:00:00",
        "date_settling": "",
        "expiry_datetime": "2026-07-12 12:00:00",
        "bookmaker": "Sky Bet",
        "offer_type": "Free Spins",
        "offer_name": "10 free spins test row",
        "game": "Roulette",
        "cash_stake": "5.00",
        "credit_amount": "",
        "bonus_amount": "",
        "wager_multiplier": "",
        "wager_target": "",
        "required_spins": "",
        "spin_stake": "0.10",
        "free_spins_awarded": "10",
        "free_spins_value": "0.10",
        "status": "Started",
        "result": "Pending",
        "calc_net_pnl": "-5.00",
        "final_net_pnl": "",
        "user_notes": "Initial casino offer workflow entry",
    }

    create_response = client.post("/profiles/profile-demo-001/casino-offers", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["casino_offer_id"]
    assert created["resolved_net_pnl"] == "-5.00"
    assert created["counts_as_open"] is True

    list_profile_one = client.get("/profiles/profile-demo-001/casino-offers")
    assert list_profile_one.status_code == 200
    assert any(
        row["casino_offer_id"] == created["casino_offer_id"]
        for row in list_profile_one.json()
    )

    list_profile_two = client.get("/profiles/profile-demo-002/casino-offers")
    assert list_profile_two.status_code == 200
    assert all(
        row["casino_offer_id"] != created["casino_offer_id"]
        for row in list_profile_two.json()
    )

    updated_payload = {**payload, "status": "Settled", "result": "Win", "final_net_pnl": "3.20"}
    update_response = client.put(
        f"/profiles/profile-demo-001/casino-offers/{created['casino_offer_id']}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["resolved_net_pnl"] == "3.20"
    assert updated["counts_as_open"] is False

    wrong_profile_response = client.get(
        f"/profiles/profile-demo-002/casino-offers/{created['casino_offer_id']}"
    )
    assert wrong_profile_response.status_code == 404

    assert count_casino_offer_audit_rows("profile-demo-001", created["casino_offer_id"]) >= 2

    delete_response = client.delete(
        f"/profiles/profile-demo-001/casino-offers/{created['casino_offer_id']}"
    )
    assert delete_response.status_code == 204

    deleted_lookup = client.get(
        f"/profiles/profile-demo-001/casino-offers/{created['casino_offer_id']}"
    )
    assert deleted_lookup.status_code == 404


def test_seed_rows_load_into_dedicated_casino_offer_table(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/profile-demo-001/casino-offers")
    assert response.status_code == 200
    assert response.json()

    connection = sqlite3.connect(settings.database_path)
    count = connection.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0]
    connection.close()
    assert count > 0


def test_prospecting_casino_offer_can_be_saved_without_current_or_final_value(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "offer_group_id": "CAS-GRP-002",
        "date_started": "2026-07-13 00:00:00",
        "date_settling": "",
        "expiry_datetime": "",
        "bookmaker": "Sky Bet",
        "offer_type": "Deposit Bonus",
        "offer_name": "Weekend deposit bonus",
        "game": "Slots",
        "cash_stake": "10.00",
        "credit_amount": "",
        "bonus_amount": "",
        "wager_multiplier": "",
        "wager_target": "",
        "required_spins": "",
        "spin_stake": "",
        "free_spins_awarded": "",
        "free_spins_value": "",
        "status": "Prospecting",
        "result": "Pending",
        "calc_net_pnl": "",
        "final_net_pnl": "",
        "user_notes": "",
    }

    response = client.post("/profiles/profile-demo-001/casino-offers", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert created["resolved_net_pnl"] == "0.00"
    assert created["calculation_state"] == "resolved"
    assert created["counts_as_open"] is True
