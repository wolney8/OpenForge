from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_active_partial_lay_reminders_feed_fund_manager_notifications(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    create_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json={
            "event_name": "Synthetic Notification Match",
            "offer_text": "Synthetic notification offer",
            "bookmaker": "Bookmaker A",
            "offer_type": "Bet & Get",
            "bet_type": "Single",
            "fixture_type": "Football",
            "status": "Placed",
            "result": "Pending",
            "back_stake": "10.00",
            "back_odds": "2.10",
            "match_strategy": "Partial Lay",
            "lay_odds_1": "2.20",
            "lay_actual": "9.63",
            "lay_matched_stake_1": "4.78",
            "exchange_name": "Matchbook",
            "date_settled": "2099-07-23T20:00:00Z",
        },
    )
    assert create_response.status_code == 201
    sportsbook_bet_id = create_response.json()["sportsbook_bet_id"]

    reminder_response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/"
        f"{sportsbook_bet_id}/partial-lay-reminder",
        json={
            "state": "Active",
            "due_at": "2099-07-23T18:00:00Z",
            "reason": "Check the remaining synthetic lay exposure.",
        },
    )
    assert reminder_response.status_code == 200

    feed_response = client.get("/fund-manager/notifications")
    assert feed_response.status_code == 200
    notifications = feed_response.json()
    notification = next(
        item for item in notifications if item["record_id"] == sportsbook_bet_id
    )
    assert notification["audience"] == "fund_manager"
    assert notification["kind"] == "task"
    assert notification["task_state"] == "new"
    assert notification["notification_type"] == "partial_lay_reminder"
    assert notification["title"] == "Partial lay recheck"
    assert notification["profile_id"] == "profile-demo-001"
    assert notification["profile_name"] == "Subscriber Alpha"
    assert notification["ledger_label"] == "Sportsbook Bets"
    assert notification["bookmaker_label"] == "Bookmaker A"
    assert notification["message"] == "Synthetic Notification Match"
    assert notification["settles_at"] == "2099-07-23T20:00:00Z"
    assert notification["tone"] == "warning"
    assert notification["href"].endswith(
        f"sportsbook-bets?record={sportsbook_bet_id}&source=notifications"
    )
    assert notification["completion_href"].endswith(
        f"sportsbook-bets/{sportsbook_bet_id}/partial-lay-reminder"
    )

    resolve_response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/"
        f"{sportsbook_bet_id}/partial-lay-reminder",
        json={
            "state": "Resolved",
            "resolution_note": "Synthetic reminder reviewed.",
        },
    )
    assert resolve_response.status_code == 200

    resolved_feed_response = client.get("/fund-manager/notifications")
    assert resolved_feed_response.status_code == 200
    resolved_notification = next(
        item
        for item in resolved_feed_response.json()
        if item["record_id"] == sportsbook_bet_id
    )
    assert resolved_notification["task_state"] == "done"
    assert resolved_notification["title"] == "Partial lay recheck completed"
    assert resolved_notification["ledger_label"] == "Sportsbook Bets"
    assert resolved_notification["bookmaker_label"] == "Bookmaker A"
    assert resolved_notification["message"] == "Synthetic Notification Match"

    reopen_response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/"
        f"{sportsbook_bet_id}/partial-lay-reminder",
        json={
            "state": "Active",
            "due_at": "2099-07-23T18:00:00Z",
            "reason": "Recheck the remaining synthetic exposure.",
        },
    )
    assert reopen_response.status_code == 200

    dismiss_response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/"
        f"{sportsbook_bet_id}/partial-lay-reminder",
        json={
            "state": "Dismissed",
            "resolution_note": "Synthetic reminder no longer applies.",
        },
    )
    assert dismiss_response.status_code == 200
    dismissed_feed = client.get("/fund-manager/notifications")
    assert dismissed_feed.status_code == 200
    assert sportsbook_bet_id not in {
        item["record_id"] for item in dismissed_feed.json()
    }


def test_resolved_partial_lay_notification_expires_after_settlement(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Matchbook", "commission_rate": "0.02"},
    )
    create_response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json={
            "event_name": "Synthetic Completed Match",
            "offer_text": "Synthetic completed offer",
            "bookmaker": "Bookmaker A",
            "offer_type": "Bet & Get",
            "bet_type": "Single",
            "fixture_type": "Football",
            "status": "Placed",
            "result": "Pending",
            "back_stake": "10.00",
            "back_odds": "2.10",
            "match_strategy": "Partial Lay",
            "lay_odds_1": "2.20",
            "lay_actual": "9.63",
            "lay_matched_stake_1": "4.78",
            "exchange_name": "Matchbook",
            "date_settled": "2026-07-20T20:00:00Z",
        },
    )
    assert create_response.status_code == 201
    sportsbook_bet_id = create_response.json()["sportsbook_bet_id"]

    reminder_response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/"
        f"{sportsbook_bet_id}/partial-lay-reminder",
        json={
            "state": "Active",
            "due_at": "2026-07-20T18:00:00Z",
            "reason": "Check the synthetic completed exposure.",
        },
    )
    assert reminder_response.status_code == 200
    resolve_response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/"
        f"{sportsbook_bet_id}/partial-lay-reminder",
        json={
            "state": "Resolved",
            "resolution_note": "Synthetic completed reminder reviewed.",
        },
    )
    assert resolve_response.status_code == 200

    feed_response = client.get("/fund-manager/notifications")
    assert feed_response.status_code == 200
    assert sportsbook_bet_id not in {
        item["record_id"] for item in feed_response.json()
    }


def test_free_bet_follow_up_reminders_feed_and_complete_from_notifications(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    client.put(
        "/profiles/profile-demo-001/exchange-commissions",
        json={"exchange_name": "Smarkets", "commission_rate": "0.02"},
    )
    create_response = client.post(
        "/profiles/profile-demo-001/free-bets",
        json={
            "event_name": "Synthetic Free-Bet Notification",
            "offer_text": "Synthetic follow-up offer",
            "bookmaker": "Bookmaker A",
            "offer_type": "Bet & Get",
            "bet_type": "Single",
            "offer_name": "Synthetic free-bet notification",
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
        },
    )
    assert create_response.status_code == 201
    free_bet_id = create_response.json()["free_bet_id"]
    reminder_response = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}/follow-up-reminder",
        json={
            "state": "Active",
            "due_at": "2099-07-24T18:00:00",
            "reason": "Review the free-bet conversion.",
        },
    )
    assert reminder_response.status_code == 200

    feed_response = client.get("/fund-manager/notifications")
    assert feed_response.status_code == 200
    notification = next(
        item for item in feed_response.json() if item["record_id"] == free_bet_id
    )
    assert notification["notification_type"] == "free_bet_follow_up_reminder"
    assert notification["ledger_label"] == "Free Bets"
    assert notification["bookmaker_label"] == "Bookmaker A"
    assert notification["message"] == "Synthetic Free-Bet Notification"
    assert notification["task_state"] == "new"
    assert notification["href"].endswith(
        f"free-bets?record={free_bet_id}&source=notifications"
    )
    assert notification["completion_href"].endswith(
        f"free-bets/{free_bet_id}/follow-up-reminder"
    )

    complete_response = client.put(
        notification["completion_href"],
        json={
            "state": "Resolved",
            "resolution_note": "Completed from the synthetic notification centre.",
        },
    )
    assert complete_response.status_code == 200
    completed_feed = client.get("/fund-manager/notifications").json()
    completed = next(item for item in completed_feed if item["record_id"] == free_bet_id)
    assert completed["task_state"] == "done"
    assert completed["title"] == "Free-bet follow-up completed"
