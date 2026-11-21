"""Explicit, additive SQLite migration for independent Sportsbook placement evidence.

This module is not called during API startup. The caller must stop the normal
API, verify runtime identity, and invoke the reviewed migration explicitly.
"""

from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path
from uuid import uuid4

from openforge_api.config import settings
from openforge_api.runtime_safety import validate_runtime_contract

ADDITIONS = (
    ("back_placement_confirmed", "INTEGER CHECK (back_placement_confirmed = 1)"),
    ("requested_lay_stake", "TEXT"),
)


def _path(expected_identity: str, expected_revision: str) -> Path:
    identity = validate_runtime_contract(settings)
    if identity.database_engine != "sqlite" or identity.database_classification not in {
        "normal-owner",
        "isolated",
    }:
        raise RuntimeError("Placement migration requires an identified SQLite runtime")
    if (
        identity.database_identity != expected_identity
        or identity.source_revision != expected_revision
    ):
        raise RuntimeError("Runtime identity or source revision differs from approval")
    raw = settings.database_path
    if raw.is_symlink():
        raise RuntimeError("Database path cannot be a symlink")
    path = raw.resolve()
    if not path.is_file():
        raise RuntimeError("Expected an existing SQLite database")
    return path


def _integrity(connection: sqlite3.Connection) -> None:
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise RuntimeError("SQLite integrity check failed")
    if connection.execute("PRAGMA foreign_key_check").fetchone() is not None:
        raise RuntimeError("SQLite foreign key check failed")


def _state(connection: sqlite3.Connection) -> str:
    columns = {row[1]: row[2] for row in connection.execute("PRAGMA table_info(sportsbook_bets)")}
    if (
        not columns
        or not {"profile_id", "sportsbook_bet_id", "lay_matched_stake_1"} <= columns.keys()
    ):
        raise RuntimeError("Sportsbook source schema is missing or incompatible")
    present = [name for name, _ in ADDITIONS if name in columns]
    if present and len(present) != len(ADDITIONS):
        raise RuntimeError("Partial placement migration requires manual recovery")
    if present and (
        columns["back_placement_confirmed"] != "INTEGER" or columns["requested_lay_stake"] != "TEXT"
    ):
        raise RuntimeError("Placement evidence columns differ from the approved schema")
    return "installed" if present else "pending"


def inspect(expected_identity: str, expected_revision: str) -> str:
    path = _path(expected_identity, expected_revision)
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        _integrity(connection)
        return _state(connection)


def _digest_existing_rows(connection: sqlite3.Connection) -> tuple[int, str]:
    columns = [
        row[1]
        for row in connection.execute("PRAGMA table_info(sportsbook_bets)")
        if row[1] not in {name for name, _ in ADDITIONS}
    ]
    digest = hashlib.sha256()
    count = 0
    for row in connection.execute(
        f"SELECT {', '.join(columns)} FROM sportsbook_bets ORDER BY profile_id, sportsbook_bet_id"
    ):
        digest.update(repr(tuple(row)).encode("utf-8"))
        count += 1
    return count, digest.hexdigest()


def _backup(path: Path) -> tuple[Path, str]:
    directory = settings.backup_path.resolve() / "sportsbook-placement-activation"
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory.chmod(0o700)
    destination = directory / f"sportsbook-placement-pre-migration-{uuid4().hex}.sqlite3"
    with (
        sqlite3.connect(f"file:{path}?mode=ro", uri=True) as source,
        sqlite3.connect(destination) as target,
    ):
        source.backup(target)
        _integrity(target)
    destination.chmod(0o600)
    return destination, hashlib.sha256(destination.read_bytes()).hexdigest()


def apply(expected_identity: str, expected_revision: str) -> tuple[Path, str]:
    path = _path(expected_identity, expected_revision)
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as connection:
        _integrity(connection)
        if _state(connection) != "pending":
            raise RuntimeError("Placement migration is already installed")
        before = _digest_existing_rows(connection)
    backup, checksum = _backup(path)
    with sqlite3.connect(path, timeout=10) as connection:
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            connection.execute("BEGIN IMMEDIATE")
            if _state(connection) != "pending" or _digest_existing_rows(connection) != before:
                raise RuntimeError("Sportsbook source changed after backup")
            for name, definition in ADDITIONS:
                connection.execute(f"ALTER TABLE sportsbook_bets ADD COLUMN {name} {definition}")
            if _state(connection) != "installed" or _digest_existing_rows(connection) != before:
                raise RuntimeError("Sportsbook values changed during migration")
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        _integrity(connection)
    return backup, checksum
