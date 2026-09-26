from __future__ import annotations

import json
import re
from typing import Any

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


def workbook_source_key(import_key: str) -> tuple[str, str, str] | None:
    """Read the existing workbook key without splitting colons inside an external ID."""
    sheet, separator, remainder = import_key.partition(":")
    source_id, hash_separator, source_hash = remainder.rpartition(":")
    if not separator or not hash_separator or not source_id or len(source_hash) != 20:
        return None
    if any(character not in "0123456789abcdef" for character in source_hash):
        return None
    return sheet, source_id, source_hash


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


def existing_import_identities(
    connection: Any, profile_id: str
) -> dict[tuple[str, str], list[dict[str, Any]]]:
    """Read existing canonical and portable identities plus older workbook write evidence."""
    identities: dict[tuple[str, str], list[dict[str, Any]]] = {}
    rows = [
        dict(row)
        for row in connection.execute(
            "SELECT source_namespace, source_record_id, source_hash, entity_type, entity_id "
            "FROM import_source_records WHERE profile_id = ?",
            (profile_id,),
        ).fetchall()
    ]
    rows.extend(
        json.loads(str(row["row_json"]))
        for row in connection.execute(
            "SELECT row_json FROM profile_portable_restored_provenance "
            "WHERE target_profile_id = ? AND sheet_name = 'Source Identities'",
            (profile_id,),
        ).fetchall()
    )
    for audit in connection.execute(
        "SELECT import_key, entity_type, entity_id FROM profile_import_write_audit "
        "WHERE profile_id = ? AND rolled_back_at = ''",
        (profile_id,),
    ).fetchall():
        parsed = workbook_source_key(str(audit["import_key"]))
        if parsed:
            rows.append(
                {
                    "source_namespace": logical_source_namespace(parsed[0]),
                    "source_record_id": parsed[1],
                    "source_hash": parsed[2],
                    "entity_type": audit["entity_type"],
                    "entity_id": audit["entity_id"],
                }
            )
    for row in rows:
        row["entity_type"] = {"account": "accounts"}.get(
            str(row["entity_type"]), row["entity_type"]
        )
        key = (str(row["source_namespace"]), str(row["source_record_id"]))
        identities.setdefault(key, []).append(row)
    return identities
