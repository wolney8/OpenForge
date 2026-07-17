from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from io import BytesIO
from typing import Callable, Literal, TypeAlias, cast
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from openforge_api.db import extract_shared_strings, extract_sheet_paths, parse_cell_reference

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"main": MAIN_NS}
MAX_XLSX_BYTES = 15 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024
MAX_SPORTSBOOK_ROWS = 5000
MAX_FREE_BET_ROWS = 5000
MAX_CASINO_OFFER_ROWS = 5000
MAX_CASH_ADJUSTMENT_ROWS = 5000
MAX_ACCOUNT_ROWS = 5000
BUILTIN_DATE_FORMAT_IDS = {14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47}
SupportedLedger: TypeAlias = Literal[
    "sportsbook", "free-bets", "casino-offers", "cash-adjustments", "accounts"
]


class XlsxImportError(ValueError):
    pass


@dataclass(frozen=True)
class ParsedSportsbookRow:
    source_row: int
    source_record_id: str
    fields: dict[str, str | int | float | bool | None]
    outside_table_range: bool


@dataclass(frozen=True)
class ParsedSportsbookSheet:
    headers: tuple[str, ...]
    rows: tuple[ParsedSportsbookRow, ...]
    table_name: str
    table_reference: str


@dataclass(frozen=True)
class ParsedFreeBetRow:
    source_row: int
    source_record_id: str
    fields: dict[str, str | int | float | bool | None]
    outside_table_range: bool


@dataclass(frozen=True)
class ParsedFreeBetSheet:
    headers: tuple[str, ...]
    rows: tuple[ParsedFreeBetRow, ...]
    table_name: str
    table_reference: str


@dataclass(frozen=True)
class ParsedCasinoOfferRow:
    source_row: int
    source_record_id: str
    fields: dict[str, str | int | float | bool | None]
    outside_table_range: bool


@dataclass(frozen=True)
class ParsedCasinoOfferSheet:
    headers: tuple[str, ...]
    rows: tuple[ParsedCasinoOfferRow, ...]
    table_name: str
    table_reference: str


@dataclass(frozen=True)
class ParsedCashAdjustmentRow:
    source_row: int
    source_record_id: str
    fields: dict[str, str | int | float | bool | None]
    outside_table_range: bool


@dataclass(frozen=True)
class ParsedCashAdjustmentSheet:
    headers: tuple[str, ...]
    rows: tuple[ParsedCashAdjustmentRow, ...]
    table_name: str
    table_reference: str


@dataclass(frozen=True)
class ParsedAccountRow:
    source_row: int
    source_record_id: str
    fields: dict[str, str | int | float | bool | None]
    outside_table_range: bool


@dataclass(frozen=True)
class ParsedAccountSheet:
    headers: tuple[str, ...]
    rows: tuple[ParsedAccountRow, ...]
    table_name: str
    table_reference: str


def column_index_from_reference(reference: str) -> int:
    column_index, _row_index = parse_cell_reference(reference)
    return column_index


def parse_range(reference: str) -> tuple[int, int, int, int]:
    parts = reference.replace("$", "").split(":")
    if len(parts) != 2:
        raise XlsxImportError(f"Unsupported table range: {reference}")
    start_col, start_row = parse_cell_reference(parts[0])
    end_col, end_row = parse_cell_reference(parts[1])
    return start_col, start_row, end_col, end_row


def read_date_style_indexes(workbook: ZipFile) -> set[int]:
    try:
        root = ET.fromstring(workbook.read("xl/styles.xml"))
    except KeyError:
        return set()
    custom_formats = {
        int(node.attrib["numFmtId"]): node.attrib.get("formatCode", "")
        for node in root.findall("main:numFmts/main:numFmt", NS)
    }
    date_indexes: set[int] = set()
    for index, style in enumerate(root.findall("main:cellXfs/main:xf", NS)):
        format_id = int(style.attrib.get("numFmtId", "0"))
        format_code = custom_formats.get(format_id, "")
        normalized = re.sub(r'"[^"]*"|\[[^]]*\]|\\.', "", format_code).lower()
        if format_id in BUILTIN_DATE_FORMAT_IDS or (
            normalized and re.search(r"(?:y|d|h|s)", normalized)
        ):
            date_indexes.add(index)
    return date_indexes


def excel_serial_to_iso(value: str) -> str:
    try:
        serial = float(value)
    except ValueError as error:
        raise XlsxImportError(f"Invalid Excel date serial: {value}") from error
    parsed = datetime(1899, 12, 30) + timedelta(days=serial)
    if parsed.hour or parsed.minute or parsed.second or parsed.microsecond:
        return parsed.isoformat(timespec="seconds")
    return parsed.date().isoformat()


def read_cell_value(
    cell: ET.Element,
    *,
    shared_strings: list[str],
    date_style_indexes: set[int],
) -> str | bool:
    cell_type = cell.attrib.get("t", "")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//main:t", NS)).strip()
    value_node = cell.find("main:v", NS)
    raw_value = "" if value_node is None or value_node.text is None else value_node.text.strip()
    if not raw_value:
        return ""
    if cell_type == "s":
        try:
            return shared_strings[int(raw_value)].strip()
        except (IndexError, ValueError) as error:
            raise XlsxImportError("Workbook contains an invalid shared-string reference") from error
    if cell_type == "b":
        return raw_value == "1"
    style_index = int(cell.attrib.get("s", "0"))
    if style_index in date_style_indexes:
        return excel_serial_to_iso(raw_value)
    return raw_value


def find_ledger_table(
    workbook: ZipFile,
    *,
    required_headers: set[str],
    ledger_label: str,
) -> tuple[ET.Element, tuple[str, ...]]:
    for name in sorted(item for item in workbook.namelist() if item.startswith("xl/tables/")):
        root = ET.fromstring(workbook.read(name))
        headers = tuple(
            node.attrib.get("name", "").strip()
            for node in root.findall("main:tableColumns/main:tableColumn", NS)
        )
        if required_headers.issubset(headers):
            if len(headers) != len(set(headers)):
                raise XlsxImportError(f"{ledger_label} table contains duplicate headers")
            return root, headers
    required = ", ".join(sorted(required_headers))
    raise XlsxImportError(f"{ledger_label} table with {required} was not found")


def find_sportsbook_table(workbook: ZipFile) -> tuple[ET.Element, tuple[str, ...]]:
    return find_ledger_table(
        workbook,
        required_headers={"QualBetID", "EventName", "BackStake"},
        ledger_label="Sportsbook Bets",
    )


def find_free_bet_table(workbook: ZipFile) -> tuple[ET.Element, tuple[str, ...]]:
    return find_ledger_table(
        workbook,
        required_headers={"FreeBetID", "EventName", "FreeBetValue"},
        ledger_label="Free Bets",
    )


def find_casino_offer_table(workbook: ZipFile) -> tuple[ET.Element, tuple[str, ...]]:
    return find_ledger_table(
        workbook,
        required_headers={"CasinoOfferID", "OfferType", "DateStarted"},
        ledger_label="Casino Offers",
    )


def find_cash_adjustment_table(workbook: ZipFile) -> tuple[ET.Element, tuple[str, ...]]:
    return find_ledger_table(
        workbook,
        required_headers={"AdjustmentID", "AdjustmentDate", "Direction", "Amount"},
        ledger_label="Cash Adjustments",
    )


def find_account_table(workbook: ZipFile) -> tuple[ET.Element, tuple[str, ...]]:
    return find_ledger_table(
        workbook,
        required_headers={"AccountID", "Account", "Type", "CurrentBalance"},
        ledger_label="Accounts",
    )


def detect_supported_ledger_xlsx(content: bytes) -> tuple[SupportedLedger, ...]:
    if not content:
        raise XlsxImportError("Workbook file is empty")
    if len(content) > MAX_XLSX_BYTES:
        raise XlsxImportError("Workbook file exceeds the 15 MB upload limit")
    try:
        workbook = ZipFile(BytesIO(content))
    except BadZipFile as error:
        raise XlsxImportError("File is not a valid XLSX workbook") from error

    try:
        validate_archive(workbook)
        detected: list[SupportedLedger] = []
        for ledger, finder in (
            ("sportsbook", find_sportsbook_table),
            ("free-bets", find_free_bet_table),
            ("casino-offers", find_casino_offer_table),
            ("cash-adjustments", find_cash_adjustment_table),
            ("accounts", find_account_table),
        ):
            try:
                finder(workbook)
            except XlsxImportError:
                continue
            detected.append(cast(SupportedLedger, ledger))
        return tuple(detected)
    finally:
        workbook.close()


def validate_archive(workbook: ZipFile) -> None:
    total_size = sum(item.file_size for item in workbook.infolist())
    if total_size > MAX_UNCOMPRESSED_BYTES:
        raise XlsxImportError("Workbook uncompressed size exceeds the 80 MB safety limit")
    if any(item.filename.lower().endswith("vbaproject.bin") for item in workbook.infolist()):
        raise XlsxImportError("Macro-enabled workbooks are not supported")


def parse_sportsbook_xlsx(content: bytes) -> ParsedSportsbookSheet:
    parsed = parse_ledger_xlsx(
        content,
        sheet_name="Sportsbook Bets",
        source_id_header="QualBetID",
        entered_headers=("QualBetID", "EventName", "Offer", "Bookmaker", "BackStake"),
        max_rows=MAX_SPORTSBOOK_ROWS,
        find_table=find_sportsbook_table,
    )
    return ParsedSportsbookSheet(
        headers=parsed[0],
        rows=tuple(
            ParsedSportsbookRow(
                source_row=row[0],
                source_record_id=row[1],
                fields=row[2],
                outside_table_range=row[3],
            )
            for row in parsed[1]
        ),
        table_name=parsed[2],
        table_reference=parsed[3],
    )


def parse_free_bet_xlsx(content: bytes) -> ParsedFreeBetSheet:
    parsed = parse_ledger_xlsx(
        content,
        sheet_name="Free Bets",
        source_id_header="FreeBetID",
        entered_headers=("FreeBetID", "EventName", "Offer", "Bookmaker", "FreeBetValue"),
        max_rows=MAX_FREE_BET_ROWS,
        find_table=find_free_bet_table,
    )
    return ParsedFreeBetSheet(
        headers=parsed[0],
        rows=tuple(
            ParsedFreeBetRow(
                source_row=row[0],
                source_record_id=row[1],
                fields=row[2],
                outside_table_range=row[3],
            )
            for row in parsed[1]
        ),
        table_name=parsed[2],
        table_reference=parsed[3],
    )


def parse_casino_offer_xlsx(content: bytes) -> ParsedCasinoOfferSheet:
    parsed = parse_ledger_xlsx(
        content,
        sheet_name="Casino Offers",
        source_id_header="CasinoOfferID",
        entered_headers=(
            "CasinoOfferID",
            "OfferName",
            "Bookmaker",
            "OfferType",
            "DateStarted",
        ),
        max_rows=MAX_CASINO_OFFER_ROWS,
        find_table=find_casino_offer_table,
    )
    return ParsedCasinoOfferSheet(
        headers=parsed[0],
        rows=tuple(
            ParsedCasinoOfferRow(
                source_row=row[0],
                source_record_id=row[1],
                fields=row[2],
                outside_table_range=row[3],
            )
            for row in parsed[1]
        ),
        table_name=parsed[2],
        table_reference=parsed[3],
    )


def parse_cash_adjustment_xlsx(content: bytes) -> ParsedCashAdjustmentSheet:
    parsed = parse_ledger_xlsx(
        content,
        sheet_name="Cash Adjustments",
        source_id_header="AdjustmentID",
        entered_headers=(
            "AdjustmentID",
            "AdjustmentDate",
            "Direction",
            "Amount",
            "AdjustmentType",
        ),
        max_rows=MAX_CASH_ADJUSTMENT_ROWS,
        find_table=find_cash_adjustment_table,
    )
    return ParsedCashAdjustmentSheet(
        headers=parsed[0],
        rows=tuple(
            ParsedCashAdjustmentRow(
                source_row=row[0],
                source_record_id=row[1],
                fields=row[2],
                outside_table_range=row[3],
            )
            for row in parsed[1]
        ),
        table_name=parsed[2],
        table_reference=parsed[3],
    )


def parse_account_xlsx(content: bytes) -> ParsedAccountSheet:
    parsed = parse_ledger_xlsx(
        content,
        sheet_name="Accounts",
        source_id_header="AccountID",
        entered_headers=("AccountID", "Account", "Type", "CurrentBalance"),
        max_rows=MAX_ACCOUNT_ROWS,
        find_table=find_account_table,
    )
    return ParsedAccountSheet(
        headers=parsed[0],
        rows=tuple(
            ParsedAccountRow(
                source_row=row[0],
                source_record_id=row[1],
                fields=row[2],
                outside_table_range=row[3],
            )
            for row in parsed[1]
        ),
        table_name=parsed[2],
        table_reference=parsed[3],
    )


def parse_ledger_xlsx(
    content: bytes,
    *,
    sheet_name: str,
    source_id_header: str,
    entered_headers: tuple[str, ...],
    max_rows: int,
    find_table: Callable[[ZipFile], tuple[ET.Element, tuple[str, ...]]],
) -> tuple[
    tuple[str, ...],
    list[tuple[int, str, dict[str, str | int | float | bool | None], bool]],
    str,
    str,
]:
    if not content:
        raise XlsxImportError("Workbook file is empty")
    if len(content) > MAX_XLSX_BYTES:
        raise XlsxImportError("Workbook file exceeds the 15 MB upload limit")
    try:
        workbook = ZipFile(BytesIO(content))
    except BadZipFile as error:
        raise XlsxImportError("File is not a valid XLSX workbook") from error

    try:
        validate_archive(workbook)
        sheet_paths = extract_sheet_paths(workbook)
        sheet_path = sheet_paths.get(sheet_name)
        if sheet_path is None:
            raise XlsxImportError(f"Workbook does not contain a {sheet_name} sheet")

        table_root, headers = find_table(workbook)
        table_reference = table_root.attrib.get("ref", "")
        start_col, header_row, end_col, end_row = parse_range(table_reference)
        if len(headers) != end_col - start_col + 1:
            raise XlsxImportError(f"{sheet_name} table header count does not match its range")
        if end_row - header_row > max_rows:
            raise XlsxImportError(f"{sheet_name} table exceeds the 5,000 row safety limit")

        shared_strings = extract_shared_strings(workbook)
        date_style_indexes = read_date_style_indexes(workbook)
        sheet_root = ET.fromstring(workbook.read(sheet_path))
        parsed_rows: list[
            tuple[int, str, dict[str, str | int | float | bool | None], bool]
        ] = []
        for row in sheet_root.findall(".//main:sheetData/main:row", NS):
            row_number = int(row.attrib.get("r", "0"))
            if row_number <= header_row:
                continue
            values: dict[int, str | bool] = {}
            for cell in row.findall("main:c", NS):
                reference = cell.attrib.get("r", "")
                if not reference:
                    continue
                column_index = column_index_from_reference(reference)
                if start_col <= column_index <= end_col:
                    values[column_index] = read_cell_value(
                        cell,
                        shared_strings=shared_strings,
                        date_style_indexes=date_style_indexes,
                    )

            fields = {
                header: values.get(start_col + offset, "")
                for offset, header in enumerate(headers)
            }
            source_record_id = str(fields.get(source_id_header, "")).strip()
            entered_values = [fields.get(name, "") for name in entered_headers]
            if not any(str(value).strip() for value in entered_values):
                continue
            if row_number - header_row > max_rows:
                raise XlsxImportError(
                    f"{sheet_name} worksheet exceeds the 5,000 row safety limit"
                )
            parsed_rows.append(
                (
                    row_number,
                    source_record_id,
                    {key: value for key, value in fields.items() if key != source_id_header},
                    row_number > end_row,
                )
            )

        return (
            headers,
            parsed_rows,
            table_root.attrib.get("displayName", sheet_name),
            table_reference,
        )
    except (ET.ParseError, KeyError) as error:
        raise XlsxImportError("Workbook package is missing required XLSX structures") from error
    finally:
        workbook.close()
