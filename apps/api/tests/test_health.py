from contextlib import contextmanager
from typing import Iterator

from fastapi.testclient import TestClient

from openforge_api.config import SOURCE_ROOT, settings
from openforge_api.main import app


def configure_runtime(tmp_path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'health.sqlite3'}"
    settings.runtime_role = "test"
    settings.runtime_database_identity = "test-health"
    settings.runtime_source_root = str(SOURCE_ROOT)
    settings.runtime_source_revision = "synthetic-health-revision"
    settings.runtime_frontend_endpoint = "http://localhost:3999"
    settings.runtime_api_endpoint = "http://127.0.0.1:8999"
    settings.runtime_environment_source = "pytest:health"
    settings.runtime_database_target_explicit = True


def test_healthcheck(tmp_path) -> None:
    configure_runtime(tmp_path)
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["runtime_role"] == "test"
    assert payload["database_identity"] == "test-health"
    assert payload["database_classification"] == "isolated"
    assert payload["schema_version"] == "account-access-v1"
    assert "database_url" not in payload


def test_local_health_fails_closed_when_database_is_unavailable(monkeypatch, tmp_path) -> None:
    configure_runtime(tmp_path)
    @contextmanager
    def unavailable_database() -> Iterator[None]:
        raise RuntimeError("synthetic local database outage")
        yield

    monkeypatch.setattr("openforge_api.main.connect", unavailable_database)
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
