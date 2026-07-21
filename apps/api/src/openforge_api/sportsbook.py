from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Literal, cast

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field, model_validator

from openforge_api.calculations.profit_boost import (
    ProfitBoostInput,
    ProfitBoostResult,
    calculate_profit_boost,
)
from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    SportsbookCalculationResult,
    calculate_sportsbook_current_value,
)
from openforge_api.db import (
    create_multi_profile_entry_batch,
    create_sportsbook_bet,
    delete_sportsbook_bet,
    get_multi_profile_entry_batch_target,
    get_profile_exchange_commission,
    get_sportsbook_bet,
    list_accounts,
    list_multi_profile_entry_batch_targets,
    list_profile_exchange_commissions,
    list_profiles,
    list_sportsbook_bets,
    list_sportsbook_partial_lay_reminder_audit,
    update_multi_profile_entry_target,
    update_sportsbook_bet,
    update_sportsbook_partial_lay_reminder,
)
from openforge_api.multi_profile_entry import (
    MultiProfileTargetEligibility,
    evaluate_multi_profile_target,
    strategy_requires_exchange,
)

router = APIRouter(prefix="/profiles/{profile_id}/sportsbook-bets", tags=["sportsbook"])

StatusValue = Literal[
    "Prospecting",
    "Not Placed",
    "Placed",
    "Settled",
    "Void",
    "Cancelled",
    "Error",
    "Free Bet Awarded",
]
ResultValue = Literal[
    "Pending",
    "Back Won",
    "Back Won + Cashback",
    "Win",
    "Lay Won",
    "Lose",
    "No Selection Won",
    "Lay Won + Cashback",
    "Outcome 2 Won",
    "Outcome 3 Won",
    "Void",
    "Mixed",
]
MatchStrategyValue = Literal[
    "Standard",
    "Underlay",
    "Overlay",
    "Custom",
    "No Lay",
    "Partial Lay",
    "Multilay",
    "Multilay-Underlay",
]


class SportsbookBetPayload(BaseModel):
    sportsbook_bet_id: str | None = Field(default=None, max_length=64)
    event_name: str = Field(min_length=1, max_length=200)
    offer_text: str = Field(default="", max_length=200)
    bookmaker: str = Field(min_length=1, max_length=120)
    offer_type: str = Field(default="", max_length=120)
    bet_type: str = Field(default="", max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)
    market: str = Field(default="", max_length=200)
    status: StatusValue
    result: ResultValue
    back_stake: str = Field(default="", max_length=40)
    back_odds: str = Field(default="", max_length=40)
    profit_boost_mode: Literal["", "displayed_odds", "percentage"] = ""
    base_back_odds: str = Field(default="", max_length=40)
    profit_boost_percent: str = Field(default="", max_length=40)
    maximum_boost_winnings: str = Field(default="", max_length=40)
    actual_accepted_back_odds: str = Field(default="", max_length=40)
    source_combo_preset_id: str = Field(default="", max_length=64)
    source_combo_preset_version: int = Field(default=0, ge=0)
    bonus_trigger: str = Field(default="", max_length=40)
    maximum_bonus: str = Field(default="", max_length=40)
    bonus_retention_rate: str = Field(default="70", max_length=40)
    match_strategy: MatchStrategyValue
    lay_odds_1: str = Field(default="", max_length=40)
    multi_lay_outcome_1_name: str = Field(default="", max_length=120)
    multi_lay_outcomes_json: str = Field(default="[]", max_length=4000)
    lay_actual: str = Field(default="", max_length=40)
    lay_matched_stake_1: str = Field(default="", max_length=40)
    lay_commission_1: str = Field(default="", max_length=40)
    exchange_name: str = Field(default="", max_length=120)
    date_settled: str = Field(default="", max_length=40)
    user_notes: str = Field(default="", max_length=2000)
    manual_override_value: str = Field(default="", max_length=40)
    manual_override_reason: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def validate_override_reason(self) -> "SportsbookBetPayload":
        if self.manual_override_value and not self.manual_override_reason.strip():
            msg = "manual_override_reason is required when manual_override_value is provided"
            raise ValueError(msg)
        return self


class SportsbookBetResponse(SportsbookBetPayload):
    sportsbook_bet_id: str
    profile_id: str
    created_at: str
    updated_at: str
    partial_lay_reminder_state: str
    partial_lay_reminder_due_at: str
    partial_lay_reminder_reason: str
    partial_lay_reminder_resolution_note: str
    partial_lay_reminder_resolved_at: str
    partial_lay_reminder_resolved_by: str
    calculation_state: str
    calculation_notes: list[str]
    match_rating: str | None
    reference_lay_stake_standard: str | None
    reference_lay_stake_underlay: str | None
    reference_lay_stake_overlay: str | None
    calculated_liability_1: str | None
    scenario_pnl_if_back_wins: str | None
    scenario_pnl_if_lay_wins: str | None
    scenario_pnl_if_outcome_2_wins: str | None
    scenario_pnl_if_outcome_3_wins: str | None
    projected_current_pnl: str | None
    actual_net_pnl: str | None
    final_net_pnl: str | None
    reporting_value: str | None
    lay_status: str
    counts_as_open: bool
    is_overdue: bool
    reference_boosted_odds: str | None
    effective_back_odds: str | None
    profit_boost_source: str | None


class SportsbookCalculationPreviewResponse(BaseModel):
    lay_commission_1: str | None
    calculation_state: str
    calculation_notes: list[str]
    match_rating: str | None
    reference_lay_stake_standard: str | None
    reference_lay_stake_underlay: str | None
    reference_lay_stake_overlay: str | None
    calculated_liability_1: str | None
    scenario_pnl_if_back_wins: str | None
    scenario_pnl_if_lay_wins: str | None
    scenario_pnl_if_outcome_2_wins: str | None
    scenario_pnl_if_outcome_3_wins: str | None
    projected_current_pnl: str | None
    actual_net_pnl: str | None
    final_net_pnl: str | None
    reporting_value: str | None
    lay_status: str
    counts_as_open: bool
    is_overdue: bool
    reference_boosted_odds: str | None
    effective_back_odds: str | None
    profit_boost_source: str | None


class PartialLayReminderPayload(BaseModel):
    state: Literal["Active", "Resolved", "Dismissed"]
    due_at: str = Field(default="", max_length=40)
    reason: str = Field(default="", max_length=500)
    resolution_note: str = Field(default="", max_length=500)
    actor_id: str = Field(default="fund-manager-local", min_length=1, max_length=64)

    @model_validator(mode="after")
    def validate_required_reminder_fields(self) -> "PartialLayReminderPayload":
        if self.state == "Active":
            if not self.due_at.strip():
                raise ValueError("due_at is required for an active partial-lay reminder")
        elif not self.resolution_note.strip():
            raise ValueError("resolution_note is required to resolve or dismiss a reminder")
        return self


class PartialLayReminderAuditResponse(BaseModel):
    action: str
    changed_at: str
    sportsbook_bet_id: str
    profile_id: str
    previous_state: str
    state: str
    due_at: str
    reason: str
    resolution_note: str
    resolved_at: str
    actor_id: str


class MultiProfileExchangeOptionResponse(BaseModel):
    exchange_name: str
    commission_rate: str


class MultiProfileTargetResponse(BaseModel):
    profile_id: str
    display_name: str
    profile_code: str
    eligible: bool
    state: str
    reasons: list[str]
    bookmaker_account_status: str
    exchange_options: list[MultiProfileExchangeOptionResponse]


class MultiProfileBatchPayload(BaseModel):
    target_profile_ids: list[str] = Field(min_length=1)
    actor_id: str = Field(default="local-fund-manager", min_length=1, max_length=120)


class MultiProfileBatchResponse(BaseModel):
    batch_id: str
    source_sportsbook_bet_id: str
    selected_target_profile_ids: list[str]


class MultiProfileTargetSubmitResponse(BaseModel):
    batch_id: str
    target_profile_id: str
    submit_state: str
    sportsbook_bet: SportsbookBetResponse


class MultiProfileTargetSkipResponse(BaseModel):
    batch_id: str
    target_profile_id: str
    submit_state: str


class MultiProfileBatchCancelResponse(BaseModel):
    batch_id: str
    skipped_target_profile_ids: list[str]


SHARED_MULTI_PROFILE_FIELDS = (
    "event_name",
    "offer_text",
    "bookmaker",
    "offer_type",
    "bet_type",
    "offer_name",
    "fixture_type",
    "market",
    "bonus_trigger",
    "maximum_bonus",
    "bonus_retention_rate",
    "profit_boost_mode",
    "base_back_odds",
    "profit_boost_percent",
    "maximum_boost_winnings",
    "actual_accepted_back_odds",
)


def build_target_eligibility(
    *, source_profile_id: str, source_record: object
) -> list[MultiProfileTargetEligibility]:
    source = source_record.__dict__
    return [
        evaluate_multi_profile_target(
            profile=profile,
            accounts=list_accounts(profile.profile_id),
            exchange_commissions=list_profile_exchange_commissions(profile.profile_id),
            bookmaker=source["bookmaker"],
            offer_type=source["offer_type"],
            match_strategy=source["match_strategy"],
        )
        for profile in list_profiles()
        if profile.profile_id != source_profile_id
    ]


def serialize_target_eligibility(
    target: MultiProfileTargetEligibility,
) -> MultiProfileTargetResponse:
    return MultiProfileTargetResponse(
        profile_id=target.profile_id,
        display_name=target.display_name,
        profile_code=target.profile_code,
        eligible=target.eligible,
        state=target.state,
        reasons=list(target.reasons),
        bookmaker_account_status=target.bookmaker_account_status,
        exchange_options=[
            MultiProfileExchangeOptionResponse(
                exchange_name=option.exchange_name,
                commission_rate=option.commission_rate,
            )
            for option in target.exchange_options
        ],
    )


def format_decimal(value: Decimal | None, *, decimals: int) -> str | None:
    if value is None:
        return None
    return f"{value:.{decimals}f}"


def resolve_profit_boost(values: dict[str, Any]) -> ProfitBoostResult | None:
    if values.get("offer_type") != "Profit Boost":
        return None
    mode = cast(
        Literal["displayed_odds", "percentage"],
        values.get("profit_boost_mode") or "displayed_odds",
    )
    return calculate_profit_boost(
        ProfitBoostInput(
            profile_id=str(values["profile_id"]),
            mode=mode,
            back_stake=str(values.get("back_stake", "")),
            base_back_odds=str(values.get("base_back_odds", "")),
            profit_boost_percent=str(values.get("profit_boost_percent", "")),
            boosted_back_odds=str(values.get("back_odds", "")),
            actual_accepted_back_odds=str(values.get("actual_accepted_back_odds", "")),
            maximum_boost_winnings=str(values.get("maximum_boost_winnings", "")),
        )
    )


def serialize_profit_boost(result: ProfitBoostResult | None) -> dict[str, str | None]:
    if result is None:
        return {
            "reference_boosted_odds": None,
            "effective_back_odds": None,
            "profit_boost_source": None,
        }
    return {
        "reference_boosted_odds": format_decimal(result.reference_boosted_odds, decimals=4),
        "effective_back_odds": format_decimal(result.effective_back_odds, decimals=4),
        "profit_boost_source": result.boost_source,
    }


def build_response(
    profile_id: str,
    row: object,
    *,
    as_of_date: date,
) -> SportsbookBetResponse:
    record = row.__dict__
    profit_boost = resolve_profit_boost(record)
    effective_back_odds = (
        format_decimal(profit_boost.effective_back_odds, decimals=4)
        if profit_boost and profit_boost.effective_back_odds is not None
        else record["back_odds"]
    )
    calculation = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id=record["profile_id"],
            record_id=record["sportsbook_bet_id"],
            status=record["status"],
            result=record["result"],
            offer_type=record["offer_type"],
            back_stake=record["back_stake"],
            back_odds=effective_back_odds or "",
            bonus_trigger=record["bonus_trigger"],
            maximum_bonus=record["maximum_bonus"],
            bonus_retention_rate=record["bonus_retention_rate"],
            match_strategy=record["match_strategy"],
            lay_odds_1=record["lay_odds_1"],
            multi_lay_outcome_1_name=record["multi_lay_outcome_1_name"],
            multi_lay_outcomes_json=record["multi_lay_outcomes_json"],
            lay_commission_1=get_profile_exchange_commission(
                profile_id,
                record["exchange_name"],
            ),
            lay_actual=record["lay_actual"],
            lay_matched_stake_1=record["lay_matched_stake_1"],
            date_settled=record["date_settled"],
            manual_override_value=record["manual_override_value"],
            manual_override_reason=record["manual_override_reason"],
        ),
        as_of_date=as_of_date,
    )
    return SportsbookBetResponse.model_validate(
        {
            **record,
            "lay_commission_1": get_profile_exchange_commission(
                profile_id,
                record["exchange_name"],
            ),
            **serialize_calculation(calculation),
            **serialize_profit_boost(profit_boost),
        }
    )


def serialize_calculation(calculation: SportsbookCalculationResult) -> dict[str, object]:
    return {
        "calculation_state": calculation.calculation_state,
        "calculation_notes": list(calculation.calculation_notes),
        "match_rating": format_decimal(calculation.match_rating, decimals=4),
        "reference_lay_stake_standard": format_decimal(
            calculation.reference_lay_stake_standard,
            decimals=2,
        ),
        "reference_lay_stake_underlay": format_decimal(
            calculation.reference_lay_stake_underlay,
            decimals=2,
        ),
        "reference_lay_stake_overlay": format_decimal(
            calculation.reference_lay_stake_overlay,
            decimals=2,
        ),
        "calculated_liability_1": format_decimal(
            calculation.calculated_liability_1,
            decimals=2,
        ),
        "scenario_pnl_if_back_wins": format_decimal(
            calculation.scenario_pnl_if_back_wins,
            decimals=2,
        ),
        "scenario_pnl_if_lay_wins": format_decimal(
            calculation.scenario_pnl_if_lay_wins,
            decimals=2,
        ),
        "scenario_pnl_if_outcome_2_wins": format_decimal(
            calculation.scenario_pnl_if_outcome_2_wins,
            decimals=2,
        ),
        "scenario_pnl_if_outcome_3_wins": format_decimal(
            calculation.scenario_pnl_if_outcome_3_wins,
            decimals=2,
        ),
        "projected_current_pnl": format_decimal(
            calculation.projected_current_pnl,
            decimals=2,
        ),
        "actual_net_pnl": format_decimal(calculation.actual_net_pnl, decimals=2),
        "final_net_pnl": format_decimal(calculation.final_net_pnl, decimals=2),
        "reporting_value": format_decimal(calculation.reporting_value, decimals=2),
        "lay_status": calculation.lay_status,
        "counts_as_open": calculation.counts_as_open,
        "is_overdue": calculation.is_overdue,
    }


def reminder_timestamp(value: str, *, end_of_day_for_date: bool = False) -> float:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Reminder date is required")
    try:
        if end_of_day_for_date and len(normalized) == 10:
            parsed = datetime.fromisoformat(f"{normalized}T23:59:59")
        else:
            parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("Reminder and settlement dates must use ISO date/time values") from error
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


@router.get("", response_model=list[SportsbookBetResponse])
def list_profile_sportsbook_bets(profile_id: str) -> list[SportsbookBetResponse]:
    return [
        build_response(profile_id, row, as_of_date=date.today())
        for row in list_sportsbook_bets(profile_id)
    ]


@router.put(
    "/{sportsbook_bet_id}/partial-lay-reminder",
    response_model=SportsbookBetResponse,
)
def set_profile_sportsbook_partial_lay_reminder(
    profile_id: str,
    sportsbook_bet_id: str,
    payload: PartialLayReminderPayload,
) -> SportsbookBetResponse:
    row = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")

    current = build_response(profile_id, row, as_of_date=date.today())
    if payload.state == "Active" and current.lay_status != "Part Laid":
        raise HTTPException(
            status_code=409,
            detail="Reminder requires a part-laid sportsbook row.",
        )
    if payload.state == "Active" and row.partial_lay_reminder_state == "Active":
        raise HTTPException(
            status_code=409,
            detail="This sportsbook row already has an active partial-lay reminder.",
        )
    if payload.state in {"Resolved", "Dismissed"} and row.partial_lay_reminder_state != "Active":
        raise HTTPException(
            status_code=409,
            detail="Only an active partial-lay reminder can be resolved or dismissed.",
        )

    due_at = payload.due_at.strip() or row.partial_lay_reminder_due_at
    reason = payload.reason.strip() or row.partial_lay_reminder_reason
    if payload.state == "Active":
        try:
            due_timestamp = reminder_timestamp(due_at)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        if row.date_settled.strip():
            try:
                settlement_timestamp = reminder_timestamp(
                    row.date_settled,
                    end_of_day_for_date=True,
                )
            except ValueError as error:
                raise HTTPException(status_code=422, detail=str(error)) from error
            if due_timestamp > settlement_timestamp:
                raise HTTPException(
                    status_code=422,
                    detail="Reminder must be due on or before the settlement cutoff.",
                )

    updated = update_sportsbook_partial_lay_reminder(
        profile_id,
        sportsbook_bet_id,
        state=payload.state,
        due_at=due_at,
        reason=reason,
        resolution_note=payload.resolution_note.strip(),
        actor_id=payload.actor_id,
    )
    assert updated is not None
    return build_response(profile_id, updated, as_of_date=date.today())


@router.get(
    "/{sportsbook_bet_id}/partial-lay-reminder/audit",
    response_model=list[PartialLayReminderAuditResponse],
)
def get_profile_sportsbook_partial_lay_reminder_audit(
    profile_id: str,
    sportsbook_bet_id: str,
) -> list[PartialLayReminderAuditResponse]:
    if get_sportsbook_bet(profile_id, sportsbook_bet_id) is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return [
        PartialLayReminderAuditResponse.model_validate(item)
        for item in list_sportsbook_partial_lay_reminder_audit(profile_id, sportsbook_bet_id)
    ]


@router.post("/preview", response_model=SportsbookCalculationPreviewResponse)
def preview_profile_sportsbook_bet(
    profile_id: str, payload: SportsbookBetPayload
) -> SportsbookCalculationPreviewResponse:
    resolved_commission = get_profile_exchange_commission(profile_id, payload.exchange_name)
    values = {**payload.model_dump(), "profile_id": profile_id}
    profit_boost = resolve_profit_boost(values)
    effective_back_odds = (
        format_decimal(profit_boost.effective_back_odds, decimals=4)
        if profit_boost and profit_boost.effective_back_odds is not None
        else payload.back_odds
    )
    calculation = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id=profile_id,
            record_id=payload.sportsbook_bet_id or "preview",
            status=payload.status,
            result=payload.result,
            offer_type=payload.offer_type,
            back_stake=payload.back_stake,
            back_odds=effective_back_odds or "",
            bonus_trigger=payload.bonus_trigger,
            maximum_bonus=payload.maximum_bonus,
            bonus_retention_rate=payload.bonus_retention_rate,
            match_strategy=payload.match_strategy,
            lay_odds_1=payload.lay_odds_1,
            multi_lay_outcome_1_name=payload.multi_lay_outcome_1_name,
            multi_lay_outcomes_json=payload.multi_lay_outcomes_json,
            lay_commission_1=resolved_commission,
            lay_actual=payload.lay_actual,
            lay_matched_stake_1=payload.lay_matched_stake_1,
            date_settled=payload.date_settled,
            manual_override_value=payload.manual_override_value,
            manual_override_reason=payload.manual_override_reason,
        ),
        as_of_date=date.today(),
    )
    return SportsbookCalculationPreviewResponse.model_validate(
        {
            "lay_commission_1": resolved_commission or None,
            **serialize_calculation(calculation),
            **serialize_profit_boost(profit_boost),
        }
    )


@router.get("/{sportsbook_bet_id}", response_model=SportsbookBetResponse)
def get_profile_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> SportsbookBetResponse:
    record = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return build_response(profile_id, record, as_of_date=date.today())


@router.get(
    "/{sportsbook_bet_id}/copy-targets",
    response_model=list[MultiProfileTargetResponse],
)
def list_sportsbook_copy_targets(
    profile_id: str, sportsbook_bet_id: str
) -> list[MultiProfileTargetResponse]:
    source = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source sportsbook bet not found")
    return [
        serialize_target_eligibility(target)
        for target in build_target_eligibility(
            source_profile_id=profile_id,
            source_record=source,
        )
    ]


@router.post(
    "/{sportsbook_bet_id}/copy-batches",
    response_model=MultiProfileBatchResponse,
    status_code=201,
)
def create_sportsbook_copy_batch(
    profile_id: str,
    sportsbook_bet_id: str,
    payload: MultiProfileBatchPayload,
) -> MultiProfileBatchResponse:
    source = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source sportsbook bet not found")
    candidates = build_target_eligibility(source_profile_id=profile_id, source_record=source)
    candidates_by_id = {candidate.profile_id: candidate for candidate in candidates}
    selected_ids = list(dict.fromkeys(payload.target_profile_ids))
    unknown_ids = sorted(set(selected_ids) - set(candidates_by_id))
    if unknown_ids:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown target profiles: {', '.join(unknown_ids)}",
        )
    blocked_selected = [
        candidates_by_id[target_id]
        for target_id in selected_ids
        if not candidates_by_id[target_id].eligible
    ]
    if blocked_selected:
        raise HTTPException(
            status_code=409,
            detail="Blocked profiles cannot be selected for submission",
        )

    batch_id = create_multi_profile_entry_batch(
        source_profile_id=profile_id,
        source_sportsbook_bet_id=sportsbook_bet_id,
        actor_id=payload.actor_id,
        targets=[
            {
                "profile_id": candidate.profile_id,
                "eligibility_state": candidate.state,
                "eligibility_reasons": list(candidate.reasons),
                "submit_state": (
                    "Pending"
                    if candidate.profile_id in selected_ids
                    else "Blocked"
                    if not candidate.eligible
                    else "Skipped"
                ),
            }
            for candidate in candidates
        ],
    )
    return MultiProfileBatchResponse(
        batch_id=batch_id,
        source_sportsbook_bet_id=sportsbook_bet_id,
        selected_target_profile_ids=selected_ids,
    )


@router.post(
    "/{sportsbook_bet_id}/copy-batches/{batch_id}/targets/{target_profile_id}/submit",
    response_model=MultiProfileTargetSubmitResponse,
    status_code=201,
)
def submit_sportsbook_copy_target(
    profile_id: str,
    sportsbook_bet_id: str,
    batch_id: str,
    target_profile_id: str,
    payload: SportsbookBetPayload,
) -> MultiProfileTargetSubmitResponse:
    source = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source sportsbook bet not found")
    target_audit = get_multi_profile_entry_batch_target(batch_id, target_profile_id)
    if (
        target_audit is None
        or target_audit["source_profile_id"] != profile_id
        or target_audit["source_sportsbook_bet_id"] != sportsbook_bet_id
    ):
        raise HTTPException(status_code=404, detail="Copy batch target not found")
    if target_audit["submit_state"] != "Pending":
        raise HTTPException(status_code=409, detail="Target is not pending submission")

    candidate = next(
        (
            item
            for item in build_target_eligibility(
                source_profile_id=profile_id,
                source_record=source,
            )
            if item.profile_id == target_profile_id
        ),
        None,
    )
    if candidate is None:
        raise HTTPException(status_code=404, detail="Target profile not found")
    if not candidate.eligible:
        update_multi_profile_entry_target(
            batch_id=batch_id,
            target_profile_id=target_profile_id,
            eligibility_state="Blocked",
            eligibility_reasons=list(candidate.reasons),
            submit_state="Blocked",
        )
        raise HTTPException(status_code=409, detail="; ".join(candidate.reasons))

    source_values = source.__dict__
    submitted_values: dict[str, Any] = payload.model_dump()
    for field_name in SHARED_MULTI_PROFILE_FIELDS:
        if submitted_values[field_name] != source_values[field_name]:
            raise HTTPException(
                status_code=422,
                detail=f"Shared source field cannot be changed: {field_name}",
            )
    allowed_exchanges = {option.exchange_name for option in candidate.exchange_options}
    if (
        strategy_requires_exchange(payload.match_strategy)
        and payload.exchange_name not in allowed_exchanges
    ):
        raise HTTPException(
            status_code=422,
            detail="Select an active target exchange with configured commission",
        )

    submitted_values["sportsbook_bet_id"] = None
    try:
        created = create_sportsbook_bet(target_profile_id, submitted_values)
    except Exception:
        update_multi_profile_entry_target(
            batch_id=batch_id,
            target_profile_id=target_profile_id,
            submit_state="Failed",
        )
        raise
    copied_fields = {
        field_name: source_values[field_name] for field_name in SHARED_MULTI_PROFILE_FIELDS
    }
    changed_fields = {
        field_name: {
            "source": source_values.get(field_name, ""),
            "target": submitted_values.get(field_name, ""),
        }
        for field_name in submitted_values
        if field_name not in SHARED_MULTI_PROFILE_FIELDS
        and field_name != "sportsbook_bet_id"
        and submitted_values.get(field_name, "") != source_values.get(field_name, "")
    }
    update_multi_profile_entry_target(
        batch_id=batch_id,
        target_profile_id=target_profile_id,
        submit_state="Created",
        copied_fields=copied_fields,
        changed_fields=changed_fields,
        created_sportsbook_bet_id=created.sportsbook_bet_id,
    )
    return MultiProfileTargetSubmitResponse(
        batch_id=batch_id,
        target_profile_id=target_profile_id,
        submit_state="Created",
        sportsbook_bet=build_response(target_profile_id, created, as_of_date=date.today()),
    )


@router.post(
    "/{sportsbook_bet_id}/copy-batches/{batch_id}/targets/{target_profile_id}/skip",
    response_model=MultiProfileTargetSkipResponse,
)
def skip_sportsbook_copy_target(
    profile_id: str,
    sportsbook_bet_id: str,
    batch_id: str,
    target_profile_id: str,
) -> MultiProfileTargetSkipResponse:
    target_audit = get_multi_profile_entry_batch_target(batch_id, target_profile_id)
    if (
        target_audit is None
        or target_audit["source_profile_id"] != profile_id
        or target_audit["source_sportsbook_bet_id"] != sportsbook_bet_id
    ):
        raise HTTPException(status_code=404, detail="Copy batch target not found")
    if target_audit["submit_state"] != "Pending":
        raise HTTPException(status_code=409, detail="Target is not pending submission")
    update_multi_profile_entry_target(
        batch_id=batch_id,
        target_profile_id=target_profile_id,
        submit_state="Skipped",
    )
    return MultiProfileTargetSkipResponse(
        batch_id=batch_id,
        target_profile_id=target_profile_id,
        submit_state="Skipped",
    )


@router.post(
    "/{sportsbook_bet_id}/copy-batches/{batch_id}/cancel",
    response_model=MultiProfileBatchCancelResponse,
)
def cancel_sportsbook_copy_batch(
    profile_id: str,
    sportsbook_bet_id: str,
    batch_id: str,
) -> MultiProfileBatchCancelResponse:
    targets = list_multi_profile_entry_batch_targets(batch_id)
    if not targets:
        raise HTTPException(status_code=404, detail="Copy batch not found")
    batch_target = get_multi_profile_entry_batch_target(
        batch_id,
        targets[0]["target_profile_id"],
    )
    if (
        batch_target is None
        or batch_target["source_profile_id"] != profile_id
        or batch_target["source_sportsbook_bet_id"] != sportsbook_bet_id
    ):
        raise HTTPException(status_code=404, detail="Copy batch not found")
    pending_target_ids = [
        target["target_profile_id"]
        for target in targets
        if target["submit_state"] == "Pending"
    ]
    for target_profile_id in pending_target_ids:
        update_multi_profile_entry_target(
            batch_id=batch_id,
            target_profile_id=target_profile_id,
            submit_state="Skipped",
        )
    return MultiProfileBatchCancelResponse(
        batch_id=batch_id,
        skipped_target_profile_ids=pending_target_ids,
    )


@router.post("", response_model=SportsbookBetResponse, status_code=201)
def create_profile_sportsbook_bet(
    profile_id: str, payload: SportsbookBetPayload
) -> SportsbookBetResponse:
    created = create_sportsbook_bet(profile_id, payload.model_dump())
    return build_response(profile_id, created, as_of_date=date.today())


@router.put("/{sportsbook_bet_id}", response_model=SportsbookBetResponse)
def update_profile_sportsbook_bet(
    profile_id: str, sportsbook_bet_id: str, payload: SportsbookBetPayload
) -> SportsbookBetResponse:
    updated = update_sportsbook_bet(profile_id, sportsbook_bet_id, payload.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return build_response(profile_id, updated, as_of_date=date.today())


@router.delete("/{sportsbook_bet_id}", status_code=204)
def remove_profile_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> Response:
    deleted = delete_sportsbook_bet(profile_id, sportsbook_bet_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return Response(status_code=204)
