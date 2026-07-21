from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    FundManagerComboPresetRecord,
    create_fund_manager_combo_preset,
    delete_fund_manager_combo_presets,
    list_fund_manager_combo_presets,
    update_fund_manager_combo_preset,
)

router = APIRouter(prefix="/fund-manager/common-bet-combos", tags=["common-bet-combos"])

Strategy = Literal[
    "Standard",
    "Underlay",
    "Overlay",
    "Custom",
    "No Lay",
    "Partial Lay",
    "Multilay",
]


class CommonBetComboPayload(BaseModel):
    preset_id: str | None = Field(default=None, max_length=64)
    name: str = Field(min_length=1, max_length=80)
    ledger_type: Literal["Sportsbook"] = "Sportsbook"
    bookmaker: str = Field(default="", max_length=120)
    bookmakers: list[str] = Field(default_factory=list, max_length=100)
    offer_type: str = Field(default="", max_length=120)
    bet_type: str = Field(default="", max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)
    default_back_stake: str = Field(default="", max_length=40)
    minimum_back_odds: str = Field(default="", max_length=40)
    default_strategy: Strategy | Literal[""] = ""
    # Kept for backward compatibility with presets created before preferred strategy.
    allowed_strategies: list[Strategy] = Field(default_factory=list)
    status: Literal["Active", "Archived"] = "Active"
    sort_order: int = 0

    @field_validator("default_back_stake")
    @classmethod
    def validate_stake(cls, value: str) -> str:
        if not value.strip():
            return ""
        parsed = parse_decimal(value, "Default back stake")
        if parsed <= 0:
            raise ValueError("Default back stake must be greater than 0")
        return f"{parsed:.2f}"

    @field_validator("minimum_back_odds")
    @classmethod
    def validate_odds(cls, value: str) -> str:
        if not value.strip():
            return ""
        parsed = parse_decimal(value, "Minimum back odds")
        if parsed <= 1:
            raise ValueError("Minimum back odds must be greater than 1")
        return f"{parsed:.2f}"

    @field_validator("bookmakers")
    @classmethod
    def validate_bookmakers(cls, values: list[str]) -> list[str]:
        unique: list[str] = []
        seen: set[str] = set()
        for value in values:
            bookmaker = value.strip()
            if not bookmaker:
                continue
            if len(bookmaker) > 120:
                raise ValueError("Bookmaker names must be 120 characters or fewer")
            key = bookmaker.casefold()
            if key not in seen:
                seen.add(key)
                unique.append(bookmaker)
        return unique


class CommonBetComboResponse(CommonBetComboPayload):
    preset_id: str
    version: int
    created_at: str
    updated_at: str


RETIRED_DEFAULT_COMBO_IDS = {
    "COMBO-WEEKLY-BUILDER",
    "COMBO-LOSS-BACK",
    "COMBO-PROFIT-BOOST",
    "COMBO-BET-GET-SINGLE",
    "COMBO-BET-GET-IN-PLAY",
    "COMBO-BET-GET-ACCA",
    "COMBO-PRICE-BOOST",
    "COMBO-CASHBACK-HORSE",
    "COMBO-DDHH-FGS",
    "COMBO-MUG-NO-LAY",
    "COMBO-WEEKLY-RELOAD",
    "COMBO-WELCOME-SINGLE",
    "COMBO-ENHANCED-PRICE",
}

# Current recurring reloads verified against Matched Betting Blog on 2026-07-20.
# These are descriptive workflow presets, never calculation or profitability authority.
DEFAULT_COMBOS: tuple[dict[str, object], ...] = (
    {
        "preset_id": "COMBO-MBB-20260720-SKY-2UP",
        "name": "Sky Bet - 2 Up Wins",
        "bookmakers": ["Sky Bet"],
        "offer_type": "2UP / Early Payout",
        "bet_type": "Single",
        "offer_name": "Selected teams paid as winners after taking a two-goal lead",
        "fixture_type": "Football",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 10,
    },
    {
        "preset_id": "COMBO-MBB-20260720-LADBROKES-2UP",
        "name": "Ladbrokes - 2UP & WIN",
        "bookmakers": ["Ladbrokes"],
        "offer_type": "2UP / Early Payout",
        "bet_type": "Single",
        "offer_name": "Selected teams paid as winners after taking a two-goal lead",
        "fixture_type": "Football",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 20,
    },
    {
        "preset_id": "COMBO-MBB-20260720-CORAL-2UP",
        "name": "Coral - 2Up Instant Win",
        "bookmakers": ["Coral"],
        "offer_type": "2UP / Early Payout",
        "bet_type": "Single",
        "offer_name": "Selected teams paid as winners after taking a two-goal lead",
        "fixture_type": "Football",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 30,
    },
    {
        "preset_id": "COMBO-MBB-20260720-TOTE-ACCA",
        "name": "Tote - Acca Rewards",
        "bookmakers": ["Tote"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Stake £25 across 3+ leg accumulators to claim a £5 free acca",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 40,
    },
    {
        "preset_id": "COMBO-MBB-20260720-TALKSPORT-FOOTIE",
        "name": "talkSPORT Bet - Footie Rewards",
        "bookmakers": ["talkSPORT Bet"],
        "offer_type": "Weekly Reload",
        "bet_type": "Single",
        "offer_name": "Place five £10+ football bets to reveal a £10 free bet",
        "fixture_type": "Football",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 50,
    },
    {
        "preset_id": "COMBO-MBB-20260720-SKY-CLUB",
        "name": "Sky Bet - Sky Bet Club",
        "bookmakers": ["Sky Bet"],
        "offer_type": "Weekly Reload",
        "offer_name": "Stake £30 across any markets to receive 2 x £2.50 racing free bets",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 60,
    },
    {
        "preset_id": "COMBO-MBB-20260720-PADDY-REWARDS",
        "name": "Paddy Power - Paddy's Rewards Club",
        "bookmakers": ["Paddy Power"],
        "offer_type": "Weekly Reload",
        "bet_type": "Single",
        "offer_name": "Place five £5+ bets to earn a £5-£50 free bet",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 70,
    },
    {
        "preset_id": "COMBO-MBB-20260720-MIDNITE-BUILDER",
        "name": "Midnite - Bet Builder Club",
        "bookmakers": ["Midnite"],
        "offer_type": "Weekly Reload",
        "bet_type": "Bet Builder",
        "offer_name": "Place a £10+ Bet Builder to unlock a £5 free bet",
        "default_back_stake": "10.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 80,
    },
    {
        "preset_id": "COMBO-MBB-20260720-MIDNITE-ACCA",
        "name": "Midnite - Acca Club",
        "bookmakers": ["Midnite"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Place two £10+ four-leg pre-match accas to unlock a £10 acca free bet",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 90,
    },
    {
        "preset_id": "COMBO-MBB-20260720-MIDNITE-BET-CLUB",
        "name": "Midnite - Bet Club",
        "bookmakers": ["Midnite"],
        "offer_type": "Weekly Reload",
        "bet_type": "Single",
        "offer_name": "Place five £5+ win singles to unlock a £5 free bet",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 100,
    },
    {
        "preset_id": "COMBO-MBB-20260720-LOTTOLAND-CLUB",
        "name": "Lottoland - Weekly Bet Club",
        "bookmakers": ["Lottoland"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Stake £25 on 3+ leg accas to receive a £5 free bet",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 110,
    },
    {
        "preset_id": "COMBO-MBB-20260720-DAZN-BOXING",
        "name": "DAZN - Boxing Club",
        "bookmakers": ["DAZN"],
        "offer_type": "Weekly Reload",
        "bet_type": "Single",
        "offer_name": "Stake £10 on boxing to receive two £5 free bets",
        "fixture_type": "Boxing",
        "default_back_stake": "10.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 120,
    },
    {
        "preset_id": "COMBO-MBB-20260720-DAZN-RACING",
        "name": "DAZN - Horse Racing Bet Club",
        "bookmakers": ["DAZN"],
        "offer_type": "Weekly Reload",
        "bet_type": "Single",
        "offer_name": "Place five £5+ horse racing bets to claim a £5 free bet",
        "fixture_type": "Horse Racing",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 130,
    },
    {
        "preset_id": "COMBO-MBB-20260720-BOYLE-WEEKLY",
        "name": "BoyleSports - Weekly Bet £50, Get £15",
        "bookmakers": ["BoyleSports"],
        "offer_type": "Weekly Reload",
        "offer_name": (
            "Place 5+ bets totalling £50 including one retail bet to receive "
            "3 x £5 free bets"
        ),
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 140,
    },
    {
        "preset_id": "COMBO-MBB-20260720-BETWAY-CLUB",
        "name": "Betway - Free Bet Club",
        "bookmakers": ["Betway"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Stake £25 on 3+ leg bets to receive two £5 free bets",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 150,
    },
    {
        "preset_id": "COMBO-MBB-20260720-BETVICTOR-ACCA",
        "name": "BetVictor - Football Acca Club",
        "bookmakers": ["BetVictor"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Place five £10 football accas with 3+ selections to unlock a £10 reward",
        "fixture_type": "Football",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 160,
    },
    {
        "preset_id": "COMBO-MBB-20260720-BET600-MONDAY",
        "name": "Bet600 - Monday Football Reload",
        "bookmakers": ["Bet600"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Place a £20 Monday football acca with 3+ legs to receive a £10 free bet",
        "fixture_type": "Football",
        "default_back_stake": "20.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 170,
    },
    {
        "preset_id": "COMBO-MBB-20260720-BETUK-WEEKLY",
        "name": "Bet UK - Weekly Sports Free Bet",
        "bookmakers": ["Bet UK"],
        "offer_type": "Weekly Reload",
        "bet_type": "Bet Builder",
        "offer_name": "Stake £10 on a football Bet Builder to receive a £5 free bet",
        "fixture_type": "Football",
        "default_back_stake": "10.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 180,
    },
    {
        "preset_id": "COMBO-MBB-20260720-888-ACCA",
        "name": "888sport - Football Acca Club",
        "bookmakers": ["888sport"],
        "offer_type": "Weekly Reload",
        "bet_type": "Accumulator / Multiple",
        "offer_name": "Stake £20 on a 3+ leg football acca to receive a £5 acca free bet",
        "fixture_type": "Football",
        "default_back_stake": "20.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 190,
    },
    {
        "preset_id": "COMBO-MBB-20260720-PADDY-CASHBACK",
        "name": "Paddy Power - Racing Money Back",
        "bookmakers": ["Paddy Power"],
        "offer_type": "Cashback",
        "bet_type": "Single",
        "offer_name": (
            "Money back as a free bet up to £10 if the selected horse "
            "finishes 2nd or 3rd"
        ),
        "fixture_type": "Horse Racing",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 200,
    },
    {
        "preset_id": "COMBO-MBB-20260720-UNIBET-UNIBOOST",
        "name": "Unibet - Daily Uniboosts",
        "bookmakers": ["Unibet"],
        "offer_type": "Price Boost",
        "bet_type": "Single",
        "offer_name": "Three daily horse racing or greyhound Uniboosts with a £20 maximum stake",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 210,
    },
)


def parse_decimal(value: str, label: str) -> Decimal:
    try:
        return Decimal(value.strip())
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"{label} must be a valid number") from error


def serialize(record: FundManagerComboPresetRecord) -> CommonBetComboResponse:
    try:
        strategies = json.loads(record.allowed_strategies_json)
    except json.JSONDecodeError:
        strategies = []
    try:
        bookmakers = json.loads(record.bookmakers_json)
    except json.JSONDecodeError:
        bookmakers = []
    if not isinstance(bookmakers, list):
        bookmakers = []
    if not bookmakers and record.bookmaker:
        bookmakers = [record.bookmaker]
    return CommonBetComboResponse.model_validate(
        {
            **record.__dict__,
            "allowed_strategies": strategies,
            "bookmakers": bookmakers,
        }
    )


def seed_default_combos() -> None:
    delete_fund_manager_combo_presets(RETIRED_DEFAULT_COMBO_IDS)
    existing_ids = {row.preset_id for row in list_fund_manager_combo_presets()}
    for preset in DEFAULT_COMBOS:
        if preset["preset_id"] in existing_ids:
            continue
        create_fund_manager_combo_preset(dict(preset))


@router.get("", response_model=list[CommonBetComboResponse])
def list_common_bet_combos(active_only: bool = False) -> list[CommonBetComboResponse]:
    seed_default_combos()
    return [
        serialize(row)
        for row in list_fund_manager_combo_presets(active_only=active_only)
    ]


@router.post("", response_model=CommonBetComboResponse, status_code=201)
def create_common_bet_combo(payload: CommonBetComboPayload) -> CommonBetComboResponse:
    return serialize(create_fund_manager_combo_preset(payload.model_dump()))


@router.put("/{preset_id}", response_model=CommonBetComboResponse)
def update_common_bet_combo(
    preset_id: str, payload: CommonBetComboPayload
) -> CommonBetComboResponse:
    updated = update_fund_manager_combo_preset(preset_id, payload.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Common bet combo was not found")
    return serialize(updated)
