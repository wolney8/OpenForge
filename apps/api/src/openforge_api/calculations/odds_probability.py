from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, localcontext
from fractions import Fraction
from math import gcd
from typing import Literal

OddsSource = Literal["decimal", "fractional", "probability", "american"]


@dataclass(frozen=True)
class OddsProbabilityResult:
    source: OddsSource
    decimal_odds: str
    fractional_odds: str
    american_odds: str
    implied_probability: str


def _fraction_from_decimal(value: Decimal) -> Fraction:
    return Fraction(value)


def _display(value: Decimal, places: int = 2) -> str:
    quantum = Decimal(1).scaleb(-places)
    return f"{value.quantize(quantum, rounding=ROUND_HALF_UP):.{places}f}"


def _display_american(value: Decimal) -> str:
    rendered = _display(value).rstrip("0").rstrip(".")
    return f"+{rendered}" if value > 0 else rendered


def calculate_odds_probability(
    *,
    source: OddsSource,
    numerator: int | None = None,
    denominator: int | None = None,
    decimal_value: Decimal | None = None,
) -> OddsProbabilityResult:
    """Convert one exact source value without deriving from rounded display output."""
    if source == "fractional":
        if numerator is None or denominator is None or numerator <= 0 or denominator <= 0:
            raise ValueError("Fractional odds require a positive numerator and denominator.")
        decimal_fraction = Fraction(numerator + denominator, denominator)
    elif decimal_value is None:
        raise ValueError("A decimal source value is required.")
    elif source == "decimal":
        if decimal_value <= 1:
            raise ValueError("Decimal odds must be greater than 1.")
        decimal_fraction = _fraction_from_decimal(decimal_value)
    elif source == "probability":
        if decimal_value <= 0 or decimal_value >= 100:
            raise ValueError("Probability must be greater than 0 and less than 100.")
        decimal_fraction = Fraction(100, 1) / _fraction_from_decimal(decimal_value)
    elif source == "american":
        if -100 < decimal_value < 100:
            raise ValueError("American odds must be at least +100 or at most -100.")
        american_fraction = _fraction_from_decimal(abs(decimal_value))
        decimal_fraction = (
            Fraction(1, 1) + american_fraction / 100
            if decimal_value > 0
            else Fraction(1, 1) + Fraction(100, 1) / american_fraction
        )
    else:  # pragma: no cover - protected by the API literal
        raise ValueError("Unsupported odds source.")

    if decimal_fraction <= 1:
        raise ValueError("Odds must imply decimal odds greater than 1.")

    profit_fraction = decimal_fraction - 1
    numerator_out = profit_fraction.numerator
    denominator_out = profit_fraction.denominator
    divisor = gcd(numerator_out, denominator_out)
    numerator_out //= divisor
    denominator_out //= divisor

    with localcontext() as context:
        context.prec = 50
        decimal_odds = Decimal(decimal_fraction.numerator) / Decimal(decimal_fraction.denominator)
        probability = Decimal(100) / decimal_odds
        american = (
            Decimal(100) * (decimal_odds - 1)
            if decimal_odds >= 2
            else -Decimal(100) / (decimal_odds - 1)
        )

    return OddsProbabilityResult(
        source=source,
        decimal_odds=_display(decimal_odds),
        fractional_odds=f"{numerator_out}/{denominator_out}",
        american_odds=_display_american(american),
        implied_probability=_display(probability),
    )
