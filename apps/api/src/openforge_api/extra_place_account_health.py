from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

ExtraPlaceAccessState = Literal["not_checked", "warning", "planning", "blocked"]


@dataclass(frozen=True)
class ExtraPlaceAccountHealth:
    access_state: ExtraPlaceAccessState
    capability_state: Literal["NotChecked"]
    reason: str
    allows_planning: bool
    allows_operational_use: bool


def resolve_extra_place_account_health(
    *,
    status: str,
    lifecycle_status: str,
    restrictions_json: str,
) -> ExtraPlaceAccountHealth:
    """Resolve safe Extra Places access without inventing capability evidence."""
    try:
        raw_restrictions = json.loads(restrictions_json or "[]")
    except json.JSONDecodeError:
        raw_restrictions = []
    restrictions = {
        str(value).strip().casefold()
        for value in raw_restrictions
        if str(value).strip()
    } if isinstance(raw_restrictions, list) else set()
    normalized_status = status.strip().casefold()
    normalized_lifecycle = lifecycle_status.strip().casefold()

    hard_restrictions = {"kyc blocked", "risk blocked", "login restricted"}
    if (
        normalized_status == "blocked"
        or normalized_lifecycle in {"suspended", "closed", "archived"}
        or restrictions.intersection(hard_restrictions)
    ):
        reason = next(
            (
                label
                for key, label in (
                    ("kyc blocked", "KYC blocked"),
                    ("risk blocked", "Risk blocked"),
                    ("login restricted", "Login restricted"),
                )
                if key in restrictions
            ),
            lifecycle_status or status or "Account blocked",
        )
        return ExtraPlaceAccountHealth(
            access_state="blocked",
            capability_state="NotChecked",
            reason=f"{reason}: this account cannot be used for new Extra Places activity.",
            allows_planning=False,
            allows_operational_use=False,
        )

    if normalized_lifecycle in {
        "not signed up",
        "pending sign up",
        "verification pending",
    }:
        return ExtraPlaceAccountHealth(
            access_state="planning",
            capability_state="NotChecked",
            reason=(
                "Account access is not ready. Planning is available, but the activity "
                "cannot be marked as placed."
            ),
            allows_planning=True,
            allows_operational_use=False,
        )

    if "soft limited" in restrictions or normalized_status in {
        "limited",
        "stake restricted",
    }:
        return ExtraPlaceAccountHealth(
            access_state="warning",
            capability_state="NotChecked",
            reason=(
                "Stake restrictions recorded. Extra Places remains available, but "
                "check the accepted stake."
            ),
            allows_planning=True,
            allows_operational_use=True,
        )

    return ExtraPlaceAccountHealth(
        access_state="not_checked",
        capability_state="NotChecked",
        reason="Extra Places capability has not been checked for this account.",
        allows_planning=True,
        allows_operational_use=True,
    )
