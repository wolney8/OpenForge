from __future__ import annotations

from dataclasses import dataclass, replace
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Literal

from openforge_api.calculations.payout_odds import calculate_payout_odds

ProfitBoostMode = Literal["displayed_odds", "total_return", "profit_only", "percentage"]


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
    total_potential_return: str = ""
    potential_profit: str = ""
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
    raw_derived_odds: str | None = None
    bookmaker_total_return: Decimal | None = None
    effective_odds_return: Decimal | None = None
    potential_profit: Decimal | None = None
    equation: str = ""


def _incomplete(note: str) -> ProfitBoostResult:
    return ProfitBoostResult("incomplete", (note,), None, None, None, None, "unresolved")


def _resolved(
    *, stake: Decimal, reference_odds: Decimal | None, effective_odds: Decimal,
    source: Literal["accepted", "displayed", "calculated"], raw_odds: str | None,
    bookmaker_return: Decimal, equation: str, uncapped_extra: Decimal | None = None,
    extra_profit: Decimal | None = None,
) -> ProfitBoostResult:
    return ProfitBoostResult(
        "resolved", (), reference_odds, effective_odds, uncapped_extra, extra_profit, source,
        raw_odds, _money(bookmaker_return), _money(stake * effective_odds),
        _money(bookmaker_return - stake), equation,
    )


def calculate_profit_boost(values: ProfitBoostInput) -> ProfitBoostResult:
    stake = _parse_decimal(values.back_stake)
    accepted_odds = _parse_decimal(values.actual_accepted_back_odds)
    displayed_odds = _parse_decimal(values.boosted_back_odds)

    if stake is None or stake <= 0:
        return _incomplete("Back stake must be greater than zero.")

    if accepted_odds is not None:
        if accepted_odds <= 1:
            return _incomplete("Actual accepted odds must be greater than 1.00.")
        effective = _odds(accepted_odds)
        derived = calculate_profit_boost(replace(values, actual_accepted_back_odds=""))
        reference = derived.reference_boosted_odds if derived.calculation_state == "resolved" else None
        raw = derived.raw_derived_odds if derived.calculation_state == "resolved" else None
        bookmaker_return = (
            derived.bookmaker_total_return
            if derived.calculation_state == "resolved" and derived.bookmaker_total_return is not None
            else stake * effective
        )
        return _resolved(stake=stake, reference_odds=reference, effective_odds=effective,
            source="accepted", raw_odds=raw, bookmaker_return=bookmaker_return,
            equation="Accepted odds override = effective odds")

    if values.mode == "displayed_odds":
        if displayed_odds is None or displayed_odds <= 1:
            return _incomplete("Displayed boosted odds must be greater than 1.00.")
        resolved_odds = _odds(displayed_odds)
        return _resolved(stake=stake, reference_odds=resolved_odds, effective_odds=resolved_odds,
            source="displayed", raw_odds=str(displayed_odds), bookmaker_return=stake * displayed_odds,
            equation="Displayed boosted odds = effective odds")

    if values.mode == "total_return":
        total_return = _parse_decimal(values.total_potential_return)
        if total_return is None or total_return < stake:
            return _incomplete(
                "Total potential return must include the returned stake and be at least the stake."
            )
        payout = calculate_payout_odds(
            cash_back_stake=stake, total_potential_return=total_return
        )
        resolved_odds = payout.effective_odds
        if resolved_odds <= 1:
            return _incomplete("Derived boosted odds must be greater than 1.00.")
        return _resolved(stake=stake, reference_odds=resolved_odds, effective_odds=resolved_odds,
            source="calculated", raw_odds=payout.raw_implied_odds,
            bookmaker_return=total_return,
            equation="Raw odds = bookmaker total return / stake; hedge odds = floor(raw odds, 2dp)")

    if values.mode == "profit_only":
        potential_profit = _parse_decimal(values.potential_profit)
        if potential_profit is None or potential_profit <= 0:
            return _incomplete("Potential profit must be greater than zero.")
        resolved_odds = _odds(Decimal("1") + (potential_profit / stake))
        return _resolved(stake=stake, reference_odds=resolved_odds, effective_odds=resolved_odds,
            source="calculated", raw_odds=str(Decimal("1") + (potential_profit / stake)),
            bookmaker_return=stake + potential_profit,
            equation="Boosted odds = 1 + (bookmaker profit / stake)")

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
    return _resolved(stake=stake, reference_odds=reference_odds,
        effective_odds=reference_odds, source="calculated", raw_odds=str(reference_odds),
        bookmaker_return=stake * reference_odds,
        equation="Boosted odds = 1 + ((original odds - 1) × (1 + boost %))",
        uncapped_extra=uncapped_extra, extra_profit=extra_profit)
