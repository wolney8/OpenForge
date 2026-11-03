from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location(
    "cp117_fixture_runner", ROOT / "scripts/run-cp117-integration.py"
)
assert spec is not None and spec.loader is not None
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


@pytest.mark.parametrize(
    "ports",
    [
        (3010, 8127, 9127),
        (3127, 8010, 9127),
        (3127, 8127, 3010),
        (3127, 3127, 9127),
        (80, 8127, 9127),
    ],
)
def test_runner_refuses_owner_privileged_and_duplicate_ports(ports: tuple[int, int, int]) -> None:
    with pytest.raises(ValueError):
        runner.validate_ports(*ports)


def test_runner_does_not_inherit_owner_auth_or_provider_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENFORGE_AUTH_SESSION_SECRET", "SYNTHETIC-NORMAL-KEY-DO-NOT-COPY")
    monkeypatch.setenv("OPENFORGE_AUTH_OWNER_EMAILS", "owner@example.invalid")
    monkeypatch.setenv("OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET", "SYNTHETIC-PROVIDER-DO-NOT-COPY")
    first = runner.fixture_environment(ROOT, tmp_path, 3127, 8127)
    second = runner.fixture_environment(ROOT, tmp_path, 3127, 8127)
    assert first["OPENFORGE_AUTH_SESSION_SECRET"] != "SYNTHETIC-NORMAL-KEY-DO-NOT-COPY"
    assert first["OPENFORGE_AUTH_SESSION_SECRET"] != second["OPENFORGE_AUTH_SESSION_SECRET"]
    assert len(first["OPENFORGE_AUTH_SESSION_SECRET"]) >= 64
    assert first["OPENFORGE_AUTH_OWNER_EMAILS"] == "demo@example.invalid"
    assert first["OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET"] == ""
    assert first["OPENFORGE_THE_ODDS_API_KEY"] == ""
    assert first["OPENFORGE_E2E_AUTH_BYPASS"] == "false"
    assert first["OPENFORGE_RUNTIME_ROLE"] == "candidate"
    assert first["OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT"] == "true"
    assert str(tmp_path / "synthetic.sqlite3") in first["OPENFORGE_DATABASE_URL"]


def test_runner_refuses_automatic_private_inputs_without_reading_them(tmp_path: Path) -> None:
    runner.assert_clean_environment_sources(tmp_path)
    (tmp_path / ".env").write_text("SYNTHETIC_PRIVATE_INPUT=must-not-be-loaded\n")
    with pytest.raises(ValueError, match="environment"):
        runner.assert_clean_environment_sources(tmp_path)
    (tmp_path / ".env").unlink()
    (tmp_path / "_input").mkdir()
    (tmp_path / "_input/workbook.xlsx").write_bytes(b"synthetic placeholder")
    with pytest.raises(ValueError, match="workbook"):
        runner.assert_clean_environment_sources(tmp_path)
