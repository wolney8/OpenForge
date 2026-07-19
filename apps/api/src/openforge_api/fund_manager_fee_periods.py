from __future__ import annotations

import json
from calendar import monthrange
from dataclasses import asdict
from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from openforge_api.db import get_profile
from openforge_api.fee_base_reporting import build_monthly_settled_fee_base
from openforge_api.fee_period_store import (
    FeeCorrectionRecord,
    FeePeriodRecord,
    FeePeriodRevisionRecord,
    FeeWithdrawalLinkRecord,
    calculate_revision_values,
    create_fee_correction,
    create_fee_period,
    crystallise_fee_period,
    get_fee_period,
    link_fee_withdrawal,
    list_fee_period_revisions,
    list_fee_periods,
    mark_fee_withdrawn,
    reopen_fee_period,
    resolve_opening_loss_carryforward,
)

router = APIRouter(
    prefix="/profiles/{profile_id}/fee-periods",
    tags=["fund-manager-fees"],
)


class FeePeriodRevisionResponse(BaseModel):
    fee_revision_id: str
    profile_id: str
    fee_period_id: str
    revision_number: int
    reporting_basis: str
    fee_base_source_version: str
    fee_base_breakdown_json: str
    eligible_period_profit: str
    opening_loss_carryforward: str
    closing_loss_carryforward: str
    fee_base: str
    management_fee_percent: str
    investment_fee_percent: str
    management_fee_amount: str
    investment_fee_amount: str
    total_fee_due: str
    fee_package_id: str
    fee_package_version: int | None
    change_reason: str
    created_by: str
    created_at: str


class FeeWithdrawalLinkResponse(BaseModel):
    fee_withdrawal_link_id: str
    profile_id: str
    fee_period_id: str
    fee_revision_id: str
    cash_adjustment_id: str
    component: str
    amount: str
    created_by: str
    created_at: str


class FeeCorrectionResponse(BaseModel):
    fee_correction_id: str
    profile_id: str
    source_fee_period_id: str
    target_fee_period_id: str | None
    adjustment_type: str
    amount: str
    reason: str
    state: str
    created_by: str
    created_at: str
    applied_at: str | None


class FeePeriodResponse(BaseModel):
    fee_period_id: str
    profile_id: str
    period_start: str
    period_end: str
    state: str
    current_revision_number: int
    crystallised_at: str | None
    crystallised_by: str | None
    reopened_at: str | None
    reopened_by: str | None
    created_at: str
    updated_at: str
    current_revision: FeePeriodRevisionResponse
    withdrawal_links: list[FeeWithdrawalLinkResponse]
    corrections: list[FeeCorrectionResponse]
    fee_withdrawn_amount: str
    fee_outstanding_amount: str


def serialize_period(record: FeePeriodRecord) -> FeePeriodResponse:
    payload = asdict(record)
    payload["withdrawal_links"] = list(payload["withdrawal_links"])
    payload["corrections"] = list(payload["corrections"])
    return FeePeriodResponse.model_validate(payload)


def serialize_withdrawal_link(record: FeeWithdrawalLinkRecord) -> FeeWithdrawalLinkResponse:
    return FeeWithdrawalLinkResponse.model_validate(asdict(record))


def serialize_revision(record: FeePeriodRevisionRecord) -> FeePeriodRevisionResponse:
    return FeePeriodRevisionResponse.model_validate(asdict(record))


def serialize_correction(record: FeeCorrectionRecord) -> FeeCorrectionResponse:
    return FeeCorrectionResponse.model_validate(asdict(record))


class FeeActionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateFeePeriodPayload(FeeActionPayload):
    fee_period_id: str | None = Field(default=None, min_length=1, max_length=80)
    period_start: date
    period_end: date
    reporting_basis: Literal["settled_final"] = "settled_final"
    fee_package_id: str = Field(default="", max_length=80)
    fee_package_version: int | None = Field(default=None, ge=1)
    actor_id: str = Field(min_length=1, max_length=120)

    @model_validator(mode="after")
    def require_calendar_month(self) -> "CreateFeePeriodPayload":
        final_day = monthrange(self.period_start.year, self.period_start.month)[1]
        if self.period_start.day != 1 or self.period_end != date(
            self.period_start.year, self.period_start.month, final_day
        ):
            raise ValueError("Fee crystallisation period must be one complete calendar month")
        if self.period_end >= date.today():
            raise ValueError("Fee crystallisation period must be a completed calendar month")
        return self


class ConfirmFeePeriodPayload(FeeActionPayload):
    actor_id: str = Field(min_length=1, max_length=120)
    confirmation: Literal[True]


class ReopenFeePeriodPayload(FeeActionPayload):
    actor_id: str = Field(min_length=1, max_length=120)
    reason: str = Field(min_length=1, max_length=1000)


class FeeBaseBlockerResponse(BaseModel):
    module: str
    record_id: str
    reason: str


class FeePeriodPreviewResponse(BaseModel):
    profile_id: str
    period_start: str
    period_end: str
    reporting_basis: Literal["settled_final"]
    calculation_state: str
    sportsbook_total: str
    sportsbook_count: int
    free_bet_total: str
    free_bet_count: int
    casino_total: str
    casino_count: int
    eligible_period_profit: str | None
    opening_loss_carryforward: str | None
    closing_loss_carryforward: str | None
    fee_base: str | None
    management_fee_percent: str
    investment_fee_percent: str
    management_fee_amount: str | None
    investment_fee_amount: str | None
    total_fee_due: str | None
    included_record_ids: list[str]
    blockers: list[FeeBaseBlockerResponse]


def derive_fee_period_values(
    profile_id: str, *, period_start: date, period_end: date
) -> tuple[FeePeriodPreviewResponse, dict[str, str] | None, str]:
    profile = get_profile(profile_id)
    if profile is None:
        raise LookupError("profile_not_found")
    report = build_monthly_settled_fee_base(
        profile_id,
        period_start=period_start,
        period_end=period_end,
    )
    opening_loss: str | None = None
    values: dict[str, str] | None = None
    blockers = [FeeBaseBlockerResponse.model_validate(asdict(row)) for row in report.blockers]
    if not blockers:
        try:
            opening_loss = resolve_opening_loss_carryforward(
                profile_id, period_start.isoformat()
            )
        except ValueError as error:
            blockers.append(
                FeeBaseBlockerResponse(
                    module="fee_period",
                    record_id=period_start.isoformat(),
                    reason=str(error),
                )
            )
    if not blockers and report.eligible_period_profit is not None and opening_loss is not None:
        values = calculate_revision_values(
            profile_id=profile_id,
            eligible_period_profit=str(report.eligible_period_profit),
            opening_loss_carryforward=opening_loss,
            management_fee_percent=profile.management_fee_percent,
            investment_fee_percent=profile.investment_fee_percent,
        )
    preview = FeePeriodPreviewResponse(
        profile_id=profile_id,
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        reporting_basis="settled_final",
        calculation_state="blocked" if blockers else "resolved",
        sportsbook_total=f"{report.sportsbook_total:.2f}",
        sportsbook_count=report.sportsbook_count,
        free_bet_total=f"{report.free_bet_total:.2f}",
        free_bet_count=report.free_bet_count,
        casino_total=f"{report.casino_total:.2f}",
        casino_count=report.casino_count,
        eligible_period_profit=(
            None
            if report.eligible_period_profit is None
            else f"{report.eligible_period_profit:.2f}"
        ),
        opening_loss_carryforward=opening_loss,
        closing_loss_carryforward=None if values is None else values["closing_loss_carryforward"],
        fee_base=None if values is None else values["fee_base"],
        management_fee_percent=profile.management_fee_percent,
        investment_fee_percent=profile.investment_fee_percent,
        management_fee_amount=None if values is None else values["management_fee_amount"],
        investment_fee_amount=None if values is None else values["investment_fee_amount"],
        total_fee_due=None if values is None else values["total_fee_due"],
        included_record_ids=list(report.included_record_ids),
        blockers=blockers,
    )
    audit_json = json.dumps(
        {
            "source_version": "monthly-settled-final-v1",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "module_totals": {
                "sportsbook": preview.sportsbook_total,
                "free_bet": preview.free_bet_total,
                "casino": preview.casino_total,
            },
            "included_rows": [asdict(row) for row in report.included_entries],
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return preview, values, audit_json


class CreateFeeCorrectionPayload(FeeActionPayload):
    actor_id: str = Field(min_length=1, max_length=120)
    reason: str = Field(min_length=1, max_length=1000)
    corrected_fee_due: Decimal = Field(ge=0)
    profile_closing: bool = False
    target_fee_period_id: str | None = Field(default=None, min_length=1, max_length=80)


class LinkFeeWithdrawalPayload(FeeActionPayload):
    actor_id: str = Field(min_length=1, max_length=120)
    cash_adjustment_id: str = Field(min_length=1, max_length=80)
    component: Literal["management", "investment"]


class MarkFeeWithdrawnPayload(FeeActionPayload):
    actor_id: str = Field(min_length=1, max_length=120)
    adjustment_date: date
    linked_account: str = Field(min_length=1, max_length=120)
    management_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    investment_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)

    @model_validator(mode="after")
    def require_withdrawal_amount(self) -> "MarkFeeWithdrawnPayload":
        if self.management_amount == 0 and self.investment_amount == 0:
            raise ValueError("At least one fee component amount is required")
        return self


def handle_value_error(error: ValueError) -> HTTPException:
    detail = str(error)
    status_code = 409 if detail in {
        "fee_period_already_exists",
        "cash_adjustment_already_linked",
    } else 422
    return HTTPException(status_code=status_code, detail=detail)


@router.get("", response_model=list[FeePeriodResponse])
def list_profile_fee_periods(profile_id: str) -> list[FeePeriodResponse]:
    return [serialize_period(period) for period in list_fee_periods(profile_id)]


@router.post("/preview", response_model=FeePeriodPreviewResponse)
def preview_profile_fee_period(
    profile_id: str, payload: CreateFeePeriodPayload
) -> FeePeriodPreviewResponse:
    try:
        preview, _, _ = derive_fee_period_values(
            profile_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
        )
    except LookupError as error:
        raise HTTPException(status_code=404, detail="Profile not found") from error
    return preview


@router.get("/{fee_period_id}", response_model=FeePeriodResponse)
def get_profile_fee_period(profile_id: str, fee_period_id: str) -> FeePeriodResponse:
    period = get_fee_period(profile_id, fee_period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return serialize_period(period)


@router.get(
    "/{fee_period_id}/revisions",
    response_model=list[FeePeriodRevisionResponse],
)
def list_profile_fee_period_revisions(
    profile_id: str, fee_period_id: str
) -> list[FeePeriodRevisionResponse]:
    revisions = list_fee_period_revisions(profile_id, fee_period_id)
    if revisions is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return [serialize_revision(revision) for revision in revisions]


@router.post("", response_model=FeePeriodResponse, status_code=201)
def create_profile_fee_period(
    profile_id: str, payload: CreateFeePeriodPayload
) -> FeePeriodResponse:
    try:
        preview, values, audit_json = derive_fee_period_values(
            profile_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
        )
        if values is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "fee_base_blocked",
                    "blockers": [row.model_dump() for row in preview.blockers],
                },
            )
        period = create_fee_period(
            profile_id,
            {
                **payload.model_dump(mode="json"),
                "eligible_period_profit": values["eligible_period_profit"],
                "opening_loss_carryforward": values["opening_loss_carryforward"],
                "fee_base_source_version": "monthly-settled-final-v1",
                "fee_base_breakdown_json": audit_json,
            },
        )
    except LookupError as error:
        raise HTTPException(status_code=404, detail="Profile not found") from error
    except ValueError as error:
        raise handle_value_error(error) from error
    return serialize_period(period)


@router.post("/{fee_period_id}/crystallise", response_model=FeePeriodResponse)
def confirm_profile_fee_period(
    profile_id: str,
    fee_period_id: str,
    payload: ConfirmFeePeriodPayload,
) -> FeePeriodResponse:
    try:
        current = get_fee_period(profile_id, fee_period_id)
        if current is None:
            raise HTTPException(
                status_code=404, detail="Fee period not found for this profile"
            )
        preview, values, _ = derive_fee_period_values(
            profile_id,
            period_start=date.fromisoformat(current.period_start),
            period_end=date.fromisoformat(current.period_end),
        )
        if values is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "fee_base_blocked",
                    "blockers": [row.model_dump() for row in preview.blockers],
                },
            )
        revision = current.current_revision
        expected = {
            "eligible_period_profit": revision.eligible_period_profit,
            "opening_loss_carryforward": revision.opening_loss_carryforward,
            "closing_loss_carryforward": revision.closing_loss_carryforward,
            "fee_base": revision.fee_base,
            "management_fee_amount": revision.management_fee_amount,
            "investment_fee_amount": revision.investment_fee_amount,
            "total_fee_due": revision.total_fee_due,
        }
        if any(values[key] != value for key, value in expected.items()):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "fee_period_review_stale",
                    "message": (
                        "Ledger values changed after this fee review was prepared. "
                        "Reopen the review before confirming."
                    ),
                },
            )
        period = crystallise_fee_period(profile_id, fee_period_id, actor_id=payload.actor_id)
    except ValueError as error:
        raise handle_value_error(error) from error
    if period is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return serialize_period(period)


@router.post("/{fee_period_id}/reopen", response_model=FeePeriodResponse)
def reopen_profile_fee_period(
    profile_id: str,
    fee_period_id: str,
    payload: ReopenFeePeriodPayload,
) -> FeePeriodResponse:
    try:
        current = get_fee_period(profile_id, fee_period_id)
        if current is None:
            raise HTTPException(
                status_code=404, detail="Fee period not found for this profile"
            )
        preview, values, audit_json = derive_fee_period_values(
            profile_id,
            period_start=date.fromisoformat(current.period_start),
            period_end=date.fromisoformat(current.period_end),
        )
        if values is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "fee_base_blocked",
                    "blockers": [row.model_dump() for row in preview.blockers],
                },
            )
        period = reopen_fee_period(
            profile_id,
            fee_period_id,
            {
                **payload.model_dump(),
                "eligible_period_profit": values["eligible_period_profit"],
                "opening_loss_carryforward": values["opening_loss_carryforward"],
                "fee_base_source_version": "monthly-settled-final-v1",
                "fee_base_breakdown_json": audit_json,
            },
        )
    except ValueError as error:
        raise handle_value_error(error) from error
    if period is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return serialize_period(period)


@router.post(
    "/{fee_period_id}/corrections",
    response_model=FeeCorrectionResponse,
    status_code=201,
)
def create_profile_fee_correction(
    profile_id: str,
    fee_period_id: str,
    payload: CreateFeeCorrectionPayload,
) -> FeeCorrectionResponse:
    try:
        correction = create_fee_correction(
            profile_id,
            fee_period_id,
            {**payload.model_dump(), "corrected_fee_due": str(payload.corrected_fee_due)},
        )
    except ValueError as error:
        raise handle_value_error(error) from error
    if correction is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return serialize_correction(correction)


@router.post(
    "/{fee_period_id}/withdrawal-links",
    response_model=FeeWithdrawalLinkResponse,
    status_code=201,
)
def create_profile_fee_withdrawal_link(
    profile_id: str,
    fee_period_id: str,
    payload: LinkFeeWithdrawalPayload,
) -> FeeWithdrawalLinkResponse:
    try:
        link = link_fee_withdrawal(profile_id, fee_period_id, payload.model_dump())
    except ValueError as error:
        raise handle_value_error(error) from error
    if link is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return serialize_withdrawal_link(link)


@router.post(
    "/{fee_period_id}/mark-withdrawn",
    response_model=FeePeriodResponse,
)
def mark_profile_fee_withdrawn(
    profile_id: str,
    fee_period_id: str,
    payload: MarkFeeWithdrawnPayload,
) -> FeePeriodResponse:
    try:
        period = mark_fee_withdrawn(
            profile_id,
            fee_period_id,
            payload.model_dump(mode="json"),
        )
    except ValueError as error:
        raise handle_value_error(error) from error
    if period is None:
        raise HTTPException(status_code=404, detail="Fee period not found for this profile")
    return serialize_period(period)
    calculate_revision_values,
