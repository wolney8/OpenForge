from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from openforge_api.db import (
    create_fund_manager_lookup_value,
    list_fund_manager_lookup_values,
    update_fund_manager_lookup_value,
)

router = APIRouter(prefix="/fund-manager/lookup-values", tags=["fund-manager-lookup-values"])

LookupType = Literal[
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
    "group",
    "platform",
    "risk_team",
]

DEFAULT_AUTHORITIES: dict[LookupType, tuple[str, ...]] = {
    "offer_name": (),
    "casino_offer_name": (),
    "offer_type": (
        "Sign up / Welcome", "Bet & Get", "Double Delight / Hat-trick Heaven",
        "Mug Bet", "Enhanced Price", "Price Boost", "Profit Boost", "Cashback",
        "Bonus Lock-In", "Weekly Reload", "2UP / Early Payout",
        "BOG / Best Odds Guaranteed", "Each Way", "Extra Places",
    ),
    "bet_type": (
        "Single", "In Play + Single", "Bet Builder", "In Play + Bet Builder",
        "Accumulator / Multiple", "Correct Score", "First Goalscorer",
    ),
    "fixture_type": (
        "Football", "Horse Racing", "Greyhound Racing", "Tennis", "Basketball",
        "Golf", "Cricket", "Rugby Union", "Rugby League", "Darts", "Snooker",
        "Boxing", "MMA / UFC", "Motor Racing", "Cycling", "American Football",
        "Baseball", "Ice Hockey", "eSports", "Politics",
        "Public Event / Entertainment", "Virtual Sports", "Other",
    ),
    "strategy": ("Standard", "Underlay", "Overlay", "Custom", "No Lay", "Partial Lay", "Multilay"),
    "sportsbook_status": (
        "Prospecting", "Not Placed", "Placed", "Settled", "Void", "Cancelled",
        "Error", "Free Bet Awarded",
    ),
    "free_bet_status": (
        "Prospecting", "Available", "Placed", "Settled", "Expired", "Void",
        "Converted", "Error", "Not Yet Awarded",
    ),
    "casino_status": (
        "Prospecting", "Started", "In Progress", "Settled", "Expired",
        "Cancelled", "Error",
    ),
    "account_lifecycle": (
        "Not Signed Up", "Pending Sign Up", "Verification Pending", "Active",
        "Suspended", "Closed", "Archived",
    ),
    "account_restriction": (
        "Bonus Restricted", "Soft Limited", "Casino Only", "Sportsbook Only",
        "KYC Blocked", "Risk Blocked", "Deposit Restricted", "Withdrawal Restricted",
    ),
    "group": (),
    "platform": (),
    "risk_team": (),
}


class FundManagerLookupPayload(BaseModel):
    lookup_value_id: str | None = Field(default=None, max_length=64)
    lookup_type: LookupType
    option_value: str = Field(min_length=1, max_length=120)
    status: Literal["Active", "Archived"] = "Active"
    sort_order: int = 0


class FundManagerLookupResponse(FundManagerLookupPayload):
    lookup_value_id: str
    created_at: str
    updated_at: str


def seed_default_authorities() -> None:
    existing = {
        (row.lookup_type, row.option_value.casefold())
        for row in list_fund_manager_lookup_values()
    }
    for lookup_type, values in DEFAULT_AUTHORITIES.items():
        for sort_order, option_value in enumerate(values):
            if (lookup_type, option_value.casefold()) in existing:
                continue
            create_fund_manager_lookup_value(
                {
                    "lookup_type": lookup_type,
                    "option_value": option_value,
                    "status": "Active",
                    "sort_order": sort_order,
                }
            )


@router.get("", response_model=list[FundManagerLookupResponse])
def list_lookup_values() -> list[FundManagerLookupResponse]:
    seed_default_authorities()
    return [
        FundManagerLookupResponse.model_validate(row.__dict__)
        for row in list_fund_manager_lookup_values()
    ]


@router.post("", response_model=FundManagerLookupResponse, status_code=201)
def create_lookup_value(payload: FundManagerLookupPayload) -> FundManagerLookupResponse:
    created = create_fund_manager_lookup_value(payload.model_dump())
    return FundManagerLookupResponse.model_validate(created.__dict__)


@router.put("/{lookup_value_id}", response_model=FundManagerLookupResponse)
def update_lookup_value(
    lookup_value_id: str, payload: FundManagerLookupPayload
) -> FundManagerLookupResponse:
    updated = update_fund_manager_lookup_value(lookup_value_id, payload.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Fund Manager authority was not found")
    return FundManagerLookupResponse.model_validate(updated.__dict__)
