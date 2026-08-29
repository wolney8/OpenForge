from __future__ import annotations

import base64
import hashlib
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.main import app


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
    workspace = response.json()
    assert workspace["metadata"]["workbook_checksum"] == before
    assert workspace["metadata"]["original_partial_count"] == 114
    assert workspace["metadata"]["provider_conflict_count"] == 1
    assert workspace["metadata"]["historical_ep_count"] == 2
    assert len(workspace["items"]) == 117
    assert workspace["source_summary"]["accounts"]["row_count"] == 120
    assert workspace["source_summary"]["accounts"]["balances"] == {
        "Bookmaker": "666.12",
        "Exchange": "1836.31",
        "Bank": "302.97",
    }
    assert workspace["source_summary"]["accounts"]["pending_withdrawals"] == "50.00"
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["source_rows"] == 502
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["mapped"] == 413
    assert workspace["source_summary"]["ledgers"]["sportsbook"]["partial"] == 89
    assert workspace["source_summary"]["ledgers"]["free_bets"]["partial"] == 13
    assert workspace["source_summary"]["ledgers"]["casino"]["partial"] == 12
    assert workspace["source_summary"]["ledgers"]["cash_adjustments"]["mapped"] == 23
    assert workspace["metadata"]["raw_workbook_retained"] is False
    assert hashlib.sha256(workbook.read_bytes()).hexdigest() == before

    import_run_id = workspace["metadata"]["import_run_id"]
    reloaded = client.get(f"/profiles/profile-import-test/workbook-imports/{import_run_id}")
    assert reloaded.status_code == 200
    assert len(reloaded.json()["items"]) == 117

    advanced_lay = next(
        item for item in workspace["items"] if "advanced_lay" in item["issue_types"]
    )
    decision = client.put(
        f"/profiles/profile-import-test/workbook-imports/{import_run_id}"
        f"/decisions/{advanced_lay['item_id']}",
        json={
            "item_id": advanced_lay["item_id"],
            "source_fingerprint": advanced_lay["source_fingerprint"],
            "action": "historical_imported_calculation",
            "target_type": advanced_lay["proposed_target"],
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
    assert repeated.json()["reconciliation"]["resolved_partial_count"] == 1

    rerun = client.post(f"/profiles/profile-import-test/workbook-imports/{import_run_id}/rerun")
    assert rerun.status_code == 200
    assert rerun.json()["run_status"] == "REVIEW_REQUIRED"
    assert rerun.json()["reconciliation"]["remaining_partial_count"] == 113


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
