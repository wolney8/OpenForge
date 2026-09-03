from __future__ import annotations

import json
from pathlib import Path

import pytest

from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.profile_import_execution import (
    advance_import_execution,
    load_import_execution,
    start_import_execution,
)
from openforge_api.profile_workbook_cutover import (
    ImportCutoverError,
    ImportPersistenceError,
    _account_write_state,
    _apply_decision,
    _apply_formal_report_date,
    _checkpoint_state_checksum,
    _checksum,
    _historical_extra_place_date,
    _profile_state_checksum,
    _storage_value,
    approved_run_is_retryable,
    build_base_write_plan,
    completed_import_rollback_safety,
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
        "financial_views": {
            "realised_settled_pnl": {"total": "11.00"},
            "open_current_worst_case_pnl": {"total": "0.00"},
            "other_workbook_included_pnl": {"total": "0.00"},
        },
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
        "approved_at": "2026-08-30T10:00:00+00:00",
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


def approve_synthetic_preflight(
    run: dict[str, object], workspace: dict[str, object], plan: dict[str, object]
) -> None:
    result = validate_import_preflight(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        run=run,
        workspace=workspace,
        plan=plan,
    )
    run["summary"]["persistence_preflight"] = {
        **result,
        "workbook_checksum": CHECKSUM,
        "mapping_version": run["mapping_version"],
        "completed_at": "2026-08-30T10:01:00+00:00",
    }


def test_integer_backed_boolean_storage_is_explicit() -> None:
    assert _storage_value("accounts", "counts_in_cash_total", True) == 1
    assert _storage_value("cash_adjustments", "affects_investment", False) == 0
    assert _storage_value("sportsbook_bets", "status", "Placed") == "Placed"


def test_rolled_back_approved_run_remains_retryable() -> None:
    assert approved_run_is_retryable(
        {"status": "ROLLED_BACK", "approved_at": "2026-08-30T10:00:00+00:00"}
    )


def test_settled_import_preserves_approved_workbook_value() -> None:
    payload = {
        "status": "Settled",
        "manual_override_value": "",
        "manual_override_reason": "",
    }

    result = _apply_decision(
        payload,
        {
            "imported_current_pnl": "-3.01",
            "realised_pnl": "-3.01",
        },
        None,
    )

    assert result["manual_override_value"] == "-3.01"
    assert result["manual_override_reason"] == (
        "Imported settled workbook value retained for cutover parity"
    )


def test_other_reporting_state_preserves_approved_workbook_value() -> None:
    result = _apply_decision(
        {"status": "Error", "manual_override_value": "", "manual_override_reason": ""},
        {
            "imported_current_pnl": "-8.60",
            "current_worst_case_pnl": "",
            "realised_pnl": "",
        },
        None,
    )

    assert result["manual_override_value"] == "-8.60"
    assert result["manual_override_reason"] == (
        "Imported workbook value retained for a non-settled reporting state"
    )


def test_settled_import_uses_formal_report_date_when_transaction_date_is_blank() -> None:
    payload = _apply_formal_report_date(
        {"date_settled": ""},
        {"realised_pnl": "-2.00", "formal_report_date": "2026-08-19"},
        "sportsbook",
    )

    assert payload["date_settled"] == "2026-08-19"


def test_historical_extra_place_uses_approved_report_date_when_source_date_is_blank() -> None:
    assert _historical_extra_place_date(
        {}, {"formal_report_date": "2026-08-19T17:20:00"}
    ) == "2026-08-19T17:20:00"


def test_legacy_checkpoint_ignores_derived_bookmaker_link() -> None:
    legacy_snapshot = {
        "accounts": [
            {
                "account_id": "account-demo",
                "bookmaker_id": "BM-LEGACY",
                "current_balance": "12.00",
            }
        ]
    }
    encoded = json.dumps(legacy_snapshot, default=str, separators=(",", ":"), sort_keys=True)
    checkpoint = {
        "snapshot_json": encoded,
        "snapshot_checksum": _checksum(legacy_snapshot),
    }

    assert _checkpoint_state_checksum(checkpoint) == _checksum(
        {
            "accounts": [
                {
                    "account_id": "account-demo",
                    "current_balance": "12.00",
                }
            ]
        }
    )


def test_account_write_state_translates_mapper_fields_to_canonical_columns() -> None:
    class Provider:
        brand_name = "Bookmaker A"
        account_type = "Bookmaker"
        operator_group = "Operator A"
        platform = "Platform A"

    state = _account_write_state(
        {
            "account_id": None,
            "account": "Legacy name",
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "Online",
            "status": "Active",
            "lifecycle_status": "Active",
            "restrictions": ["bonus_restricted"],
            "current_balance": "12.00",
            "pending_withdrawal_amount": "0.00",
            "last_balance_update": "2026-08-29",
            "sign_up_date": "2026-01-01",
            "notes": "",
        },
        catalogue_id="BOOKMAKER-DEMO-001",
        provider=Provider(),
    )

    assert "account_id" not in state
    assert "restrictions" not in state
    assert state["restrictions_json"] == '["bonus_restricted"]'
    assert state["catalogue_id"] == "BOOKMAKER-DEMO-001"
    assert state["account"] == "Bookmaker A"


def test_approved_failed_run_remains_retryable_without_resetting_review() -> None:
    assert approved_run_is_retryable({"status": "READY_APPROVED", "approved_at": ""})
    assert approved_run_is_retryable(
        {"status": "IMPORT_FAILED", "approved_at": "2026-08-31T12:00:00+00:00"}
    )
    assert not approved_run_is_retryable({"status": "IMPORT_FAILED", "approved_at": ""})


def test_persistence_preflight_constructs_and_rolls_back_exact_write_set(tmp_path: Path) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()
    account_state = plan["accounts"][0]["mapped_profile_state"]
    account_state["account_id"] = None
    account_state["restrictions"] = ["bonus_restricted"]
    account_state.pop("restrictions_json")
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
    assert result["schema_compatibility"]["status"] == "PASSED"
    assert result["schema_compatibility"]["tables"]["accounts"]["missing_columns"] == []
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


def test_completed_import_rollback_safety_locks_after_profile_drift(tmp_path: Path) -> None:
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
    persisted_run = load_persisted_run(run)
    persisted_run["result"] = result
    safety = completed_import_rollback_safety(PROFILE_ID, RUN_ID, persisted_run)
    assert safety["checkpoint_available"] is True
    assert safety["profile_matches_post_import"] is True
    assert safety["rollback_available"] is True

    with connect() as connection:
        sportsbook_bet_id = connection.execute(
            "SELECT sportsbook_bet_id FROM sportsbook_bets WHERE profile_id = ? LIMIT 1",
            (PROFILE_ID,),
        ).fetchone()[0]
        connection.execute(
            "DELETE FROM sportsbook_bets WHERE profile_id = ? AND sportsbook_bet_id = ?",
            (PROFILE_ID, sportsbook_bet_id),
        )

    safety = completed_import_rollback_safety(PROFILE_ID, RUN_ID, persisted_run)
    assert safety["checkpoint_available"] is True
    assert safety["profile_matches_post_import"] is False
    assert safety["manual_changes_detected"] is True
    assert safety["rollback_available"] is False
    assert "discard later Profile activity" in safety["blocked_reason"]


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


def test_staged_import_is_resumable_and_reconciles(tmp_path: Path) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()
    run, workspace = run_and_workspace()
    persist_run_and_plan(run, plan)
    approve_synthetic_preflight(run, workspace, plan)

    execution = start_import_execution(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=run,
        workspace=workspace,
        plan=plan,
    )
    assert execution["status"] == "RUNNING"
    execution = advance_import_execution(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=load_persisted_run(run),
        workspace=workspace,
        plan=plan,
    )

    resumed = load_import_execution(RUN_ID)
    assert resumed is not None
    assert resumed["stage"] == execution["stage"]
    request_count = 1
    while execution["status"] == "RUNNING":
        execution = advance_import_execution(
            profile_id=PROFILE_ID,
            import_run_id=RUN_ID,
            actor_email="founder@example.invalid",
            run=load_persisted_run(run),
            workspace=workspace,
            plan=plan,
        )
        request_count += 1

    assert request_count > len(plan["ledgers"])
    assert execution["status"] == "COMPLETE"
    assert execution["percentage"] == 100
    with connect() as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM profile_import_write_audit "
            "WHERE import_run_id = ? AND rolled_back_at = ''",
            (RUN_ID,),
        ).fetchone()[0] == 8
        assert connection.execute(
            "SELECT COUNT(*) FROM sportsbook_bets WHERE profile_id = ?",
            (PROFILE_ID,),
        ).fetchone()[0] == 2
        summary = json.loads(
            connection.execute(
                "SELECT summary_json FROM profile_import_runs WHERE import_run_id = ?",
                (RUN_ID,),
            ).fetchone()["summary_json"]
        )
        assert [event["kind"] for event in summary["job"]["events"]][-2:] == [
            "import_started",
            "import_complete",
        ]
    rollback = rollback_import(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=load_persisted_run(run),
    )
    assert rollback["checkpoint_reconciled"] is True
    assert failed_import_safety(PROFILE_ID, RUN_ID)["no_partial_profile_changes"] is True


def test_real_sized_staged_import_uses_bounded_batches(tmp_path: Path) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()

    def clones(
        base: dict[str, object], *, prefix: str, count: int
    ) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        for index in range(count):
            row = json.loads(json.dumps(base))
            row["import_key"] = f"{prefix}:scale:{index}"
            row["source_row"] = index + 10
            row["source_record_id"] = f"{prefix}-scale-{index}"
            row["imported_current_pnl"] = "0.00"
            row["source_pnl"] = "0.00"
            row["realised_pnl"] = "0.00"
            payload = row["mapped_payload"]
            if "manual_override_value" in payload:
                payload["manual_override_value"] = "0.00"
            if "calc_net_pnl" in payload:
                payload["calc_net_pnl"] = "0.00"
                payload["final_net_pnl"] = "0.00"
            if "amount" in payload:
                payload["amount"] = "0.00"
            rows.append(row)
        return rows

    sportsbook_rows = plan["ledgers"]["sportsbook"]
    sportsbook_rows.extend(
        clones(sportsbook_rows[0], prefix="sportsbook", count=501)
    )
    second_ep = clones(sportsbook_rows[1], prefix="extra-place", count=1)[0]
    sportsbook_rows.append(second_ep)
    excluded = clones(sportsbook_rows[0], prefix="prospecting", count=5)
    for row in excluded:
        row["action"] = "exclude_non_transactional"
        row["realised_pnl"] = ""
    sportsbook_rows.extend(excluded)
    plan["ledgers"]["free_bets"].extend(
        clones(plan["ledgers"]["free_bets"][0], prefix="free-bet", count=165)
    )
    plan["ledgers"]["casino"].extend(
        clones(plan["ledgers"]["casino"][0], prefix="casino", count=19)
    )
    plan["ledgers"]["cash_adjustments"].extend(
        clones(plan["ledgers"]["cash_adjustments"][0], prefix="cash", count=22)
    )
    plan["extra_places"]["row_count"] = 2
    run, workspace = run_and_workspace()
    run["summary"]["ledgers"]["sportsbook"].update(
        {"source_rows": 510, "settled": 504, "non_transactional": 5}
    )
    run["summary"]["ledgers"]["free_bets"].update(
        {"source_rows": 166, "settled": 166}
    )
    run["summary"]["ledgers"]["casino"].update(
        {"source_rows": 20, "settled": 20}
    )
    run["summary"]["ledgers"]["cash_adjustments"].update(
        {"source_rows": 23, "settled": 23}
    )
    run["summary"]["extra_places"]["row_count"] = 2
    workspace["items"].append(
        {
            **workspace["items"][0],
            "item_id": "ep-review-2",
            "import_id": second_ep["import_key"],
            "source_row": second_ep["source_row"],
        }
    )
    persist_run_and_plan(run, plan)
    approve_synthetic_preflight(run, workspace, plan)

    execution = start_import_execution(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=run,
        workspace=workspace,
        plan=plan,
    )
    requests = 0
    while execution["status"] == "RUNNING":
        execution = advance_import_execution(
            profile_id=PROFILE_ID,
            import_run_id=RUN_ID,
            actor_email="founder@example.invalid",
            run=load_persisted_run(run),
            workspace=workspace,
            plan=plan,
        )
        requests += 1
    assert execution["status"] == "COMPLETE"
    assert requests >= 25
    with connect() as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM sportsbook_bets WHERE profile_id = ?",
            (PROFILE_ID,),
        ).fetchone()[0] == 503
        assert connection.execute(
            "SELECT COUNT(*) FROM free_bets WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == 166
        assert connection.execute(
            "SELECT COUNT(*) FROM casino_offers WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == 20
        assert connection.execute(
            "SELECT COUNT(*) FROM cash_adjustments WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == 23
        assert connection.execute(
            "SELECT COUNT(*) FROM each_way_extra_places WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == 2


def test_staged_failure_restores_checkpoint_and_remains_retryable(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_cutover_database(tmp_path)
    plan = synthetic_plan()
    run, workspace = run_and_workspace()
    persist_run_and_plan(run, plan)
    approve_synthetic_preflight(run, workspace, plan)
    execution = start_import_execution(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=run,
        workspace=workspace,
        plan=plan,
    )
    while execution["stage"] != "SPORTSBOOK":
        execution = advance_import_execution(
            profile_id=PROFILE_ID,
            import_run_id=RUN_ID,
            actor_email="founder@example.invalid",
            run=load_persisted_run(run),
            workspace=workspace,
            plan=plan,
        )

    with connect() as connection:
        assert _profile_state_checksum(connection, PROFILE_ID) == execution["progress"][
            "last_state_checksum"
        ]

    def fail_batch(*_args: object, **_kwargs: object) -> dict[str, object]:
        raise RuntimeError("synthetic staged failure")

    monkeypatch.setattr(
        "openforge_api.profile_import_execution.insert_ledger_batch",
        fail_batch,
    )
    execution = advance_import_execution(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=load_persisted_run(run),
        workspace=workspace,
        plan=plan,
    )

    assert execution["status"] == "ROLLED_BACK", json.dumps(execution["error"], sort_keys=True)
    safety = failed_import_safety(PROFILE_ID, RUN_ID)
    assert safety["no_partial_profile_changes"] is True
    assert safety["retry_available"] is True
    with connect() as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM accounts WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == 0
        assert connection.execute(
            "SELECT COUNT(*) FROM sportsbook_bets WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == 0
        assert connection.execute(
            "SELECT display_name FROM profiles WHERE profile_id = ?", (PROFILE_ID,)
        ).fetchone()[0] == "Synthetic Cutover"
        summary = json.loads(
            connection.execute(
                "SELECT summary_json FROM profile_import_runs WHERE import_run_id = ?",
                (RUN_ID,),
            ).fetchone()["summary_json"]
        )
        assert summary["job"]["events"][-1]["kind"] == "import_failed"

    # A safely rolled-back attempt must remain eligible for the same exact
    # non-mutating persistence preflight before it is retried.
    preflight = validate_import_preflight(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        run=load_persisted_run(run),
        workspace=workspace,
        plan=plan,
    )
    assert preflight["status"] == "PASSED"
    assert preflight["writes_committed"] is False

    monkeypatch.undo()
    execution = start_import_execution(
        profile_id=PROFILE_ID,
        import_run_id=RUN_ID,
        actor_email="founder@example.invalid",
        run=load_persisted_run(run),
        workspace=workspace,
        plan=plan,
    )
    while execution["status"] == "RUNNING":
        execution = advance_import_execution(
            profile_id=PROFILE_ID,
            import_run_id=RUN_ID,
            actor_email="founder@example.invalid",
            run=load_persisted_run(run),
            workspace=workspace,
            plan=plan,
        )
    assert execution["status"] == "COMPLETE"
