from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter

from openforge_api.accounts import list_profile_accounts
from openforge_api.balance_snapshots import list_profile_balance_snapshots
from openforge_api.cash_adjustments import list_profile_cash_adjustments
from openforge_api.casino_offers import list_profile_casino_offers
from openforge_api.db import connect, reuse_mutation_connection
from openforge_api.each_way_extra_places import list_profile_each_way_extra_places
from openforge_api.free_bets import list_profile_free_bets
from openforge_api.fund_manager_fee_periods import list_profile_fee_periods
from openforge_api.sportsbook import list_profile_sportsbook_bets
from openforge_api.tracker_settings import get_tracker_settings

router = APIRouter(tags=["tracker-summary"])


@router.get("/profiles/{profile_id}/tracker-summary-sources")
async def get_profile_tracker_summary_sources(profile_id: str) -> dict[str, Any]:
    """Bundle the existing read contracts used by Dashboard and Reports.

    The response deliberately reuses each signed-off endpoint serializer so the
    aggregation transport cannot introduce a second financial interpretation.
    """

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
    # Dashboard and Reports require one coherent Profile snapshot. A shared
    # connection avoids nine hosted handshakes and also lets compound readers
    # (notably Free Bets) reuse that same transaction. The writable boundary
    # preserves the existing lazy default-settings contract for older Profiles.
    def read_snapshot() -> tuple[Any, ...]:
        with connect() as connection, reuse_mutation_connection(connection):
            return tuple(reader(profile_id) for reader in readers)

    values = await asyncio.to_thread(read_snapshot)
    return dict(zip(keys, values, strict=True))
