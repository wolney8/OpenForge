from __future__ import annotations

from pathlib import Path
from typing import Iterator

import pytest

from openforge_api.config import SOURCE_ROOT, settings


@pytest.fixture(autouse=True)
def isolated_test_runtime(tmp_path: Path) -> Iterator[None]:
    """Give every API test fresh storage and committed synthetic source data."""

    previous = {
        name: getattr(settings, name)
        for name in (
            "database_mode",
            "database_url",
            "neon_database_url",
            "backup_directory",
            "account_catalogue_source",
            "tracker_seed_source",
            "environment",
            "auth_required",
            "auth_owner_emails",
            "auth_session_secret",
            "runtime_role",
            "runtime_database_identity",
            "runtime_source_root",
            "runtime_source_revision",
            "runtime_owner_approved_revision",
            "runtime_frontend_endpoint",
            "runtime_api_endpoint",
            "runtime_environment_source",
            "runtime_database_target_explicit",
        )
    }
    database_path = (tmp_path / "api-test.sqlite3").resolve()
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{database_path}"
    settings.neon_database_url = ""
    settings.backup_directory = str(tmp_path / "backups")
    settings.account_catalogue_source = str(
        SOURCE_ROOT / "tests/fixtures/openforge-api-master-catalogue.synthetic.json"
    )
    settings.tracker_seed_source = ""
    settings.environment = "test"
    settings.auth_required = False
    settings.auth_owner_emails = ""
    settings.auth_session_secret = ""
    settings.runtime_role = "test"
    settings.runtime_database_identity = "pytest-committed-synthetic-seed"
    settings.runtime_source_root = str(SOURCE_ROOT)
    settings.runtime_source_revision = "pytest-source"
    settings.runtime_owner_approved_revision = ""
    settings.runtime_frontend_endpoint = "http://localhost:3999"
    settings.runtime_api_endpoint = "http://127.0.0.1:8999"
    settings.runtime_environment_source = "pytest:session-isolation"
    settings.runtime_database_target_explicit = True
    try:
        yield
    finally:
        for name, value in previous.items():
            setattr(settings, name, value)
