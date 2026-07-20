from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_sportsbook_workflow_create_update_and_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Demo Match",
        "offer_text": "Welcome Qualifier",
        "bookmaker": "Bookmaker A",
        "offer_type": "Sign up / Welcome",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "source_combo_preset_id": "COMBO-WEEKLY-BUILDER",
        "source_combo_preset_version": 3,
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-10",
        "user_notes": "Initial sportsbook workflow entry",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    create_response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["sportsbook_bet_id"]
    assert created["calculation_state"] == "resolved"
    assert created["reference_lay_stake_standard"] is not None
    assert created["reference_lay_stake_underlay"] is not None
    assert created["reference_lay_stake_overlay"] is not None
    assert created["projected_current_pnl"] is not None
    assert created["scenario_pnl_if_back_wins"] is not None
    assert created["scenario_pnl_if_lay_wins"] is not None
    assert created["lay_commission_1"] == "0.02"
    assert created["source_combo_preset_id"] == "COMBO-WEEKLY-BUILDER"
    assert created["source_combo_preset_version"] == 3

    list_profile_one = client.get("/profiles/profile-demo-001/sportsbook-bets")
    assert list_profile_one.status_code == 200
    assert any(
        row["sportsbook_bet_id"] == created["sportsbook_bet_id"]
        for row in list_profile_one.json()
    )

    list_profile_two = client.get("/profiles/profile-demo-002/sportsbook-bets")
    assert list_profile_two.status_code == 200
    assert all(
        row["sportsbook_bet_id"] != created["sportsbook_bet_id"]
        for row in list_profile_two.json()
    )

    updated_payload = {
        **payload,
        "status": "Settled",
        "result": "Back Won",
        "manual_override_value": "-0.75",
        "manual_override_reason": "Manual correction after settlement review",
    }
    update_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{created['sportsbook_bet_id']}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["manual_override_value"] == "-0.75"
    assert updated["manual_override_reason"] == "Manual correction after settlement review"
    assert updated["final_net_pnl"] == "-0.75"
    assert updated["source_combo_preset_id"] == "COMBO-WEEKLY-BUILDER"
    assert updated["source_combo_preset_version"] == 3

    wrong_profile_response = client.get(
        f"/profiles/profile-demo-002/sportsbook-bets/{created['sportsbook_bet_id']}"
    )
    assert wrong_profile_response.status_code == 404

    assert count_audit_rows("profile-demo-001", created["sportsbook_bet_id"]) >= 2

    delete_response = client.delete(
        f"/profiles/profile-demo-001/sportsbook-bets/{created['sportsbook_bet_id']}"
    )
    assert delete_response.status_code == 204

    deleted_lookup = client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{created['sportsbook_bet_id']}"
    )
    assert deleted_lookup.status_code == 404


def test_override_reason_is_required(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Manual Override Match",
        "offer_text": "",
        "bookmaker": "Bookmaker A",
        "offer_type": "",
        "status": "Settled",
        "result": "Back Won",
        "back_stake": "10.00",
        "back_odds": "2.20",
        "match_strategy": "Standard",
        "lay_odds_1": "2.30",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-12",
        "user_notes": "",
        "manual_override_value": "-0.50",
        "manual_override_reason": "",
    }

    response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert response.status_code == 422


def test_seed_rows_load_into_dedicated_sportsbook_table(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/profile-demo-001/sportsbook-bets")
    assert response.status_code == 200
    assert response.json()

    connection = sqlite3.connect(settings.database_path)
    count = connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0]
    connection.close()
    assert count > 0


def test_missing_commission_keeps_money_values_incomplete(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "event_name": "Missing Commission Match",
        "offer_text": "",
        "bookmaker": "Bookmaker A",
        "offer_type": "Sign up / Welcome",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "lay_commission_1": "",
        "exchange_name": "Unknown Exchange",
        "date_settled": "2026-07-10",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["calculation_state"] == "incomplete"
    assert body["projected_current_pnl"] is None


def test_preview_uses_contract_backed_calculation_without_saving(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Preview Match",
        "offer_text": "Preview Offer",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Preview Offer",
        "fixture_type": "Football",
        "market": "Match Odds",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-10",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    preview_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets/preview",
        json=payload,
    )
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["lay_commission_1"] == "0.02"
    assert preview["reference_lay_stake_standard"] is not None
    assert preview["reference_lay_stake_underlay"] is not None
    assert preview["reference_lay_stake_overlay"] is not None
    assert preview["projected_current_pnl"] is not None
    assert preview["scenario_pnl_if_back_wins"] is not None
    assert preview["scenario_pnl_if_lay_wins"] is not None

    list_response = client.get("/profiles/profile-demo-001/sportsbook-bets")
    assert list_response.status_code == 200
    assert all(row["event_name"] != "Preview Match" for row in list_response.json())


def test_multilay_preview_resolves_when_extra_outcomes_are_present(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Multilay Preview Match",
        "offer_text": "Multilay Preview",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Multilay Preview",
        "fixture_type": "Football",
        "market": "Accumulator / Multiple",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Multilay",
        "lay_odds_1": "5.20",
        "multi_lay_outcome_1_name": "Score 1-0",
        "multi_lay_outcomes_json": json.dumps(
            [
                {
                    "id": "outcome1",
                    "label": "Score 1-0",
                    "layOdds": "5.20",
                    "placedExchange": "",
                    "placedLayOdds": "",
                    "placedMatchedStake": "",
                    "placementState": "pending",
                },
                {"id": "outcome2", "label": "Score 2-0", "layOdds": "6.30"},
            ]
        ),
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-10",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    preview_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets/preview",
        json=payload,
    )
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["calculation_state"] == "resolved"
    assert preview["reference_lay_stake_standard"] == "9.65"
    assert preview["reference_lay_stake_underlay"] == "9.52"
    assert preview["reference_lay_stake_overlay"] == "10.20"
    assert preview["scenario_pnl_if_back_wins"] is not None
    assert preview["scenario_pnl_if_lay_wins"] is not None
    assert preview["projected_current_pnl"] is not None


def test_multilay_saved_row_uses_branch_placement_state_for_part_laid_status(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Multilay Saved Match",
        "offer_text": "Multilay Saved",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Multilay Saved",
        "fixture_type": "Football",
        "market": "Accumulator / Multiple",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Multilay",
        "lay_odds_1": "5.20",
        "multi_lay_outcome_1_name": "Score 1-0",
        "multi_lay_outcomes_json": json.dumps(
            [
                {
                    "id": "outcome1",
                    "label": "Score 1-0",
                    "layOdds": "5.20",
                    "placedExchange": "Matchbook",
                    "placedLayOdds": "5.20",
                    "placedMatchedStake": "9.65",
                    "placementState": "placed",
                },
                {
                    "id": "outcome2",
                    "label": "Score 2-0",
                    "layOdds": "6.30",
                    "placementState": "pending",
                },
                {
                    "id": "outcome3",
                    "label": "Score 2-1",
                    "layOdds": "8.10",
                    "placementState": "pending",
                },
            ]
        ),
        "lay_actual": "9.65",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-10",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    create_response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["calculation_state"] == "resolved"
    assert created["lay_actual"] == "9.65"
    assert created["lay_status"] == "Part Laid"
    assert created["multi_lay_outcome_1_name"] == "Score 1-0"
    assert created["multi_lay_outcomes_json"] == payload["multi_lay_outcomes_json"]

    list_response = client.get("/profiles/profile-demo-001/sportsbook-bets")
    assert list_response.status_code == 200
    saved_row = next(
        row
        for row in list_response.json()
        if row["sportsbook_bet_id"] == created["sportsbook_bet_id"]
    )
    assert saved_row["lay_actual"] == "9.65"
    assert saved_row["lay_status"] == "Part Laid"
    assert saved_row["multi_lay_outcome_1_name"] == "Score 1-0"
    assert saved_row["multi_lay_outcomes_json"] == payload["multi_lay_outcomes_json"]


def test_multilay_saved_row_becomes_fully_laid_when_all_branches_are_placed(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Multilay Fully Laid Match",
        "offer_text": "Multilay Fully Laid",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Multilay Fully Laid",
        "fixture_type": "Football",
        "market": "Accumulator / Multiple",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Multilay",
        "lay_odds_1": "5.20",
        "multi_lay_outcome_1_name": "Score 1-0",
        "multi_lay_outcomes_json": json.dumps(
            [
                {
                    "id": "outcome1",
                    "label": "Score 1-0",
                    "layOdds": "5.20",
                    "placedExchange": "Matchbook",
                    "placedLayOdds": "5.20",
                    "placedMatchedStake": "9.65",
                    "placementState": "placed",
                },
                {
                    "id": "outcome2",
                    "label": "Score 2-0",
                    "layOdds": "6.30",
                    "placedExchange": "Matchbook",
                    "placedLayOdds": "6.30",
                    "placedMatchedStake": "7.96",
                    "placementState": "placed",
                },
            ]
        ),
        "lay_actual": "9.65",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-10",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    create_response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["lay_status"] == "Fully Laid"


def test_profit_boost_percentage_drives_existing_cash_first_calculation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    payload = {
        "event_name": "Profit Boost Demo Match",
        "offer_text": "15 percent profit boost",
        "bookmaker": "Bookmaker A",
        "offer_type": "Profit Boost",
        "bet_type": "Single",
        "fixture_type": "Football",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "",
        "profit_boost_mode": "percentage",
        "base_back_odds": "3.00",
        "profit_boost_percent": "15",
        "maximum_boost_winnings": "",
        "actual_accepted_back_odds": "",
        "match_strategy": "Standard",
        "lay_odds_1": "3.40",
        "exchange_name": "Matchbook",
        "date_settled": "2026-07-10",
    }

    response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)

    assert response.status_code == 201, response.text
    row = response.json()
    assert row["reference_boosted_odds"] == "3.3000"
    assert row["effective_back_odds"] == "3.3000"
    assert row["profit_boost_source"] == "calculated"
    assert row["calculation_state"] == "resolved"
