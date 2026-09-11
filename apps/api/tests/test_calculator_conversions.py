from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
from openforge_api.config import settings
from openforge_api.db import connect
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
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "",
        "fixture_type": "Football",
    }


def multi_lay_payload(profile_ids: list[str]) -> dict[str, object]:
    calculator = {
        "allocation": "standard",
        "back_stake": "10.00",
        "back_odds": "4.00",
        "exchange_commission": "0.02",
        "outcomes": [
            {"label": "Home", "lay_odds": "2.50"},
            {"label": "Away", "lay_odds": "3.20"},
            {"label": "Draw", "lay_odds": "3.60"},
        ],
    }
    return {
        "source": {
            "calculator_family": "multi-lay",
            "calculator_version": "multi-lay-v1",
            "calculator_mode": "standard",
            "canonical_inputs": {"exchange": "Smarkets", "calculator": calculator},
            "created_at": "2026-09-09T11:00:00Z",
        },
        "calculator": calculator,
        "targets": [
            {"profile_id": profile_id, "bookmaker": "Bet365"} for profile_id in profile_ids
        ],
        "event_name": "Synthetic Multi-Lay fixture",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "fixture_type": "Football",
    }


def each_way_payload(profile_ids: list[str], mode: str = "Extra Place") -> dict[str, object]:
    calculator = {
        "mode": mode,
        "each_way_stake": "10.00",
        "back_odds": "9.00",
        "place_term_numerator": "1",
        "place_term_denominator": "5",
        "bookmaker_places": 4,
        "exchange_places": 3 if mode == "Extra Place" else 4,
        "win_lay_odds": "9.20",
        "place_lay_odds": "2.70",
        "win_commission": "0.02",
        "place_commission": "0.02",
    }
    return {
        "source": {
            "calculator_family": "each-way",
            "calculator_version": "each-way-extra-place-v1",
            "calculator_mode": mode,
            "canonical_inputs": {"exchange": "Smarkets", "calculator": calculator},
            "created_at": "2026-09-09T12:00:00Z",
        },
        "calculator": calculator,
        "targets": [
            {"profile_id": profile_id, "bookmaker": "Bet365"} for profile_id in profile_ids
        ],
        "runner": "Synthetic Runner",
        "race": "Synthetic 14:30",
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


def test_standard_new_intent_creates_new_opportunity_but_retry_does_not(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    payload = standard_payload(["profile-demo-001"])
    payload["conversion_intent_id"] = "intent-one"
    first = client.post("/fund-manager/calculator-conversions/standard", json=payload)
    retry = client.post("/fund-manager/calculator-conversions/standard", json=payload)
    payload["conversion_intent_id"] = "intent-two"
    second = client.post("/fund-manager/calculator-conversions/standard", json=payload)
    assert first.json()["results"][0]["state"] == "succeeded"
    assert retry.json()["results"][0]["state"] == "already_succeeded"
    assert second.json()["results"][0]["state"] == "succeeded"
    assert first.json()["results"][0]["record_id"] != second.json()["results"][0]["record_id"]


def test_standard_uses_account_id_and_rejects_noncanonical_classification(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Betfred", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET account = 'Same Brand' WHERE profile_id = ? AND type = 'Bookie'",
            ("profile-demo-001",),
        )
    accounts = [
        row
        for row in client.get("/profiles/profile-demo-001/accounts").json()
        if row["account"] == "Same Brand"
    ]
    payload = standard_payload(["profile-demo-001"])
    payload["targets"] = [
        {"profile_id": "profile-demo-001", "account_id": accounts[1]["account_id"]}
    ]
    assert (
        client.post("/fund-manager/calculator-conversions/standard", json=payload).status_code
        == 200
    )
    payload["offer_type"] = "made-up offer"
    assert (
        client.post("/fund-manager/calculator-conversions/standard", json=payload).status_code
        == 422
    )


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
    succeeded_id = response.json()["results"][0]["record_id"]
    retry = client.post(
        "/fund-manager/calculator-conversions/standard",
        json=standard_payload(["profile-demo-001", "profile-demo-002"]),
    )
    assert [item["state"] for item in retry.json()["results"]] == [
        "already_succeeded",
        "failed",
    ]
    assert retry.json()["results"][0]["record_id"] == succeeded_id


def test_standard_governed_offer_modes_map_to_authoritative_sportsbook_fields(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    cases = [
        ("cashback", "Cashback", {"promotion_value": "5.00"}, ""),
        (
            "bonus_lock_in",
            "Bonus Lock-In",
            {"promotion_value": "10.00", "retention_percent": "75", "bonus_trigger": "Lay Wins"},
            "",
        ),
        ("money_back", "Bonus Lock-In", {"promotion_value": "10.00"}, ""),
        (
            "profit_boost",
            "Profit Boost",
            {"back_odds": "", "profit_boost_mode": "displayed_odds", "boosted_back_odds": "3.20"},
            "displayed_odds",
        ),
        (
            "profit_boost",
            "Profit Boost",
            {
                "back_odds": "",
                "profit_boost_mode": "total_return",
                "total_potential_return": "32.00",
            },
            "displayed_odds",
        ),
        (
            "profit_boost",
            "Profit Boost",
            {"back_odds": "", "profit_boost_mode": "profit_only", "potential_profit": "22.00"},
            "displayed_odds",
        ),
        (
            "profit_boost",
            "Profit Boost",
            {
                "back_odds": "",
                "profit_boost_mode": "percentage",
                "base_back_odds": "3.00",
                "profit_boost_percent": "10",
            },
            "percentage",
        ),
    ]
    for index, (source_mode, offer_type, overrides, destination_boost_mode) in enumerate(cases):
        payload = standard_payload(["profile-demo-001"])
        calculator = payload["calculator"]
        assert isinstance(calculator, dict)
        calculator.update({"bet_type": source_mode, **overrides})
        source = payload["source"]
        assert isinstance(source, dict)
        source["calculator_mode"] = source_mode
        source["created_at"] = f"2026-09-09T10:{index:02d}:00Z"
        payload["offer_type"] = offer_type
        response = client.post("/fund-manager/calculator-conversions/standard", json=payload)
        assert response.status_code == 200, response.text
        result = response.json()["results"][0]
        assert result["state"] == "succeeded"
        row = client.get(f"/profiles/profile-demo-001/sportsbook-bets/{result['record_id']}").json()
        assert row["offer_type"] == offer_type
        assert row["profit_boost_mode"] == destination_boost_mode
        assert row["calculation_state"] == "resolved"


def test_standard_custom_and_part_lay_preserve_explicit_stake(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    for index, strategy in enumerate(("Custom", "Partial Lay")):
        payload = standard_payload(["profile-demo-001"])
        calculator = payload["calculator"]
        source = payload["source"]
        assert isinstance(calculator, dict) and isinstance(source, dict)
        calculator.update(strategy=strategy, manual_lay_stake="8.75")
        source["created_at"] = f"2026-09-09T11:0{index}:00Z"
        response = client.post("/fund-manager/calculator-conversions/standard", json=payload)
        assert response.status_code == 200, response.text
        result = response.json()["results"][0]
        row = client.get(f"/profiles/profile-demo-001/sportsbook-bets/{result['record_id']}").json()
        assert row["lay_actual"] == "8.75"
        assert row["calculation_state"] == "resolved"


def test_bonus_lock_in_conversion_uses_offer_aware_selected_strategy_stake(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    payload = standard_payload(["profile-demo-001"])
    calculator = payload["calculator"]
    source = payload["source"]
    assert isinstance(calculator, dict) and isinstance(source, dict)
    calculator.update(
        bet_type="bonus_lock_in",
        bonus_backing_bet="Normal",
        strategy="Underlay",
        back_stake="5.00",
        back_odds="9.24",
        lay_odds="10.50",
        exchange_commission="0",
        promotion_value="5.00",
        retention_percent="70",
        bonus_trigger="Lay Wins",
    )
    source["calculator_mode"] = "bonus_lock_in"
    payload["offer_type"] = "Bonus Lock-In"
    response = client.post("/fund-manager/calculator-conversions/standard", json=payload)
    assert response.status_code == 200, response.text
    result = response.json()["results"][0]
    row = client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{result['record_id']}"
    ).json()
    assert row["match_strategy"] == "Underlay"
    assert row["lay_actual"] == "1.50"

    with connect() as connection:
        target = connection.execute(
            "SELECT source_envelope_json FROM calculator_conversion_targets "
            "WHERE destination_record_id = ?",
            (result["record_id"],),
        ).fetchone()
    envelope = json.loads(target["source_envelope_json"])
    assert envelope["canonical_inputs"]["reference_result"]["selected_lay_stake"] == "1.50"


def test_free_bet_snr_and_sr_convert_to_native_prospecting_rows(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    for index, retention_mode in enumerate(("SNR", "SR")):
        payload = standard_payload(["profile-demo-001"])
        calculator = payload["calculator"]
        source = payload["source"]
        assert isinstance(calculator, dict) and isinstance(source, dict)
        calculator.update(bet_type="free_bet", free_bet_mode=retention_mode)
        source.update(calculator_mode="free_bet", created_at=f"2026-09-09T12:0{index}:00Z")
        payload["offer_type"] = "Bet & Get"
        response = client.post("/fund-manager/calculator-conversions/standard", json=payload)
        assert response.status_code == 200, response.text
        result = response.json()["results"][0]
        assert "/free-bets?" in result["href"]
        row = client.get(f"/profiles/profile-demo-001/free-bets/{result['record_id']}").json()
        assert row["status"] == "Prospecting"
        assert row["retention_mode"] == retention_mode
        assert row["calculation_state"] == "resolved"
        retry = client.post("/fund-manager/calculator-conversions/standard", json=payload)
        assert retry.json()["results"][0]["state"] == "already_succeeded"
        assert retry.json()["results"][0]["record_id"] == result["record_id"]


def test_conversion_envelope_retains_audited_reference_result(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    payload = standard_payload(["profile-demo-001"])
    calculator = payload["calculator"]
    source = payload["source"]
    assert isinstance(calculator, dict) and isinstance(source, dict)
    calculator.update(
        bet_type="profit_boost",
        back_odds="",
        profit_boost_mode="total_return",
        total_potential_return="32.00",
    )
    source["calculator_mode"] = "profit_boost"
    payload["offer_type"] = "Profit Boost"
    response = client.post("/fund-manager/calculator-conversions/standard", json=payload)
    assert response.status_code == 200, response.text
    with connect() as connection:
        row = connection.execute(
            "SELECT source_envelope_json FROM calculator_conversion_targets WHERE source_id LIKE ?",
            (f"{response.json()['source_id']}:%",),
        ).fetchone()
    assert row is not None
    envelope = json.loads(row["source_envelope_json"])
    assert envelope["canonical_inputs"]["calculator"]["profit_boost_mode"] == "total_return"
    assert envelope["canonical_inputs"]["reference_result"]["effective_back_odds"] == "3.2000"


def test_standard_source_mode_and_unsupported_bonus_trigger_fail_before_writes(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    sportsbook_ids = {
        row["sportsbook_bet_id"]
        for row in client.get("/profiles/profile-demo-001/sportsbook-bets").json()
    }
    free_bet_ids = {
        row["free_bet_id"] for row in client.get("/profiles/profile-demo-001/free-bets").json()
    }
    mismatch = standard_payload(["profile-demo-001"])
    mismatch["source"]["calculator_mode"] = "cashback"  # type: ignore[index]
    assert (
        client.post("/fund-manager/calculator-conversions/standard", json=mismatch).status_code
        == 422
    )

    unsupported = standard_payload(["profile-demo-001"])
    unsupported["source"]["calculator_mode"] = "bonus_lock_in"  # type: ignore[index]
    unsupported["calculator"].update(  # type: ignore[union-attr]
        bet_type="bonus_lock_in",
        bonus_backing_bet="SR",
        bonus_trigger="Back Wins",
        promotion_value="10.00",
    )
    unsupported["offer_type"] = "Bonus Lock-In"
    assert (
        client.post("/fund-manager/calculator-conversions/standard", json=unsupported).status_code
        == 422
    )
    unsupported_snr = standard_payload(["profile-demo-001"])
    unsupported_snr["source"]["calculator_mode"] = "bonus_lock_in"  # type: ignore[index]
    unsupported_snr["calculator"].update(  # type: ignore[union-attr]
        bet_type="bonus_lock_in", bonus_backing_bet="SNR", promotion_value="10.00"
    )
    unsupported_snr["offer_type"] = "Bonus Lock-In"
    response = client.post("/fund-manager/calculator-conversions/standard", json=unsupported_snr)
    assert response.status_code == 422
    assert "destination ledger has no governed free-bet-basis field" in response.text
    assert {
        row["sportsbook_bet_id"]
        for row in client.get("/profiles/profile-demo-001/sportsbook-bets").json()
    } == sportsbook_ids
    assert {
        row["free_bet_id"] for row in client.get("/profiles/profile-demo-001/free-bets").json()
    } == free_bet_ids


def test_multi_lay_conversion_preserves_all_legs_and_is_idempotent(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    payload = multi_lay_payload(["profile-demo-001"])

    first = client.post("/fund-manager/calculator-conversions/multi-lay", json=payload)
    assert first.status_code == 200, first.text
    result = first.json()["results"][0]
    row = client.get(f"/profiles/profile-demo-001/sportsbook-bets/{result['record_id']}").json()
    assert row["match_strategy"] == "Multilay"
    assert row["multi_lay_outcome_1_name"] == "Home"
    assert [item["label"] for item in json.loads(row["multi_lay_outcomes_json"])] == [
        "Away",
        "Draw",
    ]
    assert row["calculation_state"] == "resolved"

    retry = client.post("/fund-manager/calculator-conversions/multi-lay", json=payload)
    assert retry.json()["results"][0]["state"] == "already_succeeded"
    assert retry.json()["results"][0]["record_id"] == result["record_id"]


def test_extra_place_and_each_way_convert_to_profile_isolated_native_rows(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    for profile_id in ("profile-demo-001", "profile-demo-002"):
        add_account(client, profile_id, "Bet365", "Bookie")
        add_account(client, profile_id, "Smarkets", "Exchange")

    extra = client.post(
        "/fund-manager/calculator-conversions/each-way-extra-place",
        json=each_way_payload(["profile-demo-001", "profile-demo-002"]),
    )
    assert extra.status_code == 200, extra.text
    assert [item["state"] for item in extra.json()["results"]] == ["succeeded", "succeeded"]
    for result in extra.json()["results"]:
        row = client.get(
            f"/profiles/{result['profile_id']}/each-way-extra-places/{result['record_id']}"
        ).json()
        assert row["mode"] == "Extra Place"
        assert row["status"] == "Prospecting"
        assert row["result"] == "Pending"
        assert row["win_exchange"] == "Smarkets"
        assert row["place_exchange"] == "Smarkets"
        assert row["calculation_state"] == "resolved"
        assert "Calculator source:" in row["user_notes"]

    each_way = client.post(
        "/fund-manager/calculator-conversions/each-way-extra-place",
        json=each_way_payload(["profile-demo-001"], "Each Way"),
    )
    assert each_way.status_code == 200, each_way.text
    result = each_way.json()["results"][0]
    row = client.get(
        f"/profiles/profile-demo-001/each-way-extra-places/{result['record_id']}"
    ).json()
    assert row["mode"] == "Each Way"
    assert row["bookmaker_places"] == "4"
    assert row["exchange_places"] == "4"
    retry = client.post(
        "/fund-manager/calculator-conversions/each-way-extra-place",
        json=each_way_payload(["profile-demo-001"], "Each Way"),
    )
    assert retry.json()["results"][0]["state"] == "already_succeeded"
    assert retry.json()["results"][0]["record_id"] == result["record_id"]


def test_extra_place_conversion_keeps_bonus_restricted_planning_and_blocks_hard_access(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(
        client,
        "profile-demo-001",
        "Bet365",
        "Bookie",
        restrictions=["Bonus Restricted", "Soft Limited"],
    )
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    add_account(
        client,
        "profile-demo-002",
        "Bet365",
        "Bookie",
        restrictions=["Login Restricted"],
    )
    add_account(client, "profile-demo-002", "Smarkets", "Exchange")

    response = client.post(
        "/fund-manager/calculator-conversions/each-way-extra-place",
        json=each_way_payload(["profile-demo-001", "profile-demo-002"]),
    )
    assert response.status_code == 200, response.text
    assert [item["state"] for item in response.json()["results"]] == [
        "succeeded",
        "failed",
    ]
    assert "login restricted" in response.json()["results"][1]["reasons"][0]
    assert client.get("/profiles/profile-demo-002/each-way-extra-places").json() == []


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
