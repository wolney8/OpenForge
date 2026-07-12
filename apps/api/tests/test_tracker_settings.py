from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app

client = TestClient(app)


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_tracker_settings_are_profile_scoped_and_persist(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)

    response = client.get("/profiles/profile-demo-001/tracker-settings")
    assert response.status_code == 200
    assert response.json()["active_date_preset"] == "Week (Mon-Sun)"
    assert response.json()["free_bet_expiry_alert_window_days"] == 3
    assert response.json()["use_global_date_range_toggle"] is True
    assert response.json()["this_month_mode"] == "Calendar"
    assert response.json()["default_free_bet_underlay_factor"] == "0.928"
    assert response.json()["default_free_bet_overlay_factor"] == "1.3"
    assert response.json()["default_bonus_retention_percent"] == "0.7"

    save_response = client.put(
        "/profiles/profile-demo-001/tracker-settings",
        json={
            "active_date_preset": "Custom",
            "custom_start_date": "2026-06-01",
            "custom_end_date": "2026-06-30",
            "range_back_days": 2,
            "range_forward_days": 1,
            "mug_bet_frequency_days": 21,
            "free_bet_expiry_alert_window_days": 5,
            "use_global_date_range_toggle": False,
            "this_month_mode": "Calendar",
            "default_free_bet_underlay_factor": "0.94",
            "default_free_bet_overlay_factor": "1.25",
            "default_bonus_retention_percent": "0.72",
        },
    )
    assert save_response.status_code == 200
    assert save_response.json()["active_date_preset"] == "Custom"
    assert save_response.json()["mug_bet_frequency_days"] == 21
    assert save_response.json()["free_bet_expiry_alert_window_days"] == 5
    assert save_response.json()["use_global_date_range_toggle"] is False
    assert save_response.json()["default_bonus_retention_percent"] == "0.72"

    roundtrip_response = client.get("/profiles/profile-demo-001/tracker-settings")
    assert roundtrip_response.status_code == 200
    assert roundtrip_response.json()["custom_start_date"] == "2026-06-01"
    assert roundtrip_response.json()["range_back_days"] == 2
    assert roundtrip_response.json()["mug_bet_frequency_days"] == 21
    assert roundtrip_response.json()["free_bet_expiry_alert_window_days"] == 5
    assert roundtrip_response.json()["use_global_date_range_toggle"] is False
    assert roundtrip_response.json()["default_free_bet_underlay_factor"] == "0.94"
    assert roundtrip_response.json()["default_free_bet_overlay_factor"] == "1.25"
    assert roundtrip_response.json()["default_bonus_retention_percent"] == "0.72"

    other_profile_response = client.get("/profiles/profile-demo-002/tracker-settings")
    assert other_profile_response.status_code == 200
    assert other_profile_response.json()["active_date_preset"] == "Week (Mon-Sun)"
    assert other_profile_response.json()["custom_start_date"] == ""
    assert other_profile_response.json()["mug_bet_frequency_days"] == 14
    assert other_profile_response.json()["free_bet_expiry_alert_window_days"] == 3
    assert other_profile_response.json()["use_global_date_range_toggle"] is True
