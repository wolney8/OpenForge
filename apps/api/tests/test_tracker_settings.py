from pathlib import Path

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app

client = TestClient(app)


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    seed_synthetic_betting_context()


def test_selected_range_is_fund_manager_scoped_while_other_settings_remain_profile_scoped(
    tmp_path: Path,
) -> None:
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
    assert response.json()["default_exchange_name"] == ""
    assert response.json()["dashboard_view_mode"] == "High-Density"
    assert response.json()["weekly_profit_target"] == ""
    assert response.json()["monthly_profit_target"] == ""
    assert response.json()["annual_profit_target"] == ""
    assert response.json()["weekly_extra_place_loss_budget"] == "15"

    selected_range = client.put(
        "/fund-manager/preferences/selected-range",
        json={
            "selected_range_preset": "Custom",
            "selected_range_custom_start": "2026-06-01",
            "selected_range_custom_end": "2026-06-30",
        },
    )
    assert selected_range.status_code == 200

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
            "default_exchange_name": "Exchange A",
            "dashboard_view_mode": "Visual Comparison",
            "weekly_profit_target": "50",
            "monthly_profit_target": "250",
            "annual_profit_target": "3000",
            "weekly_extra_place_loss_budget": "22.50",
        },
    )
    assert save_response.status_code == 200
    assert save_response.json()["active_date_preset"] == "Custom"
    assert save_response.json()["mug_bet_frequency_days"] == 21
    assert save_response.json()["free_bet_expiry_alert_window_days"] == 5
    assert save_response.json()["use_global_date_range_toggle"] is False
    assert save_response.json()["default_bonus_retention_percent"] == "0.72"
    assert save_response.json()["default_exchange_name"] == "Exchange A"
    assert save_response.json()["dashboard_view_mode"] == "Visual Comparison"
    assert save_response.json()["weekly_profit_target"] == "50"

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
    assert roundtrip_response.json()["default_exchange_name"] == "Exchange A"
    assert roundtrip_response.json()["dashboard_view_mode"] == "Visual Comparison"
    assert roundtrip_response.json()["monthly_profit_target"] == "250"
    assert roundtrip_response.json()["annual_profit_target"] == "3000"
    assert roundtrip_response.json()["weekly_extra_place_loss_budget"] == "22.50"

    other_profile_response = client.get("/profiles/profile-demo-002/tracker-settings")
    assert other_profile_response.status_code == 200
    assert other_profile_response.json()["active_date_preset"] == "Custom"
    assert other_profile_response.json()["custom_start_date"] == "2026-06-01"
    assert other_profile_response.json()["mug_bet_frequency_days"] == 14
    assert other_profile_response.json()["free_bet_expiry_alert_window_days"] == 3
    assert other_profile_response.json()["use_global_date_range_toggle"] is True
    assert other_profile_response.json()["default_exchange_name"] == ""
    assert other_profile_response.json()["dashboard_view_mode"] == "High-Density"
    assert other_profile_response.json()["weekly_profit_target"] == ""

    from openforge_api.db import connect

    with connect() as connection:
        historical_profile_range = connection.execute(
            "SELECT active_date_preset, custom_start_date, custom_end_date "
            "FROM profile_tracker_settings WHERE profile_id = ?",
            ("profile-demo-001",),
        ).fetchone()
    assert tuple(historical_profile_range) == ("Week (Mon-Sun)", "", "")


def test_selected_range_preference_uses_product_default_and_persists(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    default = client.get("/fund-manager/preferences/selected-range")
    assert default.status_code == 200
    assert default.json() == {
        "selected_range_preset": "Week (Mon-Sun)",
        "selected_range_custom_start": None,
        "selected_range_custom_end": None,
    }
    saved = client.put(
        "/fund-manager/preferences/selected-range",
        json={
            "selected_range_preset": "Last Month",
            "selected_range_custom_start": "2020-01-01",
            "selected_range_custom_end": "2020-01-31",
        },
    )
    assert saved.status_code == 200
    assert saved.json()["selected_range_preset"] == "Last Month"
    assert saved.json()["selected_range_custom_start"] is None
    assert client.get("/profiles/profile-demo-002/tracker-settings").json()[
        "active_date_preset"
    ] == "Last Month"
