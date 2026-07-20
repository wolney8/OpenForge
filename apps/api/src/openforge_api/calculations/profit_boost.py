from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Literal

ProfitBoostMode = Literal["displayed_odds", "percentage"]


def _parse_decimal(value: str | Decimal | None) -> Decimal | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return Decimal(str(value).strip())
    except InvalidOperation:
        return None


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _odds(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class ProfitBoostInput:
    profile_id: str
    mode: ProfitBoostMode
    back_stake: str
    base_back_odds: str = ""
    profit_boost_percent: str = ""
    boosted_back_odds: str = ""
    actual_accepted_back_odds: str = ""
    maximum_boost_winnings: str = ""


@dataclass(frozen=True)
class ProfitBoostResult:
    calculation_state: Literal["resolved", "incomplete"]
    calculation_notes: tuple[str, ...]
    reference_boosted_odds: Decimal | None
    effective_back_odds: Decimal | None
    uncapped_extra_profit: Decimal | None
    extra_profit: Decimal | None
    boost_source: Literal["accepted", "displayed", "calculated", "unresolved"]


def _incomplete(note: str) -> ProfitBoostResult:
    return ProfitBoostResult("incomplete", (note,), None, None, None, None, "unresolved")


def calculate_profit_boost(values: ProfitBoostInput) -> ProfitBoostResult:
    stake = _parse_decimal(values.back_stake)
    accepted_odds = _parse_decimal(values.actual_accepted_back_odds)
    displayed_odds = _parse_decimal(values.boosted_back_odds)

    if stake is None or stake <= 0:
        return _incomplete("Back stake must be greater than zero.")

    if accepted_odds is not None:
        if accepted_odds <= 1:
            return _incomplete("Actual accepted odds must be greater than 1.00.")
        return ProfitBoostResult(
            "resolved", (), None, _odds(accepted_odds), None, None, "accepted"
        )

    if values.mode == "displayed_odds":
        if displayed_odds is None or displayed_odds <= 1:
            return _incomplete("Displayed boosted odds must be greater than 1.00.")
        resolved_odds = _odds(displayed_odds)
        return ProfitBoostResult(
            "resolved", (), resolved_odds, resolved_odds, None, None, "displayed"
        )

    base_odds = _parse_decimal(values.base_back_odds)
    boost_percent = _parse_decimal(values.profit_boost_percent)
    maximum_boost = _parse_decimal(values.maximum_boost_winnings)
    if base_odds is None or base_odds <= 1:
        return _incomplete("Base back odds must be greater than 1.00.")
    if boost_percent is None or boost_percent <= 0:
        return _incomplete("Profit boost percentage must be greater than zero.")
    if maximum_boost is not None and maximum_boost < 0:
        return _incomplete("Maximum boost winnings cannot be negative.")

    uncapped_extra = _money(
        stake * (base_odds - Decimal("1")) * (boost_percent / Decimal("100"))
    )
    extra_profit = (
        uncapped_extra
        if maximum_boost is None
        else min(uncapped_extra, _money(maximum_boost))
    )
    reference_profit = (stake * (base_odds - Decimal("1"))) + extra_profit
    reference_odds = _odds(Decimal("1") + (reference_profit / stake))
    return ProfitBoostResult(
        "resolved",
        (),
        reference_odds,
        reference_odds,
        uncapped_extra,
        extra_profit,
        "calculated",
    )
