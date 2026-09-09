from __future__ import annotations

import hashlib
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from openforge_api.auth import require_request_session
from openforge_api.calculators import MatchedBettingPayload, _calculate
from openforge_api.db import (
    begin_calculator_conversion_target,
    complete_calculator_conversion_target,
    create_casino_offer,
    create_sportsbook_bet,
    fail_calculator_conversion_target,
    get_profile,
    get_sportsbook_bet,
    list_accounts,
    list_profile_exchange_commissions,
    profile_module_enabled,
)
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
    bookmaker: str = Field(min_length=1, max_length=120)


class StandardConversionPayload(BaseModel):
    source: ConversionEnvelope
    calculator: MatchedBettingPayload
    targets: list[SportsbookTarget] = Field(min_length=1)
    event_name: str = Field(min_length=1, max_length=200)
    offer_type: str = Field(min_length=1, max_length=120)
    bet_type: str = Field(min_length=1, max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)


class BlackjackConversionPayload(BaseModel):
    snapshot: dict[str, Any]
    profile_id: str = Field(min_length=1, max_length=64)
    casino_account: str = Field(min_length=1, max_length=120)
    activity_name: str = Field(default="Blackjack session", min_length=1, max_length=400)
    offer_identity: str = Field(default="", max_length=400)


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
    ledger = "sportsbook-bets" if attempt["destination_kind"] == "sportsbook" else "casino-offers"
    return ConversionTargetResult(
        profile_id=profile_id,
        account=account,
        state="already_succeeded",
        record_id=record_id,
        href=f"/profiles/{profile_id}/tracker/{ledger}?record={record_id}&source=calculator-conversion",
    )


@router.post("/standard", response_model=ConversionResponse)
def convert_standard(payload: StandardConversionPayload, request: Request) -> ConversionResponse:
    _require_fund_manager(request)
    if payload.source.calculator_family != "matched-betting":
        raise HTTPException(
            status_code=422, detail="Standard conversion requires matched-betting source"
        )
    # Revalidate the complete calculator state before any destination write.
    preview = _calculate(payload.calculator)
    exchange_name = str(payload.source.canonical_inputs.get("exchange", ""))
    canonical_source = payload.source.model_copy(
        update={
            "canonical_inputs": {
                "calculator": payload.calculator.model_dump(mode="json"),
                "exchange": exchange_name,
            },
        }
    )
    source_id, checksum, canonical = _envelope_identity(canonical_source)
    results: list[ConversionTargetResult] = []
    for target in list(
        {(item.profile_id, item.bookmaker.casefold()): item for item in payload.targets}.values()
    ):
        attempt = begin_calculator_conversion_target(
            source_id=source_id,
            source_checksum=checksum,
            source_family="matched-betting",
            source_version=payload.source.calculator_version,
            source_mode=payload.source.calculator_mode,
            source_envelope_json=canonical,
            destination_kind="sportsbook",
            target_profile_id=target.profile_id,
            target_account=target.bookmaker,
        )
        existing = _existing_result(attempt, target.profile_id, target.bookmaker)
        if existing:
            results.append(existing)
            continue
        if not attempt["_claimed"]:
            results.append(
                ConversionTargetResult(
                    profile_id=target.profile_id,
                    account=target.bookmaker,
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
                    account=target.bookmaker,
                    state="failed",
                    reasons=[reason],
                )
            )
            continue
        eligibility = evaluate_multi_profile_target(
            profile=profile,
            accounts=list_accounts(target.profile_id),
            exchange_commissions=list_profile_exchange_commissions(target.profile_id),
            bookmaker=target.bookmaker,
            offer_type=payload.offer_type,
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
                    account=target.bookmaker,
                    state="failed",
                    reasons=reasons,
                )
            )
            continue
        try:
            source_note = f"Calculator source: {source_id} ({checksum})"
            created = create_sportsbook_bet(
                target.profile_id,
                {
                    "event_name": payload.event_name,
                    "offer_text": payload.event_name,
                    "bookmaker": target.bookmaker,
                    "offer_type": payload.offer_type,
                    "bet_type": payload.bet_type,
                    "offer_name": payload.offer_name,
                    "fixture_type": payload.fixture_type,
                    "market": "",
                    "status": "Prospecting",
                    "result": "Pending",
                    "back_stake": payload.calculator.back_stake,
                    "back_odds": preview.canonical_back_odds,
                    "profit_boost_mode": payload.calculator.profit_boost_mode
                    if payload.calculator.bet_type == "profit_boost"
                    else "",
                    "base_back_odds": payload.calculator.base_back_odds,
                    "profit_boost_percent": payload.calculator.profit_boost_percent,
                    "maximum_boost_winnings": payload.calculator.maximum_boost_winnings,
                    "actual_accepted_back_odds": payload.calculator.actual_accepted_back_odds,
                    "bonus_trigger": payload.calculator.bonus_trigger,
                    "maximum_bonus": payload.calculator.promotion_value,
                    "bonus_retention_rate": payload.calculator.retention_percent,
                    "match_strategy": payload.calculator.strategy,
                    "lay_odds_1": preview.canonical_lay_odds,
                    "lay_actual": "",
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
                    account=target.bookmaker,
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
                    account=target.bookmaker,
                    state="failed",
                    reasons=[str(error)],
                )
            )
    succeeded = sum(item.state == "succeeded" for item in results)
    return ConversionResponse(
        source_id=source_id,
        source_checksum=checksum,
        results=results,
        notification=(
            f"Added Standard opportunity to {succeeded} Profile{'s' if succeeded != 1 else ''}."
        )
        if succeeded
        else "No Standard opportunities were added.",
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
    profile, reasons, _warnings = _casino_eligibility(
        payload.profile_id, payload.casino_account, str(activity_source)
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
        target_account=payload.casino_account,
    )
    existing = _existing_result(attempt, payload.profile_id, payload.casino_account)
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
                "bookmaker": payload.casino_account,
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
        body = f"Saved Blackjack session to {profile.display_name} · {payload.casino_account}."
        complete_calculator_conversion_target(
            attempt["attempt_id"],
            destination_record_id=created.casino_offer_id,
            notification_title="Blackjack session saved",
            notification_body=body,
            notification_link=href,
        )
        result_row = ConversionTargetResult(
            profile_id=payload.profile_id,
            account=payload.casino_account,
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
