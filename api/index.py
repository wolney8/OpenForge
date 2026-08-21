from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
API_SOURCE_ROOT = REPOSITORY_ROOT / "apps" / "api" / "src"

if str(API_SOURCE_ROOT) not in sys.path:
    sys.path.insert(0, str(API_SOURCE_ROOT))

from openforge_api.main import app as plum_duff_api  # noqa: E402


app = FastAPI(title="Plum Duff Vercel API")
app.mount("/api", plum_duff_api)


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/config-summary")
def config_summary_redirect() -> RedirectResponse:
    return RedirectResponse(url="/api/config-summary", status_code=307)
