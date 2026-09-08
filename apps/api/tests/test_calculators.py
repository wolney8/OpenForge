from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import list_sportsbook_bets
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'calculator-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.environment = "local"
    settings.auth_required = False


def test_standard_qualifying_matches_sportsbook_preview_without_writes(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"
    assert (
        client.put(
            f"/profiles/{profile_id}/exchange-commissions",
            json={"exchange_name": "Exchange A", "commission_rate": "0.02"},
        ).status_code
        == 200
    )
    before = len(list_sportsbook_bets(profile_id))

    fixture_path = (
        Path(__file__).parents[3]
        / "tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json"
    )
    fixture = next(
        case
        for case in json.loads(fixture_path.read_text())["cases"]
        if case["case_id"] == "CALC-001"
    )
    inputs = fixture["inputs"]
    expected = fixture["expected"]
    standalone = client.post(
        f"/profiles/{profile_id}/calculators/standard-qualifying/preview",
        json={
            "back_stake": inputs["back_stake"],
            "back_odds": inputs["back_odds"],
            "lay_odds": inputs["lay_odds"],
            "exchange_commission": inputs["commission"],
        },
    )
    sportsbook = client.post(
        f"/profiles/{profile_id}/sportsbook-bets/preview",
        json={
            "event_name": "Synthetic parity check",
            "bookmaker": "Bookmaker A",
            "offer_type": "Sign up / Welcome",
            "status": "Placed",
            "result": "Pending",
            "back_stake": inputs["back_stake"],
            "back_odds": inputs["back_odds"],
            "match_strategy": "Standard",
            "lay_odds_1": inputs["lay_odds"],
            "exchange_name": "Exchange A",
        },
    )

    assert standalone.status_code == 200
    assert sportsbook.status_code == 200
    actual = standalone.json()
    existing = sportsbook.json()
    assert actual["reference_lay_stake"] == expected["reference_lay_stake"]
    assert actual["liability"] == expected["liability"]
    assert actual["pnl_if_back_wins"] == expected["pnl_if_back_wins"]
    assert actual["pnl_if_lay_wins"] == expected["pnl_if_lay_wins"]
    assert actual["matched_result"] == expected["matched_result"]
    assert actual == {
        "profile_id": profile_id,
        "result_kind": "reference",
        "calculation_state": "resolved",
        "reference_lay_stake": existing["reference_lay_stake_standard"],
        "liability": existing["calculated_liability_1"],
        "pnl_if_back_wins": existing["scenario_pnl_if_back_wins"],
        "pnl_if_lay_wins": existing["scenario_pnl_if_lay_wins"],
        "matched_result": existing["projected_current_pnl"],
    }
    assert len(list_sportsbook_bets(profile_id)) == before


def test_standard_qualifying_validates_inputs_and_profile_scope(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    endpoint = "/profiles/profile-demo-001/calculators/standard-qualifying/preview"
    base = {
        "back_stake": "10.00",
        "back_odds": "2.00",
        "lay_odds": "2.10",
        "exchange_commission": "0",
    }
    assert client.post(endpoint, json=base).status_code == 200

    for field, value in [
        ("back_stake", "£10"),
        ("back_odds", "1,000"),
        ("lay_odds", "8.5abc"),
        ("lay_odds", "NaN"),
        ("lay_odds", "Infinity"),
        ("exchange_commission", "1e-2"),
        ("exchange_commission", "1.01"),
    ]:
        response = client.post(endpoint, json={**base, field: value})
        assert response.status_code == 422, (field, value, response.text)

    missing_profile = client.post(
        "/profiles/profile-missing/calculators/standard-qualifying/preview", json=base
    )
    assert missing_profile.status_code == 404


def test_fund_manager_matched_betting_modes_are_reference_only(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    before = len(list_sportsbook_bets("profile-demo-001"))
    base = {
        "back_stake": "10.00",
        "back_odds": "4.00",
        "lay_odds": "4.20",
        "exchange_commission": "0.02",
        "strategy": "Standard",
    }
    cases = [
        {"bet_type": "qualifying"},
        {"bet_type": "free_bet", "free_bet_mode": "SNR"},
        {"bet_type": "free_bet", "free_bet_mode": "SR"},
        {"bet_type": "money_back", "promotion_value": "10.00", "retention_percent": "70"},
        {"bet_type": "qualifying", "promotion_mode": "cashback", "promotion_value": "5.00"},
        {"bet_type": "qualifying", "strategy": "Underlay"},
        {"bet_type": "qualifying", "strategy": "Overlay"},
        {"bet_type": "qualifying", "strategy": "Custom", "manual_lay_stake": "9.00"},
        {"bet_type": "qualifying", "strategy": "Partial Lay", "manual_lay_stake": "4.00"},
    ]
    for extra in cases:
        response = client.post(
            "/fund-manager/calculators/matched-betting/preview", json={**base, **extra}
        )
        assert response.status_code == 200, (extra, response.text)
        assert response.json()["result_kind"] == "reference"
        assert response.json()["calculation_state"] == "resolved"
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_calculator_odds_normalization_and_rejection(tmp_path: Path, monkeypatch) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    endpoint = "/fund-manager/calculators/matched-betting/preview"
    base = {"back_stake": "10.00", "back_odds": "3", "lay_odds": "3.1", "exchange_commission": "0"}
    fixture = json.loads(
        (
            Path(__file__).parents[3] / "tests/fixtures/calculator-odds-normalization-fixtures.json"
        ).read_text()
    )
    for case in fixture["valid"]:
        response = client.post(endpoint, json={**base, "back_odds": case["input"]})
        assert response.status_code == 200, response.text
        assert response.json()["canonical_back_odds"] == case["canonical"]
    calculation_calls = 0

    def fail_if_calculated(*_args, **_kwargs):
        nonlocal calculation_calls
        calculation_calls += 1
        raise AssertionError("malformed odds reached financial calculation")

    monkeypatch.setattr(
        "openforge_api.calculators.calculate_sportsbook_current_value", fail_if_calculated
    )
    for invalid in fixture["invalid"]:
        assert client.post(endpoint, json={**base, "back_odds": invalid}).status_code == 422
    assert calculation_calls == 0


def test_fund_manager_calculator_is_protected_when_authentication_is_required(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    settings.auth_required = True
    try:
        response = TestClient(app).post(
            "/fund-manager/calculators/matched-betting/preview",
            json={
                "back_stake": "10",
                "back_odds": "3",
                "lay_odds": "3.1",
                "exchange_commission": "0",
            },
        )
        assert response.status_code == 401
    finally:
        settings.auth_required = False
