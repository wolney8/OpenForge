from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from openforge_api.db import (
    create_profile_lookup_value,
    delete_profile_lookup_value,
    list_fund_manager_lookup_values,
    list_profile_lookup_values,
    update_profile_lookup_value,
)
from openforge_api.fund_manager_lookup_values import seed_default_authorities

router = APIRouter(prefix="/profiles/{profile_id}/lookup-values", tags=["lookup-values"])

LookupTypeValue = Literal[
    "bookmaker",
    "exchange",
    "group",
    "platform",
    "offer_name",
    "casino_offer_name",
    "offer_type",
    "bet_type",
    "fixture_type",
    "strategy",
    "sportsbook_status",
    "free_bet_status",
    "casino_status",
    "account_lifecycle",
    "account_restriction",
    "risk_team",
]


class LookupValuePayload(BaseModel):
    lookup_value_id: str | None = Field(default=None, max_length=64)
    lookup_type: LookupTypeValue
    option_value: str = Field(min_length=1, max_length=120)


class LookupValueResponse(LookupValuePayload):
    lookup_value_id: str
    profile_id: str
    created_at: str
    updated_at: str
    scope: Literal["fund_manager", "profile"] = "profile"


@router.get("", response_model=list[LookupValueResponse])
def list_lookup_values(profile_id: str) -> list[LookupValueResponse]:
    seed_default_authorities()
    profile_rows = [
        LookupValueResponse.model_validate(row.__dict__)
        for row in list_profile_lookup_values(profile_id)
    ]
    global_rows = [
        LookupValueResponse(
            lookup_value_id=row.lookup_value_id,
            profile_id=profile_id,
            lookup_type=row.lookup_type,  # type: ignore[arg-type]
            option_value=row.option_value,
            created_at=row.created_at,
            updated_at=row.updated_at,
            scope="fund_manager",
        )
        for row in list_fund_manager_lookup_values(active_only=True)
    ]
    return global_rows + profile_rows


@router.post("", response_model=LookupValueResponse, status_code=201)
def create_lookup_value(profile_id: str, payload: LookupValuePayload) -> LookupValueResponse:
    created = create_profile_lookup_value(profile_id, payload.model_dump())
    return LookupValueResponse.model_validate(created.__dict__)


@router.put("/{lookup_value_id}", response_model=LookupValueResponse)
def update_lookup_value(
    profile_id: str,
    lookup_value_id: str,
    payload: LookupValuePayload,
) -> LookupValueResponse:
    updated = update_profile_lookup_value(profile_id, lookup_value_id, payload.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Lookup value not found for this profile")
    return LookupValueResponse.model_validate(updated.__dict__)


@router.delete("/{lookup_value_id}", status_code=204)
def remove_lookup_value(profile_id: str, lookup_value_id: str) -> Response:
    deleted = delete_profile_lookup_value(profile_id, lookup_value_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lookup value not found for this profile")
    return Response(status_code=204)
