from __future__ import annotations

import base64
import binascii
import hashlib
import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import PurePath
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.auth import require_request_session
from openforge_api.db import connect, list_accounts
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
from openforge_api.founder_workbook_dry_run import (
    FOUNDER_ANALYSIS_WORK_UNIT_TOTAL,
    FOUNDER_MAPPING_VERSION,
    build_founder_workbook_dry_run_bytes,
)
from openforge_api.profile_import_execution import (
    advance_import_execution,
    list_active_import_executions,
    load_import_execution,
    start_import_execution,
)
from openforge_api.profile_workbook_cutover import (
    ImportCutoverError,
    ImportPersistenceError,
    _profile_state_checksum,
    _profile_state_manifest,
    build_base_write_plan,
    completed_import_rollback_safety,
    failed_import_safety,
    final_import_summary,
    load_base_write_plan,
    rollback_import,
    save_base_write_plan,
    validate_import_approval_preflight,
    validate_import_preflight,
)

router = APIRouter(prefix="/profiles/{profile_id}/workbook-imports", tags=["profile-imports"])
execution_router = APIRouter(
    prefix="/fund-manager/import-executions", tags=["profile-import-executions"]
)
logger = logging.getLogger(__name__)

MAX_WORKBOOK_BYTES = 3 * 1024 * 1024
MAX_WORKBOOK_BASE64_CHARACTERS = 4_400_000
APPROVAL_INTERRUPTED_AFTER = timedelta(seconds=315)

REVIEW_MUTABLE_STATUSES = {
    "REVIEW_REQUIRED",
    "REVIEW_COMPLETE",
    "DRY_RUN_READY",
    "READY",  # legacy persisted state
}
PRE_IMPORT_WORKFLOW_STATUSES = {
    "ANALYSING",
    *REVIEW_MUTABLE_STATUSES,
    "APPROVING",
    "READY_APPROVED",
}
CONFLICTING_MUTATION_STATUSES = {
    "ANALYSING",
    "ANALYSED",
    "APPROVING",
    "IMPORTING",
    "RECONCILING",
}


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


class ImportExecutionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workbook_checksum: str = Field(min_length=64, max_length=64)
    confirmation: str = Field(pattern="^IMPORT WORKBOOK$")


class ImportPreflightPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workbook_checksum: str = Field(min_length=64, max_length=64)


class ImportRollbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmation: str = Field(pattern="^ROLL BACK IMPORT$")


class ResetDecisionsPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_ids: list[str] = Field(default_factory=list, max_length=500)
    confirmed: bool


class AccountAbsenceStrategyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy: str = Field(pattern="^(leave_unchanged|archive|deactivate)$")


class ProfileNameStrategyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    strategy: str = Field(pattern="^(preserve_target|apply_workbook_username)$")


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
            "change_reconciliation": result["accounts"].get("change_reconciliation", {}),
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


def _normalise_comparable(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value or "").strip()


def _account_change_reconciliation(
    profile_id: str,
    account_report: dict[str, Any],
    *,
    absent_strategy: str = "leave_unchanged",
) -> dict[str, Any]:
    existing = list_accounts(profile_id)
    by_catalogue = {row.catalogue_id: row for row in existing if row.catalogue_id}
    by_name_type = {(row.account.casefold(), row.type.casefold()): row for row in existing}
    matched_ids: set[str] = set()
    entries: list[dict[str, Any]] = []
    comparable_fields = (
        "current_balance",
        "pending_withdrawal_amount",
        "status",
        "channel",
        "counts_in_cash_total",
        "last_balance_update",
        "sign_up_date",
        "notes",
    )
    for source in account_report.get("validation_rows", []):
        mapped = source.get("mapped_profile_state", {})
        catalogue_id = str(source.get("catalogue_id", ""))
        account_name = str(mapped.get("account", "")).strip()
        account_type = str(mapped.get("type", "")).strip()
        current = by_catalogue.get(catalogue_id) if catalogue_id else None
        if current is None:
            current = by_name_type.get((account_name.casefold(), account_type.casefold()))
        if source.get("errors"):
            action = "blocked"
            changes: list[dict[str, str]] = []
        elif current is None:
            action = "create"
            changes = [
                {
                    "field": field,
                    "from": "",
                    "to": _normalise_comparable(mapped.get(field)),
                }
                for field in comparable_fields
                if _normalise_comparable(mapped.get(field))
            ]
        else:
            matched_ids.add(current.account_id)
            changes = []
            for field in comparable_fields:
                before = _normalise_comparable(getattr(current, field))
                after = _normalise_comparable(mapped.get(field))
                if before != after:
                    changes.append({"field": field, "from": before, "to": after})
            action = "update" if changes else "unchanged"
        entries.append(
            {
                "source_row": source.get("source_row"),
                "import_key": source.get("import_key"),
                "catalogue_id": catalogue_id,
                "canonical_brand": source.get("canonical_brand", account_name),
                "account_type": source.get("account_type", account_type),
                "existing_account_id": current.account_id if current else "",
                "action": action,
                "changes": changes,
                "profile_state": {field: mapped.get(field) for field in comparable_fields},
            }
        )
    absent = [
        {
            "account_id": row.account_id,
            "catalogue_id": row.catalogue_id or "",
            "account": row.account,
            "type": row.type,
            "current_balance": row.current_balance,
            "status": row.status,
            "planned_action": absent_strategy,
        }
        for row in existing
        if row.account_id not in matched_ids
    ]
    balance_writes_for_new_accounts = sum(
        row["action"] == "create"
        and any(change["field"] == "current_balance" for change in row["changes"])
        for row in entries
    )
    balance_updates_for_existing_accounts = sum(
        bool(row["existing_account_id"])
        and any(change["field"] == "current_balance" for change in row["changes"])
        for row in entries
    )
    return {
        "default_absent_strategy": absent_strategy,
        "allowed_absent_strategies": [
            "leave_unchanged",
            "archive",
            "deactivate",
        ],
        "entries": entries,
        "existing_absent_from_workbook": absent,
        "counts": {
            "new_profile_accounts": sum(row["action"] == "create" for row in entries),
            "existing_profile_accounts_matched": sum(
                bool(row["existing_account_id"]) for row in entries
            ),
            "balances_to_update": sum(
                any(change["field"] == "current_balance" for change in row["changes"])
                for row in entries
            ),
            "balance_writes_for_new_accounts": balance_writes_for_new_accounts,
            "balance_updates_for_existing_accounts": balance_updates_for_existing_accounts,
            "statuses_to_update": sum(
                any(change["field"] == "status" for change in row["changes"]) for row in entries
            ),
            "unchanged_accounts": sum(row["action"] == "unchanged" for row in entries),
            "workbook_accounts_not_found_globally": sum(
                row["action"] == "blocked" for row in entries
            ),
            "profile_accounts_absent_from_workbook": len(absent),
            "workbook_accounts_accounted": len(entries),
            "resolved_workbook_accounts": sum(row["action"] != "blocked" for row in entries),
        },
        "count_overlap_rule": (
            "Balance updates include point-in-time balance writes for newly created Accounts, "
            "so New and Balance updates can overlap."
        ),
        "global_metadata_rule": (
            "Catalogue metadata remains global; only Profile-specific state is planned."
        ),
        "dry_run_only": True,
    }


def _empty_summary() -> dict[str, Any]:
    return {
        "schema": {},
        "accounts": {},
        "profile_settings": {},
        "ledgers": {},
        "extra_places": {},
        "reports": {},
        "readiness": {
            "partial_rows_requiring_mapping_decisions": 0,
            "provider_conflicts": 0,
            "historical_ep_rows_requiring_review": 0,
        },
    }


def _job_state(
    *,
    stage: str,
    percentage: int,
    rows_analysed: int = 0,
    total_rows: int = 0,
    events: list[dict[str, Any]] | None = None,
    error: str = "",
    work_units_completed: int = 0,
    work_units_total: int = 0,
    progress_mode: str = "determinate",
) -> dict[str, Any]:
    return {
        "stage": stage,
        "percentage": percentage,
        "rows_analysed": rows_analysed,
        "total_rows": total_rows,
        "estimated_seconds_remaining": None,
        "work_units_completed": work_units_completed,
        "work_units_total": work_units_total,
        "progress_mode": progress_mode,
        "events": events or [],
        "error": error,
    }


def _analysis_job_state(
    *,
    stage: str,
    work_units_completed: int,
    events: list[dict[str, Any]] | None = None,
    rows_analysed: int = 0,
    total_rows: int = 0,
    error: str = "",
) -> dict[str, Any]:
    completed = max(0, min(work_units_completed, FOUNDER_ANALYSIS_WORK_UNIT_TOTAL))
    return _job_state(
        stage=stage,
        percentage=round(completed / FOUNDER_ANALYSIS_WORK_UNIT_TOTAL * 100),
        rows_analysed=rows_analysed,
        total_rows=total_rows,
        events=events,
        error=error,
        work_units_completed=completed,
        work_units_total=FOUNDER_ANALYSIS_WORK_UNIT_TOTAL,
        progress_mode="staged",
    )


def _event(kind: str, title: str, message: str) -> dict[str, Any]:
    return {"kind": kind, "title": title, "message": message, "created_at": _now()}


def _update_run_job(
    import_run_id: str,
    *,
    status: str,
    job: dict[str, Any],
    summary: dict[str, Any] | None = None,
    reconciliation: dict[str, Any] | None = None,
) -> None:
    run = _load_run_by_id(import_run_id)
    next_summary = summary or run["summary"]
    next_summary["job"] = job
    with connect() as connection:
        connection.execute(
            """
            UPDATE profile_import_runs
            SET status = ?, summary_json = ?, reconciliation_json = ?, updated_at = ?
            WHERE import_run_id = ?
            """,
            (
                status,
                _json(next_summary),
                _json(reconciliation if reconciliation is not None else run["reconciliation"]),
                _now(),
                import_run_id,
            ),
        )


def _load_run_by_id(import_run_id: str) -> dict[str, Any]:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM profile_import_runs WHERE import_run_id = ?", (import_run_id,)
        ).fetchone()
    if row is None:
        raise RuntimeError("Workbook analysis run was not found")
    record = dict(row)
    record["summary"] = json.loads(record.pop("summary_json"))
    record["reconciliation"] = json.loads(record.pop("reconciliation_json"))
    record["result"] = json.loads(record.pop("result_json", "{}") or "{}")
    return record


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
    record["result"] = json.loads(record.pop("result_json", "{}") or "{}")
    record["raw_workbook_retained"] = bool(record["raw_workbook_retained"])
    return record


def _approval_request_state(run: dict[str, Any]) -> dict[str, Any]:
    persisted_status = str(run.get("status") or "")
    job = run.get("summary", {}).get("job") or {}
    updated_at = str(run.get("updated_at") or "")
    state = "NOT_STARTED"
    retry_available = False
    reason = ""
    if persisted_status == "APPROVING":
        state = "APPROVING"
        try:
            heartbeat = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            if heartbeat.tzinfo is None:
                heartbeat = heartbeat.replace(tzinfo=UTC)
            if datetime.now(UTC) - heartbeat >= APPROVAL_INTERRUPTED_AFTER:
                state = "INTERRUPTED"
                retry_available = True
                reason = (
                    "The approval request exceeded the server execution window. No Profile "
                    "data was imported; approval can be retried."
                )
        except ValueError:
            state = "INDETERMINATE"
            reason = "The approval heartbeat could not be interpreted safely."
    elif persisted_status == "READY_APPROVED":
        state = "READY_APPROVED"
    elif persisted_status == "FAILED" and str(job.get("stage") or "").startswith("Approval"):
        state = "FAILED"
        retry_available = True
        reason = str(job.get("error") or "Approval validation failed.")
    return {
        "status": state,
        "persisted_status": persisted_status,
        "stage": str(job.get("stage") or ""),
        "updated_at": updated_at,
        "retry_available": retry_available,
        "reason": reason,
    }


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
    workspace["approval"] = _approval_request_state(run)
    workspace["source_summary"] = run["summary"]
    workspace["financial_reconciliation"] = run["reconciliation"]
    plan = load_base_write_plan(profile_id, import_run_id)
    final_summary = final_import_summary(run=run, workspace=workspace, plan=plan)
    preflight = run["summary"].get("persistence_preflight", {})
    preflight_valid = _preflight_is_valid(run, preflight)
    if (
        preflight_valid
        and run.get("approved_at")
        and run["status"] in {"FAILED", "IMPORT_FAILED", "ROLLED_BACK"}
    ):
        now = _now()
        with connect() as connection:
            connection.execute(
                "UPDATE profile_import_runs SET status = 'READY_APPROVED', updated_at = ? "
                "WHERE profile_id = ? AND import_run_id = ?",
                (now, profile_id, import_run_id),
            )
        run["status"] = "READY_APPROVED"
        workspace["run_status"] = "READY_APPROVED"
    if (
        run["status"] in {"READY_APPROVED", "FAILED", "IMPORT_FAILED", "ROLLED_BACK"}
        and not preflight_valid
    ):
        final_summary["ready"] = False
        final_summary["blockers"].append(
            "Validate the approved write plan against the current persistence schema"
        )
    workspace["final_import_summary"] = final_summary
    workspace["persistence_preflight"] = preflight
    workspace["import_result"] = run.get("result", {})
    execution = load_import_execution(import_run_id)
    if run["status"] in PRE_IMPORT_WORKFLOW_STATUSES:
        # A checksum/mapping-compatible re-analysis deliberately reuses the ImportRun.
        # Its prior terminal execution is attempt history, not the current workflow state.
        workspace["execution"] = None
        workspace["previous_execution"] = execution
    else:
        workspace["execution"] = execution
        workspace["previous_execution"] = None
    workspace["checkpoint_id"] = run.get("checkpoint_id", "")
    workspace["rollback_status"] = run.get("rollback_status", "")
    workspace["approved_at"] = run.get("approved_at", "")
    workspace["completed_at"] = run.get("completed_at", "")
    workspace["rolled_back_at"] = run.get("rolled_back_at", "")
    if run["status"] in {"FAILED", "IMPORT_FAILED"} and run.get("checkpoint_id"):
        workspace["import_safety"] = failed_import_safety(profile_id, import_run_id)
    elif run["status"] in {"COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"}:
        workspace["import_safety"] = completed_import_rollback_safety(
            profile_id, import_run_id, run
        )
    else:
        workspace["import_safety"] = {}
    return workspace


def _failure_detail(
    *, import_run_id: str, error: ImportPersistenceError, retry_available: bool
) -> dict[str, Any]:
    return {
        "message": "Import could not be completed",
        "safe_state": "No Profile changes were committed",
        "stage": error.stage,
        "category": error.category,
        "import_run_id": import_run_id,
        "import_id": error.import_id,
        "record_id": error.record_id,
        "exception_type": error.exception_type,
        "retry_available": retry_available,
        "audit_available": True,
    }


def _preflight_is_valid(run: dict[str, Any], preflight: dict[str, Any]) -> bool:
    return (
        preflight.get("status") == "PASSED"
        and (
            preflight.get("transaction_constructed") is True
            or preflight.get("validation_mode") == "schema_and_domain_contracts"
        )
        and preflight.get("writes_committed") is False
        and preflight.get("workbook_checksum") == run["workbook_checksum"]
        and preflight.get("mapping_version") == run["mapping_version"]
    )


def _record_failed_import_attempt(
    *,
    profile_id: str,
    import_run_id: str,
    run: dict[str, Any],
    error: ImportPersistenceError,
) -> dict[str, Any]:
    safety = failed_import_safety(profile_id, import_run_id)
    now = _now()
    result_value = run.get("result")
    existing_result: dict[str, Any] = result_value if isinstance(result_value, dict) else {}
    attempts = list(existing_result.get("attempts", []))
    attempt = {
        "attempt_id": f"import-attempt-{uuid4().hex}",
        "status": "FAILED_SAFE",
        "failed_at": now,
        "stage": error.stage,
        "category": error.category,
        "import_id": error.import_id,
        "record_id": error.record_id,
        "exception_type": error.exception_type,
        "rollback_performed": "database_transaction",
        "safety": safety,
    }
    attempts.append(attempt)
    result = {
        "status": "IMPORT_FAILED",
        "message": "Import could not be completed",
        "safe_state": "No Profile changes were committed",
        "retry_available": safety["retry_available"],
        "latest_attempt": attempt,
        "attempts": attempts[-25:],
    }
    with connect() as connection:
        connection.execute(
            "UPDATE profile_import_runs SET status = 'IMPORT_FAILED', result_json = ?, "
            "updated_at = ? WHERE profile_id = ? AND import_run_id = ?",
            (_json(result), now, profile_id, import_run_id),
        )
    return result


def _save_preflight_result(
    *, import_run_id: str, profile_id: str, run: dict[str, Any], result: dict[str, Any]
) -> dict[str, Any]:
    summary = dict(run["summary"])
    now = _now()
    preflight = {
        **result,
        "workbook_checksum": run["workbook_checksum"],
        "mapping_version": run["mapping_version"],
        "completed_at": now,
    }
    summary["persistence_preflight"] = preflight
    next_status = run["status"]
    if (
        preflight.get("status") == "PASSED"
        and run.get("approved_at")
        and run["status"] in {"FAILED", "IMPORT_FAILED", "ROLLED_BACK"}
    ):
        next_status = "READY_APPROVED"
    with connect() as connection:
        connection.execute(
            "UPDATE profile_import_runs SET summary_json = ?, status = ?, updated_at = ? "
            "WHERE profile_id = ? AND import_run_id = ?",
            (_json(summary), next_status, now, profile_id, import_run_id),
        )
    run["summary"] = summary
    run["status"] = next_status
    return preflight


def _save_decision(
    *,
    profile_id: str,
    import_run_id: str,
    item: dict[str, Any],
    decision: dict[str, Any],
    actor_email: str,
) -> None:
    run = _load_run(profile_id, import_run_id)
    if run["status"] not in REVIEW_MUTABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Review decisions cannot change in the current import state",
        )
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


def _persist_review_readiness(profile_id: str, import_run_id: str) -> dict[str, Any]:
    """Persist review completion instead of inferring it from browser-local state."""
    workspace = _workspace(profile_id, import_run_id)
    next_status = (
        "REVIEW_COMPLETE"
        if workspace["reconciliation"]["import_ready"]
        else "REVIEW_REQUIRED"
    )
    with connect() as connection:
        connection.execute(
            "UPDATE profile_import_runs SET status = ?, updated_at = ? "
            "WHERE profile_id = ? AND import_run_id = ?",
            (next_status, _now(), profile_id, import_run_id),
        )
    return _workspace(profile_id, import_run_id)


def _analyse_workbook_job(
    *,
    profile_id: str,
    import_run_id: str,
    content: bytes,
    source_filename: str,
    effective_at: str,
) -> None:
    started = _event(
        "analysis_started",
        "Workbook analysis started",
        "The workbook is being checked and mapped in the background.",
    )
    _update_run_job(
        import_run_id,
        status="ANALYSING",
        job=_analysis_job_state(
            stage="Preparing workbook analysis",
            work_units_completed=0,
            events=[started],
        ),
    )
    try:
        def persist_progress(stage: str, completed_units: int, total_units: int) -> None:
            if total_units != FOUNDER_ANALYSIS_WORK_UNIT_TOTAL:
                raise ValueError("Unexpected workbook analysis work-unit total")
            _update_run_job(
                import_run_id,
                status="ANALYSING",
                job=_analysis_job_state(
                    stage=stage,
                    work_units_completed=completed_units,
                    events=[started],
                ),
            )

        result = build_founder_workbook_dry_run_bytes(
            content,
            source_filename=source_filename,
            source_path="authenticated-upload",
            effective_at=effective_at,
            progress_callback=persist_progress,
        )
        result["accounts"]["change_reconciliation"] = _account_change_reconciliation(
            profile_id,
            result["accounts"],
        )
        metadata, items = build_review_items_from_dry_run(result, content)
        total_rows = sum(
            int(ledger.get("summary", {}).get("source_rows", 0))
            for ledger in result.get("ledgers", {}).values()
        ) + len(result.get("accounts", {}).get("validation_rows", []))
        _update_run_job(
            import_run_id,
            status="ANALYSED",
            job=_analysis_job_state(
                stage="Saving dry-run plan and review",
                work_units_completed=8,
                rows_analysed=total_rows,
                total_rows=total_rows,
                events=[started],
            ),
        )
        now = _now()
        with connect() as connection:
            save_base_write_plan(
                connection,
                import_run_id=import_run_id,
                profile_id=profile_id,
                plan=build_base_write_plan(result),
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
        status = "REVIEW_REQUIRED" if items else "DRY_RUN_READY"
        events = [
            started,
            _event(
                "analysis_complete",
                "Workbook analysis complete",
                f"{total_rows} source rows were analysed.",
            ),
        ]
        if items:
            events.append(
                _event(
                    "review_required",
                    "Workbook review required",
                    f"{len(items)} review items are ready for a decision.",
                )
            )
        summary = _summary(result)
        _update_run_job(
            import_run_id,
            status=status,
            summary=summary,
            reconciliation=result["reconciliation"],
            job=_analysis_job_state(
                stage="Review ready" if items else "Analysis complete",
                work_units_completed=FOUNDER_ANALYSIS_WORK_UNIT_TOTAL,
                rows_analysed=total_rows,
                total_rows=total_rows,
                events=events,
            ),
        )
    except Exception:
        logger.exception("Workbook analysis failed for import run %s", import_run_id)
        failed = _event(
            "analysis_failed",
            "Workbook analysis failed",
            "The workbook could not be mapped. Open the import run to review the error.",
        )
        _update_run_job(
            import_run_id,
            status="FAILED",
            job=_job_state(
                stage="Analysis failed",
                percentage=100,
                events=[started, failed],
                error="Workbook schema is not supported",
            ),
        )


@router.get("")
def list_profile_workbook_imports(profile_id: str, request: Request) -> list[dict[str, Any]]:
    require_request_session(request)
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT import_run_id, profile_id, source_filename, workbook_checksum,
                   workbook_size_bytes, effective_at, mapping_version, status,
                   raw_workbook_retained, approved_at, completed_at, checkpoint_id,
                   rollback_status, rolled_back_at, summary_json, result_json,
                   created_at, updated_at
            FROM profile_import_runs WHERE profile_id = ? ORDER BY updated_at DESC
            """,
            (profile_id,),
        ).fetchall()
        attempt_rows = connection.execute(
            """
            SELECT attempt.import_run_id, attempt.execution_id, attempt.attempt_number,
                   attempt.status, attempt.rollback_status, attempt.legacy_ambiguous,
                   attempt.started_at, attempt.completed_at, attempt.reconciliation_json,
                   checkpoint.checkpoint_id, checkpoint.status AS checkpoint_status
            FROM profile_import_attempts AS attempt
            LEFT JOIN profile_import_attempt_checkpoints AS checkpoint
              ON checkpoint.execution_id = attempt.execution_id
            WHERE attempt.profile_id = ?
            ORDER BY attempt.import_run_id, attempt.attempt_number DESC
            """,
            (profile_id,),
        ).fetchall()
    attempts_by_run: dict[str, list[dict[str, Any]]] = {}
    for attempt_row in attempt_rows:
        attempt = dict(attempt_row)
        attempt["legacy_ambiguous"] = bool(attempt["legacy_ambiguous"])
        attempt_reconciliation = json.loads(attempt.pop("reconciliation_json") or "{}")
        attempt["reconciliation_status"] = str(
            (attempt_reconciliation.get("financial") or attempt_reconciliation).get("result")
            or (attempt_reconciliation.get("financial") or attempt_reconciliation).get("status")
            or ""
        )
        attempt["operational_health_status"] = str(
            (attempt_reconciliation.get("operational") or {}).get("status") or ""
        )
        attempts_by_run.setdefault(str(attempt["import_run_id"]), []).append(attempt)
    history: list[dict[str, Any]] = []
    for row in rows:
        record = dict(row)
        summary = json.loads(record.pop("summary_json") or "{}")
        result = json.loads(record.pop("result_json") or "{}")
        result_ledgers = result.get("ledgers") or {}
        summary_ledgers = summary.get("ledgers") or {}
        record["row_counts"] = {
            "sportsbook": result_ledgers.get(
                "sportsbook", summary_ledgers.get("sportsbook", {}).get("source_rows", 0)
            ),
            "free_bets": result_ledgers.get(
                "free_bets", summary_ledgers.get("free_bets", {}).get("source_rows", 0)
            ),
            "casino": result_ledgers.get(
                "casino", summary_ledgers.get("casino", {}).get("source_rows", 0)
            ),
            "cash_adjustments": result_ledgers.get(
                "cash_adjustments",
                summary_ledgers.get("cash_adjustments", {}).get("source_rows", 0),
            ),
            "extra_places": result_ledgers.get("extra_places", 0),
        }
        record["raw_workbook_retained"] = bool(record["raw_workbook_retained"])
        record["attempts"] = attempts_by_run.get(str(record["import_run_id"]), [])
        # ImportRun status is the current workflow authority. Attempts are immutable history and
        # must not make a terminal historical execution masquerade as the active review state.
        history.append(record)
    return history


def _manifest_drift(stored: dict[str, Any], current: dict[str, Any]) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    for table in sorted(set(stored) | set(current)):
        before_rows = stored.get(table) or {}
        after_rows = current.get(table) or {}
        for row_id in sorted(set(before_rows) | set(after_rows)):
            before = before_rows.get(row_id)
            after = after_rows.get(row_id)
            if before is None:
                operation = "added"
            elif after is None:
                operation = "removed"
            elif before.get("fingerprint") != after.get("fingerprint"):
                operation = "modified"
            else:
                continue
            changes.append(
                {
                    "domain": table,
                    "row_id": row_id,
                    "operation": operation,
                    "timestamp": str((after or before or {}).get("updated_at") or ""),
                    "actor": "",
                    "source": "",
                }
            )
    return changes


def _attach_drift_audit_evidence(
    connection: Any,
    *,
    profile_id: str,
    drift: list[dict[str, Any]],
    completed_at: str,
) -> None:
    audit_sources = {
        "accounts": ("account_audit", "account_id"),
        "sportsbook_bets": ("sportsbook_bet_audit", "sportsbook_bet_id"),
        "free_bets": ("free_bet_audit", "free_bet_id"),
        "casino_offers": ("casino_offer_audit", "casino_offer_id"),
        "cash_adjustments": ("cash_adjustment_audit", "cash_adjustment_id"),
        "each_way_extra_places": (
            "each_way_extra_place_audit",
            "each_way_extra_place_id",
        ),
    }
    for change in drift:
        source = audit_sources.get(str(change["domain"]))
        if source is None:
            continue
        table, id_column = source
        evidence = connection.execute(
            f"SELECT action, changed_at, payload_json FROM {table} "  # noqa: S608
            f"WHERE profile_id = ? AND {id_column} = ? AND changed_at >= ? "
            "ORDER BY changed_at DESC LIMIT 1",
            (profile_id, change["row_id"], completed_at),
        ).fetchone()
        if evidence is None:
            continue
        payload = json.loads(str(evidence["payload_json"] or "{}"))
        change["timestamp"] = str(evidence["changed_at"] or change["timestamp"])
        change["source"] = table
        change["source_action"] = str(evidence["action"] or "")
        change["actor"] = str(
            payload.get("actor_email") or payload.get("actor_id") or payload.get("updated_by") or ""
        )


@router.get("/recovery-diagnostics")
def get_profile_import_recovery_diagnostics(profile_id: str, request: Request) -> dict[str, Any]:
    """Return read-only, attempt-scoped recovery evidence for one Profile."""
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Fund Manager access is required")
    with connect() as connection:
        profile = connection.execute(
            "SELECT profile_id, display_name, status FROM profiles WHERE profile_id = ?",
            (profile_id,),
        ).fetchone()
        if profile is None:
            raise HTTPException(status_code=404, detail="Profile was not found")
        run = connection.execute(
            "SELECT * FROM profile_import_runs WHERE profile_id = ? "
            "ORDER BY updated_at DESC LIMIT 1",
            (profile_id,),
        ).fetchone()
        current_checksum = _profile_state_checksum(connection, profile_id)
        current_manifest = _profile_state_manifest(connection, profile_id)
        active_execution_count = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_import_attempts "
                "WHERE profile_id = ? AND status = 'RUNNING'",
                (profile_id,),
            ).fetchone()["count"]
        )
        if run is None:
            return {
                "profile_id": profile_id,
                "profile_display_name": str(profile["display_name"]),
                "profile_status": str(profile["status"]),
                "current_profile_checksum": current_checksum,
                "execution_running": bool(active_execution_count),
                "attempts": [],
                "drift": [],
                "rollback_conclusion": "ROLLBACK UNAVAILABLE",
                "rollback_reason": "This Profile has no workbook import run.",
            }
        run_record = dict(run)
        attempt_rows = connection.execute(
            """
            SELECT attempt.*, checkpoint.checkpoint_id, checkpoint.status AS checkpoint_status,
                   checkpoint.pre_import_checksum AS checkpoint_checksum,
                   checkpoint.created_at AS checkpoint_created_at,
                   checkpoint.rolled_back_at AS checkpoint_rolled_back_at
            FROM profile_import_attempts AS attempt
            LEFT JOIN profile_import_attempt_checkpoints AS checkpoint
              ON checkpoint.execution_id = attempt.execution_id
            WHERE attempt.import_run_id = ?
            ORDER BY attempt.attempt_number DESC
            """,
            (run_record["import_run_id"],),
        ).fetchall()
        attempts: list[dict[str, Any]] = []
        for index, row in enumerate(attempt_rows):
            record = dict(row)
            reconciliation = json.loads(record.pop("reconciliation_json") or "{}")
            record.pop("progress_json", None)
            record.pop("error_json", None)
            record.pop("post_import_manifest_json", None)
            record["legacy_ambiguous"] = bool(record["legacy_ambiguous"])
            record["is_latest_attempt"] = index == 0
            record["reconciliation_status"] = str(
                (reconciliation.get("financial") or reconciliation).get("result")
                or (reconciliation.get("financial") or reconciliation).get("status")
                or ""
            )
            record["operational_health_status"] = str(
                (reconciliation.get("operational") or {}).get("status") or ""
            )
            record["active_write_audit_row_count"] = int(
                connection.execute(
                    "SELECT COUNT(*) AS count FROM profile_import_attempt_write_audit "
                    "WHERE execution_id = ? AND rolled_back_at = ''",
                    (record["execution_id"],),
                ).fetchone()["count"]
            )
            attempts.append(record)
        latest_row = attempt_rows[0] if attempt_rows else None
        stored_manifest = (
            json.loads(str(latest_row["post_import_manifest_json"] or "{}"))
            if latest_row is not None
            else {}
        )
        drift = _manifest_drift(stored_manifest, current_manifest) if stored_manifest else []
        if drift and latest_row is not None:
            _attach_drift_audit_evidence(
                connection,
                profile_id=profile_id,
                drift=drift,
                completed_at=str(latest_row["completed_at"] or ""),
            )
    recorded_checksum = "" if latest_row is None else str(latest_row["post_import_checksum"] or "")
    current_matches = bool(recorded_checksum and recorded_checksum == current_checksum)
    checkpoint_exists = bool(latest_row is not None and latest_row["checkpoint_id"])
    latest_status = "" if latest_row is None else str(latest_row["status"])
    latest_rollback_status = "" if latest_row is None else str(latest_row["rollback_status"])
    rollback_available = bool(
        latest_status in {"COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"}
        and latest_rollback_status == "AVAILABLE"
        and checkpoint_exists
        and current_matches
    )
    if rollback_available:
        conclusion = "ROLLBACK SAFE"
        reason = (
            "The latest attempt has its own available checkpoint and unchanged post-import state."
        )
    elif recorded_checksum and not current_matches:
        conclusion = "ROLLBACK LOCKED — PROFILE CHANGED"
        reason = (
            "Post-import Profile drift was detected; its origin is reported only "
            "where audit evidence exists."
        )
    elif not checkpoint_exists or not recorded_checksum:
        conclusion = "STATE INDETERMINATE"
        reason = "The latest attempt lacks a checkpoint or post-import fingerprint manifest."
    else:
        conclusion = "ROLLBACK UNAVAILABLE"
        reason = "The latest attempt status does not permit standard rollback."
    latest = attempts[0] if attempts else {}
    return {
        "profile_id": profile_id,
        "profile_display_name": str(profile["display_name"]),
        "profile_status": str(profile["status"]),
        "import_run_id": str(run_record["import_run_id"]),
        "execution_id": str(latest.get("execution_id") or ""),
        "attempt_number": latest.get("attempt_number"),
        "import_status": latest_status or str(run_record["status"]),
        "reconciliation_status": str(latest.get("reconciliation_status") or ""),
        "operational_health_status": str(latest.get("operational_health_status") or ""),
        "checkpoint_id": str(latest.get("checkpoint_id") or ""),
        "checkpoint_status": str(latest.get("checkpoint_status") or ""),
        "checkpoint_checksum": str(latest.get("checkpoint_checksum") or ""),
        "recorded_post_import_checksum": recorded_checksum,
        "current_profile_checksum": current_checksum,
        "current_matches_post_import_checksum": current_matches,
        "post_import_profile_drift_detected": bool(recorded_checksum and not current_matches),
        "manual_post_import_mutation_detected": False,
        "drift_evidence_status": "AVAILABLE" if stored_manifest else "UNAVAILABLE_LEGACY",
        "drift": drift,
        "rollback_available": rollback_available,
        "active_write_audit_row_count": int(latest.get("active_write_audit_row_count") or 0),
        "execution_running": bool(active_execution_count),
        "import_started_at": str(latest.get("started_at") or ""),
        "import_completed_at": str(latest.get("completed_at") or ""),
        "import_rolled_back_at": str(latest.get("rolled_back_at") or ""),
        "attempts": attempts,
        "rollback_conclusion": conclusion,
        "rollback_reason": reason,
    }


@router.post("/analyse")
def analyse_profile_workbook(
    profile_id: str,
    payload: WorkbookAnalysisPayload,
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    session = require_request_session(request)
    if not _profile_exists(profile_id):
        raise HTTPException(status_code=404, detail="Profile was not found")
    content = _decode_workbook(payload)
    checksum = hashlib.sha256(content).hexdigest()
    mapping_version = FOUNDER_MAPPING_VERSION
    import_run_id = (
        "profile-import-"
        + hashlib.sha256(f"{profile_id}:{checksum}:{mapping_version}".encode("utf-8")).hexdigest()[
            :32
        ]
    )
    now = _now()
    status = "ANALYSING"
    started = _event(
        "analysis_started",
        "Workbook analysis started",
        "The workbook is queued for background analysis.",
    )
    summary = _empty_summary()
    summary["job"] = _analysis_job_state(
        stage="Queued for analysis",
        work_units_completed=0,
        events=[started],
    )
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
              approved_at = '',
              import_started_at = '',
              completed_at = '',
              checkpoint_id = '',
              result_json = '{}',
              rollback_status = '',
              rolled_back_at = '',
              updated_at = excluded.updated_at
            """,
            (
                import_run_id,
                profile_id,
                session.email,
                payload.source_filename,
                checksum,
                len(content),
                payload.effective_at,
                mapping_version,
                status,
                _json(summary),
                _json({}),
                now,
                now,
            ),
        )
    background_tasks.add_task(
        _analyse_workbook_job,
        profile_id=profile_id,
        import_run_id=import_run_id,
        content=content,
        source_filename=payload.source_filename,
        effective_at=payload.effective_at,
    )
    return _workspace(profile_id, import_run_id)


@router.get("/{import_run_id}")
def get_profile_workbook_import(
    profile_id: str, import_run_id: str, request: Request
) -> dict[str, Any]:
    require_request_session(request)
    return _workspace(profile_id, import_run_id)


@router.put("/{import_run_id}/account-absence-strategy")
def put_profile_workbook_account_absence_strategy(
    profile_id: str,
    import_run_id: str,
    payload: AccountAbsenceStrategyPayload,
    request: Request,
) -> dict[str, Any]:
    require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    reconciliation = run["summary"].get("accounts", {}).get("change_reconciliation")
    if not reconciliation:
        raise HTTPException(status_code=409, detail="Account reconciliation is not ready")
    reconciliation["default_absent_strategy"] = payload.strategy
    for row in reconciliation.get("existing_absent_from_workbook", []):
        row["planned_action"] = payload.strategy
    with connect() as connection:
        connection.execute(
            """
            UPDATE profile_import_runs
            SET summary_json = ?, updated_at = ?
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (_json(run["summary"]), _now(), profile_id, import_run_id),
        )
    return _workspace(profile_id, import_run_id)


@router.put("/{import_run_id}/profile-name-strategy")
def put_profile_workbook_name_strategy(
    profile_id: str,
    import_run_id: str,
    payload: ProfileNameStrategyPayload,
    request: Request,
) -> dict[str, Any]:
    require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    if run["approved_at"] or run["status"] in {"IMPORTING", "COMPLETE"}:
        raise HTTPException(
            status_code=409,
            detail="Profile identity strategy cannot change after import approval",
        )
    plan = load_base_write_plan(profile_id, import_run_id)
    if plan is None:
        raise HTTPException(status_code=409, detail="Import write plan is not ready")
    classification = (
        "IMPORT" if payload.strategy == "apply_workbook_username" else "PRESERVE_TARGET"
    )
    matched = False
    for item in plan["profile_settings"]:
        if item.get("setting") == "username" and item.get("target") == "profile.display_name":
            item["classification"] = classification
            matched = True
    if not matched:
        raise HTTPException(status_code=409, detail="Workbook username mapping is unavailable")
    for item in run["summary"].get("profile_settings", []):
        if item.get("setting") == "username":
            item["classification"] = classification
    run["summary"]["profile_name_strategy"] = payload.strategy
    with connect() as connection:
        save_base_write_plan(
            connection,
            import_run_id=import_run_id,
            profile_id=profile_id,
            plan=plan,
        )
        connection.execute(
            """
            UPDATE profile_import_runs
            SET summary_json = ?, updated_at = ?
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (_json(run["summary"]), _now(), profile_id, import_run_id),
        )
    return _workspace(profile_id, import_run_id)


@router.delete("/{import_run_id}", status_code=204)
def delete_profile_workbook_import(
    profile_id: str,
    import_run_id: str,
    request: Request,
) -> None:
    require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    if run["status"] in {
        "ANALYSING",
        "ANALYSED",
        "APPROVING",
        "IMPORTING",
        "RECONCILING",
        "COMPLETE",
        "POST_IMPORT_RECONCILIATION_FAILED",
    }:
        raise HTTPException(
            status_code=409,
            detail="This import run cannot be deleted in its current state",
        )
    with connect() as connection:
        execution = connection.execute(
            "SELECT status FROM profile_import_executions WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
        active_writes = connection.execute(
            "SELECT COUNT(*) AS count FROM profile_import_write_audit "
            "WHERE import_run_id = ? AND rolled_back_at = ''",
            (import_run_id,),
        ).fetchone()
        if execution is not None and str(execution["status"]) == "RUNNING":
            raise HTTPException(status_code=409, detail="A running import cannot be deleted")
        if active_writes is not None and int(active_writes["count"]):
            raise HTTPException(
                status_code=409,
                detail="This import has active Profile writes and cannot be deleted",
            )
        # These audit tables intentionally retain failed/rolled-back attempts and do not
        # cascade from the run. Explicit deletion is required for a user-confirmed purge.
        for table in (
            "profile_import_attempt_write_audit",
            "profile_import_attempt_checkpoints",
            "profile_import_attempts",
            "profile_import_executions",
            "profile_import_rollback_events",
            "profile_import_write_audit",
            "profile_import_checkpoints",
            "profile_import_write_plans",
        ):
            connection.execute(
                f"DELETE FROM {table} WHERE import_run_id = ?",  # noqa: S608
                (import_run_id,),
            )
        connection.execute(
            """
            DELETE FROM profile_import_review_decisions
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (profile_id, import_run_id),
        )
        connection.execute(
            """
            DELETE FROM profile_import_review_items
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (profile_id, import_run_id),
        )
        connection.execute(
            """
            DELETE FROM profile_import_runs
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (profile_id, import_run_id),
        )


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
    return _persist_review_readiness(profile_id, import_run_id)


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
    return _persist_review_readiness(profile_id, import_run_id)


@router.post("/{import_run_id}/decisions/reset")
def reset_profile_workbook_import_decisions(
    profile_id: str,
    import_run_id: str,
    payload: ResetDecisionsPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    if not payload.confirmed:
        raise HTTPException(status_code=422, detail="Confirm the review reset")
    workspace = _workspace(profile_id, import_run_id)
    valid_ids = {item["item_id"] for item in workspace["items"]}
    requested_ids = set(payload.item_ids)
    if requested_ids - valid_ids:
        raise HTTPException(status_code=404, detail="One or more review items were not found")
    run = _load_run(profile_id, import_run_id)
    if run["status"] not in REVIEW_MUTABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Review decisions cannot reset in the current import state",
        )
    with connect() as connection:
        if requested_ids:
            placeholders = ",".join("?" for _ in requested_ids)
            parameters = [profile_id, import_run_id, *sorted(requested_ids)]
            count = int(
                connection.execute(
                    f"""
                    SELECT COUNT(*) AS count FROM profile_import_review_decisions
                    WHERE profile_id = ? AND import_run_id = ?
                      AND item_id IN ({placeholders})
                    """,
                    parameters,
                ).fetchone()["count"]
            )
            connection.execute(
                f"""
                DELETE FROM profile_import_review_decisions
                WHERE profile_id = ? AND import_run_id = ?
                  AND item_id IN ({placeholders})
                """,
                parameters,
            )
        else:
            count = int(
                connection.execute(
                    """
                    SELECT COUNT(*) AS count FROM profile_import_review_decisions
                    WHERE profile_id = ? AND import_run_id = ?
                    """,
                    (profile_id, import_run_id),
                ).fetchone()["count"]
            )
            connection.execute(
                """
                DELETE FROM profile_import_review_decisions
                WHERE profile_id = ? AND import_run_id = ?
                """,
                (profile_id, import_run_id),
            )
        summary = run["summary"]
        audit = list(summary.get("review_reset_events", []))
        audit.append(
            {
                "actor": session.email,
                "decision_count": count,
                "scope": "selected" if requested_ids else "all",
                "created_at": _now(),
            }
        )
        summary["review_reset_events"] = audit[-25:]
        connection.execute(
            """
            UPDATE profile_import_runs
            SET status = 'REVIEW_REQUIRED', summary_json = ?, updated_at = ?
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (_json(summary), _now(), profile_id, import_run_id),
        )
    return _workspace(profile_id, import_run_id)


def _rerun_review_job(profile_id: str, import_run_id: str) -> None:
    run = _load_run(profile_id, import_run_id)
    previous_job = run["summary"].get("job", {})
    events = list(previous_job.get("events", []))
    started = _event(
        "analysis_started",
        "Review reconciliation started",
        "Saved review decisions are being reapplied in the background.",
    )
    events.append(started)
    item_count = 0
    with connect() as connection:
        item_count = int(
            connection.execute(
                """
                SELECT COUNT(*) AS count FROM profile_import_review_items
                WHERE profile_id = ? AND import_run_id = ?
                """,
                (profile_id, import_run_id),
            ).fetchone()["count"]
        )
    try:
        workspace = _workspace(profile_id, import_run_id)
        status = (
            "DRY_RUN_READY"
            if workspace["reconciliation"]["import_ready"]
            else "REVIEW_REQUIRED"
        )
        events.append(
            _event(
                "analysis_complete",
                "Review reconciliation complete",
                f"{item_count} review items were reconciled.",
            )
        )
        if status == "REVIEW_REQUIRED":
            events.append(
                _event(
                    "review_required",
                    "Workbook review required",
                    (
                        f"{workspace['reconciliation']['remaining_partial_count']} "
                        "partial rows remain."
                    ),
                )
            )
        _update_run_job(
            import_run_id,
            status=status,
            job=_job_state(
                stage="Review ready" if status == "REVIEW_REQUIRED" else "Analysis complete",
                percentage=100,
                rows_analysed=item_count,
                total_rows=item_count,
                events=events,
            ),
        )
    except Exception:
        events.append(
            _event(
                "analysis_failed",
                "Review reconciliation failed",
                "Saved review decisions could not be reapplied.",
            )
        )
        _update_run_job(
            import_run_id,
            status="FAILED",
            job=_job_state(
                stage="Analysis failed",
                percentage=100,
                total_rows=item_count,
                events=events,
                error="Review reconciliation failed",
            ),
        )


@router.post("/{import_run_id}/rerun")
def rerun_profile_workbook_import(
    profile_id: str,
    import_run_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    if run["status"] in CONFLICTING_MUTATION_STATUSES:
        raise HTTPException(status_code=409, detail="Another import action is already running")
    if run["status"] in {"COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"}:
        raise HTTPException(status_code=409, detail="A completed import cannot rerun its dry run")
    summary = dict(run["summary"])
    summary.pop("persistence_preflight", None)
    previous_events = list((summary.get("job") or {}).get("events") or [])
    item_count = len(_workspace(profile_id, import_run_id)["items"])
    started = _event(
        "analysis_started",
        "Review reconciliation started",
        "Saved review decisions are being reapplied in the background.",
    )
    with connect() as connection:
        updated = connection.execute(
            "UPDATE profile_import_runs SET status = 'ANALYSING', summary_json = ?, "
            "approved_at = '', updated_at = ? WHERE profile_id = ? AND import_run_id = ? "
            "AND status NOT IN ('ANALYSING', 'ANALYSED', 'APPROVING', 'IMPORTING', 'RECONCILING')",
            (
                _json(
                    {
                        **summary,
                        "job": _job_state(
                            stage="Applying saved review decisions",
                            percentage=25,
                            total_rows=item_count,
                            events=[*previous_events, started],
                        ),
                    }
                ),
                _now(),
                profile_id,
                import_run_id,
            ),
        )
    if updated.rowcount != 1:
        raise HTTPException(status_code=409, detail="Another import action is already running")
    background_tasks.add_task(_rerun_review_job, profile_id, import_run_id)
    return _workspace(profile_id, import_run_id)


def _approve_import_job(
    *, profile_id: str, import_run_id: str, actor_email: str
) -> None:
    run = _load_run(profile_id, import_run_id)
    workspace = _workspace(profile_id, import_run_id)
    plan = load_base_write_plan(profile_id, import_run_id)
    if plan is None:
        _update_run_job(
            import_run_id,
            status="FAILED",
            job=_job_state(
                stage="Approval failed",
                percentage=100,
                error="Re-analyse this workbook before approval.",
            ),
        )
        return
    try:
        refreshed = _load_run(profile_id, import_run_id)
        existing_events = list((refreshed["summary"].get("job") or {}).get("events") or [])
        _update_run_job(
            import_run_id,
            status="APPROVING",
            job=_job_state(
                stage="Validating Account and ledger contracts",
                percentage=0,
                events=existing_events,
                progress_mode="indeterminate",
            ),
        )
        run = _load_run(profile_id, import_run_id)
        preflight_result = validate_import_approval_preflight(
            profile_id=profile_id,
            import_run_id=import_run_id,
            run=run,
            workspace=workspace,
            plan=plan,
        )
        _save_preflight_result(
            import_run_id=import_run_id,
            profile_id=profile_id,
            run=run,
            result=preflight_result,
        )
    except (ImportPersistenceError, ImportCutoverError) as error:
        logger.exception("Workbook approval preflight failed")
        detail = (
            f"Approval validation failed at {error.stage}. No Profile data was imported."
            if isinstance(error, ImportPersistenceError)
            else f"{error}. No Profile data was imported."
        )
        _update_run_job(
            import_run_id,
            status="FAILED",
            job=_job_state(
                stage="Approval failed",
                percentage=100,
                error=detail,
            ),
        )
        return
    except Exception:
        logger.exception("Unexpected workbook approval failure")
        _update_run_job(
            import_run_id,
            status="FAILED",
            job=_job_state(
                stage="Approval failed",
                percentage=100,
                error="Approval could not be completed. No Profile data was imported.",
            ),
        )
        return
    now = _now()
    completed = _event(
        "approval_complete",
        "Dry run approved",
        "The persisted write plan is ready to import.",
    )
    refreshed = _load_run(profile_id, import_run_id)
    prior_events = list((refreshed["summary"].get("job") or {}).get("events") or [])
    summary = dict(refreshed["summary"])
    summary["job"] = _job_state(
        stage="Ready to import",
        percentage=100,
        events=[*prior_events, completed],
    )
    with connect() as connection:
        connection.execute(
            "UPDATE profile_import_runs SET status = 'READY_APPROVED', owner_email = ?, "
            "approved_at = ?, summary_json = ?, updated_at = ? "
            "WHERE profile_id = ? AND import_run_id = ? AND status = 'APPROVING'",
            (actor_email, now, _json(summary), now, profile_id, import_run_id),
        )


@router.post("/{import_run_id}/approve")
def approve_profile_workbook_import(
    profile_id: str,
    import_run_id: str,
    payload: ImportApprovalPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    workspace = _workspace(profile_id, import_run_id)
    if payload.workbook_checksum != workspace["metadata"]["workbook_checksum"]:
        raise HTTPException(status_code=409, detail="Workbook checksum does not match this review")
    if not payload.acknowledged or not workspace["reconciliation"]["import_ready"]:
        raise HTTPException(status_code=422, detail="Resolve review blockers before approval")
    if load_base_write_plan(profile_id, import_run_id) is None:
        raise HTTPException(status_code=409, detail="Re-analyse this workbook before approval")
    approval_retry = (
        run["status"] == "FAILED"
        and str((run["summary"].get("job") or {}).get("stage") or "") == "Approval failed"
    )
    interrupted_retry = (
        run["status"] == "APPROVING"
        and _approval_request_state(run)["status"] == "INTERRUPTED"
    )
    if (
        run["status"] not in {"REVIEW_COMPLETE", "DRY_RUN_READY", "READY"}
        and not approval_retry
        and not interrupted_retry
    ):
        if run["status"] == "APPROVING":
            raise HTTPException(status_code=409, detail="Dry-run approval is already running")
        raise HTTPException(status_code=409, detail="The dry run is not ready for approval")
    summary = dict(run["summary"])
    previous_events = list((summary.get("job") or {}).get("events") or [])
    started = _event(
        "approval_started",
        "Approving dry run",
        "The server write plan is being validated without committing Profile data.",
    )
    previous_updated_at = str(run.get("updated_at") or "")
    with connect() as connection:
        updated = connection.execute(
            "UPDATE profile_import_runs SET status = 'APPROVING', owner_email = ?, "
            "summary_json = ?, updated_at = ? WHERE profile_id = ? AND import_run_id = ? "
            "AND status = ? AND updated_at = ?",
            (
                session.email,
                _json(
                    {
                        **summary,
                        "job": _job_state(
                            stage="Validating checksum and approved write plan",
                            percentage=0,
                            events=[*previous_events, started],
                            progress_mode="indeterminate",
                        ),
                    }
                ),
                _now(),
                profile_id,
                import_run_id,
                run["status"],
                previous_updated_at,
            ),
        )
    if updated.rowcount != 1:
        raise HTTPException(status_code=409, detail="Dry-run approval is already running")
    _approve_import_job(
        profile_id=profile_id,
        import_run_id=import_run_id,
        actor_email=session.email,
    )
    return _workspace(profile_id, import_run_id)


@router.post("/{import_run_id}/preflight")
def preflight_profile_workbook_import(
    profile_id: str,
    import_run_id: str,
    payload: ImportPreflightPayload,
    request: Request,
) -> dict[str, Any]:
    require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    if payload.workbook_checksum != run["workbook_checksum"]:
        raise HTTPException(status_code=409, detail="Workbook checksum does not match")
    if not run.get("approved_at"):
        raise HTTPException(status_code=409, detail="Approve the dry run before validation")
    plan = load_base_write_plan(profile_id, import_run_id)
    if plan is None:
        raise HTTPException(status_code=409, detail="Re-analyse this workbook before validation")
    workspace = _workspace(profile_id, import_run_id)
    try:
        result = validate_import_preflight(
            profile_id=profile_id,
            import_run_id=import_run_id,
            run=run,
            workspace=workspace,
            plan=plan,
        )
    except ImportPersistenceError as error:
        logger.exception(
            "Workbook persistence preflight failed at %s (%s)", error.stage, error.category
        )
        raise HTTPException(
            status_code=409,
            detail=_failure_detail(
                import_run_id=import_run_id,
                error=error,
                retry_available=False,
            ),
        ) from error
    except ImportCutoverError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return _save_preflight_result(
        import_run_id=import_run_id,
        profile_id=profile_id,
        run=run,
        result=result,
    )


@router.post("/{import_run_id}/import")
def import_profile_workbook(
    profile_id: str,
    import_run_id: str,
    payload: ImportExecutionPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    if payload.workbook_checksum != run["workbook_checksum"]:
        raise HTTPException(status_code=409, detail="Workbook checksum does not match")
    plan = load_base_write_plan(profile_id, import_run_id)
    if plan is None:
        raise HTTPException(
            status_code=409,
            detail="Re-analyse this workbook before import so its server write plan is available",
        )
    workspace = _workspace(profile_id, import_run_id)
    try:
        execution = start_import_execution(
            profile_id=profile_id,
            import_run_id=import_run_id,
            actor_email=session.email,
            run=run,
            workspace=workspace,
            plan=plan,
        )
    except ImportCutoverError as error:
        logger.warning("Profile workbook import blocked: %s", error)
        raise HTTPException(status_code=409, detail=str(error)) from error
    except Exception as error:
        logger.exception("Profile workbook import failed")
        raise HTTPException(
            status_code=500,
            detail="Import execution could not be started. No Profile changes were made.",
        ) from error
    return {"status": "STARTED", "execution": execution}


@execution_router.get("")
def get_active_import_executions(request: Request) -> list[dict[str, Any]]:
    session = require_request_session(request)
    return list_active_import_executions(session.email)


@execution_router.post("/{import_run_id}/advance")
def advance_active_import_execution(
    import_run_id: str,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    run = _load_run_by_id(import_run_id)
    if str(run["owner_email"]).casefold() != session.email.casefold():
        raise HTTPException(status_code=404, detail="Import execution was not found")
    profile_id = str(run["profile_id"])
    plan = load_base_write_plan(profile_id, import_run_id)
    if plan is None:
        raise HTTPException(status_code=409, detail="Import write plan is unavailable")
    workspace = _workspace(profile_id, import_run_id)
    result = advance_import_execution(
        profile_id=profile_id,
        import_run_id=import_run_id,
        actor_email=session.email,
        run=run,
        workspace=workspace,
        plan=plan,
    )
    if result["status"] in {"ROLLED_BACK", "ROLLBACK_FAILED"}:
        logger.error(
            "Staged Profile import failed at %s for run %s; rollback status=%s",
            result.get("stage"),
            import_run_id,
            result["status"],
        )
    return result


@router.post("/{import_run_id}/rollback")
def rollback_profile_workbook_import(
    profile_id: str,
    import_run_id: str,
    payload: ImportRollbackPayload,
    request: Request,
) -> dict[str, Any]:
    session = require_request_session(request)
    run = _load_run(profile_id, import_run_id)
    try:
        return rollback_import(
            profile_id=profile_id,
            import_run_id=import_run_id,
            actor_email=session.email,
            run=run,
        )
    except ImportCutoverError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
