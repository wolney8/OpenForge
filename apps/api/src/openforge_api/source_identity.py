from __future__ import annotations

import re


SOURCE_NAMESPACE_BY_SHEET = {
    "Accounts": "account",
    "Sportsbook Bets": "sportsbook",
    "Sportsbook": "sportsbook",
    "Free Bets": "free_bet",
    "Casino Offers": "casino",
    "Casino": "casino",
    "Each Way / Extra Places": "extra_place",
    "Extra Places": "extra_place",
    "Cash Adjustments": "cash_adjustment",
}

ALLOWED_SOURCE_NAMESPACES = frozenset(SOURCE_NAMESPACE_BY_SHEET.values())
PARENT_RESOLUTION_STATES = frozenset(
    {"resolved", "missing", "ambiguous", "legacy_unresolved", "not_applicable"}
)


def logical_source_namespace(source_sheet: str) -> str:
    """Return the stable business namespace without treating a sheet title as identity."""

    normalized_sheet = source_sheet.strip()
    namespace = SOURCE_NAMESPACE_BY_SHEET.get(normalized_sheet)
    if namespace is not None:
        return namespace
    legacy = re.sub(r"[^a-z0-9]+", "_", normalized_sheet.casefold()).strip("_")
    if not legacy:
        raise ValueError("A source namespace cannot be derived from an empty source label")
    return f"legacy_{legacy}"


def validate_source_namespace(value: str) -> str:
    normalized = value.strip().casefold()
    if normalized in ALLOWED_SOURCE_NAMESPACES or normalized.startswith("legacy_"):
        return normalized
    raise ValueError(f"Unsupported source namespace: {value}")


def validate_parent_resolution_state(value: str) -> str:
    normalized = value.strip().casefold()
    if normalized not in PARENT_RESOLUTION_STATES:
        raise ValueError(f"Unsupported imported-parent resolution state: {value}")
    return normalized
