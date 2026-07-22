from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.backups import (
    create_verified_local_backup,
    sha256_file,
    verify_backup_snapshot,
)
from openforge_api.config import settings
from openforge_api.db import connect, list_backup_snapshot_records
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_verified_backup_has_integrity_checksum_manifest_and_audit_record(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET display_name = ? WHERE profile_id = ?",
            ("Synthetic Backup Profile", "profile-demo-001"),
        )

    snapshot = create_verified_local_backup(reason="Pre-import synthetic verification")
    backup_path = Path(snapshot.storage_path)
    manifest_path = backup_path.with_suffix(".manifest.json")

    assert snapshot.status == "verified"
    assert snapshot.integrity_check == "ok"
    assert backup_path.exists()
    assert manifest_path.exists()
    assert snapshot.checksum_sha256 == sha256_file(backup_path)
    assert snapshot.byte_size == backup_path.stat().st_size

    manifest = json.loads(manifest_path.read_text())
    assert manifest["checksum_sha256"] == snapshot.checksum_sha256
    assert manifest["manifest_version"] == "1.0"
    assert manifest["reason"] == "Pre-import synthetic verification"
    assert manifest["source_instance_id"] == "local-fund-manager"

    restored = sqlite3.connect(backup_path)
    try:
        display_name = restored.execute(
            "SELECT display_name FROM profiles WHERE profile_id = ?",
            ("profile-demo-001",),
        ).fetchone()[0]
    finally:
        restored.close()
    assert display_name == "Synthetic Backup Profile"

    records = list_backup_snapshot_records()
    assert records[0].backup_snapshot_id == snapshot.backup_snapshot_id


def test_backup_verification_rejects_checksum_mismatch(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    snapshot = create_verified_local_backup(reason="Synthetic checksum verification")
    Path(snapshot.storage_path).write_bytes(b"not a sqlite database")

    try:
        verify_backup_snapshot(snapshot)
    except RuntimeError as error:
        assert str(error) == "Backup checksum verification failed"
    else:
        raise AssertionError("Expected checksum mismatch to block backup verification")


def test_backup_verification_accepts_legacy_manifest_after_core_checks(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    snapshot = create_verified_local_backup(reason="Synthetic legacy verification")
    manifest_path = Path(snapshot.storage_path).with_suffix(".manifest.json")
    manifest = json.loads(manifest_path.read_text())
    manifest.pop("manifest_version")
    manifest.pop("source_instance_id")
    manifest_path.write_text(json.dumps(manifest))

    verification = verify_backup_snapshot(snapshot)

    assert verification.status == "verified"
    assert verification.checksum_valid is True
    assert verification.manifest_valid is True


def test_fund_manager_can_create_list_and_reverify_local_backup(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    create_response = client.post(
        "/fund-manager/backups", json={"reason": "Manual synthetic checkpoint"}
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["notes"] == "Manual synthetic checkpoint"
    assert created["status"] == "verified"
    assert created["cloud_state"] == "not_configured"
    assert created["storage_name"].endswith(".sqlite3")
    assert "storage_path" not in created

    list_response = client.get("/fund-manager/backups")
    assert list_response.status_code == 200
    assert list_response.json()[0]["backup_snapshot_id"] == created["backup_snapshot_id"]

    verify_response = client.post(f"/fund-manager/backups/{created['backup_snapshot_id']}/verify")
    assert verify_response.status_code == 200
    assert verify_response.json() == {
        "backup_snapshot_id": created["backup_snapshot_id"],
        "status": "verified",
        "checksum_valid": True,
        "integrity_check": "ok",
        "manifest_valid": True,
    }


def test_backup_delete_keeps_latest_three_verified_backups(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    for index in range(4):
        response = client.post(
            "/fund-manager/backups",
            json={"reason": f"Synthetic retention point {index}"},
        )
        assert response.status_code == 201

    records = list_backup_snapshot_records()
    protected = records[0]
    removable = records[-1]
    protected_response = client.delete(f"/fund-manager/backups/{protected.backup_snapshot_id}")
    assert protected_response.status_code == 409
    assert "latest three verified backups" in protected_response.json()["detail"]

    removable_path = Path(removable.storage_path)
    removable_manifest_path = removable_path.with_suffix(".manifest.json")
    delete_response = client.delete(f"/fund-manager/backups/{removable.backup_snapshot_id}")

    assert delete_response.status_code == 204
    assert not removable_path.exists()
    assert not removable_manifest_path.exists()
    assert removable.backup_snapshot_id not in {
        record.backup_snapshot_id for record in list_backup_snapshot_records()
    }


def test_fund_manager_notification_prompts_first_verified_backup(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/fund-manager/notifications")

    assert response.status_code == 200
    backup_notice = next(
        notification
        for notification in response.json()
        if notification["notification_type"] == "database_backup_reminder"
    )
    assert backup_notice["kind"] == "information"
    assert backup_notice["title"] == "Create a verified backup"
    assert backup_notice["href"] == "/settings?open=database-backups"


def test_failed_api_reverification_is_persisted_in_backup_history(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_response = client.post(
        "/fund-manager/backups", json={"reason": "Synthetic failure audit"}
    )
    created = create_response.json()
    record = list_backup_snapshot_records()[0]
    Path(record.storage_path).write_bytes(b"damaged synthetic backup")

    verify_response = client.post(f"/fund-manager/backups/{created['backup_snapshot_id']}/verify")

    assert verify_response.status_code == 409
    assert verify_response.json()["detail"] == "Backup checksum verification failed"
    list_response = client.get("/fund-manager/backups")
    assert list_response.json()[0]["status"] == "verification_failed"


def test_backup_reason_rejects_whitespace_only_input(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.post("/fund-manager/backups", json={"reason": "   "})

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, Backup reason is required"


def export_synthetic_package(
    client: TestClient, reason: str = "Portable synthetic checkpoint"
) -> bytes:
    create_response = client.post("/fund-manager/backups", json={"reason": reason})
    assert create_response.status_code == 201
    snapshot_id = create_response.json()["backup_snapshot_id"]

    export_response = client.get(f"/fund-manager/backups/{snapshot_id}/export")
    assert export_response.status_code == 200
    assert export_response.headers["content-type"] == "application/vnd.plumduff.backup+zip"
    assert ".plumduff-backup" in export_response.headers["content-disposition"]
    return export_response.content


def preview_synthetic_package(
    client: TestClient, package: bytes, filename: str = "synthetic.plumduff-backup"
) -> dict[str, object]:
    response = client.post(
        "/fund-manager/backups/import/preview",
        content=package,
        headers={
            "Content-Type": "application/vnd.plumduff.backup+zip",
            "X-Plum-Duff-Filename": filename,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_verified_backup_exports_and_previews_as_portable_package(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    package = export_synthetic_package(client)
    preview = preview_synthetic_package(client, package)

    assert preview["source_filename"] == "synthetic.plumduff-backup"
    assert preview["source_instance_id"] == "local-fund-manager"
    assert preview["schema_version"] == "sqlite-v1"
    assert preview["profile_count"] == 2
    assert preview["table_count"] > 0
    assert preview["total_row_count"] > 0
    assert preview["financial_control_count"] > 0
    assert preview["checksum_valid"] is True
    assert preview["integrity_check"] == "ok"
    assert preview["foreign_key_check"] == "ok"
    assert preview["ready_to_restore"] is True

    cancel_response = client.delete(f"/fund-manager/backups/import/{preview['import_token']}")
    assert cancel_response.status_code == 204


def test_restore_requires_exact_confirmation_and_does_not_change_live_data(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    package = export_synthetic_package(client)
    preview = preview_synthetic_package(client, package)

    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET display_name = ? WHERE profile_id = ?",
            ("Keep This Live Value", "profile-demo-001"),
        )

    response = client.post(
        f"/fund-manager/backups/import/{preview['import_token']}/restore",
        json={"confirmation": "RESTORE", "reason": "Synthetic rejected restore"},
    )

    assert response.status_code == 400
    with connect() as connection:
        display_name = connection.execute(
            "SELECT display_name FROM profiles WHERE profile_id = ?",
            ("profile-demo-001",),
        ).fetchone()[0]
    assert display_name == "Keep This Live Value"


def test_full_database_restore_creates_safety_backup_and_audit_event(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    with connect() as connection:
        original_name = connection.execute(
            "SELECT display_name FROM profiles WHERE profile_id = ?",
            ("profile-demo-001",),
        ).fetchone()[0]

    package = export_synthetic_package(client, "Known recovery point")
    preview = preview_synthetic_package(client, package, "known-recovery.plumduff-backup")
    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET display_name = ? WHERE profile_id = ?",
            ("Value To Replace", "profile-demo-001"),
        )

    response = client.post(
        f"/fund-manager/backups/import/{preview['import_token']}/restore",
        json={
            "confirmation": "RESTORE PLUM DUFF DATABASE",
            "reason": "Recover synthetic local database",
        },
    )

    assert response.status_code == 200, response.text
    restored = response.json()
    assert restored["status"] == "restored"
    assert restored["reload_required"] is True
    assert restored["pre_restore_backup_snapshot_id"].startswith("BACKUP-")
    assert restored["imported_backup_snapshot_id"].startswith("BACKUP-")
    with connect() as connection:
        display_name = connection.execute(
            "SELECT display_name FROM profiles WHERE profile_id = ?",
            ("profile-demo-001",),
        ).fetchone()[0]
        audit = connection.execute(
            "SELECT * FROM database_restore_events WHERE restore_event_id = ?",
            (restored["restore_event_id"],),
        ).fetchone()
    assert display_name == original_name
    assert audit is not None
    assert audit["source_filename"] == "known-recovery.plumduff-backup"
    assert audit["reason"] == "Recover synthetic local database"

    records = list_backup_snapshot_records()
    record_ids = {record.backup_snapshot_id for record in records}
    assert restored["pre_restore_backup_snapshot_id"] in record_ids
    assert restored["imported_backup_snapshot_id"] in record_ids
    for record in records:
        if record.backup_snapshot_id in {
            restored["pre_restore_backup_snapshot_id"],
            restored["imported_backup_snapshot_id"],
        }:
            assert Path(record.storage_path).is_file()
            assert Path(record.storage_path).with_suffix(".manifest.json").is_file()


def test_import_preview_rejects_raw_database_and_tampered_package(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    raw_response = client.post(
        "/fund-manager/backups/import/preview",
        content=b"SQLite format 3",
        headers={"X-Plum-Duff-Filename": "raw.sqlite3"},
    )
    assert raw_response.status_code == 400
    assert raw_response.json()["detail"] == "Select a .plumduff-backup package"

    package = bytearray(export_synthetic_package(client))
    package[-8:] = b"tampered"
    tampered_response = client.post(
        "/fund-manager/backups/import/preview",
        content=bytes(package),
        headers={"X-Plum-Duff-Filename": "tampered.plumduff-backup"},
    )
    assert tampered_response.status_code == 409
