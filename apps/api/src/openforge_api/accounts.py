from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from openforge_api.db import (
    create_account,
    get_account,
    get_bookmaker_catalogue_entry,
    list_accounts,
    update_account,
)

router = APIRouter(prefix="/profiles/{profile_id}/accounts", tags=["accounts"])

AccountTypeValue = Literal["Bookie", "Exchange", "Bank"]
ChannelValue = Literal["Online", "Retail", "Unknown"]
StatusValue = Literal[
    "Active",
    "Limited",
    "Gubbed",
    "Blocked",
    "Not Using",
    "Closed",
    "Pending Sign Up",
    "Inactive",
    "Archived",
]


class AccountPayload(BaseModel):
    account_id: str | None = Field(default=None, max_length=64)
    bookmaker_id: str | None = Field(default=None, max_length=64)
    account: str = Field(min_length=1, max_length=120)
    type: AccountTypeValue
    counts_in_cash_total: bool = True
    channel: ChannelValue = "Unknown"
    status: StatusValue
    current_balance: str = Field(default="", max_length=40)
    pending_withdrawal_amount: str = Field(default="", max_length=40)
    last_balance_update: str = Field(default="", max_length=60)
    group_name: str = Field(default="", max_length=120)
    platform: str = Field(default="", max_length=120)


class AccountResponse(AccountPayload):
    account_id: str
    profile_id: str
    created_at: str
    updated_at: str


def resolve_catalogue_fields(payload: AccountPayload) -> dict[str, object]:
    values = payload.model_dump()
    if payload.type != "Bookie":
        values["bookmaker_id"] = None
        return values
    if not payload.bookmaker_id:
        return values

    catalogue = get_bookmaker_catalogue_entry(payload.bookmaker_id)
    if catalogue is None:
        raise HTTPException(status_code=422, detail="Bookmaker catalogue entry not found")
    values.update(
        account=catalogue.brand_name,
        group_name=catalogue.operator_group,
        platform=catalogue.platform,
    )
    return values


@router.get("", response_model=list[AccountResponse])
def list_profile_accounts(profile_id: str) -> list[AccountResponse]:
    return [AccountResponse.model_validate(row.__dict__) for row in list_accounts(profile_id)]


@router.get("/{account_id}", response_model=AccountResponse)
def get_profile_account(profile_id: str, account_id: str) -> AccountResponse:
    record = get_account(profile_id, account_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Account not found for this profile")
    return AccountResponse.model_validate(record.__dict__)


@router.post("", response_model=AccountResponse, status_code=201)
def create_profile_account(profile_id: str, payload: AccountPayload) -> AccountResponse:
    created = create_account(profile_id, resolve_catalogue_fields(payload))
    return AccountResponse.model_validate(created.__dict__)


@router.put("/{account_id}", response_model=AccountResponse)
def update_profile_account(
    profile_id: str,
    account_id: str,
    payload: AccountPayload,
) -> AccountResponse:
    updated = update_account(profile_id, account_id, resolve_catalogue_fields(payload))
    if updated is None:
        raise HTTPException(status_code=404, detail="Account not found for this profile")
    return AccountResponse.model_validate(updated.__dict__)
