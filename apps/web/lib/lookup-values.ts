export type LookupValueType =
  | "bookmaker"
  | "exchange"
  | "group"
  | "platform"
  | "offer_name"
  | "casino_offer_name"
  | "offer_type"
  | "bet_type"
  | "fixture_type"
  | "strategy"
  | "sportsbook_status"
  | "free_bet_status"
  | "casino_status"
  | "account_lifecycle"
  | "account_restriction"
  | "risk_team";

export type LookupValueRecord = {
  lookup_value_id: string;
  profile_id: string;
  lookup_type: LookupValueType;
  option_value: string;
  created_at: string;
  updated_at: string;
  scope?: "fund_manager" | "profile";
};

export function getLookupValuesByType(
  rows: LookupValueRecord[],
  lookupType: LookupValueType
): string[] {
  return rows.filter((row) => row.lookup_type === lookupType).map((row) => row.option_value);
}
