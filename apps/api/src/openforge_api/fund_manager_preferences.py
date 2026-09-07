from fastapi import APIRouter
from pydantic import BaseModel

from openforge_api.db import (
    get_financial_motion_preference,
    update_financial_motion_preference,
)

router = APIRouter(prefix="/fund-manager/preferences", tags=["fund-manager-preferences"])


class FinancialMotionPreference(BaseModel):
    enabled: bool = True


@router.get("/financial-motion", response_model=FinancialMotionPreference)
def read_financial_motion_preference() -> FinancialMotionPreference:
    return FinancialMotionPreference(enabled=get_financial_motion_preference())


@router.put("/financial-motion", response_model=FinancialMotionPreference)
def save_financial_motion_preference(
    payload: FinancialMotionPreference,
) -> FinancialMotionPreference:
    return FinancialMotionPreference(
        enabled=update_financial_motion_preference(payload.enabled)
    )
