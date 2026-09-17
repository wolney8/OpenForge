from __future__ import annotations

import shutil
from typing import Iterator

import pytest

from openforge_api.config import SOURCE_ROOT, settings


@pytest.fixture(scope="session", autouse=True)
def isolated_test_runtime(tmp_path_factory: pytest.TempPathFactory) -> Iterator[None]:
    """Bind the API suite to a disposable copy of the committed synthetic seed."""

    previous = {
        name: getattr(settings, name)
        for name in (
            "database_mode",
            "database_url",
            "neon_database_url",
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
    runtime = tmp_path_factory.mktemp("openforge-api-suite")
    database_path = (runtime / "api-test.sqlite3").resolve()
    shutil.copy2(SOURCE_ROOT / "data/private/db/openforge.sqlite3", database_path)
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{database_path}"
    settings.neon_database_url = ""
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
