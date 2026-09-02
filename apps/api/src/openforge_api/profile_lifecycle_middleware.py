from __future__ import annotations

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from openforge_api.db import get_profile

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
COMMON_BET_PROFILE_PATHS = {
    "profile-actions",
    "profile-opportunities",
    "profile-overrides",
}


class ProfileLifecycleMiddleware:
    """Keep archived Profiles readable while rejecting new operational writes."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        profile_id = _operational_profile_id(scope)
        if profile_id:
            profile = get_profile(profile_id)
            if profile is not None and profile.status.casefold() == "archived":
                response = JSONResponse(
                    {
                        "detail": (
                            "Archived Profiles are read-only. Restore this Profile before "
                            "making operational changes."
                        )
                    },
                    status_code=409,
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def _operational_profile_id(scope: Scope) -> str:
    if scope["type"] != "http" or str(scope.get("method", "GET")).upper() not in UNSAFE_METHODS:
        return ""

    path = _application_path(scope)
    parts = tuple(part for part in path.strip("/").split("/") if part)
    if len(parts) >= 3 and parts[0] == "profiles":
        return parts[1]
    if (
        len(parts) >= 4
        and parts[:2] == ("fund-manager", "common-bet-combos")
        and parts[2] in COMMON_BET_PROFILE_PATHS
    ):
        return parts[3]
    return ""


def _application_path(scope: Scope) -> str:
    path = str(scope.get("path", ""))
    root_path = str(scope.get("root_path", "")).rstrip("/")
    if root_path and path.startswith(f"{root_path}/"):
        return path[len(root_path) :]
    return path
