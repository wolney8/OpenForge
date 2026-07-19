from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.monthly_settled_fee_base import (
    SettledFeeBaseEntry,
    calculate_monthly_settled_fee_base,
)


def entry(
    module: str,
    record_id: str,
    *,
    status: str = "Settled",
    settled_on: str = "2025-01-15",
    final_value: str | None = "0.00",
) -> SettledFeeBaseEntry:
    return SettledFeeBaseEntry(
        module=module,
        record_id=record_id,
        status=status,
        settlement_date=settled_on,
        final_value=final_value,
    )


def test_monthly_fee_base_sums_only_in_period_settled_final_rows() -> None:
    result = calculate_monthly_settled_fee_base(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 1, 31),
        entries=(
            entry("sportsbook", "SB-001", final_value="-1.25"),
            entry("free_bet", "FB-001", final_value="8.40"),
            entry("casino", "CAS-001", final_value="12.345"),
            entry("sportsbook", "SB-OPEN", status="Placed", final_value="50.00"),
            entry("free_bet", "FB-OLD", settled_on="2024-12-31", final_value="5.00"),
        ),
    )

    assert result.calculation_state == "resolved"
    assert result.sportsbook_total == Decimal("-1.25")
    assert result.free_bet_total == Decimal("8.40")
    assert result.casino_total == Decimal("12.35")
    assert result.eligible_period_profit == Decimal("19.50")
    assert result.included_record_ids == ("SB-001", "FB-001", "CAS-001")


def test_monthly_fee_base_blocks_unresolved_or_undated_settled_rows() -> None:
    result = calculate_monthly_settled_fee_base(
        period_start=date(2025, 1, 1),
        period_end=date(2025, 1, 31),
        entries=(
            entry("sportsbook", "SB-NO-DATE", settled_on="", final_value="1.00"),
            entry("casino", "CAS-NO-FINAL", final_value=None),
        ),
    )

    assert result.calculation_state == "blocked"
    assert result.eligible_period_profit is None
    assert [(row.record_id, row.reason) for row in result.blockers] == [
        ("SB-NO-DATE", "settled_row_missing_date"),
        ("CAS-NO-FINAL", "settled_final_value_unresolved"),
    ]


def test_monthly_fee_base_contract_fixtures() -> None:
    fixture_path = (
        Path(__file__).resolve().parents[3]
        / "tests"
        / "fixtures"
        / "fund-manager-monthly-settled-fee-base-fixtures.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    for case in fixture["cases"]:
        result = calculate_monthly_settled_fee_base(
            period_start=date.fromisoformat(case["period_start"]),
            period_end=date.fromisoformat(case["period_end"]),
            entries=tuple(
                SettledFeeBaseEntry(
                    module=row["module"],
                    record_id=row["record_id"],
                    status=row["status"],
                    settlement_date=row["settlement_date"],
                    final_value=row["final_value"],
                )
                for row in case["rows"]
            ),
        )
        expected = case["expected"]
        assert result.calculation_state == expected["calculation_state"], case["case_id"]
        if result.calculation_state == "resolved":
            assert f"{result.sportsbook_total:.2f}" == expected["sportsbook_total"]
            assert f"{result.free_bet_total:.2f}" == expected["free_bet_total"]
            assert f"{result.casino_total:.2f}" == expected["casino_total"]
            assert f"{result.eligible_period_profit:.2f}" == expected[
                "eligible_period_profit"
            ]
        else:
            assert result.blockers[0].reason == expected["blocker"]
