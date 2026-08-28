from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import connect, count_account_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.account_catalogue_source = str(tmp_path / "master-account-catalogue.json")
    Path(settings.account_catalogue_source).write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic Accounts Workflow Catalogue",
                "updated_at": "2026-08-28",
                "default_operating_context": {
                    "jurisdiction": "GB",
                    "subdivision": "",
                    "channels": ["web", "mobile"],
                },
                "records": [],
            }
        ),
        encoding="utf-8",
    )


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
    created = response.json()
    catalogue_path = Path(settings.account_catalogue_source)
    master = json.loads(catalogue_path.read_text(encoding="utf-8"))
    master["records"].append(
        {
            "catalogue_id": f"BOOKMAKER-TEST-{len(master['records']) + 1:03d}",
            "account_type": "Bookmaker",
            "operating_jurisdictions": ["GB"],
            "operating_subdivisions": [],
            "operating_channels": ["web", "mobile"],
            "brand_name": brand_name,
            "short_display_name": brand_name[:32],
            "operator_group": "Demo Group",
            "platform": "Demo Platform",
            "foreground_colour": "#FFFFFF",
            "background_colour": "#455A64",
            "source": "Synthetic fixture",
        }
    )
    catalogue_path.write_text(json.dumps(master), encoding="utf-8")
    return created


def add_master_provider(
    account_type: str,
    brand_name: str,
    catalogue_id: str,
) -> None:
    catalogue_path = Path(settings.account_catalogue_source)
    master = json.loads(catalogue_path.read_text(encoding="utf-8"))
    master["records"].append(
        {
            "catalogue_id": catalogue_id,
            "account_type": account_type,
            "operating_jurisdictions": ["GB"],
            "operating_subdivisions": [],
            "operating_channels": ["web", "mobile"],
            "brand_name": brand_name,
            "short_display_name": brand_name,
            "operator_group": "Synthetic Group",
            "platform": "Synthetic Platform",
            "foreground_colour": "#FFFFFF",
            "background_colour": "#455A64",
            "source": "Synthetic fixture",
        }
    )
    catalogue_path.write_text(json.dumps(master), encoding="utf-8")


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


def test_account_creation_supports_canonical_exchange_and_bank_providers(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    add_master_provider("Exchange", "Exchange A", "EXCHANGE-A")
    add_master_provider("Bank", "Bank A", "BANK-A")
    client = TestClient(app)

    missing_commission = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "catalogue_id": "EXCHANGE-A",
            "account": "Exchange A",
            "type": "Exchange",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
        },
    )
    assert missing_commission.status_code == 422
    assert missing_commission.json()["detail"] == "An Exchange commission rate is required"
    assert all(
        row["catalogue_id"] != "EXCHANGE-A"
        for row in client.get("/profiles/profile-demo-001/accounts").json()
    )

    exchange = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "catalogue_id": "EXCHANGE-A",
            "account": "Exchange A",
            "type": "Exchange",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
            "commission_rate": "0.02",
        },
    )
    assert exchange.status_code == 201
    assert exchange.json()["catalogue_id"] == "EXCHANGE-A"
    assert exchange.json()["type"] == "Exchange"
    commissions = client.get(
        "/profiles/profile-demo-001/exchange-commissions"
    ).json()
    assert any(
        row["exchange_name"] == "Exchange A" and row["commission_rate"] == "0.02"
        for row in commissions
    )

    bank = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "catalogue_id": "BANK-A",
            "account": "Bank A",
            "type": "Bank",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
        },
    )
    assert bank.status_code == 201
    assert bank.json()["catalogue_id"] == "BANK-A"
    assert bank.json()["type"] == "Bank"

    duplicate_bank = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "catalogue_id": "BANK-A",
            "account": "Bank A",
            "type": "Bank",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
        },
    )
    assert duplicate_bank.status_code == 409
    assert duplicate_bank.json()["detail"] == (
        "This Account Catalogue provider is already linked to the Profile"
    )
    assert len(
        [
            row
            for row in client.get("/profiles/profile-demo-001/accounts").json()
            if row["catalogue_id"] == "BANK-A"
        ]
    ) == 1

    archived_bank = client.delete(
        f"/profiles/profile-demo-001/accounts/{bank.json()['account_id']}"
    )
    assert archived_bank.status_code == 200
    assert archived_bank.json()["status"] == "Archived"
    assert archived_bank.json()["lifecycle_status"] == "Archived"
    assert archived_bank.json()["counts_in_cash_total"] is False


def test_profile_catalogue_selection_requires_exchange_commission_and_retains_one_exchange(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    add_master_provider("Exchange", "Exchange A", "EXCHANGE-A")
    add_master_provider("Exchange", "Exchange B", "EXCHANGE-B")
    client = TestClient(app)
    profile_id = "profile-catalogue-selection-001"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profiles (
              profile_id, display_name, profile_code, status, tracking_start_date,
              management_fee_percent, investment_fee_percent, current_cash_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile_id,
                "Catalogue Selection Profile",
                "CATALOGUE-SELECTION-001",
                "Active",
                "2026-08-28",
                "0.00",
                "0.00",
                "0.00",
            ),
        )

    missing_commission = client.put(
        f"/profiles/{profile_id}/accounts/catalogue-selection/EXCHANGE-A",
        json={"selected": True, "status": "Active", "current_balance": "10.00"},
    )
    assert missing_commission.status_code == 422

    first = client.put(
        f"/profiles/{profile_id}/accounts/catalogue-selection/EXCHANGE-A",
        json={
            "selected": True,
            "status": "Active",
            "current_balance": "10.00",
            "commission_rate": "0.02",
        },
    )
    assert first.status_code == 200
    assert first.json()["catalogue_id"] == "EXCHANGE-A"
    repeated = client.put(
        f"/profiles/{profile_id}/accounts/catalogue-selection/EXCHANGE-A",
        json={
            "selected": True,
            "status": "Active",
            "current_balance": "12.00",
            "commission_rate": "0.02",
        },
    )
    assert repeated.status_code == 200
    assert repeated.json()["account_id"] == first.json()["account_id"]
    assert len(client.get(f"/profiles/{profile_id}/accounts").json()) == 1
    commissions = client.get(
        f"/profiles/{profile_id}/exchange-commissions"
    ).json()
    assert [(row["exchange_name"], row["commission_rate"]) for row in commissions] == [
        ("Exchange A", "0.02")
    ]

    last_exchange = client.put(
        f"/profiles/{profile_id}/accounts/catalogue-selection/EXCHANGE-A",
        json={"selected": False},
    )
    assert last_exchange.status_code == 422
    assert last_exchange.json()["detail"] == "A Profile must retain at least one Exchange"

    second = client.put(
        f"/profiles/{profile_id}/accounts/catalogue-selection/EXCHANGE-B",
        json={
            "selected": True,
            "status": "Active",
            "current_balance": "0.00",
            "commission_rate": "0.015",
        },
    )
    assert second.status_code == 200
    archived = client.put(
        f"/profiles/{profile_id}/accounts/catalogue-selection/EXCHANGE-A",
        json={"selected": False},
    )
    assert archived.status_code == 200
    assert archived.json()["status"] == "Archived"
    assert archived.json()["lifecycle_status"] == "Archived"
