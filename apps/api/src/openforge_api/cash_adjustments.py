from __future__ import annotations

from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from openforge_api.calculations.cash_adjustment_values import (
    CashAdjustmentCalculationInput,
    CashAdjustmentCalculationResult,
    calculate_cash_adjustment_values,
)
from openforge_api.db import (
    create_cash_adjustment,
    delete_cash_adjustment,
    get_cash_adjustment,
    list_cash_adjustments,
    update_cash_adjustment,
)

router = APIRouter(prefix="/profiles/{profile_id}/cash-adjustments", tags=["cash-adjustments"])

DirectionValue = Literal["In", "Out"]
AdjustmentTypeValue = Literal[
    "Correction",
    "Deduction",
    "Deposit",
    "Subscription",
    "TopUp",
    "Withdrawal",
    "Management Fee Withdrawal",
    "Investment Fee Withdrawal",
]


class CashAdjustmentPayload(BaseModel):
    cash_adjustment_id: str | None = Field(default=None, max_length=64)
    adjustment_date: str = Field(min_length=1, max_length=60)
    direction: DirectionValue
    amount: str = Field(min_length=1, max_length=40)
    adjustment_type: AdjustmentTypeValue
    affects_investment: bool = False
    affects_cash_snapshot: bool = False
    linked_account: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def validate_direction_type_combination(self) -> "CashAdjustmentPayload":
        if self.direction == "In" and self.adjustment_type in {
            "Withdrawal",
            "Deduction",
            "Subscription",
            "Management Fee Withdrawal",
            "Investment Fee Withdrawal",
        }:
            msg = (
                "direction 'In' cannot be combined with Withdrawal, Deduction, or Subscription"
            )
            raise ValueError(msg)
        if self.direction == "Out" and self.adjustment_type in {"Deposit", "TopUp"}:
            msg = "direction 'Out' cannot be combined with Deposit or TopUp"
            raise ValueError(msg)
        return self


class CashAdjustmentResponse(BaseModel):
    cash_adjustment_id: str
    profile_id: str
    adjustment_date: str
    direction: str
    amount: str
    adjustment_type: str
    affects_investment: bool
    affects_cash_snapshot: bool
    linked_account: str
    description: str
    created_at: str
    updated_at: str
    signed_amount: str | None
    week_label: str
    calculation_state: str
    calculation_notes: list[str]


def format_decimal(value: Decimal | None, *, decimals: int) -> str | None:
    if value is None:
        return None
    return f"{value:.{decimals}f}"


def serialize_calculation(calculation: CashAdjustmentCalculationResult) -> dict[str, object]:
    return {
        "signed_amount": format_decimal(calculation.signed_amount, decimals=2),
        "week_label": calculation.week_label,
        "calculation_state": calculation.calculation_state,
        "calculation_notes": list(calculation.calculation_notes),
    }


def build_response(row: object) -> CashAdjustmentResponse:
    record = row.__dict__
    calculation = calculate_cash_adjustment_values(
        CashAdjustmentCalculationInput(
            profile_id=record["profile_id"],
            record_id=record["cash_adjustment_id"],
            adjustment_date=record["adjustment_date"],
            direction=record["direction"],
            amount=record["amount"],
            adjustment_type=record["adjustment_type"],
        )
    )
    return CashAdjustmentResponse.model_validate(
        {
            **record,
            **serialize_calculation(calculation),
        }
    )


@router.get("", response_model=list[CashAdjustmentResponse])
def list_profile_cash_adjustments(profile_id: str) -> list[CashAdjustmentResponse]:
    return [build_response(row) for row in list_cash_adjustments(profile_id)]


@router.get("/{cash_adjustment_id}", response_model=CashAdjustmentResponse)
def get_profile_cash_adjustment(
    profile_id: str,
    cash_adjustment_id: str,
) -> CashAdjustmentResponse:
    record = get_cash_adjustment(profile_id, cash_adjustment_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Cash adjustment not found for this profile")
    return build_response(record)


@router.post("", response_model=CashAdjustmentResponse, status_code=201)
def create_profile_cash_adjustment(
    profile_id: str,
    payload: CashAdjustmentPayload,
) -> CashAdjustmentResponse:
    created = create_cash_adjustment(profile_id, payload.model_dump())
    return build_response(created)


@router.put("/{cash_adjustment_id}", response_model=CashAdjustmentResponse)
def update_profile_cash_adjustment(
    profile_id: str,
    cash_adjustment_id: str,
    payload: CashAdjustmentPayload,
) -> CashAdjustmentResponse:
    try:
        updated = update_cash_adjustment(profile_id, cash_adjustment_id, payload.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if updated is None:
        raise HTTPException(status_code=404, detail="Cash adjustment not found for this profile")
    return build_response(updated)


@router.delete("/{cash_adjustment_id}", status_code=204)
def delete_profile_cash_adjustment(
    profile_id: str,
    cash_adjustment_id: str,
) -> None:
    try:
        deleted = delete_cash_adjustment(profile_id, cash_adjustment_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Cash adjustment not found for this profile")
