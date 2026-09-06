from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import openforge_api.sportsbook as sportsbook_module
from openforge_api.calculations.payout_odds import calculate_payout_odds
from openforge_api.config import settings
from openforge_api.db import list_sportsbook_bets
from openforge_api.main import app
from openforge_api.sportsbook import PAYOUT_AMOUNT_FORMAT_MESSAGE

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "sportsbook-payout-odds-helper-fixtures.json"
)
PAYOUT_FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.auth_required = False


@pytest.mark.parametrize("case", PAYOUT_FIXTURE["resolved"])
def test_payout_odds_uses_exact_floor_contract(case: dict[str, str]) -> None:
    result = calculate_payout_odds(
        cash_back_stake=Decimal(case["stake"]),
        total_potential_return=Decimal(case["total_return"]),
    )
    assert result.raw_implied_odds == case["raw_odds"]
    assert result.raw_is_approximate is False
    assert f"{result.effective_odds:.2f}" == case["effective_odds"]


def test_payout_odds_floor_does_not_use_rounded_raw_display() -> None:
    result = calculate_payout_odds(
        cash_back_stake=Decimal("3"),
        total_potential_return=Decimal("8"),
    )
    assert result.raw_implied_odds == "2.666666666666"
    assert result.raw_is_approximate is True
    assert result.effective_odds == Decimal("2.66")


@pytest.mark.parametrize("value", PAYOUT_FIXTURE["invalid_format"])
@pytest.mark.parametrize("field", ["back_stake", "total_potential_return"])
def test_preview_rejects_complete_malformed_amount_strings(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    value: str,
    field: str,
) -> None:
    configure_temp_database(tmp_path)
    monkeypatch.setattr(
        sportsbook_module,
        "calculate_payout_odds",
        lambda **_values: pytest.fail("Malformed input reached financial calculation"),
    )
    payload = {"back_stake": "10", "total_potential_return": "27.86"}
    payload[field] = value
    response = TestClient(app).post(
        "/profiles/profile-demo-001/sportsbook-bets/payout-odds-preview",
        json=payload,
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == field
    assert response.json()["detail"][0]["msg"] == PAYOUT_AMOUNT_FORMAT_MESSAGE


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        (
            {"back_stake": "0", "total_potential_return": "10"},
            "back_stake",
            "greater than zero",
        ),
        (
            {"back_stake": "10", "total_potential_return": "0"},
            "total_potential_return",
            "greater than zero",
        ),
        (
            {"back_stake": "10", "total_potential_return": "9.99"},
            "total_potential_return",
            "at least the cash back stake",
        ),
    ],
)
def test_preview_rejects_invalid_money_relationships(
    tmp_path: Path,
    payload: dict[str, str],
    field: str,
    message: str,
) -> None:
    configure_temp_database(tmp_path)
    response = TestClient(app).post(
        "/profiles/profile-demo-001/sportsbook-bets/payout-odds-preview",
        json=payload,
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == field
    assert message in response.json()["detail"][0]["msg"]


def test_preview_is_read_only_and_blocks_minimum_and_accepted_precedence(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    before = list_sportsbook_bets("profile-demo-001")

    minimum = client.post(
        "/profiles/profile-demo-001/sportsbook-bets/payout-odds-preview",
        json={"back_stake": "10", "total_potential_return": "10"},
    )
    accepted = client.post(
        "/profiles/profile-demo-001/sportsbook-bets/payout-odds-preview",
        json={
            "back_stake": "10",
            "total_potential_return": "27.86",
            "actual_accepted_back_odds": "2.75",
        },
    )

    assert minimum.status_code == accepted.status_code == 200
    assert minimum.json()["effective_odds"] == "1.00"
    assert minimum.json()["application_allowed"] is False
    assert "minimum of 1.01" in minimum.json()["application_block_reason"]
    assert accepted.json()["effective_odds"] == "2.78"
    assert accepted.json()["application_allowed"] is False
    assert "already take precedence" in accepted.json()["application_block_reason"]
    assert list_sportsbook_bets("profile-demo-001") == before
