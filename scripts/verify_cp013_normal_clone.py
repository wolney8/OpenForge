"""Migrate and verify a clone of the normal SQLite database without opening it for writes."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api/src"))

FINANCIAL_TABLES = (
    "accounts",
    "sportsbook_bets",
    "free_bets",
    "casino_offers",
    "cash_adjustments",
    "each_way_extra_places",
)
NEW_TABLES = {"financial_activity_history"}
ACCOUNT_ACCESS_COLUMNS = {
    "stake_access",
    "promo_access",
    "restriction_details_json",
    "access_evidence_note",
    "access_source",
    "access_observed_at",
}


def read_only(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(f"file:{path.resolve().as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def tables(connection: sqlite3.Connection) -> list[str]:
    return [
        str(row[0])
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name"
        )
    ]


def projection(connection: sqlite3.Connection, table: str, columns: list[str]) -> str:
    quoted = ",".join(f'"{column}"' for column in columns)
    rows = connection.execute(f'SELECT {quoted} FROM "{table}" ORDER BY rowid').fetchall()
    encoded = json.dumps([list(row) for row in rows], default=str, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def snapshot(path: Path, original_columns: dict[str, list[str]] | None = None) -> dict[str, Any]:
    with read_only(path) as connection:
        present = tables(connection)
        columns = original_columns or {
            table: [str(row[1]) for row in connection.execute(f'PRAGMA table_info("{table}")')]
            for table in present
        }
        digests = {
            table: projection(connection, table, columns[table])
            for table in columns
            if table in present
        }
        counts = {
            table: int(connection.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0])
            for table in FINANCIAL_TABLES
            if table in present
        }
        integrity = str(connection.execute("PRAGMA integrity_check").fetchone()[0])
    return {
        "tables": present,
        "columns": columns,
        "digests": digests,
        "financial_row_counts": counts,
        "integrity": integrity,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--clone", required=True, type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    clone = args.clone.resolve()
    if source == clone:
        raise SystemExit("Source and clone must be different files")
    expected_source = (ROOT.parent.parent / "data/private/db/openforge.sqlite3").resolve()
    if source != expected_source:
        raise SystemExit("Source must be the canonical normal database")
    clone.parent.mkdir(parents=True, exist_ok=True)
    rollback = clone.with_suffix(".pre-migration.sqlite3")
    shutil.copy2(source, clone)
    shutil.copy2(source, rollback)
    before = snapshot(rollback)

    from openforge_api.config import settings
    from openforge_api.db import connect

    revision = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{clone}"
    settings.runtime_role = "candidate"
    settings.runtime_database_identity = "cp013-normal-clone"
    settings.runtime_source_root = str(ROOT)
    settings.runtime_source_revision = revision
    settings.runtime_frontend_endpoint = "http://localhost:3913"
    settings.runtime_api_endpoint = "http://127.0.0.1:8913"
    settings.runtime_environment_source = "verify_cp013_normal_clone.py"
    settings.runtime_database_target_explicit = True
    for _ in range(2):
        with connect() as connection:
            assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"

    after = snapshot(clone, before["columns"])
    if before["digests"] != after["digests"]:
        raise SystemExit("Migration changed pre-existing row values")
    if before["financial_row_counts"] != after["financial_row_counts"]:
        raise SystemExit("Migration changed financial row counts")
    migrated = snapshot(clone)
    if not NEW_TABLES.issubset(set(migrated["tables"])):
        raise SystemExit("Expected CP-012 history storage is absent")
    if not ACCOUNT_ACCESS_COLUMNS.issubset(set(migrated["columns"]["accounts"])):
        raise SystemExit("Expected #109 Account access storage is absent")
    rolled_back = snapshot(rollback)
    if ACCOUNT_ACCESS_COLUMNS.intersection(set(rolled_back["columns"].get("accounts", []))):
        raise SystemExit("Rollback copy unexpectedly contains #109 Account access storage")
    if rolled_back["digests"] != before["digests"]:
        raise SystemExit("Rollback copy does not match its verified baseline")

    print(
        json.dumps(
            {
                "status": "PASS",
                "source_opened_read_only": True,
                "repeat_migration": "PASS",
                "old_row_projection": "UNCHANGED",
                "financial_row_counts": after["financial_row_counts"],
                "account_access_columns": "PRESENT",
                "integrity": migrated["integrity"],
                "rollback_copy": "PASS",
                "downgrade_guard": "covered by test_upgraded_sqlite_rejects_older_writer_without_schema_capability",
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
