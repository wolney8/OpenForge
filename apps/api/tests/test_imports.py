from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from fastapi import HTTPException
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import ImportBatchRecord, ImportSourceRecord
from openforge_api.imports import (
    ImportRowPayload,
    canonical_source_hash,
    reconcile_cash_adjustment_values,
    reconcile_casino_offer_values,
    reconcile_free_bet_values,
    reconcile_import_row_count,
    reconcile_sportsbook_values,
    require_complete_row_accounting,
    stage_import_rows,
)
from openforge_api.main import app

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = json.loads(
    (ROOT / "tests" / "fixtures" / "spreadsheet-import-export-roundtrip-fixtures.json").read_text()
)["cases"]
SPORTSBOOK_FIXTURES = json.loads(
    (ROOT / "tests" / "fixtures" / "sportsbook-import-field-map-fixtures.json").read_text()
)["cases"]
FREE_BET_FIXTURES = json.loads(
    (ROOT / "tests" / "fixtures" / "free-bet-import-field-map-fixtures.json").read_text()
)["cases"]
CASINO_OFFER_FIXTURES = json.loads(
    (ROOT / "tests" / "fixtures" / "casino-offer-import-field-map-fixtures.json").read_text()
)["cases"]
CASH_ADJUSTMENT_FIXTURES = json.loads(
    (ROOT / "tests" / "fixtures" / "cash-adjustment-import-field-map-fixtures.json").read_text()
)["cases"]
ACCOUNT_FIXTURES = json.loads(
    (ROOT / "tests" / "fixtures" / "accounts-import-field-map-fixtures.json").read_text()
)["cases"]
ROW_ACCOUNTING_FIXTURES = json.loads(
    (
        ROOT
        / "tests"
        / "fixtures"
        / "import-row-accounting-reconciliation-fixtures.json"
    ).read_text()
)["cases"]
CASH_RECONCILIATION_FIXTURES = json.loads(
    (
        ROOT
        / "tests"
        / "fixtures"
        / "cash-adjustment-import-reconciliation-fixtures.json"
    ).read_text()
)["cases"]
CASINO_RECONCILIATION_FIXTURES = json.loads(
    (
        ROOT
        / "tests"
        / "fixtures"
        / "casino-offer-import-reconciliation-fixtures.json"
    ).read_text()
)["cases"]
FREE_BET_RECONCILIATION_FIXTURES = json.loads(
    (
        ROOT
        / "tests"
        / "fixtures"
        / "free-bet-import-reconciliation-fixtures.json"
    ).read_text()
)["cases"]
SPORTSBOOK_RECONCILIATION_FIXTURES = json.loads(
    (
        ROOT
        / "tests"
        / "fixtures"
        / "sportsbook-import-reconciliation-fixtures.json"
    ).read_text()
)["cases"]


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def fixture(case_id: str) -> dict[str, object]:
    return next(case for case in FIXTURES if case["case_id"] == case_id)


def sportsbook_fixture(case_id: str) -> dict[str, object]:
    return next(case for case in SPORTSBOOK_FIXTURES if case["case_id"] == case_id)


def free_bet_fixture(case_id: str) -> dict[str, object]:
    return next(case for case in FREE_BET_FIXTURES if case["case_id"] == case_id)


def casino_offer_fixture(case_id: str) -> dict[str, object]:
    return next(case for case in CASINO_OFFER_FIXTURES if case["case_id"] == case_id)


def cash_adjustment_fixture(case_id: str) -> dict[str, object]:
    return next(case for case in CASH_ADJUSTMENT_FIXTURES if case["case_id"] == case_id)


def account_fixture(case_id: str) -> dict[str, object]:
    return next(case for case in ACCOUNT_FIXTURES if case["case_id"] == case_id)


def row_accounting_fixture(case_id: str) -> dict[str, object]:
    return next(
        case for case in ROW_ACCOUNTING_FIXTURES if case["case_id"] == case_id
    )


def cash_reconciliation_fixture(case_id: str) -> dict[str, object]:
    return next(
        case for case in CASH_RECONCILIATION_FIXTURES if case["case_id"] == case_id
    )


def casino_reconciliation_fixture(case_id: str) -> dict[str, object]:
    return next(
        case for case in CASINO_RECONCILIATION_FIXTURES if case["case_id"] == case_id
    )


def free_bet_reconciliation_fixture(case_id: str) -> dict[str, object]:
    return next(
        case for case in FREE_BET_RECONCILIATION_FIXTURES if case["case_id"] == case_id
    )


def sportsbook_reconciliation_fixture(case_id: str) -> dict[str, object]:
    return next(
        case for case in SPORTSBOOK_RECONCILIATION_FIXTURES if case["case_id"] == case_id
    )


def no_existing_source(_sheet: str, _source_record_id: str) -> None:
    return None


def test_import_row_accounting_matches_fixture_decisions() -> None:
    for case_id in ["IRA-001", "IRA-002", "IRA-003"]:
        case = row_accounting_fixture(case_id)
        inputs = case["inputs"]
        expected = case["expected"]
        assert isinstance(inputs, dict)
        assert isinstance(expected, dict)
        summary = inputs["summary"]
        assert isinstance(summary, dict)

        result = reconcile_import_row_count(
            int(inputs["source_row_count"]), summary
        )

        assert result.accounted_row_count == expected["accounted_row_count"]
        assert result.state == expected["state"]


def test_incomplete_row_accounting_blocks_confirmation() -> None:
    batch = ImportBatchRecord(
        import_batch_id="IMPORT-ROW-MISMATCH",
        profile_id="PROFILE-001",
        source_filename="synthetic.xlsx",
        source_type="xlsx",
        mapping_version="accounts-v1",
        status="dry_run_ready",
        row_count=5,
        error_count=0,
        warning_count=0,
        summary_json=json.dumps({"insert": 4}),
        backup_snapshot_id="",
        started_at="2026-07-17T09:00:00Z",
        completed_at="",
    )

    try:
        require_complete_row_accounting(batch)
    except HTTPException as error:
        assert error.status_code == 409
        assert "4 of 5" in str(error.detail)
    else:
        raise AssertionError("Incomplete row accounting did not block confirmation")


def test_cash_adjustment_import_reconciliation_matches_fixtures() -> None:
    for case_id in ["CAR-001", "CAR-002", "CAR-003", "CAR-004"]:
        case = cash_reconciliation_fixture(case_id)
        rows = case["rows"]
        expected = case["expected"]
        assert isinstance(rows, list)
        assert isinstance(expected, dict)

        result = reconcile_cash_adjustment_values(str(case["mapping_version"]), rows)

        assert result.state == expected["state"]
        assert result.source_total == expected["source_total"]
        assert result.recomputed_total == expected["recomputed_total"]
        assert result.difference == expected["difference"]


def test_casino_offer_import_reconciliation_matches_fixtures() -> None:
    for case_id in ["COR-001", "COR-002", "COR-003"]:
        case = casino_reconciliation_fixture(case_id)
        rows = case["rows"]
        expected = case["expected"]
        assert isinstance(rows, list)
        assert isinstance(expected, dict)

        result = reconcile_casino_offer_values(str(case["mapping_version"]), rows)

        assert result.state == expected["state"]
        assert result.source_total == expected["source_total"]
        assert result.recomputed_total == expected["recomputed_total"]
        assert result.difference == expected["difference"]


def test_free_bet_import_reconciliation_matches_fixtures() -> None:
    for case_id in ["FBR-001", "FBR-002", "FBR-003", "FBR-004", "FBR-005"]:
        case = free_bet_reconciliation_fixture(case_id)
        rows = case["rows"]
        expected = case["expected"]
        assert isinstance(rows, list)
        assert isinstance(expected, dict)

        result = reconcile_free_bet_values(str(case["mapping_version"]), rows)

        assert result.state == expected["state"]
        assert result.source_total == expected["source_total"]
        assert result.recomputed_total == expected["recomputed_total"]
        assert result.difference == expected["difference"]


def test_sportsbook_import_reconciliation_matches_fixtures() -> None:
    for case_id in [
        "SBR-001",
        "SBR-002",
        "SBR-003",
        "SBR-004",
        "SBR-005",
        "SBR-006",
    ]:
        case = sportsbook_reconciliation_fixture(case_id)
        rows = case["rows"]
        expected = case["expected"]
        assert isinstance(rows, list)
        assert isinstance(expected, dict)

        result = reconcile_sportsbook_values(str(case["mapping_version"]), rows)

        assert result.state == expected["state"]
        assert result.source_total == expected["source_total"]
        assert result.recomputed_total == expected["recomputed_total"]
        assert result.difference == expected["difference"]


def existing_source(
    *, profile_id: str, source_hash: str
) -> Callable[[str, str], ImportSourceRecord]:
    def lookup(sheet: str, source_record_id: str) -> ImportSourceRecord:
        return ImportSourceRecord(
            source_sheet=sheet,
            source_record_id=source_record_id,
            profile_id=profile_id,
            source_hash=source_hash,
            import_batch_id="IMPORT-SYNTHETIC",
            entity_type="sportsbook_bet",
            entity_id="SB-SYNTHETIC",
            imported_at="2026-07-15T10:00:00Z",
        )

    return lookup


def test_valid_row_is_staged_for_selected_profile() -> None:
    inputs = fixture("IO-001")["inputs"]
    assert isinstance(inputs, dict)
    row = ImportRowPayload(
        sheet=str(inputs["sheet"]),
        source_record_id=str(inputs["source_record_id"]),
        fields={"status": str(inputs["status"]), "result": str(inputs["result"])},
    )

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["errors"] == []


def test_unchanged_source_is_idempotent_no_op() -> None:
    inputs = fixture("IO-002")["inputs"]
    assert isinstance(inputs, dict)
    fields = {"status": "Placed", "result": "Pending"}
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id=str(inputs["source_record_id"]),
        fields=fields,
    )
    source_hash = canonical_source_hash(fields)

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=existing_source(
            profile_id=str(inputs["target_profile_id"]), source_hash=source_hash
        ),
    )

    assert staged[0]["staged_action"] == "no_op"


def test_cross_profile_source_collision_is_blocked() -> None:
    inputs = fixture("IO-003")["inputs"]
    assert isinstance(inputs, dict)
    fields = {"status": "Placed"}
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id=str(inputs["source_record_id"]),
        fields=fields,
    )

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=existing_source(
            profile_id=str(inputs["existing_profile_id"]),
            source_hash=canonical_source_hash(fields),
        ),
    )

    assert staged[0]["staged_action"] == "blocked"
    assert staged[0]["errors"][0]["code"] == "cross_profile_source_collision"


def test_invalid_status_reports_source_row() -> None:
    inputs = fixture("IO-004")["inputs"]
    assert isinstance(inputs, dict)
    row = ImportRowPayload(
        sheet=str(inputs["sheet"]),
        source_record_id="DEMO-FB-STATUS",
        source_row=int(inputs["source_row"]),
        fields={"status": str(inputs["status"])},
    )

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=no_existing_source,
    )

    assert staged[0]["source_row"] == 4
    assert staged[0]["errors"][0]["code"] == "invalid_status"


def test_manual_override_without_reason_is_blocked() -> None:
    inputs = fixture("IO-005")["inputs"]
    assert isinstance(inputs, dict)
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id="DEMO-SB-OVERRIDE",
        fields={
            "status": "Settled",
            "manual_override_value": str(inputs["manual_override_value"]),
            "manual_override_reason": str(inputs["manual_override_reason"]),
        },
    )

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=no_existing_source,
    )

    assert staged[0]["errors"][0]["code"] == "override_reason_required"


def test_current_value_difference_is_visible_warning() -> None:
    inputs = fixture("IO-006")["inputs"]
    assert isinstance(inputs, dict)
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id="DEMO-SB-RECONCILE",
        fields={
            "status": "Placed",
            "source_current_value": str(inputs["source_current_value"]),
            "recomputed_current_value": str(inputs["recomputed_current_value"]),
            "tolerance": str(inputs["tolerance"]),
        },
    )

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["warnings"][0]["code"] == "current_value_mismatch"
    assert "0.50" in staged[0]["warnings"][0]["message"]


def test_roundtrip_fields_are_preserved_in_staging() -> None:
    inputs = fixture("IO-007")["inputs"]
    assert isinstance(inputs, dict)
    fields = {
        "status": str(inputs["status"]),
        "result": str(inputs["result"]),
        "entered_value": str(inputs["entered_value"]),
        "manual_override_value": str(inputs["manual_override_value"]),
        "manual_override_reason": str(inputs["manual_override_reason"]),
    }
    row = ImportRowPayload(
        sheet="Free Bets",
        source_record_id=str(inputs["source_record_id"]),
        fields=fields,
    )

    staged = stage_import_rows(
        profile_id=str(inputs["profile_id"]),
        rows=[row],
        source_lookup=no_existing_source,
    )

    assert staged[0]["fields"] == fields


def test_signup_users_is_ignored() -> None:
    inputs = fixture("IO-008")["inputs"]
    assert isinstance(inputs, dict)
    row = ImportRowPayload(sheet=str(inputs["sheet"]), fields={})

    staged = stage_import_rows(
        profile_id=str(inputs["target_profile_id"]),
        rows=[row],
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "ignored"
    assert staged[0]["warnings"][0]["code"] == "excluded_source_sheet"


def test_dry_run_is_audited_profile_scoped_and_does_not_write_ledgers(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"
    before = {
        route: len(client.get(f"/profiles/{profile_id}/{route}").json())
        for route in ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"]
    }

    response = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "synthetic-tracker.json",
            "rows": [
                {
                    "sheet": "Sportsbook Bets",
                    "source_record_id": "DEMO-SB-API-001",
                    "source_row": 2,
                    "fields": {"status": "Placed", "result": "Pending"},
                },
                {"sheet": "SignupUsers", "source_row": 3, "fields": {}},
            ],
        },
    )

    assert response.status_code == 201
    batch = response.json()
    assert batch["profile_id"] == profile_id
    assert batch["status"] == "dry_run_ready"
    assert batch["summary"] == {"ignored": 1, "insert": 1}
    assert batch["row_accounting"] == {
        "source_row_count": 2,
        "accounted_row_count": 2,
        "state": "complete",
        "message": "All 2 source rows are represented in this review.",
    }
    assert batch["warning_count"] == 1

    after = {
        route: len(client.get(f"/profiles/{profile_id}/{route}").json())
        for route in ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"]
    }
    assert after == before

    batch_id = batch["import_batch_id"]
    assert client.get(f"/profiles/{profile_id}/imports/{batch_id}").status_code == 200
    assert (
        client.get(f"/profiles/profile-demo-002/imports/{batch_id}").status_code == 404
    )


def test_sportsbook_v1_maps_entered_fields_and_excludes_helpers() -> None:
    case = sportsbook_fixture("SI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id=str(case["source_record_id"]),
        fields=fields,
    )

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[row],
        mapping_version="sportsbook-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["event_name"] == fields["EventName"]
    assert staged[0]["mapped_fields"]["exchange_name"] == fields["Exchange"]
    assert "CalcNetPnL" not in staged[0]["mapped_fields"]


def test_sportsbook_v1_keeps_helpers_in_audit_only() -> None:
    case = sportsbook_fixture("SI-003")
    fields = case["fields"]
    assert isinstance(fields, dict)
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id=str(case["source_record_id"]),
        fields=fields,
    )

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[row],
        mapping_version="sportsbook-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["fields"]["CalcNetPnL"] == "-0.42"
    assert "CalcNetPnL" not in staged[0]["mapped_fields"]
    assert "WeekLabel" not in staged[0]["mapped_fields"]


def test_sportsbook_v1_blocks_advanced_branch_flattening() -> None:
    case = sportsbook_fixture("SI-005")
    fields = case["fields"]
    assert isinstance(fields, dict)
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id=str(case["source_record_id"]),
        fields=fields,
    )

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[row],
        mapping_version="sportsbook-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "blocked"
    assert any(
        row["code"] == "advanced_branch_mapping_required" for row in staged[0]["errors"]
    )


def test_sportsbook_v1_maps_no_lay_without_inventing_exchange_values() -> None:
    case = sportsbook_fixture("SI-006")
    fields = case["fields"]
    assert isinstance(fields, dict)
    row = ImportRowPayload(
        sheet="Sportsbook Bets",
        source_record_id=str(case["source_record_id"]),
        fields=fields,
    )

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[row],
        mapping_version="sportsbook-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["exchange_name"] == ""
    assert staged[0]["mapped_fields"]["lay_odds_1"] == ""


def test_sportsbook_v1_preserves_plum_duff_multi_lay_branch_payload() -> None:
    case = sportsbook_fixture("SI-007")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Sportsbook Bets",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="sportsbook-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["multi_lay_outcomes_json"] == fields[
        "MultiLayOutcomesJson"
    ]


def test_free_bets_v1_maps_entered_fields_and_excludes_helpers() -> None:
    case = free_bet_fixture("FI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Free Bets",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="free-bets-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["retention_mode"] == "SNR"
    assert staged[0]["mapped_fields"]["expiry_datetime"] == fields["ExpiryDateTime"]
    assert staged[0]["mapped_fields"]["lay_commission_1"] == ""
    assert "CalcNetPnL" not in staged[0]["mapped_fields"]
    assert "WeekLabel" not in staged[0]["mapped_fields"]


def test_free_bets_v1_blocks_unsafe_override_and_incomplete_partial_lay() -> None:
    staged_rows = []
    for case_id in ("FI-003", "FI-004"):
        case = free_bet_fixture(case_id)
        fields = case["fields"]
        assert isinstance(fields, dict)
        staged_rows.extend(
            stage_import_rows(
                profile_id="PROFILE-001",
                rows=[
                    ImportRowPayload(
                        sheet="Free Bets",
                        source_record_id=str(case["source_record_id"]),
                        fields=fields,
                    )
                ],
                mapping_version="free-bets-v1",
                source_lookup=no_existing_source,
            )
        )

    assert staged_rows[0]["staged_action"] == "blocked"
    assert any(
        item["code"] == "override_reason_required" for item in staged_rows[0]["errors"]
    )
    assert staged_rows[1]["staged_action"] == "blocked"
    assert any(
        item["code"] == "incomplete_partial_lay" for item in staged_rows[1]["errors"]
    )


def test_casino_offers_v1_maps_reference_values_and_excludes_helpers() -> None:
    case = casino_offer_fixture("CI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Casino Offers",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="casino-offers-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["offer_name"] == "Demo wager offer"
    assert staged[0]["mapped_fields"]["calc_net_pnl"] == "-2.50"
    assert "NetPnL" not in staged[0]["mapped_fields"]
    assert "WeekLabel" not in staged[0]["mapped_fields"]


def test_casino_offers_v1_defaults_blank_settling_date_to_start_date() -> None:
    case = casino_offer_fixture("CI-002")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Casino Offers",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="casino-offers-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["date_settling"] == fields["DateStarted"]


def test_casino_final_value_requires_auditable_user_notes() -> None:
    case = casino_offer_fixture("CI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)
    unsafe_fields = {**fields, "FinalNetPnL": "4.50", "UserNotes": ""}

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Casino Offers",
                source_record_id="DEMO-CO-UNEXPLAINED-FINAL",
                fields=unsafe_fields,
            )
        ],
        mapping_version="casino-offers-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "blocked"
    assert any(item["code"] == "override_reason_required" for item in staged[0]["errors"])


def test_cash_adjustments_v1_maps_entered_fields_and_excludes_helpers() -> None:
    case = cash_adjustment_fixture("CAI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Cash Adjustments",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="cash-adjustments-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["affects_investment"] is True
    assert staged[0]["mapped_fields"]["affects_cash_snapshot"] is True
    assert "SignedAmount" not in staged[0]["mapped_fields"]
    assert "WeekLabel" not in staged[0]["mapped_fields"]


def test_cash_adjustments_v1_blocks_impossible_direction_type_pair() -> None:
    case = cash_adjustment_fixture("CAI-003")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Cash Adjustments",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="cash-adjustments-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "blocked"
    assert any(
        item["code"] == "invalid_cash_adjustment_payload"
        for item in staged[0]["errors"]
    )


def test_accounts_v1_maps_catalogue_authority_and_preserves_money() -> None:
    case = account_fixture("AI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)

    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Accounts",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="accounts-v1",
        source_lookup=no_existing_source,
    )

    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["current_balance"] == "125.40"
    assert staged[0]["mapped_fields"]["pending_withdrawal_amount"] == "10.00"
    assert "last_promo_used" not in staged[0]["mapped_fields"]


def test_accounts_v1_blocks_invalid_money_and_unknown_authority() -> None:
    for case_id, expected_code in (
        ("AI-005", "invalid_account_money"),
        ("AI-006", "account_catalogue_match_required"),
    ):
        case = account_fixture(case_id)
        fields = case["fields"]
        assert isinstance(fields, dict)
        staged = stage_import_rows(
            profile_id="PROFILE-001",
            rows=[
                ImportRowPayload(
                    sheet="Accounts",
                    source_record_id=str(case["source_record_id"]),
                    fields=fields,
                )
            ],
            mapping_version="accounts-v1",
            source_lookup=no_existing_source,
        )
        assert staged[0]["staged_action"] == "blocked"
        assert any(item["code"] == expected_code for item in staged[0]["errors"])


def test_accounts_v1_preserves_blank_balance_without_zero_coercion() -> None:
    case = account_fixture("AI-011")
    fields = case["fields"]
    assert isinstance(fields, dict)
    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Accounts",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="accounts-v1",
        source_lookup=no_existing_source,
    )
    assert staged[0]["staged_action"] == "insert"
    assert staged[0]["mapped_fields"]["current_balance"] == ""


def test_accounts_v1_allows_archived_historical_authority_with_warning() -> None:
    case = account_fixture("AI-012")
    fields = case["fields"]
    assert isinstance(fields, dict)
    staged = stage_import_rows(
        profile_id="PROFILE-001",
        rows=[
            ImportRowPayload(
                sheet="Accounts",
                source_record_id=str(case["source_record_id"]),
                fields=fields,
            )
        ],
        mapping_version="accounts-v1",
        source_lookup=no_existing_source,
    )
    assert staged[0]["staged_action"] == "insert"
    assert any(
        item["code"] == "account_catalogue_entry_archived"
        for item in staged[0]["warnings"]
    )


def test_confirmed_sportsbook_import_requires_backup_and_preserves_lineage(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"
    case = sportsbook_fixture("SI-001")
    fields = case["fields"]
    assert isinstance(fields, dict)

    dry_run = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "synthetic-sportsbook.json",
            "mapping_version": "sportsbook-v1",
            "rows": [
                {
                    "sheet": "Sportsbook Bets",
                    "source_record_id": case["source_record_id"],
                    "source_row": 2,
                    "fields": fields,
                }
            ],
        },
    )
    assert dry_run.status_code == 201
    staged_batch = dry_run.json()
    assert staged_batch["status"] == "dry_run_ready"
    assert staged_batch["rows"][0]["mapped_fields"]["event_name"] == fields["EventName"]

    confirmation = client.post(
        f"/profiles/{profile_id}/imports/{staged_batch['import_batch_id']}/confirm-sportsbook",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [
                staged_batch["rows"][0]["import_staged_row_id"]
            ],
        },
    )
    assert confirmation.status_code == 200
    confirmed = confirmation.json()
    assert confirmed["status"] == "confirmed"
    assert Path(confirmed["backup_storage_path"]).exists()
    assert confirmed["backup_snapshot_id"]
    assert len(confirmed["backup_checksum_sha256"]) == 64

    imported_id = confirmed["imported_sportsbook_bet_ids"][0]
    imported = client.get(f"/profiles/{profile_id}/sportsbook-bets/{imported_id}")
    assert imported.status_code == 200
    assert imported.json()["event_name"] == fields["EventName"]
    assert imported.json()["profile_id"] == profile_id

    stored_batch = client.get(
        f"/profiles/{profile_id}/imports/{staged_batch['import_batch_id']}"
    ).json()
    assert stored_batch["status"] == "confirmed"
    assert stored_batch["backup_snapshot_id"] == confirmed["backup_snapshot_id"]

    repeated = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "synthetic-sportsbook-repeat.json",
            "mapping_version": "sportsbook-v1",
            "rows": [
                {
                    "sheet": "Sportsbook Bets",
                    "source_record_id": case["source_record_id"],
                    "source_row": 2,
                    "fields": fields,
                }
            ],
        },
    )
    assert repeated.status_code == 201
    assert repeated.json()["summary"] == {"no_op": 1}

    second_confirmation = client.post(
        f"/profiles/{profile_id}/imports/{staged_batch['import_batch_id']}/confirm-sportsbook",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [
                staged_batch["rows"][0]["import_staged_row_id"]
            ],
        },
    )
    assert second_confirmation.status_code == 409


def test_unconfirmed_batch_can_be_deleted_but_confirmed_audit_cannot(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"
    case = sportsbook_fixture("SI-001")

    dry_run = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "synthetic-delete-review.json",
            "mapping_version": "sportsbook-v1",
            "rows": [
                {
                    "sheet": "Sportsbook Bets",
                    "source_record_id": "DEMO-DELETE-001",
                    "source_row": 2,
                    "fields": case["fields"],
                }
            ],
        },
    ).json()
    batch_path = f"/profiles/{profile_id}/imports/{dry_run['import_batch_id']}"
    assert client.delete(batch_path).status_code == 204
    assert client.get(batch_path).status_code == 404

    confirmed_batch = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "synthetic-confirmed-audit.json",
            "mapping_version": "sportsbook-v1",
            "rows": [
                {
                    "sheet": "Sportsbook Bets",
                    "source_record_id": "DEMO-DELETE-002",
                    "source_row": 2,
                    "fields": case["fields"],
                }
            ],
        },
    ).json()
    confirmed_path = (
        f"/profiles/{profile_id}/imports/{confirmed_batch['import_batch_id']}"
    )
    confirmation = client.post(
        f"{confirmed_path}/confirm-sportsbook",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [
                confirmed_batch["rows"][0]["import_staged_row_id"]
            ],
        },
    )
    assert confirmation.status_code == 200
    assert client.delete(confirmed_path).status_code == 409


def test_confirmation_records_imported_and_operator_skipped_rows(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"
    case = sportsbook_fixture("SI-001")
    batch = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "synthetic-selection.json",
            "mapping_version": "sportsbook-v1",
            "rows": [
                {
                    "sheet": "Sportsbook Bets",
                    "source_record_id": f"DEMO-SELECTION-{index}",
                    "source_row": index + 1,
                    "fields": case["fields"],
                }
                for index in (1, 2)
            ],
        },
    ).json()

    response = client.post(
        f"/profiles/{profile_id}/imports/{batch['import_batch_id']}/confirm-sportsbook",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [batch["rows"][0]["import_staged_row_id"]],
        },
    )

    assert response.status_code == 200
    assert len(response.json()["imported_sportsbook_bet_ids"]) == 1
    stored = client.get(
        f"/profiles/{profile_id}/imports/{batch['import_batch_id']}"
    ).json()
    assert stored["summary"] == {"imported": 1, "skipped_by_operator": 1}
    assert {row["staged_action"] for row in stored["rows"]} == {
        "imported",
        "skipped_by_operator",
    }
