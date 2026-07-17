from __future__ import annotations

import base64
from datetime import datetime
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import (
    count_account_audit_rows,
    get_account,
    get_import_source_record,
    upsert_profile_exchange_commission,
)
from openforge_api.main import app
from openforge_api.xlsx_export import (
    build_account_export,
    build_cash_adjustment_export,
    build_casino_offer_export,
    build_free_bet_export,
    build_sportsbook_export,
)
from openforge_api.xlsx_import import (
    XlsxImportError,
    detect_supported_ledger_xlsx,
    parse_account_xlsx,
    parse_cash_adjustment_xlsx,
    parse_casino_offer_xlsx,
    parse_free_bet_xlsx,
    parse_sportsbook_xlsx,
)

HEADERS = (
    "QualBetID",
    "DateSettling",
    "EventName",
    "Bookmaker",
    "Status",
    "Result",
    "BackStake",
    "MatchStrategy",
    "BackOdds",
    "LayOdds1",
    "Exchange",
    "Lay (Actual)",
    "LayMatchedStake1",
    "OfferType",
)


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def build_synthetic_workbook(
    *, include_macro: bool = False, include_outside_table_row: bool = False
) -> bytes:
    output = BytesIO()
    excel_date = (
        datetime(2026, 7, 20, 18, 0, 0) - datetime(1899, 12, 30)
    ).total_seconds() / 86400
    workbook_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>
        <sheet name="Sportsbook Bets" sheetId="1" r:id="rId1"/>
        <sheet name="SignupUsers" sheetId="2" r:id="rId2"/>
      </sheets>
    </workbook>"""
    relationships_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Target="worksheets/sheet1.xml"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>
      <Relationship Id="rId2" Target="worksheets/missing-sensitive-sheet.xml"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>
    </Relationships>"""
    outside_table_row = """
        <row r="3">
          <c r="A3" t="inlineStr"><is><t>DEMO-QB-XLSX-OUTSIDE</t></is></c>
          <c r="B3" s="1"><v>46224.75</v></c>
          <c r="C3" t="inlineStr"><is><t>Synthetic row beyond table range</t></is></c>
          <c r="D3" t="inlineStr"><is><t>Bookmaker B</t></is></c>
          <c r="E3" t="inlineStr"><is><t>Prospecting</t></is></c>
          <c r="F3" t="inlineStr"><is><t>Pending</t></is></c>
          <c r="H3" t="inlineStr"><is><t>Standard</t></is></c>
        </row>
    """ if include_outside_table_row else ""
    sheet_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <sheetData>
        <row r="1"/>
        <row r="2">
          <c r="A2" t="inlineStr"><is><t>DEMO-QB-XLSX-001</t></is></c>
          <c r="B2" s="1"><v>{excel_date}</v></c>
          <c r="C2" t="inlineStr"><is><t>Synthetic Team A v Synthetic Team B</t></is></c>
          <c r="D2" t="inlineStr"><is><t>Bookmaker A</t></is></c>
          <c r="E2" t="inlineStr"><is><t>Placed</t></is></c>
          <c r="F2" t="inlineStr"><is><t>Pending</t></is></c>
          <c r="G2"><v>10.00</v></c>
          <c r="H2" t="inlineStr"><is><t>Standard</t></is></c>
          <c r="I2"><v>3.50</v></c>
          <c r="J2"><v>3.60</v></c>
          <c r="K2" t="inlineStr"><is><t>Exchange A</t></is></c>
          <c r="L2"><v>9.72</v></c>
          <c r="M2"><v>9.72</v></c>
          <c r="N2" t="inlineStr"><is><t>Bet &amp; Get</t></is></c>
        </row>
        {outside_table_row}
      </sheetData>
    </worksheet>"""
    styles_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <numFmts count="1"><numFmt numFmtId="170" formatCode="dd/mm/yyyy hh:mm"/></numFmts>
      <cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="170" applyNumberFormat="1"/></cellXfs>
    </styleSheet>"""
    columns = "".join(
        f'<tableColumn id="{index}" name="{header}"/>'
        for index, header in enumerate(HEADERS, start=1)
    )
    table_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      id="1" name="SyntheticSportsbook" displayName="SyntheticSportsbook" ref="A1:N2">
      <tableColumns count="14">{columns}</tableColumns>
    </table>"""
    with ZipFile(output, "w", ZIP_DEFLATED) as workbook:
        workbook.writestr("xl/workbook.xml", workbook_xml)
        workbook.writestr("xl/_rels/workbook.xml.rels", relationships_xml)
        workbook.writestr("xl/worksheets/sheet1.xml", sheet_xml)
        workbook.writestr("xl/styles.xml", styles_xml)
        workbook.writestr("xl/tables/table1.xml", table_xml)
        if include_macro:
            workbook.writestr("xl/vbaProject.bin", b"synthetic macro marker")
    return output.getvalue()


def append_row_outside_export_table(content: bytes, *, row_number: int) -> bytes:
    source = ZipFile(BytesIO(content))
    output = BytesIO()
    appended_row = f"""
      <row r="{row_number}">
        <c r="A{row_number}" t="inlineStr"><is><t>DEMO-QB-EXPORTED-NEW</t></is></c>
        <c r="B{row_number}" t="inlineStr"><is><t>2026-07-21T19:00:00</t></is></c>
        <c r="C{row_number}" t="inlineStr"><is><t>New row added to exported workbook</t></is></c>
        <c r="E{row_number}" t="inlineStr"><is><t>Synthetic new offer</t></is></c>
        <c r="F{row_number}" t="inlineStr"><is><t>Bookmaker A</t></is></c>
        <c r="G{row_number}" t="inlineStr"><is><t>Qualifying</t></is></c>
        <c r="H{row_number}" t="inlineStr"><is><t>Single</t></is></c>
        <c r="K{row_number}" t="inlineStr"><is><t>Prospecting</t></is></c>
        <c r="L{row_number}" t="inlineStr"><is><t>Pending</t></is></c>
        <c r="O{row_number}" t="inlineStr"><is><t>Standard</t></is></c>
      </row>
    """
    with source, ZipFile(output, "w", ZIP_DEFLATED) as target:
        for item in source.infolist():
            payload = source.read(item.filename)
            if item.filename == "xl/worksheets/sheet1.xml":
                sheet = payload.decode("utf-8")
                payload = sheet.replace("</sheetData>", f"{appended_row}</sheetData>").encode()
            target.writestr(item, payload)
    return output.getvalue()


def test_parser_reads_only_sportsbook_table_and_converts_excel_date() -> None:
    parsed = parse_sportsbook_xlsx(build_synthetic_workbook())

    assert parsed.table_name == "SyntheticSportsbook"
    assert parsed.headers == HEADERS
    assert len(parsed.rows) == 1
    assert parsed.rows[0].source_record_id == "DEMO-QB-XLSX-001"
    assert parsed.rows[0].fields["DateSettling"] == "2026-07-20T18:00:00"
    assert parsed.rows[0].fields["BackStake"] == "10.00"
    assert parsed.rows[0].outside_table_range is False


def test_parser_includes_populated_rows_beyond_a_stale_table_range() -> None:
    parsed = parse_sportsbook_xlsx(
        build_synthetic_workbook(include_outside_table_row=True)
    )

    assert len(parsed.rows) == 2
    assert parsed.rows[1].source_record_id == "DEMO-QB-XLSX-OUTSIDE"
    assert parsed.rows[1].outside_table_range is True


def test_parser_rejects_invalid_and_macro_enabled_files() -> None:
    with pytest.raises(XlsxImportError, match="valid XLSX"):
        parse_sportsbook_xlsx(b"not-a-workbook")
    with pytest.raises(XlsxImportError, match="Macro-enabled"):
        parse_sportsbook_xlsx(build_synthetic_workbook(include_macro=True))


def test_xlsx_endpoint_creates_profile_scoped_sportsbook_dry_run(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    upsert_profile_exchange_commission("profile-demo-001", "Exchange A", "0.02")
    content = base64.b64encode(build_synthetic_workbook()).decode("ascii")

    response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={"source_filename": "synthetic-sportsbook.xlsx", "content_base64": content},
    )

    assert response.status_code == 201
    batch = response.json()
    assert batch["profile_id"] == "profile-demo-001"
    assert batch["source_type"] == "xlsx"
    assert batch["mapping_version"] == "sportsbook-v1"
    assert batch["status"] == "dry_run_ready"
    assert batch["rows"][0]["mapped_fields"]["date_settled"] == "2026-07-20T18:00:00"


def test_confirmed_import_exports_original_identity_and_reimports_as_no_op(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    upsert_profile_exchange_commission("profile-demo-001", "Exchange A", "0.02")
    content = base64.b64encode(build_synthetic_workbook()).decode("ascii")
    dry_run = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={"source_filename": "synthetic-sportsbook.xlsx", "content_base64": content},
    ).json()

    confirmation = client.post(
        f"/profiles/profile-demo-001/imports/{dry_run['import_batch_id']}/confirm-sportsbook",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [
                dry_run["rows"][0]["import_staged_row_id"]
            ],
        },
    )
    assert confirmation.status_code == 200

    exported = client.get("/profiles/profile-demo-001/imports/sportsbook/export.xlsx")
    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    parsed = parse_sportsbook_xlsx(exported.content)
    assert parsed.rows[0].source_record_id == "DEMO-QB-XLSX-001"
    assert parsed.rows[0].fields["CurrentProjectedValue"] != ""

    repeated = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "round-trip.xlsx",
            "content_base64": base64.b64encode(exported.content).decode("ascii"),
        },
    )
    assert repeated.status_code == 201
    repeated_batch = repeated.json()
    assert repeated_batch["status"] == "dry_run_ready"
    assert repeated_batch["summary"] == {"no_op": len(parsed.rows)}

    workbook_with_new_row = append_row_outside_export_table(
        exported.content,
        row_number=len(parsed.rows) + 2,
    )
    changed = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "round-trip-with-new-row.xlsx",
            "content_base64": base64.b64encode(workbook_with_new_row).decode("ascii"),
        },
    )
    assert changed.status_code == 201
    changed_batch = changed.json()
    assert changed_batch["summary"] == {"insert": 1, "no_op": len(parsed.rows)}
    new_row = next(
        row
        for row in changed_batch["rows"]
        if row["source_record_id"] == "DEMO-QB-EXPORTED-NEW"
    )
    assert new_row["staged_action"] == "insert"
    assert new_row["mapped_fields"]["event_name"] == (
        "New row added to exported workbook"
    )
    assert new_row["warnings"][0]["code"] == "outside_workbook_table_range"


def synthetic_free_bet_export() -> bytes:
    return build_free_bet_export(
        [
            {
                "FreeBetID": "DEMO-FB-XLSX-001",
                "DateSettling": "2026-07-20T18:00:00",
                "ExpiryDateTime": "2026-07-18T23:59:00",
                "EventName": "Synthetic free-bet event",
                "Offer": "Demo weekly free bet",
                "Bookmaker": "Bookmaker A",
                "OfferType": "Free Bet",
                "BetType": "Single",
                "OfferName": "Weekly Reload",
                "FixtureType": "Football",
                "Status": "Placed",
                "Result": "Pending",
                "FreeBetRetentionMode": "SNR",
                "FreeBetValue": "5.00",
                "BackOdds": "4.00",
                "MatchStrategy": "Standard",
                "LayOdds1": "4.20",
                "Exchange": "Exchange A",
                "Lay (Actual)": "3.57",
                "LayMatchedStake1": "3.57",
                "OriginQualBetID": "DEMO-QB-ORIGIN-001",
                "OfferGroupID": "DEMO-GROUP-001",
                "UserNotes": "Synthetic XLSX fixture",
                "ReportingValue": "3.50",
            }
        ]
    )


def synthetic_sportsbook_export() -> bytes:
    return build_sportsbook_export(
        [
            {
                "QualBetID": "DEMO-QB-RECONCILE-001",
                "DateSettling": "2026-07-20T18:00:00",
                "EventName": "Synthetic sportsbook reconciliation event",
                "Market": "Match result",
                "Offer": "Synthetic qualifying offer",
                "Bookmaker": "Bookmaker A",
                "OfferType": "Sign up / Welcome",
                "BetType": "Single",
                "OfferName": "Synthetic offer",
                "FixtureType": "Football",
                "Status": "Placed",
                "Result": "Pending",
                "BackStake": "10.00",
                "BackOdds": "2.00",
                "MatchStrategy": "Standard",
                "LayOdds1": "2.10",
                "Exchange": "Exchange A",
                "Lay (Actual)": "",
                "LayMatchedStake1": "",
                "BonusRetentionRate": "70",
                "MultiLayOutcomesJson": "[]",
                "ReportingValue": "-0.58",
            }
        ]
    )


def test_sportsbook_xlsx_reconciles_cash_first_reporting_value(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    upsert_profile_exchange_commission("profile-demo-001", "Exchange A", "0.02")

    response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-sportsbook-reconciliation.xlsx",
            "content_base64": base64.b64encode(synthetic_sportsbook_export()).decode(
                "ascii"
            ),
            "ledger": "sportsbook",
        },
    )

    assert response.status_code == 201
    assert response.json()["financial_reconciliation"] == {
        "ledger": "Sportsbook Bets",
        "state": "matched",
        "source_total": "-0.58",
        "recomputed_total": "-0.58",
        "difference": "0.00",
        "compared_row_count": 1,
        "source_row_count": 1,
        "tolerance": "0.01",
        "message": "Workbook and Plum Duff cash-first Sportsbook totals match.",
    }


def test_xlsx_dry_run_auto_detects_sportsbook_when_wrong_ledger_is_selected(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    upsert_profile_exchange_commission("profile-demo-001", "Exchange A", "0.02")
    content = synthetic_sportsbook_export()

    assert detect_supported_ledger_xlsx(content) == ("sportsbook",)
    response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-sportsbook-reconciliation.xlsx",
            "content_base64": base64.b64encode(content).decode("ascii"),
            "ledger": "free-bets",
        },
    )

    assert response.status_code == 201
    assert response.json()["mapping_version"] == "sportsbook-v1"


def test_free_bet_parser_reads_exported_free_bet_table() -> None:
    parsed = parse_free_bet_xlsx(synthetic_free_bet_export())

    assert parsed.table_name == "PlumDuffFreeBetExport"
    assert len(parsed.rows) == 1
    assert parsed.rows[0].source_record_id == "DEMO-FB-XLSX-001"
    assert parsed.rows[0].fields["FreeBetRetentionMode"] == "SNR"
    assert parsed.rows[0].fields["ExpiryDateTime"] == "2026-07-18T23:59:00"


def test_free_bet_xlsx_confirm_export_and_reimport_is_idempotent(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    upsert_profile_exchange_commission("profile-demo-001", "Exchange A", "0.02")
    content = synthetic_free_bet_export()

    dry_run_response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-free-bets.xlsx",
            "content_base64": base64.b64encode(content).decode("ascii"),
            "ledger": "free-bets",
        },
    )
    assert dry_run_response.status_code == 201
    dry_run = dry_run_response.json()
    assert dry_run["mapping_version"] == "free-bets-v1"
    assert dry_run["rows"][0]["mapped_fields"]["retention_mode"] == "SNR"
    assert dry_run["financial_reconciliation"] == {
        "ledger": "Free Bets",
        "state": "matched",
        "source_total": "3.50",
        "recomputed_total": "3.50",
        "difference": "0.00",
        "compared_row_count": 1,
        "source_row_count": 1,
        "tolerance": "0.01",
        "message": "Workbook and Plum Duff cash-first Free Bet totals match.",
    }

    confirmation = client.post(
        f"/profiles/profile-demo-001/imports/{dry_run['import_batch_id']}/confirm-free-bets",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [dry_run["rows"][0]["import_staged_row_id"]],
        },
    )
    assert confirmation.status_code == 200
    assert len(confirmation.json()["imported_free_bet_ids"]) == 1

    exported = client.get("/profiles/profile-demo-001/imports/free-bets/export.xlsx")
    assert exported.status_code == 200
    parsed = parse_free_bet_xlsx(exported.content)
    imported = next(
        row for row in parsed.rows if row.source_record_id == "DEMO-FB-XLSX-001"
    )
    assert imported.fields["CurrentProjectedValue"] != ""

    repeated = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "free-bet-round-trip.xlsx",
            "content_base64": base64.b64encode(exported.content).decode("ascii"),
            "ledger": "free-bets",
        },
    )
    assert repeated.status_code == 201
    assert repeated.json()["summary"] == {"no_op": len(parsed.rows)}


def synthetic_casino_offer_export() -> bytes:
    return build_casino_offer_export(
        [
            {
                "CasinoOfferID": "DEMO-CO-XLSX-001",
                "OfferGroupID": "DEMO-CASINO-GROUP-001",
                "DateStarted": "2026-07-13T09:00:00",
                "DateSettling": "2026-07-14T20:00:00",
                "ExpiryDateTime": "2026-07-20T23:59:00",
                "Bookmaker": "Bookmaker A",
                "OfferType": "Wager",
                "OfferName": "Demo wager offer",
                "Game": "Demo Slots",
                "CashStake": "10.00",
                "CreditAmount": "10.00",
                "BonusAmount": "10.00",
                "WagerMultiplier": "20",
                "WagerTarget": "200.00",
                "Required Spins": "100",
                "SpinStake": "0.20",
                "Free Spins Awarded": "0",
                "Free Spins Value": "0.00",
                "Status": "In Progress",
                "Result": "Pending",
                "CalcNetPnL": "-2.50",
                "FinalNetPnL": "",
                "ResolvedNetPnL": "-2.50",
                "UserNotes": "Synthetic casino XLSX fixture",
            }
        ]
    )


def test_casino_offer_xlsx_confirm_export_and_reimport_is_idempotent(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    content = synthetic_casino_offer_export()
    parsed_source = parse_casino_offer_xlsx(content)
    assert parsed_source.rows[0].fields["OfferName"] == "Demo wager offer"

    dry_run_response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-casino-offers.xlsx",
            "content_base64": base64.b64encode(content).decode("ascii"),
            "ledger": "casino-offers",
        },
    )
    assert dry_run_response.status_code == 201
    dry_run = dry_run_response.json()
    assert dry_run["mapping_version"] == "casino-offers-v1"
    assert dry_run["rows"][0]["mapped_fields"]["calc_net_pnl"] == "-2.50"
    assert dry_run["financial_reconciliation"]["state"] == "matched"
    assert dry_run["financial_reconciliation"]["source_total"] == "-2.50"
    assert dry_run["financial_reconciliation"]["recomputed_total"] == "-2.50"

    confirmation = client.post(
        f"/profiles/profile-demo-001/imports/{dry_run['import_batch_id']}/confirm-casino-offers",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [dry_run["rows"][0]["import_staged_row_id"]],
        },
    )
    assert confirmation.status_code == 200
    assert len(confirmation.json()["imported_casino_offer_ids"]) == 1

    exported = client.get("/profiles/profile-demo-001/imports/casino-offers/export.xlsx")
    assert exported.status_code == 200
    parsed = parse_casino_offer_xlsx(exported.content)
    imported = next(
        row for row in parsed.rows if row.source_record_id == "DEMO-CO-XLSX-001"
    )
    assert imported.fields["ResolvedNetPnL"] == "-2.50"

    repeated = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "casino-round-trip.xlsx",
            "content_base64": base64.b64encode(exported.content).decode("ascii"),
            "ledger": "casino-offers",
        },
    )
    assert repeated.status_code == 201
    assert repeated.json()["summary"] == {"no_op": len(parsed.rows)}


def synthetic_cash_adjustment_export() -> bytes:
    return build_cash_adjustment_export(
        [
            {
                "AdjustmentID": "DEMO-CA-XLSX-001",
                "AdjustmentDate": "2026-07-06",
                "Direction": "In",
                "Amount": "50.00",
                "AdjustmentType": "TopUp",
                "AffectsInvestment": True,
                "AffectsCashSnapshot": True,
                "LinkedAccount": "Bank A",
                "Description": "Synthetic XLSX top-up",
                "SignedAmount": "999.00",
                "WeekLabel": "WRONG",
            }
        ]
    )


def test_cash_adjustment_xlsx_confirm_export_and_reimport_is_idempotent(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    content = synthetic_cash_adjustment_export()
    parsed_source = parse_cash_adjustment_xlsx(content)
    assert parsed_source.rows[0].fields["AdjustmentType"] == "TopUp"

    dry_run_response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-cash-adjustments.xlsx",
            "content_base64": base64.b64encode(content).decode("ascii"),
            "ledger": "cash-adjustments",
        },
    )
    assert dry_run_response.status_code == 201
    dry_run = dry_run_response.json()
    assert dry_run["mapping_version"] == "cash-adjustments-v1"
    assert dry_run["rows"][0]["mapped_fields"]["affects_investment"] is True
    assert "SignedAmount" not in dry_run["rows"][0]["mapped_fields"]
    assert dry_run["financial_reconciliation"] == {
        "ledger": "Cash Adjustments",
        "state": "mismatch",
        "source_total": "999.00",
        "recomputed_total": "50.00",
        "difference": "949.00",
        "compared_row_count": 1,
        "source_row_count": 1,
        "tolerance": "0.01",
        "message": (
            "Workbook and Plum Duff signed totals differ by 949.00. "
            "Plum Duff's recomputed value remains authoritative."
        ),
    }

    confirmation = client.post(
        f"/profiles/profile-demo-001/imports/{dry_run['import_batch_id']}/confirm-cash-adjustments",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [dry_run["rows"][0]["import_staged_row_id"]],
        },
    )
    assert confirmation.status_code == 200
    assert len(confirmation.json()["imported_cash_adjustment_ids"]) == 1

    exported = client.get(
        "/profiles/profile-demo-001/imports/cash-adjustments/export.xlsx"
    )
    assert exported.status_code == 200
    parsed = parse_cash_adjustment_xlsx(exported.content)
    imported = next(
        row for row in parsed.rows if row.source_record_id == "DEMO-CA-XLSX-001"
    )
    assert imported.fields["SignedAmount"] == "50.00"
    assert imported.fields["WeekLabel"] != "WRONG"

    repeated = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "cash-adjustment-round-trip.xlsx",
            "content_base64": base64.b64encode(exported.content).decode("ascii"),
            "ledger": "cash-adjustments",
        },
    )
    assert repeated.status_code == 201
    assert repeated.json()["summary"] == {"no_op": len(parsed.rows)}


def test_cash_adjustment_xlsx_blocks_cross_profile_native_identity(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    source_id = "DEMO-CA-CROSS-PROFILE"
    created = client.post(
        "/profiles/profile-demo-001/cash-adjustments",
        json={
            "cash_adjustment_id": source_id,
            "adjustment_date": "2026-07-06",
            "direction": "In",
            "amount": "50.00",
            "adjustment_type": "TopUp",
            "affects_investment": True,
            "affects_cash_snapshot": True,
            "linked_account": "Bank A",
            "description": "Synthetic identity owner",
        },
    )
    assert created.status_code == 201
    content = build_cash_adjustment_export(
        [
            {
                "AdjustmentID": source_id,
                "AdjustmentDate": "2026-07-06",
                "Direction": "In",
                "Amount": "50.00",
                "AdjustmentType": "TopUp",
                "AffectsInvestment": True,
                "AffectsCashSnapshot": True,
                "LinkedAccount": "Bank A",
                "Description": "Synthetic identity owner",
                "SignedAmount": "50.00",
                "WeekLabel": "2026-W28",
            }
        ]
    )

    dry_run = client.post(
        "/profiles/profile-demo-002/imports/xlsx/dry-run",
        json={
            "source_filename": "cross-profile-cash-adjustment.xlsx",
            "content_base64": base64.b64encode(content).decode("ascii"),
            "ledger": "cash-adjustments",
        },
    )

    assert dry_run.status_code == 201
    row = dry_run.json()["rows"][0]
    assert row["staged_action"] == "blocked"
    assert any(
        issue["code"] == "cross_profile_source_collision" for issue in row["errors"]
    )


def synthetic_account_export(
    *,
    status: str = "Active",
    current_balance: str = "125.40",
    pending_withdrawal: str = "10.00",
) -> bytes:
    return build_account_export(
        [
            {
                "AccountID": "DEMO-ACCOUNT-XLSX-001",
                "Account": "Bet365",
                "Type": "Bookie",
                "Counts In Cash Total": True,
                "Channel": "Online",
                "Status": status,
                "CurrentBalance": current_balance,
                "PendingWithdrawalAmount": pending_withdrawal,
                "LastBalanceUpdate": "2026-07-17",
                "LastPromoUsed": "2099-01-01",
                "Group": "Stale Group",
                "Platform": "Stale Platform",
                "RiskTeam": "Stale Risk",
                "SignUpDate": "2026-05-01",
                "Notes": "Synthetic account note",
            }
        ]
    )


def test_account_xlsx_confirm_export_and_reimport_is_idempotent(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    content = synthetic_account_export()
    parsed_source = parse_account_xlsx(content)
    assert parsed_source.rows[0].fields["Account"] == "Bet365"

    dry_run_response = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-accounts.xlsx",
            "content_base64": base64.b64encode(content).decode("ascii"),
            "ledger": "accounts",
        },
    )
    assert dry_run_response.status_code == 201
    dry_run = dry_run_response.json()
    row = dry_run["rows"][0]
    assert dry_run["mapping_version"] == "accounts-v1"
    assert row["staged_action"] == "insert"
    assert row["mapped_fields"]["group_name"] == "Bet365 Group"
    assert row["mapped_fields"]["platform"] == "Proprietary"
    assert len(row["warnings"]) == 3

    confirmation = client.post(
        f"/profiles/profile-demo-001/imports/{dry_run['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [row["import_staged_row_id"]],
        },
    )
    assert confirmation.status_code == 200
    assert len(confirmation.json()["imported_account_ids"]) == 1

    exported = client.get("/profiles/profile-demo-001/imports/accounts/export.xlsx")
    assert exported.status_code == 200
    parsed = parse_account_xlsx(exported.content)
    imported = next(
        row for row in parsed.rows if row.source_record_id == "DEMO-ACCOUNT-XLSX-001"
    )
    assert imported.fields["CurrentBalance"] == "125.40"
    assert imported.fields["PendingWithdrawalAmount"] == "10.00"
    assert imported.fields["LastPromoUsed"] == ""
    assert imported.fields["SignUpDate"] == "2026-05-01"
    assert imported.fields["Notes"] == "Synthetic account note"

    repeated = client.post(
        "/profiles/profile-demo-001/imports/xlsx/dry-run",
        json={
            "source_filename": "accounts-round-trip.xlsx",
            "content_base64": base64.b64encode(exported.content).decode("ascii"),
            "ledger": "accounts",
        },
    )
    assert repeated.status_code == 201
    assert repeated.json()["summary"]["no_op"] >= 1


def test_account_xlsx_changed_row_requires_selection_and_updates_with_audit(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"

    first_dry_run = client.post(
        f"/profiles/{profile_id}/imports/xlsx/dry-run",
        json={
            "source_filename": "account-initial.xlsx",
            "content_base64": base64.b64encode(synthetic_account_export()).decode("ascii"),
            "ledger": "accounts",
        },
    ).json()
    first_confirmation = client.post(
        f"/profiles/{profile_id}/imports/{first_dry_run['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [
                first_dry_run["rows"][0]["import_staged_row_id"]
            ],
        },
    )
    assert first_confirmation.status_code == 200
    account_id = first_confirmation.json()["imported_account_ids"][0]

    changed_dry_run_response = client.post(
        f"/profiles/{profile_id}/imports/xlsx/dry-run",
        json={
            "source_filename": "account-changed.xlsx",
            "content_base64": base64.b64encode(
                synthetic_account_export(
                    status="Limited",
                    current_balance="130.55",
                    pending_withdrawal="",
                )
            ).decode("ascii"),
            "ledger": "accounts",
        },
    )
    assert changed_dry_run_response.status_code == 201
    changed_dry_run = changed_dry_run_response.json()
    changed_row = changed_dry_run["rows"][0]
    assert changed_row["staged_action"] == "update"
    assert changed_row["field_diffs"]["status"] == {
        "before": "Active",
        "after": "Limited",
    }
    assert changed_row["field_diffs"]["current_balance"] == {
        "before": "125.40",
        "after": "130.55",
    }
    assert changed_row["field_diffs"]["pending_withdrawal_amount"] == {
        "before": "10.00",
        "after": "",
    }
    before = get_account(profile_id, account_id)
    assert before is not None and before.current_balance == "125.40"

    confirmation = client.post(
        f"/profiles/{profile_id}/imports/{changed_dry_run['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [changed_row["import_staged_row_id"]],
        },
    )
    assert confirmation.status_code == 200
    assert confirmation.json()["backup_snapshot_id"]
    assert confirmation.json()["imported_account_ids"] == [account_id]

    updated = get_account(profile_id, account_id)
    assert updated is not None
    assert updated.status == "Limited"
    assert updated.current_balance == "130.55"
    assert updated.pending_withdrawal_amount == ""
    assert count_account_audit_rows(profile_id, account_id) == 2
    source = get_import_source_record("Accounts", "DEMO-ACCOUNT-XLSX-001")
    assert source is not None
    assert source.import_batch_id == changed_dry_run["import_batch_id"]

    repeated = client.post(
        f"/profiles/{profile_id}/imports/xlsx/dry-run",
        json={
            "source_filename": "account-changed-again.xlsx",
            "content_base64": base64.b64encode(
                synthetic_account_export(
                    status="Limited",
                    current_balance="130.55",
                    pending_withdrawal="",
                )
            ).decode("ascii"),
            "ledger": "accounts",
        },
    )
    assert repeated.status_code == 201
    assert repeated.json()["summary"] == {"no_op": 1}


def test_unselected_account_update_is_skipped_while_selected_insert_commits(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile_id = "profile-demo-001"
    initial = client.post(
        f"/profiles/{profile_id}/imports/xlsx/dry-run",
        json={
            "source_filename": "account-initial.xlsx",
            "content_base64": base64.b64encode(synthetic_account_export()).decode("ascii"),
            "ledger": "accounts",
        },
    ).json()
    initial_confirmation = client.post(
        f"/profiles/{profile_id}/imports/{initial['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [initial["rows"][0]["import_staged_row_id"]],
        },
    ).json()
    existing_account_id = initial_confirmation["imported_account_ids"][0]

    review = client.post(
        f"/profiles/{profile_id}/imports/dry-run",
        json={
            "source_filename": "mixed-account-review.json",
            "source_type": "synthetic-json",
            "mapping_version": "accounts-v1",
            "rows": [
                {
                    "sheet": "Accounts",
                    "source_record_id": "DEMO-ACCOUNT-XLSX-001",
                    "source_row": 2,
                    "fields": {
                        "Account": "Bet365",
                        "Type": "Bookie",
                        "Counts In Cash Total": True,
                        "Channel": "Online",
                        "Status": "Limited",
                        "CurrentBalance": "130.55",
                        "PendingWithdrawalAmount": "",
                        "LastBalanceUpdate": "2026-07-17",
                        "SignUpDate": "2026-05-01",
                        "Notes": "Synthetic account note",
                    },
                },
                {
                    "sheet": "Accounts",
                    "source_record_id": "DEMO-ACCOUNT-NEW-002",
                    "source_row": 3,
                    "fields": {
                        "Account": "Smarkets",
                        "Type": "Exchange",
                        "Counts In Cash Total": True,
                        "Channel": "Online",
                        "Status": "Active",
                        "CurrentBalance": "20.00",
                        "PendingWithdrawalAmount": "",
                    },
                },
            ],
        },
    ).json()
    assert review["summary"] == {"insert": 1, "update": 1}
    insert_row = next(row for row in review["rows"] if row["staged_action"] == "insert")

    confirmation = client.post(
        f"/profiles/{profile_id}/imports/{review['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [insert_row["import_staged_row_id"]],
        },
    )
    assert confirmation.status_code == 200
    unchanged = get_account(profile_id, existing_account_id)
    assert unchanged is not None
    assert unchanged.status == "Active"
    assert unchanged.current_balance == "125.40"
    stored_review = client.get(
        f"/profiles/{profile_id}/imports/{review['import_batch_id']}"
    ).json()
    actions = {row["source_record_id"]: row["staged_action"] for row in stored_review["rows"]}
    assert actions == {
        "DEMO-ACCOUNT-NEW-002": "imported",
        "DEMO-ACCOUNT-XLSX-001": "skipped_by_operator",
    }
