from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from openforge_api.db import (
    create_sportsbook_bet,
    get_sportsbook_bet,
    list_sportsbook_bets,
    update_sportsbook_bet,
)

router = APIRouter(prefix="/profiles/{profile_id}/sportsbook-bets", tags=["sportsbook"])

StatusValue = Literal["Prospecting", "Not Placed", "Placed", "Settled"]
ResultValue = Literal[
    "Pending",
    "Back Won",
    "Win",
    "Lay Won",
    "Lose",
    "No Selection Won",
    "Lay Won + Cashback",
    "Outcome 2 Won",
    "Outcome 3 Won",
    "Void",
    "Mixed",
]
MatchStrategyValue = Literal[
    "Standard",
    "Underlay",
    "Overlay",
    "Custom",
    "No Lay",
    "Partial Lay",
    "Multilay",
    "Multilay-Underlay",
]


class SportsbookBetPayload(BaseModel):
    sportsbook_bet_id: str | None = Field(default=None, max_length=64)
    event_name: str = Field(min_length=1, max_length=200)
    offer_text: str = Field(default="", max_length=200)
    bookmaker: str = Field(min_length=1, max_length=120)
    offer_type: str = Field(default="", max_length=120)
    status: StatusValue
    result: ResultValue
    back_stake: str = Field(default="", max_length=40)
    back_odds: str = Field(default="", max_length=40)
    match_strategy: MatchStrategyValue
    lay_odds_1: str = Field(default="", max_length=40)
    exchange_name: str = Field(default="", max_length=120)
    date_settled: str = Field(default="", max_length=40)
    user_notes: str = Field(default="", max_length=2000)
    manual_override_value: str = Field(default="", max_length=40)
    manual_override_reason: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def validate_override_reason(self) -> "SportsbookBetPayload":
        if self.manual_override_value and not self.manual_override_reason.strip():
            msg = "manual_override_reason is required when manual_override_value is provided"
            raise ValueError(msg)
        return self


class SportsbookBetResponse(SportsbookBetPayload):
    sportsbook_bet_id: str
    profile_id: str
    created_at: str
    updated_at: str


@router.get("", response_model=list[SportsbookBetResponse])
def list_profile_sportsbook_bets(profile_id: str) -> list[SportsbookBetResponse]:
    return [
        SportsbookBetResponse.model_validate(row.__dict__)
        for row in list_sportsbook_bets(profile_id)
    ]


@router.get("/{sportsbook_bet_id}", response_model=SportsbookBetResponse)
def get_profile_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> SportsbookBetResponse:
    record = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return SportsbookBetResponse.model_validate(record.__dict__)


@router.post("", response_model=SportsbookBetResponse, status_code=201)
def create_profile_sportsbook_bet(
    profile_id: str, payload: SportsbookBetPayload
) -> SportsbookBetResponse:
    created = create_sportsbook_bet(profile_id, payload.model_dump())
    return SportsbookBetResponse.model_validate(created.__dict__)


@router.put("/{sportsbook_bet_id}", response_model=SportsbookBetResponse)
def update_profile_sportsbook_bet(
    profile_id: str, sportsbook_bet_id: str, payload: SportsbookBetPayload
) -> SportsbookBetResponse:
    updated = update_sportsbook_bet(profile_id, sportsbook_bet_id, payload.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Sportsbook bet not found for this profile")
    return SportsbookBetResponse.model_validate(updated.__dict__)
