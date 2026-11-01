import { accountMoneyError, normalizeAccountMoney, sumAccountMoney } from "./account-money";
import { aggregateFinancialValues } from "./financial-aggregate";
import { isCommittedExposure } from "./exposure-membership";
import { resolveDateRange, type DatePreset } from "./tracker-summary";

// Synthetic-only source rows. These identities and amounts do not come from normal-owner.
export const labProfiles = [
  { id: "LAB-PROFILE-A", name: "Profile A" },
  { id: "LAB-PROFILE-B", name: "Profile B" },
] as const;
export type LabProfileId = (typeof labProfiles)[number]["id"];
export type LabScope = LabProfileId | "all";
export type LabRange = "Last Month" | "This Year";

export type LabAccount = {
  id: string;
  profileId: LabProfileId;
  name: string;
  type: "Bookie" | "Exchange" | "Bank";
  status: "Active" | "Limited";
  currentBalance: string;
  commission?: string;
};

export const initialLabAccounts: LabAccount[] = [
  { id: "LAB-ACCOUNT-A", profileId: "LAB-PROFILE-A", name: "Bookmaker A", type: "Bookie", status: "Active", currentBalance: "80.00" },
  { id: "LAB-ACCOUNT-B", profileId: "LAB-PROFILE-A", name: "Exchange A", type: "Exchange", status: "Active", currentBalance: "45.00", commission: "2%" },
  { id: "LAB-ACCOUNT-C", profileId: "LAB-PROFILE-A", name: "Bookmaker C", type: "Bookie", status: "Active", currentBalance: "" },
  { id: "LAB-ACCOUNT-D", profileId: "LAB-PROFILE-B", name: "Bank B", type: "Bank", status: "Active", currentBalance: "60.00" },
  { id: "LAB-ACCOUNT-E", profileId: "LAB-PROFILE-B", name: "Bookmaker A", type: "Bookie", status: "Limited", currentBalance: "0.00" },
  { id: "LAB-ACCOUNT-F", profileId: "LAB-PROFILE-B", name: "Exchange B", type: "Exchange", status: "Active", currentBalance: "0.00", commission: "0%" },
];

const labPositions = [
  { profileId: "LAB-PROFILE-A", id: "LAB-POSITION-1", status: "Placed", liability: 15 },
  { profileId: "LAB-PROFILE-A", id: "LAB-POSITION-2", status: "Placed", liability: 10 },
  { profileId: "LAB-PROFILE-A", id: "LAB-PLAN-1", status: "Prospecting", liability: Number.NaN },
  { profileId: "LAB-PROFILE-B", id: "LAB-CLOSED-1", status: "Settled", liability: 9 },
] as const;

const labSettledResults = [
  { profileId: "LAB-PROFILE-A", id: "LAB-SB-001", date: "2026-10-15", finalNetPnl: 18.4 },
  { profileId: "LAB-PROFILE-A", id: "LAB-SB-SEP-A", date: "2026-09-20", finalNetPnl: 24.7 },
  { profileId: "LAB-PROFILE-B", id: "LAB-SB-B", date: "2026-10-08", finalNetPnl: -4 },
  { profileId: "LAB-PROFILE-B", id: "LAB-SB-SEP-B", date: "2026-09-12", finalNetPnl: 16 },
] as const;

export function labAccountBalanceError(value: string): string | null {
  if (!value.trim()) return "Enter a current balance, including 0.00 if zero is confirmed.";
  return accountMoneyError(value) ?? null;
}

export function saveLabAccountBalance(accounts: LabAccount[], id: string, value: string): LabAccount[] {
  const error = labAccountBalanceError(value);
  if (error) throw new Error(error);
  if (!accounts.some((account) => account.id === id)) throw new Error("Synthetic Account not found.");
  return accounts.map((account) => account.id === id
    ? { ...account, currentBalance: normalizeAccountMoney(value) }
    : account);
}

export function summarizeDesignLab(accounts: LabAccount[], scope: LabScope, range: LabRange) {
  const inScope = (profileId: LabProfileId) => scope === "all" || scope === profileId;
  const scopedAccounts = accounts.filter((account) => inScope(account.profileId));
  const cash = sumAccountMoney(scopedAccounts.map((account) => ({
    account_id: account.id,
    account: account.name,
    type: account.type,
    current_balance: account.currentBalance,
    pending_withdrawal_amount: "",
  })), "current_balance");
  const committed = labPositions.filter((position) =>
    inScope(position.profileId) && isCommittedExposure("sportsbook", position));
  const exposure = aggregateFinancialValues(committed.map((position) => position.liability));
  // A fixed synthetic clock makes the example reproducible; the shared range
  // resolver supplies the product's existing inclusive date membership.
  const resolved = resolveDateRange({ preset: range as DatePreset, today: new Date(2026, 10, 1, 12) });
  const realised = aggregateFinancialValues(labSettledResults
    .filter((result) => {
      if (!inScope(result.profileId)) return false;
      const date = new Date(`${result.date}T12:00:00`);
      return date >= resolved.start && date <= resolved.end;
    })
    .map((result) => result.finalNetPnl));
  return {
    cash,
    cashMissingCount: cash.issues.filter((issue) => issue.field === "current_balance").length,
    exposure,
    committedCount: committed.length,
    realised,
    actionableAccounts: scopedAccounts.filter((account) => !account.currentBalance.trim()),
  };
}
