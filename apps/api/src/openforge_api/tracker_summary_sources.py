from __future__ import annotations

import asyncio
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ValidationError

from openforge_api.accounts import list_profile_accounts
from openforge_api.balance_snapshots import list_profile_balance_snapshots
from openforge_api.cash_adjustments import list_profile_cash_adjustments
from openforge_api.casino_offers import list_profile_casino_offers
from openforge_api.db import connect, list_profiles, reuse_mutation_connection
from openforge_api.each_way_extra_places import list_profile_each_way_extra_places
from openforge_api.free_bets import list_profile_free_bets
from openforge_api.fund_manager_fee_periods import list_profile_fee_periods
from openforge_api.sportsbook import list_profile_sportsbook_bets
from openforge_api.tracker_settings import get_tracker_settings

router = APIRouter(tags=["tracker-summary"])


class CombinedTrackerSummaryRequest(BaseModel):
    scope: Literal["active", "inactive", "all", "custom"]
    profile_ids: list[str] = Field(default_factory=list, max_length=250)


def _read_profile_snapshot(profile_id: str) -> dict[str, Any]:
    keys = (
        "accounts",
        "sportsbook_bets",
        "free_bets",
        "casino_offers",
        "cash_adjustments",
        "each_way_extra_places",
        "balance_snapshots",
        "fee_periods",
        "tracker_settings",
    )
    readers = (
        list_profile_accounts,
        list_profile_sportsbook_bets,
        list_profile_free_bets,
        list_profile_casino_offers,
        list_profile_cash_adjustments,
        list_profile_each_way_extra_places,
        list_profile_balance_snapshots,
        list_profile_fee_periods,
        get_tracker_settings,
    )
    return dict(zip(keys, (reader(profile_id) for reader in readers), strict=True))


def _read_combined_profile_snapshots(
    profile_ids: list[str],
) -> tuple[dict[str, dict[str, Any]], list[dict[str, object]]]:
    """Preserve the legacy per-Profile failure boundary in one combined read.

    Before the combined transport, the browser used ``Promise.allSettled`` for
    individual Profile snapshots. A legacy row that no longer passes a signed-off
    response contract therefore made that Profile unavailable without converting
    malformed money or hiding the failure behind a partial complete total.
    """

    sources: dict[str, dict[str, Any]] = {}
    failures: list[dict[str, object]] = []
    for profile_id in profile_ids:
        try:
            sources[profile_id] = _read_profile_snapshot(profile_id)
        except ValidationError:
            failures.append(
                {
                    "profile_id": profile_id,
                    "status": 500,
                    "code": "source_validation_failed",
                }
            )
    return sources, failures


def _resolve_profile_ids(payload: CombinedTrackerSummaryRequest) -> list[str]:
    profiles = list_profiles()
    available = {profile.profile_id: profile for profile in profiles}
    requested = list(dict.fromkeys(payload.profile_ids))
    unknown = [profile_id for profile_id in requested if profile_id not in available]
    if unknown:
        # Fail closed without confirming which supplied identity was unavailable.
        raise HTTPException(status_code=403, detail="One or more Profiles are unavailable")
    if payload.scope == "custom":
        return requested
    if payload.scope == "active":
        return [profile.profile_id for profile in profiles if profile.status.casefold() == "active"]
    if payload.scope == "inactive":
        return [profile.profile_id for profile in profiles if profile.status.casefold() != "active"]
    return [profile.profile_id for profile in profiles]


@router.get("/profiles/{profile_id}/tracker-summary-sources")
async def get_profile_tracker_summary_sources(profile_id: str) -> dict[str, Any]:
    """Bundle the existing read contracts used by Dashboard and Reports.

    The response deliberately reuses each signed-off endpoint serializer so the
    aggregation transport cannot introduce a second financial interpretation.
    """

    # Dashboard and Reports require one coherent Profile snapshot. A shared
    # connection avoids nine hosted handshakes and also lets compound readers
    # (notably Free Bets) reuse that same transaction. The writable boundary
    # preserves the existing lazy default-settings contract for older Profiles.
    def read_snapshot() -> dict[str, Any]:
        with connect() as connection, reuse_mutation_connection(connection):
            return _read_profile_snapshot(profile_id)

    return await asyncio.to_thread(read_snapshot)


@router.post("/reports/combined-summary-sources")
async def get_combined_tracker_summary_sources(
    payload: CombinedTrackerSummaryRequest,
) -> dict[str, Any]:
    """Read an authorised Reports scope through one request and DB snapshot.

    Each Profile still uses the signed-off endpoint serializers. This changes
    transport and connection scaling only; financial interpretation remains in
    the existing Reports projection.
    """

    profile_ids = _resolve_profile_ids(payload)

    def read_snapshot() -> tuple[dict[str, dict[str, Any]], list[dict[str, object]]]:
        with connect() as connection, reuse_mutation_connection(connection):
            return _read_combined_profile_snapshots(profile_ids)

    sources, failures = await asyncio.to_thread(read_snapshot)
    return {
        "scope": payload.scope,
        "profile_ids": profile_ids,
        "sources": sources,
        "failures": failures,
    }
