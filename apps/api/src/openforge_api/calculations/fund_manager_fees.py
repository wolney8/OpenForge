from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Literal

CalculationState = Literal["resolved", "blocked"]
PackageState = Literal["valid", "blocked"]
FeeAdjustmentType = Literal["fee_credit", "fee_debit", "none"]

MONEY_QUANTUM = Decimal("0.01")
PERCENT_MIN = Decimal("0")
PERCENT_MAX = Decimal("100")
FEE_WITHDRAWAL_SUBTYPES = {
    "Management Fee Withdrawal",
    "Investment Fee Withdrawal",
}
SUBSCRIBER_VISIBLE_FEE_FIELDS = (
    "settled_period_profit",
    "management_fee_amount",
    "investment_fee_amount",
    "total_fee_due",
    "subscriber_net_entitlement",
)
SUBSCRIBER_HIDDEN_WITHDRAWAL_FIELDS = (
    "linked_withdrawal_id",
    "linked_withdrawal_date",
    "withdrawal_state",
)


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def parse_decimal(value: str | int | Decimal | None) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None


@dataclass(frozen=True)
class LinkedFeeWithdrawal:
    adjustment_id: str
    amount: str


@dataclass(frozen=True)
class FeePeriodCalculationInput:
    profile_id: str
    eligible_period_profit: str | None
    opening_loss_carryforward: str
    management_fee_percent: str
    investment_fee_percent: str
    linked_received_withdrawals: tuple[LinkedFeeWithdrawal, ...] = ()


@dataclass(frozen=True)
class FeePeriodCalculationResult:
    profile_id: str
    calculation_state: CalculationState
    package_state: PackageState
    error_code: str | None
    profit_after_loss_recovery: Decimal | None
    fee_base: Decimal | None
    closing_loss_carryforward: Decimal | None
    management_fee_amount: Decimal | None
    investment_fee_amount: Decimal | None
    total_fee_due: Decimal | None
    fee_withdrawn_amount: Decimal | None
    fee_outstanding_amount: Decimal | None
    cash_snapshot_delta: Decimal


def validate_fee_percentages(
    management_fee_percent: Decimal | None,
    investment_fee_percent: Decimal | None,
) -> str | None:
    if management_fee_percent is None or investment_fee_percent is None:
        return "valid_fee_percentages_required"
    if not (
        PERCENT_MIN <= management_fee_percent <= PERCENT_MAX
        and PERCENT_MIN <= investment_fee_percent <= PERCENT_MAX
    ):
        return "fee_percent_out_of_range"
    if management_fee_percent + investment_fee_percent > PERCENT_MAX:
        return "combined_fee_percent_exceeds_100"
    return None


def calculate_fee_period(
    calculation_input: FeePeriodCalculationInput,
) -> FeePeriodCalculationResult:
    management_percent = parse_decimal(calculation_input.management_fee_percent)
    investment_percent = parse_decimal(calculation_input.investment_fee_percent)
    percentage_error = validate_fee_percentages(management_percent, investment_percent)
    if percentage_error:
        return FeePeriodCalculationResult(
            profile_id=calculation_input.profile_id,
            calculation_state="blocked",
            package_state="blocked",
            error_code=percentage_error,
            profit_after_loss_recovery=None,
            fee_base=None,
            closing_loss_carryforward=None,
            management_fee_amount=None,
            investment_fee_amount=None,
            total_fee_due=None,
            fee_withdrawn_amount=None,
            fee_outstanding_amount=None,
            cash_snapshot_delta=Decimal("0.00"),
        )

    eligible_profit = parse_decimal(calculation_input.eligible_period_profit)
    opening_loss = parse_decimal(calculation_input.opening_loss_carryforward)
    if eligible_profit is None or opening_loss is None or opening_loss < 0:
        return FeePeriodCalculationResult(
            profile_id=calculation_input.profile_id,
            calculation_state="blocked",
            package_state="valid",
            error_code="approved_fee_base_required",
            profit_after_loss_recovery=None,
            fee_base=None,
            closing_loss_carryforward=None,
            management_fee_amount=None,
            investment_fee_amount=None,
            total_fee_due=None,
            fee_withdrawn_amount=None,
            fee_outstanding_amount=None,
            cash_snapshot_delta=Decimal("0.00"),
        )

    profit_after_loss_recovery = quantize_money(eligible_profit - opening_loss)
    fee_base = quantize_money(max(profit_after_loss_recovery, Decimal("0")))
    closing_loss = quantize_money(max(opening_loss - eligible_profit, Decimal("0")))
    management_amount = quantize_money(
        fee_base * (management_percent or Decimal("0")) / Decimal("100")
    )
    investment_amount = quantize_money(
        fee_base * (investment_percent or Decimal("0")) / Decimal("100")
    )
    total_due = quantize_money(management_amount + investment_amount)
    withdrawal_ids = [row.adjustment_id for row in calculation_input.linked_received_withdrawals]
    if len(withdrawal_ids) != len(set(withdrawal_ids)):
        return FeePeriodCalculationResult(
            profile_id=calculation_input.profile_id,
            calculation_state="blocked",
            package_state="valid",
            error_code="duplicate_withdrawal_link",
            profit_after_loss_recovery=profit_after_loss_recovery,
            fee_base=fee_base,
            closing_loss_carryforward=closing_loss,
            management_fee_amount=management_amount,
            investment_fee_amount=investment_amount,
            total_fee_due=total_due,
            fee_withdrawn_amount=None,
            fee_outstanding_amount=None,
            cash_snapshot_delta=Decimal("0.00"),
        )
    withdrawn = quantize_money(
        sum(
            (
                parse_decimal(row.amount) or Decimal("0")
                for row in calculation_input.linked_received_withdrawals
            ),
            Decimal("0"),
        )
    )
    outstanding = quantize_money(max(total_due - withdrawn, Decimal("0")))

    return FeePeriodCalculationResult(
        profile_id=calculation_input.profile_id,
        calculation_state="resolved",
        package_state="valid",
        error_code=None,
        profit_after_loss_recovery=profit_after_loss_recovery,
        fee_base=fee_base,
        closing_loss_carryforward=closing_loss,
        management_fee_amount=management_amount,
        investment_fee_amount=investment_amount,
        total_fee_due=total_due,
        fee_withdrawn_amount=withdrawn,
        fee_outstanding_amount=outstanding,
        cash_snapshot_delta=Decimal("0.00"),
    )


@dataclass(frozen=True)
class ProvisionalFeeReserveResult:
    calculation_state: CalculationState
    error_code: str | None
    provisional_fee_base: Decimal | None
    provisional_management_fee: Decimal | None
    provisional_investment_fee: Decimal | None
    provisional_fee_reserve: Decimal | None
    subscriber_withdrawal_available: Decimal | None
    weekly_breakdown_state: Literal["provisional"]
    fee_crystallised: bool
    fee_crystallised_by_request: bool


@dataclass(frozen=True)
class WeeklyIndicativeFeeImpactResult:
    calculation_state: CalculationState
    error_code: str | None
    weekly_settled_profit: Decimal | None
    management_fee_impact: Decimal | None
    investment_fee_impact: Decimal | None
    total_fee_impact: Decimal | None
    fee_crystallised: bool


def calculate_weekly_indicative_fee_impact(
    *,
    weekly_settled_profit: str,
    management_fee_percent: str,
    investment_fee_percent: str,
) -> WeeklyIndicativeFeeImpactResult:
    profit = parse_decimal(weekly_settled_profit)
    management_percent = parse_decimal(management_fee_percent)
    investment_percent = parse_decimal(investment_fee_percent)
    percentage_error = validate_fee_percentages(management_percent, investment_percent)
    if profit is None or percentage_error:
        return WeeklyIndicativeFeeImpactResult(
            calculation_state="blocked",
            error_code=percentage_error or "weekly_settled_profit_required",
            weekly_settled_profit=None,
            management_fee_impact=None,
            investment_fee_impact=None,
            total_fee_impact=None,
            fee_crystallised=False,
        )

    management_impact = quantize_money(
        profit * (management_percent or Decimal("0")) / Decimal("100")
    )
    investment_impact = quantize_money(
        profit * (investment_percent or Decimal("0")) / Decimal("100")
    )
    return WeeklyIndicativeFeeImpactResult(
        calculation_state="resolved",
        error_code=None,
        weekly_settled_profit=quantize_money(profit),
        management_fee_impact=management_impact,
        investment_fee_impact=investment_impact,
        total_fee_impact=quantize_money(management_impact + investment_impact),
        fee_crystallised=False,
    )


def calculate_provisional_fee_reserve(
    *,
    month_to_date_settled_profit: str,
    opening_loss_carryforward: str,
    management_fee_percent: str,
    investment_fee_percent: str,
    withdrawal_eligible_cash_before_fee_reserve: str | None = None,
    crystallised_fee_outstanding: str = "0.00",
) -> ProvisionalFeeReserveResult:
    period_result = calculate_fee_period(
        FeePeriodCalculationInput(
            profile_id="provisional",
            eligible_period_profit=month_to_date_settled_profit,
            opening_loss_carryforward=opening_loss_carryforward,
            management_fee_percent=management_fee_percent,
            investment_fee_percent=investment_fee_percent,
        )
    )
    if period_result.calculation_state == "blocked":
        return ProvisionalFeeReserveResult(
            calculation_state="blocked",
            error_code=period_result.error_code,
            provisional_fee_base=None,
            provisional_management_fee=None,
            provisional_investment_fee=None,
            provisional_fee_reserve=None,
            subscriber_withdrawal_available=None,
            weekly_breakdown_state="provisional",
            fee_crystallised=False,
            fee_crystallised_by_request=False,
        )

    reserve = quantize_money(
        (period_result.management_fee_amount or Decimal("0"))
        + (period_result.investment_fee_amount or Decimal("0"))
    )
    eligible_cash = parse_decimal(withdrawal_eligible_cash_before_fee_reserve)
    outstanding = parse_decimal(crystallised_fee_outstanding) or Decimal("0")
    withdrawal_available = (
        quantize_money(max(eligible_cash - outstanding - reserve, Decimal("0")))
        if eligible_cash is not None
        else None
    )
    return ProvisionalFeeReserveResult(
        calculation_state="resolved",
        error_code=None,
        provisional_fee_base=period_result.fee_base,
        provisional_management_fee=period_result.management_fee_amount,
        provisional_investment_fee=period_result.investment_fee_amount,
        provisional_fee_reserve=reserve,
        subscriber_withdrawal_available=withdrawal_available,
        weekly_breakdown_state="provisional",
        fee_crystallised=False,
        fee_crystallised_by_request=False,
    )


@dataclass(frozen=True)
class FeeWithdrawalApplicationResult:
    calculation_state: CalculationState
    error_code: str | None
    gross_cash_after_withdrawal: Decimal | None
    crystallised_fee_outstanding_after_withdrawal: Decimal | None
    subscriber_net_entitlement_after_withdrawal: Decimal | None
    subscriber_net_reduced_twice: bool


def apply_received_fee_withdrawal(
    *,
    gross_cash_before_withdrawal: str,
    crystallised_fee_outstanding_before_withdrawal: str,
    subscriber_net_entitlement_before_withdrawal: str,
    subtype: str,
    amount: str,
    state: str,
) -> FeeWithdrawalApplicationResult:
    gross_cash = parse_decimal(gross_cash_before_withdrawal)
    outstanding = parse_decimal(crystallised_fee_outstanding_before_withdrawal)
    subscriber_net = parse_decimal(subscriber_net_entitlement_before_withdrawal)
    withdrawal = parse_decimal(amount)
    if (
        gross_cash is None
        or outstanding is None
        or subscriber_net is None
        or withdrawal is None
        or withdrawal < 0
        or subtype not in FEE_WITHDRAWAL_SUBTYPES
        or state != "received"
    ):
        return FeeWithdrawalApplicationResult(
            calculation_state="blocked",
            error_code="valid_received_fee_withdrawal_required",
            gross_cash_after_withdrawal=None,
            crystallised_fee_outstanding_after_withdrawal=None,
            subscriber_net_entitlement_after_withdrawal=None,
            subscriber_net_reduced_twice=False,
        )
    if withdrawal > outstanding or withdrawal > gross_cash:
        return FeeWithdrawalApplicationResult(
            calculation_state="blocked",
            error_code="fee_withdrawal_exceeds_available_amount",
            gross_cash_after_withdrawal=None,
            crystallised_fee_outstanding_after_withdrawal=None,
            subscriber_net_entitlement_after_withdrawal=None,
            subscriber_net_reduced_twice=False,
        )
    return FeeWithdrawalApplicationResult(
        calculation_state="resolved",
        error_code=None,
        gross_cash_after_withdrawal=quantize_money(gross_cash - withdrawal),
        crystallised_fee_outstanding_after_withdrawal=quantize_money(outstanding - withdrawal),
        subscriber_net_entitlement_after_withdrawal=quantize_money(subscriber_net),
        subscriber_net_reduced_twice=False,
    )


def can_link_fee_withdrawal(profile_id: str, withdrawal_profile_id: str) -> tuple[bool, str | None]:
    if profile_id != withdrawal_profile_id:
        return False, "profile_mismatch"
    return True, None


def subscriber_fee_visibility() -> dict[str, tuple[str, ...]]:
    return {
        "visible_fields": SUBSCRIBER_VISIBLE_FEE_FIELDS,
        "hidden_fields": SUBSCRIBER_HIDDEN_WITHDRAWAL_FIELDS,
    }


def resolve_package_versions(
    *, locked_period_package_version: int, current_package_version: int
) -> dict[str, int | bool]:
    return {
        "locked_period_package_version": locked_period_package_version,
        "locked_period_percentages_rewritten": False,
        "new_period_uses_package_version": current_package_version,
    }


@dataclass(frozen=True)
class FeePeriodReopenDecision:
    reopen_allowed: bool
    error_code: str | None
    correction_route: Literal["reopen_period", "next_open_period"] | None
    original_revision_retained: bool
    next_revision_number: int | None


def decide_fee_period_reopen(
    *,
    period_state: str,
    fee_withdrawn_amount: str,
    actor_role: str,
    reopen_reason: str,
    current_revision_number: int = 1,
) -> FeePeriodReopenDecision:
    withdrawn = parse_decimal(fee_withdrawn_amount)
    if period_state != "crystallised":
        return FeePeriodReopenDecision(
            reopen_allowed=False,
            error_code="crystallised_period_required",
            correction_route=None,
            original_revision_retained=False,
            next_revision_number=None,
        )
    if actor_role != "fund_manager":
        return FeePeriodReopenDecision(
            reopen_allowed=False,
            error_code="fund_manager_authority_required",
            correction_route=None,
            original_revision_retained=False,
            next_revision_number=None,
        )
    if not reopen_reason.strip():
        return FeePeriodReopenDecision(
            reopen_allowed=False,
            error_code="reopen_reason_required",
            correction_route=None,
            original_revision_retained=False,
            next_revision_number=None,
        )
    if withdrawn is None or withdrawn < 0:
        return FeePeriodReopenDecision(
            reopen_allowed=False,
            error_code="valid_withdrawn_amount_required",
            correction_route=None,
            original_revision_retained=False,
            next_revision_number=None,
        )
    if withdrawn > 0:
        return FeePeriodReopenDecision(
            reopen_allowed=False,
            error_code="withdrawn_period_is_immutable",
            correction_route="next_open_period",
            original_revision_retained=True,
            next_revision_number=None,
        )
    return FeePeriodReopenDecision(
        reopen_allowed=True,
        error_code=None,
        correction_route="reopen_period",
        original_revision_retained=True,
        next_revision_number=current_revision_number + 1,
    )


@dataclass(frozen=True)
class FeeCorrectionResult:
    adjustment_type: FeeAdjustmentType
    adjustment_amount: Decimal
    outstanding_refund_due: Decimal


def calculate_fee_correction(
    *, original_fee_due: str, corrected_fee_due: str, profile_closing: bool
) -> FeeCorrectionResult:
    original = parse_decimal(original_fee_due)
    corrected = parse_decimal(corrected_fee_due)
    if original is None or corrected is None or original < 0 or corrected < 0:
        raise ValueError("Valid non-negative original and corrected fee amounts are required.")
    difference = quantize_money(corrected - original)
    if difference > 0:
        return FeeCorrectionResult(
            adjustment_type="fee_debit",
            adjustment_amount=difference,
            outstanding_refund_due=Decimal("0.00"),
        )
    if difference < 0:
        credit = quantize_money(abs(difference))
        return FeeCorrectionResult(
            adjustment_type="fee_credit",
            adjustment_amount=credit,
            outstanding_refund_due=credit if profile_closing else Decimal("0.00"),
        )
    return FeeCorrectionResult(
        adjustment_type="none",
        adjustment_amount=Decimal("0.00"),
        outstanding_refund_due=Decimal("0.00"),
    )


@dataclass(frozen=True)
class FeeCrystallisationDecision:
    period_state: Literal["ready_to_crystallise", "crystallised"]
    fund_manager_confirmation_required: bool
    fees_earned_visible: bool
    error_code: str | None


def confirm_fee_crystallisation(
    *, period_state: str, actor_role: str, confirmation: bool
) -> FeeCrystallisationDecision:
    if period_state != "ready_to_crystallise":
        return FeeCrystallisationDecision(
            period_state="ready_to_crystallise",
            fund_manager_confirmation_required=True,
            fees_earned_visible=False,
            error_code="ready_to_crystallise_period_required",
        )
    if actor_role != "fund_manager" or not confirmation:
        return FeeCrystallisationDecision(
            period_state="ready_to_crystallise",
            fund_manager_confirmation_required=True,
            fees_earned_visible=False,
            error_code="fund_manager_confirmation_required",
        )
    return FeeCrystallisationDecision(
        period_state="crystallised",
        fund_manager_confirmation_required=True,
        fees_earned_visible=True,
        error_code=None,
    )
