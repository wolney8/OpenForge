from __future__ import annotations

from openforge_api.config import SOURCE_ROOT, settings
from openforge_api.db import connect, create_account


def seed_synthetic_profile(
    profile_id: str = "profile-demo-001",
    *,
    display_name: str = "Subscriber Alpha",
    profile_code: str = "ALPHA-001",
) -> None:
    with connect() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                profile_id,
                display_name,
                profile_code,
                "Active",
                "2026-09-01",
                "0",
                "0",
                "0",
            ),
        )


def seed_synthetic_account(
    *, profile_id: str = "profile-demo-001", name: str, account_type: str
) -> None:
    with connect() as connection:
        existing = connection.execute(
            "SELECT 1 FROM accounts WHERE profile_id = ? AND account = ? AND type = ?",
            (profile_id, name, account_type),
        ).fetchone()
    if existing is not None:
        return
    create_account(
        profile_id,
        {
            "account": name,
            "type": account_type,
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
            "lifecycle_status": "Active",
            "signup_offer_status": "Unknown",
            "restrictions_json": "[]",
            "current_balance": "0.00",
            "pending_withdrawal_amount": "0.00",
            "last_balance_update": "",
            "group_name": "Synthetic",
            "platform": "Synthetic",
            "sign_up_date": "",
            "notes": "Committed deterministic test fixture",
        },
    )


def seed_synthetic_betting_context() -> None:
    seed_synthetic_profile()
    seed_synthetic_profile(
        "profile-demo-002",
        display_name="Subscriber Bravo",
        profile_code="BRAVO-002",
    )
    seed_synthetic_account(name="Bookmaker A", account_type="Bookie")
    seed_synthetic_account(name="Exchange A", account_type="Exchange")
    seed_synthetic_account(name="Matchbook", account_type="Exchange")
    seed_synthetic_account(name="Smarkets", account_type="Exchange")
    seed_synthetic_account(name="Unknown Exchange", account_type="Exchange")
    seed_synthetic_account(name="Bank A", account_type="Bank")


def seed_committed_test_database() -> None:
    """Initialise the complete deterministic seed without private local files."""

    previous = settings.tracker_seed_source
    settings.tracker_seed_source = str(
        SOURCE_ROOT / "tests/fixtures/openforge-api-seed.synthetic.json"
    )
    try:
        with connect():
            pass
    finally:
        settings.tracker_seed_source = previous
