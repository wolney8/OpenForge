"""Resume only the owned authenticated synthetic award API; local file fault control."""
import os
from pathlib import Path
import sys

runtime = Path("/tmp/openforge-award-integrity-91-20260914").resolve()
assert runtime.is_dir() and (runtime / "acceptance.sqlite3").is_file()
assert (runtime / "session-token").is_file()
os.environ.update(
    OPENFORGE_AUTH_REQUIRED="true",
    OPENFORGE_AUTH_OWNER_EMAILS="notification-acceptance@example.invalid",
    OPENFORGE_AUTH_SESSION_SECRET="synthetic-notification-acceptance-secret-not-used-in-production",
    OPENFORGE_DATABASE_MODE="local",
    OPENFORGE_DATABASE_URL="sqlite:///" + str(runtime / "acceptance.sqlite3"),
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
uvicorn.run(app, host="127.0.0.1", port=8039, log_level="warning")
