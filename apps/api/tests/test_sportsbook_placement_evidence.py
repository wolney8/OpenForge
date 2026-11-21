from __future__ import annotations

import sqlite3

import pytest
from apps.api.tests.synthetic_setup import (
    seed_committed_test_database,
    seed_synthetic_betting_context,
)
from fastapi.testclient import TestClient

from openforge_api import sportsbook_placement_migration as migration
from openforge_api.config import settings
from openforge_api.db import count_audit_rows
from openforge_api.main import app


def _payload() -> dict[str, object]:
    return {
        "event_name": "Synthetic placement evidence",
        "offer_text": "Demo Offer",
        "bookmaker": "Bookmaker A",
        "offer_type": "Sign up / Welcome",
        "status": "Prospecting",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.00",
        "match_strategy": "Standard",
        "lay_odds_1": "2.00",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "Matchbook",
        "date_settled": "2026-11-23T16:00:00Z",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }


@pytest.mark.parametrize("order", ["back-first", "lay-first", "back-only", "lay-only"])
def test_independent_placement_evidence_round_trip_and_audit(order: str) -> None:
    seed_synthetic_betting_context()
    client = TestClient(app)
    assert (
        client.put(
            "/profiles/profile-demo-001/exchange-commissions",
            json={"exchange_name": "Matchbook", "commission_rate": "0"},
        ).status_code
        == 200
    )
    payload = _payload()
    created_response = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert created_response.status_code == 201, created_response.text
    created = created_response.json()
    record_id = created["sportsbook_bet_id"]
    assert created["back_placement_confirmed"] is None
    assert created["requested_lay_stake"] is None
    assert created["reference_lay_stake_standard"] == "10.00"

    def save(fields: dict[str, object]) -> dict[str, object]:
        payload.update(fields)
        response = client.put(
            f"/profiles/profile-demo-001/sportsbook-bets/{record_id}", json=payload
        )
        assert response.status_code == 200, response.text
        return response.json()

    back = {"back_placement_confirmed": True, "status": "Placed"}
    lay = {
        "requested_lay_stake": "8.00",
        "lay_actual": "8.00",
        "lay_matched_stake_1": "5.00",
        "status": "Placed",
    }
    if order in {"back-first", "back-only"}:
        first = save(back)
        assert first["back_placement_confirmed"] is True
        assert first["lay_matched_stake_1"] == ""
    else:
        first = save(lay)
        assert first["back_placement_confirmed"] is None
        assert first["requested_lay_stake"] == "8.00"
        assert first["lay_matched_stake_1"] == "5.00"
    if order == "back-first":
        save(lay)
    if order == "lay-first":
        save(back)

    reopened = client.get(f"/profiles/profile-demo-001/sportsbook-bets/{record_id}")
    assert reopened.status_code == 200
    row = reopened.json()
    assert row["back_stake"] == "10.00"
    expected_back = True if order in {"back-first", "lay-first", "back-only"} else None
    assert row["back_placement_confirmed"] is expected_back
    assert row["requested_lay_stake"] == ("8.00" if order != "back-only" else None)
    assert row["lay_actual"] == ("8.00" if order != "back-only" else "")
    assert row["lay_matched_stake_1"] == ("5.00" if order != "back-only" else "")
    assert count_audit_rows("profile-demo-001", record_id) >= (
        3 if order in {"back-first", "lay-first"} else 2
    )
    history = client.get(f"/profiles/profile-demo-001/financial-history/sportsbook/{record_id}")
    assert history.status_code == 200
    latest = history.json()[-1]["after_snapshot"]
    assert latest["back_placement_confirmed"] == (1 if expected_back else None)
    assert latest["requested_lay_stake"] == row["requested_lay_stake"]
    assert latest["lay_matched_stake_1"] == row["lay_matched_stake_1"]
    assert client.get(f"/profiles/profile-demo-002/sportsbook-bets/{record_id}").status_code == 404


def test_terminal_placement_evidence_requires_audited_reason() -> None:
    seed_synthetic_betting_context()
    client = TestClient(app)
    assert (
        client.put(
            "/profiles/profile-demo-001/exchange-commissions",
            json={"exchange_name": "Matchbook", "commission_rate": "0"},
        ).status_code
        == 200
    )
    payload = {
        **_payload(),
        "status": "Settled",
        "result": "Back Won",
        "requested_lay_stake": "8.00",
        "lay_actual": "8.00",
        "lay_matched_stake_1": "5.00",
    }
    created = client.post("/profiles/profile-demo-001/sportsbook-bets", json=payload)
    assert created.status_code == 201, created.text
    record_id = created.json()["sportsbook_bet_id"]
    target = f"/profiles/profile-demo-001/sportsbook-bets/{record_id}"
    without_reason = client.put(target, json={**payload, "back_placement_confirmed": True})
    assert without_reason.status_code == 422
    assert "correction_reason" in without_reason.text
    reason = "Synthetic evidence review confirmed external Back receipt"
    corrected = client.put(
        target, json={**payload, "back_placement_confirmed": True, "correction_reason": reason}
    )
    assert corrected.status_code == 200, corrected.text
    history = client.get(
        f"/profiles/profile-demo-001/financial-history/sportsbook/{record_id}"
    ).json()
    assert history[-1]["operation"] == "corrected"
    assert history[-1]["reason"] == reason
    assert history[-1]["after_snapshot"]["back_placement_confirmed"] == 1


def test_existing_synthetic_rows_remain_unknown_after_explicit_migration() -> None:
    seed_committed_test_database()
    path = settings.database_path
    with sqlite3.connect(path) as connection:
        connection.execute("ALTER TABLE sportsbook_bets DROP COLUMN back_placement_confirmed")
        connection.execute("ALTER TABLE sportsbook_bets DROP COLUMN requested_lay_stake")
        before = connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0]
    assert migration.inspect("pytest-committed-synthetic-seed", "pytest-source") == "pending"
    backup, checksum = migration.apply("pytest-committed-synthetic-seed", "pytest-source")
    assert backup.is_file() and backup.stat().st_mode & 0o777 == 0o600 and len(checksum) == 64
    assert migration.inspect("pytest-committed-synthetic-seed", "pytest-source") == "installed"
    with sqlite3.connect(path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0] == before
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM sportsbook_bets WHERE "
                "back_placement_confirmed IS NOT NULL OR requested_lay_stake IS NOT NULL"
            ).fetchone()[0]
            == 0
        )
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    with pytest.raises(RuntimeError, match="already installed"):
        migration.apply("pytest-committed-synthetic-seed", "pytest-source")
