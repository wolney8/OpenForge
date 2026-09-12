"""Complete-string, exact-cent money validation; never partial parsing/rounding."""

import re
from decimal import Decimal
from typing import Any

_MONEY = re.compile(r"-?(?:[0-9]+(?:\.[0-9]{1,2})?|\.[0-9]{1,2})")
ACCOUNT_MONEY_FIELDS = ("current_balance", "pending_withdrawal_amount")


class AccountMoneyError(ValueError):
    pass


def normalize_money_input(value: str, field: str) -> str:
    if not isinstance(value, str):
        raise AccountMoneyError(f"{field}: enter a decimal amount; null is not supported")
    text = value.strip()
    if not text:
        return ""
    if len(text) > 40 or not _MONEY.fullmatch(text):
        raise AccountMoneyError(
            f"{field}: enter finite money with a full stop and at most two decimal places"
        )
    amount = Decimal(text)
    canonical = "0.00" if amount.is_zero() else format(amount, ".2f")
    if len(canonical) > 40:
        raise AccountMoneyError(
            f"{field}: canonical money must fit the existing 40-character field"
        )
    return canonical


def validate_account_money_payload(payload: dict[str, Any]) -> dict[str, Any]:
    result = dict(payload)
    for field in ACCOUNT_MONEY_FIELDS:
        if field in result:
            result[field] = normalize_money_input(result[field], field)
    return result
