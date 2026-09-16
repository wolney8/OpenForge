from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from openforge_api.db import get_financial_history, get_profile


router = APIRouter(prefix="/profiles/{profile_id}/financial-history", tags=["financial-history"])


class FinancialHistoryResponse(BaseModel):
    history_id: str
    profile_id: str
    ledger_type: str
    activity_id: str
    operation: str
    recorded_at: str
    schema_version: int
    before_snapshot: dict[str, Any] | None
    after_snapshot: dict[str, Any] | None
    source_identity: dict[str, Any]
    provenance: dict[str, Any]
    reason: str
    actor_type: str
    actor_id: str
    operation_id: str


@router.get("/{ledger_type}/{activity_id}", response_model=list[FinancialHistoryResponse])
def list_profile_financial_history(
    profile_id: str,
    ledger_type: Literal["cash_adjustment", "extra_place", "casino", "sportsbook", "free_bet"],
    activity_id: str,
) -> list[FinancialHistoryResponse]:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return [
        FinancialHistoryResponse(
            history_id=item.history_id,
            profile_id=item.profile_id,
            ledger_type=item.ledger_type,
            activity_id=item.activity_id,
            operation=item.operation,
            recorded_at=item.recorded_at,
            schema_version=item.schema_version,
            before_snapshot=json.loads(item.before_snapshot_json),
            after_snapshot=json.loads(item.after_snapshot_json),
            source_identity=json.loads(item.source_identity_json),
            provenance=json.loads(item.provenance_json),
            reason=item.reason,
            actor_type=item.actor_type,
            actor_id=item.actor_id,
            operation_id=item.operation_id,
        )
        for item in get_financial_history(profile_id, ledger_type, activity_id)
    ]
