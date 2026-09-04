from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import openforge_api.profile_workbook_imports as workbook_imports
from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.main import app
from openforge_api.profile_workbook_cutover import (
    _profile_state_checksum,
    _profile_state_manifest,
)
from openforge_api.profile_workbook_imports import (
    ImportApprovalPayload,
    _approval_request_state,
    _save_preflight_result,
    _workspace,
    approve_profile_workbook_import,
)


def configure_database(tmp_path: Path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'profile-import.sqlite3'}"
    settings.auth_required = False
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profiles (
              profile_id, display_name, profile_code, status, tracking_start_date,
              management_fee_percent, investment_fee_percent, current_cash_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "profile-import-test",
                "Import Test",
                "IMPORT-TEST",
                "Active",
                "2026-08-01",
                "25",
                "25",
                "0.00",
            ),
        )


def test_recovery_diagnostics_require_a_fund_manager_session(tmp_path: Path) -> None:
    configure_database(tmp_path)

    response = TestClient(app).get(
        "/profiles/profile-import-test/workbook-imports/recovery-diagnostics"
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Access unavailable"}


def test_recovery_diagnostics_are_profile_scoped_read_only_and_report_safe_rollback(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    monkeypatch.setattr(
        "openforge_api.profile_workbook_imports.require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid", role="fund_manager"),
    )
    timestamp = "2026-09-03T12:00:00+00:00"
    import_run_id = "profile-import-diagnostics"
    with connect() as connection:
        checksum = _profile_state_checksum(connection, "profile-import-test")
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, completed_at, checkpoint_id, result_json, rollback_status,
              created_at, updated_at
            ) VALUES (?, ?, ?, 'synthetic.xlsx', ?, 100, ?, 'founder-snapshot-v5', 'COMPLETE',
                      '{}', '{}', ?, 'checkpoint-diagnostics', ?, 'AVAILABLE', ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                "d" * 64,
                timestamp,
                timestamp,
                json.dumps(
                    {
                        "post_import_state_checksum": checksum,
                        "post_import_reconciliation": {
                            "status": "POST-IMPORT RECONCILIATION: PASSED"
                        },
                    }
                ),
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_checkpoints (
              checkpoint_id, import_run_id, profile_id, workbook_checksum, mapping_version,
              snapshot_json, snapshot_checksum, status, created_at, restored_at
            ) VALUES ('checkpoint-diagnostics', ?, ?, ?, 'founder-snapshot-v5', '{}', ?,
                      'AVAILABLE', ?, '')
            """,
            (import_run_id, "profile-import-test", "d" * 64, "c" * 64, timestamp),
        )
        connection.execute(
            """
            INSERT INTO profile_import_executions (
              execution_id, import_run_id, profile_id, actor_email, status, stage,
              stage_cursor, completed_units, total_units, progress_json, error_json,
              attempt_count, started_at, updated_at, completed_at
            ) VALUES ('execution-diagnostics', ?, ?, ?, 'COMPLETE', 'RECONCILING', 0, 1, 1,
                      '{}', '{}', 1, ?, ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                timestamp,
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_write_audit (
              import_run_id, import_key, profile_id, entity_type, entity_id, operation,
              before_json, after_json, created_at, rolled_back_at
            ) VALUES (?, 'accounts:2', ?, 'accounts', 'account-diagnostics', 'create', '{}',
                      '{}', ?, '')
            """,
            (import_run_id, "profile-import-test", timestamp),
        )

    response = TestClient(app).get(
        "/profiles/profile-import-test/workbook-imports/recovery-diagnostics"
    )

    assert response.status_code == 200
    payload = response.json()
    expected = {
        "profile_id": "profile-import-test",
        "profile_display_name": "Import Test",
        "import_run_id": import_run_id,
        "execution_id": "execution-diagnostics",
        "attempt_number": 1,
        "import_status": "COMPLETE",
        "reconciliation_status": "POST-IMPORT RECONCILIATION: PASSED",
        "checkpoint_id": "checkpoint-diagnostics",
        "checkpoint_status": "AVAILABLE",
        "checkpoint_checksum": "c" * 64,
        "recorded_post_import_checksum": checksum,
        "current_profile_checksum": checksum,
        "current_matches_post_import_checksum": True,
        "post_import_profile_drift_detected": False,
        "manual_post_import_mutation_detected": False,
        "rollback_available": True,
        "active_write_audit_row_count": 1,
        "execution_running": False,
        "import_started_at": timestamp,
        "import_completed_at": timestamp,
        "import_rolled_back_at": "",
        "rollback_conclusion": "ROLLBACK SAFE",
        "rollback_reason": (
            "The latest attempt has its own available checkpoint and unchanged post-import state."
        ),
    }
    assert {key: payload[key] for key in expected} == expected
    assert payload["drift_evidence_status"] == "UNAVAILABLE_LEGACY"
    assert payload["drift"] == []
    assert payload["attempts"][0]["execution_id"] == "execution-diagnostics"
    assert payload["attempts"][0]["legacy_ambiguous"] is True
    assert payload["attempts"][0]["is_latest_attempt"] is True

    # New attempts retain row fingerprints, so checksum drift is concrete evidence
    # rather than an unsupported claim that a person manually edited the Profile.
    with connect() as connection:
        manifest = _profile_state_manifest(connection, "profile-import-test")
        connection.execute(
            "UPDATE profile_import_attempts SET post_import_manifest_json = ?, "
            "legacy_ambiguous = 0 WHERE execution_id = 'execution-diagnostics'",
            (json.dumps(manifest),),
        )
        connection.execute(
            "UPDATE profiles SET display_name = 'Import Test Updated' "
            "WHERE profile_id = 'profile-import-test'"
        )

    drift_response = TestClient(app).get(
        "/profiles/profile-import-test/workbook-imports/recovery-diagnostics"
    )
    assert drift_response.status_code == 200
    drift_payload = drift_response.json()
    assert drift_payload["rollback_conclusion"] == "ROLLBACK LOCKED — PROFILE CHANGED"
    assert drift_payload["post_import_profile_drift_detected"] is True
    assert drift_payload["manual_post_import_mutation_detected"] is False
    assert drift_payload["drift"] == [
        {
            "domain": "profiles",
            "row_id": "profile-import-test",
            "operation": "modified",
            "timestamp": "",
            "actor": "",
            "source": "",
        }
    ]


def test_passed_preflight_restores_approved_failed_run_readiness(tmp_path: Path) -> None:
    configure_database(tmp_path)
    import_run_id = "profile-import-preflight-retry"
    checksum = "a" * 64
    mapping_version = "founder-snapshot-v5"
    approved_at = "2026-08-31T12:00:00+00:00"
    previous_result = {
        "status": "POST_IMPORT_RECONCILIATION_FAILED",
        "latest_attempt": {"stage": "Profile Accounts", "category": "account_create"},
        "post_import_reconciliation": {
            "result": "POST-IMPORT RECONCILIATION: FAILED",
        },
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, approved_at, result_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 100, ?, ?, 'IMPORT_FAILED', '{}', '{}', ?, ?, ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                "synthetic.xlsx",
                checksum,
                approved_at,
                mapping_version,
                approved_at,
                json.dumps(previous_result),
                approved_at,
                approved_at,
            ),
        )
    summary = {
        "readiness": {
            "partial_rows_requiring_mapping_decisions": 0,
            "provider_conflicts": 0,
            "historical_ep_rows_requiring_review": 0,
        },
        "profile_settings": [],
        "accounts": {},
        "ledgers": {},
        "extra_places": {},
    }
    run = {
        "status": "IMPORT_FAILED",
        "approved_at": approved_at,
        "summary": summary,
        "workbook_checksum": checksum,
        "mapping_version": mapping_version,
    }

    preflight = _save_preflight_result(
        import_run_id=import_run_id,
        profile_id="profile-import-test",
        run=run,
        result={"status": "PASSED", "transaction_constructed": True, "writes_committed": False},
    )

    with connect() as connection:
        persisted = connection.execute(
            "SELECT status, summary_json, result_json FROM profile_import_runs "
            "WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
    assert persisted is not None
    assert persisted["status"] == "READY_APPROVED"
    assert json.loads(persisted["summary_json"])["persistence_preflight"] == preflight
    assert json.loads(persisted["result_json"]) == previous_result
    assert preflight["writes_committed"] is False

    with connect() as connection:
        connection.execute(
            "UPDATE profile_import_runs SET status = 'ROLLED_BACK', rollback_status = 'COMPLETE', "
            "rolled_back_at = ? WHERE import_run_id = ?",
            (approved_at, import_run_id),
        )
        connection.execute(
            """
            INSERT INTO profile_import_executions (
              execution_id, import_run_id, profile_id, actor_email, status, stage,
              stage_cursor, completed_units, total_units, progress_json, error_json,
              attempt_count, started_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, 'POST_IMPORT_RECONCILIATION_FAILED', 'RECONCILING',
                      0, 1, 1, '{}', '{}', 1, ?, ?, ?)
            """,
            (
                "execution-previous",
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                approved_at,
                approved_at,
                approved_at,
            ),
        )
    repaired_workspace = _workspace("profile-import-test", import_run_id)
    assert repaired_workspace["run_status"] == "READY_APPROVED"
    assert repaired_workspace["rollback_status"] == "COMPLETE"
    assert repaired_workspace["rolled_back_at"] == approved_at
    assert repaired_workspace["persistence_preflight"]["status"] == "PASSED"
    assert repaired_workspace["import_result"] == previous_result
    assert repaired_workspace["execution"] is None
    assert repaired_workspace["previous_execution"]["status"] == (
        "POST_IMPORT_RECONCILIATION_FAILED"
    )
    with connect() as connection:
        repaired_status = connection.execute(
            "SELECT status FROM profile_import_runs WHERE import_run_id = ?", (import_run_id,)
        ).fetchone()
    assert repaired_status is not None
    assert repaired_status["status"] == "READY_APPROVED"


def test_approval_claim_is_persisted_duplicate_safe_and_completes_in_request(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    import_run_id = "profile-import-approval-state"
    checksum = "a" * 64
    timestamp = "2026-09-04T10:00:00+00:00"
    summary = {
        "readiness": {
            "partial_rows_requiring_mapping_decisions": 0,
            "provider_conflicts": 0,
            "historical_ep_rows_requiring_review": 0,
        },
        "job": {"events": []},
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, created_at, updated_at
            ) VALUES (?, 'profile-import-test', ?, 'synthetic.xlsx', ?, 100, ?,
                      'founder-snapshot-v7', 'DRY_RUN_READY', ?, '{}', ?, ?)
            """,
            (
                import_run_id,
                "founder@example.invalid",
                checksum,
                timestamp,
                json.dumps(summary),
                timestamp,
                timestamp,
            ),
        )

    monkeypatch.setattr(
        workbook_imports,
        "require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid"),
    )
    monkeypatch.setattr(workbook_imports, "load_base_write_plan", lambda *_args: {})

    def fake_workspace(profile_id: str, run_id: str) -> dict[str, object]:
        with connect() as connection:
            row = connection.execute(
                "SELECT status, summary_json, approved_at FROM profile_import_runs "
                "WHERE profile_id = ? AND import_run_id = ?",
                (profile_id, run_id),
            ).fetchone()
        assert row is not None
        persisted_summary = json.loads(row["summary_json"])
        return {
            "run_status": row["status"],
            "approval": _approval_request_state(
                workbook_imports._load_run(profile_id, run_id)
            ),
            "approved_at": row["approved_at"],
            "metadata": {"workbook_checksum": checksum},
            "reconciliation": {"import_ready": True},
            "source_summary": persisted_summary,
        }

    monkeypatch.setattr(workbook_imports, "_workspace", fake_workspace)
    monkeypatch.setattr(
        workbook_imports,
        "validate_import_approval_preflight",
        lambda **_kwargs: {
            "status": "PASSED",
            "transaction_constructed": True,
            "writes_committed": False,
        },
    )
    payload = ImportApprovalPayload(workbook_checksum=checksum, acknowledged=True)

    completed = approve_profile_workbook_import(
        "profile-import-test", import_run_id, payload, object()
    )

    assert completed["run_status"] == "READY_APPROVED"
    assert completed["approval"]["status"] == "READY_APPROVED"
    with connect() as connection:
        persisted = connection.execute(
            "SELECT status, approved_at, summary_json FROM profile_import_runs "
            "WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
    assert persisted is not None
    assert persisted["status"] == "READY_APPROVED"
    assert persisted["approved_at"]
    assert json.loads(persisted["summary_json"])["persistence_preflight"]["status"] == "PASSED"

    with pytest.raises(HTTPException, match="already running"):
        with connect() as connection:
            connection.execute(
                "UPDATE profile_import_runs SET status = 'APPROVING', approved_at = '', "
                "updated_at = ? WHERE import_run_id = ?",
                (workbook_imports._now(), import_run_id),
            )
        approve_profile_workbook_import(
            "profile-import-test", import_run_id, payload, object()
        )


def test_stale_approval_is_reported_interrupted_and_can_be_retried(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    import_run_id = "profile-import-interrupted-approval"
    checksum = "b" * 64
    timestamp = "2026-09-04T10:00:00+00:00"
    summary = {
        "readiness": {
            "partial_rows_requiring_mapping_decisions": 0,
            "provider_conflicts": 0,
            "historical_ep_rows_requiring_review": 0,
        },
        "job": {"stage": "Validating Account and ledger contracts", "events": []},
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, created_at, updated_at
            ) VALUES (?, 'profile-import-test', ?, 'synthetic.xlsx', ?, 100, ?,
                      'founder-snapshot-v8', 'APPROVING', ?, '{}', ?, ?)
            """,
            (
                import_run_id,
                "founder@example.invalid",
                checksum,
                timestamp,
                json.dumps(summary),
                timestamp,
                timestamp,
            ),
        )

    run = workbook_imports._load_run("profile-import-test", import_run_id)
    assert _approval_request_state(run) == {
        "status": "INTERRUPTED",
        "persisted_status": "APPROVING",
        "stage": "Validating Account and ledger contracts",
        "updated_at": timestamp,
        "retry_available": True,
        "reason": (
            "The approval request exceeded the server execution window. No Profile data was "
            "imported; approval can be retried."
        ),
    }

    monkeypatch.setattr(
        workbook_imports,
        "require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid"),
    )
    monkeypatch.setattr(workbook_imports, "load_base_write_plan", lambda *_args: {})
    monkeypatch.setattr(
        workbook_imports,
        "validate_import_approval_preflight",
        lambda **_kwargs: {
            "status": "PASSED",
            "validation_mode": "schema_and_domain_contracts",
            "transaction_constructed": False,
            "writes_attempted": False,
            "writes_committed": False,
        },
    )

    original_workspace = workbook_imports._workspace

    def fake_workspace(profile_id: str, run_id: str) -> dict[str, object]:
        run_value = workbook_imports._load_run(profile_id, run_id)
        return {
            "run_status": run_value["status"],
            "approval": _approval_request_state(run_value),
            "approved_at": run_value["approved_at"],
            "metadata": {"workbook_checksum": checksum},
            "reconciliation": {"import_ready": True},
            "source_summary": run_value["summary"],
        }

    monkeypatch.setattr(workbook_imports, "_workspace", fake_workspace)
    retried = approve_profile_workbook_import(
        "profile-import-test",
        import_run_id,
        ImportApprovalPayload(workbook_checksum=checksum, acknowledged=True),
        object(),
    )
    assert retried["run_status"] == "READY_APPROVED"
    assert retried["approval"]["status"] == "READY_APPROVED"
    monkeypatch.setattr(workbook_imports, "_workspace", original_workspace)


def test_delete_review_removes_rolled_back_attempt_metadata_transactionally(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    monkeypatch.setattr(
        "openforge_api.profile_workbook_imports.require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid"),
    )
    import_run_id = "profile-import-removable"
    timestamp = "2026-09-03T12:00:00+00:00"
    summary = {
        "readiness": {
            "partial_rows_requiring_mapping_decisions": 1,
            "provider_conflicts": 0,
            "historical_ep_rows_requiring_review": 0,
        },
        "profile_settings": [],
        "accounts": {},
        "ledgers": {},
        "extra_places": {},
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, approved_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 100, ?, ?, 'READY_APPROVED', ?, '{}', ?, ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                "synthetic.xlsx",
                "b" * 64,
                timestamp,
                "founder-snapshot-v5",
                json.dumps(summary),
                timestamp,
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_review_items (
              import_run_id, item_id, profile_id, import_id, source_fingerprint,
              source_sheet, source_row, source_record_id, category, item_json,
              created_at, updated_at
            ) VALUES (?, 'review-1', ?, 'source-1', ?, 'Accounts', 2, 'IT1-AC-0001',
                      'missing_provider', '{}', ?, ?)
            """,
            (import_run_id, "profile-import-test", "c" * 64, timestamp, timestamp),
        )
        connection.execute(
            """
            INSERT INTO profile_import_review_decisions (
              import_run_id, item_id, profile_id, workbook_checksum, mapping_version,
              source_fingerprint, decision_json, actor_email, created_at, updated_at
            ) VALUES (?, 'review-1', ?, ?, 'founder-snapshot-v5', ?, '{}', ?, ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "b" * 64,
                "c" * 64,
                "founder@example.invalid",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO profile_import_write_plans VALUES (?, ?, '{}', ?, ?, ?)",
            (import_run_id, "profile-import-test", "d" * 64, timestamp, timestamp),
        )
        connection.execute(
            """
            INSERT INTO profile_import_checkpoints (
              checkpoint_id, import_run_id, profile_id, workbook_checksum, mapping_version,
              snapshot_json, snapshot_checksum, status, created_at, restored_at
            ) VALUES ('checkpoint-1', ?, ?, ?, 'founder-snapshot-v5', '{}', ?,
                      'RESTORED', ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "b" * 64,
                "e" * 64,
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_write_audit (
              import_run_id, import_key, profile_id, entity_type, entity_id, operation,
              before_json, after_json, created_at, rolled_back_at
            ) VALUES (?, 'write-1', ?, 'accounts', 'account-1', 'create', '{}', '{}', ?, ?)
            """,
            (import_run_id, "profile-import-test", timestamp, timestamp),
        )
        connection.execute(
            """
            INSERT INTO profile_import_rollback_events (
              rollback_event_id, import_run_id, profile_id, actor_email, checkpoint_id,
              status, summary_json, created_at, completed_at
            ) VALUES ('rollback-1', ?, ?, ?, 'checkpoint-1', 'COMPLETE', '{}', ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_executions (
              execution_id, import_run_id, profile_id, actor_email, status, stage,
              stage_cursor, completed_units, total_units, progress_json, error_json,
              attempt_count, started_at, updated_at, completed_at
            ) VALUES ('execution-1', ?, ?, ?, 'ROLLED_BACK', 'RECONCILING', 0, 1, 1,
                      '{}', '{}', 1, ?, ?, ?)
            """,
            (
                import_run_id,
                "profile-import-test",
                "founder@example.invalid",
                timestamp,
                timestamp,
                timestamp,
            ),
        )

    response = TestClient(app).delete(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
    )
    assert response.status_code == 204, response.text

    with connect() as connection:
        for table in (
            "profile_import_review_decisions",
            "profile_import_review_items",
            "profile_import_write_plans",
            "profile_import_checkpoints",
            "profile_import_write_audit",
            "profile_import_rollback_events",
            "profile_import_executions",
            "profile_import_attempt_write_audit",
            "profile_import_attempt_checkpoints",
            "profile_import_attempts",
            "profile_import_runs",
        ):
            count = connection.execute(
                f"SELECT COUNT(*) AS count FROM {table} WHERE import_run_id = ?",  # noqa: S608
                (import_run_id,),
            ).fetchone()
            assert count is not None
            assert int(count["count"]) == 0


def test_uploaded_founder_snapshot_matches_private_regression_oracle(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    workbook = (
        Path(__file__).resolve().parents[3]
        / "data/private/imports/founder/WO_MB_Tracker_May2026.xlsx"
    )
    if not workbook.exists():
        pytest.skip("Private founder workbook is intentionally not committed")
    configure_database(tmp_path)
    monkeypatch.setattr(
        "openforge_api.profile_workbook_imports.require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid"),
    )
    content = workbook.read_bytes()
    before = hashlib.sha256(content).hexdigest()
    client = TestClient(app)

    response = client.post(
        "/profiles/profile-import-test/workbook-imports/analyse",
        json={
            "source_filename": workbook.name,
            "workbook_base64": base64.b64encode(content).decode("ascii"),
            "effective_at": "2026-08-29T16:05:00+01:00",
        },
    )

    assert response.status_code == 200, response.text
    queued = response.json()
    assert queued["metadata"]["workbook_checksum"] == before
    assert queued["run_status"] == "ANALYSING"
    assert queued["source_summary"]["job"]["stage"] == "Queued for analysis"
    assert queued["source_summary"]["job"]["work_units_completed"] == 0
    assert queued["source_summary"]["job"]["work_units_total"] == 9
    assert queued["source_summary"]["job"]["progress_mode"] == "staged"
    import_run_id = queued["metadata"]["import_run_id"]
    workspace_response = client.get(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
    )
    assert workspace_response.status_code == 200
    workspace = workspace_response.json()
    monkeypatch.setattr(
        "openforge_api.notifications.require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid"),
    )
    monkeypatch.setattr(
        "openforge_api.notifications.profile_opportunity_notifications",
        lambda _email, _now: [],
    )
    notifications = client.get("/fund-manager/notifications")
    assert notifications.status_code == 200
    import_notifications = [
        item
        for item in notifications.json()
        if item["notification_type"] == "workbook_import_analysis"
    ]
    assert {item["title"] for item in import_notifications} >= {
        "Workbook analysis started",
        "Workbook analysis complete",
    }
    assert "Workbook review required" not in {item["title"] for item in import_notifications}
    assert all(
        item["href"] == f"/profiles/profile-import-test/imports/{import_run_id}/review"
        for item in import_notifications
    )
    assert workspace["metadata"]["mapping_version"] == "founder-snapshot-v8"
    assert workspace["source_summary"]["job"]["work_units_completed"] == 9
    assert workspace["source_summary"]["job"]["work_units_total"] == 9
    assert workspace["metadata"]["original_partial_count"] == 0
    assert workspace["metadata"]["provider_conflict_count"] == 0
    assert workspace["metadata"]["historical_ep_count"] == 0
    assert workspace["run_status"] == "DRY_RUN_READY"
    assert workspace["items"] == []
    assert workspace["reconciliation"]["pnl_impact"] == "0.00"
    assert workspace["source_summary"]["accounts"]["row_count"] == 120
    assert workspace["source_summary"]["accounts"]["balances"] == {
        "Bookmaker": "666.12",
        "Exchange": "1836.31",
        "Bank": "302.97",
    }
    assert workspace["source_summary"]["accounts"]["pending_withdrawals"] == "50.00"
    account_changes = workspace["source_summary"]["accounts"]["change_reconciliation"]
    assert account_changes["counts"]["new_profile_accounts"] == 120
    assert account_changes["counts"]["balances_to_update"] == 108
    assert account_changes["counts"]["balance_writes_for_new_accounts"] == 108
    assert account_changes["counts"]["balance_updates_for_existing_accounts"] == 0
    assert account_changes["counts"]["workbook_accounts_accounted"] == 120
    assert account_changes["counts"]["resolved_workbook_accounts"] == 120
    assert account_changes["counts"]["workbook_accounts_not_found_globally"] == 0
    assert account_changes["default_absent_strategy"] == "leave_unchanged"
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["source_rows"] == 502
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["mapped"] == 497
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["partial"] == 0
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["non_transactional"] == 5
    assert len(workspace["source_summary"]["ledgers"]["sportsbook"]["non_transactional_rows"]) == 5
    assert workspace["source_summary"]["ledgers"]["free_bets"]["partial"] == 0
    assert workspace["source_summary"]["ledgers"]["casino"]["partial"] == 0
    assert workspace["source_summary"]["ledgers"]["cash_adjustments"]["mapped"] == 23
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["accounted_rows"] == 502
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["future_settling_open"] == 3
    assert (
        workspace["source_summary"]["ledgers"]["sportsbook"]["future_settling_open_current_pnl"]
        == "4.97"
    )
    assert workspace["financial_reconciliation"]["week"]["difference"] == "0.00"
    assert workspace["financial_reconciliation"]["month"]["difference"] == "0.00"
    assert workspace["financial_reconciliation"]["year"]["difference"] == "0.00"
    assert (
        workspace["financial_reconciliation"]["year"]["financial_views"][
            "open_current_worst_case_pnl"
        ]["total"]
        == "39.07"
    )
    assert workspace["metadata"]["raw_workbook_retained"] is False
    assert hashlib.sha256(workbook.read_bytes()).hexdigest() == before

    reloaded = client.get(f"/profiles/profile-import-test/workbook-imports/{import_run_id}")
    assert reloaded.status_code == 200
    assert reloaded.json()["items"] == []

    repeated = client.post(
        "/profiles/profile-import-test/workbook-imports/analyse",
        json={
            "source_filename": workbook.name,
            "workbook_base64": base64.b64encode(content).decode("ascii"),
            "effective_at": "2026-08-29T16:05:00+01:00",
        },
    )
    assert repeated.status_code == 200, repeated.text
    assert repeated.json()["metadata"]["import_run_id"] == import_run_id
    repeated_workspace = client.get(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
    ).json()
    assert repeated_workspace["reconciliation"]["resolved_partial_count"] == 0
    assert repeated_workspace["reconciliation"]["remaining_partial_count"] == 0

    rerun = client.post(f"/profiles/profile-import-test/workbook-imports/{import_run_id}/rerun")
    assert rerun.status_code == 200
    rerun_workspace = client.get(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
    ).json()
    assert rerun_workspace["run_status"] == "DRY_RUN_READY"
    assert rerun_workspace["reconciliation"]["remaining_partial_count"] == 0
    assert rerun_workspace["financial_reconciliation"]["year"]["difference"] == "0.00"
    assert {event["kind"] for event in rerun_workspace["source_summary"]["job"]["events"]} >= {
        "analysis_started",
        "analysis_complete",
    }

    absence_strategy = client.put(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}/account-absence-strategy",
        json={"strategy": "archive"},
    )
    assert absence_strategy.status_code == 200
    assert (
        absence_strategy.json()["source_summary"]["accounts"]["change_reconciliation"][
            "default_absent_strategy"
        ]
        == "archive"
    )

    deleted = client.delete(f"/profiles/profile-import-test/workbook-imports/{import_run_id}")
    assert deleted.status_code == 204
    assert (
        client.get(f"/profiles/profile-import-test/workbook-imports/{import_run_id}").status_code
        == 404
    )


def test_profile_workbook_upload_rejects_non_xlsx_and_oversize(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    monkeypatch.setattr(
        "openforge_api.profile_workbook_imports.require_request_session",
        lambda _request: SimpleNamespace(email="founder@example.invalid"),
    )
    client = TestClient(app)

    invalid = client.post(
        "/profiles/profile-import-test/workbook-imports/analyse",
        json={
            "source_filename": "not-a-workbook.xlsx",
            "workbook_base64": base64.b64encode(b"not xlsx").decode("ascii"),
            "effective_at": "2026-08-29T16:05:00+01:00",
        },
    )
    assert invalid.status_code == 422
    assert "valid .xlsx" in invalid.json()["detail"]

    oversized = client.post(
        "/profiles/profile-import-test/workbook-imports/analyse",
        json={
            "source_filename": "large.xlsx",
            "workbook_base64": base64.b64encode(b"PK" + b"0" * (3 * 1024 * 1024)).decode("ascii"),
            "effective_at": "2026-08-29T16:05:00+01:00",
        },
    )
    assert oversized.status_code == 413
