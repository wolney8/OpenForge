from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from openforge_api.accounts import list_profile_accounts
from openforge_api.balance_snapshots import list_profile_balance_snapshots
from openforge_api.cash_adjustments import list_profile_cash_adjustments
from openforge_api.casino_offers import list_profile_casino_offers
from openforge_api.each_way_extra_places import list_profile_each_way_extra_places
from openforge_api.free_bets import list_profile_free_bets
from openforge_api.fund_manager_fee_periods import list_profile_fee_periods
from openforge_api.sportsbook import list_profile_sportsbook_bets
from openforge_api.tracker_settings import get_tracker_settings

router = APIRouter(tags=["tracker-summary"])


@router.get("/profiles/{profile_id}/tracker-summary-sources")
def get_profile_tracker_summary_sources(profile_id: str) -> dict[str, Any]:
    """Bundle the existing read contracts used by Dashboard and Reports.

    The response deliberately reuses each signed-off endpoint serializer so the
    aggregation transport cannot introduce a second financial interpretation.
    """

    return {
        "accounts": list_profile_accounts(profile_id),
        "sportsbook_bets": list_profile_sportsbook_bets(profile_id),
        "free_bets": list_profile_free_bets(profile_id),
        "casino_offers": list_profile_casino_offers(profile_id),
        "cash_adjustments": list_profile_cash_adjustments(profile_id),
        "each_way_extra_places": list_profile_each_way_extra_places(profile_id),
        "balance_snapshots": list_profile_balance_snapshots(profile_id),
        "fee_periods": list_profile_fee_periods(profile_id),
        "tracker_settings": get_tracker_settings(profile_id),
    }
