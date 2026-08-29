from __future__ import annotations

import base64
import binascii
import hashlib
import json
from datetime import UTC, datetime
from pathlib import PurePath
from typing import Any
from xml.etree.ElementTree import ParseError
from zipfile import BadZipFile

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.auth import require_request_session
from openforge_api.db import connect
from openforge_api.founder_import_review import (
    ACTION_STATUS,
    SAFE_BATCH_ACTIONS,
    BatchDecisionPayload,
    ReviewDecisionPayload,
    _allowed_actions,
    _decision_overrides,
    apply_review_decisions,
    build_review_items_from_dry_run,
)
from openforge_api.founder_workbook_dry_run import build_founder_workbook_dry_run_bytes

router = APIRouter(prefix="/profiles/{profile_id}/workbook-imports", tags=["profile-imports"])

MAX_WORKBOOK_BYTES = 3 * 1024 * 1024
MAX_WORKBOOK_BASE64_CHARACTERS = 4_400_000


class WorkbookAnalysisPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_filename: str = Field(min_length=1, max_length=240)
    workbook_base64: str = Field(min_length=8, max_length=MAX_WORKBOOK_BASE64_CHARACTERS)
    effective_at: str = Field(min_length=10, max_length=50)

    @field_validator("source_filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        filename = PurePath(value.strip()).name
        if not filename.casefold().endswith(".xlsx"):
            raise ValueError("Select an .xlsx workbook")
        return filename

    @field_validator("effective_at")
    @classmethod
    def validate_effective_at(cls, value: str) -> str:
        normalized = value.strip()
        try:
            parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError("Enter a valid workbook effective date and time") from exc
        if parsed.tzinfo is None:
            raise ValueError("Workbook effective time must include a timezone")
        return parsed.isoformat()


class ImportApprovalPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workbook_checksum: str = Field(min_length=64, max_length=64)
    acknowledged: bool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _decode_workbook(payload: WorkbookAnalysisPayload) -> bytes:
    try:
        content = base64.b64decode(payload.workbook_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=422, detail="The workbook upload is invalid") from exc
    if not content or len(content) > MAX_WORKBOOK_BYTES:
        raise HTTPException(status_code=413, detail="Workbook must be no larger than 3 MB")
    if not content.startswith(b"PK"):
        raise HTTPException(
            status_code=422, detail="The uploaded file is not a valid .xlsx workbook"
        )
    return content


def _profile_exists(profile_id: str) -> bool:
    with connect() as connection:
        return (
            connection.execute(
                "SELECT 1 FROM profiles WHERE profile_id = ?", (profile_id,)
            ).fetchone()
            is not None
        )


def _json(value: Any) -> str:
    return json.dumps(value, default=str, separators=(",", ":"), sort_keys=True)


def _summary(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": result["schema"],
        "accounts": {
            **{
                key: result["accounts"][key]
                for key in (
                    "type_counts",
                    "status_counts",
                    "resolution_counts",
                    "balances",
                    "total_balance",
                    "pending_withdrawals",
                )
                if key in result["accounts"]
            },
            "row_count": len(result["accounts"].get("validation_rows", [])),
        },
        "profile_settings": result["profile_settings"],
        "ledgers": {key: value["summary"] for key, value in result["ledgers"].items()},
        "extra_places": {
            "classification_counts": result["extra_places"].get("classification_counts", {}),
            "row_count": len(result["extra_places"].get("rows", [])),
        },
        "reports": result["reports"],
        "readiness": result["readiness"],
    }


def _load_run(profile_id: str, import_run_id: str) -> dict[str, Any]:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM profile_import_runs WHERE profile_id = ? AND import_run_id = ?",
            (profile_id, import_run_id),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Workbook review was not found")
    record = dict(row)
    record["summary"] = json.loads(record.pop("summary_json"))
    record["reconciliation"] = json.loads(record.pop("reconciliation_json"))
    record["raw_workbook_retained"] = bool(record["raw_workbook_retained"])
    return record


def _workspace(profile_id: str, import_run_id: str) -> dict[str, Any]:
    run = _load_run(profile_id, import_run_id)
    with connect() as connection:
        item_rows = connection.execute(
            """
            SELECT item_json FROM profile_import_review_items
            WHERE profile_id = ? AND import_run_id = ? ORDER BY source_sheet, source_row, item_id
            """,
            (profile_id, import_run_id),
        ).fetchall()
        decision_rows = connection.execute(
            """
            SELECT item_id, decision_json FROM profile_import_review_decisions
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (profile_id, import_run_id),
        ).fetchall()
    items = [json.loads(row["item_json"]) for row in item_rows]
    decisions = {row["item_id"]: json.loads(row["decision_json"]) for row in decision_rows}
    metadata = {
        "import_run_id": import_run_id,
        "profile_id": profile_id,
        "source_filename": run["source_filename"],
        "effective_at": run["effective_at"],
        "workbook_checksum": run["workbook_checksum"],
        "mapping_version": run["mapping_version"],
        "original_partial_count": int(
            run["summary"]["readiness"]["partial_rows_requiring_mapping_decisions"]
        ),
        "provider_conflict_count": int(run["summary"]["readiness"]["provider_conflicts"]),
        "historical_ep_count": int(
            run["summary"]["readiness"]["historical_ep_rows_requiring_review"]
        ),
        "real_import_performed": False,
        "raw_workbook_retained": False,
    }
    workspace = apply_review_decisions(metadata, items, decisions)
    workspace["run_status"] = run["status"]
    workspace["source_summary"] = run["summary"]
    return workspace


def _save_decision(
    *,
    profile_id: str,
    import_run_id: str,
    item: dict[str, Any],
    decision: dict[str, Any],
    actor_email: str,
) -> None:
    run = _load_run(profile_id, import_run_id)
    now = _now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_review_decisions (
              import_run_id, item_id, profile_id, workbook_checksum, mapping_version,
              source_fingerprint, decision_json, actor_email, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(import_run_id, item_id) DO UPDATE SET
              source_fingerprint = excluded.source_fingerprint,
              decision_json = excluded.decision_json,
              actor_email = excluded.actor_email,
              updated_at = excluded.updated_at
            """,
            (
                import_run_id,
                item["item_id"],
                profile_id,
                run["workbook_checksum"],
                run["mapping_version"],
                item["source_fingerprint"],
                _json(decision),
                actor_email,
                now,
                now,
            ),
        )
        connection.execute(
            """
            UPDATE profile_import_runs
            SET status = 'REVIEW_REQUIRED', updated_at = ?
            WHERE import_run_id = ?
            """,
            (now, import_run_id),
        )


@router.get("")
def list_profile_workbook_imports(profile_id: str, request: Request) -> list[dict[str, Any]]:
    require_request_session(request)
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT import_run_id, profile_id, source_filename, workbook_checksum,
                   workbook_size_bytes, effective_at, mapping_version, status,
                   raw_workbook_retained, created_at, updated_at
            FROM profile_import_runs WHERE profile_id = ? ORDER BY updated_at DESC
            """,
            (profile_id,),
        ).fetchall()
    return [
        {**dict(row), "raw_workbook_retained": bool(row["raw_workbook_retained"])} for row in rows
    ]


@router.post("/analyse")
def analyse_profile_workbook(
    profile_id: str, payload: WorkbookAnalysisPayload, request: Request
) -> dict[str, Any]:
    session = require_request_session(request)
    if not _profile_exists(profile_id):
        raise HTTPException(status_code=404, detail="Profile was not found")
    content = _decode_workbook(payload)
    checksum = hashlib.sha256(content).hexdigest()
    try:
        result = build_founder_workbook_dry_run_bytes(
            content,
            source_filename=payload.source_filename,
            source_path="authenticated-upload",
            effective_at=payload.effective_at,
        )
        metadata, items = build_review_items_from_dry_run(result, content)
    except (BadZipFile, KeyError, ParseError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Workbook schema is not supported") from exc
    finally:
        content = b""

    mapping_version = str(result["metadata"]["mapping_version"])
    import_run_id = (
        "profile-import-"
        + hashlib.sha256(f"{profile_id}:{checksum}:{mapping_version}".encode("utf-8")).hexdigest()[
            :32
        ]
    )
    now = _now()
    status = "REVIEW_REQUIRED" if items else "READY"
    summary = _summary(result)
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, raw_workbook_retained, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(profile_id, workbook_checksum, mapping_version) DO UPDATE SET
              owner_email = excluded.owner_email,
              source_filename = excluded.source_filename,
              workbook_size_bytes = excluded.workbook_size_bytes,
              effective_at = excluded.effective_at,
              status = excluded.status,
              summary_json = excluded.summary_json,
              updated_at = excluded.updated_at
            """,
            (
                import_run_id,
                profile_id,
                session.email,
                payload.source_filename,
                checksum,
                int(result["metadata"]["size_bytes"]),
                payload.effective_at,
                mapping_version,
                status,
                _json(summary),
                _json(result["reconciliation"]),
                now,
                now,
            ),
        )
        for item in items:
            connection.execute(
                """
                INSERT INTO profile_import_review_items (
                  import_run_id, item_id, profile_id, import_id, source_fingerprint,
                  source_sheet, source_row, source_record_id, category, item_json,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(import_run_id, item_id) DO UPDATE SET
                  source_fingerprint = excluded.source_fingerprint,
                  item_json = excluded.item_json,
                  updated_at = excluded.updated_at
                """,
                (
                    import_run_id,
                    item["item_id"],
                    profile_id,
                    item["import_id"],
                    item["source_fingerprint"],
                    item["source_sheet"],
                    item["source_row"],
                    item["source_record_id"],
                    item["category"],
                    _json(item),
                    now,
                    now,
                ),
            )
    return _workspace(profile_id, import_run_id)


@router.get("/{import_run_id}")
def get_profile_workbook_import(
    profile_id: str, import_run_id: str, request: Request
) -> dict[str, Any]:
    require_request_session(request)
    return _workspace(profile_id, import_run_id)


@router.put("/{import_run_id}/decisions/{item_id}")
def put_profile_workbook_import_decision(
    profile_id: str,
    import_run_id: str,
    item_id: str,
    payload: ReviewDecisionPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    if payload.item_id != item_id:
        raise HTTPException(status_code=400, detail="Review item identity does not match")
    workspace = _workspace(profile_id, import_run_id)
    item = next((entry for entry in workspace["items"] if entry["item_id"] == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Review item was not found")
    if item["source_fingerprint"] != payload.source_fingerprint:
        raise HTTPException(status_code=409, detail="Source row changed; review the updated row")
    if payload.action not in ACTION_STATUS or payload.action not in _allowed_actions(item):
        raise HTTPException(status_code=422, detail="Unsupported review decision")
    if payload.action == "map_existing_provider":
        catalogue = load_master_account_catalogue()
        if not any(record.catalogue_id == payload.catalogue_id for record in catalogue.records):
            raise HTTPException(status_code=422, detail="Catalogue provider was not found")
    now = _now()
    decision = {
        "item_id": item_id,
        "import_id": item["import_id"],
        "source_fingerprint": item["source_fingerprint"],
        "issue_type": item["issue_type"],
        "action": payload.action,
        "status": ACTION_STATUS[payload.action],
        "target_type": payload.target_type.strip(),
        "catalogue_id": payload.catalogue_id.strip(),
        "note": payload.note.strip(),
        "override_fields": _decision_overrides(item, payload),
        "actor": session.email,
        "created_at": item.get("decision", {}).get("created_at", now)
        if item.get("decision")
        else now,
        "updated_at": now,
    }
    _save_decision(
        profile_id=profile_id,
        import_run_id=import_run_id,
        item=item,
        decision=decision,
        actor_email=session.email,
    )
    return _workspace(profile_id, import_run_id)


@router.post("/{import_run_id}/decisions/batch")
def put_profile_workbook_import_batch(
    profile_id: str,
    import_run_id: str,
    payload: BatchDecisionPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    if (payload.issue_type, payload.action) not in SAFE_BATCH_ACTIONS:
        raise HTTPException(status_code=422, detail="This pattern is not safe for batch review")
    workspace = _workspace(profile_id, import_run_id)
    items_by_id = {item["item_id"]: item for item in workspace["items"]}
    selected = [items_by_id.get(item_id) for item_id in payload.item_ids]
    if any(item is None for item in selected):
        raise HTTPException(status_code=404, detail="One or more review items were not found")
    for item in selected:
        assert item is not None
        if payload.issue_type not in item["issue_types"]:
            raise HTTPException(
                status_code=422, detail="Batch rows do not share the selected issue"
            )
        if payload.source_fingerprints.get(item["item_id"]) != item["source_fingerprint"]:
            raise HTTPException(
                status_code=409, detail="A source row changed; review the batch again"
            )
        override_fields: dict[str, Any] = {}
        if payload.action == "historical_imported_calculation":
            override_fields = {"calculation_provenance": "imported_historical"}
        elif payload.action == "preserve_and_shorten":
            override_fields = {"canonical_text_rule": "truncate_to_200_with_full_source_preserved"}
        elif payload.action == "historical_casino_label":
            override_fields = {"offer_name": "Historical Casino Offer", "label_generated": True}
        now = _now()
        _save_decision(
            profile_id=profile_id,
            import_run_id=import_run_id,
            item=item,
            actor_email=session.email,
            decision={
                "item_id": item["item_id"],
                "import_id": item["import_id"],
                "source_fingerprint": item["source_fingerprint"],
                "issue_type": payload.issue_type,
                "action": payload.action,
                "status": ACTION_STATUS[payload.action],
                "target_type": item["proposed_target"],
                "catalogue_id": "",
                "note": payload.note.strip(),
                "override_fields": override_fields,
                "actor": session.email,
                "batch_decision": True,
                "created_at": now,
                "updated_at": now,
            },
        )
    return _workspace(profile_id, import_run_id)


@router.post("/{import_run_id}/rerun")
def rerun_profile_workbook_import(
    profile_id: str, import_run_id: str, request: Request
) -> dict[str, Any]:
    require_request_session(request)
    workspace = _workspace(profile_id, import_run_id)
    status = "READY" if workspace["reconciliation"]["import_ready"] else "REVIEW_REQUIRED"
    now = _now()
    with connect() as connection:
        connection.execute(
            """
            UPDATE profile_import_runs SET status = ?, reconciliation_json = ?, updated_at = ?
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (status, _json(workspace["reconciliation"]), now, profile_id, import_run_id),
        )
    workspace["run_status"] = status
    return workspace


@router.post("/{import_run_id}/approve")
def approve_profile_workbook_import(
    profile_id: str,
    import_run_id: str,
    payload: ImportApprovalPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    workspace = _workspace(profile_id, import_run_id)
    if payload.workbook_checksum != workspace["metadata"]["workbook_checksum"]:
        raise HTTPException(status_code=409, detail="Workbook checksum does not match this review")
    if not payload.acknowledged or not workspace["reconciliation"]["import_ready"]:
        raise HTTPException(status_code=422, detail="Resolve review blockers before approval")
    now = _now()
    with connect() as connection:
        connection.execute(
            """
            UPDATE profile_import_runs
            SET status = 'READY_APPROVED', owner_email = ?, updated_at = ?
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (session.email, now, profile_id, import_run_id),
        )
    return {
        "import_run_id": import_run_id,
        "status": "READY_APPROVED",
        "real_import_performed": False,
        "next_requirement": (
            "Re-upload the same checksum for the separately approved import tranche"
        ),
    }
