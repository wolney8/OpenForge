from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_profiles_routes_return_seeded_profiles(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    list_response = client.get("/profiles")
    assert list_response.status_code == 200
    profiles = list_response.json()
    assert any(profile["profile_id"] == "profile-demo-001" for profile in profiles)

    detail_response = client.get("/profiles/profile-demo-001")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["display_name"] == "Subscriber Alpha"
    assert detail["profile_code"] == "ALPHA-001"


def test_profile_detail_returns_404_for_unknown_profile(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/missing-profile")
    assert response.status_code == 404
