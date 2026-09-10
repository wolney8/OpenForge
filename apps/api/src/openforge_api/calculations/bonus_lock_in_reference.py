from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from openforge_api.calculations.sportsbook_current_value import quantize_money


@dataclass(frozen=True)
class BonusLockInReferenceResult:
    retained_reward: Decimal
    lay_stake: Decimal
    liability: Decimal
    bookmaker_if_back_wins: Decimal
    exchange_if_back_wins: Decimal
    bookmaker_if_back_loses: Decimal
    exchange_if_back_loses: Decimal
    back_wins_total: Decimal
    back_loses_total: Decimal
    matched_result: Decimal


def calculate_bonus_lock_in_reference(
    *,
    back_stake: Decimal,
    back_odds: Decimal,
    lay_odds: Decimal,
    lay_commission: Decimal,
    reward_amount: Decimal,
    retention_percent: Decimal,
) -> BonusLockInReferenceResult:
    """Equalise a retained reward awarded only when the bookmaker back bet loses."""
    retained_reward_raw = reward_amount * (retention_percent / Decimal("100"))
    lay_stake = quantize_money(
        ((back_stake * back_odds) - retained_reward_raw) / (lay_odds - lay_commission)
    )
    liability_raw = lay_stake * (lay_odds - Decimal("1"))
    back_wins_raw = (back_stake * (back_odds - Decimal("1"))) - liability_raw
    lay_return_raw = lay_stake * (Decimal("1") - lay_commission)
    back_loses_raw = -back_stake + lay_return_raw + retained_reward_raw

    back_wins_total = quantize_money(back_wins_raw)
    back_loses_total = quantize_money(back_loses_raw)
    return BonusLockInReferenceResult(
        retained_reward=quantize_money(retained_reward_raw),
        lay_stake=lay_stake,
        liability=quantize_money(liability_raw),
        bookmaker_if_back_wins=quantize_money(back_stake * (back_odds - Decimal("1"))),
        exchange_if_back_wins=quantize_money(-liability_raw),
        bookmaker_if_back_loses=quantize_money(-back_stake),
        exchange_if_back_loses=quantize_money(lay_return_raw),
        back_wins_total=back_wins_total,
        back_loses_total=back_loses_total,
        matched_result=min(back_wins_total, back_loses_total),
    )
