import hashlib
import importlib
import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from openforge_api.config import settings
from openforge_api.db import connect, list_backup_snapshot_records, postgres_runtime_enabled
from openforge_api.migration_control_totals import (
    MigrationControlTotalsResponse,
    build_migration_control_totals,
)
from openforge_api.postgres_schema import build_postgres_data_load_plan, build_postgres_schema_plan

router = APIRouter(prefix="/fund-manager/database", tags=["fund-manager-database"])


class DatabaseProviderStatusResponse(BaseModel):
    active_mode: str
    local_database_configured: bool
    local_backup_directory: str
    neon_configured: bool
    neon_status: str
    neon_safe_error_code: str | None = None
    neon_database_name: str | None = None
    neon_role_name: str | None = None
    neon_host_hint: str | None = None
    isolation_state: str
    operator_message: str
    writes_allowed: bool
    local_recovery_available: bool


class DatabaseTableRowCount(BaseModel):
    table_name: str
    row_count: int


class DatabaseMigrationReadinessResponse(BaseModel):
    source_mode: str
    target_provider: str
    migration_boundary: str
    schema_signature: str
    table_count: int
    total_row_count: int
    critical_tables_present: bool
    latest_verified_backup_id: str | None
    latest_verified_backup_created_at: str | None
    provider_status: DatabaseProviderStatusResponse
    ready_for_rehearsal: bool
    ready_for_cutover: bool
    blockers: list[str]
    warnings: list[str]
    table_row_counts: list[DatabaseTableRowCount]


class PostgresSchemaPlanResponse(BaseModel):
    migration_boundary: str
    schema_signature: str
    table_count: int
    statement_count: int
    create_table_statement_count: int
    foreign_key_statement_count: int
    unique_index_statement_count: int
    table_names: list[str]
    ddl_statements: list[str]


class PostgresDataLoadPlanResponse(BaseModel):
    migration_boundary: str
    schema_signature: str
    table_count: int
    total_row_count: int
    insert_order: list[str]
    verification_order: list[str]
    dependency_edges: list[tuple[str, str]]
    table_row_counts: list[DatabaseTableRowCount]


class DatabaseMigrationPackagePreviewResponse(BaseModel):
    migration_boundary: str
    package_fingerprint: str
    schema_signature: str
    table_count: int
    total_row_count: int
    latest_verified_backup_id: str | None
    latest_verified_backup_created_at: str | None
    control_current_value_grand_total: str
    control_final_value_grand_total: str
    control_signed_amount_grand_total: str
    control_missing_value_count: int
    insert_order: list[str]
    blockers: list[str]
    warnings: list[str]


class NeonSchemaStatusResponse(BaseModel):
    migration_boundary: str
    neon_status: str
    expected_table_count: int
    remote_table_count: int
    present_tables: list[str]
    missing_tables: list[str]
    extra_tables: list[str]
    schema_ready_for_data_load: bool
    blockers: list[str]
    warnings: list[str]


class NeonSchemaApplyPayload(BaseModel):
    confirm_phrase: str
    package_fingerprint: str
    actor_id: str = "fund-manager-local"


class NeonSchemaApplyResponse(BaseModel):
    migration_boundary: str
    applied: bool
    statements_applied: int
    package_fingerprint: str
    schema_signature: str
    backup_snapshot_id: str
    actor_id: str
    warnings: list[str]


class NeonDataLoadPayload(BaseModel):
    confirm_phrase: str
    package_fingerprint: str
    actor_id: str = "fund-manager-local"


class NeonDataLoadResponse(BaseModel):
    migration_boundary: str
    loaded: bool
    package_fingerprint: str
    backup_snapshot_id: str
    actor_id: str
    table_count: int
    rows_inserted: int
    row_counts_match: bool
    local_row_counts: list[DatabaseTableRowCount]
    remote_row_counts: list[DatabaseTableRowCount]
    warnings: list[str]


class NeonDataVerificationResponse(BaseModel):
    migration_boundary: str
    verified: bool
    package_fingerprint: str
    backup_snapshot_id: str
    table_count: int
    total_row_count: int
    row_counts_match: bool
    content_fingerprint_match: bool
    local_content_fingerprint: str
    remote_content_fingerprint: str
    mismatched_tables: list[str]
    local_row_counts: list[DatabaseTableRowCount]
    remote_row_counts: list[DatabaseTableRowCount]
    warnings: list[str]


class NeonCutoverReadinessResponse(BaseModel):
    migration_boundary: str
    staging_ready: bool
    runtime_cutover_ready: bool
    provider_status: DatabaseProviderStatusResponse
    schema_ready: bool
    data_verified: bool
    package_fingerprint: str | None
    backup_snapshot_id: str | None
    blockers: list[str]
    warnings: list[str]


@dataclass(frozen=True)
class ParsedPostgresUrl:
    database_name: str
    host_hint: str
    role_name: str


def parse_postgres_url(connection_url: str) -> ParsedPostgresUrl | None:
    parsed = urlparse(connection_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        return None
    database_name = parsed.path.lstrip("/")
    host = parsed.hostname or ""
    role_name = parsed.username or ""
    if not database_name or not host or not role_name:
        return None
    host_parts = host.split(".")
    host_hint = ".".join(host_parts[-3:]) if len(host_parts) >= 3 else host
    return ParsedPostgresUrl(
        database_name=database_name,
        host_hint=host_hint,
        role_name=role_name,
    )


def classify_database_error(error: Exception) -> str:
    message = str(error).lower()
    error_type = type(error).__name__.lower()
    combined = f"{error_type} {message}"
    if any(token in combined for token in ("auth", "password", "credential", "28p01")):
        return "database_authentication_failed"
    if any(token in combined for token in ("timeout", "timed out", "deadline")):
        return "database_timeout"
    if any(token in combined for token in ("ssl", "tls", "certificate")):
        return "database_tls_failed"
    if any(token in combined for token in ("permission", "read-only", "readonly", "42501")):
        return "database_permission_failed"
    if any(token in combined for token in ("does not exist", "not found", "3d000", "28000")):
        return "database_target_not_found"
    if any(token in combined for token in ("network", "name or service", "nodename", "dns")):
        return "database_network_failed"
    if any(token in combined for token in ("too many connections", "pool", "53300")):
        return "database_pool_exhausted"
    return "database_unavailable"


def is_neon_target_isolated(parsed_url: ParsedPostgresUrl | None) -> bool:
    if parsed_url is None:
        return False
    generic_database_names = {"neondb", "postgres"}
    database_key = parsed_url.database_name.replace("_", "-").lower()
    role_key = parsed_url.role_name.replace("_", "-").lower()
    # Neon commonly provisions the owning role as `neondb_owner`. A dedicated
    # application database is the isolation boundary required for this cutover;
    # a dedicated least-privilege role remains recommended hardening.
    if database_key in generic_database_names:
        return False
    if "ai-diary" in database_key or "aidiary" in database_key:
        return False
    if "ai-diary" in role_key or "aidiary" in role_key:
        return False
    return True


def default_neon_connector(connection_url: str) -> tuple[str, str]:
    psycopg: Any = importlib.import_module("psycopg")
    with psycopg.connect(connection_url, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            cursor.execute("select current_database(), current_user")
            result = cursor.fetchone()
    if result is None:
        raise RuntimeError("Neon connection test returned no database identity")
    return str(result[0]), str(result[1])


def default_neon_table_lister(connection_url: str) -> list[str]:
    psycopg: Any = importlib.import_module("psycopg")
    with psycopg.connect(connection_url, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """
            )
            rows = cursor.fetchall()
    return [str(row[0]) for row in rows]


def default_neon_schema_executor(connection_url: str, statements: list[str]) -> int:
    psycopg: Any = importlib.import_module("psycopg")
    with psycopg.connect(connection_url, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
        connection.commit()
    return len(statements)


def default_neon_row_count_lister(connection_url: str, table_names: list[str]) -> dict[str, int]:
    psycopg: Any = importlib.import_module("psycopg")
    row_counts: dict[str, int] = {}
    with psycopg.connect(connection_url, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            for table_name in table_names:
                cursor.execute(f"SELECT COUNT(*) FROM {quote_sql_identifier(table_name)}")
                result = cursor.fetchone()
                row_counts[table_name] = int(result[0]) if result else 0
    return row_counts


def quote_sql_identifier(identifier: str) -> str:
    if not identifier or "\x00" in identifier:
        raise ValueError("Invalid SQL identifier")
    return '"' + identifier.replace('"', '""') + '"'


def default_neon_data_loader(connection_url: str, insert_order: list[str]) -> int:
    psycopg: Any = importlib.import_module("psycopg")
    rows_inserted = 0
    with connect() as sqlite_connection:
        with psycopg.connect(connection_url, connect_timeout=5) as postgres_connection:
            with postgres_connection.cursor() as cursor:
                for table_name in insert_order:
                    rows = sqlite_connection.execute(
                        f"SELECT * FROM {quote_sql_identifier(table_name)}"
                    ).fetchall()
                    if not rows:
                        continue
                    column_names = list(rows[0].keys())
                    quoted_table = quote_sql_identifier(table_name)
                    quoted_columns = ", ".join(
                        quote_sql_identifier(column_name) for column_name in column_names
                    )
                    placeholders = ", ".join(["%s"] * len(column_names))
                    statement = (
                        f"INSERT INTO {quoted_table} ({quoted_columns}) VALUES ({placeholders})"
                    )
                    for row in rows:
                        values = [row[column_name] for column_name in column_names]
                        cursor.execute(statement, values)
                        rows_inserted += 1
            postgres_connection.commit()
    return rows_inserted


def normalize_fingerprint_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.hex()
    return str(value)


def hash_normalized_table_rows(
    *,
    table_name: str,
    column_names: list[str],
    rows: list[dict[str, object]],
) -> str:
    normalized_rows = [
        {
            column_name: normalize_fingerprint_value(row.get(column_name))
            for column_name in column_names
        }
        for row in rows
    ]
    normalized_rows.sort(key=lambda row: json.dumps(row, sort_keys=True, separators=(",", ":")))
    table_payload = {
        "table_name": table_name,
        "columns": column_names,
        "rows": normalized_rows,
    }
    return hashlib.sha256(
        json.dumps(table_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def build_combined_content_fingerprint(table_hashes: dict[str, str]) -> str:
    payload = json.dumps(table_hashes, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def build_local_table_content_fingerprints(table_names: list[str]) -> dict[str, str]:
    fingerprints: dict[str, str] = {}
    with connect() as connection:
        for table_name in table_names:
            quoted_table = quote_sql_identifier(table_name)
            column_rows = connection.execute(f"PRAGMA table_info({quoted_table})").fetchall()
            column_names = [str(row["name"]) for row in column_rows]
            rows = [
                {column_name: row[column_name] for column_name in column_names}
                for row in connection.execute(f"SELECT * FROM {quoted_table}").fetchall()
            ]
            fingerprints[table_name] = hash_normalized_table_rows(
                table_name=table_name,
                column_names=column_names,
                rows=rows,
            )
    return fingerprints


def default_neon_table_content_fingerprints(
    connection_url: str, table_names: list[str]
) -> dict[str, str]:
    psycopg: Any = importlib.import_module("psycopg")
    fingerprints: dict[str, str] = {}
    with psycopg.connect(connection_url, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            for table_name in table_names:
                cursor.execute(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = %s
                    ORDER BY ordinal_position
                    """,
                    (table_name,),
                )
                column_names = [str(row[0]) for row in cursor.fetchall()]
                quoted_columns = ", ".join(
                    quote_sql_identifier(column_name) for column_name in column_names
                )
                cursor.execute(f"SELECT {quoted_columns} FROM {quote_sql_identifier(table_name)}")
                rows = [
                    {
                        column_name: value
                        for column_name, value in zip(column_names, row, strict=True)
                    }
                    for row in cursor.fetchall()
                ]
                fingerprints[table_name] = hash_normalized_table_rows(
                    table_name=table_name,
                    column_names=column_names,
                    rows=rows,
                )
    return fingerprints


def build_database_provider_status(
    *,
    neon_connector: Callable[[str], tuple[str, str]] | None = None,
) -> DatabaseProviderStatusResponse:
    active_mode = settings.database_mode.strip().lower() or "local"
    neon_url = settings.neon_database_url.strip()
    parsed_url = parse_postgres_url(neon_url) if neon_url else None
    neon_configured = parsed_url is not None
    is_isolated = is_neon_target_isolated(parsed_url)

    neon_status = "not_configured"
    safe_error_code: str | None = None
    detected_database_name = parsed_url.database_name if parsed_url else None
    detected_role_name = parsed_url.role_name if parsed_url else None

    if neon_url and parsed_url is None:
        neon_status = "invalid_configuration"
        safe_error_code = "invalid_postgres_connection_url"
    elif neon_configured:
        connector = neon_connector or default_neon_connector
        try:
            detected_database_name, detected_role_name = connector(neon_url)
            neon_status = "reachable"
        except ModuleNotFoundError:
            neon_status = "driver_missing"
            safe_error_code = "postgres_driver_missing"
        except Exception as error:
            neon_status = "unreachable"
            safe_error_code = classify_database_error(error)

    local_recovery_available = settings.backup_path.exists()
    postgres_runtime = active_mode in {"neon", "postgres", "postgresql"}
    runtime_adapter_ready = active_mode in {"local", "recovery-local"} or (
        postgres_runtime and neon_status == "reachable" and is_isolated
    )
    writes_allowed = runtime_adapter_ready
    isolation_state = "isolated" if is_isolated else "needs_dedicated_database_or_role"

    if not neon_configured:
        operator_message = "Local SQLite is active. Neon is not configured."
    elif not is_isolated:
        operator_message = (
            "Neon is configured, but Plum Duff should use a dedicated database and role before "
            "any cutover."
        )
    elif postgres_runtime and neon_status == "reachable":
        operator_message = "Neon PostgreSQL is the active durable runtime."
    elif neon_status == "reachable":
        operator_message = "Neon is reachable. Local backups remain mandatory before cutover."
    elif neon_status == "driver_missing":
        operator_message = "Install the PostgreSQL driver before testing Neon from the API."
    else:
        operator_message = "Neon is not reachable. Local mode remains the safe operating mode."

    return DatabaseProviderStatusResponse(
        active_mode=active_mode,
        local_database_configured=settings.database_url.startswith("sqlite:///"),
        local_backup_directory=str(settings.backup_path),
        neon_configured=bool(neon_url),
        neon_status=neon_status,
        neon_safe_error_code=safe_error_code,
        neon_database_name=detected_database_name,
        neon_role_name=detected_role_name,
        neon_host_hint=parsed_url.host_hint if parsed_url else None,
        isolation_state=isolation_state,
        operator_message=operator_message,
        writes_allowed=writes_allowed,
        local_recovery_available=local_recovery_available,
    )


CRITICAL_TRACKER_TABLES = (
    "profiles",
    "accounts",
    "sportsbook_bets",
    "free_bets",
    "casino_offers",
    "cash_adjustments",
    "balance_snapshots",
    "fee_periods",
    "fee_period_revisions",
    "import_batches",
    "backup_snapshots",
)
MAX_BACKUP_AGE_FOR_REHEARSAL = timedelta(hours=24)


def list_local_table_row_counts() -> tuple[str, list[DatabaseTableRowCount]]:
    with connect() as connection:
        schema_rows = connection.execute(
            """
            SELECT name, sql
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        ).fetchall()
        signature_source = "\n".join(f"{row['name']}::{row['sql'] or ''}" for row in schema_rows)
        schema_signature = hashlib.sha256(signature_source.encode("utf-8")).hexdigest()

        row_counts: list[DatabaseTableRowCount] = []
        for row in schema_rows:
            table_name = str(row["name"])
            count_row = connection.execute(f'SELECT COUNT(*) AS row_count FROM "{table_name}"')
            row_counts.append(
                DatabaseTableRowCount(
                    table_name=table_name,
                    row_count=int(count_row.fetchone()["row_count"]),
                )
            )
    return schema_signature, row_counts


def latest_verified_backup() -> tuple[str | None, str | None]:
    for record in list_backup_snapshot_records():
        if record.status == "verified":
            return record.backup_snapshot_id, record.created_at
    return None, None


def is_backup_fresh_for_rehearsal(created_at: str | None) -> bool:
    if not created_at:
        return False
    normalized = created_at.replace("Z", "+00:00")
    try:
        backup_created_at = datetime.fromisoformat(normalized)
    except ValueError:
        return False
    if backup_created_at.tzinfo is None:
        backup_created_at = backup_created_at.replace(tzinfo=UTC)
    return datetime.now(UTC) - backup_created_at <= MAX_BACKUP_AGE_FOR_REHEARSAL


def build_migration_readiness_report(
    *,
    neon_connector: Callable[[str], tuple[str, str]] | None = None,
) -> DatabaseMigrationReadinessResponse:
    provider_status = build_database_provider_status(neon_connector=neon_connector)
    schema_signature, row_counts = list_local_table_row_counts()
    row_count_by_table = {record.table_name: record.row_count for record in row_counts}
    missing_critical_tables = [
        table_name for table_name in CRITICAL_TRACKER_TABLES if table_name not in row_count_by_table
    ]
    backup_id, backup_created_at = latest_verified_backup()

    blockers: list[str] = []
    warnings: list[str] = []

    if settings.database_mode.strip().lower() != "local":
        blockers.append("Cutover rehearsal expects local SQLite to be the current source.")
    if not provider_status.neon_configured:
        blockers.append("Neon target is not configured.")
    elif provider_status.neon_status != "reachable":
        blockers.append("Neon target is not reachable.")
    if provider_status.isolation_state != "isolated":
        blockers.append("Neon target is not isolated for Plum Duff.")
    if backup_id is None:
        blockers.append("No verified local backup exists for rollback.")
    elif not is_backup_fresh_for_rehearsal(backup_created_at):
        blockers.append("Latest verified local backup is older than 24 hours.")
    if missing_critical_tables:
        blockers.append("Critical local tables are missing: " + ", ".join(missing_critical_tables))

    warnings.append("This report rehearses migration from the local SQLite source only.")
    warnings.append(
        "Financial control-total comparison must pass before any cutover can be approved."
    )

    ready_for_rehearsal = not blockers
    ready_for_cutover = False

    return DatabaseMigrationReadinessResponse(
        source_mode=settings.database_mode.strip().lower() or "local",
        target_provider="neon-postgresql",
        migration_boundary="readiness-only-no-data-write",
        schema_signature=schema_signature,
        table_count=len(row_counts),
        total_row_count=sum(record.row_count for record in row_counts),
        critical_tables_present=not missing_critical_tables,
        latest_verified_backup_id=backup_id,
        latest_verified_backup_created_at=backup_created_at,
        provider_status=provider_status,
        ready_for_rehearsal=ready_for_rehearsal,
        ready_for_cutover=ready_for_cutover,
        blockers=blockers,
        warnings=warnings,
        table_row_counts=row_counts,
    )


@router.get("/provider-status", response_model=DatabaseProviderStatusResponse)
def database_provider_status() -> DatabaseProviderStatusResponse:
    return build_database_provider_status()


@router.get("/persistence-status")
def get_persistence_status() -> dict[str, Any]:
    domains = (
        ("Fund Manager users", "fund_manager_users", "Neon", "transactional"),
        ("Authentication sessions", "fund_manager_sessions", "Neon", "transactional"),
        ("Security preferences", "fund_manager_security_preferences", "Neon", "transactional"),
        ("Profiles", "profiles", "Neon", "transactional"),
        (
            "Profile settings",
            "profile_tracker_settings,profile_onboarding_settings",
            "Neon",
            "transactional",
        ),
        ("Profile Accounts and balances", "accounts", "Neon", "transactional"),
        (
            "Account Catalogue",
            "account_catalogue_documents",
            "Neon with version-controlled seed",
            "reference authority",
        ),
        ("Sportsbook Bets", "sportsbook_bets", "Neon", "transactional"),
        ("Free Bets", "free_bets", "Neon", "transactional"),
        ("Casino Offers", "casino_offers", "Neon", "transactional"),
        ("Extra Places", "each_way_extra_places", "Neon", "transactional"),
        ("Cash Adjustments", "cash_adjustments", "Neon", "transactional"),
        (
            "Notifications",
            "notification_user_state",
            "Neon plus derived notification queries",
            "hybrid",
        ),
        ("Notification preferences", "notification_preferences", "Neon", "transactional"),
        ("Profile import runs", "profile_import_runs", "Neon", "transactional"),
        ("Import review decisions", "profile_import_review_decisions", "Neon", "transactional"),
        ("Reports", "", "Derived from persisted source ledgers", "derived"),
    )
    connected = False
    existing_tables: set[str] = set()
    try:
        with connect() as connection:
            connection.execute("SELECT 1").fetchone()
            connected = True
            if postgres_runtime_enabled():
                rows = connection.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                ).fetchall()
                existing_tables = {str(row["table_name"]) for row in rows}
            else:
                rows = connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()
                existing_tables = {str(row["name"]) for row in rows}
    except Exception:
        connected = False
    return {
        "database": "Neon" if postgres_runtime_enabled() else "Local SQLite",
        "connected": connected,
        "environment": settings.environment,
        "runtime_adapter": "postgresql" if postgres_runtime_enabled() else "sqlite",
        "durable_across_redeploy": postgres_runtime_enabled() and connected,
        "domains": [
            {
                "domain": domain,
                "source": source,
                "storage_kind": storage_kind,
                "table": table,
                "available": True
                if not table
                else all(name in existing_tables for name in table.split(",")),
            }
            for domain, table, source, storage_kind in domains
        ],
    }


@router.get("/migration-readiness", response_model=DatabaseMigrationReadinessResponse)
def database_migration_readiness() -> DatabaseMigrationReadinessResponse:
    return build_migration_readiness_report()


@router.get("/postgres-schema-plan", response_model=PostgresSchemaPlanResponse)
def postgres_schema_plan() -> PostgresSchemaPlanResponse:
    with connect() as connection:
        plan = build_postgres_schema_plan(connection)
    ddl_statements = [
        *plan.create_table_statements,
        *plan.foreign_key_statements,
        *plan.unique_index_statements,
    ]
    return PostgresSchemaPlanResponse(
        migration_boundary="schema-preview-no-data-write",
        schema_signature=plan.schema_signature,
        table_count=len(plan.table_names),
        statement_count=plan.statement_count,
        create_table_statement_count=len(plan.create_table_statements),
        foreign_key_statement_count=len(plan.foreign_key_statements),
        unique_index_statement_count=len(plan.unique_index_statements),
        table_names=list(plan.table_names),
        ddl_statements=ddl_statements,
    )


@router.get("/postgres-data-load-plan", response_model=PostgresDataLoadPlanResponse)
def postgres_data_load_plan() -> PostgresDataLoadPlanResponse:
    with connect() as connection:
        plan = build_postgres_data_load_plan(connection)
        row_counts = [
            DatabaseTableRowCount(
                table_name=table_name,
                row_count=int(
                    connection.execute(
                        f'SELECT COUNT(*) AS row_count FROM "{table_name}"'
                    ).fetchone()["row_count"]
                ),
            )
            for table_name in plan.verification_order
        ]

    return PostgresDataLoadPlanResponse(
        migration_boundary="data-load-preview-no-data-write",
        schema_signature=plan.schema_signature,
        table_count=len(plan.table_names),
        total_row_count=sum(row_count.row_count for row_count in row_counts),
        insert_order=list(plan.insert_order),
        verification_order=list(plan.verification_order),
        dependency_edges=list(plan.dependency_edges),
        table_row_counts=row_counts,
    )


@router.get("/migration-control-totals", response_model=MigrationControlTotalsResponse)
def migration_control_totals() -> MigrationControlTotalsResponse:
    return build_migration_control_totals()


def build_migration_package_preview() -> DatabaseMigrationPackagePreviewResponse:
    with connect() as connection:
        plan = build_postgres_data_load_plan(connection)
        row_counts = [
            DatabaseTableRowCount(
                table_name=table_name,
                row_count=int(
                    connection.execute(
                        f'SELECT COUNT(*) AS row_count FROM "{table_name}"'
                    ).fetchone()["row_count"]
                ),
            )
            for table_name in plan.verification_order
        ]
    control_totals = build_migration_control_totals()
    backup_id, backup_created_at = latest_verified_backup()

    blockers: list[str] = []
    warnings: list[str] = [
        "Preview manifest only; no row data is exported and Neon is not written.",
        "Create a fresh verified backup before any staged data-load rehearsal.",
    ]
    if backup_id is None:
        blockers.append("No verified local backup exists for rollback.")
    elif not is_backup_fresh_for_rehearsal(backup_created_at):
        blockers.append("Latest verified local backup is older than 24 hours.")

    fingerprint_source = "\n".join(
        [
            plan.schema_signature,
            backup_id or "",
            backup_created_at or "",
            str(sum(row_count.row_count for row_count in row_counts)),
            control_totals.current_value_grand_total,
            control_totals.final_value_grand_total,
            control_totals.signed_amount_grand_total,
            ",".join(f"{row.table_name}:{row.row_count}" for row in row_counts),
            ",".join(plan.insert_order),
        ]
    )

    return DatabaseMigrationPackagePreviewResponse(
        migration_boundary="migration-package-preview-no-data-write",
        package_fingerprint=hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest(),
        schema_signature=plan.schema_signature,
        table_count=len(plan.table_names),
        total_row_count=sum(row_count.row_count for row_count in row_counts),
        latest_verified_backup_id=backup_id,
        latest_verified_backup_created_at=backup_created_at,
        control_current_value_grand_total=control_totals.current_value_grand_total,
        control_final_value_grand_total=control_totals.final_value_grand_total,
        control_signed_amount_grand_total=control_totals.signed_amount_grand_total,
        control_missing_value_count=(
            control_totals.missing_current_value_count
            + control_totals.missing_final_value_count
            + control_totals.invalid_money_value_count
        ),
        insert_order=list(plan.insert_order),
        blockers=blockers,
        warnings=warnings,
    )


@router.get(
    "/migration-package-preview",
    response_model=DatabaseMigrationPackagePreviewResponse,
)
def migration_package_preview() -> DatabaseMigrationPackagePreviewResponse:
    return build_migration_package_preview()


def build_neon_schema_status(
    *,
    neon_table_lister: Callable[[str], list[str]] | None = None,
) -> NeonSchemaStatusResponse:
    neon_url = settings.neon_database_url.strip()
    with connect() as connection:
        plan = build_postgres_schema_plan(connection)

    expected_tables = set(plan.table_names)
    remote_tables: set[str] = set()
    blockers: list[str] = []
    warnings: list[str] = [
        "Remote schema status is read-only; it does not create tables or write rows.",
    ]
    neon_status = "not_configured"

    if not neon_url:
        blockers.append("Neon target is not configured.")
    else:
        table_lister = neon_table_lister or default_neon_table_lister
        try:
            remote_tables = set(table_lister(neon_url))
            neon_status = "reachable"
        except ModuleNotFoundError:
            neon_status = "driver_missing"
            blockers.append("PostgreSQL driver is not installed.")
        except Exception as error:
            neon_status = "unreachable"
            blockers.append(classify_database_error(error))

    present_tables = sorted(expected_tables & remote_tables)
    missing_tables = sorted(expected_tables - remote_tables)
    extra_tables = sorted(remote_tables - expected_tables)
    if neon_status == "reachable" and missing_tables:
        blockers.append("Neon schema is missing Plum Duff tables.")
    if extra_tables:
        warnings.append("Neon public schema contains tables outside the current Plum Duff plan.")

    return NeonSchemaStatusResponse(
        migration_boundary="remote-schema-readiness-no-data-write",
        neon_status=neon_status,
        expected_table_count=len(expected_tables),
        remote_table_count=len(remote_tables),
        present_tables=present_tables,
        missing_tables=missing_tables,
        extra_tables=extra_tables,
        schema_ready_for_data_load=neon_status == "reachable" and not missing_tables,
        blockers=blockers,
        warnings=warnings,
    )


@router.get("/neon-schema-status", response_model=NeonSchemaStatusResponse)
def neon_schema_status() -> NeonSchemaStatusResponse:
    return build_neon_schema_status()


SCHEMA_APPLY_CONFIRM_PHRASE = "CREATE PLUM DUFF SCHEMA"
DATA_LOAD_CONFIRM_PHRASE = "LOAD PLUM DUFF DATA"


def build_schema_apply_statements() -> tuple[str, list[str]]:
    with connect() as connection:
        plan = build_postgres_schema_plan(connection)
    statements = [
        *plan.create_table_statements,
        *plan.unique_index_statements,
        *plan.foreign_key_statements,
    ]
    return plan.schema_signature, statements


def apply_neon_schema(
    payload: NeonSchemaApplyPayload,
    *,
    neon_table_lister: Callable[[str], list[str]] | None = None,
    neon_schema_executor: Callable[[str, list[str]], int] | None = None,
) -> NeonSchemaApplyResponse:
    if payload.confirm_phrase != SCHEMA_APPLY_CONFIRM_PHRASE:
        raise HTTPException(
            status_code=409,
            detail=f"confirm_phrase must be {SCHEMA_APPLY_CONFIRM_PHRASE!r}",
        )

    neon_url = settings.neon_database_url.strip()
    if not neon_url:
        raise HTTPException(status_code=409, detail="Neon target is not configured.")

    package_preview = build_migration_package_preview()
    if package_preview.blockers:
        raise HTTPException(status_code=409, detail="; ".join(package_preview.blockers))
    if payload.package_fingerprint != package_preview.package_fingerprint:
        raise HTTPException(
            status_code=409,
            detail="Package fingerprint does not match the current local migration preview.",
        )
    if package_preview.latest_verified_backup_id is None:
        raise HTTPException(status_code=409, detail="No verified local backup exists.")

    before_status = build_neon_schema_status(neon_table_lister=neon_table_lister)
    if before_status.schema_ready_for_data_load:
        return NeonSchemaApplyResponse(
            migration_boundary="remote-schema-apply-guarded",
            applied=False,
            statements_applied=0,
            package_fingerprint=package_preview.package_fingerprint,
            schema_signature=package_preview.schema_signature,
            backup_snapshot_id=package_preview.latest_verified_backup_id,
            actor_id=payload.actor_id,
            warnings=["Neon schema already matches the current Plum Duff table plan."],
        )
    if before_status.remote_table_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "Neon public schema is not empty and does not match Plum Duff. "
                "Manual review is required before schema creation."
            ),
        )

    schema_signature, statements = build_schema_apply_statements()
    if schema_signature != package_preview.schema_signature:
        raise HTTPException(
            status_code=409,
            detail="Schema changed after package preview. Re-run readiness checks.",
        )

    executor = neon_schema_executor or default_neon_schema_executor
    try:
        statements_applied = executor(neon_url, statements)
    except Exception as error:
        raise HTTPException(status_code=409, detail=classify_database_error(error)) from error

    return NeonSchemaApplyResponse(
        migration_boundary="remote-schema-apply-guarded",
        applied=True,
        statements_applied=statements_applied,
        package_fingerprint=package_preview.package_fingerprint,
        schema_signature=package_preview.schema_signature,
        backup_snapshot_id=package_preview.latest_verified_backup_id,
        actor_id=payload.actor_id,
        warnings=[
            "Schema was created only; operational tracker rows were not loaded.",
            "Run remote schema status and package preview again before any data-load rehearsal.",
        ],
    )


@router.post("/neon-schema-apply", response_model=NeonSchemaApplyResponse)
def neon_schema_apply(payload: NeonSchemaApplyPayload) -> NeonSchemaApplyResponse:
    return apply_neon_schema(payload)


def list_local_row_counts_for_tables(table_names: list[str]) -> list[DatabaseTableRowCount]:
    with connect() as connection:
        return [
            DatabaseTableRowCount(
                table_name=table_name,
                row_count=int(
                    connection.execute(
                        f"SELECT COUNT(*) AS row_count FROM {quote_sql_identifier(table_name)}"
                    ).fetchone()["row_count"]
                ),
            )
            for table_name in table_names
        ]


def load_neon_data_rehearsal(
    payload: NeonDataLoadPayload,
    *,
    neon_table_lister: Callable[[str], list[str]] | None = None,
    neon_row_count_lister: Callable[[str, list[str]], dict[str, int]] | None = None,
    neon_data_loader: Callable[[str, list[str]], int] | None = None,
) -> NeonDataLoadResponse:
    if payload.confirm_phrase != DATA_LOAD_CONFIRM_PHRASE:
        raise HTTPException(
            status_code=409,
            detail=f"confirm_phrase must be {DATA_LOAD_CONFIRM_PHRASE!r}",
        )

    neon_url = settings.neon_database_url.strip()
    if not neon_url:
        raise HTTPException(status_code=409, detail="Neon target is not configured.")

    package_preview = build_migration_package_preview()
    if package_preview.blockers:
        raise HTTPException(status_code=409, detail="; ".join(package_preview.blockers))
    if payload.package_fingerprint != package_preview.package_fingerprint:
        raise HTTPException(
            status_code=409,
            detail="Package fingerprint does not match the current local migration preview.",
        )
    if package_preview.latest_verified_backup_id is None:
        raise HTTPException(status_code=409, detail="No verified local backup exists.")

    schema_status = build_neon_schema_status(neon_table_lister=neon_table_lister)
    if not schema_status.schema_ready_for_data_load:
        raise HTTPException(
            status_code=409,
            detail="Neon schema is not ready for data load.",
        )

    table_names = package_preview.insert_order
    count_lister = neon_row_count_lister or default_neon_row_count_lister
    try:
        before_remote_counts = count_lister(neon_url, table_names)
    except Exception as error:
        raise HTTPException(status_code=409, detail=classify_database_error(error)) from error
    non_empty_tables = [
        table_name for table_name, row_count in before_remote_counts.items() if row_count > 0
    ]
    if non_empty_tables:
        raise HTTPException(
            status_code=409,
            detail="Neon target already contains rows: " + ", ".join(sorted(non_empty_tables)),
        )

    loader = neon_data_loader or default_neon_data_loader
    try:
        rows_inserted = loader(neon_url, table_names)
        after_remote_count_map = count_lister(neon_url, table_names)
    except Exception as error:
        raise HTTPException(status_code=409, detail=classify_database_error(error)) from error

    local_row_counts = list_local_row_counts_for_tables(table_names)
    remote_row_counts = [
        DatabaseTableRowCount(
            table_name=table_name,
            row_count=after_remote_count_map.get(table_name, 0),
        )
        for table_name in table_names
    ]
    local_count_map = {record.table_name: record.row_count for record in local_row_counts}
    remote_count_map = {record.table_name: record.row_count for record in remote_row_counts}
    row_counts_match = local_count_map == remote_count_map

    return NeonDataLoadResponse(
        migration_boundary="remote-data-load-rehearsal-guarded",
        loaded=True,
        package_fingerprint=package_preview.package_fingerprint,
        backup_snapshot_id=package_preview.latest_verified_backup_id,
        actor_id=payload.actor_id,
        table_count=len(table_names),
        rows_inserted=rows_inserted,
        row_counts_match=row_counts_match,
        local_row_counts=local_row_counts,
        remote_row_counts=remote_row_counts,
        warnings=[
            "Data was loaded into Neon staging schema; runtime mode is still local.",
            "Run row-count and financial control-total checks before approving cutover.",
        ],
    )


@router.post("/neon-data-load-rehearsal", response_model=NeonDataLoadResponse)
def neon_data_load_rehearsal(payload: NeonDataLoadPayload) -> NeonDataLoadResponse:
    return load_neon_data_rehearsal(payload)


def verify_neon_data_load(
    *,
    neon_table_lister: Callable[[str], list[str]] | None = None,
    neon_row_count_lister: Callable[[str, list[str]], dict[str, int]] | None = None,
    neon_table_content_fingerprints: Callable[[str, list[str]], dict[str, str]] | None = None,
) -> NeonDataVerificationResponse:
    neon_url = settings.neon_database_url.strip()
    if not neon_url:
        raise HTTPException(status_code=409, detail="Neon target is not configured.")

    package_preview = build_migration_package_preview()
    if package_preview.blockers:
        raise HTTPException(status_code=409, detail="; ".join(package_preview.blockers))
    if package_preview.latest_verified_backup_id is None:
        raise HTTPException(status_code=409, detail="No verified local backup exists.")

    schema_status = build_neon_schema_status(neon_table_lister=neon_table_lister)
    if not schema_status.schema_ready_for_data_load:
        raise HTTPException(
            status_code=409,
            detail="Neon schema is not ready for data verification.",
        )

    table_names = package_preview.insert_order
    local_row_counts = list_local_row_counts_for_tables(table_names)
    count_lister = neon_row_count_lister or default_neon_row_count_lister
    remote_count_map = count_lister(neon_url, table_names)
    remote_row_counts = [
        DatabaseTableRowCount(
            table_name=table_name,
            row_count=remote_count_map.get(table_name, 0),
        )
        for table_name in table_names
    ]
    local_count_map = {record.table_name: record.row_count for record in local_row_counts}
    row_counts_match = {
        record.table_name: record.row_count for record in remote_row_counts
    } == local_count_map

    local_table_hashes = build_local_table_content_fingerprints(table_names)
    remote_hasher = neon_table_content_fingerprints or default_neon_table_content_fingerprints
    try:
        remote_table_hashes = remote_hasher(neon_url, table_names)
    except Exception as error:
        raise HTTPException(status_code=409, detail=classify_database_error(error)) from error

    mismatched_tables = sorted(
        table_name
        for table_name in table_names
        if local_table_hashes.get(table_name) != remote_table_hashes.get(table_name)
    )
    local_content_fingerprint = build_combined_content_fingerprint(local_table_hashes)
    remote_content_fingerprint = build_combined_content_fingerprint(remote_table_hashes)
    content_fingerprint_match = local_content_fingerprint == remote_content_fingerprint

    return NeonDataVerificationResponse(
        migration_boundary="remote-data-load-verification-read-only",
        verified=row_counts_match and content_fingerprint_match and not mismatched_tables,
        package_fingerprint=package_preview.package_fingerprint,
        backup_snapshot_id=package_preview.latest_verified_backup_id,
        table_count=len(table_names),
        total_row_count=package_preview.total_row_count,
        row_counts_match=row_counts_match,
        content_fingerprint_match=content_fingerprint_match,
        local_content_fingerprint=local_content_fingerprint,
        remote_content_fingerprint=remote_content_fingerprint,
        mismatched_tables=mismatched_tables,
        local_row_counts=local_row_counts,
        remote_row_counts=remote_row_counts,
        warnings=[
            "Verification hashes table contents only; it does not expose row data.",
            "Runtime mode is still local until an explicit cutover is implemented.",
        ],
    )


@router.get("/neon-data-load-verification", response_model=NeonDataVerificationResponse)
def neon_data_load_verification() -> NeonDataVerificationResponse:
    return verify_neon_data_load()


def build_neon_cutover_readiness(
    *,
    neon_connector: Callable[[str], tuple[str, str]] | None = None,
    neon_table_lister: Callable[[str], list[str]] | None = None,
    neon_row_count_lister: Callable[[str, list[str]], dict[str, int]] | None = None,
    neon_table_content_fingerprints: Callable[[str, list[str]], dict[str, str]] | None = None,
) -> NeonCutoverReadinessResponse:
    provider_status = build_database_provider_status(neon_connector=neon_connector)
    blockers: list[str] = []
    warnings: list[str] = ["This endpoint does not switch database mode or write data."]

    schema_ready = False
    data_verified = False
    package_fingerprint: str | None = None
    backup_snapshot_id: str | None = None

    if not provider_status.neon_configured:
        blockers.append("Neon target is not configured.")
    elif provider_status.neon_status != "reachable":
        blockers.append("Neon target is not reachable.")
    if provider_status.isolation_state != "isolated":
        blockers.append("Neon target is not isolated for Plum Duff.")

    if not blockers:
        schema_status = build_neon_schema_status(neon_table_lister=neon_table_lister)
        schema_ready = schema_status.schema_ready_for_data_load
        blockers.extend(schema_status.blockers)

    if not blockers and schema_ready:
        try:
            verification = verify_neon_data_load(
                neon_table_lister=neon_table_lister,
                neon_row_count_lister=neon_row_count_lister,
                neon_table_content_fingerprints=neon_table_content_fingerprints,
            )
            data_verified = verification.verified
            package_fingerprint = verification.package_fingerprint
            backup_snapshot_id = verification.backup_snapshot_id
            if not verification.verified:
                blockers.append("Neon data load verification did not pass.")
                if verification.mismatched_tables:
                    blockers.append(
                        "Mismatched tables: " + ", ".join(verification.mismatched_tables)
                    )
        except HTTPException as error:
            blockers.append(str(error.detail))

    runtime_adapter_ready = provider_status.neon_status == "reachable"
    active_postgres_runtime = provider_status.active_mode in {
        "neon",
        "postgres",
        "postgresql",
    }
    if not runtime_adapter_ready:
        blockers.append("PostgreSQL runtime adapter cannot reach Neon.")
    if not active_postgres_runtime:
        blockers.append("PostgreSQL runtime mode is not active.")

    staging_ready = (
        provider_status.neon_status == "reachable"
        and provider_status.isolation_state == "isolated"
        and schema_ready
        and data_verified
    )

    return NeonCutoverReadinessResponse(
        migration_boundary="runtime-cutover-readiness-read-only",
        staging_ready=staging_ready,
        runtime_cutover_ready=(staging_ready and runtime_adapter_ready and active_postgres_runtime),
        provider_status=provider_status,
        schema_ready=schema_ready,
        data_verified=data_verified,
        package_fingerprint=package_fingerprint,
        backup_snapshot_id=backup_snapshot_id,
        blockers=blockers,
        warnings=warnings,
    )


@router.get("/neon-cutover-readiness", response_model=NeonCutoverReadinessResponse)
def neon_cutover_readiness() -> NeonCutoverReadinessResponse:
    return build_neon_cutover_readiness()
