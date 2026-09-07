from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_settings(tmp_path: Path) -> None:
    settings.environment = "local"
    settings.auth_required = False
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'preferences-test.sqlite3'}"


def test_financial_motion_defaults_on_and_persists_off(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    initial = client.get("/fund-manager/preferences/financial-motion")
    assert initial.status_code == 200
    assert initial.json() == {"enabled": True}

    saved = client.put(
        "/fund-manager/preferences/financial-motion",
        json={"enabled": False},
    )
    assert saved.status_code == 200
    assert saved.json() == {"enabled": False}

    fresh_client = TestClient(app)
    restored = fresh_client.get("/fund-manager/preferences/financial-motion")
    assert restored.status_code == 200
    assert restored.json() == {"enabled": False}
