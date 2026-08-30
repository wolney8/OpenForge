from __future__ import annotations

import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.founder_workbook_dry_run import (
    LEDGERS,
    build_founder_workbook_dry_run,
    stable_import_key,
)
from openforge_api.xlsx_import import parse_account_xlsx, parse_sportsbook_xlsx

router = APIRouter(prefix="/fund-manager/import-review", tags=["founder-import-review"])

ReviewStatus = Literal[
    "UNREVIEWED",
    "REVIEWED_ACCEPTED",
    "REVIEWED_OVERRIDDEN",
    "DEFERRED",
    "EXCLUDED",
    "BLOCKED",
]

SAFE_BATCH_ACTIONS = {
    ("advanced_lay", "historical_imported_calculation"),
    ("text_length", "preserve_and_shorten"),
    ("missing_offer_name", "historical_casino_label"),
    ("missing_strategy", "historical_imported_calculation"),
}

ALLOWED_OVERRIDE_FIELDS = {
    "calculation_provenance",
    "canonical_text",
    "canonical_text_rule",
    "label_generated",
    "manual_override_reason",
    "offer_name",
    "strategy",
}

PROVIDER_ACTIONS = {
    "map_existing_provider",
    "create_provider_candidate",
    "mark_historical_provider",
    "defer",
}
EXTRA_PLACE_ACTIONS = {
    "historical_extra_place",
    "keep_sportsbook_historical",
    "reclassify",
    "defer",
    "exclude",
}
OVERRIDE_REASON_ACTIONS = {
    "provide_override_reason",
    "remove_override",
    "historical_imported_behavior",
    "defer",
    "exclude",
}
PARTIAL_ACTIONS = {
    "accept_proposed",
    "historical_imported_calculation",
    "historical_casino_label",
    "preserve_and_shorten",
    "edit_mapping",
    "reclassify",
    "defer",
    "exclude",
}

ACTION_STATUS: dict[str, ReviewStatus] = {
    "accept_proposed": "REVIEWED_ACCEPTED",
    "historical_imported_calculation": "REVIEWED_ACCEPTED",
    "historical_extra_place": "REVIEWED_ACCEPTED",
    "keep_sportsbook_historical": "REVIEWED_ACCEPTED",
    "historical_casino_label": "REVIEWED_ACCEPTED",
    "preserve_and_shorten": "REVIEWED_ACCEPTED",
    "historical_imported_behavior": "REVIEWED_ACCEPTED",
    "map_existing_provider": "REVIEWED_OVERRIDDEN",
    "mark_historical_provider": "REVIEWED_OVERRIDDEN",
    "edit_mapping": "REVIEWED_OVERRIDDEN",
    "reclassify": "REVIEWED_OVERRIDDEN",
    "provide_override_reason": "REVIEWED_OVERRIDDEN",
    "remove_override": "REVIEWED_OVERRIDDEN",
    "create_provider_candidate": "BLOCKED",
    "defer": "DEFERRED",
    "exclude": "EXCLUDED",
}


class ReviewDecisionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(min_length=16, max_length=80)
    source_fingerprint: str = Field(min_length=32, max_length=80)
    action: str = Field(min_length=2, max_length=80)
    target_type: str = Field(default="", max_length=80)
    catalogue_id: str = Field(default="", max_length=80)
    note: str = Field(default="", max_length=1000)
    override_fields: dict[str, str | int | float | bool | None] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_reasoned_action(self) -> "ReviewDecisionPayload":
        if self.action in {"defer", "exclude", "reclassify", "mark_historical_provider"}:
            if not self.note.strip():
                raise ValueError("This decision requires a review note or reason")
        if self.action == "map_existing_provider" and not self.catalogue_id.strip():
            raise ValueError("Select an existing catalogue provider")
        if self.action == "reclassify" and not self.target_type.strip():
            raise ValueError("Select a target ledger type")
        if self.action == "provide_override_reason" and not self.note.strip():
            raise ValueError("Enter the manual override reason")
        unknown_fields = set(self.override_fields) - ALLOWED_OVERRIDE_FIELDS
        if unknown_fields:
            raise ValueError("One or more override fields are not supported")
        if self.action == "edit_mapping" and not self.override_fields:
            raise ValueError("Edit at least one supported mapping field")
        return self


class BatchDecisionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_ids: list[str] = Field(min_length=1, max_length=500)
    source_fingerprints: dict[str, str]
    issue_type: str = Field(min_length=2, max_length=80)
    action: str = Field(min_length=2, max_length=80)
    note: str = Field(default="", max_length=1000)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _workbook_path() -> Path:
    configured = os.getenv(
        "OPENFORGE_FOUNDER_WORKBOOK_PATH",
        "data/private/imports/founder/WO_MB_Tracker_May2026.xlsx",
    )
    path = Path(configured)
    return path if path.is_absolute() else _repo_root() / path


def _review_directory() -> Path:
    configured = os.getenv(
        "OPENFORGE_FOUNDER_IMPORT_REVIEW_DIRECTORY",
        "data/private/imports/founder/dry-run-2026-08-29-1605",
    )
    path = Path(configured)
    return path if path.is_absolute() else _repo_root() / path


def _decision_path() -> Path:
    return _review_directory() / "review-decisions.json"


def _load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail="Founder dry-run review is unavailable"
        ) from exc
    if not isinstance(value, dict):
        raise HTTPException(status_code=500, detail="Founder dry-run artifact is invalid")
    return value


def _load_decisions(checksum: str, mapping_version: str) -> dict[str, dict[str, Any]]:
    path = _decision_path()
    if not path.exists():
        return {}
    document = _load_json(path)
    if document.get("workbook_checksum") != checksum:
        return {}
    if document.get("mapping_version") != mapping_version:
        return {}
    decisions = document.get("decisions", {})
    return decisions if isinstance(decisions, dict) else {}


def _write_decisions(
    checksum: str,
    mapping_version: str,
    decisions: dict[str, dict[str, Any]],
) -> None:
    path = _decision_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    document = {
        "schema_version": "founder-import-review-v1",
        "workbook_checksum": checksum,
        "mapping_version": mapping_version,
        "updated_at": datetime.now(UTC).isoformat(),
        "decisions": decisions,
    }
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(document, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def _fingerprint(fields: dict[str, Any]) -> str:
    encoded = json.dumps(fields, default=str, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _item_id(checksum: str, import_id: str, issue_type: str) -> str:
    source = f"{checksum}:{import_id}:{issue_type}"
    return "review-" + hashlib.sha256(source.encode("utf-8")).hexdigest()[:32]


def _first(fields: dict[str, Any], *names: str) -> str:
    for name in names:
        value = fields.get(name)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _context(fields: dict[str, Any]) -> dict[str, Any]:
    return {
        "date": _first(fields, "DateSettling", "DateStarted", "DatePlaced", "AdjustmentDate"),
        "provider": _first(fields, "Bookmaker", "Account", "LinkedAccount"),
        "offer_type": _first(fields, "OfferType", "Offer", "Stage"),
        "offer_name": _first(fields, "OfferName"),
        "event": _first(fields, "EventName", "Game", "Description"),
        "stake": _first(fields, "BackStake", "FreeBetValue", "SpinStake", "Amount"),
        "odds": _first(fields, "BackOdds", "Odds"),
        "exchange": _first(fields, "Exchange", "LayExchange"),
        "lay_type": _first(fields, "LayMode", "Strategy", "MatchStrategy"),
        "lay_odds": _first(fields, "LayOdds", "LayOdds1", "LayOdds2"),
        "lay_stake": _first(fields, "LayStake", "LayStake1", "LayMatchedStake1"),
        "pnl": _first(fields, "FinalNetPnL", "NetPnL", "CalcNetPnL", "ReportingValue"),
        "status": _first(fields, "Status", "BetStatus", "Stage"),
        "result": _first(fields, "Result", "Outcome"),
        "bet_type": _first(fields, "BetType", "FixtureType", "Market"),
        "notes": _first(fields, "Notes", "Note", "Comments", "Strategy", "MatchStrategy"),
    }


def _issue_types(errors: list[dict[str, Any]], fields: dict[str, Any], ledger: str) -> list[str]:
    messages = " ".join(str(error.get("message", "")) for error in errors).casefold()
    codes = {str(error.get("code", "")) for error in errors}
    issues: list[str] = []
    if "advanced_branch_mapping_required" in codes:
        issues.append("advanced_lay")
    if "at most 200" in messages:
        issues.append("text_length")
    if "manual_override_reason" in messages:
        issues.append("override_missing_reason")
    if "input should be" in messages and not _first(fields, "Strategy", "MatchStrategy"):
        issues.append("missing_strategy")
    if ledger == "casino" and "at least 1 character" in messages:
        issues.append("missing_offer_name")
    return issues or [f"{ledger}_partial"]


def _proposed_target(ledger: str, issues: list[str]) -> str:
    if "advanced_lay" in issues or "missing_strategy" in issues:
        return "Historical imported calculation"
    if "missing_offer_name" in issues:
        return "Casino Offer / Historical Casino Offer"
    if "text_length" in issues:
        return "Current ledger with preserved source text"
    return {"sportsbook": "Sportsbook Bet", "free_bets": "Free Bet", "casino": "Casino Offer"}.get(
        ledger, ledger.replace("_", " ").title()
    )


def _review_item(
    *,
    checksum: str,
    import_id: str,
    source_sheet: str,
    source_row: int,
    source_record_id: str,
    fields: dict[str, Any],
    issue_types: list[str],
    reason: str,
    target: str,
    confidence: str,
    category: str,
) -> dict[str, Any]:
    primary_issue = issue_types[0]
    return {
        "item_id": _item_id(checksum, import_id, category),
        "import_id": import_id,
        "source_fingerprint": _fingerprint(fields),
        "source_sheet": source_sheet,
        "source_row": source_row,
        "source_record_id": source_record_id,
        "category": category,
        "issue_type": primary_issue,
        "issue_types": issue_types,
        "reason": reason,
        "missing_fields": [],
        "proposed_target": target,
        "confidence": confidence,
        "context": _context(fields),
        "source_fields": fields,
        "calculation_provenance": (
            "imported_historical" if _context(fields)["pnl"] else "unresolved"
        ),
    }


def _build_items() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    workbook = _workbook_path()
    if not workbook.exists():
        raise HTTPException(status_code=404, detail="Founder dry-run review is unavailable")
    readiness = _load_json(_review_directory() / "import-readiness-report.json")
    metadata = readiness.get("metadata", {})
    checksum = str(metadata.get("sha256", ""))
    mapping_version = str(metadata.get("mapping_version", ""))
    if hashlib.sha256(workbook.read_bytes()).hexdigest() != checksum:
        raise HTTPException(
            status_code=409, detail="Founder workbook no longer matches this dry run"
        )
    validation = _load_json(_review_directory() / "row-validation-errors.json")
    providers = _load_json(_review_directory() / "provider-resolution-report.json")
    ep_report = _load_json(_review_directory() / "extra-place-migration-report.json")
    content = workbook.read_bytes()
    account_rows = {row.source_row: row for row in parse_account_xlsx(content).rows}
    parsed_ledgers = {definition.key: definition.parser(content) for definition in LEDGERS}
    items: list[dict[str, Any]] = []

    missing_names = {
        str(record.get("workbook_name", ""))
        for record in providers.get("records", [])
        if record.get("classification") in {"MISSING", "AMBIGUOUS"}
    }
    account_validation = {row["source_row"]: row for row in validation.get("accounts", [])}
    for source_row, row in account_rows.items():
        if _first(row.fields, "Account") not in missing_names:
            continue
        validation_row = account_validation[source_row]
        items.append(
            _review_item(
                checksum=checksum,
                import_id=str(validation_row["import_key"]),
                source_sheet="Accounts",
                source_row=source_row,
                source_record_id=row.source_record_id,
                fields=row.fields,
                issue_types=["missing_provider"],
                reason="Provider is not resolved in the global Account Catalogue.",
                target="Existing provider, validated catalogue candidate, or historical provider",
                confidence="blocked",
                category="missing_provider",
            )
        )

    for definition in LEDGERS:
        rows_by_number = {row.source_row: row for row in parsed_ledgers[definition.key].rows}
        ledger_validation = validation.get("ledgers", {}).get(definition.key, [])
        for validation_row in ledger_validation:
            if validation_row.get("migration_state") != "partial":
                continue
            row = rows_by_number[int(validation_row["source_row"])]
            errors = validation_row.get("errors", [])
            issues = _issue_types(errors, row.fields, definition.key)
            items.append(
                _review_item(
                    checksum=checksum,
                    import_id=str(validation_row["import_key"]),
                    source_sheet=definition.sheet_name,
                    source_row=row.source_row,
                    source_record_id=row.source_record_id,
                    fields=row.fields,
                    issue_types=issues,
                    reason="; ".join(str(error.get("message", "")) for error in errors),
                    target=_proposed_target(definition.key, issues),
                    confidence="review_required",
                    category=f"{definition.key}_partial",
                )
            )

    sports_rows = {row.source_row: row for row in parse_sportsbook_xlsx(content).rows}
    for ep_row in ep_report.get("rows", []):
        ep_source_row = sports_rows[int(ep_row["source_row"])]
        import_id = stable_import_key(
            "Sportsbook Bets",
            ep_source_row.source_row,
            ep_source_row.source_record_id,
            ep_source_row.fields,
        )
        item = _review_item(
            checksum=checksum,
            import_id=import_id,
            source_sheet="Sportsbook Bets",
            source_row=ep_source_row.source_row,
            source_record_id=ep_source_row.source_record_id,
            fields=ep_source_row.fields,
            issue_types=["historical_extra_place"],
            reason="Current Extra Place fields are absent from this historical Sportsbook row.",
            target="Historical Extra Place or retained Sportsbook EP row",
            confidence="insufficient_historical_data",
            category="historical_extra_place",
        )
        item["missing_fields"] = ep_row.get("missing_fields", [])
        items.append(item)

    return {
        "source_filename": metadata.get("source_filename", workbook.name),
        "effective_at": metadata.get("effective_at", ""),
        "workbook_checksum": checksum,
        "mapping_version": mapping_version,
        "original_partial_count": int(
            readiness.get("readiness", {}).get("partial_rows_requiring_mapping_decisions", 0)
        ),
        "provider_conflict_count": int(readiness.get("readiness", {}).get("provider_conflicts", 0)),
        "historical_ep_count": int(
            readiness.get("readiness", {}).get("historical_ep_rows_requiring_review", 0)
        ),
        "real_import_performed": False,
    }, items


def build_review_items_from_dry_run(
    result: dict[str, Any], content: bytes
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Build review rows directly from an in-memory dry run for hosted uploads."""
    metadata = result["metadata"]
    checksum = str(metadata["sha256"])
    account_rows = {row.source_row: row for row in parse_account_xlsx(content).rows}
    parsed_ledgers = {definition.key: definition.parser(content) for definition in LEDGERS}
    items: list[dict[str, Any]] = []

    missing_names = {
        str(record.get("workbook_name", ""))
        for record in result["accounts"].get("resolutions", [])
        if record.get("classification") in {"MISSING", "AMBIGUOUS"}
    }
    account_validation = {
        int(row["source_row"]): row for row in result["accounts"].get("validation_rows", [])
    }
    for source_row, row in account_rows.items():
        if _first(row.fields, "Account") not in missing_names:
            continue
        validation_row = account_validation[source_row]
        items.append(
            _review_item(
                checksum=checksum,
                import_id=str(validation_row["import_key"]),
                source_sheet="Accounts",
                source_row=source_row,
                source_record_id=row.source_record_id,
                fields=row.fields,
                issue_types=["missing_provider"],
                reason="Provider is not resolved in the global Account Catalogue.",
                target="Existing provider, validated catalogue candidate, or historical provider",
                confidence="blocked",
                category="missing_provider",
            )
        )

    for definition in LEDGERS:
        rows_by_number = {row.source_row: row for row in parsed_ledgers[definition.key].rows}
        for validation_row in result["ledgers"][definition.key].get("validation_rows", []):
            if validation_row.get("migration_state") != "partial":
                continue
            row = rows_by_number[int(validation_row["source_row"])]
            errors = validation_row.get("errors", [])
            issues = _issue_types(errors, row.fields, definition.key)
            items.append(
                _review_item(
                    checksum=checksum,
                    import_id=str(validation_row["import_key"]),
                    source_sheet=definition.sheet_name,
                    source_row=row.source_row,
                    source_record_id=row.source_record_id,
                    fields=row.fields,
                    issue_types=issues,
                    reason="; ".join(str(error.get("message", "")) for error in errors),
                    target=_proposed_target(definition.key, issues),
                    confidence="review_required",
                    category=f"{definition.key}_partial",
                )
            )

    sports_rows = {row.source_row: row for row in parse_sportsbook_xlsx(content).rows}
    for ep_row in result["extra_places"].get("rows", []):
        ep_source_row = sports_rows[int(ep_row["source_row"])]
        import_id = stable_import_key(
            "Sportsbook Bets",
            ep_source_row.source_row,
            ep_source_row.source_record_id,
            ep_source_row.fields,
        )
        item = _review_item(
            checksum=checksum,
            import_id=import_id,
            source_sheet="Sportsbook Bets",
            source_row=ep_source_row.source_row,
            source_record_id=ep_source_row.source_record_id,
            fields=ep_source_row.fields,
            issue_types=["historical_extra_place"],
            reason="Current Extra Place fields are absent from this historical Sportsbook row.",
            target="Historical Extra Place or retained Sportsbook EP row",
            confidence="insufficient_historical_data",
            category="historical_extra_place",
        )
        item["missing_fields"] = ep_row.get("missing_fields", [])
        items.append(item)

    readiness = result["readiness"]
    return {
        "source_filename": metadata["source_filename"],
        "effective_at": metadata["effective_at"],
        "workbook_checksum": checksum,
        "mapping_version": metadata["mapping_version"],
        "original_partial_count": int(readiness["partial_rows_requiring_mapping_decisions"]),
        "provider_conflict_count": int(readiness["provider_conflicts"]),
        "historical_ep_count": int(readiness["historical_ep_rows_requiring_review"]),
        "real_import_performed": False,
    }, items


def apply_review_decisions(
    metadata: dict[str, Any],
    items: list[dict[str, Any]],
    decisions: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    valid_decisions = 0
    stale_decisions = 0
    reviewed_items: list[dict[str, Any]] = []
    for source_item in items:
        item = dict(source_item)
        decision = decisions.get(item["item_id"])
        if decision and decision.get("source_fingerprint") == item["source_fingerprint"]:
            item["decision"] = decision
            item["review_status"] = decision["status"]
            valid_decisions += 1
        else:
            if decision:
                stale_decisions += 1
            item["decision"] = None
            item["review_status"] = "UNREVIEWED"
        reviewed_items.append(item)
    return {
        "metadata": metadata,
        "items": reviewed_items,
        "reconciliation": _reconciliation(
            metadata, reviewed_items, valid_decisions, stale_decisions
        ),
    }


def _principal_email(request: Request) -> str:
    session = getattr(request.state, "auth_session", None)
    return str(getattr(session, "email", "local-fund-manager"))


def _with_decisions(
    metadata: dict[str, Any], items: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    decisions = _load_decisions(metadata["workbook_checksum"], metadata["mapping_version"])
    valid_decisions = 0
    stale_decisions = 0
    for item in items:
        decision = decisions.get(item["item_id"])
        if decision and decision.get("source_fingerprint") == item["source_fingerprint"]:
            item["decision"] = decision
            item["review_status"] = decision["status"]
            valid_decisions += 1
        else:
            if decision:
                stale_decisions += 1
            item["decision"] = None
            item["review_status"] = "UNREVIEWED"
    return items, _reconciliation(metadata, items, valid_decisions, stale_decisions)


def _reconciliation(
    metadata: dict[str, Any],
    items: list[dict[str, Any]],
    valid_decisions: int,
    stale_decisions: int,
) -> dict[str, Any]:
    counts = {
        status: 0
        for status in (
            "UNREVIEWED",
            "REVIEWED_ACCEPTED",
            "REVIEWED_OVERRIDDEN",
            "DEFERRED",
            "EXCLUDED",
            "BLOCKED",
        )
    }
    for item in items:
        counts[item["review_status"]] += 1
    partial_items = [item for item in items if item["category"].endswith("_partial")]
    remaining_partial = sum(
        item["review_status"] in {"UNREVIEWED", "BLOCKED"} for item in partial_items
    )
    excluded_ids = {item["import_id"] for item in items if item["review_status"] == "EXCLUDED"}
    deferred_ids = {item["import_id"] for item in items if item["review_status"] == "DEFERRED"}
    impact_items = [
        {
            "item_id": item["item_id"],
            "import_id": item["import_id"],
            "source_sheet": item["source_sheet"],
            "source_row": item["source_row"],
            "action": item["decision"]["action"],
            "value": item["context"]["pnl"],
        }
        for item in items
        if item["import_id"] in excluded_ids | deferred_ids and item["context"]["pnl"]
    ]
    pnl_impact = sum(float(item["value"]) for item in impact_items)
    blocking = counts["UNREVIEWED"] + counts["BLOCKED"]
    return {
        "original_partial_count": metadata["original_partial_count"],
        "resolved_partial_count": len(partial_items) - remaining_partial,
        "remaining_partial_count": remaining_partial,
        "excluded_count": len(excluded_ids),
        "deferred_count": len(deferred_ids),
        "review_status_counts": counts,
        "valid_decision_count": valid_decisions,
        "stale_decision_count": stale_decisions,
        "pnl_impact": f"{pnl_impact:.2f}",
        "pnl_impact_items": impact_items,
        "row_count_impact": -(len(excluded_ids) + len(deferred_ids)),
        "import_ready": blocking == 0,
        "real_import_performed": False,
    }


def build_review_workspace() -> dict[str, Any]:
    metadata, items = _build_items()
    reviewed_items, reconciliation = _with_decisions(metadata, items)
    return {"metadata": metadata, "items": reviewed_items, "reconciliation": reconciliation}


def _allowed_actions(item: dict[str, Any]) -> set[str]:
    if item["category"] == "missing_provider":
        return PROVIDER_ACTIONS
    if item["category"] == "historical_extra_place":
        return EXTRA_PLACE_ACTIONS
    if "override_missing_reason" in item["issue_types"]:
        return OVERRIDE_REASON_ACTIONS
    return PARTIAL_ACTIONS


def _decision_overrides(item: dict[str, Any], payload: ReviewDecisionPayload) -> dict[str, Any]:
    overrides = dict(payload.override_fields)
    if payload.action in {
        "historical_imported_calculation",
        "historical_extra_place",
        "keep_sportsbook_historical",
        "historical_imported_behavior",
    }:
        overrides["calculation_provenance"] = "imported_historical"
    if payload.action == "preserve_and_shorten":
        overrides["canonical_text_rule"] = "truncate_to_200_with_full_source_preserved"
    if payload.action == "historical_casino_label":
        overrides.update({"offer_name": "Historical Casino Offer", "label_generated": True})
    if payload.action == "provide_override_reason":
        overrides["manual_override_reason"] = payload.note.strip()
    return overrides


@router.get("")
def get_founder_import_review() -> dict[str, Any]:
    return build_review_workspace()


@router.put("/decisions/{item_id}")
def put_founder_import_review_decision(
    item_id: str,
    payload: ReviewDecisionPayload,
    request: Request,
) -> dict[str, Any]:
    if payload.item_id != item_id:
        raise HTTPException(status_code=400, detail="Review item identity does not match")
    workspace = build_review_workspace()
    item = next((entry for entry in workspace["items"] if entry["item_id"] == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Review item was not found")
    if item["source_fingerprint"] != payload.source_fingerprint:
        raise HTTPException(status_code=409, detail="Source row changed; review the updated row")
    if payload.action not in ACTION_STATUS or payload.action not in _allowed_actions(item):
        raise HTTPException(status_code=422, detail="Unsupported review decision")
    if payload.action == "map_existing_provider":
        catalogue = load_master_account_catalogue()
        if not any(record.catalogue_id == payload.catalogue_id for record in catalogue.records):
            raise HTTPException(status_code=422, detail="Catalogue provider was not found")
    metadata = workspace["metadata"]
    decisions = _load_decisions(metadata["workbook_checksum"], metadata["mapping_version"])
    now = datetime.now(UTC).isoformat()
    existing = decisions.get(item_id, {})
    decisions[item_id] = {
        "item_id": item_id,
        "import_id": item["import_id"],
        "source_fingerprint": item["source_fingerprint"],
        "issue_type": item["issue_type"],
        "action": payload.action,
        "status": ACTION_STATUS[payload.action],
        "target_type": payload.target_type.strip(),
        "catalogue_id": payload.catalogue_id.strip(),
        "note": payload.note.strip(),
        "override_fields": _decision_overrides(item, payload),
        "actor": _principal_email(request),
        "created_at": existing.get("created_at", now),
        "updated_at": now,
    }
    _write_decisions(metadata["workbook_checksum"], metadata["mapping_version"], decisions)
    return build_review_workspace()


@router.post("/decisions/batch")
def put_founder_import_review_batch(
    payload: BatchDecisionPayload,
    request: Request,
) -> dict[str, Any]:
    if (payload.issue_type, payload.action) not in SAFE_BATCH_ACTIONS:
        raise HTTPException(status_code=422, detail="This pattern is not safe for batch review")
    workspace = build_review_workspace()
    items_by_id = {item["item_id"]: item for item in workspace["items"]}
    selected = [items_by_id.get(item_id) for item_id in payload.item_ids]
    if any(item is None for item in selected):
        raise HTTPException(status_code=404, detail="One or more review items were not found")
    for item in selected:
        assert item is not None
        if payload.issue_type not in item["issue_types"]:
            raise HTTPException(
                status_code=422, detail="Batch rows do not share the selected issue"
            )
        if payload.source_fingerprints.get(item["item_id"]) != item["source_fingerprint"]:
            raise HTTPException(
                status_code=409, detail="A source row changed; review the batch again"
            )
    metadata = workspace["metadata"]
    decisions = _load_decisions(metadata["workbook_checksum"], metadata["mapping_version"])
    now = datetime.now(UTC).isoformat()
    for item in selected:
        assert item is not None
        existing = decisions.get(item["item_id"], {})
        decisions[item["item_id"]] = {
            "item_id": item["item_id"],
            "import_id": item["import_id"],
            "source_fingerprint": item["source_fingerprint"],
            "issue_type": payload.issue_type,
            "action": payload.action,
            "status": ACTION_STATUS[payload.action],
            "target_type": item["proposed_target"],
            "catalogue_id": "",
            "note": payload.note.strip(),
            "override_fields": (
                {"calculation_provenance": "imported_historical"}
                if payload.action == "historical_imported_calculation"
                else {"canonical_text_rule": "truncate_to_200_with_full_source_preserved"}
                if payload.action == "preserve_and_shorten"
                else {"offer_name": "Historical Casino Offer", "label_generated": True}
            ),
            "actor": _principal_email(request),
            "batch_decision": True,
            "created_at": existing.get("created_at", now),
            "updated_at": now,
        }
    _write_decisions(metadata["workbook_checksum"], metadata["mapping_version"], decisions)
    return build_review_workspace()


@router.post("/rerun")
def rerun_founder_import_review() -> dict[str, Any]:
    workbook = _workbook_path()
    metadata = _load_json(_review_directory() / "import-readiness-report.json").get("metadata", {})
    result = build_founder_workbook_dry_run(
        workbook,
        effective_at=str(metadata.get("effective_at", "")),
    )
    if result["metadata"]["sha256"] != metadata.get("sha256"):
        raise HTTPException(
            status_code=409, detail="Founder workbook no longer matches this dry run"
        )
    workspace = build_review_workspace()
    return {
        "metadata": workspace["metadata"],
        "reconciliation": workspace["reconciliation"],
        "source_readiness": result["readiness"],
        "real_import_performed": False,
    }
