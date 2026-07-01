from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator
from uuid import uuid4

from openforge_api.config import settings


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_tracker_seed() -> dict[str, Any] | None:
    root = Path(__file__).resolve().parents[4]
    candidate_paths = [
        root / "data" / "private" / "local-seed" / "openforge-tracker-seed.json",
        root / "apps" / "web" / "data" / "private" / "local-seed" / "openforge-tracker-seed.json",
    ]

    for path in candidate_paths:
        if path.exists():
            return json.loads(path.read_text())

    return None


def normalize_seed_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    database_path = settings.database_path
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        initialize_database(connection)
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS profiles (
          profile_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          profile_code TEXT NOT NULL,
          status TEXT NOT NULL,
          tracking_start_date TEXT NOT NULL,
          management_fee_percent TEXT NOT NULL,
          investment_fee_percent TEXT NOT NULL,
          current_cash_snapshot TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sportsbook_bets (
          sportsbook_bet_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          event_name TEXT NOT NULL,
          offer_text TEXT NOT NULL,
          bookmaker TEXT NOT NULL,
          offer_type TEXT NOT NULL,
          status TEXT NOT NULL,
          result TEXT NOT NULL,
          back_stake TEXT NOT NULL,
          back_odds TEXT NOT NULL,
          match_strategy TEXT NOT NULL,
          lay_odds_1 TEXT NOT NULL,
          lay_commission_1 TEXT NOT NULL DEFAULT '',
          exchange_name TEXT NOT NULL,
          date_settled TEXT NOT NULL,
          user_notes TEXT NOT NULL,
          manual_override_value TEXT NOT NULL,
          manual_override_reason TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sportsbook_bet_audit (
          audit_id TEXT PRIMARY KEY,
          sportsbook_bet_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (sportsbook_bet_id)
            REFERENCES sportsbook_bets(sportsbook_bet_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );
        """
    )
    ensure_column(connection, "sportsbook_bets", "lay_commission_1", "TEXT NOT NULL DEFAULT ''")
    seed_database(connection)


def ensure_column(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_definition: str,
) -> None:
    existing = {
        row["name"]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in existing:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )


def seed_database(connection: sqlite3.Connection) -> None:
    profile_count = connection.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
    sportsbook_count = connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0]

    if profile_count > 0 and sportsbook_count > 0:
        return

    seed = load_tracker_seed()
    if seed is None:
        return

    if profile_count == 0:
        for profile in seed.get("profiles", []):
            connection.execute(
                """
                INSERT INTO profiles (
                  profile_id,
                  display_name,
                  profile_code,
                  status,
                  tracking_start_date,
                  management_fee_percent,
                  investment_fee_percent,
                  current_cash_snapshot
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile["profileId"],
                    profile["displayName"],
                    profile["profileCode"],
                    profile["status"],
                    profile["trackingStartDate"],
                    profile["managementFeePercent"],
                    profile["investmentFeePercent"],
                    profile["currentCashSnapshot"],
                ),
            )

    if sportsbook_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            for row in profile.get("trackerData", {}).get("sportsbook-bets", []):
                payload = {
                    "sportsbook_bet_id": row.get("id", f"seed-{uuid4().hex[:8]}"),
                    "profile_id": profile["profileId"],
                    "event_name": normalize_seed_text(
                        row.get("eventName"), f"Seed event {row.get('id', '')}".strip()
                    ),
                    "offer_text": normalize_seed_text(row.get("offer")),
                    "bookmaker": normalize_seed_text(row.get("bookmaker"), "Bookmaker A"),
                    "offer_type": normalize_seed_text(row.get("offerType")),
                    "status": normalize_seed_text(row.get("status"), "Prospecting"),
                    "result": normalize_seed_text(row.get("result"), "Pending"),
                    "back_stake": normalize_seed_text(row.get("backStake")),
                    "back_odds": normalize_seed_text(row.get("backOdds")),
                    "match_strategy": normalize_seed_text(
                        row.get("matchStrategy"), "Standard"
                    ),
                    "lay_odds_1": normalize_seed_text(row.get("layOdds1")),
                    "lay_commission_1": normalize_seed_text(row.get("layCommission1")),
                    "exchange_name": normalize_seed_text(row.get("exchange"), "Exchange A"),
                    "date_settled": normalize_seed_text(row.get("dateSettling")),
                    "user_notes": "",
                    "manual_override_value": "",
                    "manual_override_reason": "",
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                connection.execute(
                    """
                    INSERT INTO sportsbook_bets (
                      sportsbook_bet_id,
                      profile_id,
                      event_name,
                      offer_text,
                      bookmaker,
                      offer_type,
                      status,
                      result,
                      back_stake,
                      back_odds,
                      match_strategy,
                      lay_odds_1,
                      lay_commission_1,
                      exchange_name,
                      date_settled,
                      user_notes,
                      manual_override_value,
                      manual_override_reason,
                      created_at,
                      updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    tuple(payload.values()),
                )
                write_audit_entry(
                    connection=connection,
                    sportsbook_bet_id=payload["sportsbook_bet_id"],
                    profile_id=payload["profile_id"],
                    action="seeded",
                    payload=payload,
                )


def write_audit_entry(
    connection: sqlite3.Connection,
    sportsbook_bet_id: str,
    profile_id: str,
    action: str,
    payload: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO sportsbook_bet_audit (
          audit_id,
          sportsbook_bet_id,
          profile_id,
          action,
          changed_at,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"audit-{uuid4().hex}",
            sportsbook_bet_id,
            profile_id,
            action,
            utc_now(),
            json.dumps(payload, sort_keys=True),
        ),
    )


@dataclass(frozen=True)
class SportsbookBetRecord:
    sportsbook_bet_id: str
    profile_id: str
    event_name: str
    offer_text: str
    bookmaker: str
    offer_type: str
    status: str
    result: str
    back_stake: str
    back_odds: str
    match_strategy: str
    lay_odds_1: str
    lay_commission_1: str
    exchange_name: str
    date_settled: str
    user_notes: str
    manual_override_value: str
    manual_override_reason: str
    created_at: str
    updated_at: str


def map_row(row: sqlite3.Row) -> SportsbookBetRecord:
    return SportsbookBetRecord(**dict(row))


def list_sportsbook_bets(profile_id: str) -> list[SportsbookBetRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM sportsbook_bets
            WHERE profile_id = ?
            ORDER BY date_settled DESC, sportsbook_bet_id DESC
            """,
            (profile_id,),
        ).fetchall()
    return [map_row(row) for row in rows]


def get_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> SportsbookBetRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM sportsbook_bets
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (profile_id, sportsbook_bet_id),
        ).fetchone()
    return None if row is None else map_row(row)


def create_sportsbook_bet(profile_id: str, payload: dict[str, str]) -> SportsbookBetRecord:
    record = {
        "sportsbook_bet_id": payload.get("sportsbook_bet_id") or f"SB-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "event_name": payload["event_name"],
        "offer_text": payload["offer_text"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload["offer_type"],
        "status": payload["status"],
        "result": payload["result"],
        "back_stake": payload["back_stake"],
        "back_odds": payload["back_odds"],
        "match_strategy": payload["match_strategy"],
        "lay_odds_1": payload["lay_odds_1"],
        "lay_commission_1": payload["lay_commission_1"],
        "exchange_name": payload["exchange_name"],
        "date_settled": payload["date_settled"],
        "user_notes": payload["user_notes"],
        "manual_override_value": payload["manual_override_value"],
        "manual_override_reason": payload["manual_override_reason"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO sportsbook_bets (
              sportsbook_bet_id,
              profile_id,
              event_name,
              offer_text,
              bookmaker,
              offer_type,
              status,
              result,
              back_stake,
              back_odds,
              match_strategy,
              lay_odds_1,
              lay_commission_1,
              exchange_name,
              date_settled,
              user_notes,
              manual_override_value,
              manual_override_reason,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
        write_audit_entry(
            connection=connection,
            sportsbook_bet_id=record["sportsbook_bet_id"],
            profile_id=profile_id,
            action="created",
            payload=record,
        )
    created = get_sportsbook_bet(profile_id, record["sportsbook_bet_id"])
    assert created is not None
    return created


def update_sportsbook_bet(
    profile_id: str,
    sportsbook_bet_id: str,
    payload: dict[str, str],
) -> SportsbookBetRecord | None:
    existing = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if existing is None:
        return None

    updated = {
        "event_name": payload["event_name"],
        "offer_text": payload["offer_text"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload["offer_type"],
        "status": payload["status"],
        "result": payload["result"],
        "back_stake": payload["back_stake"],
        "back_odds": payload["back_odds"],
        "match_strategy": payload["match_strategy"],
        "lay_odds_1": payload["lay_odds_1"],
        "lay_commission_1": payload["lay_commission_1"],
        "exchange_name": payload["exchange_name"],
        "date_settled": payload["date_settled"],
        "user_notes": payload["user_notes"],
        "manual_override_value": payload["manual_override_value"],
        "manual_override_reason": payload["manual_override_reason"],
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            UPDATE sportsbook_bets
            SET
              event_name = ?,
              offer_text = ?,
              bookmaker = ?,
              offer_type = ?,
              status = ?,
              result = ?,
              back_stake = ?,
              back_odds = ?,
              match_strategy = ?,
              lay_odds_1 = ?,
              lay_commission_1 = ?,
              exchange_name = ?,
              date_settled = ?,
              user_notes = ?,
              manual_override_value = ?,
              manual_override_reason = ?,
              updated_at = ?
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (
                updated["event_name"],
                updated["offer_text"],
                updated["bookmaker"],
                updated["offer_type"],
                updated["status"],
                updated["result"],
                updated["back_stake"],
                updated["back_odds"],
                updated["match_strategy"],
                updated["lay_odds_1"],
                updated["lay_commission_1"],
                updated["exchange_name"],
                updated["date_settled"],
                updated["user_notes"],
                updated["manual_override_value"],
                updated["manual_override_reason"],
                updated["updated_at"],
                profile_id,
                sportsbook_bet_id,
            ),
        )
        write_audit_entry(
            connection=connection,
            sportsbook_bet_id=sportsbook_bet_id,
            profile_id=profile_id,
            action="updated",
            payload={"sportsbook_bet_id": sportsbook_bet_id, "profile_id": profile_id, **updated},
        )
    return get_sportsbook_bet(profile_id, sportsbook_bet_id)


def count_audit_rows(profile_id: str, sportsbook_bet_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM sportsbook_bet_audit
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (profile_id, sportsbook_bet_id),
        ).fetchone()
    return int(row["count"])
