from decimal import Decimal

import pytest

from openforge_api.calculations.profit_boost import ProfitBoostInput, calculate_profit_boost


@pytest.mark.parametrize(
    ("values", "expected_odds", "expected_source"),
    [
        (
            ProfitBoostInput("PROFILE-001", "displayed_odds", "10.00", boosted_back_odds="3.30"),
            Decimal("3.3000"),
            "displayed",
        ),
        (
            ProfitBoostInput(
                "PROFILE-001", "percentage", "10.00",
                base_back_odds="3.00", profit_boost_percent="15",
            ),
            Decimal("3.3000"),
            "calculated",
        ),
        (
            ProfitBoostInput(
                "PROFILE-001", "percentage", "10.00",
                base_back_odds="3.00", profit_boost_percent="15",
                maximum_boost_winnings="2.00",
            ),
            Decimal("3.2000"),
            "calculated",
        ),
        (
            ProfitBoostInput(
                "PROFILE-001", "percentage", "10.00",
                base_back_odds="3.00", profit_boost_percent="15",
                actual_accepted_back_odds="3.28",
            ),
            Decimal("3.2800"),
            "accepted",
        ),
    ],
)
def test_profit_boost_effective_odds(
    values: ProfitBoostInput, expected_odds: Decimal, expected_source: str
) -> None:
    result = calculate_profit_boost(values)
    assert result.calculation_state == "resolved"
    assert result.effective_back_odds == expected_odds
    assert result.boost_source == expected_source


def test_profit_boost_caps_extra_profit() -> None:
    result = calculate_profit_boost(
        ProfitBoostInput(
            "PROFILE-001", "percentage", "10.00",
            base_back_odds="3.00", profit_boost_percent="15",
            maximum_boost_winnings="2.00",
        )
    )
    assert result.uncapped_extra_profit == Decimal("3.00")
    assert result.extra_profit == Decimal("2.00")


def test_profit_boost_rejects_missing_percentage() -> None:
    result = calculate_profit_boost(
        ProfitBoostInput("PROFILE-001", "percentage", "10.00", base_back_odds="3.00")
    )
    assert result.calculation_state == "incomplete"
    assert result.effective_back_odds is None
    assert "percentage" in result.calculation_notes[0].lower()
