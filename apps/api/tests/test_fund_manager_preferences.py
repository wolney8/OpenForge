from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import connect
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


def test_oddsmatcher_preferences_round_trip_and_saved_filter_lifecycle(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)

    initial = client.get("/fund-manager/preferences/oddsmatcher")
    assert initial.status_code == 200
    assert initial.json() == {
        "version": 1,
        "default_back_stake": "10.00",
        "exchange_commission_overrides": {},
        "excluded_bookmaker_identities": [],
        "excluded_exchange_identities": [],
        "show_arbs_default": False,
        "default_advanced": False,
        "data_source": "live",
        "saved_snapshot_id": "",
        "auto_update_back_odds": False,
        "auto_update_lay_odds": False,
        "saved_filters": [],
    }

    payload = {
        **initial.json(),
        "default_back_stake": "12.50",
        "exchange_commission_overrides": {"smarkets": "0.02"},
        "excluded_bookmaker_identities": ["bookmaker_a"],
        "show_arbs_default": True,
        "default_advanced": True,
        "data_source": "replay",
        "saved_snapshot_id": "20261026T203500Z-demo",
        "auto_update_back_odds": True,
        "auto_update_lay_odds": True,
        "saved_filters": [{
            "id": "filter-001",
            "name": "High rating",
            "description": "Premier League opportunities above the target rating.",
            "filters": {
                "competitions": ["soccer_epl"],
                "minRating": "97",
                "showArbs": True,
            },
        }],
    }
    saved = client.put("/fund-manager/preferences/oddsmatcher", json=payload)
    assert saved.status_code == 200
    assert saved.json()["saved_filters"][0]["name"] == "High rating"
    assert saved.json()["saved_filters"][0]["description"] == (
        "Premier League opportunities above the target rating."
    )
    assert saved.json()["data_source"] == "replay"
    assert saved.json()["saved_snapshot_id"] == "20261026T203500Z-demo"
    assert saved.json()["auto_update_back_odds"] is True
    assert saved.json()["auto_update_lay_odds"] is True
    assert TestClient(app).get("/fund-manager/preferences/oddsmatcher").json() == saved.json()

    renamed = saved.json()
    renamed["saved_filters"][0]["name"] = "Premier League value"
    assert client.put("/fund-manager/preferences/oddsmatcher", json=renamed).status_code == 200
    renamed["saved_filters"] = []
    deleted = client.put("/fund-manager/preferences/oddsmatcher", json=renamed)
    assert deleted.status_code == 200
    assert deleted.json()["saved_filters"] == []


def test_oddsmatcher_preferences_accept_legacy_filter_without_description(
    tmp_path: Path,
) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)
    base = client.get("/fund-manager/preferences/oddsmatcher").json()

    saved = client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={
            **base,
            "saved_filters": [{
                "id": "filter-legacy-001",
                "name": "Legacy filter",
                "filters": {"minRating": "97"},
            }],
        },
    )

    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert saved.json()["saved_filters"][0]["description"] == ""


def test_oddsmatcher_preferences_reject_invalid_contracts(tmp_path: Path) -> None:
    configure_temp_settings(tmp_path)
    client = TestClient(app)
    base = client.get("/fund-manager/preferences/oddsmatcher").json()

    assert client.put(
        "/fund-manager/preferences/oddsmatcher", json={**base, "unknown": True}
    ).status_code == 422
    assert client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={**base, "data_source": "replay", "saved_snapshot_id": ""},
    ).status_code == 422
    assert client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={**base, "saved_snapshot_id": "../../private"},
    ).status_code == 422
    assert client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={**base, "exchange_commission_overrides": {"smarkets": "2"}},
    ).status_code == 422
    assert client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={
            **base,
            "saved_filters": [{
                "id": "filter-001",
                "name": "Description too long",
                "description": "x" * 241,
                "filters": {},
            }],
        },
    ).status_code == 422
    assert client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={
            **base,
            "saved_filters": [{
                "id": "filter-001",
                "name": "Profile must not persist",
                "filters": {"profileId": "PROFILE-001"},
            }],
        },
    ).status_code == 422
    assert client.put(
        "/fund-manager/preferences/oddsmatcher",
        json={
            **base,
            "saved_filters": [{
                "id": "filter-001",
                "name": "Invalid custom range",
                "filters": {
                    "startTime": "CUSTOM",
                    "customStart": "2026-10-26T12:00",
                    "customEnd": "2026-10-25T12:00",
                },
            }],
        },
    ).status_code == 422
    duplicate = {
        **base,
        "saved_filters": [
            {"id": "filter-001", "name": "Value", "filters": {}},
            {"id": "filter-002", "name": " value ", "filters": {}},
        ],
    }
    assert client.put("/fund-manager/preferences/oddsmatcher", json=duplicate).status_code == 422

    with connect() as connection:
        connection.execute(
            """
            INSERT INTO fund_manager_settings (
              fund_manager_id, bookmaker_display_mode,
              oddsmatcher_preferences_json, created_at, updated_at
            ) VALUES ('fund-manager-local', 'Name', '{"version":999}', 'now', 'now')
            ON CONFLICT(fund_manager_id) DO UPDATE SET
              oddsmatcher_preferences_json = excluded.oddsmatcher_preferences_json
            """
        )
    invalid = client.get("/fund-manager/preferences/oddsmatcher")
    assert invalid.status_code == 503
    assert "require review" in invalid.json()["detail"]
