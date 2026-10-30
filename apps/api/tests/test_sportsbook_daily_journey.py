from __future__ import annotations

from pathlib import Path

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi.testclient import TestClient

from openforge_api.config import SOURCE_ROOT, settings
from openforge_api.db import connect
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> TestClient:
    settings.database_url = f"sqlite:///{tmp_path / 'cp108.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    seed_synthetic_betting_context()
    return TestClient(app)


def payload(**overrides: str) -> dict[str, object]:
    values: dict[str, object] = {
        "event_name": "CP-108 Synthetic Qualifying Match",
        "offer_text": "Synthetic standard qualifier",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "CP-108 synthetic",
        "fixture_type": "Football",
        "market": "Match Odds",
        "status": "Prospecting",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-10-30T15:00:00Z",
        "user_notes": "CP-108 isolated fixture",
        "manual_override_value": "",
        "manual_override_reason": "",
        "correction_reason": "",
    }
    values.update(overrides)
    return values


def test_standard_journey_records_exposure_settlement_and_reasoned_correction(
    tmp_path: Path,
) -> None:
    client = configure_temp_database(tmp_path)
    commission = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert commission.status_code == 200

    created_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets", json=payload()
    )
    assert created_response.status_code == 201
    created = created_response.json()
    record_id = created["sportsbook_bet_id"]
    assert created["status"] == "Prospecting"
    assert created["counts_as_open"] is False
    assert created["reference_lay_stake_standard"] == "9.63"
    assert created["calculated_liability_1"] == "11.56"
    assert created["scenario_pnl_if_back_wins"] == "-0.56"
    assert created["scenario_pnl_if_lay_wins"] == "-0.56"

    placed_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=payload(status="Placed", lay_actual="9.63", lay_matched_stake_1="9.63"),
    )
    assert placed_response.status_code == 200
    placed = placed_response.json()
    assert placed["counts_as_open"] is True
    assert placed["projected_current_pnl"] == "-0.56"

    settled_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=payload(
            status="Settled",
            result="Back Won",
            lay_actual="9.63",
            lay_matched_stake_1="9.63",
        ),
    )
    assert settled_response.status_code == 200
    settled = settled_response.json()
    assert settled["counts_as_open"] is False
    assert settled["final_net_pnl"] == settled["scenario_pnl_if_back_wins"] == "-0.56"

    notes_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=payload(
            status="Settled",
            result="Back Won",
            lay_actual="9.63",
            lay_matched_stake_1="9.63",
            user_notes="Notes-only terminal edit does not require a correction reason.",
        ),
    )
    assert notes_response.status_code == 200

    rejected = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=payload(
            status="Settled",
            result="Back Won",
            lay_odds_1="2.18",
            lay_actual="9.63",
            lay_matched_stake_1="9.63",
        ),
    )
    assert rejected.status_code == 422
    assert "correction_reason" in rejected.text

    corrected_payload = payload(
        status="Settled",
        result="Back Won",
        lay_odds_1="2.18",
        lay_actual="9.63",
        lay_matched_stake_1="9.63",
        correction_reason="Corrected synthetic lay odds from the exchange receipt.",
    )
    corrected_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=corrected_payload,
    )
    assert corrected_response.status_code == 200
    corrected = corrected_response.json()
    assert corrected["final_net_pnl"] != settled["final_net_pnl"]

    history_response = client.get(
        f"/profiles/profile-demo-001/financial-history/sportsbook/{record_id}"
    )
    assert history_response.status_code == 200
    history = history_response.json()
    assert [event["operation"] for event in history] == [
        "created",
        "placement_recorded",
        "settled",
        "edited",
        "corrected",
    ]
    assert history[-1]["reason"] == "Corrected synthetic lay odds from the exchange receipt."
    assert history[-1]["before_snapshot"]["lay_odds_1"] == "2.20"
    assert history[-1]["after_snapshot"]["lay_odds_1"] == "2.18"

    retry_response = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=corrected_payload,
    )
    assert retry_response.status_code == 200
    retry_history = client.get(
        f"/profiles/profile-demo-001/financial-history/sportsbook/{record_id}"
    ).json()
    assert len(retry_history) == len(history)


def test_lay_win_void_and_cancelled_are_realised_without_open_exposure(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    assert client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    ).status_code == 200

    for terminal_status, result, expected, history_operation in (
        ("Settled", "Lay Won", "-0.56", "settled"),
        ("Void", "Void", "0.00", "edited"),
        ("Cancelled", "Void", "0.00", "edited"),
    ):
        created_response = client.post(
            "/profiles/profile-demo-001/sportsbook-bets",
            json=payload(
                event_name=f"CP-108 {terminal_status}",
                status="Placed",
                lay_actual="9.63",
                lay_matched_stake_1="9.63",
            ),
        )
        assert created_response.status_code == 201, created_response.text
        created = created_response.json()
        assert created["counts_as_open"] is True

        response = client.put(
            f"/profiles/profile-demo-001/sportsbook-bets/{created['sportsbook_bet_id']}",
            json=payload(
                event_name=f"CP-108 {terminal_status}",
                status=terminal_status,
                result=result,
                lay_actual="9.63",
                lay_matched_stake_1="9.63",
            ),
        )
        assert response.status_code == 200, response.text
        row = response.json()
        assert row["counts_as_open"] is False
        assert row["final_net_pnl"] == expected
        history = client.get(
            "/profiles/profile-demo-001/financial-history/sportsbook/"
            f"{created['sportsbook_bet_id']}"
        ).json()
        assert [event["operation"] for event in history] == ["created", history_operation]
        assert history[-1]["before_snapshot"]["status"] == "Placed"
        assert history[-1]["after_snapshot"]["status"] == terminal_status


def test_committed_transition_rechecks_profile_account_eligibility(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    created = client.post(
        "/profiles/profile-demo-001/sportsbook-bets", json=payload()
    )
    assert created.status_code == 201
    record_id = created.json()["sportsbook_bet_id"]

    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET status='Blocked', lifecycle_status='Suspended', "
            "stake_access='Blocked' WHERE profile_id=? AND account=? AND type='Bookie'",
            ("profile-demo-001", "Bookmaker A"),
        )

    rejected = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=payload(status="Placed", lay_actual="9.63", lay_matched_stake_1="9.63"),
    )
    assert rejected.status_code == 409
    assert "bookmaker" in rejected.text
    assert "Blocked" in rejected.text


def test_retired_exchange_provider_cannot_be_used_for_new_lay_activity(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    settings.account_catalogue_source = str(
        SOURCE_ROOT / "data/reference/master-account-catalogue.json"
    )
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET account='BETDAQ', catalogue_id='EXCHANGE-BETDAQ' "
            "WHERE profile_id=? AND account='Exchange A' AND type='Exchange'",
            ("profile-demo-001",),
        )
    response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=payload(
            status="Placed",
            exchange_name="BETDAQ",
            lay_actual="9.63",
            lay_matched_stake_1="9.63",
        ),
    )
    assert response.status_code == 409
    assert "Provider is not eligible for new activity" in response.text
