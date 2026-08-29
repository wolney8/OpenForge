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
