from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def test_vercel_services_route_api_before_frontend_catch_all() -> None:
    config = json.loads((REPOSITORY_ROOT / "vercel.json").read_text(encoding="utf-8"))

    assert config["services"]["frontend"] == {
        "root": "apps/web/",
        "framework": "nextjs",
    }
    assert config["services"]["backend"] == {
        "root": ".",
        "framework": "fastapi",
        "entrypoint": "api.index:app",
    }
    assert config["rewrites"][0] == {
        "source": "/api/:path*",
        "destination": {"service": "backend"},
    }
    assert config["rewrites"][-1] == {
        "source": "/(.*)",
        "destination": {"service": "frontend"},
    }


def test_vercel_backend_service_can_package_api_source_and_runtime_data() -> None:
    config = json.loads((REPOSITORY_ROOT / "vercel.json").read_text(encoding="utf-8"))
    backend_root = (REPOSITORY_ROOT / config["services"]["backend"]["root"]).resolve()

    assert (backend_root / "api" / "index.py").is_file()
    assert (backend_root / "apps" / "api" / "src" / "openforge_api" / "main.py").is_file()
    assert (backend_root / "data" / "reference" / "master-account-catalogue.json").is_file()
    assert (backend_root / "requirements.txt").read_text(encoding="utf-8").strip() == (
        "-r api/requirements.txt"
    )


def test_hosted_brand_logo_bypasses_next_image_optimizer() -> None:
    source = (REPOSITORY_ROOT / "apps" / "web" / "components" / "brand-logo.tsx").read_text(
        encoding="utf-8"
    )

    assert "unoptimized" in source


def test_vercel_wrapper_starts_and_mounts_api() -> None:
    from api.index import app

    client = TestClient(app)

    assert client.get("/healthz").json() == {"status": "ok"}
    assert client.get("/api/healthz").json() == {"status": "ok"}
