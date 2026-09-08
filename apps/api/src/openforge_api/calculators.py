from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from openforge_api.account_catalogue_source import load_master_account_catalogue
from openforge_api.calculations.each_way_extra_place import (
    EachWayCalculationInput,
    calculate_each_way_extra_place,
)
from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    calculate_free_bet_current_value,
)
from openforge_api.calculations.profit_boost import ProfitBoostInput, calculate_profit_boost
from openforge_api.calculations.sequential_lay import (
    SequentialLayInput,
    SequentialLayLegInput,
    calculate_sequential_lay,
)
from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
    quantize_money,
)
from openforge_api.db import get_profile
from openforge_api.sportsbook_odds_input import (
    normalize_calculator_odds,
    validate_complete_decimal_string,
)

router = APIRouter(tags=["calculators"])
DECIMAL_AMOUNT_MESSAGE = "Enter a decimal amount using a full stop, for example 10.50."
COMMISSION_MESSAGE = "Enter commission as a decimal from 0 to 1, for example 0.02."
PERCENT_MESSAGE = "Enter a percentage from 0 to 100."


class MatchedBettingPayload(BaseModel):
    bet_type: Literal[
        "qualifying", "free_bet", "money_back", "bonus_lock_in", "cashback", "profit_boost"
    ] = "qualifying"
    free_bet_mode: Literal["SNR", "SR"] = "SNR"
    promotion_mode: Literal["standard", "cashback"] = "standard"
    strategy: Literal["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"] = "Standard"
    back_stake: str = Field(max_length=40)
    back_odds: str = Field(default="", max_length=40)
    lay_odds: str = Field(max_length=40)
    exchange_commission: str = Field(max_length=40)
    manual_lay_stake: str = Field(default="", max_length=40)
    promotion_value: str = Field(default="", max_length=40)
    bonus_trigger: Literal["Lay Wins", "Back Wins"] = "Lay Wins"
    retention_percent: str = Field(default="70", max_length=40)
    underlay_factor: str = Field(default="0.928", max_length=40)
    overlay_factor: str = Field(default="1.300", max_length=40)
    profit_boost_mode: Literal[
        "displayed_odds", "total_return", "profit_only", "percentage"
    ] = "displayed_odds"
    boosted_back_odds: str = Field(default="", max_length=40)
    total_potential_return: str = Field(default="", max_length=40)
    potential_profit: str = Field(default="", max_length=40)
    base_back_odds: str = Field(default="", max_length=40)
    profit_boost_percent: str = Field(default="", max_length=40)
    actual_accepted_back_odds: str = Field(default="", max_length=40)
    maximum_boost_winnings: str = Field(default="", max_length=40)

    @field_validator("back_stake", mode="before")
    @classmethod
    def validate_back_stake(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_stake_positive", "Enter a back stake greater than zero."
            )
        return parsed

    @field_validator("lay_odds", mode="before")
    @classmethod
    def validate_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)

    @field_validator(
        "back_odds", "boosted_back_odds", "base_back_odds", "actual_accepted_back_odds",
        mode="before",
    )
    @classmethod
    def validate_optional_odds(cls, value: Any) -> str:
        return "" if value == "" else normalize_calculator_odds(value)

    @field_validator("exchange_commission", mode="before")
    @classmethod
    def validate_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        commission = Decimal(parsed)
        if commission < 0 or commission > 1:
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed

    @field_validator(
        "manual_lay_stake", "promotion_value", "total_potential_return", "potential_profit",
        "maximum_boost_winnings", mode="before",
    )
    @classmethod
    def validate_optional_money(cls, value: Any) -> str:
        if value == "":
            return ""
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_amount_positive", "Enter an amount greater than zero."
            )
        return parsed

    @field_validator("retention_percent", mode="before")
    @classmethod
    def validate_retention(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=PERCENT_MESSAGE)
        if Decimal(parsed) < 0 or Decimal(parsed) > 100:
            raise PydanticCustomError("calculator_percentage_range", PERCENT_MESSAGE)
        return parsed

    @field_validator("profit_boost_percent", mode="before")
    @classmethod
    def validate_optional_percentage(cls, value: Any) -> str:
        if value == "":
            return ""
        parsed = validate_complete_decimal_string(value, message=PERCENT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError("calculator_percentage_positive", PERCENT_MESSAGE)
        return parsed

    @field_validator("underlay_factor", "overlay_factor", mode="before")
    @classmethod
    def validate_factor(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_factor_positive", "Enter a factor greater than zero."
            )
        return parsed

    @model_validator(mode="after")
    def validate_mode_fields(self) -> "MatchedBettingPayload":
        if self.strategy == "Partial Lay" and not self.manual_lay_stake:
            raise PydanticCustomError(
                "calculator_manual_lay_required", "Enter the explicit lay stake for this strategy."
            )
        if (
            self.bet_type == "money_back"
            or (self.bet_type == "qualifying" and self.promotion_mode == "cashback")
        ) and not self.promotion_value:
            raise PydanticCustomError(
                "calculator_promotion_value_required", "Enter the cashback or refund value."
            )
        if self.bet_type in {"bonus_lock_in", "cashback"} and not self.promotion_value:
            raise PydanticCustomError(
                "calculator_promotion_value_required", "Enter the cashback or refund value."
            )
        if self.bet_type != "profit_boost" and not self.back_odds:
            raise PydanticCustomError("calculator_back_odds_required", "Enter back odds.")
        if self.bet_type == "profit_boost" and not self.actual_accepted_back_odds:
            required_by_mode = {
                "displayed_odds": self.boosted_back_odds,
                "total_return": self.total_potential_return,
                "profit_only": self.potential_profit,
                "percentage": self.base_back_odds and self.profit_boost_percent,
            }
            if not required_by_mode[self.profit_boost_mode]:
                raise PydanticCustomError(
                    "calculator_profit_boost_required",
                    "Enter the values required for the selected Profit Boost source.",
                )
        return self


class CalculatorOutcomeResponse(BaseModel):
    key: str
    label: str
    bookmaker_component: str
    exchange_component: str
    promotion_component: str | None = None
    total: str


class MatchedBettingResponse(BaseModel):
    result_kind: Literal["reference"] = "reference"
    calculation_state: str
    calculator_family: Literal["matched-betting"] = "matched-betting"
    canonical_back_odds: str
    canonical_lay_odds: str
    selected_lay_stake: str
    reference_lay_stake_standard: str
    reference_lay_stake_underlay: str
    reference_lay_stake_overlay: str
    liability: str
    pnl_if_back_wins: str
    pnl_if_lay_wins: str
    matched_result: str
    promotion_trigger_result: str | None = None
    effective_back_odds: str
    profit_boost_source: str | None = None
    outcomes: list[CalculatorOutcomeResponse]


class CalculatorExchangeResponse(BaseModel):
    catalogue_id: str
    name: str
    default_commission_rate: str


CALCULATOR_EXCHANGE_DEFAULTS = {"EXCHANGE-SMARKETS": "0"}


class MultiLayOutcomePayload(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    lay_odds: str = Field(max_length=40)

    @field_validator("lay_odds", mode="before")
    @classmethod
    def validate_lay_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)


class MultiLayPayload(BaseModel):
    allocation: Literal["standard", "underlay"] = "standard"
    back_stake: str = Field(max_length=40)
    back_odds: str = Field(max_length=40)
    exchange_commission: str = Field(max_length=40)
    outcomes: list[MultiLayOutcomePayload] = Field(min_length=2, max_length=3)

    @field_validator("back_stake", mode="before")
    @classmethod
    def validate_stake(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_amount_positive", "Enter an amount greater than zero."
            )
        return parsed

    @field_validator("back_odds", mode="before")
    @classmethod
    def validate_back_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)

    @field_validator("exchange_commission", mode="before")
    @classmethod
    def validate_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        if not Decimal("0") <= Decimal(parsed) <= Decimal("1"):
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed


class MultiLayBranchResponse(BaseModel):
    label: str
    lay_odds: str
    lay_stake: str
    liability: str
    outcome_value: str


class MultiLayResponse(BaseModel):
    result_kind: Literal["reference"] = "reference"
    calculation_state: str
    branches: list[MultiLayBranchResponse]
    no_selection_value: str
    matched_result: str
    total_liability: str


class SequentialLayLegPayload(BaseModel):
    lay_odds: str = Field(max_length=40)
    commission: str = Field(max_length=40)

    @field_validator("lay_odds", mode="before")
    @classmethod
    def validate_lay_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)

    @field_validator("commission", mode="before")
    @classmethod
    def validate_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        if not Decimal("0") <= Decimal(parsed) < Decimal("1"):
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed


class SequentialLayPayload(BaseModel):
    mode: Literal["standard", "lock_in"] = "standard"
    back_stake: str = Field(max_length=40)
    back_odds: str = Field(max_length=40)
    back_commission: str = Field(default="0", max_length=40)
    legs: list[SequentialLayLegPayload] = Field(min_length=2)

    @field_validator("back_stake", mode="before")
    @classmethod
    def validate_stake(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_amount_positive", "Enter an amount greater than zero."
            )
        return parsed

    @field_validator("back_odds", mode="before")
    @classmethod
    def validate_back_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)

    @field_validator("back_commission", mode="before")
    @classmethod
    def validate_back_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        if not Decimal("0") <= Decimal(parsed) <= Decimal("1"):
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed


class SequentialLayLegResponse(BaseModel):
    lay_odds: str
    commission: str
    lay_stake: str
    liability: str
    lay_win: str


class SequentialLayOutcomeResponse(BaseModel):
    key: str
    label: str
    bookmaker_component: str
    exchange_components: list[str]
    total: str


class SequentialLayResponse(BaseModel):
    result_kind: Literal["reference"] = "reference"
    calculation_state: Literal["resolved"] = "resolved"
    mode: Literal["standard", "lock_in"]
    back_win: str
    legs: list[SequentialLayLegResponse]
    outcomes: list[SequentialLayOutcomeResponse]
    all_legs_win: str
    locked_result: str | None


class EachWayPayload(BaseModel):
    mode: Literal["Each Way", "Extra Place"] = "Each Way"
    each_way_stake: str = Field(max_length=40)
    back_odds: str = Field(max_length=40)
    place_term_numerator: str = Field(default="1", max_length=10)
    place_term_denominator: str = Field(default="5", max_length=10)
    bookmaker_places: int = Field(default=4, ge=1, le=20)
    exchange_places: int = Field(default=4, ge=1, le=20)
    win_lay_odds: str = Field(max_length=40)
    place_lay_odds: str = Field(max_length=40)
    win_commission: str = Field(default="0", max_length=40)
    place_commission: str = Field(default="0", max_length=40)

    @field_validator("each_way_stake", mode="before")
    @classmethod
    def validate_stake(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=DECIMAL_AMOUNT_MESSAGE)
        if Decimal(parsed) <= 0:
            raise PydanticCustomError(
                "calculator_amount_positive", "Enter an amount greater than zero."
            )
        return parsed

    @field_validator("back_odds", "win_lay_odds", "place_lay_odds", mode="before")
    @classmethod
    def validate_odds(cls, value: Any) -> str:
        return normalize_calculator_odds(value)

    @field_validator("place_term_numerator", "place_term_denominator", mode="before")
    @classmethod
    def validate_term(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message="Enter valid each-way terms.")
        if Decimal(parsed) <= 0:
            raise PydanticCustomError("calculator_term_positive", "Enter valid each-way terms.")
        return parsed

    @field_validator("win_commission", "place_commission", mode="before")
    @classmethod
    def validate_commission(cls, value: Any) -> str:
        parsed = validate_complete_decimal_string(value, message=COMMISSION_MESSAGE)
        if not Decimal("0") <= Decimal(parsed) <= Decimal("1"):
            raise PydanticCustomError("calculator_commission_range", COMMISSION_MESSAGE)
        return parsed

    @model_validator(mode="after")
    def validate_places(self) -> "EachWayPayload":
        if self.mode == "Each Way" and self.bookmaker_places != self.exchange_places:
            raise PydanticCustomError(
                "calculator_places_match",
                "Each Way uses the same bookmaker and exchange place count.",
            )
        if self.mode == "Extra Place" and self.bookmaker_places <= self.exchange_places:
            raise PydanticCustomError(
                "calculator_extra_places",
                "Extra Place requires the bookmaker to pay more places than the exchange.",
            )
        return self


class EachWayResponse(BaseModel):
    result_kind: Literal["reference"] = "reference"
    calculation_state: str
    mode: Literal["Each Way", "Extra Place"]
    place_back_odds: str
    win_lay_stake: str
    place_lay_stake: str
    win_liability: str
    place_liability: str
    qualifying_loss: str
    extra_place_profit: str | None
    first_place_pnl: str
    standard_place_pnl: str
    extra_place_pnl: str | None
    unplaced_pnl: str
    current_value: str
    first_place_bookie_win_pnl: str
    first_place_bookie_place_pnl: str
    first_place_exchange_win_pnl: str
    first_place_exchange_place_pnl: str
    standard_place_bookie_win_pnl: str
    standard_place_bookie_place_pnl: str
    standard_place_exchange_win_pnl: str
    standard_place_exchange_place_pnl: str
    extra_place_bookie_win_pnl: str | None
    extra_place_bookie_place_pnl: str | None
    extra_place_exchange_win_pnl: str | None
    extra_place_exchange_place_pnl: str | None
    unplaced_bookie_win_pnl: str
    unplaced_bookie_place_pnl: str
    unplaced_exchange_win_pnl: str
    unplaced_exchange_place_pnl: str


class StandardQualifyingResponse(BaseModel):
    profile_id: str
    result_kind: str
    calculation_state: str
    reference_lay_stake: str
    liability: str
    pnl_if_back_wins: str
    pnl_if_lay_wins: str
    matched_result: str


def _money(value: Decimal | None) -> str:
    if value is None:
        raise HTTPException(
            status_code=422, detail="The calculator inputs did not produce a complete result."
        )
    return f"{value:.2f}"


def _matched_outcomes(
    payload: MatchedBettingPayload,
    *,
    bookmaker_if_back: Decimal,
    exchange_if_back: Decimal,
    bookmaker_if_lay: Decimal,
    exchange_if_lay: Decimal,
    promotion: Decimal | None,
) -> list[CalculatorOutcomeResponse]:
    offer_type = payload.bet_type
    if offer_type == "money_back":
        offer_type = "bonus_lock_in"
    if payload.bet_type == "qualifying" and payload.promotion_mode == "cashback":
        offer_type = "cashback"
    trigger_back = payload.bonus_trigger == "Back Wins"

    def row(
        key: str, label: str, bookmaker: Decimal, exchange: Decimal, applied_promotion: Decimal
    ) -> CalculatorOutcomeResponse:
        return CalculatorOutcomeResponse(
            key=key,
            label=label,
            bookmaker_component=_money(quantize_money(bookmaker)),
            exchange_component=_money(quantize_money(exchange)),
            promotion_component=(
                _money(quantize_money(applied_promotion)) if applied_promotion else None
            ),
            total=_money(quantize_money(bookmaker + exchange + applied_promotion)),
        )

    back_label = "Back bet wins"
    lay_label = "Lay bet wins"
    if promotion:
        if trigger_back:
            back_label = "Back wins / bonus triggers" if offer_type == "bonus_lock_in" else "Back wins / cashback triggers"
        else:
            lay_label = "Back loses / bonus triggers" if offer_type == "bonus_lock_in" else "Cashback-trigger result"
    return [
        row("back-wins", back_label, bookmaker_if_back, exchange_if_back, promotion if promotion and trigger_back else Decimal("0")),
        row("lay-wins", lay_label, bookmaker_if_lay, exchange_if_lay, promotion if promotion and not trigger_back else Decimal("0")),
    ]


def _calculate(payload: MatchedBettingPayload) -> MatchedBettingResponse:
    profit_boost = None
    effective_back_odds_text = payload.back_odds
    if payload.bet_type == "profit_boost":
        profit_boost = calculate_profit_boost(
            ProfitBoostInput(
                profile_id="standalone",
                mode=payload.profit_boost_mode,
                back_stake=payload.back_stake,
                base_back_odds=payload.base_back_odds,
                profit_boost_percent=payload.profit_boost_percent,
                boosted_back_odds=payload.boosted_back_odds,
                total_potential_return=payload.total_potential_return,
                potential_profit=payload.potential_profit,
                actual_accepted_back_odds=payload.actual_accepted_back_odds,
                maximum_boost_winnings=payload.maximum_boost_winnings,
            )
        )
        if profit_boost.calculation_state != "resolved" or profit_boost.effective_back_odds is None:
            raise HTTPException(status_code=422, detail=profit_boost.calculation_notes[0])
        effective_back_odds_text = f"{profit_boost.effective_back_odds:.4f}"
    calculation_strategy = (
        "Standard" if payload.strategy == "Custom" and not payload.manual_lay_stake else payload.strategy
    )
    if payload.bet_type == "free_bet":
        free_result = calculate_free_bet_current_value(
            FreeBetCalculationInput(
                profile_id="standalone",
                record_id="standalone-matched-betting-preview",
                status="Placed",
                result="Pending",
                retention_mode=payload.free_bet_mode,
                free_bet_value=payload.back_stake,
                back_odds=effective_back_odds_text,
                match_strategy=calculation_strategy,
                lay_odds_1=payload.lay_odds,
                lay_commission_1=payload.exchange_commission,
                lay_actual=payload.manual_lay_stake,
                default_underlay_factor=payload.underlay_factor,
                default_overlay_factor=payload.overlay_factor,
            ),
            as_of_datetime=datetime.now(timezone.utc),
        )
        standard, underlay, overlay = (
            free_result.base_reference_lay_stake,
            free_result.underlay_reference_lay_stake,
            free_result.overlay_reference_lay_stake,
        )
        calculation_state = free_result.calculation_state
        actual_lay_stake = free_result.actual_lay_stake_1
        liability = free_result.calculated_liability_1
        pnl_back = free_result.scenario_pnl_if_back_wins
        pnl_lay = free_result.scenario_pnl_if_lay_wins
        matched = free_result.projected_current_pnl
        promotion_trigger_result = None
        component_values = (
            free_result.bookmaker_component_if_back_wins,
            free_result.exchange_component_if_back_wins,
            free_result.bookmaker_component_if_lay_wins,
            free_result.exchange_component_if_lay_wins,
            None,
        )
    else:
        offer_type = ""
        if payload.bet_type in {"money_back", "bonus_lock_in"}:
            offer_type = "Bonus Lock-In"
        elif payload.bet_type == "cashback" or payload.promotion_mode == "cashback":
            offer_type = "Cashback"
        elif payload.bet_type == "profit_boost":
            offer_type = "Profit Boost"
        sportsbook_result = calculate_sportsbook_current_value(
            SportsbookCalculationInput(
                profile_id="standalone",
                record_id="standalone-matched-betting-preview",
                status="Placed",
                result="Pending",
                offer_type=offer_type,
                back_stake=payload.back_stake,
                back_odds=effective_back_odds_text,
                match_strategy=calculation_strategy,
                bonus_trigger=payload.bonus_trigger if offer_type in {"Bonus Lock-In", "Cashback"} else "",
                maximum_bonus=payload.promotion_value,
                bonus_retention_rate=payload.retention_percent,
                lay_odds_1=payload.lay_odds,
                lay_commission_1=payload.exchange_commission,
                lay_actual=payload.manual_lay_stake,
            ),
            as_of_date=date.today(),
        )
        standard, underlay, overlay = (
            sportsbook_result.reference_lay_stake_standard,
            sportsbook_result.reference_lay_stake_underlay,
            sportsbook_result.reference_lay_stake_overlay,
        )
        calculation_state = sportsbook_result.calculation_state
        actual_lay_stake = sportsbook_result.actual_lay_stake_1
        liability = sportsbook_result.calculated_liability_1
        pnl_back = sportsbook_result.scenario_pnl_if_back_wins
        pnl_lay = sportsbook_result.scenario_pnl_if_lay_wins
        matched = sportsbook_result.projected_current_pnl
        promotion_trigger_result = sportsbook_result.scenario_pnl_if_outcome_2_wins
        component_values = (
            sportsbook_result.bookmaker_component_if_back_wins,
            sportsbook_result.exchange_component_if_back_wins,
            sportsbook_result.bookmaker_component_if_lay_wins,
            sportsbook_result.exchange_component_if_lay_wins,
            sportsbook_result.promotion_component,
        )

    assert actual_lay_stake is not None
    assert liability is not None
    effective_back_odds = Decimal(effective_back_odds_text)
    outcomes = _matched_outcomes(
        payload,
        bookmaker_if_back=component_values[0] or Decimal("0"),
        exchange_if_back=component_values[1] or Decimal("0"),
        bookmaker_if_lay=component_values[2] or Decimal("0"),
        exchange_if_lay=component_values[3] or Decimal("0"),
        promotion=component_values[4],
    )

    return MatchedBettingResponse(
        calculation_state=calculation_state,
        canonical_back_odds=effective_back_odds_text,
        canonical_lay_odds=payload.lay_odds,
        selected_lay_stake=_money(actual_lay_stake),
        reference_lay_stake_standard=_money(standard),
        reference_lay_stake_underlay=_money(underlay),
        reference_lay_stake_overlay=_money(overlay),
        liability=_money(liability),
        pnl_if_back_wins=_money(pnl_back),
        pnl_if_lay_wins=_money(pnl_lay),
        matched_result=_money(matched),
        promotion_trigger_result=_money(promotion_trigger_result)
        if promotion_trigger_result is not None
        else None,
        effective_back_odds=f"{effective_back_odds:.4f}",
        profit_boost_source=profit_boost.boost_source if profit_boost else None,
        outcomes=outcomes,
    )


@router.post(
    "/fund-manager/calculators/matched-betting/preview", response_model=MatchedBettingResponse
)
def preview_matched_betting(payload: MatchedBettingPayload) -> MatchedBettingResponse:
    return _calculate(payload)


@router.get(
    "/fund-manager/calculators/exchanges", response_model=list[CalculatorExchangeResponse]
)
def list_calculator_exchanges() -> list[CalculatorExchangeResponse]:
    catalogue = load_master_account_catalogue()
    records = [
        CalculatorExchangeResponse(
            catalogue_id=record.catalogue_id,
            name=record.brand_name,
            default_commission_rate=CALCULATOR_EXCHANGE_DEFAULTS.get(record.catalogue_id, ""),
        )
        for record in catalogue.records
        if record.account_type == "Exchange" and record.status == "Active"
    ]
    return sorted(records, key=lambda record: (record.name.casefold() != "smarkets", record.name.casefold()))


@router.post("/fund-manager/calculators/multi-lay/preview", response_model=MultiLayResponse)
def preview_multi_lay(payload: MultiLayPayload) -> MultiLayResponse:
    first, *additional = payload.outcomes
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="standalone",
            record_id="standalone-multi-lay-preview",
            status="Placed",
            result="Pending",
            offer_type="Bet & Get",
            back_stake=payload.back_stake,
            back_odds=payload.back_odds,
            match_strategy="Multilay" if payload.allocation == "standard" else "Multilay-Underlay",
            lay_odds_1=first.lay_odds,
            multi_lay_outcome_1_name=first.label,
            multi_lay_outcomes_json=json.dumps(
                [
                    {"id": f"outcome{index}", "label": outcome.label, "layOdds": outcome.lay_odds}
                    for index, outcome in enumerate(additional, start=2)
                ],
                separators=(",", ":"),
            ),
            lay_commission_1=payload.exchange_commission,
        ),
        as_of_date=date.today(),
    )
    if result.calculation_state != "resolved" or not result.multi_lay_branches:
        raise HTTPException(
            status_code=422, detail="The Multi-Lay inputs did not produce a complete result."
        )
    return MultiLayResponse(
        calculation_state=result.calculation_state,
        branches=[
            MultiLayBranchResponse(
                label=branch.label,
                lay_odds=str(branch.lay_odds),
                lay_stake=_money(branch.lay_stake),
                liability=_money(branch.liability),
                outcome_value=_money(branch.scenario_pnl),
            )
            for branch in result.multi_lay_branches
        ],
        no_selection_value=_money(result.scenario_pnl_if_lay_wins),
        matched_result=_money(result.projected_current_pnl),
        total_liability=_money(
            sum((branch.liability for branch in result.multi_lay_branches), Decimal("0"))
        ),
    )


@router.post(
    "/fund-manager/calculators/sequential-lay/preview",
    response_model=SequentialLayResponse,
)
def preview_sequential_lay(payload: SequentialLayPayload) -> SequentialLayResponse:
    result = calculate_sequential_lay(
        SequentialLayInput(
            mode=payload.mode,
            back_stake=Decimal(payload.back_stake),
            back_odds=Decimal(payload.back_odds),
            back_commission=Decimal(payload.back_commission),
            legs=tuple(
                SequentialLayLegInput(
                    lay_odds=Decimal(leg.lay_odds),
                    commission=Decimal(leg.commission),
                )
                for leg in payload.legs
            ),
        )
    )
    return SequentialLayResponse(
        mode=payload.mode,
        back_win=_money(result.back_win),
        legs=[
            SequentialLayLegResponse(
                lay_odds=str(leg.lay_odds),
                commission=str(leg.commission),
                lay_stake=_money(leg.lay_stake),
                liability=_money(leg.liability),
                lay_win=_money(leg.lay_win),
            )
            for leg in result.legs
        ],
        outcomes=[
            SequentialLayOutcomeResponse(
                key=outcome.key,
                label=outcome.label,
                bookmaker_component=_money(outcome.bookmaker_component),
                exchange_components=[_money(value) for value in outcome.exchange_components],
                total=_money(outcome.total),
            )
            for outcome in result.outcomes
        ],
        all_legs_win=_money(result.all_legs_win),
        locked_result=_money(result.locked_result) if result.locked_result is not None else None,
    )


@router.post("/fund-manager/calculators/each-way/preview", response_model=EachWayResponse)
def preview_each_way(payload: EachWayPayload) -> EachWayResponse:
    result = calculate_each_way_extra_place(
        EachWayCalculationInput(
            mode=payload.mode,
            each_way_stake=payload.each_way_stake,
            back_odds=payload.back_odds,
            place_term_numerator=payload.place_term_numerator,
            place_term_denominator=payload.place_term_denominator,
            win_lay_odds=payload.win_lay_odds,
            place_lay_odds=payload.place_lay_odds,
            win_commission=payload.win_commission,
            place_commission=payload.place_commission,
        )
    )
    if result.calculation_state != "resolved":
        raise HTTPException(
            status_code=422, detail="The Each Way inputs did not produce a complete result."
        )
    return EachWayResponse(
        calculation_state=result.calculation_state,
        mode=payload.mode,
        place_back_odds=str(result.place_back_odds),
        win_lay_stake=_money(result.win_lay_stake),
        place_lay_stake=_money(result.place_lay_stake),
        win_liability=_money(result.win_liability),
        place_liability=_money(result.place_liability),
        qualifying_loss=_money(result.qualifying_loss),
        extra_place_profit=_money(result.extra_place_profit)
        if payload.mode == "Extra Place"
        else None,
        first_place_pnl=_money(result.first_place_pnl),
        standard_place_pnl=_money(result.standard_place_pnl),
        extra_place_pnl=_money(result.extra_place_pnl) if payload.mode == "Extra Place" else None,
        unplaced_pnl=_money(result.unplaced_pnl),
        current_value=_money(result.current_value),
        first_place_bookie_win_pnl=_money(result.first_place_bookie_win_pnl),
        first_place_bookie_place_pnl=_money(result.first_place_bookie_place_pnl),
        first_place_exchange_win_pnl=_money(result.first_place_exchange_win_pnl),
        first_place_exchange_place_pnl=_money(result.first_place_exchange_place_pnl),
        standard_place_bookie_win_pnl=_money(result.standard_place_bookie_win_pnl),
        standard_place_bookie_place_pnl=_money(result.standard_place_bookie_place_pnl),
        standard_place_exchange_win_pnl=_money(result.standard_place_exchange_win_pnl),
        standard_place_exchange_place_pnl=_money(result.standard_place_exchange_place_pnl),
        extra_place_bookie_win_pnl=_money(result.extra_place_bookie_win_pnl)
        if payload.mode == "Extra Place"
        else None,
        extra_place_bookie_place_pnl=_money(result.extra_place_bookie_place_pnl)
        if payload.mode == "Extra Place"
        else None,
        extra_place_exchange_win_pnl=_money(result.extra_place_exchange_win_pnl)
        if payload.mode == "Extra Place"
        else None,
        extra_place_exchange_place_pnl=_money(result.extra_place_exchange_place_pnl)
        if payload.mode == "Extra Place"
        else None,
        unplaced_bookie_win_pnl=_money(result.unplaced_bookie_win_pnl),
        unplaced_bookie_place_pnl=_money(result.unplaced_bookie_place_pnl),
        unplaced_exchange_win_pnl=_money(result.unplaced_exchange_win_pnl),
        unplaced_exchange_place_pnl=_money(result.unplaced_exchange_place_pnl),
    )


@router.post(
    "/profiles/{profile_id}/calculators/standard-qualifying/preview",
    response_model=StandardQualifyingResponse,
)
def preview_standard_qualifying(
    profile_id: str, payload: MatchedBettingPayload
) -> StandardQualifyingResponse:
    """Compatibility endpoint for the original profile-scoped calculator URL."""
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    result = _calculate(
        payload.model_copy(update={"bet_type": "qualifying", "strategy": "Standard"})
    )
    return StandardQualifyingResponse(
        profile_id=profile_id,
        result_kind=result.result_kind,
        calculation_state=result.calculation_state,
        reference_lay_stake=result.selected_lay_stake,
        liability=result.liability,
        pnl_if_back_wins=result.pnl_if_back_wins,
        pnl_if_lay_wins=result.pnl_if_lay_wins,
        matched_result=result.matched_result,
    )
