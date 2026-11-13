"""Viewer-owned Today annotations with explicit runtime and schema activation."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator, model_validator

from openforge_api.auth import require_request_session
from openforge_api.common_bet_combos import _profile_opportunities
from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.notifications import (
    FundManagerNotificationResponse,
    list_fund_manager_notifications,
    notification_profile_scope,
)
from openforge_api.runtime_safety import validate_runtime_contract

router = APIRouter(prefix="/fund-manager/tasks/annotations", tags=["task-annotations"])
ANNOTATION_ROW_SQL = (
    "SELECT annotation.*, profile.display_name AS profile_name "
    "FROM task_annotations annotation JOIN profiles profile "
    "ON profile.profile_id=annotation.profile_id "
    "WHERE annotation.viewer_email=? "
    "AND annotation.profile_id=? AND annotation.occurrence_key=?"
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS task_annotations (
  viewer_email TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  occurrence_key TEXT NOT NULL,
  source_key TEXT NOT NULL,
  title_snapshot TEXT NOT NULL,
  tracked INTEGER NOT NULL,
  work_state TEXT NOT NULL,
  blocked_reason TEXT,
  review_date TEXT,
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (viewer_email, profile_id, occurrence_key),
  FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_annotations_viewer_tracked
  ON task_annotations(viewer_email, tracked, updated_at);
"""
REVIEW_ALTERATIONS = (
    "ALTER TABLE task_annotations ADD COLUMN next_action TEXT",
    "ALTER TABLE task_annotations ADD COLUMN notes TEXT",
    "ALTER TABLE task_annotations ADD COLUMN reviewed_at TEXT",
)

WorkState = Literal["To Do", "In Progress", "Blocked", "Do Later"]


class AnnotationChange(BaseModel):
    profile_id: str = Field(min_length=1)
    occurrence_key: str = Field(min_length=1)
    tracked: bool
    work_state: WorkState = "To Do"
    blocked_reason: str | None = Field(default=None, max_length=500)
    review_date: date | None = None
    expected_version: int = Field(ge=0)
    next_action: str | None = Field(default=None, max_length=240)
    notes: str | None = Field(default=None, max_length=4000)
    reviewed: bool | None = None

    @field_validator("next_action", "notes")
    @classmethod
    def normalize_personal_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if "\x00" in value:
            raise ValueError("Personal text cannot contain NUL characters")
        return value.replace("\r\n", "\n").strip() or None

    @model_validator(mode="after")
    def validate_state(self) -> "AnnotationChange":
        if self.blocked_reason and self.work_state != "Blocked":
            raise ValueError("A blocked reason requires Blocked state")
        if self.review_date and self.work_state != "Do Later":
            raise ValueError("A review date requires Do Later state")
        if self.work_state == "Do Later" and self.review_date is None:
            raise ValueError("Do Later requires a review date")
        return self


class BatchChange(BaseModel):
    changes: list[AnnotationChange] = Field(min_length=1, max_length=32)


def _require_enabled() -> None:
    identity = validate_runtime_contract(settings)
    isolated = (
        identity.database_classification == "isolated"
        and identity.role in {"candidate", "test"}
        and identity.database_engine == "sqlite"
        and settings.task_annotations_isolated_enabled
    )
    normal = (
        identity.database_classification == "normal-owner"
        and identity.role == "normal-owner"
        and identity.database_engine == "sqlite"
        and settings.task_annotations_normal_enabled
    )
    if not isolated and not normal:
        raise HTTPException(status_code=503, detail="Task tracking is awaiting activation")
    if _review_enabled():
        with connect() as connection:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(task_annotations)")}
        if not {"next_action", "notes", "reviewed_at"}.issubset(columns):
            raise HTTPException(
                status_code=503, detail="Personal review schema is awaiting activation"
            )


def _review_enabled() -> bool:
    identity = validate_runtime_contract(settings)
    return bool(
        identity.database_engine == "sqlite"
        and (
            identity.database_classification == "isolated"
            and identity.role in {"candidate", "test"}
            and settings.task_annotations_isolated_enabled
            and settings.task_annotations_review_isolated_enabled
            or identity.database_classification == "normal-owner"
            and identity.role == "normal-owner"
            and settings.task_annotations_normal_enabled
            and settings.task_annotations_review_normal_enabled
        )
    )


def install_isolated_schema() -> None:
    """Called only by the independently authenticated synthetic fixture runner."""
    identity = validate_runtime_contract(settings)
    if (
        identity.database_classification != "isolated"
        or identity.database_engine != "sqlite"
        or not settings.task_annotations_isolated_enabled
    ):
        raise RuntimeError("Isolated task schema requires an enabled isolated runtime")
    with connect() as connection:
        for statement in SCHEMA.split(";"):
            if statement.strip():
                connection.execute(statement)
        if _review_enabled():
            for statement in REVIEW_ALTERATIONS:
                connection.execute(statement)


def _row_payload(
    row, current: dict[str, FundManagerNotificationResponse], review_enabled: bool = False
) -> dict[str, object]:
    occurrence = str(row["occurrence_key"])
    source = current.get(occurrence)
    if source is not None and source.profile_id != str(row["profile_id"]):
        source = None
    if source is not None:
        status = "resolved" if source.task_state == "done" else "active"
    else:
        related = any(
            f"{item.notification_type}:{item.profile_id}:{item.record_id}" == str(row["source_key"])
            for item in current.values()
        )
        status = "changed" if related else "unavailable"
    result = {
        "profile_id": str(row["profile_id"]),
        "profile_name": (
            source.profile_name
            if source is not None and source.profile_name
            else str(row["profile_name"])
        ),
        "occurrence_key": occurrence,
        "source_key": str(row["source_key"]),
        "title": source.title if source is not None else str(row["title_snapshot"]),
        "source_status": status,
        "tracked": bool(row["tracked"]),
        "work_state": str(row["work_state"]),
        "blocked_reason": row["blocked_reason"],
        "review_date": row["review_date"],
        "version": int(row["version"]),
        "updated_at": str(row["updated_at"]),
    }
    if review_enabled:
        result.update(
            next_action=row["next_action"],
            notes=row["notes"],
            reviewed_at=row["reviewed_at"],
        )
    return result


def _viewer(request: Request) -> str:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Access unavailable")
    return session.email.strip().casefold()


def _current_sources(
    request: Request, owned: set[str]
) -> dict[str, FundManagerNotificationResponse]:
    """Resolve existing task occurrences plus authorised Profile opportunity rows.

    Opportunity rows are annotation sources, not new notifications or financial
    records. Their period key keeps weekly occurrences distinct and existing
    reminder IDs compatible with annotations already saved by a viewer.
    """
    current = {
        item.notification_id: item
        for item in list_fund_manager_notifications(request)
        if item.kind == "task" and item.profile_id in owned
    }
    for profile_id in owned:
        for opportunity in _profile_opportunities(profile_id):
            occurrence = (
                f"profile-opportunity:{profile_id}:"
                f"{opportunity.opportunity_key}:{opportunity.period_key}"
            )
            if occurrence in current:
                continue
            current[occurrence] = FundManagerNotificationResponse(
                audience="fund_manager",
                security_tag="fund_manager_only",
                kind="task",
                task_state="done" if opportunity.already_created else "new",
                notification_id=occurrence,
                notification_type="profile_opportunity_reminder",
                title=opportunity.label,
                ledger_label="Opportunity Queue",
                bookmaker_label=opportunity.bookmaker,
                message="Advisory Profile opportunity; availability is unverified.",
                profile_id=profile_id,
                profile_name="",
                record_id=opportunity.opportunity_key,
                due_at="",
                settles_at="",
                created_at="",
                href=f"/profiles/{profile_id}/tracker/accounts#profile-opportunities",
                completion_href="",
                tone="info",
            )
    return current


@router.get("")
def list_annotations(request: Request) -> list[dict[str, object]]:
    _require_enabled()
    review_enabled = _review_enabled()
    viewer = _viewer(request)
    owned = notification_profile_scope(viewer, active_only=True)
    current = _current_sources(request, owned)
    with connect() as connection:
        rows = connection.execute(
            "SELECT annotation.*, profile.display_name AS profile_name "
            "FROM task_annotations annotation JOIN profiles profile "
            "ON profile.profile_id=annotation.profile_id "
            "WHERE annotation.viewer_email=? "
            "ORDER BY annotation.updated_at DESC, annotation.occurrence_key",
            (viewer,),
        ).fetchall()
    return [
        _row_payload(row, current, review_enabled)
        for row in rows
        if str(row["profile_id"]) in owned
    ]


@router.patch("")
def patch_annotations(request: Request, payload: BatchChange) -> list[dict[str, object]]:
    _require_enabled()
    review_enabled = _review_enabled()
    if not review_enabled and any(
        {"next_action", "notes", "reviewed"} & change.model_fields_set for change in payload.changes
    ):
        raise HTTPException(status_code=503, detail="Personal review is awaiting activation")
    viewer = _viewer(request)
    owned = notification_profile_scope(viewer, active_only=True)
    keys = [(change.profile_id, change.occurrence_key) for change in payload.changes]
    if len(set(keys)) != len(keys):
        raise HTTPException(status_code=422, detail="Duplicate task in update")
    if any(profile_id not in owned for profile_id, _ in keys):
        raise HTTPException(status_code=404, detail="Task unavailable")
    current = _current_sources(request, owned)
    now = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
    with connect() as connection:
        prepared = []
        for change in payload.changes:
            row = connection.execute(
                ANNOTATION_ROW_SQL,
                (viewer, change.profile_id, change.occurrence_key),
            ).fetchone()
            source = current.get(change.occurrence_key)
            review_fields = {"next_action", "notes", "reviewed"} & change.model_fields_set
            if source is not None and source.profile_id != change.profile_id:
                raise HTTPException(status_code=404, detail="Task unavailable")
            if row is None and source is None:
                raise HTTPException(status_code=404, detail="Task unavailable")
            trusted_advisory = (
                source is not None and source.notification_type == "profile_opportunity_reminder"
            ) or (
                row is not None
                and str(row["source_key"]).startswith("profile_opportunity_reminder:")
            )
            if review_fields and not trusted_advisory:
                raise HTTPException(
                    status_code=422, detail="Personal review is for advisory opportunities only"
                )
            if (
                change.reviewed is True
                and not (row is not None and row["reviewed_at"])
                and (source is None or source.notification_type != "profile_opportunity_reminder")
            ):
                raise HTTPException(
                    status_code=409, detail="Opportunity source is no longer current"
                )
            if (
                source is None
                and change.tracked
                and not (review_fields and row is not None and bool(row["tracked"]))
            ):
                raise HTTPException(status_code=409, detail="Source task is no longer current")
            if (
                review_enabled
                and row is not None
                and row["reviewed_at"]
                and change.tracked
                and not bool(row["tracked"])
                and change.reviewed is not False
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Reopen this reviewed opportunity before tracking it again",
                )
            next_action = (
                change.next_action
                if "next_action" in review_fields
                else row["next_action"]
                if review_enabled and row is not None
                else None
            )
            notes = (
                change.notes
                if "notes" in review_fields
                else row["notes"]
                if review_enabled and row is not None
                else None
            )
            previous_reviewed_at = (
                row["reviewed_at"] if review_enabled and row is not None else None
            )
            reviewed_at = (
                now
                if change.reviewed is True and previous_reviewed_at is None
                else None
                if change.reviewed is False
                else previous_reviewed_at
            )
            desired = (
                change.tracked,
                change.work_state,
                change.blocked_reason or None,
                change.review_date.isoformat() if change.review_date else None,
            )
            if review_enabled:
                desired += (next_action, notes, reviewed_at)
            existing = (
                None
                if row is None
                else (
                    bool(row["tracked"]),
                    str(row["work_state"]),
                    row["blocked_reason"],
                    row["review_date"],
                )
                + ((row["next_action"], row["notes"], row["reviewed_at"]) if review_enabled else ())
            )
            if existing == desired:
                prepared.append((change, row, source, False, next_action, notes, reviewed_at))
                continue
            version = int(row["version"]) if row is not None else 0
            if change.expected_version != version:
                raise HTTPException(
                    status_code=409, detail="Task annotation changed; refresh and retry"
                )
            prepared.append((change, row, source, True, next_action, notes, reviewed_at))
        for change, row, source, write, next_action, notes, reviewed_at in prepared:
            if not write:
                continue
            source_key = (
                f"{source.notification_type}:{source.profile_id}:{source.record_id}"
                if source is not None
                else str(row["source_key"])
            )
            title = source.title if source is not None else str(row["title_snapshot"])
            if row is None and review_enabled:
                result = connection.execute(
                    """INSERT INTO task_annotations
                       (viewer_email,profile_id,occurrence_key,source_key,title_snapshot,tracked,
                        work_state,blocked_reason,review_date,version,updated_at,next_action,notes,reviewed_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                       ON CONFLICT(viewer_email,profile_id,occurrence_key) DO NOTHING""",
                    (
                        viewer,
                        change.profile_id,
                        change.occurrence_key,
                        source_key,
                        title,
                        int(change.tracked),
                        change.work_state,
                        change.blocked_reason or None,
                        change.review_date.isoformat() if change.review_date else None,
                        1,
                        now,
                        next_action,
                        notes,
                        reviewed_at,
                    ),
                )
            elif row is None:
                result = connection.execute(
                    """INSERT INTO task_annotations
                       (viewer_email,profile_id,occurrence_key,source_key,title_snapshot,tracked,
                        work_state,blocked_reason,review_date,version,updated_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)
                       ON CONFLICT(viewer_email,profile_id,occurrence_key) DO NOTHING""",
                    (
                        viewer,
                        change.profile_id,
                        change.occurrence_key,
                        source_key,
                        title,
                        int(change.tracked),
                        change.work_state,
                        change.blocked_reason or None,
                        change.review_date.isoformat() if change.review_date else None,
                        1,
                        now,
                    ),
                )
            elif review_enabled:
                result = connection.execute(
                    """UPDATE task_annotations SET source_key=?,title_snapshot=?,tracked=?,
                       work_state=?,blocked_reason=?,review_date=?,next_action=?,notes=?,reviewed_at=?,
                       version=version+1,updated_at=?
                       WHERE viewer_email=? AND profile_id=? AND occurrence_key=? AND version=?""",
                    (
                        source_key,
                        title,
                        int(change.tracked),
                        change.work_state,
                        change.blocked_reason or None,
                        change.review_date.isoformat() if change.review_date else None,
                        next_action,
                        notes,
                        reviewed_at,
                        now,
                        viewer,
                        change.profile_id,
                        change.occurrence_key,
                        change.expected_version,
                    ),
                )
            else:
                result = connection.execute(
                    """UPDATE task_annotations SET source_key=?,title_snapshot=?,tracked=?,
                       work_state=?,blocked_reason=?,review_date=?,version=version+1,updated_at=?
                       WHERE viewer_email=? AND profile_id=? AND occurrence_key=? AND version=?""",
                    (
                        source_key,
                        title,
                        int(change.tracked),
                        change.work_state,
                        change.blocked_reason or None,
                        change.review_date.isoformat() if change.review_date else None,
                        now,
                        viewer,
                        change.profile_id,
                        change.occurrence_key,
                        change.expected_version,
                    ),
                )
            if result.rowcount != 1:
                raise HTTPException(
                    status_code=409, detail="Task annotation changed; refresh and retry"
                )
        rows = [
            connection.execute(
                ANNOTATION_ROW_SQL,
                (viewer, change.profile_id, change.occurrence_key),
            ).fetchone()
            for change in payload.changes
        ]
    return [_row_payload(row, current, review_enabled) for row in rows]
