"""One versioned core planner; existing calculator service owns all reference maths."""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from openforge_api.free_bet_input import validate_free_bet_commission, validate_free_bet_money
from openforge_api.sportsbook_odds_input import validate_sportsbook_odds


class LayPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["lay-plan-v1"] = "lay-plan-v1"
    revision: int = Field(default=0, ge=0)
    calculation_contract_version: Literal["workbook-reference-v1", "snr-outcome-target-v1"]
    backing_basis: Literal["Normal", "SNR"]
    back_stake: str
    back_odds: str
    lay_odds: str
    selected_strategy: Literal["Standard", "Underlay", "Overlay", "Custom"]
    custom_lay_stake: str = ""
    exchange_name: str = Field(min_length=1, max_length=120)
    exchange_account_id: str = Field(default="", max_length=64)
    commission_units: Literal["ratio"] = "ratio"
    commission: str
    commission_origin: Literal["default", "override"]
    reviewed_planned_lay_stake: str = ""
    source_identity: str = Field(default="", max_length=200)
    source_checksum: str = Field(default="", max_length=64)

    @field_validator("back_stake", "custom_lay_stake", "reviewed_planned_lay_stake")
    @classmethod
    def money(cls, value: str, info: Any) -> str:
        return validate_free_bet_money(value, info.field_name)

    @field_validator("back_odds", "lay_odds")
    @classmethod
    def odds(cls, value: str) -> str:
        return validate_sportsbook_odds(value)

    @field_validator("commission")
    @classmethod
    def rate(cls, value: str) -> str:
        return validate_free_bet_commission(value)

    @model_validator(mode="after")
    def complete(self) -> "LayPlan":
        expected = "snr-outcome-target-v1" if self.backing_basis == "SNR" else "workbook-reference-v1"
        if self.calculation_contract_version != expected:
            raise ValueError("calculation_contract_version conflicts with backing_basis")
        if not all((self.back_stake, self.back_odds, self.lay_odds, self.commission)):
            raise ValueError("complete planning stake, odds and commission are required")
        if Decimal(self.back_stake) <= 0:
            raise ValueError("back_stake must be positive")
        if self.selected_strategy == "Custom" and not self.custom_lay_stake:
            raise ValueError("Custom requires an explicit custom_lay_stake")
        return self

    def reference(self):
        from openforge_api.calculators import MatchedBettingPayload, _calculate
        return _calculate(MatchedBettingPayload(
            bet_type="free_bet" if self.backing_basis == "SNR" else "qualifying",
            free_bet_mode="SNR", strategy=self.selected_strategy,
            back_stake=self.back_stake, back_odds=self.back_odds,
            lay_odds=self.lay_odds, exchange_commission=self.commission,
            manual_lay_stake=self.custom_lay_stake if self.selected_strategy == "Custom" else "",
        ))

    def reference_inputs(self) -> dict[str, Any]:
        result = self.reference()
        return {"reference_lay_stakes": (
            result.reference_lay_stake_standard, result.reference_lay_stake_underlay,
            result.reference_lay_stake_overlay),
            "planned_lay_stake": result.selected_lay_stake}


def parse_plan(value: str) -> LayPlan:
    return LayPlan.model_validate_json(value)


def readable_plan(values: dict[str, Any]) -> tuple[LayPlan | None, str | None]:
    raw = values.get("lay_plan_json")
    if not raw:
        return None, None
    try:
        return parse_plan(raw), None
    except ValueError as error:
        if any(values.get(f) and Decimal(values[f]) > 0 for f in ("lay_actual", "lay_matched_stake_1")):
            return None, f"Planning context requires correction: {error}"
        raise


def validate_plan_write(profile_id: str, values: dict[str, Any], *, basis: str) -> dict[str, Any]:
    """Runs at the existing effective-record precommit boundary, never on legacy reads."""
    raw = values.get("lay_plan_json")
    if raw is None:
        return values
    try:
        plan = parse_plan(raw)
        if plan.backing_basis != basis:
            raise ValueError("backing_basis conflicts with the ledger")
        stake = "free_bet_value" if basis == "SNR" else "back_stake"
        planning_odds_field = (
            "actual_accepted_back_odds"
            if values.get("offer_type") == "Profit Boost"
            and values.get("actual_accepted_back_odds")
            else "back_odds"
        )
        for field, planned in [(stake, plan.back_stake), (planning_odds_field, plan.back_odds)]:
            if not values.get(field) or Decimal(values[field]) != Decimal(planned):
                raise ValueError(f"{field} conflicts with lay_plan_json")
        if values.get("match_strategy") != plan.selected_strategy:
            raise ValueError("match_strategy conflicts with lay_plan_json")
        if values.get("exchange_name") != plan.exchange_name:
            raise ValueError("exchange_name conflicts with lay_plan_json")
        actual = values.get("lay_actual") or values.get("lay_matched_stake_1")
        if not actual or Decimal(actual) == 0:
            if not values.get("lay_odds_1") or Decimal(values["lay_odds_1"]) != Decimal(plan.lay_odds):
                raise ValueError("lay_odds_1 conflicts with the unplaced plan")
        else:
            if not values.get("lay_commission_1"):
                raise ValueError("lay_commission_1: explicitly confirm actual Commission (%)")
        from openforge_api.db import list_accounts
        candidates = [a for a in list_accounts(profile_id)
                      if a.type == "Exchange" and a.account == plan.exchange_name
                      and (not plan.exchange_account_id or a.account_id == plan.exchange_account_id)]
        if len(candidates) != 1:
            raise ValueError("exchange_account_id: select one unambiguous authorised Exchange Account")
        account = candidates[0]
        if account.status == "Archived" or account.lifecycle_status == "Archived":
            raise HTTPException(status_code=409, detail="Exchange Account is archived")
        result = plan.reference()
        if plan.reviewed_planned_lay_stake and Decimal(plan.reviewed_planned_lay_stake) != Decimal(result.selected_lay_stake):
            raise ValueError("reviewed_planned_lay_stake does not match authoritative reference")
        plan = plan.model_copy(update={"exchange_account_id": account.account_id,
                                      "reviewed_planned_lay_stake": result.selected_lay_stake})
        return {**values, "lay_plan_json": plan.model_dump_json()}
    except (ValueError, ArithmeticError) as error:
        raise HTTPException(status_code=422, detail=f"lay_plan_json: {error}") from error


def encode_plan(**values: Any) -> str:
    return json.dumps(values, separators=(",", ":"), sort_keys=True)


def capture_first_placement_commission(existing: Any, patch: dict[str, Any]) -> dict[str, Any]:
    """Explicit first actual-placement request accepts reviewed terms when rate is omitted.

    An explicit blank is not acceptance; subsequent actual rates never follow plan/defaults.
    """
    raw = patch.get("lay_plan_json", existing.lay_plan_json)
    try:
        supplied_actual = any(patch.get(f) and Decimal(patch[f]).is_finite() and Decimal(patch[f]) > 0
                              for f in ("lay_actual", "lay_matched_stake_1"))
    except (ValueError, ArithmeticError, TypeError):
        # The existing field-specific validator must reject malformed supplied input.
        return patch
    if raw and supplied_actual and "lay_commission_1" not in patch and not existing.lay_commission_1:
        try:
            return {**patch, "lay_commission_1": parse_plan(raw).commission}
        except ValueError:
            return patch
    return patch


def store_plan(connection: Any, table: str, profile_id: str, record_id: str,
               raw: str | None, *, updating: bool = False) -> str | None:
    if table not in {"free_bets", "sportsbook_bets"}:
        raise ValueError("Unsupported core ledger")
    identity = "free_bet_id" if table == "free_bets" else "sportsbook_bet_id"
    current = connection.execute(f"SELECT lay_plan_json,lay_actual,lay_matched_stake_1 FROM {table} WHERE profile_id=? AND {identity}=?", (profile_id, record_id)).fetchone()
    previous = current["lay_plan_json"] if current else None
    if updating and previous and raw != previous:
        if raw is None:
            if any(current[f] and Decimal(current[f]) > 0 for f in ("lay_actual", "lay_matched_stake_1")):
                raise HTTPException(status_code=409, detail="A placed plan cannot be cleared")
        else:
            before, after = parse_plan(previous), parse_plan(raw)
            if (before.source_identity, before.source_checksum) != (after.source_identity, after.source_checksum):
                raise HTTPException(status_code=409, detail="Original planning source identity cannot be reassigned")
            if after.revision != before.revision:
                raise HTTPException(status_code=409, detail="Plan changed; reload before saving this revision")
            raw = after.model_copy(update={"revision": before.revision + 1}).model_dump_json()
    connection.execute(f"UPDATE {table} SET lay_plan_json=? WHERE profile_id=? AND {identity}=?", (raw, profile_id, record_id))
    return raw
