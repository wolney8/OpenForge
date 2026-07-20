from __future__ import annotations

from openforge_api.db import (
    AccountRecord,
    ProfileExchangeCommissionRecord,
    ProfileRecord,
)
from openforge_api.multi_profile_entry import evaluate_multi_profile_target


def profile() -> ProfileRecord:
    return ProfileRecord("profile-demo-002", "Demo Two", "DEMO-002", "Active", "", "0", "0", "0")


def account(account_type: str, name: str, status: str) -> AccountRecord:
    return AccountRecord(
        account_id="AC-DEMO",
        profile_id="profile-demo-002",
        bookmaker_id=None,
        account=name,
        type=account_type,
        counts_in_cash_total=True,
        channel="Online",
        status=status,
        lifecycle_status="Active" if status == "Active" else status,
        restrictions_json="[]",
        current_balance="",
        pending_withdrawal_amount="",
        last_balance_update="",
        group_name="",
        platform="",
        sign_up_date="",
        notes="",
        created_at="",
        updated_at="",
    )


def commission() -> ProfileExchangeCommissionRecord:
    return ProfileExchangeCommissionRecord(
        "profile-demo-002", "Exchange A", "0.02", "", ""
    )


def test_inactive_bookmaker_is_blocked() -> None:
    result = evaluate_multi_profile_target(
        profile=profile(),
        accounts=[
            account("Bookie", "Bookmaker A", "Inactive"),
            account("Exchange", "Exchange A", "Active"),
        ],
        exchange_commissions=[commission()],
        bookmaker="Bookmaker A",
        offer_type="Bet & Get",
        match_strategy="Standard",
    )
    assert result.eligible is False
    assert result.reasons == ("Bookmaker A account is Inactive",)


def test_no_lay_does_not_require_target_exchange() -> None:
    result = evaluate_multi_profile_target(
        profile=profile(),
        accounts=[account("Bookie", "Bookmaker A", "Active")],
        exchange_commissions=[],
        bookmaker="Bookmaker A",
        offer_type="Mug Bet",
        match_strategy="No Lay",
    )
    assert result.eligible is True
    assert result.exchange_options == ()
