from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from openforge_api.calculations.bonus_lock_in_reference import (
    calculate_bonus_lock_in_reference,
)

FIXTURES = json.loads(
    (Path(__file__).parents[3] / "tests/fixtures/bonus-lock-in-reference-fixtures.json").read_text()
)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda case: case["id"])
def test_bonus_lock_in_reference_matches_independent_fixtures(case: dict[str, object]) -> None:
    inputs = {
        key: value if key in {"backing_basis", "trigger", "strategy"} else Decimal(value)
        for key, value in case["inputs"].items()  # type: ignore[union-attr]
    }
    result = calculate_bonus_lock_in_reference(**inputs)
    for key, expected in case["expected"].items():  # type: ignore[union-attr]
        assert f"{getattr(result, key):.2f}" == expected


def test_bonus_lock_in_rejects_non_positive_reference_stake() -> None:
    with pytest.raises(ValueError, match="positive lay stake"):
        calculate_bonus_lock_in_reference(
            back_stake=Decimal("5"), back_odds=Decimal("2"), lay_odds=Decimal("3"),
            lay_commission=Decimal("0"), reward_amount=Decimal("20"),
            retention_percent=Decimal("100"), trigger="back_loses",
        )


def test_bonus_lock_in_snr_standard_and_explicit_lay_are_deterministic() -> None:
    standard = calculate_bonus_lock_in_reference(
        back_stake=Decimal("10"), back_odds=Decimal("4"), lay_odds=Decimal("4.2"),
        lay_commission=Decimal("0.02"), reward_amount=Decimal("10"),
        retention_percent=Decimal("70"), backing_basis="free_bet_snr",
        trigger="back_wins",
    )
    assert standard.standard.lay_stake == Decimal("8.85")
    assert standard.underlay is None and standard.overlay is None
    explicit = calculate_bonus_lock_in_reference(
        back_stake=Decimal("10"), back_odds=Decimal("4"), lay_odds=Decimal("4.2"),
        lay_commission=Decimal("0.02"), reward_amount=Decimal("10"),
        retention_percent=Decimal("70"), backing_basis="free_bet_snr",
        trigger="back_wins", strategy="Partial Lay", manual_lay_stake=Decimal("8"),
    )
    assert explicit.selected.lay_stake == Decimal("8.00")
