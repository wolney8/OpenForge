from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from openforge_api.account_catalogue_source import (
    MasterAccountCatalogueRecord,
    load_master_account_catalogue,
)

UNAVAILABLE_ACCOUNT_STATUSES = frozenset(
    {
        "archived",
        "blocked",
        "closed",
        "gubbed",
        "inactive",
        "not signed up",
        "not using",
        "suspended",
    }
)
UNAVAILABLE_ACCOUNT_LIFECYCLES = frozenset(
    {"archived", "closed", "not signed up", "pending sign up", "suspended"}
)
BLOCKING_RESTRICTIONS = frozenset(
    {"casino only", "kyc blocked", "login restricted", "risk blocked"}
)


@dataclass(frozen=True)
class NewActivityEligibility:
    state: Literal["eligible", "warning", "unavailable"]
    reason: str
    account_eligible: bool
    provider_eligible: bool
    provider_lifecycle: str
    provider_catalogue_id: str | None
    successor_provider_ids: tuple[str, ...]

    @property
    def eligible(self) -> bool:
        return self.account_eligible and self.provider_eligible


def _restrictions(account: object) -> set[str]:
    raw = getattr(account, "restrictions_json", "[]")
    try:
        values = json.loads(str(raw))
    except json.JSONDecodeError:
        values = []
    if not isinstance(values, list):
        return set()
    return {str(value).strip().casefold() for value in values if str(value).strip()}


def _provider_for_account(
    account: object,
    records: Sequence[MasterAccountCatalogueRecord],
) -> MasterAccountCatalogueRecord | None:
    account_type = str(getattr(account, "type", ""))
    expected_type = "Bookmaker" if account_type == "Bookie" else account_type
    catalogue_id = str(getattr(account, "catalogue_id", "") or "").strip()
    if catalogue_id:
        return next(
            (
                record
                for record in records
                if record.account_type == expected_type
                and record.catalogue_id == catalogue_id
            ),
            None,
        )
    account_name = str(getattr(account, "account", "")).strip().casefold()
    return next(
        (
            record
            for record in records
            if record.account_type == expected_type
            and record.brand_name.casefold() == account_name
        ),
        None,
    )


def resolve_new_activity_eligibility(
    account: object,
    *,
    bookmaker: bool,
    require_promotional_access: bool = False,
    catalogue_records: Sequence[MasterAccountCatalogueRecord] | None = None,
) -> NewActivityEligibility:
    """Resolve new betting eligibility without changing historical Account visibility.

    Both authorities are mandatory: an operational Profile Account cannot override a retired,
    suspended, archived, or explicitly ineligible provider catalogue record.
    """

    records = (
        catalogue_records
        if catalogue_records is not None
        else load_master_account_catalogue().records
    )
    provider = _provider_for_account(account, records)
    provider_eligible = bool(
        provider is not None
        and provider.status == "Active"
        and provider.lifecycle == "ACTIVE"
        and provider.eligible_for_new_activity
    )
    provider_lifecycle = provider.lifecycle if provider is not None else "UNLISTED"
    provider_catalogue_id = provider.catalogue_id if provider is not None else None
    successor_ids = tuple(provider.successor_provider_ids) if provider is not None else ()

    status = str(getattr(account, "status", "")).strip().casefold()
    lifecycle = str(getattr(account, "lifecycle_status", "")).strip().casefold()
    restrictions = _restrictions(account)
    stake_access = str(getattr(account, "stake_access", "Not Checked")).strip()
    promo_access = str(getattr(account, "promo_access", "Not Checked")).strip()

    account_reason = ""
    if status in UNAVAILABLE_ACCOUNT_STATUSES:
        account_reason = f"Account is {getattr(account, 'status', '')}"
    elif lifecycle in UNAVAILABLE_ACCOUNT_LIFECYCLES:
        account_reason = f"Account lifecycle is {getattr(account, 'lifecycle_status', '')}"
    elif restrictions & BLOCKING_RESTRICTIONS:
        account_reason = "Account is blocked: " + ", ".join(
            sorted(restrictions & BLOCKING_RESTRICTIONS)
        )
    elif stake_access.casefold() == "blocked":
        account_reason = "Stake access is Blocked"
    elif bookmaker and require_promotional_access and (
        promo_access in {"None", "Restricted"}
        or "bonus restricted" in restrictions
        or status in {"bonus restricted", "promo restricted"}
    ):
        account_reason = "Account is not eligible for this promotion"

    account_eligible = not account_reason
    if not account_eligible:
        return NewActivityEligibility(
            state="unavailable",
            reason=account_reason,
            account_eligible=False,
            provider_eligible=provider_eligible,
            provider_lifecycle=provider_lifecycle,
            provider_catalogue_id=provider_catalogue_id,
            successor_provider_ids=successor_ids,
        )

    if not provider_eligible:
        if provider is None:
            reason = "Provider is not present in the governed Account Catalogue"
        else:
            reason = (
                f"Provider lifecycle is {provider.lifecycle} and is not eligible for new activity"
            )
        return NewActivityEligibility(
            state="unavailable",
            reason=reason,
            account_eligible=True,
            provider_eligible=False,
            provider_lifecycle=provider_lifecycle,
            provider_catalogue_id=provider_catalogue_id,
            successor_provider_ids=successor_ids,
        )

    if stake_access in {"Limited", "Severely Limited", "Not Checked"}:
        return NewActivityEligibility(
            state="warning",
            reason=(
                f"Confirm {getattr(account, 'account', 'Account')} stake access before using "
                "this Account"
            ),
            account_eligible=True,
            provider_eligible=True,
            provider_lifecycle=provider_lifecycle,
            provider_catalogue_id=provider_catalogue_id,
            successor_provider_ids=successor_ids,
        )

    return NewActivityEligibility(
        state="eligible",
        reason=(
            f"{getattr(account, 'account', 'Account')} and its provider are eligible for new "
            "activity"
        ),
        account_eligible=True,
        provider_eligible=True,
        provider_lifecycle=provider_lifecycle,
        provider_catalogue_id=provider_catalogue_id,
        successor_provider_ids=successor_ids,
    )
