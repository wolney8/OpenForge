from __future__ import annotations

import json
from typing import Any

from openforge_api.db import connect
from openforge_api.profile_workbook_cutover import (
    _apply_accounts,
    _checksum,
    _insert_ledger_entry,
    _record_import_balance_observation,
)
from openforge_api.profile_workbook_incremental import (
    build_incremental_delta,
    source_version_id,
    workbook_lineage_id,
)

PROFILE_ID = "PROFILE-INCREMENTAL-001"
BASELINE_RUN = "profile-import-baseline"
NEXT_RUN = "profile-import-next"
THIRD_RUN = "profile-import-third"
BASELINE_CHECKSUM = "a" * 64
NEXT_CHECKSUM = "b" * 64
BASELINE_KEY = "Sportsbook Bets:QB-001:" + "1" * 20
NEXT_KEY = "Sportsbook Bets:QB-001:" + "2" * 20
ENTITY_ID = "SB-INCREMENTAL-001"


def _sportsbook_payload(*, stake: str = "10.00", result: str = "Pending") -> dict[str, str]:
    return {
        "event_name": "Synthetic United v Fixture City",
        "offer_text": "Synthetic qualifying offer",
        "bookmaker": "Bookmaker A",
        "offer_type": "Qualifying Bet",
        "bet_type": "Normal",
        "offer_name": "Synthetic offer",
        "fixture_type": "Football",
        "market": "Match Odds",
        "status": "Placed" if result == "Pending" else "Settled",
        "result": result,
        "back_stake": stake,
        "back_odds": "2.00",
        "bonus_trigger": "",
        "maximum_bonus": "",
        "bonus_retention_rate": "70",
        "match_strategy": "Standard",
        "lay_odds_1": "2.02",
        "multi_lay_outcome_1_name": "",
        "multi_lay_outcomes_json": "[]",
        "lay_actual": "9.90",
        "lay_matched_stake_1": "9.90",
        "lay_commission_1": "0.02",
        "exchange_name": "Exchange A",
        "date_settled": "" if result == "Pending" else "2026-10-01",
        "user_notes": "Synthetic fixture",
        "manual_override_value": "" if result == "Pending" else "-0.20",
        "manual_override_reason": "" if result == "Pending" else "Synthetic settled value",
    }


def _row(import_key: str, *, stake: str = "10.00", result: str = "Pending") -> dict[str, object]:
    return {
        "source_row": 2,
        "source_record_id": "QB-001",
        "import_key": import_key,
        "action": "insert",
        "migration_state": "mapped",
        "errors": [],
        "normalizations": [],
        "mapped_payload": _sportsbook_payload(stake=stake, result=result),
        "status": "Placed" if result == "Pending" else "Settled",
        "source_pnl": "" if result == "Pending" else "-0.20",
        "imported_current_pnl": "-0.10" if result == "Pending" else "-0.20",
        "current_worst_case_pnl": "-0.10" if result == "Pending" else "",
        "realised_pnl": "" if result == "Pending" else "-0.20",
        "formal_report_date": "2026-10-01",
        "source_fields": {},
    }


def _plan(row: dict[str, object] | None) -> dict[str, object]:
    return {
        "schema_version": "profile-workbook-write-plan-v1",
        "profile_settings": [],
        "accounts": [],
        "ledgers": {
            "sportsbook": [] if row is None else [row],
            "free_bets": [],
            "casino": [],
            "cash_adjustments": [],
        },
        "created_at": "2026-10-30T10:00:00+00:00",
    }


def _insert_run(
    connection: Any,
    *,
    run_id: str,
    checksum: str,
    status: str,
    completed_at: str = "",
    profile_id: str = PROFILE_ID,
) -> None:
    connection.execute(
        """
        INSERT INTO profile_import_runs (
          import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
          workbook_size_bytes, effective_at, mapping_version, status, summary_json,
          reconciliation_json, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{}', ?, ?, ?)
        """,
        (
            run_id,
            profile_id,
            "owner@example.invalid",
            "synthetic-running-workbook.xlsx",
            checksum,
            1000,
            "2026-10-30T10:00:00+00:00",
            "founder-snapshot-v8",
            status,
            completed_at,
            "2026-10-30T10:00:00+00:00",
            "2026-10-30T10:00:00+00:00",
        ),
    )


def _seed_baseline(*, settled: bool = False) -> None:
    now = "2026-10-30T10:00:00+00:00"
    result = "Win" if settled else "Pending"
    payload = _sportsbook_payload(result=result)
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profiles (
              profile_id, display_name, profile_code, status, tracking_start_date,
              management_fee_percent, investment_fee_percent, current_cash_snapshot
            ) VALUES (?, ?, ?, 'Active', '2026-01-01', '0.00', '0.00', '')
            """,
            (PROFILE_ID, "Synthetic Incremental Profile", PROFILE_ID),
        )
        _insert_run(
            connection,
            run_id=BASELINE_RUN,
            checksum=BASELINE_CHECKSUM,
            status="COMPLETE",
            completed_at=now,
        )
        baseline_plan = _plan(_row(BASELINE_KEY, result=result))
        connection.execute(
            """
            INSERT INTO profile_import_write_plans (
              import_run_id, profile_id, plan_json, plan_checksum, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                BASELINE_RUN,
                PROFILE_ID,
                json.dumps(baseline_plan, sort_keys=True, separators=(",", ":")),
                _checksum(baseline_plan),
                now,
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO sportsbook_bets (
              sportsbook_bet_id, profile_id, event_name, offer_text, bookmaker,
              offer_type, bet_type, offer_name, fixture_type, market, status, result,
              back_stake, back_odds, match_strategy, lay_odds_1, lay_actual,
              lay_matched_stake_1, lay_commission_1, exchange_name, date_settled,
              user_notes, manual_override_value, manual_override_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ENTITY_ID,
                PROFILE_ID,
                payload["event_name"],
                payload["offer_text"],
                payload["bookmaker"],
                payload["offer_type"],
                payload["bet_type"],
                payload["offer_name"],
                payload["fixture_type"],
                payload["market"],
                payload["status"],
                payload["result"],
                payload["back_stake"],
                payload["back_odds"],
                payload["match_strategy"],
                payload["lay_odds_1"],
                payload["lay_actual"],
                payload["lay_matched_stake_1"],
                payload["lay_commission_1"],
                payload["exchange_name"],
                payload["date_settled"],
                payload["user_notes"],
                payload["manual_override_value"],
                payload["manual_override_reason"],
                now,
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_write_audit (
              import_run_id, import_key, profile_id, entity_type, entity_id, operation,
              before_json, after_json, created_at, rolled_back_at
            ) VALUES (?, ?, ?, 'sportsbook_bet', ?, 'create', '{}', ?, ?, '')
            """,
            (BASELINE_RUN, BASELINE_KEY, PROFILE_ID, ENTITY_ID, json.dumps(payload), now),
        )
        _insert_run(
            connection,
            run_id=NEXT_RUN,
            checksum=NEXT_CHECKSUM,
            status="ANALYSING",
        )


def _classify(row: dict[str, object] | None) -> tuple[dict[str, object], dict[str, object]]:
    plan = _plan(row)
    with connect() as connection:
        delta = build_incremental_delta(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=NEXT_RUN,
            workbook_checksum=NEXT_CHECKSUM,
            source_filename="renamed-running-workbook.xlsx",
            effective_at="2026-10-30T12:00:00+00:00",
            mapping_version="founder-snapshot-v8",
            plan=plan,
        )
    return delta, plan


def test_lineage_and_content_version_ignore_filename() -> None:
    assert workbook_lineage_id(PROFILE_ID) == workbook_lineage_id(PROFILE_ID)
    assert source_version_id(PROFILE_ID, BASELINE_CHECKSUM) == source_version_id(
        PROFILE_ID, BASELINE_CHECKSUM
    )
    assert source_version_id(PROFILE_ID, BASELINE_CHECKSUM) != source_version_id(
        PROFILE_ID, NEXT_CHECKSUM
    )


def test_incremental_classifies_unchanged_new_changed_and_source_missing() -> None:
    _seed_baseline()
    unchanged, _ = _classify(_row(NEXT_KEY))
    assert unchanged["counts"]["UNCHANGED"] == 1
    assert unchanged["rows"][0]["comparison"] == "same_canonical_values"

    new_row = _row("Sportsbook Bets:QB-NEW:" + "3" * 20)
    new_row["source_record_id"] = "QB-NEW"
    new_delta, _ = _classify(new_row)
    statuses = {row["source_record_id"]: row["status"] for row in new_delta["rows"]}
    assert statuses == {"QB-NEW": "NEW", "QB-001": "SOURCE_MISSING"}

    changed, _ = _classify(_row(NEXT_KEY, stake="12.00"))
    assert changed["rows"][0]["status"] == "CHANGED"
    assert changed["rows"][0]["comparison"] == "workbook_only_change"
    assert changed["rows"][0]["write_action"] == "update"

    missing, _ = _classify(None)
    assert missing["counts"]["SOURCE_MISSING"] == 1
    assert missing["rows"][0]["write_action"] == "none"


def test_three_way_protects_pd_only_and_detects_divergent_changes() -> None:
    _seed_baseline()
    with connect() as connection:
        connection.execute(
            "UPDATE sportsbook_bets SET back_stake = '11.00' "
            "WHERE sportsbook_bet_id = ?",
            (ENTITY_ID,),
        )
    pd_only, _ = _classify(_row(NEXT_KEY))
    assert pd_only["rows"][0]["status"] == "UNCHANGED"
    assert pd_only["rows"][0]["comparison"] == "plum_duff_only_change"
    assert pd_only["protected_local_change_count"] == 1

    conflict, _ = _classify(_row(NEXT_KEY, stake="12.00"))
    assert conflict["rows"][0]["status"] == "CONFLICT"
    assert conflict["rows"][0]["comparison"] == "both_changed_differently"
    assert conflict["rows"][0]["requires_review"] is True


def test_three_way_recognises_identical_convergence() -> None:
    _seed_baseline()
    with connect() as connection:
        connection.execute(
            "UPDATE sportsbook_bets SET back_stake = '12.00' "
            "WHERE sportsbook_bet_id = ?",
            (ENTITY_ID,),
        )
    delta, _ = _classify(_row(NEXT_KEY, stake="12.00"))
    assert delta["rows"][0]["status"] == "UNCHANGED"
    assert delta["rows"][0]["comparison"] == "both_changed_identically"


def test_business_identity_history_is_profile_scoped() -> None:
    _seed_baseline()
    other_profile = "PROFILE-INCREMENTAL-OTHER"
    other_entity = "SB-INCREMENTAL-OTHER"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profiles (
              profile_id, display_name, profile_code, status, tracking_start_date,
              management_fee_percent, investment_fee_percent, current_cash_snapshot
            ) VALUES (?, 'Other Synthetic Profile', ?, 'Active', '2026-01-01',
                      '0.00', '0.00', '')
            """,
            (other_profile, other_profile),
        )
        connection.execute(
            """
            INSERT INTO sportsbook_bets (
              sportsbook_bet_id, profile_id, event_name, offer_text, bookmaker,
              offer_type, bet_type, offer_name, fixture_type, market, status, result,
              back_stake, back_odds, match_strategy, lay_odds_1, lay_actual,
              lay_matched_stake_1, lay_commission_1, exchange_name, date_settled,
              user_notes, manual_override_value, manual_override_reason, created_at, updated_at
            ) SELECT ?, ?, event_name, offer_text, bookmaker, offer_type, bet_type,
                     offer_name, fixture_type, market, status, result, back_stake,
                     back_odds, match_strategy, lay_odds_1, lay_actual,
                     lay_matched_stake_1, lay_commission_1, exchange_name, date_settled,
                     user_notes, manual_override_value, manual_override_reason, created_at,
                     updated_at
              FROM sportsbook_bets WHERE sportsbook_bet_id = ?
            """,
            (other_entity, other_profile, ENTITY_ID),
        )
        _insert_run(
            connection,
            run_id="other-import",
            checksum="c" * 64,
            status="COMPLETE",
            completed_at="2026-10-30T10:00:00+00:00",
            profile_id=other_profile,
        )
        connection.execute(
            """
            INSERT INTO profile_import_write_audit (
              import_run_id, import_key, profile_id, entity_type, entity_id, operation,
              before_json, after_json, created_at, rolled_back_at
            ) VALUES ('other-import', ?, ?, 'sportsbook_bet', ?, 'create', '{}', '{}',
                      '2026-10-30T10:00:00+00:00', '')
            """,
            (BASELINE_KEY, other_profile, other_entity),
        )
    delta, _ = _classify(_row(NEXT_KEY))
    assert delta["rows"][0]["entity_id"] == ENTITY_ID
    assert delta["rows"][0]["status"] == "UNCHANGED"


def test_settled_financial_change_requires_explicit_review() -> None:
    _seed_baseline(settled=True)
    delta, _ = _classify(_row(NEXT_KEY, stake="12.00", result="Win"))
    assert delta["rows"][0]["status"] == "CONFLICT"
    assert delta["rows"][0]["comparison"] == "settled_financial_change"
    assert delta["rows"][0]["requires_review"] is True


def test_changed_row_updates_only_after_governed_delta_classification() -> None:
    _seed_baseline()
    _delta, plan = _classify(_row(NEXT_KEY, stake="12.00"))
    row = plan["ledgers"]["sportsbook"][0]
    entry = ("sportsbook", "sportsbook", row, None, None)
    with connect() as connection:
        target = _insert_ledger_entry(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=NEXT_RUN,
            entry=entry,
            identities=None,
        )
        persisted = connection.execute(
            "SELECT back_stake FROM sportsbook_bets WHERE sportsbook_bet_id = ?",
            (ENTITY_ID,),
        ).fetchone()
        audit = connection.execute(
            "SELECT operation FROM profile_import_write_audit "
            "WHERE import_run_id = ? AND import_key = ?",
            (NEXT_RUN, NEXT_KEY),
        ).fetchone()
    assert target == "sportsbook"
    assert persisted["back_stake"] == "12"
    assert audit["operation"] == "update"


def test_later_version_compares_with_prior_source_snapshot_after_partial_update_audit() -> None:
    _seed_baseline()
    _delta, second_plan = _classify(_row(NEXT_KEY, stake="12.00"))
    second_row = second_plan["ledgers"]["sportsbook"][0]
    with connect() as connection:
        _insert_ledger_entry(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=NEXT_RUN,
            entry=("sportsbook", "sportsbook", second_row, None, None),
            identities=None,
        )
        connection.execute(
            "UPDATE profile_import_runs SET status = 'COMPLETE', completed_at = ? "
            "WHERE import_run_id = ?",
            ("2026-10-30T12:00:00+00:00", NEXT_RUN),
        )
        connection.execute(
            """
            INSERT INTO profile_import_write_plans (
              import_run_id, profile_id, plan_json, plan_checksum, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                NEXT_RUN,
                PROFILE_ID,
                json.dumps(second_plan, sort_keys=True, separators=(",", ":")),
                _checksum(second_plan),
                "2026-10-30T12:00:00+00:00",
                "2026-10-30T12:00:00+00:00",
            ),
        )
        _insert_run(
            connection,
            run_id=THIRD_RUN,
            checksum="d" * 64,
            status="ANALYSING",
        )
        third_plan = _plan(_row("Sportsbook Bets:QB-001:" + "6" * 20, stake="12.00"))
        third_delta = build_incremental_delta(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=THIRD_RUN,
            workbook_checksum="d" * 64,
            source_filename="third-running-workbook.xlsx",
            effective_at="2026-10-30T14:00:00+00:00",
            mapping_version="founder-snapshot-v8",
            plan=third_plan,
        )
    assert third_delta["counts"]["UNCHANGED"] == 1
    assert third_delta["rows"][0]["comparison"] == "same_canonical_values"


def test_source_missing_never_deletes_the_existing_record() -> None:
    _seed_baseline()
    delta, _ = _classify(None)
    assert delta["rows"][0]["status"] == "SOURCE_MISSING"
    with connect() as connection:
        record = connection.execute(
            "SELECT sportsbook_bet_id FROM sportsbook_bets WHERE sportsbook_bet_id = ?",
            (ENTITY_ID,),
        ).fetchone()
    assert record["sportsbook_bet_id"] == ENTITY_ID


def test_incremental_account_balance_creates_observation_without_rewriting_history() -> None:
    _seed_baseline()
    now = "2026-10-30T10:00:00+00:00"
    account_id = "ACCOUNT-INCREMENTAL-001"
    baseline_key = "Accounts:ACC-001:" + "3" * 20
    next_key = "Accounts:ACC-001:" + "4" * 20
    baseline_state = {
        "catalogue_id": "BOOKMAKER-DEMO-001",
        "account": "Bookmaker A",
        "type": "Bookie",
        "counts_in_cash_total": True,
        "channel": "Online",
        "access_channels_json": "[]",
        "status": "Active",
        "lifecycle_status": "Active",
        "restrictions_json": "[]",
        "stake_access": "Not Checked",
        "promo_access": "Not Checked",
        "restriction_details_json": "{}",
        "access_evidence_note": "",
        "access_source": "workbook_import",
        "access_observed_at": "",
        "current_balance": "10.00",
        "pending_withdrawal_amount": "",
        "last_balance_update": "2026-10-01T12:00:00+01:00",
        "group_name": "Synthetic Group",
        "platform": "Synthetic Platform",
        "sign_up_date": "2026-01-01",
        "notes": "Synthetic fixture",
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO accounts (
              account_id, profile_id, catalogue_id, account, type, counts_in_cash_total,
              channel, access_channels_json, status, lifecycle_status, restrictions_json,
              stake_access, promo_access, restriction_details_json, access_evidence_note,
              access_source, access_observed_at, current_balance, pending_withdrawal_amount,
              last_balance_update, group_name, platform, sign_up_date, notes, created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                account_id,
                PROFILE_ID,
                *(baseline_state[field] for field in baseline_state),
                now,
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_write_audit (
              import_run_id, import_key, profile_id, entity_type, entity_id, operation,
              before_json, after_json, created_at, rolled_back_at
            ) VALUES (?, ?, ?, 'accounts', ?, 'create', '{}', ?, ?, '')
            """,
            (
                BASELINE_RUN,
                baseline_key,
                PROFILE_ID,
                account_id,
                json.dumps(baseline_state),
                now,
            ),
        )
    source = {
        "source_row": 2,
        "source_record_id": "ACC-001",
        "import_key": next_key,
        "action": "update",
        "errors": [],
        "catalogue_id": "BOOKMAKER-DEMO-001",
        "mapped_profile_state": {
            **baseline_state,
            "current_balance": "25.50",
            "last_balance_update": "2026-10-30T12:00:00+00:00",
        },
        "incremental": {
            "status": "CHANGED",
            "entity_id": account_id,
            "field_differences": [
                {
                    "field": "current_balance",
                    "classification": "WORKBOOK_ONLY",
                    "previous_source": "10.00",
                    "current_plum_duff": "10.00",
                    "new_source": "25.50",
                    "financial": True,
                }
            ],
        },
    }
    with connect() as connection:
        result = _apply_accounts(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=NEXT_RUN,
            rows=[source],
            decisions={},
            absent_strategy="leave_unchanged",
        )
        account = connection.execute(
            "SELECT current_balance FROM accounts WHERE account_id = ?", (account_id,)
        ).fetchone()
        observations = connection.execute(
            "SELECT balance_amount, snapshot_at, snapshot_type FROM balance_snapshots "
            "WHERE account_id = ? ORDER BY created_at",
            (account_id,),
        ).fetchall()
    assert result["updated"] == 1
    assert account["current_balance"] == "25.50"
    assert [dict(row) for row in observations] == [
        {
            "balance_amount": "25.50",
            "snapshot_at": "2026-10-30T12:00:00+00:00",
            "snapshot_type": "account-observation-v1:workbook-import",
        }
    ]
    conflict_key = "Accounts:ACC-001:" + "5" * 20
    conflict_source = {
        **source,
        "import_key": conflict_key,
        "mapped_profile_state": {
            **source["mapped_profile_state"],
            "current_balance": "30.00",
            "notes": "Synthetic fixture",
        },
        "incremental": {
            "status": "CONFLICT",
            "entity_id": account_id,
            "field_differences": [
                {
                    "field": "current_balance",
                    "classification": "WORKBOOK_ONLY",
                    "previous_source": "25.50",
                    "current_plum_duff": "25.50",
                    "new_source": "30.00",
                    "financial": True,
                },
                {
                    "field": "notes",
                    "classification": "PLUM_DUFF_ONLY",
                    "previous_source": "Synthetic fixture",
                    "current_plum_duff": "Local Plum Duff note",
                    "new_source": "Synthetic fixture",
                    "financial": False,
                },
            ],
        },
    }
    decision = {
        "review-item": {
            "import_id": conflict_key,
            "category": "incremental_conflict",
            "review_status": "REVIEWED_ACCEPTED",
            "decision": {"action": "accept_proposed"},
        }
    }
    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET notes = 'Local Plum Duff note' WHERE account_id = ?",
            (account_id,),
        )
        _apply_accounts(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=NEXT_RUN,
            rows=[conflict_source],
            decisions=decision,
            absent_strategy="leave_unchanged",
        )
        protected = connection.execute(
            "SELECT current_balance, notes FROM accounts WHERE account_id = ?", (account_id,)
        ).fetchone()
    assert protected["current_balance"] == "30.00"
    assert protected["notes"] == "Local Plum Duff note"


def test_blank_incremental_balance_creates_no_observation_and_is_never_zero() -> None:
    _seed_baseline()
    with connect() as connection:
        _record_import_balance_observation(
            connection,
            profile_id=PROFILE_ID,
            import_run_id=NEXT_RUN,
            source={"import_key": NEXT_KEY, "incremental": {"status": "CHANGED"}},
            account_id="ACCOUNT-NOT-WRITTEN",
            amount="",
            observed_at="",
        )
        count = connection.execute("SELECT COUNT(*) AS count FROM balance_snapshots").fetchone()
    assert count["count"] == 0
