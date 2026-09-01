from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

from openforge_api import common_bet_combos
from openforge_api.config import settings
from openforge_api.db import create_account
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def create_action(
    client: TestClient,
    *,
    ledger: str,
    bookmaker: str,
    recurrence: str = "Weekly",
) -> dict[str, object]:
    enabled_fields = ["bookmaker", "offerName"]
    defaults = {
        "bookmaker": bookmaker,
        "offerName": "Synthetic weekly opportunity",
        "opportunityEnabled": "true",
        "opportunityKind": "Free Bet" if ledger == "Free Bets" else "Reload",
        "opportunityRecurrence": recurrence,
        "opportunityNotes": "Synthetic opportunity fixture.",
    }
    if ledger == "Free Bets":
        enabled_fields.append("freeBetValue")
        defaults["freeBetValue"] = "10.00"
    response = client.post(
        "/fund-manager/common-bet-combos/profile-actions/profile-demo-001",
        json={
            "ledger_type": ledger,
            "label": f"Synthetic {ledger} opportunity",
            "enabled_fields": enabled_fields,
            "defaults": defaults,
            "enabled": True,
            "is_favourite": False,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_weekly_sportsbook_opportunity_is_prospecting_and_idempotent(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    bookmaker = next(
        row["account"]
        for row in client.get("/profiles/profile-demo-001/accounts").json()
        if row["type"] == "Bookie"
    )
    action = create_action(client, ledger="Sportsbook", bookmaker=bookmaker)

    opportunities = client.get(
        "/fund-manager/common-bet-combos/profile-opportunities/profile-demo-001"
    ).json()
    opportunity = next(
        row for row in opportunities if row["opportunity_key"] == action["preset_id"]
    )
    assert opportunity["recurrence"] == "Weekly"
    assert opportunity["already_created"] is False

    created = client.post(
        "/fund-manager/common-bet-combos/profile-opportunities/profile-demo-001/"
        f"{action['preset_id']}/instantiate",
        json={"allow_duplicate": False},
    )
    assert created.status_code == 201, created.text
    sportsbook = client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{created.json()['target_record_id']}"
    ).json()
    assert sportsbook["status"] == "Prospecting"
    assert sportsbook["result"] == "Pending"
    assert sportsbook["match_strategy"] == "No Lay"
    assert sportsbook["reporting_value"] is None
    assert sportsbook["counts_as_open"] is True

    duplicate = client.post(
        "/fund-manager/common-bet-combos/profile-opportunities/profile-demo-001/"
        f"{action['preset_id']}/instantiate",
        json={"allow_duplicate": False},
    )
    assert duplicate.status_code == 409


def test_free_bet_opportunity_creates_zero_value_pre_execution_row(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    bookmaker = next(
        row["account"]
        for row in client.get("/profiles/profile-demo-001/accounts").json()
        if row["type"] == "Bookie"
    )
    action = create_action(client, ledger="Free Bets", bookmaker=bookmaker)
    created = client.post(
        "/fund-manager/common-bet-combos/profile-opportunities/profile-demo-001/"
        f"{action['preset_id']}/instantiate",
        json={"allow_duplicate": False},
    )
    assert created.status_code == 201, created.text
    free_bet = client.get(
        f"/profiles/profile-demo-001/free-bets/{created.json()['target_record_id']}"
    ).json()
    assert free_bet["status"] == "Prospecting"
    assert free_bet["free_bet_value"] == "10.00"
    assert free_bet["match_strategy"] == ""
    assert free_bet["reporting_value"] == "0.00"


def test_signup_opportunity_warns_about_related_restricted_account(
    tmp_path: Path,
    monkeypatch,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.get("/profiles/profile-demo-001/accounts")
    monkeypatch.setattr(
        common_bet_combos,
        "get_master_account_catalogue",
        lambda: SimpleNamespace(
            records=[
                SimpleNamespace(
                    catalogue_id="CAT-CANDIDATE",
                    risk_team="Shared Risk",
                    operator_group="",
                    platform="",
                ),
                SimpleNamespace(
                    catalogue_id="CAT-RESTRICTED",
                    risk_team="Shared Risk",
                    operator_group="",
                    platform="",
                ),
            ]
        ),
    )
    base_account = {
        "bookmaker_id": None,
        "type": "Bookie",
        "counts_in_cash_total": True,
        "channel": "Online",
        "current_balance": "0.00",
        "pending_withdrawal_amount": "0.00",
        "last_balance_update": "",
        "group_name": "",
        "platform": "",
        "sign_up_date": "",
        "notes": "",
    }
    create_account(
        "profile-demo-001",
        {
            **base_account,
            "account_id": "AC-SIGNUP-CANDIDATE",
            "catalogue_id": "CAT-CANDIDATE",
            "account": "Candidate Bookmaker",
            "status": "Not Signed Up",
            "lifecycle_status": "Not Signed Up",
            "restrictions_json": "[]",
        },
    )
    create_account(
        "profile-demo-001",
        {
            **base_account,
            "account_id": "AC-RESTRICTED-RELATED",
            "catalogue_id": "CAT-RESTRICTED",
            "account": "Restricted Bookmaker",
            "status": "Bonus Restricted",
            "lifecycle_status": "Active",
            "restrictions_json": '["Bonus Restricted"]',
        },
    )

    response = client.get(
        "/fund-manager/common-bet-combos/profile-opportunities/profile-demo-001"
    )
    assert response.status_code == 200, response.text
    opportunity = next(
        row
        for row in response.json()
        if row["opportunity_key"] == "signup:AC-SIGNUP-CANDIDATE"
    )
    assert opportunity["risk_warnings"] == [
        "Potential related restriction: this provider shares Risk Team Shared Risk "
        "with Restricted Bookmaker, which is restricted on this Profile."
    ]
