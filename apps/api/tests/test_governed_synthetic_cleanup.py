from __future__ import annotations

import json

import pytest
from apps.api.tests.synthetic_setup import seed_synthetic_account, seed_synthetic_profile
from fastapi import HTTPException

from openforge_api.db import (
    connect,
    create_account,
    create_each_way_extra_place,
    create_sportsbook_bet,
    delete_sportsbook_bet,
)
from openforge_api.governed_synthetic_cleanup import (
    CP103_EXTRA_PLACE_COUNT,
    CP103_OPERATION_ID,
    CP103_SPORTSBOOK_COUNT,
    CP105_ACCOUNT_AUTHORITY,
    CP105_ACCOUNT_NOTE,
    CP105_OPERATION_ID,
    AccountCleanupCandidate,
    AccountCleanupManifest,
    CleanupCandidate,
    CleanupManifest,
    GovernedCleanupAbort,
    canonical_sha256,
    execute_cp103_cleanup,
    execute_cp105_account_cleanup,
)


def _sportsbook_payload(index: int) -> dict[str, str]:
    return {
        "sportsbook_bet_id": f"CP103-SB-{index:03d}",
        "event_name": "Lifecycle Back Only Match",
        "offer_text": "Synthetic lifecycle test",
        "bookmaker": "Bookmaker A",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Lifecycle Back Only",
        "fixture_type": "Football",
        "status": "Placed",
        "result": "Pending",
        "back_stake": "10.00",
        "back_odds": "2.00",
        "match_strategy": "No Lay",
        "lay_odds_1": "",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "",
        "date_settled": "2026-07-10",
        "user_notes": "",
        "manual_override_value": "",
        "manual_override_reason": "",
    }


def _extra_place_payload(index: int) -> dict[str, str]:
    return {
        "each_way_extra_place_id": f"CP103-EWP-{index:03d}",
        "placed_at": "2026-08-26T14:10:00Z",
        "runner": "Branded badge runner",
        "race": "Branded badge race 14:10",
        "bookmaker": "Betfred",
        "bookmaker_account": "",
        "mode": "Extra Place",
        "each_way_stake": "",
        "back_odds": "",
        "place_term_numerator": "",
        "place_term_denominator": "",
        "bookmaker_places": "",
        "exchange_places": "",
        "win_exchange": "",
        "win_lay_odds": "",
        "win_commission": "",
        "actual_win_lay_stake": "",
        "place_exchange": "",
        "place_lay_odds": "",
        "place_commission": "",
        "actual_place_lay_stake": "",
        "status": "Prospecting",
        "result": "Pending",
        "finishing_position": "",
        "user_notes": "",
        "calculation_provenance": "native",
        "import_run_id": "",
        "source_import_id": "",
    }


def _candidate(connection: object, *, domain: str, record_id: str) -> CleanupCandidate:
    table, id_column, audit_table = (
        ("sportsbook_bets", "sportsbook_bet_id", "sportsbook_bet_audit")
        if domain == "sportsbook"
        else (
            "each_way_extra_places",
            "each_way_extra_place_id",
            "each_way_extra_place_audit",
        )
    )
    row = connection.execute(  # type: ignore[attr-defined]
        f"SELECT * FROM {table} WHERE {id_column} = ?", (record_id,)
    ).fetchone()
    audit = connection.execute(  # type: ignore[attr-defined]
        f"SELECT audit_id, payload_json FROM {audit_table} WHERE {id_column} = ?",
        (record_id,),
    ).fetchone()
    return CleanupCandidate(
        domain=domain,
        record_id=record_id,
        profile_id=str(row["profile_id"]),
        row_sha256=canonical_sha256(dict(row)),
        created_audit_id=str(audit["audit_id"]),
        created_audit_payload_sha256=canonical_sha256(json.loads(audit["payload_json"])),
    )


def _seed_manifest() -> CleanupManifest:
    seed_synthetic_profile(
        "profile-cp103-template",
        display_name="Synthetic CP103 Template",
        profile_code="TEMPLATE-001",
    )
    seed_synthetic_account(
        profile_id="profile-cp103-template",
        name="Bookmaker A",
        account_type="Bookie",
    )
    seed_synthetic_profile(
        "profile-cp103-synthetic",
        display_name="Synthetic CP103",
        profile_code="ALPHA-001",
    )
    seed_synthetic_account(
        profile_id="profile-cp103-synthetic",
        name="Bookmaker A",
        account_type="Bookie",
    )
    sportsbook_template = create_sportsbook_bet(
        "profile-cp103-template", _sportsbook_payload(999)
    )
    extra_place_template = create_each_way_extra_place(
        "profile-cp103-template", _extra_place_payload(999)
    )
    sportsbook_ids = [f"CP103-SB-{index:03d}" for index in range(CP103_SPORTSBOOK_COUNT)]
    extra_place_ids = [f"CP103-EWP-{index:03d}" for index in range(CP103_EXTRA_PLACE_COUNT)]
    with connect() as connection:
        sportsbook_row = dict(
            connection.execute(
                "SELECT * FROM sportsbook_bets WHERE sportsbook_bet_id = ?",
                (sportsbook_template.sportsbook_bet_id,),
            ).fetchone()
        )
        sportsbook_audit_payload = json.loads(
            str(
                connection.execute(
                    "SELECT payload_json FROM sportsbook_bet_audit WHERE sportsbook_bet_id = ?",
                    (sportsbook_template.sportsbook_bet_id,),
                ).fetchone()[0]
            )
        )
        columns = tuple(sportsbook_row)
        placeholders = ",".join("?" for _ in columns)
        for index, record_id in enumerate(sportsbook_ids):
            row = {
                **sportsbook_row,
                "sportsbook_bet_id": record_id,
                "profile_id": "profile-cp103-synthetic",
                "match_strategy": "Standard",
                "created_at": f"2026-07-{10 + index // 4:02d}T12:{index % 60:02d}:00Z",
                "updated_at": f"2026-07-{10 + index // 4:02d}T12:{index % 60:02d}:00Z",
            }
            connection.execute(
                f"INSERT INTO sportsbook_bets ({','.join(columns)}) VALUES ({placeholders})",
                tuple(row[column] for column in columns),
            )
            payload = {
                **sportsbook_audit_payload,
                **row,
            }
            payload["match_strategy"] = "Standard"
            connection.execute(
                "INSERT INTO sportsbook_bet_audit "
                "(audit_id, sportsbook_bet_id, profile_id, action, changed_at, payload_json) "
                "VALUES (?, ?, ?, 'created', ?, ?)",
                (
                    f"audit-cp103-sb-{index:03d}",
                    record_id,
                    "profile-cp103-synthetic",
                    row["created_at"],
                    json.dumps(payload, sort_keys=True),
                ),
            )
        extra_place_row = dict(
            connection.execute(
                "SELECT * FROM each_way_extra_places WHERE each_way_extra_place_id = ?",
                (extra_place_template.each_way_extra_place_id,),
            ).fetchone()
        )
        extra_place_audit_payload = json.loads(
            str(
                connection.execute(
                    "SELECT payload_json FROM each_way_extra_place_audit "
                    "WHERE each_way_extra_place_id = ?",
                    (extra_place_template.each_way_extra_place_id,),
                ).fetchone()[0]
            )
        )
        columns = tuple(extra_place_row)
        placeholders = ",".join("?" for _ in columns)
        for index, record_id in enumerate(extra_place_ids):
            row = {
                **extra_place_row,
                "each_way_extra_place_id": record_id,
                "profile_id": "profile-cp103-synthetic",
                "created_at": f"2026-08-26T16:{index:02d}:00Z",
                "updated_at": f"2026-08-26T16:{index:02d}:00Z",
            }
            connection.execute(
                f"INSERT INTO each_way_extra_places ({','.join(columns)}) VALUES ({placeholders})",
                tuple(row[column] for column in columns),
            )
            payload = {**extra_place_audit_payload, **row}
            connection.execute(
                "INSERT INTO each_way_extra_place_audit "
                "(audit_id, each_way_extra_place_id, profile_id, action, changed_at, payload_json) "
                "VALUES (?, ?, ?, 'created', ?, ?)",
                (
                    f"audit-cp103-ewp-{index:03d}",
                    record_id,
                    "profile-cp103-synthetic",
                    row["created_at"],
                    json.dumps(payload, sort_keys=True),
                ),
            )
    with connect() as connection:
        candidates = tuple(
            _candidate(connection, domain="sportsbook", record_id=record_id)
            for record_id in sportsbook_ids
        ) + tuple(
            _candidate(connection, domain="extra_place", record_id=record_id)
            for record_id in extra_place_ids
        )
    return CleanupManifest(
        schema_version=1, operation_id=CP103_OPERATION_ID, candidates=candidates
    )


def _counts() -> tuple[int, int, int]:
    with connect() as connection:
        return (
            int(connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0]),
            int(connection.execute("SELECT COUNT(*) FROM each_way_extra_places").fetchone()[0]),
            int(
                connection.execute(
                    "SELECT COUNT(*) FROM financial_activity_history"
                ).fetchone()[0]
            ),
        )


def test_cp103_cleanup_is_atomic_and_retains_financial_tombstones() -> None:
    manifest = _seed_manifest()

    result = execute_cp103_cleanup(manifest)

    assert result.sportsbook_deleted == 35
    assert result.extra_place_deleted == 11
    assert len(result.history_event_ids) == 46
    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM sportsbook_bets WHERE profile_id = 'profile-cp103-synthetic'"
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM each_way_extra_places "
                "WHERE profile_id = 'profile-cp103-synthetic'"
            ).fetchone()[0]
            == 0
        )
        removed = connection.execute(
            "SELECT COUNT(*) FROM financial_activity_history WHERE operation = 'removed'"
        ).fetchone()[0]
        assert removed == 46
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM financial_activity_history "
                "WHERE actor_type = 'maintenance' AND actor_id = 'CP-103'"
            ).fetchone()[0]
            == 35
        )


def test_cp103_manifest_count_mismatch_aborts_without_mutation() -> None:
    manifest = _seed_manifest()
    before = _counts()

    with pytest.raises(GovernedCleanupAbort, match="count_mismatch"):
        execute_cp103_cleanup(
            CleanupManifest(
                schema_version=manifest.schema_version,
                operation_id=manifest.operation_id,
                candidates=manifest.candidates[:-1],
            )
        )

    assert _counts() == before


def test_cp103_rejects_changed_or_dependent_candidate_before_writes() -> None:
    manifest = _seed_manifest()
    first = manifest.candidates[0]
    with connect() as connection:
        connection.execute(
            "INSERT INTO free_bets (free_bet_id, profile_id, event_name, offer_text, bookmaker, "
            "status, result, retention_mode, free_bet_value, back_odds, match_strategy, "
            "lay_odds_1, lay_commission_1, exchange_name, expiry_datetime, date_settled, "
            "user_notes, manual_override_value, manual_override_reason, created_at, updated_at, "
            "lay_actual, lay_matched_stake_1, offer_type, bet_type, offer_name, fixture_type, "
            "origin_qual_bet_id, offer_group_id) VALUES "
            "('CP103-FB-DEPENDENCY', ?, 'Synthetic', '', 'Bookmaker A', 'Prospecting', "
            "'Pending', 'SNR', '', '', 'No Lay', '', '', '', '', '', '', '', '', "
            "'2026-10-28T00:00:00Z', '2026-10-28T00:00:00Z', '', '', '', '', '', '', ?, '')",
            (first.profile_id, first.record_id),
        )
    before = _counts()

    with pytest.raises(GovernedCleanupAbort, match="linked_free_bet"):
        execute_cp103_cleanup(manifest)

    assert _counts() == before


def test_cp103_rolls_back_sportsbook_when_extra_place_delete_fails() -> None:
    manifest = _seed_manifest()
    with connect() as connection:
        connection.execute(
            "CREATE TRIGGER cp103_test_abort BEFORE DELETE ON each_way_extra_places "
            "BEGIN SELECT RAISE(ABORT, 'synthetic rollback proof'); END"
        )
    before = _counts()

    with pytest.raises(Exception, match="synthetic rollback proof"):
        execute_cp103_cleanup(manifest)

    assert _counts() == before


def test_ordinary_placed_sportsbook_delete_remains_prohibited() -> None:
    manifest = _seed_manifest()
    candidate = manifest.candidates[0]

    with pytest.raises(HTTPException) as error:
        delete_sportsbook_bet(
            candidate.profile_id, candidate.record_id, "ordinary deletion attempt"
        )

    assert error.value.status_code == 409


def _seed_cp105_manifest() -> AccountCleanupManifest:
    for profile_id, profile_code, display_name in (
        ("profile-demo-001", "ALPHA-001", "Synthetic Alpha"),
        ("profile-demo-002", "BRAVO-002", "Synthetic Bravo"),
    ):
        seed_synthetic_profile(
            profile_id,
            display_name=display_name,
            profile_code=profile_code,
        )
    for account_id, (profile_id, _profile_code, provider) in (
        CP105_ACCOUNT_AUTHORITY.items()
    ):
        create_account(
            profile_id,
            {
                "account_id": account_id,
                "account": provider,
                "type": "Exchange",
                "counts_in_cash_total": True,
                "channel": "Online",
                "status": "Active",
                "lifecycle_status": "Active",
                "signup_offer_status": "Unknown",
                "restrictions_json": "[]",
                "current_balance": "",
                "pending_withdrawal_amount": "",
                "last_balance_update": "",
                "group_name": provider,
                "platform": provider,
                "sign_up_date": "",
                "notes": CP105_ACCOUNT_NOTE,
            },
        )
    with connect() as connection:
        candidates = []
        for account_id, (profile_id, _profile_code, _provider) in (
            CP105_ACCOUNT_AUTHORITY.items()
        ):
            row = dict(
                connection.execute(
                    "SELECT * FROM accounts WHERE account_id = ?", (account_id,)
                ).fetchone()
            )
            audit = connection.execute(
                "SELECT audit_id, payload_json FROM account_audit "
                "WHERE account_id = ?",
                (account_id,),
            ).fetchone()
            candidates.append(
                AccountCleanupCandidate(
                    account_id=account_id,
                    profile_id=profile_id,
                    row_sha256=canonical_sha256(row),
                    created_audit_id=str(audit["audit_id"]),
                    created_audit_payload_sha256=canonical_sha256(
                        json.loads(str(audit["payload_json"]))
                    ),
                )
            )
    return AccountCleanupManifest(
        schema_version=1,
        operation_id=CP105_OPERATION_ID,
        candidates=tuple(candidates),
    )


def test_cp105_account_cleanup_is_exact_and_retains_profile_tombstones() -> None:
    manifest = _seed_cp105_manifest()
    seed_synthetic_account(
        profile_id="profile-demo-001", name="Exchange A", account_type="Exchange"
    )
    first = manifest.candidates[0]
    provider = CP105_ACCOUNT_AUTHORITY[first.account_id][2]
    notification_id = f"account_review:{first.profile_id}:{first.account_id}:synthetic"
    with connect() as connection:
        connection.execute(
            "INSERT INTO notification_events "
            "(event_id, viewer_email, notification_id, profile_id, "
            "notification_type, payload_json, recorded_at) "
            "VALUES (?, 'owner@example.invalid', ?, ?, 'account_review', ?, "
            "'2026-10-29T00:00:00Z')",
            (
                f"event:{notification_id}",
                notification_id,
                first.profile_id,
                json.dumps(
                    {"record_id": first.account_id, "bookmaker_label": provider}
                ),
            ),
        )
        connection.execute(
            "INSERT INTO notification_user_state "
            "(email, notification_id, read_at, cleared_at, updated_at) "
            "VALUES ('owner@example.invalid', ?, '2026-10-29T00:00:00Z', NULL, "
            "'2026-10-29T00:00:00Z')",
            (notification_id,),
        )

    result = execute_cp105_account_cleanup(manifest)

    assert result.accounts_deleted == 4
    assert len(result.profile_audit_ids) == 4
    with connect() as connection:
        placeholders = ",".join("?" for _ in CP105_ACCOUNT_AUTHORITY)
        assert connection.execute(
            f"SELECT COUNT(*) FROM accounts WHERE account_id IN ({placeholders})",
            tuple(CP105_ACCOUNT_AUTHORITY),
        ).fetchone()[0] == 0
        assert connection.execute(
            "SELECT COUNT(*) FROM accounts WHERE account = 'Exchange A'"
        ).fetchone()[0] == 1
        assert connection.execute(
            "SELECT COUNT(*) FROM account_audit WHERE account_id IN "
            f"({placeholders})",
            tuple(CP105_ACCOUNT_AUTHORITY),
        ).fetchone()[0] == 0
        assert connection.execute(
            "SELECT COUNT(*) FROM profile_audit "
            "WHERE action = 'maintenance_account_deleted'"
        ).fetchone()[0] == 4
        assert connection.execute(
            "SELECT COUNT(*) FROM notification_events WHERE notification_id = ?",
            (notification_id,),
        ).fetchone()[0] == 1
        assert connection.execute(
            "SELECT COUNT(*) FROM notification_user_state WHERE notification_id = ?",
            (notification_id,),
        ).fetchone()[0] == 1


def test_cp105_rejects_wrong_manifest_without_mutation() -> None:
    manifest = _seed_cp105_manifest()
    with pytest.raises(GovernedCleanupAbort, match="count_mismatch"):
        execute_cp105_account_cleanup(
            AccountCleanupManifest(
                schema_version=1,
                operation_id=CP105_OPERATION_ID,
                candidates=manifest.candidates[:-1],
            )
        )
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] == 4


def test_cp105_rejects_account_activity_and_dependencies() -> None:
    manifest = _seed_cp105_manifest()
    first = manifest.candidates[0]
    with connect() as connection:
        connection.execute(
            "INSERT INTO account_audit "
            "(audit_id, account_id, profile_id, action, changed_at, payload_json) "
            "VALUES ('cp105-extra-audit', ?, ?, 'updated', '2026-10-29T00:00:00Z', '{}')",
            (first.account_id, first.profile_id),
        )
    with pytest.raises(GovernedCleanupAbort, match="audit_history_mismatch"):
        execute_cp105_account_cleanup(manifest)

    with connect() as connection:
        connection.execute(
            "DELETE FROM account_audit WHERE audit_id = 'cp105-extra-audit'"
        )
        connection.execute(
            "INSERT INTO balance_snapshots "
            "(balance_snapshot_id, profile_id, snapshot_at, snapshot_type, "
            "account_id, balance_amount, notes, created_at) "
            "VALUES ('cp105-snapshot', ?, '2026-10-29T00:00:00Z', 'Manual', ?, "
            "'1.00', 'Synthetic dependency', '2026-10-29T00:00:00Z')",
            (first.profile_id, first.account_id),
        )
    with pytest.raises(GovernedCleanupAbort, match="balance_snapshots.account_id"):
        execute_cp105_account_cleanup(manifest)
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] == 4


def test_cp105_rolls_back_all_accounts_and_tombstones_on_failure() -> None:
    manifest = _seed_cp105_manifest()
    blocked_id = manifest.candidates[-1].account_id
    with connect() as connection:
        connection.execute(
            "CREATE TRIGGER cp105_test_abort BEFORE DELETE ON accounts "
            f"WHEN OLD.account_id = '{blocked_id}' "
            "BEGIN SELECT RAISE(ABORT, 'cp105 rollback proof'); END"
        )

    with pytest.raises(Exception, match="cp105 rollback proof"):
        execute_cp105_account_cleanup(manifest)

    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] == 4
        assert connection.execute(
            "SELECT COUNT(*) FROM profile_audit "
            "WHERE action = 'maintenance_account_deleted'"
        ).fetchone()[0] == 0
