import json
from decimal import Decimal
from pathlib import Path

import pytest

from openforge_api.calculations.early_payout import (
    EarlyPayoutInput,
    PartBackInput,
    calculate_early_payout,
)


def make_input(payload: dict[str, object]) -> EarlyPayoutInput:
    parts = payload.pop("part_backs", [])
    converted = {
        key: Decimal(value) if isinstance(value, str) and key != "cover_mode" else value
        for key, value in payload.items()
    }
    return EarlyPayoutInput(
        **converted,  # type: ignore[arg-type]
        part_backs=tuple(
            PartBackInput(Decimal(part["stake"]), Decimal(part["odds"]))
            for part in parts  # type: ignore[union-attr]
        ),
    )


def test_source_fixtures_match_exact_penny_results() -> None:
    path = Path(__file__).parents[3] / "tests/fixtures/early-payout-calculation-fixtures.json"
    for case in json.loads(path.read_text())["cases"]:
        result = calculate_early_payout(make_input(dict(case["input"])))
        assert f"{result.recommended_initial_stake:.2f}" == case["initial_stake"], case["id"]
        assert (f"{result.liability:.2f}" if result.liability is not None else None) == case[
            "liability"
        ], case["id"]
        assert (
            f"{result.recommended_additional_back_stake:.2f}"
            if result.recommended_additional_back_stake is not None
            else None
        ) == case["additional_stake"], case["id"]
        assert [f"{outcome.total:.2f}" for outcome in result.outcomes] == case["outcomes"], case[
            "id"
        ]


@pytest.mark.parametrize(
    ("adjustment", "stake", "outcomes"),
    [
        ("0.5", "48.91", ["6.86", "63.12", "63.12"]),
        ("1", "95.82", ["16.24"] * 3),
        ("1.5", "143.72", ["25.82", "-31.66", "-31.66"]),
    ],
)
def test_lock_adjustment_rebalances_exact_outcomes(
    adjustment: str, stake: str, outcomes: list[str]
) -> None:
    result = calculate_early_payout(
        EarlyPayoutInput(
            cover_mode="exchange_lay",
            back_stake=Decimal("50"),
            back_odds=Decimal("2.25"),
            triggered=True,
            lock_adjustment=Decimal(adjustment),
            lay_odds=Decimal("2.32"),
            lay_commission=Decimal("0.05"),
            in_play_back_odds=Decimal("1.20"),
        )
    )
    assert f"{result.recommended_additional_back_stake:.2f}" == stake
    assert [f"{outcome.total:.2f}" for outcome in result.outcomes] == outcomes


def test_actual_lay_stake_drives_liability_and_outcomes_without_changing_reference() -> None:
    result = calculate_early_payout(
        EarlyPayoutInput(
            cover_mode="exchange_lay",
            back_stake=Decimal("50"),
            back_odds=Decimal("2.25"),
            triggered=False,
            lay_odds=Decimal("2.32"),
            lay_commission=Decimal("0.05"),
            actual_lay_stake=Decimal("48"),
        )
    )
    assert result.recommended_initial_stake == Decimal("49.56")
    assert result.actual_initial_stake == Decimal("48")
    assert result.liability == Decimal("63.36")
    assert [outcome.total for outcome in result.outcomes] == [
        Decimal("-0.86"),
        Decimal("-4.40"),
        Decimal("-4.40"),
    ]


@pytest.mark.parametrize(
    "field,value",
    [("back_stake", "0"), ("back_odds", "1"), ("lay_commission", "1"), ("lock_adjustment", "1.51")],
)
def test_invalid_financial_domains_fail_closed(field: str, value: str) -> None:
    payload = dict(
        cover_mode="exchange_lay",
        back_stake=Decimal("50"),
        back_odds=Decimal("2.25"),
        triggered=False,
        lay_odds=Decimal("2.32"),
        lay_commission=Decimal("0.05"),
    )
    payload[field] = Decimal(value)
    with pytest.raises(ValueError):
        calculate_early_payout(EarlyPayoutInput(**payload))  # type: ignore[arg-type]
