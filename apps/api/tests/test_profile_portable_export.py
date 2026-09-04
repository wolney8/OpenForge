from __future__ import annotations

import hashlib
import json
import sqlite3
from collections.abc import Iterator
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import connect, create_casino_offer, create_free_bet, create_sportsbook_bet
from openforge_api.main import app
from openforge_api.profile_portable_export import (
    EXPORT_FORMAT_VERSION,
    build_profile_portable_export,
)

SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RELATIONSHIP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


@pytest.fixture(autouse=True)
def restore_runtime_settings() -> Iterator[None]:
    original = {
        "database_mode": settings.database_mode,
        "database_url": settings.database_url,
        "account_catalogue_source": settings.account_catalogue_source,
        "auth_required": settings.auth_required,
    }
    yield
    for name, value in original.items():
        setattr(settings, name, value)


def configure_database(tmp_path: Path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'portable-export.sqlite3'}"
    settings.account_catalogue_source = str(tmp_path / "synthetic-account-catalogue.json")
    settings.auth_required = False
    Path(settings.account_catalogue_source).write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic portable export catalogue",
                "updated_at": "2026-09-04",
                "default_operating_context": {
                    "jurisdiction": "GB",
                    "subdivision": "",
                    "channels": ["web"],
                },
                "records": [
                    {
                        "catalogue_id": "BOOKMAKER-SYNTHETIC-001",
                        "account_type": "Bookmaker",
                        "operating_jurisdictions": ["GB"],
                        "operating_subdivisions": [],
                        "operating_channels": ["web"],
                        "brand_name": "Bookmaker A",
                        "short_display_name": "Bookmaker A",
                        "foreground_colour": "#FFFFFF",
                        "background_colour": "#455A64",
                        "source": "Synthetic fixture",
                    }
                ],
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )


def seed_representative_profile() -> None:
    timestamp = "2026-09-04T09:30:00+00:00"
    with connect() as connection:
        connection.execute(
            "INSERT INTO profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "profile-portable-test",
                "Synthetic Profile",
                "SYNTHETIC-001",
                "Active",
                "2026-01-01",
                "25.0000",
                "12.5000",
                "1234567890.1234",
            ),
        )
        connection.execute(
            "INSERT INTO profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "profile-unrelated",
                "Unrelated Profile",
                "UNRELATED-001",
                "Active",
                "2026-01-01",
                "1",
                "1",
                "999.99",
            ),
        )
        connection.execute(
            "INSERT INTO profile_onboarding_settings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "profile-portable-test",
                3,
                "0.00",
                "BOOKMAKER-SYNTHETIC-001",
                '["Sportsbook","Extra Places"]',
                '{"z":0,"a":""}',
                "complete",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO profile_bookmaker_display_settings VALUES (?, ?, ?, ?)",
            ("profile-portable-test", "Inherit", timestamp, timestamp),
        )
        connection.execute(
            "INSERT INTO profile_exchange_commissions VALUES (?, ?, ?, ?, ?)",
            ("profile-portable-test", "Exchange A", "0.0200", timestamp, timestamp),
        )
        account_rows = [
            (
                "ACCOUNT-Z",
                "profile-portable-test",
                None,
                None,
                "Bookmaker Z",
                "Bookie",
                0,
                "web",
                "Closed",
                "Closed",
                "Unknown",
                "[]",
                "0",
                "0",
                timestamp,
                "Synthetic Group",
                "Synthetic Platform",
                "",
                "",
                timestamp,
                timestamp,
            ),
            (
                "ACCOUNT-A",
                "profile-portable-test",
                "BOOKMAKER-SYNTHETIC-001",
                None,
                "Bookmaker A",
                "Bookie",
                1,
                "web",
                "Bonus Restricted",
                "Active",
                "Eligible",
                '["Stake Restricted","Bonus Restricted"]',
                "10.2300",
                "0.00",
                timestamp,
                "Synthetic Group",
                "Synthetic Platform",
                "2026-01-02",
                "",
                timestamp,
                timestamp,
            ),
            (
                "ACCOUNT-OTHER",
                "profile-unrelated",
                None,
                None,
                "Unrelated Bookmaker",
                "Bookie",
                1,
                "web",
                "Active",
                "Active",
                "Unknown",
                "[]",
                "999",
                "0",
                timestamp,
                "Other",
                "Other",
                "",
                "must not export",
                timestamp,
                timestamp,
            ),
        ]
        connection.executemany(
            "INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            account_rows,
        )
        connection.execute(
            "INSERT INTO balance_snapshots VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "SNAPSHOT-001",
                "profile-portable-test",
                timestamp,
                "Manual",
                None,
                "0.00",
                "",
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO cash_adjustments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "ADJUSTMENT-001",
                "profile-portable-test",
                "2026-09-01",
                "Out",
                "12.3400",
                "Fee Withdrawal",
                0,
                1,
                "Bank A",
                "Synthetic fee payment",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO each_way_extra_places VALUES ("
            + ",".join("?" for _ in range(32))
            + ")",
            (
                "EXTRA-001",
                "profile-portable-test",
                "2026-08-20T15:10:00+00:00",
                "Synthetic Runner",
                "Synthetic Race",
                "Bookmaker A",
                "Bookmaker A",
                "historical_import",
                "5.00",
                "10.0",
                "1",
                "5",
                "",
                "",
                "",
                "",
                "0",
                "",
                "",
                "",
                "0",
                "",
                "Settled",
                "Lost",
                "",
                "-8.60",
                "historical_imported_pnl",
                "IMPORT-RUN-001",
                "SOURCE-EP-001",
                "",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO fee_periods VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "FEE-PERIOD-001",
                "profile-portable-test",
                "2026-08-01",
                "2026-08-31",
                "Crystallised",
                1,
                timestamp,
                "fund-manager@example.invalid",
                None,
                None,
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO fee_period_revisions VALUES ("
            + ",".join("?" for _ in range(21))
            + ")",
            (
                "FEE-REVISION-001",
                "profile-portable-test",
                "FEE-PERIOD-001",
                1,
                "monthly-settled-final-v1",
                "monthly-settled-final-v1",
                '{"sportsbook":"100.00","cash":"-10.00"}',
                "90.00",
                "0.00",
                "0.00",
                "90.00",
                "25.0000",
                "12.5000",
                "22.5000",
                "11.2500",
                "33.7500",
                "",
                None,
                "Initial synthetic revision",
                "fund-manager@example.invalid",
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO fee_withdrawal_links VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "FEE-WITHDRAWAL-001",
                "profile-portable-test",
                "FEE-PERIOD-001",
                "FEE-REVISION-001",
                "ADJUSTMENT-001",
                "management",
                "12.3400",
                "fund-manager@example.invalid",
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO fee_corrections VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "FEE-CORRECTION-001",
                "profile-portable-test",
                "FEE-PERIOD-001",
                None,
                "credit",
                "1.2500",
                "Synthetic correction",
                "Pending",
                "fund-manager@example.invalid",
                timestamp,
                None,
            ),
        )
        connection.execute(
            "INSERT INTO fund_manager_combo_presets ("
            "preset_id, name, ledger_type, version, created_at, updated_at"
            ") VALUES (?, ?, ?, ?, ?, ?)",
            ("PRESET-001", "Synthetic Preset", "Sportsbook", 4, timestamp, timestamp),
        )
        connection.execute(
            "INSERT INTO profile_quick_add_loadout_overrides VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "profile-portable-test",
                "PRESET-001",
                1,
                "Bookmaker A",
                '{"z":2,"a":1}',
                "",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO multi_profile_opportunities ("
            "opportunity_id, actor_id, offer_text, bookmaker, offer_type, bet_type, "
            "offer_name, fixture_type, minimum_back_odds, default_back_stake, "
            "expected_settlement, reward_timing, state, created_at, updated_at"
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "OPPORTUNITY-001",
                "synthetic-actor",
                "Synthetic offer",
                "Bookmaker A",
                "Signup",
                "Qualifying Bet",
                "Synthetic Offer",
                "Football",
                "2.0",
                "10.00",
                "2026-09-10",
                "After settlement",
                "Active",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO multi_profile_opportunity_targets VALUES "
            "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "TARGET-001",
                "OPPORTUNITY-001",
                "profile-portable-test",
                "Bookmaker A",
                "Eligible",
                "[]",
                "[]",
                "Prospecting",
                None,
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO import_batches ("
            "import_batch_id, profile_id, source_filename, source_type, mapping_version, status, "
            "row_count, error_count, warning_count, summary_json, started_at, completed_at"
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "BATCH-001",
                "profile-portable-test",
                "synthetic-workbook.xlsx",
                "xlsx",
                "founder-snapshot-v8",
                "confirmed",
                1,
                0,
                0,
                '{"imported":1}',
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO import_source_records VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "Extra Places",
                "SOURCE-EP-001",
                "profile-portable-test",
                "source-fingerprint",
                "BATCH-001",
                "extra_place",
                "EXTRA-001",
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO profile_import_runs ("
            "import_run_id, profile_id, owner_email, source_filename, workbook_checksum, "
            "workbook_size_bytes, effective_at, mapping_version, status, summary_json, "
            "reconciliation_json, raw_workbook_retained, approved_at, import_started_at, "
            "completed_at, created_at, updated_at"
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "IMPORT-RUN-001",
                "profile-portable-test",
                "fund-manager@example.invalid",
                "synthetic-workbook.xlsx",
                "workbook-checksum",
                1024,
                timestamp,
                "founder-snapshot-v8",
                "COMPLETE",
                '{"rows":747}',
                '{"financial":{"status":"PASS"}}',
                0,
                timestamp,
                timestamp,
                timestamp,
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO profile_import_review_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "IMPORT-RUN-001",
                "REVIEW-001",
                "profile-portable-test",
                "SOURCE-001",
                "source-fingerprint",
                "Accounts",
                2,
                "ACCOUNT-A",
                "provider_alias",
                '{"provider":"Bookmaker A"}',
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO profile_import_review_decisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "IMPORT-RUN-001",
                "REVIEW-001",
                "profile-portable-test",
                "workbook-checksum",
                "founder-snapshot-v8",
                "source-fingerprint",
                '{"z":"last","a":"first"}',
                "fund-manager@example.invalid",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            "INSERT INTO profile_import_attempts ("
            "execution_id, import_run_id, profile_id, actor_email, attempt_number, status, "
            "stage, reconciliation_json, started_at, updated_at, completed_at"
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "EXECUTION-001",
                "IMPORT-RUN-001",
                "profile-portable-test",
                "fund-manager@example.invalid",
                1,
                "COMPLETE",
                "Complete",
                '{"operational":{"status":"PASS"},"financial":{"status":"PASS"}}',
                timestamp,
                timestamp,
                timestamp,
            ),
        )

    create_sportsbook_bet(
        "profile-portable-test",
        {
            "sportsbook_bet_id": "SPORTSBOOK-001",
            "event_name": "Synthetic Event",
            "offer_text": "Synthetic qualifying offer",
            "bookmaker": "Bookmaker A",
            "offer_type": "Signup",
            "status": "Settled",
            "result": "Won",
            "back_stake": "10.0000",
            "back_odds": "2.50",
            "source_combo_preset_id": "PRESET-001",
            "source_combo_preset_version": 4,
            "match_strategy": "Standard",
            "lay_odds_1": "2.60",
            "lay_actual": "9.6000",
            "lay_matched_stake_1": "9.6000",
            "exchange_name": "Exchange A",
            "date_settled": "2026-09-02",
            "user_notes": "",
            "manual_override_value": "",
            "manual_override_reason": "",
        },
    )
    create_free_bet(
        "profile-portable-test",
        {
            "free_bet_id": "FREE-BET-001",
            "event_name": "Synthetic Void Event",
            "offer_text": "Synthetic free bet",
            "bookmaker": "Bookmaker A",
            "status": "Void",
            "result": "Void",
            "retention_mode": "SNR",
            "free_bet_value": "10.00",
            "back_odds": "10.0",
            "match_strategy": "Standard",
            "lay_odds_1": "11.0",
            "lay_actual": "8.18",
            "lay_matched_stake_1": "8.18",
            "exchange_name": "Exchange A",
            "expiry_datetime": "2026-08-20T15:10:00+00:00",
            "date_settled": "2026-08-20",
            "user_notes": "Historical Void",
            "manual_override_value": "",
            "manual_override_reason": "",
        },
    )
    create_casino_offer(
        "profile-portable-test",
        {
            "casino_offer_id": "CASINO-001",
            "offer_group_id": "CASINO-GROUP-001",
            "date_started": "2026-09-01",
            "date_settling": "2026-09-03",
            "expiry_datetime": "2026-09-10T12:00:00+00:00",
            "bookmaker": "Bookmaker A",
            "offer_type": "Deposit Bonus",
            "offer_name": "Synthetic Casino Offer",
            "game": "Synthetic Game",
            "cash_stake": "20.00",
            "credit_amount": "0.00",
            "bonus_amount": "10.00",
            "wager_multiplier": "1",
            "wager_target": "10.00",
            "required_spins": "10",
            "spin_stake": "1.00",
            "free_spins_awarded": "0",
            "free_spins_value": "0.00",
            "status": "Settled",
            "result": "Complete",
            "calc_net_pnl": "4.1250",
            "final_net_pnl": "4.1250",
            "user_notes": "",
        },
    )


def workbook_rows(content: bytes, sheet_name: str) -> list[dict[str, str]]:
    with ZipFile(BytesIO(content)) as workbook:
        root = ET.fromstring(workbook.read("xl/workbook.xml"))
        sheets = root.find(f"{{{SPREADSHEET_NS}}}sheets")
        assert sheets is not None
        sheet_names = [sheet.attrib["name"] for sheet in sheets]
        index = sheet_names.index(sheet_name) + 1
        worksheet = ET.fromstring(workbook.read(f"xl/worksheets/sheet{index}.xml"))
    parsed_rows: list[list[str]] = []
    for row in worksheet.findall(f".//{{{SPREADSHEET_NS}}}row"):
        parsed_rows.append(
            [
                "".join(node.text or "" for node in cell.findall(f".//{{{SPREADSHEET_NS}}}t"))
                for cell in row.findall(f"{{{SPREADSHEET_NS}}}c")
            ]
        )
    headers = parsed_rows[0]
    return [dict(zip(headers, values, strict=True)) for values in parsed_rows[1:]]


def database_dump() -> str:
    connection = sqlite3.connect(settings.database_path)
    try:
        return "\n".join(connection.iterdump())
    finally:
        connection.close()


def canonical_checksum(sheet_name: str, rows: list[dict[str, str]]) -> str:
    columns = list(rows[0]) if rows else []
    payload = json.dumps(
        {"columns": columns, "rows": rows, "sheet": sheet_name},
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def test_portable_export_requires_fund_manager_session(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    seed_representative_profile()

    response = TestClient(app).get(
        "/profiles/profile-portable-test/exports/portable-profile.xlsx"
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Access unavailable"}

    monkeypatch.setattr(
        "openforge_api.profile_portable_export.require_request_session",
        lambda _request: SimpleNamespace(role="subscriber"),
    )
    forbidden = TestClient(app).get(
        "/profiles/profile-portable-test/exports/portable-profile.xlsx"
    )
    assert forbidden.status_code == 403
    assert forbidden.json() == {"detail": "Fund Manager access is required"}


def test_representative_portable_export_is_profile_scoped_and_read_only(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    configure_database(tmp_path)
    seed_representative_profile()
    monkeypatch.setattr(
        "openforge_api.profile_portable_export.require_request_session",
        lambda _request: SimpleNamespace(role="fund_manager"),
    )
    before_database = database_dump()
    before_catalogue = Path(settings.account_catalogue_source).read_bytes()

    response = TestClient(app).get(
        "/profiles/profile-portable-test/exports/portable-profile.xlsx"
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert response.headers["x-export-format-version"] == EXPORT_FORMAT_VERSION
    assert response.headers["x-export-byte-checksum"] == hashlib.sha256(
        response.content
    ).hexdigest()
    assert response.headers["cache-control"] == "no-store"
    assert before_database == database_dump()
    assert before_catalogue == Path(settings.account_catalogue_source).read_bytes()

    profile_rows = workbook_rows(response.content, "Profile")
    assert [row["profile_id"] for row in profile_rows] == ["profile-portable-test"]
    assert profile_rows[0]["current_cash_snapshot"] == "1234567890.1234"
    account_ids = [row["account_id"] for row in workbook_rows(response.content, "Accounts")]
    assert account_ids == ["ACCOUNT-A", "ACCOUNT-Z"]
    with ZipFile(BytesIO(response.content)) as workbook:
        worksheet_names = [
            name for name in workbook.namelist() if name.startswith("xl/worksheets/")
        ]
        assert all(b"<f" not in workbook.read(name) for name in worksheet_names)


def test_portable_export_preserves_values_ordering_and_reference_only_authorities(
    tmp_path: Path,
) -> None:
    configure_database(tmp_path)
    seed_representative_profile()

    export = build_profile_portable_export(
        "profile-portable-test", exported_at="2026-09-04T10:00:00Z"
    )

    manifest = {row["field"]: row for row in workbook_rows(export.content, "Manifest")}
    assert manifest["export_format_version"]["value"] == EXPORT_FORMAT_VERSION
    assert manifest["data_management_mode"]["value"] == ""
    assert manifest["data_management_mode"]["null_fields_json"] == '["value"]'
    assert manifest["file_byte_checksum"]["value"] == ""
    assert manifest["aggregate_logical_checksum"]["value"] == export.logical_checksum

    accounts = workbook_rows(export.content, "Accounts")
    assert [row["account_id"] for row in accounts] == ["ACCOUNT-A", "ACCOUNT-Z"]
    assert accounts[0]["lifecycle_status"] == "Active"
    assert accounts[0]["status"] == "Bonus Restricted"
    assert accounts[0]["restrictions_json"] == '["Stake Restricted","Bonus Restricted"]'
    assert accounts[0]["current_balance"] == "10.2300"
    assert accounts[0]["pending_withdrawal_amount"] == "0.00"
    assert accounts[0]["catalogue_reference_version"] == "1.0"
    assert len(accounts[0]["catalogue_reference_fingerprint"]) == 64
    assert "brand_name" not in accounts[0]
    assert accounts[1]["catalogue_id"] == ""
    account_z_nulls = json.loads(accounts[1]["null_fields_json"])
    assert account_z_nulls == [
        "catalogue_id",
        "catalogue_reference_fingerprint",
        "catalogue_reference_version",
    ]

    balance = workbook_rows(export.content, "Balance Snapshots")[0]
    assert balance["account_id"] == ""
    assert "account_id" in json.loads(balance["null_fields_json"])
    assert balance["notes"] == ""
    assert "notes" not in json.loads(balance["null_fields_json"])
    assert balance["balance_amount"] == "0.00"
    assert balance["snapshot_at"] == "2026-09-04T09:30:00Z"

    extra_place = workbook_rows(export.content, "Extra Places")[0]
    assert extra_place["mode"] == "historical_import"
    assert extra_place["imported_historical_pnl"] == "-8.60"
    assert extra_place["source_import_id"] == "SOURCE-EP-001"
    assert extra_place["placed_at"] == "2026-08-20T15:10:00Z"

    fee_revision = workbook_rows(export.content, "Fee Revisions")[0]
    assert fee_revision["total_fee_due"] == "33.7500"
    assert fee_revision["fee_package_version"] == ""
    assert "fee_package_version" in json.loads(fee_revision["null_fields_json"])
    assert fee_revision["fee_base_breakdown_json"] == (
        '{"cash":"-10.00","sportsbook":"100.00"}'
    )
    assert workbook_rows(export.content, "Cash Adjustments")[0]["amount"] == "12.3400"
    assert workbook_rows(export.content, "Fee Corrections")[0]["amount"] == "1.2500"
    assert workbook_rows(export.content, "Fee Withdrawals")[0]["amount"] == "12.3400"

    sportsbook = workbook_rows(export.content, "Sportsbook")[0]
    assert sportsbook["sportsbook_bet_id"] == "SPORTSBOOK-001"
    assert sportsbook["back_stake"] == "10.0000"
    assert sportsbook["preset_reference_version"] == "4"
    free_bet = workbook_rows(export.content, "Free Bets")[0]
    assert free_bet["status"] == "Void"
    assert free_bet["result"] == "Void"
    assert free_bet["manual_override_value"] == ""
    casino = workbook_rows(export.content, "Casino")[0]
    assert casino["final_net_pnl"] == "4.1250"

    loadout = workbook_rows(export.content, "Loadout Overrides")[0]
    assert loadout["defaults_json"] == '{"a":1,"z":2}'
    assert loadout["preset_reference_version"] == "4"
    assert len(loadout["preset_reference_fingerprint"]) == 64
    opportunity = workbook_rows(export.content, "Opportunity Links")[0]
    assert opportunity["opportunity_id"] == "OPPORTUNITY-001"
    assert len(opportunity["opportunity_reference_fingerprint"]) == 64
    assert "offer_text" not in opportunity


def test_sheet_and_aggregate_checksums_are_stable_for_unchanged_profile(tmp_path: Path) -> None:
    configure_database(tmp_path)
    seed_representative_profile()

    first = build_profile_portable_export(
        "profile-portable-test", exported_at="2026-09-04T10:00:00Z"
    )
    second = build_profile_portable_export(
        "profile-portable-test", exported_at="2026-09-04T11:00:00Z"
    )

    assert first.logical_checksum == second.logical_checksum
    assert first.sheet_manifest_checksum == second.sheet_manifest_checksum
    assert first.byte_checksum != second.byte_checksum
    first_sheets = workbook_rows(first.content, "Sheet Manifest")
    second_sheets = workbook_rows(second.content, "Sheet Manifest")
    assert first_sheets == second_sheets
    assert len(first_sheets) == 25
    assert all(len(row["logical_checksum"]) == 64 for row in first_sheets)
    assert {row["sheet_name"] for row in first_sheets} >= {
        "Accounts",
        "Extra Places",
        "Fee Revisions",
        "Review Decisions",
        "Reconciliation",
    }
    accounts = workbook_rows(first.content, "Accounts")
    accounts_manifest = next(row for row in first_sheets if row["sheet_name"] == "Accounts")
    assert accounts_manifest["logical_checksum"] == canonical_checksum("Accounts", accounts)
    aggregate_payload = [
        {
            "authority_role": row["authority_role"],
            "logical_checksum": row["logical_checksum"],
            "row_count": row["row_count"],
            "sheet_name": row["sheet_name"],
        }
        for row in first_sheets
    ]
    expected_aggregate = hashlib.sha256(
        json.dumps(
            aggregate_payload,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    assert expected_aggregate == first.logical_checksum
    assert workbook_rows(first.content, "Review Decisions")[0]["decision_json"] == (
        '{"a":"first","z":"last"}'
    )
    reconciliation = workbook_rows(first.content, "Reconciliation")[0]
    assert reconciliation["financial_reconciliation_json"] == '{"status":"PASS"}'
    assert reconciliation["operational_reconciliation_json"] == '{"status":"PASS"}'
