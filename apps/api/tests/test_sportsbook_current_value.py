from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
    calculate_sportsbook_rows_for_profile,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "sportsbook-current-value-fixtures.json"
)


def load_fixture() -> dict[str, object]:
    return json.loads(FIXTURE_PATH.read_text())


def as_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(value)


def test_supported_fixture_cases_match_expected_contract_outputs() -> None:
    fixture = load_fixture()
    cases = fixture["cases"]

    for case in cases:
        calculation_input = SportsbookCalculationInput(**case["inputs"])
        result = calculate_sportsbook_current_value(
            calculation_input,
            as_of_date=date(2026, 7, 1),
        )
        expected = case["expected"]

        if case["case_id"] == "SB-001":
            assert result.reference_lay_stake_standard == as_decimal(
                expected["reference_lay_stake_standard"]
            )
            assert result.calculated_liability_1 == as_decimal(expected["calculated_liability_1"])
            assert result.scenario_pnl_if_back_wins == as_decimal(
                expected["scenario_pnl_if_back_wins"]
            )
            assert result.scenario_pnl_if_lay_wins == as_decimal(
                expected["scenario_pnl_if_lay_wins"]
            )
            assert result.projected_current_pnl == as_decimal(expected["projected_current_pnl"])
            assert result.counts_as_open is expected["counts_as_open"]
            assert result.is_overdue is expected["is_overdue"]
        elif case["case_id"] in {"SB-002", "SB-003", "SB-004"}:
            if expected.get("uses_back_win_branch"):
                assert result.final_net_pnl == result.scenario_pnl_if_back_wins
            elif expected.get("uses_lay_win_branch"):
                assert result.final_net_pnl == result.scenario_pnl_if_lay_wins
            elif "final_net_pnl" in expected:
                assert result.final_net_pnl == as_decimal(expected["final_net_pnl"])
            assert result.counts_as_open is expected.get(
                "counts_as_open",
                result.counts_as_open,
            )
        elif case["case_id"] == "SB-005":
            assert result.final_net_pnl == as_decimal(expected["final_net_pnl"])
            assert expected["override_note"] in result.calculation_notes
        elif case["case_id"] in {"SB-006", "SB-007"}:
            assert result.calculation_state == expected["calculation_state"]


def test_profile_scoped_batch_calculation_filters_rows() -> None:
    fixture = load_fixture()
    batch_case = fixture["profile_isolation_case"]
    rows = [SportsbookCalculationInput(**row) for row in batch_case["rows"]]

    profile_one_results = calculate_sportsbook_rows_for_profile(
        rows,
        profile_id="PROFILE-001",
        as_of_date=date.fromisoformat(batch_case["as_of_date"]),
    )
    profile_two_results = calculate_sportsbook_rows_for_profile(
        rows,
        profile_id="PROFILE-002",
        as_of_date=date.fromisoformat(batch_case["as_of_date"]),
    )

    assert [result.record_id for result in profile_one_results] == ["SB-008-A"]
    assert [result.record_id for result in profile_two_results] == ["SB-008-B"]


def test_underlay_and_overlay_reference_values_are_distinct() -> None:
    underlay_result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-UNDERLAY",
            status="Placed",
            result="Pending",
            offer_type="Sign up / Welcome",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Underlay",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )
    overlay_result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-OVERLAY",
            status="Placed",
            result="Pending",
            offer_type="Sign up / Welcome",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Overlay",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert underlay_result.actual_lay_stake_1 == Decimal("9.09")
    assert overlay_result.actual_lay_stake_1 == Decimal("10.20")
    assert underlay_result.actual_lay_stake_1 != overlay_result.actual_lay_stake_1
