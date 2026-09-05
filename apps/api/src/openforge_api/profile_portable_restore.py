from __future__ import annotations

import base64
import binascii
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO
from pathlib import PurePath
from typing import Any, Mapping, Sequence
from uuid import uuid4
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from openforge_api.accounts import (
    LIFECYCLE_STATUSES,
    AccountPayload,
    resolve_account_lifecycle_and_restrictions,
)
from openforge_api.auth import require_request_session
from openforge_api.cash_adjustments import CashAdjustmentPayload
from openforge_api.casino_offers import CasinoOfferPayload
from openforge_api.db import connect, postgres_runtime_enabled
from openforge_api.each_way_extra_places import EachWayExtraPlacePayload
from openforge_api.free_bets import FreeBetPayload
from openforge_api.profile_portable_export import (
    EXPORT_FORMAT_VERSION,
    NULL_FIELDS_COLUMN,
    PORTABLE_PAYLOAD_SPECS,
    PortableExportError,
    SheetSpec,
    _canonical_json,
    _canonical_value,
    _load_catalogue_references,
    _load_preset_references,
    _logical_checksum,
    _sha256,
    build_profile_portable_export,
)
from openforge_api.profile_workbook_cutover import generate_post_import_operational_health
from openforge_api.sportsbook import SportsbookBetPayload

RESTORE_CONTRACT_VERSION = "profile-portable-restore-v1"
MAX_PORTABLE_BACKUP_BYTES = 20 * 1024 * 1024
MAX_PORTABLE_BACKUP_BASE64_CHARACTERS = 28_000_000
SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RELATIONSHIP_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

router = APIRouter(prefix="/fund-manager/portable-restores", tags=["profile-portable-restore"])


class PortableRestoreError(ValueError):
    pass


class PortableRestoreAnalysisPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_filename: str = Field(min_length=1, max_length=240)
    content_base64: str = Field(min_length=8, max_length=MAX_PORTABLE_BACKUP_BASE64_CHARACTERS)
    target_display_name: str | None = Field(default=None, min_length=1, max_length=120)
    target_profile_code: str | None = Field(
        default=None, min_length=3, max_length=32, pattern=r"^[A-Z0-9-]+$"
    )

    @field_validator("source_filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        filename = PurePath(value.strip()).name
        if not filename.casefold().endswith(".xlsx"):
            raise ValueError("Select a .xlsx portable Profile backup")
        return filename


class PortableRestoreReviewDecisionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(min_length=1, max_length=80)
    resolution: str = Field(pattern="^(USE_CURRENT|REMOVE_REFERENCE)$")


class PortableRestoreReviewPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decisions: list[PortableRestoreReviewDecisionPayload] = Field(
        default_factory=list, max_length=500
    )


class PortableRestoreExecutionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmation: str = Field(pattern="^RESTORE PORTABLE PROFILE$")


@dataclass(frozen=True)
class ParsedPortableBackup:
    manifest: dict[str, str | None]
    sheet_manifest: tuple[dict[str, str], ...]
    sheets: dict[str, tuple[dict[str, Any], ...]]
    source_byte_checksum: str
    source_logical_checksum: str


REFERENCE_COLUMNS: dict[str, tuple[str, ...]] = {
    "Onboarding": ("main_bank_reference_version", "main_bank_reference_fingerprint"),
    "Accounts": ("catalogue_reference_version", "catalogue_reference_fingerprint"),
    "Sportsbook": ("preset_reference_version", "preset_reference_fingerprint"),
    "Loadout Overrides": ("preset_reference_version", "preset_reference_fingerprint"),
    "Loadout Favourites": ("preset_reference_version", "preset_reference_fingerprint"),
    "Opportunity Links": (
        "opportunity_reference_version",
        "opportunity_reference_fingerprint",
    ),
}

PRIMARY_IDENTITIES: dict[str, tuple[str, str]] = {
    "Profile": ("profile_id", "profile"),
    "Accounts": ("account_id", "account"),
    "Balance Snapshots": ("balance_snapshot_id", "balance_snapshot"),
    "Sportsbook": ("sportsbook_bet_id", "sportsbook_bet"),
    "Free Bets": ("free_bet_id", "free_bet"),
    "Casino": ("casino_offer_id", "casino_offer"),
    "Extra Places": ("each_way_extra_place_id", "extra_place"),
    "Cash Adjustments": ("cash_adjustment_id", "cash_adjustment"),
    "Fee Periods": ("fee_period_id", "fee_period"),
    "Fee Revisions": ("fee_revision_id", "fee_revision"),
    "Fee Corrections": ("fee_correction_id", "fee_correction"),
    "Fee Withdrawals": ("fee_withdrawal_link_id", "fee_withdrawal"),
    "Profile Lookups": ("lookup_value_id", "profile_lookup"),
    "Quick Actions": ("action_id", "quick_action"),
    "Opportunity Links": ("target_id", "opportunity_target"),
}

FOREIGN_ID_FIELDS: dict[tuple[str, str], str] = {
    ("Balance Snapshots", "account_id"): "account",
    ("Free Bets", "origin_qual_bet_id"): "sportsbook_bet",
    ("Fee Revisions", "fee_period_id"): "fee_period",
    ("Fee Corrections", "source_fee_period_id"): "fee_period",
    ("Fee Corrections", "target_fee_period_id"): "fee_period",
    ("Fee Withdrawals", "fee_period_id"): "fee_period",
    ("Fee Withdrawals", "fee_revision_id"): "fee_revision",
    ("Fee Withdrawals", "cash_adjustment_id"): "cash_adjustment",
    ("Opportunity Links", "sportsbook_bet_id"): "sportsbook_bet",
}

ENTITY_IDENTITY_DOMAINS = {
    "accounts": "account",
    "account": "account",
    "sportsbook_bet": "sportsbook_bet",
    "free_bet": "free_bet",
    "casino_offer": "casino_offer",
    "cash_adjustment": "cash_adjustment",
    "extra_place": "extra_place",
}

PROVENANCE_SHEETS = {
    "Source Identities",
    "Workbook Lineage",
    "Review Decisions",
    "Reconciliation",
}

FINANCIAL_SHEETS = {
    "Profile",
    "Tracker Settings",
    "Onboarding",
    "Exchange Commissions",
    "Accounts",
    "Balance Snapshots",
    "Sportsbook",
    "Free Bets",
    "Casino",
    "Extra Places",
    "Cash Adjustments",
    "Fee Periods",
    "Fee Revisions",
    "Fee Corrections",
    "Fee Withdrawals",
}

INTEGER_FIELDS = {
    ("Tracker Settings", "range_back_days"),
    ("Tracker Settings", "range_forward_days"),
    ("Tracker Settings", "mug_bet_frequency_days"),
    ("Tracker Settings", "free_bet_expiry_alert_window_days"),
    ("Onboarding", "iteration_number"),
    ("Sportsbook", "source_combo_preset_version"),
    ("Free Bets", "source_award_split_index"),
    ("Free Bets", "source_award_split_total"),
    ("Fee Periods", "current_revision_number"),
    ("Fee Revisions", "revision_number"),
    ("Fee Revisions", "fee_package_version"),
    ("Quick Actions", "favourite_order"),
    ("Quick Actions", "sort_order"),
    ("Loadout Favourites", "favourite_order"),
    ("Workbook Lineage", "workbook_size_bytes"),
    ("Review Decisions", "source_row"),
    ("Reconciliation", "latest_attempt_number"),
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _require_fund_manager(request: Request) -> Any:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Fund Manager access is required")
    return session


def _decode_content(payload: PortableRestoreAnalysisPayload) -> bytes:
    try:
        content = base64.b64decode(payload.content_base64, validate=True)
    except (binascii.Error, ValueError) as error:
        raise PortableRestoreError("The portable backup encoding is invalid") from error
    if not content or len(content) > MAX_PORTABLE_BACKUP_BYTES:
        raise PortableRestoreError("Portable backups must be no larger than 20 MB")
    if not content.startswith(b"PK"):
        raise PortableRestoreError("The uploaded file is not a valid XLSX backup")
    return content


def _cell_column(reference: str) -> int:
    match = re.match(r"^([A-Z]+)", reference)
    if match is None:
        raise PortableRestoreError("The portable backup contains an invalid cell reference")
    value = 0
    for character in match.group(1):
        value = value * 26 + ord(character) - 64
    return value


def _worksheet_rows(archive: ZipFile, path: str) -> list[list[str]]:
    root = ET.fromstring(archive.read(path))
    rows: list[list[str]] = []
    for row in root.findall(f".//{{{SPREADSHEET_NS}}}row"):
        values: list[str] = []
        expected_column = 1
        for cell in row.findall(f"{{{SPREADSHEET_NS}}}c"):
            reference = str(cell.attrib.get("r") or "")
            column = _cell_column(reference)
            while expected_column < column:
                values.append("")
                expected_column += 1
            cell_type = cell.attrib.get("t")
            if cell_type not in {None, "inlineStr"}:
                raise PortableRestoreError(
                    "The backup is not a profile-portable-export-v1 workbook"
                )
            if cell_type == "inlineStr":
                value = "".join(
                    node.text or "" for node in cell.findall(f".//{{{SPREADSHEET_NS}}}t")
                )
            else:
                value_node = cell.find(f"{{{SPREADSHEET_NS}}}v")
                value = "" if value_node is None else str(value_node.text or "")
            values.append(value)
            expected_column += 1
        rows.append(values)
    return rows


def _xlsx_sheets(content: bytes) -> dict[str, list[list[str]]]:
    try:
        with ZipFile(BytesIO(content)) as archive:
            names = archive.namelist()
            if len(names) > 100 or sum(info.file_size for info in archive.infolist()) > 50_000_000:
                raise PortableRestoreError("The portable backup package is unexpectedly large")
            workbook = ET.fromstring(archive.read("xl/workbook.xml"))
            relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            targets = {
                str(item.attrib["Id"]): str(item.attrib["Target"])
                for item in relationships.findall(f"{{{RELATIONSHIP_NS}}}Relationship")
            }
            sheets_node = workbook.find(f"{{{SPREADSHEET_NS}}}sheets")
            if sheets_node is None:
                raise PortableRestoreError("The portable backup has no worksheets")
            result: dict[str, list[list[str]]] = {}
            for sheet in sheets_node:
                name = str(sheet.attrib["name"])
                relationship_id = str(sheet.attrib[f"{{{OFFICE_REL_NS}}}id"])
                target = targets.get(relationship_id, "")
                path = "xl/" + target.lstrip("/")
                result[name] = _worksheet_rows(archive, path)
            return result
    except (BadZipFile, KeyError, ET.ParseError) as error:
        raise PortableRestoreError("The portable backup package is invalid") from error


def _tabular_rows(
    sheets: Mapping[str, list[list[str]]], sheet_name: str, expected_columns: Sequence[str]
) -> list[dict[str, str]]:
    raw = sheets.get(sheet_name)
    if not raw:
        raise PortableRestoreError(f"Required sheet is missing: {sheet_name}")
    headers = raw[0]
    if headers != list(expected_columns):
        raise PortableRestoreError(f"{sheet_name} columns do not match the export contract")
    rows: list[dict[str, str]] = []
    for row_number, values in enumerate(raw[1:], start=2):
        if len(values) < len(headers):
            values = [*values, *([""] * (len(headers) - len(values)))]
        if len(values) != len(headers):
            raise PortableRestoreError(f"{sheet_name} row {row_number} has extra columns")
        rows.append(dict(zip(headers, values, strict=True)))
    return rows


def _expected_columns(spec: SheetSpec) -> tuple[str, ...]:
    return (*spec.columns, *REFERENCE_COLUMNS.get(spec.name, ()), NULL_FIELDS_COLUMN)


def _restore_row(spec: SheetSpec, source: Mapping[str, str]) -> dict[str, Any]:
    try:
        null_fields = json.loads(source[NULL_FIELDS_COLUMN])
    except (json.JSONDecodeError, TypeError) as error:
        raise PortableRestoreError(f"{spec.name} contains invalid null metadata") from error
    if not isinstance(null_fields, list) or not all(isinstance(item, str) for item in null_fields):
        raise PortableRestoreError(f"{spec.name} null metadata must be a list of fields")
    allowed = set(source) - {NULL_FIELDS_COLUMN}
    if set(null_fields) - allowed:
        raise PortableRestoreError(f"{spec.name} null metadata names an unknown field")
    row: dict[str, Any] = {}
    for field in spec.columns:
        value = source[field]
        if field in null_fields:
            if value != "":
                raise PortableRestoreError(f"{spec.name}.{field} is both null and non-empty")
            row[field] = None
            continue
        canonical = _canonical_value(spec, field, value)
        if canonical != value:
            raise PortableRestoreError(f"{spec.name}.{field} is not canonically serialized")
        if field in spec.boolean_fields:
            row[field] = 1 if value == "true" else 0
        elif (spec.name, field) in INTEGER_FIELDS and value != "":
            try:
                row[field] = int(value)
            except ValueError as error:
                raise PortableRestoreError(f"{spec.name}.{field} is not a valid integer") from error
        else:
            row[field] = value
    for field in REFERENCE_COLUMNS.get(spec.name, ()):
        row[field] = None if field in null_fields else source[field]
    return row


def parse_profile_portable_export(content: bytes) -> ParsedPortableBackup:
    sheets = _xlsx_sheets(content)
    expected_sheet_names = {
        "Manifest",
        "Sheet Manifest",
        *(spec.name for spec in PORTABLE_PAYLOAD_SPECS),
    }
    if set(sheets) != expected_sheet_names:
        missing = sorted(expected_sheet_names - set(sheets))
        extra = sorted(set(sheets) - expected_sheet_names)
        raise PortableRestoreError(
            "Portable backup sheet set does not match the contract"
            + (f"; missing: {', '.join(missing)}" if missing else "")
            + (f"; unexpected: {', '.join(extra)}" if extra else "")
        )
    manifest_rows = _tabular_rows(sheets, "Manifest", ("field", "value", NULL_FIELDS_COLUMN))
    manifest_map = {row["field"]: row["value"] for row in manifest_rows}
    if len(manifest_map) != len(manifest_rows):
        raise PortableRestoreError("Manifest contains duplicate fields")
    if manifest_map.get("export_format_version") != EXPORT_FORMAT_VERSION:
        raise PortableRestoreError("Unsupported portable export format version")
    manifest_checksum = manifest_map.get("manifest_logical_checksum", "")
    manifest_core = [row for row in manifest_rows if row["field"] != "manifest_logical_checksum"]
    if (
        _logical_checksum("Manifest", ("field", "value", NULL_FIELDS_COLUMN), manifest_core)
        != manifest_checksum
    ):
        raise PortableRestoreError("Manifest checksum validation failed")

    sheet_manifest_columns = (
        "sheet_name",
        "authority_role",
        "row_count",
        "column_count",
        "logical_checksum",
        NULL_FIELDS_COLUMN,
    )
    sheet_manifest = _tabular_rows(sheets, "Sheet Manifest", sheet_manifest_columns)
    if _logical_checksum(
        "Sheet Manifest", sheet_manifest_columns, sheet_manifest
    ) != manifest_map.get("sheet_manifest_checksum"):
        raise PortableRestoreError("Sheet Manifest checksum validation failed")
    by_name = {row["sheet_name"]: row for row in sheet_manifest}
    if len(by_name) != len(sheet_manifest) or set(by_name) != {
        spec.name for spec in PORTABLE_PAYLOAD_SPECS
    }:
        raise PortableRestoreError("Sheet Manifest payload list is invalid")

    parsed: dict[str, tuple[dict[str, Any], ...]] = {}
    for spec in PORTABLE_PAYLOAD_SPECS:
        columns = _expected_columns(spec)
        rows = _tabular_rows(sheets, spec.name, columns)
        declared = by_name[spec.name]
        if declared["authority_role"] != spec.authority_role:
            raise PortableRestoreError(f"{spec.name} authority role is invalid")
        if declared["row_count"] != str(len(rows)) or declared["column_count"] != str(len(columns)):
            raise PortableRestoreError(f"{spec.name} manifest counts are invalid")
        if _logical_checksum(spec.name, columns, rows) != declared["logical_checksum"]:
            raise PortableRestoreError(f"{spec.name} checksum validation failed")
        parsed[spec.name] = tuple(_restore_row(spec, row) for row in rows)

    aggregate_payload = [
        {
            "authority_role": row["authority_role"],
            "logical_checksum": row["logical_checksum"],
            "row_count": row["row_count"],
            "sheet_name": row["sheet_name"],
        }
        for row in sheet_manifest
    ]
    aggregate_checksum = _sha256(_canonical_json(aggregate_payload))
    if aggregate_checksum != manifest_map.get("aggregate_logical_checksum"):
        raise PortableRestoreError("Aggregate logical checksum validation failed")
    if manifest_map.get("payload_sheet_count") != str(len(PORTABLE_PAYLOAD_SPECS)):
        raise PortableRestoreError("Manifest payload sheet count is invalid")
    profile_rows = parsed["Profile"]
    if len(profile_rows) != 1:
        raise PortableRestoreError("Portable backup must contain exactly one Profile row")
    source_profile_id = str(profile_rows[0]["profile_id"])
    if not source_profile_id or manifest_map.get("source_profile_id") != source_profile_id:
        raise PortableRestoreError("Manifest Profile identity does not match the payload")
    for sheet_name, payload_rows in parsed.items():
        for row in payload_rows:
            if "profile_id" in row and str(row["profile_id"]) != source_profile_id:
                raise PortableRestoreError(f"{sheet_name} contains data from a different Profile")
    return ParsedPortableBackup(
        manifest={field: value for field, value in manifest_map.items()},
        sheet_manifest=tuple(sheet_manifest),
        sheets=parsed,
        source_byte_checksum=_sha256(content),
        source_logical_checksum=aggregate_checksum,
    )


def _review_id(domain: str, reference_id: str) -> str:
    digest = _sha256(f"{domain}\0{reference_id}")[:20]
    return f"restore-review-{digest}"


def _reference_review(
    *,
    domain: str,
    reference_id: str,
    source_version: str | None,
    source_fingerprint: str | None,
    current_version: str,
    current_fingerprint: str,
) -> dict[str, Any] | None:
    if not reference_id:
        return None
    source_version_value = str(source_version or "")
    source_fingerprint_value = str(source_fingerprint or "")
    if not current_fingerprint:
        reason = "MISSING_GLOBAL_REFERENCE"
        allowed = ["REMOVE_REFERENCE"]
    elif (
        source_version_value == current_version and source_fingerprint_value == current_fingerprint
    ):
        return None
    else:
        reason = "INCOMPATIBLE_GLOBAL_REFERENCE"
        allowed = ["USE_CURRENT", "REMOVE_REFERENCE"]
    return {
        "item_id": _review_id(domain, reference_id),
        "reference_domain": domain,
        "reference_id": reference_id,
        "source_version": source_version_value,
        "source_fingerprint": source_fingerprint_value,
        "current_version": current_version,
        "current_fingerprint": current_fingerprint,
        "reason": reason,
        "allowed_resolutions": allowed,
    }


def _global_reference_reviews(parsed: ParsedPortableBackup) -> list[dict[str, Any]]:
    reviews: dict[tuple[str, str], dict[str, Any]] = {}
    with connect() as connection:
        catalogue_version, catalogue = _load_catalogue_references(connection)
        presets = _load_preset_references(connection)
        opportunity_ids = {
            str(row["opportunity_id"])
            for row in parsed.sheets["Opportunity Links"]
            if row.get("opportunity_id")
        }
        opportunity_rows = connection.execute(
            "SELECT * FROM multi_profile_opportunities ORDER BY opportunity_id"
        ).fetchall()
        opportunities: dict[str, tuple[str, str]] = {}
        for source in opportunity_rows:
            row = dict(source)
            opportunity_id = str(row.pop("opportunity_id"))
            if opportunity_id not in opportunity_ids:
                continue
            row.pop("actor_id", None)
            row.pop("created_at", None)
            row.pop("updated_at", None)
            opportunities[opportunity_id] = (
                str(row.get("preset_version") or ""),
                _sha256(_canonical_json(row)),
            )
        existing_bookmakers = {
            str(row["bookmaker_id"])
            for row in connection.execute("SELECT bookmaker_id FROM bookmaker_catalogue").fetchall()
        }

    def add(review: dict[str, Any] | None) -> None:
        if review is not None:
            reviews[(review["reference_domain"], review["reference_id"])] = review

    for row in parsed.sheets["Onboarding"]:
        reference_id = str(row.get("main_bank_catalogue_id") or "")
        add(
            _reference_review(
                domain="account_catalogue",
                reference_id=reference_id,
                source_version=row.get("main_bank_reference_version"),
                source_fingerprint=row.get("main_bank_reference_fingerprint"),
                current_version=catalogue_version if reference_id in catalogue else "",
                current_fingerprint=catalogue.get(reference_id, ""),
            )
        )
    for row in parsed.sheets["Accounts"]:
        reference_id = str(row.get("catalogue_id") or "")
        add(
            _reference_review(
                domain="account_catalogue",
                reference_id=reference_id,
                source_version=row.get("catalogue_reference_version"),
                source_fingerprint=row.get("catalogue_reference_fingerprint"),
                current_version=catalogue_version if reference_id in catalogue else "",
                current_fingerprint=catalogue.get(reference_id, ""),
            )
        )
        bookmaker_id = str(row.get("bookmaker_id") or "")
        if bookmaker_id and bookmaker_id not in existing_bookmakers:
            add(
                _reference_review(
                    domain="bookmaker_catalogue",
                    reference_id=bookmaker_id,
                    source_version="",
                    source_fingerprint="missing",
                    current_version="",
                    current_fingerprint="",
                )
            )
    for sheet_name in ("Sportsbook", "Loadout Overrides", "Loadout Favourites"):
        id_field = "source_combo_preset_id" if sheet_name == "Sportsbook" else "preset_id"
        for row in parsed.sheets[sheet_name]:
            reference_id = str(row.get(id_field) or "")
            version, fingerprint = presets.get(reference_id, ("", ""))
            add(
                _reference_review(
                    domain="combo_preset",
                    reference_id=reference_id,
                    source_version=row.get("preset_reference_version"),
                    source_fingerprint=row.get("preset_reference_fingerprint"),
                    current_version=version,
                    current_fingerprint=fingerprint,
                )
            )
    for row in parsed.sheets["Opportunity Links"]:
        reference_id = str(row.get("opportunity_id") or "")
        version, fingerprint = opportunities.get(reference_id, ("", ""))
        add(
            _reference_review(
                domain="opportunity",
                reference_id=reference_id,
                source_version=row.get("opportunity_reference_version"),
                source_fingerprint=row.get("opportunity_reference_fingerprint"),
                current_version=version,
                current_fingerprint=fingerprint,
            )
        )
    return sorted(reviews.values(), key=lambda row: (row["reference_domain"], row["reference_id"]))


def _validate_domain_rows(parsed: ParsedPortableBackup) -> None:
    for row in parsed.sheets["Accounts"]:
        restrictions_value = row.get("restrictions_json") or "[]"
        restrictions = json.loads(str(restrictions_value))
        payload = AccountPayload.model_validate(
            {
                **{
                    key: value
                    for key, value in row.items()
                    if key not in REFERENCE_COLUMNS["Accounts"]
                },
                "restrictions": restrictions,
            }
        )
        lifecycle, _restrictions = resolve_account_lifecycle_and_restrictions(
            status=payload.status,
            lifecycle_status=payload.lifecycle_status,
            restrictions=payload.restrictions,
        )
        if lifecycle not in LIFECYCLE_STATUSES:
            raise PortableRestoreError("Account lifecycle validation failed")
    for row in parsed.sheets["Sportsbook"]:
        SportsbookBetPayload.model_validate(row)
    for row in parsed.sheets["Free Bets"]:
        FreeBetPayload.model_validate(row)
    for row in parsed.sheets["Casino"]:
        CasinoOfferPayload.model_validate(row)
    for row in parsed.sheets["Cash Adjustments"]:
        CashAdjustmentPayload.model_validate(row)
    for row in parsed.sheets["Extra Places"]:
        if row.get("calculation_provenance") in {"native", "imported_historical"}:
            EachWayExtraPlacePayload.model_validate(row)


def _serialize_parsed(parsed: ParsedPortableBackup) -> str:
    return _canonical_json(
        {
            "manifest": parsed.manifest,
            "sheet_manifest": list(parsed.sheet_manifest),
            "sheets": {name: list(rows) for name, rows in parsed.sheets.items()},
            "source_byte_checksum": parsed.source_byte_checksum,
            "source_logical_checksum": parsed.source_logical_checksum,
        }
    )


def _deserialize_parsed(value: str) -> ParsedPortableBackup:
    payload = json.loads(value)
    return ParsedPortableBackup(
        manifest=dict(payload["manifest"]),
        sheet_manifest=tuple(payload["sheet_manifest"]),
        sheets={name: tuple(rows) for name, rows in payload["sheets"].items()},
        source_byte_checksum=str(payload["source_byte_checksum"]),
        source_logical_checksum=str(payload["source_logical_checksum"]),
    )


def _run_response(connection: Any, restore_run_id: str, owner_email: str) -> dict[str, Any] | None:
    run = connection.execute(
        "SELECT * FROM profile_portable_restore_runs WHERE restore_run_id = ? "
        "AND lower(owner_email) = lower(?)",
        (restore_run_id, owner_email),
    ).fetchone()
    if run is None:
        return None
    reviews = connection.execute(
        "SELECT * FROM profile_portable_restore_reviews WHERE restore_run_id = ? "
        "ORDER BY reference_domain, reference_id",
        (restore_run_id,),
    ).fetchall()
    attempts = connection.execute(
        "SELECT * FROM profile_portable_restore_attempts WHERE restore_run_id = ? "
        "ORDER BY attempt_number",
        (restore_run_id,),
    ).fetchall()
    return {
        "restore_run_id": str(run["restore_run_id"]),
        "source_filename": str(run["source_filename"]),
        "source_byte_checksum": str(run["source_byte_checksum"]),
        "source_logical_checksum": str(run["source_logical_checksum"]),
        "format_version": str(run["format_version"]),
        "restore_contract_version": RESTORE_CONTRACT_VERSION,
        "source_profile_id": str(run["source_profile_id"]),
        "source_profile_display_name": str(run["source_profile_display_name"]),
        "target_profile_id": str(run["target_profile_id"]),
        "target_display_name": str(run["target_display_name"]),
        "target_profile_code": str(run["target_profile_code"]),
        "status": str(run["status"]),
        "reviews": [
            {
                **dict(row),
                "allowed_resolutions": json.loads(str(row["allowed_resolutions_json"])),
            }
            for row in reviews
        ],
        "attempts": [
            {
                **dict(row),
                "error": json.loads(str(row["error_json"] or "{}")),
                "financial_reconciliation": json.loads(
                    str(row["financial_reconciliation_json"] or "{}")
                ),
                "operational_reconciliation": json.loads(
                    str(row["operational_reconciliation_json"] or "{}")
                ),
                "parity": json.loads(str(row["parity_json"] or "{}")),
            }
            for row in attempts
        ],
        "result": json.loads(str(run["result_json"] or "{}")),
        "created_at": str(run["created_at"]),
        "updated_at": str(run["updated_at"]),
        "completed_at": str(run["completed_at"]),
    }


def analyse_portable_restore(
    *, payload: PortableRestoreAnalysisPayload, owner_email: str
) -> dict[str, Any]:
    content = _decode_content(payload)
    parsed = parse_profile_portable_export(content)
    try:
        _validate_domain_rows(parsed)
    except (ValueError, TypeError, json.JSONDecodeError) as error:
        raise PortableRestoreError(f"Portable domain validation failed: {error}") from error
    profile = parsed.sheets["Profile"][0]
    target_display_name = payload.target_display_name or str(profile["display_name"])
    target_profile_code = payload.target_profile_code or str(profile["profile_code"])
    reviews = _global_reference_reviews(parsed)
    status = "REVIEW_REQUIRED" if reviews else "READY"
    now = _now()
    restore_run_id = f"portable-restore-{uuid4().hex}"
    with connect() as connection:
        duplicate_code = connection.execute(
            "SELECT 1 FROM profiles WHERE profile_code = ?", (target_profile_code,)
        ).fetchone()
        if duplicate_code is not None:
            raise PortableRestoreError(
                "Target Profile code is already in use; choose a code for the fresh Profile"
            )
        connection.execute(
            """
            INSERT INTO profile_portable_restore_runs (
              restore_run_id, owner_email, source_filename, source_byte_checksum,
              source_logical_checksum, format_version, source_profile_id,
              source_profile_display_name, target_display_name, target_profile_code,
              status, payload_json, review_summary_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                restore_run_id,
                owner_email,
                payload.source_filename,
                parsed.source_byte_checksum,
                parsed.source_logical_checksum,
                EXPORT_FORMAT_VERSION,
                str(profile["profile_id"]),
                str(profile["display_name"]),
                target_display_name,
                target_profile_code,
                status,
                _serialize_parsed(parsed),
                _canonical_json({"total": len(reviews), "unresolved": len(reviews)}),
                now,
                now,
            ),
        )
        for review in reviews:
            connection.execute(
                """
                INSERT INTO profile_portable_restore_reviews (
                  restore_run_id, item_id, reference_domain, reference_id,
                  source_version, source_fingerprint, current_version,
                  current_fingerprint, reason, allowed_resolutions_json,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    restore_run_id,
                    review["item_id"],
                    review["reference_domain"],
                    review["reference_id"],
                    review["source_version"],
                    review["source_fingerprint"],
                    review["current_version"],
                    review["current_fingerprint"],
                    review["reason"],
                    _canonical_json(review["allowed_resolutions"]),
                    now,
                    now,
                ),
            )
        response = _run_response(connection, restore_run_id, owner_email)
    assert response is not None
    return response


def apply_restore_review_decisions(
    *, restore_run_id: str, owner_email: str, actor_email: str, decisions: Sequence[dict[str, str]]
) -> dict[str, Any]:
    now = _now()
    with connect() as connection:
        run = connection.execute(
            "SELECT status FROM profile_portable_restore_runs WHERE restore_run_id = ? "
            "AND lower(owner_email) = lower(?)",
            (restore_run_id, owner_email),
        ).fetchone()
        if run is None:
            raise PortableRestoreError("Portable restore was not found")
        if str(run["status"]) not in {"REVIEW_REQUIRED", "READY"}:
            raise PortableRestoreError("Portable restore reviews are no longer editable")
        for decision in decisions:
            row = connection.execute(
                "SELECT allowed_resolutions_json FROM profile_portable_restore_reviews "
                "WHERE restore_run_id = ? AND item_id = ?",
                (restore_run_id, decision["item_id"]),
            ).fetchone()
            if row is None:
                raise PortableRestoreError("Portable restore review item was not found")
            allowed = json.loads(str(row["allowed_resolutions_json"]))
            if decision["resolution"] not in allowed:
                raise PortableRestoreError("That resolution is not allowed for this reference")
            connection.execute(
                "UPDATE profile_portable_restore_reviews SET resolution = ?, resolved_by = ?, "
                "resolved_at = ?, updated_at = ? WHERE restore_run_id = ? AND item_id = ?",
                (
                    decision["resolution"],
                    actor_email,
                    now,
                    now,
                    restore_run_id,
                    decision["item_id"],
                ),
            )
        unresolved = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_portable_restore_reviews "
                "WHERE restore_run_id = ? AND resolution = ''",
                (restore_run_id,),
            ).fetchone()["count"]
        )
        total = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_portable_restore_reviews "
                "WHERE restore_run_id = ?",
                (restore_run_id,),
            ).fetchone()["count"]
        )
        status = "READY" if unresolved == 0 else "REVIEW_REQUIRED"
        connection.execute(
            "UPDATE profile_portable_restore_runs SET status = ?, review_summary_json = ?, "
            "updated_at = ? WHERE restore_run_id = ?",
            (
                status,
                _canonical_json({"total": total, "unresolved": unresolved}),
                now,
                restore_run_id,
            ),
        )
        response = _run_response(connection, restore_run_id, owner_email)
    assert response is not None
    return response


def _new_runtime_id(domain: str) -> str:
    prefix = {
        "profile": "profile",
        "account": "AC",
        "balance_snapshot": "balance-snapshot",
        "sportsbook_bet": "sportsbook",
        "free_bet": "free-bet",
        "casino_offer": "casino",
        "extra_place": "extra-place",
        "cash_adjustment": "cash-adjustment",
        "fee_period": "fee-period",
        "fee_revision": "fee-revision",
        "fee_correction": "fee-correction",
        "fee_withdrawal": "fee-withdrawal",
        "profile_lookup": "lookup",
        "quick_action": "quick-action",
        "opportunity_target": "opportunity-target",
    }[domain]
    return f"{prefix}-{uuid4().hex}"


def _identity_maps(
    parsed: ParsedPortableBackup, target_profile_id: str
) -> tuple[dict[str, dict[str, str]], list[tuple[str, str, str]]]:
    maps: dict[str, dict[str, str]] = {
        "profile": {str(parsed.sheets["Profile"][0]["profile_id"]): target_profile_id}
    }
    records: list[tuple[str, str, str]] = [
        ("profile", str(parsed.sheets["Profile"][0]["profile_id"]), target_profile_id)
    ]
    for sheet_name, (field, domain) in PRIMARY_IDENTITIES.items():
        if sheet_name == "Profile":
            continue
        maps.setdefault(domain, {})
        for row in parsed.sheets[sheet_name]:
            portable_id = str(row.get(field) or "")
            if not portable_id:
                raise PortableRestoreError(f"{sheet_name}.{field} cannot be empty")
            if portable_id in maps[domain]:
                raise PortableRestoreError(
                    f"{sheet_name}.{field} contains duplicate portable identity {portable_id!r}"
                )
            runtime_id = _new_runtime_id(domain)
            maps[domain][portable_id] = runtime_id
            records.append((domain, portable_id, runtime_id))
    return maps, records


def _resolution_map(connection: Any, restore_run_id: str) -> dict[tuple[str, str], str]:
    rows = connection.execute(
        "SELECT reference_domain, reference_id, resolution "
        "FROM profile_portable_restore_reviews WHERE restore_run_id = ?",
        (restore_run_id,),
    ).fetchall()
    return {
        (str(row["reference_domain"]), str(row["reference_id"])): str(row["resolution"])
        for row in rows
    }


def _resolved_rows(
    parsed: ParsedPortableBackup,
    *,
    target_profile_id: str,
    target_display_name: str,
    target_profile_code: str,
    identity_maps: Mapping[str, Mapping[str, str]],
    resolutions: Mapping[tuple[str, str], str],
) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    source_profile_id = str(parsed.sheets["Profile"][0]["profile_id"])
    for spec in PORTABLE_PAYLOAD_SPECS:
        rows: list[dict[str, Any]] = []
        for source in parsed.sheets[spec.name]:
            row = {field: source.get(field) for field in spec.columns}
            if "profile_id" in row:
                row["profile_id"] = target_profile_id
            primary = PRIMARY_IDENTITIES.get(spec.name)
            if primary is not None:
                field, domain = primary
                row[field] = identity_maps[domain][str(source[field])]
            for (sheet_name, field), domain in FOREIGN_ID_FIELDS.items():
                if sheet_name != spec.name or not row.get(field):
                    continue
                row[field] = identity_maps.get(domain, {}).get(str(row[field]), row[field])
            if spec.name == "Profile":
                row["profile_id"] = target_profile_id
                row["display_name"] = target_display_name
                row["profile_code"] = target_profile_code
            if spec.name == "Onboarding":
                reference_id = str(row.get("main_bank_catalogue_id") or "")
                if resolutions.get(("account_catalogue", reference_id)) == "REMOVE_REFERENCE":
                    row["main_bank_catalogue_id"] = ""
            if spec.name == "Accounts":
                catalogue_id = str(row.get("catalogue_id") or "")
                if resolutions.get(("account_catalogue", catalogue_id)) == "REMOVE_REFERENCE":
                    row["catalogue_id"] = None
                bookmaker_id = str(row.get("bookmaker_id") or "")
                if resolutions.get(("bookmaker_catalogue", bookmaker_id)) == "REMOVE_REFERENCE":
                    row["bookmaker_id"] = None
            if spec.name == "Sportsbook":
                preset_id = str(row.get("source_combo_preset_id") or "")
                if resolutions.get(("combo_preset", preset_id)) == "REMOVE_REFERENCE":
                    row["source_combo_preset_id"] = ""
                    row["source_combo_preset_version"] = 0
            if spec.name in {"Loadout Overrides", "Loadout Favourites"}:
                preset_id = str(row.get("preset_id") or "")
                if resolutions.get(("combo_preset", preset_id)) == "REMOVE_REFERENCE":
                    continue
            if spec.name == "Opportunity Links":
                opportunity_id = str(row.get("opportunity_id") or "")
                if resolutions.get(("opportunity", opportunity_id)) == "REMOVE_REFERENCE":
                    continue
            if spec.name == "Source Identities":
                entity_type = str(row.get("entity_type") or "")
                identity_domain = ENTITY_IDENTITY_DOMAINS.get(entity_type, entity_type)
                portable_entity_id = str(row.get("entity_id") or "")
                row["entity_id"] = identity_maps.get(identity_domain, {}).get(
                    portable_entity_id, portable_entity_id
                )
            rows.append(row)
        result[spec.name] = rows
    if source_profile_id == target_profile_id:
        raise PortableRestoreError("Fresh Profile runtime identity was not remapped")
    return result


def _row_identifier(spec: SheetSpec, row: Mapping[str, Any], index: int) -> str:
    if spec.name in PRIMARY_IDENTITIES:
        return str(row[PRIMARY_IDENTITIES[spec.name][0]])
    if spec.order_by:
        return "|".join(str(row.get(field) or "") for field in spec.order_by)
    return str(index)


def _insert_row(connection: Any, spec: SheetSpec, row: Mapping[str, Any]) -> None:
    columns = spec.columns
    placeholders = ",".join("?" for _ in columns)
    connection.execute(
        f"INSERT INTO {spec.table} ({','.join(columns)}) VALUES ({placeholders})",
        tuple(row.get(column) for column in columns),
    )


def _audit_insert(
    connection: Any,
    *,
    execution_id: str,
    restore_run_id: str,
    target_profile_id: str,
    domain_name: str,
    write_key: str,
    row_id: str,
    row: Mapping[str, Any],
) -> None:
    after_json = _canonical_json(row)
    connection.execute(
        """
        INSERT INTO profile_portable_restore_write_audit (
          execution_id, restore_run_id, write_key, target_profile_id, domain_name,
          row_id, operation, before_json, after_json, before_fingerprint,
          after_fingerprint, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'insert', '{}', ?, ?, ?, ?)
        """,
        (
            execution_id,
            restore_run_id,
            write_key,
            target_profile_id,
            domain_name,
            row_id,
            after_json,
            _sha256("{}"),
            _sha256(after_json),
            _now(),
        ),
    )


def _write_restore_rows(
    connection: Any,
    *,
    restore_run_id: str,
    execution_id: str,
    target_profile_id: str,
    actor_email: str,
    rows_by_sheet: Mapping[str, Sequence[Mapping[str, Any]]],
    identity_records: Sequence[tuple[str, str, str]],
) -> int:
    write_count = 0
    now = _now()
    for spec in PORTABLE_PAYLOAD_SPECS:
        rows = rows_by_sheet[spec.name]
        if spec.name in PROVENANCE_SHEETS:
            for index, row in enumerate(rows):
                row_id = _row_identifier(spec, row, index)
                connection.execute(
                    "INSERT INTO profile_portable_restored_provenance "
                    "(target_profile_id, sheet_name, row_key, row_json, sort_order, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        target_profile_id,
                        spec.name,
                        row_id,
                        _canonical_json(row),
                        index,
                        now,
                    ),
                )
                _audit_insert(
                    connection,
                    execution_id=execution_id,
                    restore_run_id=restore_run_id,
                    target_profile_id=target_profile_id,
                    domain_name=spec.name,
                    write_key=f"{spec.name}:{row_id}",
                    row_id=row_id,
                    row=row,
                )
                write_count += 1
            continue
        for index, row in enumerate(rows):
            row_id = _row_identifier(spec, row, index)
            _insert_row(connection, spec, row)
            _audit_insert(
                connection,
                execution_id=execution_id,
                restore_run_id=restore_run_id,
                target_profile_id=target_profile_id,
                domain_name=spec.name,
                write_key=f"{spec.name}:{row_id}",
                row_id=row_id,
                row=row,
            )
            write_count += 1
    for domain, portable_id, runtime_id in identity_records:
        connection.execute(
            "INSERT INTO profile_portable_restore_identity_map "
            "(restore_run_id, target_profile_id, domain_name, portable_id, runtime_id, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (restore_run_id, target_profile_id, domain, portable_id, runtime_id, now),
        )
    if postgres_runtime_enabled():
        connection.execute(
            """
            INSERT INTO fund_manager_profile_links (
              email, profile_id, is_primary, created_at
            ) VALUES (
              ?, ?,
              CASE WHEN EXISTS (
                SELECT 1 FROM fund_manager_profile_links WHERE email = ?
              ) THEN 0 ELSE 1 END,
              ?
            )
            ON CONFLICT(email, profile_id) DO NOTHING
            """,
            (actor_email.casefold(), target_profile_id, actor_email.casefold(), now),
        )
    return write_count


def _parse_export_for_comparison(content: bytes) -> dict[str, tuple[dict[str, Any], ...]]:
    return parse_profile_portable_export(content).sheets


def _normalized_projection(
    sheets: Mapping[str, Sequence[Mapping[str, Any]]],
    *,
    inverse_identity_maps: Mapping[str, Mapping[str, str]] | None = None,
    target_profile_id: str = "",
    source_profile_id: str = "",
    selected_sheets: set[str] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    inverse = inverse_identity_maps or {}
    projection: dict[str, list[dict[str, Any]]] = {}
    for spec in PORTABLE_PAYLOAD_SPECS:
        if selected_sheets is not None and spec.name not in selected_sheets:
            continue
        normalized_rows: list[dict[str, Any]] = []
        for source in sheets[spec.name]:
            row = {field: source.get(field) for field in spec.columns}
            if "profile_id" in row and str(row["profile_id"]) == target_profile_id:
                row["profile_id"] = source_profile_id
            primary = PRIMARY_IDENTITIES.get(spec.name)
            if primary is not None:
                field, domain = primary
                row[field] = inverse.get(domain, {}).get(str(row.get(field) or ""), row.get(field))
            for (sheet_name, field), domain in FOREIGN_ID_FIELDS.items():
                if sheet_name == spec.name and row.get(field):
                    row[field] = inverse.get(domain, {}).get(str(row[field]), row[field])
            if spec.name == "Source Identities" and row.get("entity_id"):
                domain = str(row.get("entity_type") or "")
                identity_domain = ENTITY_IDENTITY_DOMAINS.get(domain, domain)
                row["entity_id"] = inverse.get(identity_domain, {}).get(
                    str(row["entity_id"]), row["entity_id"]
                )
            if spec.name == "Profile":
                row.pop("profile_code", None)
            normalized_rows.append(row)
        normalized_rows.sort(
            key=lambda row: tuple(str(row.get(field) or "") for field in spec.order_by)
        )
        projection[spec.name] = normalized_rows
    return projection


def _projection_checksum(projection: Mapping[str, Sequence[Mapping[str, Any]]]) -> str:
    return _sha256(_canonical_json(projection))


def _restore_reconciliation(
    *,
    parsed: ParsedPortableBackup,
    expected_sheets: Mapping[str, Sequence[Mapping[str, Any]]],
    target_profile_id: str,
    identity_maps: Mapping[str, Mapping[str, str]],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    restored_export = build_profile_portable_export(target_profile_id)
    restored_sheets = _parse_export_for_comparison(restored_export.content)
    inverse = {
        domain: {runtime_id: portable_id for portable_id, runtime_id in values.items()}
        for domain, values in identity_maps.items()
    }
    source_profile_id = str(parsed.sheets["Profile"][0]["profile_id"])
    source_full = _normalized_projection(
        expected_sheets,
        inverse_identity_maps=inverse,
        target_profile_id=target_profile_id,
        source_profile_id=source_profile_id,
    )
    target_full = _normalized_projection(
        restored_sheets,
        inverse_identity_maps=inverse,
        target_profile_id=target_profile_id,
        source_profile_id=source_profile_id,
    )
    source_financial = _normalized_projection(
        expected_sheets,
        inverse_identity_maps=inverse,
        target_profile_id=target_profile_id,
        source_profile_id=source_profile_id,
        selected_sheets=FINANCIAL_SHEETS,
    )
    target_financial = _normalized_projection(
        restored_sheets,
        inverse_identity_maps=inverse,
        target_profile_id=target_profile_id,
        source_profile_id=source_profile_id,
        selected_sheets=FINANCIAL_SHEETS,
    )
    financial_source_checksum = _projection_checksum(source_financial)
    financial_target_checksum = _projection_checksum(target_financial)
    financial = {
        "status": "PASS" if financial_source_checksum == financial_target_checksum else "FAIL",
        "contract": "portable-financial-state-parity-v1",
        "source_checksum": financial_source_checksum,
        "restored_checksum": financial_target_checksum,
    }
    source_checksum = _projection_checksum(source_full)
    target_checksum = _projection_checksum(target_full)
    parity = {
        "status": "PASS" if source_checksum == target_checksum else "FAIL",
        "contract": "portable-logical-parity-v1",
        "source_checksum": source_checksum,
        "restored_checksum": target_checksum,
        "raw_source_export_checksum": parsed.source_logical_checksum,
        "raw_restored_export_checksum": restored_export.logical_checksum,
        "excluded_runtime_fields": ["Profile.profile_code"],
        "runtime_ids_remapped_to_portable_ids": True,
        "review_resolutions_applied_before_comparison": True,
    }
    operational = generate_post_import_operational_health(profile_id=target_profile_id)
    return financial, operational, parity


def _rollback_failed_restore(
    *, restore_run_id: str, execution_id: str, target_profile_id: str, error: Exception
) -> None:
    now = _now()
    with connect() as connection:
        connection.execute("DELETE FROM profiles WHERE profile_id = ?", (target_profile_id,))
        connection.execute(
            "UPDATE profile_portable_restore_write_audit SET rolled_back_at = ? "
            "WHERE execution_id = ? AND rolled_back_at = ''",
            (now, execution_id),
        )
        connection.execute(
            "UPDATE profile_portable_restore_checkpoints SET status = 'RESTORED', restored_at = ? "
            "WHERE execution_id = ?",
            (now, execution_id),
        )
        connection.execute(
            "UPDATE profile_portable_restore_attempts SET status = 'ROLLED_BACK', "
            "stage = 'FAILED', error_json = ?, rollback_status = 'RESTORED', rolled_back_at = ?, "
            "completed_at = ?, updated_at = ? WHERE execution_id = ?",
            (
                _canonical_json({"type": type(error).__name__, "message": str(error)}),
                now,
                now,
                now,
                execution_id,
            ),
        )
        connection.execute(
            "UPDATE profile_portable_restore_runs SET status = 'FAILED', target_profile_id = '', "
            "result_json = ?, updated_at = ?, completed_at = ? WHERE restore_run_id = ?",
            (
                _canonical_json(
                    {
                        "status": "FAILED",
                        "execution_id": execution_id,
                        "error": str(error),
                        "rollback": "RESTORED",
                    }
                ),
                now,
                now,
                restore_run_id,
            ),
        )


def execute_portable_restore(
    *, restore_run_id: str, owner_email: str, actor_email: str
) -> dict[str, Any]:
    now = _now()
    with connect() as connection:
        lock_suffix = " FOR UPDATE" if postgres_runtime_enabled() else ""
        run = connection.execute(
            "SELECT * FROM profile_portable_restore_runs WHERE restore_run_id = ? "
            "AND lower(owner_email) = lower(?)" + lock_suffix,
            (restore_run_id, owner_email),
        ).fetchone()
        if run is None:
            raise PortableRestoreError("Portable restore was not found")
        if str(run["status"]) == "COMPLETE":
            response = _run_response(connection, restore_run_id, owner_email)
            assert response is not None
            return response
        unresolved = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_portable_restore_reviews "
                "WHERE restore_run_id = ? AND resolution = ''",
                (restore_run_id,),
            ).fetchone()["count"]
        )
        if unresolved:
            raise PortableRestoreError("Resolve every global reference review before restore")
        active = connection.execute(
            "SELECT * FROM profile_portable_restore_attempts WHERE restore_run_id = ? "
            "AND status IN ('RUNNING', 'RECONCILING') ORDER BY attempt_number DESC LIMIT 1",
            (restore_run_id,),
        ).fetchone()
        if active is not None:
            raise PortableRestoreError("Portable restore execution is already running")
        if active is None:
            if str(run["status"]) not in {"READY", "FAILED"}:
                raise PortableRestoreError("Portable restore is not ready")
            target_profile_code = str(run["target_profile_code"])
            if (
                connection.execute(
                    "SELECT 1 FROM profiles WHERE profile_code = ?", (target_profile_code,)
                ).fetchone()
                is not None
            ):
                raise PortableRestoreError("Target Profile code is no longer available")
            target_profile_id = _new_runtime_id("profile")
            execution_id = f"portable-restore-execution-{uuid4().hex}"
            checkpoint_id = f"portable-restore-checkpoint-{uuid4().hex}"
            attempt_number = (
                int(
                    connection.execute(
                        "SELECT COALESCE(MAX(attempt_number), 0) AS count "
                        "FROM profile_portable_restore_attempts WHERE restore_run_id = ?",
                        (restore_run_id,),
                    ).fetchone()["count"]
                )
                + 1
            )
            snapshot = {"profile_id": target_profile_id, "state": "ABSENT"}
            snapshot_json = _canonical_json(snapshot)
            connection.execute(
                """
                INSERT INTO profile_portable_restore_attempts (
                  execution_id, restore_run_id, attempt_number, target_profile_id,
                  actor_email, checkpoint_id, status, stage, rollback_status,
                  started_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'RUNNING', 'PREPARING', 'AVAILABLE', ?, ?)
                """,
                (
                    execution_id,
                    restore_run_id,
                    attempt_number,
                    target_profile_id,
                    actor_email,
                    checkpoint_id,
                    now,
                    now,
                ),
            )
            connection.execute(
                """
                INSERT INTO profile_portable_restore_checkpoints (
                  checkpoint_id, execution_id, restore_run_id, target_profile_id,
                  pre_restore_state, snapshot_json, snapshot_checksum, status, created_at
                ) VALUES (?, ?, ?, ?, 'ABSENT', ?, ?, 'AVAILABLE', ?)
                """,
                (
                    checkpoint_id,
                    execution_id,
                    restore_run_id,
                    target_profile_id,
                    snapshot_json,
                    _sha256(snapshot_json),
                    now,
                ),
            )
            connection.execute(
                "UPDATE profile_portable_restore_runs SET status = 'RESTORING', "
                "target_profile_id = ?, updated_at = ? WHERE restore_run_id = ?",
                (target_profile_id, now, restore_run_id),
            )
            active = connection.execute(
                "SELECT * FROM profile_portable_restore_attempts WHERE execution_id = ?",
                (execution_id,),
            ).fetchone()
        assert active is not None
        execution_id = str(active["execution_id"])
        target_profile_id = str(active["target_profile_id"])
        run = connection.execute(
            "SELECT * FROM profile_portable_restore_runs WHERE restore_run_id = ?",
            (restore_run_id,),
        ).fetchone()
        assert run is not None
        parsed = _deserialize_parsed(str(run["payload_json"]))
        resolutions = _resolution_map(connection, restore_run_id)

    try:
        with connect() as connection:
            target_exists = connection.execute(
                "SELECT 1 FROM profiles WHERE profile_id = ?", (target_profile_id,)
            ).fetchone()
            identity_rows = connection.execute(
                "SELECT domain_name, portable_id, runtime_id "
                "FROM profile_portable_restore_identity_map WHERE restore_run_id = ?",
                (restore_run_id,),
            ).fetchall()
            identity_maps: dict[str, dict[str, str]]
            if target_exists is None:
                identity_maps, identity_records = _identity_maps(parsed, target_profile_id)
                rows_by_sheet = _resolved_rows(
                    parsed,
                    target_profile_id=target_profile_id,
                    target_display_name=str(run["target_display_name"]),
                    target_profile_code=str(run["target_profile_code"]),
                    identity_maps=identity_maps,
                    resolutions=resolutions,
                )
                write_count = _write_restore_rows(
                    connection,
                    restore_run_id=restore_run_id,
                    execution_id=execution_id,
                    target_profile_id=target_profile_id,
                    actor_email=actor_email,
                    rows_by_sheet=rows_by_sheet,
                    identity_records=identity_records,
                )
            else:
                identity_maps = {}
                for identity in identity_rows:
                    identity_maps.setdefault(str(identity["domain_name"]), {})[
                        str(identity["portable_id"])
                    ] = str(identity["runtime_id"])
                rows_by_sheet = _resolved_rows(
                    parsed,
                    target_profile_id=target_profile_id,
                    target_display_name=str(run["target_display_name"]),
                    target_profile_code=str(run["target_profile_code"]),
                    identity_maps=identity_maps,
                    resolutions=resolutions,
                )
                write_count = int(
                    connection.execute(
                        "SELECT COUNT(*) AS count FROM profile_portable_restore_write_audit "
                        "WHERE execution_id = ? AND rolled_back_at = ''",
                        (execution_id,),
                    ).fetchone()["count"]
                )
            connection.execute(
                "UPDATE profile_portable_restore_attempts SET status = 'RECONCILING', "
                "stage = 'RECONCILING', updated_at = ? WHERE execution_id = ?",
                (_now(), execution_id),
            )

        financial, operational, parity = _restore_reconciliation(
            parsed=parsed,
            expected_sheets=rows_by_sheet,
            target_profile_id=target_profile_id,
            identity_maps=identity_maps,
        )
        passed = (
            financial["status"] == "PASS"
            and operational["status"] == "OPERATIONAL HEALTH: PASSED"
            and parity["status"] == "PASS"
        )
        if not passed:
            raise PortableRestoreError("Portable restore reconciliation failed")
        completed_at = _now()
        result = {
            "status": "COMPLETE",
            "execution_id": execution_id,
            "target_profile_id": target_profile_id,
            "write_count": write_count,
            "financial_reconciliation": financial,
            "operational_reconciliation": operational,
            "logical_parity": parity,
        }
        with connect() as connection:
            connection.execute(
                "UPDATE profile_portable_restore_attempts SET status = 'COMPLETE', "
                "stage = 'COMPLETE', financial_reconciliation_json = ?, "
                "operational_reconciliation_json = ?, parity_json = ?, "
                "completed_at = ?, updated_at = ? WHERE execution_id = ?",
                (
                    _canonical_json(financial),
                    _canonical_json(operational),
                    _canonical_json(parity),
                    completed_at,
                    completed_at,
                    execution_id,
                ),
            )
            connection.execute(
                "UPDATE profile_portable_restore_runs SET status = 'COMPLETE', result_json = ?, "
                "completed_at = ?, updated_at = ? WHERE restore_run_id = ?",
                (_canonical_json(result), completed_at, completed_at, restore_run_id),
            )
            response = _run_response(connection, restore_run_id, owner_email)
        assert response is not None
        return response
    except Exception as error:
        _rollback_failed_restore(
            restore_run_id=restore_run_id,
            execution_id=execution_id,
            target_profile_id=target_profile_id,
            error=error,
        )
        raise


@router.post("/analyse", status_code=201)
def analyse_portable_restore_route(
    payload: PortableRestoreAnalysisPayload, request: Request
) -> dict[str, Any]:
    session = _require_fund_manager(request)
    try:
        return analyse_portable_restore(payload=payload, owner_email=session.email)
    except (PortableRestoreError, PortableExportError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/{restore_run_id}")
def get_portable_restore_route(restore_run_id: str, request: Request) -> dict[str, Any]:
    session = _require_fund_manager(request)
    with connect() as connection:
        response = _run_response(connection, restore_run_id, session.email)
    if response is None:
        raise HTTPException(status_code=404, detail="Portable restore was not found")
    return response


@router.put("/{restore_run_id}/reviews")
def update_portable_restore_reviews_route(
    restore_run_id: str, payload: PortableRestoreReviewPayload, request: Request
) -> dict[str, Any]:
    session = _require_fund_manager(request)
    try:
        return apply_restore_review_decisions(
            restore_run_id=restore_run_id,
            owner_email=session.email,
            actor_email=session.email,
            decisions=[decision.model_dump() for decision in payload.decisions],
        )
    except PortableRestoreError as error:
        status = 404 if str(error) == "Portable restore was not found" else 409
        raise HTTPException(status_code=status, detail=str(error)) from error


@router.post("/{restore_run_id}/execute")
def execute_portable_restore_route(
    restore_run_id: str, payload: PortableRestoreExecutionPayload, request: Request
) -> dict[str, Any]:
    _ = payload
    session = _require_fund_manager(request)
    try:
        return execute_portable_restore(
            restore_run_id=restore_run_id,
            owner_email=session.email,
            actor_email=session.email,
        )
    except PortableRestoreError as error:
        status = 404 if str(error) == "Portable restore was not found" else 409
        raise HTTPException(status_code=status, detail=str(error)) from error
