from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_account_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def create_catalogue_bookmaker(client: TestClient, brand_name: str) -> dict[str, object]:
    response = client.post(
        "/bookmaker-catalogue",
        json={
            "brand_name": brand_name,
            "short_display_name": brand_name[:32],
            "operator_group": "Demo Group",
            "platform": "Demo Platform",
            "foreground_colour": "#FFFFFF",
            "background_colour": "#455A64",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_accounts_workflow_create_update_and_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    bookmaker = create_catalogue_bookmaker(client, "Midnite")

    payload = {
        "account": "Midnite",
        "bookmaker_id": bookmaker["bookmaker_id"],
        "type": "Bookie",
        "counts_in_cash_total": True,
        "channel": "Online",
        "status": "Active",
        "current_balance": "25.00",
        "pending_withdrawal_amount": "5.00",
        "last_balance_update": "2026-07-01 10:00:00",
        "group_name": "Midnite Group",
        "platform": "Proprietary",
    }

    create_response = client.post("/profiles/profile-demo-001/accounts", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["account_id"]
    assert created["account"] == "Midnite"

    list_profile_one = client.get("/profiles/profile-demo-001/accounts")
    assert list_profile_one.status_code == 200
    assert any(row["account_id"] == created["account_id"] for row in list_profile_one.json())

    list_profile_two = client.get("/profiles/profile-demo-002/accounts")
    assert list_profile_two.status_code == 200
    assert all(row["account_id"] != created["account_id"] for row in list_profile_two.json())

    updated_payload = {**payload, "status": "Limited", "current_balance": "20.00"}
    update_response = client.put(
        f"/profiles/profile-demo-001/accounts/{created['account_id']}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "Limited"
    assert updated["current_balance"] == "20.00"

    wrong_profile_response = client.get(
        f"/profiles/profile-demo-002/accounts/{created['account_id']}"
    )
    assert wrong_profile_response.status_code == 404

    assert count_account_audit_rows("profile-demo-001", created["account_id"]) >= 2


def test_seed_rows_load_into_dedicated_accounts_table(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/profile-demo-001/accounts")
    assert response.status_code == 200
    assert response.json()

    connection = sqlite3.connect(settings.database_path)
    count = connection.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    connection.close()
    assert count > 0


def test_account_lifecycle_and_restrictions_are_profile_scoped(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    bookmaker = create_catalogue_bookmaker(client, "Bookmaker A")
    payload = {
        "account": "Bookmaker A",
        "bookmaker_id": bookmaker["bookmaker_id"],
        "type": "Bookie",
        "counts_in_cash_total": True,
        "channel": "Online",
        "status": "Active",
        "lifecycle_status": "Active",
        "restrictions": ["Bonus Restricted", "Soft Limited"],
        "current_balance": "0.00",
        "pending_withdrawal_amount": "0.00",
        "last_balance_update": "",
        "group_name": "Demo Group",
        "platform": "Demo Platform",
    }

    response = client.post("/profiles/profile-demo-001/accounts", json=payload)

    assert response.status_code == 201
    assert response.json()["lifecycle_status"] == "Active"
    assert response.json()["restrictions"] == ["Bonus Restricted", "Soft Limited"]
    other_profile = client.get("/profiles/profile-demo-002/accounts").json()
    assert all(row["account_id"] != response.json()["account_id"] for row in other_profile)


def test_account_operating_channels_are_canonical_and_multi_selectable(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    bookmaker = create_catalogue_bookmaker(client, "Bookmaker A")

    payload = {
        "account": "Bookmaker A",
        "bookmaker_id": bookmaker["bookmaker_id"],
        "type": "Bookie",
        "counts_in_cash_total": True,
        "channel": "Online, Mobile",
        "status": "Active",
    }

    response = client.post("/profiles/profile-demo-001/accounts", json=payload)

    assert response.status_code == 201
    assert response.json()["channel"] == "Online, Mobile"

    invalid = client.post(
        "/profiles/profile-demo-001/accounts",
        json={**payload, "channel": "Online, Unknown"},
    )
    assert invalid.status_code == 422


def test_account_creation_requires_a_canonical_provider(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    rejected = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "account": "Not In The Catalogue",
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
        },
    )
    assert rejected.status_code == 422

    provider = create_catalogue_bookmaker(client, "Bookmaker A")
    created = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "account": provider["brand_name"],
            "bookmaker_id": provider["bookmaker_id"],
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
        },
    )
    assert created.status_code == 201
    assert created.json()["account"] == provider["brand_name"]
