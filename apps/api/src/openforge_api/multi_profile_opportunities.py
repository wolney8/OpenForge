from __future__ import annotations

import json
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api.db import (
    add_or_restore_multi_profile_opportunity_target,
    create_multi_profile_opportunity,
    create_sportsbook_bet,
    delete_multi_profile_opportunity,
    delete_sportsbook_bet,
    get_most_used_profile_exchange,
    get_multi_profile_opportunity,
    get_profile_tracker_settings,
    get_sportsbook_bet,
    list_accounts,
    list_multi_profile_opportunities,
    list_multi_profile_opportunity_targets,
    list_profile_exchange_commissions,
    list_profiles,
    remove_multi_profile_opportunity_target_row,
    set_multi_profile_opportunity_state,
    update_multi_profile_opportunity_target,
    update_sportsbook_bet,
)
from openforge_api.multi_profile_entry import (
    MultiProfileTargetEligibility,
    evaluate_multi_profile_target,
)
from openforge_api.sportsbook import SportsbookBetPayload, SportsbookBetResponse, build_response

router = APIRouter(prefix="/multi-profile-opportunities", tags=["multi-profile-opportunities"])

INLINE_STRATEGIES = {"Standard", "Underlay", "Overlay", "Custom", "No Lay"}
PLACED_STATES = {"Placed", "Settled", "Free Bet Awarded"}


class OpportunityTargetSelection(BaseModel):
    profile_id: str = Field(min_length=1, max_length=64)
    bookmaker: str = Field(min_length=1, max_length=120)


class OpportunityEligibilityPayload(BaseModel):
    bookmaker: str = Field(min_length=1, max_length=120)
    offer_type: str = Field(min_length=1, max_length=120)


class OpportunitySetupPayload(OpportunityEligibilityPayload):
    preset: Literal["Offer", "Mug Bet"] = "Offer"
    offer_text: str = Field(min_length=1, max_length=200)
    bet_type: str = Field(default="", max_length=120)
    offer_name: str = Field(default="", max_length=200)
    fixture_type: str = Field(default="", max_length=120)
    minimum_back_odds: str = Field(default="", max_length=40)
    default_back_stake: str = Field(default="", max_length=40)
    expected_settlement: str = Field(default="", max_length=40)
    reward_timing: Literal["", "On placement", "On settlement"] = ""
    preset_id: str = Field(default="", max_length=64)
    preset_version: int = Field(default=0, ge=0)
    selected_profile_ids: list[str] = Field(min_length=1)
    target_selections: list[OpportunityTargetSelection] = Field(default_factory=list)
    actor_id: str = Field(default="local-fund-manager", min_length=1, max_length=120)

    @field_validator("minimum_back_odds")
    @classmethod
    def validate_minimum_back_odds(cls, value: str) -> str:
        if not value.strip():
            return ""
        parsed = parse_decimal(value, "Minimum back odds")
        if parsed <= 1:
            raise ValueError("Minimum back odds must be greater than 1")
        return f"{parsed:.2f}"

    @field_validator("default_back_stake")
    @classmethod
    def validate_default_back_stake(cls, value: str) -> str:
        if not value.strip():
            return ""
        parsed = parse_decimal(value, "Default back stake")
        if parsed <= 0:
            raise ValueError("Default back stake must be greater than 0")
        return value.strip()


class OpportunityTargetUpdatePayload(BaseModel):
    bookmaker: str = Field(default="", max_length=120)
    back_stake: str = Field(default="", max_length=40)
    back_odds: str = Field(default="", max_length=40)
    exchange_name: str = Field(default="", max_length=120)
    lay_odds_1: str = Field(default="", max_length=40)
    lay_actual: str = Field(default="", max_length=40)
    match_strategy: Literal[
        "Standard",
        "Underlay",
        "Overlay",
        "Custom",
        "No Lay",
    ] = "Standard"

    @field_validator("back_odds", "lay_odds_1")
    @classmethod
    def normalize_odds(cls, value: str) -> str:
        if not value.strip():
            return ""
        parsed = parse_decimal(value, "Odds")
        if parsed <= 1:
            raise ValueError("Odds must be greater than 1")
        return f"{parsed:.2f}"


class OpportunityTargetAddPayload(BaseModel):
    profile_id: str = Field(min_length=1, max_length=64)
    bookmaker: str = Field(min_length=1, max_length=120)


class OpportunityPlacePayload(BaseModel):
    target_ids: list[str] = Field(default_factory=list)
    profile_ids: list[str] = Field(default_factory=list)


class OpportunityTargetResponse(BaseModel):
    target_id: str
    profile_id: str
    bookmaker: str
    display_name: str
    profile_code: str
    eligible: bool
    eligibility_state: str
    eligibility_reasons: list[str] = Field(default_factory=list)
    eligibility_warnings: list[str] = Field(default_factory=list)
    workflow_state: str
    workflow_reasons: list[str] = Field(default_factory=list)
    bookmaker_account_status: str = ""
    exchange_options: list[dict[str, str]] = Field(default_factory=list)
    default_exchange_name: str = ""
    sportsbook_bet: SportsbookBetResponse | None = None


class OpportunityResponse(BaseModel):
    opportunity_id: str
    offer_text: str
    bookmaker: str
    offer_type: str
    bet_type: str
    offer_name: str
    fixture_type: str
    minimum_back_odds: str
    default_back_stake: str
    expected_settlement: str
    reward_timing: str
    preset_id: str
    preset_version: int
    state: str
    created_at: str
    updated_at: str
    targets: list[OpportunityTargetResponse]


class OpportunityPlaceResult(BaseModel):
    target_id: str
    profile_id: str
    state: str
    reasons: list[str]
    sportsbook_bet: SportsbookBetResponse | None = None


class OpportunityDeleteResponse(BaseModel):
    disposition: Literal["deleted", "archived"]
    removed_draft_rows: int
    retained_placed_rows: int


def parse_decimal(value: str, label: str) -> Decimal:
    try:
        return Decimal(value.strip())
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"{label} must be a valid number") from error


def build_eligibility(bookmaker: str, offer_type: str) -> list[MultiProfileTargetEligibility]:
    return [
        evaluate_multi_profile_target(
            profile=profile,
            accounts=list_accounts(profile.profile_id),
            exchange_commissions=list_profile_exchange_commissions(profile.profile_id),
            bookmaker=bookmaker,
            offer_type=offer_type,
            # Exchange readiness belongs to Stage 2 and must not block creation
            # of a Prospecting row.
            match_strategy="No Lay",
        )
        for profile in list_profiles()
    ]


def resolve_default_exchange(profile_id: str, target: MultiProfileTargetEligibility) -> str:
    option_names = [option.exchange_name for option in target.exchange_options]
    normalized_options = {name.casefold(): name for name in option_names}
    configured = get_profile_tracker_settings(profile_id).default_exchange_name.strip()
    if configured.casefold() in normalized_options:
        return normalized_options[configured.casefold()]
    most_used = get_most_used_profile_exchange(profile_id).strip()
    if most_used.casefold() in normalized_options:
        return normalized_options[most_used.casefold()]
    return option_names[0] if option_names else ""


def parse_reasons(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return [str(reason) for reason in parsed] if isinstance(parsed, list) else []


def serialize_eligibility(
    target: MultiProfileTargetEligibility, bookmaker: str
) -> OpportunityTargetResponse:
    return OpportunityTargetResponse(
        target_id=target.profile_id,
        profile_id=target.profile_id,
        bookmaker=bookmaker,
        display_name=target.display_name,
        profile_code=target.profile_code,
        eligible=target.eligible,
        eligibility_state=target.state,
        eligibility_reasons=list(target.reasons),
        eligibility_warnings=list(target.warnings),
        workflow_state="Eligible" if target.eligible else "Blocked",
        workflow_reasons=[],
        bookmaker_account_status=target.bookmaker_account_status,
        exchange_options=[
            {
                "exchange_name": option.exchange_name,
                "commission_rate": option.commission_rate,
            }
            for option in target.exchange_options
        ],
        default_exchange_name=resolve_default_exchange(target.profile_id, target),
    )


def serialize_opportunity(opportunity_id: str) -> OpportunityResponse:
    opportunity = get_multi_profile_opportunity(opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    targets: list[OpportunityTargetResponse] = []
    for row in list_multi_profile_opportunity_targets(opportunity_id):
        target_bookmaker = row["bookmaker"] or opportunity["bookmaker"]
        current_eligibility = next(
            (
                target
                for target in build_eligibility(target_bookmaker, opportunity["offer_type"])
                if target.profile_id == row["profile_id"]
            ),
            None,
        )
        sportsbook = (
            get_sportsbook_bet(row["profile_id"], row["sportsbook_bet_id"])
            if row["sportsbook_bet_id"]
            else None
        )
        targets.append(
            OpportunityTargetResponse(
                target_id=row["target_id"],
                profile_id=row["profile_id"],
                bookmaker=target_bookmaker,
                display_name=row["display_name"],
                profile_code=row["profile_code"],
                eligible=row["eligibility_state"] == "Eligible",
                eligibility_state=row["eligibility_state"],
                eligibility_reasons=parse_reasons(row["eligibility_reasons_json"]),
                eligibility_warnings=(
                    list(current_eligibility.warnings) if current_eligibility else []
                ),
                workflow_state=row["workflow_state"],
                workflow_reasons=parse_reasons(row["workflow_reasons_json"]),
                bookmaker_account_status=(
                    current_eligibility.bookmaker_account_status if current_eligibility else ""
                ),
                exchange_options=(
                    [
                        {
                            "exchange_name": option.exchange_name,
                            "commission_rate": option.commission_rate,
                        }
                        for option in current_eligibility.exchange_options
                    ]
                    if current_eligibility
                    else []
                ),
                default_exchange_name=(
                    resolve_default_exchange(row["profile_id"], current_eligibility)
                    if current_eligibility
                    else ""
                ),
                sportsbook_bet=(
                    build_response(row["profile_id"], sportsbook, as_of_date=date.today())
                    if sportsbook
                    else None
                ),
            )
        )
    return OpportunityResponse.model_validate({**opportunity, "targets": targets})


def opportunity_notes(payload: OpportunitySetupPayload) -> str:
    notes: list[str] = []
    if payload.minimum_back_odds:
        notes.append(f"Opportunity minimum back odds: {payload.minimum_back_odds}")
    if payload.reward_timing:
        notes.append(f"Reward timing: {payload.reward_timing}")
    return "\n".join(notes)


def create_profile_sportsbook_payload(
    payload: OpportunitySetupPayload, *, bookmaker: str | None = None
) -> dict[str, Any]:
    is_mug_bet = payload.preset == "Mug Bet"
    return {
        "event_name": payload.offer_text,
        "offer_text": payload.offer_text,
        "bookmaker": bookmaker or payload.bookmaker,
        "offer_type": "Mug Bet" if is_mug_bet else payload.offer_type,
        "bet_type": "Single" if is_mug_bet else payload.bet_type,
        "offer_name": payload.offer_name,
        "fixture_type": payload.fixture_type,
        "market": "",
        "status": "Prospecting",
        "result": "Pending",
        "back_stake": payload.default_back_stake,
        "back_odds": "",
        "source_combo_preset_id": payload.preset_id,
        "source_combo_preset_version": payload.preset_version,
        "bonus_trigger": "",
        "maximum_bonus": "",
        "bonus_retention_rate": "70",
        "match_strategy": "No Lay" if is_mug_bet else "Standard",
        "lay_odds_1": "",
        "multi_lay_outcome_1_name": "",
        "multi_lay_outcomes_json": "[]",
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": "",
        "exchange_name": "",
        "date_settled": payload.expected_settlement,
        "user_notes": opportunity_notes(payload),
        "manual_override_value": "",
        "manual_override_reason": "",
    }


def validate_placement(sportsbook: SportsbookBetResponse, minimum_back_odds: str) -> list[str]:
    reasons: list[str] = []
    try:
        back_stake = parse_decimal(sportsbook.back_stake, "Back stake")
        if back_stake <= 0:
            reasons.append("Back stake must be greater than 0")
    except ValueError as error:
        reasons.append(str(error))
    try:
        back_odds = parse_decimal(sportsbook.back_odds, "Back odds")
        if back_odds <= 1:
            reasons.append("Back odds must be greater than 1")
        if minimum_back_odds and back_odds < parse_decimal(minimum_back_odds, "Minimum back odds"):
            reasons.append(f"Back odds must be at least {minimum_back_odds}")
    except ValueError as error:
        reasons.append(str(error))

    if sportsbook.match_strategy not in INLINE_STRATEGIES:
        reasons.append("Complex strategy must be completed in the profile sportsbook editor")
    elif sportsbook.match_strategy != "No Lay":
        if not sportsbook.exchange_name.strip():
            reasons.append("Exchange is required")
        for value, label in (
            (sportsbook.lay_odds_1, "Lay odds"),
            (sportsbook.lay_actual, "Lay stake"),
        ):
            try:
                parsed = parse_decimal(value, label)
                if parsed <= 0 or (label == "Lay odds" and parsed <= 1):
                    reasons.append(f"{label} is invalid")
            except ValueError as error:
                reasons.append(str(error))
    return list(dict.fromkeys(reasons))


def resolve_target(opportunity_id: str, target_identifier: str) -> dict[str, Any] | None:
    targets = list_multi_profile_opportunity_targets(opportunity_id)
    direct = next((row for row in targets if row["target_id"] == target_identifier), None)
    if direct is not None:
        return direct
    profile_matches = [row for row in targets if row["profile_id"] == target_identifier]
    return profile_matches[0] if len(profile_matches) == 1 else None


def setup_payload_from_opportunity(
    opportunity: dict[str, Any], *, profile_id: str, bookmaker: str
) -> OpportunitySetupPayload:
    is_mug_bet = str(opportunity["offer_type"]) == "Mug Bet"
    return OpportunitySetupPayload.model_validate(
        {
            **opportunity,
            "preset": "Mug Bet" if is_mug_bet else "Offer",
            "bookmaker": bookmaker,
            "selected_profile_ids": [profile_id],
            "target_selections": [{"profile_id": profile_id, "bookmaker": bookmaker}],
        }
    )


@router.post("/eligibility", response_model=list[OpportunityTargetResponse])
def check_opportunity_eligibility(
    payload: OpportunityEligibilityPayload,
) -> list[OpportunityTargetResponse]:
    return [
        serialize_eligibility(target, payload.bookmaker)
        for target in build_eligibility(payload.bookmaker, payload.offer_type)
    ]


@router.post(
    "/{opportunity_id}/targets",
    response_model=OpportunityResponse,
    status_code=201,
)
def add_opportunity_target(
    opportunity_id: str, payload: OpportunityTargetAddPayload
) -> OpportunityResponse:
    opportunity = get_multi_profile_opportunity(opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    candidate = next(
        (
            row
            for row in build_eligibility(payload.bookmaker, str(opportunity["offer_type"]))
            if row.profile_id == payload.profile_id
        ),
        None,
    )
    if candidate is None:
        raise HTTPException(status_code=422, detail="Unknown profile")
    if not candidate.eligible:
        raise HTTPException(
            status_code=409,
            detail=f"Target cannot be added: {'; '.join(candidate.reasons)}",
        )
    current_targets = list_multi_profile_opportunity_targets(opportunity_id)
    active_targets = [
        row
        for row in current_targets
        if row["workflow_state"] not in {"Removed", "Skipped"}
    ]
    duplicate = next(
        (
            row
            for row in active_targets
            if row["profile_id"] == payload.profile_id
            and (
                str(opportunity["offer_type"]) != "Mug Bet"
                or str(row["bookmaker"]).casefold() == payload.bookmaker.casefold()
            )
        ),
        None,
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="Profile is already in this opportunity")

    setup_payload = setup_payload_from_opportunity(
        opportunity, profile_id=payload.profile_id, bookmaker=payload.bookmaker
    )
    sportsbook_payload = create_profile_sportsbook_payload(
        setup_payload, bookmaker=payload.bookmaker
    )
    created = create_sportsbook_bet(payload.profile_id, sportsbook_payload)
    add_or_restore_multi_profile_opportunity_target(
        opportunity_id=opportunity_id,
        profile_id=payload.profile_id,
        bookmaker=payload.bookmaker,
        eligibility_state=candidate.state,
        eligibility_reasons=list(candidate.reasons),
        sportsbook_bet_id=created.sportsbook_bet_id,
    )
    return serialize_opportunity(opportunity_id)


@router.post("", response_model=OpportunityResponse, status_code=201)
def create_opportunity(payload: OpportunitySetupPayload) -> OpportunityResponse:
    if payload.preset == "Mug Bet":
        selections = list(
            {
                (selection.profile_id, selection.bookmaker.casefold()): selection
                for selection in payload.target_selections
            }.values()
        )
        if not selections:
            raise HTTPException(status_code=422, detail="At least one mug-bet target is required")
        selected_targets: list[
            tuple[OpportunityTargetSelection, MultiProfileTargetEligibility]
        ] = []
        for selection in selections:
            candidate = next(
                (
                    row
                    for row in build_eligibility(selection.bookmaker, "Mug Bet")
                    if row.profile_id == selection.profile_id
                ),
                None,
            )
            if candidate is None:
                raise HTTPException(status_code=422, detail="Unknown mug-bet target profile")
            if not candidate.eligible:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"{candidate.display_name} / {selection.bookmaker} is blocked: "
                        f"{'; '.join(candidate.reasons)}"
                    ),
                )
            selected_targets.append((selection, candidate))

        distinct_bookmakers = sorted({selection.bookmaker for selection, _ in selected_targets})
        parent_payload = payload.model_dump()
        parent_payload["bookmaker"] = (
            distinct_bookmakers[0]
            if len(distinct_bookmakers) == 1
            else "Multiple bookmakers"
        )
        parent_payload["offer_type"] = "Mug Bet"
        parent_payload["bet_type"] = "Single"
        opportunity_id = create_multi_profile_opportunity(
            actor_id=payload.actor_id,
            payload=parent_payload,
            targets=[
                {
                    "profile_id": selection.profile_id,
                    "bookmaker": selection.bookmaker,
                    "eligibility_state": candidate.state,
                    "eligibility_reasons": list(candidate.reasons),
                    "workflow_state": "Draft",
                }
                for selection, candidate in selected_targets
            ],
        )
        persisted_targets = list_multi_profile_opportunity_targets(opportunity_id)
        for selection, candidate in selected_targets:
            target = next(
                row
                for row in persisted_targets
                if row["profile_id"] == selection.profile_id
                and row["bookmaker"].casefold() == selection.bookmaker.casefold()
            )
            sportsbook_payload = create_profile_sportsbook_payload(
                payload, bookmaker=selection.bookmaker
            )
            created = create_sportsbook_bet(selection.profile_id, sportsbook_payload)
            update_multi_profile_opportunity_target(
                opportunity_id=opportunity_id,
                target_id=target["target_id"],
                workflow_state="Prospecting",
                sportsbook_bet_id=created.sportsbook_bet_id,
            )
        return serialize_opportunity(opportunity_id)

    candidates = build_eligibility(payload.bookmaker, payload.offer_type)
    candidates_by_id = {candidate.profile_id: candidate for candidate in candidates}
    selected_ids = list(dict.fromkeys(payload.selected_profile_ids))
    unknown_ids = sorted(set(selected_ids) - set(candidates_by_id))
    if unknown_ids:
        raise HTTPException(status_code=422, detail=f"Unknown profiles: {', '.join(unknown_ids)}")
    blocked = [
        candidates_by_id[profile_id]
        for profile_id in selected_ids
        if not candidates_by_id[profile_id].eligible
    ]
    if blocked:
        raise HTTPException(
            status_code=409, detail="Blocked profiles cannot receive opportunity rows"
        )

    opportunity_id = create_multi_profile_opportunity(
        actor_id=payload.actor_id,
        payload=payload.model_dump(),
        targets=[
            {
                "profile_id": candidate.profile_id,
                "bookmaker": payload.bookmaker,
                "eligibility_state": candidate.state,
                "eligibility_reasons": list(candidate.reasons),
                "workflow_state": (
                    "Draft"
                    if candidate.profile_id in selected_ids
                    else "Blocked"
                    if not candidate.eligible
                    else "Not Selected"
                ),
            }
            for candidate in candidates
        ],
    )
    persisted_targets_by_profile = {
        row["profile_id"]: row
        for row in list_multi_profile_opportunity_targets(opportunity_id)
    }
    for profile_id in selected_ids:
        sportsbook_payload = create_profile_sportsbook_payload(payload)
        sportsbook_payload["exchange_name"] = resolve_default_exchange(
            profile_id, candidates_by_id[profile_id]
        )
        created = create_sportsbook_bet(profile_id, sportsbook_payload)
        update_multi_profile_opportunity_target(
            opportunity_id=opportunity_id,
            target_id=persisted_targets_by_profile[profile_id]["target_id"],
            workflow_state="Prospecting",
            sportsbook_bet_id=created.sportsbook_bet_id,
        )
    return serialize_opportunity(opportunity_id)


@router.get("", response_model=list[OpportunityResponse])
def list_opportunities(include_complete: bool = False) -> list[OpportunityResponse]:
    return [
        serialize_opportunity(row["opportunity_id"])
        for row in list_multi_profile_opportunities(include_complete=include_complete)
    ]


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(opportunity_id: str) -> OpportunityResponse:
    return serialize_opportunity(opportunity_id)


@router.delete("/{opportunity_id}", response_model=OpportunityDeleteResponse)
def remove_opportunity(opportunity_id: str) -> OpportunityDeleteResponse:
    opportunity = get_multi_profile_opportunity(opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    removed_draft_rows = 0
    retained_placed_rows = 0
    targets = list_multi_profile_opportunity_targets(opportunity_id)
    for target in targets:
        if not target["sportsbook_bet_id"]:
            continue
        profile_id = str(target["profile_id"])
        sportsbook = get_sportsbook_bet(profile_id, str(target["sportsbook_bet_id"]))
        if sportsbook is None:
            continue
        if sportsbook.status in PLACED_STATES:
            retained_placed_rows += 1
            continue
        if delete_sportsbook_bet(profile_id, sportsbook.sportsbook_bet_id):
            removed_draft_rows += 1
            update_multi_profile_opportunity_target(
                opportunity_id=opportunity_id,
                target_id=str(target["target_id"]),
                workflow_state="Removed",
            )

    if retained_placed_rows == 0:
        delete_multi_profile_opportunity(opportunity_id)
        return OpportunityDeleteResponse(
            disposition="deleted",
            removed_draft_rows=removed_draft_rows,
            retained_placed_rows=0,
        )

    set_multi_profile_opportunity_state(opportunity_id, "Archived")
    return OpportunityDeleteResponse(
        disposition="archived",
        removed_draft_rows=removed_draft_rows,
        retained_placed_rows=retained_placed_rows,
    )


@router.put(
    "/{opportunity_id}/targets/{target_identifier}",
    response_model=OpportunityTargetResponse,
)
def update_opportunity_target(
    opportunity_id: str,
    target_identifier: str,
    payload: OpportunityTargetUpdatePayload,
) -> OpportunityTargetResponse:
    opportunity = get_multi_profile_opportunity(opportunity_id)
    target = resolve_target(opportunity_id, target_identifier)
    if opportunity is None or target is None or not target["sportsbook_bet_id"]:
        raise HTTPException(status_code=404, detail="Opportunity target not found")
    profile_id = str(target["profile_id"])
    existing = get_sportsbook_bet(profile_id, str(target["sportsbook_bet_id"]))
    if existing is None:
        raise HTTPException(status_code=404, detail="Linked sportsbook row not found")
    if target["workflow_state"] != "Prospecting":
        raise HTTPException(
            status_code=409,
            detail="Only Prospecting opportunity rows can be edited in this workflow",
        )
    if opportunity["offer_type"] != "Mug Bet" and payload.match_strategy == "No Lay":
        raise HTTPException(
            status_code=422,
            detail="No Lay is available only for Mug Bet targets in quick add",
        )
    bookmaker = payload.bookmaker.strip() or str(target["bookmaker"])
    bookmaker_eligibility = next(
        (
            candidate
            for candidate in build_eligibility(bookmaker, str(opportunity["offer_type"]))
            if candidate.profile_id == profile_id
        ),
        None,
    )
    if bookmaker_eligibility is None or not bookmaker_eligibility.eligible:
        reasons = (
            list(bookmaker_eligibility.reasons)
            if bookmaker_eligibility is not None
            else ["Bookmaker account is not configured for this profile"]
        )
        raise HTTPException(
            status_code=409,
            detail=f"Bookmaker cannot be used for this target: {'; '.join(reasons)}",
        )

    target_changes = payload.model_dump(exclude_unset=True)
    if payload.match_strategy != "No Lay" and not payload.exchange_name.strip():
        target_changes["exchange_name"] = resolve_default_exchange(
            profile_id, bookmaker_eligibility
        )
    merged = SportsbookBetPayload.model_validate(
        {
            **existing.__dict__,
            **target_changes,
            "bookmaker": bookmaker,
            "status": "Prospecting",
            "result": "Pending",
            "lay_matched_stake_1": payload.lay_actual,
        }
    )
    updated = update_sportsbook_bet(profile_id, existing.sportsbook_bet_id, merged.model_dump())
    assert updated is not None
    update_multi_profile_opportunity_target(
        opportunity_id=opportunity_id,
        target_id=str(target["target_id"]),
        workflow_state="Prospecting",
        bookmaker=bookmaker,
    )
    opportunity_response = serialize_opportunity(opportunity_id)
    return next(
        item for item in opportunity_response.targets if item.target_id == target["target_id"]
    )


@router.post("/{opportunity_id}/place", response_model=list[OpportunityPlaceResult])
def record_opportunity_rows_as_placed(
    opportunity_id: str,
    payload: OpportunityPlacePayload,
) -> list[OpportunityPlaceResult]:
    opportunity = get_multi_profile_opportunity(opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    target_rows = list_multi_profile_opportunity_targets(opportunity_id)
    target_by_id = {row["target_id"]: row for row in target_rows}
    requested_target_ids = list(dict.fromkeys(payload.target_ids))
    if not requested_target_ids:
        for profile_id in list(dict.fromkeys(payload.profile_ids)):
            matches = [row for row in target_rows if row["profile_id"] == profile_id]
            if len(matches) == 1:
                requested_target_ids.append(matches[0]["target_id"])
    results: list[OpportunityPlaceResult] = []
    for target_id in requested_target_ids:
        target = target_by_id.get(target_id)
        profile_id = str(target["profile_id"]) if target else ""
        sportsbook = (
            get_sportsbook_bet(profile_id, target["sportsbook_bet_id"])
            if target and target["sportsbook_bet_id"]
            else None
        )
        if target is None or sportsbook is None:
            results.append(
                OpportunityPlaceResult(
                    target_id=target_id,
                    profile_id=profile_id,
                    state="Blocked",
                    reasons=["Opportunity target not found"],
                )
            )
            continue
        current = build_response(profile_id, sportsbook, as_of_date=date.today())
        reasons = validate_placement(current, opportunity["minimum_back_odds"])
        if reasons:
            update_multi_profile_opportunity_target(
                opportunity_id=opportunity_id,
                target_id=target_id,
                workflow_state="Prospecting",
                workflow_reasons=reasons,
            )
            results.append(
                OpportunityPlaceResult(
                    target_id=target_id,
                    profile_id=profile_id,
                    state="Blocked",
                    reasons=reasons,
                    sportsbook_bet=current,
                )
            )
            continue
        placed_payload = SportsbookBetPayload.model_validate(
            {**sportsbook.__dict__, "status": "Placed"}
        )
        updated = update_sportsbook_bet(
            profile_id, sportsbook.sportsbook_bet_id, placed_payload.model_dump()
        )
        assert updated is not None
        update_multi_profile_opportunity_target(
            opportunity_id=opportunity_id,
            target_id=target_id,
            workflow_state="Placed",
        )
        results.append(
            OpportunityPlaceResult(
                target_id=target_id,
                profile_id=profile_id,
                state="Placed",
                reasons=[],
                sportsbook_bet=build_response(profile_id, updated, as_of_date=date.today()),
            )
        )
    return results


@router.post(
    "/{opportunity_id}/targets/{target_identifier}/skip",
    response_model=OpportunityResponse,
)
def skip_opportunity_target(opportunity_id: str, target_identifier: str) -> OpportunityResponse:
    target = resolve_target(opportunity_id, target_identifier)
    if target is None:
        raise HTTPException(status_code=404, detail="Opportunity target not found")
    if target["workflow_state"] != "Prospecting":
        raise HTTPException(
            status_code=409, detail="Only Prospecting opportunity rows can be skipped"
        )
    profile_id = str(target["profile_id"])
    if target["sportsbook_bet_id"]:
        existing = get_sportsbook_bet(profile_id, str(target["sportsbook_bet_id"]))
        if existing is not None:
            cancelled_payload = SportsbookBetPayload.model_validate(
                {**existing.__dict__, "status": "Cancelled", "result": "Pending"}
            )
            update_sportsbook_bet(
                profile_id,
                existing.sportsbook_bet_id,
                cancelled_payload.model_dump(),
            )
    update_multi_profile_opportunity_target(
        opportunity_id=opportunity_id,
        target_id=str(target["target_id"]),
        workflow_state="Skipped",
    )
    return serialize_opportunity(opportunity_id)


@router.post(
    "/{opportunity_id}/targets/{target_identifier}/reset",
    response_model=OpportunityTargetResponse,
)
def reset_opportunity_target(
    opportunity_id: str, target_identifier: str
) -> OpportunityTargetResponse:
    opportunity = get_multi_profile_opportunity(opportunity_id)
    target = resolve_target(opportunity_id, target_identifier)
    if opportunity is None or target is None or not target["sportsbook_bet_id"]:
        raise HTTPException(status_code=404, detail="Opportunity target not found")
    if target["workflow_state"] != "Prospecting":
        raise HTTPException(
            status_code=409, detail="Only Prospecting opportunity rows can be reset"
        )
    profile_id = str(target["profile_id"])
    bookmaker = str(target["bookmaker"] or opportunity["bookmaker"])
    setup_payload = setup_payload_from_opportunity(
        opportunity, profile_id=profile_id, bookmaker=bookmaker
    )
    defaults = create_profile_sportsbook_payload(setup_payload, bookmaker=bookmaker)
    updated = update_sportsbook_bet(
        profile_id, str(target["sportsbook_bet_id"]), defaults
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Linked sportsbook row not found")
    return next(
        row
        for row in serialize_opportunity(opportunity_id).targets
        if row.target_id == str(target["target_id"])
    )


@router.delete(
    "/{opportunity_id}/targets/{target_identifier}",
    response_model=OpportunityResponse,
)
def remove_opportunity_target(
    opportunity_id: str, target_identifier: str
) -> OpportunityResponse:
    target = resolve_target(opportunity_id, target_identifier)
    if target is None:
        raise HTTPException(status_code=404, detail="Opportunity target not found")
    if target["workflow_state"] != "Prospecting":
        raise HTTPException(
            status_code=409, detail="Only unplaced Prospecting rows can be removed"
        )
    profile_id = str(target["profile_id"])
    sportsbook_bet_id = str(target["sportsbook_bet_id"] or "")
    remove_multi_profile_opportunity_target_row(
        opportunity_id=opportunity_id, target_id=str(target["target_id"])
    )
    if sportsbook_bet_id:
        delete_sportsbook_bet(profile_id, sportsbook_bet_id)
    return serialize_opportunity(opportunity_id)
