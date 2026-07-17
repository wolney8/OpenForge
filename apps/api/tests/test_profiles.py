from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_profile_audit_rows
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


def test_profile_metadata_can_be_updated_with_audit(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.patch(
        "/profiles/profile-demo-001",
        json={
            "display_name": "Synthetic Subscriber One",
            "profile_code": "SYNTH-001",
            "status": "Pending",
            "tracking_start_date": "2026-04-01",
            "management_fee_percent": "35.00",
            "investment_fee_percent": "10.00",
        },
    )

    assert response.status_code == 200
    profile = response.json()
    assert profile["display_name"] == "Synthetic Subscriber One"
    assert profile["profile_code"] == "SYNTH-001"
    assert profile["status"] == "Pending"
    assert profile["tracking_start_date"] == "2026-04-01"
    assert profile["management_fee_percent"] == "35.00"
    assert profile["investment_fee_percent"] == "10.00"
    assert count_profile_audit_rows("profile-demo-001") == 1


def test_profile_fees_cannot_exceed_one_hundred_percent(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.patch(
        "/profiles/profile-demo-001",
        json={"management_fee_percent": "80", "investment_fee_percent": "30"},
    )

    assert response.status_code == 422
    assert "cannot exceed 100%" in response.json()["detail"]


def test_profile_code_must_be_unique_and_tracking_start_cannot_be_future(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    duplicate_response = client.patch(
        "/profiles/profile-demo-001",
        json={"profile_code": "BRAVO-002"},
    )
    future_response = client.patch(
        "/profiles/profile-demo-001",
        json={"tracking_start_date": "2999-01-01"},
    )

    assert duplicate_response.status_code == 422
    assert duplicate_response.json()["detail"] == "Profile code must be unique"
    assert future_response.status_code == 422
    assert "cannot be in the future" in str(future_response.json()["detail"])
