from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

MoneyOrNone = Decimal | None
CalculationState = Literal["resolved", "incomplete", "review_required"]

OPEN_STATUSES = {"Prospecting", "Available", "Placed", "Not Yet Awarded"}
CURRENT_VALUE_STATUSES = {"Placed"}
BACK_WIN_RESULTS = {"Back Won", "Win"}
LAY_WIN_RESULTS = {"Lay Won", "Lose"}
SUPPORTED_RETENTION_MODES = {"SNR", "SR"}
SUPPORTED_STRATEGIES = {"Standard", "Underlay", "Overlay", "No Lay", "Custom", "Partial Lay"}
PLACEHOLDER_STATUSES = {"Prospecting", "Not Yet Awarded"}
DEFAULT_UNDERLAY_FACTOR = Decimal("0.928")
DEFAULT_OVERLAY_FACTOR = Decimal("1.300")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_decimal(value: str | int | float | Decimal | None) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    text = str(value).strip()
    if not text:
        return None
    return Decimal(text)


def parse_iso_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00").replace(" ", "T")
    return datetime.fromisoformat(normalized)


@dataclass(frozen=True)
class FreeBetCalculationInput:
    profile_id: str
    record_id: str
    status: str
    result: str
    retention_mode: str
    free_bet_value: str
    back_odds: str
    match_strategy: str
    lay_odds_1: str = ""
    lay_commission_1: str = ""
    lay_actual: str = ""
    lay_matched_stake_1: str = ""
    default_underlay_factor: str = ""
    default_overlay_factor: str = ""
    expiry_datetime: str = ""
    date_settled: str = ""
    manual_override_value: str = ""
    manual_override_reason: str = ""


@dataclass(frozen=True)
class FreeBetCalculationResult:
    profile_id: str
    record_id: str
    calculation_state: CalculationState
    calculation_notes: tuple[str, ...]
    base_reference_lay_stake: MoneyOrNone
    underlay_reference_lay_stake: MoneyOrNone
    overlay_reference_lay_stake: MoneyOrNone
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


def _lay_status(
    strategy: str, actual_lay_stake: Decimal | None, lay_matched_stake: Decimal | None
) -> str:
    if strategy == "No Lay":
        return "Not Laid"
    if actual_lay_stake is None or actual_lay_stake <= 0:
        return "Not Laid"
    if strategy == "Partial Lay" and lay_matched_stake is None:
        return "Part Laid"
    if lay_matched_stake is not None and lay_matched_stake < actual_lay_stake:
        return "Part Laid"
    return "Fully Laid"


def _build_zero_value_placeholder_result(
    calculation_input: FreeBetCalculationInput,
    *,
    counts_as_open: bool,
    is_overdue: bool,
    note: str,
) -> FreeBetCalculationResult:
    return FreeBetCalculationResult(
        profile_id=calculation_input.profile_id,
        record_id=calculation_input.record_id,
        calculation_state="resolved",
        calculation_notes=(note,),
        base_reference_lay_stake=None,
        underlay_reference_lay_stake=None,
        overlay_reference_lay_stake=None,
        actual_lay_stake_1=None,
        calculated_liability_1=Decimal("0.00"),
        scenario_pnl_if_back_wins=None,
        scenario_pnl_if_lay_wins=None,
        projected_current_pnl=Decimal("0.00"),
        actual_net_pnl=None,
        final_net_pnl=None,
        reporting_value=Decimal("0.00"),
        lay_status="Not Laid",
        counts_as_open=counts_as_open,
        is_overdue=is_overdue,
    )


def calculate_free_bet_current_value(
    calculation_input: FreeBetCalculationInput,
    *,
    as_of_datetime: datetime,
) -> FreeBetCalculationResult:
    notes: list[str] = []
    counts_as_open = calculation_input.status in OPEN_STATUSES
    uses_current_value = (
        calculation_input.status in CURRENT_VALUE_STATUSES
        or calculation_input.result == "Pending"
    )
    expiry_datetime = parse_iso_datetime(calculation_input.expiry_datetime)
    is_overdue = bool(
        counts_as_open and expiry_datetime is not None and expiry_datetime < as_of_datetime
    )

    if calculation_input.retention_mode not in SUPPORTED_RETENTION_MODES:
        return FreeBetCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=("Retention mode is missing or not recognized.",),
            base_reference_lay_stake=None,
            underlay_reference_lay_stake=None,
            overlay_reference_lay_stake=None,
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
        return FreeBetCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                f"Strategy '{calculation_input.match_strategy}' is missing or not recognized.",
            ),
            base_reference_lay_stake=None,
            underlay_reference_lay_stake=None,
            overlay_reference_lay_stake=None,
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

    free_bet_value = parse_decimal(calculation_input.free_bet_value)
    back_odds = parse_decimal(calculation_input.back_odds)
    lay_odds_1 = parse_decimal(calculation_input.lay_odds_1)
    commission_1 = parse_decimal(calculation_input.lay_commission_1)
    underlay_factor = (
        parse_decimal(calculation_input.default_underlay_factor) or DEFAULT_UNDERLAY_FACTOR
    )
    overlay_factor = (
        parse_decimal(calculation_input.default_overlay_factor) or DEFAULT_OVERLAY_FACTOR
    )
    no_lay_mode = calculation_input.match_strategy == "No Lay"

    if calculation_input.result == "Pending":
        if calculation_input.status in PLACEHOLDER_STATUSES:
            return _build_zero_value_placeholder_result(
                calculation_input,
                counts_as_open=counts_as_open,
                is_overdue=is_overdue,
                note=(
                    "Placeholder free-bet row has no bankroll value until the free bet is "
                    "available and a matching plan exists."
                ),
            )

        if calculation_input.status == "Available" and (
            free_bet_value is None
            or back_odds is None
            or (not no_lay_mode and (lay_odds_1 is None or commission_1 is None))
        ):
            return _build_zero_value_placeholder_result(
                calculation_input,
                counts_as_open=counts_as_open,
                is_overdue=is_overdue,
                note=(
                    "Available free-bet row has no matching plan yet; current value remains "
                    "0.00 until conversion inputs are entered."
                ),
            )

    if free_bet_value is None or back_odds is None:
        return FreeBetCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=("Required numeric inputs are missing.",),
            base_reference_lay_stake=None,
            underlay_reference_lay_stake=None,
            overlay_reference_lay_stake=None,
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

    manual_lay_mode = calculation_input.match_strategy in {"Custom", "Partial Lay"}
    if not no_lay_mode and (lay_odds_1 is None or commission_1 is None):
        return FreeBetCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                "Required numeric inputs are missing, including exchange commission "
                "when contract-backed money values depend on it.",
            ),
            base_reference_lay_stake=None,
            underlay_reference_lay_stake=None,
            overlay_reference_lay_stake=None,
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

    base_reference_lay_stake: Decimal | None
    underlay_reference_lay_stake: Decimal | None
    overlay_reference_lay_stake: Decimal | None
    actual_lay_stake: Decimal | None
    liability_1: Decimal | None
    lay_matched_stake = parse_decimal(calculation_input.lay_matched_stake_1)

    if no_lay_mode:
        base_reference_lay_stake = Decimal("0.00")
        underlay_reference_lay_stake = Decimal("0.00")
        overlay_reference_lay_stake = Decimal("0.00")
        actual_lay_stake = Decimal("0.00")
        liability_1 = Decimal("0.00")
    else:
        assert lay_odds_1 is not None
        assert commission_1 is not None
        if calculation_input.retention_mode == "SNR":
            base_reference_lay_stake = quantize_money(
                (free_bet_value * (back_odds - Decimal("1"))) / (lay_odds_1 - commission_1)
            )
        else:
            base_reference_lay_stake = quantize_money(
                (free_bet_value * back_odds) / (lay_odds_1 - commission_1)
            )
        underlay_reference_lay_stake = quantize_money(
            base_reference_lay_stake * underlay_factor
        )
        overlay_reference_lay_stake = quantize_money(
            base_reference_lay_stake * overlay_factor
        )
        actual_lay_stake = parse_decimal(calculation_input.lay_actual)
        if manual_lay_mode and actual_lay_stake is None:
            return FreeBetCalculationResult(
                profile_id=calculation_input.profile_id,
                record_id=calculation_input.record_id,
                calculation_state="incomplete",
                calculation_notes=(
                    f"Strategy '{calculation_input.match_strategy}' "
                    "requires an explicit lay_actual value.",
                ),
                base_reference_lay_stake=base_reference_lay_stake,
                underlay_reference_lay_stake=underlay_reference_lay_stake,
                overlay_reference_lay_stake=overlay_reference_lay_stake,
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
        if actual_lay_stake is None:
            if calculation_input.match_strategy == "Standard":
                actual_lay_stake = base_reference_lay_stake
            elif calculation_input.match_strategy == "Underlay":
                actual_lay_stake = underlay_reference_lay_stake
            elif calculation_input.match_strategy == "Overlay":
                actual_lay_stake = overlay_reference_lay_stake
        actual_lay_stake = quantize_money(actual_lay_stake or Decimal("0"))
        liability_1 = quantize_money(actual_lay_stake * (lay_odds_1 - Decimal("1")))

    if calculation_input.retention_mode == "SNR":
        back_win_base = free_bet_value * (back_odds - Decimal("1"))
    else:
        back_win_base = free_bet_value * back_odds

    scenario_back_wins = quantize_money(back_win_base - (liability_1 or Decimal("0")))

    if no_lay_mode:
        scenario_lay_wins = Decimal("0.00")
    else:
        assert actual_lay_stake is not None
        assert commission_1 is not None
        scenario_lay_wins = quantize_money(actual_lay_stake * (Decimal("1") - commission_1))

    projected_current = (
        min(scenario_back_wins, scenario_lay_wins) if uses_current_value else None
    )

    actual_net_pnl: MoneyOrNone = None
    if calculation_input.result in BACK_WIN_RESULTS:
        actual_net_pnl = scenario_back_wins
    elif calculation_input.result in LAY_WIN_RESULTS:
        actual_net_pnl = scenario_lay_wins
    elif calculation_input.result == "Void":
        actual_net_pnl = Decimal("0.00")
    elif calculation_input.result == "Pending" and uses_current_value:
        notes.append("Pending row uses projected current value until settlement.")

    final_net_pnl = actual_net_pnl
    calculation_state: CalculationState = "resolved"
    manual_override_value = parse_decimal(calculation_input.manual_override_value)
    if manual_override_value is not None:
        final_net_pnl = quantize_money(manual_override_value)
        notes.append("Manual override replaced the formula-resolved value.")
        if not calculation_input.manual_override_reason.strip():
            notes.append("Manual override requires a reason for auditability.")
            calculation_state = "review_required"

    resolved_value = final_net_pnl if final_net_pnl is not None else projected_current

    return FreeBetCalculationResult(
        profile_id=calculation_input.profile_id,
        record_id=calculation_input.record_id,
        calculation_state=(
            "incomplete" if resolved_value is None else calculation_state
        ),
        calculation_notes=tuple(notes),
        base_reference_lay_stake=base_reference_lay_stake,
        underlay_reference_lay_stake=underlay_reference_lay_stake,
        overlay_reference_lay_stake=overlay_reference_lay_stake,
        actual_lay_stake_1=actual_lay_stake,
        calculated_liability_1=liability_1,
        scenario_pnl_if_back_wins=scenario_back_wins,
        scenario_pnl_if_lay_wins=scenario_lay_wins,
        projected_current_pnl=projected_current,
        actual_net_pnl=actual_net_pnl,
        final_net_pnl=final_net_pnl,
        reporting_value=resolved_value,
        lay_status=_lay_status(
            calculation_input.match_strategy, actual_lay_stake, lay_matched_stake
        ),
        counts_as_open=counts_as_open,
        is_overdue=is_overdue,
    )


def calculate_free_bet_rows_for_profile(
    rows: list[FreeBetCalculationInput],
    *,
    profile_id: str,
    as_of_datetime: datetime,
) -> list[FreeBetCalculationResult]:
    return [
        calculate_free_bet_current_value(row, as_of_datetime=as_of_datetime)
        for row in rows
        if row.profile_id == profile_id
    ]
