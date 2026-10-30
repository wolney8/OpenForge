from __future__ import annotations

import hashlib
import json
import re
from base64 import b64decode
from binascii import Error as Base64Error
from collections import Counter
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any, Callable, Literal, cast

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field, ValidationError

from openforge_api.account_catalogue_source import (
    MasterAccountCatalogueRecord,
    load_master_account_catalogue,
)
from openforge_api.accounts import AccountPayload, resolve_account_lifecycle_and_restrictions
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
from openforge_api.config import settings
from openforge_api.db import (
    AccountRecord,
    BackupSnapshotRecord,
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
from openforge_api.source_identity import logical_source_namespace
from openforge_api.sportsbook import SportsbookBetPayload, build_response
from openforge_api.sportsbook_promotions import validate_promotion_json
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
    parse_optional_offer_groups_xlsx,
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
    "OfferGroupID": "offer_group_id",
    "Offer Group ID": "offer_group_id",
    "BetRole": "bet_role",
    "WageringContribution (£)": "wagering_contribution",
    "PromotionDetailsJson": "promotion_json",
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

PROMOTION_ENUMS = {
    "RewardType": {"Cash", "BonusFunds", "SiteCredit", "FreeBetSNR", "FreeBetSR", "Unknown"},
    "RewardCalculation": {"Fixed", "PercentOfLosingStake", "PercentOfDeposit", "Manual"},
    "RewardStatus": {
        "Pending", "Not Earned", "Awarded", "Locked", "Wagering",
        "Released", "Expired", "Forfeited",
    },
    "WageringBasis": {"Reward", "Deposit", "DepositPlusReward", "FixedAmount", "Other"},
    "WageringFundingSource": {"Cash", "RewardBalance", "Mixed", "Unknown"},
    "QualifyingScope": {"AnyEvent", "SpecificFixture", "SpecificSport", "SpecificMarket", "Other"},
}


def promotion_details_from_offer_group(
    fields: dict[str, str | int | float | bool | None],
) -> tuple[str | None, str | None]:
    """Translate a valid optional Offer Groups row by logical header, never position."""
    for header, allowed in PROMOTION_ENUMS.items():
        field_value = str(fields.get(header) or "").strip()
        if field_value and field_value not in allowed:
            return None, (
                f"Offer Groups {header} is not a recognised value; "
                "promotion details require review."
            )
    numeric_headers = (
        "RewardRatePct",
        "RewardCap (£)",
        "RewardAwardedValue (£)",
        "DepositAmount (£)",
        "WageringMultiplier",
        "WageringMinOdds",
        "WageringTargetOverride (£)",
        "QualifyingMinDeposit (£)",
        "QualifyingMinStake (£)",
        "QualifyingMinOdds",
    )
    for header in numeric_headers:
        field_value = str(fields.get(header) or "").strip()
        if field_value:
            try:
                parsed = Decimal(field_value)
            except InvalidOperation:
                return None, (
                    f"Offer Groups {header} is not numeric; "
                    "promotion details require review."
                )
            if not parsed.is_finite() or parsed < 0:
                return None, f"Offer Groups {header} is invalid; promotion details require review."

    def get_value(header: str) -> str | None:
        resolved = str(fields.get(header) or "").strip()
        return resolved or None

    basis = get_value("WageringBasis")
    deposit = get_value("DepositAmount (£)")
    face = get_value("RewardAwardedValue (£)")
    base_amount: str | None = None
    if basis == "Deposit":
        base_amount = deposit
    elif basis == "DepositPlusReward" and deposit and face:
        base_amount = str(Decimal(deposit) + Decimal(face))
    details = {
        "schema_version": "sportsbook-promotion-v1",
        "reward_type": get_value("RewardType") or "Unknown",
        "reward_calculation": get_value("RewardCalculation"),
        "refund_percent": get_value("RewardRatePct"),
        "reward_cap": get_value("RewardCap (£)"),
        "reward_face_value": face,
        "reward_status": get_value("RewardStatus") or "Pending",
        "reward_expiry_datetime": get_value("RewardExpiryDateTime"),
        "wagering_required": Decimal(get_value("WageringMultiplier") or "0") > 0,
        "wagering_multiplier": get_value("WageringMultiplier"),
        "wagering_basis": basis,
        "wagering_funding_source": get_value("WageringFundingSource") or "Unknown",
        "wagering_base_amount": base_amount,
        "wagering_target_override": get_value("WageringTargetOverride (£)"),
        "minimum_wagering_odds": get_value("WageringMinOdds"),
        "qualifying_scope": get_value("QualifyingScope"),
        "qualifying_requirement": get_value("QualifyingRequirementRef"),
        "qualifying_minimum_deposit": get_value("QualifyingMinDeposit (£)"),
        "qualifying_minimum_stake": get_value("QualifyingMinStake (£)"),
        "qualifying_minimum_odds": get_value("QualifyingMinOdds"),
    }
    return validate_promotion_json(json.dumps(details)), None


def enrich_sportsbook_xlsx_rows(
    content: bytes, rows: tuple[Any, ...]
) -> list[dict[str, JsonScalar]]:
    offer_groups = parse_optional_offer_groups_xlsx(content)
    enriched: list[dict[str, JsonScalar]] = []
    for row in rows:
        fields: dict[str, JsonScalar] = dict(row.fields)
        group_id = str(fields.get("OfferGroupID") or fields.get("Offer Group ID") or "").strip()
        group = offer_groups.get(group_id)
        if group:
            details, review = promotion_details_from_offer_group(group)
            existing = str(fields.get("PromotionDetailsJson") or "").strip()
            if review:
                fields["__PlumDuffPromotionReview"] = review
            elif existing and validate_promotion_json(existing) != details:
                fields["__PlumDuffPromotionReview"] = (
                    "Sportsbook and Offer Groups promotion details conflict; review required."
                )
            elif details:
                fields["PromotionDetailsJson"] = details
        enriched.append(fields)
    return enriched
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
    "Stake Access": "stake_access",
    "Promo Access": "promo_access",
    "Fixed Maximum Stake": "fixed_maximum_stake",
    "Stake Restriction Type": "stake_restriction_type",
    "Stake Restriction Note": "stake_restriction_note",
    "Available Promotion Types": "available_promotion_types",
    "Promotion Restriction Note": "promotion_restriction_note",
    "Access Evidence Note": "access_evidence_note",
    "Access Source": "access_source",
    "Access Observed At": "access_observed_at",
    "CurrentBalance": "current_balance",
    "PendingWithdrawalAmount": "pending_withdrawal_amount",
    "LastBalanceUpdate": "last_balance_update",
    "SignUpDate": "sign_up_date",
    "Notes": "notes",
}

STAKE_ACCESS_IMPORT_MAP = {
    "normal": "Normal", "limited": "Limited", "soft limited": "Limited",
    "severely limited": "Severely Limited", "heavily limited": "Severely Limited",
    "minimum only": "Severely Limited", "blocked": "Blocked",
    "not checked": "Not Checked",
    "unknown": "Not Checked",
}
PROMO_ACCESS_IMPORT_MAP = {
    "full": "Full", "restricted": "Restricted", "some promos": "Restricted",
    "boosts only": "Restricted", "none": "None", "no promos": "None",
    "not checked": "Not Checked",
    "unknown": "Not Checked",
}

# Type-scoped workbook spellings that have an established canonical catalogue identity.
ACCOUNT_PROVIDER_ALIASES = {
    ("bookmaker", "betdragon"): "BOOKMAKER-DRAGONBET",
    ("bookmaker", "fitzwilliam"): "BOOKMAKER-FITZBET",
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
    ledger: Literal["sportsbook", "free-bets", "casino-offers", "cash-adjustments", "accounts"] = (
        "sportsbook"
    )


def sportsbook_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    mapped = {target: record.get(target, "") for target in set(SPORTSBOOK_SOURCE_MAP.values())}
    mapped["lay_commission_1"] = ""
    mapped["bet_role"] = mapped.get("bet_role") or "Standalone"
    mapped["promotion_json"] = mapped.get("promotion_json") or None
    return mapped


def free_bet_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    mapped = {target: record.get(target, "") for target in set(FREE_BET_SOURCE_MAP.values())}
    mapped["lay_commission_1"] = ""
    return mapped


def casino_offer_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    return {target: record.get(target, "") for target in set(CASINO_OFFER_SOURCE_MAP.values())}


def cash_adjustment_mapped_fields(row: object) -> dict[str, JsonScalar]:
    record = row.__dict__
    mapped: dict[str, JsonScalar] = {
        target: record.get(target, "") for target in set(CASH_ADJUSTMENT_SOURCE_MAP.values())
    }
    mapped["affects_investment"] = bool(mapped["affects_investment"])
    mapped["affects_cash_snapshot"] = bool(mapped["affects_cash_snapshot"])
    return mapped


def account_mapped_fields(row: AccountRecord) -> dict[str, JsonScalar]:
    mapped, errors, _ = map_account_import_fields(cast(dict[str, JsonScalar], account_export_row(row.profile_id, row)))
    if errors:
        # Existing invalid data remains reviewable rather than being normalised away.
        return dict(row.__dict__)
    return mapped


def sportsbook_export_row(profile_id: str, row: object) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "sportsbook_bet",
        record["sportsbook_bet_id"],
    )
    calculated = build_response(profile_id, row, as_of_date=date.today())
    if calculated.calculation_state == "review_required":
        raise HTTPException(status_code=409, detail={"record_id": record["sportsbook_bet_id"],
                                                   "errors": calculated.calculation_notes})
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
        "OfferGroupID": record["offer_group_id"],
        "BetRole": record["bet_role"],
        "WageringContribution (£)": record["wagering_contribution"],
        "PromotionDetailsJson": record["promotion_json"] or "",
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


def casino_offer_export_row(profile_id: str, row: CasinoOfferRecord) -> dict[str, object]:
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


def cash_adjustment_export_row(profile_id: str, row: CashAdjustmentRecord) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "cash_adjustment",
        record["cash_adjustment_id"],
    )
    calculated = build_cash_adjustment_response(row)
    return {
        "AdjustmentID": (source.source_record_id if source else record["cash_adjustment_id"]),
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


LEGACY_ACCOUNT_STATUS_MAP = {
    "Restricted": "Bonus Restricted",
    "Dormant": "Inactive",
}
LEGACY_ACCOUNT_CHANNEL_MAP = {"App Only": "Mobile"}


def normalize_provider_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def normalize_legacy_account_fields(fields: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    normalized = dict(fields)
    transformations: list[str] = []
    legacy_status = str(normalized.get("Status", "")).strip()
    if legacy_status in LEGACY_ACCOUNT_STATUS_MAP:
        normalized["Status"] = LEGACY_ACCOUNT_STATUS_MAP[legacy_status]
        transformations.append(f"Status {legacy_status} -> {normalized['Status']}")
    legacy_channel = str(normalized.get("Channel", "")).strip()
    if legacy_channel in LEGACY_ACCOUNT_CHANNEL_MAP:
        normalized["Channel"] = LEGACY_ACCOUNT_CHANNEL_MAP[legacy_channel]
        transformations.append(f"Channel {legacy_channel} -> {normalized['Channel']}")
    return normalized, transformations


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
    folded = account_name.strip().casefold()
    candidates = [record for record in load_master_account_catalogue().records
                  if record.account_type == expected_type]
    exact = [record for record in candidates if folded in
             {record.brand_name.casefold(), record.short_display_name.casefold()}]
    if exact:
        return exact[0] if len(exact) == 1 else None
    alias_id = ACCOUNT_PROVIDER_ALIASES.get((expected_type.casefold(), folded))
    aliases = [record for record in candidates if record.catalogue_id == alias_id]
    if aliases:
        return aliases[0] if len(aliases) == 1 else None
    return None


def account_export_row(profile_id: str, row: AccountRecord) -> dict[str, object]:
    record = row.__dict__
    source = get_import_source_record_for_entity(
        profile_id,
        "account",
        record["account_id"],
    )
    catalogue = resolve_account_catalogue_record(record["account"], record["type"])
    try:
        restriction_details = json.loads(record["restriction_details_json"] or "{}")
    except json.JSONDecodeError:
        restriction_details = {}
    return {
        "AccountID": source.source_record_id if source else record["account_id"],
        "SourceNamespace": "account",
        "CatalogueID": record.get("catalogue_id") or (catalogue.catalogue_id if catalogue else ""),
        "Lifecycle Status": record["lifecycle_status"],
        "Signup Offer Status": record["signup_offer_status"],
        "Restrictions": ", ".join(json.loads(record["restrictions_json"] or "[]")),
        "CommissionRate": get_profile_exchange_commission(profile_id, record["account"]) if record["type"] == "Exchange" else "",
        "Account": record["account"],
        "Type": record["type"],
        "Counts In Cash Total": record["counts_in_cash_total"],
        "Channel": record["channel"],
        "Status": record["status"],
        "Stake Access": record["stake_access"],
        "Promo Access": record["promo_access"],
        "Fixed Maximum Stake": restriction_details.get("fixed_maximum_stake", ""),
        "Stake Restriction Type": restriction_details.get("stake_restriction_type", ""),
        "Stake Restriction Note": restriction_details.get("stake_restriction_note", ""),
        "Available Promotion Types": ", ".join(
            restriction_details.get("available_promotion_types", [])
            if isinstance(restriction_details.get("available_promotion_types", []), list)
            else []
        ),
        "Promotion Restriction Note": restriction_details.get(
            "promotion_restriction_note", ""
        ),
        "Access Evidence Note": record["access_evidence_note"],
        "Access Source": record["access_source"],
        "Access Observed At": record["access_observed_at"],
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
                default_underlay_factor=str(row.get("default_underlay_factor") or ""),
                default_overlay_factor=str(row.get("default_overlay_factor") or ""),
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
        source_values.append(source_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
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
                offer_type=("Normal" if row.get("bet_role") in {"Wagering", "RewardUse"} else str(row.get("offer_type") or "")),
                back_stake=str(row.get("back_stake") or ""),
                back_odds=str(row.get("back_odds") or ""),
                match_strategy=str(row.get("match_strategy") or ""),
                bonus_trigger=str(row.get("bonus_trigger") or ""),
                maximum_bonus=str(row.get("maximum_bonus") or ""),
                bonus_retention_rate=str(row.get("bonus_retention_rate") or "70"),
                lay_odds_1=str(row.get("lay_odds_1") or ""),
                multi_lay_outcome_1_name=str(row.get("multi_lay_outcome_1_name") or ""),
                multi_lay_outcomes_json=str(row.get("multi_lay_outcomes_json") or "[]"),
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
        source_values.append(source_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
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
                    "multi_lay_outcome_1_name": mapped.get("multi_lay_outcome_1_name"),
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
                    "default_underlay_factor": (tracker_settings.default_free_bet_underlay_factor),
                    "default_overlay_factor": (tracker_settings.default_free_bet_overlay_factor),
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


def first_non_blank_field_text(fields: dict[str, JsonScalar], *names: str) -> str:
    """Return the first populated alias without letting an empty alias mask a later value."""
    for name in names:
        value = fields.get(name)
        if value is not None and str(value).strip():
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


def normalize_workbook_match_strategy(value: JsonScalar) -> str:
    """Translate workbook vocabulary to the existing canonical ledger strategy."""
    text = str(value or "").strip()
    if text.casefold() in {"*no exchange*", "no exchange"}:
        return "No Lay"
    return text


def is_historical_void_zero_import(fields: dict[str, JsonScalar]) -> bool:
    """Identify a terminal Void whose explicit zero is result evidence, not an override."""
    status = first_non_blank_field_text(fields, "status", "Status").casefold()
    result = first_non_blank_field_text(fields, "result", "Result").casefold()
    manual_override = first_non_blank_field_text(
        fields,
        "manual_override_value",
        "ManualOverrideValue",
    )
    audited_pnl = first_non_blank_field_text(
        fields,
        "FinalNetPnL",
        "NetPnL",
        "ReportingValue",
        "CalcNetPnL",
    )
    value_text = manual_override or audited_pnl
    terminal_void = any(
        "void" in {token for token in value.replace("/", " ").replace("-", " ").split()}
        for value in (status, result)
    )
    if not terminal_void or not value_text:
        return False
    try:
        value = Decimal(value_text.replace(",", "").replace("£", ""))
    except InvalidOperation:
        return False
    return value.is_finite() and value == Decimal("0")


def is_historical_free_bet_void_zero_import(fields: dict[str, JsonScalar]) -> bool:
    """Identify deterministic terminal Free Bet Void evidence before payload validation."""
    if not is_historical_void_zero_import(fields):
        return False
    status = first_non_blank_field_text(fields, "status", "Status").casefold()
    result = first_non_blank_field_text(fields, "result", "Result").casefold()
    counts_as_open = first_non_blank_field_text(fields, "counts_as_open", "CountsAsOpen")
    if counts_as_open.casefold() in {"true", "1", "yes"}:
        return False
    terminal_status = status in {"void", "settled", "expired", "converted"}
    terminal_result = "void" in {
        token for token in result.replace("/", " ").replace("-", " ").split()
    }
    explicitly_not_open = counts_as_open.casefold() in {"false", "0", "no"}
    return status == "void" or (terminal_result and (terminal_status or explicitly_not_open))


def _shorten_import_text(value: JsonScalar, limit: int) -> str:
    text = str(value or "")
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _historical_label(fields: dict[str, JsonScalar], *, ledger: str) -> str:
    provider = field_text(fields, "Bookmaker")
    offer_type = field_text(fields, "OfferType")
    source_date = field_text(fields, "DateStarted", "DateSettling")[:10]
    detail = " - ".join(value for value in (provider, offer_type, source_date) if value)
    return f"Historical {ledger}{f' - {detail}' if detail else ''}"


def _workbook_multi_lay_payload(fields: dict[str, JsonScalar]) -> str:
    try:
        outcome_count = int(Decimal(field_text(fields, "OutcomeCount") or "0"))
    except (InvalidOperation, ValueError):
        return ""
    if outcome_count < 2 or outcome_count > 3:
        return ""

    exchange = field_text(fields, "Exchange")
    entries: list[dict[str, str]] = []
    for index in range(1, outcome_count + 1):
        lay_odds = field_text(fields, f"LayOdds{index}")
        if not lay_odds:
            return ""
        matched_stake = field_text(fields, f"LayStake{index}")
        entries.append(
            {
                "id": f"outcome{index}",
                "label": f"Outcome {index}",
                "layOdds": lay_odds,
                "placedExchange": exchange,
                "placedLayOdds": lay_odds,
                "placedMatchedStake": matched_stake,
                "placementState": "placed" if matched_stake else "pending",
            }
        )
    return json.dumps(entries, separators=(",", ":"))


def map_sportsbook_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[dict[str, JsonScalar], list[dict[str, str]]]:
    normalized_fields = dict(fields)
    normalized_fields["MatchStrategy"] = normalize_workbook_match_strategy(
        fields.get("MatchStrategy", "")
    )
    mapped: dict[str, JsonScalar] = {}
    for source, target in SPORTSBOOK_SOURCE_MAP.items():
        value = normalized_fields.get(source, "")
        if value not in (None, "") or target not in mapped:
            mapped[target] = value
    mapped.update(
        {
            "bonus_trigger": mapped.get("bonus_trigger") or "",
            "maximum_bonus": mapped.get("maximum_bonus") or "",
            "bonus_retention_rate": mapped.get("bonus_retention_rate") or "70",
            "multi_lay_outcome_1_name": mapped.get("multi_lay_outcome_1_name") or "",
            "multi_lay_outcomes_json": mapped.get("multi_lay_outcomes_json") or "[]",
            "lay_commission_1": "",
            "bet_role": mapped.get("bet_role") or "Standalone",
            "promotion_json": mapped.get("promotion_json") or None,
        }
    )
    mapped["lay_actual"] = mapped.get("lay_actual") or normalized_fields.get(
        "LayStake1", ""
    )
    for field_name, limit in {
        "event_name": 200,
        "offer_text": 200,
        "bookmaker": 120,
        "offer_type": 120,
        "bet_type": 120,
        "offer_name": 200,
        "fixture_type": 120,
        "market": 200,
    }.items():
        mapped[field_name] = _shorten_import_text(mapped.get(field_name, ""), limit)

    status = field_text(normalized_fields, "Status")
    result = field_text(normalized_fields, "Result")
    if not field_text(mapped, "event_name"):
        mapped["event_name"] = _historical_label(fields, ledger="Sportsbook record")
    if not field_text(mapped, "match_strategy") and (
        status in {"Void", "Cancelled", "Free Bet Awarded"} or result == "Void"
    ):
        mapped["match_strategy"] = "No Lay"
    if is_historical_void_zero_import(normalized_fields):
        mapped["result"] = "Void"
        mapped["manual_override_value"] = ""
        mapped["manual_override_reason"] = ""

    errors: list[dict[str, str]] = []
    match_strategy = field_text(mapped, "match_strategy")
    if (status in {"Placed", "Settled", "Free Bet Awarded"}
            and result != "Void" and match_strategy != "No Lay"
            and not field_text(mapped, "exchange_name")):
        try:
            has_actual_lay = any(
                Decimal(field_text(mapped, field) or "0") > 0
                for field in ("lay_actual", "lay_matched_stake_1")
            )
        except InvalidOperation:
            has_actual_lay = False  # Numeric validation below reports malformed values.
        if has_actual_lay:
            errors.append(issue("actual_lay_exchange_required",
                                "An actual lay needs its Exchange before commission can resolve."))
    outcome_count = field_text(fields, "OutcomeCount")
    has_advanced_branch = match_strategy != "No Lay" and any(
        field_text(fields, name) for name in SPORTSBOOK_ADVANCED_BRANCH_FIELDS
    )
    branch_json = field_text(fields, "MultiLayOutcomesJson")
    if match_strategy in {"Multilay", "Multilay-Underlay"} and not branch_json:
        branch_json = _workbook_multi_lay_payload(fields)
        if branch_json:
            mapped["multi_lay_outcomes_json"] = branch_json
            primary_stake = field_text(fields, "LayStake1")
            if primary_stake:
                mapped["lay_actual"] = mapped.get("lay_actual") or primary_stake
                mapped["lay_matched_stake_1"] = mapped.get("lay_matched_stake_1") or primary_stake
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
    partial_lay_is_incomplete = match_strategy == "Partial Lay" and not (
        field_text(mapped, "lay_actual") or field_text(mapped, "lay_matched_stake_1")
    )
    advanced_branch_is_unmapped = (
        match_strategy in {"Multilay", "Multilay-Underlay"}
        or (outcome_count and outcome_count not in {"0", "1"})
        or has_advanced_branch
    ) and not has_branch_preserving_payload
    if match_strategy != "No Lay" and (partial_lay_is_incomplete or advanced_branch_is_unmapped):
        errors.append(
            issue(
                "advanced_branch_mapping_required",
                "Advanced sportsbook branches require the branch-preserving import mapper.",
            )
        )
        return mapped, errors

    # Imported terminal/branch-preserving history is evidence, not a request to
    # calculate a new placement. Preserve it even when the old workbook did not
    # retain every input now required for a new native row.
    terminal_historical = (
        status in {"Void", "Cancelled", "Free Bet Awarded"}
        or result == "Void"
        or is_historical_void_zero_import(normalized_fields)
    )
    if terminal_historical or has_branch_preserving_payload:
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
    normalized_fields = dict(fields)
    normalized_fields["MatchStrategy"] = normalize_workbook_match_strategy(
        fields.get("MatchStrategy", "")
    )
    mapped: dict[str, JsonScalar] = {
        target: normalized_fields.get(source, "") for source, target in FREE_BET_SOURCE_MAP.items()
    }
    mapped["lay_commission_1"] = ""
    mapped["lay_actual"] = mapped.get("lay_actual") or normalized_fields.get(
        "LayStake1", ""
    )
    for field_name, limit in {
        "event_name": 200,
        "offer_text": 200,
        "bookmaker": 120,
        "offer_type": 120,
        "bet_type": 120,
        "offer_name": 200,
        "fixture_type": 120,
    }.items():
        mapped[field_name] = _shorten_import_text(mapped.get(field_name, ""), limit)
    if is_historical_free_bet_void_zero_import(normalized_fields):
        # FinalNetPnL normally maps to a discretionary override. A terminal Void zero is result
        # evidence, so remove that override before the generic Free Bet payload validator runs.
        mapped["status"] = "Void"
        mapped["result"] = "Void"
        mapped["manual_override_value"] = ""
        mapped["manual_override_reason"] = ""
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
        target: fields.get(source, "") for source, target in CASINO_OFFER_SOURCE_MAP.items()
    }
    if not field_text(mapped, "date_settling"):
        mapped["date_settling"] = field_text(mapped, "date_started")
    if not field_text(mapped, "offer_name"):
        mapped["offer_name"] = _historical_label(fields, ledger="Casino Offer")
    for field_name, limit in {
        "bookmaker": 120,
        "offer_type": 120,
        "offer_name": 400,
        "game": 200,
    }.items():
        mapped[field_name] = _shorten_import_text(mapped.get(field_name, ""), limit)
    errors: list[dict[str, str]] = []
    if field_text(mapped, "final_net_pnl") and not field_text(mapped, "user_notes"):
        errors.append(issue("override_reason_required",
                            "A casino final value requires an explanatory UserNotes entry."))
    try:
        CasinoOfferPayload.model_validate(mapped)
    except ValidationError as error:
        errors.append(
            issue(
                "invalid_casino_offer_payload",
                "; ".join(f"{'.'.join(map(str, item['loc']))}: {item['msg']}"
                          for item in error.errors()),
            )
        )
    return mapped, errors


def map_cash_adjustment_import_fields(
    fields: dict[str, JsonScalar],
) -> tuple[dict[str, JsonScalar], list[dict[str, str]]]:
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "") for source, target in CASH_ADJUSTMENT_SOURCE_MAP.items()
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
    fields, transformations = normalize_legacy_account_fields(fields)
    mapped: dict[str, JsonScalar] = {
        target: fields.get(source, "") for source, target in ACCOUNT_SOURCE_MAP.items()
    }
    errors: list[dict[str, str]] = []
    if field_text(fields, "SourceNamespace") not in ("", "account"):
        errors.append(issue("invalid_account_namespace", "Accounts source namespace must be account."))
    mapped["signup_offer_status"] = field_text(fields, "Signup Offer Status") or "Unknown"
    commission = field_text(fields, "CommissionRate")
    mapped["commission_rate"] = commission or None
    mapped["access_source"] = field_text(fields, "Access Source") or "workbook_import"
    warnings = [issue("legacy_account_vocabulary", message) for message in transformations]
    promotion_types_raw = field_text(mapped, "available_promotion_types")
    promotion_types = [
        value.strip()
        for value in promotion_types_raw.replace(";", ",").split(",")
        if value.strip()
    ]
    restriction_details = {
        "fixed_maximum_stake": field_text(mapped, "fixed_maximum_stake"),
        "stake_restriction_type": field_text(mapped, "stake_restriction_type"),
        "stake_restriction_note": field_text(mapped, "stake_restriction_note"),
        "available_promotion_types": promotion_types,
        "promotion_restriction_note": field_text(mapped, "promotion_restriction_note"),
    }
    for transient_field in (
        "fixed_maximum_stake",
        "stake_restriction_type",
        "stake_restriction_note",
        "available_promotion_types",
        "promotion_restriction_note",
    ):
        mapped.pop(transient_field, None)
    account_name = field_text(mapped, "account")
    account_type = field_text(mapped, "type")
    for field_name, value_map in (
        ("stake_access", STAKE_ACCESS_IMPORT_MAP),
        ("promo_access", PROMO_ACCESS_IMPORT_MAP),
    ):
        raw_value = field_text(mapped, field_name)
        if not raw_value:
            mapped[field_name] = "Not Checked"
            continue
        canonical = value_map.get(raw_value.casefold())
        if canonical is None:
            errors.append(
                issue(
                    f"invalid_{field_name}",
                    f"Unsupported {field_name.replace('_', ' ')} value: {raw_value}",
                )
            )
        else:
            mapped[field_name] = canonical
            if canonical.casefold() != raw_value.casefold():
                warnings.append(
                    issue(
                        f"normalized_{field_name}",
                        f"{raw_value} is retained as import evidence and mapped to {canonical}.",
                    )
                )
    try:
        lifecycle_status, restrictions = resolve_account_lifecycle_and_restrictions(
            status=field_text(mapped, "status"),
            lifecycle_status=field_text(fields, "Lifecycle Status") or None,
            restrictions=[v.strip() for v in field_text(fields, "Restrictions").split(",") if v.strip()],
        )
        mapped["lifecycle_status"] = lifecycle_status
        mapped["restrictions"] = restrictions
    except ValueError as error:
        errors.append(issue("invalid_account_state", str(error)))
    if field_text(mapped, "status").casefold() == "pending sign up":
        mapped["counts_in_cash_total"] = False
    catalogue_id = field_text(fields, "CatalogueID")
    expected_type = "Bookmaker" if account_type == "Bookie" else account_type
    catalogue = next((r for r in load_master_account_catalogue().records
                      if r.catalogue_id == catalogue_id and r.account_type == expected_type), None) if catalogue_id else resolve_account_catalogue_record(account_name, account_type)
    if catalogue is None:
        errors.append(
            issue(
                "account_catalogue_match_required",
                "Account must match an exact provider or approved alias of the same type. Review or create the provider explicitly in Fund Manager Account Catalogue, then repeat dry-run.",
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
            catalogue_id=catalogue.catalogue_id,
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
            errors.append(issue("invalid_account_sign_up_date", "SignUpDate must be a valid date."))

    try:
        validated = AccountPayload.model_validate(
            {**mapped, "restriction_details": restriction_details}
        ).model_dump(mode="json")
        from openforge_api.account_channels import access_channels_json

        validated["access_channels_json"] = access_channels_json(
            validated.get("access_channels", [])
        )
        validated["restriction_details_json"] = json.dumps(
            validated.pop("restriction_details"), sort_keys=True
        )
        mapped = {key: validated[key] for key in validated}
        mapped["commission_rate"] = None
        if commission:
            try:
                rate = Decimal(commission)
                if account_type != "Exchange" or not rate.is_finite() or not 0 <= rate <= 1:
                    raise InvalidOperation
                mapped["commission_rate"] = str(rate)
            except InvalidOperation:
                errors.append(issue("invalid_account_commission", "CommissionRate must be an explicit Exchange rate between 0 and 1."))
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
    source_lookup: SourceLookup | None = None,
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
        promotion_review = str(row.fields.get("__PlumDuffPromotionReview") or "").strip()
        if promotion_review:
            warnings.append(issue("promotion_details_conflict", promotion_review))

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
                    if (
                        field_text(mapped_fields, "offer_group_id")
                        and field_text(mapped_fields, "bet_role") in {"Trigger", "Wagering", "RewardUse"}
                        and not field_text(mapped_fields, "promotion_json")
                    ):
                        warnings.append(
                            issue(
                                "promotion_details_required",
                                "Promotion details required; the linked Sportsbook row may still be imported and completed in Plum Duff.",
                            )
                        )
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
                    mapped_fields, mapping_errors = map_casino_offer_import_fields(row.fields)
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
                    mapped_fields, mapping_errors = map_cash_adjustment_import_fields(row.fields)
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

            status = field_text(mapped_fields, "status") or field_text(
                row.fields, "status", "Status"
            )
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
                *( ("FinalNetPnL",) if source_sheet != "Sportsbook Bets" else () ),
            )
            override_reason = field_text(
                row.fields, "manual_override_reason", "ManualOverrideReason"
            )
            if source_sheet == "Casino Offers" and not override_reason:
                override_reason = field_text(row.fields, "UserNotes", "user_notes")
            historical_void_zero = (
                source_sheet == "Sportsbook Bets"
                and is_historical_void_zero_import(row.fields)
            ) or (
                source_sheet == "Free Bets"
                and is_historical_free_bet_void_zero_import(row.fields)
            )
            if (override_value and not override_reason and not historical_void_zero
                    and not any(error["code"] == "override_reason_required" for error in errors)):
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
                    existing = (
                        source_lookup(source_sheet, source_record_id)
                        if source_lookup is not None
                        else get_import_source_record(
                            profile_id,
                            logical_source_namespace(source_sheet),
                            source_record_id,
                        )
                    )
                    # Source identity is Profile-scoped. A lookup implementation must
                    # never turn another Profile's same external ID into this Profile's
                    # retry or linkage result.
                    if existing is not None and existing.profile_id != profile_id:
                        existing = None
                    if existing is not None and existing.requires_workbook_review:
                        errors.append(issue(
                            "explicit_update_required",
                            "This source identity belongs to a reviewed full-workbook import "
                            "or restore. "
                            "Use that review context; a per-ledger import cannot "
                            "silently replace it.",
                        ))
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
                            native_row = None
                        if native_row is not None:
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
                            free_bet_native_row = None
                        if free_bet_native_row is not None:
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
                            casino_native_row = None
                        if casino_native_row is not None:
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
                        cash_adjustment_native_row = get_cash_adjustment_by_id(source_record_id)
                        if (
                            cash_adjustment_native_row is not None
                            and cash_adjustment_native_row.profile_id != profile_id
                        ):
                            cash_adjustment_native_row = None
                        if cash_adjustment_native_row is not None:
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
                            account_native_row = None
                        if account_native_row is not None:
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

    if mapping_version == "accounts-v1":
        existing_accounts = list_accounts(profile_id)
        providers: dict[tuple[str, str], list[dict[str, Any]]] = {}
        for staged in staged_rows:
            mapped = staged["mapped_fields"]
            key = (str(mapped.get("type", "")), str(mapped.get("catalogue_id") or mapped.get("account", "")).casefold())
            providers.setdefault(key, []).append(staged)
        for group in providers.values():
            conflict = len({r["source_record_id"] for r in group}) > 1
            for staged in group:
                mapped = staged["mapped_fields"]
                if staged["staged_action"] == "update":
                    source = get_import_source_record(profile_id, "account", staged["source_record_id"])
                    target_id = source.entity_id if source is not None else staged["source_record_id"]
                    target = get_account(profile_id, target_id)
                    if target is not None:
                        current_fields = account_mapped_fields(target)
                        mapped["_reviewed_target_hash"] = canonical_source_hash(current_fields)
                        if target.type == "Exchange" and mapped.get("commission_rate") is None and current_fields.get("commission_rate") is not None:
                            staged["staged_action"] = "blocked"
                            staged["errors"].append(issue("account_commission_review_required",
                                "Source commission is missing but this Profile has a configured Exchange rate. Review that rate explicitly; import will not erase or invent commission."))
                occupied = staged["staged_action"] == "insert" and any(
                    a.type == mapped.get("type") and (
                        bool(a.catalogue_id) and a.catalogue_id == mapped.get("catalogue_id")
                        or a.account.strip().casefold() == str(mapped.get("account", "")).strip().casefold()
                    ) for a in existing_accounts
                )
                if conflict or occupied:
                    staged["staged_action"] = "blocked"
                    staged["errors"].append(issue("account_destination_conflict",
                        "Multiple source rows target one provider." if conflict else
                        "This Profile already has this provider under another source identity. Review the existing Account; no automatic merge."))
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
                batch.profile_id,
                logical_source_namespace(staged["source_sheet"]),
                staged["source_record_id"],
            )
            existing = (
                get_account(batch.profile_id, source.entity_id)
                if source is not None and source.entity_type == "account"
                else get_account_by_id(staged["source_record_id"])
            )
            if existing is not None and existing.profile_id == batch.profile_id:
                existing_mapped_fields = account_mapped_fields(existing)
        proposed_mapped_fields = {key: value for key, value in json.loads(staged["mapped_payload_json"]).items() if not key.startswith("_reviewed_")}
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


def persist_import_dry_run(*, profile_id: str, payload: ImportDryRunPayload) -> ImportBatchResponse:
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

    sportsbook_fields = (
        enrich_sportsbook_xlsx_rows(content, parsed.rows)
        if resolved_ledger == "sportsbook"
        else []
    )

    return persist_import_dry_run(
        profile_id=profile_id,
        payload=ImportDryRunPayload(
            source_filename=payload.source_filename,
            source_type="xlsx",
            mapping_version=mapping_version,
            rows=[
                ImportRowPayload(
                    sheet=source_sheet,
                    source_record_id=cast(Any, row).source_record_id,
                    source_row=cast(Any, row).source_row,
                    fields={
                        **(
                            sportsbook_fields[index]
                            if resolved_ledger == "sportsbook"
                            else cast(Any, row).fields
                        ),
                        "__PlumDuffOutsideTableRange": cast(Any, row).outside_table_range,
                    },
                )
                for index, row in enumerate(parsed.rows)
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
        media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        headers={
            "Content-Disposition": (f'attachment; filename="plum-duff-{profile_id}-accounts.xlsx"')
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
    records = list_sportsbook_bets(profile_id)
    if any(row.lay_plan_json for row in records):
        raise HTTPException(status_code=409, detail="Legacy workbook export cannot retain versioned lay plans. Use native portable Profile export; no records were dropped.")
    rows = [sportsbook_export_row(profile_id, row) for row in records]
    content = build_sportsbook_export(rows)
    return Response(
        content=content,
        media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
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
    records = list_free_bets(profile_id)
    if any(row.lay_plan_json for row in records):
        raise HTTPException(status_code=409, detail="Legacy workbook export cannot retain versioned lay plans. Use native portable Profile export; no records were dropped.")
    rows = [free_bet_export_row(profile_id, row) for row in records]
    content = build_free_bet_export(rows)
    return Response(
        content=content,
        media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        headers={
            "Content-Disposition": (f'attachment; filename="plum-duff-{profile_id}-free-bets.xlsx"')
        },
    )


@router.get("/casino-offers/export.xlsx")
def export_profile_casino_offers_xlsx(profile_id: str) -> Response:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = [casino_offer_export_row(profile_id, row) for row in list_casino_offers(profile_id)]
    content = build_casino_offer_export(rows)
    return Response(
        content=content,
        media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
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
        cash_adjustment_export_row(profile_id, row) for row in list_cash_adjustments(profile_id)
    ]
    content = build_cash_adjustment_export(rows)
    return Response(
        content=content,
        media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        headers={
            "Content-Disposition": (
                f'attachment; filename="plum-duff-{profile_id}-cash-adjustments.xlsx"'
            )
        },
    )


@router.get("/{import_batch_id}", response_model=ImportBatchResponse)
def get_profile_import_batch(profile_id: str, import_batch_id: str) -> ImportBatchResponse:
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


def _verified_ledger_import_backup(import_batch_id: str) -> BackupSnapshotRecord:
    # Per-ledger confirmation requires its existing full local SQLite backup.
    # Hosted workbook import has a separate governed Profile checkpoint path.
    if settings.database_mode.strip().lower() in {"neon", "postgres", "postgresql"}:
        raise HTTPException(
            status_code=409,
            detail=("Per-ledger confirmation requires a verified local SQLite backup. "
                    "Use local import or the governed Profile workbook import workflow; "
                    "no records were imported."),
        )
    return create_verified_local_backup(reason=f"Pre-import backup for batch {import_batch_id}")


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
        row.import_staged_row_id for row in staged_rows if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = _verified_ledger_import_backup(import_batch_id)
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
        row.import_staged_row_id for row in staged_rows if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = _verified_ledger_import_backup(import_batch_id)
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
        row.import_staged_row_id for row in staged_rows if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = _verified_ledger_import_backup(import_batch_id)
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
        row.import_staged_row_id for row in staged_rows if row.staged_action == "insert"
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new, compatible rows from this batch can be selected",
        )

    backup = _verified_ledger_import_backup(import_batch_id)
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
        row.import_staged_row_id for row in staged_rows if row.staged_action in {"insert", "update"}
    }
    if not selected_ids.issubset(selectable_ids):
        raise HTTPException(
            status_code=422,
            detail="Only new or changed compatible rows from this batch can be selected",
        )

    backup = _verified_ledger_import_backup(import_batch_id)
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
