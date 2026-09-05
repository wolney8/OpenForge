#!/usr/bin/env python3
"""Disposable package-preservation probe for workbook-template-export-v1."""

from __future__ import annotations

import argparse
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import posixpath
import re
import sys
from tempfile import TemporaryDirectory
import xml.etree.ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

from workbook_template_structure import normalise_header, parse_range, split_cell

API_SOURCE = Path(__file__).resolve().parents[1] / "apps" / "api" / "src"
if str(API_SOURCE) not in sys.path:
    sys.path.insert(0, str(API_SOURCE))

from openforge_api.workbook_template_package import (  # noqa: E402
    allocate_workbook_record_ids as package_allocate_workbook_record_ids,
    extend_table_owned_sqref as package_extend_table_owned_sqref,
    materialise_cloned_formula as package_materialise_cloned_formula,
    parse_iteration as package_parse_iteration,
    translate_formula_rows as package_translate_formula_rows,
)


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML_NS = "http://www.w3.org/XML/1998/namespace"
ET.register_namespace("", MAIN_NS)
ET.register_namespace("r", REL_NS)
WORKBOOK_ID_PATTERN = re.compile(
    r"^IT(?P<iteration>[1-9]\d*)-(?P<prefix>[A-Z]{2})-(?P<sequence>\d{4,})$"
)


def _serialise(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def _shared_strings(archive: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return [
        "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
        for item in root.findall(f"{{{MAIN_NS}}}si")
    ]


def _cell_value(cell: ET.Element | None, strings: list[str]) -> str | None:
    if cell is None:
        return None
    value = cell.find(f"{{{MAIN_NS}}}v")
    if cell.get("t") == "s" and value is not None:
        return strings[int(value.text)]
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
    return value.text if value is not None else None


def _set_inline_string(cell: ET.Element, value: str) -> None:
    for child in list(cell):
        if child.tag in {
            f"{{{MAIN_NS}}}f",
            f"{{{MAIN_NS}}}v",
            f"{{{MAIN_NS}}}is",
        }:
            cell.remove(child)
    cell.set("t", "inlineStr")
    inline = ET.SubElement(cell, f"{{{MAIN_NS}}}is")
    text = ET.SubElement(inline, f"{{{MAIN_NS}}}t")
    text.set(f"{{{XML_NS}}}space", "preserve")
    text.text = value


def _clear_value(cell: ET.Element) -> None:
    for child in list(cell):
        if child.tag in {f"{{{MAIN_NS}}}v", f"{{{MAIN_NS}}}is"}:
            cell.remove(child)
    cell.attrib.pop("t", None)


def _cells_by_column(row: ET.Element) -> dict[str, ET.Element]:
    return {
        split_cell(cell.get("r"))[0]: cell for cell in row.findall(f"{{{MAIN_NS}}}c")
    }


def _rows_by_number(root: ET.Element) -> dict[int, ET.Element]:
    return {
        int(row.get("r")): row
        for row in root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row")
    }


def _table_map(
    archive: ZipFile,
) -> dict[str, list[tuple[str, str, ET.Element]]]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    workbook_targets = {entry.get("Id"): entry.get("Target") for entry in relationships}
    result: dict[str, list[tuple[str, str, ET.Element]]] = {}
    for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
        worksheet = (
            "xl/" + workbook_targets[sheet.get(f"{{{REL_NS}}}id")].lstrip("/")
        ).replace("xl/xl/", "xl/")
        relationship_part = (
            worksheet.rsplit("/", 1)[0]
            + "/_rels/"
            + worksheet.rsplit("/", 1)[1]
            + ".rels"
        )
        if relationship_part not in archive.namelist():
            continue
        sheet_relationships = ET.fromstring(archive.read(relationship_part))
        sheet_targets = {
            entry.get("Id"): entry.get("Target") for entry in sheet_relationships
        }
        sheet_root = ET.fromstring(archive.read(worksheet))
        for table_part in sheet_root.findall(f".//{{{MAIN_NS}}}tablePart"):
            target = sheet_targets[table_part.get(f"{{{REL_NS}}}id")]
            table_path = posixpath.normpath(worksheet.rsplit("/", 1)[0] + "/" + target)
            sheet_name = str(sheet.get("name"))
            result.setdefault(sheet_name, []).append(
                (
                    worksheet,
                    table_path,
                    ET.fromstring(archive.read(table_path)),
                )
            )
    return result


def _extend_ending_row(value: str, old_end: int, new_end: int) -> str:
    return re.sub(
        rf"(\$?[A-Z]+\$?){old_end}(?!\d)",
        rf"\g<1>{new_end}",
        value,
    )


def _shared_formula_masters(root: ET.Element) -> dict[str, tuple[str, str]]:
    masters: dict[str, tuple[str, str]] = {}
    for cell in root.findall(f".//{{{MAIN_NS}}}c"):
        formula = cell.find(f"{{{MAIN_NS}}}f")
        if formula is None or formula.get("t") != "shared" or not formula.text:
            continue
        shared_index = formula.get("si")
        if not shared_index or shared_index in masters:
            raise ValueError("Shared formula master identity is missing or duplicated")
        masters[shared_index] = (str(cell.get("r")), formula.text)
    return masters


# The production package writer owns the hardened primitives. These aliases keep the historical
# disposable probe and its focused tests on exactly the same implementation path.
_translate_formula_rows = package_translate_formula_rows
_materialise_cloned_formula = package_materialise_cloned_formula
_extend_table_owned_sqref = package_extend_table_owned_sqref
parse_iteration = package_parse_iteration
allocate_workbook_record_ids = package_allocate_workbook_record_ids


def _workbook_iteration(archive: ZipFile, strings: list[str]) -> int:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {entry.get("Id"): entry.get("Target") for entry in relationships}
    dashboard = next(
        (
            sheet
            for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet")
            if sheet.get("name") == "Dashboard"
        ),
        None,
    )
    if dashboard is None:
        raise ValueError("Dashboard sheet is unavailable")
    worksheet = (
        "xl/" + str(targets[dashboard.get(f"{{{REL_NS}}}id")]).lstrip("/")
    ).replace("xl/xl/", "xl/")
    root = ET.fromstring(archive.read(worksheet))
    cell = root.find(f".//{{{MAIN_NS}}}c[@r='B7']")
    return parse_iteration(_cell_value(cell, strings))


def _formula_count(archive: ZipFile) -> int:
    return sum(
        len(ET.fromstring(archive.read(name)).findall(f".//{{{MAIN_NS}}}f"))
        for name in archive.namelist()
        if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
    )


def run_probe(
    source: Path, manifest: dict[str, object], rows_to_add: int
) -> dict[str, object]:
    if rows_to_add < 1:
        raise ValueError("Growth probe must add at least one row")
    source_hash = sha256(source.read_bytes()).hexdigest()
    with TemporaryDirectory(prefix="workbook-template-export-v1-growth-") as directory:
        output = Path(directory) / "disposable-growth.xlsx"
        with ZipFile(source) as archive:
            payload = {name: archive.read(name) for name in archive.namelist()}
            strings = _shared_strings(archive)
            tables = _table_map(archive)
            iteration = _workbook_iteration(archive, strings)
            expected_changed = {"xl/workbook.xml"}
            growth = {}
            original_extents: dict[str, tuple[int, int, int, int]] = {}

            for sheet_name, ledger in manifest["ledgers"].items():
                table_candidates = [
                    candidate
                    for candidate in tables[sheet_name]
                    if candidate[2].get("name") == ledger["table_name"]
                ]
                if len(table_candidates) != 1:
                    raise ValueError(
                        f"Expected one {ledger['table_name']} table for {sheet_name}; "
                        f"found {len(table_candidates)}"
                    )
                worksheet, table_path, table_root = table_candidates[0]
                if table_root.get("name") != ledger["table_name"]:
                    raise ValueError(f"Unexpected table identity for {sheet_name}")
                expected_changed.update({worksheet, table_path})
                sheet_root = ET.fromstring(payload[worksheet])
                rows = _rows_by_number(sheet_root)
                headers = [
                    str(column.get("name"))
                    for column in table_root.findall(f".//{{{MAIN_NS}}}tableColumn")
                ]
                header_columns = {
                    normalise_header(header): index
                    for index, header in enumerate(headers, start=1)
                }
                start_column, start_row, end_column, old_end = parse_range(
                    str(table_root.get("ref"))
                )
                new_end = old_end + rows_to_add
                original_extents[sheet_name] = (
                    start_column,
                    start_row,
                    end_column,
                    old_end,
                )
                formula_headers = ledger["formula_helper_headers"]
                formula_columns = {
                    header_columns[normalise_header(header)]
                    for header in formula_headers
                }
                template_row = next(
                    (
                        candidate
                        for candidate in range(old_end, start_row, -1)
                        if all(
                            (
                                cell := _cells_by_column(rows[candidate]).get(
                                    _column_name(column)
                                )
                            )
                            is not None
                            and cell.find(f"{{{MAIN_NS}}}f") is not None
                            for column in formula_columns
                        )
                    ),
                    None,
                )
                if template_row is None:
                    raise ValueError(
                        f"No complete formula template row for {sheet_name}"
                    )
                template = rows[template_row]
                template_cells = _cells_by_column(template)
                shared_masters = _shared_formula_masters(sheet_root)

                prefix = ledger["id_prefix"]
                existing_ids = [
                    _cell_value(_cells_by_column(rows[row_number]).get("A"), strings)
                    for row_number in range(start_row + 1, old_end + 1)
                    if _cell_value(_cells_by_column(rows[row_number]).get("A"), strings)
                ]
                allocated_ids = allocate_workbook_record_ids(
                    iteration=iteration,
                    prefix=prefix,
                    source_ids=[*existing_ids, *([None] * rows_to_add)],
                )
                new_ids = allocated_ids[len(existing_ids) :]

                for node in list(
                    sheet_root.findall(f".//{{{MAIN_NS}}}dataValidation")
                ) + [
                    item
                    for item in sheet_root.iter()
                    if item.tag == f"{{{MAIN_NS}}}conditionalFormatting"
                ]:
                    if node.get("sqref"):
                        node.set(
                            "sqref",
                            _extend_table_owned_sqref(
                                str(node.get("sqref")),
                                table_start_column=start_column,
                                table_end_column=end_column,
                                old_end=old_end,
                                new_end=new_end,
                            ),
                        )

                sheet_data = sheet_root.find(f".//{{{MAIN_NS}}}sheetData")
                for offset in range(1, rows_to_add + 1):
                    row_number = old_end + offset
                    clone = deepcopy(template)
                    clone.set("r", str(row_number))
                    for cell in clone.findall(f"{{{MAIN_NS}}}c"):
                        old_reference = cell.get("r")
                        column, _ = split_cell(old_reference)
                        new_reference = f"{column}{row_number}"
                        cell.set("r", new_reference)
                        formula = cell.find(f"{{{MAIN_NS}}}f")
                        if formula is None:
                            _clear_value(cell)
                        else:
                            _materialise_cloned_formula(
                                formula,
                                template_reference=str(old_reference),
                                target_reference=new_reference,
                                shared_masters=shared_masters,
                            )
                            _clear_value(cell)
                    id_cell = _cells_by_column(clone)["A"]
                    _set_inline_string(
                        id_cell,
                        new_ids[offset - 1],
                    )
                    existing = rows.get(row_number)
                    if existing is not None:
                        index = list(sheet_data).index(existing)
                        sheet_data.remove(existing)
                        sheet_data.insert(index, clone)
                    else:
                        sheet_data.append(clone)
                    rows[row_number] = clone
                    clone_cells = _cells_by_column(clone)
                    actual_formula_columns = {
                        index
                        for index in range(1, len(headers) + 1)
                        if clone_cells.get(_column_name(index)) is not None
                        and clone_cells[_column_name(index)].find(f"{{{MAIN_NS}}}f")
                        is not None
                    }
                    if actual_formula_columns != formula_columns:
                        raise ValueError(f"Formula growth mismatch for {sheet_name}")
                    for column, template_cell in template_cells.items():
                        if clone_cells[column].get("s") != template_cell.get("s"):
                            raise ValueError(f"Style growth mismatch for {sheet_name}")

                start, end = str(table_root.get("ref")).split(":", 1)
                end_column, _ = split_cell(end)
                new_reference = f"{start}:{end_column}{new_end}"
                table_root.set("ref", new_reference)
                autofilter = table_root.find(f"{{{MAIN_NS}}}autoFilter")
                if autofilter is not None:
                    autofilter.set("ref", new_reference)
                payload[worksheet] = _serialise(sheet_root)
                payload[table_path] = _serialise(table_root)
                growth[sheet_name] = {
                    "template_row": template_row,
                    "old_end": old_end,
                    "new_end": new_end,
                    "table_reference": str(table_root.get("ref")),
                    "auto_filter_reference": (
                        str(autofilter.get("ref")) if autofilter is not None else None
                    ),
                    "formula_columns": len(formula_columns),
                    "generated_ids": new_ids,
                    "next_manual_sequence": int(
                        WORKBOOK_ID_PATTERN.fullmatch(new_ids[-1]).group("sequence")
                    )
                    + 1,
                }

            workbook = ET.fromstring(payload["xl/workbook.xml"])
            defined_names = {
                (str(item.get("name")), str(item.get("localSheetId", ""))): item
                for item in workbook.findall(f".//{{{MAIN_NS}}}definedName")
                if item.text
            }
            source_defined_names = {
                key: str(item.text) for key, item in defined_names.items()
            }
            authorized_defined_names: set[tuple[str, str]] = set()
            for sheet_name, ledger in manifest["ledgers"].items():
                _, _, _, old_end = original_extents[sheet_name]
                new_end = old_end + rows_to_add
                for name_spec in ledger.get("growth_defined_names", []):
                    name = str(name_spec["name"])
                    local_sheet_id = str(name_spec.get("local_sheet_id", ""))
                    identity = (name, local_sheet_id)
                    if identity in authorized_defined_names:
                        raise ValueError(
                            f"Duplicate defined-name growth authority for {name}"
                        )
                    authorized_defined_names.add(identity)
                    source_reference = str(name_spec["source_reference"])
                    defined_name = defined_names.get(identity)
                    if defined_name is None or defined_name.text != source_reference:
                        raise ValueError(f"Defined-name source drift for {name}")
                    defined_name.text = _extend_ending_row(
                        source_reference, old_end, new_end
                    )
                    expected_reference = _extend_ending_row(
                        source_reference, old_end, new_end
                    )
                    if defined_name.text != expected_reference:
                        raise ValueError(f"Defined-name growth mismatch for {name}")
            actual_defined_changes = {
                identity
                for identity, item in defined_names.items()
                if str(item.text) != source_defined_names[identity]
            }
            if actual_defined_changes != authorized_defined_names:
                raise ValueError(
                    "Defined-name changes exceeded the signed growth authority"
                )
            calculation = workbook.find(f"{{{MAIN_NS}}}calcPr")
            if calculation is not None:
                calculation.set("fullCalcOnLoad", "1")
                calculation.set("forceFullCalc", "1")
            payload["xl/workbook.xml"] = _serialise(workbook)

            with ZipFile(output, "w", ZIP_DEFLATED) as generated:
                for name in archive.namelist():
                    generated.writestr(archive.getinfo(name), payload[name])

        with ZipFile(source) as before, ZipFile(output) as after:
            changed = sorted(
                name
                for name in before.namelist()
                if before.read(name) != after.read(name)
            )
            if set(changed) != expected_changed:
                raise ValueError(
                    f"Unexpected package changes: {sorted(set(changed) ^ expected_changed)}"
                )
            for name in before.namelist():
                if (
                    name.startswith("xl/drawings/")
                    or name.startswith("xl/media/")
                    or "/_rels/" in name
                    or name.startswith("_rels/")
                ) and before.read(name) != after.read(name):
                    raise ValueError(f"Protected package part changed: {name}")
            result = {
                "source_unchanged": sha256(source.read_bytes()).hexdigest()
                == source_hash,
                "source_parts": len(before.namelist()),
                "output_parts": len(after.namelist()),
                "changed_parts": changed,
                "unchanged_parts": len(before.namelist()) - len(changed),
                "formulas_before": _formula_count(before),
                "formulas_after": _formula_count(after),
                "growth": growth,
                "defined_name_targets": {
                    f"{name}|{local_sheet_id}": str(
                        defined_names[(name, local_sheet_id)].text
                    )
                    for name, local_sheet_id in sorted(authorized_defined_names)
                },
                "unchanged_defined_names": len(defined_names)
                - len(actual_defined_changes),
                "disposable_exists_during_probe": output.exists(),
            }
        temporary_path = Path(directory)
    result["disposable_removed"] = not temporary_path.exists()
    return result


def _column_name(index: int) -> str:
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--rows", type=int, default=3)
    arguments = parser.parse_args()
    manifest = json.loads(arguments.manifest.read_text())
    print(
        json.dumps(
            run_probe(arguments.workbook, manifest, arguments.rows),
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
