from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-bookmaker-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def catalogue_payload(**overrides: str) -> dict[str, str]:
    payload = {
        "brand_name": "Bookmaker A Test",
        "short_display_name": "Book A",
        "legal_operator": "Demo Operator Limited",
        "operator_group": "Demo Group",
        "platform": "Demo Platform",
        "risk_team": "Demo Risk Cluster",
        "licence_reference": "DEMO-LICENCE-001",
        "licence_status": "Demo only",
        "canonical_domain": "bookmaker-a.example.invalid",
        "status": "Active",
        "foreground_colour": "#FFFFFF",
        "background_colour": "#1B5E20",
        "logo_asset_path": "",
        "source": "Synthetic fixture",
        "confidence": "Verified",
        "last_verified_date": "2026-07-15",
    }
    payload.update(overrides)
    return payload


def test_catalogue_create_link_archive_and_legacy_backfill(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    initial_catalogue = client.get("/bookmaker-catalogue")
    assert initial_catalogue.status_code == 200
    assert initial_catalogue.json()

    connection = sqlite3.connect(settings.database_path)
    backfilled_account = connection.execute(
        """
        SELECT account, bookmaker_id
        FROM accounts
        WHERE type = 'Bookie'
        ORDER BY account_id
        LIMIT 1
        """
    ).fetchone()
    connection.close()
    assert backfilled_account is not None
    assert backfilled_account[0]
    assert backfilled_account[1]

    create_response = client.post("/bookmaker-catalogue", json=catalogue_payload())
    assert create_response.status_code == 201
    created = create_response.json()

    account_payload = {
        "bookmaker_id": created["bookmaker_id"],
        "account": "Contradictory legacy text",
        "type": "Bookie",
        "counts_in_cash_total": True,
        "channel": "Online",
        "status": "Active",
        "current_balance": "25.00",
        "pending_withdrawal_amount": "",
        "last_balance_update": "2026-07-15 10:00:00",
        "group_name": "Wrong group",
        "platform": "Wrong platform",
    }
    account_response = client.post(
        "/profiles/profile-demo-001/accounts", json=account_payload
    )
    assert account_response.status_code == 201
    account = account_response.json()
    assert account["account"] == "Bookmaker A Test"
    assert account["group_name"] == "Demo Group"
    assert account["platform"] == "Demo Platform"

    archive_response = client.put(
        f"/bookmaker-catalogue/{created['bookmaker_id']}",
        json=catalogue_payload(status="Archived"),
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "Archived"

    active_only = client.get("/bookmaker-catalogue", params={"include_archived": False})
    assert active_only.status_code == 200
    assert all(row["bookmaker_id"] != created["bookmaker_id"] for row in active_only.json())
    all_rows = client.get("/bookmaker-catalogue")
    assert any(row["bookmaker_id"] == created["bookmaker_id"] for row in all_rows.json())


def test_catalogue_rejects_inaccessible_colours_and_remote_logos(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    low_contrast = client.post(
        "/bookmaker-catalogue",
        json=catalogue_payload(
            brand_name="Low Contrast Demo",
            foreground_colour="#777777",
            background_colour="#888888",
        ),
    )
    assert low_contrast.status_code == 422

    remote_logo = client.post(
        "/bookmaker-catalogue",
        json=catalogue_payload(
            brand_name="Remote Logo Demo",
            logo_asset_path="https://example.invalid/logo.png",
        ),
    )
    assert remote_logo.status_code == 422


def test_global_default_and_profile_override_are_isolated(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    global_response = client.put(
        "/bookmaker-display-settings", json={"mode": "Brand badge"}
    )
    assert global_response.status_code == 200

    profile_one_response = client.put(
        "/profiles/profile-demo-001/bookmaker-display-settings", json={"mode": "Name"}
    )
    assert profile_one_response.status_code == 200
    assert profile_one_response.json() == {
        "global_mode": "Brand badge",
        "profile_override": "Name",
        "resolved_mode": "Name",
    }

    profile_two_response = client.get(
        "/profiles/profile-demo-002/bookmaker-display-settings"
    )
    assert profile_two_response.status_code == 200
    assert profile_two_response.json() == {
        "global_mode": "Brand badge",
        "profile_override": "Inherit",
        "resolved_mode": "Brand badge",
    }
