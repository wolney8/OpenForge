from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'common-bet-combos.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_common_bet_combos_are_seeded_and_versioned(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    seeded = client.get("/fund-manager/common-bet-combos")
    assert seeded.status_code == 200
    expected_defaults = {
        "COMBO-WEEKLY-BUILDER",
        "COMBO-LOSS-BACK",
        "COMBO-PROFIT-BOOST",
        "COMBO-BET-GET-SINGLE",
        "COMBO-BET-GET-IN-PLAY",
        "COMBO-BET-GET-ACCA",
        "COMBO-PRICE-BOOST",
        "COMBO-CASHBACK-HORSE",
        "COMBO-DDHH-FGS",
        "COMBO-MUG-NO-LAY",
        "COMBO-WEEKLY-RELOAD",
        "COMBO-WELCOME-SINGLE",
        "COMBO-ENHANCED-PRICE",
    }
    seeded_by_id = {row["preset_id"]: row for row in seeded.json()}
    assert seeded_by_id.keys() >= expected_defaults
    assert seeded_by_id["COMBO-MUG-NO-LAY"]["allowed_strategies"][0] == "No Lay"
    assert all(seeded_by_id[preset_id]["bookmakers"] == [] for preset_id in expected_defaults)

    created = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "name": "Demo Friday Builder",
            "ledger_type": "Sportsbook",
            "bookmakers": ["Bookmaker A", "Bookmaker B", "Bookmaker A"],
            "offer_type": "Bet & Get",
            "bet_type": "Bet Builder",
            "offer_name": "Weekly Reload",
            "fixture_type": "Football",
            "default_back_stake": "10",
            "minimum_back_odds": "2",
            "allowed_strategies": ["Standard", "Underlay"],
        },
    )
    assert created.status_code == 201, created.text
    preset = created.json()
    assert preset["default_back_stake"] == "10.00"
    assert preset["minimum_back_odds"] == "2.00"
    assert preset["bookmakers"] == ["Bookmaker A", "Bookmaker B"]
    assert preset["bookmaker"] == ""
    assert preset["version"] == 1

    updated = client.put(
        f"/fund-manager/common-bet-combos/{preset['preset_id']}",
        json={**preset, "status": "Archived", "name": "Demo Friday Builder Updated"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["version"] == 2
    assert updated.json()["status"] == "Archived"
    assert updated.json()["bookmakers"] == ["Bookmaker A", "Bookmaker B"]

    active = client.get("/fund-manager/common-bet-combos?active_only=true")
    assert active.status_code == 200
    assert preset["preset_id"] not in {row["preset_id"] for row in active.json()}
