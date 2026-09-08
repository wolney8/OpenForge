from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Action = Literal["Hit", "Stand", "Double", "Split", "Surrender", "Bust"]
Card = Literal["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

# Published Outplayed 4-8 deck table. Columns are dealer 2..10,A.
H = "H"
S = "S"
P = "P"
DH = "DH"  # Double if allowed, otherwise hit.
DS = "DS"  # Double if allowed, otherwise stand.
PH = "PH"  # Split if double-after-split is allowed, otherwise hit.
RH = "RH"  # Surrender when enabled, otherwise hit.

HARD: dict[int, tuple[str, ...]] = {
    **{total: (H,) * 10 for total in range(4, 9)},
    9: (H, DH, DH, DH, DH, H, H, H, H, H),
    10: (DH, DH, DH, DH, DH, DH, DH, DH, H, H),
    11: (DH, DH, DH, DH, DH, DH, DH, DH, DH, H),
    12: (H, H, S, S, S, H, H, H, H, H),
    13: (S, S, S, S, S, H, H, H, H, H),
    14: (S, S, S, S, S, H, H, H, H, H),
    15: (S, S, S, S, S, H, H, H, RH, H),
    16: (S, S, S, S, S, H, H, RH, RH, RH),
    **{total: (S,) * 10 for total in range(17, 22)},
}
SOFT: dict[int, tuple[str, ...]] = {
    13: (H, H, H, DH, DH, H, H, H, H, H),
    14: (H, H, H, DH, DH, H, H, H, H, H),
    15: (H, H, DH, DH, DH, H, H, H, H, H),
    16: (H, H, DH, DH, DH, H, H, H, H, H),
    17: (H, DH, DH, DH, DH, H, H, H, H, H),
    18: (S, DS, DS, DS, DS, S, S, H, H, H),
    19: (S,) * 10,
    20: (S,) * 10,
    21: (S,) * 10,
}
PAIRS: dict[int, tuple[str, ...]] = {
    2: (PH, PH, P, P, P, P, H, H, H, H),
    3: (PH, PH, P, P, P, P, H, H, H, H),
    4: (H, H, H, PH, PH, H, H, H, H, H),
    6: (PH, P, P, P, P, H, H, H, H, H),
    7: (P, P, P, P, P, P, H, H, H, H),
    8: (P, P, P, P, P, P, P, P, P, P),
    9: (P, P, P, P, P, S, P, P, S, S),
    11: (P,) * 10,
}
DEALER_INDEX = {
    "2": 0,
    "3": 1,
    "4": 2,
    "5": 3,
    "6": 4,
    "7": 5,
    "8": 6,
    "9": 7,
    "10": 8,
    "J": 8,
    "Q": 8,
    "K": 8,
    "A": 9,
}
CARD_VALUE = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    "J": 10,
    "Q": 10,
    "K": 10,
    "A": 11,
}


@dataclass(frozen=True)
class BlackjackStrategyResult:
    total: int
    hand_kind: Literal["hard", "soft", "pair", "bust"]
    action: Action
    fallback_action: Action | None


def calculate_blackjack_strategy(
    *,
    dealer_card: Card,
    player_cards: list[Card],
    surrender_allowed: bool,
    dealer_hits_soft_17: bool,
    double_allowed: bool = True,
    double_after_split_allowed: bool = True,
) -> BlackjackStrategyResult:
    if len(player_cards) < 2:
        raise ValueError("At least two player cards are required.")
    values = [CARD_VALUE[card] for card in player_cards]
    total = sum(values)
    aces_high = values.count(11)
    while total > 21 and aces_high:
        total -= 10
        aces_high -= 1
    if total > 21:
        return BlackjackStrategyResult(total, "bust", "Bust", None)

    initial = len(player_cards) == 2
    dealer_index = DEALER_INDEX[dealer_card]
    pair_value = values[0] if initial and values[0] == values[1] else None
    if pair_value in PAIRS and total not in {10, 20}:
        code = PAIRS[pair_value][dealer_index]
        hand_kind: Literal["hard", "soft", "pair", "bust"] = "pair"
    else:
        is_soft = aces_high > 0
        code = (SOFT if is_soft else HARD).get(total, (S,) * 10)[dealer_index]
        hand_kind = "soft" if is_soft else "hard"

    # The live source has H17 overrides for hard 11/15/17, soft 18/19 and pair 8 vs Ace.
    if dealer_hits_soft_17:
        if dealer_card == "A" and total == 11 and hand_kind == "hard":
            code = DH
        elif dealer_card == "A" and total == 15 and hand_kind == "hard":
            code = RH
        elif dealer_card == "A" and total == 17 and hand_kind == "hard":
            code = RH
        elif total == 18 and hand_kind == "soft" and dealer_card == "2":
            code = DS
        elif total == 19 and hand_kind == "soft" and dealer_card == "6":
            code = DS
        elif dealer_card == "A" and pair_value == 8:
            code = RH

    if code == RH:
        can_surrender = initial and surrender_allowed
        return BlackjackStrategyResult(
            total,
            hand_kind,
            "Surrender" if can_surrender else "Hit",
            "Hit" if can_surrender else None,
        )
    if code == DH:
        return BlackjackStrategyResult(
            total,
            hand_kind,
            "Double" if initial and double_allowed else "Hit",
            "Hit" if initial and double_allowed else None,
        )
    if code == DS:
        return BlackjackStrategyResult(
            total,
            hand_kind,
            "Double" if initial and double_allowed else "Stand",
            "Stand" if initial and double_allowed else None,
        )
    if code == PH:
        action: Action = "Split" if double_after_split_allowed else "Hit"
        return BlackjackStrategyResult(
            total, hand_kind, action, "Hit" if action == "Split" else None
        )
    action_map: dict[str, Action] = {H: "Hit", S: "Stand", P: "Split"}
    return BlackjackStrategyResult(total, hand_kind, action_map[code], None)
