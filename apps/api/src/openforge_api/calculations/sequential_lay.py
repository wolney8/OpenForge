from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal
from typing import Literal

PENNY = Decimal("0.01")


def _nearest_penny(value: Decimal) -> Decimal:
    return value.quantize(PENNY, rounding=ROUND_HALF_UP)


def _up_to_penny(value: Decimal) -> Decimal:
    return value.quantize(PENNY, rounding=ROUND_CEILING)


def _down_to_penny(value: Decimal) -> Decimal:
    return value.quantize(PENNY, rounding=ROUND_FLOOR)


@dataclass(frozen=True)
class SequentialLayLegInput:
    lay_odds: Decimal
    commission: Decimal


@dataclass(frozen=True)
class SequentialLayInput:
    mode: Literal["standard", "lock_in"]
    back_stake: Decimal
    back_odds: Decimal
    back_commission: Decimal
    legs: tuple[SequentialLayLegInput, ...]


@dataclass(frozen=True)
class SequentialLayLegResult:
    lay_odds: Decimal
    commission: Decimal
    lay_stake: Decimal
    liability: Decimal
    lay_win: Decimal


@dataclass(frozen=True)
class SequentialLayOutcome:
    key: str
    label: str
    bookmaker_component: Decimal
    exchange_components: tuple[Decimal, ...]
    total: Decimal


@dataclass(frozen=True)
class SequentialLayResult:
    back_win: Decimal
    legs: tuple[SequentialLayLegResult, ...]
    outcomes: tuple[SequentialLayOutcome, ...]
    all_legs_win: Decimal
    locked_result: Decimal | None


def calculate_sequential_lay(calculation_input: SequentialLayInput) -> SequentialLayResult:
    if calculation_input.mode not in {"standard", "lock_in"}:
        raise ValueError("Sequential Lay mode must be standard or lock_in.")
    if calculation_input.back_stake <= 0:
        raise ValueError("Back stake must be greater than zero.")
    if calculation_input.back_odds < Decimal("1.01"):
        raise ValueError("Back odds must be at least 1.01.")
    if not Decimal("0") <= calculation_input.back_commission <= Decimal("1"):
        raise ValueError("Back commission must be between 0 and 1.")
    if len(calculation_input.legs) < 2:
        raise ValueError("Sequential Lay requires at least two legs.")
    for leg in calculation_input.legs:
        if leg.lay_odds < Decimal("1.01"):
            raise ValueError("Lay odds must be at least 1.01.")
        if not Decimal("0") <= leg.commission < Decimal("1"):
            raise ValueError("Lay commission must be at least 0 and less than 1.")

    bookmaker_profit = _nearest_penny(
        calculation_input.back_stake
        * (calculation_input.back_odds - Decimal("1"))
        * (Decimal("1") - calculation_input.back_commission)
    )
    results: list[SequentialLayLegResult] = []
    prior_liability = Decimal("0")

    for index, leg in enumerate(calculation_input.legs):
        is_lock_in_final = (
            calculation_input.mode == "lock_in" and index == len(calculation_input.legs) - 1
        )
        if is_lock_in_final:
            numerator = calculation_input.back_stake + bookmaker_profit
            denominator = leg.lay_odds - leg.commission
        else:
            numerator = calculation_input.back_stake + prior_liability
            denominator = Decimal("1") - leg.commission
        if denominator <= 0:
            raise ValueError("The selected odds and commission do not produce a valid lay stake.")

        lay_stake = _up_to_penny(numerator / denominator)
        lay_win = _down_to_penny(lay_stake * (Decimal("1") - leg.commission))
        liability = _down_to_penny(lay_stake * (leg.lay_odds - Decimal("1")))
        results.append(
            SequentialLayLegResult(
                lay_odds=leg.lay_odds,
                commission=leg.commission,
                lay_stake=lay_stake,
                liability=liability,
                lay_win=lay_win,
            )
        )
        prior_liability = _nearest_penny(prior_liability + liability)

    outcomes: list[SequentialLayOutcome] = []
    for index, result in enumerate(results):
        exchange_components = tuple(
            [-earlier.liability for earlier in results[:index]] + [result.lay_win]
        )
        total = _nearest_penny(
            -calculation_input.back_stake + sum(exchange_components, Decimal("0"))
        )
        outcomes.append(
            SequentialLayOutcome(
                key=f"leg-{index + 1}-loses",
                label=f"Leg {index + 1} loses",
                bookmaker_component=-calculation_input.back_stake,
                exchange_components=exchange_components,
                total=total,
            )
        )

    all_exchange_components = tuple(-result.liability for result in results)
    all_legs_win = _nearest_penny(bookmaker_profit + sum(all_exchange_components, Decimal("0")))
    outcomes.append(
        SequentialLayOutcome(
            key="all-legs-win",
            label="All legs win",
            bookmaker_component=bookmaker_profit,
            exchange_components=all_exchange_components,
            total=all_legs_win,
        )
    )
    locked_result = (
        min(outcomes[-2].total, all_legs_win) if calculation_input.mode == "lock_in" else None
    )
    return SequentialLayResult(
        back_win=bookmaker_profit,
        legs=tuple(results),
        outcomes=tuple(outcomes),
        all_legs_win=all_legs_win,
        locked_result=locked_result,
    )
