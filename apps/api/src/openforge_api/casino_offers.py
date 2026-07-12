from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from openforge_api.calculations.casino_offer_values import (
    CasinoOfferCalculationInput,
    CasinoOfferCalculationResult,
    calculate_casino_offer_values,
)
from openforge_api.db import (
    create_casino_offer,
    delete_casino_offer,
    get_casino_offer,
    list_casino_offers,
    update_casino_offer,
)

router = APIRouter(prefix="/profiles/{profile_id}/casino-offers", tags=["casino-offers"])

StatusValue = Literal["Prospecting", "Started", "In Progress", "Settled"]
ResultValue = Literal["Pending", "Win", "Lose", "Void", "Mixed"]


class CasinoOfferPayload(BaseModel):
    casino_offer_id: str | None = Field(default=None, max_length=64)
    offer_group_id: str = Field(default="", max_length=64)
    date_started: str = Field(min_length=1, max_length=60)
    date_settling: str = Field(default="", max_length=60)
    expiry_datetime: str = Field(default="", max_length=60)
    bookmaker: str = Field(min_length=1, max_length=120)
    offer_type: str = Field(min_length=1, max_length=120)
    offer_name: str = Field(min_length=1, max_length=400)
    game: str = Field(default="", max_length=200)
    cash_stake: str = Field(default="", max_length=40)
    credit_amount: str = Field(default="", max_length=40)
    bonus_amount: str = Field(default="", max_length=40)
    wager_multiplier: str = Field(default="", max_length=40)
    wager_target: str = Field(default="", max_length=40)
    required_spins: str = Field(default="", max_length=40)
    spin_stake: str = Field(default="", max_length=40)
    free_spins_awarded: str = Field(default="", max_length=40)
    free_spins_value: str = Field(default="", max_length=40)
    status: StatusValue
    result: ResultValue
    calc_net_pnl: str = Field(default="", max_length=40)
    final_net_pnl: str = Field(default="", max_length=40)
    user_notes: str = Field(default="", max_length=2000)


class CasinoOfferResponse(CasinoOfferPayload):
    casino_offer_id: str
    profile_id: str
    created_at: str
    updated_at: str
    resolved_net_pnl: str | None
    calculation_state: str
    calculation_notes: list[str]
    counts_as_open: bool
    is_overdue: bool
    week_label: str


def format_decimal(value: Decimal | None, *, decimals: int) -> str | None:
    if value is None:
        return None
    return f"{value:.{decimals}f}"


def serialize_calculation(calculation: CasinoOfferCalculationResult) -> dict[str, object]:
    return {
        "resolved_net_pnl": format_decimal(calculation.resolved_net_pnl, decimals=2),
        "calculation_state": calculation.calculation_state,
        "calculation_notes": list(calculation.calculation_notes),
        "counts_as_open": calculation.counts_as_open,
        "is_overdue": calculation.is_overdue,
        "week_label": calculation.week_label,
    }


def build_response(row: object) -> CasinoOfferResponse:
    record = row.__dict__
    calculation = calculate_casino_offer_values(
        CasinoOfferCalculationInput(
            profile_id=record["profile_id"],
            record_id=record["casino_offer_id"],
            date_started=record["date_started"],
            date_settling=record["date_settling"],
            expiry_datetime=record["expiry_datetime"],
            status=record["status"],
            calc_net_pnl=record["calc_net_pnl"],
            final_net_pnl=record["final_net_pnl"],
        ),
        as_of_datetime=datetime.now(),
    )
    return CasinoOfferResponse.model_validate({**record, **serialize_calculation(calculation)})


@router.get("", response_model=list[CasinoOfferResponse])
def list_profile_casino_offers(profile_id: str) -> list[CasinoOfferResponse]:
    return [build_response(row) for row in list_casino_offers(profile_id)]


@router.get("/{casino_offer_id}", response_model=CasinoOfferResponse)
def get_profile_casino_offer(profile_id: str, casino_offer_id: str) -> CasinoOfferResponse:
    record = get_casino_offer(profile_id, casino_offer_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Casino offer not found for this profile")
    return build_response(record)


@router.post("", response_model=CasinoOfferResponse, status_code=201)
def create_profile_casino_offer(
    profile_id: str,
    payload: CasinoOfferPayload,
) -> CasinoOfferResponse:
    created = create_casino_offer(
        profile_id,
        {
            **payload.model_dump(),
            "date_settling": payload.date_settling or payload.date_started,
        },
    )
    return build_response(created)


@router.put("/{casino_offer_id}", response_model=CasinoOfferResponse)
def update_profile_casino_offer(
    profile_id: str,
    casino_offer_id: str,
    payload: CasinoOfferPayload,
) -> CasinoOfferResponse:
    updated = update_casino_offer(
        profile_id,
        casino_offer_id,
        {
            **payload.model_dump(),
            "date_settling": payload.date_settling or payload.date_started,
        },
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Casino offer not found for this profile")
    return build_response(updated)


@router.delete("/{casino_offer_id}", status_code=204)
def remove_profile_casino_offer(profile_id: str, casino_offer_id: str) -> Response:
    deleted = delete_casino_offer(profile_id, casino_offer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Casino offer not found for this profile")
    return Response(status_code=204)
