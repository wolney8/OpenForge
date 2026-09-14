"""Server-owned award operations using existing source audit identities."""

import hashlib
import json
from decimal import Decimal

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api import db
from openforge_api.free_bets import FreeBetPayload, prepare_write_response, validate_write_payload
from openforge_api.money_input import normalize_money_input


class AwardRequest(BaseModel):
    operation_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    children: list[FreeBetPayload] = Field(min_length=1)
    expected_award_value: str = ""
    variance_reason: str = Field(default="", max_length=500)

    @field_validator("expected_award_value")
    @classmethod
    def expected_money(cls, value):
        result = normalize_money_input(value, "expected_award_value")
        if result and Decimal(result) < 0:
            raise ValueError("expected_award_value must be non-negative")
        return result


def issue_award(profile_id: str, source_id: str, request: AwardRequest) -> dict:
    from openforge_api.sportsbook import prepare_write_response as prepare_source

    canonical = {"profile_id": profile_id, "source_id": source_id, **request.model_dump()}
    digest = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    audit_id = "award-operation-" + request.operation_id
    total = sum(Decimal(c.free_bet_value or "0") for c in request.children)
    if any(
        c.status not in {"Available", "Prospecting", "Not Yet Awarded"}
        or c.result != "Pending"
        or Decimal(c.free_bet_value or "0") <= 0
        for c in request.children
    ):
        raise HTTPException(
            status_code=422,
            detail="children: enter positive award values and unplaced Pending children.",
        )
    if (
        request.expected_award_value
        and total != Decimal(request.expected_award_value)
        and not request.variance_reason.strip()
    ):
        raise HTTPException(
            status_code=422,
            detail="variance_reason: explain the difference from the expected award value.",
        )

    def lock_and_validate(connection):
        db.lock_award_profile(connection, profile_id)
        source_row = connection.execute(
            "SELECT * FROM sportsbook_bets WHERE profile_id=? AND sportsbook_bet_id=?",
            (profile_id, source_id),
        ).fetchone()
        if source_row is None:
            raise HTTPException(status_code=404, detail="Award source not found for this Profile.")
        if source_row["status"] not in {"Placed", "Settled", "Free Bet Awarded"}:
            raise HTTPException(
                status_code=409, detail="Record qualifying placement before issuing this award."
            )
        # Account lifecycle cannot change while PostgreSQL issuance holds these rows.
        legacy_members = [
            dict(r)
            for r in connection.execute(
                "SELECT free_bet_id,source_award_group_id,offer_group_id,source_award_split_total "
                "FROM free_bets WHERE profile_id=? AND origin_qual_bet_id=?",
                (profile_id, source_id),
            ).fetchall()
        ]
        for removed in connection.execute(
            "SELECT payload_json FROM sportsbook_bet_audit WHERE profile_id=? "
            "AND sportsbook_bet_id=? AND action='award_child_removed'",
            (profile_id, source_id),
        ).fetchall():
            legacy_members.append(json.loads(removed["payload_json"])["child"])
        groups = {}
        for member in legacy_members:
            group = member["source_award_group_id"] or member["offer_group_id"] or "unknown"
            if connection.execute(
                "SELECT 1 FROM sportsbook_bet_audit WHERE profile_id=? AND sportsbook_bet_id=? "
                "AND audit_id=? AND action='award_operation'",
                (profile_id, source_id, "award-operation-" + group),
            ).fetchone():
                continue
            entry = groups.setdefault(group, {"ids": set(), "expected": 0})
            entry["ids"].add(member["free_bet_id"])
            entry["expected"] = max(entry["expected"], member["source_award_split_total"])
        if any(g["expected"] <= 0 or len(g["ids"]) != g["expected"] for g in groups.values()):
            raise HTTPException(
                status_code=409,
                detail="Incomplete legacy award needs review; a new operation cannot replace it.",
            )
        sql = "SELECT account_id FROM accounts WHERE profile_id=?"
        if db.postgres_runtime_enabled():
            sql += " FOR UPDATE"
        connection.execute(sql, (profile_id,)).fetchall()
        prepared = []
        for index, child in enumerate(request.children):
            p = child.model_dump()
            p.update(
                origin_qual_bet_id=source_id,
                source_award_group_id=request.operation_id,
                offer_group_id=request.operation_id,
                source_award_split_index=index + 1,
                source_award_split_total=len(request.children),
                source_award_expected_value=request.expected_award_value,
                source_award_variance_reason=request.variance_reason,
            )
            prepared.append(validate_write_payload(profile_id, p))
        return source_row, prepared

    # Durable intent is not issued credit. Failed business transactions retain this
    # pending, hash-bound identity for truthful retry after ambiguous delivery.
    with db.connect() as connection, db.reuse_mutation_connection(connection):
        lock_and_validate(connection)
        previous = connection.execute(
            "SELECT * FROM sportsbook_bet_audit WHERE audit_id=?", (audit_id,)
        ).fetchone()
        if previous:
            data = json.loads(previous["payload_json"])
            if (
                previous["profile_id"] != profile_id
                or previous["sportsbook_bet_id"] != source_id
                or data.get("request_hash") != digest
            ):
                raise HTTPException(
                    status_code=409,
                    detail="This award operation identity is bound to different reviewed contents.",
                )
        else:
            legacy = connection.execute(
                "SELECT 1 FROM free_bets WHERE source_award_group_id=? OR offer_group_id=? LIMIT 1",
                (request.operation_id, request.operation_id),
            ).fetchone()
            if legacy:
                raise HTTPException(
                    status_code=409,
                    detail="Legacy/partial group needs review; it cannot be replayed.",
                )
            data = {"state": "pending", "request_hash": digest, "request": canonical}
            connection.execute(
                "INSERT INTO sportsbook_bet_audit (audit_id,sportsbook_bet_id,profile_id,"
                "action,changed_at,payload_json) VALUES (?,?,?,?,?,?) "
                "ON CONFLICT(audit_id) DO NOTHING",
                (
                    audit_id,
                    source_id,
                    profile_id,
                    "award_operation",
                    db.utc_now(),
                    json.dumps(data, sort_keys=True),
                ),
            )
            claimed = connection.execute(
                "SELECT profile_id,sportsbook_bet_id,payload_json "
                "FROM sportsbook_bet_audit WHERE audit_id=?",
                (audit_id,),
            ).fetchone()
            if (
                claimed["profile_id"] != profile_id
                or claimed["sportsbook_bet_id"] != source_id
                or json.loads(claimed["payload_json"])["request_hash"] != digest
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Award identity is already bound to another reviewed request.",
                )

    with db.connect() as connection, db.reuse_mutation_connection(connection):
        source_row, prepared = lock_and_validate(connection)
        row = connection.execute(
            "SELECT payload_json FROM sportsbook_bet_audit WHERE audit_id=?", (audit_id,)
        ).fetchone()
        data = json.loads(row["payload_json"])
        if data["request_hash"] != digest:
            raise HTTPException(status_code=409, detail="Award contents changed.")
        if data["state"] == "committed":
            result = data["response"]
            surviving = {
                r["free_bet_id"]
                for r in connection.execute(
                    "SELECT free_bet_id FROM free_bets "
                    "WHERE profile_id=? AND source_award_group_id=?",
                    (profile_id, request.operation_id),
                ).fetchall()
            }
            result["removed_free_bet_ids"] = [
                ident for ident in result["free_bet_ids"] if ident not in surviving
            ]
            result["children"] = [c for c in result["children"] if c["free_bet_id"] in surviving]
            return result
        settings = db.get_profile_tracker_settings(profile_id)
        commissions = db.get_profile_exchange_commission_map(profile_id)
        children = []
        for payload in prepared:
            record = db.create_free_bet(profile_id, payload, transaction=connection)
            children.append(
                prepare_write_response(record, settings, commissions).model_dump(mode="json")
            )
        source_record = db.update_sportsbook_bet(
            profile_id, source_id, {"status": "Free Bet Awarded"}, transaction=connection
        )
        source_response = prepare_source(source_record, commissions).model_dump(mode="json")
        result = {
            "operation_id": request.operation_id,
            "group_id": request.operation_id,
            "free_bet_ids": [c["free_bet_id"] for c in children],
            "removed_free_bet_ids": [],
            "children": children,
            "source": source_response,
            "issued_face_value": format(total, ".2f"),
        }
        encoded = json.dumps(result, allow_nan=False, sort_keys=True)
        data.update(state="committed", response=json.loads(encoded))
        connection.execute(
            "UPDATE sportsbook_bet_audit SET payload_json=? WHERE audit_id=?",
            (json.dumps(data, allow_nan=False, sort_keys=True), audit_id),
        )
        return result
