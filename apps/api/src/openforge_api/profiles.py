from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from openforge_api.db import get_profile, list_profiles, update_profile_metadata

router = APIRouter(tags=["profiles"])


class ProfileResponse(BaseModel):
    profile_id: str
    display_name: str
    profile_code: str
    status: str
    tracking_start_date: str
    management_fee_percent: str
    investment_fee_percent: str
    current_cash_snapshot: str


class ProfileUpdatePayload(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    profile_code: str | None = Field(
        default=None, min_length=3, max_length=32, pattern=r"^[A-Z0-9-]+$"
    )
    status: Literal["Active", "Pending", "Inactive", "Paused", "Archived"] | None = None
    tracking_start_date: date | None = None
    management_fee_percent: Decimal | None = Field(default=None, ge=0, le=100)
    investment_fee_percent: Decimal | None = Field(default=None, ge=0, le=100)

    @model_validator(mode="after")
    def require_change(self) -> "ProfileUpdatePayload":
        if all(value is None for value in self.model_dump().values()):
            raise ValueError("At least one profile field is required")
        if self.tracking_start_date is not None and self.tracking_start_date > date.today():
            raise ValueError("Tracking start date cannot be in the future")
        return self


@router.get("/profiles", response_model=list[ProfileResponse])
def list_profiles_route() -> list[ProfileResponse]:
    return [ProfileResponse.model_validate(row.__dict__) for row in list_profiles()]


@router.get("/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile_route(profile_id: str) -> ProfileResponse:
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse.model_validate(profile.__dict__)


@router.patch("/profiles/{profile_id}", response_model=ProfileResponse)
def update_profile_route(profile_id: str, payload: ProfileUpdatePayload) -> ProfileResponse:
    values = payload.model_dump(exclude_none=True)
    for fee_field in ("management_fee_percent", "investment_fee_percent"):
        if fee_field in values:
            values[fee_field] = f"{values[fee_field]:.2f}"
    if "tracking_start_date" in values:
        values["tracking_start_date"] = values["tracking_start_date"].isoformat()
    try:
        profile = update_profile_metadata(profile_id, **values)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse.model_validate(profile.__dict__)
