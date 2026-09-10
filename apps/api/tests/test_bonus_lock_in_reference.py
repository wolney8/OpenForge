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
    inputs = {key: Decimal(value) for key, value in case["inputs"].items()}  # type: ignore[union-attr]
    result = calculate_bonus_lock_in_reference(**inputs)
    for key, expected in case["expected"].items():  # type: ignore[union-attr]
        assert f"{getattr(result, key):.2f}" == expected
