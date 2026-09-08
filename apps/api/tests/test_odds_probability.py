from decimal import Decimal

import pytest

from openforge_api.calculations.odds_probability import calculate_odds_probability


@pytest.mark.parametrize(
    ("source", "arguments", "expected"),
    [
        ("fractional", {"numerator": 5, "denominator": 2}, ("3.50", "5/2", "+250", "28.57")),
        ("decimal", {"decimal_value": Decimal("3.75")}, ("3.75", "11/4", "+275", "26.67")),
        ("american", {"decimal_value": Decimal("250")}, ("3.50", "5/2", "+250", "28.57")),
        ("american", {"decimal_value": Decimal("-140")}, ("1.71", "5/7", "-140", "58.33")),
        ("probability", {"decimal_value": Decimal("62.5")}, ("1.60", "3/5", "-166.67", "62.50")),
    ],
)
def test_odds_probability_matches_approved_reference_cases(source, arguments, expected) -> None:
    result = calculate_odds_probability(source=source, **arguments)
    assert (
        result.decimal_odds,
        result.fractional_odds,
        result.american_odds,
        result.implied_probability,
    ) == expected


def test_decimal_to_fraction_uses_exact_source_not_rounded_display() -> None:
    result = calculate_odds_probability(source="decimal", decimal_value=Decimal("1.333"))
    assert result.decimal_odds == "1.33"
    assert result.fractional_odds == "333/1000"
    assert result.implied_probability == "75.02"


@pytest.mark.parametrize(
    ("source", "arguments"),
    [
        ("fractional", {"numerator": 0, "denominator": 1}),
        ("fractional", {"numerator": 1, "denominator": 0}),
        ("decimal", {"decimal_value": Decimal("1")}),
        ("probability", {"decimal_value": Decimal("0")}),
        ("probability", {"decimal_value": Decimal("100")}),
        ("american", {"decimal_value": Decimal("99")}),
    ],
)
def test_odds_probability_rejects_out_of_range_sources(source, arguments) -> None:
    with pytest.raises(ValueError):
        calculate_odds_probability(source=source, **arguments)
