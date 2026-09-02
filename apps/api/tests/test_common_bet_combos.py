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
        "COMBO-DEMO-CASINO-FREE-SPINS",
    }
    seeded_by_id = {row["preset_id"]: row for row in seeded.json()}
    assert seeded_by_id.keys() >= expected_defaults
    assert seeded_by_id["COMBO-MBB-20260720-MIDNITE-BUILDER"]["bookmakers"] == ["Midnite"]
    assert seeded_by_id["COMBO-MBB-20260720-MIDNITE-BUILDER"]["default_back_stake"] == "10.00"
    assert all(
        seeded_by_id[preset_id]["bookmakers"]
        for preset_id in expected_defaults
        if preset_id != "COMBO-DEMO-CASINO-FREE-SPINS"
    )
    assert seeded_by_id["COMBO-DEMO-CASINO-FREE-SPINS"]["quick_add"]["enabled"] is True

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


def test_default_quick_action_bootstrap_is_idempotent_for_fresh_onboarding(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    first = client.get("/fund-manager/common-bet-combos?active_only=true")
    second = client.get("/fund-manager/common-bet-combos?active_only=true")

    assert first.status_code == 200
    assert second.status_code == 200
    first_ids = [row["preset_id"] for row in first.json()]
    second_ids = [row["preset_id"] for row in second.json()]
    assert first_ids == second_ids
    assert len(first_ids) == len(set(first_ids))


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


def test_quick_add_loadouts_inherit_and_isolate_profile_overrides(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    created = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "name": "Demo Profile Free Spins",
            "ledger_type": "Casino",
            "offer_type": "Free Spins",
            "offer_name": "Demo Free Spins",
            "spin_stake": "0.10",
            "free_spins_awarded": "10",
            "quick_add": {
                "enabled": True,
                "display_label": "Demo Profile Spins",
                "supported_ledgers": ["Casino"],
                "enabled_fields": ["spinStake", "spinCount"],
                "defaults": {"spinStake": "0.10", "spinCount": "10"},
                "allowed_profile_override_fields": ["spinStake"],
            },
        },
    )
    assert created.status_code == 201, created.text
    preset_id = created.json()["preset_id"]

    inherited = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-001"
    )
    assert inherited.status_code == 200, inherited.text
    inherited_row = next(row for row in inherited.json() if row["preset_id"] == preset_id)
    assert inherited_row["enabled"] is True
    assert inherited_row["defaults"]["spinStake"] == "0.10"
    assert inherited_row["allowed_profile_override_fields"] == ["spinStake"]

    hidden = client.put(
        f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{preset_id}",
        json={"enabled": False, "defaults": {"spinStake": "0.20"}},
    )
    assert hidden.status_code == 200, hidden.text
    hidden_rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-001?include_hidden=true"
    )
    hidden_row = next(row for row in hidden_rows.json() if row["preset_id"] == preset_id)
    assert hidden_row["enabled"] is False
    assert hidden_row["defaults"]["spinStake"] == "0.20"

    reenabled = client.put(
        f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{preset_id}",
        json={"enabled": True},
    )
    assert reenabled.status_code == 200, reenabled.text
    restored_rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-001"
    )
    restored_row = next(row for row in restored_rows.json() if row["preset_id"] == preset_id)
    assert restored_row["defaults"]["spinStake"] == "0.20"

    other_profile_rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-002"
    )
    other_profile_row = next(row for row in other_profile_rows.json() if row["preset_id"] == preset_id)
    assert other_profile_row["defaults"]["spinStake"] == "0.10"


def test_quick_add_favourites_are_profile_and_ledger_scoped(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    created = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "name": "Demo dual-ledger loadout",
            "ledger_type": "Casino",
            "quick_add": {
                "enabled": True,
                "display_label": "Demo dual ledger",
                "supported_ledgers": ["Casino", "Extra Place"],
            },
        },
    )
    assert created.status_code == 201, created.text
    preset_id = created.json()["preset_id"]

    favourite = client.put(
        f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{preset_id}/favourite",
        json={"ledger_type": "Casino", "is_favourite": True},
    )
    assert favourite.status_code == 200, favourite.text
    assert favourite.json()["favourite_order"] == 1

    rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-001"
    )
    assert rows.status_code == 200, rows.text
    casino_row = next(
        row for row in rows.json()
        if row["preset_id"] == preset_id and row["ledger_type"] == "Casino"
    )
    extra_place_row = next(
        row for row in rows.json()
        if row["preset_id"] == preset_id and row["ledger_type"] == "Extra Place"
    )
    assert casino_row["is_favourite"] is True
    assert casino_row["favourite_order"] == 1
    assert extra_place_row["is_favourite"] is False
    assert extra_place_row["favourite_order"] == 0

    other_profile_rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-002"
    )
    assert other_profile_rows.status_code == 200, other_profile_rows.text
    other_profile_row = next(
        row for row in other_profile_rows.json()
        if row["preset_id"] == preset_id and row["ledger_type"] == "Casino"
    )
    assert other_profile_row["is_favourite"] is False


def test_quick_add_favourites_are_limited_to_four_per_profile_ledger(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    preset_ids: list[str] = []
    for index in range(5):
        created = client.post(
            "/fund-manager/common-bet-combos",
            json={
                "name": f"Demo favourite {index}",
                "ledger_type": "Casino",
                "quick_add": {"enabled": True, "supported_ledgers": ["Casino"]},
            },
        )
        assert created.status_code == 201, created.text
        preset_ids.append(created.json()["preset_id"])

    for preset_id in preset_ids[:4]:
        response = client.put(
            f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{preset_id}/favourite",
            json={"ledger_type": "Casino", "is_favourite": True},
        )
        assert response.status_code == 200, response.text

    rejected = client.put(
        f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{preset_ids[4]}/favourite",
        json={"ledger_type": "Casino", "is_favourite": True},
    )
    assert rejected.status_code == 422
    assert "up to four" in rejected.json()["detail"]


def test_quick_add_loadout_rejects_blocked_profile_account_override(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    created = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "name": "Demo restricted Free Spins",
            "ledger_type": "Casino",
            "offer_type": "Free Spins",
            "quick_add": {
                "enabled": True,
                "supported_ledgers": ["Casino"],
            },
        },
    )
    assert created.status_code == 201, created.text
    account = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
                "account": "10Bet",
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Gubbed",
            "current_balance": "0.00",
            "pending_withdrawal_amount": "0.00",
            "last_balance_update": "",
            "group_name": "Demo Group",
            "platform": "Demo Platform",
        },
    )
    assert account.status_code == 201, account.text

    rejected = client.put(
        f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{created.json()['preset_id']}",
        json={"bookmaker_override": "10Bet"},
    )
    assert rejected.status_code == 422
    assert "cannot be used" in rejected.json()["detail"]


def test_required_global_quick_action_cannot_be_hidden_and_precedes_optional_actions(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    created = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "name": "Required Extra Place action",
            "ledger_type": "Extra Place",
            "quick_add": {
                "enabled": True,
                "supported_ledgers": ["Extra Place"],
                "enabled_fields": ["runner", "eachWayStake"],
                "enforcement": "required",
            },
        },
    )
    assert created.status_code == 201, created.text
    preset_id = created.json()["preset_id"]

    rejected = client.put(
        f"/fund-manager/common-bet-combos/profile-overrides/profile-demo-001/{preset_id}",
        json={"enabled": False},
    )
    assert rejected.status_code == 422
    assert "required" in rejected.json()["detail"].lower()

    rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-001?include_hidden=true"
    )
    assert rows.status_code == 200
    resolved = next(row for row in rows.json() if row["preset_id"] == preset_id)
    assert resolved["enforced"] is True
    assert resolved["enabled"] is True
    assert resolved["enabled_fields"] == ["runner", "eachWayStake"]


def test_profile_quick_actions_are_typed_and_profile_scoped(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    invalid = client.post(
        "/fund-manager/common-bet-combos/profile-actions/profile-demo-001",
        json={
            "ledger_type": "Casino",
            "label": "Unsafe action",
            "enabled_fields": ["formulaOverride"],
        },
    )
    assert invalid.status_code == 422

    created = client.post(
        "/fund-manager/common-bet-combos/profile-actions/profile-demo-001",
        json={
            "ledger_type": "Casino",
            "label": "Daily Free Spins",
            "enabled_fields": ["bookmaker", "spinCount", "spinStake"],
            "defaults": {"spinCount": "10", "spinStake": "0.10"},
        },
    )
    assert created.status_code == 201, created.text
    action_id = created.json()["preset_id"]
    assert created.json()["source"] == "profile"

    owner_rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-001?include_hidden=true"
    )
    assert any(row["preset_id"] == action_id for row in owner_rows.json())
    other_rows = client.get(
        "/fund-manager/common-bet-combos/profile-overrides/profile-demo-002?include_hidden=true"
    )
    assert not any(row["preset_id"] == action_id for row in other_rows.json())
