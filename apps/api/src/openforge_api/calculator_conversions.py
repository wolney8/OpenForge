from __future__ import annotations

import hashlib
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from openforge_api.auth import require_request_session
from openforge_api.calculators import (
    EachWayPayload,
    MatchedBettingPayload,
    MultiLayPayload,
    _calculate,
    preview_each_way,
    preview_multi_lay,
)
from openforge_api.db import (
    begin_calculator_conversion_target,
    complete_calculator_conversion_target,
    create_casino_offer,
    create_free_bet,
    create_sportsbook_bet,
    fail_calculator_conversion_target,
    get_free_bet,
    get_profile,
    get_profile_tracker_settings,
    get_sportsbook_bet,
    list_accounts,
    list_profile_exchange_commissions,
    profile_module_enabled,
)
from openforge_api.each_way_extra_places import (
    EachWayExtraPlacePayload,
    create_profile_each_way_extra_place,
)
from openforge_api.free_bets import build_response as build_free_bet_response
from openforge_api.fund_manager_lookup_values import DEFAULT_AUTHORITIES, SPORTSBOOK_OFFER_BET_TYPES
from openforge_api.multi_profile_entry import (
    evaluate_multi_profile_target,
    get_account_restrictions,
)
from openforge_api.sportsbook import build_response as build_sportsbook_response

router = APIRouter(prefix="/fund-manager/calculator-conversions", tags=["calculator-conversions"])


class ConversionEnvelope(BaseModel):
    calculator_family: str = Field(min_length=1, max_length=80)
    calculator_version: str = Field(min_length=1, max_length=80)
    calculator_mode: str = Field(default="", max_length=80)
    canonical_inputs: dict[str, Any]
    created_at: str = Field(min_length=1, max_length=60)


class SportsbookTarget(BaseModel):
    profile_id: str = Field(min_length=1, max_length=64)
    account_id: str = Field(default="", max_length=64)
    bookmaker: str = Field(default="", max_length=120)


class StandardConversionPayload(BaseModel):
    source: ConversionEnvelope
    calculator: MatchedBettingPayload
    targets: list[SportsbookTarget] = Field(min_length=1)
    event_name: str = Field(min_length=1, max_length=200)
    offer_type: str = Field(min_length=1, max_length=120)
    bet_type: str = Field(min_length=1, max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)
    conversion_intent_id: str = Field(default="legacy", min_length=1, max_length=80)


class MultiLayConversionPayload(BaseModel):
    source: ConversionEnvelope
    calculator: MultiLayPayload
    targets: list[SportsbookTarget] = Field(min_length=1)
    event_name: str = Field(min_length=1, max_length=200)
    offer_type: str = Field(default="Qualifying Bet", min_length=1, max_length=120)
    bet_type: str = Field(default="Single", min_length=1, max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)
    conversion_intent_id: str = Field(default="legacy", min_length=1, max_length=80)


class EachWayConversionPayload(BaseModel):
    source: ConversionEnvelope
    calculator: EachWayPayload
    targets: list[SportsbookTarget] = Field(min_length=1)
    runner: str = Field(min_length=1, max_length=240)
    race: str = Field(min_length=1, max_length=240)
    conversion_intent_id: str = Field(default="legacy", min_length=1, max_length=80)


class BlackjackConversionPayload(BaseModel):
    snapshot: dict[str, Any]
    profile_id: str = Field(min_length=1, max_length=64)
    casino_account: str = Field(min_length=1, max_length=120)
    activity_name: str = Field(default="Blackjack session", min_length=1, max_length=400)
    offer_identity: str = Field(default="", max_length=400)
    casino_account_id: str = Field(default="", max_length=64)


class ConversionTargetResult(BaseModel):
    profile_id: str
    account: str
    state: Literal["succeeded", "failed", "already_succeeded"]
    record_id: str = ""
    href: str = ""
    reasons: list[str] = Field(default_factory=list)


class ConversionResponse(BaseModel):
    source_id: str
    source_checksum: str
    results: list[ConversionTargetResult]
    notification: str


def _require_fund_manager(request: Request) -> None:
    session = require_request_session(request)
    if session.role != "fund_manager":
        raise HTTPException(status_code=403, detail="Fund Manager access is required")


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _envelope_identity(envelope: ConversionEnvelope) -> tuple[str, str, str]:
    canonical = _canonical_json(envelope.model_dump())
    checksum = hashlib.sha256(canonical.encode()).hexdigest()
    return f"{envelope.calculator_family}-{checksum[:20]}", checksum, canonical


def _snapshot_identity(snapshot: dict[str, Any]) -> tuple[str, str, str]:
    supplied_id = str(snapshot.get("source_id", ""))
    supplied_checksum = str(snapshot.get("source_checksum", ""))
    unsigned = {
        key: value for key, value in snapshot.items() if key not in {"source_id", "source_checksum"}
    }
    checksum = hashlib.sha256(_canonical_json(unsigned).encode()).hexdigest()
    if supplied_checksum != checksum or supplied_id != f"blackjack-session-{checksum[:20]}":
        raise HTTPException(status_code=422, detail="Blackjack source snapshot checksum is invalid")
    return supplied_id, checksum, _canonical_json(snapshot)


def _validated_blackjack_source(snapshot: dict[str, Any]) -> tuple[str, str, Decimal]:
    if snapshot.get("calculator_family") != "blackjack_strategy":
        raise HTTPException(status_code=422, detail="Blackjack source family is invalid")
    if snapshot.get("calculator_version") != "blackjack-session-v1":
        raise HTTPException(status_code=422, detail="Blackjack source version is unsupported")
    mode = str(snapshot.get("session_mode", ""))
    activity_source = str(snapshot.get("activity_source", ""))
    if mode not in {"free_play", "live_play"}:
        raise HTTPException(status_code=422, detail="Simulation sessions cannot be converted")
    if activity_source not in {"free_credit", "promotion", "own_cash"}:
        raise HTTPException(status_code=422, detail="Select a valid Blackjack Activity source")
    hands = snapshot.get("hands")
    if not isinstance(hands, list) or not hands or snapshot.get("total_hands") != len(hands):
        raise HTTPException(status_code=422, detail="Blackjack hand history is incomplete")
    monetary = snapshot.get("monetary")
    if not isinstance(monetary, dict):
        raise HTTPException(status_code=422, detail="Blackjack monetary review is incomplete")
    final_value = (
        monetary.get("session_result")
        if mode == "live_play"
        else monetary.get("withdrawable_result")
    )
    try:
        parsed_final = Decimal(str(final_value))
    except (InvalidOperation, ValueError):
        raise HTTPException(
            status_code=422, detail="Reviewed session financial result is required"
        ) from None
    if not parsed_final.is_finite() or parsed_final.as_tuple().exponent != -2:
        raise HTTPException(
            status_code=422, detail="Reviewed session financial result must use two decimals"
        )
    return mode, activity_source, parsed_final


def _existing_result(
    attempt: dict[str, Any], profile_id: str, account: str
) -> ConversionTargetResult | None:
    if attempt["state"] != "Succeeded" or not attempt["destination_record_id"]:
        return None
    record_id = str(attempt["destination_record_id"])
    ledger = {
        "sportsbook": "sportsbook-bets",
        "free_bet": "free-bets",
        "each_way_extra_place": "each-way-extra-places",
    }.get(attempt["destination_kind"], "casino-offers")
    return ConversionTargetResult(
        profile_id=profile_id,
        account=account,
        state="already_succeeded",
        record_id=record_id,
        href=f"/profiles/{profile_id}/tracker/{ledger}?record={record_id}&source=calculator-conversion",
    )


def _standard_destination(payload: StandardConversionPayload) -> tuple[str, str]:
    calculator = payload.calculator
    if calculator.bet_type == "bonus_lock_in" and calculator.bonus_backing_bet != "Normal":
        raise HTTPException(
            status_code=422,
            detail=(
                "Bonus Lock-In conversion currently requires a Normal backing bet because "
                "the destination ledger has no governed free-bet-basis field."
            ),
        )
    if calculator.bet_type == "free_bet":
        return "free_bet", payload.offer_type
    expected_offer = {
        "cashback": "Cashback",
        "money_back": "Bonus Lock-In",
        "bonus_lock_in": "Bonus Lock-In",
        "profit_boost": "Profit Boost",
    }.get(calculator.bet_type)
    if calculator.bet_type == "qualifying" and calculator.promotion_mode == "cashback":
        expected_offer = "Cashback"
    if expected_offer and payload.offer_type != expected_offer:
        raise HTTPException(
            status_code=422,
            detail=f"{calculator.bet_type.replace('_', ' ').title()} conversion requires "
            f"Offer type {expected_offer}.",
        )
    return "sportsbook", payload.offer_type


def _resolve_account_identity(
    *, profile_id: str, account_id: str, legacy_name: str, expected_type: str = "Bookie"
) -> Any:
    candidates = [item for item in list_accounts(profile_id) if item.type == expected_type]
    if account_id:
        account = next((item for item in candidates if item.account_id == account_id), None)
        if account is None:
            raise HTTPException(
                status_code=422, detail="Selected Account identity is invalid for this Profile"
            )
        return account
    legacy_matches = [
        item for item in candidates if item.account.casefold() == legacy_name.casefold()
    ]
    if len(legacy_matches) != 1:
        raise HTTPException(status_code=422, detail="Canonical Account identity is required")
    return legacy_matches[0]


def _validate_destination_classification(payload: StandardConversionPayload) -> None:
    if payload.offer_type not in DEFAULT_AUTHORITIES["offer_type"]:
        raise HTTPException(status_code=422, detail="Select a canonical Offer Type")
    if payload.bet_type not in DEFAULT_AUTHORITIES["bet_type"]:
        raise HTTPException(status_code=422, detail="Select a canonical Bet Type")
    if payload.fixture_type and payload.fixture_type not in DEFAULT_AUTHORITIES["fixture_type"]:
        raise HTTPException(status_code=422, detail="Select a canonical Fixture Type")
    allowed = SPORTSBOOK_OFFER_BET_TYPES.get(payload.offer_type)
    if allowed and payload.bet_type not in allowed:
        raise HTTPException(
            status_code=422, detail="Bet Type is incompatible with the selected Offer Type"
        )


def _validate_sportsbook_classification(
    *, offer_type: str, bet_type: str, fixture_type: str
) -> None:
    if offer_type not in DEFAULT_AUTHORITIES["offer_type"]:
        raise HTTPException(status_code=422, detail="Select a canonical Offer Type")
    if bet_type not in DEFAULT_AUTHORITIES["bet_type"]:
        raise HTTPException(status_code=422, detail="Select a canonical Bet Type")
    if fixture_type and fixture_type not in DEFAULT_AUTHORITIES["fixture_type"]:
        raise HTTPException(status_code=422, detail="Select a canonical Fixture Type")
    allowed = SPORTSBOOK_OFFER_BET_TYPES.get(offer_type)
    if allowed and bet_type not in allowed:
        raise HTTPException(
            status_code=422, detail="Bet Type is incompatible with the selected Offer Type"
        )


def _profit_boost_destination_fields(calculator: MatchedBettingPayload) -> dict[str, str]:
    if calculator.bet_type != "profit_boost":
        return {
            "profit_boost_mode": "",
            "base_back_odds": "",
            "profit_boost_percent": "",
            "maximum_boost_winnings": "",
            "actual_accepted_back_odds": "",
        }
    if calculator.profit_boost_mode == "percentage":
        return {
            "profit_boost_mode": "percentage",
            "base_back_odds": calculator.base_back_odds,
            "profit_boost_percent": calculator.profit_boost_percent,
            "maximum_boost_winnings": calculator.maximum_boost_winnings,
            "actual_accepted_back_odds": calculator.actual_accepted_back_odds,
        }
    # Total-return and profit-only inputs are temporary by contract. Their audited
    # effective odds enter the destination's explicit displayed-odds path while the
    # immutable source envelope retains the original derivation.
    return {
        "profit_boost_mode": "displayed_odds",
        "base_back_odds": "",
        "profit_boost_percent": "",
        "maximum_boost_winnings": "",
        "actual_accepted_back_odds": calculator.actual_accepted_back_odds,
    }


@router.post("/standard", response_model=ConversionResponse)
def convert_standard(payload: StandardConversionPayload, request: Request) -> ConversionResponse:
    _require_fund_manager(request)
    _validate_destination_classification(payload)
    if payload.source.calculator_family != "matched-betting":
        raise HTTPException(
            status_code=422, detail="Standard conversion requires matched-betting source"
        )
    if payload.source.calculator_mode != payload.calculator.bet_type:
        raise HTTPException(
            status_code=422, detail="Standard source mode does not match calculator"
        )
    # Revalidate the complete calculator state before any destination write.
    preview = _calculate(payload.calculator)
    destination_kind, destination_offer_type = _standard_destination(payload)
    exchange_name = str(payload.source.canonical_inputs.get("exchange", ""))
    canonical_source = payload.source.model_copy(
        update={
            "canonical_inputs": {
                "calculator": payload.calculator.model_dump(mode="json"),
                "exchange": exchange_name,
                "reference_result": preview.model_dump(mode="json"),
            },
        }
    )
    source_id, checksum, canonical = _envelope_identity(canonical_source)
    results: list[ConversionTargetResult] = []
    canonical_targets: list[tuple[SportsbookTarget, Any]] = []
    for target in payload.targets:
        account = _resolve_account_identity(
            profile_id=target.profile_id, account_id=target.account_id, legacy_name=target.bookmaker
        )
        canonical_targets.append((target, account))
    for target, target_account in list(
        {
            (item.profile_id, account.account_id): (item, account)
            for item, account in canonical_targets
        }.values()
    ):
        bookmaker = target_account.account
        operation_source_id = f"{source_id}:{payload.conversion_intent_id}"
        attempt = begin_calculator_conversion_target(
            source_id=operation_source_id,
            source_checksum=checksum,
            source_family="matched-betting",
            source_version=payload.source.calculator_version,
            source_mode=payload.source.calculator_mode,
            source_envelope_json=canonical,
            destination_kind=destination_kind,
            target_profile_id=target.profile_id,
            target_account=target_account.account_id,
        )
        existing = _existing_result(attempt, target.profile_id, bookmaker)
        if existing:
            results.append(existing)
            continue
        if not attempt["_claimed"]:
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=["Conversion is already in progress; retry after it completes"],
                )
            )
            continue
        profile = get_profile(target.profile_id)
        if profile is None:
            reason = "Profile not found"
            fail_calculator_conversion_target(attempt["attempt_id"], reason)
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=[reason],
                )
            )
            continue
        eligibility = evaluate_multi_profile_target(
            profile=profile,
            accounts=list_accounts(target.profile_id),
            exchange_commissions=list_profile_exchange_commissions(target.profile_id),
            bookmaker=bookmaker,
            offer_type=destination_offer_type,
            match_strategy=payload.calculator.strategy,
        )
        reasons = list(eligibility.reasons)
        exchange_names = {item.exchange_name.casefold() for item in eligibility.exchange_options}
        if exchange_name.casefold() not in exchange_names:
            reasons.append(
                "Selected exchange is not active with configured commission for this Profile"
            )
        if reasons:
            reason = "; ".join(reasons)
            fail_calculator_conversion_target(attempt["attempt_id"], reason)
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=reasons,
                )
            )
            continue
        try:
            source_note = f"Calculator source: {source_id} ({checksum})"
            explicit_lay = (
                preview.selected_lay_stake
                if payload.calculator.bet_type in {"bonus_lock_in", "money_back"}
                else payload.calculator.manual_lay_stake
                if payload.calculator.strategy in {"Custom", "Partial Lay"}
                else ""
            )
            if destination_kind == "free_bet":
                created_free_bet = create_free_bet(
                    target.profile_id,
                    {
                        "event_name": payload.event_name,
                        "offer_text": payload.event_name,
                        "bookmaker": bookmaker,
                        "offer_type": destination_offer_type,
                        "bet_type": payload.bet_type,
                        "offer_name": payload.offer_name,
                        "fixture_type": payload.fixture_type,
                        "status": "Prospecting",
                        "result": "Pending",
                        "retention_mode": payload.calculator.free_bet_mode,
                        "free_bet_value": payload.calculator.back_stake,
                        "back_odds": preview.canonical_back_odds,
                        "match_strategy": payload.calculator.strategy,
                        "lay_odds_1": preview.canonical_lay_odds,
                        "lay_actual": explicit_lay,
                        "lay_matched_stake_1": "",
                        "exchange_name": exchange_name,
                        "expiry_datetime": "",
                        "date_settled": "",
                        "origin_qual_bet_id": "",
                        "offer_group_id": source_id,
                        "source_award_group_id": "",
                        "source_award_split_index": "0",
                        "source_award_split_total": "0",
                        "source_award_expected_value": "",
                        "source_award_variance_reason": "",
                        "user_notes": source_note,
                        "manual_override_value": "",
                        "manual_override_reason": "",
                    },
                )
                free_bet_record = get_free_bet(target.profile_id, created_free_bet.free_bet_id)
                assert free_bet_record is not None
                destination_free_bet = build_free_bet_response(
                    free_bet_record,
                    tracker_settings=get_profile_tracker_settings(target.profile_id),
                )
                if destination_free_bet.calculation_state != "resolved":
                    raise ValueError("Destination Free Bet calculation did not resolve")
                href = (
                    f"/profiles/{target.profile_id}/tracker/free-bets"
                    f"?record={created_free_bet.free_bet_id}&source=calculator-conversion"
                )
                body = f"Added Free Bet opportunity to {profile.display_name}."
                complete_calculator_conversion_target(
                    attempt["attempt_id"],
                    destination_record_id=created_free_bet.free_bet_id,
                    notification_title="Free Bet opportunity added",
                    notification_body=body,
                    notification_link=href,
                )
                results.append(
                    ConversionTargetResult(
                        profile_id=target.profile_id,
                        account=bookmaker,
                        state="succeeded",
                        record_id=created_free_bet.free_bet_id,
                        href=href,
                    )
                )
                continue
            profit_boost_fields = _profit_boost_destination_fields(payload.calculator)
            created = create_sportsbook_bet(
                target.profile_id,
                {
                    "event_name": payload.event_name,
                    "offer_text": payload.event_name,
                    "bookmaker": bookmaker,
                    "offer_type": destination_offer_type,
                    "bet_type": payload.bet_type,
                    "offer_name": payload.offer_name,
                    "fixture_type": payload.fixture_type,
                    "market": "",
                    "status": "Prospecting",
                    "result": "Pending",
                    "back_stake": payload.calculator.back_stake,
                    "back_odds": preview.canonical_back_odds,
                    **profit_boost_fields,
                    "bonus_trigger": payload.calculator.bonus_trigger,
                    "maximum_bonus": payload.calculator.promotion_value,
                    "bonus_retention_rate": payload.calculator.retention_percent,
                    "match_strategy": payload.calculator.strategy,
                    "lay_odds_1": preview.canonical_lay_odds,
                    "lay_actual": explicit_lay,
                    "lay_matched_stake_1": "",
                    "exchange_name": exchange_name,
                    "date_settled": "",
                    "user_notes": source_note,
                    "manual_override_value": "",
                    "manual_override_reason": "",
                },
            )
            # Build through the destination contract to prove the Profile-owned
            # recalculation resolves.
            destination = build_sportsbook_response(
                target.profile_id,
                get_sportsbook_bet(target.profile_id, created.sportsbook_bet_id),
                as_of_date=date.today(),
            )
            if destination.calculation_state != "resolved":
                raise ValueError("Destination Sportsbook calculation did not resolve")
            href = (
                f"/profiles/{target.profile_id}/tracker/sportsbook-bets"
                f"?record={created.sportsbook_bet_id}&source=calculator-conversion"
            )
            title = "Standard opportunity added"
            body = f"Added Standard opportunity to {profile.display_name}."
            complete_calculator_conversion_target(
                attempt["attempt_id"],
                destination_record_id=created.sportsbook_bet_id,
                notification_title=title,
                notification_body=body,
                notification_link=href,
            )
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="succeeded",
                    record_id=created.sportsbook_bet_id,
                    href=href,
                )
            )
        except Exception as error:
            fail_calculator_conversion_target(attempt["attempt_id"], str(error))
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=[str(error)],
                )
            )
    succeeded = sum(item.state == "succeeded" for item in results)
    source_label = "Free Bet" if destination_kind == "free_bet" else "Standard"
    return ConversionResponse(
        source_id=source_id,
        source_checksum=checksum,
        results=results,
        notification=(
            f"Added {source_label} opportunity to {succeeded} "
            f"Profile{'s' if succeeded != 1 else ''}."
        )
        if succeeded
        else f"No {source_label} opportunities were added.",
    )


def _sportsbook_target_eligibility(
    *, profile_id: str, bookmaker: str, exchange_name: str, offer_type: str, match_strategy: str
) -> tuple[Any, list[str]]:
    profile = get_profile(profile_id)
    if profile is None:
        return None, ["Profile not found"]
    eligibility = evaluate_multi_profile_target(
        profile=profile,
        accounts=list_accounts(profile_id),
        exchange_commissions=list_profile_exchange_commissions(profile_id),
        bookmaker=bookmaker,
        offer_type=offer_type,
        match_strategy=match_strategy,
    )
    reasons = list(eligibility.reasons)
    exchange_names = {item.exchange_name.casefold() for item in eligibility.exchange_options}
    if exchange_name.casefold() not in exchange_names:
        reasons.append(
            "Selected exchange is not active with configured commission for this Profile"
        )
    return profile, reasons


@router.post("/multi-lay", response_model=ConversionResponse)
def convert_multi_lay(payload: MultiLayConversionPayload, request: Request) -> ConversionResponse:
    _require_fund_manager(request)
    _validate_sportsbook_classification(
        offer_type=payload.offer_type, bet_type=payload.bet_type, fixture_type=payload.fixture_type
    )
    if payload.source.calculator_family != "multi-lay":
        raise HTTPException(
            status_code=422, detail="Multi-Lay conversion requires multi-lay source"
        )
    if payload.source.calculator_mode != payload.calculator.allocation:
        raise HTTPException(
            status_code=422, detail="Multi-Lay source mode does not match calculator"
        )
    preview = preview_multi_lay(payload.calculator)
    exchange_name = str(payload.source.canonical_inputs.get("exchange", ""))
    canonical_source = payload.source.model_copy(
        update={
            "canonical_inputs": {
                "calculator": payload.calculator.model_dump(mode="json"),
                "exchange": exchange_name,
                "reference_result": preview.model_dump(mode="json"),
            }
        }
    )
    source_id, checksum, canonical = _envelope_identity(canonical_source)
    strategy = "Multilay" if payload.calculator.allocation == "standard" else "Multilay-Underlay"
    first, *additional = payload.calculator.outcomes
    results: list[ConversionTargetResult] = []
    canonical_targets = [
        (
            item,
            _resolve_account_identity(
                profile_id=item.profile_id, account_id=item.account_id, legacy_name=item.bookmaker
            ),
        )
        for item in payload.targets
    ]
    targets = {
        (item.profile_id, account.account_id): (item, account)
        for item, account in canonical_targets
    }.values()
    for target, target_account in targets:
        bookmaker = target_account.account
        attempt = begin_calculator_conversion_target(
            source_id=f"{source_id}:{payload.conversion_intent_id}",
            source_checksum=checksum,
            source_family="multi-lay",
            source_version=payload.source.calculator_version,
            source_mode=payload.source.calculator_mode,
            source_envelope_json=canonical,
            destination_kind="sportsbook",
            target_profile_id=target.profile_id,
            target_account=target_account.account_id,
        )
        existing = _existing_result(attempt, target.profile_id, bookmaker)
        if existing:
            results.append(existing)
            continue
        if not attempt["_claimed"]:
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=["Conversion is already in progress; retry after it completes"],
                )
            )
            continue
        profile, reasons = _sportsbook_target_eligibility(
            profile_id=target.profile_id,
            bookmaker=bookmaker,
            exchange_name=exchange_name,
            offer_type=payload.offer_type,
            match_strategy=strategy,
        )
        if reasons:
            reason = "; ".join(reasons)
            fail_calculator_conversion_target(attempt["attempt_id"], reason)
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=reasons,
                )
            )
            continue
        try:
            created = create_sportsbook_bet(
                target.profile_id,
                {
                    "event_name": payload.event_name,
                    "offer_text": payload.event_name,
                    "bookmaker": bookmaker,
                    "offer_type": payload.offer_type,
                    "bet_type": payload.bet_type,
                    "offer_name": payload.offer_name,
                    "fixture_type": payload.fixture_type,
                    "market": "",
                    "status": "Prospecting",
                    "result": "Pending",
                    "back_stake": payload.calculator.back_stake,
                    "back_odds": payload.calculator.back_odds,
                    "match_strategy": strategy,
                    "lay_odds_1": first.lay_odds,
                    "multi_lay_outcome_1_name": first.label,
                    "multi_lay_outcomes_json": json.dumps(
                        [
                            {
                                "id": f"outcome{index}",
                                "label": outcome.label,
                                "layOdds": outcome.lay_odds,
                            }
                            for index, outcome in enumerate(additional, start=2)
                        ],
                        separators=(",", ":"),
                    ),
                    "lay_actual": "",
                    "lay_matched_stake_1": "",
                    "exchange_name": exchange_name,
                    "date_settled": "",
                    "user_notes": f"Calculator source: {source_id} ({checksum})",
                    "manual_override_value": "",
                    "manual_override_reason": "",
                },
            )
            destination = build_sportsbook_response(
                target.profile_id,
                get_sportsbook_bet(target.profile_id, created.sportsbook_bet_id),
                as_of_date=date.today(),
            )
            if destination.calculation_state != "resolved":
                raise ValueError("Destination Multi-Lay calculation did not resolve")
            href = (
                f"/profiles/{target.profile_id}/tracker/sportsbook-bets"
                f"?record={created.sportsbook_bet_id}&source=calculator-conversion"
            )
            body = f"Added Multi-Lay opportunity to {profile.display_name}."
            complete_calculator_conversion_target(
                attempt["attempt_id"],
                destination_record_id=created.sportsbook_bet_id,
                notification_title="Multi-Lay opportunity added",
                notification_body=body,
                notification_link=href,
            )
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="succeeded",
                    record_id=created.sportsbook_bet_id,
                    href=href,
                )
            )
        except Exception as error:
            fail_calculator_conversion_target(attempt["attempt_id"], str(error))
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=[str(error)],
                )
            )
    succeeded = sum(item.state == "succeeded" for item in results)
    notification = (
        f"Added Multi-Lay opportunity to {succeeded} Profile{'s' if succeeded != 1 else ''}."
        if succeeded
        else "No Multi-Lay opportunities were added."
    )
    return ConversionResponse(
        source_id=source_id, source_checksum=checksum, results=results, notification=notification
    )


@router.post("/each-way-extra-place", response_model=ConversionResponse)
def convert_each_way_extra_place(
    payload: EachWayConversionPayload, request: Request
) -> ConversionResponse:
    _require_fund_manager(request)
    if payload.source.calculator_family != "each-way":
        raise HTTPException(status_code=422, detail="Each Way conversion requires each-way source")
    if payload.source.calculator_mode != payload.calculator.mode:
        raise HTTPException(
            status_code=422, detail="Each Way source mode does not match calculator"
        )
    preview = preview_each_way(payload.calculator)
    exchange_name = str(payload.source.canonical_inputs.get("exchange", ""))
    canonical_source = payload.source.model_copy(
        update={
            "canonical_inputs": {
                "calculator": payload.calculator.model_dump(mode="json"),
                "exchange": exchange_name,
                "reference_result": preview.model_dump(mode="json"),
            }
        }
    )
    source_id, checksum, canonical = _envelope_identity(canonical_source)
    results: list[ConversionTargetResult] = []
    canonical_targets = [
        (
            item,
            _resolve_account_identity(
                profile_id=item.profile_id, account_id=item.account_id, legacy_name=item.bookmaker
            ),
        )
        for item in payload.targets
    ]
    targets = {
        (item.profile_id, account.account_id): (item, account)
        for item, account in canonical_targets
    }.values()
    for target, target_account in targets:
        bookmaker = target_account.account
        attempt = begin_calculator_conversion_target(
            source_id=f"{source_id}:{payload.conversion_intent_id}",
            source_checksum=checksum,
            source_family="each-way",
            source_version=payload.source.calculator_version,
            source_mode=payload.calculator.mode,
            source_envelope_json=canonical,
            destination_kind="each_way_extra_place",
            target_profile_id=target.profile_id,
            target_account=target_account.account_id,
        )
        existing = _existing_result(attempt, target.profile_id, bookmaker)
        if existing:
            results.append(existing)
            continue
        if not attempt["_claimed"]:
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=["Conversion is already in progress; retry after it completes"],
                )
            )
            continue
        profile = get_profile(target.profile_id)
        if profile is None:
            reason = "Profile not found"
            fail_calculator_conversion_target(attempt["attempt_id"], reason)
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=[reason],
                )
            )
            continue
        _, reasons = _sportsbook_target_eligibility(
            profile_id=target.profile_id,
            bookmaker=bookmaker,
            exchange_name=exchange_name,
            offer_type="Qualifying Bet",
            match_strategy="Standard",
        )
        if reasons:
            reason = "; ".join(reasons)
            fail_calculator_conversion_target(attempt["attempt_id"], reason)
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=reasons,
                )
            )
            continue
        try:
            created = create_profile_each_way_extra_place(
                target.profile_id,
                EachWayExtraPlacePayload(
                    runner=payload.runner,
                    race=payload.race,
                    bookmaker=bookmaker,
                    bookmaker_account=bookmaker,
                    mode=payload.calculator.mode,
                    each_way_stake=payload.calculator.each_way_stake,
                    back_odds=payload.calculator.back_odds,
                    place_term_numerator=payload.calculator.place_term_numerator,
                    place_term_denominator=payload.calculator.place_term_denominator,
                    bookmaker_places=str(payload.calculator.bookmaker_places),
                    exchange_places=str(payload.calculator.exchange_places),
                    win_exchange=exchange_name,
                    win_lay_odds=payload.calculator.win_lay_odds,
                    place_exchange=exchange_name,
                    place_lay_odds=payload.calculator.place_lay_odds,
                    status="Prospecting",
                    result="Pending",
                    user_notes=f"Calculator source: {source_id} ({checksum})",
                ),
            )
            if created.get("calculation_state") != "resolved":
                raise ValueError("Destination Each Way / Extra Place calculation did not resolve")
            record_id = str(created["each_way_extra_place_id"])
            href = (
                f"/profiles/{target.profile_id}/tracker/each-way-extra-places"
                f"?record={record_id}&source=calculator-conversion"
            )
            body = f"Added {payload.calculator.mode} opportunity to {profile.display_name}."
            complete_calculator_conversion_target(
                attempt["attempt_id"],
                destination_record_id=record_id,
                notification_title=f"{payload.calculator.mode} opportunity added",
                notification_body=body,
                notification_link=href,
            )
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="succeeded",
                    record_id=record_id,
                    href=href,
                )
            )
        except Exception as error:
            fail_calculator_conversion_target(attempt["attempt_id"], str(error))
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=bookmaker,
                    state="failed",
                    reasons=[str(error)],
                )
            )
    succeeded = sum(item.state == "succeeded" for item in results)
    notification = (
        f"Added {payload.calculator.mode} opportunity to {succeeded} "
        f"Profile{'s' if succeeded != 1 else ''}."
        if succeeded
        else f"No {payload.calculator.mode} opportunities were added."
    )
    return ConversionResponse(
        source_id=source_id, source_checksum=checksum, results=results, notification=notification
    )


def _casino_eligibility(
    profile_id: str, account_name: str, activity_source: str
) -> tuple[Any, list[str], list[str]]:
    profile = get_profile(profile_id)
    reasons: list[str] = []
    warnings: list[str] = []
    if profile is None:
        return None, ["Profile not found"], warnings
    if profile.status.casefold() != "active":
        reasons.append(f"Profile is {profile.status}, not Active")
    if not profile_module_enabled(profile_id, "casino-offers"):
        reasons.append("Casino Offers is disabled for this Profile")
    account = next(
        (
            row
            for row in list_accounts(profile_id)
            if row.type == "Bookie" and row.account.casefold() == account_name.casefold()
        ),
        None,
    )
    if account is None:
        reasons.append(f"{account_name} account is not configured")
        return profile, reasons, warnings
    restrictions = get_account_restrictions(account)
    if account.lifecycle_status.casefold() in {
        "archived",
        "closed",
        "not signed up",
        "suspended",
    } or account.status.casefold() in {
        "archived",
        "blocked",
        "closed",
        "inactive",
        "not using",
        "suspended",
    }:
        reasons.append(f"{account_name} account is {account.status}")
    if restrictions & {"kyc blocked", "risk blocked", "login restricted", "sportsbook only"}:
        blocked = restrictions & {
            "kyc blocked",
            "login restricted",
            "risk blocked",
            "sportsbook only",
        }
        reasons.append(f"{account_name} account is blocked: {', '.join(sorted(blocked))}")
    if activity_source == "promotion" and "bonus restricted" in restrictions:
        reasons.append(f"{account_name} account cannot use promotions")
    if "soft limited" in restrictions:
        warnings.append(f"{account_name} account is Soft Limited; confirm it can be used")
    return profile, reasons, warnings


@router.post("/blackjack", response_model=ConversionResponse)
def save_blackjack(payload: BlackjackConversionPayload, request: Request) -> ConversionResponse:
    _require_fund_manager(request)
    snapshot = payload.snapshot
    source_id, checksum, canonical = _snapshot_identity(snapshot)
    if not snapshot.get("conversion_eligible"):
        raise HTTPException(status_code=422, detail="Simulation sessions cannot be converted")
    mode, activity_source, final = _validated_blackjack_source(snapshot)
    if activity_source == "promotion" and not payload.offer_identity.strip():
        raise HTTPException(status_code=422, detail="Promotion / offer identity is required")
    selected_account = _resolve_account_identity(
        profile_id=payload.profile_id,
        account_id=payload.casino_account_id,
        legacy_name=payload.casino_account,
    )
    account_name = selected_account.account
    profile, reasons, _warnings = _casino_eligibility(
        payload.profile_id, account_name, str(activity_source)
    )
    if reasons:
        raise HTTPException(status_code=409, detail="; ".join(reasons))
    monetary = snapshot["monetary"]
    attempt = begin_calculator_conversion_target(
        source_id=source_id,
        source_checksum=checksum,
        source_family="blackjack_strategy",
        source_version=str(snapshot.get("calculator_version", "blackjack-session-v1")),
        source_mode=mode,
        source_envelope_json=canonical,
        destination_kind="casino",
        target_profile_id=payload.profile_id,
        target_account=selected_account.account_id,
    )
    existing = _existing_result(attempt, payload.profile_id, account_name)
    if existing:
        return ConversionResponse(
            source_id=source_id,
            source_checksum=checksum,
            results=[existing],
            notification="Blackjack session was already saved.",
        )
    if not attempt["_claimed"]:
        raise HTTPException(status_code=409, detail="Blackjack conversion is already in progress")
    offer_type = (
        "Manual Play / No Offer"
        if activity_source == "own_cash"
        else "Fixed Spins Or Free Play"
        if activity_source == "free_credit"
        else "Casino Promotion"
    )
    try:
        result = "Win" if final > 0 else "Lose" if final < 0 else "Mixed"
        started = str(snapshot.get("started_at", ""))
        ended = str(snapshot.get("ended_at", ""))
        created = create_casino_offer(
            payload.profile_id,
            {
                "offer_group_id": source_id,
                "date_started": started,
                "date_settling": ended,
                "expiry_datetime": "",
                "bookmaker": account_name,
                "offer_type": offer_type,
                "offer_name": payload.offer_identity.strip() or payload.activity_name,
                "game": "Blackjack",
                "cash_stake": "",
                "credit_amount": monetary.get("free_credit_value") or "",
                "bonus_amount": "",
                "wager_multiplier": "",
                "wager_target": "",
                "required_spins": "",
                "spin_stake": "",
                "free_spins_awarded": "",
                "free_spins_value": "",
                "own_cash_committed": "",
                "cash_returned": monetary.get("withdrawable_result") or "",
                "status": "Settled",
                "result": result,
                "calc_net_pnl": f"{final:.2f}",
                "final_net_pnl": f"{final:.2f}",
                "user_notes": f"Blackjack session source: {source_id} ({checksum})",
            },
        )
        href = (
            f"/profiles/{payload.profile_id}/tracker/casino-offers"
            f"?record={created.casino_offer_id}&source=calculator-conversion"
        )
        body = f"Saved Blackjack session to {profile.display_name} · {account_name}."
        complete_calculator_conversion_target(
            attempt["attempt_id"],
            destination_record_id=created.casino_offer_id,
            notification_title="Blackjack session saved",
            notification_body=body,
            notification_link=href,
        )
        result_row = ConversionTargetResult(
            profile_id=payload.profile_id,
            account=account_name,
            state="succeeded",
            record_id=created.casino_offer_id,
            href=href,
        )
        return ConversionResponse(
            source_id=source_id, source_checksum=checksum, results=[result_row], notification=body
        )
    except Exception as error:
        fail_calculator_conversion_target(attempt["attempt_id"], str(error))
        raise HTTPException(status_code=422, detail=str(error)) from error
