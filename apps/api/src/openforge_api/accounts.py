from __future__ import annotations

import json
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
    "Bonus Restricted",
    "Limited",
    "Gubbed",
    "Blocked",
    "Not Using",
    "Closed",
    "Pending Sign Up",
    "Inactive",
    "Archived",
]
LifecycleValue = Literal[
    "Not Signed Up",
    "Pending Sign Up",
    "Verification Pending",
    "Active",
    "Suspended",
    "Closed",
    "Archived",
]
RestrictionValue = Literal[
    "Bonus Restricted",
    "Soft Limited",
    "Casino Only",
    "Sportsbook Only",
    "KYC Blocked",
    "Risk Blocked",
    "Deposit Restricted",
    "Withdrawal Restricted",
]

LEGACY_ACCOUNT_STATES: dict[str, tuple[LifecycleValue, list[RestrictionValue]]] = {
    "not signed up": ("Not Signed Up", []),
    "pending sign up": ("Pending Sign Up", []),
    "verification pending": ("Verification Pending", []),
    "gubbed": ("Active", ["Bonus Restricted"]),
    "bonus restricted": ("Active", ["Bonus Restricted"]),
    "limited": ("Active", ["Soft Limited"]),
    "blocked": ("Suspended", []),
    "inactive": ("Not Signed Up", []),
    "not using": ("Not Signed Up", []),
    "suspended": ("Suspended", []),
    "closed": ("Closed", []),
    "archived": ("Archived", []),
}


class AccountPayload(BaseModel):
    account_id: str | None = Field(default=None, max_length=64)
    bookmaker_id: str | None = Field(default=None, max_length=64)
    account: str = Field(min_length=1, max_length=120)
    type: AccountTypeValue
    counts_in_cash_total: bool = True
    channel: ChannelValue = "Unknown"
    status: StatusValue
    lifecycle_status: LifecycleValue | None = None
    restrictions: list[RestrictionValue] = Field(default_factory=list)
    current_balance: str = Field(default="", max_length=40)
    pending_withdrawal_amount: str = Field(default="", max_length=40)
    last_balance_update: str = Field(default="", max_length=60)
    group_name: str = Field(default="", max_length=120)
    platform: str = Field(default="", max_length=120)
    sign_up_date: str = Field(default="", max_length=20)
    notes: str = Field(default="", max_length=1000)


class AccountResponse(AccountPayload):
    account_id: str
    profile_id: str
    created_at: str
    updated_at: str


def resolve_catalogue_fields(payload: AccountPayload) -> dict[str, object]:
    values = payload.model_dump()
    legacy_lifecycle, legacy_restrictions = LEGACY_ACCOUNT_STATES.get(
        payload.status.casefold(),
        ("Active", []),
    )
    values["lifecycle_status"] = payload.lifecycle_status or legacy_lifecycle
    values["restrictions_json"] = json.dumps(
        list(dict.fromkeys([*legacy_restrictions, *payload.restrictions]))
    )
    values.pop("restrictions", None)
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


def build_account_response(record: object) -> AccountResponse:
    values = dict(record.__dict__)
    try:
        restrictions = json.loads(values.pop("restrictions_json", "[]"))
    except json.JSONDecodeError:
        restrictions = []
    values["restrictions"] = restrictions if isinstance(restrictions, list) else []
    return AccountResponse.model_validate(values)


@router.get("", response_model=list[AccountResponse])
def list_profile_accounts(profile_id: str) -> list[AccountResponse]:
    return [build_account_response(row) for row in list_accounts(profile_id)]


@router.get("/{account_id}", response_model=AccountResponse)
def get_profile_account(profile_id: str, account_id: str) -> AccountResponse:
    record = get_account(profile_id, account_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Account not found for this profile")
    return build_account_response(record)


@router.post("", response_model=AccountResponse, status_code=201)
def create_profile_account(profile_id: str, payload: AccountPayload) -> AccountResponse:
    created = create_account(profile_id, resolve_catalogue_fields(payload))
    return build_account_response(created)


@router.put("/{account_id}", response_model=AccountResponse)
def update_profile_account(
    profile_id: str,
    account_id: str,
    payload: AccountPayload,
) -> AccountResponse:
    updated = update_account(profile_id, account_id, resolve_catalogue_fields(payload))
    if updated is None:
        raise HTTPException(status_code=404, detail="Account not found for this profile")
    return build_account_response(updated)
