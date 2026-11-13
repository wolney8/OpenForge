"""Explicit additive SQLite migration for personal opportunity review fields.

Never called during ordinary API startup. The caller must stop the API and
disable both normal annotation flags before the reviewed owner activation.
"""

from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path

from openforge_api.config import settings
from openforge_api.task_annotation_migration import (
    _integrity,
    _protected_backup,
    _runtime_database,
    _schema_state,
)
from openforge_api.task_annotations import REVIEW_ALTERATIONS


def inspect(expected_identity: str, expected_revision: str) -> str:
    path = _runtime_database(expected_identity, expected_revision)
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        return _schema_state(connection)


def apply(expected_identity: str, expected_revision: str) -> tuple[Path, str]:
    if settings.task_annotations_normal_enabled or settings.task_annotations_review_normal_enabled:
        raise RuntimeError("Disable normal annotation routes before migration")
    path = _runtime_database(expected_identity, expected_revision)
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        if _schema_state(connection) != "installed":
            raise RuntimeError("Expected the existing annotation schema without review columns")
        before = connection.execute("SELECT COUNT(*) FROM task_annotations").fetchone()[0]
    backup = _protected_backup(path)
    with sqlite3.connect(path, timeout=10) as connection:
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            connection.execute("BEGIN IMMEDIATE")
            if _schema_state(connection) != "installed":
                raise RuntimeError("Annotation schema changed before review migration")
            for statement in REVIEW_ALTERATIONS:
                connection.execute(statement)
            if _schema_state(connection) != "installed-review":
                raise RuntimeError("Review columns were not installed exactly")
            if connection.execute("SELECT COUNT(*) FROM task_annotations").fetchone()[0] != before:
                raise RuntimeError("Annotation row count changed")
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        _integrity(connection)
    return backup, hashlib.sha256(backup.read_bytes()).hexdigest()
