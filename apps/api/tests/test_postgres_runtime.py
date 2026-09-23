from openforge_api import postgres_migrations, postgres_runtime
from openforge_api.postgres_runtime import DatabaseRow, translate_sqlite_placeholders


def test_database_row_matches_sqlite_mapping_and_positional_access() -> None:
    row = DatabaseRow(("profile_id", "display_name"), ("profile-1", "Demo"))

    assert row[0] == "profile-1"
    assert row["display_name"] == "Demo"
    assert dict(row) == {"profile_id": "profile-1", "display_name": "Demo"}


def test_placeholder_translation_preserves_quoted_question_marks() -> None:
    statement = "SELECT '?' AS literal, value FROM rows WHERE id = ? AND note = 'Is it?'"

    assert translate_sqlite_placeholders(statement) == (
        "SELECT '?' AS literal, value FROM rows WHERE id = %s AND note = 'Is it?'"
    )


def test_current_postgres_schema_does_not_reapply_migrations(monkeypatch) -> None:
    postgres_runtime.ensure_postgres_schema.cache_clear()
    monkeypatch.setattr(postgres_runtime, "_has_current_postgres_schema", lambda *_: True)
    monkeypatch.setattr(
        postgres_migrations,
        "apply_postgres_migrations",
        lambda *_: (_ for _ in ()).throw(AssertionError("migration must not run")),
    )

    assert postgres_runtime.ensure_postgres_schema("postgresql://synthetic/current") == (
        postgres_migrations.MIGRATION_ID
    )
    postgres_runtime.ensure_postgres_schema.cache_clear()


def test_missing_postgres_schema_runs_migration_once(monkeypatch) -> None:
    postgres_runtime.ensure_postgres_schema.cache_clear()
    calls: list[str] = []
    monkeypatch.setattr(postgres_runtime, "_has_current_postgres_schema", lambda *_: False)
    monkeypatch.setattr(
        postgres_migrations,
        "apply_postgres_migrations",
        lambda url: calls.append(url) or postgres_migrations.MIGRATION_ID,
    )

    assert postgres_runtime.ensure_postgres_schema("postgresql://synthetic/new") == (
        postgres_migrations.MIGRATION_ID
    )
    assert postgres_runtime.ensure_postgres_schema("postgresql://synthetic/new") == (
        postgres_migrations.MIGRATION_ID
    )
    assert calls == ["postgresql://synthetic/new"]
    postgres_runtime.ensure_postgres_schema.cache_clear()
