from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_exchange_commission_settings_are_profile_scoped(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    save_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    assert save_response.status_code == 200
    saved = save_response.json()
    assert saved["profile_id"] == "profile-demo-001"
    assert saved["exchange_name"] == "Matchbook"
    assert saved["commission_rate"] == "0.02"

    profile_one_response = client.get("/profiles/profile-demo-001/exchange-commissions")
    assert profile_one_response.status_code == 200
    assert any(
        row["exchange_name"] == "Matchbook" and row["commission_rate"] == "0.02"
        for row in profile_one_response.json()
    )

    profile_two_response = client.get("/profiles/profile-demo-002/exchange-commissions")
    assert profile_two_response.status_code == 200
    assert not any(
        row["exchange_name"] == "Matchbook" and row["commission_rate"] == "0.02"
        for row in profile_two_response.json()
    )
