from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    calculate_free_bet_current_value,
    calculate_free_bet_rows_for_profile,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "free-bet-current-value-fixtures.json"
)


def load_fixture() -> dict[str, object]:
    return json.loads(FIXTURE_PATH.read_text())


def as_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(value)


def test_free_bet_fixtures_match_expected_contract_outputs() -> None:
    fixture = load_fixture()

    for case in fixture["cases"]:
        result = calculate_free_bet_current_value(
            FreeBetCalculationInput(**case["inputs"]),
            as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
        )
        expected = case["expected"]

        if case["case_id"] in {"FB-001", "FB-002"}:
            assert result.base_reference_lay_stake == as_decimal(
                expected["base_reference_lay_stake"]
            )
            assert result.projected_current_pnl == as_decimal(expected["projected_current_pnl"])
            assert result.final_net_pnl is None
            assert result.reporting_value == result.projected_current_pnl
        elif case["case_id"] == "FB-003":
            assert result.final_net_pnl == result.scenario_pnl_if_back_wins
        elif case["case_id"] == "FB-004":
            assert result.final_net_pnl == result.scenario_pnl_if_lay_wins
        elif case["case_id"] == "FB-005":
            assert result.counts_as_open is expected["counts_as_open"]
            assert result.is_overdue is expected["is_overdue"]
            assert result.projected_current_pnl == as_decimal(expected["projected_current_pnl"])
        elif case["case_id"] == "FB-006":
            assert result.final_net_pnl == as_decimal(expected["final_net_pnl"])
        elif case["case_id"] == "FB-007":
            assert result.calculation_state == expected["calculation_state"]
        elif case["case_id"] in {"FB-008", "FB-009"}:
            assert result.calculation_state == expected["calculation_state"]
            assert result.projected_current_pnl == as_decimal(expected["projected_current_pnl"])
            assert result.reporting_value == as_decimal(expected["reporting_value"])
            assert result.counts_as_open is expected["counts_as_open"]


def test_free_bet_profile_scoped_batch_calculation_filters_rows() -> None:
    fixture = load_fixture()
    batch_case = fixture["profile_isolation_case"]
    rows = [FreeBetCalculationInput(**row) for row in batch_case["rows"]]

    profile_one_results = calculate_free_bet_rows_for_profile(
        rows,
        profile_id="PROFILE-001",
        as_of_datetime=datetime.fromisoformat(batch_case["as_of_datetime"]),
    )
    profile_two_results = calculate_free_bet_rows_for_profile(
        rows,
        profile_id="PROFILE-002",
        as_of_datetime=datetime.fromisoformat(batch_case["as_of_datetime"]),
    )

    assert [result.record_id for result in profile_one_results] == ["FB-007-A"]
    assert [result.record_id for result in profile_two_results] == ["FB-007-B"]


def test_underlay_and_overlay_free_bet_reference_values_are_distinct() -> None:
    underlay_result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-UNDERLAY",
            status="Placed",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Underlay",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )
    overlay_result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-OVERLAY",
            status="Placed",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Overlay",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )

    assert underlay_result.actual_lay_stake_1 == Decimal("7.16")
    assert overlay_result.actual_lay_stake_1 == Decimal("10.04")


def test_free_bet_reference_values_can_use_profile_scoped_tracker_factors() -> None:
    result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-TRACKER-FACTORS",
            status="Placed",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Underlay",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
            default_underlay_factor="0.900",
            default_overlay_factor="1.400",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )

    assert result.base_reference_lay_stake == Decimal("7.72")
    assert result.underlay_reference_lay_stake == Decimal("6.95")
    assert result.overlay_reference_lay_stake == Decimal("10.81")
    assert result.actual_lay_stake_1 == Decimal("6.95")


def test_custom_and_partial_free_bet_lay_require_or_use_explicit_lay_actual() -> None:
    incomplete = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-CUSTOM-MISSING",
            status="Placed",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Custom",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )
    assert incomplete.calculation_state == "incomplete"

    resolved = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-PARTIAL",
            status="Placed",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Partial Lay",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
            lay_actual="6.00",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )
    assert resolved.calculation_state == "resolved"
    assert resolved.actual_lay_stake_1 == Decimal("6.00")
    assert resolved.calculated_liability_1 == Decimal("25.20")
    assert resolved.lay_status == "Part Laid"


def test_open_free_bet_keeps_current_and_final_values_separate() -> None:
    result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-OPEN-SEPARATION",
            status="Placed",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Standard",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )

    assert result.projected_current_pnl == Decimal("7.57")
    assert result.actual_net_pnl is None
    assert result.final_net_pnl is None
    assert result.reporting_value == Decimal("7.57")


def test_manual_override_without_reason_stays_review_required_for_free_bets() -> None:
    result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-OVERRIDE-NO-REASON",
            status="Settled",
            result="Back Won",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Standard",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
            manual_override_value="6.50",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )

    assert result.calculation_state == "review_required"
    assert result.final_net_pnl == Decimal("6.50")
    assert result.reporting_value == Decimal("6.50")
    assert "Manual override requires a reason for auditability." in result.calculation_notes


def test_manual_override_with_reason_resolves_for_free_bets() -> None:
    result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-OVERRIDE-WITH-REASON",
            status="Settled",
            result="Back Won",
            retention_mode="SNR",
            free_bet_value="10.00",
            back_odds="5.00",
            match_strategy="Standard",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
            manual_override_value="6.50",
            manual_override_reason="Workbook correction after manual reconciliation",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )

    assert result.calculation_state == "resolved"
    assert result.final_net_pnl == Decimal("6.50")


def test_available_free_bet_without_matching_plan_resolves_as_zero_value_placeholder() -> None:
    result = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id="PROFILE-001",
            record_id="FB-AVAILABLE-PLACEHOLDER",
            status="Available",
            result="Pending",
            retention_mode="SNR",
            free_bet_value="",
            back_odds="",
            match_strategy="Standard",
            lay_odds_1="",
            lay_commission_1="",
        ),
        as_of_datetime=datetime(2026, 7, 1, 12, 0, 0),
    )

    assert result.calculation_state == "resolved"
    assert result.projected_current_pnl == Decimal("0.00")
    assert result.reporting_value == Decimal("0.00")
    assert result.lay_status == "Not Laid"
    assert (
        "Available free-bet row has no matching plan yet; current value remains "
        "0.00 until conversion inputs are entered."
        in result.calculation_notes
    )
