"""Explicit, offline SQLite activation for viewer-owned Today annotations.

This module is never called during ordinary API startup. The CLI requires an
exact runtime identity and source revision; only an explicit --apply writes.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sqlite3
from pathlib import Path
from uuid import uuid4

from openforge_api.config import settings
from openforge_api.runtime_safety import validate_runtime_contract
from openforge_api.task_annotations import SCHEMA

EXPECTED_COLUMNS = (
    "viewer_email",
    "profile_id",
    "occurrence_key",
    "source_key",
    "title_snapshot",
    "tracked",
    "work_state",
    "blocked_reason",
    "review_date",
    "version",
    "updated_at",
)
REVIEW_COLUMNS = ("next_action", "notes", "reviewed_at")


def _integrity(connection: sqlite3.Connection) -> None:
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise RuntimeError("SQLite integrity check failed")
    if connection.execute("PRAGMA foreign_key_check").fetchone() is not None:
        raise RuntimeError("SQLite foreign key check failed")


def _check_source(path: Path) -> None:
    if not path.is_file() or path.is_symlink():
        raise RuntimeError("Expected an existing regular SQLite database")
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        _integrity(connection)
        if (
            connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='profiles'"
            ).fetchone()
            is None
        ):
            raise RuntimeError("Expected the Plum Duff profiles schema")


def _schema_state(connection: sqlite3.Connection) -> str:
    table = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='task_annotations'"
    ).fetchone()
    if table is None:
        return "absent"
    columns_info = tuple(connection.execute("PRAGMA table_info(task_annotations)"))
    columns = tuple(row[1] for row in columns_info)
    index = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type='index' "
        "AND name='idx_task_annotations_viewer_tracked'"
    ).fetchone()
    foreign_key = tuple(connection.execute("PRAGMA foreign_key_list(task_annotations)"))
    primary_key = tuple(row[1] for row in sorted(columns_info, key=lambda row: row[5]) if row[5])
    index_columns = tuple(
        row[2]
        for row in connection.execute("PRAGMA index_info(idx_task_annotations_viewer_tracked)")
    )
    if (
        columns not in {EXPECTED_COLUMNS, EXPECTED_COLUMNS + REVIEW_COLUMNS}
        or primary_key != ("viewer_email", "profile_id", "occurrence_key")
        or index is None
        or index_columns != ("viewer_email", "tracked", "updated_at")
        or not all(
            row[3]
            for row in columns_info
            if row[1] not in {"blocked_reason", "review_date", *REVIEW_COLUMNS}
        )
        or not any(
            row[2] == "profiles" and row[3] == "profile_id" and row[6] == "CASCADE"
            for row in foreign_key
        )
    ):
        raise RuntimeError("Existing task annotation schema differs from reviewed migration")
    return "installed-review" if columns == EXPECTED_COLUMNS + REVIEW_COLUMNS else "installed"


def _runtime_database(expected_identity: str, expected_revision: str) -> Path:
    identity = validate_runtime_contract(settings)
    if identity.database_engine != "sqlite":
        raise RuntimeError("Task annotation migration supports SQLite only")
    if (
        identity.database_identity != expected_identity
        or identity.source_revision != expected_revision
    ):
        raise RuntimeError("Runtime identity or source revision does not match approval")
    if identity.database_classification not in {"normal-owner", "isolated"}:
        raise RuntimeError("Unsupported runtime classification")
    if (
        identity.database_classification == "normal-owner"
        and settings.task_annotations_normal_enabled
    ):
        raise RuntimeError("Disable normal task routes before migration")
    raw_path = settings.database_path
    if raw_path.is_symlink():
        raise RuntimeError("Database path cannot be a symlink")
    path = raw_path.resolve()
    _check_source(path)
    return path


def inspect(expected_identity: str, expected_revision: str) -> str:
    path = _runtime_database(expected_identity, expected_revision)
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        return _schema_state(connection)


def _protected_backup(source_path: Path) -> Path:
    directory = settings.backup_path.resolve() / "task-annotation-activation"
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if directory.is_symlink():
        raise RuntimeError("Backup directory cannot be a symlink")
    os.chmod(directory, 0o700)
    backup_path = directory / f"task-annotations-pre-migration-{uuid4().hex}.sqlite3"
    descriptor = os.open(backup_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(descriptor)
    try:
        with sqlite3.connect(f"file:{source_path}?mode=ro", uri=True) as source:
            with sqlite3.connect(backup_path) as destination:
                source.backup(destination)
                _integrity(destination)
        os.chmod(backup_path, 0o600)
        if backup_path.stat().st_size == 0:
            raise RuntimeError("Backup is empty")
    except Exception:
        backup_path.unlink(missing_ok=True)
        raise
    return backup_path


def apply(expected_identity: str, expected_revision: str) -> tuple[Path, str]:
    path = _runtime_database(expected_identity, expected_revision)
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        if _schema_state(connection) != "absent":
            raise RuntimeError("Annotation schema already installed; no migration performed")
    backup = _protected_backup(path)
    with sqlite3.connect(path, timeout=10) as connection:
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            connection.execute("BEGIN IMMEDIATE")
            if _schema_state(connection) != "absent":
                raise RuntimeError("Annotation schema changed before migration")
            for statement in SCHEMA.split(";"):
                if statement.strip():
                    connection.execute(statement)
            if _schema_state(connection) != "installed":
                raise RuntimeError("Post-migration schema verification failed")
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        _integrity(connection)
    checksum = hashlib.sha256(backup.read_bytes()).hexdigest()
    return backup, checksum


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-identity", required=True)
    parser.add_argument("--expected-revision", required=True)
    parser.add_argument("--apply", action="store_true", help="Create protected backup and migrate")
    args = parser.parse_args()
    if args.apply:
        backup, checksum = apply(args.expected_identity, args.expected_revision)
        print(f"INSTALLED; protected backup: {backup}; SHA-256: {checksum}")
    else:
        print(f"Schema: {inspect(args.expected_identity, args.expected_revision)}; no changes")


if __name__ == "__main__":
    main()
