from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable

from openforge_api.db import AccountRecord, ProfileExchangeCommissionRecord, ProfileRecord

PROMOTIONAL_ACCOUNT_BLOCK_STATUSES = {"bonus restricted"}
ACCOUNT_WARNING_STATUSES = {"limited", "pending sign up"}
UNAVAILABLE_ACCOUNT_STATUSES = {
    "archived",
    "blocked",
    "closed",
    "gubbed",
    "inactive",
    "not using",
}
UNAVAILABLE_LIFECYCLES = {
    "archived",
    "closed",
    "not signed up",
    "suspended",
}
WARNING_LIFECYCLES = {"pending sign up", "verification pending"}
BLOCKING_RESTRICTIONS = {"kyc blocked", "risk blocked"}
NON_PROMOTIONAL_OFFER_TYPES = {"", "mug bet", "none", "no offer", "qualifying bet"}


@dataclass(frozen=True)
class TargetExchangeOption:
    exchange_name: str
    commission_rate: str


@dataclass(frozen=True)
class MultiProfileTargetEligibility:
    profile_id: str
    display_name: str
    profile_code: str
    eligible: bool
    state: str
    reasons: tuple[str, ...]
    warnings: tuple[str, ...]
    bookmaker_account_status: str
    exchange_options: tuple[TargetExchangeOption, ...]


def offer_requires_promotional_access(offer_type: str) -> bool:
    return offer_type.strip().casefold() not in NON_PROMOTIONAL_OFFER_TYPES


def strategy_requires_exchange(match_strategy: str) -> bool:
    return match_strategy.strip().casefold() != "no lay"


def get_account_restrictions(account: AccountRecord) -> set[str]:
    try:
        parsed = json.loads(account.restrictions_json)
    except json.JSONDecodeError:
        parsed = []
    restrictions = {
        str(value).strip().casefold()
        for value in parsed
        if str(value).strip()
    }
    legacy_status = account.status.strip().casefold()
    if legacy_status in {"gubbed", "bonus restricted"}:
        restrictions.add("bonus restricted")
    if legacy_status == "limited":
        restrictions.add("soft limited")
    return restrictions


def evaluate_multi_profile_target(
    *,
    profile: ProfileRecord,
    accounts: Iterable[AccountRecord],
    exchange_commissions: Iterable[ProfileExchangeCommissionRecord],
    bookmaker: str,
    offer_type: str,
    match_strategy: str,
) -> MultiProfileTargetEligibility:
    reasons: list[str] = []
    warnings: list[str] = []
    profile_status = profile.status.strip().casefold()
    if profile_status != "active":
        reasons.append(f"Profile is {profile.status}, not Active")

    account_rows = list(accounts)
    bookmaker_accounts = [
        account
        for account in account_rows
        if account.type == "Bookie"
        and account.account.strip().casefold() == bookmaker.strip().casefold()
    ]
    bookmaker_account_status = "Missing"
    if not bookmaker_accounts:
        reasons.append(f"{bookmaker} account is not configured")
    else:
        bookmaker_account = bookmaker_accounts[0]
        bookmaker_account_status = bookmaker_account.status
        normalized_status = bookmaker_account.status.strip().casefold()
        lifecycle = bookmaker_account.lifecycle_status.strip().casefold()
        restrictions = get_account_restrictions(bookmaker_account)
        if normalized_status in UNAVAILABLE_ACCOUNT_STATUSES or lifecycle in UNAVAILABLE_LIFECYCLES:
            reasons.append(f"{bookmaker} account is {bookmaker_account.status}")
        elif restrictions & BLOCKING_RESTRICTIONS:
            reasons.append(
                f"{bookmaker} account is blocked: "
                + ", ".join(sorted(restrictions & BLOCKING_RESTRICTIONS))
            )
        elif "sportsbook only" not in restrictions and "casino only" in restrictions:
            reasons.append(f"{bookmaker} account is Casino Only")
        elif normalized_status in ACCOUNT_WARNING_STATUSES or lifecycle in WARNING_LIFECYCLES:
            warnings.append(
                f"{bookmaker} account is {bookmaker_account.lifecycle_status}; "
                "confirm it can be used"
            )
        elif (
            (
                normalized_status in PROMOTIONAL_ACCOUNT_BLOCK_STATUSES
                or "bonus restricted" in restrictions
            )
            and offer_requires_promotional_access(offer_type)
        ):
            reasons.append(
                f"{bookmaker} account is {bookmaker_account.status} "
                "and cannot use promotional offers"
            )
        elif "soft limited" in restrictions:
            warnings.append(f"{bookmaker} account is Soft Limited; confirm the stake is accepted")
        elif normalized_status != "active" and lifecycle != "active":
            reasons.append(
                f"{bookmaker} account status requires review: {bookmaker_account.status}"
            )

    active_exchange_names = {
        account.account.strip().casefold(): account.account
        for account in account_rows
        if account.type == "Exchange" and account.status.strip().casefold() == "active"
    }
    commission_by_exchange = {
        row.exchange_name.strip().casefold(): row.commission_rate
        for row in exchange_commissions
        if row.commission_rate.strip()
    }
    exchange_options = tuple(
        TargetExchangeOption(
            exchange_name=exchange_name,
            commission_rate=commission_by_exchange[normalized_name],
        )
        for normalized_name, exchange_name in sorted(active_exchange_names.items())
        if normalized_name in commission_by_exchange
    )
    if strategy_requires_exchange(match_strategy) and not exchange_options:
        reasons.append("No active exchange with a configured commission rate")

    return MultiProfileTargetEligibility(
        profile_id=profile.profile_id,
        display_name=profile.display_name,
        profile_code=profile.profile_code,
        eligible=not reasons,
        state="Eligible" if not reasons else "Blocked",
        reasons=tuple(reasons),
        warnings=tuple(warnings),
        bookmaker_account_status=bookmaker_account_status,
        exchange_options=exchange_options,
    )
