from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import (
    create_account,
    list_accounts,
    resolve_profile_exchange_commission,
)
from openforge_api.main import app
from openforge_api.notifications import exchange_commission_notifications


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    seed_synthetic_betting_context()


def test_exchange_commission_settings_are_profile_scoped(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    save_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert save_response.status_code == 200
    saved = save_response.json()
    assert saved["profile_id"] == "profile-demo-001"
    assert saved["exchange_name"] == "Matchbook"
    assert saved["commission_rate"] == "0.02"

    profile_one_response = client.get("/profiles/profile-demo-001/exchange-commissions")
    assert profile_one_response.status_code == 200
    assert any(
        row["exchange_name"] == "Matchbook" and row["commission_rate"] == "0.02"
        for row in profile_one_response.json()
    )

    profile_two_response = client.get("/profiles/profile-demo-002/exchange-commissions")
    assert profile_two_response.status_code == 200
    assert not any(
        row["exchange_name"] == "Matchbook" and row["commission_rate"] == "0.02"
        for row in profile_two_response.json()
    )


def test_exchange_commission_list_returns_unique_typed_records(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    for exchange_name, commission_rate in (("10Bet", "0.02"), ("Matchbook", "0.03")):
        response = client.put(
            "/profiles/profile-demo-001/exchange-commissions",
            json={"exchange_name": exchange_name, "commission_rate": commission_rate},
        )
        assert response.status_code == 200

    response = client.get("/profiles/profile-demo-001/exchange-commissions")
    assert response.status_code == 200
    rows = response.json()
    assert all(isinstance(row, dict) for row in rows)
    assert [row["exchange_name"] for row in rows] == sorted(
        {row["exchange_name"] for row in rows}
    )
    assert len(rows) == len({row["exchange_name"] for row in rows})


def test_exchange_commission_requires_decimal_fraction(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "2"},
    )
    assert response.status_code == 422
    assert "between 0 and 1" in response.text


def test_attached_exchange_without_commission_is_returned_as_profile_health_gap(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.get("/profiles/profile-demo-001/accounts")
    exchange = create_account(
        "profile-demo-001",
        {
            "account_id": "AC-SYNTHETIC-EXCHANGE",
            "catalogue_id": None,
            "bookmaker_id": None,
            "account": "Synthetic Exchange",
            "type": "Exchange",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
            "lifecycle_status": "Active",
            "restrictions_json": "[]",
            "current_balance": "0.00",
            "pending_withdrawal_amount": "0.00",
            "last_balance_update": "",
            "group_name": "Synthetic Group",
            "platform": "Synthetic Platform",
            "sign_up_date": "",
            "notes": "",
        },
    )

    response = client.get("/profiles/profile-demo-001/exchange-commissions")
    assert response.status_code == 200
    row = next(
        item for item in response.json() if item["exchange_name"] == exchange.account
    )
    assert row["configured"] is False
    assert row["commission_rate"] == ""

    notifications = exchange_commission_notifications(
        "founder@example.invalid", datetime.now(UTC)
    )
    notification = next(
        item
        for item in notifications
        if item.notification_type == "exchange_commission_required"
        and item.record_id == exchange.account_id
    )
    assert notification.security_tag == "fund_manager_only"
    assert notification.href.endswith(
        "/profiles/profile-demo-001/tracker/settings#defaults"
    )


def test_zero_commission_offer_overrides_base_only_inside_period_and_rejects_overlap(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    exchange = next(
        row for row in list_accounts("profile-demo-001")
        if row.type == "Exchange" and row.account == "Smarkets"
    )
    base = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": exchange.account, "commission_rate": "0.02"},
    )
    assert base.status_code == 200
    created = client.post(
        "/profiles/profile-demo-001/exchange-commissions/offers",
        json={
            "account_id": exchange.account_id,
            "commission_rate": "0.00",
            "effective_start": "2026-11-01",
            "effective_end": "2026-11-30",
            "source_label": "Smarkets synthetic 0% offer",
            "owner_note": "Synthetic fixture",
            "status": "Active",
        },
    )
    assert created.status_code == 201
    inside = resolve_profile_exchange_commission(
        "profile-demo-001", exchange.account, effective_date="2026-11-15"
    )
    outside = resolve_profile_exchange_commission(
        "profile-demo-001", exchange.account, effective_date="2026-12-01"
    )
    assert (inside.commission_rate, inside.source, inside.source_label) == (
        "0.00", "commission_offer", "Smarkets synthetic 0% offer"
    )
    assert (outside.commission_rate, outside.source) == ("0.02", "account_default")

    overlap = client.post(
        "/profiles/profile-demo-001/exchange-commissions/offers",
        json={
            "account_id": exchange.account_id,
            "commission_rate": "0.01",
            "effective_start": "2026-11-20",
            "effective_end": "2026-12-20",
            "source_label": "Overlapping fixture",
            "status": "Active",
        },
    )
    assert overlap.status_code == 422
    assert "overlap" in overlap.text.lower()


def test_commission_offer_rejects_non_exchange_account(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    bookie = next(row for row in list_accounts("profile-demo-001") if row.type == "Bookie")
    response = client.post(
        "/profiles/profile-demo-001/exchange-commissions/offers",
        json={
            "account_id": bookie.account_id,
            "commission_rate": "0",
            "effective_start": "2026-11-01",
            "effective_end": "2026-11-30",
            "source_label": "Invalid fixture",
            "status": "Active",
        },
    )
    assert response.status_code == 422
