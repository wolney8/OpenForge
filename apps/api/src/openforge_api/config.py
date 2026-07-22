from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Plum Duff API"
    environment: str = "local"
    database_url: str = "sqlite:///data/private/db/openforge.sqlite3"
    backup_directory: str = "data/private/backups"
    source_instance_id: str = "local-fund-manager"
    account_catalogue_source: str = "data/reference/master-account-catalogue.json"

    model_config = SettingsConfigDict(
        env_prefix="OPENFORGE_",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @property
    def database_path(self) -> Path:
        return Path(self.database_url.removeprefix("sqlite:///"))

    @property
    def backup_path(self) -> Path:
        return Path(self.backup_directory)

    @property
    def account_catalogue_source_path(self) -> Path:
        return Path(self.account_catalogue_source)


settings = Settings()
