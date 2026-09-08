from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    calculate_free_bet_current_value,
)
from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
)
from openforge_api.db import get_profile
from openforge_api.sportsbook_odds_input import (
    normalize_calculator_odds,
    validate_complete_decimal_string,
)

router = APIRouter(tags=["calculators"])
DECIMAL_AMOUNT_MESSAGE = "Enter a decimal amount using a full stop, for example 10.50."
COMMISSION_MESSAGE = "Enter commission as a decimal from 0 to 1, for example 0.02."
PERCENT_MESSAGE = "Enter a percentage from 0 to 100."


class MatchedBettingPayload(BaseModel):
    bet_type: Literal["qualifying", "free_bet", "money_back"] = "qualifying"
    free_bet_mode: Literal["SNR", "SR"] = "SNR"
    promotion_mode: Literal["standard", "cashback"] = "standard"
    strategy: Literal["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"] = "Standard"
    back_stake: str = Field(max_length=40)
    back_odds: str = Field(max_length=40)
    lay_odds: str = Field(max_length=40)
    exchange_commission: str = Field(max_length=40)
    manual_lay_stake: str = Field(default="", max_length=40)
    promotion_value: str = Field(default="", max_length=40)
    retention_percent: str = Field(default="70", max_length=40)
    underlay_factor: str = Field(default="0.928", max_length=40)
    overlay_factor: str = Field(default="1.300", max_length=40)

    @field_validator("back_stake", mode="before")
    @classmethod
    def validate_back_stake(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_stake_positive", "Enter a back stake greater than zero."
            )
        return parsed

    @field_validator("back_odds", "lay_odds", mode="before")
    @classmethod
    def validate_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)

    @field_validator("exchange_commission", mode="before")
    @classmethod
    def validate_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        commission = Decimal(parsed)
        if commission < 0 or commission > 1:
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed

    @field_validator("manual_lay_stake", "promotion_value", mode="before")
    @classmethod
    def validate_optional_money(cls, value: Any) -> str:
        if value == "":
            return ""
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_amount_positive", "Enter an amount greater than zero."
            )
        return parsed

    @field_validator("retention_percent", mode="before")
    @classmethod
    def validate_retention(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=PERCENT_MESSAGE)
        if Decimal(parsed) < 0 or Decimal(parsed) > 100:
            raise PydanticCustomError("calculator_percentage_range", PERCENT_MESSAGE)
        return parsed

    @field_validator("underlay_factor", "overlay_factor", mode="before")
    @classmethod
    def validate_factor(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_factor_positive", "Enter a factor greater than zero."
            )
        return parsed

    @model_validator(mode="after")
    def validate_mode_fields(self) -> "MatchedBettingPayload":
        if self.strategy in {"Custom", "Partial Lay"} and not self.manual_lay_stake:
            raise PydanticCustomError(
                "calculator_manual_lay_required", "Enter the explicit lay stake for this strategy."
            )
        if (
            self.bet_type == "money_back"
            or (self.bet_type == "qualifying" and self.promotion_mode == "cashback")
        ) and not self.promotion_value:
            raise PydanticCustomError(
                "calculator_promotion_value_required", "Enter the cashback or refund value."
            )
        return self


class MatchedBettingResponse(BaseModel):
    result_kind: Literal["reference"] = "reference"
    calculation_state: str
    calculator_family: Literal["matched-betting"] = "matched-betting"
    canonical_back_odds: str
    canonical_lay_odds: str
    selected_lay_stake: str
    reference_lay_stake_standard: str
    reference_lay_stake_underlay: str
    reference_lay_stake_overlay: str
    liability: str
    pnl_if_back_wins: str
    pnl_if_lay_wins: str
    matched_result: str
    promotion_trigger_result: str | None = None


class StandardQualifyingResponse(BaseModel):
    profile_id: str
    result_kind: str
    calculation_state: str
    reference_lay_stake: str
    liability: str
    pnl_if_back_wins: str
    pnl_if_lay_wins: str
    matched_result: str


def _money(value: Decimal | None) -> str:
    if value is None:
        raise HTTPException(
            status_code=422, detail="The calculator inputs did not produce a complete result."
        )
    return f"{value:.2f}"


def _calculate(payload: MatchedBettingPayload) -> MatchedBettingResponse:
    if payload.bet_type == "free_bet":
        free_result = calculate_free_bet_current_value(
            FreeBetCalculationInput(
                profile_id="standalone",
                record_id="standalone-matched-betting-preview",
                status="Placed",
                result="Pending",
                retention_mode=payload.free_bet_mode,
                free_bet_value=payload.back_stake,
                back_odds=payload.back_odds,
                match_strategy=payload.strategy,
                lay_odds_1=payload.lay_odds,
                lay_commission_1=payload.exchange_commission,
                lay_actual=payload.manual_lay_stake,
                default_underlay_factor=payload.underlay_factor,
                default_overlay_factor=payload.overlay_factor,
            ),
            as_of_datetime=datetime.now(timezone.utc),
        )
        standard, underlay, overlay = (
            free_result.base_reference_lay_stake,
            free_result.underlay_reference_lay_stake,
            free_result.overlay_reference_lay_stake,
        )
        calculation_state = free_result.calculation_state
        actual_lay_stake = free_result.actual_lay_stake_1
        liability = free_result.calculated_liability_1
        pnl_back = free_result.scenario_pnl_if_back_wins
        pnl_lay = free_result.scenario_pnl_if_lay_wins
        matched = free_result.projected_current_pnl
        promotion_trigger_result = None
    else:
        offer_type = (
            "Refund"
            if payload.bet_type == "money_back"
            else ("Cashback" if payload.promotion_mode == "cashback" else "")
        )
        sportsbook_result = calculate_sportsbook_current_value(
            SportsbookCalculationInput(
                profile_id="standalone",
                record_id="standalone-matched-betting-preview",
                status="Placed",
                result="Pending",
                offer_type=offer_type,
                back_stake=payload.back_stake,
                back_odds=payload.back_odds,
                match_strategy=payload.strategy,
                bonus_trigger="Lay Wins" if offer_type else "",
                maximum_bonus=payload.promotion_value,
                bonus_retention_rate=payload.retention_percent,
                lay_odds_1=payload.lay_odds,
                lay_commission_1=payload.exchange_commission,
                lay_actual=payload.manual_lay_stake,
            ),
            as_of_date=date.today(),
        )
        standard, underlay, overlay = (
            sportsbook_result.reference_lay_stake_standard,
            sportsbook_result.reference_lay_stake_underlay,
            sportsbook_result.reference_lay_stake_overlay,
        )
        calculation_state = sportsbook_result.calculation_state
        actual_lay_stake = sportsbook_result.actual_lay_stake_1
        liability = sportsbook_result.calculated_liability_1
        pnl_back = sportsbook_result.scenario_pnl_if_back_wins
        pnl_lay = sportsbook_result.scenario_pnl_if_lay_wins
        matched = sportsbook_result.projected_current_pnl
        promotion_trigger_result = sportsbook_result.scenario_pnl_if_outcome_2_wins

    return MatchedBettingResponse(
        calculation_state=calculation_state,
        canonical_back_odds=payload.back_odds,
        canonical_lay_odds=payload.lay_odds,
        selected_lay_stake=_money(actual_lay_stake),
        reference_lay_stake_standard=_money(standard),
        reference_lay_stake_underlay=_money(underlay),
        reference_lay_stake_overlay=_money(overlay),
        liability=_money(liability),
        pnl_if_back_wins=_money(pnl_back),
        pnl_if_lay_wins=_money(pnl_lay),
        matched_result=_money(matched),
        promotion_trigger_result=_money(promotion_trigger_result)
        if promotion_trigger_result is not None
        else None,
    )


@router.post(
    "/fund-manager/calculators/matched-betting/preview", response_model=MatchedBettingResponse
)
def preview_matched_betting(payload: MatchedBettingPayload) -> MatchedBettingResponse:
    return _calculate(payload)


@router.post(
    "/profiles/{profile_id}/calculators/standard-qualifying/preview",
    response_model=StandardQualifyingResponse,
)
def preview_standard_qualifying(
    profile_id: str, payload: MatchedBettingPayload
) -> StandardQualifyingResponse:
    """Compatibility endpoint for the original profile-scoped calculator URL."""
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    result = _calculate(
        payload.model_copy(update={"bet_type": "qualifying", "strategy": "Standard"})
    )
    return StandardQualifyingResponse(
        profile_id=profile_id,
        result_kind=result.result_kind,
        calculation_state=result.calculation_state,
        reference_lay_stake=result.selected_lay_stake,
        liability=result.liability,
        pnl_if_back_wins=result.pnl_if_back_wins,
        pnl_if_lay_wins=result.pnl_if_lay_wins,
        matched_result=result.matched_result,
    )
