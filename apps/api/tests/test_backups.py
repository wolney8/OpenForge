from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from openforge_api.backups import create_verified_local_backup, sha256_file
from openforge_api.config import settings
from openforge_api.db import connect, list_backup_snapshot_records


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
    assert manifest["reason"] == "Pre-import synthetic verification"

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
