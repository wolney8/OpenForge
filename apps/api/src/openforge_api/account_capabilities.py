"""Profile Account capability evidence, separate from balance and financial state."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator

from openforge_api.auth import require_request_session
from openforge_api.db import connect, connect_read_only, postgres_runtime_enabled

router = APIRouter(
    prefix="/profiles/{profile_id}/accounts/{account_id}/capability-history", tags=["accounts"]
)


class CapabilityEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation_id: UUID
    expected_revision: int = Field(ge=0)
    capability: str = Field(min_length=2, max_length=80)
    scope_kind: Literal["general", "offer"]
    scope_ref: str = Field(default="", max_length=160)
    entry_kind: Literal[
        "observation", "review_no_change", "review_no_test", "correction", "retraction"
    ]
    state: str = Field(default="Unknown", max_length=80)
    interpretation: Literal["confirmed", "suspected", "conflicting", "unknown"] = "unknown"
    confidence: Literal["verified", "likely", "unverified", "stale"] = "unverified"
    evidence_type: str = Field(min_length=2, max_length=80)
    evidence_note: str = Field(default="", max_length=1000)
    source_ref: str = Field(default="", max_length=240)
    observed_at: str | None = None
    observed_precision: Literal["exact", "day", "approximate", "unknown"] = "unknown"
    effective_from: str | None = None
    effective_precision: Literal["exact", "day", "approximate", "unknown"] = "unknown"
    next_review_action: Literal["keep", "set", "clear"] = "keep"
    next_review_on: date | None = None
    correction_of: str | None = Field(default=None, max_length=100)
    correction_reason: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def validate_context(self) -> "CapabilityEntry":
        if self.scope_kind == "offer" and not self.scope_ref.strip():
            raise ValueError("An offer-specific observation needs its offer reference")
        if self.scope_kind == "general" and self.scope_ref:
            raise ValueError("General access cannot carry an offer reference")
        if self.entry_kind in {"correction", "retraction"} and (
            not self.correction_of or not self.correction_reason.strip()
        ):
            raise ValueError("Correction and retraction require a linked entry and reason")
        if self.entry_kind not in {"correction", "retraction"} and self.correction_of:
            raise ValueError("Only correction or retraction can link an earlier entry")
        if self.next_review_action == "set" and self.next_review_on is None:
            raise ValueError("Choose a next-review date")
        if self.next_review_action != "set" and self.next_review_on is not None:
            raise ValueError("A review date requires the Set action")
        for value, precision, name in (
            (self.observed_at, self.observed_precision, "Observed"),
            (self.effective_from, self.effective_precision, "Effective"),
        ):
            if precision == "unknown":
                if value is not None:
                    raise ValueError(f"{name} date must remain unknown")
            else:
                if value is None:
                    raise ValueError(f"{name} date is required for its precision")
                try:
                    if precision == "exact":
                        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
                        if stamp.tzinfo is None:
                            raise ValueError("timezone required")
                    else:
                        datetime.fromisoformat(value + "T00:00:00")
                except ValueError as error:
                    raise ValueError(f"{name} date does not match its precision") from error
        return self


def _actor(request: Request) -> str:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(403, "Fund Manager access is required")
    return session.email.strip().casefold()


def _account(connection: Any, profile_id: str, account_id: str) -> Any:
    row = connection.execute(
        "SELECT status,lifecycle_status FROM accounts WHERE profile_id=? AND account_id=?",
        (profile_id, account_id),
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Account not found for this Profile")
    return row


def _rows(connection: Any, profile_id: str, account_id: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in connection.execute(
            "SELECT * FROM account_capability_observations "
            "WHERE profile_id=? AND account_id=? ORDER BY revision DESC",
            (profile_id, account_id),
        ).fetchall()
    ]


def _summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {row["observation_id"]: row for row in rows}
    superseded = {row["correction_of"] for row in rows if row["correction_of"]}

    def underlying_kind(row: dict[str, Any]) -> str:
        seen: set[str] = set()
        while row["entry_kind"] == "correction" and row["correction_of"]:
            target = row["correction_of"]
            if target in seen or target not in by_id:
                return "unknown"
            seen.add(target)
            row = by_id[target]
        return str(row["entry_kind"])

    def applicable(row: dict[str, Any]) -> tuple[datetime, datetime] | None:
        # Exact values are instants. A day is a London calendar window, not
        # midnight evidence; an exact observation within it may still conflict.
        for value, precision in (
            (row["effective_from"], row["effective_precision"]),
            (row["observed_at"], row["observed_precision"]),
        ):
            if value and precision == "exact":
                instant = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
                return instant, instant + timedelta(microseconds=1)
            if value and precision == "day":
                day = date.fromisoformat(value)
                london = ZoneInfo("Europe/London")
                return (
                    datetime.combine(day, datetime.min.time(), london).astimezone(UTC),
                    datetime.combine(
                        day + timedelta(days=1), datetime.min.time(), london
                    ).astimezone(UTC),
                )
        return None

    active = [
        row
        for row in rows
        if row["observation_id"] not in superseded
        and row["entry_kind"] != "retraction"
    ]
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in active:
        if underlying_kind(row) != "observation":
            continue
        key = f"{row['capability']}|{row['scope_kind']}|{row['scope_ref']}"
        groups.setdefault(key, []).append(row)
    capabilities = []
    for key, entries in sorted(groups.items()):
        # Known effective dates take precedence over recorded/observed dates.
        # Unknown and approximate dates cannot displace later applicable evidence.
        dated = [(r, applicable(r)) for r in entries]
        dated = [(r, window) for r, window in dated if window is not None]
        latest = (
            max(dated, key=lambda pair: (pair[1][0], pair[0]["revision"]))[0]
            if dated
            else max(entries, key=lambda r: r["revision"])
        )
        latest_window = applicable(latest)
        conflict = latest["interpretation"] == "conflicting" or any(
            (window := applicable(r)) is not None
            and latest_window is not None
            and window[0] < latest_window[1]
            and latest_window[0] < window[1]
            and r["state"] != latest["state"]
            for r in entries
            if r["observation_id"] != latest["observation_id"]
        )
        capabilities.append(
            {
                "key": key,
                "capability": latest["capability"],
                "scope_kind": latest["scope_kind"],
                "scope_ref": latest["scope_ref"],
                "state": latest["state"]
                if latest["interpretation"] == "confirmed" and not conflict
                else "Needs review",
                "interpretation": latest["interpretation"],
                "confidence": latest["confidence"],
                "conflicting": conflict,
                "supporting_ids": [r["observation_id"] for r in entries],
                "latest_observed_at": latest["observed_at"],
                "latest_observed_precision": latest["observed_precision"],
                "latest_effective_from": latest["effective_from"],
                "latest_effective_precision": latest["effective_precision"],
            }
        )
    review = next(
        (r for r in active if underlying_kind(r) in {"review_no_change", "review_no_test"}),
        None,
    )
    verified = next(
        (
            r
            for r in active
            if underlying_kind(r) == "observation"
            and r["interpretation"] == "confirmed"
            and r["confidence"] == "verified"
        ),
        None,
    )
    next_review = None
    # Scheduling is an independent manual action. Withdrawing evidence does not
    # cancel a previously chosen date; only a later explicit set/clear does.
    for row in rows:
        if row["next_review_action"] != "keep":
            next_review = row["next_review_on"] if row["next_review_action"] == "set" else None
            break
    today = datetime.now(ZoneInfo("Europe/London")).date().isoformat()
    review_status = (
        "Overdue"
        if next_review and next_review < today
        else "Due today"
        if next_review == today
        else "Scheduled"
        if next_review
        else "Not scheduled"
    )
    return {
        "revision": rows[0]["revision"] if rows else 0,
        "capabilities": capabilities,
        "last_reviewed_at": review["recorded_at"] if review else None,
        "last_verified_at": verified["recorded_at"] if verified else None,
        "next_review_on": next_review,
        "review_due": review_status in {"Overdue", "Due today"},
        "review_status": review_status,
    }


@router.get("")
def read_capability_history(profile_id: str, account_id: str, request: Request) -> dict[str, Any]:
    _actor(request)
    if postgres_runtime_enabled():
        raise HTTPException(503, "Account capability history is available only in local SQLite")
    try:
        with connect_read_only() as connection:
            _account(connection, profile_id, account_id)
            rows = _rows(connection, profile_id, account_id)
            audit = [
                dict(r)
                for r in connection.execute(
                    "SELECT audit_id,action,changed_at,payload_json FROM account_audit "
                    "WHERE profile_id=? AND account_id=? ORDER BY changed_at DESC",
                    (profile_id, account_id),
                ).fetchall()
            ]
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(503, "Capability history is not activated for this database") from error
    return {"entries": rows, "account_audit": audit, "summary": _summary(rows)}


@router.post("", status_code=201)
def append_capability_history(
    profile_id: str, account_id: str, payload: CapabilityEntry, request: Request
) -> dict[str, Any]:
    actor = _actor(request)
    if postgres_runtime_enabled():
        raise HTTPException(503, "Account capability history is available only in local SQLite")
    values = payload.model_dump(mode="json", exclude={"expected_revision"})
    fingerprint = hashlib.sha256(
        json.dumps(values, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    try:
        with connect() as connection:
            if not postgres_runtime_enabled():
                # connect() may initialise existing schema rows before the write.
                # End that setup transaction, then lock the revision check and insert.
                connection.commit()
                connection.execute("BEGIN IMMEDIATE")
            account = _account(connection, profile_id, account_id)
            prior = connection.execute(
                "SELECT * FROM account_capability_observations "
                "WHERE profile_id=? AND operation_id=?",
                (profile_id, str(payload.operation_id)),
            ).fetchone()
            if prior is not None:
                if prior["account_id"] != account_id or prior["payload_hash"] != fingerprint:
                    raise HTTPException(
                        409, "This operation ID was used for different capability information"
                    )
                return {
                    "entry": dict(prior),
                    "summary": _summary(_rows(connection, profile_id, account_id)),
                    "replayed": True,
                }
            if account["status"] == "Archived" or account["lifecycle_status"] == "Archived":
                raise HTTPException(
                    409, "Archived Accounts retain history but cannot receive new observations"
                )
            rows = _rows(connection, profile_id, account_id)
            revision = rows[0]["revision"] if rows else 0
            if revision != payload.expected_revision:
                raise HTTPException(
                    409,
                    "Account capability history changed. Keep your draft and reload "
                    "before retrying",
                )
            if payload.correction_of:
                target = next(
                    (r for r in rows if r["observation_id"] == payload.correction_of), None
                )
                if (
                    target is None
                    or target["capability"] != payload.capability
                    or target["scope_kind"] != payload.scope_kind
                    or target["scope_ref"] != payload.scope_ref
                ):
                    raise HTTPException(
                        422, "Correction must reference the same Account capability and scope"
                    )
                if any(r["correction_of"] == payload.correction_of for r in rows):
                    raise HTTPException(
                        409, "This entry was already corrected; review the latest chain"
                    )
            stamp = datetime.now(UTC).isoformat(timespec="microseconds").replace("+00:00", "Z")
            entry = {
                **values,
                "observation_id": f"ACO-{payload.operation_id}",
                "profile_id": profile_id,
                "account_id": account_id,
                "next_review_on": values["next_review_on"],
                "schema_version": 1,
                "payload_hash": fingerprint,
                "revision": revision + 1,
                "actor": actor,
                "recorded_at": stamp,
            }
            columns = tuple(entry)
            connection.execute(
                f"INSERT INTO account_capability_observations ({','.join(columns)}) "
                f"VALUES ({','.join('?' for _ in columns)})",
                tuple(entry.values()),
            )
            return {"entry": entry, "summary": _summary([entry, *rows]), "replayed": False}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            503, "Capability observation was not saved. Keep the draft and retry"
        ) from error
