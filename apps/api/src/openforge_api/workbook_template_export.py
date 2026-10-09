from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping, Sequence
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

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

EXPORT_FORMAT_VERSION = "workbook-template-export-v2"
OUTPUT_CLASSIFICATION = (
    "STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING"
)

router = APIRouter(prefix="/profiles/{profile_id}/exports", tags=["workbook-template-export"])


class WorkbookTemplateExportError(ValueError):
    """Raised when current Profile state cannot be represented without silent loss."""

    def __init__(
        self,
        technical_detail: str,
        *,
        code: str = "working_workbook_unavailable",
        owner_message: str = (
            "This Profile cannot be represented safely in the working workbook yet."
        ),
        owner_action: str = "Review the Profile data and try again.",
        action_href: str = "",
    ) -> None:
        super().__init__(technical_detail)
        self.code = code
        self.owner_message = owner_message
        self.owner_action = owner_action
        self.action_href = action_href


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
    scope: WorkbookExportScope
    counts: dict[str, WorkbookLedgerScopeCount]


class WorkbookLedgerScopeCount(BaseModel):
    included: int
    total: int
    outside_range: int = 0
    no_reporting_date: int = 0
    relationship_support: int = 0


class WorkbookTemplateExportSummary(BaseModel):
    scope: str
    scope_label: str
    start_date: str | None
    end_date: str | None
    timezone: str = "Europe/London"
    date_basis: str
    counts: dict[str, WorkbookLedgerScopeCount]
    can_export: bool
    legacy_profile_defaults: bool
    notice: str
    problem: str = ""
    owner_action: str = ""
    issues: list[str] = Field(default_factory=list)


@dataclass(frozen=True)
class WorkbookExportScope:
    key: str
    label: str
    start_date: date | None
    end_date: date | None


EXPORT_SCOPE_LABELS = {
    "all_history": "All History",
    "this_month": "This Month",
    "last_month": "Last Month",
    "last_90_days": "Last 90 Days",
    "custom": "Custom",
}

LEDGER_REPORTING_DATES = {
    "Sportsbook Bets": "date_settled",
    "Free Bets": "date_settled",
    "Casino Offers": "date_settling",
    "Cash Adjustments": "adjustment_date",
    "Historical Extra Places": "placed_at",
}

DATE_BASIS = (
    "Europe/London reporting dates: Sportsbook and Free Bets use their recorded settlement date; "
    "Casino uses its settling date; Cash Adjustments use their adjustment date; historical Extra "
    "Places use their placed date. Rows without that date remain included in All History and are "
    "shown as excluded from date-limited exports."
)


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"), sort_keys=True)


def _parse_scope_date(value: str | None, label: str) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError as error:
        raise WorkbookTemplateExportError(
            f"Invalid {label}: {text}",
            code="invalid_export_scope",
            owner_message=f"Enter a valid {label.replace('_', ' ')}.",
            owner_action="Correct the export dates and try again.",
        ) from error


def resolve_workbook_export_scope(
    scope: str,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    london_today: date | None = None,
) -> WorkbookExportScope:
    key = str(scope or "all_history").strip().lower()
    if key not in EXPORT_SCOPE_LABELS:
        raise WorkbookTemplateExportError(
            f"Unsupported working-workbook scope: {scope}",
            code="invalid_export_scope",
            owner_message="Choose a supported working-workbook date range.",
            owner_action="Select All History, This Month, Last Month, Last 90 Days or Custom.",
        )
    today = london_today or datetime.now(ZoneInfo("Europe/London")).date()
    if key == "all_history":
        return WorkbookExportScope(key, EXPORT_SCOPE_LABELS[key], None, None)
    if key == "this_month":
        return WorkbookExportScope(key, EXPORT_SCOPE_LABELS[key], today.replace(day=1), today)
    if key == "last_month":
        this_month = today.replace(day=1)
        previous_end = this_month - timedelta(days=1)
        return WorkbookExportScope(
            key,
            EXPORT_SCOPE_LABELS[key],
            previous_end.replace(day=1),
            previous_end,
        )
    if key == "last_90_days":
        return WorkbookExportScope(
            key,
            EXPORT_SCOPE_LABELS[key],
            today - timedelta(days=89),
            today,
        )
    custom_start = _parse_scope_date(start_date, "start date")
    custom_end = _parse_scope_date(end_date, "end date")
    if custom_start is None or custom_end is None:
        raise WorkbookTemplateExportError(
            "Custom working-workbook scope requires both dates",
            code="invalid_export_scope",
            owner_message="Choose both a start date and an end date for the custom export.",
            owner_action="Complete the two date fields and try again.",
        )
    if custom_start > custom_end:
        raise WorkbookTemplateExportError(
            "Custom working-workbook start date is after its end date",
            code="invalid_export_scope",
            owner_message="The custom start date must be on or before the end date.",
            owner_action="Correct the date range and try again.",
        )
    return WorkbookExportScope(key, EXPORT_SCOPE_LABELS[key], custom_start, custom_end)


def _ledger_reporting_date(sheet_name: str, row: Mapping[str, Any]) -> date | None:
    field = LEDGER_REPORTING_DATES[sheet_name]
    value = str(row.get(field) or "").strip()
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _scope_rows(
    rows: Sequence[dict[str, Any]],
    *,
    sheet_name: str,
    scope: WorkbookExportScope,
) -> tuple[list[dict[str, Any]], WorkbookLedgerScopeCount]:
    if scope.start_date is None or scope.end_date is None:
        all_selected = list(rows)
        return all_selected, WorkbookLedgerScopeCount(included=len(all_selected), total=len(rows))
    selected: list[dict[str, Any]] = []
    undated = 0
    outside = 0
    for row in rows:
        reporting_date = _ledger_reporting_date(sheet_name, row)
        if reporting_date is None:
            undated += 1
        elif scope.start_date <= reporting_date <= scope.end_date:
            selected.append(row)
        else:
            outside += 1
    return selected, WorkbookLedgerScopeCount(
        included=len(selected),
        total=len(rows),
        outside_range=outside,
        no_reporting_date=undated,
    )


def _optional_one(connection: Any, table: str, profile_id: str) -> dict[str, Any] | None:
    row = connection.execute(
        f"SELECT * FROM {table} WHERE profile_id = ?",  # noqa: S608
        (profile_id,),
    ).fetchone()
    return dict(row) if row is not None else None


def _legacy_onboarding_defaults(profile_id: str) -> dict[str, Any]:
    return {
        "profile_id": profile_id,
        "iteration_number": 1,
        "starting_bankroll": "",
        "main_bank_catalogue_id": "",
        "onboarding_status": "legacy_settings_unavailable",
    }


def _owner_issue(blocker: str) -> str:
    if "Extra Places" in blocker or "extra_place:" in blocker:
        return (
            "Historical Extra Place records in this range are not supported by the working "
            "workbook."
        )
    if blocker.startswith("fee_"):
        return "This Profile has fee history that the working workbook cannot preserve."
    if blocker.startswith("sportsbook_manual_override") or blocker.startswith(
        "free_bet_manual_override"
    ):
        return (
            "A selected betting record has a manual financial override that the workbook cannot "
            "preserve."
        )
    if blocker.startswith("sportsbook_multilay"):
        return (
            "A selected Sportsbook record uses a multi-lay configuration that the workbook cannot "
            "preserve."
        )
    if blocker.startswith("sportsbook_extended_calculation") or blocker.startswith(
        "casino_extended_calculation"
    ):
        return "A selected record uses an advanced calculation that the workbook cannot preserve."
    if blocker.startswith("account_restrictions"):
        return "An Account has restrictions that the workbook cannot represent safely."
    return "A selected record cannot be represented safely in the working workbook."


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
            str(spec["source"]).split(".", 1)[0]
            for spec in ledger["columns"].values()
            if not str(spec["source"]).startswith("$")
            and str(spec["source"]).split(".", 1)[0] not in database_columns
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
            f"workbook: extra_place:{row['each_way_extra_place_id']}"
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


def _selected_export_rows(
    *,
    accounts: list[dict[str, Any]],
    sportsbook: list[dict[str, Any]],
    free_bets: list[dict[str, Any]],
    casino: list[dict[str, Any]],
    cash: list[dict[str, Any]],
    extra_places: list[dict[str, Any]],
    source_ids: Mapping[tuple[str, str, str], str],
    scope: WorkbookExportScope,
) -> tuple[dict[str, list[dict[str, Any]]], dict[str, WorkbookLedgerScopeCount]]:
    selected_sportsbook, sportsbook_count = _scope_rows(
        sportsbook, sheet_name="Sportsbook Bets", scope=scope
    )
    selected_free_bets, free_bet_count = _scope_rows(free_bets, sheet_name="Free Bets", scope=scope)
    selected_casino, casino_count = _scope_rows(casino, sheet_name="Casino Offers", scope=scope)
    selected_cash, cash_count = _scope_rows(cash, sheet_name="Cash Adjustments", scope=scope)
    selected_extra_places, extra_place_count = _scope_rows(
        extra_places, sheet_name="Historical Extra Places", scope=scope
    )

    # A selected Free Bet keeps its qualifying Sportsbook parent even when that parent falls just
    # outside a date-limited scope. The summary identifies these relationship-support rows so the
    # workbook remains honest about why they are present.
    selected_sportsbook_ids = {str(row["sportsbook_bet_id"]) for row in selected_sportsbook}
    required_parent_tokens = {
        str(row.get("origin_qual_bet_id") or "").strip()
        for row in selected_free_bets
        if str(row.get("origin_qual_bet_id") or "").strip()
    }
    relationship_support = 0
    if required_parent_tokens:
        for row in sportsbook:
            runtime_id = str(row["sportsbook_bet_id"])
            source_id = source_ids.get(("Sportsbook Bets", "sportsbook_bet", runtime_id), "")
            if runtime_id not in selected_sportsbook_ids and (
                runtime_id in required_parent_tokens or source_id in required_parent_tokens
            ):
                selected_sportsbook.append(row)
                selected_sportsbook_ids.add(runtime_id)
                relationship_support += 1
    sportsbook_count.included += relationship_support
    sportsbook_count.relationship_support = relationship_support

    converted_extra_places = [
        _historical_extra_place_as_sportsbook(row) for row in selected_extra_places
    ]
    return (
        {
            "Accounts": accounts,
            "Cash Adjustments": selected_cash,
            "Sportsbook Bets": [*selected_sportsbook, *converted_extra_places],
            "Free Bets": selected_free_bets,
            "Casino Offers": selected_casino,
        },
        {
            "Accounts": WorkbookLedgerScopeCount(included=len(accounts), total=len(accounts)),
            "Sportsbook Bets": sportsbook_count,
            "Free Bets": free_bet_count,
            "Casino Offers": casino_count,
            "Cash Adjustments": cash_count,
            "Historical Extra Places": extra_place_count,
        },
    )


def _project_rows(
    rows: Sequence[Mapping[str, Any]],
    *,
    sheet_name: str,
    coverage: Mapping[str, Any],
    identities: Mapping[str, str],
    sportsbook_identities: Mapping[str, str],
    related_free_bet_identities: Mapping[str, str],
    catalogue_risks: Mapping[str, str],
    exchange_commissions: Mapping[str, object],
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
            elif source == "$exchange_commission":
                value = exchange_commissions.get(str(row.get("account") or ""), "")
            elif source == "$restrictions_csv":
                try:
                    restrictions = json.loads(str(row.get("restrictions_json") or "[]"))
                except json.JSONDecodeError as error:
                    raise WorkbookTemplateExportError(
                        f"Account {row[runtime_id]} has invalid restriction evidence"
                    ) from error
                value = ", ".join(str(item) for item in restrictions)
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
                root, separator, child = source.partition(".")
                value = row.get(root, "")
                if separator:
                    try:
                        nested = json.loads(str(value or "{}"))
                    except json.JSONDecodeError as error:
                        raise WorkbookTemplateExportError(
                            f"{sheet_name} {row[runtime_id]} has invalid {root} metadata"
                        ) from error
                    value = nested.get(child, "") if isinstance(nested, dict) else ""
                    if isinstance(value, list):
                        value = ", ".join(str(item) for item in value)
            output[str(header)] = value
        result.append(output)
    return sorted(result, key=lambda row: str(next(iter(row.values()))))


def _control_values(
    profile: Mapping[str, Any],
    tracker: Mapping[str, Any],
    onboarding: Mapping[str, Any],
    catalogue_names: Mapping[str, str],
    scope: WorkbookExportScope,
) -> dict[str, dict[str, tuple[object, str]]]:
    main_bank_id = str(onboarding.get("main_bank_catalogue_id") or "")
    if main_bank_id and main_bank_id not in catalogue_names:
        raise WorkbookTemplateExportError("The Profile main bank reference is unavailable")
    if scope.key == "all_history":
        workbook_preset = "All Dates"
        custom_start = ""
        custom_end = ""
    elif scope.key == "this_month":
        workbook_preset = "This Month"
        custom_start = ""
        custom_end = ""
    else:
        workbook_preset = "Custom"
        custom_start = scope.start_date.isoformat() if scope.start_date else ""
        custom_end = scope.end_date.isoformat() if scope.end_date else ""
    return {
        "Dashboard": {
            "B4": (profile["display_name"], "text"),
            "D4": (workbook_preset, "text"),
            "F4": (custom_start, "date_or_empty"),
            "B5": (catalogue_names.get(main_bank_id, ""), "text"),
            "D5": (tracker["range_back_days"], "integer"),
            "F5": (custom_end, "date_or_empty"),
            "B6": (profile["tracking_start_date"], "date"),
            "D6": (tracker["range_forward_days"], "integer"),
            "F6": (onboarding["starting_bankroll"], "decimal_or_empty"),
            "B7": (onboarding["iteration_number"], "integer"),
            "D7": (tracker["free_bet_expiry_alert_window_days"], "integer"),
        }
    }


def build_workbook_template_export(
    profile_id: str,
    *,
    scope: str = "all_history",
    start_date: str | None = None,
    end_date: str | None = None,
    london_today: date | None = None,
    exported_at: str | None = None,
) -> WorkbookTemplateExport:
    resolved_scope = resolve_workbook_export_scope(
        scope,
        start_date=start_date,
        end_date=end_date,
        london_today=london_today,
    )
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
        try:
            tracker = _one(connection, "profile_tracker_settings", profile_id)
        except WorkbookTemplateExportError as error:
            raise WorkbookTemplateExportError(
                str(error),
                code="profile_setup_required",
                owner_message=("Profile setup is required before creating a working workbook."),
                owner_action=(
                    "Open Profile Settings, complete the date and workbook defaults, then try "
                    "again."
                ),
                action_href=f"/profiles/{profile_id}/manage#defaults",
            ) from error
        onboarding_row = _optional_one(connection, "profile_onboarding_settings", profile_id)
        legacy_profile_defaults = onboarding_row is None
        onboarding = onboarding_row or _legacy_onboarding_defaults(profile_id)
        if legacy_profile_defaults:
            warnings.append(
                "Legacy Profile setup: workbook iteration uses the governed default 1; starting "
                "bankroll and main bank remain blank because their historical values are unknown."
            )
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
        source_ids = _source_identity_map(connection, profile_id)
        raw_by_sheet, scope_counts = _selected_export_rows(
            accounts=accounts,
            sportsbook=sportsbook,
            free_bets=free_bets,
            casino=casino,
            cash=cash,
            extra_places=extra_places,
            source_ids=source_ids,
            scope=resolved_scope,
        )
        selected_sportsbook = [
            row
            for row in raw_by_sheet["Sportsbook Bets"]
            if str(row.get("_source_entity_type") or "") != "extra_place"
        ]
        selected_free_bets = raw_by_sheet["Free Bets"]
        selected_casino = raw_by_sheet["Casino Offers"]
        blockers = _unsupported_profile_state(
            connection,
            profile_id,
            selected_sportsbook,
            selected_free_bets,
            selected_casino,
            accounts,
        )
        if blockers:
            raise WorkbookTemplateExportError(
                "Working-workbook export is blocked by unrepresentable Profile state: "
                + ", ".join(sorted(set(blockers))),
                code="unsupported_profile_records",
                owner_message=(
                    "Some records in this export range cannot be represented safely in the "
                    "working workbook."
                ),
                owner_action=(
                    "Review the affected Profile records or choose a range that excludes them. "
                    "Your Profile data has not changed."
                ),
            )
        catalogue = _load_catalogue(connection)
        catalogue_names, catalogue_risks = _catalogue_maps(catalogue)
        iteration = parse_iteration(onboarding["iteration_number"])
        selected_extra_places = [
            row
            for row in raw_by_sheet["Sportsbook Bets"]
            if str(row.get("_source_entity_type") or "") == "extra_place"
        ]
        identity_source_by_sheet = {
            "Accounts": accounts,
            "Cash Adjustments": cash,
            "Sportsbook Bets": [*sportsbook, *selected_extra_places],
            "Free Bets": free_bets,
            "Casino Offers": casino,
        }
        identities: dict[str, dict[str, str]] = {}
        ordered_by_sheet: dict[str, list[dict[str, Any]]] = {}
        for sheet_name, selected_rows in raw_by_sheet.items():
            ledger = coverage["ledgers"][sheet_name]
            structure_ledger = structure["ledgers"][sheet_name]
            all_ordered, identity_map = _allocate_ids(
                identity_source_by_sheet[sheet_name],
                runtime_id=str(ledger["runtime_id"]),
                source_entity_type=str(ledger["source_entity_type"]),
                source_sheet=str(ledger["source_sheet"]),
                prefix=str(structure_ledger["id_prefix"]),
                iteration=iteration,
                source_ids=source_ids,
            )
            selected_runtime_ids = {str(row[str(ledger["runtime_id"])]) for row in selected_rows}
            ordered_by_sheet[sheet_name] = [
                row
                for row in all_ordered
                if str(row[str(ledger["runtime_id"])]) in selected_runtime_ids
            ]
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
        commissions = [
            (str(row["exchange_name"]), row["commission_rate"])
            for row in connection.execute(
                "SELECT exchange_name, commission_rate FROM profile_exchange_commissions "
                "WHERE profile_id = ? ORDER BY exchange_name",
                (profile_id,),
            ).fetchall()
        ]
        commission_map = dict(commissions)
        projections = {
            sheet_name: _project_rows(
                rows,
                sheet_name=sheet_name,
                coverage=coverage,
                identities=identities[sheet_name],
                sportsbook_identities=identities["Sportsbook Bets"],
                related_free_bet_identities=related_free_bet_identities,
                catalogue_risks=catalogue_risks,
                exchange_commissions=commission_map,
            )
            for sheet_name, rows in ordered_by_sheet.items()
        }
        controls = _control_values(profile, tracker, onboarding, catalogue_names, resolved_scope)
        logical_checksum = sha256(
            _json(
                {
                    "contract": EXPORT_FORMAT_VERSION,
                    "profile_id": profile_id,
                    "scope": {
                        "key": resolved_scope.key,
                        "start_date": (
                            resolved_scope.start_date.isoformat()
                            if resolved_scope.start_date
                            else None
                        ),
                        "end_date": (
                            resolved_scope.end_date.isoformat() if resolved_scope.end_date else None
                        ),
                        "counts": {
                            name: count.model_dump() for name, count in scope_counts.items()
                        },
                    },
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
        scope=resolved_scope,
        counts=scope_counts,
    )


def build_workbook_template_export_summary(
    profile_id: str,
    *,
    scope: str = "all_history",
    start_date: str | None = None,
    end_date: str | None = None,
    london_today: date | None = None,
) -> WorkbookTemplateExportSummary:
    resolved_scope = resolve_workbook_export_scope(
        scope,
        start_date=start_date,
        end_date=end_date,
        london_today=london_today,
    )
    with connect_read_only() as connection:
        profile = connection.execute(
            "SELECT profile_id FROM profiles WHERE profile_id = ?", (profile_id,)
        ).fetchone()
        if profile is None:
            raise WorkbookTemplateExportError(
                "Profile was not found",
                code="profile_not_found",
                owner_message="This Profile is no longer available.",
                owner_action="Return to Profiles and choose an available Profile.",
            )
        tracker = _optional_one(connection, "profile_tracker_settings", profile_id)
        onboarding = _optional_one(connection, "profile_onboarding_settings", profile_id)
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
        source_ids = _source_identity_map(connection, profile_id)
        _, sportsbook_count = _scope_rows(
            sportsbook, sheet_name="Sportsbook Bets", scope=resolved_scope
        )
        _, free_bet_count = _scope_rows(free_bets, sheet_name="Free Bets", scope=resolved_scope)
        _, casino_count = _scope_rows(casino, sheet_name="Casino Offers", scope=resolved_scope)
        _, cash_count = _scope_rows(cash, sheet_name="Cash Adjustments", scope=resolved_scope)
        _, extra_place_count = _scope_rows(
            extra_places, sheet_name="Historical Extra Places", scope=resolved_scope
        )
        counts = {
            "Accounts": WorkbookLedgerScopeCount(included=len(accounts), total=len(accounts)),
            "Sportsbook Bets": sportsbook_count,
            "Free Bets": free_bet_count,
            "Casino Offers": casino_count,
            "Cash Adjustments": cash_count,
            "Historical Extra Places": extra_place_count,
        }
        try:
            selected, selected_counts = _selected_export_rows(
                accounts=accounts,
                sportsbook=sportsbook,
                free_bets=free_bets,
                casino=casino,
                cash=cash,
                extra_places=extra_places,
                source_ids=source_ids,
                scope=resolved_scope,
            )
            counts = selected_counts
            blockers = _unsupported_profile_state(
                connection,
                profile_id,
                [
                    row
                    for row in selected["Sportsbook Bets"]
                    if str(row.get("_source_entity_type") or "") != "extra_place"
                ],
                selected["Free Bets"],
                selected["Casino Offers"],
                accounts,
            )
        except WorkbookTemplateExportError as error:
            blockers = [str(error)]

    legacy_defaults = onboarding is None
    if tracker is None:
        problem = "Profile setup is required before creating a working workbook."
        owner_action = "Complete the Profile date and workbook defaults, then try again."
        can_export = False
    elif blockers:
        problem = (
            "Some records in this export range cannot be represented safely in the working "
            "workbook."
        )
        owner_action = (
            "Choose a range that excludes unsupported records, or keep Plum Duff as the source "
            "for those records."
        )
        can_export = False
    else:
        problem = ""
        owner_action = ""
        can_export = True
    if legacy_defaults:
        notice = (
            "This older Profile has no saved starting-bankroll or main-bank setup. Its ledger "
            "history can still be exported: those unknown workbook settings remain blank and "
            "new workbook IDs use the governed iteration 1 default."
        )
    elif resolved_scope.key == "all_history":
        notice = "All supported dated and undated Profile ledger rows are included."
    else:
        notice = (
            "Rows without the governed reporting date are not assigned an invented date and are "
            "shown separately below."
        )
    return WorkbookTemplateExportSummary(
        scope=resolved_scope.key,
        scope_label=resolved_scope.label,
        start_date=(resolved_scope.start_date.isoformat() if resolved_scope.start_date else None),
        end_date=(resolved_scope.end_date.isoformat() if resolved_scope.end_date else None),
        date_basis=DATE_BASIS,
        counts=counts,
        can_export=can_export,
        legacy_profile_defaults=legacy_defaults,
        notice=notice,
        problem=problem,
        owner_action=owner_action,
        issues=sorted({_owner_issue(blocker) for blocker in blockers}),
    )


def _require_fund_manager(request: Request) -> None:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Fund Manager access is required")


def _owner_error_detail(error: WorkbookTemplateExportError) -> dict[str, object]:
    return {
        "code": error.code,
        "message": error.owner_message,
        "data_unchanged": True,
        "action": error.owner_action,
        "action_href": error.action_href,
        "technical_detail": str(error),
    }


@router.get(
    "/working-workbook-summary",
    response_model=WorkbookTemplateExportSummary,
)
def working_workbook_summary(
    profile_id: str,
    request: Request,
    scope: str = "all_history",
    start_date: str | None = None,
    end_date: str | None = None,
) -> WorkbookTemplateExportSummary:
    _require_fund_manager(request)
    try:
        return build_workbook_template_export_summary(
            profile_id,
            scope=scope,
            start_date=start_date,
            end_date=end_date,
        )
    except WorkbookTemplateExportError as error:
        status = 404 if error.code == "profile_not_found" else 422
        raise HTTPException(status_code=status, detail=_owner_error_detail(error)) from error


@router.get("/working-workbook.xlsx")
def export_working_workbook(
    profile_id: str,
    request: Request,
    scope: str = "all_history",
    start_date: str | None = None,
    end_date: str | None = None,
) -> Response:
    _require_fund_manager(request)
    try:
        export = build_workbook_template_export(
            profile_id,
            scope=scope,
            start_date=start_date,
            end_date=end_date,
        )
    except WorkbookTemplateExportError as error:
        status = 404 if error.code == "profile_not_found" else 409
        raise HTTPException(status_code=status, detail=_owner_error_detail(error)) from error
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
            "X-Export-Scope": export.scope.key,
            "X-Export-Scope-Start": (
                export.scope.start_date.isoformat() if export.scope.start_date else ""
            ),
            "X-Export-Scope-End": (
                export.scope.end_date.isoformat() if export.scope.end_date else ""
            ),
            "X-Export-Ledger-Counts": _json(
                {name: value.model_dump() for name, value in export.counts.items()}
            ),
            "X-Export-Classification": "STRUCTURALLY_VALID_GOOGLE_RUNTIME_PENDING",
        },
    )
