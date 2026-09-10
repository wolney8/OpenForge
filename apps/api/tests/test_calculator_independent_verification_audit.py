from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


FIXTURE_PATH = (
    Path(__file__).parents[3] / "tests/fixtures/calculator-independent-verification-v1.json"
)
FIXTURES = json.loads(FIXTURE_PATH.read_text())


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    settings.database_url = f"sqlite:///{tmp_path / 'calculator-independent-audit.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    settings.environment = "local"
    settings.auth_required = False
    return TestClient(app)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda case: case["id"])
def test_independently_derived_fixture_matches_public_preview(
    client: TestClient, case: dict[str, object]
) -> None:
    response = client.post(
        f"/fund-manager/calculators/{case['endpoint']}/preview", json=case["payload"]
    )
    assert response.status_code == 200, (case["id"], response.text)
    actual = response.json()
    known_difference = case.get("known_actual_difference")
    for key, expected in case["expected"].items():  # type: ignore[union-attr]
        if isinstance(known_difference, dict) and key in known_difference:
            assert actual[key] == known_difference[key]
        else:
            assert actual[key] == expected, (case["id"], key, actual[key], expected)


@pytest.mark.parametrize(
    "value",
    ["1,000", "1,000.5", "3,,1", "£3.1", "3.1abc", "1e2", "NaN", "Infinity", ""],
)
def test_audit_malformed_odds_fail_closed(client: TestClient, value: str) -> None:
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": "qualifying",
            "strategy": "Standard",
            "back_stake": "10",
            "back_odds": value,
            "lay_odds": "4.2",
            "exchange_commission": "0.02",
        },
    )
    assert response.status_code == 422


@pytest.mark.parametrize(("value", "canonical"), [("11/4", "3.75"), ("3,1", "3.1")])
def test_audit_odds_normalization_is_explicit(
    client: TestClient, value: str, canonical: str
) -> None:
    response = client.post(
        "/fund-manager/calculators/matched-betting/preview",
        json={
            "bet_type": "qualifying",
            "strategy": "Standard",
            "back_stake": "10",
            "back_odds": value,
            "lay_odds": "4.2",
            "exchange_commission": "0.02",
        },
    )
    assert response.status_code == 200
    assert response.json()["canonical_back_odds"] == canonical
