from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping
from uuid import uuid4


HISTORY_SCHEMA_VERSION = 1
ALLOWED_LEDGER_TYPES = frozenset(
    {"cash_adjustment", "extra_place", "casino", "sportsbook", "free_bet"}
)
ALLOWED_OPERATIONS = frozenset(
    {
        "baseline_observed",
        "created",
        "edited",
        "placement_recorded",
        "settled",
        "corrected",
        "voided",
        "archived",
        "removed",
        "reversed",
    }
)
REASON_REQUIRED_OPERATIONS = frozenset(
    {"corrected", "voided", "archived", "removed", "reversed"}
)


class FinancialHistoryConflictError(ValueError):
    """The same operation identity was reused for different evidence."""


@dataclass(frozen=True)
class FinancialHistoryEvent:
    history_id: str
    profile_id: str
    ledger_type: str
    activity_id: str
    operation: str
    recorded_at: str
    schema_version: int
    before_snapshot_json: str
    after_snapshot_json: str
    source_identity_json: str
    provenance_json: str
    reason: str
    actor_type: str
    actor_id: str
    operation_id: str
    mutation_hash: str


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def snapshot(value: Mapping[str, Any] | None) -> dict[str, Any] | None:
    return None if value is None else {str(key): item for key, item in value.items()}


def mutation_hash(
    *,
    profile_id: str,
    ledger_type: str,
    activity_id: str,
    operation: str,
    before: Mapping[str, Any] | None,
    after: Mapping[str, Any] | None,
    source_identity: Mapping[str, Any],
    provenance: Mapping[str, Any],
    reason: str,
) -> str:
    payload = canonical_json(
        {
            "profile_id": profile_id,
            "ledger_type": ledger_type,
            "activity_id": activity_id,
            "operation": operation,
            "before": snapshot(before),
            "after": snapshot(after),
            "source_identity": dict(source_identity),
            "provenance": dict(provenance),
            "reason": reason,
        }
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def append_history_event(
    connection: Any,
    *,
    profile_id: str,
    ledger_type: str,
    activity_id: str,
    operation: str,
    recorded_at: str,
    before: Mapping[str, Any] | None,
    after: Mapping[str, Any] | None,
    operation_id: str,
    source_identity: Mapping[str, Any] | None = None,
    provenance: Mapping[str, Any] | None = None,
    reason: str = "",
    actor_type: str = "system",
    actor_id: str = "",
) -> FinancialHistoryEvent:
    if ledger_type not in ALLOWED_LEDGER_TYPES:
        raise ValueError(f"Unsupported financial-history ledger: {ledger_type}")
    if operation not in ALLOWED_OPERATIONS:
        raise ValueError(f"Unsupported financial-history operation: {operation}")
    normalized_reason = reason.strip()
    if operation in REASON_REQUIRED_OPERATIONS and not normalized_reason:
        raise ValueError(f"{operation} requires a meaningful reason")
    source = dict(source_identity or {})
    evidence = {
        "calculation_contract": "current-ledger-row",
        "pre_baseline_history_available": operation != "baseline_observed",
        **dict(provenance or {}),
    }
    fingerprint = mutation_hash(
        profile_id=profile_id,
        ledger_type=ledger_type,
        activity_id=activity_id,
        operation=operation,
        before=before,
        after=after,
        source_identity=source,
        provenance=evidence,
        reason=normalized_reason,
    )
    existing = connection.execute(
        "SELECT * FROM financial_activity_history "
        "WHERE profile_id = ? AND operation_id = ?",
        (profile_id, operation_id),
    ).fetchone()
    if existing is not None:
        if str(existing["mutation_hash"]) != fingerprint:
            raise FinancialHistoryConflictError(
                "The operation identity was already used for different financial history"
            )
        return FinancialHistoryEvent(**dict(existing))

    event = FinancialHistoryEvent(
        history_id=f"FH-{uuid4().hex.upper()}",
        profile_id=profile_id,
        ledger_type=ledger_type,
        activity_id=activity_id,
        operation=operation,
        recorded_at=recorded_at,
        schema_version=HISTORY_SCHEMA_VERSION,
        before_snapshot_json=canonical_json(snapshot(before)),
        after_snapshot_json=canonical_json(snapshot(after)),
        source_identity_json=canonical_json(source),
        provenance_json=canonical_json(evidence),
        reason=normalized_reason,
        actor_type=actor_type,
        actor_id=actor_id,
        operation_id=operation_id,
        mutation_hash=fingerprint,
    )
    inserted = connection.execute(
        """
        INSERT INTO financial_activity_history (
          history_id, profile_id, ledger_type, activity_id, operation, recorded_at,
          schema_version, before_snapshot_json, after_snapshot_json,
          source_identity_json, provenance_json, reason, actor_type, actor_id,
          operation_id, mutation_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, operation_id) DO NOTHING
        """,
        tuple(event.__dict__.values()),
    )
    if inserted.rowcount == 0:
        existing = connection.execute(
            "SELECT * FROM financial_activity_history "
            "WHERE profile_id = ? AND operation_id = ?",
            (profile_id, operation_id),
        ).fetchone()
        assert existing is not None
        if str(existing["mutation_hash"]) != fingerprint:
            raise FinancialHistoryConflictError(
                "The operation identity was already used for different financial history"
            )
        return FinancialHistoryEvent(**dict(existing))
    return event


def ensure_baseline_event(
    connection: Any,
    *,
    profile_id: str,
    ledger_type: str,
    activity_id: str,
    current: Mapping[str, Any],
    recorded_at: str,
) -> None:
    exists = connection.execute(
        "SELECT 1 FROM financial_activity_history "
        "WHERE profile_id = ? AND ledger_type = ? AND activity_id = ? LIMIT 1",
        (profile_id, ledger_type, activity_id),
    ).fetchone()
    if exists is not None:
        return
    append_history_event(
        connection,
        profile_id=profile_id,
        ledger_type=ledger_type,
        activity_id=activity_id,
        operation="baseline_observed",
        recorded_at=recorded_at,
        before=None,
        after=current,
        operation_id=f"baseline:{ledger_type}:{activity_id}",
        provenance={
            "baseline_kind": "first_governed_mutation",
            "pre_baseline_history_available": False,
        },
    )


def list_history_events(
    connection: Any, *, profile_id: str, ledger_type: str, activity_id: str
) -> list[FinancialHistoryEvent]:
    rows = connection.execute(
        """
        SELECT * FROM financial_activity_history
        WHERE profile_id = ? AND ledger_type = ? AND activity_id = ?
        ORDER BY recorded_at, history_id
        """,
        (profile_id, ledger_type, activity_id),
    ).fetchall()
    return [FinancialHistoryEvent(**dict(row)) for row in rows]
