"""Explicit additive Account capability schema; never applied by ordinary startup."""

from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE account_capability_observations (
  observation_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  scope_kind TEXT NOT NULL CHECK(scope_kind IN ('general','offer')),
  scope_ref TEXT NOT NULL DEFAULT '',
  entry_kind TEXT NOT NULL CHECK(entry_kind IN (
    'observation','review_no_change','review_no_test','correction','retraction')),
  state TEXT NOT NULL,
  interpretation TEXT NOT NULL CHECK(interpretation IN (
    'confirmed','suspected','conflicting','unknown')),
  confidence TEXT NOT NULL CHECK(confidence IN ('verified','likely','unverified','stale')),
  evidence_type TEXT NOT NULL,
  evidence_note TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL DEFAULT '',
  observed_at TEXT,
  observed_precision TEXT NOT NULL CHECK(observed_precision IN (
    'exact','day','approximate','unknown')),
  effective_from TEXT,
  effective_precision TEXT NOT NULL CHECK(effective_precision IN (
    'exact','day','approximate','unknown')),
  next_review_action TEXT NOT NULL CHECK(next_review_action IN ('keep','set','clear')),
  next_review_on TEXT,
  correction_of TEXT,
  correction_reason TEXT NOT NULL DEFAULT '',
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK(schema_version=1),
  operation_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  revision INTEGER NOT NULL,
  actor TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  UNIQUE(profile_id, operation_id),
  UNIQUE(profile_id, account_id, revision),
  FOREIGN KEY(profile_id) REFERENCES profiles(profile_id),
  FOREIGN KEY(account_id) REFERENCES accounts(account_id),
  FOREIGN KEY(correction_of) REFERENCES account_capability_observations(observation_id)
);
CREATE INDEX idx_account_capability_timeline
  ON account_capability_observations(profile_id, account_id, revision);
"""


def inspect(connection: sqlite3.Connection) -> dict[str, object]:
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name='account_capability_observations'"
    ).fetchone()
    if row is None:
        return {"installed": False, "rows": 0}
    columns = {
        str(item[1])
        for item in connection.execute("PRAGMA table_info(account_capability_observations)")
    }
    required = {
        "observation_id",
        "profile_id",
        "account_id",
        "operation_id",
        "revision",
        "recorded_at",
        "correction_of",
    }
    if not required <= columns:
        raise RuntimeError(
            "Account capability schema exists but does not match the reviewed version"
        )
    count = connection.execute("SELECT COUNT(*) FROM account_capability_observations").fetchone()[0]
    return {"installed": True, "rows": count}


def apply_to_connection(connection: sqlite3.Connection) -> None:
    if inspect(connection)["installed"]:
        raise RuntimeError("Account capability schema is already installed")
    if not connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_audit'"
    ).fetchone():
        raise RuntimeError("Existing Account audit schema is required")
    connection.commit()
    try:
        connection.execute("BEGIN IMMEDIATE")
        for statement in SCHEMA.split(";"):
            if statement.strip():
                connection.execute(statement)
        if (
            not inspect(connection)["installed"]
            or connection.execute("PRAGMA foreign_key_check").fetchone()
        ):
            raise RuntimeError("Account capability migration verification failed")
        connection.commit()
    except Exception:
        connection.rollback()
        raise


def apply_to_disposable_database(path: Path) -> dict[str, object]:
    """Candidate-only helper. Normal migration requires a separate approved recovery runbook."""
    with sqlite3.connect(path) as connection:
        connection.execute("PRAGMA foreign_keys=ON")
        apply_to_connection(connection)
        return inspect(connection)
