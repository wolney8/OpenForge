from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_balance_snapshots_are_profile_scoped(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    account_response = client.get("/profiles/profile-demo-001/accounts")
    assert account_response.status_code == 200
    account_id = account_response.json()[0]["account_id"]

    payload = {
        "snapshot_at": "2026-07-10T18:00:00",
        "snapshot_type": "Weekly close",
        "account_id": account_id,
        "balance_amount": "125.40",
        "notes": "Synthetic weekly reconciliation",
    }
    created_response = client.post(
        "/profiles/profile-demo-001/balance-snapshots", json=payload
    )
    assert created_response.status_code == 201
    created = created_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["balance_amount"] == "125.40"

    profile_one = client.get("/profiles/profile-demo-001/balance-snapshots")
    profile_two = client.get("/profiles/profile-demo-002/balance-snapshots")
    assert profile_one.status_code == 200
    assert profile_two.status_code == 200
    assert any(
        row["balance_snapshot_id"] == created["balance_snapshot_id"]
        for row in profile_one.json()
    )
    assert all(
        row["balance_snapshot_id"] != created["balance_snapshot_id"]
        for row in profile_two.json()
    )


def test_balance_snapshot_rejects_account_from_another_profile(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    account_id = client.get("/profiles/profile-demo-001/accounts").json()[0]["account_id"]

    response = client.post(
        "/profiles/profile-demo-002/balance-snapshots",
        json={
            "snapshot_at": "2026-07-10T18:00:00",
            "snapshot_type": "Weekly close",
            "account_id": account_id,
            "balance_amount": "10.00",
            "notes": "Synthetic isolation check",
        },
    )

    assert response.status_code == 422


def test_balance_snapshot_rejects_non_numeric_money(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.post(
        "/profiles/profile-demo-001/balance-snapshots",
        json={
            "snapshot_at": "2026-07-10T18:00:00",
            "snapshot_type": "Weekly close",
            "balance_amount": "not-money",
            "notes": "Synthetic validation check",
        },
    )

    assert response.status_code == 422
