from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from openforge_api.source_identity import logical_source_namespace, workbook_source_key

LINEAGE_SCHEMA_VERSION = "profile-workbook-lineage-v1"
DELTA_SCHEMA_VERSION = "profile-workbook-incremental-delta-v1"
WORKBOOK_FAMILY = "plum-duff-matched-betting-tracker-v1"

DELTA_STATUSES = (
    "UNCHANGED",
    "NEW",
    "CHANGED",
    "CONFLICT",
    "SOURCE_MISSING",
    "UNSUPPORTED",
)

FINANCIAL_FIELDS = frozenset(
    {
        "amount",
        "back_odds",
        "back_stake",
        "bonus_amount",
        "cash_stake",
        "calc_net_pnl",
        "commission_rate",
        "credit_amount",
        "current_balance",
        "final_net_pnl",
        "free_bet_value",
        "imported_historical_pnl",
        "lay_actual",
        "lay_commission_1",
        "lay_matched_stake_1",
        "lay_odds_1",
        "manual_override_value",
        "pending_withdrawal_amount",
        "spin_stake",
        "wager_target",
        "win_commission",
        "win_lay_odds",
        "actual_win_lay_stake",
        "place_commission",
        "place_lay_odds",
        "actual_place_lay_stake",
    }
)

FIELD_LABELS = {
    "account": "Account",
    "account_type": "Account type",
    "access_channels_json": "Access channels",
    "adjustment_date": "Adjustment date",
    "affects_cash_snapshot": "Counts in cash snapshot",
    "affects_investment": "Affects investment",
    "amount": "Amount",
    "back_odds": "Back odds",
    "back_stake": "Back stake",
    "bookmaker": "Bookmaker",
    "cash_stake": "Cash stake",
    "channel": "Access channel",
    "counts_in_cash_total": "Counts in current cash",
    "current_balance": "Current balance",
    "date_settled": "Settlement date",
    "date_settling": "Settlement date",
    "description": "Description",
    "direction": "Direction",
    "event_name": "Event",
    "exchange_name": "Exchange",
    "expiry_datetime": "Expiry",
    "final_net_pnl": "Final P&L",
    "free_bet_value": "Free Bet value",
    "game": "Game",
    "last_balance_update": "Balance observed",
    "lay_actual": "Actual lay stake",
    "lay_commission_1": "Lay commission",
    "lay_matched_stake_1": "Matched lay stake",
    "lay_odds_1": "Lay odds",
    "lifecycle_status": "Lifecycle",
    "manual_override_reason": "Override reason",
    "manual_override_value": "Override value",
    "market": "Market",
    "match_strategy": "Matching strategy",
    "notes": "Notes",
    "offer_name": "Offer name",
    "offer_text": "Offer",
    "offer_type": "Offer type",
    "pending_withdrawal_amount": "Pending withdrawal",
    "promo_access": "Promotion access",
    "result": "Result",
    "stake_access": "Stake access",
    "status": "Status",
    "user_notes": "Notes",
}


def _json(value: Any) -> str:
    return json.dumps(value, default=str, separators=(",", ":"), sort_keys=True)


def _hash(value: Any) -> str:
    return hashlib.sha256(_json(value).encode("utf-8")).hexdigest()


def workbook_lineage_id(profile_id: str) -> str:
    digest = hashlib.sha256(
        f"{WORKBOOK_FAMILY}:{profile_id}".encode("utf-8")
    ).hexdigest()[:32]
    return f"workbook-lineage-{digest}"


def source_version_id(profile_id: str, workbook_checksum: str) -> str:
    digest = hashlib.sha256(
        f"{workbook_lineage_id(profile_id)}:{workbook_checksum}".encode("utf-8")
    ).hexdigest()[:32]
    return f"workbook-version-{digest}"


def _lineage_runs(connection: Any, profile_id: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in connection.execute(
            """
            SELECT import_run_id, source_filename, workbook_checksum, effective_at,
                   mapping_version, status, completed_at, created_at, updated_at
            FROM profile_import_runs
            WHERE profile_id = ?
            ORDER BY CASE WHEN completed_at = '' THEN updated_at ELSE completed_at END,
                     created_at, import_run_id
            """,
            (profile_id,),
        ).fetchall()
    ]


def build_lineage_metadata(
    connection: Any,
    *,
    profile_id: str,
    import_run_id: str,
    workbook_checksum: str,
    source_filename: str,
    effective_at: str,
    mapping_version: str,
) -> dict[str, Any]:
    runs = _lineage_runs(connection, profile_id)
    profile = connection.execute(
        "SELECT display_name FROM profiles WHERE profile_id = ?", (profile_id,)
    ).fetchone()
    profile_name = str(profile["display_name"] if profile is not None else profile_id)
    completed = [
        row
        for row in runs
        if row["import_run_id"] != import_run_id
        and row["status"] == "COMPLETE"
        and row["completed_at"]
    ]
    predecessor = completed[-1] if completed else None
    baseline = completed[0] if completed else None
    return {
        "schema_version": LINEAGE_SCHEMA_VERSION,
        "lineage_id": workbook_lineage_id(profile_id),
        "source_name": f"{profile_name} matched-betting workbook",
        "source_type": "workbook",
        "profile_id": profile_id,
        "workbook_family": WORKBOOK_FAMILY,
        "baseline_import_run_id": str((baseline or {}).get("import_run_id") or import_run_id),
        "baseline_version_id": source_version_id(
            profile_id,
            str((baseline or {}).get("workbook_checksum") or workbook_checksum),
        ),
        "source_version": {
            "version_id": source_version_id(profile_id, workbook_checksum),
            "sha256": workbook_checksum,
            "filename": source_filename,
            "observed_at": datetime.now(UTC).isoformat(),
            "effective_at": effective_at,
            "mapping_version": mapping_version,
            "predecessor_import_run_id": str((predecessor or {}).get("import_run_id") or ""),
            "predecessor_version_id": (
                source_version_id(profile_id, str(predecessor["workbook_checksum"]))
                if predecessor
                else ""
            ),
            "import_execution_id": "",
        },
    }


def _normalise(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, bool):
        return value
    if isinstance(value, (dict, list)):
        return json.loads(_json(value))
    text = str(value).strip()
    if not text:
        return ""
    if text[:1] in {"{", "["}:
        try:
            parsed = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return text
        return json.loads(_json(parsed))
    try:
        decimal = Decimal(text)
    except (InvalidOperation, ValueError):
        return text
    if any(character.isdigit() for character in text):
        return format(decimal.normalize(), "f")
    return text


def _snapshot(values: dict[str, Any], fields: set[str]) -> dict[str, Any]:
    return {field: _normalise(values.get(field)) for field in sorted(fields)}


def _field_differences(
    previous: dict[str, Any], current: dict[str, Any], incoming: dict[str, Any]
) -> list[dict[str, Any]]:
    differences: list[dict[str, Any]] = []
    for field in sorted(set(previous) | set(current) | set(incoming)):
        prior = _normalise(previous.get(field))
        local = _normalise(current.get(field))
        source = _normalise(incoming.get(field))
        if prior == local == source:
            continue
        source_changed = source != prior
        pd_changed = local != prior
        classification = (
            "BOTH_CHANGED_IDENTICALLY"
            if source_changed and pd_changed and source == local
            else "BOTH_CHANGED_DIFFERENTLY"
            if source_changed and pd_changed
            else "WORKBOOK_ONLY"
            if source_changed
            else "PLUM_DUFF_ONLY"
        )
        differences.append(
            {
                "field": field,
                "label": FIELD_LABELS.get(field, field.replace("_", " ").title()),
                "previous_source": prior,
                "current_plum_duff": local,
                "new_source": source,
                "classification": classification,
                "financial": field in FINANCIAL_FIELDS,
            }
        )
    return differences


def _is_settled(entity_type: str, values: dict[str, Any]) -> bool:
    status = str(values.get("status") or "").strip().casefold()
    if entity_type == "cash_adjustment":
        return True
    return status in {"settled", "complete", "completed", "closed", "released"}


def _source_identity(row: dict[str, Any], ledger: str) -> tuple[str, str, str]:
    sheets = {
        "accounts": "Accounts",
        "sportsbook": "Sportsbook Bets",
        "free_bets": "Free Bets",
        "casino": "Casino Offers",
        "cash_adjustments": "Cash Adjustments",
    }
    parsed = workbook_source_key(str(row["import_key"]))
    sheet = parsed[0] if parsed else sheets[ledger]
    external_id = str(row.get("source_record_id") or (parsed[1] if parsed else row["import_key"]))
    return logical_source_namespace(sheet), external_id, parsed[2] if parsed else ""


def _entity_spec(ledger: str, *, extra_place: bool = False) -> tuple[str, str, str]:
    if ledger == "accounts":
        return "accounts", "accounts", "account_id"
    if extra_place:
        return "extra_place", "each_way_extra_places", "each_way_extra_place_id"
    return {
        "sportsbook": ("sportsbook_bet", "sportsbook_bets", "sportsbook_bet_id"),
        "free_bets": ("free_bet", "free_bets", "free_bet_id"),
        "casino": ("casino_offer", "casino_offers", "casino_offer_id"),
        "cash_adjustments": (
            "cash_adjustment",
            "cash_adjustments",
            "cash_adjustment_id",
        ),
    }[ledger]


def _source_payload(
    connection: Any, *, profile_id: str, ledger: str, row: dict[str, Any]
) -> tuple[dict[str, Any], str, str]:
    # Import lazily to keep the comparison contract independent of router import order.
    from openforge_api.profile_workbook_cutover import (
        ACCOUNT_WRITE_COLUMNS,
        HISTORICAL_EP_SOURCE_FIELDS,
        LEDGER_COLUMNS,
        _apply_decision,
        _apply_formal_report_date,
        _catalogue_records,
        _preserve_unresolved_open_value,
        _reviewed_account_state,
    )

    if row.get("action") == "exclude_non_transactional":
        return {}, "", "non_transactional_source_row"
    if row.get("errors"):
        return {}, "", "source_mapping_requires_review"
    if ledger == "accounts":
        try:
            payload = _reviewed_account_state(row, {}, _catalogue_records())
        except (KeyError, TypeError, ValueError) as error:
            return {}, "", str(error)
        if payload is None:
            return {}, "", "source_account_is_deferred"
        fields = set(ACCOUNT_WRITE_COLUMNS)
        return _snapshot(payload, fields), "accounts", ""
    is_extra_place = bool(
        ledger == "sportsbook" and row.get("automatic_historical_extra_place")
    )
    if is_extra_place:
        source = row.get("source_fields") or {}
        source_pnl = str(row.get("imported_current_pnl") or row.get("source_pnl") or "")
        status = (
            "Placed"
            if str(row.get("status", "")).casefold() in {"placed", "pending", "active"}
            else "Settled"
        )
        payload = {
            "placed_at": str(
                source.get("DatePlaced")
                or source.get("Date")
                or row.get("formal_report_date")
                or ""
            ),
            "runner": str(source.get("Selection") or source.get("Runner") or ""),
            "race": str(source.get("Event") or source.get("Fixture") or ""),
            "bookmaker": str(source.get("Bookmaker") or ""),
            "bookmaker_account": str(source.get("Bookmaker") or ""),
            "mode": "Extra Place",
            "each_way_stake": str(source.get("BackStake") or source.get("Stake") or ""),
            "back_odds": str(source.get("BackOdds") or ""),
            "place_term_numerator": "",
            "place_term_denominator": "",
            "bookmaker_places": "",
            "exchange_places": "",
            "win_exchange": str(source.get("Exchange") or ""),
            "win_lay_odds": str(source.get("LayOdds1") or ""),
            "win_commission": "",
            "actual_win_lay_stake": str(source.get("LayActual") or ""),
            "place_exchange": "",
            "place_lay_odds": "",
            "place_commission": "",
            "actual_place_lay_stake": "",
            "status": status,
            "result": "Pending" if status == "Placed" else "Unplaced",
            "finishing_position": "",
            "imported_historical_pnl": source_pnl,
            "calculation_provenance": "imported_historical",
        }
        fields = set(payload) | set(HISTORICAL_EP_SOURCE_FIELDS & set(source))
        return _snapshot(payload, fields), "extra_place", ""
    payload = {
        key: value
        for key, value in dict(row.get("mapped_payload") or {}).items()
        if key in LEDGER_COLUMNS[ledger]
    }
    payload = _apply_decision(payload, row, None)
    payload = _apply_formal_report_date(payload, row, ledger)
    payload = _preserve_unresolved_open_value(
        connection, {"profile_id": profile_id, **payload}, row
    )
    payload.pop("profile_id", None)
    return _snapshot(payload, set(LEDGER_COLUMNS[ledger])), _entity_spec(ledger)[0], ""


def _completed_history(
    connection: Any, profile_id: str, current_run_id: str
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT audit.*, run.completed_at, run.created_at, run.workbook_checksum,
               run.source_filename, run.mapping_version
        FROM profile_import_write_audit AS audit
        JOIN profile_import_runs AS run ON run.import_run_id = audit.import_run_id
        WHERE audit.profile_id = ? AND audit.rolled_back_at = ''
          AND audit.import_run_id <> ? AND run.status = 'COMPLETE'
        ORDER BY run.completed_at DESC, run.created_at DESC, audit.created_at DESC
        """,
        (profile_id, current_run_id),
    ).fetchall()
    return [dict(row) for row in rows]


def _history_by_identity(
    connection: Any, profile_id: str, current_run_id: str
) -> dict[tuple[str, str], dict[str, Any]]:
    history: dict[tuple[str, str], dict[str, Any]] = {}
    for row in _completed_history(connection, profile_id, current_run_id):
        parsed = workbook_source_key(str(row["import_key"]))
        if not parsed:
            continue
        identity = (logical_source_namespace(parsed[0]), parsed[1])
        history.setdefault(identity, row)
    return history


def _previous_source_identities(
    connection: Any, predecessor_import_run_id: str
) -> dict[tuple[str, str], dict[str, Any]]:
    if not predecessor_import_run_id:
        return {}
    row = connection.execute(
        "SELECT plan_json FROM profile_import_write_plans WHERE import_run_id = ?",
        (predecessor_import_run_id,),
    ).fetchone()
    if row is None:
        return {}
    plan = json.loads(str(row["plan_json"]))
    identities: dict[tuple[str, str], dict[str, Any]] = {}
    for ledger, rows in [("accounts", plan.get("accounts", [])), *plan.get("ledgers", {}).items()]:
        for source in rows:
            namespace, external_id, source_hash = _source_identity(source, ledger)
            identities[(namespace, external_id)] = {
                "ledger": ledger,
                "source_row": source.get("source_row"),
                "source_record_id": external_id,
                "source_hash": source_hash,
                "import_key": source.get("import_key"),
                "source_values": dict(
                    (source.get("incremental") or {}).get("incoming_values") or {}
                ),
            }
    return identities


def _current_record(
    connection: Any, profile_id: str, entity_type: str, entity_id: str
) -> dict[str, Any] | None:
    _entity, table, id_column = (
        _entity_spec("accounts")
        if entity_type == "accounts"
        else _entity_spec("sportsbook", extra_place=True)
        if entity_type == "extra_place"
        else next(
            spec
            for spec in (
                _entity_spec("sportsbook"),
                _entity_spec("free_bets"),
                _entity_spec("casino"),
                _entity_spec("cash_adjustments"),
            )
            if spec[0] == entity_type
        )
    )
    row = connection.execute(
        f"SELECT * FROM {table} WHERE profile_id = ? AND {id_column} = ?",
        (profile_id, entity_id),
    ).fetchone()
    return None if row is None else dict(row)


def _status_for_differences(
    *, entity_type: str, current: dict[str, Any], differences: list[dict[str, Any]]
) -> tuple[str, str, bool]:
    workbook_only = [item for item in differences if item["classification"] == "WORKBOOK_ONLY"]
    pd_only = [item for item in differences if item["classification"] == "PLUM_DUFF_ONLY"]
    divergent = [
        item for item in differences if item["classification"] == "BOTH_CHANGED_DIFFERENTLY"
    ]
    converged = [
        item for item in differences if item["classification"] == "BOTH_CHANGED_IDENTICALLY"
    ]
    if divergent:
        return "CONFLICT", "both_changed_differently", True
    if workbook_only and pd_only:
        return "CONFLICT", "independent_field_changes", True
    if workbook_only:
        settled_financial = _is_settled(entity_type, current) and any(
            item["financial"] for item in workbook_only
        )
        return (
            "CONFLICT" if settled_financial else "CHANGED",
            "settled_financial_change" if settled_financial else "workbook_only_change",
            settled_financial,
        )
    if pd_only:
        return "UNCHANGED", "plum_duff_only_change", False
    if converged:
        return "UNCHANGED", "both_changed_identically", False
    return "UNCHANGED", "same_canonical_values", False


def build_incremental_delta(
    connection: Any,
    *,
    profile_id: str,
    import_run_id: str,
    workbook_checksum: str,
    source_filename: str,
    effective_at: str,
    mapping_version: str,
    plan: dict[str, Any],
) -> dict[str, Any]:
    lineage = build_lineage_metadata(
        connection,
        profile_id=profile_id,
        import_run_id=import_run_id,
        workbook_checksum=workbook_checksum,
        source_filename=source_filename,
        effective_at=effective_at,
        mapping_version=mapping_version,
    )
    predecessor_id = str(lineage["source_version"]["predecessor_import_run_id"])
    history = _history_by_identity(connection, profile_id, import_run_id)
    previous_identities = _previous_source_identities(connection, predecessor_id)
    current_identities: set[tuple[str, str]] = set()
    rows: list[dict[str, Any]] = []

    source_groups = [
        ("accounts", plan.get("accounts", [])),
        *plan.get("ledgers", {}).items(),
    ]
    for ledger, sources in source_groups:
        for source in sources:
            namespace, external_id, source_hash = _source_identity(source, ledger)
            identity = (namespace, external_id)
            current_identities.add(identity)
            incoming, entity_type, unsupported_reason = _source_payload(
                connection, profile_id=profile_id, ledger=ledger, row=source
            )
            base = history.get(identity)
            delta: dict[str, Any] = {
                "status": "NEW",
                "comparison": "new_business_identity",
                "write_action": "create",
                "requires_review": False,
                "source_namespace": namespace,
                "source_record_id": external_id,
                "source_hash": source_hash,
                "source_row": source.get("source_row"),
                "ledger": ledger,
                "entity_type": entity_type,
                "entity_id": "",
                "field_differences": [],
                "incoming_values": incoming,
                "reason": "",
            }
            if unsupported_reason:
                delta.update(
                    status="UNSUPPORTED",
                    comparison="unsupported_or_ambiguous",
                    write_action="none",
                    requires_review=unsupported_reason
                    not in {
                        "non_transactional_source_row",
                        "source_mapping_requires_review",
                    },
                    reason=unsupported_reason,
                )
            elif base is not None:
                base_entity_type = str(base["entity_type"])
                entity_id = str(base["entity_id"])
                delta["entity_id"] = entity_id
                if base_entity_type != entity_type:
                    delta.update(
                        status="CONFLICT",
                        comparison="destination_type_changed",
                        write_action="none",
                        requires_review=True,
                        reason="The source identity previously mapped to a different ledger type.",
                    )
                else:
                    current = _current_record(
                        connection, profile_id, entity_type, entity_id
                    )
                    if current is None:
                        delta.update(
                            status="CONFLICT",
                            comparison="plum_duff_record_missing",
                            write_action="none",
                            requires_review=True,
                            reason="The previously imported Plum Duff record is no longer present.",
                        )
                    else:
                        predecessor = previous_identities.get(identity) or {}
                        previous = dict(predecessor.get("source_values") or {}) or json.loads(
                            str(base["after_json"]) or "{}"
                        )
                        fields = set(incoming)
                        previous_snapshot = _snapshot(previous, fields)
                        current_snapshot = _snapshot(current, fields)
                        differences = _field_differences(
                            previous_snapshot, current_snapshot, incoming
                        )
                        status, comparison, requires_review = _status_for_differences(
                            entity_type=entity_type,
                            current=current_snapshot,
                            differences=differences,
                        )
                        delta.update(
                            status=status,
                            comparison=comparison,
                            write_action="update" if status == "CHANGED" else "none",
                            requires_review=requires_review,
                            field_differences=differences,
                        )
            source["incremental"] = delta
            rows.append({"import_key": source.get("import_key"), **delta})

    for identity, previous in sorted(previous_identities.items()):
        if identity in current_identities:
            continue
        history_row = history.get(identity)
        rows.append(
            {
                "import_key": previous.get("import_key"),
                "status": "SOURCE_MISSING",
                "comparison": "missing_from_latest_source",
                "write_action": "none",
                "requires_review": False,
                "source_namespace": identity[0],
                "source_record_id": identity[1],
                "source_hash": previous.get("source_hash", ""),
                "source_row": previous.get("source_row"),
                "ledger": previous.get("ledger", ""),
                "entity_type": str((history_row or {}).get("entity_type") or ""),
                "entity_id": str((history_row or {}).get("entity_id") or ""),
                "field_differences": [],
                "incoming_values": {},
                "reason": (
                    "The record is absent from the latest workbook; "
                    "Plum Duff will retain it."
                ),
            }
        )

    counts = Counter(row["status"] for row in rows)
    for status in DELTA_STATUSES:
        counts.setdefault(status, 0)
    comparison_counts = Counter(row["comparison"] for row in rows)
    is_initial = not predecessor_id
    if not is_initial:
        # Profile settings are onboarding/source context. A later source version must not
        # silently replace local settings; a future explicit settings reconciliation can do so.
        for item in plan.get("profile_settings", []):
            item["classification"] = "PRESERVE_TARGET"
    delta = {
        "schema_version": DELTA_SCHEMA_VERSION,
        "lineage": lineage,
        "mode": "INITIAL" if is_initial else "INCREMENTAL",
        "counts": dict(counts),
        "comparison_counts": dict(comparison_counts),
        "attention_count": sum(
            counts[status] for status in ("NEW", "CHANGED", "CONFLICT", "UNSUPPORTED")
        ),
        "protected_local_change_count": comparison_counts["plum_duff_only_change"],
        "rows": rows,
        "fingerprint": "",
    }
    delta["fingerprint"] = _hash(
        {key: value for key, value in delta.items() if key != "fingerprint"}
    )
    plan["lineage"] = lineage
    plan["incremental_delta"] = {
        key: value for key, value in delta.items() if key != "rows"
    }
    plan["schema_version"] = "profile-workbook-write-plan-v2"
    return delta


def build_incremental_review_items(
    *, workbook_checksum: str, delta: dict[str, Any]
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in delta.get("rows", []):
        if not row.get("requires_review"):
            continue
        fingerprint = _hash(
            {
                "identity": [row.get("source_namespace"), row.get("source_record_id")],
                "comparison": row.get("comparison"),
                "fields": row.get("field_differences", []),
            }
        )
        item_id = "review-" + hashlib.sha256(
            f"{workbook_checksum}:{row.get('import_key')}:{fingerprint}".encode("utf-8")
        ).hexdigest()[:32]
        financial = any(item.get("financial") for item in row.get("field_differences", []))
        items.append(
            {
                "item_id": item_id,
                "import_id": str(row.get("import_key") or ""),
                "source_fingerprint": fingerprint,
                "source_sheet": str(row.get("source_namespace") or "source")
                .replace("_", " ")
                .title(),
                "source_row": int(row.get("source_row") or 0),
                "source_record_id": str(row.get("source_record_id") or ""),
                "category": "incremental_conflict",
                "issue_type": (
                    "settled_financial_change"
                    if row.get("comparison") == "settled_financial_change"
                    else "incremental_conflict"
                ),
                "issue_types": [
                    "settled_financial_change" if financial else "incremental_conflict"
                ],
                "reason": str(
                    row.get("reason")
                    or "This record cannot be updated safely without review."
                ),
                "missing_fields": [],
                "proposed_target": "Apply the reviewed workbook change",
                "confidence": "review_required",
                "context": {
                    "date": "",
                    "provider": "",
                    "offer_type": "",
                    "offer_name": "",
                    "event": str(row.get("source_record_id") or ""),
                    "stake": "",
                    "odds": "",
                    "exchange": "",
                    "lay_type": "",
                    "lay_odds": "",
                    "lay_stake": "",
                    "pnl": "",
                    "status": str(row.get("status") or ""),
                    "result": "",
                    "bet_type": str(row.get("ledger") or ""),
                    "notes": "",
                },
                "source_fields": {
                    item["label"]: item.get("new_source")
                    for item in row.get("field_differences", [])
                },
                "calculation_provenance": "incremental_workbook_review",
                "incremental": row,
            }
        )
    return items


def accepted_incremental_update(
    row: dict[str, Any], decisions: dict[str, dict[str, Any]]
) -> bool:
    incremental = row.get("incremental") or {}
    status = str(incremental.get("status") or "NEW")
    if status == "CHANGED":
        return True
    if status != "CONFLICT":
        return False
    return any(
        str(item.get("import_id")) == str(row.get("import_key"))
        and str((item.get("decision") or {}).get("action")) == "accept_proposed"
        and item.get("review_status") in {"REVIEWED_ACCEPTED", "REVIEWED_OVERRIDDEN"}
        for item in decisions.values()
    )
