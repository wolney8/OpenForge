from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal
from typing import Literal

BetType = Literal["normal", "free_bet"]
MONEY = Decimal("0.01")


@dataclass(frozen=True)
class DutchingSelectionInput:
    odds: Decimal
    commission: Decimal


@dataclass(frozen=True)
class DutchingSelectionResult:
    odds: Decimal
    effective_odds: Decimal
    stake: Decimal
    return_value: Decimal
    profit: Decimal


@dataclass(frozen=True)
class DutchingReferenceResult:
    selections: list[DutchingSelectionResult]
    total_stake: Decimal
    reference_result: Decimal


def _money(value: Decimal, rounding: str = ROUND_HALF_UP) -> Decimal:
    return value.quantize(MONEY, rounding=rounding)


def _round_stake(value: Decimal, increment: Decimal) -> Decimal:
    if increment == 0:
        return _money(value)
    return (value / increment).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * increment


def calculate_simple_dutching_reference(
    *,
    first_stake: Decimal,
    selections: list[DutchingSelectionInput],
    bet_type: BetType,
    rounding_increment: Decimal = Decimal("0"),
) -> DutchingReferenceResult:
    """Equalise covered-outcome returns from a fixed first-selection stake."""
    if first_stake <= 0 or len(selections) not in {2, 3}:
        raise ValueError("A positive first stake and two or three selections are required.")
    if rounding_increment not in {Decimal("0"), Decimal("1"), Decimal("5"), Decimal("10")}:
        raise ValueError("Unsupported stake-rounding increment.")
    if any(item.odds <= 1 or item.commission < 0 or item.commission >= 1 for item in selections):
        raise ValueError("Odds and commission are outside the supported range.")

    effective: list[Decimal] = []
    for index, item in enumerate(selections):
        stake_return = Decimal("0") if index == 0 and bet_type == "free_bet" else Decimal("1")
        effective.append((item.odds - 1) * (1 - item.commission) + stake_return)
    target_return = first_stake * effective[0]
    stakes = [first_stake]
    stakes.extend(_round_stake(target_return / odds, rounding_increment) for odds in effective[1:])
    total_stake = sum(stakes[1:], Decimal("0")) + (
        Decimal("0") if bet_type == "free_bet" else stakes[0]
    )

    results: list[DutchingSelectionResult] = []
    for item, item_effective, stake in zip(selections, effective, stakes, strict=True):
        # The public calculator floors positive returns to pennies after stake placement.
        return_value = _money(stake * item_effective, ROUND_DOWN)
        results.append(
            DutchingSelectionResult(
                odds=item.odds,
                effective_odds=item_effective,
                stake=_money(stake),
                return_value=return_value,
                profit=_money(return_value - total_stake),
            )
        )
    reference_result = min(item.profit for item in results)
    return DutchingReferenceResult(
        selections=results,
        total_stake=_money(total_stake),
        reference_result=reference_result,
    )
