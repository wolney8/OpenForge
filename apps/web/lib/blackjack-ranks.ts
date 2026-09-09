export const BLACKJACK_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type BlackjackCard = (typeof BLACKJACK_RANKS)[number];
export type BlackjackCardValue = BlackjackCard | "";

export const BLACKJACK_RANK_NAMES: Record<BlackjackCard, string> = {
  A: "Ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "Jack",
  Q: "Queen",
  K: "King",
};

export function isBlackjackCard(value: unknown): value is BlackjackCard {
  return typeof value === "string" && BLACKJACK_RANKS.includes(value as BlackjackCard);
}
