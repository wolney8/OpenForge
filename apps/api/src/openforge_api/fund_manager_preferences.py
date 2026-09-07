from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from openforge_api.db import (
    get_financial_motion_preference,
    update_financial_motion_preference,
)

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
