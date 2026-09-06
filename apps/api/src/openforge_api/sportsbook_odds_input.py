from __future__ import annotations

import json
import re
from decimal import Decimal
from typing import Any

from pydantic_core import PydanticCustomError

SPORTSBOOK_ODDS_FORMAT_MESSAGE = "Enter decimal odds using a full stop, for example 8.5."
SPORTSBOOK_ODDS_MINIMUM_MESSAGE = "Enter odds of 1.01 or higher."
SPORTSBOOK_ODDS_MINIMUM = Decimal("1.01")

_DECIMAL_ODDS_PATTERN = re.compile(r"^[0-9]+(?:\.[0-9]+)?$")
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
        raise PydanticCustomError(
            "sportsbook_odds_format", SPORTSBOOK_ODDS_FORMAT_MESSAGE
        ) from exc

    decimal_value = Decimal(value)
    if not decimal_value.is_finite():
        raise PydanticCustomError("sportsbook_odds_format", SPORTSBOOK_ODDS_FORMAT_MESSAGE)
    if decimal_value < SPORTSBOOK_ODDS_MINIMUM:
        raise PydanticCustomError("sportsbook_odds_minimum", SPORTSBOOK_ODDS_MINIMUM_MESSAGE)
    return value


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
