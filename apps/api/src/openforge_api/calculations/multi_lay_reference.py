from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from openforge_api.calculations.sportsbook_current_value import quantize_money, quantize_ratio

MultiLayBackingType = Literal["normal", "free_bet_snr", "money_back"]
MultiLayStrategy = Literal["standard", "underlay", "overlay", "custom"]


@dataclass(frozen=True)
class MultiLayLegInput:
    label: str
    lay_odds: Decimal
    commission: Decimal


@dataclass(frozen=True)
class MultiLayLegResult:
    label: str
    lay_odds: Decimal
    commission: Decimal
    lay_stake: Decimal
    liability: Decimal


@dataclass(frozen=True)
class MultiLayScenarioResult:
    key: str
    label: str
    bookmaker_component: Decimal
    lay_components: tuple[Decimal, ...]
    reward_component: Decimal
    total: Decimal


@dataclass(frozen=True)
class MultiLayStrategyReference:
    strategy: Literal["underlay", "standard", "overlay"]
    multiplier: Decimal | None
    total_lay_stake: Decimal | None


@dataclass(frozen=True)
class MultiLayReferenceResult:
    calculation_version: str
    backing_type: MultiLayBackingType
    strategy: MultiLayStrategy
    effective_back_odds: Decimal
    retained_refund: Decimal
    selected_multiplier: Decimal
    default_minimum_multiplier: Decimal
    default_maximum_multiplier: Decimal
    references: tuple[MultiLayStrategyReference, ...]
    legs: tuple[MultiLayLegResult, ...]
    scenarios: tuple[MultiLayScenarioResult, ...]
    maximum_exchange_exposure: Decimal
    reference_result: Decimal


def _reference_multipliers(
    *,
    base_stakes: tuple[Decimal, ...],
    legs: tuple[MultiLayLegInput, ...],
    bookmaker_win: Decimal,
    bookmaker_loss: Decimal,
) -> tuple[Decimal | None, Decimal | None]:
    loss_denominator = sum(
        (
            stake * (Decimal("1") - leg.commission)
            for stake, leg in zip(base_stakes, legs, strict=True)
        ),
        Decimal("0"),
    )
    underlay = -bookmaker_loss / loss_denominator if loss_denominator > 0 else None

    overlay_denominator = -base_stakes[0] * (legs[0].lay_odds - Decimal("1"))
    overlay_denominator += sum(
        (
            base_stakes[index] * (Decimal("1") - legs[index].commission)
            for index in range(1, len(legs))
        ),
        Decimal("0"),
    )
    overlay = -bookmaker_win / overlay_denominator if overlay_denominator != 0 else None

    valid_underlay = underlay if underlay is not None and underlay >= 0 else None
    valid_overlay = overlay if overlay is not None and overlay >= 0 else None
    if valid_underlay is not None and valid_overlay is not None:
        if valid_overlay < valid_underlay:
            valid_underlay, valid_overlay = valid_overlay, valid_underlay
        if valid_underlay < 1 and valid_overlay < 1:
            valid_underlay, valid_overlay = Decimal("0.8"), Decimal("1.2")
    return valid_underlay, valid_overlay


def calculate_multi_lay_reference(
    *,
    backing_type: MultiLayBackingType,
    back_stake: Decimal,
    back_odds: Decimal,
    profit_boost_percent: Decimal,
    refund_amount: Decimal,
    retention_percent: Decimal,
    strategy: MultiLayStrategy,
    custom_multiplier: Decimal,
    legs: tuple[MultiLayLegInput, ...],
) -> MultiLayReferenceResult:
    if back_stake <= 0:
        raise ValueError("Back stake must be greater than zero.")
    if back_odds <= 1:
        raise ValueError("Back odds must be greater than one.")
    if profit_boost_percent < 0:
        raise ValueError("Profit Boost cannot be negative.")
    if refund_amount < 0:
        raise ValueError("Refund amount cannot be negative.")
    if not Decimal("0") <= retention_percent <= Decimal("100"):
        raise ValueError("Retention must be between 0 and 100 percent.")
    if not 2 <= len(legs) <= 20:
        raise ValueError("Multi-Lay requires between 2 and 20 outcomes.")
    if custom_multiplier < 0:
        raise ValueError("Custom multiplier cannot be negative.")
    for leg in legs:
        if leg.lay_odds <= 1:
            raise ValueError(f"{leg.label} lay odds must be greater than one.")
        if not Decimal("0") <= leg.commission < Decimal("1"):
            raise ValueError(f"{leg.label} commission must be at least 0 and below 100%.")
        if leg.lay_odds - leg.commission <= 0:
            raise ValueError(f"{leg.label} odds and commission produce an invalid denominator.")

    effective_back_odds = Decimal("1") + (back_odds - Decimal("1")) * (
        Decimal("1") + profit_boost_percent / Decimal("100")
    )
    retained_refund = (
        quantize_money(refund_amount * retention_percent / Decimal("100"))
        if backing_type == "money_back"
        else Decimal("0.00")
    )
    raw_bookmaker_win = back_stake * (effective_back_odds - Decimal("1"))
    bookmaker_win = quantize_money(raw_bookmaker_win)
    if backing_type == "free_bet_snr":
        bookmaker_loss_cash = Decimal("0.00")
        bookmaker_loss = bookmaker_loss_cash
        stake_base = raw_bookmaker_win
    elif backing_type == "money_back":
        bookmaker_loss_cash = quantize_money(-back_stake)
        bookmaker_loss = quantize_money(bookmaker_loss_cash + retained_refund)
        stake_base = back_stake * effective_back_odds - retained_refund
    else:
        bookmaker_loss_cash = quantize_money(-back_stake)
        bookmaker_loss = bookmaker_loss_cash
        stake_base = back_stake * effective_back_odds
    if stake_base < 0:
        raise ValueError("The retained refund exceeds the available backing basis.")

    base_stakes = tuple(stake_base / (leg.lay_odds - leg.commission) for leg in legs)
    underlay_multiplier, overlay_multiplier = _reference_multipliers(
        base_stakes=base_stakes,
        legs=legs,
        bookmaker_win=bookmaker_win,
        bookmaker_loss=bookmaker_loss,
    )
    multiplier_by_strategy: dict[MultiLayStrategy, Decimal | None] = {
        "standard": Decimal("1"),
        "underlay": underlay_multiplier,
        "overlay": overlay_multiplier,
        "custom": custom_multiplier,
    }
    selected_multiplier = multiplier_by_strategy[strategy]
    if selected_multiplier is None:
        raise ValueError(f"The {strategy.title()} endpoint is unavailable for these inputs.")

    standard_total = sum(base_stakes, Decimal("0"))
    underlay_total = (
        standard_total * underlay_multiplier if underlay_multiplier is not None else None
    )
    overlay_total = standard_total * overlay_multiplier if overlay_multiplier is not None else None
    slider_min_total = (
        max(Decimal("0"), standard_total - Decimal("1.5") * (standard_total - underlay_total))
        if underlay_total is not None
        else standard_total * Decimal("0.8")
    )
    slider_max_total = (
        standard_total + Decimal("1.5") * (overlay_total - standard_total)
        if overlay_total is not None
        else standard_total * Decimal("1.2")
    )
    default_minimum_multiplier = quantize_ratio(
        slider_min_total / standard_total if standard_total else Decimal("0")
    )
    default_maximum_multiplier = quantize_ratio(
        slider_max_total / standard_total if standard_total else Decimal("0")
    )

    placed_stakes = tuple(quantize_money(stake * selected_multiplier) for stake in base_stakes)
    leg_results = tuple(
        MultiLayLegResult(
            label=leg.label,
            lay_odds=leg.lay_odds,
            commission=leg.commission,
            lay_stake=stake,
            liability=quantize_money(stake * (leg.lay_odds - Decimal("1"))),
        )
        for leg, stake in zip(legs, placed_stakes, strict=True)
    )
    lay_wins = tuple(
        quantize_money(leg.lay_stake * (Decimal("1") - leg.commission)) for leg in leg_results
    )
    scenarios: list[MultiLayScenarioResult] = []
    scenarios.append(
        MultiLayScenarioResult(
            key="back-loses",
            label="Back bet loses",
            bookmaker_component=bookmaker_loss_cash,
            lay_components=lay_wins,
            reward_component=retained_refund,
            total=quantize_money(bookmaker_loss + sum(lay_wins, Decimal("0"))),
        )
    )
    maximum_exchange_exposure = Decimal("0")
    for index, leg_result in enumerate(leg_results):
        components = tuple(
            -candidate.liability if at == index else lay_wins[at]
            for at, candidate in enumerate(leg_results)
        )
        exchange_change = quantize_money(sum(components, Decimal("0")))
        reserved_exposure = quantize_money(
            leg_result.liability
            - sum(
                (candidate.lay_stake for at, candidate in enumerate(leg_results) if at != index),
                Decimal("0"),
            )
        )
        maximum_exchange_exposure = max(maximum_exchange_exposure, reserved_exposure)
        scenarios.append(
            MultiLayScenarioResult(
                key=f"lay-{index + 1}-wins",
                label=f"{leg_result.label} wins",
                bookmaker_component=bookmaker_win,
                lay_components=components,
                reward_component=Decimal("0.00"),
                total=quantize_money(bookmaker_win + exchange_change),
            )
        )
    maximum_exchange_exposure = quantize_money(max(Decimal("0"), maximum_exchange_exposure))
    references = (
        MultiLayStrategyReference(
            strategy="underlay",
            multiplier=quantize_ratio(underlay_multiplier)
            if underlay_multiplier is not None
            else None,
            total_lay_stake=quantize_money(underlay_total) if underlay_total is not None else None,
        ),
        MultiLayStrategyReference(
            strategy="standard",
            multiplier=Decimal("1.0000"),
            total_lay_stake=quantize_money(standard_total),
        ),
        MultiLayStrategyReference(
            strategy="overlay",
            multiplier=quantize_ratio(overlay_multiplier)
            if overlay_multiplier is not None
            else None,
            total_lay_stake=quantize_money(overlay_total) if overlay_total is not None else None,
        ),
    )
    return MultiLayReferenceResult(
        calculation_version="multi-lay-v2",
        backing_type=backing_type,
        strategy=strategy,
        effective_back_odds=quantize_ratio(effective_back_odds),
        retained_refund=retained_refund,
        selected_multiplier=quantize_ratio(selected_multiplier),
        default_minimum_multiplier=default_minimum_multiplier,
        default_maximum_multiplier=default_maximum_multiplier,
        references=references,
        legs=leg_results,
        scenarios=tuple(scenarios),
        maximum_exchange_exposure=maximum_exchange_exposure,
        reference_result=min(scenario.total for scenario in scenarios),
    )
