from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_settings(tmp_path: Path) -> None:
    settings.environment = "local"
    settings.auth_required = False
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'preferences-test.sqlite3'}"


def test_financial_motion_defaults_and_timing_persist(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    initial = client.get("/fund-manager/preferences/financial-motion")
    assert initial.status_code == 200
    assert initial.json() == {
        "enabled": True,
        "replay_delay_ms": 1500,
        "duration_ms": 520,
        "stagger_ms": 80,
    }

    saved = client.put(
        "/fund-manager/preferences/financial-motion",
        json={
            "enabled": False,
            "replay_delay_ms": 2000,
            "duration_ms": 700,
            "stagger_ms": 100,
        },
    )
    assert saved.status_code == 200
    assert saved.json() == {
        "enabled": False,
        "replay_delay_ms": 2000,
        "duration_ms": 700,
        "stagger_ms": 100,
    }

    partial = client.put(
        "/fund-manager/preferences/financial-motion",
        json={"enabled": True},
    )
    assert partial.status_code == 200
    assert partial.json() == {
        "enabled": True,
        "replay_delay_ms": 2000,
        "duration_ms": 700,
        "stagger_ms": 100,
    }

    fresh_client = TestClient(app)
    restored = fresh_client.get("/fund-manager/preferences/financial-motion")
    assert restored.status_code == 200
    assert restored.json() == {
        "enabled": True,
        "replay_delay_ms": 2000,
        "duration_ms": 700,
        "stagger_ms": 100,
    }


def test_financial_motion_rejects_unsupported_timing(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    response = client.put(
        "/fund-manager/preferences/financial-motion",
        json={"duration_ms": 123},
    )

    assert response.status_code == 422
    assert client.get("/fund-manager/preferences/financial-motion").json()["duration_ms"] == 520
