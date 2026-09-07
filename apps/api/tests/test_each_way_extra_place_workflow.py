from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import create_account, list_each_way_extra_places
from openforge_api.extra_place_account_health import resolve_extra_place_account_health
from openforge_api.main import app


@pytest.fixture(autouse=True)
def isolated_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "environment", "local")
    monkeypatch.setattr(settings, "auth_required", False)
    monkeypatch.setattr(settings, "database_mode", "local")
    monkeypatch.setattr(
        settings,
        "database_url",
        f"sqlite:///{tmp_path / 'extra-place-workflow.sqlite3'}",
    )


def payload(**overrides: str) -> dict[str, str]:
    base = {
        "placed_at": "2026-08-24T12:00:00Z",
        "runner": "Synthetic Runner",
        "race": "Synthetic 14:30",
        "bookmaker": "Bookmaker A",
        "bookmaker_account": "Bookmaker A",
        "mode": "Extra Place",
        "each_way_stake": "10.00",
        "back_odds": "6.00",
        "place_term_numerator": "1",
        "place_term_denominator": "5",
        "win_exchange": "Exchange A",
        "win_lay_odds": "2.30",
        "win_commission": "0",
        "place_exchange": "Exchange A",
        "place_lay_odds": "4.50",
        "place_commission": "0",
        "status": "Placed",
        "result": "Pending",
    }
    return {**base, **overrides}


def add_bookie(
    client: TestClient,
    profile_id: str = "profile-demo-001",
    *,
    name: str = "Bookmaker A",
    status: str = "Active",
    lifecycle_status: str = "Active",
    restrictions_json: str = "[]",
) -> None:
    client.get(f"/profiles/{profile_id}/accounts")
    create_account(
        profile_id,
        {
            "account": name,
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": status,
            "lifecycle_status": lifecycle_status,
            "restrictions_json": restrictions_json,
            "current_balance": "0.00",
            "pending_withdrawal_amount": "0.00",
            "last_balance_update": "",
            "group_name": "Synthetic Group",
            "platform": "Synthetic Platform",
        },
    )


def test_each_way_extra_place_crud_is_profile_scoped() -> None:
    client = TestClient(app)
    add_bookie(client)
    created = client.post("/profiles/profile-demo-001/each-way-extra-places", json=payload())
    assert created.status_code == 201
    row = created.json()
    assert row["bookmaker_account"] == "Bookmaker A"
    assert row["win_lay_stake"] == "26.09"
    assert row["extra_place_pnl"] == "30.53"

    other_profile_rows = client.get("/profiles/profile-demo-002/each-way-extra-places").json()
    assert all(
        item["each_way_extra_place_id"] != row["each_way_extra_place_id"]
        for item in other_profile_rows
    )
    listed = client.get("/profiles/profile-demo-001/each-way-extra-places")
    assert any(
        item["each_way_extra_place_id"] == row["each_way_extra_place_id"] for item in listed.json()
    )

    settled = client.put(
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json=payload(status="Settled", result="Extra Place"),
    )
    assert settled.status_code == 200
    assert settled.json()["final_value"] == "30.53"

    blocked = client.request(
        "DELETE",
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json={},
    )
    assert blocked.status_code == 409

    deleted = client.request(
        "DELETE",
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json={"deletion_reason": "Synthetic regression cleanup"},
    )
    assert deleted.status_code == 204


def test_historical_extra_place_preserves_imported_realised_value_without_modern_inputs() -> None:
    client = TestClient(app)
    historical = payload(
        win_exchange="",
        win_lay_odds="",
        place_exchange="",
        place_lay_odds="",
        bookmaker_places="",
        exchange_places="",
        status="Settled",
        result="Extra Place",
        imported_historical_pnl="12.34",
        calculation_provenance="imported_historical",
        user_notes="Synthetic source provenance retained.",
    )
    created = client.post(
        "/profiles/profile-demo-001/each-way-extra-places", json=historical
    )
    assert created.status_code == 201, created.text
    row = created.json()
    assert row["calculation_state"] == "historical_imported"
    assert row["current_value"] == "12.34"
    assert row["final_value"] == "12.34"
    assert row["win_lay_stake"] is None
    assert "were not inferred" in row["calculation_notes"][0]
    retained = client.put(
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json={**historical, "user_notes": "Historical row remains accessible."},
    )
    assert retained.status_code == 200
    assert retained.json()["user_notes"] == "Historical row remains accessible."


@pytest.mark.parametrize(
    ("status", "lifecycle", "restrictions", "state", "operational"),
    [
        ("Active", "Active", "[]", "not_checked", True),
        ("Bonus Restricted", "Active", '["Bonus Restricted"]', "not_checked", True),
        ("Stake Restricted", "Active", '["Soft Limited"]', "warning", True),
        ("Blocked", "Suspended", "[]", "blocked", False),
        ("Active", "Active", '["KYC Blocked"]', "blocked", False),
        ("Active", "Active", '["Risk Blocked"]', "blocked", False),
        ("Active", "Active", '["Login Restricted"]', "blocked", False),
        ("Pending Sign Up", "Pending Sign Up", "[]", "planning", False),
    ],
)
def test_extra_place_account_health_does_not_invent_capability(
    status: str,
    lifecycle: str,
    restrictions: str,
    state: str,
    operational: bool,
) -> None:
    health = resolve_extra_place_account_health(
        status=status,
        lifecycle_status=lifecycle,
        restrictions_json=restrictions,
    )
    assert health.access_state == state
    assert health.capability_state == "NotChecked"
    assert health.allows_operational_use is operational


@pytest.mark.parametrize(
    ("status", "lifecycle", "restrictions"),
    [
        ("Blocked", "Suspended", "[]"),
        ("Active", "Active", '["KYC Blocked"]'),
        ("Active", "Active", '["Login Restricted"]'),
    ],
)
def test_hard_account_access_prevents_new_extra_place_activity(
    status: str, lifecycle: str, restrictions: str
) -> None:
    client = TestClient(app)
    add_bookie(
        client,
        name="Restricted Bookmaker",
        status=status,
        lifecycle_status=lifecycle,
        restrictions_json=restrictions,
    )
    response = client.post(
        "/profiles/profile-demo-001/each-way-extra-places",
        json=payload(
            bookmaker="Restricted Bookmaker",
            bookmaker_account="Restricted Bookmaker",
        ),
    )
    assert response.status_code == 409
    assert list_each_way_extra_places("profile-demo-001") == []


def test_pending_signup_is_planning_only_and_profile_scoped() -> None:
    client = TestClient(app)
    add_bookie(
        client,
        profile_id="profile-demo-002",
        name="Planning Bookmaker",
        status="Pending Sign Up",
        lifecycle_status="Pending Sign Up",
    )
    wrong_profile = client.post(
        "/profiles/profile-demo-001/each-way-extra-places",
        json=payload(
            bookmaker="Planning Bookmaker",
            bookmaker_account="Planning Bookmaker",
            status="Prospecting",
        ),
    )
    assert wrong_profile.status_code == 409

    planning = client.post(
        "/profiles/profile-demo-002/each-way-extra-places",
        json=payload(
            bookmaker="Planning Bookmaker",
            bookmaker_account="Planning Bookmaker",
            status="Prospecting",
        ),
    )
    assert planning.status_code == 201
    operational = client.put(
        f"/profiles/profile-demo-002/each-way-extra-places/{planning.json()['each_way_extra_place_id']}",
        json=payload(
            bookmaker="Planning Bookmaker",
            bookmaker_account="Planning Bookmaker",
            status="Placed",
        ),
    )
    assert operational.status_code == 409


@pytest.mark.parametrize(
    ("status", "restrictions"),
    [
        ("Bonus Restricted", '["Bonus Restricted"]'),
        ("Stake Restricted", '["Soft Limited"]'),
    ],
)
def test_restricted_but_usable_accounts_allow_extra_places(
    status: str, restrictions: str
) -> None:
    client = TestClient(app)
    add_bookie(
        client,
        name="Usable Restricted Bookmaker",
        status=status,
        restrictions_json=restrictions,
    )
    response = client.post(
        "/profiles/profile-demo-001/each-way-extra-places",
        json=payload(
            bookmaker="Usable Restricted Bookmaker",
            bookmaker_account="Usable Restricted Bookmaker",
        ),
    )
    assert response.status_code == 201, response.text
