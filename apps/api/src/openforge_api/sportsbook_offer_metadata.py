"""Validated, versioned source metadata for Sportsbook Profit Boost and Cashback rows."""
from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from openforge_api.calculations.profit_boost import ProfitBoostInput, calculate_profit_boost
from openforge_api.free_bet_input import validate_free_bet_money
from openforge_api.sportsbook_odds_input import validate_sportsbook_odds


class ProfitBoostSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["profit-boost-source-v1"] = "profit-boost-source-v1"
    revision: int = Field(default=0, ge=0)
    mode: Literal["displayed_odds", "total_return", "profit_only", "percentage"]
    boosted_back_odds: str = ""
    total_potential_return: str = ""
    potential_profit: str = ""
    base_back_odds: str = ""
    profit_boost_percent: str = ""
    maximum_boost_winnings: str = ""

    @field_validator("total_potential_return", "potential_profit", "maximum_boost_winnings")
    @classmethod
    def money(cls, value: str, info: Any) -> str:
        return validate_free_bet_money(value, info.field_name)

    @field_validator("boosted_back_odds", "base_back_odds")
    @classmethod
    def odds(cls, value: str) -> str:
        return validate_sportsbook_odds(value)

    @field_validator("profit_boost_percent")
    @classmethod
    def percentage(cls, value: str) -> str:
        if value == "":
            return value
        parsed = Decimal(value)
        if not parsed.is_finite() or parsed < 0:
            raise ValueError("profit_boost_percent must be a finite non-negative percentage")
        return value

    @model_validator(mode="after")
    def required_source(self) -> "ProfitBoostSource":
        required = {
            "displayed_odds": self.boosted_back_odds,
            "total_return": self.total_potential_return,
            "profit_only": self.potential_profit,
            "percentage": self.base_back_odds and self.profit_boost_percent,
        }[self.mode]
        if not required:
            raise ValueError(f"{self.mode} source input is required")
        return self


class ConditionalBenefit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["conditional-benefit-v1"] = "conditional-benefit-v1"
    revision: int = Field(default=0, ge=0)
    refund_kind: Literal["cash", "free_bet"]
    eligibility: Literal["pending", "eligible", "not_eligible"] = "pending"
    eligible_amount: str = ""
    refund_cap: str = ""
    actual_receipt_amount: str = ""
    receipt_identity: str = Field(default="", max_length=120)
    receipt_date: str = Field(default="", max_length=40)
    linked_awarded_credit_id: str = Field(default="", max_length=64)

    @field_validator("eligible_amount", "refund_cap", "actual_receipt_amount")
    @classmethod
    def money(cls, value: str, info: Any) -> str:
        return validate_free_bet_money(value, info.field_name)

    @model_validator(mode="after")
    def receipt_is_explicit(self) -> "ConditionalBenefit":
        received = Decimal(self.actual_receipt_amount or "0")
        eligible = Decimal(self.eligible_amount or "0")
        cap = Decimal(self.refund_cap) if self.refund_cap else eligible
        permitted = min(eligible, cap)
        if received > permitted:
            raise ValueError("actual receipt cannot exceed the eligible amount or offer cap")
        if received > 0:
            if self.eligibility != "eligible":
                raise ValueError("an actual receipt requires eligible status")
            if not self.receipt_identity or not self.receipt_date:
                raise ValueError("an actual receipt requires its identity and date")
            try:
                datetime.fromisoformat(self.receipt_date.replace("Z", "+00:00"))
            except ValueError as error:
                raise ValueError("receipt_date must be an ISO date or date-time") from error
            if self.refund_kind == "free_bet" and not self.linked_awarded_credit_id:
                raise ValueError("a received Free Bet requires its linked awarded-credit identity")
        if self.refund_kind == "cash" and self.linked_awarded_credit_id:
            raise ValueError("cash receipt cannot carry an awarded-credit identity")
        return self


def parse_profit_boost_source(raw: str | None) -> ProfitBoostSource | None:
    return None if not raw else ProfitBoostSource.model_validate_json(raw)


def parse_conditional_benefit(raw: str | None) -> ConditionalBenefit | None:
    return None if not raw else ConditionalBenefit.model_validate_json(raw)


def validate_offer_metadata(profile_id: str, values: dict[str, Any]) -> dict[str, Any]:
    try:
        profit_raw = values.get("profit_boost_source_json")
        benefit_raw = values.get("conditional_benefit_json")
        if values.get("offer_type") == "Profit Boost":
            source = parse_profit_boost_source(profit_raw)
            if source:
                if values.get("profit_boost_mode") != source.mode:
                    raise ValueError("profit_boost_mode conflicts with profit_boost_source_json")
                result = calculate_profit_boost(ProfitBoostInput(
                    profile_id=profile_id, mode=source.mode, back_stake=values.get("back_stake", ""),
                    boosted_back_odds=source.boosted_back_odds,
                    total_potential_return=source.total_potential_return,
                    potential_profit=source.potential_profit, base_back_odds=source.base_back_odds,
                    profit_boost_percent=source.profit_boost_percent,
                    maximum_boost_winnings=source.maximum_boost_winnings,
                    actual_accepted_back_odds=values.get("actual_accepted_back_odds", ""),
                ))
                if result.calculation_state != "resolved" or result.reference_boosted_odds is None:
                    raise ValueError("Profit Boost source does not produce a valid reference")
                values = {**values,
                    "back_odds": f"{result.reference_boosted_odds:.4f}",
                    "base_back_odds": source.base_back_odds,
                    "profit_boost_percent": source.profit_boost_percent,
                    "maximum_boost_winnings": source.maximum_boost_winnings,
                    "profit_boost_source_json": source.model_dump_json(),
                }
            elif values.get("profit_boost_mode") in {"total_return", "profit_only"}:
                raise ValueError("this Profit Boost source requires versioned metadata")
        elif profit_raw:
            raise ValueError("profit_boost_source_json requires a Profit Boost offer")

        if values.get("offer_type") == "Cashback":
            benefit = parse_conditional_benefit(benefit_raw)
            if benefit:
                if benefit.eligible_amount and values.get("maximum_bonus") and Decimal(benefit.eligible_amount) != Decimal(values["maximum_bonus"]):
                    raise ValueError("maximum_bonus conflicts with conditional_benefit_json")
                permitted = min(
                    Decimal(benefit.eligible_amount or "0"),
                    Decimal(benefit.refund_cap or benefit.eligible_amount or "0"),
                )
                values = {**values, "maximum_bonus": str(permitted),
                          "conditional_benefit_json": benefit.model_dump_json()}
                if values.get("result") in {"Back Won + Cashback", "Lay Won + Cashback"}:
                    if benefit.refund_kind != "cash" or Decimal(benefit.actual_receipt_amount or "0") <= 0:
                        raise ValueError("cashback settlement requires an explicitly recorded cash receipt")
                if benefit.linked_awarded_credit_id:
                    from openforge_api.db import get_free_bet
                    child = get_free_bet(profile_id, benefit.linked_awarded_credit_id)
                    if child is None or child.origin_qual_bet_id != values.get("sportsbook_bet_id", ""):
                        raise ValueError("linked awarded credit must belong to this Cashback row and Profile")
        elif benefit_raw:
            raise ValueError("conditional_benefit_json requires a Cashback offer")
        return values
    except (ValueError, ArithmeticError, ValidationError) as error:
        raise HTTPException(status_code=422, detail=f"Sportsbook offer metadata: {error}") from error


def advance_metadata_revision(
    previous_raw: str | None,
    proposed_raw: str | None,
    *,
    kind: Literal["profit_boost", "conditional_benefit"],
) -> str | None:
    """Reject an old edit and advance the server-owned revision for a changed document."""
    parser = parse_profit_boost_source if kind == "profit_boost" else parse_conditional_benefit
    previous = parser(previous_raw)
    proposed = parser(proposed_raw)
    if previous is None or proposed is None:
        return proposed_raw
    previous_payload = previous.model_dump()
    proposed_payload = proposed.model_dump()
    previous_revision = int(previous_payload.pop("revision"))
    proposed_revision = int(proposed_payload.pop("revision"))
    if proposed_payload == previous_payload:
        return previous_raw
    if proposed_revision != previous_revision:
        raise HTTPException(
            status_code=409,
            detail=f"{kind}: this record changed after the editor was opened; reload and retry",
        )
    return proposed.model_copy(update={"revision": previous_revision + 1}).model_dump_json()


def encode_metadata(values: dict[str, Any]) -> str:
    return json.dumps(values, separators=(",", ":"), sort_keys=True)
