"""Independent recorded-evidence fixtures for the existing notification feed."""

from datetime import UTC, datetime

import pytest
from test_free_bet_workflow import free_bet_reminder_payload
from test_notifications import authenticated_test_client, configure_temp_database

from openforge_api import notifications
from openforge_api.db import connect, list_notification_events

NOW = datetime(2026, 9, 25, 10, tzinfo=UTC)


def reward(client, expiry, *, status="Available"):
    response = client.post("/profiles/profile-demo-001/free-bets", json=free_bet_reminder_payload())
    assert response.status_code == 201, response.text
    row_id = response.json()["free_bet_id"]
    with connect() as connection:
        connection.execute(
            "UPDATE free_bets SET expiry_datetime=?,status=? WHERE free_bet_id=?",
            (expiry, status, row_id),
        )
    return row_id


@pytest.mark.parametrize(
    "expiry,expected",
    [
        ("2026-09-27T12:00:00Z", True),
        ("2026-09-28T22:59:59Z", True),  # final second of London day3
        ("2026-09-28T23:00:00Z", False),
        ("2026-09-29T12:00:00Z", False),
        ("2026-09-25T09:59:59Z", False),
        ("", False),
    ],
)
def test_expiry_uses_profile_calendar_day_window_and_known_dates(tmp_path, expiry, expected):
    configure_temp_database(tmp_path)
    client = authenticated_test_client()
    row_id = reward(client, expiry)
    items = notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    assert (
        any(
            item.record_id == row_id and item.notification_type == "free_bet_expiry"
            for item in items
        )
        is expected
    )


def test_zero_day_setting_terminal_state_and_actual_not_planned_source(tmp_path):
    configure_temp_database(tmp_path)
    client = authenticated_test_client()
    row_id = reward(client, "2026-09-25T22:59:00Z")
    with connect() as connection:
        connection.execute(
            "INSERT INTO "
            "profile_tracker_settings(profile_id,active_date_preset,custom_start_date,"
            "custom_end_date,created_at,updated_at,free_bet_expiry_alert_window_days) "
            "VALUES ('profile-demo-001','All Dates','','','2026-09-25','2026-09-25',0) ON "
            "CONFLICT(profile_id) DO UPDATE SET free_bet_expiry_alert_window_days=0"
        )
    assert any(
        i.record_id == row_id
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )
    with connect() as connection:
        connection.execute(
            "UPDATE free_bets SET expiry_datetime='2026-09-26T00:00:00Z' WHERE free_bet_id=?",
            (row_id,),
        )
    assert not any(
        i.record_id == row_id
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )
    with connect() as connection:
        connection.execute(
            "UPDATE profile_tracker_settings SET free_bet_expiry_alert_window_days=5 WHERE "
            "profile_id='profile-demo-001'"
        )
    assert any(
        i.record_id == row_id
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )
    with connect() as connection:
        connection.execute("UPDATE free_bets SET status='Settled' WHERE free_bet_id=?", (row_id,))
    assert not any(
        i.record_id == row_id
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )


def test_settlement_evidence_dedup_clear_notes_and_resolution(tmp_path, monkeypatch):
    configure_temp_database(tmp_path)
    client = authenticated_test_client()
    row_id = reward(client, "", status="Placed")
    first = client.get("/fund-manager/notifications")
    assert first.status_code == 200
    task = next(i for i in first.json() if i["record_id"] == row_id)
    assert task["notification_type"] == "settlement_review"
    assert task["due_at"] == "" and task["completion_href"] == ""
    assert "result Pending" in task["message"]
    assert task["href"].endswith(f"free-bets?record={row_id}&source=tasks")
    assert (
        client.put(
            "/fund-manager/notifications/state",
            json={"read_keys": [], "dismissed_ids": [task["notification_id"]]},
        ).status_code
        == 200
    )
    with connect() as connection:
        before = dict(
            connection.execute("SELECT * FROM free_bets WHERE free_bet_id=?", (row_id,)).fetchone()
        )
        connection.execute(
            "UPDATE free_bets SET user_notes='Synthetic Notes only',updated_at='2099-01-01' "
            "WHERE free_bet_id=?",
            (row_id,),
        )
    for _ in range(2):
        current = client.get("/fund-manager/notifications").json()
        assert (
            next(i for i in current if i["record_id"] == row_id)["notification_id"]
            == task["notification_id"]
        )
    history = list_notification_events("notification-test@example.invalid")
    assert sum(i["notification_id"] == task["notification_id"] for i in history) == 1
    assert (
        task["notification_id"]
        in client.get("/fund-manager/notifications/state").json()["dismissed_ids"]
    )
    with connect() as connection:
        after = dict(
            connection.execute("SELECT * FROM free_bets WHERE free_bet_id=?", (row_id,)).fetchone()
        )
    assert {k: v for k, v in before.items() if k not in {"user_notes", "updated_at"}} == {
        k: v for k, v in after.items() if k not in {"user_notes", "updated_at"}
    }
    with connect() as connection:
        connection.execute(
            "UPDATE free_bets SET date_settled='2026-09-25T11:00:00Z',result='Back Won' WHERE "
            "free_bet_id=?",
            (row_id,),
        )
    changed = next(
        i for i in client.get("/fund-manager/notifications").json() if i["record_id"] == row_id
    )
    assert (
        changed["notification_id"] != task["notification_id"] and "Back Won" in changed["message"]
    )
    with connect() as connection:
        connection.execute("UPDATE free_bets SET status='Void' WHERE free_bet_id=?", (row_id,))
    assert not any(
        i["record_id"] == row_id for i in client.get("/fund-manager/notifications").json()
    )
    assert any(
        i["notification_id"] == task["notification_id"]
        for i in client.get("/fund-manager/notifications/history").json()
    )


def test_account_zero_unknown_checked_bank_and_archived(tmp_path):
    configure_temp_database(tmp_path)
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET current_balance='0.00',stake_access='Normal',promo_access='Full'"
        )
        account = connection.execute(
            "SELECT account_id FROM accounts WHERE profile_id='profile-demo-001' LIMIT 1"
        ).fetchone()["account_id"]
    assert not any(
        i.notification_type == "account_review"
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET current_balance='',stake_access='Not Checked' WHERE account_id=?",
            (account,),
        )
    task = next(
        i
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
        if i.record_id == account
    )
    assert "Balance not recorded" in task.message and "Stake access not checked" in task.message
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET current_balance='0.00',type='Bank' WHERE account_id=?", (account,)
        )
    assert not any(
        i.record_id == account
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET current_balance='',lifecycle_status='Archived' WHERE account_id=?",
            (account,),
        )
    assert not any(
        i.record_id == account
        for i in notifications.daily_record_notifications("notification-test@example.invalid", NOW)
    )


def test_hosted_scope_filters_before_persistence_and_rechecks_history(tmp_path, monkeypatch):
    configure_temp_database(tmp_path)
    client = authenticated_test_client()
    row_id = reward(client, "", status="Placed")
    monkeypatch.setattr(notifications, "postgres_runtime_enabled", lambda: True)
    # Simulated hosted authority over disposable SQLite: zero explicit links fails closed.
    assert not any(
        i["record_id"] == row_id for i in client.get("/fund-manager/notifications").json()
    )
    assert not any(
        i["record_id"] == row_id
        for i in list_notification_events("notification-test@example.invalid")
    )
    with connect() as connection:
        connection.execute(
            "INSERT INTO fund_manager_profile_links(email,profile_id,is_primary,created_at) "
            "VALUES (?,?,1,?)",
            ("notification-test@example.invalid", "profile-demo-001", "2026-09-25"),
        )
    assert any(i["record_id"] == row_id for i in client.get("/fund-manager/notifications").json())
    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET status='Archived' WHERE profile_id='profile-demo-001'"
        )
    assert not any(
        i["record_id"] == row_id for i in client.get("/fund-manager/notifications").json()
    )
    assert any(
        i["record_id"] == row_id for i in client.get("/fund-manager/notifications/history").json()
    )
    with connect() as connection:
        connection.execute("DELETE FROM fund_manager_profile_links")
    assert not any(
        i["record_id"] == row_id for i in client.get("/fund-manager/notifications/history").json()
    )
    client.cookies.clear()
    assert client.get("/fund-manager/notifications").status_code == 401
