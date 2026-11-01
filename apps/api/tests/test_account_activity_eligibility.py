from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from openforge_api.account_activity_eligibility import resolve_new_activity_eligibility
from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.config import SOURCE_ROOT


def account(
    name: str,
    *,
    account_type: str = "Exchange",
    catalogue_id: str = "",
    status: str = "Active",
    lifecycle_status: str = "Active",
) -> SimpleNamespace:
    return SimpleNamespace(
        account_id=f"account-{name}",
        account=name,
        type=account_type,
        catalogue_id=catalogue_id,
        status=status,
        lifecycle_status=lifecycle_status,
        restrictions_json="[]",
        stake_access="Normal",
        promo_access="Full",
    )


def test_active_account_and_active_provider_are_both_required() -> None:
    production_records = load_master_account_catalogue(
        Path(SOURCE_ROOT / "data/reference/master-account-catalogue.json")
    ).records
    active = resolve_new_activity_eligibility(
        account("Matchbook", catalogue_id="EXCHANGE-MATCHBOOK"),
        bookmaker=False,
        catalogue_records=production_records,
    )
    retired = resolve_new_activity_eligibility(
        account("Betdaq", catalogue_id="EXCHANGE-BETDAQ"),
        bookmaker=False,
        catalogue_records=production_records,
    )

    assert active.account_eligible is True
    assert active.provider_eligible is True
    assert active.eligible is True
    assert retired.account_eligible is True
    assert retired.provider_eligible is False
    assert retired.eligible is False
    assert retired.provider_lifecycle == "RETIRED"
    assert retired.successor_provider_ids == ("EXCHANGE-MATCHBOOK",)


def test_every_non_active_provider_is_excluded_from_new_activity() -> None:
    catalogue = load_master_account_catalogue(
        Path(SOURCE_ROOT / "data/reference/master-account-catalogue.json")
    )
    retired = [
        provider
        for provider in catalogue.records
        if provider.lifecycle != "ACTIVE" or not provider.eligible_for_new_activity
    ]

    assert retired
    for provider in retired:
        result = resolve_new_activity_eligibility(
            account(
                provider.brand_name,
                account_type=(
                    "Bookie"
                    if provider.account_type == "Bookmaker"
                    else provider.account_type
                ),
                catalogue_id=provider.catalogue_id,
            ),
            bookmaker=provider.account_type == "Bookmaker",
            catalogue_records=catalogue.records,
        )
        assert result.provider_eligible is False, provider.catalogue_id
        assert result.eligible is False, provider.catalogue_id
