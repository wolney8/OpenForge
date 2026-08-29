from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator, model_validator

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.db import (
    create_profile_with_onboarding,
    get_profile,
    get_profile_onboarding_settings,
    link_fund_manager_profile,
    list_fund_manager_combo_presets,
    list_profiles,
    update_profile_metadata,
)

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


ProfileModule = Literal[
    "sportsbook-bets",
    "free-bets",
    "casino-offers",
    "each-way-extra-places",
    "cash-adjustments",
]
ProfileAccountStatus = Literal[
    "Not Signed Up",
    "Active",
    "Bonus Restricted",
    "Limited",
    "Gubbed",
    "Blocked",
    "Not Using",
    "Closed",
    "Pending Sign Up",
]
ALWAYS_ON_MODULES = {"sportsbook-bets", "free-bets", "cash-adjustments"}
QUICK_ACTION_LEDGER_MODULES = {
    "Sportsbook": "sportsbook-bets",
    "Free Bets": "free-bets",
    "Casino": "casino-offers",
    "Cash Adjustments": "cash-adjustments",
    "Extra Place": "each-way-extra-places",
}


class ProfileOnboardingAccountPayload(BaseModel):
    catalogue_id: str = Field(min_length=3, max_length=64)
    status: ProfileAccountStatus = "Not Signed Up"
    opening_balance: Decimal = Field(default=Decimal("0"), ge=0)
    pending_withdrawal_amount: Decimal = Field(default=Decimal("0"), ge=0)
    counts_in_cash_total: bool = True
    restrictions: list[str] = Field(default_factory=list, max_length=12)
    notes: str = Field(default="", max_length=1000)
    commission_rate: Decimal | None = Field(default=None, ge=0, le=1)

    @field_validator("commission_rate", mode="before")
    @classmethod
    def normalize_blank_commission(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class ProfileOnboardingQuickActionPayload(BaseModel):
    preset_id: str = Field(min_length=1, max_length=64)
    ledger_type: Literal[
        "Sportsbook", "Free Bets", "Casino", "Cash Adjustments", "Extra Place"
    ]
    favourite_order: int = Field(ge=1, le=4)


class ProfileOnboardingCreatePayload(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    profile_code: str = Field(
        min_length=3, max_length=32, pattern=r"^[A-Z0-9-]+$"
    )
    tracking_start_date: date
    management_fee_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    investment_fee_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    active_date_preset: Literal[
        "Today",
        "This Week",
        "Week (Mon-Sun)",
        "Past 7 Days",
        "This Month",
        "This Year",
        "All Dates",
    ] = "This Month"
    iteration_number: int = Field(default=1, ge=1, le=9999)
    starting_bankroll: Decimal = Field(default=Decimal("0"), ge=0)
    operating_jurisdiction: Literal["GB"] = "GB"
    enabled_modules: list[ProfileModule]
    weekly_extra_place_loss_budget: Decimal = Field(
        default=Decimal("15"), ge=0
    )
    main_bank_catalogue_id: str = Field(default="", max_length=64)
    accounts: list[ProfileOnboardingAccountPayload] = Field(default_factory=list)
    quick_actions: list[ProfileOnboardingQuickActionPayload] = Field(default_factory=list)
    preferences: dict[str, str | bool | int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_profile_onboarding(self) -> "ProfileOnboardingCreatePayload":
        if self.tracking_start_date > date.today():
            raise ValueError("Tracking start date cannot be in the future")
        if self.management_fee_percent + self.investment_fee_percent > 100:
            raise ValueError("Combined management and investment fees cannot exceed 100%")
        if not ALWAYS_ON_MODULES.issubset(set(self.enabled_modules)):
            raise ValueError(
                "Sportsbook, Free Bets, and Cash Adjustments must remain enabled"
            )
        if len(self.enabled_modules) != len(set(self.enabled_modules)):
            raise ValueError("Enabled modules must not contain duplicates")
        account_ids = [account.catalogue_id for account in self.accounts]
        if len(account_ids) != len(set(account_ids)):
            raise ValueError("Each catalogue account may be selected only once")
        if self.main_bank_catalogue_id and self.main_bank_catalogue_id not in account_ids:
            raise ValueError("Main bank must be one of the selected Profile accounts")
        action_keys = [
            (action.preset_id, action.ledger_type) for action in self.quick_actions
        ]
        if len(action_keys) != len(set(action_keys)):
            raise ValueError("Each Quick Action may be selected once per ledger")
        for ledger_type in {action.ledger_type for action in self.quick_actions}:
            orders = [
                action.favourite_order
                for action in self.quick_actions
                if action.ledger_type == ledger_type
            ]
            if len(orders) != len(set(orders)):
                raise ValueError("Quick Action favourite positions must be unique per ledger")
            if QUICK_ACTION_LEDGER_MODULES[ledger_type] not in self.enabled_modules:
                raise ValueError(
                    f"Quick Actions cannot target the disabled {ledger_type} module"
                )
        return self


class ProfileOnboardingResponse(BaseModel):
    profile_id: str
    iteration_number: int
    starting_bankroll: str
    main_bank_catalogue_id: str
    enabled_modules: list[ProfileModule]
    preferences: dict[str, str | bool | int]
    onboarding_status: str
    created_at: str
    updated_at: str


class ProfileOnboardingCreateResponse(BaseModel):
    profile: ProfileResponse
    onboarding: ProfileOnboardingResponse
    selected_account_count: int
    selected_quick_action_count: int


@router.get("/profiles", response_model=list[ProfileResponse])
def list_profiles_route() -> list[ProfileResponse]:
    return [ProfileResponse.model_validate(row.__dict__) for row in list_profiles()]


@router.get("/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile_route(profile_id: str) -> ProfileResponse:
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse.model_validate(profile.__dict__)


@router.get(
    "/profiles/{profile_id}/onboarding", response_model=ProfileOnboardingResponse | None
)
def get_profile_onboarding_route(profile_id: str) -> ProfileOnboardingResponse | None:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    record = get_profile_onboarding_settings(profile_id)
    if record is None:
        return None
    return ProfileOnboardingResponse(
        profile_id=record.profile_id,
        iteration_number=record.iteration_number,
        starting_bankroll=record.starting_bankroll,
        main_bank_catalogue_id=record.main_bank_catalogue_id,
        enabled_modules=json.loads(record.enabled_modules_json),
        preferences=json.loads(record.preferences_json),
        onboarding_status=record.onboarding_status,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.post(
    "/profiles/onboarding",
    response_model=ProfileOnboardingCreateResponse,
    status_code=201,
)
def create_profile_onboarding_route(
    payload: ProfileOnboardingCreatePayload,
    request: Request,
) -> ProfileOnboardingCreateResponse:
    catalogue = load_master_account_catalogue()
    active_records = {
        record.catalogue_id: record
        for record in catalogue.records
        if record.status == "Active"
    }
    missing_ids = sorted(
        account.catalogue_id
        for account in payload.accounts
        if account.catalogue_id not in active_records
    )
    if missing_ids:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Selected accounts must be active global catalogue providers",
                "catalogue_ids": missing_ids,
            },
        )
    unavailable_ids = sorted(
        account.catalogue_id
        for account in payload.accounts
        if payload.operating_jurisdiction
        not in active_records[account.catalogue_id].operating_jurisdictions
    )
    if unavailable_ids:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Selected accounts must support the Profile operating jurisdiction",
                "operating_jurisdiction": payload.operating_jurisdiction,
                "catalogue_ids": unavailable_ids,
            },
        )
    if payload.main_bank_catalogue_id:
        main_bank = active_records.get(payload.main_bank_catalogue_id)
        if main_bank is None or main_bank.account_type != "Bank":
            raise HTTPException(
                status_code=422,
                detail="Main bank must reference an active global Bank provider",
            )

    selected_exchanges = [
        account
        for account in payload.accounts
        if active_records[account.catalogue_id].account_type == "Exchange"
    ]
    if not selected_exchanges:
        raise HTTPException(
            status_code=422,
            detail="Select at least one Exchange for this Profile",
        )
    exchanges_without_commission = [
        account.catalogue_id
        for account in selected_exchanges
        if account.commission_rate is None
    ]
    if exchanges_without_commission:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Each selected Exchange requires a Profile commission rate",
                "catalogue_ids": exchanges_without_commission,
            },
        )

    active_quick_actions: dict[str, dict[str, object]] = {}
    for preset in list_fund_manager_combo_presets(active_only=True):
        try:
            quick_add = json.loads(preset.quick_add_json)
        except json.JSONDecodeError:
            continue
        if isinstance(quick_add, dict) and quick_add.get("enabled") is True:
            active_quick_actions[preset.preset_id] = quick_add
    invalid_quick_actions: list[str] = []
    for selection in payload.quick_actions:
        config = active_quick_actions.get(selection.preset_id)
        supported_ledgers = config.get("supported_ledgers", []) if config else []
        if selection.ledger_type not in supported_ledgers:
            invalid_quick_actions.append(
                f"{selection.preset_id}:{selection.ledger_type}"
            )
    if invalid_quick_actions:
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Selected Quick Actions must be active global actions "
                    "for the chosen ledger"
                ),
                "quick_actions": sorted(invalid_quick_actions),
            },
        )

    resolved_accounts: list[dict[str, object]] = []
    exchange_commissions: list[dict[str, str]] = []
    current_cash_snapshot = Decimal("0")
    default_exchange_name = ""
    for selected in payload.accounts:
        provider = active_records[selected.catalogue_id]
        account_type = "Bookie" if provider.account_type == "Bookmaker" else provider.account_type
        lifecycle_status = {
            "Not Signed Up": "Not Signed Up",
            "Pending Sign Up": "Pending Sign Up",
            "Closed": "Closed",
            "Blocked": "Suspended",
        }.get(selected.status, "Active")
        if selected.counts_in_cash_total:
            current_cash_snapshot += selected.opening_balance
        if provider.account_type == "Exchange" and not default_exchange_name:
            default_exchange_name = provider.brand_name
        if provider.account_type == "Exchange":
            assert selected.commission_rate is not None
            exchange_commissions.append(
                {
                    "exchange_name": provider.brand_name,
                    "commission_rate": str(selected.commission_rate),
                }
            )
        resolved_accounts.append(
            {
                "account_id": f"AC-{uuid4().hex[:8].upper()}",
                "catalogue_id": provider.catalogue_id,
                "bookmaker_id": None,
                "account": provider.brand_name,
                "type": account_type,
                "counts_in_cash_total": selected.counts_in_cash_total,
                "channel": ", ".join(
                    {
                        "web": "Online",
                        "mobile": "Mobile",
                        "retail": "Retail",
                    }[channel]
                    for channel in provider.operating_channels
                )
                or "Unknown",
                "status": selected.status,
                "lifecycle_status": lifecycle_status,
                "restrictions_json": json.dumps(selected.restrictions),
                "current_balance": f"{selected.opening_balance:.2f}",
                "pending_withdrawal_amount": (
                    f"{selected.pending_withdrawal_amount:.2f}"
                ),
                "group_name": provider.operator_group,
                "platform": provider.platform,
                "notes": selected.notes,
            }
        )

    values = payload.model_dump()
    values["preferences"] = {
        **payload.preferences,
        "operating_jurisdiction": payload.operating_jurisdiction,
    }
    values.update(
        profile_id=f"profile-{uuid4().hex[:12]}",
        tracking_start_date=payload.tracking_start_date.isoformat(),
        management_fee_percent=f"{payload.management_fee_percent:.2f}",
        investment_fee_percent=f"{payload.investment_fee_percent:.2f}",
        starting_bankroll=f"{payload.starting_bankroll:.2f}",
        weekly_extra_place_loss_budget=(
            f"{payload.weekly_extra_place_loss_budget:.2f}"
        ),
        current_cash_snapshot=f"{current_cash_snapshot:.2f}",
        default_exchange_name=default_exchange_name,
        accounts=resolved_accounts,
        exchange_commissions=exchange_commissions,
        quick_actions=[action.model_dump() for action in payload.quick_actions],
    )
    try:
        profile, onboarding = create_profile_with_onboarding(values)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    auth_session = getattr(request.state, "auth_session", None)
    if auth_session is not None:
        link_fund_manager_profile(email=auth_session.email, profile_id=profile.profile_id)
    return ProfileOnboardingCreateResponse(
        profile=ProfileResponse.model_validate(profile.__dict__),
        onboarding=ProfileOnboardingResponse(
            profile_id=onboarding.profile_id,
            iteration_number=onboarding.iteration_number,
            starting_bankroll=onboarding.starting_bankroll,
            main_bank_catalogue_id=onboarding.main_bank_catalogue_id,
            enabled_modules=json.loads(onboarding.enabled_modules_json),
            preferences=json.loads(onboarding.preferences_json),
            onboarding_status=onboarding.onboarding_status,
            created_at=onboarding.created_at,
            updated_at=onboarding.updated_at,
        ),
        selected_account_count=len(resolved_accounts),
        selected_quick_action_count=len(payload.quick_actions),
    )


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
