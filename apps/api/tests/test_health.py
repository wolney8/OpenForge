from contextlib import contextmanager
from typing import Iterator

from fastapi.testclient import TestClient

from openforge_api.main import app


def test_healthcheck() -> None:
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_local_health_fails_closed_when_database_is_unavailable(monkeypatch) -> None:
    @contextmanager
    def unavailable_database() -> Iterator[None]:
        raise RuntimeError("synthetic local database outage")
        yield

    monkeypatch.setattr("openforge_api.main.connect", unavailable_database)
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
