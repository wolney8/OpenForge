from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field, model_validator

from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    FreeBetCalculationResult,
    calculate_free_bet_current_value,
)
from openforge_api.db import (
    FreeBetRecord,
    ProfileTrackerSettingsRecord,
    create_free_bet,
    delete_free_bet,
    get_free_bet,
    get_profile_exchange_commission,
    get_profile_tracker_settings,
    list_free_bets,
    update_free_bet,
)

router = APIRouter(prefix="/profiles/{profile_id}/free-bets", tags=["free-bets"])

StatusValue = Literal[
    "Prospecting",
    "Available",
    "Placed",
    "Settled",
    "Expired",
    "Void",
    "Converted",
    "Error",
    "Not Yet Awarded",
]
ResultValue = Literal["Pending", "Back Won", "Win", "Lay Won", "Lose", "Void"]
RetentionModeValue = Literal["SNR", "SR"]
MatchStrategyValue = Literal["Standard", "Underlay", "Overlay", "Custom", "No Lay", "Partial Lay"]


class FreeBetPayload(BaseModel):
    free_bet_id: str | None = Field(default=None, max_length=64)
    event_name: str = Field(min_length=1, max_length=200)
    offer_text: str = Field(default="", max_length=200)
    bookmaker: str = Field(min_length=1, max_length=120)
    offer_type: str = Field(default="", max_length=120)
    bet_type: str = Field(default="", max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)
    status: StatusValue
    result: ResultValue
    retention_mode: RetentionModeValue
    free_bet_value: str = Field(default="", max_length=40)
    back_odds: str = Field(default="", max_length=40)
    match_strategy: MatchStrategyValue
    lay_odds_1: str = Field(default="", max_length=40)
    lay_actual: str = Field(default="", max_length=40)
    lay_matched_stake_1: str = Field(default="", max_length=40)
    lay_commission_1: str = Field(default="", max_length=40)
    exchange_name: str = Field(default="", max_length=120)
    expiry_datetime: str = Field(default="", max_length=60)
    date_settled: str = Field(default="", max_length=40)
    origin_qual_bet_id: str = Field(default="", max_length=64)
    offer_group_id: str = Field(default="", max_length=64)
    user_notes: str = Field(default="", max_length=2000)
    manual_override_value: str = Field(default="", max_length=40)
    manual_override_reason: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def validate_override_reason(self) -> "FreeBetPayload":
        if self.manual_override_value and not self.manual_override_reason.strip():
            msg = "manual_override_reason is required when manual_override_value is provided"
            raise ValueError(msg)
        return self


class FreeBetResponse(FreeBetPayload):
    free_bet_id: str
    profile_id: str
    created_at: str
    updated_at: str
    calculation_state: str
    calculation_notes: list[str]
    base_reference_lay_stake: str | None
    underlay_reference_lay_stake: str | None
    overlay_reference_lay_stake: str | None
    calculated_liability_1: str | None
    scenario_pnl_if_back_wins: str | None
    scenario_pnl_if_lay_wins: str | None
    projected_current_pnl: str | None
    actual_net_pnl: str | None
    final_net_pnl: str | None
    reporting_value: str | None
    lay_status: str
    counts_as_open: bool
    is_overdue: bool


class FreeBetCalculationPreviewResponse(BaseModel):
    lay_commission_1: str | None
    calculation_state: str
    calculation_notes: list[str]
    base_reference_lay_stake: str | None
    underlay_reference_lay_stake: str | None
    overlay_reference_lay_stake: str | None
    calculated_liability_1: str | None
    scenario_pnl_if_back_wins: str | None
    scenario_pnl_if_lay_wins: str | None
    projected_current_pnl: str | None
    actual_net_pnl: str | None
    final_net_pnl: str | None
    reporting_value: str | None
    lay_status: str
    counts_as_open: bool
    is_overdue: bool


def format_decimal(value: Decimal | None, *, decimals: int) -> str | None:
    if value is None:
        return None
    return f"{value:.{decimals}f}"


def serialize_calculation(calculation: FreeBetCalculationResult) -> dict[str, object]:
    return {
        "calculation_state": calculation.calculation_state,
        "calculation_notes": list(calculation.calculation_notes),
        "base_reference_lay_stake": format_decimal(
            calculation.base_reference_lay_stake, decimals=2
        ),
        "underlay_reference_lay_stake": format_decimal(
            calculation.underlay_reference_lay_stake, decimals=2
        ),
        "overlay_reference_lay_stake": format_decimal(
            calculation.overlay_reference_lay_stake, decimals=2
        ),
        "calculated_liability_1": format_decimal(calculation.calculated_liability_1, decimals=2),
        "scenario_pnl_if_back_wins": format_decimal(
            calculation.scenario_pnl_if_back_wins, decimals=2
        ),
        "scenario_pnl_if_lay_wins": format_decimal(
            calculation.scenario_pnl_if_lay_wins, decimals=2
        ),
        "projected_current_pnl": format_decimal(calculation.projected_current_pnl, decimals=2),
        "actual_net_pnl": format_decimal(calculation.actual_net_pnl, decimals=2),
        "final_net_pnl": format_decimal(calculation.final_net_pnl, decimals=2),
        "reporting_value": format_decimal(calculation.reporting_value, decimals=2),
        "lay_status": calculation.lay_status,
        "counts_as_open": calculation.counts_as_open,
        "is_overdue": calculation.is_overdue,
    }


def build_calculation_input(
    record: FreeBetRecord, *, tracker_settings: ProfileTrackerSettingsRecord
) -> FreeBetCalculationInput:
    return FreeBetCalculationInput(
        profile_id=record.profile_id,
        record_id=record.free_bet_id,
        status=record.status,
        result=record.result,
        retention_mode=record.retention_mode,
        free_bet_value=record.free_bet_value,
        back_odds=record.back_odds,
        match_strategy=record.match_strategy,
        lay_odds_1=record.lay_odds_1,
        lay_commission_1=get_profile_exchange_commission(
            record.profile_id,
            record.exchange_name,
        ),
        lay_actual=record.lay_actual,
        lay_matched_stake_1=record.lay_matched_stake_1,
        default_underlay_factor=tracker_settings.default_free_bet_underlay_factor,
        default_overlay_factor=tracker_settings.default_free_bet_overlay_factor,
        expiry_datetime=record.expiry_datetime,
        date_settled=record.date_settled,
        manual_override_value=record.manual_override_value,
        manual_override_reason=record.manual_override_reason,
    )


def build_response(
    row: FreeBetRecord, *, tracker_settings: ProfileTrackerSettingsRecord
) -> FreeBetResponse:
    record = row.__dict__
    calculation = calculate_free_bet_current_value(
        build_calculation_input(row, tracker_settings=tracker_settings),
        as_of_datetime=datetime.now(),
    )
    return FreeBetResponse.model_validate(
        {
            **record,
            "lay_commission_1": get_profile_exchange_commission(
                record["profile_id"],
                record["exchange_name"],
            ),
            **serialize_calculation(calculation),
        }
    )


@router.get("", response_model=list[FreeBetResponse])
def list_profile_free_bets(profile_id: str) -> list[FreeBetResponse]:
    tracker_settings = get_profile_tracker_settings(profile_id)
    return [
        build_response(row, tracker_settings=tracker_settings)
        for row in list_free_bets(profile_id)
    ]


@router.post("/preview", response_model=FreeBetCalculationPreviewResponse)
def preview_profile_free_bet(
    profile_id: str, payload: FreeBetPayload
) -> FreeBetCalculationPreviewResponse:
    resolved_commission = get_profile_exchange_commission(profile_id, payload.exchange_name)
    tracker_settings = get_profile_tracker_settings(profile_id)
    calculation = calculate_free_bet_current_value(
        FreeBetCalculationInput(
            profile_id=profile_id,
            record_id=payload.free_bet_id or "preview",
            status=payload.status,
            result=payload.result,
            retention_mode=payload.retention_mode,
            free_bet_value=payload.free_bet_value,
            back_odds=payload.back_odds,
            match_strategy=payload.match_strategy,
            lay_odds_1=payload.lay_odds_1,
            lay_commission_1=resolved_commission,
            lay_actual=payload.lay_actual,
            lay_matched_stake_1=payload.lay_matched_stake_1,
            default_underlay_factor=tracker_settings.default_free_bet_underlay_factor,
            default_overlay_factor=tracker_settings.default_free_bet_overlay_factor,
            expiry_datetime=payload.expiry_datetime,
            date_settled=payload.date_settled,
            manual_override_value=payload.manual_override_value,
            manual_override_reason=payload.manual_override_reason,
        ),
        as_of_datetime=datetime.now(),
    )
    return FreeBetCalculationPreviewResponse.model_validate(
        {
            "lay_commission_1": resolved_commission or None,
            **serialize_calculation(calculation),
        }
    )


@router.get("/{free_bet_id}", response_model=FreeBetResponse)
def get_profile_free_bet(profile_id: str, free_bet_id: str) -> FreeBetResponse:
    record = get_free_bet(profile_id, free_bet_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Free bet not found for this profile")
    tracker_settings = get_profile_tracker_settings(profile_id)
    return build_response(record, tracker_settings=tracker_settings)


@router.post("", response_model=FreeBetResponse, status_code=201)
def create_profile_free_bet(profile_id: str, payload: FreeBetPayload) -> FreeBetResponse:
    created = create_free_bet(profile_id, payload.model_dump())
    tracker_settings = get_profile_tracker_settings(profile_id)
    return build_response(created, tracker_settings=tracker_settings)


@router.put("/{free_bet_id}", response_model=FreeBetResponse)
def update_profile_free_bet(
    profile_id: str, free_bet_id: str, payload: FreeBetPayload
) -> FreeBetResponse:
    updated = update_free_bet(profile_id, free_bet_id, payload.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Free bet not found for this profile")
    tracker_settings = get_profile_tracker_settings(profile_id)
    return build_response(updated, tracker_settings=tracker_settings)


@router.delete("/{free_bet_id}", status_code=204)
def remove_profile_free_bet(profile_id: str, free_bet_id: str) -> Response:
    deleted = delete_free_bet(profile_id, free_bet_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Free bet not found for this profile")
    return Response(status_code=204)
