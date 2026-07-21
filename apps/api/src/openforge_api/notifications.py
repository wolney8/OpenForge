from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from openforge_api.db import list_partial_lay_notifications

router = APIRouter(prefix="/fund-manager/notifications", tags=["fund-manager-notifications"])


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
    tone: str


def parse_timestamp(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


@router.get("", response_model=list[FundManagerNotificationResponse])
def list_fund_manager_notifications() -> list[FundManagerNotificationResponse]:
    now = datetime.now(UTC)
    notifications: list[FundManagerNotificationResponse] = []

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
                notification_id=(
                    f"partial-lay:{profile_id}:{record_id}:{reminder_changed_at}"
                ),
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
                tone="danger" if is_overdue else "warning",
            )
        )

    return notifications
