export type BlackjackRuleRecommendation = {
  action: string;
  fallback_action: string | null;
};

export function blackjackRecommendationsMatch(
  s17: BlackjackRuleRecommendation,
  h17: BlackjackRuleRecommendation,
): boolean {
  return s17.action === h17.action && s17.fallback_action === h17.fallback_action;
}
