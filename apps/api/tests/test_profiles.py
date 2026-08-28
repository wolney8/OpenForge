from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import (
    count_profile_audit_rows,
    list_profile_quick_add_loadout_favourites,
)
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def configure_profile_catalogue(tmp_path: Path) -> None:
    settings.account_catalogue_source = str(tmp_path / "profile-catalogue.json")
    records = []
    for catalogue_id, account_type, name in (
        ("BOOKMAKER-DEMO-001", "Bookmaker", "Bookmaker A"),
        ("EXCHANGE-DEMO-001", "Exchange", "Exchange A"),
        ("BANK-DEMO-001", "Bank", "Bank A"),
    ):
        records.append(
            {
                "catalogue_id": catalogue_id,
                "account_type": account_type,
                "operating_jurisdictions": ["GB"],
                "operating_subdivisions": [],
                "operating_channels": ["web", "mobile"],
                "brand_name": name,
                "short_display_name": name,
                "operator_group": "Synthetic Group",
                "platform": "Synthetic Platform",
                "foreground_colour": "#FFFFFF",
                "background_colour": "#455A64",
                "source": "Synthetic fixture",
            }
        )
    Path(settings.account_catalogue_source).write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic Profile Catalogue",
                "updated_at": "2026-08-28",
                "default_operating_context": {
                    "jurisdiction": "GB",
                    "subdivision": "",
                    "channels": ["web", "mobile"],
                },
                "records": records,
            }
        ),
        encoding="utf-8",
    )


def profile_onboarding_payload() -> dict[str, object]:
    return {
        "display_name": "Synthetic Profile",
        "profile_code": "PROFILE-001",
        "tracking_start_date": "2026-08-01",
        "management_fee_percent": "0.00",
        "investment_fee_percent": "0.00",
        "active_date_preset": "This Month",
        "iteration_number": 1,
        "starting_bankroll": "100.00",
        "enabled_modules": [
            "sportsbook-bets",
            "free-bets",
            "cash-adjustments",
            "each-way-extra-places",
        ],
        "weekly_extra_place_loss_budget": "15.00",
        "main_bank_catalogue_id": "BANK-DEMO-001",
        "accounts": [
            {
                "catalogue_id": "BOOKMAKER-DEMO-001",
                "status": "Active",
                "opening_balance": "25.00",
                "counts_in_cash_total": True,
            },
            {
                "catalogue_id": "EXCHANGE-DEMO-001",
                "status": "Active",
                "opening_balance": "50.00",
                "counts_in_cash_total": True,
            },
            {
                "catalogue_id": "BANK-DEMO-001",
                "status": "Active",
                "opening_balance": "75.00",
                "counts_in_cash_total": True,
            },
        ],
        "preferences": {"reduced_motion": False},
    }


def create_synthetic_quick_action(client: TestClient) -> str:
    response = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "preset_id": "COMBO-FOUNDER-DEMO-001",
            "name": "Synthetic Profile Sportsbook",
            "ledger_type": "Sportsbook",
            "offer_name": "Synthetic recurring offer",
            "quick_add": {
                "enabled": True,
                "display_label": "Synthetic Sportsbook Action",
                "supported_ledgers": ["Sportsbook"],
                "enabled_fields": ["offerName"],
                "defaults": {"offerName": "Synthetic recurring offer"},
            },
        },
    )
    assert response.status_code == 201
    return response.json()["preset_id"]


def test_profiles_routes_return_seeded_profiles(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    list_response = client.get("/profiles")
    assert list_response.status_code == 200
    profiles = list_response.json()
    assert any(profile["profile_id"] == "profile-demo-001" for profile in profiles)

    detail_response = client.get("/profiles/profile-demo-001")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["display_name"] == "Subscriber Alpha"
    assert detail["profile_code"] == "ALPHA-001"


def test_profile_detail_returns_404_for_unknown_profile(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/missing-profile")
    assert response.status_code == 404


def test_profile_metadata_can_be_updated_with_audit(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.patch(
        "/profiles/profile-demo-001",
        json={
            "display_name": "Synthetic Subscriber One",
            "profile_code": "SYNTH-001",
            "status": "Pending",
            "tracking_start_date": "2026-04-01",
            "management_fee_percent": "35.00",
            "investment_fee_percent": "10.00",
        },
    )

    assert response.status_code == 200
    profile = response.json()
    assert profile["display_name"] == "Synthetic Subscriber One"
    assert profile["profile_code"] == "SYNTH-001"
    assert profile["status"] == "Pending"
    assert profile["tracking_start_date"] == "2026-04-01"
    assert profile["management_fee_percent"] == "35.00"
    assert profile["investment_fee_percent"] == "10.00"
    assert count_profile_audit_rows("profile-demo-001") == 1


def test_profile_fees_cannot_exceed_one_hundred_percent(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.patch(
        "/profiles/profile-demo-001",
        json={"management_fee_percent": "80", "investment_fee_percent": "30"},
    )

    assert response.status_code == 422
    assert "cannot exceed 100%" in response.json()["detail"]


def test_profile_code_must_be_unique_and_tracking_start_cannot_be_future(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    duplicate_response = client.patch(
        "/profiles/profile-demo-001",
        json={"profile_code": "BRAVO-002"},
    )
    future_response = client.patch(
        "/profiles/profile-demo-001",
        json={"tracking_start_date": "2999-01-01"},
    )

    assert duplicate_response.status_code == 422
    assert duplicate_response.json()["detail"] == "Profile code must be unique"
    assert future_response.status_code == 422
    assert "cannot be in the future" in str(future_response.json()["detail"])


def test_profile_onboarding_creates_settings_and_catalogue_accounts_atomically(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    quick_action_id = create_synthetic_quick_action(client)
    payload = profile_onboarding_payload()
    payload["quick_actions"] = [
        {
            "preset_id": quick_action_id,
            "ledger_type": "Sportsbook",
            "favourite_order": 1,
        }
    ]

    response = client.post("/profiles/onboarding", json=payload)

    assert response.status_code == 201
    created = response.json()
    profile_id = created["profile"]["profile_id"]
    assert created["selected_account_count"] == 3
    assert created["selected_quick_action_count"] == 1
    assert created["profile"]["current_cash_snapshot"] == "150.00"
    assert created["onboarding"]["starting_bankroll"] == "100.00"
    assert created["onboarding"]["main_bank_catalogue_id"] == "BANK-DEMO-001"
    assert "casino-offers" not in created["onboarding"]["enabled_modules"]

    accounts = client.get(f"/profiles/{profile_id}/accounts").json()
    assert {account["catalogue_id"] for account in accounts} == {
        "BOOKMAKER-DEMO-001",
        "EXCHANGE-DEMO-001",
        "BANK-DEMO-001",
    }
    assert all(account["profile_id"] == profile_id for account in accounts)
    favourites = list_profile_quick_add_loadout_favourites(profile_id)
    assert [(row.preset_id, row.ledger_type, row.favourite_order) for row in favourites] == [
        (quick_action_id, "Sportsbook", 1)
    ]
    assert count_profile_audit_rows(profile_id) == 1


def test_profile_onboarding_rejects_duplicate_code_without_partial_writes(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()

    first = client.post("/profiles/onboarding", json=payload)
    second = client.post("/profiles/onboarding", json=payload)

    assert first.status_code == 201
    assert second.status_code == 422
    connection = sqlite3.connect(settings.database_path)
    profile_count = connection.execute(
        "SELECT COUNT(*) FROM profiles WHERE profile_code = 'PROFILE-001'"
    ).fetchone()[0]
    profile_account_count = connection.execute(
        "SELECT COUNT(*) FROM accounts WHERE profile_id = ?",
        (first.json()["profile"]["profile_id"],),
    ).fetchone()[0]
    connection.close()
    assert profile_count == 1
    assert profile_account_count == 3


def test_profile_onboarding_can_be_reused_for_isolated_profiles(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    first_payload = profile_onboarding_payload()
    second_payload = profile_onboarding_payload()
    second_payload.update(
        display_name="Synthetic Profile Two",
        profile_code="PROFILE-002",
        starting_bankroll="200.00",
    )

    first = client.post("/profiles/onboarding", json=first_payload)
    second = client.post("/profiles/onboarding", json=second_payload)

    assert first.status_code == 201
    assert second.status_code == 201
    first_profile_id = first.json()["profile"]["profile_id"]
    second_profile_id = second.json()["profile"]["profile_id"]
    assert first_profile_id != second_profile_id
    assert first.json()["onboarding"]["starting_bankroll"] == "100.00"
    assert second.json()["onboarding"]["starting_bankroll"] == "200.00"
    first_accounts = client.get(f"/profiles/{first_profile_id}/accounts").json()
    second_accounts = client.get(f"/profiles/{second_profile_id}/accounts").json()
    assert len(first_accounts) == 3
    assert len(second_accounts) == 3
    assert {row["profile_id"] for row in first_accounts} == {first_profile_id}
    assert {row["profile_id"] for row in second_accounts} == {second_profile_id}


def test_profile_onboarding_rejects_unknown_catalogue_provider(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    payload = profile_onboarding_payload()
    payload["accounts"] = [
        {
            "catalogue_id": "BOOKMAKER-MISSING-001",
            "status": "Active",
            "opening_balance": "10.00",
        }
    ]
    payload["main_bank_catalogue_id"] = ""

    response = TestClient(app).post("/profiles/onboarding", json=payload)

    assert response.status_code == 422
    assert "active global catalogue providers" in response.json()["detail"]["message"]


def test_profile_onboarding_rejects_unknown_quick_action_without_partial_write(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    payload = profile_onboarding_payload()
    payload["quick_actions"] = [
        {
            "preset_id": "COMBO-MISSING-001",
            "ledger_type": "Sportsbook",
            "favourite_order": 1,
        }
    ]

    response = TestClient(app).post("/profiles/onboarding", json=payload)

    assert response.status_code == 422
    assert "active global actions" in response.json()["detail"]["message"]
    connection = sqlite3.connect(settings.database_path)
    count = connection.execute(
        "SELECT COUNT(*) FROM profiles WHERE profile_code = 'PROFILE-001'"
    ).fetchone()[0]
    connection.close()
    assert count == 0


def test_disabled_optional_module_blocks_new_rows_but_keeps_history_route(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()
    payload["enabled_modules"] = [
        "sportsbook-bets",
        "free-bets",
        "cash-adjustments",
    ]
    created = client.post("/profiles/onboarding", json=payload)
    assert created.status_code == 201
    profile_id = created.json()["profile"]["profile_id"]

    create_response = client.post(
        f"/profiles/{profile_id}/each-way-extra-places",
        json={},
    )
    history_response = client.get(
        f"/profiles/{profile_id}/each-way-extra-places"
    )

    assert create_response.status_code == 403
    assert create_response.json()["detail"] == "Extra Places is disabled for this Profile"
    assert history_response.status_code == 200
