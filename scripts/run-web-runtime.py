from __future__ import annotations

import argparse
import os
import subprocess
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


def validate_auth_environment(*, role: str, frontend_endpoint: str) -> None:
    if role != "normal-owner":
        return
    missing: list[str] = []
    if os.environ.get("OPENFORGE_AUTH_REQUIRED", "").casefold() != "true":
        missing.append("required authentication")
    if len(os.environ.get("OPENFORGE_AUTH_SESSION_SECRET", "").encode("utf-8")) < 32:
        missing.append("session signing configuration")
    if not os.environ.get("OPENFORGE_AUTH_OWNER_EMAILS", "").strip():
        missing.append("owner access configuration")
    configured_origin = os.environ.get("OPENFORGE_AUTH_PUBLIC_BASE_URL", "").rstrip("/")
    if configured_origin != frontend_endpoint.rstrip("/"):
        missing.append("local authentication origin")
    if missing:
        raise ValueError(
            "The normal-owner frontend cannot start because its canonical "
            f"authentication environment is incomplete: {', '.join(missing)}"
        )


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
    parser = argparse.ArgumentParser(description="Start a role-bound Plum Duff web runtime")
    parser.add_argument("--role", required=True, choices=("normal-owner", "candidate", "test"))
    parser.add_argument("--hostname", default="localhost")
    parser.add_argument("--port", type=int)
    parser.add_argument("--api-endpoint")
    parser.add_argument("--environment-file")
    parser.add_argument("--owner-approved-revision")
    args = parser.parse_args()

    try:
        environment_file, environment_classification = resolve_environment_file(
            role=args.role,
            explicit=args.environment_file,
        )
        load_environment_file(environment_file)
    except (OSError, subprocess.SubprocessError, ValueError) as error:
        parser.error(str(error))

    if args.role == "normal-owner":
        port = args.port or 3010
        api_endpoint = args.api_endpoint or "http://127.0.0.1:8010"
    else:
        if args.port is None or not args.api_endpoint:
            parser.error("candidate and test web runtimes require --port and --api-endpoint")
        port = args.port
        api_endpoint = args.api_endpoint

    frontend_endpoint = f"http://{args.hostname}:{port}"
    try:
        validate_auth_environment(role=args.role, frontend_endpoint=frontend_endpoint)
    except ValueError as error:
        parser.error(str(error))

    os.environ.update(
        {
            "OPENFORGE_RUNTIME_ROLE": args.role,
            "OPENFORGE_RUNTIME_SOURCE_ROOT": str(REPOSITORY_ROOT),
            "OPENFORGE_RUNTIME_SOURCE_REVISION": source_revision(),
            "OPENFORGE_RUNTIME_FRONTEND_ENDPOINT": frontend_endpoint,
            "OPENFORGE_RUNTIME_API_ENDPOINT": api_endpoint,
            "OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE": (
                f"run-web-runtime:{args.role}:{environment_classification}"
            ),
            "OPENFORGE_INTERNAL_API_BASE_URL": api_endpoint,
        }
    )
    if args.owner_approved_revision:
        os.environ["OPENFORGE_RUNTIME_OWNER_APPROVED_REVISION"] = args.owner_approved_revision
    os.execvp(
        "pnpm",
        [
            "pnpm",
            "--filter",
            "@openforge/web",
            "exec",
            "next",
            "dev",
            "--hostname",
            args.hostname,
            "--port",
            str(port),
        ],
    )


if __name__ == "__main__":
    main()
