from __future__ import annotations

import hashlib
import json
from base64 import b64decode
from binascii import Error as Base64Error
from collections import Counter
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any, Callable, Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field, ValidationError

from openforge_api.account_catalogue_source import (
    MasterAccountCatalogueRecord,
    load_master_account_catalogue,
)
from openforge_api.accounts import AccountPayload
from openforge_api.backups import create_verified_local_backup
from openforge_api.calculations.cash_adjustment_values import (
    CashAdjustmentCalculationInput,
    calculate_cash_adjustment_values,
)
from openforge_api.calculations.casino_offer_values import (
    CasinoOfferCalculationInput,
    calculate_casino_offer_values,
)
from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    calculate_free_bet_current_value,
)
from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
)
from openforge_api.cash_adjustments import CashAdjustmentPayload
from openforge_api.cash_adjustments import build_response as build_cash_adjustment_response
from openforge_api.casino_offers import CasinoOfferPayload
from openforge_api.casino_offers import build_response as build_casino_offer_response
from openforge_api.db import (
    AccountRecord,
    CashAdjustmentRecord,
    CasinoOfferRecord,
    FreeBetRecord,
    ImportBatchRecord,
    ImportSourceRecord,
    ImportStagedRowRecord,
    confirm_account_import_batch,
    confirm_cash_adjustment_import_batch,
    confirm_casino_offer_import_batch,
    confirm_free_bet_import_batch,
    confirm_sportsbook_import_batch,
    create_import_batch,
    delete_unconfirmed_import_batch,
    get_account,
    get_account_by_id,
    get_cash_adjustment_by_id,
    get_casino_offer_by_id,
    get_free_bet_by_id,
    get_import_batch,
    get_import_source_record,
    get_import_source_record_for_entity,
    get_profile,
    get_profile_exchange_commission,
    get_profile_tracker_settings,
    get_sportsbook_bet_by_id,
    list_accounts,
    list_cash_adjustments,
    list_casino_offers,
    list_free_bets,
    list_import_batches,
    list_sportsbook_bets,
)
from openforge_api.free_bets import FreeBetPayload
from openforge_api.free_bets import build_response as build_free_bet_response
from openforge_api.sportsbook import SportsbookBetPayload, build_response
from openforge_api.xlsx_export import (
    build_account_export,
    build_cash_adjustment_export,
    build_casino_offer_export,
    build_free_bet_export,
    build_sportsbook_export,
)
from openforge_api.xlsx_import import (
    ParsedAccountSheet,
    ParsedCashAdjustmentSheet,
    ParsedCasinoOfferSheet,
    ParsedFreeBetSheet,
    ParsedSportsbookSheet,
    XlsxImportError,
    detect_supported_ledger_xlsx,
    parse_account_xlsx,
    parse_cash_adjustment_xlsx,
    parse_casino_offer_xlsx,
    parse_free_bet_xlsx,
    parse_sportsbook_xlsx,
)

router = APIRouter(prefix="/profiles/{profile_id}/imports", tags=["imports"])

SUPPORTED_SHEETS = {
    "Accounts",
    "Sportsbook Bets",
    "Free Bets",
    "Casino Offers",
    "Cash Adjustments",
    "Settings",
    "Reports",
}
EXCLUDED_SHEETS = {"SignupUsers"}
VALID_STATUSES = {
    "Sportsbook Bets": {
        "Prospecting",
        "Not Placed",
        "Placed",
        "Settled",
        "Void",
        "Cancelled",
        "Error",
        "Free Bet Awarded",
    },
    "Free Bets": {
        "Prospecting",
        "Available",
        "Placed",
        "Settled",
        "Expired",
        "Void",
        "Converted",
        "Error",
        "Not Yet Awarded",
    },
    "Casino Offers": {"Prospecting", "Started", "In Progress", "Settled"},
}
SPORTSBOOK_SOURCE_MAP = {
    "DateSettling": "date_settled",
    "EventName": "event_name",
    "Market": "market",
    "Offer": "offer_text",
    "Bookmaker": "bookmaker",
    "OfferType": "offer_type",
    "BetType": "bet_type",
    "OfferName": "offer_name",
    "FixtureType": "fixture_type",
    "Status": "status",
    "Result": "result",
    "BackStake": "back_stake",
    "BackOdds": "back_odds",
    "MatchStrategy": "match_strategy",
    "LayOdds1": "lay_odds_1",
    "Exchange": "exchange_name",
    "Lay (Actual)": "lay_actual",
    "LayMatchedStake1": "lay_matched_stake_1",
    "UserNotes": "user_notes",
    "ManualOverrideValue": "manual_override_value",
    "ManualOverrideReason": "manual_override_reason",
    "BonusTrigger": "bonus_trigger",
    "MaximumBonus": "maximum_bonus",
    "BonusRetentionRate": "bonus_retention_rate",
    "MultiLayOutcome1Name": "multi_lay_outcome_1_name",
    "MultiLayOutcomesJson": "multi_lay_outcomes_json",
}
SPORTSBOOK_ADVANCED_BRANCH_FIELDS = {
    "LayOdds2",
    "LayOdds3",
    "LayStake2",
    "LayStake3",
    "PnL_IfLay2Wins",
    "PnL_IfLay3Wins",
}
FREE_BET_SOURCE_MAP = {
    "DateSettling": "date_settled",
    "ExpiryDateTime": "expiry_datetime",
    "EventName": "event_name",
    "Offer": "offer_text",
    "Bookmaker": "bookmaker",
    "OfferType": "offer_type",
    "BetType": "bet_type",
    "OfferName": "offer_name",
    "FixtureType": "fixture_type",
    "Status": "status",
    "Result": "result",
    "FreeBetRetentionMode": "retention_mode",
    "FreeBetValue": "free_bet_value",
    "BackOdds": "back_odds",
    "MatchStrategy": "match_strategy",
    "LayOdds1": "lay_odds_1",
    "Exchange": "exchange_name",
    "Lay (Actual)": "lay_actual",
    "LayMatchedStake1": "lay_matched_stake_1",
    "FinalNetPnL": "manual_override_value",
    "ManualOverrideReason": "manual_override_reason",
    "OriginQualBetID": "origin_qual_bet_id",
    "OfferGroupID": "offer_group_id",
    "UserNotes": "user_notes",
}
CASINO_OFFER_SOURCE_MAP = {
    "OfferGroupID": "offer_group_id",
    "DateStarted": "date_started",
    "DateSettling": "date_settling",
    "ExpiryDateTime": "expiry_datetime",
    "Bookmaker": "bookmaker",
    "OfferType": "offer_type",
    "OfferName": "offer_name",
    "Game": "game",
    "CashStake": "cash_stake",
    "CreditAmount": "credit_amount",
    "BonusAmount": "bonus_amount",
    "WagerMultiplier": "wager_multiplier",
    "WagerTarget": "wager_target",
    "Required Spins": "required_spins",
    "SpinStake": "spin_stake",
    "Free Spins Awarded": "free_spins_awarded",
    "Free Spins Value": "free_spins_value",
    "Status": "status",
    "Result": "result",
    "CalcNetPnL": "calc_net_pnl",
    "FinalNetPnL": "final_net_pnl",
    "UserNotes": "user_notes",
}
CASH_ADJUSTMENT_SOURCE_MAP = {
    "AdjustmentDate": "adjustment_date",
    "Direction": "direction",
    "Amount": "amount",
    "AdjustmentType": "adjustment_type",
    "AffectsInvestment": "affects_investment",
    "AffectsCashSnapshot": "affects_cash_snapshot",
    "LinkedAccount": "linked_account",
    "Description": "description",
}
ACCOUNT_SOURCE_MAP = {
    "Account": "account",
    "Type": "type",
    "Counts In Cash Total": "counts_in_cash_total",
    "Channel": "channel",
    "Status": "status",
    "CurrentBalance": "current_balance",
    "PendingWithdrawalAmount": "pending_withdrawal_amount",
    "LastBalanceUpdate": "last_balance_update",
    "SignUpDate": "sign_up_date",
    "Notes": "notes",
}

JsonScalar = str | int | float | bool | list[str] | None
SourceLookup = Callable[[str, str], ImportSourceRecord | None]


class ImportRowPayload(BaseModel):
    sheet: str = Field(min_length=1, max_length=120)
    source_record_id: str = Field(default="", max_length=120)
    source_row: int | None = Field(default=None, ge=1)
    fields: dict[str, JsonScalar] = Field(default_factory=dict)


class ImportDryRunPayload(BaseModel):
    source_filename: str = Field(min_length=1, max_length=255)
    source_type: Literal["synthetic-json", "xlsx"] = "synthetic-json"
    mapping_version: str = Field(default="draft-v1", min_length=1, max_length=80)
    rows: list[ImportRowPayload] = Field(min_length=1, max_length=5000)


class ImportIssueResponse(BaseModel):
    code: str
    message: str


class ImportFieldDiffResponse(BaseModel):
    before: JsonScalar
    after: JsonScalar


class ImportRowAccountingResponse(BaseModel):
    source_row_count: int
    accounted_row_count: int
    state: Literal["complete", "mismatch"]
    message: str


class ImportFinancialReconciliationResponse(BaseModel):
    ledger: str
    state: Literal["matched", "mismatch", "incomplete", "not_available"]
    source_total: str | None
    recomputed_total: str | None
    difference: str | None
    compared_row_count: int
    source_row_count: int
    tolerance: str
    message: str


class ImportStagedRowResponse(BaseModel):
    import_staged_row_id: str
    source_sheet: str
    source_record_id: str
    source_row: int | None
    source_hash: str
    staged_action: str
    errors: list[ImportIssueResponse]
    warnings: list[ImportIssueResponse]
    fields: dict[str, JsonScalar]
    mapped_fields: dict[str, JsonScalar]
    existing_mapped_fields: dict[str, JsonScalar] = Field(default_factory=dict)
    field_diffs: dict[str, ImportFieldDiffResponse] = Field(default_factory=dict)


class ImportBatchResponse(BaseModel):
    import_batch_id: str
    profile_id: str
    source_filename: str
    source_type: str
    mapping_version: str
    status: str
    row_count: int
    error_count: int
    warning_count: int
    summary: dict[str, int]
    row_accounting: ImportRowAccountingResponse
    financial_reconciliation: ImportFinancialReconciliationResponse
    backup_snapshot_id: str
    started_at: str
    completed_at: str
    rows: list[ImportStagedRowResponse] = Field(default_factory=list)


class ImportConfirmationPayload(BaseModel):
    confirmed: Literal[True]
    selected_staged_row_ids: list[str] = Field(min_length=1, max_length=5000)


class ImportConfirmationResponse(BaseModel):
    import_batch_id: str
    profile_id: str
    status: Literal["confirmed"]
    backup_snapshot_id: str
    backup_storage_path: str
    backup_checksum_sha256: str
    imported_sportsbook_bet_ids: list[str] = Field(default_factory=list)
    imported_free_bet_ids: list[str] = Field(default_factory=list)
    imported_casino_offer_ids: list[str] = Field(default_factory=list)
    imported_cash_adjustment_ids: list[str] = Field(default_factory=list)
    imported_account_ids: list[str] = Field(default_factory=list)


class XlsxDryRunPayload(BaseModel):
    source_filename: str = Field(min_length=1, max_length=255)
    content_base64: str = Field(min_length=1, max_length=21_000_000)
    ledger: Literal[
        "sportsbook", "free-bets", "casino-offers", "cash-adjustments", "accounts"
    ] = "sportsbook"


def sportsbook_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    mapped = {
        target: record.get(target, "") for target in set(SPORTSBOOK_SOURCE_MAP.values())
    }
    mapped["lay_commission_1"] = ""
    return mapped


def free_bet_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    mapped = {
        target: record.get(target, "") for target in set(FREE_BET_SOURCE_MAP.values())
    }
    mapped["lay_commission_1"] = ""
    return mapped


def casino_offer_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    return {
        target: record.get(target, "")
        for target in set(CASINO_OFFER_SOURCE_MAP.values())
    }


def cash_adjustment_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    mapped: dict[str, JsonScalar] = {
        target: record.get(target, "")
        for target in set(CASH_ADJUSTMENT_SOURCE_MAP.values())
    }
    mapped["affects_investment"] = bool(mapped["affects_investment"])
    mapped["affects_cash_snapshot"] = bool(mapped["affects_cash_snapshot"])
    return mapped


def account_mapped_fields(row: AccountRecord) -> dict[str, JsonScalar]:
    record = row.__dict__
    try:
        restrictions = json.loads(record["restrictions_json"])
    except json.JSONDecodeError:
        restrictions = []
    return {
        "account_id": None,
        "bookmaker_id": None,
        "account": record["account"],
        "type": record["type"],
        "counts_in_cash_total": record["counts_in_cash_total"],
        "channel": record["channel"],
        "status": record["status"],
        "lifecycle_status": record["lifecycle_status"],
        "restrictions": restrictions if isinstance(restrictions, list) else [],
        "current_balance": record["current_balance"],
        "pending_withdrawal_amount": record["pending_withdrawal_amount"],
        "last_balance_update": record["last_balance_update"],
        "group_name": record["group_name"],
        "platform": record["platform"],
        "sign_up_date": record["sign_up_date"],
        "notes": record["notes"],
    }


def sportsbook_export_row(profile_id: str, row: object) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "sportsbook_bet",
        record["sportsbook_bet_id"],
    )
    calculated = build_response(profile_id, row, as_of_date=date.today())
    return {
        "QualBetID": source.source_record_id if source else record["sportsbook_bet_id"],
        "DateSettling": record["date_settled"],
        "EventName": record["event_name"],
        "Market": record["market"],
        "Offer": record["offer_text"],
        "Bookmaker": record["bookmaker"],
        "OfferType": record["offer_type"],
        "BetType": record["bet_type"],
        "OfferName": record["offer_name"],
        "FixtureType": record["fixture_type"],
        "Status": record["status"],
        "Result": record["result"],
        "BackStake": record["back_stake"],
        "BackOdds": record["back_odds"],
        "MatchStrategy": record["match_strategy"],
        "LayOdds1": record["lay_odds_1"],
        "Exchange": record["exchange_name"],
        "Lay (Actual)": record["lay_actual"],
        "LayMatchedStake1": record["lay_matched_stake_1"],
        "UserNotes": record["user_notes"],
        "ManualOverrideValue": record["manual_override_value"],
        "ManualOverrideReason": record["manual_override_reason"],
        "BonusTrigger": record["bonus_trigger"],
        "MaximumBonus": record["maximum_bonus"],
        "BonusRetentionRate": record["bonus_retention_rate"],
        "MultiLayOutcome1Name": record["multi_lay_outcome_1_name"],
        "MultiLayOutcomesJson": record["multi_lay_outcomes_json"],
        "CurrentProjectedValue": calculated.projected_current_pnl or "",
        "SettledFinalValue": calculated.final_net_pnl or "",
        "ReportingValue": calculated.reporting_value or "",
    }


def free_bet_export_row(profile_id: str, row: FreeBetRecord) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "free_bet",
        record["free_bet_id"],
    )
    calculated = build_free_bet_response(
        row,
        tracker_settings=get_profile_tracker_settings(profile_id),
    )
    return {
        "FreeBetID": source.source_record_id if source else record["free_bet_id"],
        "DateSettling": record["date_settled"],
        "ExpiryDateTime": record["expiry_datetime"],
        "EventName": record["event_name"],
        "Offer": record["offer_text"],
        "Bookmaker": record["bookmaker"],
        "OfferType": record["offer_type"],
        "BetType": record["bet_type"],
        "OfferName": record["offer_name"],
        "FixtureType": record["fixture_type"],
        "Status": record["status"],
        "Result": record["result"],
        "FreeBetRetentionMode": record["retention_mode"],
        "FreeBetValue": record["free_bet_value"],
        "BackOdds": record["back_odds"],
        "MatchStrategy": record["match_strategy"],
        "LayOdds1": record["lay_odds_1"],
        "Exchange": record["exchange_name"],
        "Lay (Actual)": record["lay_actual"],
        "LayMatchedStake1": record["lay_matched_stake_1"],
        "FinalNetPnL": record["manual_override_value"],
        "ManualOverrideReason": record["manual_override_reason"],
        "OriginQualBetID": record["origin_qual_bet_id"],
        "OfferGroupID": record["offer_group_id"],
        "UserNotes": record["user_notes"],
        "CurrentProjectedValue": calculated.projected_current_pnl or "",
        "SettledFinalValue": calculated.final_net_pnl or "",
        "ReportingValue": calculated.reporting_value or "",
    }


def casino_offer_export_row(
    profile_id: str, row: CasinoOfferRecord
) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "casino_offer",
        record["casino_offer_id"],
    )
    calculated = build_casino_offer_response(row)
    return {
        "CasinoOfferID": source.source_record_id if source else record["casino_offer_id"],
        "OfferGroupID": record["offer_group_id"],
        "DateStarted": record["date_started"],
        "DateSettling": record["date_settling"],
        "ExpiryDateTime": record["expiry_datetime"],
        "Bookmaker": record["bookmaker"],
        "OfferType": record["offer_type"],
        "OfferName": record["offer_name"],
        "Game": record["game"],
        "CashStake": record["cash_stake"],
        "CreditAmount": record["credit_amount"],
        "BonusAmount": record["bonus_amount"],
        "WagerMultiplier": record["wager_multiplier"],
        "WagerTarget": record["wager_target"],
        "Required Spins": record["required_spins"],
        "SpinStake": record["spin_stake"],
        "Free Spins Awarded": record["free_spins_awarded"],
        "Free Spins Value": record["free_spins_value"],
        "Status": record["status"],
        "Result": record["result"],
        "CalcNetPnL": record["calc_net_pnl"],
        "FinalNetPnL": record["final_net_pnl"],
        "ResolvedNetPnL": calculated.resolved_net_pnl or "",
        "UserNotes": record["user_notes"],
    }


def cash_adjustment_export_row(
    profile_id: str, row: CashAdjustmentRecord
) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "cash_adjustment",
        record["cash_adjustment_id"],
    )
    calculated = build_cash_adjustment_response(row)
    return {
        "AdjustmentID": (
            source.source_record_id if source else record["cash_adjustment_id"]
        ),
        "AdjustmentDate": record["adjustment_date"],
        "Direction": record["direction"],
        "Amount": record["amount"],
        "AdjustmentType": record["adjustment_type"],
        "AffectsInvestment": record["affects_investment"],
        "AffectsCashSnapshot": record["affects_cash_snapshot"],
        "LinkedAccount": record["linked_account"],
        "Description": record["description"],
        "SignedAmount": calculated.signed_amount or "",
        "WeekLabel": calculated.week_label,
    }


def resolve_account_catalogue_record(
    account_name: str,
    account_type: str,
) -> MasterAccountCatalogueRecord | None:
    expected_type = {
        "Bookie": "Bookmaker",
        "Exchange": "Exchange",
        "Bank": "Bank",
    }.get(account_type)
    if expected_type is None:
        return None
    normalized_name = account_name.strip().casefold()
    return next(
        (
            record
            for record in load_master_account_catalogue().records
            if record.account_type == expected_type
            and normalized_name
            in {record.brand_name.casefold(), record.short_display_name.casefold()}
        ),
        None,
    )


def account_export_row(profile_id: str, row: AccountRecord) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "account",
        record["account_id"],
    )
    catalogue = resolve_account_catalogue_record(record["account"], record["type"])
    return {
        "AccountID": source.source_record_id if source else record["account_id"],
        "Account": record["account"],
        "Type": record["type"],
        "Counts In Cash Total": record["counts_in_cash_total"],
        "Channel": record["channel"],
        "Status": record["status"],
        "CurrentBalance": record["current_balance"],
        "PendingWithdrawalAmount": record["pending_withdrawal_amount"],
        "LastBalanceUpdate": record["last_balance_update"],
        "LastPromoUsed": "",
        "Group": record["group_name"],
        "Platform": record["platform"],
        "RiskTeam": catalogue.risk_team if catalogue else "",
        "SignUpDate": record["sign_up_date"],
        "Notes": record["notes"],
    }


def canonical_source_hash(fields: dict[str, JsonScalar]) -> str:
    canonical = json.dumps(fields, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def reconcile_import_row_count(
    source_row_count: int, summary: dict[str, object]
) -> ImportRowAccountingResponse:
    valid_counts = all(
        isinstance(value, int) and not isinstance(value, bool) and value >= 0
        for value in summary.values()
    )
    accounted_row_count = sum(
        value
        for value in summary.values()
        if isinstance(value, int) and not isinstance(value, bool) and value >= 0
    )
    complete = valid_counts and accounted_row_count == source_row_count
    return ImportRowAccountingResponse(
        source_row_count=source_row_count,
        accounted_row_count=accounted_row_count,
        state="complete" if complete else "mismatch",
        message=(
            f"All {source_row_count} source rows are represented in this review."
            if complete
            else (
                f"Only {accounted_row_count} of {source_row_count} source rows are represented; "
                "confirmation is blocked."
            )
        ),
    )


def require_complete_row_accounting(batch: ImportBatchRecord) -> None:
    summary = json.loads(batch.summary_json)
    reconciliation = reconcile_import_row_count(batch.row_count, summary)
    if reconciliation.state != "complete":
        raise HTTPException(status_code=409, detail=reconciliation.message)


def format_money(value: Decimal) -> str:
    return f"{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):.2f}"


def reconcile_cash_adjustment_values(
    mapping_version: str, rows: list[dict[str, JsonScalar]]
) -> ImportFinancialReconciliationResponse:
    tolerance = Decimal("0.01")
    if mapping_version != "cash-adjustments-v1":
        return ImportFinancialReconciliationResponse(
            ledger="",
            state="not_available",
            source_total=None,
            recomputed_total=None,
            difference=None,
            compared_row_count=0,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message="Financial reconciliation is not available for this import mapping.",
        )

    source_values: list[Decimal] = []
    recomputed_values: list[Decimal] = []
    compared_row_count = 0
    for index, row in enumerate(rows):
        calculation = calculate_cash_adjustment_values(
            CashAdjustmentCalculationInput(
                profile_id="IMPORT-REVIEW",
                record_id=f"IMPORT-ROW-{index + 1}",
                adjustment_date=str(row.get("adjustment_date") or ""),
                direction=str(row.get("direction") or ""),
                amount=str(row.get("amount") or ""),
                adjustment_type=str(row.get("adjustment_type") or ""),
            )
        )
        source_text = str(row.get("source_signed_amount") or "").strip()
        try:
            source_value = Decimal(source_text)
        except InvalidOperation:
            source_value = Decimal("NaN")
        compatible = row.get("compatible") is True
        if (
            not compatible
            or not source_text
            or not source_value.is_finite()
            or calculation.calculation_state != "resolved"
            or calculation.signed_amount is None
        ):
            if calculation.signed_amount is not None:
                recomputed_values.append(calculation.signed_amount)
            continue
        source_values.append(source_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        recomputed_values.append(calculation.signed_amount)
        compared_row_count += 1

    recomputed_total = sum(recomputed_values, Decimal("0.00"))
    if compared_row_count != len(rows):
        return ImportFinancialReconciliationResponse(
            ledger="Cash Adjustments",
            state="incomplete",
            source_total=None,
            recomputed_total=format_money(recomputed_total),
            difference=None,
            compared_row_count=compared_row_count,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message=(
                f"Compared {compared_row_count} of {len(rows)} source rows. "
                "At least one workbook SignedAmount is unavailable or invalid."
            ),
        )

    source_total = sum(source_values, Decimal("0.00"))
    difference = abs(source_total - recomputed_total)
    matched = difference <= tolerance
    return ImportFinancialReconciliationResponse(
        ledger="Cash Adjustments",
        state="matched" if matched else "mismatch",
        source_total=format_money(source_total),
        recomputed_total=format_money(recomputed_total),
        difference=format_money(difference),
        compared_row_count=compared_row_count,
        source_row_count=len(rows),
        tolerance=format_money(tolerance),
        message=(
            "Workbook and Plum Duff signed cash-adjustment totals match."
            if matched
            else (
                f"Workbook and Plum Duff signed totals differ by {format_money(difference)}. "
                "Plum Duff's recomputed value remains authoritative."
            )
        ),
    )


def reconcile_casino_offer_values(
    mapping_version: str, rows: list[dict[str, JsonScalar]]
) -> ImportFinancialReconciliationResponse:
    tolerance = Decimal("0.01")
    if mapping_version != "casino-offers-v1":
        return ImportFinancialReconciliationResponse(
            ledger="",
            state="not_available",
            source_total=None,
            recomputed_total=None,
            difference=None,
            compared_row_count=0,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message="Financial reconciliation is not available for this import mapping.",
        )

    source_values: list[Decimal] = []
    recomputed_values: list[Decimal] = []
    compared_row_count = 0
    for index, row in enumerate(rows):
        calculation = calculate_casino_offer_values(
            CasinoOfferCalculationInput(
                profile_id="IMPORT-REVIEW",
                record_id=f"IMPORT-ROW-{index + 1}",
                date_started=str(row.get("date_started") or ""),
                date_settling=str(row.get("date_settling") or ""),
                expiry_datetime=str(row.get("expiry_datetime") or ""),
                status=str(row.get("status") or ""),
                calc_net_pnl=str(row.get("calc_net_pnl") or ""),
                final_net_pnl=str(row.get("final_net_pnl") or ""),
            ),
            as_of_datetime=datetime.now(),
        )
        source_text = str(row.get("source_resolved_net_pnl") or "").strip()
        try:
            source_value = Decimal(source_text)
        except InvalidOperation:
            source_value = Decimal("NaN")
        compatible = row.get("compatible") is True
        if (
            not compatible
            or not source_text
            or not source_value.is_finite()
            or calculation.calculation_state != "resolved"
            or calculation.resolved_net_pnl is None
        ):
            if calculation.resolved_net_pnl is not None:
                recomputed_values.append(calculation.resolved_net_pnl)
            continue
        source_values.append(source_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        recomputed_values.append(calculation.resolved_net_pnl)
        compared_row_count += 1

    recomputed_total = sum(recomputed_values, Decimal("0.00"))
    if compared_row_count != len(rows):
        return ImportFinancialReconciliationResponse(
            ledger="Casino Offers",
            state="incomplete",
            source_total=None,
            recomputed_total=format_money(recomputed_total),
            difference=None,
            compared_row_count=compared_row_count,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message=(
                f"Compared {compared_row_count} of {len(rows)} source rows. "
                "At least one workbook resolved value is unavailable or invalid."
            ),
        )

    source_total = sum(source_values, Decimal("0.00"))
    difference = abs(source_total - recomputed_total)
    matched = difference <= tolerance
    return ImportFinancialReconciliationResponse(
        ledger="Casino Offers",
        state="matched" if matched else "mismatch",
        source_total=format_money(source_total),
        recomputed_total=format_money(recomputed_total),
        difference=format_money(difference),
        compared_row_count=compared_row_count,
        source_row_count=len(rows),
        tolerance=format_money(tolerance),
        message=(
            "Workbook and Plum Duff resolved casino totals match."
            if matched
            else (
                f"Workbook and Plum Duff resolved casino totals differ by "
                f"{format_money(difference)}. Plum Duff's resolved value remains authoritative."
            )
        ),
    )


def reconcile_free_bet_values(
    mapping_version: str, rows: list[dict[str, JsonScalar]]
) -> ImportFinancialReconciliationResponse:
    tolerance = Decimal("0.01")
    if mapping_version != "free-bets-v1":
        return ImportFinancialReconciliationResponse(
            ledger="",
            state="not_available",
            source_total=None,
            recomputed_total=None,
            difference=None,
            compared_row_count=0,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message="Financial reconciliation is not available for this import mapping.",
        )

    source_values: list[Decimal] = []
    recomputed_values: list[Decimal] = []
    compared_row_count = 0
    for index, row in enumerate(rows):
        if row.get("compatible") is not True:
            continue
        calculation = calculate_free_bet_current_value(
            FreeBetCalculationInput(
                profile_id=str(row.get("profile_id") or "IMPORT-REVIEW"),
                record_id=f"IMPORT-ROW-{index + 1}",
                status=str(row.get("status") or ""),
                result=str(row.get("result") or ""),
                retention_mode=str(row.get("retention_mode") or ""),
                free_bet_value=str(row.get("free_bet_value") or ""),
                back_odds=str(row.get("back_odds") or ""),
                match_strategy=str(row.get("match_strategy") or ""),
                lay_odds_1=str(row.get("lay_odds_1") or ""),
                lay_commission_1=str(row.get("lay_commission_1") or ""),
                lay_actual=str(row.get("lay_actual") or ""),
                lay_matched_stake_1=str(row.get("lay_matched_stake_1") or ""),
                default_underlay_factor=str(
                    row.get("default_underlay_factor") or ""
                ),
                default_overlay_factor=str(
                    row.get("default_overlay_factor") or ""
                ),
                expiry_datetime=str(row.get("expiry_datetime") or ""),
                date_settled=str(row.get("date_settled") or ""),
                manual_override_value=str(row.get("manual_override_value") or ""),
                manual_override_reason=str(row.get("manual_override_reason") or ""),
            ),
            as_of_datetime=datetime.now(),
        )
        source_text = str(row.get("source_reporting_value") or "").strip()
        try:
            source_value = Decimal(source_text)
        except InvalidOperation:
            source_value = Decimal("NaN")
        if (
            not source_text
            or not source_value.is_finite()
            or calculation.calculation_state != "resolved"
            or calculation.reporting_value is None
        ):
            if calculation.reporting_value is not None:
                recomputed_values.append(calculation.reporting_value)
            continue
        source_values.append(
            source_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )
        recomputed_values.append(calculation.reporting_value)
        compared_row_count += 1

    recomputed_total = sum(recomputed_values, Decimal("0.00"))
    if compared_row_count != len(rows):
        return ImportFinancialReconciliationResponse(
            ledger="Free Bets",
            state="incomplete",
            source_total=None,
            recomputed_total=format_money(recomputed_total),
            difference=None,
            compared_row_count=compared_row_count,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message=(
                f"Compared {compared_row_count} of {len(rows)} source rows. "
                "At least one workbook reporting value or required profile calculation "
                "setting is unavailable or invalid."
            ),
        )

    source_total = sum(source_values, Decimal("0.00"))
    difference = abs(source_total - recomputed_total)
    matched = difference <= tolerance
    return ImportFinancialReconciliationResponse(
        ledger="Free Bets",
        state="matched" if matched else "mismatch",
        source_total=format_money(source_total),
        recomputed_total=format_money(recomputed_total),
        difference=format_money(difference),
        compared_row_count=compared_row_count,
        source_row_count=len(rows),
        tolerance=format_money(tolerance),
        message=(
            "Workbook and Plum Duff cash-first Free Bet totals match."
            if matched
            else (
                f"Workbook and Plum Duff cash-first Free Bet totals differ by "
                f"{format_money(difference)}. Plum Duff's recomputed value remains authoritative."
            )
        ),
    )


def reconcile_sportsbook_values(
    mapping_version: str, rows: list[dict[str, JsonScalar]]
) -> ImportFinancialReconciliationResponse:
    tolerance = Decimal("0.01")
    if mapping_version != "sportsbook-v1":
        return ImportFinancialReconciliationResponse(
            ledger="",
            state="not_available",
            source_total=None,
            recomputed_total=None,
            difference=None,
            compared_row_count=0,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message="Financial reconciliation is not available for this import mapping.",
        )

    source_values: list[Decimal] = []
    recomputed_values: list[Decimal] = []
    compared_row_count = 0
    for index, row in enumerate(rows):
        if row.get("compatible") is not True:
            continue
        calculation = calculate_sportsbook_current_value(
            SportsbookCalculationInput(
                profile_id=str(row.get("profile_id") or "IMPORT-REVIEW"),
                record_id=f"IMPORT-ROW-{index + 1}",
                status=str(row.get("status") or ""),
                result=str(row.get("result") or ""),
                offer_type=str(row.get("offer_type") or ""),
                back_stake=str(row.get("back_stake") or ""),
                back_odds=str(row.get("back_odds") or ""),
                match_strategy=str(row.get("match_strategy") or ""),
                bonus_trigger=str(row.get("bonus_trigger") or ""),
                maximum_bonus=str(row.get("maximum_bonus") or ""),
                bonus_retention_rate=str(row.get("bonus_retention_rate") or "70"),
                lay_odds_1=str(row.get("lay_odds_1") or ""),
                multi_lay_outcome_1_name=str(
                    row.get("multi_lay_outcome_1_name") or ""
                ),
                multi_lay_outcomes_json=str(
                    row.get("multi_lay_outcomes_json") or "[]"
                ),
                lay_commission_1=str(row.get("lay_commission_1") or ""),
                lay_actual=str(row.get("lay_actual") or ""),
                lay_matched_stake_1=str(row.get("lay_matched_stake_1") or ""),
                date_settled=str(row.get("date_settled") or ""),
                manual_override_value=str(row.get("manual_override_value") or ""),
                manual_override_reason=str(row.get("manual_override_reason") or ""),
            ),
            as_of_date=date.today(),
        )
        source_text = str(row.get("source_reporting_value") or "").strip()
        try:
            source_value = Decimal(source_text)
        except InvalidOperation:
            source_value = Decimal("NaN")
        if (
            not source_text
            or not source_value.is_finite()
            or calculation.calculation_state != "resolved"
            or calculation.reporting_value is None
        ):
            if calculation.reporting_value is not None:
                recomputed_values.append(calculation.reporting_value)
            continue
        source_values.append(
            source_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )
        recomputed_values.append(calculation.reporting_value)
        compared_row_count += 1

    recomputed_total = sum(recomputed_values, Decimal("0.00"))
    if compared_row_count != len(rows):
        return ImportFinancialReconciliationResponse(
            ledger="Sportsbook Bets",
            state="incomplete",
            source_total=None,
            recomputed_total=format_money(recomputed_total),
            difference=None,
            compared_row_count=compared_row_count,
            source_row_count=len(rows),
            tolerance=format_money(tolerance),
            message=(
                f"Compared {compared_row_count} of {len(rows)} source rows. "
                "At least one workbook reporting value, required profile commission or "
                "calculation branch is unavailable or invalid."
            ),
        )

    source_total = sum(source_values, Decimal("0.00"))
    difference = abs(source_total - recomputed_total)
    matched = difference <= tolerance
    return ImportFinancialReconciliationResponse(
        ledger="Sportsbook Bets",
        state="matched" if matched else "mismatch",
        source_total=format_money(source_total),
        recomputed_total=format_money(recomputed_total),
        difference=format_money(difference),
        compared_row_count=compared_row_count,
        source_row_count=len(rows),
        tolerance=format_money(tolerance),
        message=(
            "Workbook and Plum Duff cash-first Sportsbook totals match."
            if matched
            else (
                f"Workbook and Plum Duff cash-first Sportsbook totals differ by "
                f"{format_money(difference)}. Plum Duff's recomputed value remains authoritative."
            )
        ),
    )


def reconcile_import_financial_values(
    batch: ImportBatchRecord, staged_rows: list[ImportStagedRowRecord]
) -> ImportFinancialReconciliationResponse:
    supported_mapping = batch.mapping_version in {
        "cash-adjustments-v1",
        "casino-offers-v1",
        "free-bets-v1",
        "sportsbook-v1",
    }
    if supported_mapping and not staged_rows and batch.row_count:
        placeholders: list[dict[str, JsonScalar]] = [
            {"compatible": False} for _ in range(batch.row_count)
        ]
        if batch.mapping_version == "casino-offers-v1":
            return reconcile_casino_offer_values(batch.mapping_version, placeholders)
        if batch.mapping_version == "free-bets-v1":
            return reconcile_free_bet_values(batch.mapping_version, placeholders)
        if batch.mapping_version == "sportsbook-v1":
            return reconcile_sportsbook_values(batch.mapping_version, placeholders)
        return reconcile_cash_adjustment_values(batch.mapping_version, placeholders)
    tracker_settings = (
        get_profile_tracker_settings(batch.profile_id)
        if batch.mapping_version == "free-bets-v1"
        else None
    )
    rows: list[dict[str, JsonScalar]] = []
    for staged_row in staged_rows:
        source = json.loads(staged_row.payload_json)
        mapped = json.loads(staged_row.mapped_payload_json)
        if batch.mapping_version == "sportsbook-v1":
            exchange_name = str(mapped.get("exchange_name") or "")
            rows.append(
                {
                    "profile_id": batch.profile_id,
                    "status": mapped.get("status"),
                    "result": mapped.get("result"),
                    "offer_type": mapped.get("offer_type"),
                    "back_stake": mapped.get("back_stake"),
                    "back_odds": mapped.get("back_odds"),
                    "match_strategy": mapped.get("match_strategy"),
                    "bonus_trigger": mapped.get("bonus_trigger"),
                    "maximum_bonus": mapped.get("maximum_bonus"),
                    "bonus_retention_rate": mapped.get("bonus_retention_rate"),
                    "lay_odds_1": mapped.get("lay_odds_1"),
                    "multi_lay_outcome_1_name": mapped.get(
                        "multi_lay_outcome_1_name"
                    ),
                    "multi_lay_outcomes_json": mapped.get("multi_lay_outcomes_json"),
                    "lay_commission_1": get_profile_exchange_commission(
                        batch.profile_id, exchange_name
                    ),
                    "lay_actual": mapped.get("lay_actual"),
                    "lay_matched_stake_1": mapped.get("lay_matched_stake_1"),
                    "date_settled": mapped.get("date_settled"),
                    "manual_override_value": mapped.get("manual_override_value"),
                    "manual_override_reason": mapped.get("manual_override_reason"),
                    "source_reporting_value": (
                        source.get("ReportingValue") or source.get("NetPnL")
                    ),
                    "compatible": staged_row.staged_action != "blocked",
                }
            )
        elif batch.mapping_version == "free-bets-v1":
            assert tracker_settings is not None
            exchange_name = str(mapped.get("exchange_name") or "")
            rows.append(
                {
                    "profile_id": batch.profile_id,
                    "status": mapped.get("status"),
                    "result": mapped.get("result"),
                    "retention_mode": mapped.get("retention_mode"),
                    "free_bet_value": mapped.get("free_bet_value"),
                    "back_odds": mapped.get("back_odds"),
                    "match_strategy": mapped.get("match_strategy"),
                    "lay_odds_1": mapped.get("lay_odds_1"),
                    "lay_commission_1": get_profile_exchange_commission(
                        batch.profile_id, exchange_name
                    ),
                    "lay_actual": mapped.get("lay_actual"),
                    "lay_matched_stake_1": mapped.get("lay_matched_stake_1"),
                    "default_underlay_factor": (
                        tracker_settings.default_free_bet_underlay_factor
                    ),
                    "default_overlay_factor": (
                        tracker_settings.default_free_bet_overlay_factor
                    ),
                    "expiry_datetime": mapped.get("expiry_datetime"),
                    "date_settled": mapped.get("date_settled"),
                    "manual_override_value": mapped.get("manual_override_value"),
                    "manual_override_reason": mapped.get("manual_override_reason"),
                    "source_reporting_value": (
                        source.get("ReportingValue") or source.get("NetPnL")
                    ),
                    "compatible": staged_row.staged_action != "blocked",
                }
            )
        elif batch.mapping_version == "casino-offers-v1":
            rows.append(
                {
                    "date_started": mapped.get("date_started"),
                    "date_settling": mapped.get("date_settling"),
                    "expiry_datetime": mapped.get("expiry_datetime"),
                    "status": mapped.get("status"),
                    "calc_net_pnl": mapped.get("calc_net_pnl"),
                    "final_net_pnl": mapped.get("final_net_pnl"),
                    "source_resolved_net_pnl": (
                        source.get("ResolvedNetPnL") or source.get("NetPnL")
                    ),
                    "compatible": staged_row.staged_action != "blocked",
                }
            )
        else:
            rows.append(
                {
                    "adjustment_date": mapped.get("adjustment_date"),
                    "adjustment_type": mapped.get("adjustment_type"),
                    "direction": mapped.get("direction"),
                    "amount": mapped.get("amount"),
                    "source_signed_amount": source.get("SignedAmount"),
                    "compatible": staged_row.staged_action != "blocked",
                }
            )
    if batch.mapping_version == "casino-offers-v1":
        return reconcile_casino_offer_values(batch.mapping_version, rows)
    if batch.mapping_version == "free-bets-v1":
        return reconcile_free_bet_values(batch.mapping_version, rows)
    if batch.mapping_version == "sportsbook-v1":
        return reconcile_sportsbook_values(batch.mapping_version, rows)
    return reconcile_cash_adjustment_values(batch.mapping_version, rows)


def field_text(fields: dict[str, JsonScalar], *names: str) -> str:
    for name in names:
        value = fields.get(name)
        if value is not None:
            return str(value).strip()
    return ""


def issue(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def reconciliation_warning(fields: dict[str, JsonScalar]) -> dict[str, str] | None:
    source_text = field_text(fields, "source_current_value")
    recomputed_text = field_text(fields, "recomputed_current_value")
    tolerance_text = field_text(fields, "tolerance") or "0.01"
    if not source_text or not recomputed_text:
        return None
    try:
        difference = abs(Decimal(source_text) - Decimal(recomputed_text))
        tolerance = Decimal(tolerance_text)
    except InvalidOperation:
        return issue(
            "invalid_reconciliation_value",
            "Current-value reconciliation inputs must be valid decimals.",
        )
    if difference <= tolerance:
        return None
    return issue(
        "current_value_mismatch",
        (
            "Workbook and recomputed current values differ by "
            f"{difference:.2f}; no value was normalised."
        ),
    )


def map_sportsbook_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[dict[str, JsonScalar], list[dict[str, str]]]:
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "") for source, target in SPORTSBOOK_SOURCE_MAP.items()
    }
    mapped.update(
        {
            "bonus_trigger": mapped.get("bonus_trigger") or "",
            "maximum_bonus": mapped.get("maximum_bonus") or "",
            "bonus_retention_rate": mapped.get("bonus_retention_rate") or "70",
            "multi_lay_outcome_1_name": mapped.get("multi_lay_outcome_1_name") or "",
            "multi_lay_outcomes_json": mapped.get("multi_lay_outcomes_json") or "[]",
            "lay_commission_1": "",
        }
    )
    errors: list[dict[str, str]] = []
    match_strategy = field_text(fields, "MatchStrategy")
    outcome_count = field_text(fields, "OutcomeCount")
    has_advanced_branch = any(
        field_text(fields, name) for name in SPORTSBOOK_ADVANCED_BRANCH_FIELDS
    )
    branch_json = field_text(fields, "MultiLayOutcomesJson")
    has_branch_preserving_payload = False
    if branch_json and branch_json != "[]":
        try:
            parsed_branches = json.loads(branch_json)
            has_branch_preserving_payload = isinstance(parsed_branches, list) and bool(
                parsed_branches
            )
        except json.JSONDecodeError:
            errors.append(
                issue(
                    "invalid_branch_payload",
                    "MultiLayOutcomesJson must contain a valid JSON list.",
                )
            )
    if (
        (
            match_strategy in {"Partial Lay", "Multilay", "Multilay-Underlay"}
            or (outcome_count and outcome_count != "1")
            or has_advanced_branch
        )
        and not has_branch_preserving_payload
    ):
        errors.append(
            issue(
                "advanced_branch_mapping_required",
                "Advanced sportsbook branches require the branch-preserving import mapper.",
            )
        )
        return mapped, errors

    try:
        SportsbookBetPayload.model_validate(mapped)
    except ValidationError as error:
        errors.append(
            issue(
                "invalid_sportsbook_payload",
                "; ".join(item["msg"] for item in error.errors()),
            )
        )
    return mapped, errors


def map_free_bet_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[dict[str, JsonScalar], list[dict[str, str]]]:
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "") for source, target in FREE_BET_SOURCE_MAP.items()
    }
    mapped["lay_commission_1"] = ""
    errors: list[dict[str, str]] = []
    if field_text(fields, "MatchStrategy") == "Partial Lay" and not (
        field_text(fields, "Lay (Actual)") or field_text(fields, "LayMatchedStake1")
    ):
        errors.append(
            issue(
                "incomplete_partial_lay",
                "Partial Lay free bets require an actual or matched lay stake.",
            )
        )
    try:
        FreeBetPayload.model_validate(mapped)
    except ValidationError as error:
        errors.append(
            issue(
                "invalid_free_bet_payload",
                "; ".join(item["msg"] for item in error.errors()),
            )
        )
    return mapped, errors


def map_casino_offer_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[dict[str, JsonScalar], list[dict[str, str]]]:
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "")
        for source, target in CASINO_OFFER_SOURCE_MAP.items()
    }
    if not field_text(mapped, "date_settling"):
        mapped["date_settling"] = field_text(mapped, "date_started")
    errors: list[dict[str, str]] = []
    try:
        CasinoOfferPayload.model_validate(mapped)
    except ValidationError as error:
        errors.append(
            issue(
                "invalid_casino_offer_payload",
                "; ".join(item["msg"] for item in error.errors()),
            )
        )
    return mapped, errors


def map_cash_adjustment_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[dict[str, JsonScalar], list[dict[str, str]]]:
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "")
        for source, target in CASH_ADJUSTMENT_SOURCE_MAP.items()
    }
    errors: list[dict[str, str]] = []
    try:
        validated = CashAdjustmentPayload.model_validate(mapped).model_dump()
        mapped = {target: validated[target] for target in mapped}
    except ValidationError as error:
        errors.append(
            issue(
                "invalid_cash_adjustment_payload",
                "; ".join(item["msg"] for item in error.errors()),
            )
        )
    return mapped, errors


def map_account_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[
    dict[str, JsonScalar],
    list[dict[str, str]],
    list[dict[str, str]],
]:
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "") for source, target in ACCOUNT_SOURCE_MAP.items()
    }
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    account_name = field_text(mapped, "account")
    account_type = field_text(mapped, "type")
    catalogue = resolve_account_catalogue_record(account_name, account_type)
    if catalogue is None:
        errors.append(
            issue(
                "account_catalogue_match_required",
                "Account must match a known Account Catalogue record of the same type.",
            )
        )
    elif catalogue.status != "Active":
        warnings.append(
            issue(
                "account_catalogue_entry_archived",
                (
                    "This historical account is archived in the Account Catalogue. "
                    "It may be imported but must not be suggested for a new sign-up."
                ),
            )
        )
    if catalogue is not None:
        for workbook_field, catalogue_value, label in (
            ("Group", catalogue.operator_group, "group"),
            ("Platform", catalogue.platform, "platform"),
            ("RiskTeam", catalogue.risk_team, "risk team"),
        ):
            workbook_value = field_text(fields, workbook_field)
            if (
                workbook_value
                and catalogue_value
                and workbook_value.casefold() != catalogue_value.casefold()
            ):
                warnings.append(
                    issue(
                        "account_catalogue_metadata_mismatch",
                        (
                            f"Workbook {label} differs from the Account Catalogue; "
                            "catalogue authority will be used."
                        ),
                    )
                )
        mapped.update(
            account=catalogue.brand_name,
            group_name=catalogue.operator_group,
            platform=catalogue.platform,
            bookmaker_id=None,
        )

    for field_name in ("current_balance", "pending_withdrawal_amount"):
        value = field_text(mapped, field_name)
        if not value:
            continue
        try:
            parsed = Decimal(value)
            if not parsed.is_finite():
                raise InvalidOperation
        except InvalidOperation:
            errors.append(
                issue(
                    "invalid_account_money",
                    f"{field_name.replace('_', ' ').title()} must be a valid finite decimal.",
                )
            )

    sign_up_date = field_text(mapped, "sign_up_date")
    if sign_up_date:
        try:
            date.fromisoformat(sign_up_date)
        except ValueError:
            errors.append(
                issue("invalid_account_sign_up_date", "SignUpDate must be a valid date.")
            )

    try:
        validated = AccountPayload.model_validate(mapped).model_dump()
        mapped = {key: validated[key] for key in validated}
    except ValidationError as error:
        errors.append(
            issue(
                "invalid_account_payload",
                "; ".join(item["msg"] for item in error.errors()),
            )
        )
    return mapped, errors, warnings


def stage_import_rows(
    *,
    profile_id: str,
    rows: list[ImportRowPayload],
    mapping_version: str = "draft-v1",
    source_lookup: SourceLookup = get_import_source_record,
) -> list[dict[str, Any]]:
    staged_rows: list[dict[str, Any]] = []
    seen_in_batch: dict[tuple[str, str], str] = {}

    for row in rows:
        source_sheet = row.sheet.strip()
        source_record_id = row.source_record_id.strip()
        source_hash = canonical_source_hash(row.fields)
        errors: list[dict[str, str]] = []
        warnings: list[dict[str, str]] = []
        mapped_fields: dict[str, JsonScalar] = {}
        if row.fields.get("__PlumDuffOutsideTableRange") is True:
            warnings.append(
                issue(
                    "outside_workbook_table_range",
                    (
                        "This populated row sits outside the workbook table range. "
                        "Review it before import."
                    ),
                )
            )

        if source_sheet in EXCLUDED_SHEETS:
            action = "ignored"
            warnings.append(
                issue("excluded_source_sheet", "SignupUsers is explicitly excluded from import.")
            )
        elif source_sheet not in SUPPORTED_SHEETS:
            action = "blocked"
            errors.append(issue("unsupported_sheet", f"Unsupported sheet: {source_sheet}."))
        else:
            action = "insert"
            if mapping_version == "sportsbook-v1":
                if source_sheet != "Sportsbook Bets":
                    errors.append(
                        issue(
                            "mapping_sheet_not_supported",
                            "sportsbook-v1 only supports the Sportsbook Bets sheet.",
                        )
                    )
                else:
                    mapped_fields, mapping_errors = map_sportsbook_import_fields(row.fields)
                    errors.extend(mapping_errors)
                    # Idempotency follows authoritative entered fields. Workbook helper
                    # calculations may change without turning an unchanged tracker row
                    # into an operational update.
                    source_hash = canonical_source_hash(mapped_fields)
            elif mapping_version == "free-bets-v1":
                if source_sheet != "Free Bets":
                    errors.append(
                        issue(
                            "mapping_sheet_not_supported",
                            "free-bets-v1 only supports the Free Bets sheet.",
                        )
                    )
                else:
                    mapped_fields, mapping_errors = map_free_bet_import_fields(row.fields)
                    errors.extend(mapping_errors)
                    source_hash = canonical_source_hash(mapped_fields)
            elif mapping_version == "casino-offers-v1":
                if source_sheet != "Casino Offers":
                    errors.append(
                        issue(
                            "mapping_sheet_not_supported",
                            "casino-offers-v1 only supports the Casino Offers sheet.",
                        )
                    )
                else:
                    mapped_fields, mapping_errors = map_casino_offer_import_fields(
                        row.fields
                    )
                    errors.extend(mapping_errors)
                    source_hash = canonical_source_hash(mapped_fields)
            elif mapping_version == "cash-adjustments-v1":
                if source_sheet != "Cash Adjustments":
                    errors.append(
                        issue(
                            "mapping_sheet_not_supported",
                            "cash-adjustments-v1 only supports the Cash Adjustments sheet.",
                        )
                    )
                else:
                    mapped_fields, mapping_errors = map_cash_adjustment_import_fields(
                        row.fields
                    )
                    errors.extend(mapping_errors)
                    source_hash = canonical_source_hash(mapped_fields)
            elif mapping_version == "accounts-v1":
                if source_sheet != "Accounts":
                    errors.append(
                        issue(
                            "mapping_sheet_not_supported",
                            "accounts-v1 only supports the Accounts sheet.",
                        )
                    )
                else:
                    (
                        mapped_fields,
                        mapping_errors,
                        mapping_warnings,
                    ) = map_account_import_fields(row.fields)
                    errors.extend(mapping_errors)
                    warnings.extend(mapping_warnings)
                    source_hash = canonical_source_hash(mapped_fields)
            if not source_record_id:
                errors.append(
                    issue(
                        "source_record_id_required",
                        "Supported source rows require a stable source record id.",
                    )
                )

            status = field_text(row.fields, "status", "Status")
            allowed_statuses = VALID_STATUSES.get(source_sheet)
            if allowed_statuses is not None and status and status not in allowed_statuses:
                errors.append(
                    issue(
                        "invalid_status",
                        f"Status '{status}' is not valid for {source_sheet}.",
                    )
                )

            override_value = field_text(
                row.fields,
                "manual_override_value",
                "ManualOverrideValue",
                "FinalNetPnL",
            )
            override_reason = field_text(
                row.fields, "manual_override_reason", "ManualOverrideReason"
            )
            if source_sheet == "Casino Offers" and not override_reason:
                override_reason = field_text(row.fields, "UserNotes", "user_notes")
            if override_value and not override_reason:
                errors.append(
                    issue(
                        "override_reason_required",
                        (
                            "A casino final value requires an explanatory UserNotes entry."
                            if source_sheet == "Casino Offers"
                            else "A manual override cannot be imported without an override reason."
                        ),
                    )
                )

            value_warning = reconciliation_warning(row.fields)
            if value_warning is not None:
                warnings.append(value_warning)

            identity = (source_sheet, source_record_id)
            if source_record_id:
                prior_hash = seen_in_batch.get(identity)
                if prior_hash is not None:
                    if prior_hash == source_hash:
                        action = "no_op"
                    else:
                        errors.append(
                            issue(
                                "conflicting_batch_duplicate",
                                "The batch contains changed rows with the same source identity.",
                            )
                        )
                else:
                    seen_in_batch[identity] = source_hash
                    existing = source_lookup(source_sheet, source_record_id)
                    if existing is not None and existing.profile_id != profile_id:
                        errors.append(
                            issue(
                                "cross_profile_source_collision",
                                "This source identity already belongs to another profile.",
                            )
                        )
                    elif existing is not None and existing.source_hash == source_hash:
                        action = "no_op"
                    elif existing is not None:
                        if mapping_version == "accounts-v1":
                            action = "update"
                            warnings.append(
                                issue(
                                    "explicit_update_approval_required",
                                    "This changed Account row requires individual approval.",
                                )
                            )
                        else:
                            errors.append(
                                issue(
                                    "explicit_update_required",
                                    (
                                        "The source row changed and requires an explicit "
                                        "update decision."
                                    ),
                                )
                            )
                    elif mapping_version == "sportsbook-v1":
                        native_row = get_sportsbook_bet_by_id(source_record_id)
                        if native_row is not None and native_row.profile_id != profile_id:
                            errors.append(
                                issue(
                                    "cross_profile_source_collision",
                                    "This sportsbook identity belongs to another profile.",
                                )
                            )
                        elif native_row is not None:
                            native_fields = sportsbook_mapped_fields(native_row)
                            if canonical_source_hash(native_fields) == source_hash:
                                action = "no_op"
                            else:
                                errors.append(
                                    issue(
                                        "explicit_update_required",
                                        (
                                            "The exported sportsbook row changed and "
                                            "requires an explicit update decision."
                                        ),
                                    )
                                )
                    elif mapping_version == "free-bets-v1":
                        free_bet_native_row = get_free_bet_by_id(source_record_id)
                        if (
                            free_bet_native_row is not None
                            and free_bet_native_row.profile_id != profile_id
                        ):
                            errors.append(
                                issue(
                                    "cross_profile_source_collision",
                                    "This free-bet identity belongs to another profile.",
                                )
                            )
                        elif free_bet_native_row is not None:
                            native_fields = free_bet_mapped_fields(free_bet_native_row)
                            if canonical_source_hash(native_fields) == source_hash:
                                action = "no_op"
                            else:
                                errors.append(
                                    issue(
                                        "explicit_update_required",
                                        (
                                            "The exported free-bet row changed and requires "
                                            "an explicit update decision."
                                        ),
                                    )
                                )
                    elif mapping_version == "casino-offers-v1":
                        casino_native_row = get_casino_offer_by_id(source_record_id)
                        if (
                            casino_native_row is not None
                            and casino_native_row.profile_id != profile_id
                        ):
                            errors.append(
                                issue(
                                    "cross_profile_source_collision",
                                    "This casino-offer identity belongs to another profile.",
                                )
                            )
                        elif casino_native_row is not None:
                            native_fields = casino_offer_mapped_fields(casino_native_row)
                            if canonical_source_hash(native_fields) == source_hash:
                                action = "no_op"
                            else:
                                errors.append(
                                    issue(
                                        "explicit_update_required",
                                        (
                                            "The exported casino-offer row changed and requires "
                                            "an explicit update decision."
                                        ),
                                    )
                                )
                    elif mapping_version == "cash-adjustments-v1":
                        cash_adjustment_native_row = get_cash_adjustment_by_id(
                            source_record_id
                        )
                        if (
                            cash_adjustment_native_row is not None
                            and cash_adjustment_native_row.profile_id != profile_id
                        ):
                            errors.append(
                                issue(
                                    "cross_profile_source_collision",
                                    "This cash-adjustment identity belongs to another profile.",
                                )
                            )
                        elif cash_adjustment_native_row is not None:
                            native_fields = cash_adjustment_mapped_fields(
                                cash_adjustment_native_row
                            )
                            if canonical_source_hash(native_fields) == source_hash:
                                action = "no_op"
                            else:
                                errors.append(
                                    issue(
                                        "explicit_update_required",
                                        (
                                            "The exported cash-adjustment row changed and "
                                            "requires an explicit update decision."
                                        ),
                                    )
                                )
                    elif mapping_version == "accounts-v1":
                        account_native_row = get_account_by_id(source_record_id)
                        if (
                            account_native_row is not None
                            and account_native_row.profile_id != profile_id
                        ):
                            errors.append(
                                issue(
                                    "cross_profile_source_collision",
                                    "This account identity belongs to another profile.",
                                )
                            )
                        elif account_native_row is not None:
                            native_fields = account_mapped_fields(account_native_row)
                            if canonical_source_hash(native_fields) == source_hash:
                                action = "no_op"
                            else:
                                action = "update"
                                warnings.append(
                                    issue(
                                        "explicit_update_approval_required",
                                        "This changed Account row requires individual approval.",
                                    )
                                )

            if errors:
                action = "blocked"

        staged_rows.append(
            {
                "source_sheet": source_sheet,
                "source_record_id": source_record_id,
                "source_row": row.source_row,
                "source_hash": source_hash,
                "staged_action": action,
                "errors": errors,
                "warnings": warnings,
                "fields": row.fields,
                "mapped_fields": mapped_fields,
            }
        )

    return staged_rows


def serialize_batch(
    batch: ImportBatchRecord,
    staged_rows: list[ImportStagedRowRecord] | None = None,
) -> ImportBatchResponse:
    record = batch.__dict__
    rows = []
    for staged_row in staged_rows or []:
        staged = staged_row.__dict__
        existing_mapped_fields: dict[str, JsonScalar] = {}
        if staged["staged_action"] == "update" and staged["source_sheet"] == "Accounts":
            source = get_import_source_record(
                staged["source_sheet"], staged["source_record_id"]
            )
            existing = (
                get_account(batch.profile_id, source.entity_id)
                if source is not None and source.entity_type == "account"
                else get_account_by_id(staged["source_record_id"])
            )
            if existing is not None and existing.profile_id == batch.profile_id:
                existing_mapped_fields = account_mapped_fields(existing)
        proposed_mapped_fields = json.loads(staged["mapped_payload_json"])
        field_diffs = {
            key: ImportFieldDiffResponse(
                before=existing_mapped_fields.get(key),
                after=proposed_mapped_fields.get(key),
            )
            for key in sorted(set(existing_mapped_fields) | set(proposed_mapped_fields))
            if existing_mapped_fields.get(key) != proposed_mapped_fields.get(key)
        }
        rows.append(
            ImportStagedRowResponse(
                import_staged_row_id=staged["import_staged_row_id"],
                source_sheet=staged["source_sheet"],
                source_record_id=staged["source_record_id"],
                source_row=staged["source_row"],
                source_hash=staged["source_hash"],
                staged_action=staged["staged_action"],
                errors=json.loads(staged["errors_json"]),
                warnings=json.loads(staged["warnings_json"]),
                fields=json.loads(staged["payload_json"]),
                mapped_fields=proposed_mapped_fields,
                existing_mapped_fields=existing_mapped_fields,
                field_diffs=field_diffs,
            )
        )
    summary = json.loads(record["summary_json"])
    return ImportBatchResponse(
        **{key: value for key, value in record.items() if key != "summary_json"},
        summary=summary,
        row_accounting=reconcile_import_row_count(batch.row_count, summary),
        financial_reconciliation=reconcile_import_financial_values(batch, staged_rows or []),
        rows=rows,
    )


@router.post("/dry-run", response_model=ImportBatchResponse, status_code=201)
def create_profile_import_dry_run(
    profile_id: str, payload: ImportDryRunPayload
) -> ImportBatchResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return persist_import_dry_run(profile_id=profile_id, payload=payload)


def persist_import_dry_run(
    *, profile_id: str, payload: ImportDryRunPayload
) -> ImportBatchResponse:
    staged_rows = stage_import_rows(
        profile_id=profile_id, rows=payload.rows, mapping_version=payload.mapping_version
    )
    summary = Counter(row["staged_action"] for row in staged_rows)
    error_count = sum(len(row["errors"]) for row in staged_rows)
    warning_count = sum(len(row["warnings"]) for row in staged_rows)
    status = "dry_run_blocked" if error_count else "dry_run_ready"
    batch = create_import_batch(
        profile_id,
        {
            "source_filename": payload.source_filename,
            "source_type": payload.source_type,
            "mapping_version": payload.mapping_version,
            "status": status,
            "row_count": len(staged_rows),
            "error_count": error_count,
            "warning_count": warning_count,
            "summary_json": json.dumps(dict(summary), sort_keys=True),
        },
        [
            {
                **row,
                "errors_json": json.dumps(row["errors"], sort_keys=True),
                "warnings_json": json.dumps(row["warnings"], sort_keys=True),
                "payload_json": json.dumps(row["fields"], sort_keys=True),
                "mapped_payload_json": json.dumps(row["mapped_fields"], sort_keys=True),
            }
            for row in staged_rows
        ],
    )
    stored = get_import_batch(profile_id, batch.import_batch_id)
    assert stored is not None
    return serialize_batch(*stored)


@router.post("/xlsx/dry-run", response_model=ImportBatchResponse, status_code=201)
def create_profile_xlsx_import_dry_run(
    profile_id: str, payload: XlsxDryRunPayload
) -> ImportBatchResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not payload.source_filename.casefold().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="Only .xlsx files are supported")
    try:
        content = b64decode(payload.content_base64, validate=True)
    except (Base64Error, ValueError) as error:
        raise HTTPException(
            status_code=422,
            detail="Workbook content is not valid base64",
        ) from error
    try:
        detected_ledgers = detect_supported_ledger_xlsx(content)
        resolved_ledger = payload.ledger
        if payload.ledger not in detected_ledgers:
            if len(detected_ledgers) == 1:
                resolved_ledger = detected_ledgers[0]
            elif detected_ledgers:
                available = ", ".join(
                    {
                        "accounts": "Accounts",
                        "cash-adjustments": "Cash Adjustments",
                        "casino-offers": "Casino Offers",
                        "free-bets": "Free Bets",
                        "sportsbook": "Sportsbook Bets",
                    }[ledger]
                    for ledger in detected_ledgers
                )
                raise XlsxImportError(
                    f"Selected spreadsheet type was not found. Available tables: {available}."
                )
        parsed: (
            ParsedAccountSheet
            | ParsedCasinoOfferSheet
            | ParsedCashAdjustmentSheet
            | ParsedFreeBetSheet
            | ParsedSportsbookSheet
        )
        if resolved_ledger == "accounts":
            parsed = parse_account_xlsx(content)
        elif resolved_ledger == "cash-adjustments":
            parsed = parse_cash_adjustment_xlsx(content)
        elif resolved_ledger == "casino-offers":
            parsed = parse_casino_offer_xlsx(content)
        elif resolved_ledger == "free-bets":
            parsed = parse_free_bet_xlsx(content)
        else:
            parsed = parse_sportsbook_xlsx(content)
    except XlsxImportError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if not parsed.rows:
        ledger_label = {
            "accounts": "Accounts",
            "cash-adjustments": "Cash Adjustments",
            "casino-offers": "Casino Offers",
            "free-bets": "Free Bets",
            "sportsbook": "Sportsbook Bets",
        }[resolved_ledger]
        raise HTTPException(status_code=422, detail=f"{ledger_label} table contains no rows")

    source_sheet = {
        "accounts": "Accounts",
        "cash-adjustments": "Cash Adjustments",
        "casino-offers": "Casino Offers",
        "free-bets": "Free Bets",
        "sportsbook": "Sportsbook Bets",
    }[resolved_ledger]
    mapping_version = {
        "accounts": "accounts-v1",
        "cash-adjustments": "cash-adjustments-v1",
        "casino-offers": "casino-offers-v1",
        "free-bets": "free-bets-v1",
        "sportsbook": "sportsbook-v1",
    }[resolved_ledger]

    return persist_import_dry_run(
        profile_id=profile_id,
        payload=ImportDryRunPayload(
            source_filename=payload.source_filename,
            source_type="xlsx",
            mapping_version=mapping_version,
            rows=[
                ImportRowPayload(
                    sheet=source_sheet,
                    source_record_id=row.source_record_id,
                    source_row=row.source_row,
                    fields={
                        **row.fields,
                        "__PlumDuffOutsideTableRange": row.outside_table_range,
                    },
                )
                for row in parsed.rows
            ],
        ),
    )


@router.get("/accounts/export.xlsx")
def export_profile_accounts_xlsx(profile_id: str) -> Response:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = [account_export_row(profile_id, row) for row in list_accounts(profile_id)]
    content = build_account_export(rows)
    return Response(
        content=content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="plum-duff-{profile_id}-accounts.xlsx"'
            )
        },
    )


@router.get("", response_model=list[ImportBatchResponse])
def list_profile_import_batches(profile_id: str) -> list[ImportBatchResponse]:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return [serialize_batch(batch) for batch in list_import_batches(profile_id)]


@router.get("/sportsbook/export.xlsx")
def export_profile_sportsbook_xlsx(profile_id: str) -> Response:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = [
        sportsbook_export_row(profile_id, row)
        for row in list_sportsbook_bets(profile_id)
    ]
    content = build_sportsbook_export(rows)
    return Response(
        content=content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="plum-duff-{profile_id}-sportsbook.xlsx"'
            )
        },
    )


@router.get("/free-bets/export.xlsx")
def export_profile_free_bets_xlsx(profile_id: str) -> Response:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = [free_bet_export_row(profile_id, row) for row in list_free_bets(profile_id)]
    content = build_free_bet_export(rows)
    return Response(
        content=content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="plum-duff-{profile_id}-free-bets.xlsx"'
            )
        },
    )


@router.get("/casino-offers/export.xlsx")
def export_profile_casino_offers_xlsx(profile_id: str) -> Response:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = [
        casino_offer_export_row(profile_id, row)
        for row in list_casino_offers(profile_id)
    ]
    content = build_casino_offer_export(rows)
    return Response(
        content=content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="plum-duff-{profile_id}-casino-offers.xlsx"'
            )
        },
    )


@router.get("/cash-adjustments/export.xlsx")
def export_profile_cash_adjustments_xlsx(profile_id: str) -> Response:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = [
        cash_adjustment_export_row(profile_id, row)
        for row in list_cash_adjustments(profile_id)
    ]
    content = build_cash_adjustment_export(rows)
    return Response(
        content=content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="plum-duff-{profile_id}-cash-adjustments.xlsx"'
            )
        },
    )


@router.get("/{import_batch_id}", response_model=ImportBatchResponse)
def get_profile_import_batch(
    profile_id: str, import_batch_id: str
) -> ImportBatchResponse:
    stored = get_import_batch(profile_id, import_batch_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    return serialize_batch(*stored)


@router.delete("/{import_batch_id}", status_code=204)
def delete_profile_import_batch(profile_id: str, import_batch_id: str) -> Response:
    try:
        deleted = delete_unconfirmed_import_batch(profile_id, import_batch_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    return Response(status_code=204)


@router.post(
    "/{import_batch_id}/confirm-sportsbook",
    response_model=ImportConfirmationResponse,
)
def confirm_profile_sportsbook_import(
    profile_id: str,
    import_batch_id: str,
    payload: ImportConfirmationPayload,
) -> ImportConfirmationResponse:
    stored = get_import_batch(profile_id, import_batch_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    batch, staged_rows = stored
    if batch.status != "dry_run_ready" or batch.mapping_version != "sportsbook-v1":
        raise HTTPException(
            status_code=409,
            detail="Only a dry-run-ready sportsbook-v1 batch can be confirmed",
        )
    require_complete_row_accounting(batch)
    if any(row.staged_action == "blocked" for row in staged_rows):
        raise HTTPException(status_code=409, detail="Blocked staged rows prevent confirmation")
    selected_ids = set(payload.selected_staged_row_ids)
    selectable_ids = {
        row.import_staged_row_id
        for row in staged_rows
        if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = create_verified_local_backup(
        reason=f"Pre-import backup for batch {import_batch_id}"
    )
    try:
        imported_ids = confirm_sportsbook_import_batch(
            profile_id=profile_id,
            import_batch_id=import_batch_id,
            backup_snapshot_id=backup.backup_snapshot_id,
            selected_staged_row_ids=selected_ids,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return ImportConfirmationResponse(
        import_batch_id=import_batch_id,
        profile_id=profile_id,
        status="confirmed",
        backup_snapshot_id=backup.backup_snapshot_id,
        backup_storage_path=backup.storage_path,
        backup_checksum_sha256=backup.checksum_sha256,
        imported_sportsbook_bet_ids=imported_ids,
    )


@router.post(
    "/{import_batch_id}/confirm-free-bets",
    response_model=ImportConfirmationResponse,
)
def confirm_profile_free_bet_import(
    profile_id: str,
    import_batch_id: str,
    payload: ImportConfirmationPayload,
) -> ImportConfirmationResponse:
    stored = get_import_batch(profile_id, import_batch_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    batch, staged_rows = stored
    if batch.status != "dry_run_ready" or batch.mapping_version != "free-bets-v1":
        raise HTTPException(
            status_code=409,
            detail="Only a dry-run-ready free-bets-v1 batch can be confirmed",
        )
    require_complete_row_accounting(batch)
    if any(row.staged_action == "blocked" for row in staged_rows):
        raise HTTPException(status_code=409, detail="Blocked staged rows prevent confirmation")
    selected_ids = set(payload.selected_staged_row_ids)
    selectable_ids = {
        row.import_staged_row_id
        for row in staged_rows
        if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = create_verified_local_backup(
        reason=f"Pre-import backup for batch {import_batch_id}"
    )
    try:
        imported_ids = confirm_free_bet_import_batch(
            profile_id=profile_id,
            import_batch_id=import_batch_id,
            backup_snapshot_id=backup.backup_snapshot_id,
            selected_staged_row_ids=selected_ids,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return ImportConfirmationResponse(
        import_batch_id=import_batch_id,
        profile_id=profile_id,
        status="confirmed",
        backup_snapshot_id=backup.backup_snapshot_id,
        backup_storage_path=backup.storage_path,
        backup_checksum_sha256=backup.checksum_sha256,
        imported_free_bet_ids=imported_ids,
    )


@router.post(
    "/{import_batch_id}/confirm-casino-offers",
    response_model=ImportConfirmationResponse,
)
def confirm_profile_casino_offer_import(
    profile_id: str,
    import_batch_id: str,
    payload: ImportConfirmationPayload,
) -> ImportConfirmationResponse:
    stored = get_import_batch(profile_id, import_batch_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    batch, staged_rows = stored
    if batch.status != "dry_run_ready" or batch.mapping_version != "casino-offers-v1":
        raise HTTPException(
            status_code=409,
            detail="Only a dry-run-ready casino-offers-v1 batch can be confirmed",
        )
    require_complete_row_accounting(batch)
    if any(row.staged_action == "blocked" for row in staged_rows):
        raise HTTPException(status_code=409, detail="Blocked staged rows prevent confirmation")
    selected_ids = set(payload.selected_staged_row_ids)
    selectable_ids = {
        row.import_staged_row_id
        for row in staged_rows
        if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = create_verified_local_backup(
        reason=f"Pre-import backup for batch {import_batch_id}"
    )
    try:
        imported_ids = confirm_casino_offer_import_batch(
            profile_id=profile_id,
            import_batch_id=import_batch_id,
            backup_snapshot_id=backup.backup_snapshot_id,
            selected_staged_row_ids=selected_ids,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return ImportConfirmationResponse(
        import_batch_id=import_batch_id,
        profile_id=profile_id,
        status="confirmed",
        backup_snapshot_id=backup.backup_snapshot_id,
        backup_storage_path=backup.storage_path,
        backup_checksum_sha256=backup.checksum_sha256,
        imported_casino_offer_ids=imported_ids,
    )


@router.post(
    "/{import_batch_id}/confirm-cash-adjustments",
    response_model=ImportConfirmationResponse,
)
def confirm_profile_cash_adjustment_import(
    profile_id: str,
    import_batch_id: str,
    payload: ImportConfirmationPayload,
) -> ImportConfirmationResponse:
    stored = get_import_batch(profile_id, import_batch_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    batch, staged_rows = stored
    if batch.status != "dry_run_ready" or batch.mapping_version != "cash-adjustments-v1":
        raise HTTPException(
            status_code=409,
            detail="Only a dry-run-ready cash-adjustments-v1 batch can be confirmed",
        )
    require_complete_row_accounting(batch)
    if any(row.staged_action == "blocked" for row in staged_rows):
        raise HTTPException(status_code=409, detail="Blocked staged rows prevent confirmation")
    selected_ids = set(payload.selected_staged_row_ids)
    selectable_ids = {
        row.import_staged_row_id
        for row in staged_rows
        if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = create_verified_local_backup(
        reason=f"Pre-import backup for batch {import_batch_id}"
    )
    try:
        imported_ids = confirm_cash_adjustment_import_batch(
            profile_id=profile_id,
            import_batch_id=import_batch_id,
            backup_snapshot_id=backup.backup_snapshot_id,
            selected_staged_row_ids=selected_ids,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return ImportConfirmationResponse(
        import_batch_id=import_batch_id,
        profile_id=profile_id,
        status="confirmed",
        backup_snapshot_id=backup.backup_snapshot_id,
        backup_storage_path=backup.storage_path,
        backup_checksum_sha256=backup.checksum_sha256,
        imported_cash_adjustment_ids=imported_ids,
    )


@router.post(
    "/{import_batch_id}/confirm-accounts",
    response_model=ImportConfirmationResponse,
)
def confirm_profile_account_import(
    profile_id: str,
    import_batch_id: str,
    payload: ImportConfirmationPayload,
) -> ImportConfirmationResponse:
    stored = get_import_batch(profile_id, import_batch_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Import batch not found for this profile")
    batch, staged_rows = stored
    if batch.status != "dry_run_ready" or batch.mapping_version != "accounts-v1":
        raise HTTPException(
            status_code=409,
            detail="Only a dry-run-ready accounts-v1 batch can be confirmed",
        )
    require_complete_row_accounting(batch)
    if any(row.staged_action == "blocked" for row in staged_rows):
        raise HTTPException(status_code=409, detail="Blocked staged rows prevent confirmation")
    selected_ids = set(payload.selected_staged_row_ids)
    selectable_ids = {
        row.import_staged_row_id
        for row in staged_rows
        if row.staged_action in {"insert", "update"}
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new or changed compatible rows from this batch can be selected",
        )

    backup = create_verified_local_backup(
        reason=f"Pre-import backup for batch {import_batch_id}"
    )
    try:
        imported_ids = confirm_account_import_batch(
            profile_id=profile_id,
            import_batch_id=import_batch_id,
            backup_snapshot_id=backup.backup_snapshot_id,
            selected_staged_row_ids=selected_ids,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return ImportConfirmationResponse(
        import_batch_id=import_batch_id,
        profile_id=profile_id,
        status="confirmed",
        backup_snapshot_id=backup.backup_snapshot_id,
        backup_storage_path=backup.storage_path,
        backup_checksum_sha256=backup.checksum_sha256,
        imported_account_ids=imported_ids,
    )
