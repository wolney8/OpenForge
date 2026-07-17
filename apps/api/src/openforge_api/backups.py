from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from openforge_api.config import settings
from openforge_api.db import BackupSnapshotRecord, connect, create_backup_snapshot_record, utc_now

SCHEMA_VERSION = "sqlite-v1"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_sqlite_integrity(path: Path) -> str:
    connection = sqlite3.connect(path)
    try:
        row = connection.execute("PRAGMA integrity_check").fetchone()
    finally:
        connection.close()
    result = "" if row is None else str(row[0])
    if result.casefold() != "ok":
        raise RuntimeError(f"Backup integrity check failed: {result or 'no result'}")
    return result


def create_verified_local_backup(
    *, reason: str, backup_scope: str = "full"
) -> BackupSnapshotRecord:
    backup_directory = settings.backup_path.resolve()
    backup_directory.mkdir(parents=True, exist_ok=True)
    created_at = utc_now()
    file_stamp = created_at.replace(":", "").replace("-", "").replace("T", "-").replace("Z", "")
    backup_key = uuid4().hex[:8].upper()
    backup_path = backup_directory / f"plum-duff-{file_stamp}-{backup_key}.sqlite3"
    manifest_path = backup_path.with_suffix(".manifest.json")

    destination = sqlite3.connect(backup_path)
    try:
        with connect() as source:
            # Database initialisation may seed rows on first open. The Online Backup API
            # must start outside that write transaction or SQLite will wait indefinitely.
            source.commit()
            source.backup(destination)
        destination.commit()
    finally:
        destination.close()

    integrity_result = verify_sqlite_integrity(backup_path)
    checksum = sha256_file(backup_path)
    byte_size = backup_path.stat().st_size
    manifest = {
        "backup_scope": backup_scope,
        "byte_size": byte_size,
        "checksum_sha256": checksum,
        "created_at": created_at,
        "integrity_check": integrity_result,
        "reason": reason,
        "schema_version": SCHEMA_VERSION,
        "storage_path": str(backup_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

    if sha256_file(backup_path) != checksum:
        raise RuntimeError("Backup checksum verification failed after manifest creation")

    return create_backup_snapshot_record(
        {
            "created_at": created_at,
            "backup_scope": backup_scope,
            "schema_version": SCHEMA_VERSION,
            "storage_path": str(backup_path),
            "status": "verified",
            "notes": reason,
            "checksum_sha256": checksum,
            "byte_size": byte_size,
            "integrity_check": integrity_result,
        }
    )
