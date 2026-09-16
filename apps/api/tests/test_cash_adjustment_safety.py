from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.main import app

PROFILE_ID = "cash-safety-a"


def configure_database(tmp_path: Path) -> TestClient:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'cash-safety.sqlite3'}"
    settings.auth_required = False
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profiles (
              profile_id, display_name, profile_code, status, tracking_start_date,
              management_fee_percent, investment_fee_percent, current_cash_snapshot
            ) VALUES (?, 'Cash Safety', 'CASH-SAFE', 'Active', '2026-09-01', '0', '0', '0.00')
            """,
            (PROFILE_ID,),
        )
    return TestClient(app)


def payload(**overrides: object) -> dict[str, object]:
    return {
        "adjustment_date": "2026-09-16T12:00",
        "direction": "In",
        "amount": "25.00",
        "adjustment_type": "Deposit",
        "affects_investment": False,
        "affects_cash_snapshot": False,
        "linked_account": "",
        "description": "Synthetic cash safety",
        **overrides,
    }


@pytest.mark.parametrize(
    "amount",
    ["not-money", "NaN", "Infinity", "-Infinity", "1.234", "", "-1.00"],
)
def test_invalid_amount_is_rejected_before_record_or_audit_write(
    tmp_path: Path, amount: str
) -> None:
    client = configure_database(tmp_path)

    response = client.post(
        f"/profiles/{PROFILE_ID}/cash-adjustments", json=payload(amount=amount)
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "amount"
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM cash_adjustments").fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM cash_adjustment_audit").fetchone()[0] == 0


def test_invalid_update_keeps_value_timestamp_and_audit_unchanged(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    created = client.post(
        f"/profiles/{PROFILE_ID}/cash-adjustments", json=payload()
    ).json()
    with connect() as connection:
        before = dict(
            connection.execute(
                "SELECT amount, updated_at FROM cash_adjustments WHERE cash_adjustment_id = ?",
                (created["cash_adjustment_id"],),
            ).fetchone()
        )
        audit_count = connection.execute(
            "SELECT COUNT(*) FROM cash_adjustment_audit WHERE cash_adjustment_id = ?",
            (created["cash_adjustment_id"],),
        ).fetchone()[0]

    response = client.put(
        f"/profiles/{PROFILE_ID}/cash-adjustments/{created['cash_adjustment_id']}",
        json=payload(amount="NaN"),
    )

    assert response.status_code == 422
    with connect() as connection:
        after = dict(
            connection.execute(
                "SELECT amount, updated_at FROM cash_adjustments WHERE cash_adjustment_id = ?",
                (created["cash_adjustment_id"],),
            ).fetchone()
        )
        after_audit_count = connection.execute(
            "SELECT COUNT(*) FROM cash_adjustment_audit WHERE cash_adjustment_id = ?",
            (created["cash_adjustment_id"],),
        ).fetchone()[0]
    assert after == before
    assert after_audit_count == audit_count


def test_valid_zero_and_signed_direction_are_preserved(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    zero = client.post(
        f"/profiles/{PROFILE_ID}/cash-adjustments", json=payload(amount="0")
    )
    outgoing = client.post(
        f"/profiles/{PROFILE_ID}/cash-adjustments",
        json=payload(direction="Out", adjustment_type="Correction", amount="10"),
    )

    assert zero.status_code == 201
    assert zero.json()["amount"] == "0.00"
    assert zero.json()["signed_amount"] == "0.00"
    assert outgoing.status_code == 201
    assert outgoing.json()["amount"] == "10.00"
    assert outgoing.json()["signed_amount"] == "-10.00"


def test_invalid_date_is_rejected_without_a_write(tmp_path: Path) -> None:
    client = configure_database(tmp_path)

    response = client.post(
        f"/profiles/{PROFILE_ID}/cash-adjustments",
        json=payload(adjustment_date="not-a-date"),
    )

    assert response.status_code == 422
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM cash_adjustments").fetchone()[0] == 0
