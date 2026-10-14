from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType

import pytest


def load_launcher() -> ModuleType:
    source = Path(__file__).resolve().parents[3] / "scripts" / "run-api-runtime.py"
    spec = importlib.util.spec_from_file_location("openforge_runtime_launcher", source)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_web_launcher() -> ModuleType:
    source = Path(__file__).resolve().parents[3] / "scripts" / "run-web-runtime.py"
    spec = importlib.util.spec_from_file_location("openforge_web_runtime_launcher", source)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_normal_owner_worktree_uses_primary_checkout_environment(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    launcher = load_launcher()
    worktree = tmp_path / "worktree"
    primary = tmp_path / "primary"
    worktree.mkdir()
    primary.mkdir()
    (primary / ".env").write_text("OPENFORGE_AUTH_REQUIRED=true\n", encoding="utf-8")
    monkeypatch.setattr(launcher, "REPOSITORY_ROOT", worktree)
    monkeypatch.setattr(launcher, "primary_checkout_root", lambda: primary)

    selected, classification = launcher.resolve_environment_file(
        role="normal-owner", explicit=None
    )

    assert selected == primary / ".env"
    assert classification == "primary-checkout-owner-env"


def test_candidate_does_not_inherit_primary_checkout_environment(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    launcher = load_launcher()
    worktree = tmp_path / "worktree"
    primary = tmp_path / "primary"
    worktree.mkdir()
    primary.mkdir()
    (primary / ".env").write_text("OPENFORGE_AUTH_REQUIRED=true\n", encoding="utf-8")
    monkeypatch.setattr(launcher, "REPOSITORY_ROOT", worktree)
    monkeypatch.setattr(launcher, "primary_checkout_root", lambda: primary)

    selected, classification = launcher.resolve_environment_file(
        role="candidate", explicit=None
    )

    assert selected is None
    assert classification == "process-environment-only"


def test_explicit_missing_environment_file_fails_closed(tmp_path: Path) -> None:
    launcher = load_launcher()

    with pytest.raises(ValueError, match="does not exist"):
        launcher.resolve_environment_file(
            role="normal-owner", explicit=str(tmp_path / "missing.env")
        )


def test_normal_owner_web_uses_same_primary_checkout_environment(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    api_launcher = load_launcher()
    web_launcher = load_web_launcher()
    worktree = tmp_path / "worktree"
    primary = tmp_path / "primary"
    worktree.mkdir()
    primary.mkdir()
    (primary / ".env").write_text(
        "OPENFORGE_AUTH_REQUIRED=true\n"
        "OPENFORGE_AUTH_PUBLIC_BASE_URL=http://localhost:3010\n"
        "OPENFORGE_AUTH_SESSION_SECRET=synthetic-session-secret-at-least-32-bytes\n"
        "OPENFORGE_AUTH_OWNER_EMAILS=owner@example.invalid\n",
        encoding="utf-8",
    )
    for launcher in (api_launcher, web_launcher):
        monkeypatch.setattr(launcher, "REPOSITORY_ROOT", worktree)
        monkeypatch.setattr(launcher, "primary_checkout_root", lambda: primary)

    api_environment, _ = api_launcher.resolve_environment_file(
        role="normal-owner", explicit=None
    )
    web_environment, classification = web_launcher.resolve_environment_file(
        role="normal-owner", explicit=None
    )

    assert web_environment == api_environment == primary / ".env"
    assert classification == "primary-checkout-owner-env"


def test_normal_owner_web_fails_closed_without_compatible_auth_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    launcher = load_web_launcher()
    for name in (
        "OPENFORGE_AUTH_REQUIRED",
        "OPENFORGE_AUTH_PUBLIC_BASE_URL",
        "OPENFORGE_AUTH_SESSION_SECRET",
        "OPENFORGE_AUTH_OWNER_EMAILS",
    ):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(ValueError, match="authentication environment is incomplete"):
        launcher.validate_auth_environment(
            role="normal-owner", frontend_endpoint="http://localhost:3010"
        )


def test_normal_owner_web_accepts_compatible_auth_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    launcher = load_web_launcher()
    monkeypatch.setenv("OPENFORGE_AUTH_REQUIRED", "true")
    monkeypatch.setenv("OPENFORGE_AUTH_PUBLIC_BASE_URL", "http://localhost:3010")
    monkeypatch.setenv(
        "OPENFORGE_AUTH_SESSION_SECRET", "synthetic-session-secret-at-least-32-bytes"
    )
    monkeypatch.setenv("OPENFORGE_AUTH_OWNER_EMAILS", "owner@example.invalid")

    launcher.validate_auth_environment(
        role="normal-owner", frontend_endpoint="http://localhost:3010"
    )
