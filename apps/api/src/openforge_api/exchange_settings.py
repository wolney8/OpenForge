from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    list_profile_exchange_commissions,
    upsert_profile_exchange_commission,
)

router = APIRouter(prefix="/profiles/{profile_id}/exchange-commissions", tags=["exchange-settings"])


class ExchangeCommissionPayload(BaseModel):
    exchange_name: str = Field(min_length=1, max_length=120)
    commission_rate: str = Field(default="", max_length=40)

    @field_validator("commission_rate")
    @classmethod
    def validate_decimal(cls, value: str) -> str:
        normalized = value.strip()
        if normalized:
            Decimal(normalized)
        return normalized


class ExchangeCommissionResponse(ExchangeCommissionPayload):
    profile_id: str
    created_at: str
    updated_at: str


@router.get("", response_model=list[ExchangeCommissionResponse])
def list_exchange_commissions(profile_id: str) -> list[ExchangeCommissionResponse]:
    return [
        ExchangeCommissionResponse.model_validate(record.__dict__)
        for record in list_profile_exchange_commissions(profile_id)
    ]


@router.put("", response_model=ExchangeCommissionResponse)
def save_exchange_commission(
    profile_id: str, payload: ExchangeCommissionPayload
) -> ExchangeCommissionResponse:
    saved = upsert_profile_exchange_commission(
        profile_id,
        payload.exchange_name,
        payload.commission_rate,
    )
    return ExchangeCommissionResponse.model_validate(saved.__dict__)
