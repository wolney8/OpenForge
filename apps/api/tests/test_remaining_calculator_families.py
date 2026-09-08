from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.calculations.blackjack_strategy import calculate_blackjack_strategy
from openforge_api.config import settings
from openforge_api.db import list_sportsbook_bets
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> TestClient:
    settings.database_url = f"sqlite:///{tmp_path / 'remaining-calculators.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.environment = "local"
    settings.auth_required = False
    return TestClient(app)


def fixtures() -> dict:
    path = Path(__file__).parents[3] / "tests/fixtures/standalone-calculator-families-v1.json"
    return json.loads(path.read_text())


def test_accumulator_source_fixtures_are_reference_only(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    before = len(list_sportsbook_bets("profile-demo-001"))
    for case in fixtures()["accumulator"]:
        response = client.post(
            "/fund-manager/calculators/accumulator/preview",
            json={
                "stake": case["stake"],
                "selections": [
                    {"label": f"Selection {index + 1}", "odds": odds, "state": state}
                    for index, (odds, state) in enumerate(
                        zip(case["odds"], case["states"], strict=True)
                    )
                ],
            },
        )
        assert response.status_code == 200, (case["id"], response.text)
        body = response.json()
        if "combined_odds" in case:
            assert body["combined_odds"] == case["combined_odds"]
        assert body["total_return"] == case["return"]
        assert body["total_profit"] == case["profit"]
        assert body["result_kind"] == "reference"
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_dutching_source_fixtures_are_reference_only(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    before = len(list_sportsbook_bets("profile-demo-001"))
    for case in fixtures()["dutching"]:
        response = client.post(
            "/fund-manager/calculators/dutching/preview",
            json={
                "bet_type": case["bet_type"],
                "first_stake": case["stake"],
                "rounding_increment": case["rounding"],
                "selections": [
                    {"label": f"Selection {index + 1}", "odds": odds, "commission": commission}
                    for index, (odds, commission) in enumerate(
                        zip(case["odds"], case["commission"], strict=True)
                    )
                ],
            },
        )
        assert response.status_code == 200, (case["id"], response.text)
        body = response.json()
        assert [item["stake"] for item in body["selections"]] == case["stakes"]
        assert [item["profit"] for item in body["selections"]] == case["profits"]
        assert body["result_kind"] == "reference"
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_blackjack_published_matrix_fixtures(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    before = len(list_sportsbook_bets("profile-demo-001"))
    for case in fixtures()["blackjack"]:
        response = client.post(
            "/fund-manager/calculators/blackjack/preview",
            json={
                "dealer_card": case["dealer"],
                "player_cards": case["cards"],
                "surrender_allowed": case["surrender"],
                "dealer_hits_soft_17": case["h17"],
            },
        )
        assert response.status_code == 200, (case["id"], response.text)
        assert response.json()["action"] == case["action"]
        assert response.json()["fallback_action"] == case["fallback"]
    assert len(list_sportsbook_bets("profile-demo-001")) == before


def test_blackjack_published_conditional_fallbacks() -> None:
    double_fallback = calculate_blackjack_strategy(
        dealer_card="9",
        player_cards=["6", "5"],
        surrender_allowed=False,
        dealer_hits_soft_17=False,
        double_allowed=False,
    )
    assert (double_fallback.action, double_fallback.fallback_action) == ("Hit", None)

    split_fallback = calculate_blackjack_strategy(
        dealer_card="2",
        player_cards=["2", "2"],
        surrender_allowed=False,
        dealer_hits_soft_17=False,
        double_after_split_allowed=False,
    )
    assert (split_fallback.action, split_fallback.fallback_action) == ("Hit", None)


def test_remaining_calculators_reject_malformed_inputs_and_require_auth(tmp_path: Path) -> None:
    client = configure_temp_database(tmp_path)
    assert (
        client.post(
            "/fund-manager/calculators/accumulator/preview",
            json={
                "stake": "10",
                "selections": [
                    {"label": "A", "odds": "3,1", "state": "winner"},
                    {"label": "B", "odds": "1,000", "state": "winner"},
                ],
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/fund-manager/calculators/dutching/preview",
            json={
                "first_stake": "£10",
                "selections": [
                    {"label": "A", "odds": "2", "commission": "0"},
                    {"label": "B", "odds": "3", "commission": "0"},
                ],
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/fund-manager/calculators/blackjack/preview",
            json={"dealer_card": "1", "player_cards": ["10", "6"]},
        ).status_code
        == 422
    )

    settings.auth_required = True
    try:
        protected = TestClient(app)
        for endpoint in ("accumulator", "dutching", "blackjack"):
            assert (
                protected.post(f"/fund-manager/calculators/{endpoint}/preview", json={}).status_code
                == 401
            )
    finally:
        settings.auth_required = False
