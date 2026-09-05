from __future__ import annotations

import base64
import json
from collections.abc import Iterator
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from fastapi.testclient import TestClient
from test_profile_portable_export import configure_database, seed_representative_profile

from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.main import app
from openforge_api.profile_portable_export import build_profile_portable_export
from openforge_api.profile_portable_restore import (
    PortableRestoreAnalysisPayload,
    PortableRestoreError,
    analyse_portable_restore,
    apply_restore_review_decisions,
    execute_portable_restore,
    parse_profile_portable_export,
)


@pytest.fixture(autouse=True)
def restore_runtime_settings() -> Iterator[None]:
    original = {
        "database_mode": settings.database_mode,
        "database_url": settings.database_url,
        "account_catalogue_source": settings.account_catalogue_source,
        "auth_required": settings.auth_required,
    }
    yield
    for name, value in original.items():
        setattr(settings, name, value)


def seed_operational_tracker_settings() -> None:
    timestamp = "2026-09-04T09:30:00+00:00"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_tracker_settings (
              profile_id, active_date_preset, custom_start_date, custom_end_date,
              created_at, updated_at
            ) VALUES (?, 'This Year', '', '', ?, ?)
            """,
            ("profile-portable-test", timestamp, timestamp),
        )
        connection.execute(
            "UPDATE accounts SET channel = 'Online', signup_offer_status = 'Yes', "
            'restrictions_json = \'["Soft Limited","Bonus Restricted"]\' '
            "WHERE profile_id = 'profile-portable-test' AND account_id = 'ACCOUNT-A'"
        )
        connection.execute(
            "UPDATE accounts SET channel = 'Online' "
            "WHERE profile_id = 'profile-portable-test' AND account_id = 'ACCOUNT-Z'"
        )
        connection.execute(
            "UPDATE sportsbook_bets SET result = 'Win' WHERE profile_id = 'profile-portable-test'"
        )
        connection.execute(
            "UPDATE casino_offers SET result = 'Win' WHERE profile_id = 'profile-portable-test'"
        )
        connection.execute(
            "UPDATE cash_adjustments SET adjustment_type = 'Management Fee Withdrawal' "
            "WHERE profile_id = 'profile-portable-test'"
        )


def portable_payload(
    content: bytes, *, profile_code: str = "RESTORED-001"
) -> PortableRestoreAnalysisPayload:
    return PortableRestoreAnalysisPayload(
        source_filename="synthetic-portable-backup.xlsx",
        content_base64=base64.b64encode(content).decode("ascii"),
        target_display_name="Synthetic Profile",
        target_profile_code=profile_code,
    )


def tamper_profile_sheet(content: bytes) -> bytes:
    output = BytesIO()
    with ZipFile(BytesIO(content)) as source, ZipFile(output, "w", ZIP_DEFLATED) as target:
        for info in source.infolist():
            payload = source.read(info.filename)
            if info.filename == "xl/worksheets/sheet3.xml":
                payload = payload.replace(b"Synthetic Profile", b"Synthetic Prof1le", 1)
            target.writestr(info, payload)
    return output.getvalue()


def test_portable_restore_round_trip_remaps_ids_and_passes_both_gates(tmp_path: Path) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    source_export = build_profile_portable_export(
        "profile-portable-test", exported_at="2026-09-05T08:00:00Z"
    )

    analysis = analyse_portable_restore(
        payload=portable_payload(source_export.content),
        owner_email="fund-manager@example.invalid",
    )

    assert analysis["status"] == "READY"
    assert analysis["reviews"] == []
    completed = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="fund-manager@example.invalid",
        actor_email="fund-manager@example.invalid",
    )

    assert completed["status"] == "COMPLETE"
    assert completed["target_profile_id"] != "profile-portable-test"
    assert len(completed["attempts"]) == 1
    attempt = completed["attempts"][0]
    assert attempt["status"] == "COMPLETE"
    assert attempt["financial_reconciliation"]["status"] == "PASS"
    assert attempt["operational_reconciliation"]["status"] == "OPERATIONAL HEALTH: PASSED"
    assert attempt["parity"]["status"] == "PASS"
    assert (
        attempt["parity"]["raw_source_export_checksum"]
        != attempt["parity"]["raw_restored_export_checksum"]
    )

    with connect() as connection:
        source_account = connection.execute(
            "SELECT account_id FROM accounts WHERE profile_id = 'profile-portable-test' "
            "AND account_id = 'ACCOUNT-A'"
        ).fetchone()
        restored_account = connection.execute(
            "SELECT account_id, lifecycle_status, restrictions_json FROM accounts "
            "WHERE profile_id = ? AND account = 'Bookmaker A'",
            (completed["target_profile_id"],),
        ).fetchone()
        identity = connection.execute(
            "SELECT runtime_id FROM profile_portable_restore_identity_map "
            "WHERE restore_run_id = ? AND domain_name = 'account' AND portable_id = 'ACCOUNT-A'",
            (analysis["restore_run_id"],),
        ).fetchone()
        checkpoint = connection.execute(
            "SELECT pre_restore_state, status FROM profile_portable_restore_checkpoints "
            "WHERE execution_id = ?",
            (attempt["execution_id"],),
        ).fetchone()
        audit_count = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_portable_restore_write_audit "
                "WHERE execution_id = ? AND rolled_back_at = ''",
                (attempt["execution_id"],),
            ).fetchone()["count"]
        )
    assert source_account is not None
    assert restored_account is not None
    assert restored_account["account_id"] != "ACCOUNT-A"
    assert restored_account["lifecycle_status"] == "Active"
    assert json.loads(restored_account["restrictions_json"]) == [
        "Soft Limited",
        "Bonus Restricted",
    ]
    assert identity["runtime_id"] == restored_account["account_id"]
    assert dict(checkpoint) == {"pre_restore_state": "ABSENT", "status": "AVAILABLE"}
    assert audit_count > 0

    re_export = build_profile_portable_export(
        completed["target_profile_id"], exported_at="2026-09-05T09:00:00Z"
    )
    assert (
        parse_profile_portable_export(re_export.content).source_logical_checksum
        == re_export.logical_checksum
    )


def test_restore_rejects_checksum_tampering_before_creating_a_run(tmp_path: Path) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    exported = build_profile_portable_export("profile-portable-test")
    content = tamper_profile_sheet(exported.content)

    with pytest.raises(PortableRestoreError, match="checksum"):
        parse_profile_portable_export(content)

    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_portable_restore_runs"
            ).fetchone()["count"]
            == 0
        )


def test_missing_global_reference_becomes_review_and_blocks_execution(tmp_path: Path) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    exported = build_profile_portable_export("profile-portable-test")
    catalogue_path = Path(settings.account_catalogue_source)
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    catalogue["records"] = []
    catalogue_path.write_text(json.dumps(catalogue), encoding="utf-8")

    analysis = analyse_portable_restore(
        payload=portable_payload(exported.content, profile_code="RESTORED-REVIEW"),
        owner_email="fund-manager@example.invalid",
    )

    assert analysis["status"] == "REVIEW_REQUIRED"
    assert any(
        review["reason"] == "MISSING_GLOBAL_REFERENCE"
        and review["reference_id"] == "BOOKMAKER-SYNTHETIC-001"
        and review["allowed_resolutions"] == ["REMOVE_REFERENCE"]
        for review in analysis["reviews"]
    )
    with pytest.raises(PortableRestoreError, match="Resolve every global reference review"):
        execute_portable_restore(
            restore_run_id=analysis["restore_run_id"],
            owner_email="fund-manager@example.invalid",
            actor_email="fund-manager@example.invalid",
        )
    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) AS count FROM profiles WHERE profile_code = 'RESTORED-REVIEW'"
            ).fetchone()["count"]
            == 0
        )


def test_resolved_missing_reference_restores_without_overwriting_global_authority(
    tmp_path: Path,
) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    exported = build_profile_portable_export("profile-portable-test")
    catalogue_path = Path(settings.account_catalogue_source)
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    catalogue["records"] = []
    catalogue_path.write_text(json.dumps(catalogue), encoding="utf-8")
    analysis = analyse_portable_restore(
        payload=portable_payload(exported.content, profile_code="RESTORED-REVIEWED"),
        owner_email="fund-manager@example.invalid",
    )

    ready = apply_restore_review_decisions(
        restore_run_id=analysis["restore_run_id"],
        owner_email="fund-manager@example.invalid",
        actor_email="fund-manager@example.invalid",
        decisions=[
            {"item_id": review["item_id"], "resolution": "REMOVE_REFERENCE"}
            for review in analysis["reviews"]
        ],
    )
    completed = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="fund-manager@example.invalid",
        actor_email="fund-manager@example.invalid",
    )

    assert ready["status"] == "READY"
    assert completed["status"] == "COMPLETE"
    assert completed["attempts"][0]["parity"]["status"] == "PASS"
    with connect() as connection:
        restored_accounts = connection.execute(
            "SELECT catalogue_id FROM accounts WHERE profile_id = ? ORDER BY account_id",
            (completed["target_profile_id"],),
        ).fetchall()
        onboarding = connection.execute(
            "SELECT main_bank_catalogue_id FROM profile_onboarding_settings WHERE profile_id = ?",
            (completed["target_profile_id"],),
        ).fetchone()
    assert all(row["catalogue_id"] is None for row in restored_accounts)
    assert onboarding["main_bank_catalogue_id"] == ""
    assert json.loads(catalogue_path.read_text(encoding="utf-8"))["records"] == []


def test_failed_restore_rolls_back_and_retry_gets_fresh_attempt(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    exported = build_profile_portable_export("profile-portable-test")
    analysis = analyse_portable_restore(
        payload=portable_payload(exported.content, profile_code="RESTORED-RETRY"),
        owner_email="fund-manager@example.invalid",
    )
    restore_module = __import__(
        "openforge_api.profile_portable_restore",
        fromlist=["generate_post_import_operational_health"],
    )
    real_health = restore_module.generate_post_import_operational_health
    monkeypatch.setattr(
        "openforge_api.profile_portable_restore.generate_post_import_operational_health",
        lambda **_kwargs: {"status": "OPERATIONAL HEALTH: FAILED", "checks": {}},
    )

    with pytest.raises(PortableRestoreError, match="reconciliation failed"):
        execute_portable_restore(
            restore_run_id=analysis["restore_run_id"],
            owner_email="fund-manager@example.invalid",
            actor_email="fund-manager@example.invalid",
        )

    monkeypatch.setattr(
        "openforge_api.profile_portable_restore.generate_post_import_operational_health",
        real_health,
    )
    completed = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="fund-manager@example.invalid",
        actor_email="fund-manager@example.invalid",
    )

    assert completed["status"] == "COMPLETE"
    assert [attempt["attempt_number"] for attempt in completed["attempts"]] == [1, 2]
    assert [attempt["status"] for attempt in completed["attempts"]] == [
        "ROLLED_BACK",
        "COMPLETE",
    ]
    assert completed["attempts"][0]["checkpoint_id"] != completed["attempts"][1]["checkpoint_id"]
    with connect() as connection:
        checkpoints = connection.execute(
            "SELECT status FROM profile_portable_restore_checkpoints "
            "WHERE restore_run_id = ? ORDER BY created_at",
            (analysis["restore_run_id"],),
        ).fetchall()
        audit_rows = connection.execute(
            "SELECT execution_id, rolled_back_at FROM profile_portable_restore_write_audit "
            "WHERE restore_run_id = ?",
            (analysis["restore_run_id"],),
        ).fetchall()
    assert [row["status"] for row in checkpoints] == ["RESTORED", "AVAILABLE"]
    first_execution = completed["attempts"][0]["execution_id"]
    second_execution = completed["attempts"][1]["execution_id"]
    assert any(
        row["execution_id"] == first_execution and row["rolled_back_at"] for row in audit_rows
    )
    assert any(
        row["execution_id"] == second_execution and not row["rolled_back_at"] for row in audit_rows
    )
    assert not any(
        row["execution_id"] == first_execution and not row["rolled_back_at"] for row in audit_rows
    )


def test_restore_rejects_a_second_mutation_while_an_attempt_is_active(tmp_path: Path) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    exported = build_profile_portable_export("profile-portable-test")
    analysis = analyse_portable_restore(
        payload=portable_payload(exported.content, profile_code="RESTORED-ACTIVE"),
        owner_email="fund-manager@example.invalid",
    )
    execution_id = "portable-restore-execution-active"
    checkpoint_id = "portable-restore-checkpoint-active"
    with connect() as connection:
        connection.execute(
            "INSERT INTO profile_portable_restore_attempts "
            "(execution_id, restore_run_id, attempt_number, target_profile_id, actor_email, "
            "checkpoint_id, status, stage, rollback_status, started_at, updated_at) "
            "VALUES (?, ?, 1, 'profile-active-target', 'fund-manager@example.invalid', ?, "
            "'RUNNING', 'PREPARING', 'AVAILABLE', '2026-09-05T10:00:00Z', "
            "'2026-09-05T10:00:00Z')",
            (execution_id, analysis["restore_run_id"], checkpoint_id),
        )
        connection.execute(
            "UPDATE profile_portable_restore_runs SET status = 'RESTORING' "
            "WHERE restore_run_id = ?",
            (analysis["restore_run_id"],),
        )

    with pytest.raises(PortableRestoreError, match="already running"):
        execute_portable_restore(
            restore_run_id=analysis["restore_run_id"],
            owner_email="fund-manager@example.invalid",
            actor_email="fund-manager@example.invalid",
        )

    with connect() as connection:
        attempts = connection.execute(
            "SELECT COUNT(*) AS count FROM profile_portable_restore_attempts "
            "WHERE restore_run_id = ?",
            (analysis["restore_run_id"],),
        ).fetchone()
        target = connection.execute(
            "SELECT 1 FROM profiles WHERE profile_code = 'RESTORED-ACTIVE'"
        ).fetchone()
    assert attempts["count"] == 1
    assert target is None


def test_invalid_account_lifecycle_is_rejected_before_restore_run(tmp_path: Path) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET lifecycle_status = 'Bonus Restricted' "
            "WHERE profile_id = 'profile-portable-test' AND account_id = 'ACCOUNT-A'"
        )
    exported = build_profile_portable_export("profile-portable-test")

    with pytest.raises(PortableRestoreError, match="lifecycle_status"):
        analyse_portable_restore(
            payload=portable_payload(exported.content, profile_code="RESTORED-INVALID"),
            owner_email="fund-manager@example.invalid",
        )
    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_portable_restore_runs"
            ).fetchone()["count"]
            == 0
        )


def test_restore_routes_are_fund_manager_only(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    seed_operational_tracker_settings()
    content = build_profile_portable_export("profile-portable-test").content
    payload = portable_payload(content).model_dump()

    response = TestClient(app).post("/fund-manager/portable-restores/analyse", json=payload)
    assert response.status_code == 401

    monkeypatch.setattr(
        "openforge_api.profile_portable_restore.require_request_session",
        lambda _request: SimpleNamespace(role="subscriber", email="subscriber@example.invalid"),
    )
    forbidden = TestClient(app).post("/fund-manager/portable-restores/analyse", json=payload)
    assert forbidden.status_code == 403
    assert forbidden.json() == {"detail": "Fund Manager access is required"}
