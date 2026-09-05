#!/usr/bin/env python3
"""Validate a real browser-downloaded working-workbook package."""

from __future__ import annotations

import argparse
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import sqlite3
import sys
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
API_SOURCE = ROOT / "apps/api/src"
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def _database_table_fingerprints(database_path: Path) -> dict[str, str]:
    connection = sqlite3.connect(f"file:{database_path}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    result: dict[str, str] = {}
    for record in connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'sqlite_sequence' "
        "ORDER BY name"
    ).fetchall():
        table = str(record["name"])
        rows = connection.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
        payload = [dict(row) for row in rows]
        result[table] = sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
    connection.close()
    return result


def _table_rows(
    payload: dict[str, bytes], sheet_paths: dict[str, str], tables: dict[str, Any], sheet: str
) -> list[dict[str, str | None]]:
    from openforge_api.workbook_template_package import (  # noqa: PLC0415
        _cell_value,
        _shared_strings,
        parse_range,
    )

    _, _, table = tables[sheet][0]
    start_column, start_row, end_column, end_row = parse_range(str(table.get("ref")))
    root = ET.fromstring(payload[sheet_paths[sheet]])
    strings = _shared_strings(payload)
    headers = [
        str(column.get("name"))
        for column in table.findall(f".//{{{MAIN_NS}}}tableColumn")
    ]
    result: list[dict[str, str | None]] = []
    for row_number in range(start_row + 1, end_row + 1):
        output: dict[str, str | None] = {}
        for column_number, header in zip(
            range(start_column, end_column + 1), headers, strict=True
        ):
            letters = ""
            current = column_number
            while current:
                current, remainder = divmod(current - 1, 26)
                letters = chr(65 + remainder) + letters
            cell = root.find(f".//{{{MAIN_NS}}}c[@r='{letters}{row_number}']")
            output[header] = _cell_value(cell, strings)
        result.append(output)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtime-directory", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--byte-checksum", required=True)
    parser.add_argument("--logical-checksum", required=True)
    parser.add_argument("--changed-part-count", type=int, required=True)
    parser.add_argument("--unchanged-part-count", type=int, required=True)
    arguments = parser.parse_args()
    runtime = arguments.runtime_directory.resolve()
    baseline = json.loads((runtime / "baseline.json").read_text(encoding="utf-8"))
    database = runtime / "acceptance.sqlite3"
    catalogue = runtime / "catalogue.json"
    os.environ.update(
        {
            "OPENFORGE_ACCOUNT_CATALOGUE_SOURCE": str(catalogue),
            "OPENFORGE_AUTH_REQUIRED": "false",
            "OPENFORGE_DATABASE_MODE": "local",
            "OPENFORGE_DATABASE_URL": f"sqlite:///{database}",
            "OPENFORGE_WORKBOOK_TEMPLATE_FIELD_COVERAGE": str(
                ROOT / "docs/contracts/workbook-template-export-v1-field-coverage.json"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_HELPER_SOURCE": str(
                ROOT / "_input/MB Helpers.gs"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_SOURCE": str(
                ROOT / "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx"
            ),
            "OPENFORGE_WORKBOOK_TEMPLATE_STRUCTURE_MANIFEST": str(
                ROOT / "docs/contracts/workbook-template-export-v1-ledger-structure.json"
            ),
        }
    )
    sys.path.insert(0, str(API_SOURCE))
    from openforge_api.workbook_template_export import (  # noqa: PLC0415
        OUTPUT_CLASSIFICATION,
        build_workbook_template_export,
    )
    from openforge_api.workbook_template_package import (  # noqa: PLC0415
        _sheet_paths,
        _table_map,
    )

    content = arguments.workbook.read_bytes()
    assert sha256(content).hexdigest() == arguments.byte_checksum
    rebuilt = build_workbook_template_export(
        str(baseline["profile_id"]), exported_at="20260905T100000Z"
    )
    assert rebuilt.content == content
    assert rebuilt.logical_checksum == arguments.logical_checksum
    assert rebuilt.changed_part_count == arguments.changed_part_count
    assert rebuilt.unchanged_part_count == arguments.unchanged_part_count
    assert rebuilt.classification == OUTPUT_CLASSIFICATION
    with ZipFile(BytesIO(content)) as archive:
        payload = {name: archive.read(name) for name in archive.namelist()}
    sheet_paths = _sheet_paths(payload)
    tables = _table_map(payload, sheet_paths)
    accounts = _table_rows(payload, sheet_paths, tables, "Accounts")
    sportsbook = _table_rows(payload, sheet_paths, tables, "Sportsbook Bets")
    free_bets = _table_rows(payload, sheet_paths, tables, "Free Bets")
    cash = _table_rows(payload, sheet_paths, tables, "Cash Adjustments")
    casino = _table_rows(payload, sheet_paths, tables, "Casino Offers")
    assert accounts[0]["AccountID"] == "IT3-AC-0007"
    assert accounts[0]["Status"] == "Bonus Restricted"
    assert [row["QualBetID"] for row in sportsbook] == [
        "IT3-QB-0009",
        "IT3-QB-0015",
        "IT3-QB-0016",
    ]
    assert sportsbook[0]["RelatedFreeBetID"] == "IT3-FB-0004"
    assert sportsbook[1]["OfferType"] == "Extra Place"
    assert sportsbook[1]["FinalNetPnL"] == "-8.6000"
    assert free_bets[0]["FreeBetID"] == "IT3-FB-0004"
    assert free_bets[0]["OriginQualBetID"] == "IT3-QB-0009"
    assert cash[0]["Amount"] == "12.3400"
    assert casino[0]["FinalNetPnL"] == "2.5000"
    assert sha256(catalogue.read_bytes()).hexdigest() == baseline["catalogue_sha256"]
    current_table_hashes = _database_table_fingerprints(database)
    baseline_table_hashes = baseline["database_table_sha256"]
    changed_tables = sorted(
        table
        for table in set(current_table_hashes) | set(baseline_table_hashes)
        if current_table_hashes.get(table) != baseline_table_hashes.get(table)
    )
    assert not changed_tables, "Database business state changed: " + ", ".join(changed_tables)
    assert sha256((ROOT / "_input/MB Helpers.gs").read_bytes()).hexdigest() == baseline[
        "helper_sha256"
    ]
    assert sha256(
        (ROOT / "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx").read_bytes()
    ).hexdigest() == baseline["template_sha256"]
    print(
        json.dumps(
            {
                "classification": OUTPUT_CLASSIFICATION,
                "database_business_state_unchanged": True,
                "download_byte_checksum_verified": True,
                "expected_projection_values_verified": True,
                "global_catalogue_unchanged": True,
                "logical_checksum_verified": True,
                "source_inputs_unchanged": True,
                "structural_package_verified": True,
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
