from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    FundManagerComboPresetRecord,
    create_fund_manager_combo_preset,
    list_fund_manager_combo_presets,
    update_fund_manager_combo_preset,
)

router = APIRouter(prefix="/fund-manager/common-bet-combos", tags=["common-bet-combos"])

Strategy = Literal["Standard", "Underlay", "Overlay", "Custom", "No Lay"]


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


DEFAULT_COMBOS: tuple[dict[str, object], ...] = (
    {
        "preset_id": "COMBO-WEEKLY-BUILDER",
        "name": "Weekly Bet Builder",
        "offer_type": "Bet & Get",
        "bet_type": "Bet Builder",
        "fixture_type": "Football",
        "default_back_stake": "10.00",
        "minimum_back_odds": "2.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 10,
    },
    {
        "preset_id": "COMBO-LOSS-BACK",
        "name": "Loss-back Offer",
        "offer_type": "Bonus Lock-In",
        "bet_type": "Single",
        "fixture_type": "Horse Racing",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 20,
    },
    {
        "preset_id": "COMBO-PROFIT-BOOST",
        "name": "Profit Boost",
        "offer_type": "Profit Boost",
        "bet_type": "Single",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 30,
    },
    {
        "preset_id": "COMBO-BET-GET-SINGLE",
        "name": "Bet & Get Single",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "default_back_stake": "10.00",
        "minimum_back_odds": "2.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 40,
    },
    {
        "preset_id": "COMBO-BET-GET-IN-PLAY",
        "name": "In-Play Bet & Get",
        "offer_type": "Bet & Get",
        "bet_type": "In Play + Single",
        "default_back_stake": "10.00",
        "minimum_back_odds": "2.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 50,
    },
    {
        "preset_id": "COMBO-BET-GET-ACCA",
        "name": "Bet & Get Accumulator",
        "offer_type": "Bet & Get",
        "bet_type": "Accumulator / Multiple",
        "default_back_stake": "10.00",
        "minimum_back_odds": "2.00",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 60,
    },
    {
        "preset_id": "COMBO-PRICE-BOOST",
        "name": "Price Boost Single",
        "offer_type": "Price Boost",
        "bet_type": "Single",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 70,
    },
    {
        "preset_id": "COMBO-CASHBACK-HORSE",
        "name": "Horse Racing Cashback",
        "offer_type": "Cashback",
        "bet_type": "Single",
        "fixture_type": "Horse Racing",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 80,
    },
    {
        "preset_id": "COMBO-DDHH-FGS",
        "name": "DD/HH First Goalscorer",
        "offer_type": "Double Delight / Hat-trick Heaven",
        "bet_type": "First Goalscorer",
        "fixture_type": "Football",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 90,
    },
    {
        "preset_id": "COMBO-MUG-NO-LAY",
        "name": "Account-Health Mug Bet",
        "offer_type": "Mug Bet",
        "bet_type": "Single",
        "allowed_strategies": ["No Lay", "Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 100,
    },
    {
        "preset_id": "COMBO-WEEKLY-RELOAD",
        "name": "Weekly Reload Single",
        "offer_type": "Weekly Reload",
        "bet_type": "Single",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 110,
    },
    {
        "preset_id": "COMBO-WELCOME-SINGLE",
        "name": "Welcome Offer Single",
        "offer_type": "Sign up / Welcome",
        "bet_type": "Single",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 120,
    },
    {
        "preset_id": "COMBO-ENHANCED-PRICE",
        "name": "Enhanced Price Single",
        "offer_type": "Enhanced Price",
        "bet_type": "Single",
        "allowed_strategies": ["Standard", "Underlay", "Overlay", "Custom"],
        "sort_order": 130,
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
