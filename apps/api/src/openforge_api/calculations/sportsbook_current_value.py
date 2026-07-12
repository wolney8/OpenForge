from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

MoneyOrNone = Decimal | None
CalculationState = Literal["resolved", "incomplete", "review_required"]

OPEN_STATUSES = {"Prospecting", "Not Placed", "Placed"}
CURRENT_VALUE_STATUSES = {"Placed"}
BACK_WIN_RESULTS = {"Back Won", "Win", "Outcome 1 Won"}
BACK_WIN_CASHBACK_RESULTS = {"Back Won + Cashback"}
LAY_WIN_RESULTS = {"Lay Won", "Lose", "No Selection Won"}
SUPPORTED_STRATEGIES = {"Standard", "Underlay", "Overlay"}
REVIEW_REQUIRED_STRATEGIES = {"Multilay", "Multilay-Underlay"}
RESULTS_REQUIRING_EXTRA_SCENARIOS = {"Outcome 2 Won", "Outcome 3 Won", "Mixed"}


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def quantize_ratio(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def parse_decimal(value: str | int | float | Decimal | None) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    text = str(value).strip()
    if not text:
        return None
    return Decimal(text)


def parse_iso_date(value: str | None) -> date | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    return date.fromisoformat(text[:10])


@dataclass(frozen=True)
class SportsbookCalculationInput:
    profile_id: str
    record_id: str
    status: str
    result: str
    offer_type: str
    back_stake: str
    back_odds: str
    match_strategy: str
    bonus_trigger: str = ""
    maximum_bonus: str = ""
    bonus_retention_rate: str = "70"
    lay_odds_1: str = ""
    multi_lay_outcome_1_name: str = ""
    multi_lay_outcomes_json: str = "[]"
    lay_commission_1: str = ""
    lay_actual: str = ""
    lay_matched_stake_1: str = ""
    date_settled: str = ""
    manual_override_value: str = ""
    manual_override_reason: str = ""


@dataclass(frozen=True)
class SportsbookCalculationResult:
    profile_id: str
    record_id: str
    calculation_state: CalculationState
    calculation_notes: tuple[str, ...]
    match_rating: Decimal | None
    reference_lay_stake_standard: MoneyOrNone
    reference_lay_stake_underlay: MoneyOrNone
    reference_lay_stake_overlay: MoneyOrNone
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
    scenario_pnl_if_outcome_2_wins: MoneyOrNone = None
    scenario_pnl_if_outcome_3_wins: MoneyOrNone = None


def _resolve_reference_lay_stakes(
    back_stake: Decimal, back_odds: Decimal, lay_odds_1: Decimal, commission_1: Decimal
) -> tuple[Decimal, Decimal, Decimal]:
    standard = quantize_money((back_stake * back_odds) / (lay_odds_1 - commission_1))
    underlay = quantize_money(
        (back_stake * (back_odds - Decimal("1"))) / (lay_odds_1 - Decimal("1"))
    )
    overlay = quantize_money(back_stake / (Decimal("1") - commission_1))
    return standard, underlay, overlay


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


def _parse_multi_lay_entries(serialized: str) -> list[dict[str, str]]:
    try:
        parsed = json.loads(serialized or "[]")
    except json.JSONDecodeError:
        return []

    if not isinstance(parsed, list):
        return []

    entries: list[dict[str, str]] = []
    for index, entry in enumerate(parsed, start=1):
        if not isinstance(entry, dict):
            continue
        raw_id = entry.get("id")
        resolved_id = (
            str(raw_id).strip() if isinstance(raw_id, str) and str(raw_id).strip() else f"outcome{index + 1}"
        )
        entries.append(
            {
                "id": resolved_id,
                "label": str(entry.get("label", "")).strip(),
                "layOdds": str(entry.get("layOdds", "")).strip(),
                "placedMatchedStake": str(entry.get("placedMatchedStake", "")).strip(),
                "placedLayOdds": str(entry.get("placedLayOdds", "")).strip(),
                "placedExchange": str(entry.get("placedExchange", "")).strip(),
                "placementState": str(entry.get("placementState", "")).strip(),
            }
        )
    return entries


def _parse_multi_lay_outcomes(serialized: str) -> list[tuple[str, Decimal]]:
    outcomes: list[tuple[str, Decimal]] = []
    for index, entry in enumerate(_parse_multi_lay_entries(serialized), start=2):
        if entry["id"] == "outcome1":
            continue
        label = entry["label"] or f"Outcome {index}"
        lay_odds = parse_decimal(entry["layOdds"])
        if lay_odds is None:
            continue
        outcomes.append((label, lay_odds))
    return outcomes


def _resolve_multilay_lay_status(
    serialized: str,
    actual_lay_stake: Decimal | None,
    lay_matched_stake: Decimal | None,
    *,
    expected_branch_count: int,
) -> str:
    parsed_entries = _parse_multi_lay_entries(serialized)
    if not parsed_entries:
        return _lay_status("Multilay", actual_lay_stake, lay_matched_stake)

    branch_states: list[bool] = []
    enriched_branch_found = False
    for entry in parsed_entries:
        if not entry["id"].startswith("outcome"):
            continue
        matched_stake = parse_decimal(entry["placedMatchedStake"])
        has_explicit_state = entry["placementState"] in {"placed", "pending"}
        has_placement_fields = bool(
            entry["placedMatchedStake"] or entry["placedLayOdds"] or entry["placedExchange"] or has_explicit_state
        )
        if has_placement_fields:
            enriched_branch_found = True
        branch_states.append(matched_stake is not None and matched_stake > 0)

    if not enriched_branch_found:
        return _lay_status("Multilay", actual_lay_stake, lay_matched_stake)

    placed_count = sum(1 for branch_is_placed in branch_states if branch_is_placed)
    if placed_count <= 0:
        return "Not Laid"
    if placed_count < max(expected_branch_count, 1):
        return "Part Laid"
    return "Fully Laid"


def _resolve_bonus_value(
    back_stake: Decimal, maximum_bonus: Decimal | None, bonus_retention_rate: Decimal | None
) -> Decimal | None:
    if bonus_retention_rate is None:
        return None
    capped_bonus = back_stake if maximum_bonus is None else min(back_stake, maximum_bonus)
    return quantize_money(capped_bonus * (bonus_retention_rate / Decimal("100")))


def calculate_sportsbook_current_value(
    calculation_input: SportsbookCalculationInput,
    *,
    as_of_date: date,
) -> SportsbookCalculationResult:
    notes: list[str] = []
    counts_as_open = calculation_input.status in OPEN_STATUSES
    uses_current_value = (
        calculation_input.status in CURRENT_VALUE_STATUSES
        or calculation_input.result == "Pending"
    )
    settled_date = parse_iso_date(calculation_input.date_settled)
    is_overdue = bool(counts_as_open and settled_date is not None and settled_date < as_of_date)

    if calculation_input.match_strategy not in {
        *SUPPORTED_STRATEGIES,
        "No Lay",
        "Custom",
        "Partial Lay",
        *REVIEW_REQUIRED_STRATEGIES,
    }:
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                f"Strategy '{calculation_input.match_strategy}' is not recognized.",
            ),
            match_rating=None,
            reference_lay_stake_standard=None,
            reference_lay_stake_underlay=None,
            reference_lay_stake_overlay=None,
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

    back_stake = parse_decimal(calculation_input.back_stake)
    back_odds = parse_decimal(calculation_input.back_odds)
    maximum_bonus = parse_decimal(calculation_input.maximum_bonus)
    bonus_retention_rate = parse_decimal(calculation_input.bonus_retention_rate)
    lay_odds_1 = parse_decimal(calculation_input.lay_odds_1)
    commission_1 = parse_decimal(calculation_input.lay_commission_1)

    no_lay_mode = calculation_input.match_strategy == "No Lay"
    manual_lay_mode = calculation_input.match_strategy in {"Custom", "Partial Lay"}
    review_required_strategy = calculation_input.match_strategy in REVIEW_REQUIRED_STRATEGIES

    if back_stake is None or back_odds is None:
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                "Required numeric inputs are missing.",
            ),
            match_rating=None,
            reference_lay_stake_standard=None,
            reference_lay_stake_underlay=None,
            reference_lay_stake_overlay=None,
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

    if no_lay_mode:
        lay_odds_1 = Decimal("0")
        commission_1 = Decimal("0")
        ref_standard = Decimal("0.00")
        ref_underlay = Decimal("0.00")
        ref_overlay = Decimal("0.00")
    else:
        if lay_odds_1 is None or commission_1 is None:
            return SportsbookCalculationResult(
                profile_id=calculation_input.profile_id,
                record_id=calculation_input.record_id,
                calculation_state="incomplete",
                calculation_notes=(
                    "Required numeric inputs are missing, including exchange commission "
                    "when contract-backed money values depend on it.",
                ),
                match_rating=None,
                reference_lay_stake_standard=None,
                reference_lay_stake_underlay=None,
                reference_lay_stake_overlay=None,
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
        ref_standard, ref_underlay, ref_overlay = _resolve_reference_lay_stakes(
            back_stake, back_odds, lay_odds_1, commission_1
        )
    reference_by_strategy = {
        "Standard": ref_standard,
        "Underlay": ref_underlay,
        "Overlay": ref_overlay,
        "No Lay": Decimal("0.00"),
    }

    if review_required_strategy:
        outcome_1_label = calculation_input.multi_lay_outcome_1_name.strip() or "Outcome 1"
        extra_outcomes = _parse_multi_lay_outcomes(calculation_input.multi_lay_outcomes_json)
        active_outcomes = [(outcome_1_label, lay_odds_1), *extra_outcomes]

        if len(active_outcomes) < 2:
            notes.append(
                "Multilay requires at least one additional outcome with lay odds "
                "before the contract-backed calculation can resolve."
            )
            return SportsbookCalculationResult(
                profile_id=calculation_input.profile_id,
                record_id=calculation_input.record_id,
                calculation_state="review_required",
                calculation_notes=tuple(notes),
                match_rating=quantize_ratio(back_odds / lay_odds_1) if lay_odds_1 else None,
                reference_lay_stake_standard=ref_standard,
                reference_lay_stake_underlay=ref_underlay,
                reference_lay_stake_overlay=ref_overlay,
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

        suggested_stakes: list[Decimal] = []
        if calculation_input.match_strategy == "Multilay":
            for _, outcome_lay_odds in active_outcomes:
                denominator = outcome_lay_odds - commission_1
                if denominator == 0:
                    return SportsbookCalculationResult(
                        profile_id=calculation_input.profile_id,
                        record_id=calculation_input.record_id,
                        calculation_state="incomplete",
                        calculation_notes=(
                            "Multilay lay odds and commission produce an invalid denominator.",
                        ),
                        match_rating=None,
                        reference_lay_stake_standard=ref_standard,
                        reference_lay_stake_underlay=ref_underlay,
                        reference_lay_stake_overlay=ref_overlay,
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
                suggested_stakes.append(
                    quantize_money((back_stake * back_odds) / denominator)
                )
        else:
            denominator = sum(
                (Decimal("1") - commission_1) / (outcome_lay_odds - commission_1)
                for _, outcome_lay_odds in active_outcomes
                if (outcome_lay_odds - commission_1) != 0
            )
            if denominator == 0 or len(active_outcomes) != len(
                [
                    1
                    for _, outcome_lay_odds in active_outcomes
                    if (outcome_lay_odds - commission_1) != 0
                ]
            ):
                return SportsbookCalculationResult(
                    profile_id=calculation_input.profile_id,
                    record_id=calculation_input.record_id,
                    calculation_state="incomplete",
                    calculation_notes=(
                        "Multilay-underlay lay odds and commission produce an invalid denominator.",
                    ),
                    match_rating=None,
                    reference_lay_stake_standard=ref_standard,
                    reference_lay_stake_underlay=ref_underlay,
                    reference_lay_stake_overlay=ref_overlay,
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
            base_allocation = back_stake / denominator
            suggested_stakes = [
                quantize_money(base_allocation / (outcome_lay_odds - commission_1))
                for _, outcome_lay_odds in active_outcomes
            ]

        liabilities = [
            quantize_money(stake * (outcome_lay_odds - Decimal("1")))
            for stake, (_, outcome_lay_odds) in zip(suggested_stakes, active_outcomes, strict=False)
        ]
        lay_returns = [
            quantize_money(stake * (Decimal("1") - commission_1)) for stake in suggested_stakes
        ]
        total_returns = sum(lay_returns, Decimal("0.00"))
        back_profit = quantize_money(back_stake * (back_odds - Decimal("1")))

        scenario_values: list[Decimal] = []
        for index, lay_return in enumerate(lay_returns):
            pnl = back_profit - liabilities[index] + (total_returns - lay_return)
            if calculation_input.offer_type == "Double Delight / Hat-trick Heaven":
                if index == 1:
                    pnl += back_profit
                elif index == 2:
                    pnl += back_profit * Decimal("2")
            scenario_values.append(quantize_money(pnl))

        no_selection_pnl = quantize_money((-back_stake) + total_returns)
        projected_current = (
            min([no_selection_pnl, *scenario_values]) if uses_current_value else None
        )

        manual_lay_value = parse_decimal(calculation_input.lay_actual)
        actual_lay_stake = (
            quantize_money(manual_lay_value)
            if manual_lay_value is not None and manual_lay_value > 0
            else suggested_stakes[0]
        )
        lay_matched_stake = parse_decimal(calculation_input.lay_matched_stake_1)
        actual_lay_stake_1 = quantize_money(actual_lay_stake)
        match_rating = quantize_ratio(back_odds / lay_odds_1) if lay_odds_1 else None
        multi_lay_status = _resolve_multilay_lay_status(
            calculation_input.multi_lay_outcomes_json,
            actual_lay_stake_1,
            lay_matched_stake,
            expected_branch_count=len(active_outcomes),
        )

        actual_net_pnl: MoneyOrNone = None
        if calculation_input.result in {"Back Won", "Win", "Outcome 1 Won"}:
            actual_net_pnl = scenario_values[0]
        elif calculation_input.result in {"Lay Won", "Lose", "No Selection Won"}:
            actual_net_pnl = no_selection_pnl
        elif calculation_input.result == "Outcome 2 Won" and len(scenario_values) > 1:
            actual_net_pnl = scenario_values[1]
        elif calculation_input.result == "Outcome 3 Won" and len(scenario_values) > 2:
            actual_net_pnl = scenario_values[2]
        elif calculation_input.result == "Pending" and uses_current_value:
            notes.append("Pending row uses projected current value until settlement.")
        elif calculation_input.result == "Void":
            actual_net_pnl = Decimal("0.00")
        elif calculation_input.result == "Mixed":
            notes.append("Mixed multilay settlement still requires manual review.")
            return SportsbookCalculationResult(
                profile_id=calculation_input.profile_id,
                record_id=calculation_input.record_id,
                calculation_state="review_required",
                calculation_notes=tuple(notes),
                match_rating=match_rating,
                reference_lay_stake_standard=ref_standard,
                reference_lay_stake_underlay=ref_underlay,
                reference_lay_stake_overlay=ref_overlay,
                actual_lay_stake_1=actual_lay_stake_1,
                calculated_liability_1=liabilities[0],
                scenario_pnl_if_back_wins=scenario_values[0],
                scenario_pnl_if_lay_wins=no_selection_pnl,
                projected_current_pnl=projected_current,
                actual_net_pnl=None,
                final_net_pnl=None,
                reporting_value=projected_current,
                lay_status=multi_lay_status,
                counts_as_open=counts_as_open,
                is_overdue=is_overdue,
                scenario_pnl_if_outcome_2_wins=(
                    scenario_values[1] if len(scenario_values) > 1 else None
                ),
                scenario_pnl_if_outcome_3_wins=(
                    scenario_values[2] if len(scenario_values) > 2 else None
                ),
            )

        final_net_pnl: MoneyOrNone = actual_net_pnl
        calculation_state: CalculationState = "resolved"
        manual_override_value = parse_decimal(calculation_input.manual_override_value)
        if manual_override_value is not None:
            final_net_pnl = quantize_money(manual_override_value)
            notes.append("Manual override replaced the formula-resolved value.")
            if not calculation_input.manual_override_reason.strip():
                notes.append("Manual override requires a reason for auditability.")
                calculation_state = "review_required"

        resolved_value = final_net_pnl if final_net_pnl is not None else projected_current
        if len(scenario_values) > 3:
            notes.append(
                "Additional multilay outcomes are used in current value, but only "
                "the first three outcome branches are surfaced individually in "
                "this slice."
            )

        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state=(
                "incomplete" if resolved_value is None else calculation_state
            ),
            calculation_notes=tuple(notes),
            match_rating=match_rating,
            reference_lay_stake_standard=ref_standard,
            reference_lay_stake_underlay=ref_underlay,
            reference_lay_stake_overlay=ref_overlay,
            actual_lay_stake_1=actual_lay_stake_1,
            calculated_liability_1=liabilities[0],
            scenario_pnl_if_back_wins=scenario_values[0],
            scenario_pnl_if_lay_wins=no_selection_pnl,
            projected_current_pnl=projected_current,
            actual_net_pnl=actual_net_pnl,
            final_net_pnl=final_net_pnl,
            reporting_value=resolved_value,
            lay_status=multi_lay_status,
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
            scenario_pnl_if_outcome_2_wins=(
                scenario_values[1] if len(scenario_values) > 1 else None
            ),
            scenario_pnl_if_outcome_3_wins=(
                scenario_values[2] if len(scenario_values) > 2 else None
            ),
        )

    manual_lay_value = parse_decimal(calculation_input.lay_actual)
    if manual_lay_mode and manual_lay_value is None:
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="incomplete",
            calculation_notes=(
                f"Strategy '{calculation_input.match_strategy}' "
                "requires an explicit lay_actual value.",
            ),
            match_rating=None,
            reference_lay_stake_standard=ref_standard,
            reference_lay_stake_underlay=ref_underlay,
            reference_lay_stake_overlay=ref_overlay,
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

    actual_lay_stake = manual_lay_value or reference_by_strategy[calculation_input.match_strategy]
    actual_lay_stake = quantize_money(actual_lay_stake)
    lay_matched_stake = parse_decimal(calculation_input.lay_matched_stake_1)
    liability_1 = quantize_money(actual_lay_stake * (lay_odds_1 - Decimal("1")))
    match_rating = None if no_lay_mode else quantize_ratio(back_odds / lay_odds_1)

    if no_lay_mode and calculation_input.offer_type in {"None", "Mug Bet"}:
        scenario_back_wins = quantize_money(back_stake * back_odds)
    else:
        scenario_back_wins = quantize_money((back_stake * (back_odds - Decimal("1"))) - liability_1)
    scenario_outcome_2_wins: Decimal | None = None
    scenario_outcome_3_wins: Decimal | None = None
    if calculation_input.offer_type == "Double Delight / Hat-trick Heaven":
        scenario_outcome_2_wins = quantize_money(
            scenario_back_wins + (back_stake * (back_odds - Decimal("1")))
        )
        scenario_outcome_3_wins = quantize_money(
            scenario_back_wins + (Decimal("2") * (back_stake * (back_odds - Decimal("1"))))
        )
    lay_returns_after_commission = actual_lay_stake * (Decimal("1") - commission_1)
    scenario_lay_wins = quantize_money((-back_stake) + lay_returns_after_commission)
    scenario_cashback_trigger: Decimal | None = None
    if calculation_input.offer_type in {"Cashback", "Refund"}:
        if calculation_input.offer_type == "Refund":
            retained_bonus_value = _resolve_bonus_value(
                back_stake, maximum_bonus, bonus_retention_rate
            )
        else:
            retained_bonus_value = quantize_money(
                back_stake if maximum_bonus is None else min(back_stake, maximum_bonus)
            )

        trigger_is_back_win = calculation_input.bonus_trigger == "Back Wins"
        if retained_bonus_value is not None:
            scenario_cashback_trigger = quantize_money(
                (scenario_back_wins if trigger_is_back_win else scenario_lay_wins)
                + retained_bonus_value
            )
            scenario_outcome_2_wins = scenario_cashback_trigger

    projected_candidates = [scenario_back_wins, scenario_lay_wins]
    if scenario_cashback_trigger is not None:
        projected_candidates.append(scenario_cashback_trigger)

    projected_current = min(projected_candidates) if uses_current_value else None

    actual_net_pnl: MoneyOrNone = None
    if calculation_input.result in BACK_WIN_RESULTS:
        actual_net_pnl = scenario_back_wins
    elif calculation_input.result in BACK_WIN_CASHBACK_RESULTS:
        actual_net_pnl = scenario_cashback_trigger
    elif calculation_input.result in LAY_WIN_RESULTS:
        actual_net_pnl = scenario_lay_wins
    elif calculation_input.result == "Lay Won + Cashback":
        actual_net_pnl = scenario_cashback_trigger
    elif calculation_input.result == "Void":
        actual_net_pnl = Decimal("0.00")
    elif calculation_input.result == "Outcome 2 Won" and scenario_outcome_2_wins is not None:
        actual_net_pnl = scenario_outcome_2_wins
    elif calculation_input.result == "Outcome 3 Won" and scenario_outcome_3_wins is not None:
        actual_net_pnl = scenario_outcome_3_wins
    elif calculation_input.result == "Pending" and uses_current_value:
        notes.append("Pending row uses projected current value until settlement.")
    elif calculation_input.result in RESULTS_REQUIRING_EXTRA_SCENARIOS:
        notes.append(
            f"Result '{calculation_input.result}' needs workbook scenario branches "
            "that are not fully modelled in this slice."
        )
        review_final_net_pnl = parse_decimal(calculation_input.manual_override_value)
        if review_final_net_pnl is not None:
            review_final_net_pnl = quantize_money(review_final_net_pnl)
            notes.append("Manual override replaced the formula-resolved value.")
        return SportsbookCalculationResult(
            profile_id=calculation_input.profile_id,
            record_id=calculation_input.record_id,
            calculation_state="review_required",
            calculation_notes=tuple(notes),
            match_rating=match_rating,
            reference_lay_stake_standard=ref_standard,
            reference_lay_stake_underlay=ref_underlay,
            reference_lay_stake_overlay=ref_overlay,
            actual_lay_stake_1=actual_lay_stake,
            calculated_liability_1=liability_1,
            scenario_pnl_if_back_wins=scenario_back_wins,
            scenario_pnl_if_lay_wins=scenario_lay_wins,
            projected_current_pnl=projected_current,
            actual_net_pnl=None,
            final_net_pnl=review_final_net_pnl,
            reporting_value=(
                review_final_net_pnl if review_final_net_pnl is not None else projected_current
            ),
            lay_status=_lay_status(
                calculation_input.match_strategy, actual_lay_stake, lay_matched_stake
            ),
            counts_as_open=counts_as_open,
            is_overdue=is_overdue,
            scenario_pnl_if_outcome_2_wins=scenario_outcome_2_wins,
            scenario_pnl_if_outcome_3_wins=scenario_outcome_3_wins,
        )

    final_net_pnl: MoneyOrNone = actual_net_pnl
    calculation_state: CalculationState = "resolved"
    manual_override_value = parse_decimal(calculation_input.manual_override_value)
    if manual_override_value is not None:
        final_net_pnl = quantize_money(manual_override_value)
        notes.append("Manual override replaced the formula-resolved value.")
        if not calculation_input.manual_override_reason.strip():
            notes.append("Manual override requires a reason for auditability.")
            calculation_state = "review_required"

    resolved_value = final_net_pnl if final_net_pnl is not None else projected_current

    return SportsbookCalculationResult(
        profile_id=calculation_input.profile_id,
        record_id=calculation_input.record_id,
        calculation_state=("incomplete" if resolved_value is None else calculation_state),
        calculation_notes=tuple(notes),
        match_rating=match_rating,
        reference_lay_stake_standard=ref_standard,
        reference_lay_stake_underlay=ref_underlay,
        reference_lay_stake_overlay=ref_overlay,
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
        scenario_pnl_if_outcome_2_wins=scenario_outcome_2_wins,
        scenario_pnl_if_outcome_3_wins=scenario_outcome_3_wins,
    )


def calculate_sportsbook_rows_for_profile(
    rows: list[SportsbookCalculationInput],
    *,
    profile_id: str,
    as_of_date: date,
) -> list[SportsbookCalculationResult]:
    return [
        calculate_sportsbook_current_value(row, as_of_date=as_of_date)
        for row in rows
        if row.profile_id == profile_id
    ]
