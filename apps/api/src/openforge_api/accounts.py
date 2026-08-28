from __future__ import annotations

import json
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.db import (
    create_account,
    create_account_with_exchange_commission,
    get_account,
    get_bookmaker_catalogue_entry,
    get_profile,
    list_accounts,
    list_bookmaker_catalogue,
    update_account,
    upsert_profile_exchange_commission,
)

router = APIRouter(prefix="/profiles/{profile_id}/accounts", tags=["accounts"])

AccountTypeValue = Literal["Bookie", "Exchange", "Bank"]
CHANNEL_LABELS = {"Online", "Mobile", "Retail", "Unknown"}
StatusValue = Literal[
    "Not Signed Up",
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
    catalogue_id: str | None = Field(default=None, max_length=64)
    bookmaker_id: str | None = Field(default=None, max_length=64)
    account: str = Field(min_length=1, max_length=120)
    type: AccountTypeValue
    counts_in_cash_total: bool = True
    channel: str = "Unknown"
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

    @field_validator("channel")
    @classmethod
    def normalize_channels(cls, value: str) -> str:
        channels = [item.strip().title() for item in value.split(",") if item.strip()]
        if not channels:
            return "Unknown"
        if "Unknown" in channels and len(channels) > 1:
            raise ValueError("Unknown cannot be combined with an operating channel")
        if any(channel not in CHANNEL_LABELS for channel in channels):
            raise ValueError("channel must use Online, Mobile, Retail, or Unknown")
        return ", ".join(dict.fromkeys(channels))


class AccountResponse(AccountPayload):
    account_id: str
    profile_id: str
    created_at: str
    updated_at: str


class AccountCreatePayload(AccountPayload):
    commission_rate: Decimal | None = Field(default=None, ge=0, le=1)


class ProfileAccountCatalogueSelectionPayload(BaseModel):
    selected: bool
    status: StatusValue = "Not Signed Up"
    current_balance: str = Field(default="0.00", max_length=40)
    counts_in_cash_total: bool = True
    commission_rate: Decimal | None = Field(default=None, ge=0, le=1)


def resolve_catalogue_fields(payload: AccountPayload) -> dict[str, object]:
    values = payload.model_dump()
    values.pop("commission_rate", None)
    legacy_lifecycle, legacy_restrictions = LEGACY_ACCOUNT_STATES.get(
        payload.status.casefold(),
        ("Active", []),
    )
    values["lifecycle_status"] = payload.lifecycle_status or legacy_lifecycle
    values["restrictions_json"] = json.dumps(
        list(dict.fromkeys([*legacy_restrictions, *payload.restrictions]))
    )
    values.pop("restrictions", None)
    master_catalogue = load_master_account_catalogue()
    expected_master_type = "Bookmaker" if payload.type == "Bookie" else payload.type
    master_entry = next(
        (
            record
            for record in master_catalogue.records
            if record.account_type == expected_master_type
            and (
                (payload.catalogue_id and record.catalogue_id == payload.catalogue_id)
                or (
                    not payload.catalogue_id
                    and record.brand_name.casefold() == payload.account.strip().casefold()
                )
            )
            and record.status == "Active"
        ),
        None,
    )
    if master_entry is None:
        raise HTTPException(status_code=422, detail="Account catalogue entry not found")
    values["catalogue_id"] = master_entry.catalogue_id
    if payload.type != "Bookie":
        values["bookmaker_id"] = None
        values.update(
            account=master_entry.brand_name,
            group_name=master_entry.operator_group,
            platform=master_entry.platform,
        )
        return values
    catalogue = (
        get_bookmaker_catalogue_entry(payload.bookmaker_id)
        if payload.bookmaker_id
        else next(
            (
                record
                for record in list_bookmaker_catalogue(include_archived=False)
                if record.brand_name.casefold() == payload.account.strip().casefold()
            ),
            None,
        )
    )
    values["bookmaker_id"] = catalogue.bookmaker_id if catalogue is not None else None
    values.update(
        account=master_entry.brand_name,
        group_name=master_entry.operator_group,
        platform=master_entry.platform,
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


@router.put(
    "/catalogue-selection/{catalogue_id}",
    response_model=AccountResponse,
)
def set_profile_catalogue_account_selection(
    profile_id: str,
    catalogue_id: str,
    payload: ProfileAccountCatalogueSelectionPayload,
) -> AccountResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    catalogue = load_master_account_catalogue()
    provider = next(
        (
            record
            for record in catalogue.records
            if record.catalogue_id == catalogue_id and record.status == "Active"
        ),
        None,
    )
    if provider is None:
        raise HTTPException(status_code=422, detail="Active Account Catalogue entry not found")

    existing = next(
        (row for row in list_accounts(profile_id) if row.catalogue_id == catalogue_id),
        None,
    )
    if not payload.selected and existing is None:
        raise HTTPException(status_code=404, detail="Profile account selection not found")
    if not payload.selected and provider.account_type == "Exchange":
        other_exchanges = [
            row
            for row in list_accounts(profile_id)
            if row.account_id != existing.account_id
            and row.type == "Exchange"
            and row.lifecycle_status != "Archived"
            and row.status != "Archived"
        ]
        if not other_exchanges:
            raise HTTPException(
                status_code=422,
                detail="A Profile must retain at least one Exchange",
            )
    if payload.selected and provider.account_type == "Exchange" and payload.commission_rate is None:
        raise HTTPException(
            status_code=422,
            detail="An Exchange commission rate is required",
        )

    type_value: AccountTypeValue = (
        "Bookie" if provider.account_type == "Bookmaker" else provider.account_type
    )
    status: StatusValue = payload.status if payload.selected else "Archived"
    lifecycle: LifecycleValue = (
        LEGACY_ACCOUNT_STATES.get(status.casefold(), ("Active", []))[0]
        if payload.selected
        else "Archived"
    )
    account_payload = AccountPayload(
        account_id=existing.account_id if existing else None,
        catalogue_id=provider.catalogue_id,
        bookmaker_id=existing.bookmaker_id if existing else None,
        account=provider.brand_name,
        type=type_value,
        counts_in_cash_total=payload.counts_in_cash_total,
        channel=", ".join(
            {"web": "Online", "mobile": "Mobile", "retail": "Retail"}[channel]
            for channel in provider.operating_channels
        ) or "Unknown",
        status=status,
        lifecycle_status=lifecycle,
        restrictions=[] if existing is None else json.loads(existing.restrictions_json),
        current_balance=(
            payload.current_balance if payload.selected else existing.current_balance
        ),
        pending_withdrawal_amount=(
            existing.pending_withdrawal_amount if existing else "0.00"
        ),
        last_balance_update=existing.last_balance_update if existing else "",
        group_name=provider.operator_group,
        platform=provider.platform,
        sign_up_date=existing.sign_up_date if existing else "",
        notes=existing.notes if existing else "",
    )
    resolved = resolve_catalogue_fields(account_payload)
    saved = (
        update_account(profile_id, existing.account_id, resolved)
        if existing
        else create_account(profile_id, resolved)
    )
    assert saved is not None
    if payload.selected and provider.account_type == "Exchange":
        assert payload.commission_rate is not None
        upsert_profile_exchange_commission(
            profile_id,
            provider.brand_name,
            str(payload.commission_rate),
        )
    return build_account_response(saved)


@router.get("/{account_id}", response_model=AccountResponse)
def get_profile_account(profile_id: str, account_id: str) -> AccountResponse:
    record = get_account(profile_id, account_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Account not found for this profile")
    return build_account_response(record)


@router.post("", response_model=AccountResponse, status_code=201)
def create_profile_account(profile_id: str, payload: AccountCreatePayload) -> AccountResponse:
    if payload.type == "Exchange" and payload.commission_rate is None:
        raise HTTPException(
            status_code=422,
            detail="An Exchange commission rate is required",
        )
    created = create_account_with_exchange_commission(
        profile_id,
        resolve_catalogue_fields(payload),
        str(payload.commission_rate) if payload.type == "Exchange" else None,
    )
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
