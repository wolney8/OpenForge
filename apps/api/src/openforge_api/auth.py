from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from openforge_api.config import settings

SESSION_COOKIE_NAME = "pd_session"
OAUTH_STATE_COOKIE_NAME = "pd_oauth_state"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

router = APIRouter(prefix="/auth", tags=["authentication"])


@dataclass(frozen=True)
class AuthSession:
    subject: str
    email: str
    name: str
    role: str
    issued_at: int
    expires_at: int

    def as_dict(self) -> dict[str, str | int]:
        return {
            "sub": self.subject,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "iat": self.issued_at,
            "exp": self.expires_at,
            "iss": "plum-duff-api",
            "aud": "plum-duff",
        }


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _base64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _require_session_secret() -> str:
    secret = settings.auth_session_secret
    if len(secret.encode("utf-8")) < 32:
        raise HTTPException(
            status_code=503,
            detail="Authentication is not configured: session secret must be at least 32 bytes",
        )
    return secret


def _sign_payload(payload: dict[str, Any], *, secret: str | None = None) -> str:
    encoded_payload = _base64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_secret = secret or _require_session_secret()
    signature = hmac.new(
        signing_secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256
    ).digest()
    return f"{encoded_payload}.{_base64url_encode(signature)}"


def _verify_payload(token: str, *, secret: str | None = None) -> dict[str, Any] | None:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        signing_secret = secret or _require_session_secret()
        expected_signature = hmac.new(
            signing_secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256
        ).digest()
        supplied_signature = _base64url_decode(encoded_signature)
        if not hmac.compare_digest(expected_signature, supplied_signature):
            return None
        payload = json.loads(_base64url_decode(encoded_payload))
        if not isinstance(payload, dict):
            return None
        if int(payload.get("exp", 0)) <= int(time.time()):
            return None
        return payload
    except (HTTPException, TypeError, ValueError, json.JSONDecodeError):
        return None


def create_session_token(
    *, subject: str, email: str, name: str, now: int | None = None, secret: str | None = None
) -> str:
    issued_at = int(time.time()) if now is None else now
    return _sign_payload(
        AuthSession(
            subject=subject,
            email=email.casefold(),
            name=name,
            role="fund_manager",
            issued_at=issued_at,
            expires_at=issued_at + settings.auth_session_ttl_seconds,
        ).as_dict(),
        secret=secret,
    )


def read_session_token(token: str, *, secret: str | None = None) -> AuthSession | None:
    payload = _verify_payload(token, secret=secret)
    if (
        payload is None
        or payload.get("iss") != "plum-duff-api"
        or payload.get("aud") != "plum-duff"
        or payload.get("role") != "fund_manager"
    ):
        return None
    try:
        if not str(payload["sub"]).strip() or not str(payload["email"]).strip():
            return None
        return AuthSession(
            subject=str(payload["sub"]),
            email=str(payload["email"]),
            name=str(payload.get("name", "Fund Manager")),
            role=str(payload["role"]),
            issued_at=int(payload["iat"]),
            expires_at=int(payload["exp"]),
        )
    except (KeyError, TypeError, ValueError):
        return None


def _safe_next_path(value: str | None) -> str:
    if value and value.startswith("/") and not value.startswith("//"):
        return value
    return "/profiles"


def _cookie_secure() -> bool:
    return settings.auth_origin.startswith("https://")


def _callback_uri() -> str:
    return f"{settings.auth_origin}/api/auth/google/callback"


@router.get("/google/login")
def google_login(next: str | None = None) -> RedirectResponse:
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    _require_session_secret()
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = _base64url_encode(hashlib.sha256(verifier.encode("ascii")).digest())
    state_token = _sign_payload(
        {
            "state": state,
            "verifier": verifier,
            "next": _safe_next_path(next),
            "exp": int(time.time()) + 600,
        }
    )
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": _callback_uri(),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
        }
    )
    response = RedirectResponse(f"{GOOGLE_AUTHORIZE_URL}?{query}", status_code=302)
    response.set_cookie(
        OAUTH_STATE_COOKIE_NAME,
        state_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request, code: str | None = None, state: str | None = None
) -> RedirectResponse:
    state_token = request.cookies.get(OAUTH_STATE_COOKIE_NAME, "")
    state_payload = _verify_payload(state_token)
    if state_payload is None or not state or state_payload.get("state") != state or not code:
        response = RedirectResponse("/login?error=invalid_oauth_state", status_code=302)
        response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
        return response

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_oauth_client_id,
                    "client_secret": settings.google_oauth_client_secret,
                    "code": code,
                    "code_verifier": str(state_payload["verifier"]),
                    "grant_type": "authorization_code",
                    "redirect_uri": _callback_uri(),
                },
            )
        except httpx.HTTPError:
            token_response = None
        if token_response is None or token_response.status_code != 200:
            response = RedirectResponse("/login?error=oauth_exchange_failed", status_code=302)
            response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
            return response
        try:
            access_token = str(token_response.json().get("access_token", ""))
        except (TypeError, ValueError, json.JSONDecodeError):
            access_token = ""
        if not access_token:
            response = RedirectResponse("/login?error=oauth_exchange_failed", status_code=302)
            response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
            return response
        try:
            user_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        except httpx.HTTPError:
            user_response = None

    if user_response is None or user_response.status_code != 200:
        response = RedirectResponse("/login?error=oauth_identity_failed", status_code=302)
        response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
        return response

    try:
        identity = user_response.json()
    except (TypeError, ValueError, json.JSONDecodeError):
        identity = {}
    subject = str(identity.get("sub", "")).strip()
    email = str(identity.get("email", "")).strip().casefold()
    if not subject or not identity.get("email_verified") or email not in settings.owner_emails:
        response = RedirectResponse("/login?error=not_authorized", status_code=302)
        response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
        return response

    session_token = create_session_token(
        subject=subject,
        email=email,
        name=str(identity.get("name", email)),
    )
    response = RedirectResponse(
        _safe_next_path(str(state_payload.get("next", ""))), status_code=302
    )
    response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=settings.auth_session_ttl_seconds,
        path="/",
    )
    return response


@router.get("/session")
def get_session(request: Request) -> JSONResponse:
    session = read_session_token(request.cookies.get(SESSION_COOKIE_NAME, ""))
    if session is None or session.email.casefold() not in settings.owner_emails:
        return JSONResponse({"authenticated": False}, status_code=401)
    return JSONResponse(
        {
            "authenticated": True,
            "email": session.email,
            "name": session.name,
            "role": session.role,
            "expires_at": session.expires_at,
        }
    )


@router.post("/logout", status_code=204)
def logout() -> Response:
    response = Response(status_code=204)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
    return response
