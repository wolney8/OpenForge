from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

OPEN_STATUSES = {"Prospecting", "Started", "In Progress"}
PLACEHOLDER_STATUSES = {"Prospecting"}


@dataclass(frozen=True)
class CasinoOfferCalculationInput:
    profile_id: str
    record_id: str
    date_started: str
    date_settling: str
    expiry_datetime: str
    status: str
    calc_net_pnl: str
    final_net_pnl: str


@dataclass(frozen=True)
class CasinoOfferCalculationResult:
    profile_id: str
    record_id: str
    resolved_net_pnl: Decimal | None
    calculation_state: str
    calculation_notes: tuple[str, ...]
    counts_as_open: bool
    is_overdue: bool
    week_label: str


def parse_decimal(value: str) -> Decimal | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_datetime(value: str) -> datetime | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    candidates = [cleaned, cleaned.replace(" ", "T")]
    for candidate in candidates:
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            continue
    return None


def format_week_label(value: datetime) -> str:
    week_start = value.date().fromordinal(value.date().toordinal() - value.weekday())
    return f"W/C {week_start.strftime('%d/%m/%Y')}"


def calculate_casino_offer_values(
    calculation_input: CasinoOfferCalculationInput,
    *,
    as_of_datetime: datetime,
) -> CasinoOfferCalculationResult:
    notes: list[str] = []
    calc_value = parse_decimal(calculation_input.calc_net_pnl)
    final_value = parse_decimal(calculation_input.final_net_pnl)
    resolving_value = final_value if final_value is not None else calc_value

    if resolving_value is None:
        notes.append("Casino NetPnL is unresolved because both calc and final values are blank.")

    resolved_net_pnl = (
        resolving_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if resolving_value is not None
        else None
    )

    settling_datetime = parse_datetime(calculation_input.date_settling)
    started_datetime = parse_datetime(calculation_input.date_started)
    effective_datetime = settling_datetime or started_datetime
    expiry_datetime = parse_datetime(calculation_input.expiry_datetime)
    counts_as_open = calculation_input.status in OPEN_STATUSES
    is_overdue = counts_as_open and expiry_datetime is not None and expiry_datetime < as_of_datetime
    week_label = format_week_label(effective_datetime) if effective_datetime else ""

    if (
        calculation_input.status in PLACEHOLDER_STATUSES
        and calculation_input.final_net_pnl.strip() == ""
        and calculation_input.calc_net_pnl.strip() == ""
    ):
        notes.append(
            "Prospecting casino row has no bankroll value yet; current and final "
            "values stay at 0.00 until the campaign is active."
        )
        return CasinoOfferCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            resolved_net_pnl=Decimal("0.00"),
            calculation_state="resolved",
            calculation_notes=tuple(notes),
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
            week_label=week_label,
        )

    if effective_datetime is None:
        notes.append("Casino offer week label is unresolved because no usable date is present.")

    return CasinoOfferCalculationResult(
        profile_id=calculation_input.profile_id,
        record_id=calculation_input.record_id,
        resolved_net_pnl=resolved_net_pnl,
        calculation_state="resolved" if resolved_net_pnl is not None else "incomplete",
        calculation_notes=tuple(notes),
        counts_as_open=counts_as_open,
        is_overdue=is_overdue,
        week_label=week_label,
    )


def calculate_casino_offers_for_profile(
    profile_id: str,
    rows: list[CasinoOfferCalculationInput],
    *,
    as_of_datetime: datetime,
) -> list[CasinoOfferCalculationResult]:
    return [
        calculate_casino_offer_values(row, as_of_datetime=as_of_datetime)
        for row in rows
        if row.profile_id == profile_id
    ]
