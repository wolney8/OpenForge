import json
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from openforge_api.db import (
    get_financial_motion_preference,
    get_fund_manager_selected_range,
    get_oddsmatcher_preferences_json,
    update_financial_motion_preference,
    update_fund_manager_selected_range,
    update_oddsmatcher_preferences_json,
)
from openforge_api.tracker_settings import DatePresetValue

router = APIRouter(prefix="/fund-manager/preferences", tags=["fund-manager-preferences"])


class FinancialMotionPreference(BaseModel):
    enabled: bool = True
    replay_delay_ms: Literal[500, 1000, 1500, 2000, 2500, 3000] = 1500
    duration_ms: Literal[360, 520, 700, 900] = 520
    stagger_ms: Literal[40, 60, 80, 100] = 80


class FinancialMotionPreferenceUpdate(BaseModel):
    enabled: bool | None = None
    replay_delay_ms: Literal[500, 1000, 1500, 2000, 2500, 3000] | None = None
    duration_ms: Literal[360, 520, 700, 900] | None = None
    stagger_ms: Literal[40, 60, 80, 100] | None = None


class SelectedRangePreference(BaseModel):
    selected_range_preset: DatePresetValue = "Week (Mon-Sun)"
    selected_range_custom_start: str | None = None
    selected_range_custom_end: str | None = None


class OddsMatcherSavedFilterState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    search: str = Field(default="", max_length=120)
    sports: list[str] = Field(default_factory=list, max_length=20)
    competitions: list[str] = Field(default_factory=list, max_length=50)
    eventName: str = Field(default="", max_length=160)
    markets: list[str] = Field(default_factory=list, max_length=20)
    selections: list[Literal["HOME", "DRAW", "AWAY"]] = Field(default_factory=list)
    excludeDraws: bool = False
    startTime: Literal[
        "ALL", "30M", "1H", "2H", "4H", "8H", "12H", "24H",
        "TODAY", "TOMORROW", "3D", "CUSTOM",
    ] = "ALL"
    customStart: str = ""
    customEnd: str = ""
    backProviders: list[str] = Field(default_factory=list, max_length=100)
    minBackOdds: str = Field(default="", max_length=20)
    maxBackOdds: str = Field(default="", max_length=20)
    layProviders: list[str] = Field(default_factory=list, max_length=20)
    minLayOdds: str = Field(default="", max_length=20)
    maxLayOdds: str = Field(default="", max_length=20)
    minLiquidity: str = Field(default="", max_length=20)
    minRating: str = Field(default="", max_length=20)
    maxRating: str = Field(default="", max_length=20)
    showArbs: bool = False

    @field_validator("sports", "competitions", "markets", "backProviders", "layProviders")
    @classmethod
    def normalized_identity_list(cls, values: list[str]) -> list[str]:
        result: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not value or value.casefold() in seen:
                continue
            seen.add(value.casefold())
            result.append(value)
        return result

    @field_validator(
        "minBackOdds", "maxBackOdds", "minLayOdds", "maxLayOdds",
        "minLiquidity", "minRating", "maxRating",
    )
    @classmethod
    def valid_optional_decimal(cls, value: str) -> str:
        value = value.strip()
        if not value:
            return ""
        try:
            parsed = Decimal(value)
        except InvalidOperation as error:
            raise ValueError("Enter a complete decimal value.") from error
        if not parsed.is_finite() or parsed < 0:
            raise ValueError("Enter a non-negative finite decimal value.")
        return value

    @model_validator(mode="after")
    def valid_ranges(self) -> "OddsMatcherSavedFilterState":
        pairs = (
            ("minBackOdds", "maxBackOdds"),
            ("minLayOdds", "maxLayOdds"),
            ("minRating", "maxRating"),
        )
        for low_name, high_name in pairs:
            low = getattr(self, low_name)
            high = getattr(self, high_name)
            if low and high and Decimal(low) > Decimal(high):
                raise ValueError(f"{low_name} cannot exceed {high_name}.")
        if self.startTime == "CUSTOM" and (not self.customStart or not self.customEnd):
            raise ValueError("Custom start time requires both boundaries.")
        if self.startTime == "CUSTOM":
            try:
                start = datetime.fromisoformat(self.customStart)
                end = datetime.fromisoformat(self.customEnd)
            except ValueError as error:
                raise ValueError(
                    "Custom start time boundaries must be valid local date-times."
                ) from error
            if start.tzinfo is not None or end.tzinfo is not None:
                raise ValueError(
                    "Custom start time boundaries use Europe/London local time without an offset."
                )
            if start > end:
                raise ValueError("Custom start time cannot be after its end time.")
        return self


class OddsMatcherSavedFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$")
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=240)
    filters: OddsMatcherSavedFilterState

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Saved filter names cannot be empty.")
        return cleaned

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return " ".join(value.split())


class OddsMatcherPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    default_back_stake: str = Field(default="10.00", max_length=20)
    exchange_commission_overrides: dict[str, str] = Field(default_factory=dict)
    excluded_bookmaker_identities: list[str] = Field(default_factory=list, max_length=100)
    excluded_exchange_identities: list[str] = Field(default_factory=list, max_length=20)
    show_arbs_default: bool = False
    default_advanced: bool = False
    data_source: Literal["live", "replay"] = "live"
    saved_snapshot_id: str = Field(default="", max_length=160)
    auto_update_back_odds: bool = False
    auto_update_lay_odds: bool = False
    saved_filters: list[OddsMatcherSavedFilter] = Field(default_factory=list, max_length=50)

    @field_validator("saved_snapshot_id")
    @classmethod
    def valid_snapshot_id(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned and not all(character.isalnum() or character in "-_" for character in cleaned):
            raise ValueError("Saved snapshot identity is invalid.")
        return cleaned

    @model_validator(mode="after")
    def replay_has_snapshot(self) -> "OddsMatcherPreferences":
        if self.data_source == "replay" and not self.saved_snapshot_id:
            raise ValueError("Saved snapshot mode requires a selected snapshot.")
        return self

    @field_validator("default_back_stake")
    @classmethod
    def valid_stake(cls, value: str) -> str:
        try:
            parsed = Decimal(value)
        except InvalidOperation as error:
            raise ValueError("Default back stake must be a complete decimal value.") from error
        if not parsed.is_finite() or parsed <= 0:
            raise ValueError("Default back stake must be greater than zero.")
        return value

    @field_validator("exchange_commission_overrides")
    @classmethod
    def valid_commissions(cls, values: dict[str, str]) -> dict[str, str]:
        result: dict[str, str] = {}
        for raw_key, raw_value in values.items():
            key = raw_key.strip()
            if not key:
                raise ValueError("Exchange identities cannot be empty.")
            try:
                value = Decimal(raw_value)
            except InvalidOperation as error:
                raise ValueError("Exchange commission must be a complete decimal value.") from error
            if not value.is_finite() or value < 0 or value > 1:
                raise ValueError("Exchange commission must be a canonical ratio between 0 and 1.")
            result[key] = raw_value
        return result

    @field_validator("excluded_bookmaker_identities", "excluded_exchange_identities")
    @classmethod
    def normalized_exclusions(cls, values: list[str]) -> list[str]:
        result: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not value or value.casefold() in seen:
                continue
            seen.add(value.casefold())
            result.append(value)
        return result

    @model_validator(mode="after")
    def unique_saved_filters(self) -> "OddsMatcherPreferences":
        ids = [item.id for item in self.saved_filters]
        names = [item.name.casefold() for item in self.saved_filters]
        if len(ids) != len(set(ids)):
            raise ValueError("Saved filter IDs must be unique.")
        if len(names) != len(set(names)):
            raise ValueError("Saved filter names must be unique.")
        return self


@router.get("/financial-motion", response_model=FinancialMotionPreference)
def read_financial_motion_preference() -> FinancialMotionPreference:
    return FinancialMotionPreference.model_validate(get_financial_motion_preference())


@router.put("/financial-motion", response_model=FinancialMotionPreference)
def save_financial_motion_preference(
    payload: FinancialMotionPreferenceUpdate,
) -> FinancialMotionPreference:
    current = FinancialMotionPreference.model_validate(get_financial_motion_preference())
    updated = current.model_copy(update=payload.model_dump(exclude_none=True))
    return FinancialMotionPreference.model_validate(
        update_financial_motion_preference(**updated.model_dump())
    )


@router.get("/selected-range", response_model=SelectedRangePreference)
def read_selected_range_preference() -> SelectedRangePreference:
    return SelectedRangePreference.model_validate(get_fund_manager_selected_range())


@router.put("/selected-range", response_model=SelectedRangePreference)
def save_selected_range_preference(
    payload: SelectedRangePreference,
) -> SelectedRangePreference:
    if payload.selected_range_preset == "Custom" and (
        not payload.selected_range_custom_start or not payload.selected_range_custom_end
    ):
        raise HTTPException(
            status_code=422,
            detail="Custom Selected Range requires a start and end date",
        )
    return SelectedRangePreference.model_validate(
        update_fund_manager_selected_range(
            preset=payload.selected_range_preset,
            custom_start=payload.selected_range_custom_start,
            custom_end=payload.selected_range_custom_end,
        )
    )


@router.get("/oddsmatcher", response_model=OddsMatcherPreferences)
def read_oddsmatcher_preferences() -> OddsMatcherPreferences:
    try:
        value = json.loads(get_oddsmatcher_preferences_json())
        return OddsMatcherPreferences.model_validate(value)
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Stored Oddsmatcher preferences are invalid and require review.",
        ) from error


@router.put("/oddsmatcher", response_model=OddsMatcherPreferences)
def save_oddsmatcher_preferences(
    payload: OddsMatcherPreferences,
) -> OddsMatcherPreferences:
    update_oddsmatcher_preferences_json(payload.model_dump_json())
    return payload
