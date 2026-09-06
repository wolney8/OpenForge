from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from math import gcd

PAYOUT_ODDS_MINIMUM = Decimal("1.01")
RAW_ODDS_DISPLAY_PLACES = 12


@dataclass(frozen=True)
class PayoutOddsResult:
    raw_implied_odds: str
    raw_is_approximate: bool
    effective_odds: Decimal


def _decimal_ratio(value: Decimal) -> tuple[int, int]:
    numerator, denominator = value.as_integer_ratio()
    return int(numerator), int(denominator)


def _format_ratio(
    numerator: int,
    denominator: int,
    *,
    decimal_places: int = RAW_ODDS_DISPLAY_PLACES,
) -> tuple[str, bool]:
    whole, remainder = divmod(numerator, denominator)
    if remainder == 0:
        return str(whole), False

    digits: list[str] = []
    for _ in range(decimal_places):
        remainder *= 10
        digit, remainder = divmod(remainder, denominator)
        digits.append(str(digit))
        if remainder == 0:
            break

    return f"{whole}.{''.join(digits)}", remainder != 0


def calculate_payout_odds(
    *, cash_back_stake: Decimal, total_potential_return: Decimal
) -> PayoutOddsResult:
    """Derive odds from a cash-stake total return without an inexact quotient."""

    if cash_back_stake <= 0:
        raise ValueError("Cash back stake must be greater than zero.")
    if total_potential_return <= 0:
        raise ValueError("Total potential return must be greater than zero.")
    if total_potential_return < cash_back_stake:
        raise ValueError("Total potential return must be at least the cash back stake.")

    return_numerator, return_denominator = _decimal_ratio(total_potential_return)
    stake_numerator, stake_denominator = _decimal_ratio(cash_back_stake)
    raw_numerator = return_numerator * stake_denominator
    raw_denominator = return_denominator * stake_numerator
    common_factor = gcd(raw_numerator, raw_denominator)
    raw_numerator //= common_factor
    raw_denominator //= common_factor

    effective_hundredths = (raw_numerator * 100) // raw_denominator
    effective_odds = Decimal(effective_hundredths) / Decimal(100)
    raw_implied_odds, raw_is_approximate = _format_ratio(raw_numerator, raw_denominator)
    return PayoutOddsResult(
        raw_implied_odds=raw_implied_odds,
        raw_is_approximate=raw_is_approximate,
        effective_odds=effective_odds,
    )
