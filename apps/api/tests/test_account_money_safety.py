"""#91 synthetic Account monetary mutations; no private seed or operational database."""

import json

import pytest
from fastapi.testclient import TestClient

from openforge_api import db
from openforge_api.config import settings
from openforge_api.main import app


@pytest.fixture
def money_client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{tmp_path / 'money.sqlite3'}")
    monkeypatch.setattr(settings, "backup_directory", str(tmp_path / "backups"))
    monkeypatch.setattr(settings, "auth_required", False)
    monkeypatch.setattr(settings, "auth_owner_emails", "money-owner@example.invalid")
    monkeypatch.setattr(
        settings, "auth_session_secret", "synthetic-money-test-secret-not-production"
    )
    monkeypatch.setattr(db, "load_tracker_seed", lambda: None)
    catalogue = tmp_path / "catalogue.json"
    catalogue.write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic",
                "updated_at": "2026-09-12",
                "records": [
                    {
                        "catalogue_id": "BANK-DEMO-001",
                        "account_type": "Bank",
                        "brand_name": "Bank A",
                        "short_display_name": "Bank A",
                        "operator_group": "Synthetic",
                        "platform": "Synthetic",
                        "foreground_colour": "#FFFFFF",
                        "background_colour": "#455A64",
                        "operating_jurisdictions": ["GB"],
                        "operating_subdivisions": [],
                        "operating_channels": ["web"],
                        "source": "Synthetic fixture",
                    }
                ],
            }
        )
    )
    monkeypatch.setattr(settings, "account_catalogue_source", str(catalogue))
    db.create_profile_with_onboarding(
        {
            "profile_id": "money-a",
            "display_name": "Synthetic A",
            "profile_code": "MONEY-A",
            "tracking_start_date": "2026-09-01",
            "current_cash_snapshot": "0.00",
            "enabled_modules": ["sportsbook-bets"],
            "accounts": [],
            "quick_actions": [],
            "exchange_commissions": [],
        }
    )
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Active' WHERE profile_id='money-a'")
    from openforge_api.auth import create_session_token

    token = create_session_token(
        subject="synthetic-owner", email="money-owner@example.invalid", name="Synthetic owner"
    )
    client = TestClient(app, raise_server_exceptions=False)
    client.cookies.set("pd_session", token)
    yield client


def payload(**changes):
    return {
        "account": "Bank A",
        "catalogue_id": "BANK-DEMO-001",
        "type": "Bank",
        "status": "Active",
        "channel": "Online",
        "current_balance": "12.34",
        "pending_withdrawal_amount": "0.00",
        "last_balance_update": "2026-09-01T10:00:00Z",
        **changes,
    }


@pytest.mark.parametrize(
    "value", ["not-money", "NaN", "Infinity", "-Infinity", "1.234", "1,23", "1e2", None]
)
@pytest.mark.parametrize("field", ["current_balance", "pending_withdrawal_amount"])
def test_reject_before_creation_and_update(money_client, field, value):
    r = money_client.post("/profiles/money-a/accounts", json=payload(**{field: value}))
    assert r.status_code == 422
    assert db.list_accounts("money-a") == []
    created = money_client.post("/profiles/money-a/accounts", json=payload()).json()
    before = db.get_account("money-a", created["account_id"])
    audits = db.count_account_audit_rows("money-a", created["account_id"])
    r = money_client.put(
        f"/profiles/money-a/accounts/{created['account_id']}", json=payload(**{field: value})
    )
    assert r.status_code == 422
    assert db.get_account("money-a", created["account_id"]) == before
    assert db.count_account_audit_rows("money-a", created["account_id"]) == audits


def test_omitted_blank_zero_signed_and_legacy_read(money_client):
    created = money_client.post(
        "/profiles/money-a/accounts", json=payload(current_balance=".50")
    ).json()
    assert created["current_balance"] == "0.50"
    patch = payload()
    for field in ["current_balance", "pending_withdrawal_amount", "last_balance_update"]:
        patch.pop(field)
    r = money_client.put(f"/profiles/money-a/accounts/{created['account_id']}", json=patch)
    assert r.json()["current_balance"] == "0.50"
    assert r.json()["last_balance_update"] == created["last_balance_update"]
    for value, expected in [("", ""), ("0", "0.00"), ("-1.25", "-1.25")]:
        r = money_client.put(
            f"/profiles/money-a/accounts/{created['account_id']}",
            json=payload(current_balance=value),
        )
        assert r.status_code == 200
        assert r.json()["current_balance"] == expected
    with db.connect() as c:
        c.execute(
            "UPDATE accounts SET current_balance='NaN' WHERE account_id=?", (created["account_id"],)
        )
    assert money_client.get("/profiles/money-a/accounts").json()[0]["current_balance"] == "NaN"
    assert money_client.get("/profiles/money-a/exports/portable-profile.xlsx").status_code == 409
    r = money_client.put(
        f"/profiles/money-a/accounts/{created['account_id']}", json=payload(current_balance="10.00")
    )
    assert r.status_code == 200
    assert money_client.get("/profiles/money-a/exports/portable-profile.xlsx").status_code == 200
    assert (
        money_client.get(f"/profiles/not-money-a/accounts/{created['account_id']}").status_code
        == 404
    )


@pytest.mark.parametrize("value", ["not-money", "NaN", "Infinity", "-Infinity", "1.234"])
def test_shared_alternate_writes_reject_before_mutation(money_client, value):
    r = money_client.put(
        "/profiles/money-a/accounts/catalogue-selection/BANK-DEMO-001",
        json={"selected": True, "current_balance": value},
    )
    assert r.status_code == 422
    assert db.list_accounts("money-a") == []
    from openforge_api.money_input import AccountMoneyError

    with pytest.raises(AccountMoneyError):
        db.create_account("money-a", payload(current_balance=value))
    assert db.list_accounts("money-a") == []
    r = money_client.post(
        "/profiles/onboarding",
        json={
            "setup_path": "import",
            "display_name": "Synthetic rejected",
            "profile_code": "REJECTED",
            "tracking_start_date": "2026-09-01",
            "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
            "accounts": [{"catalogue_id": "BANK-DEMO-001", "opening_balance": value}],
            "quick_actions": [],
        },
    )
    assert r.status_code == 422
    assert any("opening_balance" in error["loc"] for error in r.json()["detail"])
    assert not any(p.profile_code == "REJECTED" for p in db.list_profiles())


def test_catalogue_metadata_toggle_preserves_balance(money_client):
    a = money_client.post("/profiles/money-a/accounts", json=payload()).json()
    r = money_client.put(
        "/profiles/money-a/accounts/catalogue-selection/BANK-DEMO-001",
        json={"selected": True, "status": "Active"},
    )
    assert r.status_code == 200
    assert r.json()["current_balance"] == a["current_balance"]
    assert r.json()["last_balance_update"] == a["last_balance_update"]


@pytest.mark.parametrize("field", ["current_balance", "pending_withdrawal_amount"])
def test_direct_persistence_update_is_not_a_bypass(money_client, field):
    from openforge_api.money_input import AccountMoneyError

    a = money_client.post("/profiles/money-a/accounts", json=payload()).json()
    before = db.get_account("money-a", a["account_id"])
    audits = db.count_account_audit_rows("money-a", a["account_id"])
    with pytest.raises(AccountMoneyError):
        db.update_account("money-a", a["account_id"], payload(**{field: "Infinity"}))
    assert db.get_account("money-a", a["account_id"]) == before
    assert db.count_account_audit_rows("money-a", a["account_id"]) == audits
