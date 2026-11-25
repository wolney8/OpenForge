"""Atomic Sportsbook revision checks with disposable Profile-owned rows."""

import json
from datetime import UTC, datetime

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi.testclient import TestClient

from openforge_api import db
from openforge_api.main import app

AUDIT_COUNT = (
    "SELECT COUNT(*) FROM sportsbook_bet_audit "
    "WHERE profile_id=? AND sportsbook_bet_id=?"
)
HISTORY_COUNT = (
    "SELECT COUNT(*) FROM financial_activity_history "
    "WHERE profile_id=? AND ledger_type='sportsbook' AND activity_id=?"
)


def _legs(*amounts: str) -> str:
    return json.dumps(
        [
            {
                "id": f"layleg{index}",
                "label": f"Lay leg {index}",
                "exchangeName": "Matchbook",
                "layOdds": "2.00",
                "matchedStake": amount,
                "isFinal": False,
            }
            for index, amount in enumerate(amounts, start=1)
        ]
    )


def test_competing_partial_lay_saves_conflict_before_history(monkeypatch):
    seed_synthetic_betting_context()
    monkeypatch.setattr(db, "utc_now", lambda: "2026-11-25T12:00:00Z")
    monkeypatch.setattr(
        db, "_sportsbook_revision_clock", lambda: datetime(2026, 11, 25, 12, 0, tzinfo=UTC)
    )
    client = TestClient(app)
    created = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json={
            "event_name": "Synthetic partial lay",
            "bookmaker": "Bookmaker A",
            "offer_type": "Sign up / Welcome",
            "status": "Placed",
            "result": "Pending",
            "back_stake": "10.00",
            "back_odds": "2.00",
            "match_strategy": "Standard",
            "lay_odds_1": "2.00",
            "lay_actual": "8.00",
            "lay_matched_stake_1": "5.00",
            "requested_lay_stake": "8.00",
            "exchange_name": "Matchbook",
            "multi_lay_outcomes_json": _legs("5.00"),
        },
    )
    assert created.status_code == 201, created.text
    first_read = created.json()
    second_read = client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{first_read['sportsbook_bet_id']}"
    ).json()
    assert first_read["updated_at"] == second_read["updated_at"]
    endpoint = f"/profiles/profile-demo-001/sportsbook-bets/{first_read['sportsbook_bet_id']}"
    expected = {"X-Expected-Record-Revision": first_read["updated_at"]}

    winner = client.put(
        endpoint,
        headers=expected,
        json={
            **first_read,
            "lay_matched_stake_1": "8.00",
            "multi_lay_outcomes_json": _legs("5.00", "3.00"),
        },
    )
    assert winner.status_code == 200, winner.text
    assert first_read["updated_at"] == "2026-11-25T12:00:00Z"
    assert winner.json()["updated_at"] == "2026-11-25T12:00:00.000001Z"
    with db.connect() as connection:
        before_stale = connection.execute(
            AUDIT_COUNT,
            ("profile-demo-001", first_read["sportsbook_bet_id"]),
        ).fetchone()[0]
        history_before_stale = connection.execute(
            HISTORY_COUNT,
            ("profile-demo-001", first_read["sportsbook_bet_id"]),
        ).fetchone()[0]
    loser = client.put(
        endpoint,
        headers=expected,
        json={
            **second_read,
            "lay_matched_stake_1": "6.00",
            "multi_lay_outcomes_json": _legs("5.00", "1.00"),
        },
    )
    assert loser.status_code == 409, loser.text
    saved = client.get(endpoint).json()
    assert saved["lay_matched_stake_1"] == "8.00"
    assert [leg["matchedStake"] for leg in json.loads(saved["multi_lay_outcomes_json"])] == [
        "5.00",
        "3.00",
    ]
    with db.connect() as connection:
        assert (
            connection.execute(
                AUDIT_COUNT,
                ("profile-demo-001", first_read["sportsbook_bet_id"]),
            ).fetchone()[0]
            == before_stale
        )
        assert (
            connection.execute(
                HISTORY_COUNT,
                ("profile-demo-001", first_read["sportsbook_bet_id"]),
            ).fetchone()[0]
            == history_before_stale
        )
    # A lost response can be recovered by reading the acknowledged total. A
    # second identical request with the new revision is a no-op, not a new leg.
    repeated = client.put(
        endpoint,
        headers={"X-Expected-Record-Revision": saved["updated_at"]},
        json={
            **saved,
            "lay_matched_stake_1": "8.00",
            "multi_lay_outcomes_json": _legs("5.00", "3.00"),
        },
    )
    assert repeated.status_code == 200, repeated.text
    assert repeated.json()["updated_at"] == saved["updated_at"]
    with db.connect() as connection:
        assert (
            connection.execute(
                AUDIT_COUNT,
                ("profile-demo-001", first_read["sportsbook_bet_id"]),
            ).fetchone()[0]
            == before_stale
        )
        assert (
            connection.execute(
                HISTORY_COUNT,
                ("profile-demo-001", first_read["sportsbook_bet_id"]),
            ).fetchone()[0]
            == history_before_stale
        )
    same_second = client.put(
        endpoint,
        headers={"X-Expected-Record-Revision": saved["updated_at"]},
        json={**saved, "event_name": "Synthetic partial lay reviewed"},
    )
    assert same_second.status_code == 200, same_second.text
    assert same_second.json()["updated_at"] == "2026-11-25T12:00:00.000002Z"
