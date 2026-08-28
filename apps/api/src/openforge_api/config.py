import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Plum Duff API"
    environment: str = "local"
    database_mode: str = "local"
    database_url: str = "sqlite:///data/private/db/openforge.sqlite3"
    neon_database_url: str = ""
    backup_directory: str = "data/private/backups"
    source_instance_id: str = "local-fund-manager"
    account_catalogue_source: str = "data/reference/master-account-catalogue.json"
    cors_allow_origins: str = "http://localhost:3010,http://127.0.0.1:3010"
    cors_allow_origin_regex: str = ""
    auth_required: bool = False
    auth_public_base_url: str = "http://localhost:3010"
    auth_session_secret: str = ""
    auth_session_ttl_seconds: int = 43200
    auth_owner_emails: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""

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

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_allow_origins.split(",")
            if origin.strip()
        ]

    @property
    def cors_origin_regex(self) -> str | None:
        value = self.cors_allow_origin_regex.strip()
        return value or None

    @property
    def authentication_required(self) -> bool:
        hosted_environment = self.environment.strip().lower() in {
            "production",
            "preview",
            "vercel",
        }
        return self.auth_required or hosted_environment or bool(os.getenv("VERCEL"))

    @property
    def owner_emails(self) -> set[str]:
        return {
            email.strip().casefold()
            for email in self.auth_owner_emails.split(",")
            if email.strip()
        }

    @property
    def auth_origin(self) -> str:
        return self.auth_public_base_url.strip().rstrip("/")


settings = Settings()
