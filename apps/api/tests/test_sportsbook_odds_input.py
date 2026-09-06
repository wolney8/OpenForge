from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import openforge_api.sportsbook as sportsbook_module
from openforge_api.config import settings
from openforge_api.db import get_sportsbook_bet, list_sportsbook_bets
from openforge_api.main import app
from openforge_api.sportsbook import (
    SportsbookBetFields,
    SportsbookBetPayload,
    SportsbookBetResponse,
)
from openforge_api.sportsbook_odds_input import (
    SPORTSBOOK_ODDS_FORMAT_MESSAGE,
    SPORTSBOOK_ODDS_MINIMUM_MESSAGE,
    validate_sportsbook_odds,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "sportsbook-odds-input-fixtures.json"
)
ODDS_FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.auth_required = False


def payload(**overrides: object) -> dict[str, object]:
    return {
        "event_name": "Strict odds fixture",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "fixture_type": "Football",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.10",
        "match_strategy": "Standard",
        "lay_odds_1": "2.20",
        "exchange_name": "Smarkets",
        "date_settled": "2026-09-12",
        **overrides,
    }


@pytest.mark.parametrize("value", ODDS_FIXTURE["valid"])
def test_sportsbook_odds_accept_complete_decimal_strings(value: str) -> None:
    assert validate_sportsbook_odds(value) == value


@pytest.mark.parametrize("value", ODDS_FIXTURE["invalid_format"])
def test_sportsbook_odds_reject_malformed_complete_strings(value: str) -> None:
    with pytest.raises(ValueError, match="Enter decimal odds"):
        validate_sportsbook_odds(value)


@pytest.mark.parametrize("value", ODDS_FIXTURE["below_minimum"])
def test_sportsbook_odds_reject_values_below_ordinary_minimum(value: str) -> None:
    with pytest.raises(ValueError, match="1.01"):
        validate_sportsbook_odds(value)


def test_sportsbook_odds_distinguish_optional_and_required_blanks() -> None:
    assert validate_sportsbook_odds("") == ""
    with pytest.raises(ValueError, match="required"):
        validate_sportsbook_odds("", allow_empty=False)


@pytest.mark.parametrize(
    "field",
    ("back_odds", "base_back_odds", "actual_accepted_back_odds", "lay_odds_1"),
)
def test_payload_rejects_each_top_level_malformed_odds_field(field: str) -> None:
    with pytest.raises(ValidationError) as caught:
        SportsbookBetPayload.model_validate(payload(**{field: "8,5"}))
    error = caught.value.errors()[0]
    assert error["loc"] == (field,)
    assert error["msg"] == SPORTSBOOK_ODDS_FORMAT_MESSAGE


@pytest.mark.parametrize("key", ("layOdds", "placedLayOdds"))
@pytest.mark.parametrize("value", ("8.5abc", None))
def test_payload_rejects_malformed_nested_odds(key: str, value: object) -> None:
    nested = json.dumps([{"id": "outcome2", key: value}])
    with pytest.raises(ValidationError) as caught:
        SportsbookBetPayload.model_validate(payload(multi_lay_outcomes_json=nested))
    error = caught.value.errors()[0]
    assert error["loc"] == ("multi_lay_outcomes_json",)
    assert f"[0].{key}" in error["msg"]


def test_payload_keeps_optional_odds_blank_and_enforces_minimum() -> None:
    parsed = SportsbookBetPayload.model_validate(payload(actual_accepted_back_odds=""))
    assert parsed.actual_accepted_back_odds == ""
    with pytest.raises(ValidationError) as caught:
        SportsbookBetPayload.model_validate(payload(back_odds="1.00"))
    assert caught.value.errors()[0]["msg"] == SPORTSBOOK_ODDS_MINIMUM_MESSAGE


def test_payload_distinguishes_draft_and_placed_required_odds() -> None:
    draft = SportsbookBetPayload.model_validate(
        payload(status="Prospecting", back_odds="", lay_odds_1="")
    )
    assert draft.back_odds == draft.lay_odds_1 == ""

    with pytest.raises(ValidationError) as caught:
        SportsbookBetPayload.model_validate(payload(back_odds="", lay_odds_1=""))
    assert [(error["loc"], error["msg"]) for error in caught.value.errors()] == [
        (("back_odds",), "Enter odds."),
        (("lay_odds_1",), "Enter odds."),
    ]


def test_percentage_profit_boost_requires_base_odds_not_displayed_odds() -> None:
    parsed = SportsbookBetPayload.model_validate(
        payload(
            offer_type="Profit Boost",
            profit_boost_mode="percentage",
            back_odds="",
            base_back_odds="2.10",
        )
    )
    assert parsed.back_odds == ""

    with pytest.raises(ValidationError) as caught:
        SportsbookBetPayload.model_validate(
            payload(
                offer_type="Profit Boost",
                profit_boost_mode="percentage",
                back_odds="",
                base_back_odds="",
            )
        )
    assert caught.value.errors()[0]["loc"] == ("base_back_odds",)


def test_historical_response_fields_do_not_inherit_new_entry_odds_validation() -> None:
    assert not issubclass(SportsbookBetResponse, SportsbookBetPayload)
    historical = SportsbookBetFields.model_validate(payload(back_odds=" 2.10 "))
    assert historical.back_odds == " 2.10 "


def test_malformed_preview_create_and_update_stop_before_calculation_or_write(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    valid_create = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload())
    assert valid_create.status_code == 201
    response_payload = valid_create.json()
    record_id = response_payload["sportsbook_bet_id"]
    response_payload["back_odds"] = " 2.10 "
    assert SportsbookBetResponse.model_validate(response_payload).back_odds == " 2.10 "
    draft_create = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=payload(
            event_name="Optional blank draft",
            status="Prospecting",
            back_odds="",
            lay_odds_1="",
        ),
    )
    assert draft_create.status_code == 201
    before = get_sportsbook_bet("profile-demo-001", record_id)
    before_count = len(list_sportsbook_bets("profile-demo-001"))
    calculation_calls = 0

    def fail_if_called(*_args: object, **_kwargs: object) -> object:
        nonlocal calculation_calls
        calculation_calls += 1
        raise AssertionError("financial calculation must not run for malformed odds")

    monkeypatch.setattr(sportsbook_module, "calculate_sportsbook_current_value", fail_if_called)

    preview = client.post(
        "/profiles/profile-demo-001/sportsbook-bets/preview",
        json=payload(back_odds="8.5abc"),
    )
    create = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=payload(event_name="Must not persist", lay_odds_1="8,5"),
    )
    update = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{record_id}",
        json=payload(back_odds="1.00"),
    )
    required = client.post(
        "/profiles/profile-demo-001/sportsbook-bets/preview",
        json=payload(back_odds="", lay_odds_1=""),
    )

    assert (
        preview.status_code
        == create.status_code
        == update.status_code
        == required.status_code
        == 422
    )
    assert preview.json()["detail"][0]["loc"][-1] == "back_odds"
    assert preview.json()["detail"][0]["msg"] == SPORTSBOOK_ODDS_FORMAT_MESSAGE
    assert create.json()["detail"][0]["loc"][-1] == "lay_odds_1"
    assert update.json()["detail"][0]["msg"] == SPORTSBOOK_ODDS_MINIMUM_MESSAGE
    assert [error["loc"][-1] for error in required.json()["detail"]] == [
        "back_odds",
        "lay_odds_1",
    ]
    assert calculation_calls == 0
    assert len(list_sportsbook_bets("profile-demo-001")) == before_count
    after = get_sportsbook_bet("profile-demo-001", record_id)
    assert before is not None and after is not None
    assert after.back_odds == before.back_odds
    assert all(
        row.event_name != "Must not persist"
        for row in list_sportsbook_bets("profile-demo-001")
    )
