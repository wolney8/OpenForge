from __future__ import annotations

import hashlib
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from test_auth import configured_auth

from openforge_api import auth
from openforge_api.config import settings
from openforge_api.db import connect, upsert_fund_manager_user
from openforge_api.main import app
from openforge_api.subscribers import accept_invitation, invitation_for_token


@pytest.fixture
def environment():
    with configured_auth():
        old = settings.neon_database_url
        if os.environ.get("CP056_TEST_POSTGRES_URL"):
            settings.database_mode = "postgres"
            settings.neon_database_url = os.environ["CP056_TEST_POSTGRES_URL"]
            from openforge_api.postgres_migrations import apply_postgres_migrations

            apply_postgres_migrations(settings.neon_database_url)
            with connect() as c:
                # A fresh disposable database is mandatory for this opt-in suite.
                for table in [
                    "subscriber_review_events",
                    "subscriber_access_grants",
                    "subscriber_applications",
                    "subscriber_invitations",
                    "fund_manager_sessions",
                    "fund_manager_security_preferences",
                    "fund_manager_profile_links",
                    "fund_manager_users",
                ]:
                    c.execute(f"DELETE FROM {table}")
        upsert_fund_manager_user(
            email="founder@example.invalid",
            google_subject="owner",
            display_name="Synthetic manager",
        )
        owner = TestClient(app)
        owner.cookies.set(
            "pd_session",
            auth.create_session_token(
                subject="owner", email="founder@example.invalid", name="Synthetic manager"
            ),
        )
        yield owner
        settings.neon_database_url = old


def command(**values):
    return {"command_id": uuid4().hex, **values}


def invited(owner, suffix="one"):
    email = f"{suffix}@example.invalid"
    response = owner.post(
        "/fund-manager/subscribers/invitations", json=command(email=email, valid_days=7)
    )
    assert response.status_code == 200, response.text
    token = response.json()["invite_path"].split("=")[1]
    return email, token, response.json()["invitation_id"]


def accepted(owner, suffix="one"):
    email, token, invitation_id = invited(owner, suffix)
    row = invitation_for_token(token)
    accept_invitation(invitation_id, row["token_hash"], email, suffix, "Synthetic applicant")
    client = TestClient(app)
    client.cookies.set(
        "pd_session",
        auth.create_session_token(
            subject=suffix, email=email, name="Synthetic applicant", role="prospective_subscriber"
        ),
    )
    return client, client.get("/subscriber/applications").json()[0]


def current(client):
    return client.get("/subscriber/applications").json()[0]


def submit(client, row):
    payload = command(
        version=row["version"],
        display_name="Applicant One",
        country_code="GB",
        applicant_message="Please review",
        self_funding_amount="208.51",
        funding_requested=True,
    )
    response = client.post(f"/subscriber/applications/{row['application_id']}/submit", json=payload)
    assert response.status_code == 200, response.text
    return payload


def approve(owner, client):
    row = current(client)
    response = owner.post(
        f"/fund-manager/subscribers/applications/{row['application_id']}/review",
        json=command(
            version=row["version"], action="approve", private_note="NEVER APPLICANT VISIBLE"
        ),
    )
    assert response.status_code == 200, response.text


def create_profile(owner, client):
    row = current(client)
    payload = command(
        version=row["version"],
        action="create",
        display_name="Synthetic Managed",
        profile_code="SUB-" + uuid4().hex[:8].upper(),
        management_fee_percent="12.50",
        investment_fee_percent="5.00",
        tracking_start_date="2026-01-01",
    )
    response = owner.post(
        f"/fund-manager/subscribers/applications/{row['application_id']}/profile", json=payload
    )
    assert response.status_code == 200, response.text
    return response.json()["profile_id"], payload


def test_entire_flow_retry_privacy_and_no_financial_movement(environment):
    owner = environment
    client, row = accepted(owner)
    with connect() as c:
        initial_cash = c.execute("SELECT COUNT(*) FROM cash_adjustments").fetchone()[0]
    path = f"/subscriber/applications/{row['application_id']}/submit"
    payload = submit(client, row)
    assert client.post(path, json=payload).status_code == 200
    assert client.post(path, json={**payload, "country_code": "FR"}).status_code == 409
    a = current(client)
    info = command(
        version=a["version"],
        action="request_information",
        public_message="Please confirm region",
        private_note="PRIVATE REVIEW",
    )
    base = f"/fund-manager/subscribers/applications/{row['application_id']}"
    assert owner.post(base + "/review", json=info).status_code == 200
    assert "PRIVATE REVIEW" not in client.get("/subscriber/applications").text
    assert current(client)["status"] == "needs_more_information"
    submit(client, current(client))
    approve(owner, client)
    assert client.get("/subscriber/profiles").json() == []
    assert current(client)["profile_id"] is None
    assert (
        owner.post(
            base + "/profile",
            json=command(
                version=current(client)["version"],
                action="create",
                display_name="Missing terms",
                profile_code="NO-TERMS",
            ),
        ).status_code
        == 422
    )
    pid, creation = create_profile(owner, client)
    assert owner.post(base + "/profile", json=creation).json()["profile_id"] == pid
    assert client.get("/subscriber/profiles/" + pid).status_code == 404
    with connect() as c:
        p = c.execute("SELECT * FROM profiles WHERE profile_id = ?", (pid,)).fetchone()
        assert p["profile_relationship"] == "Managed subscriber" and p["status"] == "Pending"
        assert p["management_fee_percent"] == "12.50" and p["investment_fee_percent"] == "5.00"
        assert p["current_cash_snapshot"] == ""
        assert c.execute("SELECT COUNT(*) FROM cash_adjustments").fetchone()[0] == initial_cash
    grant = command(version=current(client)["version"], action="grant")
    assert owner.post(base + "/access", json=grant).status_code == 200
    assert client.get("/auth/session").json()["role"] == "managed_subscriber_read_only"
    result = client.get("/subscriber/profiles/" + pid)
    assert result.status_code == 200 and result.json()["statements"] == []
    assert client.get("/subscriber/profiles/not-linked").status_code == 404
    other, other_row = accepted(owner, "two")
    assert other.get("/subscriber/profiles/" + pid).status_code == 404
    assert other.post(path, json={**payload, "command_id": uuid4().hex}).status_code == 404
    revoke = command(version=current(client)["version"], action="revoke")
    assert owner.post(base + "/access", json=revoke).status_code == 200
    assert owner.post(base + "/access", json=grant).status_code == 200  # old retry never regrants
    assert client.get("/subscriber/profiles/" + pid).status_code == 404
    assert "NEVER APPLICANT VISIBLE" not in client.get("/subscriber/applications").text
    with connect() as c:
        assert c.execute("SELECT 1 FROM profiles WHERE profile_id = ?", (pid,)).fetchone()
        assert (
            c.execute(
                "SELECT COUNT(*) FROM subscriber_review_events WHERE command_id = ?",
                (grant["command_id"],),
            ).fetchone()[0]
            == 1
        )
        receipt = c.execute(
            "SELECT action,result_json FROM subscriber_review_events WHERE command_id = ?",
            (grant["command_id"],),
        ).fetchone()
        assert receipt["action"] == "access:grant"
        audit = json.loads(receipt["result_json"])
        assert audit["audit"]["actor_role"] == "fund_manager"
        assert audit["audit"]["contract_version"] == "invited-subscriber-v1"
        assert audit["transition"]["from_access"] == "not_granted"
        assert audit["transition"]["to_access"] == "read_only"
        decisions = [
            json.loads(item["result_json"])
            for item in c.execute(
                "SELECT result_json FROM subscriber_review_events WHERE action = 'review:approve'"
            ).fetchall()
        ]
        assert decisions[0]["transition"]["from_status"] == "submitted"
        assert decisions[0]["transition"]["to_status"] == "approved"


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/profiles"),
        ("GET", "/fund-manager/subscribers/applications"),
        ("GET", "/fund-manager/preferences"),
        ("GET", "/bookmaker-catalogue"),
        ("GET", "/profiles/other/tracker-summary-sources"),
        ("GET", "/search"),
        ("POST", "/profiles/other/sportsbook-bets"),
        ("PATCH", "/profiles/other/free-bets/one"),
        ("POST", "/profiles/other/cash-adjustments"),
        ("GET", "/auth/security-preference"),
        ("PUT", "/auth/security-preference"),
    ],
)
def test_subscriber_denied_all_operator_routes(environment, method, path):
    client, _ = accepted(environment)
    assert client.request(method, path, json={} if method != "GET" else None).status_code == 403


def test_decline_withdraw_expired_revoked_and_duplicate_invitation(environment):
    owner = environment
    email, token, iid = invited(owner)
    assert (
        owner.post(
            "/fund-manager/subscribers/invitations", json=command(email=email, valid_days=7)
        ).status_code
        == 409
    )
    with connect() as c:
        assert (
            c.execute(
                "SELECT token_hash FROM subscriber_invitations WHERE invitation_id = ?", (iid,)
            ).fetchone()[0]
            == hashlib.sha256(token.encode()).hexdigest()
        )
        assert token not in json.dumps(
            [dict(r) for r in c.execute("SELECT * FROM subscriber_review_events").fetchall()]
        )
        c.execute(
            "UPDATE subscriber_invitations SET expires_at = ? WHERE invitation_id = ?",
            (int(time.time()) - 1, iid),
        )
    assert TestClient(app).post("/auth/invite-login", json={"token": token}).status_code == 410
    email, token, iid = invited(owner, "revoked")
    assert (
        owner.post(
            f"/fund-manager/subscribers/invitations/{iid}/revoke", json=command()
        ).status_code
        == 200
    )
    assert TestClient(app).post("/auth/invite-login", json={"token": token}).status_code == 410
    client, row = accepted(owner, "declined")
    submit(client, row)
    path = f"/fund-manager/subscribers/applications/{row['application_id']}/review"
    assert (
        owner.post(
            path, json=command(version=current(client)["version"], action="decline")
        ).status_code
        == 422
    )
    assert (
        owner.post(
            path,
            json=command(
                version=current(client)["version"], action="decline", public_message="Not eligible"
            ),
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/subscriber/applications/{row['application_id']}/submit",
            json=command(version=current(client)["version"], display_name="X", country_code="GB"),
        ).status_code
        == 409
    )
    client, row = accepted(owner, "withdrawn")
    assert (
        client.post(
            f"/subscriber/applications/{row['application_id']}/withdraw",
            json=command(version=row["version"]),
        ).status_code
        == 200
    )
    assert current(client)["status"] == "withdrawn"
    archive_path = f"/fund-manager/subscribers/applications/{row['application_id']}/archive"
    assert (
        owner.post(archive_path, json=command(version=current(client)["version"])).status_code
        == 200
    )
    assert current(client)["status"] == "archived"


def test_oauth_invitation_binding_and_return_login(environment, monkeypatch):
    email, token, iid = invited(environment)
    browser = TestClient(app)
    response = browser.post("/auth/invite-login", json={"token": token})
    assert response.status_code == 200
    state = parse_qs(urlparse(response.json()["url"]).query)["state"][0]
    identity = {
        "sub": "google-applicant",
        "email": email,
        "email_verified": True,
        "name": "Applicant",
    }

    class OAuthClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            return httpx.Response(200, json={"access_token": "synthetic-never-stored"})

        async def get(self, *args, **kwargs):
            return httpx.Response(200, json=identity)

    monkeypatch.setattr(auth.httpx, "AsyncClient", OAuthClient)
    identity["email"] = "different@example.invalid"
    assert (
        browser.get(
            "/auth/google/callback",
            params={"code": "synthetic", "state": state},
            follow_redirects=False,
        ).headers["location"]
        == "/login?error=not_authorized"
    )
    response = browser.post("/auth/invite-login", json={"token": token})
    state = parse_qs(urlparse(response.json()["url"]).query)["state"][0]
    identity["email"] = email
    assert (
        browser.get(
            "/auth/google/callback",
            params={"code": "synthetic", "state": state},
            follow_redirects=False,
        ).headers["location"]
        == "/subscriber"
    )
    assert browser.get("/auth/session").json()["role"] == "prospective_subscriber"
    assert browser.get("/profiles").status_code == 403
    response = browser.get("/auth/google/login", follow_redirects=False)
    state = parse_qs(urlparse(response.headers["location"]).query)["state"][0]
    identity["sub"] = "different-subject"
    assert (
        browser.get(
            "/auth/google/callback",
            params={"code": "synthetic", "state": state},
            follow_redirects=False,
        ).headers["location"]
        == "/login?error=not_authorized"
    )
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM subscriber_applications").fetchone()[0] == 1


def test_concurrent_retry_and_stale_review_do_not_repeat_transition(environment):
    owner = environment
    client, row = accepted(owner)
    submit(client, row)
    payload = command(version=current(client)["version"], action="approve")
    path = f"/fund-manager/subscribers/applications/{row['application_id']}/review"
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: owner.post(path, json=payload), range(2)))
    assert [r.status_code for r in responses] == [200, 200]
    assert (
        owner.post(
            path, json=command(version=payload["version"], action="decline", public_message="Late")
        ).status_code
        == 409
    )
    assert current(client)["status"] == "approved"


def test_link_existing_requires_managed_unclaimed_profile(environment):
    owner = environment
    one, row = accepted(owner)
    submit(one, row)
    approve(owner, one)
    pid, _ = create_profile(owner, one)
    two, row2 = accepted(owner, "second")
    submit(two, row2)
    approve(owner, two)
    base = f"/fund-manager/subscribers/applications/{row2['application_id']}/profile"
    payload = command(version=current(two)["version"], action="link", profile_id=pid)
    assert owner.post(base, json=payload).status_code == 409
    with connect() as c:
        c.execute(
            "UPDATE subscriber_applications SET profile_id = NULL WHERE application_id = ?",
            (row["application_id"],),
        )
        c.execute(
            "UPDATE profiles SET profile_relationship = 'Personal' WHERE profile_id = ?", (pid,)
        )
    assert owner.post(base, json={**payload, "command_id": uuid4().hex}).status_code == 422
    with connect() as c:
        c.execute(
            "UPDATE profiles SET profile_relationship = 'Managed subscriber' WHERE profile_id = ?",
            (pid,),
        )
    assert owner.post(base, json={**payload, "command_id": uuid4().hex}).status_code == 200
    assert two.get("/subscriber/profiles").json() == []


def test_confirmed_statement_projection_and_portable_export_exclude_authority(environment):
    import io
    from zipfile import ZipFile

    from apps.api.tests.synthetic_setup import seed_synthetic_account
    from test_fund_manager_fee_period_workflow import create_and_crystallise

    from openforge_api.profile_portable_export import build_profile_portable_export

    owner = environment
    with connect() as c:
        c.execute("""INSERT INTO profiles (profile_id,display_name,profile_code,status,
        tracking_start_date,management_fee_percent,investment_fee_percent,current_cash_snapshot)
        VALUES ('profile-demo-001','Synthetic statement','STATEMENT-001','Active',
        '2025-01-01','40.00','0.00','') ON CONFLICT(profile_id) DO NOTHING""")
    seed_synthetic_account(name="Bookmaker A", account_type="Bookie")
    with connect() as c:
        c.execute(
            """UPDATE profiles SET profile_relationship='Managed subscriber',
            management_fee_percent='40.00', investment_fee_percent='0.00' WHERE
            profile_id='profile-demo-001'"""
        )
    client, row = accepted(owner)
    submit(client, row)
    approve(owner, client)
    base = f"/fund-manager/subscribers/applications/{row['application_id']}"
    assert (
        owner.post(
            base + "/profile",
            json=command(
                version=current(client)["version"], action="link", profile_id="profile-demo-001"
            ),
        ).status_code
        == 200
    )
    assert (
        owner.post(
            base + "/access", json=command(version=current(client)["version"], action="grant")
        ).status_code
        == 200
    )
    create_and_crystallise(owner)
    response = client.get("/subscriber/profiles/profile-demo-001")
    assert response.status_code == 200
    statement = response.json()["statements"][0]
    assert statement["eligible_period_profit"] == "100.00"
    assert statement["management_fee_amount"] == "40.00"
    assert statement["investment_fee_amount"] == "0.00"
    assert statement["total_fee_due"] == "40.00"
    assert set(statement) == {
        "period_start",
        "period_end",
        "confirmed_at",
        "eligible_period_profit",
        "management_fee_amount",
        "investment_fee_amount",
        "total_fee_due",
    }
    assert "fee_base_breakdown_json" not in response.text and "actor_id" not in response.text
    with connect() as c:
        c.execute("UPDATE fee_periods SET state='reopened' WHERE profile_id='profile-demo-001'")
    assert client.get("/subscriber/profiles/profile-demo-001").json()["statements"] == []
    exported = build_profile_portable_export("profile-demo-001")
    with ZipFile(io.BytesIO(exported.content)) as workbook:
        text = "".join(
            workbook.read(name).decode("utf-8")
            for name in workbook.namelist()
            if name.endswith(".xml")
        )
    assert "one@example.invalid" not in text
    assert "subscriber_access_grants" not in text and "subscriber_invitations" not in text
