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
        "COMBO-MBB-20260720-SKY-2UP",
        "COMBO-MBB-20260720-LADBROKES-2UP",
        "COMBO-MBB-20260720-CORAL-2UP",
        "COMBO-MBB-20260720-TOTE-ACCA",
        "COMBO-MBB-20260720-TALKSPORT-FOOTIE",
        "COMBO-MBB-20260720-SKY-CLUB",
        "COMBO-MBB-20260720-PADDY-REWARDS",
        "COMBO-MBB-20260720-MIDNITE-BUILDER",
        "COMBO-MBB-20260720-MIDNITE-ACCA",
        "COMBO-MBB-20260720-MIDNITE-BET-CLUB",
        "COMBO-MBB-20260720-LOTTOLAND-CLUB",
        "COMBO-MBB-20260720-DAZN-BOXING",
        "COMBO-MBB-20260720-DAZN-RACING",
        "COMBO-MBB-20260720-BOYLE-WEEKLY",
        "COMBO-MBB-20260720-BETWAY-CLUB",
        "COMBO-MBB-20260720-BETVICTOR-ACCA",
        "COMBO-MBB-20260720-BET600-MONDAY",
        "COMBO-MBB-20260720-BETUK-WEEKLY",
        "COMBO-MBB-20260720-888-ACCA",
        "COMBO-MBB-20260720-PADDY-CASHBACK",
        "COMBO-MBB-20260720-UNIBET-UNIBOOST",
    }
    seeded_by_id = {row["preset_id"]: row for row in seeded.json()}
    assert seeded_by_id.keys() >= expected_defaults
    assert seeded_by_id["COMBO-MBB-20260720-MIDNITE-BUILDER"]["bookmakers"] == ["Midnite"]
    assert seeded_by_id["COMBO-MBB-20260720-MIDNITE-BUILDER"]["default_back_stake"] == "10.00"
    assert all(seeded_by_id[preset_id]["bookmakers"] for preset_id in expected_defaults)

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
            "default_strategy": "Underlay",
            "allowed_strategies": ["Standard", "Underlay"],
        },
    )
    assert created.status_code == 201, created.text
    preset = created.json()
    assert preset["default_back_stake"] == "10.00"
    assert preset["minimum_back_odds"] == "2.00"
    assert preset["default_strategy"] == "Underlay"
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


def test_retired_seed_is_removed_without_deleting_custom_presets(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    retired = client.post(
        "/fund-manager/common-bet-combos",
        json={"preset_id": "COMBO-WEEKLY-BUILDER", "name": "Retired seed"},
    )
    custom = client.post(
        "/fund-manager/common-bet-combos",
        json={"preset_id": "DEMO-COMBO-001", "name": "Fund Manager custom combo"},
    )
    assert retired.status_code == 201
    assert custom.status_code == 201

    refreshed = client.get("/fund-manager/common-bet-combos")
    refreshed_ids = {row["preset_id"] for row in refreshed.json()}
    assert "COMBO-WEEKLY-BUILDER" not in refreshed_ids
    assert "DEMO-COMBO-001" in refreshed_ids


def test_casino_common_combo_round_trips_descriptive_defaults(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    created = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "name": "Demo Free Spins Combo",
            "ledger_type": "Casino",
            "bookmakers": ["Bookmaker A"],
            "offer_type": "Free Spins",
            "offer_name": "Demo Weekly Spins",
            "game": "Demo Slot",
            "spin_stake": "0.10",
            "free_spins_awarded": "20",
            "free_spins_value": "2",
        },
    )

    assert created.status_code == 201, created.text
    preset = created.json()
    assert preset["ledger_type"] == "Casino"
    assert preset["bookmakers"] == ["Bookmaker A"]
    assert preset["game"] == "Demo Slot"
    assert preset["spin_stake"] == "0.10"
    assert preset["free_spins_awarded"] == "20.00"
    assert preset["free_spins_value"] == "2.00"
    assert preset["default_back_stake"] == ""

    updated = client.put(
        f"/fund-manager/common-bet-combos/{preset['preset_id']}",
        json={**preset, "bonus_amount": "5", "status": "Archived"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["bonus_amount"] == "5.00"
    assert updated.json()["version"] == 2
