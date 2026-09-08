from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

PENNY = Decimal("0.01")
ZERO = Decimal("0.00")


def money(value: Decimal) -> Decimal:
    return value.quantize(PENNY, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class PartBackInput:
    stake: Decimal
    odds: Decimal


@dataclass(frozen=True)
class EarlyPayoutInput:
    cover_mode: Literal["exchange_lay", "two_way_dutch"]
    back_stake: Decimal
    back_odds: Decimal
    triggered: bool
    lock_adjustment: Decimal = Decimal("1")
    lay_odds: Decimal | None = None
    lay_commission: Decimal = ZERO
    actual_lay_stake: Decimal | None = None
    second_back_odds: Decimal | None = None
    actual_second_back_stake: Decimal | None = None
    maximum_payout: Decimal | None = None
    in_play_back_odds: Decimal | None = None
    part_backs: tuple[PartBackInput, ...] = ()


@dataclass(frozen=True)
class EarlyPayoutOutcome:
    key: str
    label: str
    components: tuple[Decimal, ...]
    total: Decimal


@dataclass(frozen=True)
class EarlyPayoutResult:
    recommended_initial_stake: Decimal
    actual_initial_stake: Decimal
    liability: Decimal | None
    recommended_additional_back_stake: Decimal | None
    outcomes: tuple[EarlyPayoutOutcome, ...]
    current_value: Decimal


def _validate(value: EarlyPayoutInput) -> None:
    if value.back_stake <= 0:
        raise ValueError("Back stake must be greater than zero.")
    if value.back_odds < Decimal("1.01"):
        raise ValueError("Back odds must be at least 1.01.")
    if not ZERO <= value.lay_commission < Decimal("1"):
        raise ValueError("Lay commission must be at least zero and less than one.")
    if not ZERO <= value.lock_adjustment <= Decimal("1.5"):
        raise ValueError("Lock adjustment must be between 0% and 150%.")
    if value.maximum_payout is not None and value.maximum_payout <= 0:
        raise ValueError("Maximum payout must be greater than zero.")
    for part in value.part_backs:
        if part.stake <= 0 or part.odds < Decimal("1.01"):
            raise ValueError("Part backs require a positive stake and odds of at least 1.01.")
    if value.cover_mode == "exchange_lay":
        if value.lay_odds is None or value.lay_odds < Decimal("1.01"):
            raise ValueError("Lay odds must be at least 1.01.")
        if value.actual_lay_stake is not None and value.actual_lay_stake <= 0:
            raise ValueError("Actual lay stake must be greater than zero.")
    elif value.cover_mode == "two_way_dutch":
        if value.second_back_odds is None or value.second_back_odds < Decimal("1.01"):
            raise ValueError("Second bookmaker odds must be at least 1.01.")
        if value.actual_second_back_stake is not None and value.actual_second_back_stake <= 0:
            raise ValueError("Actual second bookmaker stake must be greater than zero.")
    else:
        raise ValueError("Cover mode must be exchange_lay or two_way_dutch.")
    if value.triggered and (
        value.in_play_back_odds is None or value.in_play_back_odds < Decimal("1.01")
    ):
        raise ValueError("Triggered Early Payout requires in-play back odds.")


def calculate_early_payout(value: EarlyPayoutInput) -> EarlyPayoutResult:
    """Mirror the current MBB Early Payout calculator's penny-placement model."""
    _validate(value)
    back_return = money(value.back_stake * value.back_odds)
    bookie_win = money(back_return - value.back_stake)
    bookie_other = money(-value.back_stake)

    if value.cover_mode == "exchange_lay":
        assert value.lay_odds is not None
        recommended_initial = money(back_return / (value.lay_odds - value.lay_commission))
        initial_stake = value.actual_lay_stake or recommended_initial
        liability = money(initial_stake * (value.lay_odds - Decimal("1")))
        initial_win = money(initial_stake * (Decimal("1") - value.lay_commission))
        initial_loss = money(-initial_stake * (value.lay_odds - Decimal("1")))
        columns = (bookie_win, initial_loss)
        other_columns = (bookie_other, initial_win)
    else:
        assert value.second_back_odds is not None
        recommended_initial = money(back_return / value.second_back_odds)
        initial_stake = value.actual_second_back_stake or recommended_initial
        liability = None
        initial_win = money(initial_stake * (value.second_back_odds - Decimal("1")))
        initial_loss = money(-initial_stake)
        columns = (bookie_win, initial_loss, ZERO)
        other_columns = (bookie_other, initial_win, ZERO)

    if not value.triggered:
        if value.cover_mode == "exchange_lay":
            outcomes = (
                EarlyPayoutOutcome(
                    "selection-wins", "Team / selection wins", columns, money(sum(columns))
                ),
                EarlyPayoutOutcome("draw", "Draw", other_columns, money(sum(other_columns))),
                EarlyPayoutOutcome(
                    "selection-loses",
                    "Team / selection loses",
                    other_columns,
                    money(sum(other_columns)),
                ),
            )
        else:
            outcomes = (
                EarlyPayoutOutcome(
                    "selection-wins", "Selection wins", columns, money(sum(columns))
                ),
                EarlyPayoutOutcome(
                    "selection-loses", "Selection loses", other_columns, money(sum(other_columns))
                ),
            )
        return EarlyPayoutResult(
            recommended_initial,
            initial_stake,
            liability,
            None,
            outcomes,
            min(outcome.total for outcome in outcomes),
        )

    assert value.in_play_back_odds is not None
    bookie_other = bookie_win
    payout_return = back_return
    if value.maximum_payout is not None and value.maximum_payout < back_return:
        payout_return = money(value.maximum_payout)
        bookie_other = money(value.maximum_payout - value.back_stake)

    part_stake = sum((money(part.stake) for part in value.part_backs), ZERO)
    part_profit = sum(
        (money(part.stake * (part.odds - Decimal("1"))) for part in value.part_backs),
        ZERO,
    )
    initial_odds = value.lay_odds if value.cover_mode == "exchange_lay" else value.second_back_odds
    assert initial_odds is not None
    additional = money(
        (
            payout_return
            - part_stake
            - value.back_stake * value.back_odds
            + initial_stake * initial_odds
            - part_profit
        )
        / value.in_play_back_odds
        * value.lock_adjustment
    )
    additional = max(ZERO, additional)

    if value.cover_mode == "exchange_lay":
        exchange_if_win = money(
            -initial_stake * (value.lay_odds - Decimal("1"))
            + part_profit
            + money(additional * (value.in_play_back_odds - Decimal("1")))
        )
        exchange_if_other = money(initial_stake - part_stake - additional)
        if exchange_if_win > 0 or exchange_if_other > 0:
            additional = money(
                (
                    payout_return
                    - initial_stake * value.lay_commission
                    - part_stake * (Decimal("1") - value.lay_commission)
                    - value.back_stake * value.back_odds
                    + initial_stake * value.lay_odds
                    - part_profit
                )
                / (value.in_play_back_odds - value.lay_commission)
                * value.lock_adjustment
            )
            additional = max(ZERO, additional)
            exchange_if_win = money(
                -initial_stake * (value.lay_odds - Decimal("1"))
                + part_profit
                + money(additional * (value.in_play_back_odds - Decimal("1")))
            )
            exchange_if_other = money(initial_stake - part_stake - additional)
        if exchange_if_win > 0:
            additional = money(
                (
                    payout_return
                    + initial_stake
                    - initial_stake * value.lay_commission
                    - part_stake
                    + part_stake * value.lay_commission
                    - value.back_stake * value.back_odds
                    - (
                        -initial_stake * value.lay_odds
                        + initial_stake * value.lay_commission * value.lay_odds
                        + initial_stake
                        - initial_stake * value.lay_commission
                        + part_profit
                        - part_profit * value.lay_commission
                    )
                )
                / (value.in_play_back_odds * (Decimal("1") - value.lay_commission))
                * value.lock_adjustment
            )
            additional = max(ZERO, additional)
            exchange_if_win = money(
                -initial_stake * (value.lay_odds - Decimal("1"))
                + part_profit
                + money(additional * (value.in_play_back_odds - Decimal("1")))
            )
            exchange_if_other = money(initial_stake - part_stake - additional)
        if exchange_if_win > 0:
            exchange_if_win = money(exchange_if_win * (Decimal("1") - value.lay_commission))
        if exchange_if_other > 0:
            exchange_if_other = money(exchange_if_other * (Decimal("1") - value.lay_commission))
        win_components = (bookie_win, exchange_if_win)
        other_components = (bookie_other, exchange_if_other)
        outcomes = (
            EarlyPayoutOutcome(
                "selection-wins",
                "Team / selection wins",
                win_components,
                money(sum(win_components)),
            ),
            EarlyPayoutOutcome("draw", "Draw", other_components, money(sum(other_components))),
            EarlyPayoutOutcome(
                "selection-loses",
                "Team / selection loses",
                other_components,
                money(sum(other_components)),
            ),
        )
    else:
        third_win = money(additional * (value.in_play_back_odds - Decimal("1")) + part_profit)
        third_loss = money(-additional - part_stake)
        win_components = (bookie_win, money(-initial_stake), third_win)
        other_components = (bookie_other, initial_win, third_loss)
        outcomes = (
            EarlyPayoutOutcome(
                "selection-wins", "Selection wins", win_components, money(sum(win_components))
            ),
            EarlyPayoutOutcome(
                "selection-loses", "Selection loses", other_components, money(sum(other_components))
            ),
        )

    return EarlyPayoutResult(
        recommended_initial,
        initial_stake,
        liability,
        additional,
        outcomes,
        min(outcome.total for outcome in outcomes),
    )
