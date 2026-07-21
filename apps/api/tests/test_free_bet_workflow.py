from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import count_free_bet_audit_rows
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def free_bet_reminder_payload(**overrides: str) -> dict[str, str]:
    return {
        "event_name": "Synthetic Free-Bet Follow-Up",
        "offer_text": "Synthetic reminder offer",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Synthetic free-bet reminder",
        "fixture_type": "Football",
        "status": "Available",
        "result": "Pending",
        "retention_mode": "SNR",
        "free_bet_value": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Standard",
        "lay_odds_1": "5.20",
        "lay_actual": "7.72",
        "lay_matched_stake_1": "7.72",
        "lay_commission_1": "",
        "exchange_name": "Smarkets",
        "expiry_datetime": "2099-07-24T20:00:00",
        "date_settled": "",
        "origin_qual_bet_id": "",
        "offer_group_id": "",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
        **overrides,
    }


def test_free_bet_workflow_create_update_and_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Smarkets", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Free Bet Match",
        "offer_text": "Claimed free bet",
        "bookmaker": "Bookmaker A",
        "status": "Placed",
        "result": "Pending",
        "retention_mode": "SNR",
        "free_bet_value": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Standard",
        "lay_odds_1": "5.20",
        "lay_commission_1": "",
        "exchange_name": "Smarkets",
        "expiry_datetime": "2026-07-10T18:00:00",
        "date_settled": "2026-07-10",
        "user_notes": "Initial free-bet workflow entry",
        "manual_override_value": "",
        "manual_override_reason": ""
    }

    create_response = client.post("/profiles/profile-demo-001/free-bets", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["free_bet_id"]
    assert created["calculation_state"] == "resolved"
    assert created["projected_current_pnl"] is not None
    assert created["scenario_pnl_if_back_wins"] is not None
    assert created["scenario_pnl_if_lay_wins"] is not None
    assert created["base_reference_lay_stake"] is not None
    assert created["lay_commission_1"] == "0.02"

    list_profile_one = client.get("/profiles/profile-demo-001/free-bets")
    assert list_profile_one.status_code == 200
    assert any(row["free_bet_id"] == created["free_bet_id"] for row in list_profile_one.json())

    list_profile_two = client.get("/profiles/profile-demo-002/free-bets")
    assert list_profile_two.status_code == 200
    assert all(row["free_bet_id"] != created["free_bet_id"] for row in list_profile_two.json())

    updated_payload = {
        **payload,
        "status": "Settled",
        "result": "Back Won",
        "manual_override_value": "4.20",
        "manual_override_reason": "Final settlement correction"
    }
    update_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{created['free_bet_id']}",
        json=updated_payload,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["final_net_pnl"] == "4.20"

    wrong_profile_response = client.get(
        f"/profiles/profile-demo-002/free-bets/{created['free_bet_id']}"
    )
    assert wrong_profile_response.status_code == 404

    assert count_free_bet_audit_rows("profile-demo-001", created["free_bet_id"]) >= 2

    delete_response = client.delete(
        f"/profiles/profile-demo-001/free-bets/{created['free_bet_id']}"
    )
    assert delete_response.status_code == 204

    deleted_lookup = client.get(
        f"/profiles/profile-demo-001/free-bets/{created['free_bet_id']}"
    )
    assert deleted_lookup.status_code == 404


def test_free_bet_override_reason_is_required(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Smarkets", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    payload = {
        "event_name": "Manual Override Free Bet",
        "offer_text": "",
        "bookmaker": "Bookmaker A",
        "status": "Settled",
        "result": "Back Won",
        "retention_mode": "SR",
        "free_bet_value": "10.00",
        "back_odds": "3.50",
        "match_strategy": "Standard",
        "lay_odds_1": "3.70",
        "lay_commission_1": "",
        "exchange_name": "Smarkets",
        "expiry_datetime": "2026-07-14T12:00:00",
        "date_settled": "2026-07-14",
        "user_notes": "",
        "manual_override_value": "4.20",
        "manual_override_reason": ""
    }

    response = client.post("/profiles/profile-demo-001/free-bets", json=payload)
    assert response.status_code == 422


def test_seed_rows_load_into_dedicated_free_bet_table(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/profile-demo-001/free-bets")
    assert response.status_code == 200
    assert response.json()

    connection = sqlite3.connect(settings.database_path)
    count = connection.execute("SELECT COUNT(*) FROM free_bets").fetchone()[0]
    connection.close()
    assert count > 0


def test_free_bet_preview_uses_contract_backed_calculation_without_saving(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    commission_response = client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Smarkets", "commission_rate": "0.02"},
    )
    assert commission_response.status_code == 200

    tracker_settings_response = client.put(
        "/profiles/profile-demo-001/tracker-settings",
        json={
            "active_date_preset": "Week (Mon-Sun)",
            "custom_start_date": "",
            "custom_end_date": "",
            "range_back_days": 0,
            "range_forward_days": 0,
            "mug_bet_frequency_days": 14,
            "free_bet_expiry_alert_window_days": 3,
            "use_global_date_range_toggle": True,
            "this_month_mode": "Calendar",
            "default_free_bet_underlay_factor": "0.900",
            "default_free_bet_overlay_factor": "1.400",
            "default_bonus_retention_percent": "0.7",
        },
    )
    assert tracker_settings_response.status_code == 200

    payload = {
        "event_name": "Preview Free Bet",
        "offer_text": "Preview free bet",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Preview free bet",
        "fixture_type": "Football",
        "status": "Placed",
        "result": "Pending",
        "retention_mode": "SNR",
        "free_bet_value": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Standard",
        "lay_odds_1": "5.20",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Smarkets",
        "expiry_datetime": "2026-07-10T18:00:00",
        "date_settled": "2026-07-10",
        "origin_qual_bet_id": "",
        "offer_group_id": "",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    preview_response = client.post("/profiles/profile-demo-001/free-bets/preview", json=payload)
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["lay_commission_1"] == "0.02"
    assert preview["projected_current_pnl"] is not None
    assert preview["scenario_pnl_if_back_wins"] is not None
    assert preview["scenario_pnl_if_lay_wins"] is not None
    assert preview["base_reference_lay_stake"] is not None
    assert preview["underlay_reference_lay_stake"] == "6.95"
    assert preview["overlay_reference_lay_stake"] == "10.81"

    list_response = client.get("/profiles/profile-demo-001/free-bets")
    assert list_response.status_code == 200
    assert all(row["event_name"] != "Preview Free Bet" for row in list_response.json())


def test_free_bet_available_placeholder_can_be_saved_before_matching_plan_exists(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    payload = {
        "event_name": "Awaiting Award",
        "offer_text": "Expected free bet",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Expected free bet",
        "fixture_type": "Football",
        "status": "Not Yet Awarded",
        "result": "Pending",
        "retention_mode": "SNR",
        "free_bet_value": "",
        "back_odds": "",
        "match_strategy": "Standard",
        "lay_odds_1": "",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "",
        "expiry_datetime": "",
        "date_settled": "",
        "origin_qual_bet_id": "",
        "offer_group_id": "",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    response = client.post("/profiles/profile-demo-001/free-bets", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert created["calculation_state"] == "resolved"
    assert created["projected_current_pnl"] == "0.00"
    assert created["reporting_value"] == "0.00"
    assert created["counts_as_open"] is True
    assert created["lay_status"] == "Not Laid"


def test_free_bet_follow_up_reminder_lifecycle_is_audited_and_profile_scoped(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Smarkets", "commission_rate": "0.02"},
    )
    created_response = client.post(
        "/profiles/profile-demo-001/free-bets",
        json=free_bet_reminder_payload(),
    )
    assert created_response.status_code == 201
    created = created_response.json()
    free_bet_id = created["free_bet_id"]
    financial_snapshot = {
        key: created[key]
        for key in (
            "projected_current_pnl",
            "actual_net_pnl",
            "final_net_pnl",
            "reporting_value",
            "calculated_liability_1",
        )
    }

    wrong_profile_response = client.put(
        f"/profiles/profile-demo-002/free-bets/{free_bet_id}/follow-up-reminder",
        json={"state": "Active", "due_at": "2099-07-24T18:00:00"},
    )
    assert wrong_profile_response.status_code == 404

    create_reminder_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder",
        json={
            "state": "Active",
            "due_at": "2099-07-24T18:00:00",
            "reason": "",
        },
    )
    assert create_reminder_response.status_code == 200
    reminder_row = create_reminder_response.json()
    assert reminder_row["follow_up_reminder_state"] == "Active"
    assert reminder_row["follow_up_reminder_reason"] == ""
    assert {key: reminder_row[key] for key in financial_snapshot} == financial_snapshot

    duplicate_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder",
        json={"state": "Active", "due_at": "2099-07-24T17:00:00"},
    )
    assert duplicate_response.status_code == 409

    resolve_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder",
        json={"state": "Resolved", "resolution_note": "Synthetic follow-up completed."},
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["follow_up_reminder_state"] == "Resolved"

    reopen_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder",
        json={
            "state": "Active",
            "due_at": "2099-07-24T17:30:00",
            "reason": "Second synthetic follow-up",
        },
    )
    assert reopen_response.status_code == 200
    dismiss_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder",
        json={"state": "Dismissed", "resolution_note": "No longer required."},
    )
    assert dismiss_response.status_code == 200
    assert dismiss_response.json()["follow_up_reminder_state"] == "Dismissed"

    audit_response = client.get(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder/audit"
    )
    assert audit_response.status_code == 200
    assert {entry["action"] for entry in audit_response.json()} == {
        "follow_up_reminder_created",
        "follow_up_reminder_resolved",
        "follow_up_reminder_reopened",
        "follow_up_reminder_dismissed",
    }


def test_free_bet_follow_up_reminder_enforces_lifecycle_cutoff_and_terminal_status(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    available_response = client.post(
        "/profiles/profile-demo-001/free-bets",
        json=free_bet_reminder_payload(),
    )
    assert available_response.status_code == 201
    available_id = available_response.json()["free_bet_id"]

    after_expiry_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{available_id}/follow-up-reminder",
        json={"state": "Active", "due_at": "2099-07-24T21:00:00"},
    )
    assert after_expiry_response.status_code == 422
    assert "lifecycle cutoff" in after_expiry_response.json()["detail"]

    settled_response = client.post(
        "/profiles/profile-demo-001/free-bets",
        json=free_bet_reminder_payload(
            event_name="Synthetic Settled Free Bet",
            status="Settled",
            result="Back Won",
            date_settled="2099-07-24T19:00:00",
        ),
    )
    assert settled_response.status_code == 201
    settled_id = settled_response.json()["free_bet_id"]
    terminal_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{settled_id}/follow-up-reminder",
        json={"state": "Active", "due_at": "2099-07-24T18:00:00"},
    )
    assert terminal_response.status_code == 409
    assert "unfinished free-bet row" in terminal_response.json()["detail"]
