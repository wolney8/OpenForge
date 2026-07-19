from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.fund_manager_fees import (
    FeePeriodCalculationInput,
    LinkedFeeWithdrawal,
    apply_received_fee_withdrawal,
    calculate_fee_correction,
    calculate_fee_period,
    calculate_provisional_fee_reserve,
    calculate_weekly_indicative_fee_impact,
    can_link_fee_withdrawal,
    confirm_fee_crystallisation,
    decide_fee_period_reopen,
    resolve_package_versions,
    subscriber_fee_visibility,
)


def load_fixture_cases() -> dict[str, dict[str, object]]:
    fixture_path = (
        Path(__file__).resolve().parents[3]
        / "tests"
        / "fixtures"
        / "fund-manager-fee-calculation-and-withdrawal-fixtures.json"
    )
    return {case["case_id"]: case for case in json.loads(fixture_path.read_text())["cases"]}


def assert_expected_decimal_fields(result: object, expected: dict[str, object]) -> None:
    for field, expected_value in expected.items():
        assert hasattr(result, field), f"Calculation result is missing fixture field: {field}"
        actual = getattr(result, field)
        if isinstance(actual, Decimal):
            assert actual == Decimal(str(expected_value))
        else:
            assert actual == expected_value


def calculate_period_case(case: dict[str, object]):
    inputs = case["inputs"]
    assert isinstance(inputs, dict)
    withdrawals = tuple(
        LinkedFeeWithdrawal(**withdrawal)
        for withdrawal in inputs.get("linked_received_withdrawals", [])
    )
    return calculate_fee_period(
        FeePeriodCalculationInput(
            profile_id=str(inputs["profile_id"]),
            eligible_period_profit=inputs.get("eligible_period_profit"),
            opening_loss_carryforward=str(inputs.get("opening_loss_carryforward", "0.00")),
            management_fee_percent=str(inputs["management_fee_percent"]),
            investment_fee_percent=str(inputs["investment_fee_percent"]),
            linked_received_withdrawals=withdrawals,
        )
    )


def test_monthly_fee_period_fixtures() -> None:
    cases = load_fixture_cases()
    case_ids = (
        "FEE-001",
        "FEE-002",
        "FEE-003",
        "FEE-004",
        "FEE-005",
        "FEE-007",
        "FEE-011",
        "FEE-012",
        "FEE-013",
        "FEE-014",
        "FEE-015",
    )
    for case_id in case_ids:
        case = cases[case_id]
        result = calculate_period_case(case)
        assert_expected_decimal_fields(result, case["expected"])


def test_fee_withdrawal_profile_isolation_fixture() -> None:
    case = load_fixture_cases()["FEE-006"]
    inputs = case["inputs"]
    allowed, error_code = can_link_fee_withdrawal(
        str(inputs["profile_id"]), str(inputs["withdrawal_profile_id"])
    )
    assert allowed is case["expected"]["link_allowed"]
    assert error_code == case["expected"]["error_code"]


def test_received_fee_withdrawal_does_not_double_reduce_subscriber_entitlement() -> None:
    case = load_fixture_cases()["FEE-008"]
    inputs = case["inputs"]
    withdrawal = inputs["fee_withdrawal"]
    result = apply_received_fee_withdrawal(
        gross_cash_before_withdrawal=str(inputs["gross_cash_before_withdrawal"]),
        crystallised_fee_outstanding_before_withdrawal=str(
            inputs["crystallised_fee_outstanding_before_withdrawal"]
        ),
        subscriber_net_entitlement_before_withdrawal=str(
            inputs["subscriber_net_entitlement_before_withdrawal"]
        ),
        subtype=str(withdrawal["subtype"]),
        amount=str(withdrawal["amount"]),
        state=str(withdrawal["state"]),
    )
    assert_expected_decimal_fields(result, case["expected"])


def test_subscriber_visibility_excludes_operational_withdrawal_metadata() -> None:
    case = load_fixture_cases()["FEE-009"]
    visibility = subscriber_fee_visibility()
    assert list(visibility["visible_fields"]) == case["expected"]["visible_fields"]
    assert list(visibility["hidden_fields"]) == case["expected"]["hidden_fields"]


def test_locked_package_snapshot_is_not_rewritten() -> None:
    case = load_fixture_cases()["FEE-010"]
    inputs = case["inputs"]
    result = resolve_package_versions(
        locked_period_package_version=inputs["locked_period"]["package_version"],
        current_package_version=inputs["current_package"]["package_version"],
    )
    assert result == case["expected"]


def test_provisional_reserve_and_weekly_breakdown_fixtures() -> None:
    cases = load_fixture_cases()
    for case_id in ("FEE-016", "FEE-017"):
        case = cases[case_id]
        inputs = case["inputs"]
        result = calculate_provisional_fee_reserve(
            month_to_date_settled_profit=str(inputs["month_to_date_settled_profit"]),
            opening_loss_carryforward=str(inputs["opening_loss_carryforward"]),
            management_fee_percent=str(inputs["management_fee_percent"]),
            investment_fee_percent=str(inputs["investment_fee_percent"]),
            withdrawal_eligible_cash_before_fee_reserve=(
                str(inputs["withdrawal_eligible_cash_before_fee_reserve"])
                if "withdrawal_eligible_cash_before_fee_reserve" in inputs
                else None
            ),
            crystallised_fee_outstanding=str(inputs.get("crystallised_fee_outstanding", "0.00")),
        )
        assert_expected_decimal_fields(result, case["expected"])


def test_weekly_indicative_fee_impact_fixtures() -> None:
    cases = load_fixture_cases()
    for case_id in ("FEE-025", "FEE-026"):
        case = cases[case_id]
        inputs = case["inputs"]
        result = calculate_weekly_indicative_fee_impact(
            weekly_settled_profit=str(inputs["weekly_settled_profit"]),
            management_fee_percent=str(inputs["management_fee_percent"]),
            investment_fee_percent=str(inputs["investment_fee_percent"]),
        )
        assert_expected_decimal_fields(result, case["expected"])


def test_month_end_fee_remains_the_only_withdrawable_mvp_period() -> None:
    case = load_fixture_cases()["FEE-027"]
    result = calculate_period_case(case)
    assert result.fee_base == Decimal(case["expected"]["fee_base"])
    assert result.management_fee_amount == Decimal(
        case["expected"]["management_fee_amount"]
    )
    assert result.investment_fee_amount == Decimal(
        case["expected"]["investment_fee_amount"]
    )
    assert result.total_fee_due == Decimal(case["expected"]["total_fee_due"])
    assert case["expected"]["weekly_withdrawal_allowed"] is False


def test_report_date_range_does_not_change_fee_period_fixture() -> None:
    case = load_fixture_cases()["FEE-028"]
    assert case["expected"] == {
        "fee_period_start": case["inputs"]["fee_period_start"],
        "fee_period_end": case["inputs"]["fee_period_end"],
        "date_range_changes_fee_period": False,
    }


def test_duplicate_fee_withdrawal_link_is_blocked() -> None:
    duplicate = LinkedFeeWithdrawal(adjustment_id="DEMO-ADJ-001", amount="5.00")
    result = calculate_fee_period(
        FeePeriodCalculationInput(
            profile_id="PROFILE-001",
            eligible_period_profit="100.00",
            opening_loss_carryforward="0.00",
            management_fee_percent="10.00",
            investment_fee_percent="40.00",
            linked_received_withdrawals=(duplicate, duplicate),
        )
    )
    assert result.calculation_state == "blocked"
    assert result.error_code == "duplicate_withdrawal_link"


def test_locked_period_reopen_policy_fixtures() -> None:
    cases = load_fixture_cases()
    for case_id in ("FEE-018", "FEE-019", "FEE-020"):
        case = cases[case_id]
        inputs = case["inputs"]
        result = decide_fee_period_reopen(
            period_state=str(inputs["period_state"]),
            fee_withdrawn_amount=str(inputs["fee_withdrawn_amount"]),
            actor_role=str(inputs["actor_role"]),
            reopen_reason=str(inputs["reopen_reason"]),
        )
        assert_expected_decimal_fields(result, case["expected"])


def test_post_withdrawal_correction_fixtures() -> None:
    cases = load_fixture_cases()
    for case_id in ("FEE-021", "FEE-022", "FEE-023"):
        case = cases[case_id]
        inputs = case["inputs"]
        result = calculate_fee_correction(
            original_fee_due=str(inputs["original_fee_due"]),
            corrected_fee_due=str(inputs["corrected_fee_due"]),
            profile_closing=bool(inputs["profile_closing"]),
        )
        assert_expected_decimal_fields(result, case["expected"])


def test_fund_manager_confirms_ready_period_fixture() -> None:
    case = load_fixture_cases()["FEE-024"]
    inputs = case["inputs"]
    result = confirm_fee_crystallisation(
        period_state=str(inputs["period_state"]),
        actor_role=str(inputs["actor_role"]),
        confirmation=bool(inputs["confirmation"]),
    )
    assert_expected_decimal_fields(result, case["expected"])


def test_unconfirmed_period_is_not_fees_earned() -> None:
    result = confirm_fee_crystallisation(
        period_state="ready_to_crystallise",
        actor_role="fund_manager",
        confirmation=False,
    )
    assert result.period_state == "ready_to_crystallise"
    assert result.fees_earned_visible is False
    assert result.error_code == "fund_manager_confirmation_required"
