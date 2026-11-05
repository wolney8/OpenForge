"""Disposable, independently authenticated real-application CP-117 fixture runner.

Run through scripts/run-python.sh. This never reads a normal environment file,
accepts an owner token, or copies an existing database. Only committed synthetic
fixtures and the established runtime/session authorities are used.
"""

from __future__ import annotations

import argparse
import errno
import json
import os
from pathlib import Path
import secrets
import signal
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = "cp117-integration-synthetic"
NORMAL_PORTS = {3010, 8010}


def validate_ports(web: int, api: int, auth: int) -> None:
    ports = (web, api, auth)
    if len(set(ports)) != 3 or any(
        p in NORMAL_PORTS or not 1024 <= p <= 65535 for p in ports
    ):
        raise ValueError(
            "Use three distinct unprivileged disposable ports, excluding 3010/8010"
        )


def fixture_environment(
    root: Path, runtime: Path, web: int, api: int
) -> dict[str, str]:
    # An inherited owner setting cannot override the generated fixture configuration.
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith(("OPENFORGE_", "NEXT_PUBLIC_", "VERCEL", "UVICORN_"))
    }
    env.update(
        {
            "OPENFORGE_AUTH_REQUIRED": "true",
            "OPENFORGE_E2E_AUTH_BYPASS": "false",
            "OPENFORGE_AUTH_SESSION_SECRET": secrets.token_urlsafe(64),
            "OPENFORGE_AUTH_OWNER_EMAILS": "demo@example.invalid",
            "OPENFORGE_AUTH_PUBLIC_BASE_URL": f"http://127.0.0.1:{web}",
            "OPENFORGE_GOOGLE_OAUTH_CLIENT_ID": "",
            "OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET": "",
            "OPENFORGE_THE_ODDS_API_KEY": "",
            "OPENFORGE_NEON_DATABASE_URL": "",
            "OPENFORGE_DATABASE_MODE": "local",
            "OPENFORGE_DATABASE_URL": f"sqlite:///{runtime / 'synthetic.sqlite3'}",
            "OPENFORGE_TRACKER_SEED_SOURCE": str(
                root / "tests/fixtures/openforge-api-seed.synthetic.json"
            ),
            "OPENFORGE_ACCOUNT_CATALOGUE_SOURCE": str(
                root / "tests/fixtures/openforge-api-master-catalogue.synthetic.json"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_SOURCE": "",
            "OPENFORGE_WORKBOOK_TEMPLATE_HELPER_SOURCE": "",
            "OPENFORGE_BACKUP_DIRECTORY": str(runtime / "backups"),
            "OPENFORGE_RUNTIME_ROLE": "candidate",
            "OPENFORGE_RUNTIME_DATABASE_IDENTITY": IDENTITY,
            "OPENFORGE_RUNTIME_SOURCE_ROOT": str(root),
            "OPENFORGE_RUNTIME_SOURCE_REVISION": subprocess.check_output(
                ["git", "-C", str(root), "rev-parse", "HEAD"], text=True
            ).strip(),
            "OPENFORGE_RUNTIME_FRONTEND_ENDPOINT": f"http://127.0.0.1:{web}",
            "OPENFORGE_RUNTIME_API_ENDPOINT": f"http://127.0.0.1:{api}",
            "OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE": "cp117:generated-synthetic-only",
            "OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT": "true",
            "OPENFORGE_CORS_ALLOW_ORIGINS": f"http://127.0.0.1:{web}",
            "OPENFORGE_FUND_MANAGER_UX_V2": "true",
            "OPENFORGE_DESIGN_LAB_ENABLED": "true",
            "OPENFORGE_TASK_ANNOTATIONS_ISOLATED_ENABLED": "true",
            "UVICORN_ACCESS_LOG": "false",
            "NEXT_TELEMETRY_DISABLED": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
        }
    )
    return env


def assert_clean_environment_sources(root: Path) -> None:
    names = (".env", ".env.local", ".env.development", ".env.development.local")
    if (root / "_input").exists() and any(
        path.suffix.lower() in {".xlsx", ".xlsm", ".xls"}
        for path in (root / "_input").iterdir()
    ):
        raise ValueError(
            "Private workbook inputs are not allowed in the synthetic fixture worktree"
        )
    if any(
        (base / name).exists() for base in (root, root / "apps/web") for name in names
    ):
        raise ValueError(
            "Use a clean source worktree without automatic environment files; no owner configuration fallback is permitted"
        )
    if any(
        (root / path).exists()
        for path in (
            "data/private/local-seed/openforge-tracker-seed.json",
            "apps/web/data/private/local-seed/openforge-tracker-seed.json",
        )
    ):
        raise ValueError(
            "Private source seeds are not allowed in this synthetic fixture worktree"
        )


def seed_and_issue_session(env: dict[str, str]) -> str:
    for key in list(os.environ):
        if key.startswith(("OPENFORGE_", "VERCEL", "NEXT_PUBLIC_")):
            del os.environ[key]
    os.environ.update(env)
    sys.path[:0] = [str(ROOT / "apps/api/src"), str(ROOT)]
    from openforge_api.config import settings
    from openforge_api.runtime_safety import validate_runtime_contract
    from apps.api.tests.synthetic_setup import (
        seed_committed_test_database,
        seed_synthetic_betting_context,
    )
    from openforge_api.db import (
        create_sportsbook_bet,
        create_each_way_extra_place,
        create_casino_offer,
        create_free_bet,
    )
    from openforge_api.casino_offers import CasinoOfferPayload
    from openforge_api.each_way_extra_places import EachWayExtraPlacePayload
    from openforge_api.auth import create_session_token

    identity = validate_runtime_contract(settings)
    if identity.database_classification != "isolated" or settings.owner_emails != {
        "demo@example.invalid"
    }:
        raise ValueError(
            "Synthetic runtime/session authority is not independently isolated"
        )
    seed_committed_test_database()
    seed_synthetic_betting_context()
    from openforge_api.task_annotations import install_isolated_schema

    install_isolated_schema()
    from openforge_api.accounts import AccountWritePayload, update_profile_account
    from openforge_api.db import get_account

    account = get_account("profile-demo-001", "ACC-BOOK-A")
    assert account is not None
    update_profile_account(
        "profile-demo-001",
        "ACC-BOOK-A",
        AccountWritePayload(
            account="Bookmaker A",
            type="Bookie",
            status="Active",
            catalogue_id="BOOKMAKER-DEMO-001",
            current_balance=account.current_balance,
            pending_withdrawal_amount=account.pending_withdrawal_amount,
            counts_in_cash_total=account.counts_in_cash_total,
            channel="Online",
            access_channels=["Online"],
            notes=account.notes,
        ),
    )
    for index in (1, 2):
        create_sportsbook_bet(
            "profile-demo-001",
            {
                "sportsbook_bet_id": f"CP117-CELL-00{index}",
                "event_name": f"Synthetic cell review {index}",
                "offer_text": "Demo Offer",
                "bookmaker": "Bookmaker A",
                "offer_type": "Sign up / Welcome",
                "bet_type": "Single",
                "fixture_type": "Football",
                "status": "Prospecting",
                "result": "Pending",
                "back_stake": "10.00",
                "back_odds": "2.10",
                "match_strategy": "Standard",
                "lay_odds_1": "2.20",
                "lay_commission_1": "0.02",
                "exchange_name": "Matchbook",
                "date_settled": "2026-11-03",
                "user_notes": "Synthetic integration fixture",
            },
        )
    # Existing Extra Place workflow fixture, no speculative financial combinations.
    create_each_way_extra_place(
        "profile-demo-001",
        EachWayExtraPlacePayload(
            each_way_extra_place_id="CP117-EP-001",
            placed_at="2026-08-24T12:00:00Z",
            runner="Synthetic Runner",
            race="Synthetic 14:30",
            bookmaker="Bookmaker A",
            bookmaker_account="Bookmaker A",
            mode="Extra Place",
            each_way_stake="10.00",
            back_odds="6.00",
            place_term_denominator="5",
            win_exchange="Exchange A",
            win_lay_odds="2.30",
            win_commission="0",
            place_exchange="Exchange A",
            place_lay_odds="4.50",
            place_commission="0",
            status="Placed",
            result="Pending",
        ).model_dump(),
    )
    # Canonical form of the committed Free Spins example. Keep the legacy seed
    # unchanged so tests can verify that its normalization requires full review.
    create_casino_offer(
        "profile-demo-001",
        CasinoOfferPayload(
            casino_offer_id="CP117-CAS-001",
            date_started="2026-01-05T12:00:00Z",
            date_settling="2026-01-05T12:00:00Z",
            bookmaker="Bookmaker A",
            offer_type="Free Spins",
            offer_name="Synthetic casino cell fixture",
            game="Synthetic Game",
            cash_stake="10.00",
            free_spins_awarded="10",
            free_spins_value="2.00",
            reward_type="FreeSpins",
            expected_reward_cash_value="2.00",
            status="Prospecting",
            result="Pending",
            user_notes="Committed synthetic financial tuple; unactivated review fixture",
        ).model_dump(),
    )
    # Existing SNR financial tuple, unactivated so settled correction stays gated.
    create_free_bet(
        "profile-demo-001",
        {
            "free_bet_id": "CP117-FB-001",
            "event_name": "Synthetic free bet cell",
            "bookmaker": "Bookmaker A",
            "offer_type": "Free Bet",
            "bet_type": "Single",
            "offer_name": "Demo Free Bet",
            "fixture_type": "Football",
            "status": "Prospecting",
            "result": "Pending",
            "retention_mode": "SNR",
            "free_bet_value": "10.00",
            "back_odds": "4.00",
            "match_strategy": "Standard",
            "lay_odds_1": "4.20",
            "lay_actual": "7.18",
            "lay_matched_stake_1": "7.18",
            "lay_commission_1": "0.02",
            "exchange_name": "Matchbook",
            "expiry_datetime": "2026-01-31T12:00:00Z",
            "date_settling": "2026-01-03T12:00:00Z",
        },
    )
    return create_session_token(
        subject="USER-001", email="demo@example.invalid", name="Demo User"
    )


def wait_ready(
    url: str, process: subprocess.Popen[bytes] | None = None, *, identity: bool = False
) -> None:
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise RuntimeError(
                "A fixture service exited before readiness; no normal service was started"
            )
        try:
            with urlopen(url, timeout=3) as response:
                if response.status == 200:
                    if identity:
                        health = json.load(response)
                        if (
                            health.get("database_identity") != IDENTITY
                            or health.get("database_classification") != "isolated"
                        ):
                            raise RuntimeError(
                                "Fixture health does not prove synthetic isolation"
                            )
                    return
        except (URLError, TimeoutError):
            pass
        time.sleep(0.3)
    raise RuntimeError("Synthetic fixture service readiness timed out")


def verify_authenticated_route(web: int, auth: int) -> None:
    """Mount the client route using only the new synthetic bootstrap cookie."""
    source = r"""
const {chromium} = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => localStorage.setItem('pd-required-storage-notice', 'acknowledged'));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:' + process.argv[2] + '/');
    await page.goto('http://127.0.0.1:' + process.argv[1] + '/profiles/profile-demo-001/tracker/sportsbook-bets');
    await page.getByRole('heading', {name:'Sportsbook Bets', exact:true, level:1}).waitFor({timeout:60000});
  } finally { await browser.close(); }
})().catch(() => process.exit(1));
"""
    browser_env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith(("OPENFORGE_", "NEXT_PUBLIC_"))
    }
    result = subprocess.run(
        ["node", "-e", source, str(web), str(auth)],
        cwd=ROOT,
        env=browser_env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=90,
    )
    if result.returncode:
        raise RuntimeError(
            "Synthetic authenticated route did not mount; no owner fallback is permitted"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web-port", type=int, default=3127)
    parser.add_argument("--api-port", type=int, default=8127)
    parser.add_argument("--auth-port", type=int, default=9127)
    parser.add_argument(
        "--test", action="store_true", help="Run V2 and flag-OFF integrated tests"
    )
    parser.add_argument(
        "--keep-running",
        action="store_true",
        help="Retain the disposable review runtime after tests",
    )
    parser.add_argument("--grep", help="Focused V2 test selection; rollback still runs")
    parser.add_argument(
        "--visual",
        action="store_true",
        help="Run complete V2 visual suite before rollback",
    )
    args = parser.parse_args()

    def interrupted(*_: object) -> None:
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupted)
    validate_ports(args.web_port, args.api_port, args.auth_port)
    assert_clean_environment_sources(ROOT)
    for port in (args.web_port, args.api_port, args.auth_port):
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                raise RuntimeError(
                    "A requested disposable port is already in use; this runner never stops existing services"
                ) from None
    private = ROOT / "data/private"
    private.mkdir(parents=True, exist_ok=True)
    processes: list[subprocess.Popen[bytes]] = []
    server: HTTPServer | None = None
    temporary_manager: tempfile.TemporaryDirectory[str] | None = None

    def stop(process: subprocess.Popen[bytes]) -> None:
        if process.poll() is not None:
            return
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()

    try:
        temporary_manager = tempfile.TemporaryDirectory(
            prefix="cp117-synthetic-", dir=private
        )
        runtime = Path(temporary_manager.name)
        runtime.chmod(0o700)
        env = fixture_environment(ROOT, runtime, args.web_port, args.api_port)
        envfile = runtime / "synthetic.env"
        fd = os.open(envfile, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w") as stream:
            for key, value in env.items():
                if key.startswith("OPENFORGE_"):
                    stream.write(key + "=" + json.dumps(value) + "\n")
        token = seed_and_issue_session(env)

        class Bootstrap(BaseHTTPRequestHandler):
            def log_message(self, *_: object) -> None:
                pass

            def do_GET(self) -> None:
                if (
                    self.path != "/"
                    or self.headers.get("Host") != f"127.0.0.1:{args.auth_port}"
                    or self.headers.get("Sec-Fetch-Site") == "cross-site"
                ):
                    self.send_error(403)
                    return
                self.send_response(302)
                self.send_header(
                    "Set-Cookie",
                    f"pd_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200",
                )
                self.send_header(
                    "Location", f"http://127.0.0.1:{args.web_port}/profiles"
                )
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", "0")
                self.end_headers()

        server = HTTPServer(("127.0.0.1", args.auth_port), Bootstrap)
        threading.Thread(target=server.serve_forever, daemon=True).start()

        def launch(kind: str, *, legacy: bool = False) -> subprocess.Popen[bytes]:
            if kind == "web":
                # This source worktree has one Next dev graph. Never reuse a
                # stale graph across fixture/flag runs or disturb a running one.
                graph = ROOT / "apps/web/.next/dev"
                # The supervised wrapper may exit just before Next releases
                # its lock. Wait briefly; a persistent owner still fails shut.
                for _ in range(50):
                    if not (graph / "lock").exists():
                        break
                    time.sleep(0.1)
                if (graph / "lock").exists():
                    raise RuntimeError("Another Next runtime owns this source worktree")
                if graph.exists():
                    for attempt in range(50):
                        if (graph / "lock").exists():
                            raise RuntimeError("Another Next runtime owns this source worktree")
                        try:
                            shutil.rmtree(graph)
                            break
                        except OSError as error:
                            if error.errno != errno.ENOTEMPTY or attempt == 49:
                                raise
                            time.sleep(0.1)
            command = [
                str(ROOT / "scripts/run-python.sh"),
                f"scripts/run-{kind}-runtime.py",
                "--role",
                "candidate",
                "--environment-file",
                str(envfile),
            ]
            if kind == "api":
                command += [
                    "--database-target",
                    env["OPENFORGE_DATABASE_URL"],
                    "--database-identity",
                    IDENTITY,
                    "--frontend-endpoint",
                    env["OPENFORGE_RUNTIME_FRONTEND_ENDPOINT"],
                    "--api-endpoint",
                    env["OPENFORGE_RUNTIME_API_ENDPOINT"],
                    "--port",
                    str(args.api_port),
                ]
            else:
                command += [
                    "--hostname",
                    "127.0.0.1",
                    "--port",
                    str(args.web_port),
                    "--api-endpoint",
                    env["OPENFORGE_RUNTIME_API_ENDPOINT"],
                ]
            launch_env = {
                **env,
                "OPENFORGE_FUND_MANAGER_UX_V2": "false" if legacy else "true",
            }
            process = subprocess.Popen(
                command,
                cwd=ROOT,
                env=launch_env,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            processes.append(process)
            return process

        api = launch("api")
        web = launch("web")
        wait_ready(f"http://127.0.0.1:{args.api_port}/healthz", api, identity=True)
        wait_ready(f"http://127.0.0.1:{args.web_port}/login", web)
        verify_authenticated_route(args.web_port, args.auth_port)
        print(
            json.dumps(
                {
                    "ready": True,
                    "identity": IDENTITY,
                    "preview": f"http://127.0.0.1:{args.web_port}",
                    "synthetic_signin": f"http://127.0.0.1:{args.auth_port}/",
                    "owner_configuration_used": False,
                }
            ),
            flush=True,
        )
        if args.test:
            # Only endpoint metadata enters the browser test process; no secret/token file.
            browser_env = {
                k: v for k, v in env.items() if not k.startswith("OPENFORGE_")
            }
            browser_env.update(
                OPENFORGE_CP117_BASE_URL=f"http://127.0.0.1:{args.web_port}",
                OPENFORGE_CP117_AUTH_URL=f"http://127.0.0.1:{args.auth_port}/",
            )
            command = [
                "pnpm",
                "exec",
                "playwright",
                "test",
                "--config",
                "playwright.cp117-integration.config.ts",
            ]
            result = subprocess.run(
                command + (["--grep", args.grep] if args.grep else []),
                cwd=ROOT,
                env=browser_env,
            )
            if result.returncode:
                return result.returncode
            if args.visual:
                result = subprocess.run(
                    [
                        "pnpm",
                        "exec",
                        "playwright",
                        "test",
                        "--config",
                        "playwright.cp117-visual.config.ts",
                    ],
                    cwd=ROOT,
                    env=browser_env,
                )
                if result.returncode:
                    return result.returncode
            stop(web)
            web = launch("web", legacy=True)
            wait_ready(f"http://127.0.0.1:{args.web_port}/login", web)
            verify_authenticated_route(args.web_port, args.auth_port)
            result = subprocess.run(
                command
                + ["--grep", "flag OFF|Notification History|shared settings filters"],
                cwd=ROOT,
                env={**browser_env, "OPENFORGE_CP117_VERIFY_LEGACY": "true"},
            )
            if result.returncode:
                return result.returncode
            stop(web)
            if args.keep_running:
                web = launch("web")
                wait_ready(f"http://127.0.0.1:{args.web_port}/login", web)
                verify_authenticated_route(args.web_port, args.auth_port)
                print(
                    "V2 and legacy verification passed; independent V2 restored.",
                    flush=True,
                )
            else:
                print(
                    "V2 and legacy verification passed; synthetic runtime stopped.",
                    flush=True,
                )
        if not args.test or args.keep_running:
            while True:
                if api.poll() is not None or web.poll() is not None:
                    raise RuntimeError("A review runtime service stopped")
                time.sleep(1)
        return 0
    finally:
        if server is not None:
            server.shutdown()
        for process in reversed(processes):
            stop(process)
        if temporary_manager is not None:
            temporary_manager.cleanup()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
