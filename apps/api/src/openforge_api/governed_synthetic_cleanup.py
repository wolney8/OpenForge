from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Iterable

from openforge_api.db import (
    _append_financial_history,
    connect,
    delete_each_way_extra_place,
    reuse_mutation_connection,
    write_audit_entry,
)

CP103_OPERATION_ID = "CP-103"
CP103_SPORTSBOOK_COUNT = 35
CP103_EXTRA_PLACE_COUNT = 11
CP103_REASON = "CP-103 owner-approved removal of provenance-proven synthetic test residue"


class GovernedCleanupAbort(RuntimeError):
    """The approved cleanup manifest no longer matches authoritative storage."""


@dataclass(frozen=True)
class CleanupCandidate:
    domain: str
    record_id: str
    profile_id: str
    row_sha256: str
    created_audit_id: str
    created_audit_payload_sha256: str


@dataclass(frozen=True)
class CleanupManifest:
    schema_version: int
    operation_id: str
    candidates: tuple[CleanupCandidate, ...]


@dataclass(frozen=True)
class GovernedCleanupResult:
    operation_id: str
    sportsbook_deleted: int
    extra_place_deleted: int
    history_event_ids: tuple[str, ...]


def canonical_sha256(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def load_cleanup_manifest(payload: dict[str, Any]) -> CleanupManifest:
    if set(payload) != {"schema_version", "operation_id", "candidates"}:
        raise GovernedCleanupAbort("cleanup_manifest_shape_mismatch")
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        raise GovernedCleanupAbort("cleanup_manifest_candidates_invalid")
    parsed: list[CleanupCandidate] = []
    required = {
        "domain",
        "record_id",
        "profile_id",
        "row_sha256",
        "created_audit_id",
        "created_audit_payload_sha256",
    }
    for candidate in candidates:
        if not isinstance(candidate, dict) or set(candidate) != required:
            raise GovernedCleanupAbort("cleanup_candidate_shape_mismatch")
        parsed.append(CleanupCandidate(**{key: str(candidate[key]) for key in required}))
    return CleanupManifest(
        schema_version=int(payload.get("schema_version", 0)),
        operation_id=str(payload.get("operation_id", "")),
        candidates=tuple(parsed),
    )


def _assert_manifest_boundary(manifest: CleanupManifest) -> None:
    if manifest.schema_version != 1 or manifest.operation_id != CP103_OPERATION_ID:
        raise GovernedCleanupAbort("cleanup_manifest_authority_mismatch")
    counts = {
        domain: sum(candidate.domain == domain for candidate in manifest.candidates)
        for domain in {"sportsbook", "extra_place"}
    }
    if counts != {
        "sportsbook": CP103_SPORTSBOOK_COUNT,
        "extra_place": CP103_EXTRA_PLACE_COUNT,
    }:
        raise GovernedCleanupAbort("cleanup_manifest_count_mismatch")
    identities = {(candidate.domain, candidate.record_id) for candidate in manifest.candidates}
    if len(identities) != CP103_SPORTSBOOK_COUNT + CP103_EXTRA_PLACE_COUNT:
        raise GovernedCleanupAbort("cleanup_manifest_duplicate_identity")


def _rows_for_ids(
    connection: Any, *, table: str, id_column: str, ids: Iterable[str]
) -> dict[str, dict[str, Any]]:
    values = tuple(ids)
    placeholders = ",".join("?" for _ in values)
    rows = connection.execute(
        f"SELECT * FROM {table} WHERE {id_column} IN ({placeholders})", values
    ).fetchall()
    return {str(row[id_column]): dict(row) for row in rows}


def _count_reference(connection: Any, sql: str, parameters: tuple[Any, ...]) -> int:
    return int(connection.execute(sql, parameters).fetchone()[0])


def _assert_no_dependencies(
    connection: Any, *, domain: str, record_id: str, profile_id: str
) -> None:
    common = [
        (
            "calculator_conversion_target",
            "SELECT COUNT(*) FROM calculator_conversion_targets "
            "WHERE target_profile_id = ? AND destination_record_id = ?",
            (profile_id, record_id),
        ),
        (
            "portable_restore_write_audit",
            "SELECT COUNT(*) FROM profile_portable_restore_write_audit "
            "WHERE target_profile_id = ? AND row_id = ?",
            (profile_id, record_id),
        ),
        (
            "profile_import_attempt_write_audit",
            "SELECT COUNT(*) FROM profile_import_attempt_write_audit "
            "WHERE profile_id = ? AND entity_id = ?",
            (profile_id, record_id),
        ),
        (
            "profile_import_write_audit",
            "SELECT COUNT(*) FROM profile_import_write_audit "
            "WHERE profile_id = ? AND entity_id = ?",
            (profile_id, record_id),
        ),
        (
            "existing_financial_history",
            "SELECT COUNT(*) FROM financial_activity_history "
            "WHERE profile_id = ? AND activity_id = ?",
            (profile_id, record_id),
        ),
    ]
    sportsbook = [
        (
            "linked_free_bet",
            "SELECT COUNT(*) FROM free_bets "
            "WHERE profile_id = ? AND origin_qual_bet_id = ?",
            (profile_id, record_id),
        ),
        (
            "multi_profile_source",
            "SELECT COUNT(*) FROM multi_profile_entry_batches "
            "WHERE source_profile_id = ? AND source_sportsbook_bet_id = ?",
            (profile_id, record_id),
        ),
        (
            "multi_profile_target",
            "SELECT COUNT(*) FROM multi_profile_entry_targets "
            "WHERE target_profile_id = ? AND created_sportsbook_bet_id = ?",
            (profile_id, record_id),
        ),
        (
            "opportunity_target",
            "SELECT COUNT(*) FROM multi_profile_opportunity_targets "
            "WHERE profile_id = ? AND sportsbook_bet_id = ?",
            (profile_id, record_id),
        ),
    ]
    for label, sql, parameters in common + (sportsbook if domain == "sportsbook" else []):
        if _count_reference(connection, sql, parameters):
            raise GovernedCleanupAbort(f"cleanup_dependency_present:{label}:{record_id}")


def _assert_created_audit(
    connection: Any, *, candidate: CleanupCandidate, table: str, id_column: str
) -> None:
    rows = connection.execute(
        f"SELECT audit_id, action, payload_json FROM {table} "
        f"WHERE profile_id = ? AND {id_column} = ? ORDER BY changed_at, audit_id",
        (candidate.profile_id, candidate.record_id),
    ).fetchall()
    if len(rows) != 1 or str(rows[0]["action"]) != "created":
        raise GovernedCleanupAbort(f"cleanup_audit_history_mismatch:{candidate.record_id}")
    if str(rows[0]["audit_id"]) != candidate.created_audit_id:
        raise GovernedCleanupAbort(f"cleanup_audit_identity_mismatch:{candidate.record_id}")
    try:
        payload = json.loads(str(rows[0]["payload_json"]))
    except json.JSONDecodeError as error:
        raise GovernedCleanupAbort(
            f"cleanup_audit_payload_invalid:{candidate.record_id}"
        ) from error
    if canonical_sha256(payload) != candidate.created_audit_payload_sha256:
        raise GovernedCleanupAbort(f"cleanup_audit_payload_changed:{candidate.record_id}")


def _assert_synthetic_sportsbook(row: dict[str, Any]) -> None:
    expected = {
        "event_name": "Lifecycle Back Only Match",
        "offer_name": "Lifecycle Back Only",
        "bookmaker": "Bookmaker A",
        "status": "Placed",
        "result": "Pending",
        "match_strategy": "Standard",
    }
    if any(str(row.get(field) or "") != value for field, value in expected.items()):
        raise GovernedCleanupAbort(
            f"sportsbook_synthetic_provenance_failed:{row['sportsbook_bet_id']}"
        )
    required_empty = (
        "exchange_name",
        "lay_odds_1",
        "lay_actual",
        "lay_matched_stake_1",
        "lay_commission_1",
        "user_notes",
        "offer_group_id",
        "wagering_contribution",
    )
    if any(str(row.get(field) or "").strip() for field in required_empty):
        raise GovernedCleanupAbort(
            f"sportsbook_financial_activity_present:{row['sportsbook_bet_id']}"
        )


def _assert_synthetic_extra_place(row: dict[str, Any]) -> None:
    expected = {
        "race": "Branded badge race 14:10",
        "runner": "Branded badge runner",
        "mode": "Extra Place",
        "bookmaker": "Betfred",
        "status": "Prospecting",
        "result": "Pending",
        "calculation_provenance": "native",
    }
    if any(str(row.get(field) or "") != value for field, value in expected.items()):
        raise GovernedCleanupAbort(
            f"extra_place_synthetic_provenance_failed:{row['each_way_extra_place_id']}"
        )
    required_empty = (
        "bookmaker_account",
        "each_way_stake",
        "back_odds",
        "win_lay_odds",
        "actual_win_lay_stake",
        "place_lay_odds",
        "actual_place_lay_stake",
        "finishing_position",
        "user_notes",
        "import_run_id",
        "source_import_id",
    )
    if any(str(row.get(field) or "").strip() for field in required_empty):
        raise GovernedCleanupAbort(
            f"extra_place_financial_activity_present:{row['each_way_extra_place_id']}"
        )


def execute_cp103_cleanup(manifest: CleanupManifest) -> GovernedCleanupResult:
    """Atomically remove only the exact owner-approved CP-103 synthetic manifest.

    This is intentionally not exposed through an HTTP route. Ordinary ledger
    deletion rules remain unchanged.
    """

    _assert_manifest_boundary(manifest)
    sportsbook_candidates = tuple(
        candidate for candidate in manifest.candidates if candidate.domain == "sportsbook"
    )
    extra_place_candidates = tuple(
        candidate for candidate in manifest.candidates if candidate.domain == "extra_place"
    )

    with connect() as connection, reuse_mutation_connection(connection):
        sportsbook_rows = _rows_for_ids(
            connection,
            table="sportsbook_bets",
            id_column="sportsbook_bet_id",
            ids=(candidate.record_id for candidate in sportsbook_candidates),
        )
        extra_place_rows = _rows_for_ids(
            connection,
            table="each_way_extra_places",
            id_column="each_way_extra_place_id",
            ids=(candidate.record_id for candidate in extra_place_candidates),
        )
        if len(sportsbook_rows) != CP103_SPORTSBOOK_COUNT:
            raise GovernedCleanupAbort("sportsbook_candidate_set_changed")
        if len(extra_place_rows) != CP103_EXTRA_PLACE_COUNT:
            raise GovernedCleanupAbort("extra_place_candidate_set_changed")

        profile_ids = {candidate.profile_id for candidate in manifest.candidates}
        profile_rows = _rows_for_ids(
            connection,
            table="profiles",
            id_column="profile_id",
            ids=profile_ids,
        )
        for profile_id in profile_ids:
            profile = profile_rows.get(profile_id)
            if profile is None or str(profile.get("profile_code")) != "ALPHA-001":
                raise GovernedCleanupAbort(f"cleanup_profile_not_designated_synthetic:{profile_id}")

        for candidate in sportsbook_candidates:
            row = sportsbook_rows.get(candidate.record_id)
            if row is None or str(row["profile_id"]) != candidate.profile_id:
                raise GovernedCleanupAbort(f"sportsbook_candidate_missing:{candidate.record_id}")
            if canonical_sha256(row) != candidate.row_sha256:
                raise GovernedCleanupAbort(f"sportsbook_candidate_changed:{candidate.record_id}")
            _assert_synthetic_sportsbook(row)
            _assert_created_audit(
                connection,
                candidate=candidate,
                table="sportsbook_bet_audit",
                id_column="sportsbook_bet_id",
            )
            _assert_no_dependencies(
                connection,
                domain="sportsbook",
                record_id=candidate.record_id,
                profile_id=candidate.profile_id,
            )

        for candidate in extra_place_candidates:
            row = extra_place_rows.get(candidate.record_id)
            if row is None or str(row["profile_id"]) != candidate.profile_id:
                raise GovernedCleanupAbort(f"extra_place_candidate_missing:{candidate.record_id}")
            if canonical_sha256(row) != candidate.row_sha256:
                raise GovernedCleanupAbort(f"extra_place_candidate_changed:{candidate.record_id}")
            _assert_synthetic_extra_place(row)
            _assert_created_audit(
                connection,
                candidate=candidate,
                table="each_way_extra_place_audit",
                id_column="each_way_extra_place_id",
            )
            _assert_no_dependencies(
                connection,
                domain="extra_place",
                record_id=candidate.record_id,
                profile_id=candidate.profile_id,
            )

        history_event_ids: list[str] = []
        for candidate in sportsbook_candidates:
            row = sportsbook_rows[candidate.record_id]
            write_audit_entry(
                connection,
                candidate.record_id,
                candidate.profile_id,
                "maintenance_deleted",
                {
                    "operation_id": CP103_OPERATION_ID,
                    "reason": CP103_REASON,
                    "manifest_row_sha256": candidate.row_sha256,
                },
            )
            event = _append_financial_history(
                connection,
                profile_id=candidate.profile_id,
                ledger_type="sportsbook",
                activity_id=candidate.record_id,
                operation="removed",
                before=row,
                after=None,
                payload={
                    "_history_reason": CP103_REASON,
                    "_history_actor_type": "maintenance",
                    "_history_actor_id": CP103_OPERATION_ID,
                    "_history_operation_id": (
                        f"{CP103_OPERATION_ID}:sportsbook:{candidate.record_id}"
                    ),
                },
            )
            history_event_ids.append(event.history_id)
            connection.execute(
                "DELETE FROM sportsbook_bet_audit WHERE profile_id = ? AND sportsbook_bet_id = ?",
                (candidate.profile_id, candidate.record_id),
            )
            deleted = connection.execute(
                "DELETE FROM sportsbook_bets WHERE profile_id = ? AND sportsbook_bet_id = ?",
                (candidate.profile_id, candidate.record_id),
            )
            if deleted.rowcount != 1:
                raise GovernedCleanupAbort(f"sportsbook_delete_failed:{candidate.record_id}")

        for candidate in extra_place_candidates:
            if not delete_each_way_extra_place(
                candidate.profile_id, candidate.record_id, CP103_REASON
            ):
                raise GovernedCleanupAbort(f"extra_place_delete_failed:{candidate.record_id}")
            event_rows = connection.execute(
                "SELECT history_id FROM financial_activity_history "
                "WHERE profile_id = ? AND ledger_type = 'extra_place' "
                "AND activity_id = ? AND operation = 'removed'",
                (candidate.profile_id, candidate.record_id),
            ).fetchall()
            if len(event_rows) != 1:
                raise GovernedCleanupAbort(
                    f"extra_place_history_receipt_mismatch:{candidate.record_id}"
                )
            history_event_ids.append(str(event_rows[0]["history_id"]))

        return GovernedCleanupResult(
            operation_id=CP103_OPERATION_ID,
            sportsbook_deleted=len(sportsbook_candidates),
            extra_place_deleted=len(extra_place_candidates),
            history_event_ids=tuple(history_event_ids),
        )
