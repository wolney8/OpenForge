from __future__ import annotations

import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest
from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from openforge_api import task_annotation_review_migration, task_annotations
from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
from openforge_api.common_bet_combos import ProfileOpportunityResponse
from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.notifications import FundManagerNotificationResponse


def client_and_sources(
    monkeypatch, *, review=False
) -> tuple[TestClient, list[FundManagerNotificationResponse]]:
    monkeypatch.setattr(settings, "task_annotations_isolated_enabled", True)
    monkeypatch.setattr(settings, "task_annotations_review_isolated_enabled", review)
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


def advisory_source(profile: str) -> ProfileOpportunityResponse:
    return ProfileOpportunityResponse(
        opportunity_key="DEMO-OPP-001",
        source="quick_action",
        ledger_type="Sportsbook",
        label="Demo advisory opportunity",
        bookmaker="Bookmaker A",
        recurrence="One Off",
        kind="Reload",
        period_key="one-off",
        already_created=False,
        target_record_id="",
        risk_warnings=[],
        defaults={},
    )


def test_personal_opportunity_review_is_versioned_and_separate_from_source(monkeypatch):
    client, _ = client_and_sources(monkeypatch, review=True)
    profile = "profile-demo-001"
    current = [advisory_source(profile)]
    monkeypatch.setattr(
        task_annotations, "_profile_opportunities", lambda p: current if p == profile else []
    )
    occurrence = f"profile-opportunity:{profile}:DEMO-OPP-001:one-off"
    base = {
        "profile_id": profile,
        "occurrence_key": occurrence,
        "tracked": True,
        "work_state": "In Progress",
        "expected_version": 0,
    }
    first = client.patch(
        "/fund-manager/tasks/annotations",
        json={
            "changes": [
                {**base, "next_action": "Check current terms", "notes": "Ask before acting."}
            ]
        },
    )
    assert first.status_code == 200
    assert first.json()[0]["version"] == 1
    assert first.json()[0]["reviewed_at"] is None
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={
                "changes": [
                    {**base, "next_action": "Check current terms", "notes": "Ask before acting."}
                ]
            },
        ).json()[0]["version"]
        == 1
    )

    reviewed = client.patch(
        "/fund-manager/tasks/annotations",
        json={"changes": [{**base, "expected_version": 1, "reviewed": True}]},
    )
    assert reviewed.status_code == 200
    saved = reviewed.json()[0]
    assert saved["reviewed_at"] and saved["source_status"] == "active"
    assert saved["tracked"] is True and saved["notes"] == "Ask before acting."
    assert saved["next_action"] == "Check current terms"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "expected_version": 1, "reviewed": True}]},
        ).json()[0]["version"]
        == 2
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "expected_version": 1, "notes": "Stale"}]},
        ).status_code
        == 409
    )

    untracked = client.patch(
        "/fund-manager/tasks/annotations",
        json={"changes": [{**base, "tracked": False, "expected_version": 2}]},
    )
    assert untracked.status_code == 200
    assert untracked.json()[0]["reviewed_at"] == saved["reviewed_at"]
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [{**base, "expected_version": 3}]}
        ).status_code
        == 409
    )
    reopened = client.patch(
        "/fund-manager/tasks/annotations",
        json={"changes": [{**base, "tracked": False, "expected_version": 3, "reviewed": False}]},
    )
    assert reopened.status_code == 200
    assert reopened.json()[0]["reviewed_at"] is None
    assert reopened.json()[0]["tracked"] is False
    tracked = client.patch(
        "/fund-manager/tasks/annotations", json={"changes": [{**base, "expected_version": 4}]}
    )
    assert tracked.status_code == 200 and tracked.json()[0]["tracked"] is True

    current.clear()
    history = client.get("/fund-manager/tasks/annotations").json()[0]
    assert history["source_status"] == "unavailable" and history["notes"] == "Ask before acting."
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "expected_version": 5, "reviewed": True}]},
        ).status_code
        == 409
    )


def test_personal_review_rejects_financial_tasks_and_foreign_profiles(monkeypatch):
    client, _ = client_and_sources(monkeypatch, review=True)
    profile = "profile-demo-001"
    source = advisory_source(profile)
    monkeypatch.setattr(
        task_annotations, "_profile_opportunities", lambda p: [source] if p == profile else []
    )
    opportunity = f"profile-opportunity:{profile}:DEMO-OPP-001:one-off"
    base = {
        "profile_id": profile,
        "occurrence_key": opportunity,
        "tracked": False,
        "work_state": "To Do",
        "expected_version": 0,
        "reviewed": True,
    }
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "profile_id": "foreign-profile"}]},
        ).status_code
        == 404
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "occurrence_key": f"review:{profile}:ROW-1:v1"}]},
        ).status_code
        == 422
    )
    rejected_batch = client.patch(
        "/fund-manager/tasks/annotations",
        json={"changes": [base, {**base, "occurrence_key": f"review:{profile}:ROW-1:v1"}]},
    )
    assert rejected_batch.status_code == 422
    assert client.get("/fund-manager/tasks/annotations").json() == []
    assert (
        client.patch("/fund-manager/tasks/annotations", json={"changes": [base] * 33}).status_code
        == 422
    )


def test_personal_review_history_notes_remain_editable_without_source(monkeypatch):
    client, _ = client_and_sources(monkeypatch, review=True)
    profile = "profile-demo-001"
    current = [advisory_source(profile)]
    monkeypatch.setattr(
        task_annotations, "_profile_opportunities", lambda p: current if p == profile else []
    )
    occurrence = f"profile-opportunity:{profile}:DEMO-OPP-001:one-off"
    base = {
        "profile_id": profile,
        "occurrence_key": occurrence,
        "tracked": True,
        "work_state": "To Do",
    }
    reviewed = client.patch(
        "/fund-manager/tasks/annotations",
        json={
            "changes": [
                {**base, "expected_version": 0, "reviewed": True, "notes": "First private note"}
            ]
        },
    )
    assert reviewed.status_code == 200
    current.clear()
    updated = client.patch(
        "/fund-manager/tasks/annotations",
        json={
            "changes": [
                {
                    **base,
                    "expected_version": 1,
                    "reviewed": True,
                    "notes": "Historical private note",
                }
            ]
        },
    )
    assert updated.status_code == 200
    assert updated.json()[0]["notes"] == "Historical private note"
    assert updated.json()[0]["reviewed_at"] == reviewed.json()[0]["reviewed_at"]
    assert updated.json()[0]["source_status"] == "unavailable"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "expected_version": 2, "reviewed": False}]},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**base, "expected_version": 3, "reviewed": True}]},
        ).status_code
        == 409
    )


def test_personal_notes_are_viewer_scoped(monkeypatch):
    client, _ = client_and_sources(monkeypatch, review=True)
    profile = "profile-demo-001"
    monkeypatch.setattr(
        task_annotations,
        "_profile_opportunities",
        lambda p: [advisory_source(profile)] if p == profile else [],
    )
    occurrence = f"profile-opportunity:{profile}:DEMO-OPP-001:one-off"
    change = {
        "profile_id": profile,
        "occurrence_key": occurrence,
        "tracked": True,
        "work_state": "To Do",
        "expected_version": 0,
        "notes": "First viewer only",
    }
    assert (
        client.patch("/fund-manager/tasks/annotations", json={"changes": [change]}).status_code
        == 200
    )
    settings.auth_owner_emails = "viewer@example.invalid,second@example.invalid"
    second = create_session_token(
        subject="synthetic-second-viewer", email="second@example.invalid", name="Second Viewer"
    )
    client.cookies.set(SESSION_COOKIE_NAME, second)
    assert client.get("/fund-manager/tasks/annotations").json() == []
    assert (
        client.patch(
            "/fund-manager/tasks/annotations",
            json={"changes": [{**change, "notes": "Second viewer only"}]},
        ).status_code
        == 200
    )
    assert client.get("/fund-manager/tasks/annotations").json()[0]["notes"] == "Second viewer only"
    first = create_session_token(
        subject="synthetic-first-viewer", email="viewer@example.invalid", name="First Viewer"
    )
    client.cookies.set(SESSION_COOKIE_NAME, first)
    assert client.get("/fund-manager/tasks/annotations").json()[0]["notes"] == "First viewer only"


def test_normal_personal_review_route_remains_disabled_without_its_separate_flag(monkeypatch):
    client, _ = client_and_sources(monkeypatch, review=True)
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
    monkeypatch.setattr(settings, "task_annotations_normal_enabled", True)
    monkeypatch.setattr(settings, "task_annotations_review_normal_enabled", False)
    profile = "profile-demo-001"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(profile)]}
        ).status_code
        == 200
    )
    assert "notes" not in client.get("/fund-manager/tasks/annotations").json()[0]
    review_change = {**change(profile, version=1), "notes": "Should remain unavailable"}
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [review_change]}
        ).status_code
        == 503
    )


def test_review_schema_migration_preserves_existing_annotations(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    profile = "profile-demo-001"
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change(profile)]}
        ).status_code
        == 200
    )
    assert (
        task_annotation_review_migration.inspect("pytest-committed-synthetic-seed", "pytest-source")
        == "installed"
    )
    backup, checksum = task_annotation_review_migration.apply(
        "pytest-committed-synthetic-seed", "pytest-source"
    )
    assert backup.is_file() and len(checksum) == 64
    assert (
        task_annotation_review_migration.inspect("pytest-committed-synthetic-seed", "pytest-source")
        == "installed-review"
    )
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM task_annotations").fetchone()[0] == 1
        assert tuple(
            connection.execute(
                "SELECT next_action,notes,reviewed_at FROM task_annotations"
            ).fetchone()
        ) == (None, None, None)
    monkeypatch.setattr(settings, "task_annotations_review_isolated_enabled", True)
    assert client.get("/fund-manager/tasks/annotations").json()[0]["version"] == 1
    with pytest.raises(RuntimeError, match="existing annotation schema"):
        task_annotation_review_migration.apply("pytest-committed-synthetic-seed", "pytest-source")


def test_failed_review_migration_rolls_back_all_columns(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    assert (
        client.patch(
            "/fund-manager/tasks/annotations", json={"changes": [change("profile-demo-001")]}
        ).status_code
        == 200
    )
    monkeypatch.setattr(
        task_annotation_review_migration,
        "REVIEW_ALTERATIONS",
        (
            "ALTER TABLE task_annotations ADD COLUMN next_action TEXT",
            "ALTER TABLE task_annotations ADD COLUMN next_action TEXT",
        ),
    )
    with pytest.raises(sqlite3.OperationalError):
        task_annotation_review_migration.apply("pytest-committed-synthetic-seed", "pytest-source")
    assert (
        task_annotation_review_migration.inspect("pytest-committed-synthetic-seed", "pytest-source")
        == "installed"
    )
    assert client.get("/fund-manager/tasks/annotations").json()[0]["version"] == 1


def test_authorised_advisory_opportunity_tracks_without_creating_financial_source(monkeypatch):
    client, _ = client_and_sources(monkeypatch)
    profile = "profile-demo-001"
    opportunity = ProfileOpportunityResponse(
        opportunity_key="DEMO-OPP-001",
        source="quick_action",
        ledger_type="Sportsbook",
        label="Review Demo Offer",
        bookmaker="Bookmaker A",
        recurrence="One Off",
        kind="Reload",
        period_key="one-off",
        already_created=False,
        target_record_id="",
        risk_warnings=[],
        defaults={},
    )
    current = [opportunity]
    monkeypatch.setattr(
        task_annotations,
        "_profile_opportunities",
        lambda profile_id: current if profile_id == profile else [],
    )
    occurrence = f"profile-opportunity:{profile}:DEMO-OPP-001:one-off"
    payload = {
        "changes": [
            {
                "profile_id": profile,
                "occurrence_key": occurrence,
                "tracked": True,
                "work_state": "To Do",
                "expected_version": 0,
            }
        ]
    }
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
