from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel

from openforge_api.db import (
    count_tracker_rows_created_after,
    list_backup_snapshot_records,
    list_free_bet_follow_up_notifications,
    list_partial_lay_notifications,
)

router = APIRouter(prefix="/fund-manager/notifications", tags=["fund-manager-notifications"])
BACKUP_REMINDER_DAY_THRESHOLD = 7
BACKUP_REMINDER_ROW_THRESHOLD = 25


class FundManagerNotificationResponse(BaseModel):
    audience: str
    kind: str
    task_state: str
    notification_id: str
    notification_type: str
    title: str
    ledger_label: str
    bookmaker_label: str
    message: str
    profile_id: str
    profile_name: str
    record_id: str
    due_at: str
    settles_at: str
    created_at: str
    href: str
    completion_href: str
    tone: str


def parse_timestamp(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


def format_timestamp(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def backup_reminder_notification(now: datetime) -> FundManagerNotificationResponse | None:
    verified_backups = [
        record for record in list_backup_snapshot_records() if record.status == "verified"
    ]
    if not verified_backups:
        tracker_row_count = count_tracker_rows_created_after(None)
        return FundManagerNotificationResponse(
            audience="fund_manager",
            kind="information",
            task_state="new",
            notification_id="backup-reminder:no-verified-backup",
            notification_type="database_backup_reminder",
            title="Create a verified backup",
            ledger_label="Database Backups",
            bookmaker_label="Local database",
            message=(
                f"No verified local backup exists. {tracker_row_count} tracker rows "
                "are currently local only."
            ),
            profile_id="fund-manager-local",
            profile_name="Fund Manager",
            record_id="database-backups",
            due_at=format_timestamp(now),
            settles_at=format_timestamp(now),
            created_at=format_timestamp(now),
            href="/settings?open=database-backups",
            completion_href="",
            tone="warning",
        )

    latest = verified_backups[0]
    latest_created = parse_timestamp(latest.created_at)
    if latest_created is None:
        return None
    rows_since_backup = count_tracker_rows_created_after(latest.created_at)
    reminder_due_at = latest_created + timedelta(days=BACKUP_REMINDER_DAY_THRESHOLD)
    is_stale = reminder_due_at <= now
    has_enough_new_rows = rows_since_backup >= BACKUP_REMINDER_ROW_THRESHOLD
    if not is_stale and not has_enough_new_rows:
        return None

    reasons: list[str] = []
    if is_stale:
        reasons.append(f"latest verified backup is over {BACKUP_REMINDER_DAY_THRESHOLD} days old")
    if has_enough_new_rows:
        reasons.append(f"{rows_since_backup} tracker rows changed since the latest verified backup")
    return FundManagerNotificationResponse(
        audience="fund_manager",
        kind="information",
        task_state="new",
        notification_id=f"backup-reminder:{latest.backup_snapshot_id}",
        notification_type="database_backup_reminder",
        title="Create a fresh database backup",
        ledger_label="Database Backups",
        bookmaker_label="Local database",
        message="; ".join(reasons),
        profile_id="fund-manager-local",
        profile_name="Fund Manager",
        record_id="database-backups",
        due_at=format_timestamp(reminder_due_at if is_stale else now),
        settles_at=format_timestamp(now),
        created_at=latest.created_at,
        href="/settings?open=database-backups",
        completion_href="",
        tone="warning",
    )


@router.get("", response_model=list[FundManagerNotificationResponse])
def list_fund_manager_notifications() -> list[FundManagerNotificationResponse]:
    now = datetime.now(UTC)
    notifications: list[FundManagerNotificationResponse] = []
    backup_notification = backup_reminder_notification(now)
    if backup_notification is not None:
        notifications.append(backup_notification)

    for row in list_partial_lay_notifications():
        due_at = str(row["due_at"])
        settles_at = str(row["settles_at"])
        reminder_changed_at = str(row["reminder_changed_at"])
        due_timestamp = parse_timestamp(due_at)
        settlement_timestamp = parse_timestamp(settles_at)
        task_state = "done" if str(row["reminder_state"]) == "Resolved" else "new"
        if (
            task_state == "done"
            and settlement_timestamp is not None
            and settlement_timestamp <= now
        ):
            continue
        is_overdue = due_timestamp is not None and due_timestamp <= now
        record_id = str(row["sportsbook_bet_id"])
        profile_id = str(row["profile_id"])
        event_label = str(row["event_name"] or row["offer_text"] or record_id)

        notifications.append(
            FundManagerNotificationResponse(
                audience="fund_manager",
                kind="task",
                task_state=task_state,
                notification_id=(f"partial-lay:{profile_id}:{record_id}:{reminder_changed_at}"),
                notification_type="partial_lay_reminder",
                title=(
                    "Partial lay recheck completed"
                    if task_state == "done"
                    else "Partial lay recheck overdue"
                    if is_overdue
                    else "Partial lay recheck"
                ),
                ledger_label="Sportsbook Bets",
                bookmaker_label=str(row["bookmaker"] or "Bookmaker unavailable"),
                message=event_label,
                profile_id=profile_id,
                profile_name=str(row["profile_name"]),
                record_id=record_id,
                due_at=due_at,
                settles_at=settles_at,
                created_at=reminder_changed_at,
                href=(
                    f"/profiles/{profile_id}/tracker/sportsbook-bets"
                    f"?record={record_id}&source=notifications"
                ),
                completion_href=(
                    f"/profiles/{profile_id}/sportsbook-bets/{record_id}/partial-lay-reminder"
                ),
                tone="danger" if is_overdue else "warning",
            )
        )

    for row in list_free_bet_follow_up_notifications():
        due_at = str(row["due_at"])
        reminder_changed_at = str(row["reminder_changed_at"])
        due_timestamp = parse_timestamp(due_at)
        task_state = "done" if str(row["reminder_state"]) == "Resolved" else "new"
        lifecycle_cutoff = (
            str(row["date_settled"])
            if str(row["status"]) == "Placed" and str(row["date_settled"]).strip()
            else str(row["expiry_datetime"] or due_at)
        )
        cutoff_timestamp = parse_timestamp(lifecycle_cutoff)
        if task_state == "done" and cutoff_timestamp is not None and cutoff_timestamp <= now:
            continue

        is_overdue = due_timestamp is not None and due_timestamp <= now
        record_id = str(row["free_bet_id"])
        profile_id = str(row["profile_id"])
        event_label = str(row["event_name"] or row["offer_text"] or record_id)

        notifications.append(
            FundManagerNotificationResponse(
                audience="fund_manager",
                kind="task",
                task_state=task_state,
                notification_id=(
                    f"free-bet-follow-up:{profile_id}:{record_id}:{reminder_changed_at}"
                ),
                notification_type="free_bet_follow_up_reminder",
                title=(
                    "Free-bet follow-up completed"
                    if task_state == "done"
                    else "Free-bet follow-up overdue"
                    if is_overdue
                    else "Free-bet follow-up"
                ),
                ledger_label="Free Bets",
                bookmaker_label=str(row["bookmaker"] or "Bookmaker unavailable"),
                message=event_label,
                profile_id=profile_id,
                profile_name=str(row["profile_name"]),
                record_id=record_id,
                due_at=due_at,
                settles_at=lifecycle_cutoff,
                created_at=reminder_changed_at,
                href=(
                    f"/profiles/{profile_id}/tracker/free-bets"
                    f"?record={record_id}&source=notifications"
                ),
                completion_href=(
                    f"/profiles/{profile_id}/free-bets/{record_id}/follow-up-reminder"
                ),
                tone="danger" if is_overdue else "warning",
            )
        )

    return sorted(
        notifications,
        key=lambda notification: (
            notification.task_state == "done",
            parse_timestamp(notification.due_at) or datetime.max.replace(tzinfo=UTC),
            notification.profile_name.casefold(),
        ),
    )
