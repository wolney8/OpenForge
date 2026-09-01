from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.main import app
from openforge_api.profile_workbook_imports import _save_preflight_result, _workspace


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
    repaired_workspace = _workspace("profile-import-test", import_run_id)
    assert repaired_workspace["run_status"] == "READY_APPROVED"
    assert repaired_workspace["rollback_status"] == "COMPLETE"
    assert repaired_workspace["rolled_back_at"] == approved_at
    assert repaired_workspace["persistence_preflight"]["status"] == "PASSED"
    assert repaired_workspace["import_result"] == previous_result
    with connect() as connection:
        repaired_status = connection.execute(
            "SELECT status FROM profile_import_runs WHERE import_run_id = ?", (import_run_id,)
        ).fetchone()
    assert repaired_status is not None
    assert repaired_status["status"] == "READY_APPROVED"


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
        "Workbook review required",
    }
    assert all(
        item["href"] == f"/profiles/profile-import-test/imports/{import_run_id}/review"
        for item in import_notifications
    )
    assert workspace["metadata"]["mapping_version"] == "founder-snapshot-v5"
    assert workspace["metadata"]["original_partial_count"] == 1
    assert workspace["metadata"]["provider_conflict_count"] == 1
    assert workspace["metadata"]["historical_ep_count"] == 2
    assert len(workspace["items"]) == 4
    assert workspace["reconciliation"]["pnl_impact"] == "0.00"
    assert workspace["source_summary"]["accounts"]["row_count"] == 120
    assert workspace["source_summary"]["accounts"]["balances"] == {
        "Bookmaker": "666.12",
        "Exchange": "1836.31",
        "Bank": "302.97",
    }
    assert workspace["source_summary"]["accounts"]["pending_withdrawals"] == "50.00"
    account_changes = workspace["source_summary"]["accounts"]["change_reconciliation"]
    assert account_changes["counts"]["new_profile_accounts"] == 119
    assert account_changes["counts"]["balances_to_update"] == 103
    assert account_changes["counts"]["balance_writes_for_new_accounts"] == 103
    assert account_changes["counts"]["balance_updates_for_existing_accounts"] == 0
    assert account_changes["counts"]["workbook_accounts_accounted"] == 120
    assert account_changes["counts"]["resolved_workbook_accounts"] == 119
    assert account_changes["counts"]["workbook_accounts_not_found_globally"] == 1
    assert account_changes["default_absent_strategy"] == "leave_unchanged"
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["source_rows"] == 502
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["mapped"] == 497
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["partial"] == 0
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["non_transactional"] == 5
    assert len(workspace["source_summary"]["ledgers"]["sportsbook"]["non_transactional_rows"]) == 5
    assert workspace["source_summary"]["ledgers"]["free_bets"]["partial"] == 1
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
    assert len(reloaded.json()["items"]) == 4

    override_missing_reason = next(
        item for item in workspace["items"] if "override_missing_reason" in item["issue_types"]
    )
    decision = client.put(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
        f"/decisions/{override_missing_reason['item_id']}",
        json={
            "item_id": override_missing_reason["item_id"],
            "source_fingerprint": override_missing_reason["source_fingerprint"],
            "action": "remove_override",
            "target_type": override_missing_reason["proposed_target"],
        },
    )
    assert decision.status_code == 200, decision.text
    assert decision.json()["reconciliation"]["resolved_partial_count"] == 1

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
    assert repeated_workspace["reconciliation"]["resolved_partial_count"] == 1

    rerun = client.post(f"/profiles/profile-import-test/workbook-imports/{import_run_id}/rerun")
    assert rerun.status_code == 200
    rerun_workspace = client.get(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
    ).json()
    assert rerun_workspace["run_status"] == "REVIEW_REQUIRED"
    assert rerun_workspace["reconciliation"]["remaining_partial_count"] == 0
    assert rerun_workspace["financial_reconciliation"]["year"]["difference"] == "0.00"
    assert {event["kind"] for event in rerun_workspace["source_summary"]["job"]["events"]} >= {
        "analysis_started",
        "analysis_complete",
        "review_required",
    }

    reset = client.post(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}/decisions/reset",
        json={"item_ids": [override_missing_reason["item_id"]], "confirmed": True},
    )
    assert reset.status_code == 200, reset.text
    assert reset.json()["reconciliation"]["resolved_partial_count"] == 0
    assert reset.json()["reconciliation"]["pnl_impact"] == "0.00"
    assert reset.json()["source_summary"]["review_reset_events"][-1]["decision_count"] == 1

    restore = client.put(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
        f"/decisions/{override_missing_reason['item_id']}",
        json={
            "item_id": override_missing_reason["item_id"],
            "source_fingerprint": override_missing_reason["source_fingerprint"],
            "action": "remove_override",
            "target_type": override_missing_reason["proposed_target"],
        },
    )
    assert restore.status_code == 200
    reset_all = client.post(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}/decisions/reset",
        json={"confirmed": True},
    )
    assert reset_all.status_code == 200
    assert reset_all.json()["reconciliation"]["valid_decision_count"] == 0

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
