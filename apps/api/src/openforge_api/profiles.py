from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from openforge_api.db import get_profile, list_profiles

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


@router.get("/profiles", response_model=list[ProfileResponse])
def list_profiles_route() -> list[ProfileResponse]:
    return [ProfileResponse.model_validate(row.__dict__) for row in list_profiles()]


@router.get("/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile_route(profile_id: str) -> ProfileResponse:
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse.model_validate(profile.__dict__)
