from __future__ import annotations

import json
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def test_vercel_services_route_api_before_frontend_catch_all() -> None:
    config = json.loads((REPOSITORY_ROOT / "vercel.json").read_text(encoding="utf-8"))

    assert config["services"]["frontend"] == {
        "root": "apps/web/",
        "framework": "nextjs",
    }
    assert config["services"]["backend"] == {
        "root": "api/",
        "framework": "fastapi",
        "entrypoint": "index:app",
    }
    assert config["rewrites"][0] == {
        "source": "/api/:path*",
        "destination": {"service": "backend"},
    }
    assert config["rewrites"][-1] == {
        "source": "/(.*)",
        "destination": {"service": "frontend"},
    }
