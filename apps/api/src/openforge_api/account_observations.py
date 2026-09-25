"""Explicit Account balance evidence, stored separately from betting results."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation, localcontext
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from openforge_api.accounts import build_account_response
from openforge_api.db import (
    connect,
    connect_read_only,
    get_account,
    get_profile,
    map_balance_snapshot_row,
    postgres_runtime_enabled,
    reuse_mutation_connection,
    write_account_audit_entry,
)
from openforge_api.money_input import normalize_money_input

router = APIRouter(
    prefix="/profiles/{profile_id}/accounts/{account_id}/balance-observations", tags=["accounts"]
)
PREFIX = "account-observation-v1:"


def observation_time() -> str:
    return datetime.now(UTC).isoformat(timespec="microseconds").replace("+00:00", "Z")


def append_observation(
    connection: Any,
    profile_id: str,
    account_id: str,
    amount: str,
    reason: str,
    *,
    source: str,
    timestamp: str,
    operation_id: str | None = None,
) -> dict[str, Any]:
    record = {
        "balance_snapshot_id": "AO-" + (operation_id or str(uuid4())),
        "profile_id": profile_id,
        "snapshot_at": timestamp,
        "snapshot_type": PREFIX + source,
        "account_id": account_id,
        "balance_amount": amount,
        "notes": reason,
        "created_at": timestamp,
    }
    connection.execute(
        """INSERT INTO balance_snapshots
        (balance_snapshot_id,profile_id,snapshot_at,snapshot_type,account_id,balance_amount,notes,created_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        tuple(record.values()),
    )
    return record


def observations(connection: Any, profile_id: str, account_id: str) -> list[dict[str, Any]]:
    rows = connection.execute(
        """SELECT * FROM balance_snapshots
        WHERE profile_id=? AND account_id=?
        ORDER BY snapshot_at DESC, created_at DESC, balance_snapshot_id DESC""",
        (profile_id, account_id),
    ).fetchall()
    return [map_balance_snapshot_row(row).__dict__ for row in rows]


def latest_identity(rows: list[dict[str, Any]]) -> str:
    return next(
        (
            str(row["balance_snapshot_id"])
            for row in rows
            if str(row["snapshot_type"]).startswith(PREFIX)
        ),
        "",
    )


class ConfirmBalancePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operation_id: UUID
    balance_amount: str = Field(min_length=1, max_length=40)
    reason: str = Field(default="", max_length=500)
    expected_balance: str = Field(max_length=40)
    expected_observation_id: str = Field(max_length=64)

    @field_validator("balance_amount")
    @classmethod
    def exact_known_money(cls, value: str) -> str:
        normalized = normalize_money_input(value, "Observed balance")
        if not normalized:
            raise ValueError("Enter a known observed balance; missing is not zero.")
        return normalized


@router.get("")
def read_observations(profile_id: str, account_id: str) -> dict[str, Any]:
    with connect_read_only() as connection, reuse_mutation_connection(connection):
        account = get_account(profile_id, account_id)
        if account is None:
            raise HTTPException(404, "Account not found for this Profile")
        rows = observations(connection, profile_id, account_id)
        for index, row in enumerate(rows):
            row["balance_change"] = None
            if index + 1 < len(rows):
                try:
                    with localcontext() as context:
                        context.prec = 80
                        current = normalize_money_input(row["balance_amount"], "Observed balance")
                        previous = normalize_money_input(
                            rows[index + 1]["balance_amount"], "Previous balance"
                        )
                        difference = Decimal(current) - Decimal(previous)
                    if difference.is_finite():
                        row["balance_change"] = format(difference, ".2f")
                except (InvalidOperation, ValueError):
                    pass
        profile = get_profile(profile_id)
        return {
            "profile_name": profile.display_name if profile else "",
            "account": build_account_response(account).model_dump(),
            "observations": rows,
            "latest_observation_id": latest_identity(rows),
        }


@router.post("")
def confirm_balance(profile_id: str, account_id: str, payload: ConfirmBalancePayload) -> Any:
    from fastapi.responses import JSONResponse

    try:
        with connect() as connection, reuse_mutation_connection(connection):
            suffix = " FOR UPDATE" if postgres_runtime_enabled() else ""
            current = connection.execute(
                "SELECT * FROM accounts WHERE profile_id=? AND account_id=?" + suffix,
                (profile_id, account_id),
            ).fetchone()
            if current is None:
                raise HTTPException(404, "Account not found for this Profile")
            identity = "AO-" + str(payload.operation_id)
            prior = connection.execute(
                "SELECT * FROM balance_snapshots WHERE balance_snapshot_id=?", (identity,)
            ).fetchone()
            if prior is not None:
                if any(
                    prior[k] != v
                    for k, v in {
                        "profile_id": profile_id,
                        "account_id": account_id,
                        "balance_amount": payload.balance_amount,
                        "notes": payload.reason,
                        "snapshot_type": PREFIX + "manual-confirmation",
                    }.items()
                ):
                    raise HTTPException(
                        409, "This confirmation ID was already used for different information."
                    )
                saved = map_balance_snapshot_row(prior).__dict__
                status = 200
            else:
                if current["status"] == "Archived" or current["lifecycle_status"] == "Archived":
                    raise HTTPException(
                        409,
                        "Archived Accounts retain history but cannot receive a new confirmation.",
                    )
                latest = latest_identity(observations(connection, profile_id, account_id))
                if (
                    current["current_balance"] != payload.expected_balance
                    or latest != payload.expected_observation_id
                ):
                    raise HTTPException(
                        409,
                        "The Account balance was updated elsewhere. "
                        "Reload its observations before confirming.",
                    )
                timestamp = observation_time()
                connection.execute(
                    """UPDATE accounts SET current_balance=?,last_balance_update=?,updated_at=?
                    WHERE profile_id=? AND account_id=?""",
                    (payload.balance_amount, timestamp, timestamp, profile_id, account_id),
                )
                saved = append_observation(
                    connection,
                    profile_id,
                    account_id,
                    payload.balance_amount,
                    payload.reason,
                    source="manual-confirmation",
                    timestamp=timestamp,
                    operation_id=str(payload.operation_id),
                )
                write_account_audit_entry(
                    connection, account_id, profile_id, "balance_confirmed", saved
                )
                status = 201
            account = get_account(profile_id, account_id)
            assert account is not None
            response = {
                "account": build_account_response(account).model_dump(),
                "observation": saved,
            }
        return JSONResponse(status_code=status, content=response)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            503, "Balance was not confirmed. Your draft is retained; retry the same confirmation."
        ) from error
