from __future__ import annotations

import json

from test_account_money_safety import money_client  # noqa: F401
from test_free_bet_atomic_safety import free_client  # noqa: F401
from test_sportsbook_atomic_safety import payload

from openforge_api import db


PROMOTION = json.dumps(
    {
        "schema_version": "sportsbook-promotion-v1",
        "reward_type": "BonusFunds",
        "reward_status": "Locked",
    },
    sort_keys=True,
)


def add_promotion_columns() -> None:
    with db.connect() as connection:
        connection.execute(
            "ALTER TABLE sportsbook_bets ADD COLUMN offer_group_id TEXT NOT NULL DEFAULT ''"
        )
        connection.execute(
            "ALTER TABLE sportsbook_bets ADD COLUMN bet_role TEXT NOT NULL DEFAULT 'Standalone'"
        )
        connection.execute(
            "ALTER TABLE sportsbook_bets ADD COLUMN wagering_contribution TEXT NOT NULL DEFAULT ''"
        )
        connection.execute("ALTER TABLE sportsbook_bets ADD COLUMN promotion_json TEXT")


def stored_promotion(sportsbook_bet_id: str) -> tuple[str, str, str, str | None]:
    with db.connect() as connection:
        row = connection.execute(
            """
            SELECT offer_group_id, bet_role, wagering_contribution, promotion_json
            FROM sportsbook_bets WHERE sportsbook_bet_id = ?
            """,
            (sportsbook_bet_id,),
        ).fetchone()
    assert row is not None
    return tuple(row)  # type: ignore[return-value]


def test_fallback_reads_additive_schema_and_preserves_promotion_metadata(free_client) -> None:  # noqa: F811
    made = free_client.post(
        "/profiles/money-a/sportsbook-bets",
        json=payload(sportsbook_bet_id="SB-ROLLBACK-COMPAT", user_notes="Before rollback"),
    )
    assert made.status_code == 201, made.text
    add_promotion_columns()
    with db.connect() as connection:
        connection.execute(
            """
            UPDATE sportsbook_bets
            SET offer_group_id = ?, bet_role = ?, wagering_contribution = ?, promotion_json = ?
            WHERE sportsbook_bet_id = ?
            """,
            ("OFG-ROLLBACK", "Wagering", "12.50", PROMOTION, "SB-ROLLBACK-COMPAT"),
        )

    read = free_client.get("/profiles/money-a/sportsbook-bets/SB-ROLLBACK-COMPAT")
    assert read.status_code == 200, read.text
    assert read.json()["user_notes"] == "Before rollback"

    edited = free_client.put(
        "/profiles/money-a/sportsbook-bets/SB-ROLLBACK-COMPAT",
        json=payload(sportsbook_bet_id="SB-ROLLBACK-COMPAT", user_notes="After rollback"),
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["user_notes"] == "After rollback"
    assert stored_promotion("SB-ROLLBACK-COMPAT") == (
        "OFG-ROLLBACK",
        "Wagering",
        "12.50",
        PROMOTION,
    )


def test_fallback_rejects_promotion_edits_it_cannot_govern(free_client) -> None:  # noqa: F811
    with db.connect() as connection:
        before = [dict(row) for row in connection.execute("SELECT * FROM sportsbook_bets")]
    response = free_client.post(
        "/profiles/money-a/sportsbook-bets",
        json=payload(offer_group_id="OFG-UNSUPPORTED", bet_role="Trigger"),
    )
    assert response.status_code == 422
    assert "sportsbook promotions release" in response.text
    with db.connect() as connection:
        after = [dict(row) for row in connection.execute("SELECT * FROM sportsbook_bets")]
    assert after == before
