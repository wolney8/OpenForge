from __future__ import annotations

import json
import sqlite3
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    connect,
    get_account,
    list_accounts,
    list_profile_exchange_commissions,
    resolve_profile_exchange_commission,
    upsert_profile_exchange_commission,
    utc_now,
)

router = APIRouter(prefix="/profiles/{profile_id}/exchange-commissions", tags=["exchange-settings"])


class ExchangeCommissionPayload(BaseModel):
    exchange_name: str = Field(min_length=1, max_length=120)
    commission_rate: str = Field(default="", max_length=40)

    @field_validator("commission_rate")
    @classmethod
    def validate_decimal(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            return normalized
        try:
            parsed = Decimal(normalized)
        except InvalidOperation as error:
            raise ValueError("commission_rate must be a decimal fraction") from error
        if parsed < Decimal("0") or parsed > Decimal("1"):
            raise ValueError("commission_rate must be between 0 and 1")
        return normalized


class ExchangeCommissionResponse(ExchangeCommissionPayload):
    profile_id: str
    created_at: str
    updated_at: str
    configured: bool = True
    suggested_commission_rate: str = ""
    suggestion_source: str = ""


class ExchangeCommissionResolutionResponse(BaseModel):
    commission_rate: str
    source: str
    source_label: str
    offer_id: str = ""


class ExchangeCommissionOfferPayload(BaseModel):
    account_id: str = Field(min_length=1, max_length=64)
    commission_rate: Decimal = Field(ge=0, le=1)
    effective_start: date
    effective_end: date
    source_label: str = Field(min_length=1, max_length=120)
    owner_note: str = Field(default="", max_length=1000)
    status: str = Field(default="Active", pattern="^(Active|Ended|Cancelled)$")

    @field_validator("commission_rate", mode="before")
    @classmethod
    def preserve_zero_commission(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("commission_rate is required; blank is not zero")
        return value

    @field_validator("effective_end")
    @classmethod
    def validate_date_order(cls, value: date, info) -> date:
        start = info.data.get("effective_start")
        if isinstance(start, date) and value < start:
            raise ValueError("effective_end must be on or after effective_start")
        return value


class ExchangeCommissionOfferResponse(BaseModel):
    offer_id: str
    profile_id: str
    account_id: str
    exchange_name: str
    commission_rate: str
    effective_start: str
    effective_end: str
    status: str
    source_label: str
    owner_note: str
    created_at: str
    updated_at: str


def _commission_suggestions() -> dict[str, str]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT exchange_name, commission_rate
            FROM profile_exchange_commissions
            WHERE TRIM(commission_rate) <> ''
            """
        ).fetchall()
    grouped: dict[str, list[str]] = {}
    for row in rows:
        grouped.setdefault(str(row["exchange_name"]).casefold(), []).append(
            str(row["commission_rate"])
        )
    return {
        exchange_name: Counter(values).most_common(1)[0][0]
        for exchange_name, values in grouped.items()
    }


@router.get("", response_model=list[ExchangeCommissionResponse])
def list_exchange_commissions(profile_id: str) -> list[ExchangeCommissionResponse]:
    configured = {
        record.exchange_name.casefold(): record
        for record in list_profile_exchange_commissions(profile_id)
    }
    exchanges = {
        account.account.casefold(): account.account
        for account in list_accounts(profile_id)
        if account.type.casefold() == "exchange"
        and account.lifecycle_status.casefold() != "archived"
    }
    suggestions = _commission_suggestions()
    rows: list[ExchangeCommissionResponse] = []
    for key, exchange_name in sorted(exchanges.items(), key=lambda item: item[1].casefold()):
        record = configured.get(key)
        if record is not None:
            suggestion = suggestions.get(key, "") if not record.commission_rate.strip() else ""
            rows.append(
                ExchangeCommissionResponse(
                    **record.__dict__,
                    configured=bool(record.commission_rate.strip()),
                    suggested_commission_rate=suggestion,
                    suggestion_source=(
                        "Existing Profile convention" if suggestion else ""
                    ),
                )
            )
            continue
        suggestion = suggestions.get(key, "")
        rows.append(
            ExchangeCommissionResponse(
                profile_id=profile_id,
                exchange_name=exchange_name,
                commission_rate="",
                created_at="",
                updated_at="",
                configured=False,
                suggested_commission_rate=suggestion,
                suggestion_source=(
                    "Existing Profile convention" if suggestion else ""
                ),
            )
        )
    for key, record in configured.items():
        if key not in exchanges:
            rows.append(
                ExchangeCommissionResponse(
                    **record.__dict__,
                    configured=bool(record.commission_rate.strip()),
                )
            )
    return sorted(rows, key=lambda row: row.exchange_name.casefold())


@router.put("", response_model=ExchangeCommissionResponse)
def save_exchange_commission(
    profile_id: str, payload: ExchangeCommissionPayload
) -> ExchangeCommissionResponse:
    saved = upsert_profile_exchange_commission(
        profile_id,
        payload.exchange_name,
        payload.commission_rate,
    )
    return ExchangeCommissionResponse.model_validate(saved.__dict__)


@router.get("/resolve", response_model=ExchangeCommissionResolutionResponse)
def resolve_exchange_commission(
    profile_id: str, exchange_name: str, effective_date: date
) -> ExchangeCommissionResolutionResponse:
    return ExchangeCommissionResolutionResponse.model_validate(
        resolve_profile_exchange_commission(
            profile_id, exchange_name, effective_date=effective_date.isoformat()
        ).__dict__
    )


def _offer_response(row: sqlite3.Row) -> ExchangeCommissionOfferResponse:
    return ExchangeCommissionOfferResponse.model_validate(dict(row))


def _validate_offer_account(profile_id: str, account_id: str):
    account = get_account(profile_id, account_id)
    if account is None or account.type != "Exchange":
        raise ValueError("Commission offers require a Profile Exchange Account")
    return account


def _assert_no_offer_overlap(
    *, profile_id: str, account_id: str, start: str, end: str, exclude_offer_id: str = ""
) -> None:
    with connect() as connection:
        overlap = connection.execute(
            """
            SELECT offer_id FROM profile_exchange_commission_offers
            WHERE profile_id = ? AND account_id = ? AND status = 'Active'
              AND NOT (effective_end < ? OR effective_start > ?)
              AND offer_id <> ?
            LIMIT 1
            """,
            (profile_id, account_id, start, end, exclude_offer_id),
        ).fetchone()
    if overlap is not None:
        raise ValueError("Commission offer dates overlap an existing active offer")


@router.get("/offers", response_model=list[ExchangeCommissionOfferResponse])
def list_exchange_commission_offers(
    profile_id: str, account_id: str = ""
) -> list[ExchangeCommissionOfferResponse]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT o.*, a.account AS exchange_name
            FROM profile_exchange_commission_offers o
            JOIN accounts a ON a.account_id = o.account_id AND a.profile_id = o.profile_id
            WHERE o.profile_id = ? AND (? = '' OR o.account_id = ?)
            ORDER BY o.effective_start DESC, o.created_at DESC
            """,
            (profile_id, account_id, account_id),
        ).fetchall()
    return [_offer_response(row) for row in rows]


@router.post("/offers", response_model=ExchangeCommissionOfferResponse, status_code=201)
def create_exchange_commission_offer(
    profile_id: str, payload: ExchangeCommissionOfferPayload
) -> ExchangeCommissionOfferResponse:
    try:
        account = _validate_offer_account(profile_id, payload.account_id)
        _assert_no_offer_overlap(
            profile_id=profile_id,
            account_id=payload.account_id,
            start=payload.effective_start.isoformat(),
            end=payload.effective_end.isoformat(),
        )
    except ValueError as error:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(error)) from error
    now = utc_now()
    offer_id = f"ECO-{uuid4().hex[:12].upper()}"
    record = {
        "offer_id": offer_id,
        "profile_id": profile_id,
        "account_id": payload.account_id,
        "commission_rate": str(payload.commission_rate),
        "effective_start": payload.effective_start.isoformat(),
        "effective_end": payload.effective_end.isoformat(),
        "status": payload.status,
        "source_label": payload.source_label.strip(),
        "owner_note": payload.owner_note.strip(),
        "created_at": now,
        "updated_at": now,
    }
    with connect() as connection:
        connection.execute(
            """INSERT INTO profile_exchange_commission_offers
            (offer_id, profile_id, account_id, commission_rate, effective_start,
             effective_end, status, source_label, owner_note, created_at, updated_at)
            VALUES (:offer_id, :profile_id, :account_id, :commission_rate, :effective_start,
                    :effective_end, :status, :source_label, :owner_note,
                    :created_at, :updated_at)""",
            record,
        )
        connection.execute(
            """INSERT INTO profile_exchange_commission_offer_audit
            (audit_id, offer_id, profile_id, account_id, action, payload_json, changed_at)
            VALUES (?, ?, ?, ?, 'created', ?, ?)""",
            (f"ECOA-{uuid4().hex[:12].upper()}", offer_id, profile_id,
             payload.account_id, json.dumps(record, sort_keys=True), now),
        )
        row = connection.execute(
            """SELECT o.*, a.account AS exchange_name
            FROM profile_exchange_commission_offers o JOIN accounts a USING(account_id)
            WHERE o.offer_id = ? AND o.profile_id = ?""",
            (offer_id, profile_id),
        ).fetchone()
    assert row is not None and account is not None
    return _offer_response(row)


@router.put("/offers/{offer_id}", response_model=ExchangeCommissionOfferResponse)
def update_exchange_commission_offer(
    profile_id: str, offer_id: str, payload: ExchangeCommissionOfferPayload
) -> ExchangeCommissionOfferResponse:
    try:
        _validate_offer_account(profile_id, payload.account_id)
        if payload.status == "Active":
            _assert_no_offer_overlap(
                profile_id=profile_id, account_id=payload.account_id,
                start=payload.effective_start.isoformat(), end=payload.effective_end.isoformat(),
                exclude_offer_id=offer_id,
            )
    except ValueError as error:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(error)) from error
    now = utc_now()
    values = {
        "offer_id": offer_id, "profile_id": profile_id, "account_id": payload.account_id,
        "commission_rate": str(payload.commission_rate),
        "effective_start": payload.effective_start.isoformat(),
        "effective_end": payload.effective_end.isoformat(),
        "status": payload.status, "source_label": payload.source_label.strip(),
        "owner_note": payload.owner_note.strip(), "updated_at": now,
    }
    with connect() as connection:
        previous = connection.execute(
            "SELECT * FROM profile_exchange_commission_offers WHERE offer_id=? AND profile_id=?",
            (offer_id, profile_id),
        ).fetchone()
        if previous is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Commission offer not found")
        connection.execute(
            """UPDATE profile_exchange_commission_offers SET account_id=:account_id,
            commission_rate=:commission_rate, effective_start=:effective_start,
            effective_end=:effective_end, status=:status, source_label=:source_label,
            owner_note=:owner_note, updated_at=:updated_at
            WHERE offer_id=:offer_id AND profile_id=:profile_id""", values,
        )
        connection.execute(
            """INSERT INTO profile_exchange_commission_offer_audit
            (audit_id, offer_id, profile_id, account_id, action, payload_json, changed_at)
            VALUES (?, ?, ?, ?, 'updated', ?, ?)""",
            (f"ECOA-{uuid4().hex[:12].upper()}", offer_id, profile_id, payload.account_id,
             json.dumps({"before": dict(previous), "after": values}, sort_keys=True), now),
        )
        row = connection.execute(
            """SELECT o.*, a.account AS exchange_name FROM profile_exchange_commission_offers o
            JOIN accounts a USING(account_id) WHERE o.offer_id=? AND o.profile_id=?""",
            (offer_id, profile_id),
        ).fetchone()
    assert row is not None
    return _offer_response(row)
