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
        "AC-DEMO",
        "profile-demo-002",
        None,
        name,
        account_type,
        True,
        "Online",
        status,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
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
