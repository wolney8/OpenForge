from __future__ import annotations

from collections import Counter
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    connect,
    list_accounts,
    list_profile_exchange_commissions,
    upsert_profile_exchange_commission,
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
