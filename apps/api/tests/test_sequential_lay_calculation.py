import json
from decimal import Decimal
from pathlib import Path

import pytest

from openforge_api.calculations.sequential_lay import (
    SequentialLayInput,
    SequentialLayLegInput,
    calculate_sequential_lay,
)


def calculation(
    mode: str,
    *,
    stake: str = "10",
    back_odds: str = "9",
    back_commission: str = "0",
    legs: tuple[tuple[str, str], ...] = (("2.5", "0.05"), ("2", "0.05"), ("1.5", "0.05")),
):
    return calculate_sequential_lay(
        SequentialLayInput(
            mode=mode,  # type: ignore[arg-type]
            back_stake=Decimal(stake),
            back_odds=Decimal(back_odds),
            back_commission=Decimal(back_commission),
            legs=tuple(
                SequentialLayLegInput(Decimal(odds), Decimal(commission))
                for odds, commission in legs
            ),
        )
    )


def test_live_source_three_leg_standard_fixture() -> None:
    result = calculation("standard")
    assert [leg.lay_stake for leg in result.legs] == [
        Decimal("10.53"),
        Decimal("27.15"),
        Decimal("55.73"),
    ]
    assert [leg.liability for leg in result.legs] == [
        Decimal("15.79"),
        Decimal("27.15"),
        Decimal("27.86"),
    ]
    assert [outcome.total for outcome in result.outcomes] == [
        Decimal("0.00"),
        Decimal("0.00"),
        Decimal("0.00"),
        Decimal("9.20"),
    ]


def test_live_source_three_leg_lock_in_fixture() -> None:
    result = calculation("lock_in")
    assert [leg.lay_stake for leg in result.legs] == [
        Decimal("10.53"),
        Decimal("27.15"),
        Decimal("62.07"),
    ]
    assert [outcome.total for outcome in result.outcomes] == [
        Decimal("0.00"),
        Decimal("0.00"),
        Decimal("6.02"),
        Decimal("6.03"),
    ]
    assert result.locked_result == Decimal("6.02")


def test_live_source_qualifying_double_fixture() -> None:
    result = calculation("lock_in", back_odds="3", legs=(("1.6", "0.05"), ("2", "0.05")))
    assert [leg.lay_stake for leg in result.legs] == [Decimal("10.53"), Decimal("15.39")]
    assert [outcome.total for outcome in result.outcomes] == [
        Decimal("0.00"),
        Decimal("-1.69"),
        Decimal("-1.70"),
    ]
    assert result.locked_result == Decimal("-1.70")


def test_directional_rounding_and_varying_commissions() -> None:
    result = calculation(
        "standard",
        back_commission="0.02",
        legs=(("2.5", "0.02"), ("2", "0.05"), ("1.5", "0.01"), ("1.2", "0.03")),
    )
    assert [leg.lay_stake for leg in result.legs[:3]] == [
        Decimal("10.21"),
        Decimal("26.65"),
        Decimal("52.49"),
    ]
    assert len(result.outcomes) == 5


def test_contract_fixture_file_matches_engine() -> None:
    fixture_path = (
        Path(__file__).parents[3] / "tests/fixtures/sequential-lay-calculation-fixtures.json"
    )
    for case in json.loads(fixture_path.read_text())["cases"]:
        result = calculation(
            case["mode"],
            stake=case["back"]["stake"],
            back_odds=case["back"]["odds"],
            back_commission=case["back"]["commission"],
            legs=tuple(tuple(leg) for leg in case["legs"]),
        )
        assert [f"{leg.lay_stake:.2f}" for leg in result.legs] == case["lay_stakes"], case["id"]
        assert [f"{outcome.total:.2f}" for outcome in result.outcomes] == case["outcomes"], case[
            "id"
        ]


@pytest.mark.parametrize(
    "candidate",
    [
        SequentialLayInput(
            "standard",
            Decimal("0"),
            Decimal("9"),
            Decimal("0"),
            (SequentialLayLegInput(Decimal("2"), Decimal("0")),) * 2,
        ),
        SequentialLayInput(
            "standard",
            Decimal("10"),
            Decimal("9"),
            Decimal("0"),
            (SequentialLayLegInput(Decimal("2"), Decimal("0")),),
        ),
        SequentialLayInput(
            "standard",
            Decimal("10"),
            Decimal("9"),
            Decimal("0"),
            (SequentialLayLegInput(Decimal("2"), Decimal("1")),) * 2,
        ),
    ],
)
def test_invalid_inputs_fail_closed(candidate: SequentialLayInput) -> None:
    with pytest.raises(ValueError):
        calculate_sequential_lay(candidate)
