from decimal import Decimal
from fastapi import APIRouter
from pydantic import BaseModel, Field

from openforge_api.calculations.each_way_extra_place import EachWayCalculationInput, calculate_each_way_extra_place

router = APIRouter(prefix="/profiles/{profile_id}/each-way-extra-places", tags=["each-way-extra-places"])

class EachWayPreviewPayload(BaseModel):
    mode: str = "Extra Place"
    each_way_stake: str = Field(default="")
    back_odds: str = Field(default="")
    place_term_numerator: str = "1"
    place_term_denominator: str = "5"
    win_lay_odds: str = ""
    place_lay_odds: str = ""
    win_commission: str = "0"
    place_commission: str = "0"
    actual_win_lay_stake: str = ""
    actual_place_lay_stake: str = ""
    result: str = "Pending"

def _format(value: Decimal | None) -> str | None:
    return f"{value:.2f}" if value is not None else None

@router.post("/preview")
def preview_each_way_extra_place(profile_id: str, payload: EachWayPreviewPayload) -> dict[str, object]:
    result = calculate_each_way_extra_place(EachWayCalculationInput(**payload.model_dump()))
    return {
        "profile_id": profile_id,
        "calculation_state": result.calculation_state,
        "calculation_notes": result.calculation_notes,
        **{field: _format(getattr(result, field)) for field in (
            "place_back_odds", "win_lay_stake", "place_lay_stake", "win_liability", "place_liability",
            "qualifying_loss", "extra_place_profit", "first_place_pnl", "standard_place_pnl",
            "extra_place_pnl", "unplaced_pnl", "current_value", "final_value",
        )},
    }
