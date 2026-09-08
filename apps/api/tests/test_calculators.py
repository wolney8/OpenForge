from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.calculations.each_way_extra_place import (
    EachWayCalculationInput,
    calculate_each_way_extra_place,
)
from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
)
from openforge_api.config import settings
from openforge_api.db import list_each_way_extra_places, list_sportsbook_bets
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


def test_standard_offer_modes_return_contract_backed_outcomes_without_writes(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    before = len(list_sportsbook_bets("profile-demo-001"))
    base = {
        "back_stake": "10.00",
        "back_odds": "4.00",
        "lay_odds": "4.20",
        "exchange_commission": "0",
        "strategy": "Standard",
    }
    for trigger in ("Lay Wins", "Back Wins"):
        response = client.post(
            "/fund-manager/calculators/matched-betting/preview",
            json={
                **base,
                "bet_type": "bonus_lock_in",
                "bonus_trigger": trigger,
                "promotion_value": "10",
                "retention_percent": "70",
            },
        )
        assert response.status_code == 200, response.text
        body = response.json()
        outcomes = body["outcomes"]
        assert len(outcomes) == 2
        triggered = next(row for row in outcomes if row["promotion_component"] is not None)
        assert triggered["promotion_component"] == "7.00"
        assert "bonus triggers" in triggered["label"].lower()
        assert triggered["total"] == body["promotion_trigger_result"]
        ordinary = next(row for row in outcomes if row["promotion_component"] is None)
        ordinary_key = "pnl_if_back_wins" if ordinary["key"] == "back-wins" else "pnl_if_lay_wins"
        assert ordinary["total"] == body[ordinary_key]

    cashback = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={**base, "bet_type": "cashback", "promotion_value": "5"},
    )
    assert cashback.status_code == 200
    assert cashback.json()["outcomes"][1]["promotion_component"] == "5.00"

    profit_modes = [
        ({"profit_boost_mode": "displayed_odds", "boosted_back_odds": "3.20"}, "3.2000"),
        ({"profit_boost_mode": "total_return", "total_potential_return": "27.86"}, "2.7800"),
        ({"profit_boost_mode": "profit_only", "potential_profit": "22.00"}, "3.2000"),
        ({"profit_boost_mode": "percentage", "base_back_odds": "3", "profit_boost_percent": "10"}, "3.2000"),
    ]
    for fields, expected in profit_modes:
        response = client.post(
            "/fund-manager/calculators/matched-betting/preview",
            json={
                **base,
                "bet_type": "profit_boost",
                "back_odds": "",
                **fields,
            },
        )
        assert response.status_code == 200, (fields, response.text)
        assert response.json()["effective_back_odds"] == expected
    accepted = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            **base,
            "bet_type": "profit_boost",
            "back_odds": "",
            "profit_boost_mode": "percentage",
            "actual_accepted_back_odds": "3.18",
        },
    )
    assert accepted.status_code == 200
    assert accepted.json()["effective_back_odds"] == "3.1800"
    assert accepted.json()["profit_boost_source"] == "accepted"
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_calculator_exchange_default_uses_master_catalogue(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    response = client.get("/fund-manager/calculators/exchanges")
    assert response.status_code == 200
    smarkets = next(row for row in response.json() if row["catalogue_id"] == "EXCHANGE-SMARKETS")
    assert smarkets == {
        "catalogue_id": "EXCHANGE-SMARKETS",
        "name": "Smarkets",
        "default_commission_rate": "0",
    }


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
        client = TestClient(app)
        for endpoint in (
            "/fund-manager/calculators/matched-betting/preview",
            "/fund-manager/calculators/multi-lay/preview",
            "/fund-manager/calculators/each-way/preview",
            "/fund-manager/calculators/sequential-lay/preview",
        ):
            assert client.post(endpoint, json={}).status_code == 401
    finally:
        settings.auth_required = False


def test_multi_lay_preview_matches_canonical_engine_without_writes(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    payload = {
        "allocation": "standard",
        "back_stake": "10.00",
        "back_odds": "3.20",
        "exchange_commission": "0.02",
        "outcomes": [
            {"label": "Outcome A", "lay_odds": "5.90"},
            {"label": "Outcome B", "lay_odds": "4.90"},
            {"label": "Outcome C", "lay_odds": "8.00"},
        ],
    }
    before = len(list_sportsbook_bets("profile-demo-001"))
    for allocation, strategy in (("standard", "Multilay"), ("underlay", "Multilay-Underlay")):
        response = client.post(
            "/fund-manager/calculators/multi-lay/preview",
            json={**payload, "allocation": allocation},
        )
        assert response.status_code == 200, response.text
        actual = response.json()
        canonical = calculate_sportsbook_current_value(
            SportsbookCalculationInput(
                profile_id="standalone",
                record_id="parity",
                status="Placed",
                result="Pending",
                offer_type="Bet & Get",
                back_stake="10.00",
                back_odds="3.20",
                match_strategy=strategy,
                lay_odds_1="5.90",
                multi_lay_outcome_1_name="Outcome A",
                multi_lay_outcomes_json=(
                    '[{"id":"outcome2","label":"Outcome B","layOdds":"4.90"},'
                    '{"id":"outcome3","label":"Outcome C","layOdds":"8.00"}]'
                ),
                lay_commission_1="0.02",
            ),
            as_of_date=date(2026, 9, 8),
        )
        assert [row["lay_stake"] for row in actual["branches"]] == [
            f"{branch.lay_stake:.2f}" for branch in canonical.multi_lay_branches
        ]
        assert actual["matched_result"] == f"{canonical.projected_current_pnl:.2f}"
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_each_way_modes_match_canonical_engine_without_writes(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    base = {
        "each_way_stake": "10",
        "back_odds": "6",
        "place_term_numerator": "1",
        "place_term_denominator": "5",
        "win_lay_odds": "2.3",
        "place_lay_odds": "4.5",
        "win_commission": "0",
        "place_commission": "0",
    }
    before = len(list_each_way_extra_places("profile-demo-001"))
    for mode, bookmaker_places, exchange_places in [("Each Way", 4, 4), ("Extra Place", 5, 4)]:
        response = client.post(
            "/fund-manager/calculators/each-way/preview",
            json={
                **base,
                "mode": mode,
                "bookmaker_places": bookmaker_places,
                "exchange_places": exchange_places,
            },
        )
        assert response.status_code == 200, response.text
        actual = response.json()
        canonical = calculate_each_way_extra_place(EachWayCalculationInput(mode=mode, **base))
        assert actual["win_lay_stake"] == f"{canonical.win_lay_stake:.2f}"
        assert actual["place_lay_stake"] == f"{canonical.place_lay_stake:.2f}"
        assert actual["current_value"] == f"{canonical.current_value:.2f}"
        assert actual["first_place_bookie_win_pnl"] == f"{canonical.first_place_bookie_win_pnl:.2f}"
        assert actual["first_place_exchange_place_pnl"] == (
            f"{canonical.first_place_exchange_place_pnl:.2f}"
        )
        assert actual["unplaced_bookie_place_pnl"] == (
            f"{canonical.unplaced_bookie_place_pnl:.2f}"
        )
        assert actual["unplaced_exchange_win_pnl"] == (
            f"{canonical.unplaced_exchange_win_pnl:.2f}"
        )
        assert (actual["extra_place_pnl"] is not None) is (mode == "Extra Place")
    assert len(list_each_way_extra_places("profile-demo-001")) == before


def test_advanced_calculator_odds_are_normalized_and_malformed_values_rejected(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    multi = {
        "back_stake": "10",
        "back_odds": "11/4",
        "exchange_commission": "0",
        "outcomes": [{"label": "A", "lay_odds": "3,8"}, {"label": "B", "lay_odds": "5/2"}],
    }
    assert client.post("/fund-manager/calculators/multi-lay/preview", json=multi).status_code == 200
    for bad in ("1,000", "£3.1", "3.1abc", "1e3", "NaN", "Infinity", "1/0"):
        response = client.post(
            "/fund-manager/calculators/multi-lay/preview",
            json={
                **multi,
                "outcomes": [{"label": "A", "lay_odds": bad}, {"label": "B", "lay_odds": "3.8"}],
            },
        )
        assert response.status_code == 422, (bad, response.text)


def test_sequential_lay_preview_uses_source_contract_without_writes(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    payload = {
        "mode": "standard",
        "back_stake": "10",
        "back_odds": "9",
        "back_commission": "0",
        "legs": [
            {"lay_odds": "3/2", "commission": "0.05"},
            {"lay_odds": "2,00", "commission": "0.05"},
            {"lay_odds": "1.50", "commission": "0.05"},
        ],
    }
    before = len(list_sportsbook_bets("profile-demo-001"))
    standard = client.post("/fund-manager/calculators/sequential-lay/preview", json=payload)
    assert standard.status_code == 200, standard.text
    assert [leg["lay_stake"] for leg in standard.json()["legs"]] == ["10.53", "27.15", "55.73"]
    assert [row["total"] for row in standard.json()["outcomes"]] == ["0.00", "0.00", "0.00", "9.20"]
    lock_in = client.post(
        "/fund-manager/calculators/sequential-lay/preview",
        json={**payload, "mode": "lock_in"},
    )
    assert lock_in.status_code == 200, lock_in.text
    assert [leg["lay_stake"] for leg in lock_in.json()["legs"]] == ["10.53", "27.15", "62.07"]
    assert lock_in.json()["locked_result"] == "6.02"
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_sequential_lay_rejects_malformed_odds_and_supports_more_than_three_legs(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    base = {
        "mode": "standard",
        "back_stake": "10",
        "back_odds": "9",
        "back_commission": "0.02",
        "legs": [
            {"lay_odds": odds, "commission": commission}
            for odds, commission in (
                ("2.5", "0.02"),
                ("2", "0.05"),
                ("1.5", "0.01"),
                ("1.2", "0.03"),
            )
        ],
    }
    assert (
        client.post("/fund-manager/calculators/sequential-lay/preview", json=base).status_code
        == 200
    )
    for bad in ("1,000", "£3.1", "3.1abc", "1e3", "NaN", "Infinity", "1/0"):
        malformed = {
            **base,
            "legs": [{**base["legs"][0], "lay_odds": bad}, *base["legs"][1:]],
        }
        assert (
            client.post(
                "/fund-manager/calculators/sequential-lay/preview", json=malformed
            ).status_code
            == 422
        )
