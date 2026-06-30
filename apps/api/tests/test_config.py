from openforge_api.config import settings


def test_default_database_path_targets_private_storage() -> None:
    assert str(settings.database_path) == "data/private/db/openforge.sqlite3"


def test_default_backup_path_targets_private_storage() -> None:
    assert str(settings.backup_path) == "data/private/backups"
