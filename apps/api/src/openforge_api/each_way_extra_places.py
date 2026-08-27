from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from openforge_api.calculations.each_way_extra_place import (
    EachWayCalculationInput,
    calculate_each_way_extra_place,
)
from openforge_api.db import (
    create_each_way_extra_place,
    delete_each_way_extra_place,
    get_each_way_extra_place,
    get_profile_exchange_commission,
    get_profile_exchange_commission_map,
    list_each_way_extra_places,
    update_each_way_extra_place,
)

router = APIRouter(
    prefix="/profiles/{profile_id}/each-way-extra-places",
    tags=["each-way-extra-places"],
)

Mode = Literal["Each Way", "Extra Place"]
Status = Literal["Prospecting", "Placed", "Settled", "Void"]
Result = Literal["Pending", "Win", "Standard Place", "Extra Place", "Unplaced", "Void/NR"]


class EachWayExtraPlacePayload(BaseModel):
    each_way_extra_place_id: str | None = Field(default=None, max_length=64)
    placed_at: str = Field(default="", max_length=60)
    runner: str = Field(default="", max_length=240)
    race: str = Field(default="", max_length=240)
    bookmaker: str = Field(default="", max_length=120)
    bookmaker_account: str = Field(default="", max_length=120)
    mode: Mode = "Extra Place"
    each_way_stake: str = Field(default="")
    back_odds: str = Field(default="")
    place_term_numerator: str = Field(default="1")
    place_term_denominator: str = Field(default="5")
    bookmaker_places: str = Field(default="")
    exchange_places: str = Field(default="")
    win_exchange: str = Field(default="", max_length=120)
    win_lay_odds: str = Field(default="")
    win_commission: str = Field(default="0")
    actual_win_lay_stake: str = Field(default="")
    place_exchange: str = Field(default="", max_length=120)
    place_lay_odds: str = Field(default="")
    place_commission: str = Field(default="0")
    actual_place_lay_stake: str = Field(default="")
    status: Status = "Prospecting"
    result: Result = "Pending"
    finishing_position: str = Field(default="", max_length=40)
    user_notes: str = Field(default="", max_length=4000)


class EachWayPreviewPayload(EachWayExtraPlacePayload):
    pass


class DeletePayload(BaseModel):
    deletion_reason: str = Field(default="", max_length=1000)


def _format(value: Decimal | None) -> str | None:
    return f"{value:.2f}" if value is not None else None


def _with_profile_commissions(
    profile_id: str,
    payload: dict[str, object],
    commissions: dict[str, str] | None = None,
) -> dict[str, object]:
    """Resolve exchange commission from profile settings rather than the editor."""
    def commission_for(exchange: str) -> str:
        if commissions is not None:
            return commissions.get(exchange, "")
        return get_profile_exchange_commission(profile_id, exchange)

    return {
        **payload,
        "win_commission": commission_for(str(payload["win_exchange"])),
        "place_commission": commission_for(str(payload["place_exchange"])),
    }


def build_calculation(
    profile_id: str,
    payload: dict[str, object],
    commissions: dict[str, str] | None = None,
) -> dict[str, object]:
    payload = _with_profile_commissions(profile_id, payload, commissions)
    result = calculate_each_way_extra_place(
        EachWayCalculationInput(
            mode=str(payload["mode"]),
            each_way_stake=str(payload["each_way_stake"]),
            back_odds=str(payload["back_odds"]),
            place_term_numerator=str(payload["place_term_numerator"]),
            place_term_denominator=str(payload["place_term_denominator"]),
            win_lay_odds=str(payload["win_lay_odds"]),
            place_lay_odds=str(payload["place_lay_odds"]),
            win_commission=str(payload["win_commission"]),
            place_commission=str(payload["place_commission"]),
            actual_win_lay_stake=str(payload["actual_win_lay_stake"]),
            actual_place_lay_stake=str(payload["actual_place_lay_stake"]),
            result=str(payload["result"]),
        )
    )
    fields = (
        "place_back_odds", "win_lay_stake", "place_lay_stake", "win_liability",
        "place_liability", "qualifying_loss", "extra_place_profit", "rating_percent", "implied_odds", "first_place_pnl",
        "standard_place_pnl", "extra_place_pnl", "unplaced_pnl",
        "first_place_bookie_pnl", "first_place_exchange_pnl",
        "standard_place_bookie_pnl", "standard_place_exchange_pnl",
        "extra_place_bookie_pnl", "extra_place_exchange_pnl",
        "unplaced_bookie_pnl", "unplaced_exchange_pnl",
        "first_place_bookie_win_pnl", "first_place_bookie_place_pnl",
        "first_place_exchange_win_pnl", "first_place_exchange_place_pnl",
        "standard_place_bookie_win_pnl", "standard_place_bookie_place_pnl",
        "standard_place_exchange_win_pnl", "standard_place_exchange_place_pnl",
        "extra_place_bookie_win_pnl", "extra_place_bookie_place_pnl",
        "extra_place_exchange_win_pnl", "extra_place_exchange_place_pnl",
        "unplaced_bookie_win_pnl", "unplaced_bookie_place_pnl",
        "unplaced_exchange_win_pnl", "unplaced_exchange_place_pnl",
        "current_value", "final_value",
    )
    return {
        "calculation_state": result.calculation_state,
        "calculation_notes": list(result.calculation_notes),
        **{field: _format(getattr(result, field)) for field in fields},
    }


def build_response(
    record: object,
    commissions: dict[str, str] | None = None,
) -> dict[str, object]:
    data = record.__dict__.copy()
    profile_id = str(data["profile_id"])
    resolved = _with_profile_commissions(profile_id, data, commissions)
    return {
        **resolved,
        **build_calculation(profile_id, resolved, commissions),
    }


@router.get("")
def list_profile_each_way_extra_places(profile_id: str) -> list[dict[str, object]]:
    commissions = get_profile_exchange_commission_map(profile_id)
    return [
        build_response(record, commissions)
        for record in list_each_way_extra_places(profile_id)
    ]


@router.get("/{each_way_extra_place_id}")
def get_profile_each_way_extra_place(profile_id: str, each_way_extra_place_id: str) -> dict[str, object]:
    record = get_each_way_extra_place(profile_id, each_way_extra_place_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Each Way / Extra Place row not found")
    return build_response(record)


@router.post("", status_code=201)
def create_profile_each_way_extra_place(
    profile_id: str, payload: EachWayExtraPlacePayload
) -> dict[str, object]:
    values = _with_profile_commissions(profile_id, payload.model_dump())
    return build_response(create_each_way_extra_place(profile_id, values))


@router.put("/{each_way_extra_place_id}")
def update_profile_each_way_extra_place(
    profile_id: str, each_way_extra_place_id: str, payload: EachWayExtraPlacePayload
) -> dict[str, object]:
    values = _with_profile_commissions(profile_id, payload.model_dump())
    record = update_each_way_extra_place(profile_id, each_way_extra_place_id, values)
    if record is None:
        raise HTTPException(status_code=404, detail="Each Way / Extra Place row not found")
    return build_response(record)


@router.delete("/{each_way_extra_place_id}", status_code=204)
def delete_profile_each_way_extra_place(
    profile_id: str,
    each_way_extra_place_id: str,
    payload: DeletePayload | None = None,
) -> None:
    try:
        deleted = delete_each_way_extra_place(
            profile_id,
            each_way_extra_place_id,
            payload.deletion_reason if payload else "",
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Each Way / Extra Place row not found")


@router.post("/preview")
def preview_each_way_extra_place(profile_id: str, payload: EachWayPreviewPayload) -> dict[str, object]:
    return {"profile_id": profile_id, **build_calculation(profile_id, payload.model_dump())}
