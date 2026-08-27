from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Literal

Mode = Literal["Each Way", "Extra Place"]
Result = Literal["Pending", "Win", "Standard Place", "Extra Place", "Unplaced", "Void/NR"]


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _decimal(value: str | Decimal | int | float | None) -> Decimal | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return Decimal(str(value).strip())
    except InvalidOperation:
        return None


def _commission(value: str | Decimal | int | float | None) -> Decimal | None:
    parsed = _decimal(value)
    if parsed is None:
        return Decimal("0")
    return parsed / Decimal("100") if parsed > 1 else parsed


def outcome_for_finishing_position(
    *,
    mode: Mode,
    bookmaker_places: int,
    exchange_places: int,
    finishing_position: int,
) -> Result:
    """Classify a finish from the explicit bookmaker/exchange place-count gap.

    The each-way fraction (for example 1/5) only derives bookmaker place odds.
    It must not be used to infer how many places either market pays.
    """
    if finishing_position < 1:
        return "Pending"
    bookmaker = max(1, bookmaker_places)
    exchange = bookmaker if mode == "Each Way" else max(1, min(exchange_places, bookmaker))
    if finishing_position == 1:
        return "Win"
    if finishing_position <= exchange:
        return "Standard Place"
    if mode == "Extra Place" and bookmaker > exchange and finishing_position <= bookmaker:
        return "Extra Place"
    return "Unplaced"


@dataclass(frozen=True)
class EachWayCalculationInput:
    mode: Mode
    each_way_stake: str
    back_odds: str
    place_term_numerator: str = "1"
    place_term_denominator: str = "5"
    win_lay_odds: str = ""
    place_lay_odds: str = ""
    win_commission: str = "0"
    place_commission: str = "0"
    actual_win_lay_stake: str = ""
    actual_place_lay_stake: str = ""
    result: Result = "Pending"


@dataclass(frozen=True)
class EachWayCalculationResult:
    calculation_state: Literal["resolved", "incomplete"]
    calculation_notes: tuple[str, ...]
    place_back_odds: Decimal | None
    win_lay_stake: Decimal | None
    place_lay_stake: Decimal | None
    win_liability: Decimal | None
    place_liability: Decimal | None
    qualifying_loss: Decimal | None
    extra_place_profit: Decimal | None
    rating_percent: Decimal | None
    implied_odds: Decimal | None
    first_place_pnl: Decimal | None
    standard_place_pnl: Decimal | None
    extra_place_pnl: Decimal | None
    unplaced_pnl: Decimal | None
    first_place_bookie_pnl: Decimal | None
    first_place_exchange_pnl: Decimal | None
    standard_place_bookie_pnl: Decimal | None
    standard_place_exchange_pnl: Decimal | None
    extra_place_bookie_pnl: Decimal | None
    extra_place_exchange_pnl: Decimal | None
    unplaced_bookie_pnl: Decimal | None
    unplaced_exchange_pnl: Decimal | None
    first_place_bookie_win_pnl: Decimal | None
    first_place_bookie_place_pnl: Decimal | None
    first_place_exchange_win_pnl: Decimal | None
    first_place_exchange_place_pnl: Decimal | None
    standard_place_bookie_win_pnl: Decimal | None
    standard_place_bookie_place_pnl: Decimal | None
    standard_place_exchange_win_pnl: Decimal | None
    standard_place_exchange_place_pnl: Decimal | None
    extra_place_bookie_win_pnl: Decimal | None
    extra_place_bookie_place_pnl: Decimal | None
    extra_place_exchange_win_pnl: Decimal | None
    extra_place_exchange_place_pnl: Decimal | None
    unplaced_bookie_win_pnl: Decimal | None
    unplaced_bookie_place_pnl: Decimal | None
    unplaced_exchange_win_pnl: Decimal | None
    unplaced_exchange_place_pnl: Decimal | None
    current_value: Decimal | None
    final_value: Decimal | None


def calculate_each_way_extra_place(values: EachWayCalculationInput) -> EachWayCalculationResult:
    stake = _decimal(values.each_way_stake)
    back_odds = _decimal(values.back_odds)
    numerator = _decimal(values.place_term_numerator)
    denominator = _decimal(values.place_term_denominator)
    win_lay_odds = _decimal(values.win_lay_odds)
    place_lay_odds = _decimal(values.place_lay_odds)
    win_commission = _commission(values.win_commission)
    place_commission = _commission(values.place_commission)
    notes: list[str] = []
    if stake is None or stake <= 0:
        notes.append("Enter the each-way stake.")
    if back_odds is None or back_odds <= 1:
        notes.append("Enter bookmaker back odds above 1.00.")
    if numerator is None or denominator is None or numerator <= 0 or denominator <= 0:
        notes.append("Enter valid each-way terms.")
    if win_lay_odds is None or win_lay_odds <= (win_commission or Decimal("0")):
        notes.append("Enter valid win lay odds.")
    if place_lay_odds is None or place_lay_odds <= (place_commission or Decimal("0")):
        notes.append("Enter valid place lay odds.")
    if notes:
        return EachWayCalculationResult("incomplete", tuple(notes), *([None] * 39))

    assert (
        stake is not None
        and back_odds is not None
        and numerator is not None
        and denominator is not None
    )
    assert (
        win_lay_odds is not None
        and place_lay_odds is not None
        and win_commission is not None
        and place_commission is not None
    )
    place_back_odds = Decimal("1") + ((back_odds - Decimal("1")) * numerator / denominator)
    suggested_win_stake = _money((back_odds * stake) / (win_lay_odds - win_commission))
    suggested_place_stake = _money((place_back_odds * stake) / (place_lay_odds - place_commission))
    win_stake = _decimal(values.actual_win_lay_stake) or suggested_win_stake
    place_stake = _decimal(values.actual_place_lay_stake) or suggested_place_stake
    win_liability = _money(win_stake * (win_lay_odds - Decimal("1")))
    place_liability = _money(place_stake * (place_lay_odds - Decimal("1")))
    total_outlay = stake * 2
    win_lay_return = _money(win_stake * (Decimal("1") - win_commission))
    place_lay_return = _money(place_stake * (Decimal("1") - place_commission))
    # Preserve individual win/place legs for the MBB-style outcome matrix.
    first_place_bookie_win = _money(stake * (back_odds - Decimal("1")))
    first_place_bookie_place = _money(stake * (place_back_odds - Decimal("1")))
    first_place_exchange_win = _money(-win_liability)
    first_place_exchange_place = _money(-place_liability)
    standard_place_bookie_win = _money(-stake)
    standard_place_bookie_place = _money(stake * (place_back_odds - Decimal("1")))
    standard_place_exchange_win = win_lay_return
    standard_place_exchange_place = _money(-place_liability)
    extra_place_bookie_win = _money(-stake)
    extra_place_bookie_place = _money(stake * (place_back_odds - Decimal("1")))
    extra_place_exchange_win = win_lay_return
    extra_place_exchange_place = place_lay_return
    unplaced_bookie_win = _money(-stake)
    unplaced_bookie_place = _money(-stake)
    unplaced_exchange_win = win_lay_return
    unplaced_exchange_place = place_lay_return
    first_place_bookie = _money(first_place_bookie_win + first_place_bookie_place)
    first_place_exchange = _money(first_place_exchange_win + first_place_exchange_place)
    standard_place_bookie = _money(standard_place_bookie_win + standard_place_bookie_place)
    standard_place_exchange = _money(standard_place_exchange_win + standard_place_exchange_place)
    extra_place_bookie = _money(extra_place_bookie_win + extra_place_bookie_place)
    extra_place_exchange = _money(extra_place_exchange_win + extra_place_exchange_place)
    unplaced_bookie = _money(unplaced_bookie_win + unplaced_bookie_place)
    unplaced_exchange = _money(unplaced_exchange_win + unplaced_exchange_place)
    first_place = _money(first_place_bookie + first_place_exchange)
    standard_place = _money(standard_place_bookie + standard_place_exchange)
    extra_place = _money(extra_place_bookie + extra_place_exchange)
    unplaced = _money(unplaced_bookie + unplaced_exchange)
    qualifying_loss = min(first_place, standard_place, unplaced)
    extra_place_profit = _money((stake * place_back_odds) + qualifying_loss)
    # Rating expresses retained value after the qualifying loss against total bookmaker outlay.
    rating_percent = _money((Decimal("1") + (qualifying_loss / total_outlay)) * Decimal("100"))
    # Implied odds are the extra-place return needed to recover the qualifying loss.
    implied_odds = (
        _money(Decimal("1") + (extra_place_profit / abs(qualifying_loss)))
        if qualifying_loss != 0
        else None
    )
    current = min(
        first_place,
        standard_place,
        extra_place if values.mode == "Extra Place" else standard_place,
        unplaced,
    )
    resolved = {
        "Win": first_place,
        "Standard Place": standard_place,
        "Extra Place": extra_place,
        "Unplaced": unplaced,
        "Void/NR": Decimal("0.00"),
    }
    final = resolved.get(values.result) if values.result != "Pending" else None
    return EachWayCalculationResult(
        "resolved",
        (),
        place_back_odds,
        suggested_win_stake,
        suggested_place_stake,
        win_liability,
        place_liability,
        qualifying_loss,
        extra_place_profit,
        rating_percent,
        implied_odds,
        first_place,
        standard_place,
        extra_place,
        unplaced,
        first_place_bookie,
        first_place_exchange,
        standard_place_bookie,
        standard_place_exchange,
        extra_place_bookie,
        extra_place_exchange,
        unplaced_bookie,
        unplaced_exchange,
        first_place_bookie_win,
        first_place_bookie_place,
        first_place_exchange_win,
        first_place_exchange_place,
        standard_place_bookie_win,
        standard_place_bookie_place,
        standard_place_exchange_win,
        standard_place_exchange_place,
        extra_place_bookie_win,
        extra_place_bookie_place,
        extra_place_exchange_win,
        extra_place_exchange_place,
        unplaced_bookie_win,
        unplaced_bookie_place,
        unplaced_exchange_win,
        unplaced_exchange_place,
        current,
        final,
    )
