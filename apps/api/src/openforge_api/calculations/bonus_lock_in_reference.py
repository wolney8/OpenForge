from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from openforge_api.calculations.sportsbook_current_value import quantize_money

BonusBackingBasis = Literal["normal", "free_bet_snr"]
BonusTrigger = Literal["back_loses", "back_wins"]


@dataclass(frozen=True)
class BonusLockInStrategyResult:
    strategy: Literal["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"]
    lay_stake: Decimal
    liability: Decimal
    bookmaker_if_back_wins: Decimal
    exchange_if_back_wins: Decimal
    bookmaker_if_back_loses: Decimal
    exchange_if_back_loses: Decimal
    promotion_if_back_wins: Decimal
    promotion_if_back_loses: Decimal
    back_wins_total: Decimal
    back_loses_total: Decimal
    matched_result: Decimal


@dataclass(frozen=True)
class BonusLockInReferenceResult:
    retained_reward: Decimal
    standard: BonusLockInStrategyResult
    underlay: BonusLockInStrategyResult | None
    overlay: BonusLockInStrategyResult | None
    selected: BonusLockInStrategyResult

    @property
    def lay_stake(self) -> Decimal:
        return self.selected.lay_stake

    @property
    def liability(self) -> Decimal:
        return self.selected.liability

    @property
    def bookmaker_if_back_wins(self) -> Decimal:
        return self.selected.bookmaker_if_back_wins

    @property
    def exchange_if_back_wins(self) -> Decimal:
        return self.selected.exchange_if_back_wins

    @property
    def bookmaker_if_back_loses(self) -> Decimal:
        return self.selected.bookmaker_if_back_loses

    @property
    def exchange_if_back_loses(self) -> Decimal:
        return self.selected.exchange_if_back_loses

    @property
    def back_wins_total(self) -> Decimal:
        return self.selected.back_wins_total

    @property
    def back_loses_total(self) -> Decimal:
        return self.selected.back_loses_total

    @property
    def matched_result(self) -> Decimal:
        return self.selected.matched_result


def _placed_result(
    *,
    strategy: Literal["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"],
    lay_stake: Decimal,
    back_win_base: Decimal,
    back_lose_base: Decimal,
    lay_odds: Decimal,
    lay_commission: Decimal,
    retained_reward: Decimal,
    trigger: BonusTrigger,
) -> BonusLockInStrategyResult:
    placed_lay = quantize_money(lay_stake)
    if placed_lay <= 0:
        raise ValueError(f"{strategy} does not produce a positive lay stake for these inputs.")
    liability = quantize_money(placed_lay * (lay_odds - Decimal("1")))
    lay_return = quantize_money(placed_lay * (Decimal("1") - lay_commission))
    reward_back = retained_reward if trigger == "back_wins" else Decimal("0")
    reward_lay = retained_reward if trigger == "back_loses" else Decimal("0")
    bookmaker_back = quantize_money(back_win_base)
    bookmaker_lay = quantize_money(back_lose_base)
    promotion_back = quantize_money(reward_back)
    promotion_lay = quantize_money(reward_lay)
    back_total = quantize_money(bookmaker_back - liability + promotion_back)
    lay_total = quantize_money(bookmaker_lay + lay_return + promotion_lay)
    return BonusLockInStrategyResult(
        strategy=strategy,
        lay_stake=placed_lay,
        liability=liability,
        bookmaker_if_back_wins=bookmaker_back,
        exchange_if_back_wins=-liability,
        bookmaker_if_back_loses=bookmaker_lay,
        exchange_if_back_loses=lay_return,
        promotion_if_back_wins=promotion_back,
        promotion_if_back_loses=promotion_lay,
        back_wins_total=back_total,
        back_loses_total=lay_total,
        matched_result=min(back_total, lay_total),
    )


def calculate_bonus_lock_in_reference(
    *,
    back_stake: Decimal,
    back_odds: Decimal,
    lay_odds: Decimal,
    lay_commission: Decimal,
    reward_amount: Decimal,
    retention_percent: Decimal,
    backing_basis: BonusBackingBasis = "normal",
    trigger: BonusTrigger = "back_loses",
    strategy: Literal["Standard", "Underlay", "Overlay", "Custom", "Partial Lay"] = "Standard",
    manual_lay_stake: Decimal | None = None,
) -> BonusLockInReferenceResult:
    """Build all governed offer-aware references, then select one placed strategy."""
    if back_stake <= 0 or back_odds <= 1 or lay_odds <= 1:
        raise ValueError("Stake and decimal odds must be positive and odds must exceed 1.00.")
    if not Decimal("0") <= lay_commission < Decimal("1"):
        raise ValueError("Lay commission must be from 0 up to but not including 1.")
    if reward_amount < 0 or not Decimal("0") <= retention_percent <= Decimal("100"):
        raise ValueError("Reward and retention inputs are outside their governed range.")

    retained_reward_raw = reward_amount * (retention_percent / Decimal("100"))
    retained_reward = quantize_money(retained_reward_raw)
    back_win_base = back_stake * (back_odds - Decimal("1"))
    back_lose_base = -back_stake if backing_basis == "normal" else Decimal("0")
    reward_back = retained_reward_raw if trigger == "back_wins" else Decimal("0")
    reward_lay = retained_reward_raw if trigger == "back_loses" else Decimal("0")
    standard_stake = (back_win_base - back_lose_base + reward_back - reward_lay) / (
        lay_odds - lay_commission
    )
    standard = _placed_result(
        strategy="Standard",
        lay_stake=standard_stake,
        back_win_base=back_win_base,
        back_lose_base=back_lose_base,
        lay_odds=lay_odds,
        lay_commission=lay_commission,
        retained_reward=retained_reward_raw,
        trigger=trigger,
    )

    underlay: BonusLockInStrategyResult | None = None
    overlay: BonusLockInStrategyResult | None = None
    if backing_basis == "normal":
        lay_branch_zero = -(back_lose_base + reward_lay) / (Decimal("1") - lay_commission)
        back_branch_zero = (back_win_base + reward_back) / (lay_odds - Decimal("1"))
        endpoints = (lay_branch_zero, back_branch_zero)
    elif trigger == "back_loses":
        # Outplayed's SNR losing-trigger range preserves the free-bet face value on
        # the lay-winning branch at one end and reaches zero on the back-winning
        # branch at the other. Commission is solved exactly rather than using the
        # public bundle's first-order `(1 + c)` approximation.
        lay_branch_face_value = (back_stake - reward_lay) / (Decimal("1") - lay_commission)
        back_branch_zero = back_win_base / (lay_odds - Decimal("1"))
        endpoints = (lay_branch_face_value, back_branch_zero)
    else:
        # For an SNR winning-trigger offer the public range targets the free-bet
        # face value on each branch in turn.
        back_branch_face_value = (back_win_base + reward_back - back_stake) / (
            lay_odds - Decimal("1")
        )
        lay_branch_face_value = back_stake / (Decimal("1") - lay_commission)
        endpoints = (back_branch_face_value, lay_branch_face_value)

    positive_endpoints = sorted(endpoint for endpoint in endpoints if endpoint > 0)
    if positive_endpoints:
        underlay = _placed_result(
            strategy="Underlay",
            lay_stake=positive_endpoints[0],
            back_win_base=back_win_base,
            back_lose_base=back_lose_base,
            lay_odds=lay_odds,
            lay_commission=lay_commission,
            retained_reward=retained_reward_raw,
            trigger=trigger,
        )
    if len(positive_endpoints) > 1:
        overlay = _placed_result(
            strategy="Overlay",
            lay_stake=positive_endpoints[-1],
            back_win_base=back_win_base,
            back_lose_base=back_lose_base,
            lay_odds=lay_odds,
            lay_commission=lay_commission,
            retained_reward=retained_reward_raw,
            trigger=trigger,
        )

    if strategy == "Standard":
        selected = standard
    elif strategy == "Underlay":
        if underlay is None:
            raise ValueError("Underlay is not supported for this backing-bet basis or input set.")
        selected = underlay
    elif strategy == "Overlay":
        if overlay is None:
            raise ValueError("Overlay is not supported for this backing-bet basis or input set.")
        selected = overlay
    else:
        if manual_lay_stake is None:
            selected = standard
        else:
            selected = _placed_result(
                strategy=strategy,
                lay_stake=manual_lay_stake,
                back_win_base=back_win_base,
                back_lose_base=back_lose_base,
                lay_odds=lay_odds,
                lay_commission=lay_commission,
                retained_reward=retained_reward_raw,
                trigger=trigger,
            )
    return BonusLockInReferenceResult(retained_reward, standard, underlay, overlay, selected)
