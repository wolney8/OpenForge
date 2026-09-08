from __future__ import annotations

import json
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from pydantic_core import PydanticCustomError

SPORTSBOOK_ODDS_FORMAT_MESSAGE = "Enter decimal odds using a full stop, for example 8.5."
SPORTSBOOK_ODDS_MINIMUM_MESSAGE = "Enter odds of 1.01 or higher."
SPORTSBOOK_ODDS_MINIMUM = Decimal("1.01")

_DECIMAL_ODDS_PATTERN = re.compile(r"^[0-9]+(?:\.[0-9]+)?$")
_SIMPLE_DECIMAL_COMMA_PATTERN = re.compile(r"^[0-9]+,[0-9]{1,2}$")
_FRACTIONAL_ODDS_PATTERN = re.compile(r"^([0-9]+)/([0-9]+)$")
_NESTED_ODDS_KEYS = ("layOdds", "placedLayOdds")


def validate_complete_decimal_string(value: Any, *, message: str) -> str:
    """Validate an unsigned base-10 input without trimming or numeric coercion."""

    if not isinstance(value, str) or not _DECIMAL_ODDS_PATTERN.fullmatch(value):
        raise PydanticCustomError("decimal_input_format", message)
    return value


def validate_sportsbook_odds(value: Any, *, allow_empty: bool = True) -> str:
    """Validate the complete request value without normalising or repairing it."""

    if not isinstance(value, str):
        raise PydanticCustomError("sportsbook_odds_format", SPORTSBOOK_ODDS_FORMAT_MESSAGE)
    if value == "":
        if allow_empty:
            return value
        raise PydanticCustomError("sportsbook_odds_required", "Odds are required.")
    try:
        validate_complete_decimal_string(value, message=SPORTSBOOK_ODDS_FORMAT_MESSAGE)
    except PydanticCustomError as exc:
        raise PydanticCustomError("sportsbook_odds_format", SPORTSBOOK_ODDS_FORMAT_MESSAGE) from exc

    decimal_value = Decimal(value)
    if not decimal_value.is_finite():
        raise PydanticCustomError("sportsbook_odds_format", SPORTSBOOK_ODDS_FORMAT_MESSAGE)
    if decimal_value < SPORTSBOOK_ODDS_MINIMUM:
        raise PydanticCustomError("sportsbook_odds_minimum", SPORTSBOOK_ODDS_MINIMUM_MESSAGE)
    return value


def normalize_calculator_odds(value: Any) -> str:
    """Return canonical decimal calculator odds without accepting ambiguous syntax.

    Fractional entry is converted to the existing two-decimal odds display contract.
    The calculation itself uses Decimal throughout; ordinary decimal input is not
    rounded or otherwise repaired.
    """

    if not isinstance(value, str):
        raise PydanticCustomError("calculator_odds_format", SPORTSBOOK_ODDS_FORMAT_MESSAGE)
    normalized = value
    comma_match = _SIMPLE_DECIMAL_COMMA_PATTERN.fullmatch(value)
    fraction_match = _FRACTIONAL_ODDS_PATTERN.fullmatch(value)
    if comma_match:
        normalized = value.replace(",", ".")
    elif fraction_match:
        numerator = Decimal(fraction_match.group(1))
        denominator = Decimal(fraction_match.group(2))
        if denominator == 0:
            raise PydanticCustomError(
                "calculator_odds_zero_denominator", "Fractional odds need a denominator above zero."
            )
        decimal_odds = (Decimal("1") + (numerator / denominator)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        normalized = f"{decimal_odds:.2f}"
    return validate_sportsbook_odds(normalized, allow_empty=False)


def validate_nested_sportsbook_odds(serialized: Any) -> str:
    if not isinstance(serialized, str):
        raise PydanticCustomError(
            "sportsbook_nested_odds_format", "Multi-lay outcomes must be a JSON string."
        )
    try:
        entries = json.loads(serialized or "[]")
    except json.JSONDecodeError as exc:
        raise PydanticCustomError(
            "sportsbook_nested_odds_format", "Multi-lay outcomes must contain valid JSON."
        ) from exc
    if not isinstance(entries, list):
        raise PydanticCustomError(
            "sportsbook_nested_odds_format", "Multi-lay outcomes must be a JSON array."
        )

    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue
        for key in _NESTED_ODDS_KEYS:
            if key not in entry or entry[key] == "":
                continue
            try:
                validate_sportsbook_odds(entry[key])
            except PydanticCustomError as exc:
                raise PydanticCustomError(
                    "sportsbook_nested_odds_value",
                    f"multi_lay_outcomes_json[{index}].{key}: {exc.message_template}",
                ) from exc
    return serialized
