from openforge_api.config import Settings


def test_default_database_path_targets_private_storage() -> None:
    assert str(Settings().database_path) == "data/private/db/openforge.sqlite3"


def test_default_backup_path_targets_private_storage() -> None:
    assert str(Settings().backup_path) == "data/private/backups"


def test_default_master_account_catalogue_is_a_committed_reference_source() -> None:
    assert str(Settings().account_catalogue_source_path) == (
        "data/reference/master-account-catalogue.json"
    )


def test_public_api_name_uses_plum_duff_brand() -> None:
    assert Settings().app_name == "Plum Duff API"
