from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from dotenv import dotenv_values


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]


def primary_checkout_root() -> Path:
    common = subprocess.run(
        [
            "git",
            "-C",
            str(REPOSITORY_ROOT),
            "rev-parse",
            "--path-format=absolute",
            "--git-common-dir",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    common_path = Path(common).resolve()
    return common_path.parent if common_path.name == ".git" else common_path


def resolve_environment_file(*, role: str, explicit: str | None) -> tuple[Path | None, str]:
    if explicit:
        selected = Path(explicit).expanduser().resolve()
        if not selected.is_file():
            raise ValueError("The explicit runtime environment file does not exist")
        return selected, "explicit-env-file"

    source_environment = REPOSITORY_ROOT / ".env"
    if source_environment.is_file():
        return source_environment, "source-checkout-env"

    if role == "normal-owner":
        owner_environment = primary_checkout_root() / ".env"
        if owner_environment.is_file():
            return owner_environment, "primary-checkout-owner-env"

    return None, "process-environment-only"


def load_environment_file(path: Path | None) -> None:
    if path is None:
        return
    for name, value in dotenv_values(path).items():
        if value is not None:
            os.environ.setdefault(name, value)


def source_revision() -> str:
    revision = subprocess.run(
        ["git", "-C", str(REPOSITORY_ROOT), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    dirty = subprocess.run(
        ["git", "-C", str(REPOSITORY_ROOT), "status", "--porcelain", "--untracked-files=normal"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    return f"{revision}+dirty" if dirty else revision


def main() -> None:
    parser = argparse.ArgumentParser(description="Start a role-bound Plum Duff API runtime")
    parser.add_argument("--role", required=True, choices=("normal-owner", "candidate", "test"))
    parser.add_argument("--database-target")
    parser.add_argument("--database-identity")
    parser.add_argument("--frontend-endpoint")
    parser.add_argument("--api-endpoint")
    parser.add_argument("--port", type=int)
    parser.add_argument("--environment-source")
    parser.add_argument("--environment-file")
    parser.add_argument("--owner-approved-revision")
    args = parser.parse_args()

    try:
        environment_file, environment_classification = resolve_environment_file(
            role=args.role,
            explicit=args.environment_file,
        )
    except (OSError, subprocess.SubprocessError, ValueError) as error:
        parser.error(str(error))
    load_environment_file(environment_file)

    if args.role == "normal-owner":
        owner_root = primary_checkout_root()
        database_target = args.database_target or (
            f"sqlite:///{owner_root / 'data/private/db/openforge.sqlite3'}"
        )
        database_identity = args.database_identity or "normal-owner"
        frontend_endpoint = args.frontend_endpoint or "http://localhost:3010"
        api_endpoint = args.api_endpoint or "http://127.0.0.1:8010"
        port = args.port or 8010
    else:
        missing = [
            name
            for name, value in (
                ("--database-target", args.database_target),
                ("--database-identity", args.database_identity),
                ("--frontend-endpoint", args.frontend_endpoint),
                ("--api-endpoint", args.api_endpoint),
                ("--port", args.port),
            )
            if not value
        ]
        if missing:
            parser.error(f"{args.role} runtimes require explicit {', '.join(missing)}")
        database_target = args.database_target
        database_identity = args.database_identity
        frontend_endpoint = args.frontend_endpoint
        api_endpoint = args.api_endpoint
        port = args.port

    assert database_target is not None
    assert database_identity is not None
    assert frontend_endpoint is not None
    assert api_endpoint is not None
    assert port is not None
    if database_target.startswith(("postgres://", "postgresql://")):
        os.environ["OPENFORGE_DATABASE_MODE"] = "postgresql"
        os.environ["OPENFORGE_NEON_DATABASE_URL"] = database_target
    else:
        os.environ["OPENFORGE_DATABASE_MODE"] = "local"
        os.environ["OPENFORGE_DATABASE_URL"] = database_target
    os.environ.update(
        {
            "OPENFORGE_RUNTIME_ROLE": args.role,
            "OPENFORGE_RUNTIME_DATABASE_IDENTITY": database_identity,
            "OPENFORGE_RUNTIME_SOURCE_ROOT": str(REPOSITORY_ROOT),
            "OPENFORGE_RUNTIME_SOURCE_REVISION": source_revision(),
            "OPENFORGE_RUNTIME_FRONTEND_ENDPOINT": frontend_endpoint,
            "OPENFORGE_RUNTIME_API_ENDPOINT": api_endpoint,
            "OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE": (
                args.environment_source
                or f"run-api-runtime:{args.role}:{environment_classification}"
            ),
            "OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT": "true",
        }
    )
    if args.owner_approved_revision:
        os.environ["OPENFORGE_RUNTIME_OWNER_APPROVED_REVISION"] = args.owner_approved_revision
    os.execv(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "openforge_api.main:app",
            "--app-dir",
            "apps/api/src",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
    )


if __name__ == "__main__":
    main()
