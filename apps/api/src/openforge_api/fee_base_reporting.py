from __future__ import annotations

from datetime import date

from openforge_api.calculations.monthly_settled_fee_base import (
    MonthlySettledFeeBaseResult,
    SettledFeeBaseEntry,
    calculate_monthly_settled_fee_base,
)
from openforge_api.casino_offers import build_response as build_casino_response
from openforge_api.db import (
    get_profile_tracker_settings,
    list_casino_offers,
    list_free_bets,
    list_sportsbook_bets,
)
from openforge_api.free_bets import build_response as build_free_bet_response
from openforge_api.sportsbook import build_response as build_sportsbook_response


def build_monthly_settled_fee_base(
    profile_id: str, *, period_start: date, period_end: date
) -> MonthlySettledFeeBaseResult:
    entries: list[SettledFeeBaseEntry] = []

    for sportsbook_row in list_sportsbook_bets(profile_id):
        sportsbook_response = build_sportsbook_response(
            profile_id, sportsbook_row, as_of_date=period_end
        )
        entries.append(
            SettledFeeBaseEntry(
                module="sportsbook",
                record_id=sportsbook_response.sportsbook_bet_id,
                status=sportsbook_response.status,
                settlement_date=sportsbook_response.date_settled,
                final_value=sportsbook_response.final_net_pnl,
            )
        )

    tracker_settings = get_profile_tracker_settings(profile_id)
    for free_bet_row in list_free_bets(profile_id):
        free_bet_response = build_free_bet_response(
            free_bet_row, tracker_settings=tracker_settings
        )
        entries.append(
            SettledFeeBaseEntry(
                module="free_bet",
                record_id=free_bet_response.free_bet_id,
                status=free_bet_response.status,
                settlement_date=free_bet_response.date_settled,
                final_value=free_bet_response.final_net_pnl,
            )
        )

    for casino_row in list_casino_offers(profile_id):
        casino_response = build_casino_response(casino_row)
        entries.append(
            SettledFeeBaseEntry(
                module="casino",
                record_id=casino_response.casino_offer_id,
                status=casino_response.status,
                settlement_date=casino_response.date_settling,
                # Formal fees require an actual final value, not the casino estimate.
                final_value=casino_response.final_net_pnl or None,
            )
        )

    return calculate_monthly_settled_fee_base(
        period_start=period_start,
        period_end=period_end,
        entries=tuple(entries),
    )
