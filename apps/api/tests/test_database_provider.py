from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.backups import create_verified_local_backup
from openforge_api.config import settings
from openforge_api.database_provider import (
    DATA_LOAD_CONFIRM_PHRASE,
    SCHEMA_APPLY_CONFIRM_PHRASE,
    NeonDataLoadPayload,
    NeonSchemaApplyPayload,
    apply_neon_schema,
    build_combined_content_fingerprint,
    build_database_provider_status,
    build_local_table_content_fingerprints,
    build_migration_package_preview,
    build_migration_readiness_report,
    build_neon_cutover_readiness,
    build_neon_schema_status,
    classify_database_error,
    list_local_row_counts_for_tables,
    load_neon_data_rehearsal,
    verify_neon_data_load,
)
from openforge_api.db import connect
from openforge_api.main import app
from openforge_api.migration_control_totals import build_migration_control_totals
from openforge_api.postgres_schema import build_postgres_data_load_plan, build_postgres_schema_plan


def configure_temp_settings(tmp_path: Path) -> None:
    settings.environment = "local"
    settings.auth_required = False
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.neon_database_url = ""


def test_provider_status_defaults_to_local_without_exposing_secrets(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    response = client.get("/fund-manager/database/provider-status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_mode"] == "local"
    assert payload["neon_configured"] is False
    assert payload["neon_status"] == "not_configured"
    assert payload["writes_allowed"] is True
    assert "database_url" not in payload
    assert "password" not in str(payload).lower()


def test_persistence_status_reports_domains_without_credentials(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    response = client.get("/fund-manager/database/persistence-status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["database"] == "Local SQLite"
    assert payload["connected"] is True
    domains = {entry["domain"]: entry for entry in payload["domains"]}
    assert domains["Profiles"]["table"] == "profiles"
    assert (
        domains["Profile settings"]["table"]
        == "profile_tracker_settings,profile_onboarding_settings"
    )
    assert domains["Profile settings"]["available"] is True
    assert domains["Profile import runs"]["table"] == "profile_import_runs"
    assert domains["Import review decisions"]["available"] is True
    assert "database_url" not in str(payload).lower()
    assert "password" not in str(payload).lower()


def test_provider_status_flags_generic_neon_database_as_not_isolated(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/neondb?sslmode=require"
    )

    status = build_database_provider_status(
        neon_connector=lambda _connection_url: ("neondb", "neondb_owner")
    )

    assert status.neon_status == "reachable"
    assert status.neon_database_name == "neondb"
    assert status.neon_role_name == "neondb_owner"
    assert status.isolation_state == "needs_dedicated_database_or_role"
    assert "dedicated database and role" in status.operator_message


def test_provider_status_accepts_dedicated_neon_identity(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://plum_duff_app:secret@example.neon.tech/plum_duff?sslmode=require"
    )

    status = build_database_provider_status(
        neon_connector=lambda _connection_url: ("plum_duff", "plum_duff_app")
    )

    assert status.neon_status == "reachable"
    assert status.isolation_state == "isolated"
    assert status.neon_host_hint == "example.neon.tech"
    assert status.writes_allowed is True


def test_provider_status_enables_dedicated_neon_runtime(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.database_mode = "neon"
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )

    status = build_database_provider_status(
        neon_connector=lambda _connection_url: ("plum-duff-app-db", "neondb_owner")
    )

    assert status.neon_status == "reachable"
    assert status.isolation_state == "isolated"
    assert status.writes_allowed is True
    assert "active durable runtime" in status.operator_message


def test_neon_runtime_requires_explicit_connection_url(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.database_mode = "neon"

    try:
        with connect():
            pass
    except RuntimeError as error:
        assert "OPENFORGE_NEON_DATABASE_URL" in str(error)
    else:
        raise AssertionError("SQLite connect should block Neon mode without adapter")


def test_provider_status_blocks_neon_writes_when_connection_fails(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.database_mode = "neon"
    settings.neon_database_url = (
        "postgresql://plum_duff_app:secret@example.neon.tech/plum_duff?sslmode=require"
    )

    def failing_connector(_connection_url: str) -> tuple[str, str]:
        raise TimeoutError("connection timed out")

    status = build_database_provider_status(neon_connector=failing_connector)

    assert status.neon_status == "unreachable"
    assert status.neon_safe_error_code == "database_timeout"
    assert status.writes_allowed is False
    assert "not reachable" in status.operator_message.lower()


def test_database_error_classifier_returns_safe_codes() -> None:
    assert classify_database_error(RuntimeError("password authentication failed")) == (
        "database_authentication_failed"
    )
    assert classify_database_error(TimeoutError("connection timed out")) == "database_timeout"
    assert classify_database_error(RuntimeError("SSL certificate verify failed")) == (
        "database_tls_failed"
    )
    assert classify_database_error(RuntimeError("too many connections")) == (
        "database_pool_exhausted"
    )


def test_migration_readiness_blocks_cutover_without_neon_or_backup(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)

    report = build_migration_readiness_report()

    assert report.source_mode == "local"
    assert report.target_provider == "neon-postgresql"
    assert report.migration_boundary == "readiness-only-no-data-write"
    assert report.ready_for_rehearsal is False
    assert report.ready_for_cutover is False
    assert "Neon target is not configured." in report.blockers
    assert "No verified local backup exists for rollback." in report.blockers
    assert report.critical_tables_present is True
    assert report.table_count > 0
    assert report.total_row_count > 0
    assert len(report.schema_signature) == 64


def test_migration_readiness_allows_rehearsal_only_after_backup_and_reachable_neon(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET display_name = ? WHERE profile_id = ?",
            ("Synthetic Migration Profile", "profile-demo-001"),
        )
    backup = create_verified_local_backup(reason="Synthetic pre-cutover rehearsal")

    report = build_migration_readiness_report(
        neon_connector=lambda _connection_url: ("plum-duff-app-db", "neondb_owner")
    )

    assert report.provider_status.neon_status == "reachable"
    assert report.provider_status.isolation_state == "isolated"
    assert report.latest_verified_backup_id == backup.backup_snapshot_id
    assert report.ready_for_rehearsal is True
    assert report.ready_for_cutover is False
    assert report.blockers == []
    assert any("rehearses migration" in warning for warning in report.warnings)


def test_migration_readiness_blocks_stale_verified_backup(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    backup = create_verified_local_backup(reason="Synthetic stale cutover backup")
    stale_created_at = (
        (datetime.now(UTC) - timedelta(days=2)).isoformat(timespec="seconds").replace("+00:00", "Z")
    )
    with connect() as connection:
        connection.execute(
            """
            UPDATE backup_snapshots
            SET created_at = ?
            WHERE backup_snapshot_id = ?
            """,
            (stale_created_at, backup.backup_snapshot_id),
        )

    report = build_migration_readiness_report(
        neon_connector=lambda _connection_url: ("plum-duff-app-db", "neondb_owner")
    )

    assert report.ready_for_rehearsal is False
    assert "Latest verified local backup is older than 24 hours." in report.blockers


def test_migration_readiness_endpoint_does_not_expose_connection_string(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    client = TestClient(app)

    response = client.get("/fund-manager/database/migration-readiness")

    assert response.status_code == 200
    payload_text = response.text.lower()
    assert "secret" not in payload_text
    assert "postgresql://" not in payload_text


def test_postgres_schema_plan_generates_current_tracker_tables(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    with connect() as connection:
        plan = build_postgres_schema_plan(connection)

    assert "profiles" in plan.table_names
    assert "sportsbook_bets" in plan.table_names
    assert "free_bets" in plan.table_names
    assert "casino_offers" in plan.table_names
    assert "profile_import_runs" in plan.table_names
    assert "profile_import_review_items" in plan.table_names
    assert "profile_import_review_decisions" in plan.table_names
    assert "profile_import_attempts" in plan.table_names
    assert "profile_import_attempt_checkpoints" in plan.table_names
    assert "profile_import_attempt_write_audit" in plan.table_names
    assert len(plan.schema_signature) == 64
    assert plan.statement_count >= len(plan.table_names)

    joined_ddl = "\n".join(
        (*plan.create_table_statements, *plan.foreign_key_statements, *plan.unique_index_statements)
    )
    assert 'CREATE TABLE IF NOT EXISTS "profiles"' in joined_ddl
    assert 'PRIMARY KEY ("profile_id")' in joined_ddl
    assert 'FOREIGN KEY ("profile_id")' in joined_ddl
    assert "sqlite_" not in joined_ddl.lower()


def test_postgres_schema_plan_endpoint_is_preview_only(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    response = client.get("/fund-manager/database/postgres-schema-plan")

    assert response.status_code == 200
    payload = response.json()
    assert payload["migration_boundary"] == "schema-preview-no-data-write"
    assert payload["table_count"] > 0
    assert payload["statement_count"] == len(payload["ddl_statements"])
    assert "profiles" in payload["table_names"]
    assert payload["create_table_statement_count"] > 0
    assert payload["foreign_key_statement_count"] > 0


def test_postgres_data_load_plan_orders_parents_before_dependents(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    with connect() as connection:
        plan = build_postgres_data_load_plan(connection)

    order_index = {table_name: index for index, table_name in enumerate(plan.insert_order)}
    assert set(plan.insert_order) == set(plan.table_names)
    assert order_index["profiles"] < order_index["accounts"]
    assert order_index["profiles"] < order_index["sportsbook_bets"]
    assert order_index["sportsbook_bets"] < order_index["sportsbook_bet_audit"]
    assert ("profiles", "accounts") in plan.dependency_edges
    assert ("sportsbook_bets", "sportsbook_bet_audit") in plan.dependency_edges


def test_postgres_data_load_plan_endpoint_is_preview_only(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    response = client.get("/fund-manager/database/postgres-data-load-plan")

    assert response.status_code == 200
    payload = response.json()
    assert payload["migration_boundary"] == "data-load-preview-no-data-write"
    assert payload["table_count"] == len(payload["insert_order"])
    assert payload["table_count"] == len(payload["verification_order"])
    assert payload["total_row_count"] > 0
    assert ["profiles", "accounts"] in payload["dependency_edges"]


def test_migration_control_totals_are_profile_scoped_preview_values(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)

    totals = build_migration_control_totals()

    assert totals.migration_boundary == "control-totals-preview-no-data-write"
    assert totals.profile_count > 0
    assert totals.module_count == totals.profile_count * 4
    assert totals.total_row_count > 0
    assert len(totals.current_value_grand_total.split(".")) == 2
    assert len(totals.final_value_grand_total.split(".")) == 2
    assert len(totals.signed_amount_grand_total.split(".")) == 2
    assert any(total.module == "sportsbook_bets" for total in totals.module_totals)
    assert any(total.module == "free_bets" for total in totals.module_totals)
    assert any(total.module == "casino_offers" for total in totals.module_totals)
    assert any(total.module == "cash_adjustments" for total in totals.module_totals)
    assert totals.warnings


def test_migration_control_totals_endpoint_is_preview_only_and_secret_safe(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    client = TestClient(app)

    response = client.get("/fund-manager/database/migration-control-totals")

    assert response.status_code == 200
    payload = response.json()
    assert payload["migration_boundary"] == "control-totals-preview-no-data-write"
    assert payload["module_count"] > 0
    assert "secret" not in response.text.lower()
    assert "postgresql://" not in response.text.lower()


def test_migration_package_preview_requires_recent_verified_backup(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)

    preview = build_migration_package_preview()

    assert preview.migration_boundary == "migration-package-preview-no-data-write"
    assert len(preview.package_fingerprint) == 64
    assert preview.table_count > 0
    assert preview.total_row_count > 0
    assert preview.latest_verified_backup_id is None
    assert "No verified local backup exists for rollback." in preview.blockers
    assert "profiles" in preview.insert_order
    assert preview.warnings


def test_migration_package_preview_records_backup_and_control_totals(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    backup = create_verified_local_backup(reason="Synthetic migration package preview")

    preview = build_migration_package_preview()

    assert preview.latest_verified_backup_id == backup.backup_snapshot_id
    assert preview.blockers == []
    assert len(preview.schema_signature) == 64
    assert len(preview.control_current_value_grand_total.split(".")) == 2
    assert len(preview.control_final_value_grand_total.split(".")) == 2
    assert len(preview.control_signed_amount_grand_total.split(".")) == 2


def test_migration_package_preview_endpoint_is_secret_safe(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    client = TestClient(app)

    response = client.get("/fund-manager/database/migration-package-preview")

    assert response.status_code == 200
    assert response.json()["migration_boundary"] == "migration-package-preview-no-data-write"
    assert "secret" not in response.text.lower()
    assert "postgresql://" not in response.text.lower()


def test_neon_schema_status_reports_missing_tables_without_writing(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )

    status = build_neon_schema_status(neon_table_lister=lambda _connection_url: ["profiles"])

    assert status.migration_boundary == "remote-schema-readiness-no-data-write"
    assert status.neon_status == "reachable"
    assert status.expected_table_count > 1
    assert status.present_tables == ["profiles"]
    assert "sportsbook_bets" in status.missing_tables
    assert status.schema_ready_for_data_load is False
    assert "Neon schema is missing Plum Duff tables." in status.blockers


def test_neon_schema_status_accepts_complete_remote_schema(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    with connect() as connection:
        expected_tables = list(build_postgres_schema_plan(connection).table_names)

    status = build_neon_schema_status(neon_table_lister=lambda _connection_url: expected_tables)

    assert status.neon_status == "reachable"
    assert status.schema_ready_for_data_load is True
    assert status.missing_tables == []
    assert status.blockers == []


def test_neon_schema_status_endpoint_is_secret_safe(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    client = TestClient(app)

    response = client.get("/fund-manager/database/neon-schema-status")

    assert response.status_code == 200
    assert response.json()["migration_boundary"] == "remote-schema-readiness-no-data-write"
    assert "secret" not in response.text.lower()
    assert "postgresql://" not in response.text.lower()


def test_neon_schema_apply_requires_exact_confirm_phrase(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )

    try:
        apply_neon_schema(
            NeonSchemaApplyPayload(confirm_phrase="wrong", package_fingerprint="unused")
        )
    except Exception as error:
        assert "confirm_phrase" in str(error)
    else:
        raise AssertionError("Schema apply should require the exact confirm phrase")


def test_neon_schema_apply_blocks_without_matching_package_fingerprint(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic schema apply backup")

    try:
        apply_neon_schema(
            NeonSchemaApplyPayload(
                confirm_phrase=SCHEMA_APPLY_CONFIRM_PHRASE,
                package_fingerprint="not-current",
            ),
            neon_table_lister=lambda _connection_url: [],
            neon_schema_executor=lambda _connection_url, statements: len(statements),
        )
    except Exception as error:
        assert "Package fingerprint" in str(error)
    else:
        raise AssertionError("Schema apply should reject stale package fingerprints")


def test_neon_schema_apply_uses_guarded_executor_for_empty_remote_schema(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic schema apply backup")
    package_preview = build_migration_package_preview()
    captured: dict[str, int] = {}

    def fake_executor(_connection_url: str, statements: list[str]) -> int:
        captured["statement_count"] = len(statements)
        return len(statements)

    response = apply_neon_schema(
        NeonSchemaApplyPayload(
            confirm_phrase=SCHEMA_APPLY_CONFIRM_PHRASE,
            package_fingerprint=package_preview.package_fingerprint,
        ),
        neon_table_lister=lambda _connection_url: [],
        neon_schema_executor=fake_executor,
    )

    assert response.applied is True
    assert response.statements_applied == captured["statement_count"]
    assert response.statements_applied > 0
    assert response.backup_snapshot_id == package_preview.latest_verified_backup_id


def test_neon_schema_apply_blocks_partial_remote_schema(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic partial remote schema backup")
    package_preview = build_migration_package_preview()

    try:
        apply_neon_schema(
            NeonSchemaApplyPayload(
                confirm_phrase=SCHEMA_APPLY_CONFIRM_PHRASE,
                package_fingerprint=package_preview.package_fingerprint,
            ),
            neon_table_lister=lambda _connection_url: ["profiles"],
            neon_schema_executor=lambda _connection_url, statements: len(statements),
        )
    except Exception as error:
        assert "not empty" in str(error)
    else:
        raise AssertionError("Schema apply should block partial remote schemas")


def test_neon_data_load_requires_exact_confirm_phrase(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )

    try:
        load_neon_data_rehearsal(
            NeonDataLoadPayload(confirm_phrase="wrong", package_fingerprint="unused")
        )
    except Exception as error:
        assert "confirm_phrase" in str(error)
    else:
        raise AssertionError("Data load should require the exact confirm phrase")


def test_neon_data_load_blocks_without_matching_package_fingerprint(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic data load backup")

    try:
        load_neon_data_rehearsal(
            NeonDataLoadPayload(
                confirm_phrase=DATA_LOAD_CONFIRM_PHRASE,
                package_fingerprint="not-current",
            )
        )
    except Exception as error:
        assert "Package fingerprint" in str(error)
    else:
        raise AssertionError("Data load should reject stale package fingerprints")


def test_neon_data_load_blocks_non_empty_remote_tables(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic non-empty data load backup")
    package_preview = build_migration_package_preview()

    try:
        load_neon_data_rehearsal(
            NeonDataLoadPayload(
                confirm_phrase=DATA_LOAD_CONFIRM_PHRASE,
                package_fingerprint=package_preview.package_fingerprint,
            ),
            neon_table_lister=lambda _connection_url: package_preview.insert_order,
            neon_row_count_lister=lambda _connection_url, table_names: {
                table_name: 1 if table_name == "profiles" else 0 for table_name in table_names
            },
            neon_data_loader=lambda _connection_url, table_names: len(table_names),
        )
    except Exception as error:
        assert "already contains rows" in str(error)
        assert "profiles" in str(error)
    else:
        raise AssertionError("Data load should block non-empty remote tables")


def test_neon_data_load_uses_guarded_loader_and_verifies_row_counts(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic data load success backup")
    package_preview = build_migration_package_preview()
    local_counts = list_local_row_counts_for_tables(package_preview.insert_order)
    local_count_map = {record.table_name: record.row_count for record in local_counts}
    call_count = {"row_count_lister": 0, "loader": 0}

    def fake_row_count_lister(_connection_url: str, table_names: list[str]) -> dict[str, int]:
        call_count["row_count_lister"] += 1
        if call_count["row_count_lister"] == 1:
            return {table_name: 0 for table_name in table_names}
        return {table_name: local_count_map[table_name] for table_name in table_names}

    def fake_data_loader(_connection_url: str, table_names: list[str]) -> int:
        call_count["loader"] += 1
        return sum(local_count_map[table_name] for table_name in table_names)

    response = load_neon_data_rehearsal(
        NeonDataLoadPayload(
            confirm_phrase=DATA_LOAD_CONFIRM_PHRASE,
            package_fingerprint=package_preview.package_fingerprint,
        ),
        neon_table_lister=lambda _connection_url: package_preview.insert_order,
        neon_row_count_lister=fake_row_count_lister,
        neon_data_loader=fake_data_loader,
    )

    assert response.loaded is True
    assert response.row_counts_match is True
    assert response.rows_inserted == package_preview.total_row_count
    assert response.backup_snapshot_id == package_preview.latest_verified_backup_id
    assert call_count == {"row_count_lister": 2, "loader": 1}


def test_neon_data_verification_accepts_matching_content_fingerprints(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic verification backup")
    package_preview = build_migration_package_preview()
    local_counts = list_local_row_counts_for_tables(package_preview.insert_order)
    local_count_map = {record.table_name: record.row_count for record in local_counts}
    local_hashes = build_local_table_content_fingerprints(package_preview.insert_order)

    response = verify_neon_data_load(
        neon_table_lister=lambda _connection_url: package_preview.insert_order,
        neon_row_count_lister=lambda _connection_url, table_names: {
            table_name: local_count_map[table_name] for table_name in table_names
        },
        neon_table_content_fingerprints=lambda _connection_url, _table_names: local_hashes,
    )

    assert response.verified is True
    assert response.row_counts_match is True
    assert response.content_fingerprint_match is True
    assert response.mismatched_tables == []
    assert response.local_content_fingerprint == response.remote_content_fingerprint


def test_neon_data_verification_reports_mismatched_content_fingerprint(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic mismatched verification backup")
    package_preview = build_migration_package_preview()
    local_counts = list_local_row_counts_for_tables(package_preview.insert_order)
    local_count_map = {record.table_name: record.row_count for record in local_counts}
    remote_hashes = build_local_table_content_fingerprints(package_preview.insert_order)
    remote_hashes["profiles"] = build_combined_content_fingerprint({"profiles": "different"})

    response = verify_neon_data_load(
        neon_table_lister=lambda _connection_url: package_preview.insert_order,
        neon_row_count_lister=lambda _connection_url, table_names: {
            table_name: local_count_map[table_name] for table_name in table_names
        },
        neon_table_content_fingerprints=lambda _connection_url, _table_names: remote_hashes,
    )

    assert response.verified is False
    assert response.row_counts_match is True
    assert response.content_fingerprint_match is False
    assert response.mismatched_tables == ["profiles"]


def test_neon_cutover_readiness_reports_verified_staging_but_blocks_runtime(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic cutover readiness backup")
    package_preview = build_migration_package_preview()
    local_counts = list_local_row_counts_for_tables(package_preview.insert_order)
    local_count_map = {record.table_name: record.row_count for record in local_counts}
    local_hashes = build_local_table_content_fingerprints(package_preview.insert_order)

    response = build_neon_cutover_readiness(
        neon_connector=lambda _connection_url: ("plum-duff-app-db", "neondb_owner"),
        neon_table_lister=lambda _connection_url: package_preview.insert_order,
        neon_row_count_lister=lambda _connection_url, table_names: {
            table_name: local_count_map[table_name] for table_name in table_names
        },
        neon_table_content_fingerprints=lambda _connection_url, _table_names: local_hashes,
    )

    assert response.staging_ready is True
    assert response.schema_ready is True
    assert response.data_verified is True
    assert response.runtime_cutover_ready is False
    assert "PostgreSQL runtime mode is not active." in response.blockers
    assert response.package_fingerprint == package_preview.package_fingerprint


def test_neon_cutover_readiness_blocks_mismatched_staging_data(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    settings.neon_database_url = (
        "postgresql://neondb_owner:secret@example.neon.tech/plum-duff-app-db?sslmode=require"
    )
    create_verified_local_backup(reason="Synthetic cutover mismatch backup")
    package_preview = build_migration_package_preview()
    local_counts = list_local_row_counts_for_tables(package_preview.insert_order)
    local_count_map = {record.table_name: record.row_count for record in local_counts}
    remote_hashes = build_local_table_content_fingerprints(package_preview.insert_order)
    remote_hashes["profiles"] = build_combined_content_fingerprint({"profiles": "different"})

    response = build_neon_cutover_readiness(
        neon_connector=lambda _connection_url: ("plum-duff-app-db", "neondb_owner"),
        neon_table_lister=lambda _connection_url: package_preview.insert_order,
        neon_row_count_lister=lambda _connection_url, table_names: {
            table_name: local_count_map[table_name] for table_name in table_names
        },
        neon_table_content_fingerprints=lambda _connection_url, _table_names: remote_hashes,
    )

    assert response.staging_ready is False
    assert response.data_verified is False
    assert "Neon data load verification did not pass." in response.blockers
    assert "Mismatched tables: profiles" in response.blockers
