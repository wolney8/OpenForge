from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation


@dataclass(frozen=True)
class CashAdjustmentCalculationInput:
    profile_id: str
    record_id: str
    adjustment_date: str
    direction: str
    amount: str
    adjustment_type: str


@dataclass(frozen=True)
class CashAdjustmentCalculationResult:
    profile_id: str
    record_id: str
    signed_amount: Decimal | None
    week_label: str
    calculation_state: str
    calculation_notes: tuple[str, ...]


def parse_decimal(value: str) -> Decimal | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_adjustment_datetime(value: str) -> datetime | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    candidates = [
        cleaned,
        cleaned.replace(" ", "T"),
    ]
    for candidate in candidates:
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            continue
    return None


def format_week_label(value: datetime) -> str:
    week_start = value.date().fromordinal(value.date().toordinal() - value.weekday())
    return f"W/C {week_start.strftime('%d/%m/%Y')}"


def calculate_cash_adjustment_values(
    calculation_input: CashAdjustmentCalculationInput,
) -> CashAdjustmentCalculationResult:
    notes: list[str] = []
    amount = parse_decimal(calculation_input.amount)
    adjustment_datetime = parse_adjustment_datetime(calculation_input.adjustment_date)

    if amount is None:
        notes.append("Amount is missing or invalid.")

    if adjustment_datetime is None:
        notes.append("Adjustment date is missing or invalid.")

    signed_amount: Decimal | None = None
    if amount is not None:
        quantized_amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if calculation_input.direction == "In":
            signed_amount = quantized_amount
        else:
            # Workbook equivalent: IF(Direction="In", Amount, -Amount)
            signed_amount = -quantized_amount
            if calculation_input.direction not in {"Out", "Correction"}:
                notes.append(
                    f"Direction '{calculation_input.direction}' is not a standard workbook value."
                )

    week_label = format_week_label(adjustment_datetime) if adjustment_datetime else ""
    calculation_state = (
        "resolved"
        if amount is not None and adjustment_datetime is not None
        else "incomplete"
    )

    return CashAdjustmentCalculationResult(
        profile_id=calculation_input.profile_id,
        record_id=calculation_input.record_id,
        signed_amount=signed_amount,
        week_label=week_label,
        calculation_state=calculation_state,
        calculation_notes=tuple(notes),
    )


def calculate_cash_adjustments_for_profile(
    profile_id: str,
    rows: list[CashAdjustmentCalculationInput],
) -> list[CashAdjustmentCalculationResult]:
    return [
        calculate_cash_adjustment_values(row)
        for row in rows
        if row.profile_id == profile_id
    ]
