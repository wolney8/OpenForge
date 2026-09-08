from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

SelectionState = Literal["winner", "loser", "void"]
MONEY = Decimal("0.01")


@dataclass(frozen=True)
class AccumulatorSelectionInput:
    odds: Decimal
    state: SelectionState


@dataclass(frozen=True)
class AccumulatorReferenceResult:
    combined_odds: Decimal
    total_stake: Decimal
    total_return: Decimal
    total_profit: Decimal
    all_win_return: Decimal
    all_win_profit: Decimal
    any_loss_profit: Decimal


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def calculate_accumulator_reference(
    *, stake: Decimal, selections: list[AccumulatorSelectionInput]
) -> AccumulatorReferenceResult:
    """Calculate one all-to-win multiple; void selections contribute decimal odds 1."""
    if stake <= 0 or len(selections) < 2:
        raise ValueError("A positive stake and at least two selections are required.")
    if any(selection.odds <= 1 for selection in selections):
        raise ValueError("Every selection must have decimal odds greater than 1.")

    combined_odds = Decimal("1")
    settled_multiplier = Decimal("1")
    for selection in selections:
        combined_odds *= selection.odds
        if selection.state == "loser":
            settled_multiplier = Decimal("0")
        elif selection.state == "winner":
            settled_multiplier *= selection.odds

    all_win_return = money(stake * combined_odds)
    total_return = money(stake * settled_multiplier)
    return AccumulatorReferenceResult(
        combined_odds=combined_odds,
        total_stake=money(stake),
        total_return=total_return,
        total_profit=money(total_return - stake),
        all_win_return=all_win_return,
        all_win_profit=money(all_win_return - stake),
        any_loss_profit=money(-stake),
    )
