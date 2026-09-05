from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping, Sequence

from fastapi import APIRouter, HTTPException, Request, Response

from openforge_api.account_catalogue_source import MasterAccountCatalogue
from openforge_api.auth import require_request_session
from openforge_api.config import settings
from openforge_api.db import connect_read_only, postgres_runtime_enabled
from openforge_api.profile_portable_export import XLSX_MEDIA_TYPE
from openforge_api.workbook_template_package import (
    WorkbookTemplatePackageError,
    allocate_workbook_record_ids,
    build_workbook_template_package,
    parse_iteration,
)

EXPORT_FORMAT_VERSION = "workbook-template-export-v1"
OUTPUT_CLASSIFICATION = (
    "STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING"
)

router = APIRouter(prefix="/profiles/{profile_id}/exports", tags=["workbook-template-export"])


class WorkbookTemplateExportError(ValueError):
    """Raised when current Profile state cannot be represented without silent loss."""


@dataclass(frozen=True)
class WorkbookTemplateExport:
    content: bytes
    filename: str
    byte_checksum: str
    logical_checksum: str
    template_checksum: str
    helper_checksum: str
    structure_manifest_checksum: str
    field_coverage_checksum: str
    changed_part_count: int
    unchanged_part_count: int
    warning_count: int
    classification: str


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"), sort_keys=True)


def _load_json(path: Path, label: str) -> tuple[dict[str, Any], str]:
    if not path.is_file():
        raise WorkbookTemplateExportError(f"{label} is unavailable")
    content = path.read_bytes()
    try:
        value = json.loads(content)
    except json.JSONDecodeError as error:
        raise WorkbookTemplateExportError(f"{label} is invalid") from error
    return value, sha256(content).hexdigest()


def _load_catalogue(connection: Any) -> MasterAccountCatalogue:
    if postgres_runtime_enabled():
        row = connection.execute(
            "SELECT document_json FROM account_catalogue_documents "
            "WHERE document_id = 'master-account-catalogue'"
        ).fetchone()
        if row is None:
            raise WorkbookTemplateExportError("Account Catalogue authority is unavailable")
        return MasterAccountCatalogue.model_validate_json(str(row["document_json"]))
    path = Path(settings.account_catalogue_source)
    if not path.is_file():
        raise WorkbookTemplateExportError("Account Catalogue authority is unavailable")
    return MasterAccountCatalogue.model_validate_json(path.read_text(encoding="utf-8"))


def _one(connection: Any, table: str, profile_id: str) -> dict[str, Any]:
    row = connection.execute(
        f"SELECT * FROM {table} WHERE profile_id = ?",  # noqa: S608
        (profile_id,),
    ).fetchone()
    if row is None:
        raise WorkbookTemplateExportError(f"Required Profile domain is missing: {table}")
    return dict(row)


def _many(connection: Any, table: str, profile_id: str, order_by: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in connection.execute(
            f"SELECT * FROM {table} WHERE profile_id = ? ORDER BY {order_by}",  # noqa: S608
            (profile_id,),
        ).fetchall()
    ]


def _count(connection: Any, table: str, profile_id: str) -> int:
    return int(
        connection.execute(
            f"SELECT COUNT(*) AS count FROM {table} WHERE profile_id = ?",  # noqa: S608
            (profile_id,),
        ).fetchone()["count"]
    )


def _restored_source_identities(connection: Any, profile_id: str) -> list[dict[str, Any]]:
    rows = connection.execute(
        "SELECT row_json FROM profile_portable_restored_provenance "
        "WHERE target_profile_id = ? AND sheet_name = 'Source Identities' "
        "ORDER BY sort_order, row_key",
        (profile_id,),
    ).fetchall()
    return [json.loads(str(row["row_json"])) for row in rows]


def _source_identity_map(connection: Any, profile_id: str) -> dict[tuple[str, str, str], str]:
    result: dict[tuple[str, str, str], str] = {}
    rows = connection.execute(
        "SELECT source_sheet, source_record_id, entity_type, entity_id "
        "FROM import_source_records WHERE profile_id = ? "
        "ORDER BY source_sheet, source_record_id",
        (profile_id,),
    ).fetchall()
    for raw in [dict(row) for row in rows] + _restored_source_identities(connection, profile_id):
        entity_type = str(raw.get("entity_type") or "")
        entity_id = str(raw.get("entity_id") or "")
        source_record_id = str(raw.get("source_record_id") or "")
        if not entity_type or not entity_id or not source_record_id:
            continue
        source_sheet = str(raw.get("source_sheet") or "")
        if not source_sheet:
            continue
        key = (source_sheet, entity_type, entity_id)
        existing = result.get(key)
        if existing and existing != source_record_id:
            raise WorkbookTemplateExportError(
                f"Conflicting source identities exist for {source_sheet} {entity_type} {entity_id}"
            )
        result[key] = source_record_id

    audit_rows = connection.execute(
        "SELECT import_key, entity_type, entity_id "
        "FROM profile_import_attempt_write_audit WHERE profile_id = ? "
        "AND rolled_back_at = '' ORDER BY created_at, execution_id, import_key",
        (profile_id,),
    ).fetchall()
    for row in audit_rows:
        import_key = str(row["import_key"] or "")
        try:
            source_sheet, remainder = import_key.split(":", 1)
            source_record_id, _fingerprint = remainder.rsplit(":", 1)
        except ValueError:
            continue
        key = (source_sheet, str(row["entity_type"]), str(row["entity_id"]))
        existing = result.get(key)
        if existing and existing != source_record_id:
            raise WorkbookTemplateExportError(
                "Conflicting import-attempt source identities exist for "
                f"{source_sheet} {row['entity_type']} {row['entity_id']}"
            )
        result[key] = source_record_id
    return result


def _json_list(value: object, label: str) -> list[Any]:
    try:
        result = json.loads(str(value or "[]"))
    except json.JSONDecodeError as error:
        raise WorkbookTemplateExportError(f"Invalid {label} JSON") from error
    if not isinstance(result, list):
        raise WorkbookTemplateExportError(f"Invalid {label} JSON")
    return result


def _account_workbook_status(row: Mapping[str, Any]) -> str:
    lifecycle = str(row.get("lifecycle_status") or "").strip()
    restrictions = [str(value) for value in _json_list(row.get("restrictions_json"), "restriction")]
    if not restrictions:
        return lifecycle
    if lifecycle != "Active" or len(restrictions) != 1:
        raise WorkbookTemplateExportError(
            f"Account {row['account_id']} has restrictions the approved workbook cannot represent"
        )
    mapping = {"Bonus Restricted": "Bonus Restricted", "Soft Limited": "Stake Restricted"}
    if restrictions[0] not in mapping:
        raise WorkbookTemplateExportError(
            f"Account {row['account_id']} has restrictions the approved workbook cannot represent"
        )
    return mapping[restrictions[0]]


def _unsupported_profile_state(
    connection: Any,
    profile_id: str,
    sportsbook: Sequence[Mapping[str, Any]],
    free_bets: Sequence[Mapping[str, Any]],
    casino: Sequence[Mapping[str, Any]],
    accounts: Sequence[Mapping[str, Any]],
) -> list[str]:
    blockers: list[str] = []
    for table in (
        "fee_periods",
        "fee_period_revisions",
        "fee_corrections",
        "fee_withdrawal_links",
    ):
        if _count(connection, table, profile_id):
            blockers.append(table)
    for row in sportsbook:
        if (
            str(row.get("manual_override_value") or "").strip()
            or str(row.get("manual_override_reason") or "").strip()
        ):
            blockers.append(f"sportsbook_manual_override_reason:{row['sportsbook_bet_id']}")
        outcomes = _json_list(row.get("multi_lay_outcomes_json"), "sportsbook multilay")
        if outcomes or str(row.get("multi_lay_outcome_1_name") or "").strip():
            blockers.append(f"sportsbook_multilay:{row['sportsbook_bet_id']}")
        advanced_values = (
            "profit_boost_mode",
            "base_back_odds",
            "profit_boost_percent",
            "maximum_boost_winnings",
            "actual_accepted_back_odds",
            "bonus_trigger",
        )
        if any(str(row.get(field) or "").strip() for field in advanced_values):
            blockers.append(f"sportsbook_extended_calculation:{row['sportsbook_bet_id']}")
    for row in free_bets:
        if (
            str(row.get("manual_override_value") or "").strip()
            or str(row.get("manual_override_reason") or "").strip()
        ):
            blockers.append(f"free_bet_manual_override_reason:{row['free_bet_id']}")
    extended_casino = (
        "wagering_base",
        "custom_wager_base",
        "wagering_completed",
        "rtp_percent",
        "reward_type",
        "reward_wager_multiplier",
        "reward_wager_target",
        "reward_required_spins",
        "reward_wagering_completed",
        "reward_rtp_percent",
        "expected_reward_cash_value",
        "qualifying_expected_loss",
        "reward_expected_loss",
        "other_expected_costs",
        "campaign_ev",
        "own_cash_committed",
        "cash_returned",
        "settlement_other_costs",
    )
    for row in casino:
        if any(str(row.get(field) or "").strip() for field in extended_casino):
            blockers.append(f"casino_extended_calculation:{row['casino_offer_id']}")
    for row in accounts:
        try:
            _account_workbook_status(row)
        except WorkbookTemplateExportError:
            blockers.append(f"account_restrictions:{row['account_id']}")
    return sorted(set(blockers))


def _catalogue_maps(catalogue: MasterAccountCatalogue) -> tuple[dict[str, str], dict[str, str]]:
    names = {row.catalogue_id: row.brand_name for row in catalogue.records}
    risks = {row.catalogue_id: row.risk_team for row in catalogue.records}
    return names, risks


def _validate_contract_schema(
    connection: Any,
    *,
    structure: Mapping[str, Any],
    coverage: Mapping[str, Any],
) -> None:
    if coverage.get("output_classification") != OUTPUT_CLASSIFICATION:
        raise WorkbookTemplateExportError("Workbook output classification is invalid")
    if set(structure.get("ledgers", {})) != set(coverage.get("ledgers", {})):
        raise WorkbookTemplateExportError("Workbook ledger coverage is incomplete")
    for sheet_name, ledger in coverage["ledgers"].items():
        table = str(ledger["database_table"])
        cursor = connection.execute(
            f"SELECT * FROM {table} WHERE 1 = 0"  # noqa: S608
        )
        database_columns = {str(item[0]) for item in (cursor.description or ())}
        if str(ledger["runtime_id"]) not in database_columns:
            raise WorkbookTemplateExportError(
                f"Workbook runtime identity drift detected for {sheet_name}"
            )
        missing_sources = {
            str(spec["source"])
            for spec in ledger["columns"].values()
            if not str(spec["source"]).startswith("$")
            and str(spec["source"]) not in database_columns
        }
        if missing_sources:
            raise WorkbookTemplateExportError(
                f"Workbook database field drift detected for {sheet_name}: "
                + ", ".join(sorted(missing_sources))
            )


def _allocate_ids(
    rows: Sequence[dict[str, Any]],
    *,
    runtime_id: str,
    source_entity_type: str,
    source_sheet: str,
    prefix: str,
    iteration: int,
    source_ids: Mapping[tuple[str, str, str], str],
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    ordered = sorted(rows, key=lambda row: str(row[runtime_id]))
    candidates = [
        source_ids.get(
            (
                source_sheet,
                str(row.get("_source_entity_type") or source_entity_type),
                str(row[runtime_id]),
            )
        )
        or str(row.get("_source_record_id") or "")
        or None
        for row in ordered
    ]
    allocated = allocate_workbook_record_ids(
        iteration=iteration,
        prefix=prefix,
        source_ids=candidates,
    )
    identity_map = {
        str(row[runtime_id]): export_id for row, export_id in zip(ordered, allocated, strict=True)
    }
    return ordered, identity_map


def _historical_extra_place_source_id(row: Mapping[str, Any]) -> str:
    import_key = str(row.get("source_import_id") or "")
    try:
        source_sheet, remainder = import_key.split(":", 1)
        source_record_id, _fingerprint = remainder.rsplit(":", 1)
    except ValueError:
        return ""
    return source_record_id if source_sheet == "Sportsbook Bets" else ""


def _historical_extra_place_as_sportsbook(row: Mapping[str, Any]) -> dict[str, Any]:
    if (
        str(row.get("calculation_provenance") or "") != "imported_historical"
        or not str(row.get("imported_historical_pnl") or "").strip()
    ):
        raise WorkbookTemplateExportError(
            "Platform-native or incomplete Extra Places cannot be represented by the approved "
            f"workbook: {row['each_way_extra_place_id']}"
        )
    status = str(row.get("status") or "")
    return {
        "sportsbook_bet_id": row["each_way_extra_place_id"],
        "_source_entity_type": "extra_place",
        "_source_record_id": _historical_extra_place_source_id(row),
        "event_name": row.get("race", ""),
        "market": row.get("runner", ""),
        "offer_text": "Historical Extra Place",
        "bookmaker": row.get("bookmaker", ""),
        "offer_type": "Extra Place",
        "bet_type": "Each Way",
        "offer_name": "Historical Extra Place",
        "fixture_type": "Horse Racing",
        "status": status,
        "result": row.get("result", ""),
        "back_stake": row.get("each_way_stake", ""),
        "back_odds": row.get("back_odds", ""),
        "match_strategy": "Standard",
        "lay_odds_1": row.get("win_lay_odds", ""),
        "exchange_name": row.get("win_exchange", ""),
        "lay_actual": row.get("actual_win_lay_stake", ""),
        "lay_matched_stake_1": row.get("actual_win_lay_stake", ""),
        "manual_override_value": row.get("imported_historical_pnl", ""),
        "user_notes": row.get("user_notes", ""),
        "date_settled": row.get("placed_at", ""),
    }


def _project_rows(
    rows: Sequence[Mapping[str, Any]],
    *,
    sheet_name: str,
    coverage: Mapping[str, Any],
    identities: Mapping[str, str],
    sportsbook_identities: Mapping[str, str],
    related_free_bet_identities: Mapping[str, str],
    catalogue_risks: Mapping[str, str],
) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    ledger = coverage["ledgers"][sheet_name]
    runtime_id = str(ledger["runtime_id"])
    for row in rows:
        output: dict[str, object] = {}
        for header, field in ledger["columns"].items():
            source = str(field["source"])
            if source == "$export_id":
                value: object = identities[str(row[runtime_id])]
            elif source == "$empty":
                value = ""
            elif source == "$account_workbook_status":
                value = _account_workbook_status(row)
            elif source == "$catalogue_risk_team":
                value = catalogue_risks.get(str(row.get("catalogue_id") or ""), "")
            elif source == "$linked_sportsbook_export_id":
                source_value = str(row.get("origin_qual_bet_id") or "")
                if not source_value:
                    value = ""
                elif source_value in sportsbook_identities:
                    value = sportsbook_identities[source_value]
                elif source_value in sportsbook_identities.values():
                    value = source_value
                else:
                    raise WorkbookTemplateExportError(
                        f"Free Bet {row[runtime_id]} has an unresolved Sportsbook link"
                    )
            elif source == "$linked_free_bet_export_id":
                value = related_free_bet_identities.get(str(row[runtime_id]), "")
            else:
                value = row.get(source, "")
            output[str(header)] = value
        result.append(output)
    return sorted(result, key=lambda row: str(next(iter(row.values()))))


def _control_values(
    profile: Mapping[str, Any],
    tracker: Mapping[str, Any],
    onboarding: Mapping[str, Any],
    catalogue_names: Mapping[str, str],
) -> dict[str, dict[str, tuple[object, str]]]:
    main_bank_id = str(onboarding.get("main_bank_catalogue_id") or "")
    if main_bank_id and main_bank_id not in catalogue_names:
        raise WorkbookTemplateExportError("The Profile main bank reference is unavailable")
    return {
        "Dashboard": {
            "B4": (profile["display_name"], "text"),
            "D4": (
                "Week (Mon–Sun)"
                if tracker["active_date_preset"] == "Week (Mon-Sun)"
                else tracker["active_date_preset"],
                "text",
            ),
            "F4": (tracker["custom_start_date"], "date_or_empty"),
            "B5": (catalogue_names.get(main_bank_id, ""), "text"),
            "D5": (tracker["range_back_days"], "integer"),
            "F5": (tracker["custom_end_date"], "date_or_empty"),
            "B6": (profile["tracking_start_date"], "date"),
            "D6": (tracker["range_forward_days"], "integer"),
            "F6": (onboarding["starting_bankroll"], "decimal"),
            "B7": (onboarding["iteration_number"], "integer"),
            "D7": (tracker["free_bet_expiry_alert_window_days"], "integer"),
        }
    }


def build_workbook_template_export(
    profile_id: str,
    *,
    exported_at: str | None = None,
) -> WorkbookTemplateExport:
    template_path = Path(settings.workbook_template_source)
    helper_path = Path(settings.workbook_template_helper_source)
    structure_path = Path(settings.workbook_template_structure_manifest)
    coverage_path = Path(settings.workbook_template_field_coverage)
    structure, structure_hash = _load_json(structure_path, "Workbook structure manifest")
    coverage, coverage_hash = _load_json(coverage_path, "Workbook field coverage")
    if not template_path.is_file() or not helper_path.is_file():
        raise WorkbookTemplateExportError(
            "The approved workbook template application is unavailable"
        )
    template_content = template_path.read_bytes()
    helper_content = helper_path.read_bytes()
    template_hash = sha256(template_content).hexdigest()
    helper_hash = sha256(helper_content).hexdigest()
    if template_hash != coverage["source_template_sha256"]:
        raise WorkbookTemplateExportError("Workbook template fingerprint is not approved")
    if helper_hash != coverage["source_helper_sha256"]:
        raise WorkbookTemplateExportError("Workbook helper fingerprint is not approved")

    warnings = list(coverage["intentionally_platform_only"])
    with connect_read_only() as connection:
        _validate_contract_schema(connection, structure=structure, coverage=coverage)
        profile_row = connection.execute(
            "SELECT * FROM profiles WHERE profile_id = ?", (profile_id,)
        ).fetchone()
        if profile_row is None:
            raise WorkbookTemplateExportError("Profile was not found")
        profile = dict(profile_row)
        tracker = _one(connection, "profile_tracker_settings", profile_id)
        onboarding = _one(connection, "profile_onboarding_settings", profile_id)
        accounts = _many(connection, "accounts", profile_id, "account_id")
        sportsbook = _many(connection, "sportsbook_bets", profile_id, "sportsbook_bet_id")
        free_bets = _many(connection, "free_bets", profile_id, "free_bet_id")
        casino = _many(connection, "casino_offers", profile_id, "casino_offer_id")
        cash = _many(connection, "cash_adjustments", profile_id, "cash_adjustment_id")
        extra_places = _many(
            connection,
            "each_way_extra_places",
            profile_id,
            "each_way_extra_place_id",
        )
        blockers = _unsupported_profile_state(
            connection, profile_id, sportsbook, free_bets, casino, accounts
        )
        historical_extra_places: list[dict[str, Any]] = []
        for row in extra_places:
            try:
                historical_extra_places.append(_historical_extra_place_as_sportsbook(row))
            except WorkbookTemplateExportError:
                blockers.append(f"extra_place:{row['each_way_extra_place_id']}")
        if blockers:
            raise WorkbookTemplateExportError(
                "Working-workbook export is blocked by unrepresentable Profile state: "
                + ", ".join(sorted(set(blockers)))
            )
        source_ids = _source_identity_map(connection, profile_id)
        catalogue = _load_catalogue(connection)
        catalogue_names, catalogue_risks = _catalogue_maps(catalogue)
        iteration = parse_iteration(onboarding["iteration_number"])
        raw_by_sheet = {
            "Accounts": accounts,
            "Cash Adjustments": cash,
            "Sportsbook Bets": [*sportsbook, *historical_extra_places],
            "Free Bets": free_bets,
            "Casino Offers": casino,
        }
        identities: dict[str, dict[str, str]] = {}
        ordered_by_sheet: dict[str, list[dict[str, Any]]] = {}
        for sheet_name, rows in raw_by_sheet.items():
            ledger = coverage["ledgers"][sheet_name]
            structure_ledger = structure["ledgers"][sheet_name]
            ordered, identity_map = _allocate_ids(
                rows,
                runtime_id=str(ledger["runtime_id"]),
                source_entity_type=str(ledger["source_entity_type"]),
                source_sheet=str(ledger["source_sheet"]),
                prefix=str(structure_ledger["id_prefix"]),
                iteration=iteration,
                source_ids=source_ids,
            )
            ordered_by_sheet[sheet_name] = ordered
            identities[sheet_name] = identity_map
        sportsbook_runtime_by_export_id = {
            export_id: runtime_id for runtime_id, export_id in identities["Sportsbook Bets"].items()
        }
        related_free_bet_identities: dict[str, str] = {}
        for row in ordered_by_sheet["Free Bets"]:
            source_sportsbook_id = str(row.get("origin_qual_bet_id") or "")
            if not source_sportsbook_id:
                continue
            sportsbook_runtime_id = (
                source_sportsbook_id
                if source_sportsbook_id in identities["Sportsbook Bets"]
                else sportsbook_runtime_by_export_id.get(source_sportsbook_id, "")
            )
            if not sportsbook_runtime_id:
                raise WorkbookTemplateExportError(
                    f"Free Bet {row['free_bet_id']} has an unresolved Sportsbook link"
                )
            if sportsbook_runtime_id in related_free_bet_identities:
                raise WorkbookTemplateExportError(
                    "The approved workbook cannot represent multiple Free Bets linked to one "
                    f"Sportsbook row: {source_sportsbook_id}"
                )
            related_free_bet_identities[sportsbook_runtime_id] = identities["Free Bets"][
                str(row["free_bet_id"])
            ]
        projections = {
            sheet_name: _project_rows(
                rows,
                sheet_name=sheet_name,
                coverage=coverage,
                identities=identities[sheet_name],
                sportsbook_identities=identities["Sportsbook Bets"],
                related_free_bet_identities=related_free_bet_identities,
                catalogue_risks=catalogue_risks,
            )
            for sheet_name, rows in ordered_by_sheet.items()
        }
        controls = _control_values(profile, tracker, onboarding, catalogue_names)
        commissions = [
            (str(row["exchange_name"]), row["commission_rate"])
            for row in connection.execute(
                "SELECT exchange_name, commission_rate FROM profile_exchange_commissions "
                "WHERE profile_id = ? ORDER BY exchange_name",
                (profile_id,),
            ).fetchall()
        ]
        logical_checksum = sha256(
            _json(
                {
                    "contract": EXPORT_FORMAT_VERSION,
                    "profile_id": profile_id,
                    "controls": controls,
                    "commissions": commissions,
                    "ledgers": projections,
                    "platform_only": warnings,
                }
            ).encode()
        ).hexdigest()
        try:
            package = build_workbook_template_package(
                source_content=template_content,
                structure=structure,
                coverage=coverage,
                ledger_rows=projections,
                control_values=controls,
                exchange_commissions=commissions,
            )
        except WorkbookTemplatePackageError as error:
            raise WorkbookTemplateExportError(str(error)) from error

    export_timestamp = exported_at or datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    safe_code = re.sub(r"[^A-Za-z0-9-]+", "-", str(profile["profile_code"])).strip("-")
    filename = f"working-workbook-{safe_code or profile_id}-{export_timestamp}.xlsx"
    return WorkbookTemplateExport(
        content=package.content,
        filename=filename,
        byte_checksum=package.byte_checksum,
        logical_checksum=logical_checksum,
        template_checksum=template_hash,
        helper_checksum=helper_hash,
        structure_manifest_checksum=structure_hash,
        field_coverage_checksum=coverage_hash,
        changed_part_count=len(package.changed_parts),
        unchanged_part_count=package.unchanged_part_count,
        warning_count=len(warnings),
        classification=OUTPUT_CLASSIFICATION,
    )


@router.get("/working-workbook.xlsx")
def export_working_workbook(profile_id: str, request: Request) -> Response:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Fund Manager access is required")
    try:
        export = build_workbook_template_export(profile_id)
    except WorkbookTemplateExportError as error:
        status = 404 if str(error) == "Profile was not found" else 409
        raise HTTPException(status_code=status, detail=str(error)) from error
    return Response(
        content=export.content,
        media_type=XLSX_MEDIA_TYPE,
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{export.filename}"',
            "X-Export-Format-Version": EXPORT_FORMAT_VERSION,
            "X-Export-Logical-Checksum": export.logical_checksum,
            "X-Export-Byte-Checksum": export.byte_checksum,
            "X-Export-Template-Checksum": export.template_checksum,
            "X-Export-Helper-Checksum": export.helper_checksum,
            "X-Export-Structure-Checksum": export.structure_manifest_checksum,
            "X-Export-Coverage-Checksum": export.field_coverage_checksum,
            "X-Export-Changed-Part-Count": str(export.changed_part_count),
            "X-Export-Unchanged-Part-Count": str(export.unchanged_part_count),
            "X-Export-Platform-Only-Warning-Count": str(export.warning_count),
            "X-Export-Classification": "STRUCTURALLY_VALID_GOOGLE_RUNTIME_PENDING",
        },
    )
