from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import get_profile_tracker_settings, upsert_profile_tracker_settings

router = APIRouter(prefix="/profiles/{profile_id}/tracker-settings", tags=["tracker-settings"])

DatePresetValue = Literal[
    "Today",
    "Yesterday",
    "This Week",
    "Week (Mon-Sun)",
    "Last Week",
    "Past 7 Days",
    "Past 8 Days",
    "Fortnight",
    "This Month",
    "Last Month",
    "Custom",
]


class TrackerSettingsPayload(BaseModel):
    active_date_preset: DatePresetValue
    custom_start_date: str = Field(default="", max_length=20)
    custom_end_date: str = Field(default="", max_length=20)
    range_back_days: int = Field(default=0, ge=0, le=365)
    range_forward_days: int = Field(default=0, ge=0, le=365)
    mug_bet_frequency_days: int = Field(default=14, ge=1, le=365)
    free_bet_expiry_alert_window_days: int = Field(default=3, ge=0, le=365)
    use_global_date_range_toggle: bool = Field(default=True)
    this_month_mode: str = Field(default="Calendar", min_length=1, max_length=32)
    default_free_bet_underlay_factor: str = Field(default="0.928", max_length=20)
    default_free_bet_overlay_factor: str = Field(default="1.3", max_length=20)
    default_bonus_retention_percent: str = Field(default="0.7", max_length=20)
    default_exchange_name: str = Field(default="", max_length=120)

    @field_validator(
        "custom_start_date",
        "custom_end_date",
        "this_month_mode",
        "default_free_bet_underlay_factor",
        "default_free_bet_overlay_factor",
        "default_bonus_retention_percent",
        "default_exchange_name",
    )
    @classmethod
    def normalize_dates(cls, value: str) -> str:
        return value.strip()


class TrackerSettingsResponse(TrackerSettingsPayload):
    profile_id: str
    created_at: str
    updated_at: str


@router.get("", response_model=TrackerSettingsResponse)
def get_tracker_settings(profile_id: str) -> TrackerSettingsResponse:
    record = get_profile_tracker_settings(profile_id)
    return TrackerSettingsResponse.model_validate(record.__dict__)


@router.put("", response_model=TrackerSettingsResponse)
def save_tracker_settings(
    profile_id: str, payload: TrackerSettingsPayload
) -> TrackerSettingsResponse:
    saved = upsert_profile_tracker_settings(profile_id, payload.model_dump())
    return TrackerSettingsResponse.model_validate(saved.__dict__)
