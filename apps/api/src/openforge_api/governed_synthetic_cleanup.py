from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Iterable
from uuid import uuid4

from openforge_api.db import (
    _append_financial_history,
    connect,
    delete_each_way_extra_place,
    reuse_mutation_connection,
    utc_now,
    write_audit_entry,
)

CP103_OPERATION_ID = "CP-103"
CP103_SPORTSBOOK_COUNT = 35
CP103_EXTRA_PLACE_COUNT = 11
CP103_REASON = "CP-103 owner-approved removal of provenance-proven synthetic test residue"
CP105_OPERATION_ID = "CP-105"
CP105_ACCOUNT_REASON = (
    "CP-105 owner-approved removal of provenance-proven synthetic Exchange Account residue"
)
CP105_ACCOUNT_AUTHORITY = {
    "AC-77E9B335": ("profile-demo-001", "ALPHA-001", "Matchbook"),
    "AC-9AFFD503": ("profile-demo-001", "ALPHA-001", "Smarkets"),
    "AC-01087C3B": ("profile-demo-002", "BRAVO-002", "Matchbook"),
    "AC-E07D941E": ("profile-demo-002", "BRAVO-002", "Smarkets"),
}
CP105_ACCOUNT_NOTE = "Restored from existing profile exchange commission authority."


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


@dataclass(frozen=True)
class AccountCleanupCandidate:
    account_id: str
    profile_id: str
    row_sha256: str
    created_audit_id: str
    created_audit_payload_sha256: str


@dataclass(frozen=True)
class AccountCleanupManifest:
    schema_version: int
    operation_id: str
    candidates: tuple[AccountCleanupCandidate, ...]


@dataclass(frozen=True)
class AccountCleanupResult:
    operation_id: str
    accounts_deleted: int
    profile_audit_ids: tuple[str, ...]


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


def load_account_cleanup_manifest(payload: dict[str, Any]) -> AccountCleanupManifest:
    if set(payload) != {"schema_version", "operation_id", "candidates"}:
        raise GovernedCleanupAbort("account_cleanup_manifest_shape_mismatch")
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        raise GovernedCleanupAbort("account_cleanup_manifest_candidates_invalid")
    required = {
        "account_id",
        "profile_id",
        "row_sha256",
        "created_audit_id",
        "created_audit_payload_sha256",
    }
    parsed: list[AccountCleanupCandidate] = []
    for candidate in candidates:
        if not isinstance(candidate, dict) or set(candidate) != required:
            raise GovernedCleanupAbort("account_cleanup_candidate_shape_mismatch")
        parsed.append(
            AccountCleanupCandidate(
                **{key: str(candidate[key]) for key in required}
            )
        )
    return AccountCleanupManifest(
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


def _assert_account_manifest_boundary(manifest: AccountCleanupManifest) -> None:
    if manifest.schema_version != 1 or manifest.operation_id != CP105_OPERATION_ID:
        raise GovernedCleanupAbort("account_cleanup_manifest_authority_mismatch")
    candidate_ids = [candidate.account_id for candidate in manifest.candidates]
    if len(candidate_ids) != len(CP105_ACCOUNT_AUTHORITY):
        raise GovernedCleanupAbort("account_cleanup_manifest_count_mismatch")
    if len(set(candidate_ids)) != len(candidate_ids):
        raise GovernedCleanupAbort("account_cleanup_manifest_duplicate_identity")
    if set(candidate_ids) != set(CP105_ACCOUNT_AUTHORITY):
        raise GovernedCleanupAbort("account_cleanup_manifest_identity_mismatch")


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


def _assert_account_created_audit(
    connection: Any, candidate: AccountCleanupCandidate
) -> None:
    rows = connection.execute(
        "SELECT audit_id, action, payload_json FROM account_audit "
        "WHERE profile_id = ? AND account_id = ? ORDER BY changed_at, audit_id",
        (candidate.profile_id, candidate.account_id),
    ).fetchall()
    if len(rows) != 1 or str(rows[0]["action"]) != "created":
        raise GovernedCleanupAbort(
            f"account_cleanup_audit_history_mismatch:{candidate.account_id}"
        )
    if str(rows[0]["audit_id"]) != candidate.created_audit_id:
        raise GovernedCleanupAbort(
            f"account_cleanup_audit_identity_mismatch:{candidate.account_id}"
        )
    try:
        payload = json.loads(str(rows[0]["payload_json"]))
    except json.JSONDecodeError as error:
        raise GovernedCleanupAbort(
            f"account_cleanup_audit_payload_invalid:{candidate.account_id}"
        ) from error
    if canonical_sha256(payload) != candidate.created_audit_payload_sha256:
        raise GovernedCleanupAbort(
            f"account_cleanup_audit_payload_changed:{candidate.account_id}"
        )


def _assert_synthetic_account(
    row: dict[str, Any], *, profile_code: str, provider: str
) -> None:
    expected = {
        "account": provider,
        "type": "Exchange",
        "status": "Active",
        "lifecycle_status": "Active",
        "notes": CP105_ACCOUNT_NOTE,
    }
    if any(str(row.get(field) or "") != value for field, value in expected.items()):
        raise GovernedCleanupAbort(
            f"account_synthetic_provenance_failed:{row['account_id']}"
        )
    if profile_code not in {"ALPHA-001", "BRAVO-002"}:
        raise GovernedCleanupAbort(
            f"account_profile_not_designated_synthetic:{row['account_id']}"
        )
    if int(row.get("counts_in_cash_total") or 0) != 1:
        raise GovernedCleanupAbort(
            f"account_cash_membership_changed:{row['account_id']}"
        )
    required_empty = (
        "current_balance",
        "pending_withdrawal_amount",
        "last_balance_update",
        "bookmaker_id",
        "catalogue_id",
        "sign_up_date",
        "access_evidence_note",
        "access_source",
        "access_observed_at",
    )
    if any(str(row.get(field) or "").strip() for field in required_empty):
        raise GovernedCleanupAbort(
            f"account_authoritative_activity_present:{row['account_id']}"
        )
    if str(row.get("created_at") or "") != str(row.get("updated_at") or ""):
        raise GovernedCleanupAbort(
            f"account_changed_after_creation:{row['account_id']}"
        )


def _assert_account_notification_history(
    connection: Any,
    *,
    account_id: str,
    profile_id: str,
    provider: str,
) -> None:
    events = connection.execute(
        "SELECT profile_id, notification_type, payload_json FROM notification_events "
        "WHERE instr(event_id, ?) > 0 OR instr(notification_id, ?) > 0 "
        "OR instr(payload_json, ?) > 0",
        (account_id, account_id, account_id),
    ).fetchall()
    for event in events:
        try:
            payload = json.loads(str(event["payload_json"]))
        except json.JSONDecodeError as error:
            raise GovernedCleanupAbort(
                f"account_notification_payload_invalid:{account_id}"
            ) from error
        if (
            str(event["profile_id"]) != profile_id
            or str(event["notification_type"]) != "account_review"
            or str(payload.get("record_id") or "") != account_id
            or str(payload.get("bookmaker_label") or "") != provider
        ):
            raise GovernedCleanupAbort(
                f"account_notification_dependency_ambiguous:{account_id}"
            )


def _assert_no_account_dependencies(
    connection: Any,
    *,
    account_id: str,
    profile_id: str,
    provider: str,
) -> None:
    """Fail closed if the exact Account identity appears outside its own row/audit.

    Historical ledger provider names are independent recorded evidence and are
    deliberately not treated as an Account-ID relationship.
    """

    tables = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    for table_row in tables:
        table = str(table_row["name"])
        if table in {
            "accounts",
            "account_audit",
            "notification_events",
            "notification_user_state",
        }:
            continue
        columns = connection.execute(f'PRAGMA table_info("{table}")').fetchall()
        for column_row in columns:
            column = str(column_row["name"])
            found = connection.execute(
                f'SELECT 1 FROM "{table}" '
                f'WHERE instr(CAST("{column}" AS TEXT), ?) > 0 LIMIT 1',
                (account_id,),
            ).fetchone()
            if found is not None:
                raise GovernedCleanupAbort(
                    f"account_cleanup_dependency_present:{table}.{column}:{account_id}"
                )
    _assert_account_notification_history(
        connection,
        account_id=account_id,
        profile_id=profile_id,
        provider=provider,
    )


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


def execute_cp105_account_cleanup(
    manifest: AccountCleanupManifest,
) -> AccountCleanupResult:
    """Atomically remove only the exact owner-approved CP-105 Account manifest.

    This maintenance authority is not exposed through HTTP. The ordinary
    Account DELETE route continues to archive and never physically deletes an
    active Account.
    """

    _assert_account_manifest_boundary(manifest)
    with connect() as connection, reuse_mutation_connection(connection):
        rows = _rows_for_ids(
            connection,
            table="accounts",
            id_column="account_id",
            ids=(candidate.account_id for candidate in manifest.candidates),
        )
        if len(rows) != len(CP105_ACCOUNT_AUTHORITY):
            raise GovernedCleanupAbort("account_cleanup_candidate_set_changed")

        profile_ids = {candidate.profile_id for candidate in manifest.candidates}
        profiles = _rows_for_ids(
            connection,
            table="profiles",
            id_column="profile_id",
            ids=profile_ids,
        )
        for candidate in manifest.candidates:
            row = rows.get(candidate.account_id)
            authority = CP105_ACCOUNT_AUTHORITY[candidate.account_id]
            expected_profile_id, expected_profile_code, expected_provider = authority
            if candidate.profile_id != expected_profile_id:
                raise GovernedCleanupAbort(
                    f"account_cleanup_profile_mismatch:{candidate.account_id}"
                )
            if row is None or str(row["profile_id"]) != expected_profile_id:
                raise GovernedCleanupAbort(
                    f"account_cleanup_candidate_missing:{candidate.account_id}"
                )
            profile = profiles.get(expected_profile_id)
            if profile is None or str(profile.get("profile_code")) != expected_profile_code:
                raise GovernedCleanupAbort(
                    f"account_cleanup_profile_authority_changed:{candidate.account_id}"
                )
            if canonical_sha256(row) != candidate.row_sha256:
                raise GovernedCleanupAbort(
                    f"account_cleanup_candidate_changed:{candidate.account_id}"
                )
            _assert_synthetic_account(
                row,
                profile_code=expected_profile_code,
                provider=expected_provider,
            )
            _assert_account_created_audit(connection, candidate)
            _assert_no_account_dependencies(
                connection,
                account_id=candidate.account_id,
                profile_id=candidate.profile_id,
                provider=expected_provider,
            )

        profile_audit_ids: list[str] = []
        for candidate in manifest.candidates:
            row = rows[candidate.account_id]
            audit_id = f"audit-{uuid4().hex}"
            connection.execute(
                "INSERT INTO profile_audit "
                "(audit_id, profile_id, action, changed_at, payload_json) "
                "VALUES (?, ?, 'maintenance_account_deleted', ?, ?)",
                (
                    audit_id,
                    candidate.profile_id,
                    utc_now(),
                    json.dumps(
                        {
                            "operation_id": CP105_OPERATION_ID,
                            "reason": CP105_ACCOUNT_REASON,
                            "account_id": candidate.account_id,
                            "provider": row["account"],
                            "account_row_sha256": candidate.row_sha256,
                            "created_audit_id": candidate.created_audit_id,
                            "created_audit_payload_sha256": (
                                candidate.created_audit_payload_sha256
                            ),
                        },
                        sort_keys=True,
                    ),
                ),
            )
            deleted = connection.execute(
                "DELETE FROM accounts WHERE profile_id = ? AND account_id = ?",
                (candidate.profile_id, candidate.account_id),
            )
            if deleted.rowcount != 1:
                raise GovernedCleanupAbort(
                    f"account_cleanup_delete_failed:{candidate.account_id}"
                )
            profile_audit_ids.append(audit_id)

        return AccountCleanupResult(
            operation_id=CP105_OPERATION_ID,
            accounts_deleted=len(manifest.candidates),
            profile_audit_ids=tuple(profile_audit_ids),
        )
