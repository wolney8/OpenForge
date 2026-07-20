from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import list_multi_profile_entry_batch_targets
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'multi-profile-entry.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def sportsbook_payload(**overrides: str) -> dict[str, str]:
    payload = {
        "event_name": "Synthetic multi-profile match",
        "offer_text": "Synthetic weekly offer",
        "bookmaker": "Bookmaker Copy Demo",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Bet 10 Get 5",
        "fixture_type": "Football",
        "market": "Match Odds",
        "status": "Prospecting",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "bonus_trigger": "",
        "maximum_bonus": "",
        "bonus_retention_rate": "70",
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "multi_lay_outcome_1_name": "",
        "multi_lay_outcomes_json": "[]",
        "lay_actual": "9.64",
        "lay_matched_stake_1": "9.64",
        "lay_commission_1": "",
        "exchange_name": "Exchange A",
        "date_settled": "2026-07-20T18:00:00",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }
    payload.update(overrides)
    return payload


def create_target_authorities(
    client: TestClient,
    *,
    profile_id: str,
    bookmaker_status: str = "Active",
) -> None:
    profile_response = client.patch(
        f"/profiles/{profile_id}",
        json={"status": "Active"},
    )
    assert profile_response.status_code == 200
    bookmaker_response = client.post(
        f"/profiles/{profile_id}/accounts",
        json={
            "account": "Bookmaker Copy Demo",
            "type": "Bookie",
            "status": bookmaker_status,
            "channel": "Online",
        },
    )
    assert bookmaker_response.status_code == 201
    exchange_response = client.post(
        f"/profiles/{profile_id}/accounts",
        json={
            "account": "Exchange B",
            "type": "Exchange",
            "status": "Active",
            "channel": "Online",
        },
    )
    assert exchange_response.status_code == 201
    commission_response = client.put(
        f"/profiles/{profile_id}/exchange-commissions",
        json={"exchange_name": "Exchange B", "commission_rate": "0.03"},
    )
    assert commission_response.status_code == 200


def test_copy_target_is_created_only_after_individual_submit(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_target_authorities(client, profile_id="profile-demo-002")
    client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Exchange A", "commission_rate": "0.02"},
    )
    source_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=sportsbook_payload(),
    )
    assert source_response.status_code == 201
    source_id = source_response.json()["sportsbook_bet_id"]

    candidates_response = client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-targets"
    )
    assert candidates_response.status_code == 200
    target = next(
        row for row in candidates_response.json() if row["profile_id"] == "profile-demo-002"
    )
    assert target["eligible"] is True
    assert target["bookmaker_account_status"] == "Active"
    assert target["exchange_options"] == [
        {"exchange_name": "Exchange B", "commission_rate": "0.03"}
    ]

    before_rows = client.get("/profiles/profile-demo-002/sportsbook-bets").json()
    batch_response = client.post(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-batches",
        json={"target_profile_ids": ["profile-demo-002"]},
    )
    assert batch_response.status_code == 201
    batch_id = batch_response.json()["batch_id"]
    assert client.get("/profiles/profile-demo-002/sportsbook-bets").json() == before_rows

    target_payload = sportsbook_payload(
        back_odds="2.14",
        lay_odds_1="2.24",
        lay_actual="9.55",
        lay_matched_stake_1="9.55",
        exchange_name="Exchange B",
    )
    submit_response = client.post(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-batches/"
        f"{batch_id}/targets/profile-demo-002/submit",
        json=target_payload,
    )
    assert submit_response.status_code == 201
    created = submit_response.json()["sportsbook_bet"]
    assert created["profile_id"] == "profile-demo-002"
    assert created["back_odds"] == "2.14"
    assert created["lay_commission_1"] == "0.03"
    audit_target = list_multi_profile_entry_batch_targets(batch_id)[0]
    assert audit_target["submit_state"] == "Created"
    assert audit_target["created_sportsbook_bet_id"] == created["sportsbook_bet_id"]

    duplicate_submit = client.post(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-batches/"
        f"{batch_id}/targets/profile-demo-002/submit",
        json=target_payload,
    )
    assert duplicate_submit.status_code == 409


def test_promotional_copy_blocks_bonus_restricted_target(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_target_authorities(
        client,
        profile_id="profile-demo-002",
        bookmaker_status="Bonus Restricted",
    )
    source_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=sportsbook_payload(exchange_name=""),
    )
    assert source_response.status_code == 201
    source_id = source_response.json()["sportsbook_bet_id"]

    candidates = client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-targets"
    ).json()
    target = next(row for row in candidates if row["profile_id"] == "profile-demo-002")
    assert target["eligible"] is False
    assert any("cannot use promotional offers" in reason for reason in target["reasons"])

    batch_response = client.post(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-batches",
        json={"target_profile_ids": ["profile-demo-002"]},
    )
    assert batch_response.status_code == 409


def test_cancelling_review_skips_pending_target_without_creating_row(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_target_authorities(client, profile_id="profile-demo-002")
    source_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=sportsbook_payload(exchange_name=""),
    )
    assert source_response.status_code == 201
    source_id = source_response.json()["sportsbook_bet_id"]
    before_rows = client.get("/profiles/profile-demo-002/sportsbook-bets").json()

    batch_response = client.post(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-batches",
        json={"target_profile_ids": ["profile-demo-002"]},
    )
    assert batch_response.status_code == 201
    batch_id = batch_response.json()["batch_id"]
    cancel_response = client.post(
        f"/profiles/profile-demo-001/sportsbook-bets/{source_id}/copy-batches/{batch_id}/cancel"
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["skipped_target_profile_ids"] == ["profile-demo-002"]
    assert client.get("/profiles/profile-demo-002/sportsbook-bets").json() == before_rows
    assert list_multi_profile_entry_batch_targets(batch_id)[0]["submit_state"] == "Skipped"
