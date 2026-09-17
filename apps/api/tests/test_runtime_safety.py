from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

from openforge_api.config import SOURCE_ROOT, Settings
from openforge_api.config import settings as active_settings
from openforge_api.db import connect
from openforge_api.runtime_safety import RuntimeSafetyError, validate_runtime_contract


def revision() -> str:
    return subprocess.run(
        ["git", "-C", str(SOURCE_ROOT), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def owner_database() -> Path:
    common = subprocess.run(
        ["git", "-C", str(SOURCE_ROOT), "rev-parse", "--path-format=absolute", "--git-common-dir"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    return Path(common).resolve().parent / "data/private/db/openforge.sqlite3"


def runtime_settings(tmp_path: Path, *, role: str = "candidate", **updates: object) -> Settings:
    values: dict[str, object] = {
        "runtime_role": role,
        "runtime_database_identity": f"{role}-fixture",
        "runtime_source_root": str(SOURCE_ROOT),
        "runtime_source_revision": revision(),
        "runtime_frontend_endpoint": "http://localhost:3910",
        "runtime_api_endpoint": "http://127.0.0.1:8910",
        "runtime_environment_source": "pytest:runtime-safety",
        "runtime_database_target_explicit": True,
        "database_mode": "local",
        "database_url": f"sqlite:///{tmp_path / 'isolated.sqlite3'}",
    }
    values.update(updates)
    return Settings(_env_file=None, **values)


def test_candidate_with_explicit_clone_database_passes(tmp_path: Path) -> None:
    identity = validate_runtime_contract(runtime_settings(tmp_path))
    assert identity.role == "candidate"
    assert identity.database_classification == "isolated"
    assert identity.database_engine == "sqlite"
    assert len(identity.database_fingerprint) == 16


def test_candidate_with_explicit_postgresql_database_passes_without_exposing_secret(
    tmp_path: Path,
) -> None:
    settings = runtime_settings(
        tmp_path,
        database_mode="postgresql",
        neon_database_url="postgresql://private-user:private-password@localhost:55432/candidate",
    )
    identity = validate_runtime_contract(settings)
    assert identity.database_engine == "postgresql"
    assert identity.database_classification == "isolated"
    assert "private-user" not in identity.database_fingerprint
    assert "private-password" not in identity.database_fingerprint


def test_candidate_without_explicit_database_fails_closed(tmp_path: Path) -> None:
    settings = runtime_settings(tmp_path, runtime_database_target_explicit=False)
    with pytest.raises(RuntimeSafetyError, match="explicit database target"):
        validate_runtime_contract(settings)


def test_candidate_cannot_select_normal_owner_database(tmp_path: Path) -> None:
    settings = runtime_settings(
        tmp_path,
        database_url=f"sqlite:///{owner_database()}",
    )
    with pytest.raises(RuntimeSafetyError, match="cannot use the normal-owner database"):
        validate_runtime_contract(settings)


def test_test_runtime_cannot_inherit_normal_owner_database(tmp_path: Path) -> None:
    settings = runtime_settings(
        tmp_path,
        role="test",
        runtime_database_identity="normal-owner",
        database_url=f"sqlite:///{owner_database()}",
    )
    with pytest.raises(RuntimeSafetyError, match="cannot use the normal-owner database"):
        validate_runtime_contract(settings)


def test_direct_database_connection_rejects_test_access_to_owner_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(active_settings, "runtime_role", "test")
    monkeypatch.setattr(active_settings, "runtime_database_identity", "pytest-direct-guard")
    monkeypatch.setattr(active_settings, "database_mode", "local")
    monkeypatch.setattr(
        active_settings,
        "database_url",
        f"sqlite:///{owner_database()}",
    )
    monkeypatch.setattr(active_settings, "runtime_database_target_explicit", True)
    with pytest.raises(RuntimeSafetyError, match="cannot use the normal-owner database"):
        with connect():
            pass


def test_normal_runtime_accepts_only_approved_source_and_owner_database(tmp_path: Path) -> None:
    settings = runtime_settings(
        tmp_path,
        role="normal-owner",
        runtime_database_identity="normal-owner",
        runtime_owner_approved_revision=revision(),
        database_url=f"sqlite:///{owner_database()}",
    )
    identity = validate_runtime_contract(settings)
    assert identity.database_classification == "normal-owner"


def test_relative_database_resolution_does_not_follow_current_directory(
    tmp_path: Path,
) -> None:
    original = Path.cwd()
    os.chdir(tmp_path)
    try:
        settings = Settings(_env_file=None, database_url="sqlite:///relative/test.sqlite3")
        assert settings.database_path == SOURCE_ROOT / "relative/test.sqlite3"
    finally:
        os.chdir(original)


def test_environment_file_discovery_does_not_follow_current_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    malicious_target = tmp_path / "wrong-owner.sqlite3"
    (tmp_path / ".env").write_text(
        f"OPENFORGE_DATABASE_URL=sqlite:///{malicious_target}\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("OPENFORGE_DATABASE_URL", raising=False)
    original = Path.cwd()
    os.chdir(tmp_path)
    try:
        discovered = Settings()
        assert discovered.database_path != malicious_target
        assert discovered.database_path == SOURCE_ROOT / "data/private/db/openforge.sqlite3"
    finally:
        os.chdir(original)
