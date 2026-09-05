#!/usr/bin/env python3
"""Read-only structural validation for workbook-template-export-v1."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import posixpath
import re
import unicodedata
import xml.etree.ElementTree as ET
from zipfile import ZipFile


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
CELL_PATTERN = re.compile(r"^([A-Z]{1,3})(\d+)$")


def sha256_file(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def normalise_header(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    ascii_text = text.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "", ascii_text)


def column_number(column: str) -> int:
    result = 0
    for character in column:
        result = result * 26 + ord(character) - 64
    return result


def split_cell(reference: str) -> tuple[str, int]:
    match = CELL_PATTERN.match(reference.replace("$", ""))
    if match is None:
        raise ValueError(f"Unsupported cell reference: {reference}")
    return match.group(1), int(match.group(2))


def parse_range(reference: str) -> tuple[int, int, int, int]:
    start, end = reference.split(":", 1)
    start_column, start_row = split_cell(start)
    end_column, end_row = split_cell(end)
    return column_number(start_column), start_row, column_number(end_column), end_row


def read_shared_strings(archive: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return [
        "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
        for item in root.findall(f"{{{MAIN_NS}}}si")
    ]


def cell_value(cell: ET.Element | None, strings: list[str]) -> object | None:
    if cell is None:
        return None
    value = cell.find(f"{{{MAIN_NS}}}v")
    if cell.get("t") == "s" and value is not None:
        return strings[int(value.text)]
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
    return value.text if value is not None else None


def _worksheet_part(target: str) -> str:
    return ("xl/" + target.lstrip("/")).replace("xl/xl/", "xl/")


def inspect_workbook(path: Path) -> dict[str, object]:
    with ZipFile(path) as archive:
        strings = read_shared_strings(archive)
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        workbook_rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        workbook_targets = {
            entry.get("Id"): entry.get("Target") for entry in workbook_rels
        }
        sheets: dict[str, dict[str, object]] = {}
        header_cells_audited = 0
        header_collisions: dict[str, list[dict[str, str]]] = {}
        invalid_normalized_headers: dict[str, list[dict[str, str]]] = {}

        for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
            sheet_name = str(sheet.get("name"))
            part = _worksheet_part(workbook_targets[sheet.get(f"{{{REL_NS}}}id")])
            root = ET.fromstring(archive.read(part))
            cells = {cell.get("r"): cell for cell in root.findall(f".//{{{MAIN_NS}}}c")}
            row_one = root.find(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row[@r='1']")
            seen_headers: dict[str, tuple[str, str]] = {}
            collisions = []
            if row_one is not None:
                for cell in row_one.findall(f"{{{MAIN_NS}}}c"):
                    value = cell_value(cell, strings)
                    if value in (None, ""):
                        continue
                    header_cells_audited += 1
                    key = normalise_header(value)
                    if not key:
                        invalid_normalized_headers.setdefault(sheet_name, []).append(
                            {"cell": str(cell.get("r")), "header": str(value)}
                        )
                        continue
                    if key in seen_headers:
                        prior_reference, prior_value = seen_headers[key]
                        collisions.append(
                            {
                                "normalized": key,
                                "first": f"{prior_reference}:{prior_value}",
                                "second": f"{cell.get('r')}:{value}",
                            }
                        )
                    else:
                        seen_headers[key] = (str(cell.get("r")), str(value))
            if collisions:
                header_collisions[sheet_name] = collisions

            tables = []
            relationship_part = (
                part.rsplit("/", 1)[0] + "/_rels/" + part.rsplit("/", 1)[1] + ".rels"
            )
            if relationship_part in archive.namelist():
                relationships = ET.fromstring(archive.read(relationship_part))
                targets = {
                    entry.get("Id"): entry.get("Target") for entry in relationships
                }
                for table_part in root.findall(f".//{{{MAIN_NS}}}tablePart"):
                    target = targets[table_part.get(f"{{{REL_NS}}}id")]
                    table_path = posixpath.normpath(
                        part.rsplit("/", 1)[0] + "/" + target
                    )
                    table_root = ET.fromstring(archive.read(table_path))
                    headers = [
                        str(column.get("name"))
                        for column in table_root.findall(f".//{{{MAIN_NS}}}tableColumn")
                    ]
                    _, start_row, _, end_row = parse_range(str(table_root.get("ref")))
                    formulas_by_header: dict[str, list[int]] = {}
                    for index, header in enumerate(headers, start=1):
                        formula_rows = []
                        for row_number in range(start_row + 1, end_row + 1):
                            column = _column_name(index)
                            cell = cells.get(f"{column}{row_number}")
                            if (
                                cell is not None
                                and cell.find(f"{{{MAIN_NS}}}f") is not None
                            ):
                                formula_rows.append(row_number)
                        if formula_rows:
                            formulas_by_header[header] = formula_rows
                    tables.append(
                        {
                            "name": table_root.get("name"),
                            "part": table_path,
                            "ref": table_root.get("ref"),
                            "headers": headers,
                            "formulas_by_header": formulas_by_header,
                        }
                    )
            sheets[sheet_name] = {
                "part": part,
                "state": sheet.get("state", "visible"),
                "cells": {
                    reference: cell_value(cell, strings)
                    for reference, cell in cells.items()
                    if reference in {"B7"}
                },
                "tables": tables,
            }

        defined_names = {
            str(item.get("name")): item.text
            for item in workbook.findall(f".//{{{MAIN_NS}}}definedName")
            if item.text
        }
        return {
            "sha256": sha256_file(path),
            "package_parts": len(archive.namelist()),
            "header_cells_audited": header_cells_audited,
            "header_collisions": header_collisions,
            "invalid_normalized_headers": invalid_normalized_headers,
            "sheets": sheets,
            "defined_names": defined_names,
        }


def _column_name(index: int) -> str:
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def _table_for_sheet(
    workbook: dict[str, object], sheet_name: str, table_name: str
) -> dict[str, object] | None:
    sheet = workbook["sheets"].get(sheet_name)
    if not sheet:
        return None
    return next(
        (table for table in sheet["tables"] if table["name"] == table_name), None
    )


def _resolve_header(headers: list[str], requested: str) -> str | None:
    requested_key = normalise_header(requested)
    return next(
        (header for header in headers if normalise_header(header) == requested_key),
        None,
    )


def validate_structure(
    workbook: dict[str, object], manifest: dict[str, object]
) -> dict[str, object]:
    findings: list[dict[str, object]] = []

    def add(check: str, passed: bool, detail: object) -> None:
        findings.append({"check": check, "passed": passed, "detail": detail})

    expected_sheets = set(manifest["support_sheets"]) | set(manifest["ledgers"])
    missing_sheets = sorted(expected_sheets - set(workbook["sheets"]))
    add("REQUIRED_SHEETS", not missing_sheets, {"missing": missing_sheets})
    add(
        "HEADER_NORMALIZATION_COLLISIONS",
        not workbook["header_collisions"],
        workbook["header_collisions"],
    )
    add(
        "HEADER_NORMALIZATION_KEYS",
        not workbook["invalid_normalized_headers"],
        workbook["invalid_normalized_headers"],
    )

    ledger_results = {}
    for sheet_name, ledger in manifest["ledgers"].items():
        table = _table_for_sheet(workbook, sheet_name, ledger["table_name"])
        if table is None:
            ledger_results[sheet_name] = {"present": False}
            continue
        headers = table["headers"]
        formula_headers = set(table["formulas_by_header"])
        expected_formulas = set(ledger["formula_helper_headers"])
        protected = set(ledger["protected_headers"])
        expected_protected = expected_formulas | set(ledger["script_owned_headers"])
        missing_headers = [
            header
            for header in ledger["required_headers"]
            if _resolve_header(headers, header) is None
        ]
        _, start_row, _, end_row = parse_range(table["ref"])
        complete_rows = [
            row
            for row in range(start_row + 1, end_row + 1)
            if all(
                row in table["formulas_by_header"].get(header, [])
                for header in expected_formulas
            )
        ]
        ledger_results[sheet_name] = {
            "present": True,
            "missing_headers": missing_headers,
            "formula_match": sorted(formula_headers) == sorted(expected_formulas),
            "missing_formula_manifest": sorted(formula_headers - expected_formulas),
            "stale_formula_manifest": sorted(expected_formulas - formula_headers),
            "protected_match": protected == expected_protected,
            "missing_protected": sorted(expected_protected - protected),
            "stale_protected": sorted(protected - expected_protected),
            "template_row": max(complete_rows) if complete_rows else None,
            "table_end_row": end_row,
        }
    add(
        "LEDGER_MANIFEST",
        all(
            item.get("present")
            and not item.get("missing_headers")
            and item.get("formula_match")
            and item.get("protected_match")
            and item.get("template_row") is not None
            for item in ledger_results.values()
        ),
        ledger_results,
    )

    workflow_results = {}
    workflow_sheets = {
        "account_balance_timestamp": "Accounts",
        "sportsbook_defaults": "Sportsbook Bets",
        "reload_to_sportsbook": "Sportsbook Bets",
        "sportsbook_to_free_bets_source": "Sportsbook Bets",
        "sportsbook_to_free_bets_target": "Free Bets",
    }
    for workflow, required_headers in manifest["workflow_headers"].items():
        sheet_name = workflow_sheets[workflow]
        ledger = manifest["ledgers"][sheet_name]
        table = _table_for_sheet(workbook, sheet_name, ledger["table_name"])
        missing = [
            header
            for header in required_headers
            if table is None or _resolve_header(table["headers"], header) is None
        ]
        workflow_results[workflow] = {"passed": not missing, "missing": missing}
    add(
        "WORKFLOW_HEADERS",
        all(item["passed"] for item in workflow_results.values()),
        workflow_results,
    )

    fixed_results = {}
    expected_fixed_headers = {
        "Sportsbook Bets": {
            "date": "DateSettling",
            "fixture": "FixtureType",
            "status": "Status",
            "result": "Result",
        },
        "Free Bets": {
            "date": "DateSettling",
            "fixture": "FixtureType",
            "status": "Status",
            "result": "Result",
        },
        "Reload Templates": {"last_created_week": "LastCreatedWeek"},
    }
    for sheet_name, positions in manifest["fixed_columns"].items():
        sheet = workbook["sheets"].get(sheet_name)
        table = sheet["tables"][0] if sheet and sheet["tables"] else None
        actual = {}
        for role, position in positions.items():
            actual_header = table["headers"][position - 1] if table else None
            actual[role] = {
                "position": position,
                "expected": expected_fixed_headers[sheet_name][role],
                "actual": actual_header,
                "passed": actual_header == expected_fixed_headers[sheet_name][role],
            }
        fixed_results[sheet_name] = actual
    add(
        "FIXED_COLUMNS",
        all(
            entry["passed"]
            for sheet in fixed_results.values()
            for entry in sheet.values()
        ),
        fixed_results,
    )

    settings_results = {}
    for name, reference in manifest["settings_ranges"].items():
        start, end = reference.split(":", 1)
        start_column, start_row = split_cell(start)
        end_column, end_row = split_cell(end)
        expected = f"Settings!${start_column}${start_row}:${end_column}${end_row}"
        defined = workbook["defined_names"].get(name)
        settings_results[name] = {
            "defined": defined,
            "expected": expected,
            "passed": defined == expected,
        }
    add(
        "SETTINGS_NAMES",
        all(item["passed"] for item in settings_results.values()),
        settings_results,
    )

    iteration = workbook["sheets"].get("Dashboard", {}).get("cells", {}).get("B7")
    add("ITERATION_CELL", bool(re.search(r"\d+", str(iteration or ""))), iteration)

    return {
        "contract": manifest["contract"],
        "passed": all(finding["passed"] for finding in findings),
        "header_cells_audited": workbook["header_cells_audited"],
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("manifest", type=Path)
    arguments = parser.parse_args()
    manifest = json.loads(arguments.manifest.read_text())
    result = validate_structure(inspect_workbook(arguments.workbook), manifest)
    print(json.dumps(result, indent=2, sort_keys=True))
    raise SystemExit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
