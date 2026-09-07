from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
)
from openforge_api.db import get_profile
from openforge_api.sportsbook_odds_input import (
    validate_complete_decimal_string,
    validate_sportsbook_odds,
)

router = APIRouter(prefix="/profiles/{profile_id}/calculators", tags=["calculators"])

DECIMAL_AMOUNT_MESSAGE = "Enter a decimal amount using a full stop, for example 10.50."
COMMISSION_MESSAGE = "Enter commission as a decimal from 0 to 1, for example 0.02."


class StandardQualifyingPayload(BaseModel):
    back_stake: str = Field(max_length=40)
    back_odds: str = Field(max_length=40)
    lay_odds: str = Field(max_length=40)
    exchange_commission: str = Field(max_length=40)

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
        return validate_sportsbook_odds(value, allow_empty=False)

    @field_validator("exchange_commission", mode="before")
    @classmethod
    def validate_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        commission = Decimal(parsed)
        if commission < 0 or commission > 1:
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed


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
            status_code=422,
            detail="The calculator inputs did not produce a complete result.",
        )
    return f"{value:.2f}"


@router.post("/standard-qualifying/preview", response_model=StandardQualifyingResponse)
def preview_standard_qualifying(
    profile_id: str, payload: StandardQualifyingPayload
) -> StandardQualifyingResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id=profile_id,
            record_id="standalone-standard-qualifying-preview",
            status="Placed",
            result="Pending",
            offer_type="Sign up / Welcome",
            back_stake=payload.back_stake,
            back_odds=payload.back_odds,
            match_strategy="Standard",
            lay_odds_1=payload.lay_odds,
            lay_commission_1=payload.exchange_commission,
        ),
        as_of_date=date.today(),
    )
    return StandardQualifyingResponse(
        profile_id=profile_id,
        result_kind="reference",
        calculation_state=result.calculation_state,
        reference_lay_stake=_money(result.reference_lay_stake_standard),
        liability=_money(result.calculated_liability_1),
        pnl_if_back_wins=_money(result.scenario_pnl_if_back_wins),
        pnl_if_lay_wins=_money(result.scenario_pnl_if_lay_wins),
        matched_result=_money(result.projected_current_pnl),
    )
