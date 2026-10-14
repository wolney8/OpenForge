from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from openforge_api.db import (
    get_financial_motion_preference,
    get_fund_manager_selected_range,
    update_financial_motion_preference,
    update_fund_manager_selected_range,
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
