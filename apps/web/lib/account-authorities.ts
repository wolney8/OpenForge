export type AccountAuthorityRecord = {
  account_id: string;
  profile_id: string;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  channel: string;
  access_channels?: string[];
  status: string;
  lifecycle_status?: string;
  restrictions_json?: string;
  restrictions?: string[];
  stake_access?: "Normal" | "Limited" | "Severely Limited" | "Blocked" | "Not Checked";
  promo_access?: "Full" | "Restricted" | "None" | "Not Checked";
  extra_places_access_state?: "not_checked" | "warning" | "planning" | "blocked";
  extra_places_capability_state?: "NotChecked";
  extra_places_access_reason?: string;
  extra_places_allows_planning?: boolean;
  extra_places_allows_operational_use?: boolean;
  catalogue_lifecycle?: string;
  catalogue_eligible_for_new_activity?: boolean;
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

const unavailableNewActivityStatuses = new Set([
  "archived",
  "blocked",
  "closed",
  "gubbed",
  "inactive",
  "not signed up",
  "not using",
  "suspended",
]);

export function accountAllowsNewSportsbookActivity(row: AccountAuthorityRecord): boolean {
  const restrictions = new Set(
    (row.restrictions ?? []).map((value) => value.trim().toLowerCase())
  );
  return (
    !unavailableNewActivityStatuses.has(row.status.trim().toLowerCase()) &&
    !unavailableNewActivityStatuses.has((row.lifecycle_status ?? "").trim().toLowerCase()) &&
    row.stake_access !== "Blocked" &&
    !restrictions.has("kyc blocked") &&
    !restrictions.has("login restricted") &&
    !restrictions.has("risk blocked") &&
    !(row.type === "Bookie" && restrictions.has("casino only")) &&
    row.catalogue_lifecycle === "ACTIVE" &&
    row.catalogue_eligible_for_new_activity === true
  );
}

export function getNewSportsbookActivityAccountNamesByType(
  rows: AccountAuthorityRecord[],
  type: "Bookie" | "Exchange"
): string[] {
  return rows
    .filter((row) => row.type === type && accountAllowsNewSportsbookActivity(row))
    .map((row) => row.account);
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
