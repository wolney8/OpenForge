from __future__ import annotations

import posixpath
import re
import xml.etree.ElementTree as ET
from copy import deepcopy
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from io import BytesIO
from typing import Any, Mapping, Sequence
from zipfile import ZipFile

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML_NS = "http://www.w3.org/XML/1998/namespace"
ET.register_namespace("", MAIN_NS)
ET.register_namespace("r", REL_NS)

FORMULA_CELL_PATTERN = re.compile(r"(?<![A-Za-z0-9_.])(\$?[A-Z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_.(])")
WORKBOOK_ID_PATTERN = re.compile(
    r"^IT(?P<iteration>[1-9]\d*)-(?P<prefix>[A-Z]{2})-(?P<sequence>\d{4,})$"
)
MAX_EXCEL_ROW = 1_048_576
MAX_EXCEL_COLUMN = 16_384


class WorkbookTemplatePackageError(ValueError):
    """Raised when a signed template cannot be populated without structural risk."""


@dataclass(frozen=True)
class WorkbookTemplatePackage:
    content: bytes
    byte_checksum: str
    changed_parts: tuple[str, ...]
    unchanged_part_count: int
    formula_count: int
    formula_cache_count: int
    referenced_shared_string_count: int
    scrubbed_shared_string_count: int
    scrubbed_chart_cache_value_count: int
    table_targets: Mapping[str, str]
    defined_name_targets: Mapping[str, str]


def _serialise(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def split_cell(reference: str) -> tuple[str, int]:
    match = re.fullmatch(r"(\$?[A-Z]+)\$?(\d+)", reference)
    if not match:
        raise WorkbookTemplatePackageError(f"Unsupported cell reference: {reference}")
    return match.group(1), int(match.group(2))


def _column_number(column: str) -> int:
    result = 0
    for character in column.replace("$", ""):
        result = result * 26 + ord(character) - 64
    return result


def _column_name(index: int) -> str:
    if index < 1 or index > MAX_EXCEL_COLUMN:
        raise WorkbookTemplatePackageError(f"Invalid worksheet column: {index}")
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def parse_range(reference: str) -> tuple[int, int, int, int]:
    match = re.fullmatch(r"\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)", reference)
    if not match:
        raise WorkbookTemplatePackageError(f"Unsupported range reference: {reference}")
    return (
        _column_number(match.group(1)),
        int(match.group(2)),
        _column_number(match.group(3)),
        int(match.group(4)),
    )


def normalise_header(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().casefold())


def _translate_unquoted_formula_segment(segment: str, row_delta: int) -> str:
    def replace(match: re.Match[str]) -> str:
        column, absolute, row = match.groups()
        if _column_number(column) > MAX_EXCEL_COLUMN:
            return match.group(0)
        translated_row = int(row) if absolute else int(row) + row_delta
        if translated_row < 1 or translated_row > MAX_EXCEL_ROW:
            raise WorkbookTemplatePackageError(
                "Formula translation would create an invalid row reference"
            )
        return f"{column}{absolute}{translated_row}"

    return FORMULA_CELL_PATTERN.sub(replace, segment)


def translate_formula_rows(formula: str, row_delta: int) -> str:
    """Translate bounded relative A1 rows while preserving literals and qualifiers."""
    output: list[str] = []
    unquoted: list[str] = []

    def flush_unquoted() -> None:
        if unquoted:
            output.append(_translate_unquoted_formula_segment("".join(unquoted), row_delta))
            unquoted.clear()

    index = 0
    while index < len(formula):
        character = formula[index]
        if character not in {'"', "'", "["}:
            unquoted.append(character)
            index += 1
            continue
        flush_unquoted()
        start = index
        if character in {'"', "'"}:
            delimiter = character
            index += 1
            while index < len(formula):
                if formula[index] != delimiter:
                    index += 1
                    continue
                if index + 1 < len(formula) and formula[index + 1] == delimiter:
                    index += 2
                    continue
                index += 1
                break
            else:
                raise WorkbookTemplatePackageError("Formula contains an unterminated quoted token")
        else:
            depth = 1
            index += 1
            while index < len(formula) and depth:
                if formula[index] == "[":
                    depth += 1
                elif formula[index] == "]":
                    depth -= 1
                index += 1
            if depth:
                raise WorkbookTemplatePackageError(
                    "Formula contains an unterminated structured reference"
                )
        output.append(formula[start:index])
    flush_unquoted()
    return "".join(output)


def parse_iteration(value: object) -> int:
    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, ValueError) as error:
        raise WorkbookTemplatePackageError(
            "Workbook iteration must be a positive whole number"
        ) from error
    if not parsed.is_finite() or parsed != parsed.to_integral_value() or parsed < 1:
        raise WorkbookTemplatePackageError("Workbook iteration must be a positive whole number")
    return int(parsed)


def allocate_workbook_record_ids(
    *, iteration: int, prefix: str, source_ids: Sequence[str | None]
) -> list[str]:
    if iteration < 1 or not re.fullmatch(r"[A-Z]{2}", prefix):
        raise WorkbookTemplatePackageError("Workbook ID allocation configuration is invalid")
    result: list[str | None] = []
    seen: set[str] = set()
    maximum = 0
    for source_id in source_ids:
        value = str(source_id or "").strip()
        if not value:
            result.append(None)
            continue
        match = WORKBOOK_ID_PATTERN.fullmatch(value)
        if match is None or match.group("prefix") != prefix:
            raise WorkbookTemplatePackageError(f"Incompatible workbook source identity: {value}")
        if value in seen:
            raise WorkbookTemplatePackageError(f"Duplicate workbook source identity: {value}")
        seen.add(value)
        if int(match.group("iteration")) == iteration:
            maximum = max(maximum, int(match.group("sequence")))
        result.append(value)

    allocated: list[str] = []
    for candidate_value in result:
        if candidate_value is None:
            maximum += 1
            candidate_value = f"IT{iteration}-{prefix}-{maximum:04d}"
        allocated.append(candidate_value)
    return allocated


def _extend_ending_row(value: str, old_end: int, new_end: int) -> str:
    return re.sub(rf"(\$?[A-Z]+\$?){old_end}(?!\d)", rf"\g<1>{new_end}", value)


def extend_table_owned_sqref(
    value: str,
    *,
    table_start_column: int,
    table_end_column: int,
    old_end: int,
    new_end: int,
) -> str:
    references: list[str] = []
    for reference in value.split():
        if ":" not in reference:
            references.append(reference)
            continue
        start, end = reference.split(":", 1)
        try:
            start_column, start_row = split_cell(start)
            end_column, end_row = split_cell(end)
        except WorkbookTemplatePackageError:
            references.append(reference)
            continue
        start_index = _column_number(start_column)
        end_index = _column_number(end_column)
        if (
            end_row == old_end
            and start_row <= old_end
            and table_start_column <= start_index <= table_end_column
            and table_start_column <= end_index <= table_end_column
        ):
            references.append(_extend_ending_row(reference, old_end, new_end))
        else:
            references.append(reference)
    return " ".join(references)


def _shared_strings(payload: Mapping[str, bytes]) -> list[str]:
    if "xl/sharedStrings.xml" not in payload:
        return []
    root = ET.fromstring(payload["xl/sharedStrings.xml"])
    return [
        "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
        for item in root.findall(f"{{{MAIN_NS}}}si")
    ]


def _cell_value(cell: ET.Element | None, strings: Sequence[str]) -> str | None:
    if cell is None:
        return None
    value = cell.find(f"{{{MAIN_NS}}}v")
    if cell.get("t") == "s" and value is not None:
        return strings[int(str(value.text))]
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
    return value.text if value is not None else None


def _clear_cell_value(cell: ET.Element, *, preserve_formula: bool = True) -> None:
    for child in list(cell):
        if child.tag in {f"{{{MAIN_NS}}}v", f"{{{MAIN_NS}}}is"} or (
            not preserve_formula and child.tag == f"{{{MAIN_NS}}}f"
        ):
            cell.remove(child)
    if not preserve_formula or cell.find(f"{{{MAIN_NS}}}f") is None:
        cell.attrib.pop("t", None)


def _set_inline_string(cell: ET.Element, value: str) -> None:
    _clear_cell_value(cell, preserve_formula=False)
    cell.set("t", "inlineStr")
    inline = ET.SubElement(cell, f"{{{MAIN_NS}}}is")
    text = ET.SubElement(inline, f"{{{MAIN_NS}}}t")
    if value != value.strip():
        text.set(f"{{{XML_NS}}}space", "preserve")
    text.text = value


def _canonical_decimal(value: object) -> str:
    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, ValueError) as error:
        raise WorkbookTemplatePackageError(f"Invalid decimal workbook value: {value!r}") from error
    if not parsed.is_finite():
        raise WorkbookTemplatePackageError("Workbook decimal values must be finite")
    return format(parsed, "f")


def _canonical_integer(value: object) -> str:
    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, ValueError) as error:
        raise WorkbookTemplatePackageError(f"Invalid integer workbook value: {value!r}") from error
    if not parsed.is_finite() or parsed != parsed.to_integral_value():
        raise WorkbookTemplatePackageError(f"Invalid integer workbook value: {value!r}")
    return str(int(parsed))


def _excel_serial(value: object, *, allow_empty: bool) -> str | None:
    text = str(value or "").strip()
    if not text and allow_empty:
        return None
    try:
        parsed: date | datetime
        if "T" in text or " " in text:
            parsed_datetime = datetime.fromisoformat(text.replace("Z", "+00:00"))
            if parsed_datetime.tzinfo is not None:
                parsed_datetime = parsed_datetime.astimezone(UTC).replace(tzinfo=None)
            parsed = parsed_datetime
        else:
            parsed = date.fromisoformat(text)
    except ValueError as error:
        raise WorkbookTemplatePackageError(f"Invalid workbook date value: {text!r}") from error
    epoch = datetime(1899, 12, 30)
    point = (
        datetime.combine(parsed, datetime.min.time())
        if isinstance(parsed, date) and not isinstance(parsed, datetime)
        else parsed
    )
    delta = point - epoch
    return format(Decimal(delta.days) + Decimal(delta.seconds) / Decimal(86400), "f")


def _set_cell_value(cell: ET.Element, value: object, encoding: str) -> None:
    allow_empty = encoding.endswith("_or_empty")
    base_encoding = encoding.removesuffix("_or_empty")
    if value is None or (allow_empty and str(value).strip() == ""):
        _clear_cell_value(cell, preserve_formula=False)
        return
    if base_encoding == "text":
        _set_inline_string(cell, str(value))
        return
    _clear_cell_value(cell, preserve_formula=False)
    number = ET.SubElement(cell, f"{{{MAIN_NS}}}v")
    if base_encoding == "boolean":
        cell.set("t", "b")
        number.text = "1" if bool(value) else "0"
    elif base_encoding == "integer":
        cell.attrib.pop("t", None)
        number.text = _canonical_integer(value)
    elif base_encoding == "decimal":
        cell.attrib.pop("t", None)
        number.text = _canonical_decimal(value)
    elif base_encoding in {"date", "datetime"}:
        cell.attrib.pop("t", None)
        serial = _excel_serial(value, allow_empty=allow_empty)
        if serial is None:
            cell.remove(number)
        else:
            number.text = serial
    else:
        raise WorkbookTemplatePackageError(f"Unsupported workbook value encoding: {encoding}")


def _sheet_paths(payload: Mapping[str, bytes]) -> dict[str, str]:
    workbook = ET.fromstring(payload["xl/workbook.xml"])
    relationships = ET.fromstring(payload["xl/_rels/workbook.xml.rels"])
    targets = {entry.get("Id"): entry.get("Target") for entry in relationships}
    return {
        str(sheet.get("name")): (
            "xl/" + str(targets[sheet.get(f"{{{REL_NS}}}id")]).lstrip("/")
        ).replace("xl/xl/", "xl/")
        for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet")
    }


def _table_map(
    payload: Mapping[str, bytes], sheet_paths: Mapping[str, str]
) -> dict[str, list[tuple[str, str, ET.Element]]]:
    result: dict[str, list[tuple[str, str, ET.Element]]] = {}
    for sheet_name, worksheet in sheet_paths.items():
        relationship_part = (
            worksheet.rsplit("/", 1)[0] + "/_rels/" + worksheet.rsplit("/", 1)[1] + ".rels"
        )
        if relationship_part not in payload:
            continue
        relationships = ET.fromstring(payload[relationship_part])
        targets = {entry.get("Id"): entry.get("Target") for entry in relationships}
        sheet_root = ET.fromstring(payload[worksheet])
        for table_part in sheet_root.findall(f".//{{{MAIN_NS}}}tablePart"):
            target = str(targets[table_part.get(f"{{{REL_NS}}}id")])
            table_path = posixpath.normpath(worksheet.rsplit("/", 1)[0] + "/" + target)
            result.setdefault(sheet_name, []).append(
                (worksheet, table_path, ET.fromstring(payload[table_path]))
            )
    return result


def _table_candidate(
    tables: Mapping[str, Sequence[tuple[str, str, ET.Element]]],
    sheet_name: str,
    table_name: str,
) -> tuple[str, str, ET.Element]:
    candidates = [item for item in tables.get(sheet_name, ()) if item[2].get("name") == table_name]
    if len(candidates) != 1:
        raise WorkbookTemplatePackageError(
            f"Expected one {table_name} table for {sheet_name}; found {len(candidates)}"
        )
    return candidates[0]


def _rows_by_number(root: ET.Element) -> dict[int, ET.Element]:
    return {
        int(str(row.get("r"))): row
        for row in root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row")
    }


def _cells_by_column(row: ET.Element) -> dict[str, ET.Element]:
    return {
        split_cell(str(cell.get("r")))[0].replace("$", ""): cell
        for cell in row.findall(f"{{{MAIN_NS}}}c")
    }


def _shared_formula_masters(root: ET.Element) -> dict[str, tuple[str, str]]:
    masters: dict[str, tuple[str, str]] = {}
    for cell in root.findall(f".//{{{MAIN_NS}}}c"):
        formula = cell.find(f"{{{MAIN_NS}}}f")
        if formula is None or formula.get("t") != "shared" or not formula.text:
            continue
        shared_index = formula.get("si")
        if not shared_index or shared_index in masters:
            raise WorkbookTemplatePackageError(
                "Shared formula master identity is missing or duplicated"
            )
        masters[shared_index] = (str(cell.get("r")), formula.text)
    return masters


def materialise_cloned_formula(
    formula: ET.Element,
    *,
    template_reference: str,
    target_reference: str,
    shared_masters: Mapping[str, tuple[str, str]],
) -> None:
    formula_type = formula.get("t", "normal")
    origin_reference: str
    formula_text: str
    if formula_type == "shared":
        shared_index = formula.get("si")
        if shared_index is None or shared_index not in shared_masters:
            raise WorkbookTemplatePackageError("Shared formula follower has no source master")
        origin_reference, formula_text = shared_masters[shared_index]
    elif formula_type == "normal":
        origin_reference = template_reference
        source_formula_text = formula.text
        if not source_formula_text:
            raise WorkbookTemplatePackageError("Formula template cell has no formula text")
        formula_text = source_formula_text
    else:
        raise WorkbookTemplatePackageError(f"Unsupported cloned formula type: {formula_type}")
    _, origin_row = split_cell(origin_reference)
    _, target_row = split_cell(target_reference)
    formula.attrib.clear()
    formula.text = translate_formula_rows(formula_text, target_row - origin_row)


def _replace_row(sheet_data: ET.Element, existing: ET.Element | None, row: ET.Element) -> None:
    if existing is not None:
        index = list(sheet_data).index(existing)
        sheet_data.remove(existing)
        sheet_data.insert(index, row)
        return
    for index, candidate in enumerate(list(sheet_data)):
        if int(str(candidate.get("r"))) > int(str(row.get("r"))):
            sheet_data.insert(index, row)
            return
    sheet_data.append(row)


def _find_template_row(
    rows: Mapping[int, ET.Element],
    *,
    start_row: int,
    old_end: int,
    formula_columns: set[int],
) -> int:
    for row_number in range(old_end, start_row, -1):
        cells = _cells_by_column(rows[row_number])
        if all(
            (cell := cells.get(_column_name(column))) is not None
            and cell.find(f"{{{MAIN_NS}}}f") is not None
            for column in formula_columns
        ):
            return row_number
    if formula_columns:
        raise WorkbookTemplatePackageError("No structurally complete formula template row exists")
    return old_end


def _resize_worksheet_ranges(
    root: ET.Element,
    *,
    start_column: int,
    end_column: int,
    old_end: int,
    new_end: int,
) -> None:
    nodes = list(root.findall(f".//{{{MAIN_NS}}}dataValidation"))
    nodes.extend(root.findall(f".//{{{MAIN_NS}}}conditionalFormatting"))
    for node in nodes:
        value = node.get("sqref")
        if value:
            node.set(
                "sqref",
                extend_table_owned_sqref(
                    value,
                    table_start_column=start_column,
                    table_end_column=end_column,
                    old_end=old_end,
                    new_end=new_end,
                ),
            )


def _clear_table_body(
    payload: dict[str, bytes],
    tables: Mapping[str, Sequence[tuple[str, str, ET.Element]]],
    *,
    sheet_name: str,
    table_name: str,
) -> None:
    worksheet, _, table = _table_candidate(tables, sheet_name, table_name)
    start_column, start_row, end_column, end_row = parse_range(str(table.get("ref")))
    root = ET.fromstring(payload[worksheet])
    for row in root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row"):
        row_number = int(str(row.get("r")))
        if row_number <= start_row or row_number > end_row:
            continue
        for cell in row.findall(f"{{{MAIN_NS}}}c"):
            column = _column_number(split_cell(str(cell.get("r")))[0])
            if start_column <= column <= end_column:
                _clear_cell_value(cell, preserve_formula=False)
    payload[worksheet] = _serialise(root)


def _write_control_cells(
    payload: dict[str, bytes],
    sheet_paths: Mapping[str, str],
    values: Mapping[str, Mapping[str, tuple[object, str]]],
    cleared: Mapping[str, Sequence[str]],
) -> None:
    for sheet_name in set(values) | set(cleared):
        if sheet_name not in sheet_paths:
            raise WorkbookTemplatePackageError(f"Required control sheet is missing: {sheet_name}")
        path = sheet_paths[sheet_name]
        root = ET.fromstring(payload[path])
        for reference, (value, encoding) in values.get(sheet_name, {}).items():
            cell = root.find(f".//{{{MAIN_NS}}}c[@r='{reference}']")
            if cell is None:
                raise WorkbookTemplatePackageError(
                    f"Required control cell is missing: {sheet_name}!{reference}"
                )
            _set_cell_value(cell, value, encoding)
        for reference in cleared.get(sheet_name, ()):
            cell = root.find(f".//{{{MAIN_NS}}}c[@r='{reference}']")
            if cell is not None:
                _clear_cell_value(cell, preserve_formula=False)
        payload[path] = _serialise(root)


def _write_exchange_commissions(
    payload: dict[str, bytes],
    sheet_paths: Mapping[str, str],
    rows: Sequence[tuple[str, object]],
) -> None:
    if len(rows) > 1000:
        raise WorkbookTemplatePackageError("Exchange commission range capacity exceeded")
    path = sheet_paths.get("Settings")
    if path is None:
        raise WorkbookTemplatePackageError("Settings sheet is missing")
    root = ET.fromstring(payload[path])
    rows_by_number = _rows_by_number(root)
    for row_number in range(3, 1003):
        cells = _cells_by_column(rows_by_number[row_number])
        for column in ("H", "I"):
            _clear_cell_value(cells[column], preserve_formula=False)
    for offset, (exchange, rate) in enumerate(rows):
        cells = _cells_by_column(rows_by_number[3 + offset])
        _set_cell_value(cells["H"], exchange, "text")
        _set_cell_value(cells["I"], rate, "decimal")
    payload[path] = _serialise(root)


def _clear_formula_caches(payload: dict[str, bytes]) -> int:
    cleared = 0
    for path in sorted(
        name for name in payload if name.startswith("xl/worksheets/") and name.endswith(".xml")
    ):
        root = ET.fromstring(payload[path])
        changed = False
        for cell in root.findall(f".//{{{MAIN_NS}}}c"):
            if cell.find(f"{{{MAIN_NS}}}f") is None:
                continue
            value = cell.find(f"{{{MAIN_NS}}}v")
            if value is not None:
                cell.remove(value)
                cleared += 1
                changed = True
        if changed:
            payload[path] = _serialise(root)
    return cleared


def _scrub_unreferenced_shared_strings(payload: dict[str, bytes]) -> tuple[int, int]:
    if "xl/sharedStrings.xml" not in payload:
        return 0, 0
    referenced: set[int] = set()
    for path in (
        name for name in payload if name.startswith("xl/worksheets/") and name.endswith(".xml")
    ):
        root = ET.fromstring(payload[path])
        for cell in root.findall(f".//{{{MAIN_NS}}}c[@t='s']"):
            value = cell.find(f"{{{MAIN_NS}}}v")
            if value is not None:
                referenced.add(int(str(value.text)))
    root = ET.fromstring(payload["xl/sharedStrings.xml"])
    scrubbed = 0
    for index, item in enumerate(root.findall(f"{{{MAIN_NS}}}si")):
        if index in referenced:
            continue
        for child in list(item):
            item.remove(child)
        ET.SubElement(item, f"{{{MAIN_NS}}}t").text = ""
        scrubbed += 1
    payload["xl/sharedStrings.xml"] = _serialise(root)
    return len(referenced), scrubbed


def _reject_nonempty_person_metadata(payload: Mapping[str, bytes]) -> None:
    for path in [
        name for name in payload if name.startswith("xl/persons/") and name.endswith(".xml")
    ]:
        root = ET.fromstring(payload[path])
        if root.attrib or (root.text and root.text.strip()) or list(root):
            raise WorkbookTemplatePackageError(
                "Workbook templates containing person metadata require an approved "
                "sanitization boundary"
            )


def _clear_chart_caches(payload: dict[str, bytes]) -> int:
    cleared = 0
    cache_names = {"numCache", "strCache", "multiLvlStrCache"}
    for path in sorted(
        name for name in payload if name.startswith("xl/charts/") and name.endswith(".xml")
    ):
        root = ET.fromstring(payload[path])
        changed = False
        for cache in root.iter():
            if cache.tag.rsplit("}", 1)[-1] not in cache_names:
                continue
            for child in list(cache):
                local_name = child.tag.rsplit("}", 1)[-1]
                if local_name == "pt":
                    cache.remove(child)
                    cleared += 1
                    changed = True
                elif local_name == "ptCount" and child.get("val") != "0":
                    child.set("val", "0")
                    changed = True
        if changed:
            payload[path] = _serialise(root)
    return cleared


def _formula_stats(payload: Mapping[str, bytes]) -> tuple[int, int]:
    formulas = caches = 0
    for path in (
        name for name in payload if name.startswith("xl/worksheets/") and name.endswith(".xml")
    ):
        root = ET.fromstring(payload[path])
        formulas += len(root.findall(f".//{{{MAIN_NS}}}f"))
        caches += sum(
            1
            for cell in root.findall(f".//{{{MAIN_NS}}}c")
            if cell.find(f"{{{MAIN_NS}}}f") is not None and cell.find(f"{{{MAIN_NS}}}v") is not None
        )
    return formulas, caches


def build_workbook_template_package(
    *,
    source_content: bytes,
    structure: Mapping[str, Any],
    coverage: Mapping[str, Any],
    ledger_rows: Mapping[str, Sequence[Mapping[str, object]]],
    control_values: Mapping[str, Mapping[str, tuple[object, str]]],
    exchange_commissions: Sequence[tuple[str, object]],
) -> WorkbookTemplatePackage:
    if sha256(source_content).hexdigest() != coverage["source_template_sha256"]:
        raise WorkbookTemplatePackageError("Workbook template fingerprint is not approved")
    if structure.get("contract") != "workbook-template-export-v1" or coverage.get(
        "contract"
    ) != structure.get("contract"):
        raise WorkbookTemplatePackageError("Workbook template contract identity is invalid")
    with ZipFile(BytesIO(source_content)) as archive:
        infos = archive.infolist()
        original = {info.filename: archive.read(info.filename) for info in infos}
    comment_parts = [
        name
        for name in original
        if "comments" in name.casefold() or "threadedcomment" in name.casefold()
    ]
    if comment_parts:
        raise WorkbookTemplatePackageError(
            "Workbook templates containing comments require an approved sanitization boundary"
        )
    _reject_nonempty_person_metadata(original)

    payload = dict(original)
    sheet_paths = _sheet_paths(payload)
    tables = _table_map(payload, sheet_paths)
    table_targets: dict[str, str] = {}
    authorized_table_parts: set[str] = set()
    original_extents: dict[str, tuple[int, int, int, int]] = {}

    for sheet_name, ledger in structure["ledgers"].items():
        rows_to_write = list(ledger_rows.get(sheet_name, ()))
        worksheet, table_path, table = _table_candidate(
            tables, sheet_name, str(ledger["table_name"])
        )
        authorized_table_parts.add(table_path)
        headers = [
            str(column.get("name")) for column in table.findall(f".//{{{MAIN_NS}}}tableColumn")
        ]
        normalized = [normalise_header(header) for header in headers]
        if len(normalized) != len(set(normalized)) or normalized != [
            normalise_header(header) for header in ledger["required_headers"]
        ]:
            raise WorkbookTemplatePackageError(f"Workbook header drift detected for {sheet_name}")
        allowed = set(ledger["authoritative_input_headers"]) | set(ledger["id_system_headers"])
        encodings = {
            header: spec["encoding"]
            for header, spec in coverage["ledgers"][sheet_name]["columns"].items()
        }
        if set(encodings) != allowed:
            raise WorkbookTemplatePackageError(
                f"Workbook field coverage is incomplete for {sheet_name}"
            )
        for row in rows_to_write:
            unexpected = set(row) - allowed
            missing = allowed - set(row)
            if unexpected or missing:
                raise WorkbookTemplatePackageError(
                    f"Projection coverage mismatch for {sheet_name}; "
                    f"missing={sorted(missing)} unexpected={sorted(unexpected)}"
                )

        start_column, start_row, end_column, old_end = parse_range(str(table.get("ref")))
        original_extents[sheet_name] = (start_column, start_row, end_column, old_end)
        target_body_count = max(1, len(rows_to_write))
        new_end = start_row + target_body_count
        if new_end > MAX_EXCEL_ROW:
            raise WorkbookTemplatePackageError(f"Workbook capacity exceeded for {sheet_name}")
        root = ET.fromstring(payload[worksheet])
        rows = _rows_by_number(root)
        header_columns = {
            normalise_header(header): index for index, header in enumerate(headers, start=1)
        }
        formula_columns = {
            header_columns[normalise_header(header)] for header in ledger["formula_helper_headers"]
        }
        template_row_number = _find_template_row(
            rows,
            start_row=start_row,
            old_end=old_end,
            formula_columns=formula_columns,
        )
        template_row = rows[template_row_number]
        shared_masters = _shared_formula_masters(root)
        sheet_data = root.find(f".//{{{MAIN_NS}}}sheetData")
        if sheet_data is None:
            raise WorkbookTemplatePackageError(f"Worksheet data is missing for {sheet_name}")
        for offset in range(target_body_count):
            row_number = start_row + 1 + offset
            clone = deepcopy(template_row)
            clone.set("r", str(row_number))
            clone_cells = _cells_by_column(clone)
            projection = rows_to_write[offset] if offset < len(rows_to_write) else {}
            for column_index, header in enumerate(headers, start=1):
                column = _column_name(column_index)
                cell = clone_cells.get(column)
                if cell is None:
                    raise WorkbookTemplatePackageError(
                        f"Template row is missing {sheet_name} column {column}"
                    )
                old_reference = str(cell.get("r"))
                new_reference = f"{column}{row_number}"
                cell.set("r", new_reference)
                formula = cell.find(f"{{{MAIN_NS}}}f")
                if formula is not None:
                    materialise_cloned_formula(
                        formula,
                        template_reference=old_reference,
                        target_reference=new_reference,
                        shared_masters=shared_masters,
                    )
                    _clear_cell_value(cell)
                elif header in allowed:
                    if header in projection:
                        _set_cell_value(cell, projection[header], encodings[header])
                    else:
                        _clear_cell_value(cell, preserve_formula=False)
                else:
                    _clear_cell_value(cell, preserve_formula=False)
            actual_formula_columns = {
                _column_number(column)
                for column, cell in _cells_by_column(clone).items()
                if cell.find(f"{{{MAIN_NS}}}f") is not None
            }
            if actual_formula_columns != formula_columns:
                raise WorkbookTemplatePackageError(
                    f"Formula ownership drift detected for {sheet_name} row {row_number}"
                )
            _replace_row(sheet_data, rows.get(row_number), clone)

        for row_number in range(new_end + 1, old_end + 1):
            row_element = rows.get(row_number)
            if row_element is None:
                continue
            for cell in row_element.findall(f"{{{MAIN_NS}}}c"):
                column_index = _column_number(split_cell(str(cell.get("r")))[0])
                if start_column <= column_index <= end_column:
                    _clear_cell_value(cell, preserve_formula=True)

        _resize_worksheet_ranges(
            root,
            start_column=start_column,
            end_column=end_column,
            old_end=old_end,
            new_end=new_end,
        )
        table.set(
            "ref", f"{_column_name(start_column)}{start_row}:{_column_name(end_column)}{new_end}"
        )
        auto_filter = table.find(f"{{{MAIN_NS}}}autoFilter")
        if auto_filter is not None:
            auto_filter.set("ref", str(table.get("ref")))
        payload[worksheet] = _serialise(root)
        payload[table_path] = _serialise(table)
        table_targets[sheet_name] = str(table.get("ref"))

    workbook = ET.fromstring(payload["xl/workbook.xml"])
    names = {
        (str(item.get("name")), str(item.get("localSheetId", ""))): item
        for item in workbook.findall(f".//{{{MAIN_NS}}}definedName")
        if item.text
    }
    defined_name_targets: dict[str, str] = {}
    for sheet_name, ledger in structure["ledgers"].items():
        _, _, _, old_end = original_extents[sheet_name]
        new_end = parse_range(table_targets[sheet_name])[3]
        for spec in ledger.get("growth_defined_names", []):
            identity = (str(spec["name"]), str(spec.get("local_sheet_id", "")))
            item = names.get(identity)
            if item is None or item.text != spec["source_reference"]:
                raise WorkbookTemplatePackageError(f"Defined-name source drift for {identity[0]}")
            item.text = _extend_ending_row(str(item.text), old_end, new_end)
            defined_name_targets[f"{identity[0]}|{identity[1]}"] = str(item.text)
    calculation = workbook.find(f"{{{MAIN_NS}}}calcPr")
    if calculation is not None:
        calculation.set("fullCalcOnLoad", "1")
        calculation.set("forceFullCalc", "1")
        calculation.set("calcMode", "auto")
    payload["xl/workbook.xml"] = _serialise(workbook)

    for spec in coverage["sanitization"]["clear_table_bodies"]:
        _clear_table_body(
            payload,
            tables,
            sheet_name=str(spec["sheet"]),
            table_name=str(spec["table"]),
        )
    _write_control_cells(
        payload,
        sheet_paths,
        control_values,
        coverage["cleared_unmodelled_control_cells"],
    )
    _write_exchange_commissions(payload, sheet_paths, exchange_commissions)
    _clear_formula_caches(payload)
    scrubbed_chart_values = _clear_chart_caches(payload)
    referenced_strings, scrubbed_strings = _scrub_unreferenced_shared_strings(payload)
    formulas, formula_caches = _formula_stats(payload)
    if formula_caches:
        raise WorkbookTemplatePackageError("Formula caches were not fully sanitized")

    output = BytesIO()
    with ZipFile(output, "w") as archive:
        for info in infos:
            archive.writestr(info, payload[info.filename])
    content = output.getvalue()
    changed = tuple(sorted(name for name in payload if payload[name] != original[name]))
    allowed_changed_parts = {
        "xl/workbook.xml",
        "xl/sharedStrings.xml",
        *sheet_paths.values(),
        *(name for name in payload if name.startswith("xl/charts/") and name.endswith(".xml")),
        *authorized_table_parts,
    }
    unexpected_changed_parts = set(changed) - allowed_changed_parts
    if unexpected_changed_parts:
        raise WorkbookTemplatePackageError(
            "Workbook package changes exceeded the approved sanitization boundary: "
            + ", ".join(sorted(unexpected_changed_parts))
        )
    return WorkbookTemplatePackage(
        content=content,
        byte_checksum=sha256(content).hexdigest(),
        changed_parts=changed,
        unchanged_part_count=len(payload) - len(changed),
        formula_count=formulas,
        formula_cache_count=formula_caches,
        referenced_shared_string_count=referenced_strings,
        scrubbed_shared_string_count=scrubbed_strings,
        scrubbed_chart_cache_value_count=scrubbed_chart_values,
        table_targets=table_targets,
        defined_name_targets=defined_name_targets,
    )
