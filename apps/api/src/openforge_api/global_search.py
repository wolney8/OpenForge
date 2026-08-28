from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.db import list_profiles

router = APIRouter(prefix="/search", tags=["global-search"])


class GlobalSearchResult(BaseModel):
    result_id: str
    group: Literal["Navigation", "Profiles", "Account Catalogue"]
    title: str
    subtitle: str
    href: str
    icon: str


NAVIGATION_RESULTS = (
    GlobalSearchResult(
        result_id="navigation-home",
        group="Navigation",
        title="Home",
        subtitle="Fund Manager dashboard",
        href="/profiles?view=performance",
        icon="space_dashboard",
    ),
    GlobalSearchResult(
        result_id="navigation-profiles",
        group="Navigation",
        title="Profiles",
        subtitle="Profile directory",
        href="/profiles?view=profiles",
        icon="group",
    ),
    GlobalSearchResult(
        result_id="navigation-registration-requests",
        group="Navigation",
        title="Registration Requests",
        subtitle="Future Subscriber applications",
        href="/profiles/requests",
        icon="how_to_reg",
    ),
    GlobalSearchResult(
        result_id="navigation-account-catalogue",
        group="Navigation",
        title="Account Catalogue",
        subtitle="Global provider authority",
        href="/settings#catalogue",
        icon="account_balance",
    ),
    GlobalSearchResult(
        result_id="navigation-notifications",
        group="Navigation",
        title="Notifications",
        subtitle="Fund Manager notification history",
        href="/notifications",
        icon="notifications",
    ),
    GlobalSearchResult(
        result_id="navigation-reports",
        group="Navigation",
        title="Reports",
        subtitle="Cross-profile reporting",
        href="/profiles?view=reports",
        icon="summarize",
    ),
    GlobalSearchResult(
        result_id="navigation-settings",
        group="Navigation",
        title="Settings",
        subtitle="Fund Manager configuration",
        href="/settings",
        icon="settings",
    ),
)


@router.get("", response_model=list[GlobalSearchResult])
def global_search(query: str = Query(min_length=2, max_length=80)) -> list[GlobalSearchResult]:
    normalized_query = query.strip().casefold()
    if len(normalized_query) < 2:
        return []

    results = [
        result
        for result in NAVIGATION_RESULTS
        if normalized_query in f"{result.title} {result.subtitle}".casefold()
    ]
    results.extend(
        GlobalSearchResult(
            result_id=f"profile-{profile.profile_id}",
            group="Profiles",
            title=profile.display_name,
            subtitle=f"{profile.profile_code} · {profile.status}",
            href=f"/profiles/{profile.profile_id}/tracker/dashboard",
            icon="person",
        )
        for profile in list_profiles()
        if normalized_query
        in f"{profile.display_name} {profile.profile_code} {profile.status}".casefold()
    )
    results.extend(
        GlobalSearchResult(
            result_id=f"provider-{provider.catalogue_id}",
            group="Account Catalogue",
            title=provider.short_display_name,
            subtitle=f"{provider.account_type} · {provider.brand_name}",
            href=f"/settings?catalogue={provider.catalogue_id}#catalogue",
            icon={
                "Bookmaker": "sports",
                "Exchange": "swap_horiz",
                "Bank": "account_balance",
            }[provider.account_type],
        )
        for provider in load_master_account_catalogue().records
        if provider.status == "Active"
        and normalized_query
        in (
            f"{provider.catalogue_id} {provider.short_display_name} "
            f"{provider.brand_name} {provider.account_type}"
        ).casefold()
    )
    return results[:20]
