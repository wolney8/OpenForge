"""Sportsbook-specific new-write policy; no calculation equations."""

import json
from decimal import Decimal

from openforge_api.free_bet_input import validate_legacy_free_bet_money
from openforge_api.money_input import normalize_money_input
from openforge_api.sportsbook_odds_input import validate_complete_decimal_string

MONEY_FIELDS = (
    "back_stake",
    "lay_actual",
    "lay_matched_stake_1",
    "maximum_bonus",
    "maximum_boost_winnings",
    "manual_override_value",
)


def money(value: str, field: str, *, legacy: bool = False) -> str:
    if legacy:
        if isinstance(value, str) and not value.strip():
            return value
        validate_legacy_free_bet_money(value, field)
        return value
    text = normalize_money_input(value, field)
    if text and field != "manual_override_value" and Decimal(text) < 0:
        raise ValueError(f"{field}: enter a non-negative amount")
    return text


def percentage(value: str, field: str) -> str:
    if value == "":
        return value
    validate_complete_decimal_string(value, message=f"{field}: enter a complete decimal percentage")
    if field == "bonus_retention_rate" and Decimal(value) > 100:
        raise ValueError(f"{field}: enter a percentage from 0 to 100")
    return value


def nested_money(serialized: str, *, legacy: bool = False) -> str:
    entries = json.loads(serialized or "[]")
    if not isinstance(entries, list):
        raise ValueError("multi_lay_outcomes_json: expected an array")
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise ValueError(f"multi_lay_outcomes_json[{index}]: expected an object")
        for key in ("placedMatchedStake", "matchedStake"):
            if key in entry:
                entry[key] = money(
                    entry[key], f"multi_lay_outcomes_json[{index}].{key}", legacy=legacy
                )
        if "commission" in entry:
            from openforge_api.free_bet_input import validate_free_bet_commission

            validate_free_bet_commission(entry["commission"])
    return serialized if legacy else json.dumps(entries, separators=(",", ":"))
