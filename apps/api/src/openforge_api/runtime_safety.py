from __future__ import annotations

import hashlib
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from openforge_api.config import SOURCE_ROOT, Settings

ALLOWED_RUNTIME_ROLES = frozenset({"normal-owner", "candidate", "test"})
ISOLATED_RUNTIME_ROLES = frozenset({"candidate", "test"})
OWNER_DATABASE_IDENTITY = "normal-owner"


class RuntimeSafetyError(RuntimeError):
    """The process cannot prove that its source, purpose and database belong together."""


@dataclass(frozen=True)
class RuntimeIdentity:
    role: str
    source_revision: str
    database_engine: str
    database_identity: str
    database_fingerprint: str
    database_classification: str
    frontend_endpoint: str
    api_endpoint: str
    environment_source: str


def _canonical_postgres_target(connection_url: str) -> str:
    parsed = urlsplit(connection_url)
    hostname = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port is not None else ""
    return urlunsplit(
        (parsed.scheme.casefold(), f"{hostname.casefold()}{port}", parsed.path, "", "")
    )


def _source_revision(configured: str) -> str:
    if configured.strip():
        return configured.strip()
    try:
        return subprocess.run(
            ["git", "-C", str(SOURCE_ROOT), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            timeout=3,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return "unknown"


@lru_cache(maxsize=1)
def _primary_checkout_root() -> Path:
    try:
        common = subprocess.run(
            [
                "git",
                "-C",
                str(SOURCE_ROOT),
                "rev-parse",
                "--path-format=absolute",
                "--git-common-dir",
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=3,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError) as error:
        raise RuntimeSafetyError(
            "Runtime source is not attached to a verifiable Git checkout"
        ) from error
    common_path = Path(common).resolve()
    return common_path.parent if common_path.name == ".git" else common_path


def _database_target(settings: Settings) -> tuple[str, str]:
    mode = settings.database_mode.strip().casefold() or "local"
    if mode in {"neon", "postgres", "postgresql"}:
        if not settings.neon_database_url.strip():
            raise RuntimeSafetyError("PostgreSQL runtime requires an explicit database target")
        return "postgresql", _canonical_postgres_target(settings.neon_database_url)
    if mode not in {"local", "sqlite", "recovery-local"}:
        raise RuntimeSafetyError(f"Unsupported runtime database mode: {settings.database_mode!r}")
    if not settings.database_url.strip():
        raise RuntimeSafetyError("SQLite runtime requires an explicit database target")
    return "sqlite", str(settings.database_path.resolve())


def validate_runtime_contract(settings: Settings) -> RuntimeIdentity:
    role = settings.runtime_role.strip().casefold()
    identity = settings.runtime_database_identity.strip().casefold()
    configured_source = settings.runtime_source_root.strip()
    if role not in ALLOWED_RUNTIME_ROLES:
        raise RuntimeSafetyError(
            "OPENFORGE_RUNTIME_ROLE must explicitly be normal-owner, candidate, or test"
        )
    if not identity:
        raise RuntimeSafetyError("OPENFORGE_RUNTIME_DATABASE_IDENTITY is required")
    if not configured_source:
        raise RuntimeSafetyError("OPENFORGE_RUNTIME_SOURCE_ROOT is required")
    if Path(configured_source).resolve() != SOURCE_ROOT:
        raise RuntimeSafetyError(
            "Configured runtime source does not match the running source checkout"
        )
    if not settings.runtime_frontend_endpoint.strip() or not settings.runtime_api_endpoint.strip():
        raise RuntimeSafetyError(
            "Frontend and API endpoints must be explicit in the runtime contract"
        )
    if not settings.runtime_environment_source.strip():
        raise RuntimeSafetyError("The runtime environment source must be explicit")

    engine, target = _database_target(settings)
    if role in ISOLATED_RUNTIME_ROLES and not settings.runtime_database_target_explicit:
        raise RuntimeSafetyError(
            "An isolated candidate/test runtime requires an explicit database target"
        )
    primary_root = _primary_checkout_root()
    owner_target = str((primary_root / "data/private/db/openforge.sqlite3").resolve())
    is_owner_target = engine == "sqlite" and target == owner_target

    if role in ISOLATED_RUNTIME_ROLES:
        if identity == OWNER_DATABASE_IDENTITY or is_owner_target:
            raise RuntimeSafetyError(
                "An isolated candidate/test runtime cannot use the normal-owner database"
            )
        if engine == "sqlite" and not Path(target).is_absolute():
            raise RuntimeSafetyError("An isolated SQLite target must be an absolute path")
        classification = "isolated"
    else:
        if identity != OWNER_DATABASE_IDENTITY:
            raise RuntimeSafetyError(
                "The normal owner runtime requires the normal-owner database identity"
            )
        if not is_owner_target:
            raise RuntimeSafetyError(
                "The normal owner runtime must use the canonical normal database"
            )
        if SOURCE_ROOT.resolve() != primary_root:
            approved_revision = settings.runtime_owner_approved_revision.strip()
            actual_revision = _source_revision(settings.runtime_source_revision)
            if not approved_revision or approved_revision != actual_revision:
                raise RuntimeSafetyError(
                    "A normal-owner runtime outside the primary checkout requires its exact "
                    "source revision to be explicitly approved"
                )
        if not settings.authentication_required:
            raise RuntimeSafetyError("The normal owner runtime requires authentication")
        if (
            not settings.owner_emails
            or len(settings.auth_session_secret.encode("utf-8")) < 32
            or not settings.google_oauth_client_id.strip()
            or not settings.google_oauth_client_secret.strip()
        ):
            raise RuntimeSafetyError(
                "The normal owner runtime requires complete owner and Google "
                "authentication configuration"
            )
        classification = "normal-owner"

    fingerprint = hashlib.sha256(f"{engine}:{target}".encode()).hexdigest()[:16]
    return RuntimeIdentity(
        role=role,
        source_revision=_source_revision(settings.runtime_source_revision),
        database_engine=engine,
        database_identity=identity,
        database_fingerprint=fingerprint,
        database_classification=classification,
        frontend_endpoint=settings.runtime_frontend_endpoint.strip(),
        api_endpoint=settings.runtime_api_endpoint.strip(),
        environment_source=settings.runtime_environment_source.strip(),
    )
