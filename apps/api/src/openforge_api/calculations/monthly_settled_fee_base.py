from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

MONEY_QUANTUM = Decimal("0.01")


@dataclass(frozen=True)
class SettledFeeBaseEntry:
    module: str
    record_id: str
    status: str
    settlement_date: str
    final_value: str | None


@dataclass(frozen=True)
class FeeBaseBlocker:
    module: str
    record_id: str
    reason: str


@dataclass(frozen=True)
class MonthlySettledFeeBaseResult:
    calculation_state: str
    period_start: date
    period_end: date
    sportsbook_total: Decimal
    sportsbook_count: int
    free_bet_total: Decimal
    free_bet_count: int
    casino_total: Decimal
    casino_count: int
    eligible_period_profit: Decimal | None
    blockers: tuple[FeeBaseBlocker, ...]
    included_entries: tuple[SettledFeeBaseEntry, ...]
    included_record_ids: tuple[str, ...]


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def parse_date(value: str) -> date | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(cleaned[:10])
        except ValueError:
            return None


def parse_money(value: str | None) -> Decimal | None:
    if value is None or not value.strip():
        return None
    try:
        return quantize_money(Decimal(value))
    except InvalidOperation:
        return None


def calculate_monthly_settled_fee_base(
    *,
    period_start: date,
    period_end: date,
    entries: tuple[SettledFeeBaseEntry, ...],
) -> MonthlySettledFeeBaseResult:
    totals = {
        "sportsbook": Decimal("0.00"),
        "free_bet": Decimal("0.00"),
        "casino": Decimal("0.00"),
    }
    counts = {"sportsbook": 0, "free_bet": 0, "casino": 0}
    blockers: list[FeeBaseBlocker] = []
    included_entries: list[SettledFeeBaseEntry] = []
    included_record_ids: list[str] = []

    for entry in entries:
        if entry.status != "Settled":
            continue
        settled_on = parse_date(entry.settlement_date)
        if settled_on is None:
            blockers.append(
                FeeBaseBlocker(entry.module, entry.record_id, "settled_row_missing_date")
            )
            continue
        if settled_on < period_start or settled_on > period_end:
            continue
        final_value = parse_money(entry.final_value)
        if final_value is None:
            blockers.append(
                FeeBaseBlocker(entry.module, entry.record_id, "settled_final_value_unresolved")
            )
            continue
        if entry.module not in totals:
            blockers.append(
                FeeBaseBlocker(entry.module, entry.record_id, "unsupported_fee_base_module")
            )
            continue
        totals[entry.module] += final_value
        counts[entry.module] += 1
        included_entries.append(entry)
        included_record_ids.append(entry.record_id)

    eligible_profit = None
    if not blockers:
        eligible_profit = quantize_money(sum(totals.values(), Decimal("0.00")))

    return MonthlySettledFeeBaseResult(
        calculation_state="blocked" if blockers else "resolved",
        period_start=period_start,
        period_end=period_end,
        sportsbook_total=quantize_money(totals["sportsbook"]),
        sportsbook_count=counts["sportsbook"],
        free_bet_total=quantize_money(totals["free_bet"]),
        free_bet_count=counts["free_bet"],
        casino_total=quantize_money(totals["casino"]),
        casino_count=counts["casino"],
        eligible_period_profit=eligible_profit,
        blockers=tuple(blockers),
        included_entries=tuple(included_entries),
        included_record_ids=tuple(included_record_ids),
    )
