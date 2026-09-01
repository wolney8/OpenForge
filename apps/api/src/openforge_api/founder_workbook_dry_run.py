from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path
from typing import Any, Callable, Literal, cast
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from openforge_api.account_catalogue_source import (
    MasterAccountCatalogue,
    MasterAccountCatalogueRecord,
    load_master_account_catalogue,
)
from openforge_api.db import extract_shared_strings, extract_sheet_paths
from openforge_api.imports import (
    ACCOUNT_SOURCE_MAP,
    CASH_ADJUSTMENT_SOURCE_MAP,
    CASINO_OFFER_SOURCE_MAP,
    FREE_BET_SOURCE_MAP,
    SPORTSBOOK_SOURCE_MAP,
    map_account_import_fields,
    map_cash_adjustment_import_fields,
    map_casino_offer_import_fields,
    map_free_bet_import_fields,
    map_sportsbook_import_fields,
)
from openforge_api.xlsx_import import (
    NS,
    parse_account_xlsx,
    parse_cash_adjustment_xlsx,
    parse_casino_offer_xlsx,
    parse_free_bet_xlsx,
    parse_sportsbook_xlsx,
    read_cell_value,
    read_date_style_indexes,
)

FOUNDER_MAPPING_VERSION = "founder-snapshot-v5"

NON_TRANSACTIONAL_SPORTSBOOK_STATUSES = frozenset({"prospecting", "not placed"})
NON_TRANSACTIONAL_SPORTSBOOK_RESULTS = frozenset({"", "pending"})

SnapshotClassification = Literal["EXACT", "ALIAS", "NORMALIZED", "AMBIGUOUS", "MISSING"]
JsonObject = dict[str, Any]


@dataclass(frozen=True)
class ProviderResolution:
    workbook_name: str
    workbook_type: str
    classification: SnapshotClassification
    catalogue_id: str = ""
    canonical_brand: str = ""
    match_method: str = ""
    confidence: str = ""
    candidates: tuple[str, ...] = ()


@dataclass(frozen=True)
class LedgerDefinition:
    key: str
    sheet_name: str
    mapping_version: str
    parser: Callable[[bytes], Any]
    mapper: Callable[[dict[str, Any]], Any]
    settled_statuses: frozenset[str]
    open_statuses: frozenset[str]
    formal_report_statuses: frozenset[str] | None
    pnl_fields: tuple[str, ...]
    report_date_fields: tuple[str, ...]
    settlement_date_fields: tuple[str, ...]
    liability_fields: tuple[str, ...]


LEDGERS = (
    LedgerDefinition(
        "sportsbook",
        "Sportsbook Bets",
        "sportsbook-v1",
        parse_sportsbook_xlsx,
        map_sportsbook_import_fields,
        frozenset({"settled", "void", "cancelled", "free bet awarded"}),
        frozenset({"prospecting", "not placed", "placed"}),
        None,
        ("FinalNetPnL", "NetPnL", "ReportingValue"),
        ("DateSettling",),
        ("DateSettling",),
        ("Liability1", "Liability2", "Liability3"),
    ),
    LedgerDefinition(
        "free_bets",
        "Free Bets",
        "free-bets-v1",
        parse_free_bet_xlsx,
        map_free_bet_import_fields,
        frozenset({"settled", "expired", "void", "converted"}),
        frozenset({"prospecting", "available", "placed"}),
        frozenset({"placed", "settled"}),
        ("FinalNetPnL", "NetPnL", "ReportingValue"),
        ("DateSettling",),
        ("DateSettling",),
        ("Liability1",),
    ),
    LedgerDefinition(
        "casino",
        "Casino Offers",
        "casino-offers-v1",
        parse_casino_offer_xlsx,
        map_casino_offer_import_fields,
        frozenset({"settled"}),
        frozenset({"prospecting", "started", "in progress"}),
        None,
        ("FinalNetPnL", "CalcNetPnL", "NetPnL"),
        ("DateStarted",),
        ("DateSettling", "DateStarted"),
        (),
    ),
    LedgerDefinition(
        "cash_adjustments",
        "Cash Adjustments",
        "cash-adjustments-v1",
        parse_cash_adjustment_xlsx,
        map_cash_adjustment_import_fields,
        frozenset(),
        frozenset(),
        None,
        ("SignedAmount",),
        ("AdjustmentDate",),
        ("AdjustmentDate",),
        (),
    ),
)

LEGACY_ACCOUNT_STATUS_MAP = {
    "Restricted": "Bonus Restricted",
    "Dormant": "Inactive",
}
LEGACY_ACCOUNT_CHANNEL_MAP = {"App Only": "Mobile"}


def normalize_provider_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def resolve_provider(
    name: str,
    account_type: str,
    catalogue: MasterAccountCatalogue,
    aliases: dict[tuple[str, str], str] | None = None,
) -> ProviderResolution:
    expected_type = {
        "bookie": "Bookmaker",
        "bookmaker": "Bookmaker",
        "exchange": "Exchange",
        "bank": "Bank",
    }.get(account_type.strip().casefold(), account_type.strip())
    candidates = [record for record in catalogue.records if record.account_type == expected_type]
    folded = name.strip().casefold()
    exact = [
        record
        for record in candidates
        if folded in {record.brand_name.casefold(), record.short_display_name.casefold()}
    ]
    if len(exact) == 1:
        return _resolved(name, account_type, "EXACT", exact[0], "brand/short exact", "high")

    alias_id = (aliases or {}).get((expected_type.casefold(), folded))
    if alias_id:
        alias_matches = [record for record in candidates if record.catalogue_id == alias_id]
        if len(alias_matches) == 1:
            return _resolved(
                name,
                account_type,
                "ALIAS",
                alias_matches[0],
                "approved alias",
                "high",
            )

    normalized = normalize_provider_name(name)
    normalized_matches = [
        record
        for record in candidates
        if normalized
        in {
            normalize_provider_name(record.brand_name),
            normalize_provider_name(record.short_display_name),
        }
    ]
    if len(normalized_matches) == 1:
        return _resolved(
            name,
            account_type,
            "NORMALIZED",
            normalized_matches[0],
            "punctuation/case normalized",
            "medium",
        )
    if len(exact) > 1 or len(normalized_matches) > 1:
        matches = exact or normalized_matches
        return ProviderResolution(
            name,
            account_type,
            "AMBIGUOUS",
            match_method="multiple catalogue candidates",
            confidence="none",
            candidates=tuple(sorted(record.catalogue_id for record in matches)),
        )
    return ProviderResolution(
        name,
        account_type,
        "MISSING",
        match_method="no catalogue candidate",
        confidence="none",
    )


def _resolved(
    name: str,
    account_type: str,
    classification: SnapshotClassification,
    record: MasterAccountCatalogueRecord,
    method: str,
    confidence: str,
) -> ProviderResolution:
    return ProviderResolution(
        name,
        account_type,
        classification,
        record.catalogue_id,
        record.brand_name,
        method,
        confidence,
    )


def stable_import_key(
    sheet: str,
    source_row: int,
    source_record_id: str,
    fields: JsonObject,
) -> str:
    identity = source_record_id.strip() or f"row-{source_row}"
    canonical = json.dumps(fields, default=str, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:20]
    return f"{sheet}:{identity}:{digest}"


def _decimal(value: object) -> Decimal | None:
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = Decimal(text.replace(",", "").replace("£", ""))
    except InvalidOperation:
        return None
    return parsed if parsed.is_finite() else None


def is_non_transactional_sportsbook_opportunity(fields: JsonObject) -> bool:
    """Return true only when workbook lifecycle state proves no bet was executed."""
    status = str(fields.get("Status", "")).strip().casefold()
    result = str(fields.get("Result", "")).strip().casefold()
    return (
        status in NON_TRANSACTIONAL_SPORTSBOOK_STATUSES
        and result in NON_TRANSACTIONAL_SPORTSBOOK_RESULTS
    )


def _first_value(fields: JsonObject, names: tuple[str, ...]) -> object:
    for name in names:
        value = fields.get(name, "")
        if str(value).strip():
            return value
    return ""


def _sheet_cells(content: bytes, sheet_name: str) -> dict[str, str | bool]:
    workbook = ZipFile(buffer := BytesIO(content))
    try:
        paths = extract_sheet_paths(workbook)
        path = paths.get(sheet_name)
        if path is None:
            return {}
        shared = extract_shared_strings(workbook)
        date_styles = read_date_style_indexes(workbook)
        root = ET.fromstring(workbook.read(path))
        return {
            cell.attrib["r"]: read_cell_value(
                cell,
                shared_strings=shared,
                date_style_indexes=date_styles,
            )
            for cell in root.findall(".//main:sheetData/main:row/main:c", NS)
            if cell.attrib.get("r")
        }
    finally:
        workbook.close()
        buffer.close()


def _profile_settings(
    content: bytes,
    catalogue: MasterAccountCatalogue,
) -> list[JsonObject]:
    cells = _sheet_cells(content, "Dashboard")
    definitions = (
        ("username", "B4", "profile.display_name", "PRESERVE_TARGET"),
        ("active_date_preset", "D4", "tracker_settings.active_date_preset", "IMPORT"),
        ("main_bank", "B5", "onboarding.main_bank_catalogue_id", "IMPORT"),
        ("tracking_start_date", "B6", "profile.tracking_start_date", "IMPORT"),
        ("starting_bankroll", "F6", "onboarding.starting_bankroll", "IMPORT"),
        ("iteration_number", "B7", "onboarding.iteration_number", "IMPORT"),
    )
    mappings = [
        {
            "setting": name,
            "source_cell": cell,
            "source_value": cells.get(cell, ""),
            "parsed_value": cells.get(cell, ""),
            "target": target,
            "classification": classification,
            "transformation": "direct",
            "confidence": "high",
        }
        for name, cell, target, classification in definitions
    ]
    for raw_mapping in mappings:
        mapping = cast(JsonObject, raw_mapping)
        if mapping["setting"] == "active_date_preset":
            mapping["parsed_value"] = str(mapping["source_value"]).replace("–", "-")
            mapping["transformation"] = "normalize legacy dash"
        elif mapping["setting"] == "main_bank":
            resolution = resolve_provider(str(mapping["source_value"]), "Bank", catalogue)
            mapping["parsed_value"] = resolution.catalogue_id
            mapping["transformation"] = "resolve global Bank catalogue ID"
            mapping["confidence"] = resolution.confidence
        elif mapping["setting"] == "iteration_number":
            parsed = _decimal(mapping["source_value"])
            mapping["parsed_value"] = None if parsed is None else int(parsed)
            mapping["transformation"] = "decimal cell to integer"
        elif mapping["setting"] == "starting_bankroll":
            parsed = _decimal(mapping["source_value"])
            mapping["parsed_value"] = None if parsed is None else f"{parsed:.2f}"
            mapping["transformation"] = "decimal currency normalization"
    return mappings


def normalize_legacy_account_fields(fields: JsonObject) -> tuple[JsonObject, list[str]]:
    normalized = dict(fields)
    transformations: list[str] = []
    legacy_status = str(normalized.get("Status", "")).strip()
    if legacy_status in LEGACY_ACCOUNT_STATUS_MAP:
        normalized["Status"] = LEGACY_ACCOUNT_STATUS_MAP[legacy_status]
        transformations.append(f"Status {legacy_status} -> {normalized['Status']}")
    legacy_channel = str(normalized.get("Channel", "")).strip()
    if legacy_channel in LEGACY_ACCOUNT_CHANNEL_MAP:
        normalized["Channel"] = LEGACY_ACCOUNT_CHANNEL_MAP[legacy_channel]
        transformations.append(f"Channel {legacy_channel} -> {normalized['Channel']}")
    return normalized, transformations


def _account_report(content: bytes, catalogue: MasterAccountCatalogue) -> JsonObject:
    parsed = parse_account_xlsx(content)
    resolutions: list[ProviderResolution] = []
    validation_rows: list[JsonObject] = []
    balances = {"Bookmaker": Decimal("0"), "Exchange": Decimal("0"), "Bank": Decimal("0")}
    statuses: Counter[str] = Counter()
    types: Counter[str] = Counter()
    seen_keys: set[str] = set()
    repeat_no_ops = 0
    for row in parsed.rows:
        workbook_type = str(row.fields.get("Type", "")).strip()
        canonical_type = "Bookmaker" if workbook_type.casefold() == "bookie" else workbook_type
        resolution = resolve_provider(str(row.fields.get("Account", "")), workbook_type, catalogue)
        resolutions.append(resolution)
        types[canonical_type or "Unknown"] += 1
        statuses[str(row.fields.get("Status", "")).strip() or "Unknown"] += 1
        balance = _decimal(row.fields.get("CurrentBalance"))
        if balance is not None and canonical_type in balances:
            balances[canonical_type] += balance
        normalized_fields, transformations = normalize_legacy_account_fields(row.fields)
        mapped, errors, warnings = map_account_import_fields(normalized_fields)
        key = stable_import_key(parsed.table_name, row.source_row, row.source_record_id, row.fields)
        if key in seen_keys:
            repeat_no_ops += 1
        seen_keys.add(key)
        validation_rows.append(
            {
                "source_row": row.source_row,
                "source_record_id": row.source_record_id,
                "action": "blocked" if errors else "insert",
                "errors": errors,
                "warnings": warnings,
                "transformations": transformations,
                "import_key": key,
                "catalogue_id": resolution.catalogue_id or "",
                "canonical_brand": resolution.canonical_brand or "",
                "account_type": canonical_type,
                "mapped_profile_state": mapped,
                "source_fields": dict(row.fields),
            }
        )
    resolution_counts = Counter(item.classification for item in resolutions)
    pending_withdrawals = sum(
        (_decimal(row.fields.get("PendingWithdrawalAmount")) or Decimal("0")) for row in parsed.rows
    )
    return {
        "schema": {
            "sheet": "Accounts",
            "table_name": parsed.table_name,
            "table_reference": parsed.table_reference,
            "headers": list(parsed.headers),
            "row_count": len(parsed.rows),
        },
        "resolutions": [asdict(item) for item in resolutions],
        "resolution_counts": dict(sorted(resolution_counts.items())),
        "type_counts": dict(sorted(types.items())),
        "status_counts": dict(sorted(statuses.items())),
        "balances": {key: f"{value:.2f}" for key, value in balances.items()},
        "total_balance": f"{sum(balances.values()):.2f}",
        "pending_withdrawals": f"{pending_withdrawals:.2f}",
        "validation_rows": validation_rows,
        "blocked_count": sum(row["action"] == "blocked" for row in validation_rows),
        "idempotency": {
            "unique_import_keys": len(seen_keys),
            "same_batch_duplicates": repeat_no_ops,
            "second_run_no_ops": len(seen_keys),
        },
    }


def _ledger_report(
    content: bytes,
    definition: LedgerDefinition,
    *,
    effective_date: date,
) -> JsonObject:
    parsed = definition.parser(content)
    rows: list[JsonObject] = []
    keys: set[str] = set()
    duplicate_count = 0
    pnl_total = Decimal("0")
    raw_source_pnl_total = Decimal("0")
    reportable_pnl_total = Decimal("0")
    realised_pnl_total = Decimal("0")
    open_current_pnl_total = Decimal("0")
    open_exposure_total = Decimal("0")
    future_open_current_pnl = Decimal("0")
    dated_pnl: list[JsonObject] = []
    status_counts: Counter[str] = Counter()
    strategy_counts: Counter[str] = Counter()
    date_quality_counts: Counter[str] = Counter()
    future_open_examples: list[JsonObject] = []
    future_settled_examples: list[JsonObject] = []
    non_transactional_rows: list[JsonObject] = []
    settled_count = 0
    open_count = 0
    for row in parsed.rows:
        mapped_result = definition.mapper(row.fields)
        mapped_payload = dict(mapped_result[0])
        errors = list(mapped_result[1])
        source_map = {
            "sportsbook": SPORTSBOOK_SOURCE_MAP,
            "free_bets": FREE_BET_SOURCE_MAP,
            "casino": CASINO_OFFER_SOURCE_MAP,
            "cash_adjustments": CASH_ADJUSTMENT_SOURCE_MAP,
        }[definition.key]
        normalizations: list[JsonObject] = []
        for source_field, target_field in source_map.items():
            source_value = str(row.fields.get(source_field) or "")
            target_value = str(mapped_payload.get(target_field) or "")
            if (
                source_value
                and source_value != target_value
                and source_value.startswith(target_value.removesuffix("..."))
            ):
                normalizations.append(
                    {
                        "rule": "constrained_text_preserved_and_shortened",
                        "source_field": source_field,
                        "target_field": target_field,
                        "source_length": len(source_value),
                        "canonical_length": len(target_value),
                        "source_preserved": True,
                    }
                )
        if (
            definition.key == "casino"
            and not str(row.fields.get("OfferName") or "").strip()
            and str(mapped_payload.get("offer_name") or "").strip()
        ):
            normalizations.append(
                {
                    "rule": "generated_historical_offer_name",
                    "source_field": "OfferName",
                    "target_field": "offer_name",
                    "source_preserved": True,
                }
            )
        if (
            definition.key == "sportsbook"
            and not str(row.fields.get("EventName") or "").strip()
            and str(mapped_payload.get("event_name") or "").strip()
        ):
            normalizations.append(
                {
                    "rule": "generated_historical_event_label",
                    "source_field": "EventName",
                    "target_field": "event_name",
                    "source_preserved": True,
                }
            )
        if (
            definition.key == "sportsbook"
            and not str(row.fields.get("MatchStrategy") or "").strip()
            and str(mapped_payload.get("match_strategy") or "").strip()
        ):
            normalizations.append(
                {
                    "rule": "non_calculating_lifecycle_strategy",
                    "source_field": "MatchStrategy",
                    "target_field": "match_strategy",
                    "source_preserved": True,
                }
            )
        if (
            definition.key == "sportsbook"
            and str(row.fields.get("MatchStrategy") or "").strip()
            in {"Multilay", "Multilay-Underlay"}
            and not str(row.fields.get("MultiLayOutcomesJson") or "").strip()
            and str(mapped_payload.get("multi_lay_outcomes_json") or "[]") != "[]"
        ):
            normalizations.append(
                {
                    "rule": "canonical_multi_lay_branches_generated",
                    "source_field": "OutcomeCount",
                    "target_field": "multi_lay_outcomes_json",
                    "source_preserved": True,
                }
            )
        is_non_transactional = (
            definition.key == "sportsbook"
            and is_non_transactional_sportsbook_opportunity(row.fields)
        )
        if is_non_transactional:
            # Execution-only validation does not apply to an opportunity that was never bet.
            errors = []
        key = stable_import_key(
            definition.sheet_name,
            row.source_row,
            row.source_record_id,
            row.fields,
        )
        if key in keys:
            duplicate_count += 1
        keys.add(key)
        status = str(row.fields.get("Status", "")).strip()
        normalized_status = status.casefold()
        status_counts[status or "Unknown"] += 1
        strategy = str(row.fields.get("MatchStrategy", "")).strip()
        if strategy:
            strategy_counts[strategy] += 1
        is_cash_adjustment = definition.key == "cash_adjustments"
        is_settled = is_cash_adjustment or normalized_status in definition.settled_statuses
        is_open = normalized_status in definition.open_statuses and not is_non_transactional
        if is_settled:
            settled_count += 1
        elif is_open:
            open_count += 1
        source_pnl = _decimal(_first_value(row.fields, definition.pnl_fields))
        if source_pnl is not None:
            raw_source_pnl_total += source_pnl
        pnl = source_pnl
        if is_non_transactional:
            pnl = Decimal("0")
        if (
            definition.key == "free_bets"
            and normalized_status in {"prospecting", "available", "not yet awarded"}
            and str(row.fields.get("Result", "")).strip().casefold() == "pending"
            and not str(row.fields.get("MatchStrategy", "")).strip()
        ):
            pnl = Decimal("0")
        if pnl is not None:
            pnl_total += pnl
            if is_settled:
                realised_pnl_total += pnl
            elif is_open:
                open_current_pnl_total += pnl
        report_date = str(_first_value(row.fields, definition.report_date_fields)).strip()
        settlement_date = str(_first_value(row.fields, definition.settlement_date_fields)).strip()
        parsed_settlement_date = _parse_iso_date(settlement_date) if settlement_date else None
        date_quality = "missing"
        if settlement_date and parsed_settlement_date is None:
            date_quality = "invalid"
            errors.append(
                {
                    "code": "invalid_source_date",
                    "message": "The source settlement/event date is not parseable.",
                }
            )
        elif parsed_settlement_date is not None and parsed_settlement_date > effective_date:
            if is_open:
                date_quality = "valid_future_open"
            elif is_settled and not is_cash_adjustment:
                date_quality = "future_settled_review"
            else:
                date_quality = "valid_future_other"
        elif parsed_settlement_date is not None:
            date_quality = "valid"
        date_quality_counts[date_quality] += 1

        liability = sum(
            (
                _decimal(row.fields.get(field_name)) or Decimal("0")
                for field_name in definition.liability_fields
            ),
            Decimal("0"),
        )
        if is_open:
            open_exposure_total += liability
        if date_quality == "valid_future_open":
            if pnl is not None:
                future_open_current_pnl += pnl
            if len(future_open_examples) < 5:
                future_open_examples.append(
                    {
                        "source_row": row.source_row,
                        "source_record_id": row.source_record_id,
                        "date": settlement_date,
                        "status": status,
                        "current_worst_case_pnl": "" if pnl is None else f"{pnl:.2f}",
                    }
                )
        elif date_quality == "future_settled_review" and len(future_settled_examples) < 5:
            future_settled_examples.append(
                {
                    "source_row": row.source_row,
                    "source_record_id": row.source_record_id,
                    "date": settlement_date,
                    "status": status,
                    "realised_pnl": "" if pnl is None else f"{pnl:.2f}",
                }
            )

        include_in_formal_report = (
            definition.formal_report_statuses is None
            or normalized_status in definition.formal_report_statuses
        )
        if pnl is not None and report_date and include_in_formal_report:
            reportable_pnl_total += pnl
            dated_pnl.append(
                {
                    "date": report_date,
                    "pnl": pnl,
                    "status": status,
                    "financial_state": (
                        "realised" if is_settled else "open_current" if is_open else "other"
                    ),
                    "source_row": row.source_row,
                    "source_record_id": row.source_record_id,
                }
            )
        migration_state = (
            "partial" if errors else "non_transactional" if is_non_transactional else "mapped"
        )
        action = (
            "review"
            if errors
            else "exclude_non_transactional"
            if is_non_transactional
            else "insert"
        )
        if is_non_transactional:
            non_transactional_rows.append(
                {
                    "source_row": row.source_row,
                    "source_record_id": row.source_record_id,
                    "import_key": key,
                    "status": status,
                    "source_pnl": "" if source_pnl is None else f"{source_pnl:.2f}",
                    "imported_pnl": "0.00",
                    "classification": "non_executed_sportsbook_opportunity",
                    "source_provenance_retained": True,
                }
            )
        rows.append(
            {
                "source_row": row.source_row,
                "source_record_id": row.source_record_id,
                "import_key": key,
                "action": action,
                "migration_state": migration_state,
                "errors": errors,
                "normalizations": normalizations,
                "mapped_payload": mapped_payload,
                "source_fields": dict(row.fields),
                "outside_table_range": row.outside_table_range,
                "status": status,
                "source_pnl": "" if source_pnl is None else f"{source_pnl:.2f}",
                "imported_current_pnl": "" if pnl is None else f"{pnl:.2f}",
                "pnl_normalization": (
                    "non_transactional_sportsbook_zero_import_value"
                    if is_non_transactional and source_pnl is not None and pnl != source_pnl
                    else "unplaced_free_bet_zero_current_value"
                    if source_pnl is not None and pnl != source_pnl
                    else ""
                ),
                "current_worst_case_pnl": ("" if pnl is None or not is_open else f"{pnl:.2f}"),
                "realised_pnl": "" if pnl is None or not is_settled else f"{pnl:.2f}",
                "source_date": settlement_date,
                "formal_report_date": report_date,
                "date_quality": date_quality,
            }
        )
    partial = sum(item["migration_state"] == "partial" for item in rows)
    mapped = sum(item["migration_state"] == "mapped" for item in rows)
    non_transactional = len(non_transactional_rows)
    return {
        "schema": {
            "sheet": definition.sheet_name,
            "table_name": parsed.table_name,
            "table_reference": parsed.table_reference,
            "headers": list(parsed.headers),
            "row_count": len(parsed.rows),
            "mapping_version": definition.mapping_version,
        },
        "summary": {
            "source_rows": len(rows),
            "mapped": mapped,
            "partial": partial,
            "rejected": 0,
            "non_transactional": non_transactional,
            "duplicates": duplicate_count,
            "accounted_rows": len(rows),
            "open": open_count,
            "settled": settled_count,
            "other_state": len(rows) - open_count - settled_count - non_transactional,
            "source_pnl_total": f"{raw_source_pnl_total:.2f}",
            "imported_current_or_realised_pnl_total": f"{pnl_total:.2f}",
            "pnl_normalization_impact": f"{pnl_total - raw_source_pnl_total:.2f}",
            "reportable_pnl_total": f"{reportable_pnl_total:.2f}",
            "realised_settled_pnl": f"{realised_pnl_total:.2f}",
            "open_current_worst_case_pnl": f"{open_current_pnl_total:.2f}",
            "open_exposure": f"{open_exposure_total:.2f}",
            "future_settling_open": date_quality_counts["valid_future_open"],
            "future_settling_open_current_pnl": f"{future_open_current_pnl:.2f}",
            "future_settled_review": date_quality_counts["future_settled_review"],
            "non_transactional_rows": non_transactional_rows,
        },
        "status_counts": dict(sorted(status_counts.items())),
        "strategy_counts": dict(sorted(strategy_counts.items())),
        "date_quality_counts": dict(sorted(date_quality_counts.items())),
        "future_open_examples": future_open_examples,
        "future_settled_examples": future_settled_examples,
        "validation_rows": rows,
        "idempotency": {
            "unique_import_keys": len(keys),
            "second_run_no_ops": len(keys),
        },
        "dated_pnl": dated_pnl,
    }


def _extra_place_report(content: bytes) -> JsonObject:
    parsed = parse_sportsbook_xlsx(content)
    ep_rows = [
        row
        for row in parsed.rows
        if str(row.fields.get("OfferType", "")).strip().casefold()
        in {"ep", "ep (extra places)", "extra place", "extra places"}
    ]
    details: list[JsonObject] = []
    classifications: Counter[str] = Counter()
    for row in ep_rows:
        missing = missing_extra_place_fields(row.fields)
        classification = "fully_mappable" if not missing else "insufficient_historical_data"
        classifications[classification] += 1
        details.append(
            {
                "source_row": row.source_row,
                "source_record_id": row.source_record_id,
                "classification": classification,
                "missing_fields": missing,
                "source_trace": f"Sportsbook Bets:{row.source_row}:{row.source_record_id}",
            }
        )
    return {
        "source_sheet": "Sportsbook Bets",
        "detection_rule": "OfferType equals EP / EP (Extra Places) / Extra Place(s)",
        "row_count": len(ep_rows),
        "classification_counts": dict(sorted(classifications.items())),
        "rows": details,
    }


def missing_extra_place_fields(fields: JsonObject) -> list[str]:
    required = {
        "place_terms": ("PlaceTerms", "EWTerms", "EachWayTerms"),
        "bookmaker_places": ("BookmakerPlaces", "PlacesPaid"),
        "exchange_places": ("ExchangePlaces",),
        "place_lay_odds": ("PlaceLayOdds",),
        "finishing_position": ("FinishingPosition",),
    }
    return [
        label for label, names in required.items() if not str(_first_value(fields, names)).strip()
    ]


def _report_blocks(content: bytes) -> JsonObject:
    cells = _sheet_cells(content, "Reports")
    blocks = {
        "week": ("A", "H"),
        "month": ("J", "Q"),
        "year": ("S", "Z"),
    }
    output: JsonObject = {}
    for name, (start, end) in blocks.items():
        column_range = range(ord(start), ord(end) + 1)
        output[name] = {
            "headers": [cells.get(f"{chr(column)}5", "") for column in column_range],
            "rows": [
                [cells.get(f"{chr(column)}{row}", "") for column in column_range]
                for row in range(6, 100)
                if any(str(cells.get(f"{chr(column)}{row}", "")).strip() for column in column_range)
            ],
            "classification": "RECONCILIATION ONLY",
        }
    return output


def _field_mapping_table(
    headers: list[str],
    source_map: dict[str, str],
    source_id: str,
) -> list[JsonObject]:
    rows: list[JsonObject] = []
    for header in headers:
        if header == source_id:
            rows.append(
                {
                    "workbook_field": header,
                    "plum_duff_field": "import_source.source_record_id",
                    "transformation": "stable source identity",
                    "confidence": "high",
                }
            )
        elif header in source_map:
            rows.append(
                {
                    "workbook_field": header,
                    "plum_duff_field": source_map[header],
                    "transformation": "validated canonical payload",
                    "confidence": "high",
                }
            )
        else:
            rows.append(
                {
                    "workbook_field": header,
                    "plum_duff_field": None,
                    "transformation": "preserve in source trace; reconciliation or mapping review",
                    "confidence": "decision-required",
                }
            )
    return rows


def _parse_iso_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _period_reconciliation(
    ledgers: dict[str, JsonObject],
    reports: JsonObject,
    effective_at: str,
) -> JsonObject:
    effective_date = date.fromisoformat(effective_at[:10])
    week_start = effective_date - timedelta(days=effective_date.weekday())
    month_start = effective_date.replace(day=1)
    next_month = (
        month_start.replace(year=month_start.year + 1, month=1)
        if month_start.month == 12
        else month_start.replace(month=month_start.month + 1)
    )
    year_start = effective_date.replace(month=1, day=1)
    next_year = year_start.replace(year=year_start.year + 1)

    def workbook_week(value: date) -> date:
        return value - timedelta(days=value.weekday())

    periods = {
        "week": lambda value: workbook_week(value) == week_start,
        "month": lambda value: month_start <= workbook_week(value) < next_month,
        "year": lambda value: year_start <= workbook_week(value) < next_year,
    }
    report_keys = {
        "week": week_start.isoformat(),
        "month": effective_date.replace(day=1).isoformat(),
        "year": str(effective_date.year),
    }
    output: JsonObject = {}
    ledger_order = ("sportsbook", "free_bets", "casino")
    for period, predicate in periods.items():
        calculated: list[Decimal] = []
        realised: list[Decimal] = []
        open_current: list[Decimal] = []
        other: list[Decimal] = []
        for ledger_name in ledger_order:
            total = Decimal("0")
            settled_total = Decimal("0")
            open_total = Decimal("0")
            other_total = Decimal("0")
            for entry in ledgers[ledger_name]["dated_pnl"]:
                parsed_date = _parse_iso_date(str(entry["date"]))
                if parsed_date is not None and predicate(parsed_date):
                    pnl = cast(Decimal, entry["pnl"])
                    total += pnl
                    if entry["financial_state"] == "realised":
                        settled_total += pnl
                    elif entry["financial_state"] == "open_current":
                        open_total += pnl
                    else:
                        other_total += pnl
            calculated.append(total)
            realised.append(settled_total)
            open_current.append(open_total)
            other.append(other_total)
        report_row = next(
            (
                row
                for row in reports[period]["rows"]
                if str(row[0])[:10] == report_keys[period] or str(row[0]) == report_keys[period]
            ),
            None,
        )
        workbook = [_decimal(report_row[index]) if report_row else None for index in range(1, 5)]
        calculated_total = sum(calculated, Decimal("0"))
        realised_total = sum(realised, Decimal("0"))
        open_current_total = sum(open_current, Decimal("0"))
        other_total = sum(other, Decimal("0"))

        def ledger_values(values: list[Decimal]) -> JsonObject:
            return {
                "sportsbook": f"{values[0]:.2f}",
                "free_bets": f"{values[1]:.2f}",
                "casino": f"{values[2]:.2f}",
                "total": f"{sum(values, Decimal('0')):.2f}",
            }

        output[period] = {
            "period_key": report_keys[period],
            "inclusion_rule": (
                "Workbook WeekLabel rollup; effective timestamp selects the report period "
                "and never excludes source rows."
            ),
            "plum_duff_from_mapped_rows": ledger_values(calculated),
            "financial_views": {
                "realised_settled_pnl": ledger_values(realised),
                "open_current_worst_case_pnl": ledger_values(open_current),
                "other_workbook_included_pnl": ledger_values(other),
                "workbook_equivalent_total": f"{calculated_total:.2f}",
            },
            "workbook_report": {
                "sportsbook": None if workbook[0] is None else f"{workbook[0]:.2f}",
                "free_bets": None if workbook[1] is None else f"{workbook[1]:.2f}",
                "casino": None if workbook[2] is None else f"{workbook[2]:.2f}",
                "total": None if workbook[3] is None else f"{workbook[3]:.2f}",
            },
            "difference": (
                None if workbook[3] is None else f"{calculated_total - workbook[3]:.2f}"
            ),
            "financial_view_check": (f"{realised_total + open_current_total + other_total:.2f}"),
        }
    return output


def build_founder_workbook_dry_run(
    workbook_path: Path,
    *,
    effective_at: str,
    catalogue_path: Path | None = None,
) -> JsonObject:
    return build_founder_workbook_dry_run_bytes(
        workbook_path.read_bytes(),
        source_filename=workbook_path.name,
        source_path=str(workbook_path.resolve()),
        effective_at=effective_at,
        catalogue_path=catalogue_path,
    )


def build_founder_workbook_dry_run_bytes(
    content: bytes,
    *,
    source_filename: str,
    effective_at: str,
    source_path: str = "uploaded-workbook",
    catalogue_path: Path | None = None,
) -> JsonObject:
    """Analyse workbook bytes without retaining or mutating the uploaded source."""
    catalogue = load_master_account_catalogue(catalogue_path)
    effective_date = date.fromisoformat(effective_at[:10])
    account_report = _account_report(content, catalogue)
    ledgers = {
        definition.key: _ledger_report(
            content,
            definition,
            effective_date=effective_date,
        )
        for definition in LEDGERS
    }
    ep_report = _extra_place_report(content)
    reports = _report_blocks(content)
    checksum = hashlib.sha256(content).hexdigest()
    blocked = account_report["blocked_count"]
    partial = sum(ledger["summary"]["partial"] for ledger in ledgers.values())
    provider_blockers = sum(
        account_report["resolution_counts"].get(state, 0) for state in ("AMBIGUOUS", "MISSING")
    )
    ep_blockers = ep_report["classification_counts"].get("insufficient_historical_data", 0)
    return {
        "metadata": {
            "source_filename": source_filename,
            "source_path": source_path,
            "effective_at": effective_at,
            "sha256": checksum,
            "size_bytes": len(content),
            "executed_at": datetime.now().astimezone().isoformat(timespec="seconds"),
            "mapping_version": FOUNDER_MAPPING_VERSION,
            "input_modified": False,
        },
        "schema": {
            "sheets": _sheet_names(content),
            "accounts": account_report["schema"],
            **{key: value["schema"] for key, value in ledgers.items()},
        },
        "accounts": account_report,
        "profile_settings": _profile_settings(content, catalogue),
        "mapping_specification": {
            "accounts": _field_mapping_table(
                account_report["schema"]["headers"], ACCOUNT_SOURCE_MAP, "AccountID"
            ),
            "sportsbook": _field_mapping_table(
                ledgers["sportsbook"]["schema"]["headers"],
                SPORTSBOOK_SOURCE_MAP,
                "QualBetID",
            ),
            "free_bets": _field_mapping_table(
                ledgers["free_bets"]["schema"]["headers"],
                FREE_BET_SOURCE_MAP,
                "FreeBetID",
            ),
            "casino": _field_mapping_table(
                ledgers["casino"]["schema"]["headers"],
                CASINO_OFFER_SOURCE_MAP,
                "CasinoOfferID",
            ),
            "cash_adjustments": _field_mapping_table(
                ledgers["cash_adjustments"]["schema"]["headers"],
                CASH_ADJUSTMENT_SOURCE_MAP,
                "AdjustmentID",
            ),
            "legacy_account_statuses": LEGACY_ACCOUNT_STATUS_MAP,
            "legacy_account_channels": LEGACY_ACCOUNT_CHANNEL_MAP,
        },
        "ledgers": ledgers,
        "extra_places": ep_report,
        "reports": reports,
        "reconciliation": _period_reconciliation(ledgers, reports, effective_at),
        "readiness": {
            "status": (
                "BLOCKED" if blocked or partial or provider_blockers or ep_blockers else "PASSED"
            ),
            "validation_blocked_rows": blocked,
            "partial_rows_requiring_mapping_decisions": partial,
            "provider_conflicts": provider_blockers,
            "historical_ep_rows_requiring_review": ep_blockers,
            "real_import_performed": False,
        },
    }


def _sheet_names(content: bytes) -> list[str]:
    with ZipFile(BytesIO(content)) as workbook:
        return list(extract_sheet_paths(workbook))


def write_private_artifacts(result: JsonObject, output_directory: Path) -> list[Path]:
    output_directory.mkdir(parents=True, exist_ok=True)
    artifacts = {
        "workbook-schema-discovery.json": {
            "metadata": result["metadata"],
            "schema": result["schema"],
        },
        "mapping-specification.json": {
            "profile_settings": result["profile_settings"],
            "ledger_schemas": result["schema"],
            "field_maps": result["mapping_specification"],
        },
        "provider-resolution-report.json": {
            "summary": result["accounts"]["resolution_counts"],
            "records": result["accounts"]["resolutions"],
        },
        "row-validation-errors.json": {
            "accounts": result["accounts"]["validation_rows"],
            "ledgers": {key: value["validation_rows"] for key, value in result["ledgers"].items()},
        },
        "reconciliation-summary.json": {
            "accounts": {
                key: result["accounts"][key]
                for key in (
                    "type_counts",
                    "status_counts",
                    "balances",
                    "total_balance",
                    "pending_withdrawals",
                )
            },
            "ledgers": {key: value["summary"] for key, value in result["ledgers"].items()},
            "reports": result["reports"],
            "period_comparison": result["reconciliation"],
        },
        "extra-place-migration-report.json": result["extra_places"],
        "import-readiness-report.json": {
            "metadata": result["metadata"],
            "readiness": result["readiness"],
            "idempotency": {
                "accounts": result["accounts"]["idempotency"],
                "ledgers": {key: value["idempotency"] for key, value in result["ledgers"].items()},
            },
        },
    }
    paths: list[Path] = []
    for filename, payload in artifacts.items():
        path = output_directory / filename
        path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
        paths.append(path)
    readme = output_directory / "README.md"
    readiness = result["readiness"]
    readme.write_text(
        "# Founder Workbook Dry Run\n\n"
        f"- Snapshot: `{result['metadata']['effective_at']}`\n"
        f"- SHA-256: `{result['metadata']['sha256']}`\n"
        f"- Result: **{readiness['status']}**\n"
        f"- Blocked rows: {readiness['validation_blocked_rows']}\n"
        f"- Partial rows requiring mapping decisions: "
        f"{readiness['partial_rows_requiring_mapping_decisions']}\n"
        f"- Provider conflicts: {readiness['provider_conflicts']}\n"
        f"- Historical EP rows requiring review: "
        f"{readiness['historical_ep_rows_requiring_review']}\n\n"
        "No production Profile or ledger records were written. See the adjacent JSON reports "
        "for row-level traceability and reconciliation.\n",
        encoding="utf-8",
    )
    paths.append(readme)
    return paths
