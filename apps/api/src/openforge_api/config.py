from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "OpenForge API"
    environment: str = "local"
    database_url: str = "sqlite:///data/private/db/openforge.sqlite3"
    backup_directory: str = "data/private/backups"

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


settings = Settings()
