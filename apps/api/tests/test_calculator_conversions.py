from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.environment = "local"
    settings.auth_required = False
    settings.database_mode = "local"
    settings.auth_session_secret = "calculator-conversion-test-secret-at-least-32-bytes"
    settings.auth_owner_emails = "owner@example.invalid"
    settings.database_url = f"sqlite:///{tmp_path / 'calculator-conversions.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def add_account(
    client: TestClient,
    profile_id: str,
    name: str,
    account_type: str,
    *,
    restrictions: list[str] | None = None,
) -> None:
    assert client.patch(f"/profiles/{profile_id}", json={"status": "Active"}).status_code == 200
    response = client.post(
        f"/profiles/{profile_id}/accounts",
        json={
            "account": name,
            "type": account_type,
            "status": "Active",
            "lifecycle_status": "Active",
            "restrictions": restrictions or [],
            "channel": "Online",
            **({"commission_rate": "0.02"} if account_type == "Exchange" else {}),
        },
    )
    assert response.status_code == 201, response.text


def standard_payload(profile_ids: list[str]) -> dict[str, object]:
    calculator = {
        "bet_type": "qualifying",
        "free_bet_mode": "SNR",
        "promotion_mode": "standard",
        "strategy": "Standard",
        "back_stake": "10.00",
        "back_odds": "3.00",
        "lay_odds": "3.10",
        "exchange_commission": "0.02",
        "manual_lay_stake": "",
        "promotion_value": "",
        "bonus_trigger": "Lay Wins",
        "retention_percent": "70",
        "underlay_factor": "0.928",
        "overlay_factor": "1.300",
        "profit_boost_mode": "displayed_odds",
        "boosted_back_odds": "",
        "total_potential_return": "",
        "potential_profit": "",
        "base_back_odds": "",
        "profit_boost_percent": "",
        "actual_accepted_back_odds": "",
        "maximum_boost_winnings": "",
    }
    return {
        "source": {
            "calculator_family": "matched-betting",
            "calculator_version": "matched-betting-v1",
            "calculator_mode": "qualifying",
            "canonical_inputs": {**calculator, "exchange": "Smarkets"},
            "created_at": "2026-09-09T10:00:00Z",
        },
        "calculator": calculator,
        "targets": [
            {"profile_id": profile_id, "bookmaker": "Bet365"} for profile_id in profile_ids
        ],
        "event_name": "Synthetic United v Example City",
        "offer_type": "Qualifying Bet",
        "bet_type": "Single",
        "offer_name": "",
        "fixture_type": "Football",
    }


def authenticated_client() -> TestClient:
    client = TestClient(app)
    token = create_session_token(
        subject="calculator-test-owner",
        email="owner@example.invalid",
        name="Owner",
        now=int(time.time()),
    )
    client.cookies.set(SESSION_COOKIE_NAME, token)
    return client


def blackjack_snapshot(
    *, mode: str = "live_play", activity_source: str = "own_cash"
) -> dict[str, object]:
    monetary = (
        {
            "ending_balance": "115.00",
            "free_credit_value": None,
            "recorded_hand_net": "10.00",
            "session_result": "15.00",
            "starting_balance": "100.00",
            "withdrawable_result": None,
        }
        if mode == "live_play"
        else {
            "ending_balance": None,
            "free_credit_value": "10.00",
            "recorded_hand_net": None,
            "session_result": None,
            "starting_balance": None,
            "withdrawable_result": "4.00",
        }
    )
    unsigned: dict[str, object] = {
        "activity_source": activity_source,
        "calculator_family": "blackjack_strategy",
        "calculator_version": "blackjack-session-v1",
        "conversion_eligible": True,
        "ended_at": "2026-09-09T10:30:00Z",
        "hands": [
            {
                "dealer_card": "6",
                "hand_number": 1,
                "hands": [
                    {
                        "actual_actions": ["Stand"],
                        "actual_return": "20.00",
                        "cards": ["10", "K"],
                        "classification": "hard",
                        "committed_stake": "10.00",
                        "label": "Player",
                        "outcome": "Win",
                        "recommendation_sequence": ["Stand"],
                        "starting_stake": "10.00",
                        "total": 20,
                    }
                ],
            }
        ],
        "monetary": monetary,
        "rules": {"dealer_hits_soft_17": False, "surrender_allowed": False},
        "session_mode": mode,
        "started_at": "2026-09-09T10:00:00Z",
        "table_type": "digital_rng",
        "total_hands": 1,
    }
    canonical = json.dumps(unsigned, sort_keys=True, separators=(",", ":"))
    checksum = hashlib.sha256(canonical.encode()).hexdigest()
    return {
        **unsigned,
        "source_checksum": checksum,
        "source_id": f"blackjack-session-{checksum[:20]}",
    }


def test_standard_conversion_is_profile_isolated_recalculated_and_idempotent(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    for profile_id in ("profile-demo-001", "profile-demo-002"):
        add_account(client, profile_id, "Bet365", "Bookie")
        add_account(client, profile_id, "Smarkets", "Exchange")

    first = client.post(
        "/fund-manager/calculator-conversions/standard",
        json=standard_payload(["profile-demo-001", "profile-demo-002"]),
    )
    assert first.status_code == 200, first.text
    assert [item["state"] for item in first.json()["results"]] == ["succeeded", "succeeded"]
    ids = [item["record_id"] for item in first.json()["results"]]
    for profile_id, record_id in zip(("profile-demo-001", "profile-demo-002"), ids, strict=True):
        row = client.get(f"/profiles/{profile_id}/sportsbook-bets/{record_id}").json()
        assert row["status"] == "Prospecting"
        assert row["calculation_state"] == "resolved"
        assert "Calculator source:" in row["user_notes"]

    retry = client.post(
        "/fund-manager/calculator-conversions/standard",
        json=standard_payload(["profile-demo-001", "profile-demo-002"]),
    )
    assert [item["state"] for item in retry.json()["results"]] == [
        "already_succeeded",
        "already_succeeded",
    ]
    assert [item["record_id"] for item in retry.json()["results"]] == ids
    notices = [
        item
        for item in client.get("/fund-manager/notifications").json()
        if item["notification_type"] == "calculator_conversion_complete"
    ]
    assert len(notices) == 2
    assert {item["href"] for item in notices} == {item["href"] for item in first.json()["results"]}


def test_standard_conversion_keeps_independent_failed_target_retryable(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    add_account(client, "profile-demo-002", "Bet365", "Bookie", restrictions=["Login Restricted"])
    add_account(client, "profile-demo-002", "Smarkets", "Exchange")
    response = client.post(
        "/fund-manager/calculator-conversions/standard",
        json=standard_payload(["profile-demo-001", "profile-demo-002"]),
    )
    assert [item["state"] for item in response.json()["results"]] == ["succeeded", "failed"]
    assert "login restricted" in response.json()["results"][1]["reasons"][0]


def test_blackjack_conversion_maps_manual_play_and_blocks_duplicate_snapshot(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "BetMGM", "Bookie")
    payload = {
        "snapshot": blackjack_snapshot(),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
        "activity_name": "Synthetic Blackjack session",
        "offer_identity": "",
    }
    first = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert first.status_code == 200, first.text
    result = first.json()["results"][0]
    row = client.get(f"/profiles/profile-demo-001/casino-offers/{result['record_id']}").json()
    assert row["offer_type"] == "Manual Play / No Offer"
    assert row["status"] == "Settled"
    assert row["final_net_pnl"] == "15.00"
    assert blackjack_snapshot()["source_checksum"] in row["user_notes"]
    retry = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert retry.json()["results"][0]["state"] == "already_succeeded"
    assert retry.json()["results"][0]["record_id"] == result["record_id"]
    notices = [
        item
        for item in client.get("/fund-manager/notifications").json()
        if item["notification_type"] == "calculator_conversion_complete"
    ]
    assert len(notices) == 1
    assert notices[0]["href"] == result["href"]


def test_blackjack_free_play_preserves_non_cash_provenance(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "BetMGM", "Bookie")
    payload = {
        "snapshot": blackjack_snapshot(mode="free_play", activity_source="free_credit"),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
        "activity_name": "Synthetic free-play Blackjack session",
    }
    response = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert response.status_code == 200, response.text
    record_id = response.json()["results"][0]["record_id"]
    row = client.get(f"/profiles/profile-demo-001/casino-offers/{record_id}").json()
    assert row["offer_type"] == "Fixed Spins Or Free Play"
    assert row["credit_amount"] == "10.00"
    assert row["final_net_pnl"] == "4.00"
    assert row["cash_stake"] == ""


def test_blackjack_simulation_and_promotion_without_identity_fail_closed(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    simulation = blackjack_snapshot(mode="simulation", activity_source="own_cash")
    simulation["conversion_eligible"] = False
    unsigned = {
        key: value
        for key, value in simulation.items()
        if key not in {"source_id", "source_checksum"}
    }
    checksum = hashlib.sha256(
        json.dumps(unsigned, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    simulation.update(source_checksum=checksum, source_id=f"blackjack-session-{checksum[:20]}")
    response = client.post(
        "/fund-manager/calculator-conversions/blackjack",
        json={"snapshot": simulation, "profile_id": "profile-demo-001", "casino_account": "BetMGM"},
    )
    assert response.status_code == 422

    promotion = blackjack_snapshot(activity_source="promotion")
    response = client.post(
        "/fund-manager/calculator-conversions/blackjack",
        json={"snapshot": promotion, "profile_id": "profile-demo-001", "casino_account": "BetMGM"},
    )
    assert response.status_code == 422
