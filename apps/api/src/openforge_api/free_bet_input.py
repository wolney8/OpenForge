"""Free Bet field policy, not calculation equations (PD-QA-014)."""

import re
from datetime import datetime
from decimal import Decimal

from openforge_api.money_input import normalize_money_input
from openforge_api.sportsbook_odds_input import validate_complete_decimal_string

MONEY_FIELDS = (
    "free_bet_value",
    "lay_actual",
    "lay_matched_stake_1",
    "manual_override_value",
    "source_award_expected_value",
)


def validate_legacy_free_bet_money(value: str, field: str) -> None:
    """Read existing finite decimals without retroactively changing their precision."""
    if value == "":
        return
    if not isinstance(value, str) or not re.fullmatch(
        r"-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)", value.strip()
    ):
        raise ValueError(f"{field}: stored money requires correction")
    amount = Decimal(value)
    if not amount.is_finite() or (field != "manual_override_value" and amount < 0):
        raise ValueError(f"{field}: stored money requires correction")


def validate_free_bet_money(value: str, field: str) -> str:
    text = normalize_money_input(value, field)
    if text and field != "manual_override_value" and Decimal(text) < 0:
        raise ValueError(f"{field}: enter a non-negative amount")
    return text


def validate_free_bet_commission(value: str) -> str:
    if value == "":
        return value
    validate_complete_decimal_string(value, message="Commission must be a complete decimal ratio.")
    rate = Decimal(value)
    if not rate.is_finite() or not Decimal(0) <= rate <= Decimal(1):
        raise ValueError("lay_commission_1: enter a finite decimal ratio between 0 and 1")
    return value


def validate_free_bet_date(value: str) -> str:
    if value:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value
