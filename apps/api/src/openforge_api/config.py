import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SOURCE_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    app_name: str = "Plum Duff API"
    environment: str = "local"
    database_mode: str = "local"
    database_url: str = "sqlite:///data/private/db/openforge.sqlite3"
    neon_database_url: str = ""
    backup_directory: str = "data/private/backups"
    source_instance_id: str = "local-fund-manager"
    account_catalogue_source: str = "data/reference/master-account-catalogue.json"
    tracker_seed_source: str = ""
    workbook_template_source: str = "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx"
    workbook_template_helper_source: str = "_input/MB Helpers.gs"
    workbook_template_structure_manifest: str = (
        "docs/contracts/workbook-template-export-v1-ledger-structure.json"
    )
    workbook_template_field_coverage: str = (
        "docs/contracts/workbook-template-export-v1-field-coverage.json"
    )
    cors_allow_origins: str = "http://localhost:3010,http://127.0.0.1:3010"
    cors_allow_origin_regex: str = ""
    auth_required: bool = False
    auth_public_base_url: str = "http://localhost:3010"
    auth_session_secret: str = ""
    auth_session_ttl_seconds: int = 43200
    auth_owner_emails: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    runtime_role: str = ""
    runtime_database_identity: str = ""
    runtime_source_root: str = ""
    runtime_source_revision: str = ""
    runtime_owner_approved_revision: str = ""
    runtime_frontend_endpoint: str = ""
    runtime_api_endpoint: str = ""
    runtime_environment_source: str = ""
    runtime_database_target_explicit: bool = False

    model_config = SettingsConfigDict(
        env_prefix="OPENFORGE_",
        env_file=SOURCE_ROOT / ".env",
        env_file_encoding="utf-8",
    )

    @property
    def database_path(self) -> Path:
        path = Path(self.database_url.removeprefix("sqlite:///"))
        return path if path.is_absolute() else SOURCE_ROOT / path

    @property
    def backup_path(self) -> Path:
        path = Path(self.backup_directory)
        return path if path.is_absolute() else SOURCE_ROOT / path

    @property
    def account_catalogue_source_path(self) -> Path:
        path = Path(self.account_catalogue_source)
        return path if path.is_absolute() else SOURCE_ROOT / path

    @property
    def tracker_seed_source_path(self) -> Path | None:
        if not self.tracker_seed_source.strip():
            return None
        path = Path(self.tracker_seed_source)
        return path if path.is_absolute() else SOURCE_ROOT / path

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
        return self.auth_required or self.hosted_environment

    @property
    def hosted_environment(self) -> bool:
        return self.environment.strip().lower() in {
            "production",
            "preview",
            "vercel",
        } or bool(os.getenv("VERCEL"))

    @property
    def hosted_persistence_ready(self) -> bool:
        return (
            not self.hosted_environment
            or (
                self.database_mode.strip().lower() in {"neon", "postgres", "postgresql"}
                and bool(self.neon_database_url.strip())
            )
        )

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
