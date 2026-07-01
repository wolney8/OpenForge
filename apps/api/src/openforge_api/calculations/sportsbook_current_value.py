from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

MoneyOrNone = Decimal | None
CalculationState = Literal["resolved", "incomplete", "review_required"]

OPEN_STATUSES = {"Prospecting", "Not Placed", "Placed"}
BACK_WIN_RESULTS = {"Back Won", "Win", "Outcome 1 Won"}
LAY_WIN_RESULTS = {"Lay Won", "Lose", "No Selection Won"}
SUPPORTED_STRATEGIES = {"Standard", "Underlay", "Overlay"}
REVIEW_REQUIRED_STRATEGIES = {"No Lay", "Custom", "Partial Lay", "Multilay", "Multilay-Underlay"}


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def quantize_ratio(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def parse_decimal(value: str | int | float | Decimal | None) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    text = str(value).strip()
    if not text:
        return None
    return Decimal(text)


def parse_iso_date(value: str | None) -> date | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    return date.fromisoformat(text[:10])


@dataclass(frozen=True)
class SportsbookCalculationInput:
    profile_id: str
    record_id: str
    status: str
    result: str
    offer_type: str
    back_stake: str
    back_odds: str
    match_strategy: str
    lay_odds_1: str = ""
    lay_commission_1: str = ""
    lay_actual: str = ""
    lay_matched_stake_1: str = ""
    date_settled: str = ""
    manual_override_value: str = ""
    manual_override_reason: str = ""


@dataclass(frozen=True)
class SportsbookCalculationResult:
    profile_id: str
    record_id: str
    calculation_state: CalculationState
    calculation_notes: tuple[str, ...]
    match_rating: Decimal | None
    reference_lay_stake_standard: MoneyOrNone
    reference_lay_stake_underlay: MoneyOrNone
    reference_lay_stake_overlay: MoneyOrNone
    actual_lay_stake_1: MoneyOrNone
    calculated_liability_1: MoneyOrNone
    scenario_pnl_if_back_wins: MoneyOrNone
    scenario_pnl_if_lay_wins: MoneyOrNone
    projected_current_pnl: MoneyOrNone
    actual_net_pnl: MoneyOrNone
    final_net_pnl: MoneyOrNone
    reporting_value: MoneyOrNone
    lay_status: str
    counts_as_open: bool
    is_overdue: bool


def _resolve_reference_lay_stakes(
    back_stake: Decimal, back_odds: Decimal, lay_odds_1: Decimal, commission_1: Decimal
) -> tuple[Decimal, Decimal, Decimal]:
    standard = quantize_money((back_stake * back_odds) / (lay_odds_1 - commission_1))
    underlay = quantize_money(
        (back_stake * (back_odds - Decimal("1"))) / (lay_odds_1 - Decimal("1"))
    )
    overlay = quantize_money(back_stake / (Decimal("1") - commission_1))
    return standard, underlay, overlay


def _lay_status(actual_lay_stake: Decimal | None, lay_matched_stake: Decimal | None) -> str:
    if actual_lay_stake is None or actual_lay_stake <= 0:
        return "Not Laid"
    if lay_matched_stake is not None and lay_matched_stake < actual_lay_stake:
        return "Part Laid"
    return "Fully Laid"


def calculate_sportsbook_current_value(
    calculation_input: SportsbookCalculationInput,
    *,
    as_of_date: date,
) -> SportsbookCalculationResult:
    notes: list[str] = []
    counts_as_open = calculation_input.status in OPEN_STATUSES
    settled_date = parse_iso_date(calculation_input.date_settled)
    is_overdue = bool(counts_as_open and settled_date is not None and settled_date < as_of_date)

    if (
        calculation_input.offer_type in {"None", "Mug Bet"}
        and calculation_input.match_strategy == "No Lay"
    ):
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="review_required",
            calculation_notes=(
                "No-lay mug-bet workbook parity is still unresolved "
                "and is not implemented in this slice.",
            ),
            match_rating=None,
            reference_lay_stake_standard=None,
            reference_lay_stake_underlay=None,
            reference_lay_stake_overlay=None,
            actual_lay_stake_1=None,
            calculated_liability_1=None,
            scenario_pnl_if_back_wins=None,
            scenario_pnl_if_lay_wins=None,
            projected_current_pnl=None,
            actual_net_pnl=None,
            final_net_pnl=None,
            reporting_value=None,
            lay_status="Not Laid",
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
        )

    if calculation_input.match_strategy in REVIEW_REQUIRED_STRATEGIES:
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="review_required",
            calculation_notes=(
                f"Strategy '{calculation_input.match_strategy}' is deferred "
                "until workbook parity is locked.",
            ),
            match_rating=None,
            reference_lay_stake_standard=None,
            reference_lay_stake_underlay=None,
            reference_lay_stake_overlay=None,
            actual_lay_stake_1=None,
            calculated_liability_1=None,
            scenario_pnl_if_back_wins=None,
            scenario_pnl_if_lay_wins=None,
            projected_current_pnl=None,
            actual_net_pnl=None,
            final_net_pnl=None,
            reporting_value=None,
            lay_status="Not Laid",
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
        )

    if calculation_input.match_strategy not in SUPPORTED_STRATEGIES:
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                f"Strategy '{calculation_input.match_strategy}' is not recognized.",
            ),
            match_rating=None,
            reference_lay_stake_standard=None,
            reference_lay_stake_underlay=None,
            reference_lay_stake_overlay=None,
            actual_lay_stake_1=None,
            calculated_liability_1=None,
            scenario_pnl_if_back_wins=None,
            scenario_pnl_if_lay_wins=None,
            projected_current_pnl=None,
            actual_net_pnl=None,
            final_net_pnl=None,
            reporting_value=None,
            lay_status="Not Laid",
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
        )

    back_stake = parse_decimal(calculation_input.back_stake)
    back_odds = parse_decimal(calculation_input.back_odds)
    lay_odds_1 = parse_decimal(calculation_input.lay_odds_1)
    commission_1 = parse_decimal(calculation_input.lay_commission_1)

    if back_stake is None or back_odds is None or lay_odds_1 is None or commission_1 is None:
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                "Required numeric inputs are missing, including exchange commission "
                "when contract-backed money values depend on it.",
            ),
            match_rating=None,
            reference_lay_stake_standard=None,
            reference_lay_stake_underlay=None,
            reference_lay_stake_overlay=None,
            actual_lay_stake_1=None,
            calculated_liability_1=None,
            scenario_pnl_if_back_wins=None,
            scenario_pnl_if_lay_wins=None,
            projected_current_pnl=None,
            actual_net_pnl=None,
            final_net_pnl=None,
            reporting_value=None,
            lay_status="Not Laid",
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
        )

    ref_standard, ref_underlay, ref_overlay = _resolve_reference_lay_stakes(
        back_stake, back_odds, lay_odds_1, commission_1
    )
    reference_by_strategy = {
        "Standard": ref_standard,
        "Underlay": ref_underlay,
        "Overlay": ref_overlay,
    }

    actual_lay_stake = parse_decimal(calculation_input.lay_actual) or reference_by_strategy[
        calculation_input.match_strategy
    ]
    actual_lay_stake = quantize_money(actual_lay_stake)
    lay_matched_stake = parse_decimal(calculation_input.lay_matched_stake_1)
    liability_1 = quantize_money(actual_lay_stake * (lay_odds_1 - Decimal("1")))
    match_rating = quantize_ratio(back_odds / lay_odds_1)

    scenario_back_wins = quantize_money((back_stake * (back_odds - Decimal("1"))) - liability_1)
    lay_returns_after_commission = actual_lay_stake * (Decimal("1") - commission_1)
    scenario_lay_wins = quantize_money((-back_stake) + lay_returns_after_commission)

    projected_current = min(scenario_back_wins, scenario_lay_wins) if counts_as_open else None

    actual_net_pnl: MoneyOrNone = None
    if calculation_input.result in BACK_WIN_RESULTS:
        actual_net_pnl = scenario_back_wins
    elif calculation_input.result in LAY_WIN_RESULTS:
        actual_net_pnl = scenario_lay_wins
    elif calculation_input.result == "Void":
        actual_net_pnl = Decimal("0.00")
    elif calculation_input.result == "Pending" and counts_as_open:
        actual_net_pnl = projected_current
        notes.append("Pending row uses projected current value until settlement.")
    elif calculation_input.result in {
        "Lay Won + Cashback",
        "Outcome 2 Won",
        "Outcome 3 Won",
        "Mixed",
    }:
        notes.append(f"Result '{calculation_input.result}' is deferred in this first slice.")

    final_net_pnl = actual_net_pnl
    manual_override_value = parse_decimal(calculation_input.manual_override_value)
    if manual_override_value is not None:
        final_net_pnl = quantize_money(manual_override_value)
        notes.append("Manual override replaced the formula-resolved value.")

    return SportsbookCalculationResult(
        profile_id=calculation_input.profile_id,
        record_id=calculation_input.record_id,
        calculation_state="resolved" if final_net_pnl is not None else "incomplete",
        calculation_notes=tuple(notes),
        match_rating=match_rating,
        reference_lay_stake_standard=ref_standard,
        reference_lay_stake_underlay=ref_underlay,
        reference_lay_stake_overlay=ref_overlay,
        actual_lay_stake_1=actual_lay_stake,
        calculated_liability_1=liability_1,
        scenario_pnl_if_back_wins=scenario_back_wins,
        scenario_pnl_if_lay_wins=scenario_lay_wins,
        projected_current_pnl=projected_current,
        actual_net_pnl=actual_net_pnl,
        final_net_pnl=final_net_pnl,
        reporting_value=final_net_pnl,
        lay_status=_lay_status(actual_lay_stake, lay_matched_stake),
        counts_as_open=counts_as_open,
        is_overdue=is_overdue,
    )


def calculate_sportsbook_rows_for_profile(
    rows: list[SportsbookCalculationInput],
    *,
    profile_id: str,
    as_of_date: date,
) -> list[SportsbookCalculationResult]:
    return [
        calculate_sportsbook_current_value(row, as_of_date=as_of_date)
        for row in rows
        if row.profile_id == profile_id
    ]
