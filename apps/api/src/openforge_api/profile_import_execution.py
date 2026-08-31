from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from openforge_api.db import connect, postgres_runtime_enabled
from openforge_api.profile_workbook_cutover import (
    ImportCutoverError,
    ImportPersistenceError,
    _apply_accounts,
    _apply_profile_settings,
    _checkpoint_state_checksum,
    _decision_map,
    _ledger_write_entries,
    _profile_state_checksum,
    create_checkpoint,
    final_import_summary,
    generate_post_import_reconciliation,
    insert_ledger_batch,
    rollback_incomplete_import,
)

LEDGER_STAGES = (
    ("SPORTSBOOK", "sportsbook"),
    ("FREE_BETS", "free_bets"),
    ("CASINO", "casino"),
    ("EXTRA_PLACES", "extra_places"),
    ("CASH_ADJUSTMENTS", "cash_adjustments"),
)
EXECUTION_STAGES = (
    "PREPARING",
    "PROFILE_SETTINGS",
    "ACCOUNTS",
    *(stage for stage, _ledger in LEDGER_STAGES),
    "RECONCILING",
)
TERMINAL_EXECUTION_STATUSES = {
    "COMPLETE",
    "POST_IMPORT_RECONCILIATION_FAILED",
    "ROLLED_BACK",
    "ROLLBACK_FAILED",
}
IMPORT_BATCH_SIZE = 25


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _setting_units(plan: dict[str, Any]) -> int:
    return sum(
        1
        for item in plan["profile_settings"]
        if item.get("classification") == "IMPORT"
        and item.get("parsed_value") not in {None, ""}
    )


def _planned_units(
    plan: dict[str, Any], decisions: dict[str, dict[str, Any]]
) -> dict[str, int]:
    ledger_counts = {ledger: 0 for _stage, ledger in LEDGER_STAGES}
    for target, _source, _row, _item, _ep_item in _ledger_write_entries(plan, decisions):
        ledger_counts[target] += 1
    return {
        "profile_settings": _setting_units(plan),
        "accounts": len(plan["accounts"]),
        **ledger_counts,
        "reconciliation": 1,
    }


def _execution_record(row: Any) -> dict[str, Any]:
    record = dict(row)
    record["progress"] = json.loads(record.pop("progress_json") or "{}")
    record["error"] = json.loads(record.pop("error_json") or "{}")
    record["percentage"] = (
        min(100, round(100 * int(record["completed_units"]) / int(record["total_units"])))
        if int(record["total_units"])
        else 0
    )
    return record


def load_import_execution(import_run_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM profile_import_executions WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
    return None if row is None else _execution_record(row)


def list_active_import_executions(owner_email: str) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT execution.*
            FROM profile_import_executions AS execution
            JOIN profile_import_runs AS run ON run.import_run_id = execution.import_run_id
            WHERE lower(run.owner_email) = lower(?) AND execution.status = 'RUNNING'
            ORDER BY execution.updated_at
            """,
            (owner_email,),
        ).fetchall()
    return [_execution_record(row) for row in rows]


def _append_run_event(
    connection: Any,
    *,
    import_run_id: str,
    kind: str,
    title: str,
    message: str,
) -> None:
    row = connection.execute(
        "SELECT summary_json FROM profile_import_runs WHERE import_run_id = ?",
        (import_run_id,),
    ).fetchone()
    if row is None:
        raise ImportCutoverError("Import run is unavailable")
    summary = json.loads(row["summary_json"] or "{}")
    job = dict(summary.get("job") or {})
    events = list(job.get("events") or [])
    events.append(
        {
            "kind": kind,
            "title": title,
            "message": message,
            "created_at": _now(),
        }
    )
    job["events"] = events[-50:]
    summary["job"] = job
    connection.execute(
        "UPDATE profile_import_runs SET summary_json = ?, updated_at = ? "
        "WHERE import_run_id = ?",
        (_json(summary), _now(), import_run_id),
    )


def validate_staged_execution_readiness(
    *,
    run: dict[str, Any],
    workspace: dict[str, Any],
    plan: dict[str, Any],
) -> dict[str, Any]:
    summary = final_import_summary(run=run, workspace=workspace, plan=plan)
    preflight = run.get("summary", {}).get("persistence_preflight", {})
    preflight_valid = (
        preflight.get("status") == "PASSED"
        and preflight.get("transaction_constructed") is True
        and preflight.get("writes_committed") is False
        and preflight.get("workbook_checksum") == run.get("workbook_checksum")
        and preflight.get("mapping_version") == run.get("mapping_version")
    )
    if not run.get("approved_at") or not summary["ready"] or not preflight_valid:
        raise ImportCutoverError("The approved import plan is not ready for staged execution")
    decisions = _decision_map(workspace)
    units = _planned_units(plan, decisions)
    return {
        "status": "PASSED",
        "workbook_checksum": run["workbook_checksum"],
        "mapping_version": run["mapping_version"],
        "stages": list(EXECUTION_STAGES),
        "planned_units": units,
        "total_units": sum(units.values()),
        "batch_size": IMPORT_BATCH_SIZE,
        "writes_committed": False,
    }


def start_import_execution(
    *,
    profile_id: str,
    import_run_id: str,
    actor_email: str,
    run: dict[str, Any],
    workspace: dict[str, Any],
    plan: dict[str, Any],
) -> dict[str, Any]:
    readiness = validate_staged_execution_readiness(run=run, workspace=workspace, plan=plan)
    checkpoint = create_checkpoint(profile_id=profile_id, import_run_id=import_run_id, run=run)
    execution_id = "import-execution-" + hashlib.sha256(import_run_id.encode()).hexdigest()[:24]
    now = _now()
    progress = {
        "planned_units": readiness["planned_units"],
        "counts": {
            "profile_settings": 0,
            "accounts": {
                "created": 0,
                "updated": 0,
                "unchanged": 0,
                "absent_changed": 0,
            },
            "ledgers": {ledger: 0 for _stage, ledger in LEDGER_STAGES},
        },
        "last_state_checksum": checkpoint["snapshot_checksum"],
        "checkpoint_id": checkpoint["checkpoint_id"],
    }
    with connect() as connection:
        existing = connection.execute(
            "SELECT * FROM profile_import_executions WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
        if existing is not None and str(existing["status"]) == "RUNNING":
            return _execution_record(existing)
        active_writes = connection.execute(
            "SELECT COUNT(*) AS count FROM profile_import_write_audit "
            "WHERE import_run_id = ? AND rolled_back_at = ''",
            (import_run_id,),
        ).fetchone()
        if active_writes is not None and int(active_writes["count"]):
            raise ImportCutoverError("This import run already has committed writes")
        previous_attempts = int(existing["attempt_count"]) if existing is not None else 0
        connection.execute(
            """
            INSERT INTO profile_import_executions (
              execution_id, import_run_id, profile_id, actor_email, status, stage,
              stage_cursor, completed_units, total_units, progress_json, error_json,
              attempt_count, started_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, 'RUNNING', 'PREPARING', 0, 0, ?, ?, '{}', ?, ?, ?, '')
            ON CONFLICT(import_run_id) DO UPDATE SET
              actor_email = excluded.actor_email,
              status = 'RUNNING',
              stage = 'PREPARING',
              stage_cursor = 0,
              completed_units = 0,
              total_units = excluded.total_units,
              progress_json = excluded.progress_json,
              error_json = '{}',
              attempt_count = excluded.attempt_count,
              started_at = excluded.started_at,
              updated_at = excluded.updated_at,
              completed_at = ''
            """,
            (
                execution_id,
                import_run_id,
                profile_id,
                actor_email,
                readiness["total_units"],
                _json(progress),
                previous_attempts + 1,
                now,
                now,
            ),
        )
        connection.execute(
            "UPDATE profile_import_runs SET status = 'IMPORTING', import_started_at = ?, "
            "completed_at = '', rollback_status = 'AVAILABLE', rolled_back_at = '', "
            "result_json = ?, updated_at = ? WHERE profile_id = ? AND import_run_id = ?",
            (
                now,
                _json(
                    {
                        "status": "IMPORTING",
                        "execution_id": execution_id,
                        "checkpoint_id": checkpoint["checkpoint_id"],
                    }
                ),
                now,
                profile_id,
                import_run_id,
            ),
        )
        _append_run_event(
            connection,
            import_run_id=import_run_id,
            kind="import_started",
            title="Profile import started",
            message="The approved workbook import is running in resumable stages.",
        )
        row = connection.execute(
            "SELECT * FROM profile_import_executions WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
    if row is None:
        raise ImportCutoverError("Import execution could not be started")
    return _execution_record(row)


def _next_stage(stage: str) -> str:
    return EXECUTION_STAGES[EXECUTION_STAGES.index(stage) + 1]


def _merge_counts(target: dict[str, int], update: dict[str, int]) -> None:
    for key, value in update.items():
        target[key] = int(target.get(key, 0)) + int(value)


def _write_result(
    *, execution: dict[str, Any], progress: dict[str, Any], import_run_id: str
) -> dict[str, Any]:
    now = _now()
    ledgers = progress["counts"]["ledgers"]
    started_at = str(execution["started_at"])
    return {
        "status": "RECONCILING",
        "import_run_id": import_run_id,
        "actor_email": execution["actor_email"],
        "checkpoint_id": progress["checkpoint_id"],
        "profile_settings_updated": progress["counts"]["profile_settings"],
        "accounts": progress["counts"]["accounts"],
        "ledgers": ledgers,
        "rows_imported": sum(int(value) for value in ledgers.values()),
        "rollback_available": True,
        "started_at": started_at,
        "completed_at": now,
        "duration_seconds": max(
            0,
            int(
                (
                    datetime.fromisoformat(now)
                    - datetime.fromisoformat(started_at)
                ).total_seconds()
            ),
        ),
    }


def advance_import_execution(
    *,
    profile_id: str,
    import_run_id: str,
    actor_email: str,
    run: dict[str, Any],
    workspace: dict[str, Any],
    plan: dict[str, Any],
) -> dict[str, Any]:
    decisions = _decision_map(workspace)
    approved_summary = final_import_summary(run=run, workspace=workspace, plan=plan)
    previous = load_import_execution(import_run_id)
    if previous is None:
        raise ImportCutoverError("Import execution has not been started")
    if previous["status"] in TERMINAL_EXECUTION_STATUSES:
        return previous
    expected_state_checksum = ""
    failure_stage = str(previous["stage"])
    try:
        with connect() as connection:
            lock_suffix = " FOR UPDATE" if postgres_runtime_enabled() else ""
            row = connection.execute(
                "SELECT * FROM profile_import_executions WHERE import_run_id = ?" + lock_suffix,
                (import_run_id,),
            ).fetchone()
            if row is None:
                raise ImportCutoverError("Import execution is unavailable")
            execution = _execution_record(row)
            if execution["status"] in TERMINAL_EXECUTION_STATUSES:
                return execution
            progress = dict(execution["progress"])
            expected_state_checksum = str(progress.get("last_state_checksum") or "")
            counts = progress["counts"]
            stage = str(execution["stage"])
            failure_stage = stage
            cursor = int(execution["stage_cursor"])
            completed_units = int(execution["completed_units"])
            next_stage = stage
            next_cursor = cursor

            if stage == "PREPARING":
                checkpoint = connection.execute(
                    "SELECT snapshot_json, snapshot_checksum FROM profile_import_checkpoints "
                    "WHERE import_run_id = ? AND profile_id = ?",
                    (import_run_id, profile_id),
                ).fetchone()
                if checkpoint is None or _profile_state_checksum(
                    connection, profile_id
                ) != _checkpoint_state_checksum(checkpoint):
                    raise ImportCutoverError(
                        "Profile state no longer matches the import checkpoint"
                    )
                next_stage = "PROFILE_SETTINGS"
            elif stage == "PROFILE_SETTINGS":
                counts["profile_settings"] = _apply_profile_settings(
                    connection,
                    profile_id=profile_id,
                    import_run_id=import_run_id,
                    settings=plan["profile_settings"],
                )
                completed_units += int(progress["planned_units"]["profile_settings"])
                next_stage = "ACCOUNTS"
                next_cursor = 0
            elif stage == "ACCOUNTS":
                account_rows = plan["accounts"]
                batch = account_rows[cursor : cursor + IMPORT_BATCH_SIZE]
                is_final_batch = cursor + len(batch) >= len(account_rows)
                account_counts = _apply_accounts(
                    connection,
                    profile_id=profile_id,
                    import_run_id=import_run_id,
                    rows=batch,
                    all_rows=account_rows,
                    decisions=decisions,
                    absent_strategy=approved_summary["accounts"]["absent_strategy"],
                    apply_absent_strategy=is_final_batch,
                )
                _merge_counts(counts["accounts"], account_counts)
                completed_units += len(batch)
                next_cursor = cursor + len(batch)
                if is_final_batch:
                    next_stage = "SPORTSBOOK"
                    next_cursor = 0
            elif stage in {name for name, _ledger in LEDGER_STAGES}:
                target_ledger = dict(LEDGER_STAGES)[stage]
                batch_result = insert_ledger_batch(
                    connection,
                    profile_id=profile_id,
                    import_run_id=import_run_id,
                    plan=plan,
                    decisions=decisions,
                    target_ledger=target_ledger,
                    offset=cursor,
                    limit=IMPORT_BATCH_SIZE,
                )
                counts["ledgers"][target_ledger] += int(batch_result["inserted"])
                completed_units += int(batch_result["processed"])
                next_cursor = int(batch_result["next_cursor"])
                if next_cursor >= int(batch_result["total"]):
                    next_stage = _next_stage(stage)
                    next_cursor = 0
            elif stage == "RECONCILING":
                write_result = _write_result(
                    execution=execution,
                    progress=progress,
                    import_run_id=import_run_id,
                )
                write_result["skipped_non_transactional"] = approved_summary["ledgers"].get(
                    "sportsbook", {}
                ).get("non_transactional", 0)
                report = generate_post_import_reconciliation(
                    connection=connection,
                    profile_id=profile_id,
                    import_run_id=import_run_id,
                    run=run,
                    workspace=workspace,
                    summary=approved_summary,
                    write_result=write_result,
                    plan=plan,
                )
                passed = report["result"] == "POST-IMPORT RECONCILIATION: PASSED"
                final_status = "COMPLETE" if passed else "POST_IMPORT_RECONCILIATION_FAILED"
                completed_units = int(execution["total_units"])
                result = {
                    **write_result,
                    "status": final_status,
                    "post_import_reconciliation": report,
                    "post_import_state_checksum": _profile_state_checksum(connection, profile_id),
                }
                now = _now()
                connection.execute(
                    "UPDATE profile_import_executions SET status = ?, completed_units = ?, "
                    "progress_json = ?, completed_at = ?, updated_at = ? WHERE import_run_id = ?",
                    (
                        final_status,
                        completed_units,
                        _json(progress),
                        now,
                        now,
                        import_run_id,
                    ),
                )
                connection.execute(
                    "UPDATE profile_import_runs SET status = ?, completed_at = ?, "
                    "result_json = ?, rollback_status = 'AVAILABLE', updated_at = ? "
                    "WHERE profile_id = ? AND import_run_id = ?",
                    (final_status, now, _json(result), now, profile_id, import_run_id),
                )
                _append_run_event(
                    connection,
                    import_run_id=import_run_id,
                    kind="import_complete" if passed else "import_reconciliation_failed",
                    title="Profile import complete" if passed else "Import reconciliation failed",
                    message=(
                        "The imported Profile reconciled with the approved workbook plan."
                        if passed
                        else (
                            "The persisted Profile differs from the approved plan. "
                            "Rollback is available."
                        )
                    ),
                )
                final_row = connection.execute(
                    "SELECT * FROM profile_import_executions WHERE import_run_id = ?",
                    (import_run_id,),
                ).fetchone()
                if final_row is None:
                    raise ImportCutoverError("Completed execution could not be loaded")
                return _execution_record(final_row)
            else:
                raise ImportCutoverError(f"Unsupported import execution stage: {stage}")

            progress["last_state_checksum"] = _profile_state_checksum(connection, profile_id)
            now = _now()
            connection.execute(
                "UPDATE profile_import_executions SET stage = ?, stage_cursor = ?, "
                "completed_units = ?, progress_json = ?, updated_at = ? "
                "WHERE import_run_id = ?",
                (
                    next_stage,
                    next_cursor,
                    completed_units,
                    _json(progress),
                    now,
                    import_run_id,
                ),
            )
            connection.execute(
                "UPDATE profile_import_runs SET updated_at = ? WHERE import_run_id = ?",
                (now, import_run_id),
            )
            next_row = connection.execute(
                "SELECT * FROM profile_import_executions WHERE import_run_id = ?",
                (import_run_id,),
            ).fetchone()
        if next_row is None:
            raise ImportCutoverError("Updated import execution could not be loaded")
        return _execution_record(next_row)
    except Exception as error:
        failure = {
            "stage": failure_stage,
            "category": (
                error.category if isinstance(error, ImportPersistenceError) else "execution_stage"
            ),
            "import_id": error.import_id if isinstance(error, ImportPersistenceError) else "",
            "record_id": error.record_id if isinstance(error, ImportPersistenceError) else "",
            "exception_type": type(error).__name__,
            "message": "Import execution failed and the pre-import Profile state was restored.",
        }
        try:
            rollback_incomplete_import(
                profile_id=profile_id,
                import_run_id=import_run_id,
                actor_email=actor_email,
                expected_state_checksum=expected_state_checksum,
                error=failure,
            )
            with connect() as connection:
                _append_run_event(
                    connection,
                    import_run_id=import_run_id,
                    kind="import_failed",
                    title="Profile import failed safely",
                    message="The pre-import Profile state was restored. Open the run for details.",
                )
        except Exception as rollback_error:
            failure["rollback_exception_type"] = type(rollback_error).__name__
            failure["rollback_diagnostic"] = str(rollback_error)
            with connect() as connection:
                now = _now()
                connection.execute(
                    "UPDATE profile_import_executions SET status = 'ROLLBACK_FAILED', "
                    "error_json = ?, completed_at = ?, updated_at = ? WHERE import_run_id = ?",
                    (_json(failure), now, now, import_run_id),
                )
                connection.execute(
                    "UPDATE profile_import_runs SET status = 'IMPORT_FAILED', "
                    "result_json = ?, updated_at = ? WHERE import_run_id = ?",
                    (_json({"status": "ROLLBACK_FAILED", "error": failure}), now, import_run_id),
                )
        failed = load_import_execution(import_run_id)
        if failed is None:
            raise ImportCutoverError("Import execution failure state is unavailable") from error
        return failed
