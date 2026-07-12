from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.cash_adjustment_values import (
    CashAdjustmentCalculationInput,
    calculate_cash_adjustment_values,
    calculate_cash_adjustments_for_profile,
)


def load_fixture_cases() -> list[dict[str, object]]:
    fixture_path = (
        Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "cash-adjustment-fixtures.json"
    )
    return json.loads(fixture_path.read_text())


def as_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(value)


def test_cash_adjustment_fixture_cases() -> None:
    for case in load_fixture_cases():
        result = calculate_cash_adjustment_values(
            CashAdjustmentCalculationInput(**case["input"])
        )
        expected = case["expected"]
        assert result.signed_amount == as_decimal(expected["signed_amount"])
        assert result.week_label == expected["week_label"]
        assert result.calculation_state == expected["calculation_state"]


def test_cash_adjustment_profile_filtering() -> None:
    profile_one_results = calculate_cash_adjustments_for_profile(
        "profile-demo-001",
        [
            CashAdjustmentCalculationInput(
                profile_id="profile-demo-001",
                record_id="CA-A",
                adjustment_date="2026-07-01 12:00:00",
                direction="In",
                amount="10.00",
                adjustment_type="TopUp",
            ),
            CashAdjustmentCalculationInput(
                profile_id="profile-demo-002",
                record_id="CA-B",
                adjustment_date="2026-07-01 12:00:00",
                direction="Out",
                amount="5.00",
                adjustment_type="Withdrawal",
            ),
        ],
    )

    assert [result.record_id for result in profile_one_results] == ["CA-A"]
