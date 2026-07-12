from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from openforge_api.db import (
    create_profile_lookup_value,
    delete_profile_lookup_value,
    list_profile_lookup_values,
    update_profile_lookup_value,
)

router = APIRouter(prefix="/profiles/{profile_id}/lookup-values", tags=["lookup-values"])

LookupTypeValue = Literal[
    "bookmaker",
    "exchange",
    "group",
    "platform",
    "offer_name",
    "casino_offer_name",
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


@router.get("", response_model=list[LookupValueResponse])
def list_lookup_values(profile_id: str) -> list[LookupValueResponse]:
    return [
        LookupValueResponse.model_validate(row.__dict__)
        for row in list_profile_lookup_values(profile_id)
    ]


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
