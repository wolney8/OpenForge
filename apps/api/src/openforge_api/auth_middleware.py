from __future__ import annotations

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from openforge_api.auth import SESSION_COOKIE_NAME, read_session_token
from openforge_api.config import settings

PUBLIC_PATHS = {"/healthz"}
PUBLIC_PREFIXES = ("/auth/",)


class OwnerAuthenticationMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not settings.authentication_required:
            await self.app(scope, receive, send)
            return

        path = _application_path(scope)
        if path in PUBLIC_PATHS or path.startswith(PUBLIC_PREFIXES):
            await self.app(scope, receive, send)
            return

        cookie_header = Headers(scope=scope).get("cookie", "")
        session = read_session_token(_cookie_value(cookie_header, SESSION_COOKIE_NAME))
        if session is None or session.email.casefold() not in settings.owner_emails:
            response = JSONResponse(
                {"detail": "Access unavailable"},
                status_code=401,
                headers={"Cache-Control": "no-store"},
            )
            await response(scope, receive, send)
            return

        scope.setdefault("state", {})["auth_session"] = session
        await self.app(scope, receive, send)


def _cookie_value(cookie_header: str, name: str) -> str:
    for item in cookie_header.split(";"):
        key, separator, value = item.strip().partition("=")
        if separator and key == name:
            return value
    return ""


def _application_path(scope: Scope) -> str:
    path = str(scope.get("path", ""))
    root_path = str(scope.get("root_path", "")).rstrip("/")
    if root_path and path.startswith(f"{root_path}/"):
        return path[len(root_path) :]
    return path
