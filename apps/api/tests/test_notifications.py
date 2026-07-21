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
