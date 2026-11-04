from __future__ import annotations

import sqlite3
from io import BytesIO
from zipfile import ZipFile

import pytest
from apps.api.tests.synthetic_setup import seed_committed_test_database

from openforge_api import task_annotation_migration as migration
from openforge_api.backups import create_verified_local_backup
from openforge_api.config import settings
from openforge_api.profile_portable_export import SHEET_SPECS, build_profile_portable_export

IDENTITY = "pytest-committed-synthetic-seed"
REVISION = "pytest-source"


def test_explicit_migration_backup_and_synthetic_restore():
    seed_committed_test_database()
    assert migration.inspect(IDENTITY, REVISION) == "absent"
    with pytest.raises(RuntimeError, match="identity or source"):
        migration.apply("wrong-identity", REVISION)

    database = settings.database_path
    with sqlite3.connect(database) as connection:
        before_profiles = connection.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
    backup, checksum = migration.apply(IDENTITY, REVISION)
    assert backup.is_file() and backup.stat().st_mode & 0o777 == 0o600
    assert len(checksum) == 64
    assert migration.inspect(IDENTITY, REVISION) == "installed"
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT COUNT(*) FROM profiles").fetchone()[0] == before_profiles
        connection.execute(
            "INSERT INTO task_annotations VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (
                "demo@example.invalid",
                "profile-demo-001",
                "synthetic-task",
                "source",
                "Synthetic task",
                1,
                "To Do",
                None,
                None,
                1,
                "2026-11-04T00:00:00Z",
            ),
        )
    full_backup = create_verified_local_backup(reason="Synthetic annotation portability check")
    with sqlite3.connect(full_backup.storage_path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM task_annotations").fetchone()[0] == 1
    assert all(spec.table != "task_annotations" for spec in SHEET_SPECS)
    portable = build_profile_portable_export("profile-demo-001")
    with ZipFile(BytesIO(portable.content)) as package:
        assert all(b"Synthetic task" not in package.read(name) for name in package.namelist())
    with pytest.raises(RuntimeError, match="already installed"):
        migration.apply(IDENTITY, REVISION)

    # Offline recovery uses the verified full SQLite snapshot. This test restores
    # generated synthetic storage only; the normal database is never referenced.
    with sqlite3.connect(backup) as source, sqlite3.connect(database) as target:
        source.backup(target)
    assert migration.inspect(IDENTITY, REVISION) == "absent"
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT COUNT(*) FROM profiles").fetchone()[0] == before_profiles


def test_failed_migration_rolls_back_schema_and_keeps_backup(monkeypatch):
    seed_committed_test_database()
    monkeypatch.setattr(migration, "SCHEMA", migration.SCHEMA + "INVALID SQL;")
    with pytest.raises(sqlite3.OperationalError):
        migration.apply(IDENTITY, REVISION)
    assert migration.inspect(IDENTITY, REVISION) == "absent"
    assert (
        len(
            list(
                (settings.backup_path / "task-annotation-activation").glob(
                    "task-annotations-pre-migration-*.sqlite3"
                )
            )
        )
        == 1
    )
