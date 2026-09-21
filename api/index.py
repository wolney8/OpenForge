from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
API_SOURCE_ROOT = REPOSITORY_ROOT / "apps" / "api" / "src"

if str(API_SOURCE_ROOT) not in sys.path:
    sys.path.insert(0, str(API_SOURCE_ROOT))

from openforge_api.main import (  # noqa: E402
    app as plum_duff_api,
    config_summary as plum_duff_config_summary,
    healthcheck as plum_duff_healthcheck,
)


app = FastAPI(title="Plum Duff Vercel API")
app.mount("/api", plum_duff_api)


@app.get("/healthz", response_model=None)
def healthcheck() -> dict[str, str] | JSONResponse:
    """Expose database-aware readiness at the deployment's conventional health path."""

    return plum_duff_healthcheck()


@app.get("/config-summary")
def config_summary() -> dict[str, str]:
    return plum_duff_config_summary()
