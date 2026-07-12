export type LookupValueType =
  | "bookmaker"
  | "exchange"
  | "group"
  | "platform"
  | "offer_name"
  | "casino_offer_name";

export type LookupValueRecord = {
  lookup_value_id: string;
  profile_id: string;
  lookup_type: LookupValueType;
  option_value: string;
  created_at: string;
  updated_at: string;
};

export function getLookupValuesByType(
  rows: LookupValueRecord[],
  lookupType: LookupValueType
): string[] {
  return rows.filter((row) => row.lookup_type === lookupType).map((row) => row.option_value);
}
