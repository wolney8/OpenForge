from __future__ import annotations

import sqlite3
from concurrent.futures import ThreadPoolExecutor

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from openforge_api import task_annotations
from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
from openforge_api.common_bet_combos import ProfileOpportunityResponse
from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.notifications import FundManagerNotificationResponse


def client_and_sources(monkeypatch) -> tuple[TestClient, list[FundManagerNotificationResponse]]:
    monkeypatch.setattr(settings, "task_annotations_isolated_enabled", True)
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
    monkeypatch.setattr(task_annotations, "_profile_opportunities", lambda _profile_id: [])
    return client, sources


def test_authorised_advisory_opportunity_tracks_without_creating_financial_source(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    profile = "profile-demo-001"
    opportunity = ProfileOpportunityResponse(
        opportunity_key="DEMO-OPP-001", source="quick_action", ledger_type="Sportsbook",
        label="Review Demo Offer", bookmaker="Bookmaker A", recurrence="One Off",
        kind="Reload", period_key="one-off", already_created=False,
        target_record_id="", risk_warnings=[], defaults={},
    )
    current = [opportunity]
    monkeypatch.setattr(
        task_annotations,
        "_profile_opportunities",
        lambda profile_id: current if profile_id == profile else [],
    )
    occurrence = f"profile-opportunity:{profile}:DEMO-OPP-001:one-off"
    payload = {"changes": [{"profile_id": profile, "occurrence_key": occurrence,
                           "tracked": True, "work_state": "To Do", "expected_version": 0}]}
    first = client.patch("/fund-manager/tasks/annotations", json=payload)
    assert first.status_code == 200
    assert first.json()[0]["source_status"] == "active"
    assert first.json()[0]["profile_name"] == "Subscriber Alpha"
    assert client.get("/fund-manager/tasks/annotations").json()[0]["tracked"] is True
    opportunity.already_created = True
    assert client.get("/fund-manager/tasks/annotations").json()[0]["source_status"] == "resolved"
    opportunity.already_created = False
    opportunity.period_key = "next-period"
    assert client.get("/fund-manager/tasks/annotations").json()[0]["source_status"] == "changed"
    current.clear()
    assert client.get("/fund-manager/tasks/annotations").json()[0]["source_status"] == "unavailable"
    foreign = client.patch(
        "/fund-manager/tasks/annotations",
        json={"changes": [{**payload["changes"][0], "profile_id": "foreign-profile"}]},
    )
    assert foreign.status_code == 404


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


def test_viewer_email_is_canonical_across_sessions(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    profile = "profile-demo-001"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(profile)]}
        ).status_code
        == 200
    )
    uppercase = create_session_token(
        subject="uppercase-synthetic-viewer",
        email="VIEWER@EXAMPLE.INVALID",
        name="Synthetic Viewer",
    )
    client.cookies.set(SESSION_COOKIE_NAME, uppercase)
    assert client.get("/fund-manager/tasks/annotations").json()[0]["version"] == 1
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(profile, tracked=False, version=1)]},
        ).json()[0]["version"]
        == 2
    )
    with connect() as connection:
        rows = connection.execute("SELECT viewer_email FROM task_annotations").fetchall()
    assert [row[0] for row in rows] == ["viewer@example.invalid"]


def test_default_disabled_and_isolated_flag_cannot_authorize_normal(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    client.cookies.clear()
    assert client.get("/fund-manager/tasks/annotations").status_code == 401
    monkeypatch.setattr(settings, "task_annotations_isolated_enabled", False)
    assert client.get("/fund-manager/tasks/annotations").status_code == 503
    monkeypatch.setattr(settings, "task_annotations_normal_enabled", True)
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change("profile-demo-001")]},
        ).status_code
        == 503
    )
    monkeypatch.setattr(
        task_annotations,
        "validate_runtime_contract",
        lambda _settings: type(
            "Identity",
            (),
            {
                "database_classification": "normal-owner",
                "role": "normal-owner",
                "database_engine": "sqlite",
            },
        )(),
    )
    monkeypatch.setattr(settings, "task_annotations_normal_enabled", False)
    with __import__("pytest").raises(HTTPException) as error:
        task_annotations._require_enabled()
    assert error.value.status_code == 503
    monkeypatch.setattr(settings, "task_annotations_normal_enabled", True)
    task_annotations._require_enabled()


def test_competing_version_writes_and_batch_rollback(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    one, two = "profile-demo-001", "profile-demo-002"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(one), change(two)]},
        ).status_code
        == 200
    )

    def update(state: str):
        return client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(one, version=1, state=state)]},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = sorted(pool.map(update, ["In Progress", "Blocked"]))
    assert results == [200, 409]
    rows = {row["profile_id"]: row for row in client.get("/fund-manager/tasks/annotations").json()}
    assert rows[one]["version"] == 2
    assert rows[two]["version"] == 1
    rejected = client.patch(
        "/fund-manager/tasks/annotations",
        json={
            "changes": [
                change(two, version=1, state="In Progress"),
                change(one, version=1, tracked=False),
            ]
        },
    )
    assert rejected.status_code == 409
    rows = {row["profile_id"]: row for row in client.get("/fund-manager/tasks/annotations").json()}
    assert rows[two]["version"] == 1
    assert rows[two]["work_state"] == "To Do"


def test_database_failure_rolls_back_earlier_batch_write(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    one, two = "profile-demo-001", "profile-demo-002"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change(one), change(two)]},
        ).status_code
        == 200
    )
    with connect() as connection:
        connection.execute(
            """CREATE TRIGGER reject_second_annotation BEFORE UPDATE ON task_annotations
               WHEN NEW.profile_id='profile-demo-002'
               BEGIN SELECT RAISE(ABORT, 'synthetic write rejection'); END"""
        )
    with __import__("pytest").raises(sqlite3.IntegrityError):
        client.patch(
            "/fund-manager/tasks/annotations",
            json={
                "changes": [
                    change(one, version=1, state="In Progress"),
                    change(two, version=1, state="Blocked"),
                ]
            },
        )
    rows = {row["profile_id"]: row for row in client.get("/fund-manager/tasks/annotations").json()}
    assert rows[one]["version"] == 1
    assert rows[one]["work_state"] == "To Do"


def test_new_session_work_state_and_revoked_profile(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    one, two = "profile-demo-001", "profile-demo-002"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={
                "changes": [
                    change(one, state="Blocked", reason="Awaiting synthetic evidence"),
                    change(two, state="Do Later", review="2026-11-20"),
                ]
            },
        ).status_code
        == 200
    )
    token = create_session_token(
        subject="synthetic-viewer-new-session",
        email="viewer@example.invalid",
        name="Synthetic Viewer",
    )
    client.cookies.set(SESSION_COOKIE_NAME, token)
    states = {
        row["profile_id"]: row["work_state"]
        for row in client.get("/fund-manager/tasks/annotations").json()
    }
    assert states == {one: "Blocked", two: "Do Later"}
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


def test_profile_deletion_cascades_only_its_annotations(monkeypatch):
    client, sources = client_and_sources(monkeypatch)
    from apps.api.tests.synthetic_setup import seed_synthetic_profile

    seed_synthetic_profile(
        "profile-demo-003", display_name="Subscriber Charlie", profile_code="CHARLIE-003"
    )
    sources.append(
        sources[0].model_copy(
            update={
                "profile_id": "profile-demo-003",
                "notification_id": "review:profile-demo-003:ROW-1:v1",
            }
        )
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [change("profile-demo-001"), change("profile-demo-003")]},
        ).status_code
        == 200
    )
    with connect() as connection:
        connection.execute("DELETE FROM profiles WHERE profile_id=?", ("profile-demo-003",))
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM task_annotations WHERE profile_id=?", ("profile-demo-003",)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM task_annotations WHERE profile_id=?", ("profile-demo-001",)
            ).fetchone()[0]
            == 1
        )
