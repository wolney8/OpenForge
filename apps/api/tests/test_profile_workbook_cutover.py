from __future__ import annotations

import json
from pathlib import Path

import pytest

from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.profile_workbook_cutover import (
    ImportCutoverError,
    ImportPersistenceError,
    _storage_value,
    approved_run_is_retryable,
    build_base_write_plan,
    execute_import,
    failed_import_safety,
    rollback_import,
    save_base_write_plan,
    validate_import_preflight,
)

PROFILE_ID = "profile-cutover-test"
RUN_ID = "import-run-cutover-test"
CHECKSUM = "a" * 64


@pytest.fixture(autouse=True)
def restore_runtime_settings() -> object:
    original = (
        settings.database_mode,
        settings.database_url,
        settings.account_catalogue_source,
    )
    yield
    (
        settings.database_mode,
        settings.database_url,
        settings.account_catalogue_source,
    ) = original


def configure_cutover_database(tmp_path: Path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'cutover.sqlite3'}"
    settings.account_catalogue_source = str(tmp_path / "catalogue.json")
    Path(settings.account_catalogue_source).write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic cutover catalogue",
                "updated_at": "2026-08-30",
                "default_operating_context": {
                    "jurisdiction": "GB",
                    "subdivision": "",
                    "channels": ["web"],
                },
                "records": [
                    {
                        "catalogue_id": "BOOKMAKER-DEMO-001",
                        "account_type": "Bookmaker",
                        "operating_jurisdictions": ["GB"],
                        "operating_subdivisions": [],
                        "operating_channels": ["web"],
                        "brand_name": "Bookmaker A",
                        "short_display_name": "Bookmaker A",
                        "operator_group": "Synthetic Group",
                        "platform": "Synthetic Platform",
                        "foreground_colour": "#FFFFFF",
                        "background_colour": "#455A64",
                        "source": "Synthetic fixture",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    now = "2026-08-30T10:00:00+00:00"
    with connect() as connection:
        connection.execute(
            "INSERT INTO profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                PROFILE_ID,
                "Synthetic Cutover",
                "CUTOVER",
                "Active",
                "2026-01-01",
                "25",
                "25",
                "0.00",
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_tracker_settings (
              profile_id, active_date_preset, custom_start_date, custom_end_date,
              range_back_days, range_forward_days, mug_bet_frequency_days,
              free_bet_expiry_alert_window_days, use_global_date_range_toggle,
              this_month_mode, default_free_bet_underlay_factor,
              default_free_bet_overlay_factor, default_bonus_retention_percent,
              default_exchange_name, dashboard_view_mode, weekly_profit_target,
              monthly_profit_target, annual_profit_target, weekly_extra_place_loss_budget,
              created_at, updated_at
            ) VALUES (?, 'This Year', '', '', 0, 0, 14, 3, 1, 'Calendar', '0.928',
                      '1.3', '0.7', '', 'High-Density', '', '', '', '15', ?, ?)
            """,
            (PROFILE_ID, now, now),
        )
        connection.execute(
            """
            INSERT INTO profile_onboarding_settings (
              profile_id, iteration_number, starting_bankroll, main_bank_catalogue_id,
              enabled_modules_json, preferences_json, onboarding_status, created_at, updated_at
            ) VALUES (?, 1, '0.00', '', '[]', '{}', 'created', ?, ?)
            """,
            (PROFILE_ID, now, now),
        )


def test_write_plan_keeps_canonical_fields_and_required_source_provenance() -> None:
    result = {
        "profile_settings": [
            {
                "setting": "display_name",
                "source_value": "Source-only value",
                "parsed_value": "Synthetic Profile",
                "target": "profile.display_name",
                "classification": "IMPORT",
            }
        ],
        "accounts": {
            "validation_rows": [
                {
                    "source_row": 2,
                    "import_key": "accounts:2",
                    "catalogue_id": "BOOKMAKER-DEMO-001",
                    "canonical_brand": "Bookmaker A",
                    "account_type": "Bookmaker",
                    "mapped_profile_state": {"current_balance": "12.00"},
                    "source_fields": {"LegacyPrivateColumn": "not retained"},
                }
            ]
        },
        "ledgers": {
            "sportsbook": {
                "validation_rows": [
                    {
                        "source_row": 3,
                        "source_record_id": "DEMO-003",
                        "import_key": "sportsbook:3",
                        "action": "insert",
                        "migration_state": "mapped",
                        "errors": [],
                        "normalizations": [
                            {
                                "rule": "constrained_text_preserved_and_shortened",
                                "source_field": "Offer",
                                "target_field": "offer_text",
                                "source_preserved": True,
                            }
                        ],
                        "mapped_payload": {"event_name": "Synthetic event"},
                        "status": "Settled",
                        "source_pnl": "1.00",
                        "imported_current_pnl": "1.00",
                        "current_worst_case_pnl": "",
                        "realised_pnl": "1.00",
                        "formal_report_date": "2026-08-29",
                        "source_fields": {
                            "Bookmaker": "Bookmaker A",
                            "Selection": "Synthetic runner",
                            "Offer": "Synthetic full legacy offer terms retained for audit",
                            "LegacyPrivateColumn": "not retained",
                        },
                    }
                ]
            }
        },
    }

    plan = build_base_write_plan(result)

    encoded = json.dumps(plan)
    assert "Source-only value" not in encoded
    assert "LegacyPrivateColumn" not in encoded
    assert plan["ledgers"]["sportsbook"][0]["source_fields"] == {
        "Bookmaker": "Bookmaker A",
        "Selection": "Synthetic runner",
        "Offer": "Synthetic full legacy offer terms retained for audit",
    }
    assert plan["ledgers"]["sportsbook"][0]["normalizations"][0]["source_preserved"]


def ledger_row(
    ledger: str, import_key: str, payload: dict[str, object], value: str
) -> dict[str, object]:
    return {
        "source_row": 2,
        "source_record_id": f"source-{ledger}",
        "import_key": import_key,
        "action": "insert",
        "migration_state": "mapped",
        "errors": [],
        "mapped_payload": payload,
        "source_fields": {},
        "status": str(payload.get("status", "Settled")),
        "source_pnl": value,
        "imported_current_pnl": value,
        "current_worst_case_pnl": "",
        "realised_pnl": value,
        "formal_report_date": "2026-08-29",
    }


def synthetic_plan() -> dict[str, object]:
    sportsbook = ledger_row(
        "sportsbook",
        "sportsbook:2",
        {
            "event_name": "Synthetic event",
            "offer_text": "Synthetic offer",
            "bookmaker": "Bookmaker A",
            "offer_type": "Mug Bet",
            "status": "Settled",
            "result": "Back Won",
            "back_stake": "10.00",
            "back_odds": "2.00",
            "match_strategy": "No Lay",
            "lay_odds_1": "",
            "exchange_name": "",
            "date_settled": "2026-08-29",
            "user_notes": "",
            "manual_override_value": "5.00",
            "manual_override_reason": "Synthetic parity fixture",
        },
        "5.00",
    )
    open_sportsbook = ledger_row(
        "sportsbook",
        "sportsbook:4",
        {
            "event_name": "Synthetic future fixture",
            "offer_text": "Synthetic open bet",
            "bookmaker": "Bookmaker A",
            "offer_type": "Mug Bet",
            "status": "Placed",
            "result": "Pending",
            "back_stake": "5.00",
            "back_odds": "2.00",
            "match_strategy": "No Lay",
            "lay_odds_1": "",
            "exchange_name": "",
            "date_settled": "2026-08-31",
            "user_notes": "",
            "manual_override_value": "0.00",
            "manual_override_reason": "Synthetic open-value fixture",
        },
        "0.00",
    )
    open_sportsbook["source_row"] = 4
    open_sportsbook["status"] = "Placed"
    open_sportsbook["realised_pnl"] = ""
    open_sportsbook["formal_report_date"] = "2026-08-31"
    free_bet = ledger_row(
        "free_bets",
        "free:2",
        {
            "event_name": "Synthetic free bet event",
            "offer_text": "Synthetic free bet",
            "bookmaker": "Bookmaker A",
            "status": "Settled",
            "result": "Back Won",
            "retention_mode": "SNR",
            "free_bet_value": "10.00",
            "back_odds": "2.00",
            "match_strategy": "No Lay",
            "lay_odds_1": "",
            "exchange_name": "",
            "expiry_datetime": "2026-08-29",
            "date_settled": "2026-08-29",
            "user_notes": "",
            "manual_override_value": "3.00",
            "manual_override_reason": "Synthetic parity fixture",
        },
        "3.00",
    )
    casino = ledger_row(
        "casino",
        "casino:2",
        {
            "offer_group_id": "",
            "date_started": "2026-08-29",
            "date_settling": "2026-08-29",
            "expiry_datetime": "",
            "bookmaker": "Bookmaker A",
            "offer_type": "Cashback",
            "offer_name": "Synthetic casino offer",
            "game": "Synthetic game",
            "cash_stake": "10.00",
            "credit_amount": "0.00",
            "bonus_amount": "0.00",
            "wager_multiplier": "0",
            "wager_target": "0.00",
            "required_spins": "0",
            "spin_stake": "0.00",
            "free_spins_awarded": "0",
            "free_spins_value": "0.00",
            "status": "Settled",
            "result": "Win",
            "calc_net_pnl": "2.00",
            "final_net_pnl": "2.00",
            "user_notes": "",
        },
        "2.00",
    )
    cash = ledger_row(
        "cash_adjustments",
        "cash:2",
        {
            "adjustment_date": "2026-08-29",
            "direction": "In",
            "amount": "1.00",
            "adjustment_type": "Deposit",
            "affects_investment": True,
            "affects_cash_snapshot": True,
            "linked_account": "Bookmaker A",
            "description": "Synthetic adjustment",
        },
        "1.00",
    )
    extra_place = ledger_row(
        "sportsbook",
        "sportsbook:3",
        {
            "event_name": "Synthetic race",
            "offer_text": "Synthetic historical EP",
            "bookmaker": "Bookmaker A",
            "offer_type": "EP (Extra Places)",
            "status": "Settled",
            "result": "Lose",
            "back_stake": "5.00",
            "back_odds": "4.00",
            "match_strategy": "No Lay",
            "lay_odds_1": "",
            "exchange_name": "",
            "date_settled": "2026-08-29",
            "user_notes": "",
            "manual_override_value": "1.00",
            "manual_override_reason": "Synthetic historical EP fixture",
        },
        "1.00",
    )
    extra_place["source_row"] = 3
    extra_place["source_fields"] = {
        "DatePlaced": "2026-08-29",
        "Selection": "Synthetic runner",
        "Event": "Synthetic race",
        "Bookmaker": "Bookmaker A",
        "BackStake": "5.00",
        "BackOdds": "4.00",
    }
    return {
        "schema_version": "profile-workbook-write-plan-v1",
        "profile_settings": [
            {
                "setting": "display_name",
                "source_value": "Imported Synthetic Profile",
                "parsed_value": "Imported Synthetic Profile",
                "target": "profile.display_name",
                "classification": "IMPORT",
            }
        ],
        "accounts": [
            {
                "source_row": 2,
                "import_key": "accounts:2",
                "catalogue_id": "BOOKMAKER-DEMO-001",
                "mapped_profile_state": {
                    "account": "Bookmaker A",
                    "type": "Bookie",
                    "counts_in_cash_total": True,
                    "channel": "Online",
                    "status": "Active",
                    "lifecycle_status": "Active",
                    "restrictions_json": "[]",
                    "current_balance": "12.00",
                    "pending_withdrawal_amount": "1.00",
                    "last_balance_update": "2026-08-29",
                    "group_name": "",
                    "platform": "",
                    "sign_up_date": "2026-01-01",
                    "notes": "",
                },
            }
        ],
        "ledgers": {
            "sportsbook": [sportsbook, extra_place, open_sportsbook],
            "free_bets": [free_bet],
            "casino": [casino],
            "cash_adjustments": [cash],
        },
        "extra_places": {"row_count": 1},
        "approved_reconciliation": {},
        "created_at": "2026-08-30T10:00:00+00:00",
    }


def run_and_workspace() -> tuple[dict[str, object], dict[str, object]]:
    period = {
        "workbook_report": {"total": "11.00"},
        "plum_duff_from_mapped_rows": {"total": "11.00"},
        "difference": "0.00",
    }
    run = {
        "import_run_id": RUN_ID,
        "profile_id": PROFILE_ID,
        "source_filename": "synthetic-cutover.xlsx",
        "workbook_checksum": CHECKSUM,
        "effective_at": "2026-08-30T10:00:00+00:00",
        "mapping_version": "synthetic-v1",
        "status": "READY_APPROVED",
        "summary": {
            "profile_settings": plan_profile_settings(),
            "accounts": {
                "row_count": 1,
                "change_reconciliation": {
                    "counts": {"new_profile_accounts": 1},
                    "default_absent_strategy": "leave_unchanged",
                    "existing_absent_from_workbook": [],
                },
            },
            "ledgers": {
                "sportsbook": {
                    "source_rows": 3,
                    "non_transactional": 0,
                    "partial": 0,
                    "open": 1,
                    "settled": 2,
                    "future_settling_open": 1,
                    "open_current_worst_case_pnl": "0.00",
                    "open_exposure": "0.00",
                    "realised_settled_pnl": "6.00",
                },
                "free_bets": {
                    "source_rows": 1,
                    "non_transactional": 0,
                    "partial": 0,
                    "open": 0,
                    "settled": 1,
                    "future_settling_open": 0,
                    "open_current_worst_case_pnl": "0.00",
                    "realised_settled_pnl": "3.00",
                },
                "casino": {
                    "source_rows": 1,
                    "non_transactional": 0,
                    "partial": 0,
                    "open": 0,
                    "settled": 1,
                    "future_settling_open": 0,
                    "open_current_worst_case_pnl": "0.00",
                    "realised_settled_pnl": "2.00",
                },
                "cash_adjustments": {
                    "source_rows": 1,
                    "non_transactional": 0,
                    "partial": 0,
                    "open": 0,
                    "settled": 1,
                    "future_settling_open": 0,
                    "open_current_worst_case_pnl": "0.00",
                    "realised_settled_pnl": "0.00",
                },
            },
            "extra_places": {"row_count": 1},
        },
        "reconciliation": {"week": period, "month": period, "year": period},
    }
    workspace = {
        "items": [
            {
                "item_id": "ep-review-1",
                "import_id": "sportsbook:3",
                "source_sheet": "Sportsbook Bets",
                "source_row": 3,
                "category": "historical_extra_place",
                "proposed_target": "Extra Place",
                "review_status": "REVIEWED_OVERRIDDEN",
                "decision": {
                    "action": "historical_extra_place",
                    "target_type": "Extra Place",
                    "note": "Synthetic historical EP decision",
                },
            }
        ],
        "reconciliation": {
            "pnl_impact": "0.00",
            "pnl_impact_items": [],
        },
    }
    return run, workspace


def plan_profile_settings() -> list[dict[str, str]]:
    return [
        {
            "setting": "display_name",
            "source_value": "Imported Synthetic Profile",
            "parsed_value": "Imported Synthetic Profile",
            "target": "profile.display_name",
            "classification": "IMPORT",
        }
    ]


def persist_run_and_plan(run: dict[str, object], plan: dict[str, object]) -> None:
    now = "2026-08-30T10:00:00+00:00"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename, workbook_checksum,
              workbook_size_bytes, effective_at, mapping_version, status, summary_json,
              reconciliation_json, approved_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 100, ?, ?, 'READY_APPROVED', ?, ?, ?, ?, ?)
            """,
            (
                RUN_ID,
                PROFILE_ID,
                "founder@example.invalid",
                run["source_filename"],
                CHECKSUM,
                run["effective_at"],
                run["mapping_version"],
                json.dumps(run["summary"]),
                json.dumps(run["reconciliation"]),
                now,
                now,
                now,
            ),
        )
        save_base_write_plan(
            connection,
            import_run_id=RUN_ID,
            profile_id=PROFILE_ID,
            plan=plan,
        )


def load_persisted_run(run: dict[str, object]) -> dict[str, object]:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM profile_import_runs WHERE import_run_id = ?", (RUN_ID,)
        ).fetchone()
    assert row is not None
    return {
        **run,
        **dict(row),
        "summary": run["summary"],
        "reconciliation": run["reconciliation"],
        "result": json.loads(row["result_json"]),
    }


def test_integer_backed_boolean_storage_is_explicit() -> None:
    assert _storage_value("accounts", "counts_in_cash_total", True) == 1
    assert _storage_value("cash_adjustments", "affects_investment", False) == 0
    assert _storage_value("sportsbook_bets", "status", "Placed") == "Placed"


def test_approved_failed_run_remains_retryable_without_resetting_review() -> None:
    assert approved_run_is_retryable({"status": "READY_APPROVED", "approved_at": ""})
    assert approved_run_is_retryable(
        {"status": "IMPORT_FAILED", "approved_at": "2026-08-31T12:00:00+00:00"}
    )
    assert not approved_run_is_retryable({"status": "IMPORT_FAILED", "approved_at": ""})


def test_persistence_preflight_constructs_and_rolls_back_exact_write_set(tmp_path: Path) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()
    run, workspace = run_and_workspace()
    persist_run_and_plan(run, plan)

    result = validate_import_preflight(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        run=run,
        workspace=workspace,
        plan=plan,
    )

    assert result["status"] == "PASSED"
    assert result["transaction_constructed"] is True
    assert result["writes_committed"] is False
    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM accounts WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM sportsbook_bets WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM profile_import_write_audit WHERE import_run_id = ?", (RUN_ID,)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT display_name FROM profiles WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == "Synthetic Cutover"
        )


def test_transactional_import_reconciles_and_rolls_back(tmp_path: Path) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()
    run, workspace = run_and_workspace()
    persist_run_and_plan(run, plan)

    result = execute_import(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=run,
        workspace=workspace,
        plan=plan,
    )

    assert result["status"] == "COMPLETE", result["post_import_reconciliation"]["mismatches"]
    report = result["post_import_reconciliation"]
    assert report["result"] == "POST-IMPORT RECONCILIATION: PASSED"
    assert report["financial_reconciliation"]["periods"]["year"]["difference"] == "0.00"
    assert report["accounts"]["bookmaker_balance_total"]["actual"] == "12.00"
    assert report["profile"]["profile_name"] == "Imported Synthetic Profile"
    assert report["open_positions"]["future_settling_open"]["difference"] == 0
    assert report["open_positions"]["no_open_row_accidentally_settled"] is True
    assert report["handoff"]["workbook"]["checksum"] == CHECKSUM
    assert report["handoff"]["profile"]["import_run_id"] == RUN_ID
    assert report["handoff"]["status"] == "POST-IMPORT RECONCILIATION: PASSED"
    assert {
        name: values["actual_persisted_rows"] for name, values in report["ledgers"].items()
    } == {
        "sportsbook": 2,
        "free_bets": 1,
        "casino": 1,
        "cash_adjustments": 1,
        "extra_places": 1,
    }
    with pytest.raises(ImportCutoverError, match="already written"):
        execute_import(
            profile_id=PROFILE_ID,
            import_run_id=RUN_ID,
            actor_email="founder@example.invalid",
            run=run,
            workspace=workspace,
            plan=plan,
        )

    rollback = rollback_import(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=load_persisted_run(run),
    )
    assert rollback["status"] == "ROLLED_BACK"
    assert rollback["checkpoint_reconciled"] is True
    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM accounts WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM sportsbook_bets WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT display_name FROM profiles WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == "Synthetic Cutover"
        )


def test_mid_import_failure_rolls_back_database_transaction(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()
    run, workspace = run_and_workspace()
    persist_run_and_plan(run, plan)

    def fail_ledgers(*_args: object, **_kwargs: object) -> dict[str, int]:
        raise RuntimeError("synthetic midpoint failure")

    monkeypatch.setattr("openforge_api.profile_workbook_cutover._insert_ledger_rows", fail_ledgers)
    with pytest.raises(ImportPersistenceError) as caught:
        execute_import(
            profile_id=PROFILE_ID,
            import_run_id=RUN_ID,
            actor_email="founder@example.invalid",
            run=run,
            workspace=workspace,
            plan=plan,
        )
    assert caught.value.stage == "Profile ledgers"
    assert caught.value.category == "ledger_write"
    with connect() as connection:
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM accounts WHERE profile_id = ?", (PROFILE_ID,)
            ).fetchone()[0]
            == 0
        )
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM profile_import_write_audit WHERE import_run_id = ?", (RUN_ID,)
            ).fetchone()[0]
            == 0
        )
    safety = failed_import_safety(PROFILE_ID, RUN_ID)
    assert safety["no_partial_profile_changes"] is True
    assert safety["retry_available"] is True
