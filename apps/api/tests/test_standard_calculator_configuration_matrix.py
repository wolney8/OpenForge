from __future__ import annotations

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal
from itertools import product
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app

PENNY = Decimal("0.01")


def placed(value: Decimal) -> str:
    return f"{value.quantize(PENNY, rounding=ROUND_HALF_UP):.2f}"


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    settings.database_url = f"sqlite:///{tmp_path / 'standard-matrix.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.environment = "local"
    settings.auth_required = False
    return TestClient(app)


STRATEGIES = ("Standard", "Underlay", "Overlay", "Custom", "Partial Lay")


@pytest.mark.parametrize(
    ("backing", "strategy"),
    product(("Normal", "SNR", "SR"), STRATEGIES),
    ids=lambda value: str(value),
)
def test_qualifying_and_free_bet_configuration_matrix(
    client: TestClient, backing: str, strategy: str
) -> None:
    stake, back_odds, lay_odds, commission = map(Decimal, ("10", "4", "4.2", "0.02"))
    if backing == "Normal":
        standard = stake * back_odds / (lay_odds - commission)
        underlay = stake * (back_odds - 1) / (lay_odds - 1)
        overlay = stake / (1 - commission)
        payload: dict[str, str] = {"bet_type": "qualifying"}
    else:
        standard = stake * (back_odds - (1 if backing == "SNR" else 0)) / (lay_odds - commission)
        standard = Decimal(placed(standard))
        underlay = standard * Decimal("0.928")
        overlay = standard * Decimal("1.300")
        payload = {"bet_type": "free_bet", "free_bet_mode": backing}
    expected = {
        "Standard": standard,
        "Underlay": underlay,
        "Overlay": overlay,
        "Custom": Decimal("8.13"),
        "Partial Lay": Decimal("8.13"),
    }[strategy]
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            **payload,
            "strategy": strategy,
            "manual_lay_stake": "8.13" if strategy in {"Custom", "Partial Lay"} else "",
            "back_stake": "10",
            "back_odds": "4",
            "lay_odds": "4.2",
            "exchange_commission": "0.02",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["selected_lay_stake"] == placed(expected)


def bonus_reference(
    backing: str,
    trigger: str,
    strategy: str,
    *,
    commission: Decimal = Decimal("0"),
    retention: Decimal = Decimal("0.70"),
) -> Decimal:
    stake, back_odds, lay_odds = map(Decimal, ("5", "9.24", "10.5"))
    reward = Decimal("5") * retention
    back_win = stake * (back_odds - 1)
    back_lose = -stake if backing == "Normal" else Decimal("0")
    reward_back = reward if trigger == "Back Wins" else Decimal("0")
    reward_lay = reward if trigger == "Lay Wins" else Decimal("0")
    standard = (back_win - back_lose + reward_back - reward_lay) / (lay_odds - commission)
    if backing == "Normal":
        endpoints = (
            -(back_lose + reward_lay) / (1 - commission),
            (back_win + reward_back) / (lay_odds - 1),
        )
    elif trigger == "Lay Wins":
        endpoints = (
            (stake - reward_lay) / (1 - commission),
            back_win / (lay_odds - 1),
        )
    else:
        endpoints = (
            (back_win + reward_back - stake) / (lay_odds - 1),
            stake / (1 - commission),
        )
    positive = sorted(item for item in endpoints if item > 0)
    return {
        "Standard": standard,
        "Underlay": positive[0],
        "Overlay": positive[-1],
        "Custom": Decimal("2.25"),
        "Partial Lay": Decimal("2.25"),
    }[strategy]


@pytest.mark.parametrize(
    ("backing", "trigger", "strategy"),
    product(("Normal", "SNR"), ("Lay Wins", "Back Wins"), STRATEGIES),
    ids=lambda value: str(value),
)
def test_bonus_lock_in_configuration_matrix(
    client: TestClient, backing: str, trigger: str, strategy: str
) -> None:
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": "bonus_lock_in",
            "bonus_backing_bet": backing,
            "bonus_trigger": trigger,
            "strategy": strategy,
            "manual_lay_stake": "2.25" if strategy in {"Custom", "Partial Lay"} else "",
            "back_stake": "5",
            "back_odds": "9.24",
            "lay_odds": "10.5",
            "exchange_commission": "0",
            "promotion_value": "5",
            "retention_percent": "70",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["selected_lay_stake"] == placed(
        bonus_reference(backing, trigger, strategy)
    )


@pytest.mark.parametrize(
    ("backing", "trigger", "strategy"),
    product(("Normal", "SNR"), ("Lay Wins", "Back Wins"), ("Standard", "Underlay", "Overlay")),
    ids=lambda value: str(value),
)
def test_bonus_lock_in_nonzero_commission_and_retention_matrix(
    client: TestClient, backing: str, trigger: str, strategy: str
) -> None:
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": "bonus_lock_in",
            "bonus_backing_bet": backing,
            "bonus_trigger": trigger,
            "strategy": strategy,
            "back_stake": "5",
            "back_odds": "9.24",
            "lay_odds": "10.5",
            "exchange_commission": "0.02",
            "promotion_value": "5",
            "retention_percent": "65",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["selected_lay_stake"] == placed(
        bonus_reference(
            backing,
            trigger,
            strategy,
            commission=Decimal("0.02"),
            retention=Decimal("0.65"),
        )
    )


def test_manual_strategy_penny_boundary_uses_governed_half_up_placement(
    client: TestClient,
) -> None:
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": "qualifying",
            "strategy": "Custom",
            "manual_lay_stake": "2.345",
            "back_stake": "5",
            "back_odds": "3",
            "lay_odds": "3.2",
            "exchange_commission": "0",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["selected_lay_stake"] == "2.35"


@pytest.mark.parametrize(
    ("offer", "strategy"),
    product(("cashback",), STRATEGIES),
    ids=lambda value: str(value),
)
def test_cashback_strategy_matrix(client: TestClient, offer: str, strategy: str) -> None:
    stake, back_odds, lay_odds, commission = map(Decimal, ("10", "4", "4.2", "0.02"))
    expected = {
        "Standard": stake * back_odds / (lay_odds - commission),
        "Underlay": stake * (back_odds - 1) / (lay_odds - 1),
        "Overlay": stake / (1 - commission),
        "Custom": Decimal("8.13"),
        "Partial Lay": Decimal("8.13"),
    }[strategy]
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": offer,
            "strategy": strategy,
            "manual_lay_stake": "8.13" if strategy in {"Custom", "Partial Lay"} else "",
            "back_stake": "10",
            "back_odds": "4",
            "lay_odds": "4.2",
            "exchange_commission": "0.02",
            "promotion_value": "5",
            "bonus_trigger": "Lay Wins",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["selected_lay_stake"] == placed(expected)


PROFIT_BOOSTS = {
    "displayed_odds": ({"boosted_back_odds": "3.2"}, Decimal("3.2")),
    "total_return": (
        {"total_potential_return": "27.86"},
        Decimal("2.786").quantize(Decimal("0.01"), rounding=ROUND_DOWN),
    ),
    "profit_only": ({"potential_profit": "22"}, Decimal("3.2")),
    "percentage": ({"base_back_odds": "3", "profit_boost_percent": "10"}, Decimal("3.2")),
}


@pytest.mark.parametrize(
    ("source_mode", "strategy"),
    product(PROFIT_BOOSTS, STRATEGIES),
    ids=lambda value: str(value),
)
def test_profit_boost_source_and_strategy_matrix(
    client: TestClient, source_mode: str, strategy: str
) -> None:
    source, odds = PROFIT_BOOSTS[source_mode]
    stake, lay_odds, commission = map(Decimal, ("10", "4.2", "0.02"))
    expected = {
        "Standard": stake * odds / (lay_odds - commission),
        "Underlay": stake * (odds - 1) / (lay_odds - 1),
        "Overlay": stake / (1 - commission),
        "Custom": Decimal("6.13"),
        "Partial Lay": Decimal("6.13"),
    }[strategy]
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": "profit_boost",
            "profit_boost_mode": source_mode,
            **source,
            "strategy": strategy,
            "manual_lay_stake": "6.13" if strategy in {"Custom", "Partial Lay"} else "",
            "back_stake": "10",
            "lay_odds": "4.2",
            "exchange_commission": "0.02",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["selected_lay_stake"] == placed(expected)
