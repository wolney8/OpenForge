from __future__ import annotations

import json
import sqlite3
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import (
    connect,
    create_account,
    create_cash_adjustment,
    create_casino_offer,
    create_free_bet,
    create_profile_with_onboarding,
    create_sportsbook_bet,
)
from openforge_api.main import app
from openforge_api.profile_portable_export import SHEET_SPECS
from openforge_api.workbook_template_export import (
    EXPORT_FORMAT_VERSION,
    OUTPUT_CLASSIFICATION,
    WorkbookTemplateExportError,
    build_workbook_template_export,
)
from openforge_api.workbook_template_package import (
    MAIN_NS,
    WorkbookTemplatePackageError,
    _cell_value,
    _shared_strings,
    _sheet_paths,
    _table_map,
    build_workbook_template_package,
    parse_range,
)

ROOT = Path(__file__).resolve().parents[3]
PRIVATE_TEMPLATE = ROOT / "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx"
PRIVATE_HELPER = ROOT / "_input/MB Helpers.gs"
STRUCTURE = ROOT / "docs/contracts/workbook-template-export-v1-ledger-structure.json"
COVERAGE = ROOT / "docs/contracts/workbook-template-export-v1-field-coverage.json"
PROFILE_ID = "profile-working-export-test"
TIMESTAMP = "2026-09-05T09:30:00+00:00"

pytestmark = pytest.mark.skipif(
    not PRIVATE_TEMPLATE.exists() or not PRIVATE_HELPER.exists(),
    reason="authoritative private workbook application is not available",
)


@pytest.fixture(autouse=True)
def restore_runtime_settings() -> Any:
    original = {
        "database_mode": settings.database_mode,
        "database_url": settings.database_url,
        "account_catalogue_source": settings.account_catalogue_source,
        "auth_required": settings.auth_required,
        "workbook_template_source": settings.workbook_template_source,
        "workbook_template_helper_source": settings.workbook_template_helper_source,
        "workbook_template_structure_manifest": settings.workbook_template_structure_manifest,
        "workbook_template_field_coverage": settings.workbook_template_field_coverage,
    }
    yield
    for name, value in original.items():
        setattr(settings, name, value)


def _configure(tmp_path: Path) -> None:
    settings.database_mode = "local"
    settings.database_url = f"sqlite:///{tmp_path / 'working-export.sqlite3'}"
    settings.account_catalogue_source = str(tmp_path / "synthetic-catalogue.json")
    settings.auth_required = False
    settings.workbook_template_source = str(PRIVATE_TEMPLATE)
    settings.workbook_template_helper_source = str(PRIVATE_HELPER)
    settings.workbook_template_structure_manifest = str(STRUCTURE)
    settings.workbook_template_field_coverage = str(COVERAGE)
    Path(settings.account_catalogue_source).write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic working export catalogue",
                "updated_at": "2026-09-05",
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
                        "risk_team": "Synthetic Risk Team",
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


def _seed_profile(*, include_rows: bool = True) -> None:
    create_profile_with_onboarding(
        {
            "profile_id": PROFILE_ID,
            "display_name": "Synthetic Working Profile",
            "profile_code": "SYNTHETIC-WORKING-001",
            "tracking_start_date": "2026-01-02",
            "current_cash_snapshot": "100.0000",
            "iteration_number": 3,
            "starting_bankroll": "100.0000",
            "main_bank_catalogue_id": "BOOKMAKER-SYNTHETIC-001",
            "enabled_modules": ["Sportsbook", "Free Bets", "Casino"],
            "accounts": [],
            "exchange_commissions": [{"exchange_name": "Exchange A", "commission_rate": "0.0200"}],
            "quick_actions": [],
        }
    )
    with connect() as connection:
        connection.execute(
            "UPDATE profile_tracker_settings SET active_date_preset = 'Week (Mon-Sun)', "
            "custom_start_date = '2026-09-01', custom_end_date = '2026-09-05', "
            "range_back_days = 7, range_forward_days = 2 WHERE profile_id = ?",
            (PROFILE_ID,),
        )
    if not include_rows:
        return

    create_account(
        PROFILE_ID,
        {
            "account_id": "account-runtime-001",
            "catalogue_id": "BOOKMAKER-SYNTHETIC-001",
            "account": "Bookmaker A",
            "type": "Bookie",
            "counts_in_cash_total": True,
            "channel": "web",
            "status": "Bonus Restricted",
            "lifecycle_status": "Active",
            "signup_offer_status": "Eligible",
            "restrictions_json": '["Bonus Restricted"]',
            "current_balance": "10.2300",
            "pending_withdrawal_amount": "0.0000",
            "last_balance_update": TIMESTAMP,
            "group_name": "Synthetic Group",
            "platform": "Synthetic Platform",
            "sign_up_date": "2026-01-03",
            "notes": "Synthetic account note",
        },
    )
    create_sportsbook_bet(
        PROFILE_ID,
        _sportsbook_payload("sportsbook-runtime-imported", "Imported synthetic event"),
    )
    create_sportsbook_bet(
        PROFILE_ID,
        _sportsbook_payload("sportsbook-runtime-native", "Native synthetic event"),
    )
    create_free_bet(
        PROFILE_ID,
        {
            "free_bet_id": "free-runtime-imported",
            "event_name": "Synthetic free bet event",
            "offer_text": "Synthetic free bet",
            "bookmaker": "Bookmaker A",
            "offer_type": "Free Bet",
            "bet_type": "SNR",
            "offer_name": "Synthetic offer",
            "fixture_type": "Football",
            "status": "Settled",
            "result": "Won",
            "retention_mode": "Standard",
            "free_bet_value": "10.0000",
            "back_odds": "5.0000",
            "match_strategy": "Standard",
            "lay_odds_1": "5.1000",
            "lay_actual": "7.8000",
            "lay_matched_stake_1": "7.8000",
            "exchange_name": "Exchange A",
            "expiry_datetime": "2026-09-06T12:00:00+00:00",
            "date_settled": "2026-09-05T10:00:00+00:00",
            "origin_qual_bet_id": "sportsbook-runtime-imported",
            "offer_group_id": "DEMO-GROUP-001",
            "user_notes": "Synthetic free bet note",
            "manual_override_value": "",
            "manual_override_reason": "",
        },
    )
    create_cash_adjustment(
        PROFILE_ID,
        {
            "cash_adjustment_id": "cash-runtime-native",
            "adjustment_date": "2026-09-04",
            "direction": "In",
            "amount": "12.3400",
            "adjustment_type": "Other",
            "affects_investment": False,
            "affects_cash_snapshot": True,
            "linked_account": "Bookmaker A",
            "description": "Synthetic adjustment",
        },
    )
    create_casino_offer(
        PROFILE_ID,
        {
            "casino_offer_id": "casino-runtime-native",
            "offer_group_id": "DEMO-GROUP-002",
            "date_started": "2026-09-01T09:00:00+00:00",
            "date_settling": "2026-09-05T09:00:00+00:00",
            "expiry_datetime": "2026-09-10T09:00:00+00:00",
            "bookmaker": "Bookmaker A",
            "offer_type": "Casino",
            "offer_name": "Synthetic casino offer",
            "game": "Synthetic game",
            "cash_stake": "10.0000",
            "credit_amount": "0.0000",
            "bonus_amount": "5.0000",
            "wager_multiplier": "1.0000",
            "wager_target": "5.0000",
            "required_spins": "5",
            "spin_stake": "1.0000",
            "free_spins_awarded": "5",
            "free_spins_value": "1.0000",
            "status": "Settled",
            "result": "Completed",
            "calc_net_pnl": "2.5000",
            "final_net_pnl": "2.5000",
            "user_notes": "Synthetic casino note",
        },
    )
    with connect() as connection:
        connection.execute(
            "INSERT INTO each_way_extra_places VALUES (" + ",".join("?" for _ in range(32)) + ")",
            (
                "extra-runtime-historical",
                PROFILE_ID,
                "2026-08-20T15:10:00+00:00",
                "Synthetic Runner",
                "Synthetic Race",
                "Bookmaker A",
                "Bookmaker A",
                "Extra Place",
                "5.0000",
                "10.0000",
                "",
                "",
                "",
                "",
                "Exchange A",
                "11.0000",
                "",
                "8.1800",
                "",
                "",
                "",
                "",
                "Settled",
                "Unplaced",
                "",
                "-8.6000",
                "imported_historical",
                "import-run-synthetic",
                "Sportsbook Bets:IT3-QB-0015:synthetic-fingerprint",
                "Synthetic historical migration evidence",
                TIMESTAMP,
                TIMESTAMP,
            ),
        )
        for index, row in enumerate(
            (
                {
                    "source_sheet": "Accounts",
                    "source_record_id": "IT3-AC-0007",
                    "entity_type": "account",
                    "entity_id": "account-runtime-001",
                },
                {
                    "source_sheet": "Sportsbook Bets",
                    "source_record_id": "IT3-QB-0009",
                    "entity_type": "sportsbook_bet",
                    "entity_id": "sportsbook-runtime-imported",
                },
                {
                    "source_sheet": "Free Bets",
                    "source_record_id": "IT3-FB-0004",
                    "entity_type": "free_bet",
                    "entity_id": "free-runtime-imported",
                },
            )
        ):
            connection.execute(
                "INSERT INTO profile_portable_restored_provenance "
                "(target_profile_id, sheet_name, row_key, row_json, sort_order, created_at) "
                "VALUES (?, 'Source Identities', ?, ?, ?, ?)",
                (PROFILE_ID, f"source-{index}", json.dumps(row), index, TIMESTAMP),
            )


def _sportsbook_payload(record_id: str, event_name: str) -> dict[str, Any]:
    return {
        "sportsbook_bet_id": record_id,
        "event_name": event_name,
        "offer_text": "Synthetic qualifying bet",
        "bookmaker": "Bookmaker A",
        "offer_type": "Signup",
        "bet_type": "Qualifying Bet",
        "offer_name": "Synthetic offer",
        "fixture_type": "Football",
        "market": "Match Odds",
        "status": "Settled",
        "result": "Won",
        "back_stake": "10.0000",
        "back_odds": "2.0000",
        "match_strategy": "Standard",
        "lay_odds_1": "2.1000",
        "lay_actual": "9.5000",
        "lay_matched_stake_1": "9.5000",
        "exchange_name": "Exchange A",
        "date_settled": "2026-09-05T09:00:00+00:00",
        "user_notes": "Synthetic sportsbook note",
        "manual_override_value": "",
        "manual_override_reason": "",
    }


def _database_profile_fingerprint() -> str:
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    payload: dict[str, list[dict[str, Any]]] = {}
    for row in connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).fetchall():
        table = str(row["name"])
        columns = [
            str(item["name"])
            for item in connection.execute(f'PRAGMA table_info("{table}")').fetchall()
        ]
        scope = "profile_id" if "profile_id" in columns else None
        if scope is None and "target_profile_id" in columns:
            scope = "target_profile_id"
        if scope is None:
            continue
        rows = connection.execute(
            f'SELECT * FROM "{table}" WHERE "{scope}" = ? ORDER BY rowid', (PROFILE_ID,)
        ).fetchall()
        payload[table] = [dict(item) for item in rows]
    connection.close()
    return sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _package(content: bytes) -> tuple[dict[str, bytes], dict[str, str], dict[str, Any]]:
    with ZipFile(BytesIO(content)) as archive:
        payload = {name: archive.read(name) for name in archive.namelist()}
    paths = _sheet_paths(payload)
    tables = _table_map(payload, paths)
    return payload, paths, tables


def _table_rows(
    payload: dict[str, bytes], paths: dict[str, str], tables: dict[str, Any], sheet: str
) -> list[dict[str, str | None]]:
    _, _, table = tables[sheet][0]
    start_column, start_row, end_column, end_row = parse_range(str(table.get("ref")))
    root = ET.fromstring(payload[paths[sheet]])
    strings = _shared_strings(payload)
    headers = [str(column.get("name")) for column in table.findall(f".//{{{MAIN_NS}}}tableColumn")]
    result: list[dict[str, str | None]] = []
    for row_number in range(start_row + 1, end_row + 1):
        output: dict[str, str | None] = {}
        for column_number, header in zip(range(start_column, end_column + 1), headers, strict=True):
            letters = ""
            current = column_number
            while current:
                current, remainder = divmod(current - 1, 26)
                letters = chr(65 + remainder) + letters
            cell = root.find(f".//{{{MAIN_NS}}}c[@r='{letters}{row_number}']")
            output[header] = _cell_value(cell, strings)
        result.append(output)
    return result


def _cell_at(
    payload: dict[str, bytes], paths: dict[str, str], sheet: str, reference: str
) -> str | None:
    root = ET.fromstring(payload[paths[sheet]])
    return _cell_value(
        root.find(f".//{{{MAIN_NS}}}c[@r='{reference}']"),
        _shared_strings(payload),
    )


def test_current_profile_export_is_deterministic_read_only_and_identity_safe(
    tmp_path: Path,
) -> None:
    _configure(tmp_path)
    _seed_profile()
    database_before = _database_profile_fingerprint()
    source_before = sha256(PRIVATE_TEMPLATE.read_bytes()).hexdigest()

    first = build_workbook_template_export(PROFILE_ID, exported_at="20260905T100000Z")
    second = build_workbook_template_export(PROFILE_ID, exported_at="20260905T100000Z")

    assert first.content == second.content
    assert first.logical_checksum == second.logical_checksum
    assert first.byte_checksum == sha256(first.content).hexdigest()
    assert first.classification == OUTPUT_CLASSIFICATION
    assert source_before == "7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a"
    assert sha256(PRIVATE_TEMPLATE.read_bytes()).hexdigest() == source_before
    assert _database_profile_fingerprint() == database_before

    payload, paths, tables = _package(first.content)
    accounts = _table_rows(payload, paths, tables, "Accounts")
    sportsbook = _table_rows(payload, paths, tables, "Sportsbook Bets")
    free_bets = _table_rows(payload, paths, tables, "Free Bets")
    assert accounts[0]["AccountID"] == "IT3-AC-0007"
    assert accounts[0]["Status"] == "Bonus Restricted"
    assert [row["QualBetID"] for row in sportsbook] == [
        "IT3-QB-0009",
        "IT3-QB-0015",
        "IT3-QB-0016",
    ]
    historical = sportsbook[1]
    assert historical["OfferType"] == "Extra Place"
    assert historical["FinalNetPnL"] == "-8.6000"
    assert sportsbook[0]["RelatedFreeBetID"] == "IT3-FB-0004"
    assert free_bets[0]["FreeBetID"] == "IT3-FB-0004"
    assert free_bets[0]["OriginQualBetID"] == "IT3-QB-0009"
    assert _cell_at(payload, paths, "Dashboard", "B4") == "Synthetic Working Profile"
    assert _cell_at(payload, paths, "Dashboard", "B7") == "3"
    assert _cell_at(payload, paths, "Settings", "H3") == "Exchange A"
    assert _cell_at(payload, paths, "Settings", "I3") == "0.0200"

    source_payload, source_paths, _ = _package(PRIVATE_TEMPLATE.read_bytes())
    former_profile_name = _cell_at(source_payload, source_paths, "Dashboard", "B4")
    assert former_profile_name
    former_profile_name_hash = sha256(former_profile_name.encode()).hexdigest()
    output_strings = _shared_strings(payload)
    output_value_hashes = {
        sha256(value.encode()).hexdigest()
        for path in paths.values()
        for cell in ET.fromstring(payload[path]).findall(f".//{{{MAIN_NS}}}c")
        if (value := _cell_value(cell, output_strings))
    }
    assert former_profile_name_hash not in output_value_hashes
    for name in payload:
        if (
            name.startswith("xl/drawings/")
            or "/_rels/" in name
            or name.startswith("_rels/")
            or name in {"xl/styles.xml", "xl/theme/theme1.xml"}
        ):
            assert payload[name] == source_payload[name]
    formula_cells = [
        cell
        for path in paths.values()
        for cell in ET.fromstring(payload[path]).findall(f".//{{{MAIN_NS}}}c")
        if cell.find(f"{{{MAIN_NS}}}f") is not None
    ]
    assert formula_cells
    assert all(cell.find(f"{{{MAIN_NS}}}v") is None for cell in formula_cells)
    assert payload["xl/persons/person.xml"] == source_payload["xl/persons/person.xml"]
    chart = ET.fromstring(payload["xl/charts/chart1.xml"])
    for cache in (
        node
        for node in chart.iter()
        if node.tag.rsplit("}", 1)[-1] in {"numCache", "strCache", "multiLvlStrCache"}
    ):
        assert not [child for child in cache if child.tag.rsplit("}", 1)[-1] == "pt"]


def test_empty_profile_removes_stale_operational_values_and_preserves_structure(
    tmp_path: Path,
) -> None:
    _configure(tmp_path)
    _seed_profile(include_rows=False)
    export = build_workbook_template_export(PROFILE_ID, exported_at="20260905T100000Z")
    payload, paths, tables = _package(export.content)

    for sheet in ("Accounts", "Cash Adjustments", "Sportsbook Bets", "Free Bets", "Casino Offers"):
        rows = _table_rows(payload, paths, tables, sheet)
        assert len(rows) == 1
        assert not any(value for value in rows[0].values())
    for sheet, table_name in (
        ("Reload Templates", "Reload_Templates"),
        ("SignupUsers", "Table1"),
        ("Profitability Audit", "Table2"),
    ):
        _, _, table = next(item for item in tables[sheet] if item[2].get("name") == table_name)
        start_column, start_row, end_column, end_row = parse_range(str(table.get("ref")))
        root = ET.fromstring(payload[paths[sheet]])
        for cell in root.findall(f".//{{{MAIN_NS}}}c"):
            column, row = _split_reference(str(cell.get("r")))
            if start_row < row <= end_row and start_column <= column <= end_column:
                assert _cell_value(cell, _shared_strings(payload)) in {None, ""}
                assert cell.find(f"{{{MAIN_NS}}}f") is None

    referenced: set[int] = set()
    for path in paths.values():
        for cell in ET.fromstring(payload[path]).findall(f".//{{{MAIN_NS}}}c[@t='s']"):
            value = cell.find(f"{{{MAIN_NS}}}v")
            if value is not None:
                referenced.add(int(str(value.text)))
    shared = ET.fromstring(payload["xl/sharedStrings.xml"])
    for index, item in enumerate(shared.findall(f"{{{MAIN_NS}}}si")):
        if index not in referenced:
            assert "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")) == ""


def _split_reference(reference: str) -> tuple[int, int]:
    letters = "".join(character for character in reference if character.isalpha())
    row = int("".join(character for character in reference if character.isdigit()))
    column = 0
    for character in letters:
        column = column * 26 + ord(character) - 64
    return column, row


def test_unrepresentable_native_extra_place_and_fee_state_fail_closed(tmp_path: Path) -> None:
    _configure(tmp_path)
    _seed_profile(include_rows=False)
    with connect() as connection:
        connection.execute(
            "INSERT INTO each_way_extra_places VALUES (" + ",".join("?" for _ in range(32)) + ")",
            (
                "extra-runtime-native",
                PROFILE_ID,
                TIMESTAMP,
                "Synthetic Runner",
                "Synthetic Race",
                "Bookmaker A",
                "Bookmaker A",
                "Each Way",
                "5",
                "10",
                "1",
                "5",
                "4",
                "5",
                "Exchange A",
                "11",
                "2",
                "4",
                "Exchange A",
                "6",
                "2",
                "8",
                "Placed",
                "Pending",
                "",
                "",
                "native",
                "",
                "",
                "",
                TIMESTAMP,
                TIMESTAMP,
            ),
        )
    with pytest.raises(WorkbookTemplateExportError, match="extra_place:extra-runtime-native"):
        build_workbook_template_export(PROFILE_ID)

    with connect() as connection:
        connection.execute("DELETE FROM each_way_extra_places WHERE profile_id = ?", (PROFILE_ID,))
        connection.execute(
            "INSERT INTO fee_periods "
            "(fee_period_id, profile_id, period_start, period_end, state, "
            "current_revision_number, created_at, updated_at) "
            "VALUES ('fee-period-synthetic', ?, '2026-09-01', '2026-09-30', "
            "'Open', 0, ?, ?)",
            (PROFILE_ID, TIMESTAMP, TIMESTAMP),
        )
    with pytest.raises(WorkbookTemplateExportError, match="fee_periods"):
        build_workbook_template_export(PROFILE_ID)


def test_unresolved_cross_record_link_fails_closed(tmp_path: Path) -> None:
    _configure(tmp_path)
    _seed_profile()
    with connect() as connection:
        connection.execute(
            "UPDATE free_bets SET origin_qual_bet_id = 'missing-sportsbook-runtime' "
            "WHERE profile_id = ?",
            (PROFILE_ID,),
        )
    with pytest.raises(WorkbookTemplateExportError, match="unresolved Sportsbook link"):
        build_workbook_template_export(PROFILE_ID)


def test_comment_parts_are_rejected_at_the_package_boundary() -> None:
    source = PRIVATE_TEMPLATE.read_bytes()
    with ZipFile(BytesIO(source)) as before:
        infos = before.infolist()
        payload = {info.filename: before.read(info.filename) for info in infos}
    payload["xl/comments1.xml"] = b"<comments/>"
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for info in infos:
            archive.writestr(info, payload[info.filename])
        archive.writestr("xl/comments1.xml", payload["xl/comments1.xml"])
    content = output.getvalue()
    structure = json.loads(STRUCTURE.read_text())
    coverage = json.loads(COVERAGE.read_text())
    coverage["source_template_sha256"] = sha256(content).hexdigest()
    with pytest.raises(WorkbookTemplatePackageError, match="comments"):
        build_workbook_template_package(
            source_content=content,
            structure=structure,
            coverage=coverage,
            ledger_rows={sheet: [] for sheet in structure["ledgers"]},
            control_values={},
            exchange_commissions=[],
        )


def test_production_package_growth_uses_exact_authorized_targets() -> None:
    structure = json.loads(STRUCTURE.read_text())
    coverage = json.loads(COVERAGE.read_text())
    source_payload, source_paths, source_tables = _package(PRIVATE_TEMPLATE.read_bytes())
    assert source_payload and source_paths
    ledger_rows: dict[str, list[dict[str, object]]] = {}
    for sheet, ledger in structure["ledgers"].items():
        _, _, source_table = next(
            item for item in source_tables[sheet] if item[2].get("name") == ledger["table_name"]
        )
        body_count = parse_range(str(source_table.get("ref")))[3] - 1 + 3
        encodings = {
            header: spec["encoding"]
            for header, spec in coverage["ledgers"][sheet]["columns"].items()
        }
        ledger_rows[sheet] = [
            {
                header: (
                    f"IT3-{ledger['id_prefix']}-{index + 1:04d}"
                    if header in ledger["id_system_headers"] and encoding == "text"
                    else _value_for_encoding(encoding)
                )
                for header, encoding in encodings.items()
            }
            for index in range(body_count)
        ]
    package = build_workbook_template_package(
        source_content=PRIVATE_TEMPLATE.read_bytes(),
        structure=structure,
        coverage=coverage,
        ledger_rows=ledger_rows,
        control_values={},
        exchange_commissions=[],
    )
    assert package.table_targets == {
        "Accounts": "A1:Q128",
        "Cash Adjustments": "A1:L28",
        "Sportsbook Bets": "A1:BC533",
        "Free Bets": "A1:AL174",
        "Casino Offers": "A1:AB28",
    }
    assert package.defined_name_targets == {
        "Z_61A693B0_24CC_4BA8_8C2E_3A2E24A5AB80_.wvu.FilterData|10": ("'Free Bets'!$A$1:$AL$174"),
        "Z_CDCB28B3_BC6B_441A_A81B_7CB94D17E405_.wvu.FilterData|9": (
            "'Sportsbook Bets'!$A$1:$BC$533"
        ),
        "Z_ED738785_E81B_4DF3_973A_0B4EB5925F38_.wvu.FilterData|10": ("'Free Bets'!$A$1:$AL$174"),
        "Z_FF6E07D2_D981_42E8_AB46_8FA8E5669783_.wvu.FilterData|7": ("Accounts!$A$1:$Q$128"),
        "_xlnm._FilterDatabase|10": "'Free Bets'!$A$1:$AL$174",
        "_xlnm._FilterDatabase|11": "'Casino Offers'!$A$1:$AB$28",
        "_xlnm._FilterDatabase|7": "Accounts!$A$1:$Q$128",
        "_xlnm._FilterDatabase|8": "'Cash Adjustments'!$A$1:$L$28",
        "_xlnm._FilterDatabase|9": "'Sportsbook Bets'!$A$1:$BC$533",
    }
    assert package.formula_cache_count == 0
    assert package.scrubbed_chart_cache_value_count == 0


def _value_for_encoding(encoding: str) -> object:
    base = encoding.removesuffix("_or_empty")
    if base == "text":
        return "Synthetic value"
    if base == "boolean":
        return True
    if base == "integer":
        return 1
    if base == "decimal":
        return "1.2500"
    if base == "date":
        return "2026-09-05"
    if base == "datetime":
        return TIMESTAMP
    raise AssertionError(f"Unknown test encoding: {encoding}")


def test_package_rejects_incomplete_projection_rows() -> None:
    structure = json.loads(STRUCTURE.read_text())
    coverage = json.loads(COVERAGE.read_text())
    with pytest.raises(WorkbookTemplatePackageError, match="Projection coverage mismatch"):
        build_workbook_template_package(
            source_content=PRIVATE_TEMPLATE.read_bytes(),
            structure=structure,
            coverage=coverage,
            ledger_rows={"Accounts": [{"AccountID": "IT3-AC-0001"}]},
            control_values={},
            exchange_commissions=[],
        )


def test_field_coverage_classifies_every_portable_profile_domain() -> None:
    coverage = json.loads(COVERAGE.read_text())
    expected = {spec.table for spec in SHEET_SPECS} | {
        "review_decisions",
        "reconciliation",
    }
    assert set(coverage["profile_domain_coverage"]) == expected


def test_export_endpoint_is_fund_manager_only_and_returns_verification_headers(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _configure(tmp_path)
    _seed_profile(include_rows=False)
    unauthenticated = TestClient(app).get(f"/profiles/{PROFILE_ID}/exports/working-workbook.xlsx")
    assert unauthenticated.status_code == 401

    monkeypatch.setattr(
        "openforge_api.workbook_template_export.require_request_session",
        lambda _request: SimpleNamespace(role="fund_manager"),
    )
    response = TestClient(app).get(f"/profiles/{PROFILE_ID}/exports/working-workbook.xlsx")
    assert response.status_code == 200
    assert response.headers["x-export-format-version"] == EXPORT_FORMAT_VERSION
    assert response.headers["x-export-classification"] == (
        "STRUCTURALLY_VALID_GOOGLE_RUNTIME_PENDING"
    )
    assert response.headers["cache-control"] == "no-store"

    monkeypatch.setattr(
        "openforge_api.workbook_template_export.require_request_session",
        lambda _request: SimpleNamespace(role="subscriber"),
    )
    forbidden = TestClient(app).get(f"/profiles/{PROFILE_ID}/exports/working-workbook.xlsx")
    assert forbidden.status_code == 403
