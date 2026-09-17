from __future__ import annotations

import sqlite3
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import (
    connect,
    create_account,
    create_cash_adjustment,
    create_import_batch,
    get_financial_history,
    register_import_source_record,
    reresolve_imported_free_bet_parent,
    update_cash_adjustment,
)
from openforge_api.financial_history import (
    FinancialHistoryConflictError,
    append_history_event,
)
from openforge_api.main import app


def configure_database(tmp_path: Path) -> None:
    settings.environment = "local"
    settings.auth_required = False
    settings.database_url = f"sqlite:///{tmp_path / 'identity-history.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")
    with connect() as connection:
        for profile_id, code in (
            ("profile-demo-001", "SYNTHETIC-A"),
            ("profile-demo-002", "SYNTHETIC-B"),
        ):
            connection.execute(
                "INSERT OR IGNORE INTO profiles VALUES (?,?,?,?,?,?,?,?)",
                (profile_id, profile_id, code, "Active", "2026-01-01", "0", "0", "0"),
            )
    for profile_id in ("profile-demo-001", "profile-demo-002"):
        for name, account_type in (("Bookmaker A", "Bookie"), ("Exchange A", "Exchange")):
            create_account(
                profile_id,
                {
                    "account": name,
                    "type": account_type,
                    "counts_in_cash_total": True,
                    "channel": "Online",
                    "status": "Active",
                    "lifecycle_status": "Active",
                    "restrictions_json": "[]",
                    "current_balance": "0.00",
                    "pending_withdrawal_amount": "0.00",
                    "last_balance_update": "",
                    "group_name": "Synthetic",
                    "platform": "Synthetic",
                },
            )


def import_batch(profile_id: str, batch_id: str) -> None:
    create_import_batch(
        profile_id,
        {
            "import_batch_id": batch_id,
            "source_filename": "synthetic.xlsx",
            "source_type": "xlsx",
            "mapping_version": "synthetic-v1",
            "status": "confirmed",
            "row_count": 0,
            "error_count": 0,
            "warning_count": 0,
            "summary_json": "{}",
        },
        [],
    )


def test_source_identity_is_profile_scoped_and_retry_safe(tmp_path: Path) -> None:
    configure_database(tmp_path)
    import_batch("profile-demo-001", "BATCH-A")
    import_batch("profile-demo-002", "BATCH-B")

    first = register_import_source_record(
        profile_id="profile-demo-001",
        source_namespace="sportsbook",
        source_sheet="Renamed Physical Tab",
        source_record_id="SOURCE-X",
        source_hash="hash-a",
        import_batch_id="BATCH-A",
        entity_type="sportsbook_bet",
        entity_id="SB-A",
    )
    retry = register_import_source_record(
        profile_id="profile-demo-001",
        source_namespace="sportsbook",
        source_sheet="Another Physical Tab Name",
        source_record_id="SOURCE-X",
        source_hash="hash-a",
        import_batch_id="BATCH-A",
        entity_type="sportsbook_bet",
        entity_id="SB-A",
    )
    other_profile = register_import_source_record(
        profile_id="profile-demo-002",
        source_namespace="sportsbook",
        source_sheet="Sportsbook Bets",
        source_record_id="SOURCE-X",
        source_hash="hash-b",
        import_batch_id="BATCH-B",
        entity_type="sportsbook_bet",
        entity_id="SB-B",
    )

    assert retry == first
    assert other_profile.profile_id == "profile-demo-002"
    with pytest.raises(ValueError, match="changed contents"):
        register_import_source_record(
            profile_id="profile-demo-001",
            source_namespace="sportsbook",
            source_sheet="Sportsbook Bets",
            source_record_id="SOURCE-X",
            source_hash="changed",
            import_batch_id="BATCH-A",
            entity_type="sportsbook_bet",
            entity_id="SB-A",
        )


def test_append_only_history_is_idempotent_and_not_a_report_transaction(
    tmp_path: Path,
) -> None:
    configure_database(tmp_path)
    created = create_cash_adjustment(
        "profile-demo-001",
        {
            "cash_adjustment_id": "CA-HISTORY-001",
            "adjustment_date": "2026-09-16",
            "direction": "Out",
            "amount": "10.00",
            "adjustment_type": "Correction fixture",
            "affects_investment": True,
            "affects_cash_snapshot": True,
            "linked_account": "",
            "description": "Initial synthetic value",
            "_history_operation_id": "history-create-ca-001",
        },
    )
    updated = update_cash_adjustment(
        "profile-demo-001",
        created.cash_adjustment_id,
        {
            "adjustment_date": "2026-09-16",
            "direction": "In",
            "amount": "5.00",
            "adjustment_type": "Correction fixture",
            "affects_investment": True,
            "affects_cash_snapshot": True,
            "linked_account": "",
            "description": "Corrected from £10 out to £5 in",
            "_history_operation": "corrected",
            "_history_operation_id": "history-correct-ca-001",
        },
    )
    assert updated is not None
    events = get_financial_history(
        "profile-demo-001", "cash_adjustment", created.cash_adjustment_id
    )
    assert [event.operation for event in events] == ["created", "corrected"]

    with connect() as connection:
        same = append_history_event(
            connection,
            profile_id="profile-demo-001",
            ledger_type="cash_adjustment",
            activity_id=created.cash_adjustment_id,
            operation="corrected",
            recorded_at=events[-1].recorded_at,
            before=__import__("json").loads(events[-1].before_snapshot_json),
            after=__import__("json").loads(events[-1].after_snapshot_json),
            operation_id="history-correct-ca-001",
            source_identity=__import__("json").loads(events[-1].source_identity_json),
            provenance=__import__("json").loads(events[-1].provenance_json),
            reason=events[-1].reason,
            actor_type=events[-1].actor_type,
            actor_id=events[-1].actor_id,
        )
        assert same.history_id == events[-1].history_id
        with pytest.raises(FinancialHistoryConflictError):
            append_history_event(
                connection,
                profile_id="profile-demo-001",
                ledger_type="cash_adjustment",
                activity_id=created.cash_adjustment_id,
                operation="corrected",
                recorded_at=events[-1].recorded_at,
                before=None,
                after={"amount": "999.00"},
                operation_id="history-correct-ca-001",
                reason="Different mutation",
            )
        with pytest.raises(sqlite3.IntegrityError, match="append-only"):
            connection.execute(
                "UPDATE financial_activity_history SET reason='changed' WHERE history_id=?",
                (events[-1].history_id,),
            )

    response = TestClient(app).get(
        "/profiles/profile-demo-001/tracker-summary-sources"
    )
    assert response.status_code == 200
    current = [
        row
        for row in response.json()["cash_adjustments"]
        if row["cash_adjustment_id"] == created.cash_adjustment_id
    ]
    assert len(current) == 1
    assert current[0]["signed_amount"] == "5.00"
    assert "financial_history" not in response.json()


def test_imported_parent_requires_explicit_same_profile_resolution(tmp_path: Path) -> None:
    configure_database(tmp_path)
    timestamp = "2026-09-16T12:00:00Z"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO free_bets (
              free_bet_id, profile_id, event_name, offer_text, bookmaker, status, result,
              retention_mode, free_bet_value, back_odds, match_strategy, lay_odds_1,
              exchange_name, expiry_datetime, date_settled, origin_qual_bet_id,
              origin_qual_bet_source_namespace, origin_qual_bet_resolution_state,
              origin_qual_bet_resolution_json, user_notes, manual_override_value,
              manual_override_reason, created_at, updated_at
            ) VALUES (?, ?, '', '', '', 'Available', 'Pending', 'SNR', '10.00', '',
                      'Standard', '', '', '', '', ?, 'sportsbook', 'missing', ?, '', '', '', ?, ?)
            """,
            (
                "FB-IMPORTED-A",
                "profile-demo-001",
                "SOURCE-PARENT-X",
                '{"schema_version":1,"basis":"import_lookup","candidate_native_ids":[]}',
                timestamp,
                timestamp,
            ),
        )

    still_missing = reresolve_imported_free_bet_parent(
        "profile-demo-001",
        "FB-IMPORTED-A",
        operation_id="resolve-parent-missing-001",
    )
    assert still_missing is not None
    assert still_missing.origin_qual_bet_resolution_state == "missing"

    import_batch("profile-demo-001", "BATCH-PARENT-A")
    import_batch("profile-demo-002", "BATCH-PARENT-B")
    with connect() as connection:
        for profile_id, sportsbook_id in (
            ("profile-demo-001", "SB-PARENT-A"),
            ("profile-demo-002", "SB-PARENT-B"),
        ):
            connection.execute(
                """
                INSERT INTO sportsbook_bets (
                  sportsbook_bet_id, profile_id, event_name, offer_text, bookmaker,
                  offer_type, status, result, back_stake, back_odds, match_strategy,
                  lay_odds_1, exchange_name, date_settled, user_notes,
                  manual_override_value, manual_override_reason, created_at, updated_at
                ) VALUES (?, ?, '', '', '', '', 'Prospecting', 'Pending', '', '',
                          'Standard', '', '', '', '', '', '', ?, ?)
                """,
                (sportsbook_id, profile_id, timestamp, timestamp),
            )
    register_import_source_record(
        profile_id="profile-demo-001",
        source_namespace="sportsbook",
        source_sheet="Renamed Sportsbook Tab",
        source_record_id="SOURCE-PARENT-X",
        source_hash="parent-a",
        import_batch_id="BATCH-PARENT-A",
        entity_type="sportsbook_bet",
        entity_id="SB-PARENT-A",
    )
    register_import_source_record(
        profile_id="profile-demo-002",
        source_namespace="sportsbook",
        source_sheet="Sportsbook Bets",
        source_record_id="SOURCE-PARENT-X",
        source_hash="parent-b",
        import_batch_id="BATCH-PARENT-B",
        entity_type="sportsbook_bet",
        entity_id="SB-PARENT-B",
    )

    # A later parent import does not silently rewrite historical linkage.
    with connect() as connection:
        before = connection.execute(
            "SELECT origin_qual_bet_native_id, origin_qual_bet_resolution_state "
            "FROM free_bets WHERE free_bet_id='FB-IMPORTED-A'"
        ).fetchone()
    assert tuple(before) == ("", "missing")

    resolved = reresolve_imported_free_bet_parent(
        "profile-demo-001",
        "FB-IMPORTED-A",
        operation_id="resolve-parent-found-001",
    )
    assert resolved is not None
    assert resolved.origin_qual_bet_resolution_state == "resolved"
    assert resolved.origin_qual_bet_native_id == "SB-PARENT-A"
    with connect() as connection:
        with pytest.raises(sqlite3.IntegrityError, match="Profile-scoped"):
            connection.execute(
                "UPDATE free_bets SET origin_qual_bet_native_id='SB-PARENT-B', "
                "origin_qual_bet_resolution_state='resolved' "
                "WHERE profile_id='profile-demo-001' AND free_bet_id='FB-IMPORTED-A'"
            )
    retry = reresolve_imported_free_bet_parent(
        "profile-demo-001",
        "FB-IMPORTED-A",
        operation_id="resolve-parent-found-001",
    )
    assert retry == resolved


def test_ambiguous_imported_parent_requires_explicit_same_profile_choice(tmp_path: Path) -> None:
    configure_database(tmp_path)
    timestamp = "2026-09-17T12:00:00Z"
    with connect() as connection:
        for sportsbook_id, event_name in (("SB-A-ONE", "Synthetic one"), ("SB-A-TWO", "Synthetic two")):
            connection.execute(
                """
                INSERT INTO sportsbook_bets (
                  sportsbook_bet_id, profile_id, event_name, offer_text, bookmaker,
                  offer_type, status, result, back_stake, back_odds, match_strategy,
                  lay_odds_1, exchange_name, date_settled, user_notes,
                  manual_override_value, manual_override_reason, created_at, updated_at
                ) VALUES (?, 'profile-demo-001', ?, '', 'Bookmaker A', '', 'Settled',
                          'Back Won', '10.00', '4.00', 'Standard', '4.20',
                          'Exchange A', '2026-09-17', '', '', '', ?, ?)
                """,
                (sportsbook_id, event_name, timestamp, timestamp),
            )
        connection.execute(
            """
            INSERT INTO free_bets (
              free_bet_id, profile_id, event_name, offer_text, bookmaker, status, result,
              retention_mode, free_bet_value, back_odds, match_strategy, lay_odds_1,
              exchange_name, expiry_datetime, date_settled, origin_qual_bet_id,
              origin_qual_bet_source_namespace, origin_qual_bet_resolution_state,
              origin_qual_bet_resolution_json, user_notes, manual_override_value,
              manual_override_reason, created_at, updated_at
            ) VALUES ('FB-AMBIGUOUS', 'profile-demo-001', '', '', 'Bookmaker A',
                      'Available', 'Pending', 'SNR', '10.00', '', 'Standard', '', '',
                      '', '', 'SOURCE-AMBIGUOUS', 'sportsbook', 'ambiguous', ?, '', '', '', ?, ?)
            """,
            (
                json.dumps({"schema_version": 1, "candidate_native_ids": ["SB-A-ONE", "SB-A-TWO"]}),
                timestamp,
                timestamp,
            ),
        )

    client = TestClient(app)
    review = client.get(
        "/profiles/profile-demo-001/free-bets/FB-AMBIGUOUS/imported-parent-review"
    )
    assert review.status_code == 200, review.text
    assert review.json()["resolution_state"] == "ambiguous"
    assert {item["sportsbook_bet_id"] for item in review.json()["candidates"]} == {
        "SB-A-ONE", "SB-A-TWO"
    }

    chosen = client.post(
        "/profiles/profile-demo-001/free-bets/FB-AMBIGUOUS/resolve-imported-parent",
        json={
            "operation_id": "choose-parent-ambiguous-001",
            "selected_native_parent_id": "SB-A-TWO",
        },
    )
    assert chosen.status_code == 200, chosen.text
    assert chosen.json()["origin_qual_bet_resolution_state"] == "resolved"
    assert chosen.json()["origin_qual_bet_native_id"] == "SB-A-TWO"

    invalid = client.post(
        "/profiles/profile-demo-001/free-bets/FB-AMBIGUOUS/resolve-imported-parent",
        json={
            "operation_id": "choose-parent-cross-profile-001",
            "selected_native_parent_id": "SB-OTHER-PROFILE",
        },
    )
    assert invalid.status_code == 409


def test_upgraded_sqlite_rejects_older_writer_without_schema_capability(
    tmp_path: Path,
) -> None:
    configure_database(tmp_path)
    create_cash_adjustment(
        "profile-demo-001",
        {
            "cash_adjustment_id": "CA-GUARD-001",
            "adjustment_date": "2026-09-16",
            "direction": "In",
            "amount": "1.00",
            "adjustment_type": "Guard fixture",
            "affects_investment": False,
            "affects_cash_snapshot": True,
            "linked_account": "",
            "description": "Schema capability guard",
        },
    )
    older_connection = sqlite3.connect(settings.database_path)
    try:
        with pytest.raises(sqlite3.OperationalError, match="openforge_schema_capability"):
            older_connection.execute(
                "UPDATE cash_adjustments SET amount='2.00' "
                "WHERE cash_adjustment_id='CA-GUARD-001'"
            )
    finally:
        older_connection.close()


def test_sqlite_old_source_schema_upgrades_repeatably_without_guessing_parent(
    tmp_path: Path,
) -> None:
    configure_database(tmp_path)
    import_batch("profile-demo-001", "BATCH-LEGACY")
    with connect() as connection:
        free_bet_id = "FB-LEGACY-001"
        connection.execute(
            """
            INSERT INTO free_bets (
              free_bet_id, profile_id, event_name, offer_text, bookmaker, status, result,
              retention_mode, free_bet_value, back_odds, match_strategy, lay_odds_1,
              exchange_name, expiry_datetime, date_settled, user_notes,
              manual_override_value, manual_override_reason, created_at, updated_at
            ) VALUES (?, 'profile-demo-001', '', '', '', 'Available', 'Pending', 'SNR',
                      '10.00', '', 'Standard', '', '', '', '', '', '', '', ?, ?)
            """,
            (free_bet_id, "2026-09-16T12:00:00Z", "2026-09-16T12:00:00Z"),
        )
        connection.execute(
            "UPDATE free_bets SET origin_qual_bet_id='LEGACY-PARENT', "
            "origin_qual_bet_resolution_state='legacy_unresolved' WHERE free_bet_id=?",
            (free_bet_id,),
        )
        connection.execute("DROP TABLE import_source_records")
        connection.execute(
            """
            CREATE TABLE import_source_records (
              source_sheet TEXT NOT NULL,
              source_record_id TEXT NOT NULL,
              profile_id TEXT NOT NULL,
              source_hash TEXT NOT NULL,
              import_batch_id TEXT NOT NULL,
              entity_type TEXT NOT NULL DEFAULT '',
              entity_id TEXT NOT NULL DEFAULT '',
              imported_at TEXT NOT NULL,
              PRIMARY KEY (source_sheet, source_record_id)
            )
            """
        )
        connection.execute(
            "INSERT INTO import_source_records VALUES (?,?,?,?,?,?,?,?)",
            (
                "Sportsbook Bets",
                "LEGACY-PARENT",
                "profile-demo-001",
                "legacy-hash",
                "BATCH-LEGACY",
                "sportsbook_bet",
                "SB-UNKNOWN",
                "2026-09-16T12:00:00Z",
            ),
        )

    for _ in range(2):
        with connect() as connection:
            key = connection.execute(
                "SELECT profile_id, source_namespace, source_record_id "
                "FROM import_source_records WHERE source_record_id='LEGACY-PARENT'"
            ).fetchone()
            resolution = connection.execute(
                "SELECT origin_qual_bet_native_id, origin_qual_bet_resolution_state "
                "FROM free_bets WHERE free_bet_id=?",
                (free_bet_id,),
            ).fetchone()
        assert tuple(key) == ("profile-demo-001", "sportsbook", "LEGACY-PARENT")
        assert tuple(resolution) == ("", "legacy_unresolved")


def test_financial_ledgers_record_history_and_protect_settled_rows(tmp_path: Path) -> None:
    configure_database(tmp_path)
    client = TestClient(app)
    sportsbook_payload = {
        "event_name": "Synthetic match", "bookmaker": "Bookmaker A",
        "status": "Prospecting", "result": "Pending", "back_stake": "10.00",
        "back_odds": "4.00", "match_strategy": "Standard", "lay_odds_1": "4.20",
        "lay_commission_1": "0.02", "exchange_name": "Exchange A",
    }
    sportsbook = client.post("/profiles/profile-demo-001/sportsbook-bets", json=sportsbook_payload)
    assert sportsbook.status_code == 201, sportsbook.text
    sportsbook_id = sportsbook.json()["sportsbook_bet_id"]
    settled_sportsbook = client.put(
        f"/profiles/profile-demo-001/sportsbook-bets/{sportsbook_id}",
        json={**sportsbook_payload, "status": "Settled", "result": "Back Won",
              "lay_actual": "7.00", "lay_matched_stake_1": "7.00",
              "date_settled": "2026-09-16"},
    )
    assert settled_sportsbook.status_code == 200, settled_sportsbook.text
    assert client.delete(f"/profiles/profile-demo-001/sportsbook-bets/{sportsbook_id}").status_code == 409
    free_payload = {
        "event_name": "Synthetic free bet", "bookmaker": "Bookmaker A",
        "status": "Available", "result": "Pending", "retention_mode": "SNR",
        "free_bet_value": "10.00", "back_odds": "4.00", "match_strategy": "Standard",
        "lay_odds_1": "4.20", "lay_commission_1": "0.02", "exchange_name": "Exchange A",
    }
    free_bet = client.post("/profiles/profile-demo-001/free-bets", json=free_payload)
    assert free_bet.status_code == 201, free_bet.text
    free_bet_id = free_bet.json()["free_bet_id"]
    settled_free_bet = client.put(
        f"/profiles/profile-demo-001/free-bets/{free_bet_id}",
        json={**free_payload, "status": "Settled", "result": "Back Won",
              "lay_actual": "7.00", "lay_matched_stake_1": "7.00",
              "date_settled": "2026-09-16"},
    )
    assert settled_free_bet.status_code == 200, settled_free_bet.text
    assert client.delete(f"/profiles/profile-demo-001/free-bets/{free_bet_id}").status_code == 409

    extra_payload = {
        "placed_at": "2026-09-16T12:00:00Z", "runner": "Synthetic Runner",
        "race": "Synthetic 14:30", "bookmaker": "Bookmaker A",
        "bookmaker_account": "Bookmaker A", "mode": "Extra Place",
        "each_way_stake": "10.00", "back_odds": "6.00",
        "place_term_numerator": "1", "place_term_denominator": "5",
        "win_exchange": "Exchange A", "win_lay_odds": "2.30", "win_commission": "0",
        "place_exchange": "Exchange A", "place_lay_odds": "4.50", "place_commission": "0",
        "status": "Placed", "result": "Pending",
    }
    extra = client.post("/profiles/profile-demo-001/each-way-extra-places", json=extra_payload)
    assert extra.status_code == 201, extra.text
    extra_id = extra.json()["each_way_extra_place_id"]
    settled_extra = client.put(
        f"/profiles/profile-demo-001/each-way-extra-places/{extra_id}",
        json={**extra_payload, "status": "Settled", "result": "Extra Place"},
    )
    assert settled_extra.status_code == 200, settled_extra.text
    assert client.request(
        "DELETE", f"/profiles/profile-demo-001/each-way-extra-places/{extra_id}",
        json={"reason": "Retain settled evidence"},
    ).status_code == 409

    casino_payload = {
        "date_started": "2026-09-16T12:00:00Z", "bookmaker": "Bookmaker A",
        "offer_type": "Free Spins", "offer_name": "Synthetic casino offer",
        "own_cash_committed": "5.00", "status": "Started", "result": "Pending",
        "calc_net_pnl": "-5.00",
    }
    casino = client.post("/profiles/profile-demo-001/casino-offers", json=casino_payload)
    assert casino.status_code == 201, casino.text
    casino_id = casino.json()["casino_offer_id"]
    settled_casino = client.put(
        f"/profiles/profile-demo-001/casino-offers/{casino_id}",
        json={**casino_payload, "status": "Settled", "result": "Win",
              "cash_returned": "11.00", "final_net_pnl": "6.00"},
    )
    assert settled_casino.status_code == 200, settled_casino.text
    assert client.delete(f"/profiles/profile-demo-001/casino-offers/{casino_id}").status_code == 409

    for ledger, activity_id in (
        ("sportsbook", sportsbook_id), ("free_bet", free_bet_id),
        ("extra_place", extra_id), ("casino", casino_id),
    ):
        response = client.get(
            f"/profiles/profile-demo-001/financial-history/{ledger}/{activity_id}"
        )
        assert response.status_code == 200, response.text
        assert [event["operation"] for event in response.json()] == ["created", "settled"]
    assert client.get(
        f"/profiles/profile-demo-002/financial-history/sportsbook/{sportsbook_id}"
    ).json() == []

    removable_requests = (
        ("sportsbook", "/sportsbook-bets", sportsbook_payload),
        ("free_bet", "/free-bets", free_payload),
        (
            "extra_place",
            "/each-way-extra-places",
            {**extra_payload, "status": "Prospecting", "result": "Pending"},
        ),
        (
            "casino",
            "/casino-offers",
            {
                **casino_payload,
                "status": "Prospecting",
                "own_cash_committed": "",
                "calc_net_pnl": "",
            },
        ),
    )
    id_fields = {
        "sportsbook": "sportsbook_bet_id",
        "free_bet": "free_bet_id",
        "extra_place": "each_way_extra_place_id",
        "casino": "casino_offer_id",
    }
    for ledger, route, payload in removable_requests:
        created = client.post(f"/profiles/profile-demo-001{route}", json=payload)
        assert created.status_code == 201, created.text
        activity_id = created.json()[id_fields[ledger]]
        removed = client.delete(f"/profiles/profile-demo-001{route}/{activity_id}")
        assert removed.status_code == 204, removed.text
        events = client.get(
            f"/profiles/profile-demo-001/financial-history/{ledger}/{activity_id}"
        )
        assert [event["operation"] for event in events.json()] == ["created", "removed"]


def test_profile_with_financial_history_returns_governed_delete_refusal(tmp_path: Path) -> None:
    configure_database(tmp_path)
    client = TestClient(app, raise_server_exceptions=False)
    created = client.post(
        "/profiles/profile-demo-001/cash-adjustments",
        json={
            "adjustment_date": "2026-09-17T09:00",
            "direction": "In",
            "amount": "5.00",
            "adjustment_type": "Correction",
            "affects_investment": False,
            "affects_cash_snapshot": True,
            "linked_account": "",
            "description": "Synthetic retention boundary",
        },
    )
    assert created.status_code == 201, created.text
    assert client.patch(
        "/profiles/profile-demo-001", json={"status": "Archived"}
    ).status_code == 200

    deleted = client.request(
        "DELETE",
        "/profiles/profile-demo-001",
        json={"confirmation_name": "profile-demo-001"},
    )

    assert deleted.status_code == 409
    assert "retained financial history" in deleted.json()["detail"]
    assert client.get("/profiles/profile-demo-001").status_code == 200
