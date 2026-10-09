from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any

REWARD_TYPES = {"Cash", "BonusFunds", "SiteCredit", "FreeBetSNR", "FreeBetSR", "Unknown"}
REWARD_CALCULATIONS = {"Fixed", "PercentOfLosingStake", "PercentOfDeposit", "Manual"}
WAGERING_BASES = {"Reward", "Deposit", "DepositPlusReward", "FixedAmount", "Other"}
FUNDING_SOURCES = {"Cash", "RewardBalance", "Mixed", "Unknown"}
REWARD_STATES = {
    "Pending",
    "Not Earned",
    "Awarded",
    "Locked",
    "Wagering",
    "Released",
    "Expired",
    "Forfeited",
}


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def decimal(value: Any, *, default: str = "0") -> Decimal:
    try:
        result = Decimal(str(value if value not in (None, "") else default))
    except InvalidOperation as error:
        raise ValueError(
            "Promotion money and percentage values must be decimal numbers."
        ) from error
    if not result.is_finite() or result < 0:
        raise ValueError("Promotion money and percentage values must be finite and non-negative.")
    return result


def validate_promotion_json(serialized: str) -> str:
    try:
        data = json.loads(serialized)
    except (TypeError, ValueError) as error:
        raise ValueError("Promotion details must be valid JSON.") from error
    if not isinstance(data, dict) or data.get("schema_version") != "sportsbook-promotion-v1":
        raise ValueError("Promotion details require sportsbook-promotion-v1.")
    for key, allowed in (
        ("reward_type", REWARD_TYPES),
        ("reward_calculation", REWARD_CALCULATIONS),
        ("wagering_basis", WAGERING_BASES),
        ("wagering_funding_source", FUNDING_SOURCES),
        ("reward_status", REWARD_STATES),
    ):
        value = data.get(
            key, "Unknown" if key in {"reward_type", "wagering_funding_source"} else ""
        )
        if value and value not in allowed:
            raise ValueError(f"Unsupported {key.replace('_', ' ')}.")
    for key in (
        "refund_percent",
        "reward_cap",
        "reward_face_value",
        "bonus_retention_percent",
        "wagering_multiplier",
        "wagering_base_amount",
        "wagering_target_override",
        "minimum_wagering_odds",
    ):
        if data.get(key) not in (None, ""):
            decimal(data[key])
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def parse(serialized: str | None) -> dict[str, Any] | None:
    if not serialized:
        return None
    return json.loads(validate_promotion_json(serialized))


def reward_face_value(data: dict[str, Any], losing_stake: Decimal) -> Decimal | None:
    explicit = data.get("reward_face_value")
    if explicit not in (None, ""):
        return money(decimal(explicit))
    calculation = data.get("reward_calculation")
    if calculation == "PercentOfLosingStake":
        result = losing_stake * decimal(data.get("refund_percent")) / Decimal("100")
        cap = data.get("reward_cap")
        if cap not in (None, ""):
            result = min(result, decimal(cap))
        return money(result)
    if calculation == "Fixed" and data.get("reward_cap") not in (None, ""):
        return money(decimal(data["reward_cap"]))
    return None


def wagering_target(data: dict[str, Any], face: Decimal | None) -> Decimal | None:
    override = data.get("wagering_target_override")
    if override not in (None, ""):
        return money(decimal(override))
    basis = data.get("wagering_basis")
    if basis == "Reward":
        base = face
    else:
        raw = data.get("wagering_base_amount")
        base = decimal(raw) if raw not in (None, "") else None
    if base is None:
        return None
    return money(base * decimal(data.get("wagering_multiplier"), default="0"))


@dataclass(frozen=True)
class OfferPosition:
    cash_pnl_now: Decimal
    locked_reward_face_value: Decimal
    estimated_convertible_value: Decimal
    projected_final_offer_pnl: Decimal
    wagering_completed: Decimal
    wagering_target: Decimal | None
    wagering_remaining: Decimal | None
    reward_status: str


def calculate_offer_position(
    trigger: dict[str, Any], linked: list[dict[str, Any]]
) -> OfferPosition:
    data = parse(trigger.get("promotion_json")) or {}
    cash = Decimal("0")
    for row in [trigger, *linked]:
        value = row.get("reporting_value")
        if value not in (None, ""):
            cash += Decimal(str(value))
    trigger_cash = trigger.get("scenario_pnl_if_lay_wins")
    if trigger.get("status") not in {
        "Settled",
        "Void",
        "Cancelled",
        "Free Bet Awarded",
    } and trigger_cash not in (None, ""):
        cash = Decimal("0")
    face = reward_face_value(data, decimal(trigger.get("back_stake"))) or Decimal("0")
    status = str(data.get("reward_status") or "Pending")
    locked = face if status in {"Awarded", "Locked", "Wagering"} else Decimal("0")
    retention = decimal(
        data.get("bonus_retention_percent"), default=trigger.get("bonus_retention_rate") or "0"
    )
    estimated = money(locked * retention / Decimal("100"))
    target = wagering_target(data, face)
    completed = Decimal("0")
    min_odds = decimal(data.get("minimum_wagering_odds"), default="0")
    for row in linked:
        if row.get("bet_role") != "Wagering" or row.get("status") not in {
            "Placed",
            "Settled",
            "Free Bet Awarded",
        }:
            continue
        odds = decimal(row.get("back_odds"), default="0")
        if odds < min_odds:
            continue
        explicit = row.get("wagering_contribution")
        completed += decimal(explicit if explicit not in (None, "") else row.get("back_stake"))
    completed = money(completed)
    remaining = None if target is None else money(max(target - completed, Decimal("0")))
    if status in {"Awarded", "Locked", "Wagering"} and target is not None:
        # Completed turnover is evidence of wagering progress, not evidence that
        # the bookmaker has released withdrawable value. Release stays an
        # explicit human-confirmed promotion state.
        status = "Wagering" if completed > 0 else "Locked"
    return OfferPosition(
        money(cash),
        money(locked),
        estimated,
        money(cash + estimated),
        completed,
        target,
        remaining,
        status,
    )
