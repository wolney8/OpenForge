"""Central role metadata for routes and modules pending authenticated enforcement.

This registry is intentionally declarative. The current local Fund Manager mode has no
identity boundary, so callers must not treat these tags as runtime authorisation yet.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SecurityTag = Literal["fund_manager_only", "subscriber_allowed"]


@dataclass(frozen=True)
class SecurityPolicy:
    area: str
    security_tag: SecurityTag
    rationale: str


SECURITY_POLICIES: dict[str, SecurityPolicy] = {
    "profile_settings": SecurityPolicy("profile_settings", "fund_manager_only", "Profile configuration changes."),
    "profile_import_export": SecurityPolicy("profile_import_export", "fund_manager_only", "Sensitive import, export and staging controls."),
    "fund_manager_catalogue": SecurityPolicy("fund_manager_catalogue", "fund_manager_only", "Global provider identity and defaults."),
    "fund_manager_quick_actions": SecurityPolicy("fund_manager_quick_actions", "fund_manager_only", "Mandatory and global Quick Action authority."),
    "site_settings": SecurityPolicy("site_settings", "fund_manager_only", "Deferred platform, access and integration controls."),
    "profile_quick_actions": SecurityPolicy("profile_quick_actions", "fund_manager_only", "Profile-scoped Quick Action defaults."),
    "notifications": SecurityPolicy("notifications", "fund_manager_only", "Notification templates and delivery preferences."),
}


def security_policy_for(area: str) -> SecurityPolicy:
    return SECURITY_POLICIES[area]
