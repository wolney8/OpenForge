from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field, model_validator

from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    SportsbookCalculationResult,
    calculate_sportsbook_current_value,
)
from openforge_api.db import (
    create_sportsbook_bet,
    delete_sportsbook_bet,
    get_profile_exchange_commission,
    get_sportsbook_bet,
    list_sportsbook_bets,
    update_sportsbook_bet,
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


def format_decimal(value: Decimal | None, *, decimals: int) -> str | None:
    if value is None:
        return None
    return f"{value:.{decimals}f}"


def build_response(
    profile_id: str,
    row: object,
    *,
    as_of_date: date,
) -> SportsbookBetResponse:
    record = row.__dict__
    calculation = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id=record["profile_id"],
            record_id=record["sportsbook_bet_id"],
            status=record["status"],
            result=record["result"],
            offer_type=record["offer_type"],
            back_stake=record["back_stake"],
            back_odds=record["back_odds"],
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


@router.get("", response_model=list[SportsbookBetResponse])
def list_profile_sportsbook_bets(profile_id: str) -> list[SportsbookBetResponse]:
    return [
        build_response(profile_id, row, as_of_date=date.today())
        for row in list_sportsbook_bets(profile_id)
    ]


@router.post("/preview", response_model=SportsbookCalculationPreviewResponse)
def preview_profile_sportsbook_bet(
    profile_id: str, payload: SportsbookBetPayload
) -> SportsbookCalculationPreviewResponse:
    resolved_commission = get_profile_exchange_commission(profile_id, payload.exchange_name)
    calculation = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id=profile_id,
            record_id=payload.sportsbook_bet_id or "preview",
            status=payload.status,
            result=payload.result,
            offer_type=payload.offer_type,
            back_stake=payload.back_stake,
            back_odds=payload.back_odds,
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
        }
    )


@router.get("/{sportsbook_bet_id}", response_model=SportsbookBetResponse)
def get_profile_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> SportsbookBetResponse:
    record = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return build_response(profile_id, record, as_of_date=date.today())


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
