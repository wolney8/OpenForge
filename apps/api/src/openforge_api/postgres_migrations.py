from __future__ import annotations

import hashlib
import sqlite3
from typing import Any

import psycopg

from openforge_api.postgres_schema import (
    build_postgres_schema_plan,
    normalize_default,
    quote_identifier,
    sqlite_type_to_postgres,
)

MIGRATION_ID = "20260829_001_runtime_baseline"

RUNTIME_EXTENSION_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS fund_manager_users (
      email TEXT PRIMARY KEY,
      google_subject TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'fund_manager',
      oauth_provider TEXT NOT NULL DEFAULT 'google',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS fund_manager_profile_links (
      email TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      PRIMARY KEY (email, profile_id),
      CONSTRAINT fk_fund_manager_profile_links_user
        FOREIGN KEY (email) REFERENCES fund_manager_users(email) ON DELETE CASCADE,
      CONSTRAINT fk_fund_manager_profile_links_profile
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS account_catalogue_documents (
      document_id TEXT PRIMARY KEY,
      schema_version TEXT NOT NULL,
      catalogue_name TEXT NOT NULL,
      document_json TEXT NOT NULL,
      source_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS fund_manager_security_preferences (
      email TEXT PRIMARY KEY,
      auto_logout_enabled INTEGER NOT NULL DEFAULT 0,
      timeout_minutes INTEGER NOT NULL DEFAULT 30,
      updated_at TEXT NOT NULL,
      CONSTRAINT fk_fund_manager_security_preferences_user
        FOREIGN KEY (email) REFERENCES fund_manager_users(email) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS fund_manager_sessions (
      session_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      last_activity_at BIGINT NOT NULL,
      absolute_expires_at BIGINT NOT NULL,
      revoked_at BIGINT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CONSTRAINT fk_fund_manager_sessions_user
        FOREIGN KEY (email) REFERENCES fund_manager_users(email) ON DELETE CASCADE
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_fund_manager_sessions_email
      ON fund_manager_sessions(email)
    """,
    """
    CREATE TABLE IF NOT EXISTS notification_user_state (
      email TEXT NOT NULL,
      notification_id TEXT NOT NULL,
      read_at TEXT,
      cleared_at TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (email, notification_id),
      CONSTRAINT fk_notification_user_state_user
        FOREIGN KEY (email) REFERENCES fund_manager_users(email) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS notification_preferences (
      email TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (email, notification_type),
      CONSTRAINT fk_notification_preferences_user
        FOREIGN KEY (email) REFERENCES fund_manager_users(email) ON DELETE CASCADE
    )
    """,
)


def _schema_blueprint() -> tuple[sqlite3.Connection, Any]:
    # Build from the application schema in an isolated in-memory database. Seed rows
    # never leave this process; only table metadata is used for migration planning.
    from openforge_api.db import initialize_database

    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    initialize_database(connection)
    return connection, build_postgres_schema_plan(connection)


def _column_definition(row: sqlite3.Row) -> str:
    parts = [
        quote_identifier(str(row["name"])),
        sqlite_type_to_postgres(str(row["type"] or "")),
    ]
    if row["notnull"]:
        parts.append("NOT NULL")
    default_value = normalize_default(row["dflt_value"])
    if default_value is not None:
        parts.extend(("DEFAULT", default_value))
    return " ".join(parts)


def _existing_columns(cursor: psycopg.Cursor[Any]) -> dict[str, set[str]]:
    cursor.execute(
        """
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        """
    )
    result: dict[str, set[str]] = {}
    for table_name, column_name in cursor.fetchall():
        result.setdefault(str(table_name), set()).add(str(column_name))
    return result


def _existing_constraints(cursor: psycopg.Cursor[Any]) -> set[str]:
    cursor.execute(
        """
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
        """
    )
    return {str(row[0]) for row in cursor.fetchall()}


def _constraint_name(statement: str) -> str:
    marker = 'ADD CONSTRAINT "'
    start = statement.index(marker) + len(marker)
    return statement[start : statement.index('"', start)]


def apply_postgres_migrations(connection_url: str) -> str:
    blueprint, plan = _schema_blueprint()
    try:
        checksum_source = "\n".join(
            (
                plan.schema_signature,
                *RUNTIME_EXTENSION_STATEMENTS,
                MIGRATION_ID,
            )
        )
        checksum = hashlib.sha256(checksum_source.encode("utf-8")).hexdigest()
        with psycopg.connect(connection_url, connect_timeout=10) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT pg_advisory_xact_lock(hashtext('plum_duff_schema_migrations'))"
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                      migration_id TEXT PRIMARY KEY,
                      schema_signature TEXT NOT NULL,
                      checksum TEXT NOT NULL,
                      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )

                for statement in plan.create_table_statements:
                    cursor.execute(statement)

                existing_columns = _existing_columns(cursor)
                for table_name in plan.table_names:
                    rows = blueprint.execute(
                        f"PRAGMA table_info({quote_identifier(table_name)})"
                    ).fetchall()
                    known = existing_columns.get(table_name, set())
                    for row in rows:
                        column_name = str(row["name"])
                        if column_name in known:
                            continue
                        cursor.execute(
                            f"ALTER TABLE {quote_identifier(table_name)} "
                            f"ADD COLUMN IF NOT EXISTS {_column_definition(row)}"
                        )

                existing_constraints = _existing_constraints(cursor)
                for statement in plan.foreign_key_statements:
                    constraint_name = _constraint_name(statement)
                    if constraint_name not in existing_constraints:
                        cursor.execute(statement)
                        existing_constraints.add(constraint_name)

                for statement in plan.unique_index_statements:
                    cursor.execute(statement)
                for statement in RUNTIME_EXTENSION_STATEMENTS:
                    cursor.execute(statement)

                cursor.execute(
                    """
                    INSERT INTO schema_migrations (
                      migration_id, schema_signature, checksum
                    ) VALUES (%s, %s, %s)
                    ON CONFLICT (migration_id) DO UPDATE SET
                      schema_signature = EXCLUDED.schema_signature,
                      checksum = EXCLUDED.checksum,
                      applied_at = NOW()
                    WHERE schema_migrations.schema_signature <> EXCLUDED.schema_signature
                       OR schema_migrations.checksum <> EXCLUDED.checksum
                    """,
                    (MIGRATION_ID, plan.schema_signature, checksum),
                )
        return plan.schema_signature
    finally:
        blueprint.close()
