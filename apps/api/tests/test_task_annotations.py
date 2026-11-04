from __future__ import annotations

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi import FastAPI
from fastapi.testclient import TestClient

from openforge_api import task_annotations
from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.notifications import FundManagerNotificationResponse


def client_and_sources(monkeypatch) -> tuple[TestClient, list[FundManagerNotificationResponse]]:
    seed_synthetic_betting_context()
    task_annotations.install_isolated_schema()
    settings.auth_owner_emails = "viewer@example.invalid"
    settings.auth_session_secret = "synthetic-task-annotation-secret-of-sufficient-length"
    token = create_session_token(
        subject="synthetic-viewer", email="viewer@example.invalid", name="Synthetic Viewer"
    )
    app = FastAPI()
    app.include_router(task_annotations.router)
    client = TestClient(app)
    client.cookies.set(SESSION_COOKIE_NAME, token)
    sources = [
        FundManagerNotificationResponse(
            audience="fund_manager",
            security_tag="fund_manager_only",
            kind="task",
            task_state="new",
            notification_id=f"review:{profile}:ROW-1:v1",
            notification_type="settlement_review",
            title=f"Review {profile}",
            ledger_label="Sportsbook Bets",
            bookmaker_label="Bookmaker A",
            message="Synthetic source",
            profile_id=profile,
            profile_name="Subscriber Alpha",
            record_id="ROW-1",
            due_at="",
            settles_at="",
            created_at="2026-11-04T10:00:00Z",
            href=f"/profiles/{profile}/tracker/sportsbook-bets",
            completion_href="",
            tone="warning",
        )
        for profile in ("profile-demo-001", "profile-demo-002")
    ]
    monkeypatch.setattr(
        task_annotations, "list_fund_manager_notifications", lambda _request: sources
    )
    return client, sources


def change(profile: str, *, tracked=True, version=0, state="To Do", reason=None, review=None):
    return {
        "profile_id": profile,
        "occurrence_key": f"review:{profile}:ROW-1:v1",
        "tracked": tracked,
        "work_state": state,
        "blocked_reason": reason,
        "review_date": review,
        "expected_version": version,
    }


def test_tracking_is_durable_idempotent_and_conflict_checked(monkeypatch):
    client, sources = client_and_sources(monkeypatch)
    profile = "profile-demo-001"
    payload = {"changes": [change(profile)]}
    first = client.patch("/fund-manager/tasks/annotations", json=payload)
    assert first.status_code == 200
    assert first.json()[0]["version"] == 1
    assert client.patch("/fund-manager/tasks/annotations", json=payload).json()[0]["version"] == 1
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(profile, tracked=False)]}
        ).status_code
        == 409
    )
    assert client.get("/fund-manager/tasks/annotations").json()[0]["tracked"] is True
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(profile, version=1, state="Do Later")]},
        ).status_code
        == 422
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={
                "changes": [
                    change(profile, version=1, state="Blocked", reason="Waiting for evidence")
                ]
            },
        ).json()[0]["blocked_reason"]
        == "Waiting for evidence"
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(profile, version=2, state="Do Later", review="2026-11-12")]},
        ).json()[0]["review_date"]
        == "2026-11-12"
    )
    sources[0].task_state = "done"
    assert client.get("/fund-manager/tasks/annotations").json()[0]["source_status"] == "resolved"
    sources[0].notification_id = f"review:{profile}:ROW-1:v2"
    assert client.get("/fund-manager/tasks/annotations").json()[0]["source_status"] == "changed"
    sources.clear()
    assert client.get("/fund-manager/tasks/annotations").json()[0]["source_status"] == "unavailable"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(profile, version=3)]}
        ).status_code
        == 409
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={
                "changes": [
                    change(profile, version=3, tracked=False, state="Do Later", review="2026-11-12")
                ]
            },
        ).status_code
        == 200
    )
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM task_annotations").fetchone()[0] == 1


def test_bulk_is_atomic_and_profile_scoped(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    one, two = "profile-demo-001", "profile-demo-002"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(one), change(two)]}
        ).status_code
        == 200
    )
    assert len(client.get("/fund-manager/tasks/annotations").json()) == 2
    rejected = client.patch(
        "/fund-manager/tasks/annotations",
        json={"changes": [change(one, tracked=False, version=1), change("foreign-profile")]},
    )
    assert rejected.status_code == 404
    assert all(row["tracked"] for row in client.get("/fund-manager/tasks/annotations").json())
    monkeypatch.setattr(
        task_annotations, "notification_profile_scope", lambda _email, active_only: {one}
    )
    assert [row["profile_id"] for row in client.get("/fund-manager/tasks/annotations").json()] == [
        one
    ]
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(two, tracked=False, version=1)]},
        ).status_code
        == 404
    )


def test_other_viewer_cannot_read_or_mutate_annotations(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    profile = "profile-demo-001"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(profile)]}
        ).status_code
        == 200
    )
    settings.auth_owner_emails = "viewer@example.invalid,other-viewer@example.invalid"
    token = create_session_token(
        subject="other-synthetic-viewer", email="other-viewer@example.invalid", name="Other Viewer"
    )
    client.cookies.set(SESSION_COOKIE_NAME, token)
    assert client.get("/fund-manager/tasks/annotations").json() == []
    assert (
        client.patch("/fund-manager/tasks/annotations", json={"changes": [change(profile)]}).json()[
            0
        ]["version"]
        == 1
    )
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM task_annotations").fetchone()[0] == 2
