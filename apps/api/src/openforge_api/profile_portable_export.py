# ruff: noqa: S608 - SQL identifiers are fixed contract constants, never request input.

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path
from typing import Any, Mapping, Sequence
from xml.sax.saxutils import escape, quoteattr
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from fastapi import APIRouter, HTTPException, Request, Response

from openforge_api.account_catalogue_source import MasterAccountCatalogue
from openforge_api.auth import require_request_session
from openforge_api.config import settings
from openforge_api.db import connect_read_only, postgres_runtime_enabled

EXPORT_FORMAT_VERSION = "profile-portable-export-v1"
XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
NULL_FIELDS_COLUMN = "null_fields_json"

router = APIRouter(prefix="/profiles/{profile_id}/exports", tags=["profile-portable-export"])


class PortableExportError(ValueError):
    """Raised when authoritative state cannot be serialized without data loss."""


@dataclass(frozen=True)
class SheetSpec:
    name: str
    table: str
    columns: tuple[str, ...]
    order_by: tuple[str, ...]
    decimal_fields: frozenset[str] = frozenset()
    json_fields: frozenset[str] = frozenset()
    boolean_fields: frozenset[str] = frozenset()
    timestamp_fields: frozenset[str] = frozenset()
    authority_role: str = "profile_authoritative"


@dataclass(frozen=True)
class PortableSheet:
    name: str
    columns: tuple[str, ...]
    rows: tuple[dict[str, str], ...]
    authority_role: str
    logical_checksum: str


@dataclass(frozen=True)
class PortableExport:
    content: bytes
    filename: str
    format_version: str
    logical_checksum: str
    manifest_checksum: str
    sheet_manifest_checksum: str
    byte_checksum: str
    exported_at: str
    sheet_count: int


def _fields(value: str) -> tuple[str, ...]:
    return tuple(value.split())


COMMON_TIMESTAMPS = frozenset(
    {
        "created_at",
        "updated_at",
        "imported_at",
        "approved_at",
        "import_started_at",
        "completed_at",
        "crystallised_at",
        "reopened_at",
        "applied_at",
        "partial_lay_reminder_due_at",
        "partial_lay_reminder_resolved_at",
        "follow_up_reminder_due_at",
        "follow_up_reminder_resolved_at",
        "expiry_datetime",
    }
)

SHEET_SPECS = (
    SheetSpec(
        "Profile",
        "profiles",
        _fields(
            "profile_id display_name profile_code status tracking_start_date "
            "management_fee_percent investment_fee_percent current_cash_snapshot"
        ),
        ("profile_id",),
        decimal_fields=frozenset(
            {"management_fee_percent", "investment_fee_percent", "current_cash_snapshot"}
        ),
    ),
    SheetSpec(
        "Tracker Settings",
        "profile_tracker_settings",
        _fields(
            "profile_id active_date_preset custom_start_date custom_end_date range_back_days "
            "range_forward_days mug_bet_frequency_days free_bet_expiry_alert_window_days "
            "use_global_date_range_toggle this_month_mode default_free_bet_underlay_factor "
            "default_free_bet_overlay_factor default_bonus_retention_percent "
            "default_exchange_name dashboard_view_mode weekly_profit_target "
            "monthly_profit_target annual_profit_target weekly_extra_place_loss_budget "
            "created_at updated_at"
        ),
        ("profile_id",),
        decimal_fields=frozenset(
            {
                "default_free_bet_underlay_factor",
                "default_free_bet_overlay_factor",
                "default_bonus_retention_percent",
                "weekly_profit_target",
                "monthly_profit_target",
                "annual_profit_target",
                "weekly_extra_place_loss_budget",
            }
        ),
        boolean_fields=frozenset({"use_global_date_range_toggle"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Onboarding",
        "profile_onboarding_settings",
        _fields(
            "profile_id iteration_number starting_bankroll main_bank_catalogue_id "
            "enabled_modules_json preferences_json onboarding_status created_at updated_at"
        ),
        ("profile_id",),
        decimal_fields=frozenset({"starting_bankroll"}),
        json_fields=frozenset({"enabled_modules_json", "preferences_json"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Display Settings",
        "profile_bookmaker_display_settings",
        _fields("profile_id bookmaker_display_mode_override created_at updated_at"),
        ("profile_id",),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Exchange Commissions",
        "profile_exchange_commissions",
        _fields("profile_id exchange_name commission_rate created_at updated_at"),
        ("exchange_name",),
        decimal_fields=frozenset({"commission_rate"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Accounts",
        "accounts",
        _fields(
            "account_id profile_id catalogue_id bookmaker_id account type counts_in_cash_total "
            "channel status lifecycle_status signup_offer_status restrictions_json "
            "current_balance pending_withdrawal_amount last_balance_update group_name platform "
            "sign_up_date notes created_at updated_at"
        ),
        ("account_id",),
        decimal_fields=frozenset({"current_balance", "pending_withdrawal_amount"}),
        json_fields=frozenset({"restrictions_json"}),
        boolean_fields=frozenset({"counts_in_cash_total"}),
        timestamp_fields=COMMON_TIMESTAMPS | frozenset({"last_balance_update"}),
    ),
    SheetSpec(
        "Balance Snapshots",
        "balance_snapshots",
        _fields(
            "balance_snapshot_id profile_id snapshot_at snapshot_type account_id "
            "balance_amount notes created_at"
        ),
        ("balance_snapshot_id",),
        decimal_fields=frozenset({"balance_amount"}),
        timestamp_fields=COMMON_TIMESTAMPS | frozenset({"snapshot_at"}),
    ),
    SheetSpec(
        "Sportsbook",
        "sportsbook_bets",
        _fields(
            "sportsbook_bet_id profile_id event_name offer_text bookmaker offer_type bet_type "
            "offer_name fixture_type market status result back_stake back_odds profit_boost_mode "
            "base_back_odds profit_boost_percent maximum_boost_winnings "
            "actual_accepted_back_odds source_combo_preset_id source_combo_preset_version "
            "bonus_trigger maximum_bonus bonus_retention_rate match_strategy lay_odds_1 "
            "multi_lay_outcome_1_name multi_lay_outcomes_json lay_actual lay_matched_stake_1 "
            "lay_commission_1 exchange_name date_settled partial_lay_reminder_state "
            "partial_lay_reminder_due_at partial_lay_reminder_reason "
            "partial_lay_reminder_resolution_note partial_lay_reminder_resolved_at "
            "partial_lay_reminder_resolved_by user_notes manual_override_value "
            "manual_override_reason created_at updated_at"
        ),
        ("sportsbook_bet_id",),
        decimal_fields=frozenset(
            {
                "back_stake",
                "back_odds",
                "base_back_odds",
                "profit_boost_percent",
                "maximum_boost_winnings",
                "actual_accepted_back_odds",
                "maximum_bonus",
                "bonus_retention_rate",
                "lay_odds_1",
                "lay_actual",
                "lay_matched_stake_1",
                "lay_commission_1",
                "manual_override_value",
            }
        ),
        json_fields=frozenset({"multi_lay_outcomes_json"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Free Bets",
        "free_bets",
        _fields(
            "free_bet_id profile_id event_name offer_text bookmaker offer_type bet_type "
            "offer_name fixture_type status result retention_mode free_bet_value back_odds "
            "match_strategy lay_odds_1 lay_actual lay_matched_stake_1 lay_commission_1 "
            "exchange_name expiry_datetime date_settled origin_qual_bet_id offer_group_id "
            "source_award_group_id source_award_split_index source_award_split_total "
            "source_award_expected_value source_award_variance_reason follow_up_reminder_state "
            "follow_up_reminder_due_at follow_up_reminder_reason "
            "follow_up_reminder_resolution_note follow_up_reminder_resolved_at "
            "follow_up_reminder_resolved_by user_notes manual_override_value "
            "manual_override_reason created_at updated_at"
        ),
        ("free_bet_id",),
        decimal_fields=frozenset(
            {
                "free_bet_value",
                "back_odds",
                "lay_odds_1",
                "lay_actual",
                "lay_matched_stake_1",
                "lay_commission_1",
                "source_award_expected_value",
                "manual_override_value",
            }
        ),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Casino",
        "casino_offers",
        _fields(
            "casino_offer_id profile_id offer_group_id date_started date_settling "
            "expiry_datetime bookmaker offer_type offer_name game cash_stake credit_amount "
            "bonus_amount wager_multiplier wager_target required_spins spin_stake "
            "free_spins_awarded free_spins_value wagering_base custom_wager_base "
            "wagering_completed rtp_percent reward_type reward_wager_multiplier "
            "reward_wager_target reward_required_spins reward_wagering_completed "
            "reward_rtp_percent expected_reward_cash_value qualifying_expected_loss "
            "reward_expected_loss other_expected_costs campaign_ev own_cash_committed "
            "cash_returned settlement_other_costs status result calc_net_pnl final_net_pnl "
            "user_notes created_at updated_at"
        ),
        ("casino_offer_id",),
        decimal_fields=frozenset(
            {
                "cash_stake",
                "credit_amount",
                "bonus_amount",
                "wager_multiplier",
                "wager_target",
                "spin_stake",
                "free_spins_value",
                "wagering_base",
                "custom_wager_base",
                "wagering_completed",
                "rtp_percent",
                "reward_wager_multiplier",
                "reward_wager_target",
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
                "calc_net_pnl",
                "final_net_pnl",
            }
        ),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Extra Places",
        "each_way_extra_places",
        _fields(
            "each_way_extra_place_id profile_id placed_at runner race bookmaker "
            "bookmaker_account mode each_way_stake back_odds place_term_numerator "
            "place_term_denominator bookmaker_places exchange_places win_exchange win_lay_odds "
            "win_commission actual_win_lay_stake place_exchange place_lay_odds "
            "place_commission actual_place_lay_stake status result finishing_position "
            "imported_historical_pnl calculation_provenance import_run_id source_import_id "
            "user_notes created_at updated_at"
        ),
        ("each_way_extra_place_id",),
        decimal_fields=frozenset(
            {
                "each_way_stake",
                "back_odds",
                "place_term_numerator",
                "place_term_denominator",
                "win_lay_odds",
                "win_commission",
                "actual_win_lay_stake",
                "place_lay_odds",
                "place_commission",
                "actual_place_lay_stake",
                "imported_historical_pnl",
            }
        ),
        timestamp_fields=COMMON_TIMESTAMPS | frozenset({"placed_at"}),
    ),
    SheetSpec(
        "Cash Adjustments",
        "cash_adjustments",
        _fields(
            "cash_adjustment_id profile_id adjustment_date direction amount adjustment_type "
            "affects_investment affects_cash_snapshot linked_account description created_at "
            "updated_at"
        ),
        ("cash_adjustment_id",),
        decimal_fields=frozenset({"amount"}),
        boolean_fields=frozenset({"affects_investment", "affects_cash_snapshot"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Fee Periods",
        "fee_periods",
        _fields(
            "fee_period_id profile_id period_start period_end state current_revision_number "
            "crystallised_at crystallised_by reopened_at reopened_by created_at updated_at"
        ),
        ("fee_period_id",),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Fee Revisions",
        "fee_period_revisions",
        _fields(
            "fee_revision_id profile_id fee_period_id revision_number reporting_basis "
            "fee_base_source_version fee_base_breakdown_json eligible_period_profit "
            "opening_loss_carryforward closing_loss_carryforward fee_base "
            "management_fee_percent investment_fee_percent management_fee_amount "
            "investment_fee_amount total_fee_due fee_package_id fee_package_version "
            "change_reason created_by created_at"
        ),
        ("fee_revision_id",),
        decimal_fields=frozenset(
            {
                "eligible_period_profit",
                "opening_loss_carryforward",
                "closing_loss_carryforward",
                "fee_base",
                "management_fee_percent",
                "investment_fee_percent",
                "management_fee_amount",
                "investment_fee_amount",
                "total_fee_due",
            }
        ),
        json_fields=frozenset({"fee_base_breakdown_json"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Fee Corrections",
        "fee_corrections",
        _fields(
            "fee_correction_id profile_id source_fee_period_id target_fee_period_id "
            "adjustment_type amount reason state created_by created_at applied_at"
        ),
        ("fee_correction_id",),
        decimal_fields=frozenset({"amount"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Fee Withdrawals",
        "fee_withdrawal_links",
        _fields(
            "fee_withdrawal_link_id profile_id fee_period_id fee_revision_id "
            "cash_adjustment_id component amount created_by created_at"
        ),
        ("fee_withdrawal_link_id",),
        decimal_fields=frozenset({"amount"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Profile Lookups",
        "profile_lookup_values",
        _fields("lookup_value_id profile_id lookup_type option_value created_at updated_at"),
        ("lookup_value_id",),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Quick Actions",
        "profile_quick_actions",
        _fields(
            "action_id profile_id ledger_type label enabled_fields_json defaults_json enabled "
            "is_favourite favourite_order sort_order archived created_at updated_at"
        ),
        ("action_id",),
        json_fields=frozenset({"enabled_fields_json", "defaults_json"}),
        boolean_fields=frozenset({"enabled", "is_favourite", "archived"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Loadout Overrides",
        "profile_quick_add_loadout_overrides",
        _fields(
            "profile_id preset_id enabled bookmaker_override defaults_json availability_reason "
            "created_at updated_at"
        ),
        ("preset_id",),
        json_fields=frozenset({"defaults_json"}),
        boolean_fields=frozenset({"enabled"}),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Loadout Favourites",
        "profile_quick_add_loadout_favourites",
        _fields("profile_id preset_id ledger_type favourite_order created_at updated_at"),
        ("ledger_type", "favourite_order", "preset_id"),
        timestamp_fields=COMMON_TIMESTAMPS,
    ),
    SheetSpec(
        "Opportunity Links",
        "multi_profile_opportunity_targets",
        _fields(
            "target_id opportunity_id profile_id bookmaker eligibility_state "
            "eligibility_reasons_json workflow_reasons_json workflow_state sportsbook_bet_id "
            "created_at updated_at"
        ),
        ("target_id",),
        json_fields=frozenset({"eligibility_reasons_json", "workflow_reasons_json"}),
        timestamp_fields=COMMON_TIMESTAMPS,
        authority_role="profile_authoritative_with_global_reference",
    ),
    SheetSpec(
        "Source Identities",
        "import_source_records",
        _fields(
            "source_sheet source_record_id profile_id source_hash entity_type entity_id imported_at"
        ),
        ("source_sheet", "source_record_id"),
        timestamp_fields=COMMON_TIMESTAMPS,
        authority_role="business_provenance",
    ),
    SheetSpec(
        "Workbook Lineage",
        "profile_import_runs",
        _fields(
            "import_run_id profile_id source_filename workbook_checksum workbook_size_bytes "
            "effective_at mapping_version status raw_workbook_retained approved_at "
            "import_started_at completed_at created_at updated_at"
        ),
        ("created_at", "import_run_id"),
        boolean_fields=frozenset({"raw_workbook_retained"}),
        timestamp_fields=COMMON_TIMESTAMPS | frozenset({"effective_at"}),
        authority_role="business_provenance",
    ),
)

REVIEW_DECISIONS_SPEC = SheetSpec(
    "Review Decisions",
    "",
    _fields(
        "import_run_id item_id profile_id workbook_checksum mapping_version source_fingerprint "
        "source_sheet source_row source_record_id category decision_json created_at updated_at"
    ),
    ("import_run_id", "item_id"),
    json_fields=frozenset({"decision_json"}),
    timestamp_fields=COMMON_TIMESTAMPS,
    authority_role="business_provenance",
)

RECONCILIATION_SPEC = SheetSpec(
    "Reconciliation",
    "",
    _fields(
        "import_run_id profile_id mapping_version import_status run_reconciliation_json "
        "latest_attempt_number latest_attempt_status financial_reconciliation_json "
        "operational_reconciliation_json completed_at"
    ),
    ("import_run_id",),
    json_fields=frozenset(
        {
            "run_reconciliation_json",
            "financial_reconciliation_json",
            "operational_reconciliation_json",
        }
    ),
    timestamp_fields=COMMON_TIMESTAMPS,
    authority_role="verification_provenance",
)

PORTABLE_PAYLOAD_SPECS = (*SHEET_SPECS, REVIEW_DECISIONS_SPEC, RECONCILIATION_SPEC)


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def _sha256(value: bytes | str) -> str:
    data = value.encode("utf-8") if isinstance(value, str) else value
    return hashlib.sha256(data).hexdigest()


def _canonical_decimal(value: Any, *, field: str) -> str:
    try:
        decimal = Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise PortableExportError(f"{field} is not a valid decimal value") from error
    if not decimal.is_finite():
        raise PortableExportError(f"{field} must be a finite decimal value")
    rendered = format(decimal, "f")
    if decimal.is_zero() and rendered.startswith("-"):
        rendered = rendered[1:]
    return rendered


def _canonical_timestamp(value: Any, *, field: str) -> str:
    text = str(value)
    if not text or "T" not in text:
        return text
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as error:
        raise PortableExportError(f"{field} is not a valid ISO-8601 timestamp") from error
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    utc_value = parsed.astimezone(UTC)
    timespec = "microseconds" if utc_value.microsecond else "seconds"
    return utc_value.isoformat(timespec=timespec).replace("+00:00", "Z")


def _canonical_value(spec: SheetSpec, field: str, value: Any) -> str:
    if value is None:
        return ""
    if field in spec.json_fields:
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as error:
                raise PortableExportError(f"{spec.name}.{field} contains invalid JSON") from error
        return _canonical_json(value)
    if field in spec.decimal_fields and value != "":
        return _canonical_decimal(value, field=f"{spec.name}.{field}")
    if field in spec.boolean_fields:
        if value in (True, 1, "1", "true", "True"):
            return "true"
        if value in (False, 0, "0", "false", "False"):
            return "false"
        raise PortableExportError(f"{spec.name}.{field} is not a valid boolean value")
    if field in spec.timestamp_fields and value != "":
        return _canonical_timestamp(value, field=f"{spec.name}.{field}")
    return str(value)


def _logical_checksum(name: str, columns: Sequence[str], rows: Sequence[Mapping[str, str]]) -> str:
    return _sha256(
        _canonical_json(
            {
                "columns": list(columns),
                "rows": [{column: row[column] for column in columns} for row in rows],
                "sheet": name,
            }
        )
    )


def _reference_fingerprint(payload: Mapping[str, Any]) -> str:
    return _sha256(_canonical_json(payload))


def _select_rows(connection: Any, spec: SheetSpec, profile_id: str) -> list[dict[str, Any]]:
    columns = ", ".join(spec.columns)
    order_by = ", ".join(spec.order_by)
    rows = connection.execute(
        f"SELECT {columns} FROM {spec.table} WHERE profile_id = ? ORDER BY {order_by}",
        (profile_id,),
    ).fetchall()
    result = [dict(row) for row in rows]
    if spec.name in {"Source Identities", "Workbook Lineage"}:
        result.extend(_restored_provenance_rows(connection, profile_id, spec.name))
        result.sort(key=lambda row: tuple(str(row.get(field) or "") for field in spec.order_by))
    return result


def _restored_provenance_rows(
    connection: Any, profile_id: str, sheet_name: str
) -> list[dict[str, Any]]:
    rows = connection.execute(
        "SELECT row_json FROM profile_portable_restored_provenance "
        "WHERE target_profile_id = ? AND sheet_name = ? ORDER BY sort_order, row_key",
        (profile_id, sheet_name),
    ).fetchall()
    return [json.loads(str(row["row_json"])) for row in rows]


def _load_catalogue_references(connection: Any) -> tuple[str, dict[str, str]]:
    catalogue: MasterAccountCatalogue | None = None
    if postgres_runtime_enabled():
        row = connection.execute(
            "SELECT document_json FROM account_catalogue_documents "
            "WHERE document_id = 'master-account-catalogue'"
        ).fetchone()
        if row is not None:
            catalogue = MasterAccountCatalogue.model_validate_json(str(row["document_json"]))
    else:
        source_path = Path(settings.account_catalogue_source)
        if source_path.exists():
            catalogue = MasterAccountCatalogue.model_validate_json(
                source_path.read_text(encoding="utf-8")
            )
    if catalogue is None:
        return "", {}
    references = {
        record.catalogue_id: _reference_fingerprint(record.model_dump(mode="json"))
        for record in catalogue.records
    }
    return catalogue.schema_version, references


def _load_preset_references(connection: Any) -> dict[str, tuple[str, str]]:
    rows = connection.execute(
        "SELECT * FROM fund_manager_combo_presets ORDER BY preset_id"
    ).fetchall()
    references: dict[str, tuple[str, str]] = {}
    for row in rows:
        record = dict(row)
        preset_id = str(record.pop("preset_id"))
        record.pop("created_at", None)
        record.pop("updated_at", None)
        version = str(record.get("version", ""))
        for field in ("bookmakers_json", "allowed_strategies_json", "quick_add_json"):
            record[field] = json.loads(str(record[field]))
        references[preset_id] = (version, _reference_fingerprint(record))
    return references


def _load_opportunity_references(connection: Any, profile_id: str) -> dict[str, tuple[str, str]]:
    rows = connection.execute(
        "SELECT opportunity.* FROM multi_profile_opportunities AS opportunity "
        "WHERE opportunity.opportunity_id IN ("
        "SELECT target.opportunity_id FROM multi_profile_opportunity_targets AS target "
        "WHERE target.profile_id = ?) ORDER BY opportunity.opportunity_id",
        (profile_id,),
    ).fetchall()
    references: dict[str, tuple[str, str]] = {}
    for row in rows:
        record = dict(row)
        opportunity_id = str(record.pop("opportunity_id"))
        record.pop("actor_id", None)
        record.pop("created_at", None)
        record.pop("updated_at", None)
        version = str(record.get("preset_version") or "")
        references[opportunity_id] = (version, _reference_fingerprint(record))
    return references


def _with_reference_columns(
    *,
    spec: SheetSpec,
    rows: list[dict[str, Any]],
    catalogue_version: str,
    catalogue_references: Mapping[str, str],
    preset_references: Mapping[str, tuple[str, str]],
    opportunity_references: Mapping[str, tuple[str, str]],
) -> tuple[tuple[str, ...], list[dict[str, Any]]]:
    columns = spec.columns
    if spec.name == "Onboarding":
        columns += ("main_bank_reference_version", "main_bank_reference_fingerprint")
        for row in rows:
            reference_id = str(row.get("main_bank_catalogue_id") or "")
            fingerprint = catalogue_references.get(reference_id, "")
            row["main_bank_reference_version"] = catalogue_version if fingerprint else None
            row["main_bank_reference_fingerprint"] = fingerprint or None
    elif spec.name == "Accounts":
        columns += ("catalogue_reference_version", "catalogue_reference_fingerprint")
        for row in rows:
            reference_id = str(row.get("catalogue_id") or "")
            fingerprint = catalogue_references.get(reference_id, "")
            row["catalogue_reference_version"] = catalogue_version if fingerprint else None
            row["catalogue_reference_fingerprint"] = fingerprint or None
    elif spec.name == "Sportsbook":
        columns += ("preset_reference_version", "preset_reference_fingerprint")
        for row in rows:
            version, fingerprint = preset_references.get(
                str(row.get("source_combo_preset_id") or ""), ("", "")
            )
            row["preset_reference_version"] = version or None
            row["preset_reference_fingerprint"] = fingerprint or None
    elif spec.name in {"Loadout Overrides", "Loadout Favourites"}:
        columns += ("preset_reference_version", "preset_reference_fingerprint")
        for row in rows:
            version, fingerprint = preset_references.get(str(row.get("preset_id") or ""), ("", ""))
            row["preset_reference_version"] = version or None
            row["preset_reference_fingerprint"] = fingerprint or None
    elif spec.name == "Opportunity Links":
        columns += ("opportunity_reference_version", "opportunity_reference_fingerprint")
        for row in rows:
            version, fingerprint = opportunity_references.get(
                str(row.get("opportunity_id") or ""), ("", "")
            )
            row["opportunity_reference_version"] = version or None
            row["opportunity_reference_fingerprint"] = fingerprint or None
    return columns, rows


def _review_decisions(connection: Any, profile_id: str) -> tuple[SheetSpec, list[dict[str, Any]]]:
    rows = connection.execute(
        "SELECT decision.import_run_id, decision.item_id, decision.profile_id, "
        "decision.workbook_checksum, decision.mapping_version, decision.source_fingerprint, "
        "item.source_sheet, item.source_row, item.source_record_id, item.category, "
        "decision.decision_json, decision.created_at, decision.updated_at "
        "FROM profile_import_review_decisions AS decision "
        "JOIN profile_import_review_items AS item "
        "ON item.import_run_id = decision.import_run_id AND item.item_id = decision.item_id "
        "WHERE decision.profile_id = ? ORDER BY decision.import_run_id, decision.item_id",
        (profile_id,),
    ).fetchall()
    result = [dict(row) for row in rows]
    result.extend(_restored_provenance_rows(connection, profile_id, "Review Decisions"))
    result.sort(
        key=lambda row: tuple(str(row.get(field) or "") for field in REVIEW_DECISIONS_SPEC.order_by)
    )
    return REVIEW_DECISIONS_SPEC, result


def _reconciliation_rows(
    connection: Any, profile_id: str
) -> tuple[SheetSpec, list[dict[str, Any]]]:
    run_rows = connection.execute(
        "SELECT import_run_id, profile_id, mapping_version, status, reconciliation_json, "
        "completed_at, created_at FROM profile_import_runs WHERE profile_id = ? "
        "ORDER BY created_at, import_run_id",
        (profile_id,),
    ).fetchall()
    attempt_rows = connection.execute(
        "SELECT import_run_id, attempt_number, status, reconciliation_json "
        "FROM profile_import_attempts WHERE profile_id = ? "
        "ORDER BY import_run_id, attempt_number DESC",
        (profile_id,),
    ).fetchall()
    latest_attempt: dict[str, dict[str, Any]] = {}
    for attempt in attempt_rows:
        record = dict(attempt)
        latest_attempt.setdefault(str(record["import_run_id"]), record)
    rows: list[dict[str, Any]] = []
    for run in run_rows:
        record = dict(run)
        attempt = latest_attempt.get(str(record["import_run_id"]), {})
        attempt_reconciliation = json.loads(str(attempt.get("reconciliation_json") or "{}"))
        rows.append(
            {
                "import_run_id": record["import_run_id"],
                "profile_id": record["profile_id"],
                "mapping_version": record["mapping_version"],
                "import_status": record["status"],
                "run_reconciliation_json": record["reconciliation_json"],
                "latest_attempt_number": attempt.get("attempt_number"),
                "latest_attempt_status": attempt.get("status"),
                "financial_reconciliation_json": attempt_reconciliation.get("financial"),
                "operational_reconciliation_json": attempt_reconciliation.get("operational"),
                "completed_at": record["completed_at"],
            }
        )
    rows.extend(_restored_provenance_rows(connection, profile_id, "Reconciliation"))
    rows.sort(
        key=lambda row: tuple(str(row.get(field) or "") for field in RECONCILIATION_SPEC.order_by)
    )
    return RECONCILIATION_SPEC, rows


def _portable_sheet(
    spec: SheetSpec, rows: Sequence[Mapping[str, Any]], columns: Sequence[str] | None = None
) -> PortableSheet:
    resolved_columns = tuple(columns or spec.columns) + (NULL_FIELDS_COLUMN,)
    canonical_rows: list[dict[str, str]] = []
    for source_row in rows:
        null_fields = sorted(
            field for field in resolved_columns[:-1] if source_row.get(field) is None
        )
        row = {
            field: _canonical_value(spec, field, source_row.get(field))
            for field in resolved_columns[:-1]
        }
        row[NULL_FIELDS_COLUMN] = _canonical_json(null_fields)
        canonical_rows.append(row)
    checksum = _logical_checksum(spec.name, resolved_columns, canonical_rows)
    return PortableSheet(
        name=spec.name,
        columns=resolved_columns,
        rows=tuple(canonical_rows),
        authority_role=spec.authority_role,
        logical_checksum=checksum,
    )


def _column_name(index: int) -> str:
    value = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        value = chr(65 + remainder) + value
    return value


def _inline_cell(reference: str, value: str, *, style: int = 0) -> str:
    if len(value) > 32_767:
        raise PortableExportError(f"Cell {reference} exceeds the XLSX text limit")
    preserve = ' xml:space="preserve"' if value != value.strip() or value == "" else ""
    style_attribute = f' s="{style}"' if style else ""
    return (
        f'<c r="{reference}" t="inlineStr"{style_attribute}><is>'
        f"<t{preserve}>{escape(value)}</t></is></c>"
    )


def _worksheet_xml(sheet: PortableSheet) -> str:
    rows = [
        '<row r="1">'
        + "".join(
            _inline_cell(f"{_column_name(index)}1", header, style=1)
            for index, header in enumerate(sheet.columns, start=1)
        )
        + "</row>"
    ]
    for row_index, row in enumerate(sheet.rows, start=2):
        rows.append(
            f'<row r="{row_index}">'
            + "".join(
                _inline_cell(f"{_column_name(column_index)}{row_index}", row[column])
                for column_index, column in enumerate(sheet.columns, start=1)
            )
            + "</row>"
        )
    last_column = _column_name(len(sheet.columns))
    last_row = max(1, len(sheet.rows) + 1)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<dimension ref="A1:{last_column}{last_row}"/>'
        '<sheetViews><sheetView workbookViewId="0">'
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        "</sheetView></sheetViews>"
        f"<sheetData>{''.join(rows)}</sheetData>"
        f'<autoFilter ref="A1:{last_column}{last_row}"/>'
        "</worksheet>"
    )


def _zip_text(workbook: ZipFile, name: str, value: str) -> None:
    info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o600 << 16
    workbook.writestr(info, value.encode("utf-8"))


def _build_xlsx(sheets: Sequence[PortableSheet]) -> bytes:
    sheet_overrides = "".join(
        '<Override PartName="/xl/worksheets/sheet{index}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'.format(
            index=index
        )
        for index in range(1, len(sheets) + 1)
    )
    workbook_sheets = "".join(
        f'<sheet name={quoteattr(sheet.name)} sheetId="{index}" r:id="rId{index}"/>'
        for index, sheet in enumerate(sheets, start=1)
    )
    workbook_relationships = "".join(
        '<Relationship Id="rId{index}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet{index}.xml"/>'.format(index=index)
        for index in range(1, len(sheets) + 1)
    )
    workbook_relationships += (
        f'<Relationship Id="rId{len(sheets) + 1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
    )
    output = BytesIO()
    with ZipFile(output, "w") as workbook:
        _zip_text(
            workbook,
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" '
            'ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/styles.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            f"{sheet_overrides}</Types>",
        )
        _zip_text(
            workbook,
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/'
            'relationships/officeDocument" '
            'Target="xl/workbook.xml"/></Relationships>',
        )
        _zip_text(
            workbook,
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f"<sheets>{workbook_sheets}</sheets></workbook>",
        )
        _zip_text(
            workbook,
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f"{workbook_relationships}</Relationships>",
        )
        _zip_text(
            workbook,
            "xl/styles.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font>'
            '<font><b/><sz val="11"/><name val="Aptos"/></font></fonts>'
            '<fills count="2"><fill><patternFill patternType="none"/></fill>'
            '<fill><patternFill patternType="gray125"/></fill></fills>'
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/>'
            "</border></borders>"
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" '
            'borderId="0"/></cellStyleXfs>'
            '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
            "</styleSheet>",
        )
        for index, sheet in enumerate(sheets, start=1):
            _zip_text(workbook, f"xl/worksheets/sheet{index}.xml", _worksheet_xml(sheet))
    return output.getvalue()


def _manifest_sheet(
    *,
    profile: Mapping[str, Any],
    exported_at: str,
    sheet_manifest_checksum: str,
    aggregate_checksum: str,
    payload_sheet_count: int,
) -> tuple[PortableSheet, str]:
    fields: list[tuple[str, str | None]] = [
        ("export_format_version", EXPORT_FORMAT_VERSION),
        ("export_timestamp_utc", exported_at),
        ("source_profile_id", str(profile["profile_id"])),
        ("source_profile_display_name", str(profile["display_name"])),
        ("data_management_mode", None),
        ("payload_sheet_count", str(payload_sheet_count)),
        ("sheet_manifest_checksum", sheet_manifest_checksum),
        ("aggregate_logical_checksum", aggregate_checksum),
        ("file_byte_checksum", None),
        ("file_byte_checksum_delivery", "HTTP response header X-Export-Byte-Checksum"),
    ]
    core_rows = [
        {
            "field": field,
            "value": value or "",
            NULL_FIELDS_COLUMN: _canonical_json(["value"] if value is None else []),
        }
        for field, value in fields
    ]
    columns = ("field", "value", NULL_FIELDS_COLUMN)
    manifest_checksum = _logical_checksum("Manifest", columns, core_rows)
    core_rows.append(
        {
            "field": "manifest_logical_checksum",
            "value": manifest_checksum,
            NULL_FIELDS_COLUMN: "[]",
        }
    )
    return (
        PortableSheet(
            name="Manifest",
            columns=columns,
            rows=tuple(core_rows),
            authority_role="verification",
            logical_checksum=manifest_checksum,
        ),
        manifest_checksum,
    )


def build_profile_portable_export(
    profile_id: str, *, exported_at: str | None = None
) -> PortableExport:
    export_timestamp = exported_at or datetime.now(UTC).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )
    with connect_read_only() as connection:
        profile_row = connection.execute(
            "SELECT profile_id, display_name, profile_code, status, tracking_start_date, "
            "management_fee_percent, investment_fee_percent, current_cash_snapshot "
            "FROM profiles WHERE profile_id = ?",
            (profile_id,),
        ).fetchone()
        if profile_row is None:
            raise PortableExportError("Profile was not found")
        profile = dict(profile_row)
        catalogue_version, catalogue_references = _load_catalogue_references(connection)
        preset_references = _load_preset_references(connection)
        opportunity_references = _load_opportunity_references(connection, profile_id)
        payload_sheets: list[PortableSheet] = []
        for spec in SHEET_SPECS:
            rows = _select_rows(connection, spec, profile_id)
            columns, rows = _with_reference_columns(
                spec=spec,
                rows=rows,
                catalogue_version=catalogue_version,
                catalogue_references=catalogue_references,
                preset_references=preset_references,
                opportunity_references=opportunity_references,
            )
            payload_sheets.append(_portable_sheet(spec, rows, columns))
        review_spec, review_rows = _review_decisions(connection, profile_id)
        payload_sheets.append(_portable_sheet(review_spec, review_rows))
        reconciliation_spec, reconciliation_rows = _reconciliation_rows(connection, profile_id)
        payload_sheets.append(_portable_sheet(reconciliation_spec, reconciliation_rows))

    sheet_manifest_rows = [
        {
            "sheet_name": sheet.name,
            "authority_role": sheet.authority_role,
            "row_count": str(len(sheet.rows)),
            "column_count": str(len(sheet.columns)),
            "logical_checksum": sheet.logical_checksum,
            NULL_FIELDS_COLUMN: "[]",
        }
        for sheet in payload_sheets
    ]
    sheet_manifest_columns = (
        "sheet_name",
        "authority_role",
        "row_count",
        "column_count",
        "logical_checksum",
        NULL_FIELDS_COLUMN,
    )
    sheet_manifest_checksum = _logical_checksum(
        "Sheet Manifest", sheet_manifest_columns, sheet_manifest_rows
    )
    aggregate_checksum = _sha256(
        _canonical_json(
            [
                {
                    "authority_role": row["authority_role"],
                    "logical_checksum": row["logical_checksum"],
                    "row_count": row["row_count"],
                    "sheet_name": row["sheet_name"],
                }
                for row in sheet_manifest_rows
            ]
        )
    )
    manifest, manifest_checksum = _manifest_sheet(
        profile=profile,
        exported_at=export_timestamp,
        sheet_manifest_checksum=sheet_manifest_checksum,
        aggregate_checksum=aggregate_checksum,
        payload_sheet_count=len(payload_sheets),
    )
    sheet_manifest = PortableSheet(
        name="Sheet Manifest",
        columns=sheet_manifest_columns,
        rows=tuple(sheet_manifest_rows),
        authority_role="verification",
        logical_checksum=sheet_manifest_checksum,
    )
    content = _build_xlsx((manifest, sheet_manifest, *payload_sheets))
    byte_checksum = _sha256(content)
    safe_code = re.sub(r"[^A-Za-z0-9-]+", "-", str(profile["profile_code"])).strip("-")
    safe_profile_id = re.sub(r"[^A-Za-z0-9-]+", "-", profile_id).strip("-")
    timestamp_token = re.sub(r"[^A-Za-z0-9]+", "", export_timestamp)
    filename = f"profile-portable-backup-{safe_code or safe_profile_id}-{timestamp_token}.xlsx"
    return PortableExport(
        content=content,
        filename=filename,
        format_version=EXPORT_FORMAT_VERSION,
        logical_checksum=aggregate_checksum,
        manifest_checksum=manifest_checksum,
        sheet_manifest_checksum=sheet_manifest_checksum,
        byte_checksum=byte_checksum,
        exported_at=export_timestamp,
        sheet_count=len(payload_sheets),
    )


@router.get("/portable-profile.xlsx")
def export_profile_portable_xlsx(profile_id: str, request: Request) -> Response:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Fund Manager access is required")
    try:
        export = build_profile_portable_export(profile_id)
    except PortableExportError as error:
        status = 404 if str(error) == "Profile was not found" else 409
        raise HTTPException(status_code=status, detail=str(error)) from error
    return Response(
        content=export.content,
        media_type=XLSX_MEDIA_TYPE,
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{export.filename}"',
            "X-Export-Format-Version": export.format_version,
            "X-Export-Logical-Checksum": export.logical_checksum,
            "X-Export-Manifest-Checksum": export.manifest_checksum,
            "X-Export-Sheet-Manifest-Checksum": export.sheet_manifest_checksum,
            "X-Export-Byte-Checksum": export.byte_checksum,
            "X-Export-Sheet-Count": str(export.sheet_count),
        },
    )
