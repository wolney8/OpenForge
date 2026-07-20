export type AccountAuthorityRecord = {
  account_id: string;
  profile_id: string;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  channel: string;
  status: string;
  lifecycle_status?: string;
  restrictions_json?: string;
  current_balance: string;
  pending_withdrawal_amount: string;
  last_balance_update: string;
  group_name: string;
  platform: string;
  created_at: string;
  updated_at: string;
};

export function getAccountNamesByType(
  rows: AccountAuthorityRecord[],
  type: "Bookie" | "Exchange" | "Bank"
): string[] {
  return rows.filter((row) => row.type === type).map((row) => row.account);
}

export function getAllAccountNames(rows: AccountAuthorityRecord[]): string[] {
  return rows.map((row) => row.account);
}

export function getDistinctGroups(rows: AccountAuthorityRecord[]): string[] {
  return rows.map((row) => row.group_name).filter(Boolean);
}

export function getDistinctPlatforms(rows: AccountAuthorityRecord[]): string[] {
  return rows.map((row) => row.platform).filter(Boolean);
}
