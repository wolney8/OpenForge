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
            assert result.final_net_pnl is None
            assert result.reporting_value == result.projected_current_pnl
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


def test_no_lay_mug_bet_uses_workbook_cash_return_branch() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-NO-LAY",
            status="Placed",
            result="Pending",
            offer_type="Mug Bet",
            back_stake="5.00",
            back_odds="4.33",
            match_strategy="No Lay",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "resolved"
    assert result.scenario_pnl_if_back_wins == Decimal("21.65")
    assert result.scenario_pnl_if_lay_wins == Decimal("-5.00")
    assert result.projected_current_pnl == Decimal("-5.00")
    assert result.lay_status == "Not Laid"


def test_custom_and_partial_lay_require_or_use_explicit_lay_actual() -> None:
    incomplete = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-CUSTOM-MISSING",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Custom",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )
    assert incomplete.calculation_state == "incomplete"

    resolved = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-PARTIAL",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Partial Lay",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
            lay_actual="5.00",
        ),
        as_of_date=date(2026, 7, 1),
    )
    assert resolved.calculation_state == "resolved"
    assert resolved.actual_lay_stake_1 == Decimal("5.00")
    assert resolved.calculated_liability_1 == Decimal("11.00")
    assert resolved.lay_status == "Part Laid"


def test_lay_won_plus_cashback_uses_cashback_branch() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-CASHBACK",
            status="Settled",
            result="Lay Won + Cashback",
            offer_type="Cashback",
            back_stake="10.00",
            back_odds="3.00",
            bonus_trigger="Lay Wins",
            maximum_bonus="10.00",
            match_strategy="Standard",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.final_net_pnl == Decimal("9.24")


def test_refund_branch_uses_bonus_retention_for_triggered_projection() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-REFUND",
            status="Placed",
            result="Pending",
            offer_type="Refund",
            back_stake="5.00",
            back_odds="7.00",
            bonus_trigger="Lay Wins",
            maximum_bonus="5.00",
            bonus_retention_rate="70",
            match_strategy="Standard",
            lay_odds_1="8.40",
            lay_commission_1="0.00",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "resolved"
    assert result.scenario_pnl_if_lay_wins == Decimal("-0.83")
    assert result.scenario_pnl_if_outcome_2_wins == Decimal("2.67")
    assert result.projected_current_pnl == Decimal("-0.86")


def test_back_won_plus_cashback_branch_supports_back_win_triggers() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-BACK-CASHBACK",
            status="Settled",
            result="Back Won + Cashback",
            offer_type="Cashback",
            back_stake="5.00",
            back_odds="3.00",
            bonus_trigger="Back Wins",
            maximum_bonus="5.00",
            match_strategy="Standard",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.final_net_pnl == Decimal("4.62")


def test_ddhh_outcome_branches_follow_workbook_result_switching() -> None:
    outcome_two = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-DDHH-2",
            status="Settled",
            result="Outcome 2 Won",
            offer_type="Double Delight / Hat-trick Heaven",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Standard",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )
    outcome_three = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-DDHH-3",
            status="Settled",
            result="Outcome 3 Won",
            offer_type="Double Delight / Hat-trick Heaven",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Standard",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert outcome_two.calculation_state == "resolved"
    assert outcome_two.scenario_pnl_if_outcome_2_wins == Decimal("19.25")
    assert outcome_two.final_net_pnl == Decimal("19.25")
    assert outcome_three.calculation_state == "resolved"
    assert outcome_three.scenario_pnl_if_outcome_3_wins == Decimal("39.25")
    assert outcome_three.final_net_pnl == Decimal("39.25")


def test_non_ddhh_outcome_two_stays_review_required_until_multilay_fields_exist() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-OUTCOME2-DEFER",
            status="Settled",
            result="Outcome 2 Won",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="3.00",
            match_strategy="Standard",
            lay_odds_1="3.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "review_required"
    assert result.final_net_pnl is None


def test_multilay_rows_still_expose_first_leg_reference_stakes_for_guidance() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-MULTILAY-GUIDE",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="5.00",
            match_strategy="Multilay",
            lay_odds_1="5.20",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "review_required"
    assert result.reference_lay_stake_standard == Decimal("9.65")
    assert result.reference_lay_stake_underlay == Decimal("9.52")
    assert result.reference_lay_stake_overlay == Decimal("10.20")
    assert result.projected_current_pnl is None


def test_multilay_rows_use_branch_placement_completeness_for_lay_status() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-MULTILAY-SAVED",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="5.00",
            match_strategy="Multilay",
            lay_odds_1="5.20",
            multi_lay_outcome_1_name="Score 1-0",
            multi_lay_outcomes_json=(
                '[{"id":"outcome1","label":"Score 1-0","layOdds":"5.20",'
                '"placedExchange":"Matchbook","placedLayOdds":"5.20","placedMatchedStake":"9.65","placementState":"placed"},'
                '{"id":"outcome2","label":"Score 2-0","layOdds":"6.30","placementState":"pending"},'
                '{"id":"outcome3","label":"Score 2-1","layOdds":"8.10","placementState":"pending"}]'
            ),
            lay_actual="9.65",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "resolved"
    assert result.actual_lay_stake_1 == Decimal("9.65")
    assert result.calculated_liability_1 == Decimal("40.53")
    assert result.lay_status == "Part Laid"
    assert result.scenario_pnl_if_back_wins == Decimal("13.34")
    assert result.scenario_pnl_if_lay_wins == Decimal("13.33")
    assert result.scenario_pnl_if_outcome_2_wins == Decimal("13.34")
    assert result.scenario_pnl_if_outcome_3_wins == Decimal("13.31")
    assert result.projected_current_pnl == Decimal("13.31")


def test_multilay_rows_mark_fully_laid_when_all_branches_are_placed() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-MULTILAY-FULLY-LAID",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="5.00",
            match_strategy="Multilay",
            lay_odds_1="5.20",
            multi_lay_outcome_1_name="Score 1-0",
            multi_lay_outcomes_json=(
                '[{"id":"outcome1","label":"Score 1-0","layOdds":"5.20",'
                '"placedExchange":"Matchbook","placedLayOdds":"5.20","placedMatchedStake":"9.65","placementState":"placed"},'
                '{"id":"outcome2","label":"Score 2-0","layOdds":"6.30","placedExchange":"Matchbook","placedLayOdds":"6.30","placedMatchedStake":"7.96","placementState":"placed"}]'
            ),
            lay_actual="9.65",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "resolved"
    assert result.lay_status == "Fully Laid"


def test_multilay_underlay_uses_multi_outcome_current_value_branch() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-MULTILAY-UNDERLAY",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="5.00",
            match_strategy="Multilay-Underlay",
            lay_odds_1="5.20",
            multi_lay_outcome_1_name="Score 1-0",
            multi_lay_outcomes_json='[{"id":"outcome2","label":"Score 2-0","layOdds":"6.30"}]',
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "resolved"
    assert result.actual_lay_stake_1 == Decimal("5.59")
    assert result.scenario_pnl_if_back_wins == Decimal("21.04")
    assert result.scenario_pnl_if_lay_wins == Decimal("0.00")
    assert result.scenario_pnl_if_outcome_2_wins == Decimal("21.05")
    assert result.projected_current_pnl == Decimal("0.00")


def test_open_row_keeps_current_and_final_values_separate() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-OPEN-SEPARATION",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="2.00",
            match_strategy="Standard",
            lay_odds_1="2.10",
            lay_commission_1="0.02",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.projected_current_pnl == Decimal("-0.58")
    assert result.actual_net_pnl is None
    assert result.final_net_pnl is None
    assert result.reporting_value == Decimal("-0.58")


def test_manual_override_without_reason_stays_review_required_for_sportsbook() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-OVERRIDE-NO-REASON",
            status="Settled",
            result="Lay Won",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="2.00",
            match_strategy="Standard",
            lay_odds_1="2.10",
            lay_commission_1="0.02",
            manual_override_value="-0.40",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "review_required"
    assert result.final_net_pnl == Decimal("-0.40")
    assert result.reporting_value == Decimal("-0.40")
    assert "Manual override requires a reason for auditability." in result.calculation_notes


def test_manual_override_with_reason_resolves_for_sportsbook() -> None:
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="PROFILE-001",
            record_id="SB-OVERRIDE-WITH-REASON",
            status="Settled",
            result="Lay Won",
            offer_type="Bet & Get",
            back_stake="10.00",
            back_odds="2.00",
            match_strategy="Standard",
            lay_odds_1="2.10",
            lay_commission_1="0.02",
            manual_override_value="-0.40",
            manual_override_reason="Workbook correction after reconciliation",
        ),
        as_of_date=date(2026, 7, 1),
    )

    assert result.calculation_state == "resolved"
    assert result.final_net_pnl == Decimal("-0.40")
