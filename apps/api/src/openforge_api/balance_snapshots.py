from __future__ import annotations

from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    create_balance_snapshot,
    get_account,
    list_balance_snapshots,
)

router = APIRouter(
    prefix="/profiles/{profile_id}/balance-snapshots", tags=["balance-snapshots"]
)


class BalanceSnapshotPayload(BaseModel):
    balance_snapshot_id: str | None = Field(default=None, max_length=64)
    snapshot_at: str = Field(min_length=1, max_length=60)
    snapshot_type: str = Field(min_length=1, max_length=80)
    account_id: str | None = Field(default=None, max_length=64)
    balance_amount: str = Field(min_length=1, max_length=40)
    notes: str = Field(default="", max_length=500)

    @field_validator("balance_amount")
    @classmethod
    def validate_balance_amount(cls, value: str) -> str:
        normalized = value.strip()
        try:
            amount = Decimal(normalized)
        except InvalidOperation as error:
            raise ValueError("Balance amount must be a decimal value") from error
        if not amount.is_finite():
            raise ValueError("Balance amount must be finite")
        return normalized


class BalanceSnapshotResponse(BalanceSnapshotPayload):
    balance_snapshot_id: str
    profile_id: str
    created_at: str


@router.get("", response_model=list[BalanceSnapshotResponse])
def list_profile_balance_snapshots(profile_id: str) -> list[BalanceSnapshotResponse]:
    return [
        BalanceSnapshotResponse.model_validate(row.__dict__)
        for row in list_balance_snapshots(profile_id)
    ]


@router.post("", response_model=BalanceSnapshotResponse, status_code=201)
def create_profile_balance_snapshot(
    profile_id: str, payload: BalanceSnapshotPayload
) -> BalanceSnapshotResponse:
    if payload.account_id and get_account(profile_id, payload.account_id) is None:
        raise HTTPException(
            status_code=422,
            detail="Snapshot account was not found for this profile",
        )
    created = create_balance_snapshot(profile_id, payload.model_dump())
    return BalanceSnapshotResponse.model_validate(created.__dict__)
