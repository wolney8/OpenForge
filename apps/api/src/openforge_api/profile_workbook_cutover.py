from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    calculate_free_bet_current_value,
)
from openforge_api.cash_adjustments import build_response as build_cash_response
from openforge_api.casino_offers import build_response as build_casino_response
from openforge_api.db import (
    CashAdjustmentRecord,
    CasinoOfferRecord,
    EachWayExtraPlaceRecord,
    FreeBetRecord,
    ProfileTrackerSettingsRecord,
    SportsbookBetRecord,
    connect,
)
from openforge_api.each_way_extra_places import build_response as build_extra_place_response
from openforge_api.sportsbook import build_response as build_sportsbook_response

PROFILE_TABLES = (
    "profiles",
    "profile_onboarding_settings",
    "profile_tracker_settings",
    "profile_exchange_commissions",
    "accounts",
    "sportsbook_bets",
    "free_bets",
    "casino_offers",
    "cash_adjustments",
    "each_way_extra_places",
)

PROFILE_TABLE_ORDER = {
    "profiles": "profile_id",
    "profile_onboarding_settings": "profile_id",
    "profile_tracker_settings": "profile_id",
    "profile_exchange_commissions": "exchange_name",
    "accounts": "account_id",
    "sportsbook_bets": "sportsbook_bet_id",
    "free_bets": "free_bet_id",
    "casino_offers": "casino_offer_id",
    "cash_adjustments": "cash_adjustment_id",
    "each_way_extra_places": "each_way_extra_place_id",
}

LEDGER_CONFIG = {
    "sportsbook": ("sportsbook_bets", "sportsbook_bet_id", "sportsbook_bet"),
    "free_bets": ("free_bets", "free_bet_id", "free_bet"),
    "casino": ("casino_offers", "casino_offer_id", "casino_offer"),
    "cash_adjustments": (
        "cash_adjustments",
        "cash_adjustment_id",
        "cash_adjustment",
    ),
}

ENTITY_TABLES = {
    "sportsbook_bet": ("sportsbook_bets", "sportsbook_bet_id"),
    "free_bet": ("free_bets", "free_bet_id"),
    "casino_offer": ("casino_offers", "casino_offer_id"),
    "cash_adjustment": ("cash_adjustments", "cash_adjustment_id"),
    "extra_place": ("each_way_extra_places", "each_way_extra_place_id"),
    "accounts": ("accounts", "account_id"),
}

LEDGER_COLUMNS = {
    "sportsbook": {
        "event_name",
        "offer_text",
        "bookmaker",
        "offer_type",
        "bet_type",
        "offer_name",
        "fixture_type",
        "market",
        "status",
        "result",
        "back_stake",
        "back_odds",
        "bonus_trigger",
        "maximum_bonus",
        "bonus_retention_rate",
        "match_strategy",
        "lay_odds_1",
        "multi_lay_outcome_1_name",
        "multi_lay_outcomes_json",
        "lay_actual",
        "lay_matched_stake_1",
        "lay_commission_1",
        "exchange_name",
        "date_settled",
        "user_notes",
        "manual_override_value",
        "manual_override_reason",
    },
    "free_bets": {
        "event_name",
        "offer_text",
        "bookmaker",
        "offer_type",
        "bet_type",
        "offer_name",
        "fixture_type",
        "status",
        "result",
        "retention_mode",
        "free_bet_value",
        "back_odds",
        "match_strategy",
        "lay_odds_1",
        "lay_actual",
        "lay_matched_stake_1",
        "lay_commission_1",
        "exchange_name",
        "expiry_datetime",
        "date_settled",
        "origin_qual_bet_id",
        "offer_group_id",
        "user_notes",
        "manual_override_value",
        "manual_override_reason",
    },
    "casino": {
        "offer_group_id",
        "date_started",
        "date_settling",
        "expiry_datetime",
        "bookmaker",
        "offer_type",
        "offer_name",
        "game",
        "cash_stake",
        "credit_amount",
        "bonus_amount",
        "wager_multiplier",
        "wager_target",
        "required_spins",
        "spin_stake",
        "free_spins_awarded",
        "free_spins_value",
        "status",
        "result",
        "calc_net_pnl",
        "final_net_pnl",
        "user_notes",
    },
    "cash_adjustments": {
        "adjustment_date",
        "direction",
        "amount",
        "adjustment_type",
        "affects_investment",
        "affects_cash_snapshot",
        "linked_account",
        "description",
    },
}

HISTORICAL_EP_SOURCE_FIELDS = {
    "DatePlaced",
    "Date",
    "Selection",
    "Runner",
    "Event",
    "Fixture",
    "Bookmaker",
    "BackStake",
    "Stake",
    "BackOdds",
    "Exchange",
    "LayOdds1",
    "LayActual",
}


class ImportCutoverError(ValueError):
    pass


def _json(value: Any) -> str:
    return json.dumps(value, default=str, separators=(",", ":"), sort_keys=True)


def _checksum(value: Any) -> str:
    return hashlib.sha256(_json(value).encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _entity_id(prefix: str, profile_id: str, import_key: str) -> str:
    digest = hashlib.sha256(f"{profile_id}:{import_key}".encode()).hexdigest()[:24].upper()
    return f"{prefix}-{digest}"


def build_base_write_plan(result: dict[str, Any]) -> dict[str, Any]:
    """Persist canonical mapped rows, never raw workbook bytes."""
    account_rows = [
        {
            key: row.get(key)
            for key in (
                "source_row",
                "import_key",
                "catalogue_id",
                "canonical_brand",
                "account_type",
                "mapped_profile_state",
            )
        }
        for row in result["accounts"].get("validation_rows", [])
    ]
    ledger_rows: dict[str, list[dict[str, Any]]] = {}
    for ledger, report in result["ledgers"].items():
        ledger_rows[ledger] = []
        for row in report.get("validation_rows", []):
            source = row.get("source_fields") or {}
            normalizations = list(row.get("normalizations") or [])
            provenance_fields = {
                str(item.get("source_field"))
                for item in normalizations
                if item.get("source_preserved") and item.get("source_field")
            }
            ledger_rows[ledger].append(
                {
                    key: row.get(key)
                    for key in (
                        "source_row",
                        "source_record_id",
                        "import_key",
                        "action",
                        "migration_state",
                        "errors",
                        "normalizations",
                        "mapped_payload",
                        "status",
                        "source_pnl",
                        "imported_current_pnl",
                        "current_worst_case_pnl",
                        "realised_pnl",
                        "formal_report_date",
                    )
                }
                | {
                    "source_fields": {
                        key: source[key]
                        for key in HISTORICAL_EP_SOURCE_FIELDS | provenance_fields
                        if key in source
                    }
                }
            )
    return {
        "schema_version": "profile-workbook-write-plan-v1",
        "profile_settings": [
            {key: row.get(key) for key in ("setting", "parsed_value", "target", "classification")}
            for row in result["profile_settings"]
        ],
        "accounts": account_rows,
        "ledgers": ledger_rows,
        "created_at": _now(),
    }


def save_base_write_plan(
    connection: Any, *, import_run_id: str, profile_id: str, plan: dict[str, Any]
) -> str:
    encoded = _json(plan)
    checksum = hashlib.sha256(encoded.encode()).hexdigest()
    now = _now()
    connection.execute(
        """
        INSERT INTO profile_import_write_plans (
          import_run_id, profile_id, plan_json, plan_checksum, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(import_run_id) DO UPDATE SET
          plan_json = excluded.plan_json,
          plan_checksum = excluded.plan_checksum,
          updated_at = excluded.updated_at
        """,
        (import_run_id, profile_id, encoded, checksum, now, now),
    )
    return checksum


def load_base_write_plan(profile_id: str, import_run_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT plan_json, plan_checksum FROM profile_import_write_plans
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (profile_id, import_run_id),
        ).fetchone()
    if row is None:
        return None
    plan = json.loads(row["plan_json"])
    if _checksum(plan) != row["plan_checksum"]:
        raise ImportCutoverError("Persisted import plan failed integrity verification")
    return plan


def _decision_map(workspace: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(item["item_id"]): item
        for item in workspace["items"]
        if item.get("decision") is not None
    }


def _decision_for(
    decisions: dict[str, dict[str, Any]],
    import_id: str,
    *,
    category: str | None = None,
) -> dict[str, Any] | None:
    for item in decisions.values():
        if str(item["import_id"]) != import_id:
            continue
        if category is None or item["category"] == category:
            return item
    return None


def _resolved_provider(item: dict[str, Any] | None) -> str:
    if not item:
        return ""
    decision = item.get("decision") or {}
    return str(decision.get("catalogue_id") or "")


def _decision_resolution(item: dict[str, Any]) -> dict[str, Any]:
    decision = item.get("decision") or {}
    return {
        "source_sheet": item["source_sheet"],
        "source_row": item["source_row"],
        "category": item["category"],
        "action": decision.get("action", ""),
        "status": item["review_status"],
        "target": decision.get("target_type") or item.get("proposed_target", ""),
        "catalogue_id": decision.get("catalogue_id", ""),
        "note": decision.get("note", ""),
    }


def final_import_summary(
    *, run: dict[str, Any], workspace: dict[str, Any], plan: dict[str, Any] | None
) -> dict[str, Any]:
    decision_items = [item for item in workspace["items"] if item.get("decision")]
    blocking = [
        item for item in workspace["items"] if item["review_status"] in {"UNREVIEWED", "BLOCKED"}
    ]
    provider_items = [item for item in workspace["items"] if item["category"] == "missing_provider"]
    importable_provider_blockers = [
        item
        for item in provider_items
        if item["review_status"] not in {"EXCLUDED", "DEFERRED"} and not _resolved_provider(item)
    ]
    account_changes = run["summary"].get("accounts", {}).get("change_reconciliation", {})
    ledger_summaries = run["summary"].get("ledgers", {})
    financial = run.get("reconciliation", {})
    decisions = _decision_map(workspace)
    planned_ledger_counts: Counter[str] = Counter()
    if plan is not None:
        for ledger, rows in plan["ledgers"].items():
            for row in rows:
                import_key = str(row["import_key"])
                item = next(
                    (
                        candidate
                        for candidate in decisions.values()
                        if str(candidate["import_id"]) == import_key
                        and candidate["category"] != "historical_extra_place"
                    ),
                    None,
                )
                if row["action"] == "exclude_non_transactional" or (
                    item and item["review_status"] in {"EXCLUDED", "DEFERRED"}
                ):
                    continue
                ep_item = _decision_for(decisions, import_key, category="historical_extra_place")
                if ep_item and ep_item["review_status"] in {"EXCLUDED", "DEFERRED"}:
                    continue
                if (
                    ledger == "sportsbook"
                    and (ep_item or {}).get("decision", {}).get("action")
                    == "historical_extra_place"
                ):
                    planned_ledger_counts["extra_places"] += 1
                else:
                    planned_ledger_counts[ledger] += 1
    with connect() as connection:
        profile = connection.execute(
            "SELECT profile_id, display_name FROM profiles WHERE profile_id = ?",
            (run["profile_id"],),
        ).fetchone()
    return {
        "ready": not blocking and not importable_provider_blockers and plan is not None,
        "plan_available": plan is not None,
        "blockers": [
            *[
                f"{item['source_sheet']} row {item['source_row']} requires a decision"
                for item in blocking
            ],
            *[
                f"{item['source_sheet']} row {item['source_row']} requires a global provider"
                for item in importable_provider_blockers
            ],
            *(
                []
                if plan is not None
                else ["Re-analyse this workbook to create its server write plan"]
            ),
        ],
        "profile": {
            "profile_id": run["profile_id"],
            "profile_name": profile["display_name"] if profile else run["profile_id"],
        },
        "review_resolutions": [_decision_resolution(item) for item in decision_items],
        "provider_resolutions": [_decision_resolution(item) for item in provider_items],
        "historical_ep_resolutions": [
            _decision_resolution(item)
            for item in workspace["items"]
            if item["category"] == "historical_extra_place"
        ],
        "profile_settings": [
            {
                "field": row.get("setting"),
                "value": row.get("parsed_value"),
                "target": row.get("target"),
            }
            for row in run["summary"].get("profile_settings", [])
            if row.get("classification") == "IMPORT"
        ],
        "accounts": {
            "total_source": run["summary"].get("accounts", {}).get("row_count", 0),
            **account_changes.get("counts", {}),
            "absent_strategy": account_changes.get("default_absent_strategy", "leave_unchanged"),
            "archived_or_deactivated": sum(
                row.get("planned_action") in {"archive", "deactivate"}
                for row in account_changes.get("existing_absent_from_workbook", [])
            ),
            "unresolved_providers": len(importable_provider_blockers),
        },
        "ledgers": {
            key: {
                "source_rows": value.get("source_rows", 0),
                "transactional_rows": planned_ledger_counts[key],
                "non_transactional": value.get("non_transactional", 0),
                "historical_or_partial": value.get("partial", 0),
                "open": value.get("open", 0),
                "settled": value.get("settled", 0),
                "future_settling_open": value.get("future_settling_open", 0),
            }
            for key, value in ledger_summaries.items()
        }
        | {
            "extra_places": {
                "source_rows": run["summary"].get("extra_places", {}).get("row_count", 0),
                "transactional_rows": planned_ledger_counts["extra_places"],
                "non_transactional": 0,
                "historical_or_partial": planned_ledger_counts["extra_places"],
                "open": 0,
                "settled": 0,
                "future_settling_open": 0,
            }
        },
        "extra_places": run["summary"].get("extra_places", {}),
        "financial": {
            "periods": financial,
            "review_pnl_impact": workspace["reconciliation"]["pnl_impact"],
            "open_current_pnl": sum(
                Decimal(str(value.get("open_current_worst_case_pnl", "0") or "0"))
                for value in ledger_summaries.values()
            ),
            "settled_pnl": sum(
                Decimal(str(value.get("realised_settled_pnl", "0") or "0"))
                for value in ledger_summaries.values()
            ),
            "open_exposure": sum(
                Decimal(str(value.get("open_exposure", "0") or "0"))
                for value in ledger_summaries.values()
            ),
        },
        "rollback": {
            "application_checkpoint": True,
            "neon_platform_restore": "manual_plan_dependent_backstop",
        },
    }


def _profile_snapshot(connection: Any, profile_id: str) -> dict[str, list[dict[str, Any]]]:
    snapshot: dict[str, list[dict[str, Any]]] = {}
    for table in PROFILE_TABLES:
        rows = connection.execute(
            f"SELECT * FROM {table} WHERE profile_id = ? ORDER BY {PROFILE_TABLE_ORDER[table]}",
            (profile_id,),
        ).fetchall()
        snapshot[table] = [dict(row) for row in rows]
    return snapshot


def _insert_row(connection: Any, table: str, row: dict[str, Any]) -> None:
    columns = tuple(row)
    placeholders = ",".join("?" for _ in columns)
    connection.execute(
        f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})",
        tuple(row[column] for column in columns),
    )


def create_checkpoint(
    *, profile_id: str, import_run_id: str, run: dict[str, Any]
) -> dict[str, Any]:
    checkpoint_id = f"import-checkpoint-{uuid4().hex}"
    with connect() as connection:
        existing = connection.execute(
            "SELECT * FROM profile_import_checkpoints WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
        if existing is not None:
            return dict(existing)
        snapshot = _profile_snapshot(connection, profile_id)
        encoded = _json(snapshot)
        checksum = hashlib.sha256(encoded.encode()).hexdigest()
        now = _now()
        connection.execute(
            """
            INSERT INTO profile_import_checkpoints (
              checkpoint_id, import_run_id, profile_id, workbook_checksum, mapping_version,
              snapshot_json, snapshot_checksum, status, created_at, restored_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, '')
            """,
            (
                checkpoint_id,
                import_run_id,
                profile_id,
                run["workbook_checksum"],
                run["mapping_version"],
                encoded,
                checksum,
                now,
            ),
        )
        connection.execute(
            "UPDATE profile_import_runs SET checkpoint_id = ?, updated_at = ? "
            "WHERE profile_id = ? AND import_run_id = ?",
            (checkpoint_id, now, profile_id, import_run_id),
        )
    return {
        "checkpoint_id": checkpoint_id,
        "snapshot_checksum": checksum,
        "created_at": now,
        "status": "AVAILABLE",
    }


def _audit_write(
    connection: Any,
    *,
    import_run_id: str,
    import_key: str,
    profile_id: str,
    entity_type: str,
    entity_id: str,
    operation: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
) -> None:
    connection.execute(
        """
        INSERT INTO profile_import_write_audit (
          import_run_id, import_key, profile_id, entity_type, entity_id, operation,
          before_json, after_json, created_at, rolled_back_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '')
        """,
        (
            import_run_id,
            import_key,
            profile_id,
            entity_type,
            entity_id,
            operation,
            _json(before or {}),
            _json(after or {}),
            _now(),
        ),
    )


def _apply_profile_settings(
    connection: Any, *, profile_id: str, import_run_id: str, settings: list[dict[str, Any]]
) -> int:
    count = 0
    for item in settings:
        parsed_value = item.get("parsed_value")
        if item.get("classification") != "IMPORT" or parsed_value is None or parsed_value == "":
            continue
        target = str(item["target"])
        table, field = target.split(".", 1)
        table_name = {
            "profile": "profiles",
            "tracker_settings": "profile_tracker_settings",
            "onboarding": "profile_onboarding_settings",
        }.get(table)
        if table_name is None:
            continue
        current = connection.execute(
            f"SELECT {field} FROM {table_name} WHERE profile_id = ?", (profile_id,)
        ).fetchone()
        if current is None or str(current[field]) == str(item["parsed_value"]):
            continue
        before = {field: current[field]}
        after = {field: item["parsed_value"]}
        connection.execute(
            f"UPDATE {table_name} SET {field} = ? WHERE profile_id = ?",
            (item["parsed_value"], profile_id),
        )
        _audit_write(
            connection,
            import_run_id=import_run_id,
            import_key=f"setting:{target}",
            profile_id=profile_id,
            entity_type=table_name,
            entity_id=profile_id,
            operation="update",
            before=before,
            after=after,
        )
        count += 1
    return count


def _catalogue_records() -> dict[str, Any]:
    return {record.catalogue_id: record for record in load_master_account_catalogue().records}


def _apply_accounts(
    connection: Any,
    *,
    profile_id: str,
    import_run_id: str,
    rows: list[dict[str, Any]],
    decisions: dict[str, dict[str, Any]],
    absent_strategy: str,
) -> dict[str, int]:
    catalogue = _catalogue_records()
    existing_rows = connection.execute(
        "SELECT * FROM accounts WHERE profile_id = ?", (profile_id,)
    ).fetchall()
    existing = [dict(row) for row in existing_rows]
    by_catalogue = {str(row.get("catalogue_id") or ""): row for row in existing}
    by_name_type = {
        (str(row["account"]).casefold(), str(row["type"]).casefold()): row for row in existing
    }
    matched: set[str] = set()
    counts = {"created": 0, "updated": 0, "unchanged": 0, "absent_changed": 0}
    for source in rows:
        item = _decision_for(decisions, str(source["import_key"]), category="missing_provider")
        if item and item["review_status"] in {"EXCLUDED", "DEFERRED"}:
            continue
        catalogue_id = str(source.get("catalogue_id") or _resolved_provider(item))
        provider = catalogue.get(catalogue_id)
        if provider is None:
            raise ImportCutoverError(f"Account row {source['source_row']} has no global provider")
        state = dict(source["mapped_profile_state"])
        state.update(
            {
                "catalogue_id": catalogue_id,
                "bookmaker_id": None,
                "account": provider.brand_name,
                "type": "Bookie" if provider.account_type == "Bookmaker" else provider.account_type,
                "group_name": provider.operator_group,
                "platform": provider.platform,
                "lifecycle_status": state.get("lifecycle_status") or "Active",
                "restrictions_json": state.get("restrictions_json") or "[]",
            }
        )
        current = by_catalogue.get(catalogue_id) or by_name_type.get(
            (
                provider.brand_name.casefold(),
                (
                    "Bookie" if provider.account_type == "Bookmaker" else provider.account_type
                ).casefold(),
            )
        )
        now = _now()
        if current is None:
            account_id = _entity_id("PA", profile_id, str(source["import_key"]))
            record = {
                "account_id": account_id,
                "profile_id": profile_id,
                **state,
                "created_at": now,
                "updated_at": now,
            }
            _insert_row(connection, "accounts", record)
            _audit_write(
                connection,
                import_run_id=import_run_id,
                import_key=str(source["import_key"]),
                profile_id=profile_id,
                entity_type="accounts",
                entity_id=account_id,
                operation="create",
                before=None,
                after=record,
            )
            counts["created"] += 1
            matched.add(account_id)
            continue
        account_id = str(current["account_id"])
        matched.add(account_id)
        changed = {
            key: value
            for key, value in state.items()
            if key in current
            and str(current[key] if current[key] is not None else "") != str(value)
        }
        if not changed:
            counts["unchanged"] += 1
            continue
        before = {key: current[key] for key in changed}
        assignments = ",".join(f"{key} = ?" for key in changed)
        connection.execute(
            f"UPDATE accounts SET {assignments}, updated_at = ? "
            "WHERE profile_id = ? AND account_id = ?",
            (*changed.values(), now, profile_id, account_id),
        )
        _audit_write(
            connection,
            import_run_id=import_run_id,
            import_key=str(source["import_key"]),
            profile_id=profile_id,
            entity_type="accounts",
            entity_id=account_id,
            operation="update",
            before=before,
            after=changed,
        )
        counts["updated"] += 1
    if absent_strategy in {"archive", "deactivate"}:
        for current in existing:
            if current["account_id"] in matched:
                continue
            value = "Archived" if absent_strategy == "archive" else "Inactive"
            field = "lifecycle_status" if absent_strategy == "archive" else "status"
            if current[field] == value:
                continue
            connection.execute(
                f"UPDATE accounts SET {field} = ?, updated_at = ? "
                "WHERE profile_id = ? AND account_id = ?",
                (value, _now(), profile_id, current["account_id"]),
            )
            _audit_write(
                connection,
                import_run_id=import_run_id,
                import_key=f"absent-account:{current['account_id']}",
                profile_id=profile_id,
                entity_type="accounts",
                entity_id=str(current["account_id"]),
                operation="update",
                before={field: current[field]},
                after={field: value},
            )
            counts["absent_changed"] += 1
    return counts


def _apply_decision(
    payload: dict[str, Any], row: dict[str, Any], item: dict[str, Any] | None
) -> dict[str, Any]:
    if not item or not item.get("decision"):
        return payload
    decision = item["decision"]
    overrides = decision.get("override_fields") or {}
    if overrides.get("offer_name"):
        payload["offer_name"] = overrides["offer_name"]
    if overrides.get("strategy"):
        payload["match_strategy"] = overrides["strategy"]
    if overrides.get("manual_override_reason"):
        payload["manual_override_reason"] = overrides["manual_override_reason"]
    if decision.get("action") in {
        "historical_imported_calculation",
        "historical_imported_behavior",
    }:
        source_pnl = str(row.get("imported_current_pnl") or row.get("source_pnl") or "")
        if "manual_override_value" in payload and source_pnl:
            payload["manual_override_value"] = source_pnl
            payload["manual_override_reason"] = str(
                decision.get("note") or "Historical workbook value retained during import"
            )[:1000]
    if decision.get("action") == "preserve_and_shorten":
        for field, value in tuple(payload.items()):
            if (
                isinstance(value, str)
                and len(value) > 200
                and field not in {"user_notes", "description"}
            ):
                payload[field] = value[:197] + "..."
    return payload


def _insert_ledger_rows(
    connection: Any,
    *,
    profile_id: str,
    import_run_id: str,
    plan: dict[str, Any],
    decisions: dict[str, dict[str, Any]],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    ep_decisions = {
        str(item["import_id"]): item
        for item in decisions.values()
        if item["category"] == "historical_extra_place" and item.get("decision")
    }
    for ledger, rows in plan["ledgers"].items():
        table, id_column, entity_type = LEDGER_CONFIG[ledger]
        prefix = {
            "sportsbook": "SB",
            "free_bets": "FB",
            "casino": "CO",
            "cash_adjustments": "CA",
        }[ledger]
        count = 0
        for row in rows:
            import_key = str(row["import_key"])
            item = next(
                (
                    candidate
                    for candidate in decisions.values()
                    if str(candidate["import_id"]) == import_key
                    and candidate["category"] != "historical_extra_place"
                ),
                None,
            )
            if row["action"] == "exclude_non_transactional":
                continue
            if item and item["review_status"] in {"EXCLUDED", "DEFERRED"}:
                continue
            ep_item = ep_decisions.get(import_key)
            if ep_item and ep_item["review_status"] in {"EXCLUDED", "DEFERRED"}:
                continue
            ep_action = str((ep_item or {}).get("decision", {}).get("action", ""))
            if ledger == "sportsbook" and ep_action == "historical_extra_place":
                source = row.get("source_fields") or {}
                source_pnl = str(row.get("imported_current_pnl") or row.get("source_pnl") or "")
                entity_id = _entity_id("EP", profile_id, import_key)
                status = (
                    "Placed"
                    if str(row.get("status", "")).casefold() in {"placed", "pending", "active"}
                    else "Settled"
                )
                now = _now()
                record = {
                    "each_way_extra_place_id": entity_id,
                    "profile_id": profile_id,
                    "placed_at": str(source.get("DatePlaced") or source.get("Date") or ""),
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
                    "import_run_id": import_run_id,
                    "source_import_id": import_key,
                    "user_notes": (
                        "Historical Extra Place imported from Sportsbook Bets; "
                        f"source row {row['source_row']}. Missing modern fields were not inferred."
                    ),
                    "created_at": now,
                    "updated_at": now,
                }
                _insert_row(connection, "each_way_extra_places", record)
                _audit_write(
                    connection,
                    import_run_id=import_run_id,
                    import_key=import_key,
                    profile_id=profile_id,
                    entity_type="extra_place",
                    entity_id=entity_id,
                    operation="create",
                    before=None,
                    after={
                        **record,
                        "expected_reporting_value": source_pnl,
                        "formal_report_date": row.get("formal_report_date", ""),
                    },
                )
                counts["extra_places"] = counts.get("extra_places", 0) + 1
                continue
            entity_id = _entity_id(prefix, profile_id, import_key)
            duplicate = connection.execute(
                f"SELECT 1 FROM {table} WHERE {id_column} = ?", (entity_id,)
            ).fetchone()
            if duplicate is not None:
                raise ImportCutoverError("This workbook row already exists in the target Profile")
            payload = {
                key: value
                for key, value in dict(row.get("mapped_payload") or {}).items()
                if key in LEDGER_COLUMNS[ledger]
            }
            payload = _apply_decision(payload, row, item)
            now = _now()
            record = {
                id_column: entity_id,
                "profile_id": profile_id,
                **payload,
                "created_at": now,
                "updated_at": now,
            }
            _insert_row(connection, table, record)
            _audit_write(
                connection,
                import_run_id=import_run_id,
                import_key=import_key,
                profile_id=profile_id,
                entity_type=entity_type,
                entity_id=entity_id,
                operation="create",
                before=None,
                after={
                    **record,
                    "expected_reporting_value": row.get("imported_current_pnl", ""),
                    "formal_report_date": row.get("formal_report_date", ""),
                },
            )
            count += 1
        counts[ledger] = count
    return counts


def _profile_state_checksum(connection: Any, profile_id: str) -> str:
    return _checksum(_profile_snapshot(connection, profile_id))


def _decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except Exception:
        return Decimal("0")


def _money(value: Decimal) -> str:
    return f"{value:.2f}"


def _difference(expected: Any, actual: Any) -> str:
    return _money(_decimal(actual) - _decimal(expected))


def _comparison(expected: Any, actual: Any) -> dict[str, Any]:
    if isinstance(expected, int) and isinstance(actual, int):
        difference: int | str = actual - expected
    else:
        difference = _difference(expected, actual)
    return {"expected": expected, "actual": actual, "difference": difference}


def _account_metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    active_rows = [row for row in rows if row.get("lifecycle_status") != "Archived"]
    type_counts = Counter(
        "Bookmaker" if row.get("type") == "Bookie" else str(row.get("type") or "Unknown")
        for row in active_rows
    )
    balances = {"Bookmaker": Decimal("0"), "Exchange": Decimal("0"), "Bank": Decimal("0")}
    pending = Decimal("0")
    for row in active_rows:
        account_type = "Bookmaker" if row.get("type") == "Bookie" else str(row.get("type"))
        if account_type in balances:
            balances[account_type] += _decimal(row.get("current_balance"))
        pending += _decimal(row.get("pending_withdrawal_amount"))
    return {
        "total_profile_accounts": len(active_rows),
        "bookmakers": type_counts["Bookmaker"],
        "exchanges": type_counts["Exchange"],
        "banks": type_counts["Bank"],
        "bookmaker_balance_total": _money(balances["Bookmaker"]),
        "exchange_balance_total": _money(balances["Exchange"]),
        "bank_balance": _money(balances["Bank"]),
        "pending_withdrawals": _money(pending),
        "total_bankroll_cash_snapshot": _money(sum(balances.values(), Decimal("0"))),
    }


def _expected_account_rows(
    checkpoint: dict[str, list[dict[str, Any]]], audit_rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    expected = {str(row["account_id"]): dict(row) for row in checkpoint.get("accounts", [])}
    for audit in audit_rows:
        if audit["entity_type"] != "accounts":
            continue
        after = json.loads(audit["after_json"])
        if audit["operation"] == "create":
            expected[str(audit["entity_id"])] = after
        elif audit["operation"] == "update":
            expected[str(audit["entity_id"])].update(after)
    return list(expected.values())


def _period_names(value: str, effective_at: str) -> set[str]:
    try:
        row_date = date.fromisoformat(value[:10])
        effective_date = date.fromisoformat(effective_at[:10])
    except ValueError:
        return set()
    row_week = row_date - timedelta(days=row_date.weekday())
    current_week = effective_date - timedelta(days=effective_date.weekday())
    names: set[str] = set()
    if row_week == current_week:
        names.add("week")
    if row_week.year == effective_date.year and row_week.month == effective_date.month:
        names.add("month")
    if row_week.year == effective_date.year:
        names.add("year")
    return names


def _actual_imported_value(
    *,
    entity_type: str,
    row: dict[str, Any],
    profile_id: str,
    effective_at: str,
    tracker_settings: ProfileTrackerSettingsRecord,
    commissions: dict[str, str],
) -> tuple[Decimal, bool, str, Decimal]:
    effective_date = date.fromisoformat(effective_at[:10])
    if entity_type == "sportsbook_bet":
        sportsbook_response = build_sportsbook_response(
            profile_id,
            SportsbookBetRecord(**row),
            as_of_date=effective_date,
            commission_lookup=lambda exchange: commissions.get(exchange, ""),
        )
        return (
            _decimal(sportsbook_response.reporting_value),
            bool(sportsbook_response.counts_as_open),
            str(row.get("date_settled") or ""),
            _decimal(sportsbook_response.calculated_liability_1),
        )
    if entity_type == "free_bet":
        record = FreeBetRecord(**row)
        calculation = calculate_free_bet_current_value(
            FreeBetCalculationInput(
                profile_id=profile_id,
                record_id=record.free_bet_id,
                status=record.status,
                result=record.result,
                retention_mode=record.retention_mode,
                free_bet_value=record.free_bet_value,
                back_odds=record.back_odds,
                match_strategy=record.match_strategy,
                lay_odds_1=record.lay_odds_1,
                lay_commission_1=commissions.get(record.exchange_name, ""),
                lay_actual=record.lay_actual,
                lay_matched_stake_1=record.lay_matched_stake_1,
                default_underlay_factor=tracker_settings.default_free_bet_underlay_factor,
                default_overlay_factor=tracker_settings.default_free_bet_overlay_factor,
                expiry_datetime=record.expiry_datetime,
                date_settled=record.date_settled,
                manual_override_value=record.manual_override_value,
                manual_override_reason=record.manual_override_reason,
            ),
            as_of_datetime=datetime.fromisoformat(effective_at),
        )
        return (
            _decimal(calculation.reporting_value),
            bool(calculation.counts_as_open),
            str(row.get("date_settled") or ""),
            _decimal(calculation.calculated_liability_1),
        )
    if entity_type == "casino_offer":
        casino_response = build_casino_response(CasinoOfferRecord(**row))
        return (
            _decimal(casino_response.resolved_net_pnl),
            bool(casino_response.counts_as_open),
            str(row.get("date_settling") or ""),
            Decimal("0"),
        )
    if entity_type == "extra_place":
        extra_place_response = build_extra_place_response(
            EachWayExtraPlaceRecord(**row), commissions=commissions
        )
        return (
            _decimal(extra_place_response.get("current_value")),
            row.get("status") != "Settled",
            str(row.get("placed_at") or ""),
            _decimal(extra_place_response.get("win_liability"))
            + _decimal(extra_place_response.get("place_liability")),
        )
    if entity_type == "cash_adjustment":
        cash_response = build_cash_response(CashAdjustmentRecord(**row))
        return (
            _decimal(cash_response.signed_amount),
            False,
            str(row.get("adjustment_date") or ""),
            Decimal("0"),
        )
    raise ImportCutoverError(f"Unsupported imported entity type {entity_type}")


def generate_post_import_reconciliation(
    *,
    connection: Any,
    profile_id: str,
    import_run_id: str,
    run: dict[str, Any],
    workspace: dict[str, Any],
    summary: dict[str, Any],
    write_result: dict[str, Any],
    plan: dict[str, Any],
) -> dict[str, Any]:
    """Compare the approved server plan with rows re-read from persisted storage."""
    profile = connection.execute(
        "SELECT * FROM profiles WHERE profile_id = ?", (profile_id,)
    ).fetchone()
    checkpoint_row = connection.execute(
        "SELECT snapshot_json FROM profile_import_checkpoints WHERE import_run_id = ?",
        (import_run_id,),
    ).fetchone()
    audit_raw = connection.execute(
        "SELECT * FROM profile_import_write_audit WHERE import_run_id = ? ORDER BY import_key",
        (import_run_id,),
    ).fetchall()
    if profile is None or checkpoint_row is None:
        raise ImportCutoverError("Post-import reconciliation prerequisites are unavailable")
    tracker_row = connection.execute(
        "SELECT * FROM profile_tracker_settings WHERE profile_id = ?", (profile_id,)
    ).fetchone()
    if tracker_row is None:
        raise ImportCutoverError("Profile tracker settings are unavailable")
    tracker_settings = ProfileTrackerSettingsRecord(**dict(tracker_row))
    commissions = {
        str(row["exchange_name"]): str(row["commission_rate"])
        for row in connection.execute(
            "SELECT exchange_name, commission_rate FROM profile_exchange_commissions "
            "WHERE profile_id = ?",
            (profile_id,),
        ).fetchall()
    }
    audit_rows = [dict(row) for row in audit_raw]
    checkpoint = json.loads(checkpoint_row["snapshot_json"])
    expected_accounts = _account_metrics(_expected_account_rows(checkpoint, audit_rows))
    actual_account_rows = [
        dict(row)
        for row in connection.execute(
            "SELECT * FROM accounts WHERE profile_id = ?", (profile_id,)
        ).fetchall()
    ]
    actual_accounts = _account_metrics(actual_account_rows)
    account_comparison = {
        key: _comparison(expected_accounts[key], actual_accounts[key]) for key in expected_accounts
    }
    account_comparison.update(
        {
            "new_accounts": _comparison(
                write_result["accounts"]["created"],
                sum(
                    row["entity_type"] == "accounts" and row["operation"] == "create"
                    for row in audit_rows
                ),
            ),
            "matched_existing_accounts": _comparison(
                write_result["accounts"]["updated"] + write_result["accounts"]["unchanged"],
                write_result["accounts"]["updated"] + write_result["accounts"]["unchanged"],
            ),
            "archived_or_deactivated_accounts": _comparison(
                write_result["accounts"]["absent_changed"],
                write_result["accounts"]["absent_changed"],
            ),
            "unresolved_providers": _comparison(0, summary["accounts"]["unresolved_providers"]),
        }
    )

    ledger_entity_types = {
        "sportsbook_bet": "sportsbook",
        "free_bet": "free_bets",
        "casino_offer": "casino",
        "cash_adjustment": "cash_adjustments",
        "extra_place": "extra_places",
    }
    actual_values = {"week": Decimal("0"), "month": Decimal("0"), "year": Decimal("0")}
    settled_total = Decimal("0")
    open_total = Decimal("0")
    other_total = Decimal("0")
    exposure_total = Decimal("0")
    future_open = 0
    calculation_errors: list[dict[str, str]] = []
    ledger_actual: dict[str, dict[str, int]] = {
        name: {"persisted": 0, "open": 0, "settled": 0, "duplicates": 0, "missing": 0}
        for name in ledger_entity_types.values()
    }
    seen_entities: set[tuple[str, str]] = set()
    for audit in audit_rows:
        entity_type = str(audit["entity_type"])
        if entity_type not in ledger_entity_types:
            continue
        ledger_name = ledger_entity_types[entity_type]
        table, id_column = ENTITY_TABLES[entity_type]
        persisted = connection.execute(
            f"SELECT * FROM {table} WHERE profile_id = ? AND {id_column} = ?",
            (profile_id, audit["entity_id"]),
        ).fetchone()
        if persisted is None:
            ledger_actual[ledger_name]["missing"] += 1
            continue
        entity_key = (entity_type, str(audit["entity_id"]))
        if entity_key in seen_entities:
            ledger_actual[ledger_name]["duplicates"] += 1
            continue
        seen_entities.add(entity_key)
        ledger_actual[ledger_name]["persisted"] += 1
        try:
            value, is_open, report_date, exposure = _actual_imported_value(
                entity_type=entity_type,
                row=dict(persisted),
                profile_id=profile_id,
                effective_at=run["effective_at"],
                tracker_settings=tracker_settings,
                commissions=commissions,
            )
        except Exception as error:
            calculation_errors.append({"import_id": str(audit["import_key"]), "reason": str(error)})
            continue
        if is_open:
            ledger_actual[ledger_name]["open"] += 1
            if entity_type != "cash_adjustment":
                open_total += value
                exposure_total += exposure
            try:
                if date.fromisoformat(report_date[:10]) > date.fromisoformat(
                    run["effective_at"][:10]
                ):
                    future_open += 1
            except ValueError:
                pass
        else:
            ledger_actual[ledger_name]["settled"] += 1
            if entity_type != "cash_adjustment":
                settled_total += value
        if entity_type != "cash_adjustment":
            for period in _period_names(report_date, run["effective_at"]):
                actual_values[period] += value

    expected_ledgers = {
        "sportsbook": write_result["ledgers"].get("sportsbook", 0),
        "free_bets": write_result["ledgers"].get("free_bets", 0),
        "casino": write_result["ledgers"].get("casino", 0),
        "cash_adjustments": write_result["ledgers"].get("cash_adjustments", 0),
        "extra_places": write_result["ledgers"].get("extra_places", 0),
    }
    ledger_comparison: dict[str, Any] = {}
    for ledger_name, expected_count in expected_ledgers.items():
        actual = ledger_actual[ledger_name]
        source_key = "sportsbook" if ledger_name == "extra_places" else ledger_name
        source_summary = summary["ledgers"].get(source_key, {})
        ledger_comparison[ledger_name] = {
            "expected_imported_rows": expected_count,
            "actual_persisted_rows": actual["persisted"],
            "difference": actual["persisted"] - expected_count,
            "open_rows": actual["open"],
            "settled_rows": actual["settled"],
            "excluded_non_transactional_rows": (
                source_summary.get("non_transactional", 0) if ledger_name == "sportsbook" else 0
            ),
            "duplicate_count": actual["duplicates"],
            "missing_count": actual["missing"],
        }

    financial_periods: dict[str, Any] = {}
    for period in ("week", "month", "year"):
        approved = run["reconciliation"].get(period, {}).get("workbook_report", {}).get("total")
        actual_period_value = _money(actual_values[period])
        financial_periods[period] = {
            "workbook_dry_run": approved,
            "post_import": actual_period_value,
            "difference": _difference(approved, actual_period_value),
        }
    expected_open = _decimal(summary["financial"]["open_current_pnl"])
    expected_settled = _decimal(summary["financial"]["settled_pnl"])
    financial_views = {
        "settled_realised_pnl": _comparison(_money(expected_settled), _money(settled_total)),
        "open_current_worst_case_pnl": _comparison(_money(expected_open), _money(open_total)),
        "other_included_states": _comparison("0.00", _money(other_total)),
        "total_equivalent_pnl": _comparison(
            _money(expected_settled + expected_open),
            _money(settled_total + open_total + other_total),
        ),
        "review_decision_pnl_impact": workspace["reconciliation"]["pnl_impact"],
    }

    decision_items = [item for item in workspace["items"] if item.get("decision")]
    actions = Counter(str(item["decision"].get("action") or "") for item in decision_items)
    plan_keys = {str(row["import_key"]) for rows in plan["ledgers"].values() for row in rows}
    ledger_audit_keys = [
        str(row["import_key"]) for row in audit_rows if row["entity_type"] in ledger_entity_types
    ]
    accounted_keys = set(ledger_audit_keys)
    non_transactional_keys = {
        str(row["import_key"])
        for rows in plan["ledgers"].values()
        for row in rows
        if row.get("action") == "exclude_non_transactional"
    }
    excluded_keys = {
        str(item["import_id"])
        for item in decision_items
        if item["review_status"] in {"EXCLUDED", "DEFERRED"}
    }
    ledger_source_accounted = plan_keys <= accounted_keys | non_transactional_keys | excluded_keys
    account_plan_keys = {str(row["import_key"]) for row in plan["accounts"]}
    account_audit_keys = {
        str(row["import_key"]) for row in audit_rows if row["entity_type"] == "accounts"
    }
    provider_excluded_keys = {
        str(item["import_id"])
        for item in decision_items
        if item["category"] == "missing_provider"
        and item["review_status"] in {"EXCLUDED", "DEFERRED"}
    }
    account_source_accounted = account_plan_keys <= account_audit_keys | provider_excluded_keys
    source_accounted = ledger_source_accounted and account_source_accounted
    expected_future_open = sum(
        int(value.get("future_settling_open", 0)) for value in summary["ledgers"].values()
    )
    expected_open_rows = sum(int(value.get("open", 0)) for value in summary["ledgers"].values())
    actual_open_rows = sum(value["open"] for value in ledger_actual.values())
    expected_exposure = _decimal(summary["financial"].get("open_exposure"))
    mismatches: list[dict[str, Any]] = []
    for key, comparison in account_comparison.items():
        if str(comparison["difference"]) not in {"0", "0.00"}:
            mismatches.append({"area": "Accounts", "field": key, **comparison})
    for key, ledger_values in ledger_comparison.items():
        if (
            ledger_values["difference"]
            or ledger_values["duplicate_count"]
            or ledger_values["missing_count"]
        ):
            mismatches.append({"area": "Ledgers", "field": key, **ledger_values})
    for key, financial_values in {**financial_periods, **financial_views}.items():
        if isinstance(financial_values, dict) and str(financial_values.get("difference")) not in {
            "0",
            "0.00",
            "None",
        }:
            mismatches.append({"area": "Financial", "field": key, **financial_values})
    if calculation_errors:
        mismatches.append(
            {"area": "Financial", "field": "calculation_errors", "rows": calculation_errors}
        )
    if not source_accounted:
        mismatches.append(
            {
                "area": "Integrity",
                "field": "source_rows_accounted",
                "expected": True,
                "actual": False,
            }
        )
    for field, comparison in {
        "future_settling_open": _comparison(expected_future_open, future_open),
        "open_rows": _comparison(expected_open_rows, actual_open_rows),
        "liability_exposure": _comparison(_money(expected_exposure), _money(exposure_total)),
    }.items():
        if str(comparison["difference"]) not in {"0", "0.00"}:
            mismatches.append({"area": "Open positions", "field": field, **comparison})
    passed = not mismatches
    open_position_checks = {
        "future_settling_open": _comparison(expected_future_open, future_open),
        "open_rows": _comparison(expected_open_rows, actual_open_rows),
        "liability_exposure": _comparison(_money(expected_exposure), _money(exposure_total)),
        "current_worst_case_pnl": _comparison(_money(expected_open), _money(open_total)),
        "no_open_row_silently_removed": source_accounted,
        "no_open_row_accidentally_settled": expected_open_rows == actual_open_rows,
    }
    review_decision_summary = {
        "applied": len(decision_items),
        "overrides": sum(
            item["review_status"] == "REVIEWED_OVERRIDDEN" for item in decision_items
        ),
        "exclusions": actions["exclude"],
        "historical_mappings": sum("historical" in action for action in actions.elements()),
        "provider_resolutions": sum(
            item["category"] == "missing_provider" for item in decision_items
        ),
        "extra_place_decisions": sum(
            item["category"] == "historical_extra_place" for item in decision_items
        ),
        "decisions_affecting_pnl": len(workspace["reconciliation"]["pnl_impact_items"]),
    }
    integrity_checks = {
        "deterministic_import_ids": len(ledger_audit_keys) == len(set(ledger_audit_keys)),
        "duplicate_protection": all(not value["duplicates"] for value in ledger_actual.values()),
        "all_expected_source_rows_accounted_for": source_accounted,
        "silent_partial_writes": False,
        "import_run_traceability": all(
            row["import_run_id"] == import_run_id for row in audit_rows
        ),
    }
    report = {
        "profile": {
            "profile_id": profile_id,
            "profile_name": profile["display_name"],
            "import_run_id": import_run_id,
            "workbook_filename": run["source_filename"],
            "checksum": run["workbook_checksum"],
            "effective_timestamp": run["effective_at"],
            "mapping_version": run["mapping_version"],
            "import_timestamp": write_result["completed_at"],
        },
        "accounts": account_comparison,
        "ledgers": ledger_comparison,
        "financial_reconciliation": {
            "periods": financial_periods,
            "views": financial_views,
        },
        "open_positions": open_position_checks,
        "review_decisions": review_decision_summary,
        "integrity": integrity_checks,
        "mismatches": mismatches,
        "rollback_available": True,
        "result": "POST-IMPORT RECONCILIATION: PASSED"
        if passed
        else "POST-IMPORT RECONCILIATION: FAILED",
    }
    report["handoff"] = {
        "workbook": {
            "filename": run["source_filename"],
            "checksum": run["workbook_checksum"],
            "effective_timestamp": run["effective_at"],
            "mapping_version": run["mapping_version"],
        },
        "profile": {
            "profile_id": profile_id,
            "profile_name": profile["display_name"],
            "import_run_id": import_run_id,
        },
        "accounts": account_comparison,
        "ledgers": ledger_comparison,
        "financial_reconciliation": {
            "periods": financial_periods,
            "views": financial_views,
        },
        "open_positions": open_position_checks,
        "review_decisions": review_decision_summary,
        "integrity": integrity_checks,
        "status": "POST-IMPORT RECONCILIATION: PASSED"
        if passed
        else "POST-IMPORT RECONCILIATION: FAILED",
    }
    return report


def execute_import(
    *,
    profile_id: str,
    import_run_id: str,
    actor_email: str,
    run: dict[str, Any],
    workspace: dict[str, Any],
    plan: dict[str, Any],
) -> dict[str, Any]:
    summary = final_import_summary(run=run, workspace=workspace, plan=plan)
    if not summary["ready"] or run["status"] != "READY_APPROVED":
        raise ImportCutoverError("The approved import plan is not ready")
    checkpoint = create_checkpoint(profile_id=profile_id, import_run_id=import_run_id, run=run)
    decisions = _decision_map(workspace)
    started_at = _now()
    write_result: dict[str, Any]
    with connect() as connection:
        checkpoint_row = connection.execute(
            "SELECT snapshot_json, snapshot_checksum FROM profile_import_checkpoints "
            "WHERE checkpoint_id = ? AND profile_id = ?",
            (checkpoint["checkpoint_id"], profile_id),
        ).fetchone()
        if checkpoint_row is None:
            raise ImportCutoverError("Pre-import checkpoint is unavailable")
        existing_writes = connection.execute(
            "SELECT COUNT(*) AS count FROM profile_import_write_audit WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
        if existing_writes and int(existing_writes["count"]):
            raise ImportCutoverError("This approved workbook has already written Profile data")
        if hashlib.sha256(str(checkpoint_row["snapshot_json"]).encode()).hexdigest() != str(
            checkpoint_row["snapshot_checksum"]
        ):
            raise ImportCutoverError("Pre-import checkpoint failed integrity verification")
        if _profile_state_checksum(connection, profile_id) != str(
            checkpoint_row["snapshot_checksum"]
        ):
            raise ImportCutoverError("Profile data changed after the import checkpoint")
        connection.execute(
            "UPDATE profile_import_runs SET status = 'IMPORTING', import_started_at = ?, "
            "updated_at = ? WHERE profile_id = ? AND import_run_id = ?",
            (started_at, started_at, profile_id, import_run_id),
        )
        setting_count = _apply_profile_settings(
            connection,
            profile_id=profile_id,
            import_run_id=import_run_id,
            settings=plan["profile_settings"],
        )
        account_counts = _apply_accounts(
            connection,
            profile_id=profile_id,
            import_run_id=import_run_id,
            rows=plan["accounts"],
            decisions=decisions,
            absent_strategy=summary["accounts"]["absent_strategy"],
        )
        ledger_counts = _insert_ledger_rows(
            connection,
            profile_id=profile_id,
            import_run_id=import_run_id,
            plan=plan,
            decisions=decisions,
        )
        actual_rows = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM profile_import_write_audit "
                "WHERE import_run_id = ? AND entity_type IN "
                "('sportsbook_bet','free_bet','casino_offer','cash_adjustment','extra_place')",
                (import_run_id,),
            ).fetchone()["count"]
        )
        completed_at = _now()
        write_result = {
            "status": "RECONCILING",
            "import_run_id": import_run_id,
            "checkpoint_id": checkpoint["checkpoint_id"],
            "actor_email": actor_email,
            "profile_settings_updated": setting_count,
            "accounts": account_counts,
            "ledgers": ledger_counts,
            "rows_imported": actual_rows,
            "skipped_non_transactional": summary["ledgers"]
            .get("sportsbook", {})
            .get("non_transactional", 0),
            "rollback_available": True,
            "started_at": started_at,
            "completed_at": completed_at,
            "duration_seconds": max(
                0,
                int(
                    (
                        datetime.fromisoformat(completed_at) - datetime.fromisoformat(started_at)
                    ).total_seconds()
                ),
            ),
        }
        write_result["post_import_state_checksum"] = _profile_state_checksum(connection, profile_id)
        connection.execute(
            """
            UPDATE profile_import_runs
            SET status = 'RECONCILING', completed_at = ?, result_json = ?,
                rollback_status = 'AVAILABLE',
                updated_at = ?
            WHERE profile_id = ? AND import_run_id = ?
            """,
            (completed_at, _json(write_result), completed_at, profile_id, import_run_id),
        )
    try:
        with connect() as connection:
            report = generate_post_import_reconciliation(
                connection=connection,
                profile_id=profile_id,
                import_run_id=import_run_id,
                run=run,
                workspace=workspace,
                summary=summary,
                write_result=write_result,
                plan=plan,
            )
            passed = report["result"] == "POST-IMPORT RECONCILIATION: PASSED"
            final_status = "COMPLETE" if passed else "POST_IMPORT_RECONCILIATION_FAILED"
            result = {
                **write_result,
                "status": final_status,
                "post_import_reconciliation": report,
            }
            result["post_import_state_checksum"] = _profile_state_checksum(connection, profile_id)
            connection.execute(
                "UPDATE profile_import_runs SET status = ?, result_json = ?, updated_at = ? "
                "WHERE profile_id = ? AND import_run_id = ?",
                (final_status, _json(result), _now(), profile_id, import_run_id),
            )
        return result
    except Exception as error:
        failure = {
            **write_result,
            "status": "POST_IMPORT_RECONCILIATION_FAILED",
            "post_import_reconciliation": {
                "result": "POST-IMPORT RECONCILIATION: FAILED",
                "mismatches": [
                    {
                        "area": "Reconciliation",
                        "field": "server_reread",
                        "reason": "Persisted Profile state could not be reconciled.",
                    }
                ],
                "rollback_available": True,
            },
        }
        with connect() as connection:
            connection.execute(
                "UPDATE profile_import_runs SET status = 'POST_IMPORT_RECONCILIATION_FAILED', "
                "result_json = ?, updated_at = ? WHERE profile_id = ? AND import_run_id = ?",
                (_json(failure), _now(), profile_id, import_run_id),
            )
        raise ImportCutoverError(
            "Post-import reconciliation failed. The import is traceable and rollback is available."
        ) from error


def rollback_import(
    *, profile_id: str, import_run_id: str, actor_email: str, run: dict[str, Any]
) -> dict[str, Any]:
    if (
        run["status"] not in {"COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"}
        or run.get("rollback_status") != "AVAILABLE"
    ):
        raise ImportCutoverError("This import is not available for rollback")
    result = run.get("result") or {}
    expected_state = str(result.get("post_import_state_checksum") or "")
    now = _now()
    event_id = f"import-rollback-{uuid4().hex}"
    with connect() as connection:
        if not expected_state or _profile_state_checksum(connection, profile_id) != expected_state:
            raise ImportCutoverError(
                "Profile data changed after import; review before rolling back this run"
            )
        audit_rows = connection.execute(
            "SELECT * FROM profile_import_write_audit WHERE import_run_id = ? "
            "ORDER BY created_at DESC, import_key DESC",
            (import_run_id,),
        ).fetchall()
        deleted = 0
        restored = 0
        table_for_entity = {
            "sportsbook_bet": ("sportsbook_bets", "sportsbook_bet_id"),
            "free_bet": ("free_bets", "free_bet_id"),
            "casino_offer": ("casino_offers", "casino_offer_id"),
            "cash_adjustment": ("cash_adjustments", "cash_adjustment_id"),
            "extra_place": ("each_way_extra_places", "each_way_extra_place_id"),
            "accounts": ("accounts", "account_id"),
        }
        for raw in audit_rows:
            row = dict(raw)
            before = json.loads(row["before_json"])
            if row["operation"] == "create":
                table, id_column = table_for_entity[row["entity_type"]]
                connection.execute(
                    f"DELETE FROM {table} WHERE profile_id = ? AND {id_column} = ?",
                    (profile_id, row["entity_id"]),
                )
                deleted += 1
            elif row["operation"] == "update":
                if row["entity_type"] in {
                    "profiles",
                    "profile_onboarding_settings",
                    "profile_tracker_settings",
                }:
                    table, id_column = row["entity_type"], "profile_id"
                else:
                    table, id_column = table_for_entity[row["entity_type"]]
                assignments = ",".join(f"{key} = ?" for key in before)
                connection.execute(
                    f"UPDATE {table} SET {assignments} WHERE {id_column} = ?",
                    (*before.values(), row["entity_id"]),
                )
                restored += 1
        checkpoint = connection.execute(
            "SELECT snapshot_checksum FROM profile_import_checkpoints WHERE import_run_id = ?",
            (import_run_id,),
        ).fetchone()
        if checkpoint is None or _profile_state_checksum(connection, profile_id) != str(
            checkpoint["snapshot_checksum"]
        ):
            raise ImportCutoverError("Post-rollback reconciliation did not match the checkpoint")
        summary = {
            "deleted_import_records": deleted,
            "restored_prior_values": restored,
            "checkpoint_reconciled": True,
        }
        connection.execute(
            "UPDATE profile_import_write_audit SET rolled_back_at = ? WHERE import_run_id = ?",
            (now, import_run_id),
        )
        connection.execute(
            "UPDATE profile_import_checkpoints SET status = 'RESTORED', restored_at = ? "
            "WHERE import_run_id = ?",
            (now, import_run_id),
        )
        connection.execute(
            """
            INSERT INTO profile_import_rollback_events (
              rollback_event_id, import_run_id, profile_id, actor_email, checkpoint_id,
              status, summary_json, created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, 'COMPLETE', ?, ?, ?)
            """,
            (
                event_id,
                import_run_id,
                profile_id,
                actor_email,
                run["checkpoint_id"],
                _json(summary),
                now,
                now,
            ),
        )
        connection.execute(
            "UPDATE profile_import_runs SET status = 'ROLLED_BACK', rollback_status = 'COMPLETE', "
            "rolled_back_at = ?, updated_at = ? WHERE profile_id = ? AND import_run_id = ?",
            (now, now, profile_id, import_run_id),
        )
    return {"status": "ROLLED_BACK", "rollback_event_id": event_id, **summary}
