from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_cash_adjustment_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_cash_adjustment_workflow_create_update_and_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "adjustment_date": "2026-07-16 09:15:00",
        "direction": "Out",
        "amount": "50.00",
        "adjustment_type": "Withdrawal",
        "affects_investment": True,
        "affects_cash_snapshot": True,
        "linked_account": "Starling Bank",
        "description": "Profit extraction",
    }

    create_response = client.post("/profiles/profile-demo-001/cash-adjustments", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["cash_adjustment_id"]
    assert created["signed_amount"] == "-50.00"
    assert created["week_label"] == "W/C 13/07/2026"

    list_profile_one = client.get("/profiles/profile-demo-001/cash-adjustments")
    assert list_profile_one.status_code == 200
    assert any(
        row["cash_adjustment_id"] == created["cash_adjustment_id"]
        for row in list_profile_one.json()
    )

    list_profile_two = client.get("/profiles/profile-demo-002/cash-adjustments")
    assert list_profile_two.status_code == 200
    assert all(
        row["cash_adjustment_id"] != created["cash_adjustment_id"]
        for row in list_profile_two.json()
    )

    updated_payload = {
        **payload,
        "direction": "In",
        "adjustment_type": "TopUp",
        "description": "Returned funds",
    }
    update_response = client.put(
        f"/profiles/profile-demo-001/cash-adjustments/{created['cash_adjustment_id']}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["signed_amount"] == "50.00"
    assert updated["adjustment_type"] == "TopUp"

    wrong_profile_response = client.get(
        f"/profiles/profile-demo-002/cash-adjustments/{created['cash_adjustment_id']}"
    )
    assert wrong_profile_response.status_code == 404

    assert count_cash_adjustment_audit_rows(
        "profile-demo-001",
        created["cash_adjustment_id"],
    ) >= 2

    delete_response = client.delete(
        f"/profiles/profile-demo-001/cash-adjustments/{created['cash_adjustment_id']}"
    )
    assert delete_response.status_code == 204

    deleted_lookup = client.get(
        f"/profiles/profile-demo-001/cash-adjustments/{created['cash_adjustment_id']}"
    )
    assert deleted_lookup.status_code == 404


def test_seed_rows_load_into_dedicated_cash_adjustment_table(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/profile-demo-001/cash-adjustments")
    assert response.status_code == 200
    assert response.json()

    connection = sqlite3.connect(settings.database_path)
    count = connection.execute("SELECT COUNT(*) FROM cash_adjustments").fetchone()[0]
    connection.close()
    assert count > 0


def test_invalid_direction_type_combination_is_rejected(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "adjustment_date": "2026-07-16 09:15:00",
        "direction": "In",
        "amount": "50.00",
        "adjustment_type": "Withdrawal",
        "affects_investment": True,
        "affects_cash_snapshot": True,
        "linked_account": "Starling Bank",
        "description": "Invalid combination",
    }

    response = client.post("/profiles/profile-demo-001/cash-adjustments", json=payload)
    assert response.status_code == 422
