"""Resume only the owned authenticated synthetic award API; local file fault control."""
import os
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
import sys

runtime = Path("/tmp/openforge-award-integrity-91-20260914").resolve()
assert runtime.is_dir() and (runtime / "acceptance.sqlite3").is_file()
assert (runtime / "session-token").is_file()
workspace = Path(__file__).resolve().parents[1]
checkout = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=workspace, text=True).strip()
api_source = subprocess.check_output(["git", "log", "-1", "--format=%H", "--", "apps/api/src"], cwd=workspace, text=True).strip()
(runtime / "review-source.json").write_text(json.dumps({
    "checkout": checkout, "api_source": api_source, "workspace": str(workspace),
    "started_at": datetime.now(timezone.utc).isoformat(), "api_port": 8039,
    "database": str(runtime / "acceptance.sqlite3"),
}, indent=2))
os.environ.update(
    OPENFORGE_AUTH_REQUIRED="true",
    OPENFORGE_AUTH_OWNER_EMAILS="notification-acceptance@example.invalid",
    OPENFORGE_AUTH_SESSION_SECRET="synthetic-notification-acceptance-secret-not-used-in-production",
    OPENFORGE_DATABASE_MODE="local",
    OPENFORGE_DATABASE_URL="sqlite:///" + str(runtime / "acceptance.sqlite3"),
    OPENFORGE_RUNTIME_ROLE="test",
    OPENFORGE_RUNTIME_DATABASE_IDENTITY="award-integrity-91",
    OPENFORGE_RUNTIME_SOURCE_ROOT=str(workspace),
    OPENFORGE_RUNTIME_SOURCE_REVISION=checkout,
    OPENFORGE_RUNTIME_FRONTEND_ENDPOINT="http://localhost:3040",
    OPENFORGE_RUNTIME_API_ENDPOINT="http://127.0.0.1:8039",
    OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE="run_award_integrity_api_91.py",
    OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT="true",
)
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api/src"))
from openforge_api.main import app  # noqa: E402 - test environment must precede app import
from openforge_api import free_bets  # noqa: E402
import uvicorn  # noqa: E402

original = free_bets.prepare_write_response
seen = {}
marker = runtime / "fail-second-child"


def prepare(*args, **kwargs):
    row = args[0]
    if marker.is_file() and row.source_award_group_id:
        ids = seen.setdefault(row.source_award_group_id, set())
        ids.add(row.free_bet_id)
        if len(ids) == 2:
            marker.unlink()
            raise RuntimeError("Synthetic second-child response-preparation fault")
    return original(*args, **kwargs)


free_bets.prepare_write_response = prepare
from openforge_api import free_bet_awards
free_bet_awards.prepare_write_response = prepare
uvicorn.run(app, host="127.0.0.1", port=8039, log_level="warning")
