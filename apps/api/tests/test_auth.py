from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi.testclient import TestClient

from openforge_api import auth as auth_module
from openforge_api.auth import (
    OAUTH_STATE_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    create_session_token,
    read_session_token,
    validate_request_session,
)
from openforge_api.config import settings
from openforge_api.db import (
    local_fund_manager_security_preferences,
    local_fund_manager_sessions,
    touch_fund_manager_session,
    upsert_fund_manager_security_preference,
)
from openforge_api.main import app


@contextmanager
def configured_auth() -> Iterator[None]:
    previous = {
        "auth_required": settings.auth_required,
        "auth_public_base_url": settings.auth_public_base_url,
        "auth_session_secret": settings.auth_session_secret,
        "auth_owner_emails": settings.auth_owner_emails,
        "google_oauth_client_id": settings.google_oauth_client_id,
        "google_oauth_client_secret": settings.google_oauth_client_secret,
    }
    settings.auth_required = True
    settings.auth_public_base_url = "http://localhost:3010"
    settings.auth_session_secret = "synthetic-session-secret-at-least-32-bytes"
    settings.auth_owner_emails = "founder@example.invalid"
    settings.google_oauth_client_id = "synthetic-client-id"
    settings.google_oauth_client_secret = "synthetic-client-secret"
    try:
        local_fund_manager_sessions.clear()
        local_fund_manager_security_preferences.clear()
        yield
    finally:
        local_fund_manager_sessions.clear()
        local_fund_manager_security_preferences.clear()
        for field, value in previous.items():
            setattr(settings, field, value)


def test_session_tokens_reject_tampering_expiry_and_non_owner_access() -> None:
    with configured_auth():
        token = create_session_token(
            subject="google-founder-001",
            email="founder@example.invalid",
            name="Founder",
            now=2_000_000_000,
        )
        assert read_session_token(token) is not None
        encoded_payload, encoded_signature = token.split(".", 1)
        tampered_signature = ("A" if encoded_signature[0] != "A" else "B") + encoded_signature[1:]
        assert read_session_token(f"{encoded_payload}.{tampered_signature}") is None

        expired = create_session_token(
            subject="google-founder-001",
            email="founder@example.invalid",
            name="Founder",
            now=1,
        )
        assert read_session_token(expired) is None
        incomplete_identity = create_session_token(
            subject="",
            email="founder@example.invalid",
            name="Founder",
            now=2_000_000_000,
        )
        assert read_session_token(incomplete_identity) is None

        client = TestClient(app)
        assert client.get("/profiles").status_code == 401
        assert client.post("/profiles", json={}).status_code == 401
        client.cookies.set(SESSION_COOKIE_NAME, token)
        assert client.get("/profiles").status_code == 200

        session_response = client.get("/auth/session")
        assert session_response.status_code == 200
        assert session_response.json()["session_policy"]["server_persisted"] is False
        assert (
            session_response.json()["session_policy"]["effective_expires_at"]
            == 2_000_000_000 + settings.auth_session_ttl_seconds
        )

        settings.auth_owner_emails = "different-owner@example.invalid"
        assert client.get("/profiles").status_code == 401
        assert client.get("/auth/session").status_code == 401


def test_health_and_oauth_routes_remain_public_when_data_routes_are_protected() -> None:
    with configured_auth():
        client = TestClient(app, follow_redirects=False)
        assert client.get("/healthz").status_code == 200
        protected_response = client.get("/profiles")
        assert protected_response.status_code == 401
        assert protected_response.json() == {"detail": "Access unavailable"}
        assert client.get("/config-summary").status_code == 401

        login_response = client.get("/auth/google/login?next=/notifications")
        assert login_response.status_code == 302
        location = urlparse(login_response.headers["location"])
        query = parse_qs(location.query)
        assert location.netloc == "accounts.google.com"
        assert query["redirect_uri"] == ["http://localhost:3010/api/auth/google/callback"]
        assert query["code_challenge_method"] == ["S256"]
        assert query["scope"] == ["openid email profile"]
        assert OAUTH_STATE_COOKIE_NAME in login_response.cookies


def test_hosted_health_fails_closed_without_neon(monkeypatch) -> None:
    with configured_auth():
        monkeypatch.setattr(settings, "environment", "production")
        monkeypatch.setattr(settings, "database_mode", "local")
        monkeypatch.setattr(settings, "neon_database_url", "")
        client = TestClient(app)

        response = client.get("/healthz")

        assert response.status_code == 503
        assert response.json() == {"status": "unavailable"}


def test_hosted_health_fails_closed_when_neon_is_unreachable(monkeypatch) -> None:
    with configured_auth():
        monkeypatch.setattr(settings, "environment", "production")
        monkeypatch.setattr(settings, "database_mode", "neon")
        monkeypatch.setattr(settings, "neon_database_url", "postgresql://configured.invalid/db")

        @contextmanager
        def unavailable_database() -> Iterator[None]:
            raise RuntimeError("synthetic database outage")
            yield

        monkeypatch.setattr("openforge_api.main.connect", unavailable_database)
        client = TestClient(app)

        response = client.get("/healthz")

        assert response.status_code == 503
        assert response.json() == {"status": "unavailable"}


def test_server_session_enforces_inactivity_and_activity_reset() -> None:
    with configured_auth():
        start = 2_000_000_000
        token = create_session_token(
            subject="google-founder-001",
            email="founder@example.invalid",
            name="Founder",
            now=start,
        )
        session = read_session_token(token)
        assert session is not None
        upsert_fund_manager_security_preference(
            email=session.email,
            auto_logout_enabled=True,
            timeout_minutes=15,
        )

        assert validate_request_session(token, now=start + 899) is not None
        assert touch_fund_manager_session(
            session_id=session.session_id,
            email=session.email,
            now=start + 800,
        )
        assert validate_request_session(token, now=start + 1_699) is not None
        assert validate_request_session(token, now=start + 1_700) is None


def test_activity_endpoint_returns_the_refreshed_server_deadline(monkeypatch) -> None:
    with configured_auth():
        start = 2_000_000_000
        token = create_session_token(
            subject="google-founder-001",
            email="founder@example.invalid",
            name="Founder",
            now=start,
        )
        upsert_fund_manager_security_preference(
            email="founder@example.invalid",
            auto_logout_enabled=True,
            timeout_minutes=15,
        )
        monkeypatch.setattr(auth_module.time, "time", lambda: start + 800)
        client = TestClient(app)
        client.cookies.set(SESSION_COOKIE_NAME, token)

        response = client.post("/auth/activity")

        assert response.status_code == 200
        policy = response.json()["session_policy"]
        assert policy["last_activity_at"] == start + 800
        assert policy["effective_expires_at"] == start + 1_700
        assert policy["valid_now"] is True


def test_auto_logout_off_uses_absolute_session_expiry() -> None:
    with configured_auth():
        start = 2_000_000_000
        token = create_session_token(
            subject="google-founder-001",
            email="founder@example.invalid",
            name="Founder",
            now=start,
        )
        upsert_fund_manager_security_preference(
            email="founder@example.invalid",
            auto_logout_enabled=False,
            timeout_minutes=15,
        )

        assert validate_request_session(token, now=start + 3_600) is not None
        assert (
            validate_request_session(
                token,
                now=start + settings.auth_session_ttl_seconds,
            )
            is None
        )


def test_authorized_google_callback_creates_owner_session(monkeypatch) -> None:
    class FakeAsyncClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args) -> None:
            return None

        async def post(self, *args, **kwargs) -> httpx.Response:
            return httpx.Response(200, json={"access_token": "synthetic-access-token"})

        async def get(self, *args, **kwargs) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "sub": "google-founder-001",
                    "email": "founder@example.invalid",
                    "email_verified": True,
                    "name": "Founder",
                },
            )

    with configured_auth():
        monkeypatch.setattr("openforge_api.auth.httpx.AsyncClient", FakeAsyncClient)
        client = TestClient(app, follow_redirects=False)
        login_response = client.get("/auth/google/login")
        state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
        callback_response = client.get(f"/auth/google/callback?code=synthetic-code&state={state}")
        assert callback_response.status_code == 302
        assert callback_response.headers["location"] == "/"
        assert SESSION_COOKIE_NAME in callback_response.cookies
        session = client.get("/auth/session").json()
        assert session["role"] == "fund_manager"
        assert session["name"] == "Founder"
        assert session["email"] == "founder@example.invalid"
        search_response = client.get("/search?query=profiles")
        assert search_response.status_code == 200
        assert any(
            result["result_id"] == "navigation-profiles" and result["href"] == "/profiles"
            for result in search_response.json()
        )

        logout_response = client.post("/auth/logout")
        assert logout_response.status_code == 204
        assert client.get("/profiles").status_code == 401


def test_root_return_target_uses_fund_manager_dashboard(monkeypatch) -> None:
    with configured_auth():
        client = TestClient(app, follow_redirects=False)
        login_response = client.get("/auth/google/login?next=/")
        state_cookie = login_response.cookies[OAUTH_STATE_COOKIE_NAME]
        state_payload = auth_module._verify_payload(state_cookie)

        assert state_payload is not None
        assert state_payload["next"] == "/"


def test_google_callback_rejects_verified_identity_outside_owner_allowlist(monkeypatch) -> None:
    class FakeAsyncClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args) -> None:
            return None

        async def post(self, *args, **kwargs) -> httpx.Response:
            return httpx.Response(200, json={"access_token": "synthetic-access-token"})

        async def get(self, *args, **kwargs) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "sub": "google-other-001",
                    "email": "other@example.invalid",
                    "email_verified": True,
                    "name": "Other User",
                },
            )

    with configured_auth():
        monkeypatch.setattr("openforge_api.auth.httpx.AsyncClient", FakeAsyncClient)
        client = TestClient(app, follow_redirects=False)
        login_response = client.get("/auth/google/login")
        state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
        callback_response = client.get(f"/auth/google/callback?code=synthetic-code&state={state}")
        assert callback_response.status_code == 302
        assert callback_response.headers["location"] == "/login?error=not_authorized"
        assert SESSION_COOKIE_NAME not in callback_response.cookies


def test_vercel_api_mount_preserves_owner_authorization() -> None:
    from api.index import app as vercel_app

    with configured_auth():
        client = TestClient(vercel_app)
        assert client.get("/healthz").status_code == 200
        assert client.get("/api/profiles").status_code == 401
        assert client.post("/api/profiles", json={}).status_code == 401
