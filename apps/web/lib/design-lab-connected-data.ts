import type { LabProfileId } from "./design-lab-fixture";

// Synthetic, display-only rows. Column labels follow the current ledger shells;
// missing sample values are explicit and never interpreted as financial zero.
export const labLedgerColumns = {
  accounts: ["Account ID", "Account", "Type", "Status", "Counts in cash", "Current balance", "Pending withdrawal", "Last balance update", "Channel", "Group", "Platform", "Actions"],
  sportsbook: ["Settles", "Bookmaker", "Event", "Campaign Tag", "Offer Details", "Strategy", "Lay Bet", "Back Bet", "Value", "Status", "Actions"],
  freeBets: ["Settles", "Expiry", "Bookmaker", "Campaign Tag", "Event", "Offer details", "Strategy", "Lay Bet", "Back Bet", "Value", "Status", "Actions"],
  casino: ["Settles", "Expiry", "Bookmaker", "Offer Name", "Game", "Offer type", "Status", "Result", "Value", "Actions"],
  extraPlace: ["Date", "Runner / race", "Bookmaker", "E/W stake", "Back odds", "Terms", "Place odds", "Win lay odds", "Win lay stake", "Win liability", "Place lay odds", "Place lay stake", "Place liability", "Rating", "Implied odds", "Qualifying loss", "Extra Place potential", "Actions"],
  cash: ["Adjustment ID", "Date", "Direction", "Type", "Amount", "Signed amount", "Investment", "Cash snapshot", "Linked account", "Description", "Week label", "Calc state", "Actions"],
} as const;

export type LabLedgerKey = keyof typeof labLedgerColumns;
export type LabRecord = { id: string; profileId: LabProfileId; section: LabLedgerKey; title: string; subtitle: string; status: string; cells: readonly string[]; relatedId?: string; previewOnly?: boolean; dueDate?: string; expiresAt?: string };

export const labRecords: LabRecord[] = [
  { id: "LAB-SB-001", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Demo FC v Sample United", subtitle: "Bookmaker A · qualifying", status: "Settled", cells: ["15 Oct 2026", "Bookmaker A", "Demo FC v Sample United", "Demo Offer", "Qualifying bet", "Standard", "Settled", "Settled", "£ 18.40", "Settled", "Open"], relatedId: "LAB-FB-001" },
  { id: "LAB-SB-002", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Example City v Sample Town", subtitle: "Bookmaker A · open", status: "Placed", dueDate: "2026-11-05", cells: ["5 Nov 2026", "Bookmaker A", "Example City v Sample Town", "—", "Standard bet", "Standard", "Placed", "Placed", "Current £—", "Placed", "Open"] },
  { id: "LAB-SB-OVERDUE", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Demo Rovers v Sample Albion", subtitle: "Bookmaker A · settlement review", status: "Placed", dueDate: "2026-10-30", cells: ["30 Oct 2026", "Bookmaker A", "Demo Rovers v Sample Albion", "—", "Synthetic placed bet", "Standard", "Placed", "Placed", "Current · unavailable", "Placed", "Open"], previewOnly: true },
  { id: "LAB-SB-PARTIAL", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Sample Athletic v Demo City", subtitle: "Bookmaker B · partial lay follow-up", status: "Placed", dueDate: "2026-11-02", cells: ["2 Nov 2026", "Bookmaker B", "Sample Athletic v Demo City", "—", "Synthetic partial hedge", "Standard", "Partially matched", "Placed", "Current · unavailable", "Placed", "Open"], previewOnly: true },
  { id: "LAB-SB-SEP-A", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Sample Rangers v Demo County", subtitle: "Bookmaker A · settled", status: "Settled", cells: ["20 Sep 2026", "Bookmaker A", "Sample Rangers v Demo County", "—", "Standard bet", "Standard", "Settled", "Settled", "£ 24.70", "Settled", "Open"], previewOnly: true },
  { id: "LAB-FB-001", profileId: "LAB-PROFILE-A", section: "freeBets", title: "Demo Offer reward", subtitle: "Linked to LAB-SB-001", status: "Available", cells: ["—", "10 Nov 2026", "Bookmaker A", "Demo Offer", "—", "Linked award", "SNR", "Not placed", "Not placed", "Current £—", "Available", "Open"], relatedId: "LAB-SB-001", previewOnly: true },
  { id: "LAB-FB-EXPIRING", profileId: "LAB-PROFILE-B", section: "freeBets", title: "Sample Free Bet reward", subtitle: "Bookmaker B · expiry review", status: "Available", expiresAt: "2026-11-02", cells: ["—", "2 Nov 2026", "Bookmaker B", "Sample reward", "—", "Synthetic award", "SNR", "Not placed", "Not placed", "Current · unavailable", "Available", "Open"], previewOnly: true },
  { id: "LAB-CO-001", profileId: "LAB-PROFILE-A", section: "casino", title: "Demo Casino Offer", subtitle: "Bookmaker C · wagering", status: "Wagering", cells: ["—", "15 Nov 2026", "Bookmaker C", "Demo Casino Offer", "Demo Game", "Wager to earn", "Wagering", "Pending", "Unavailable", "Open"], previewOnly: true },
  { id: "LAB-EP-001", profileId: "LAB-PROFILE-A", section: "extraPlace", title: "Demo Runner · Sample Race", subtitle: "Extra Place · planning", status: "Prospecting", cells: ["7 Nov 2026", "Demo Runner / Sample Race", "Bookmaker A", "£5.00", "—", "1/5", "—", "—", "—", "—", "—", "—", "—", "—", "—", "Unavailable", "Unavailable", "Open"], previewOnly: true },
  { id: "LAB-CA-001", profileId: "LAB-PROFILE-A", section: "cash", title: "Demo cash adjustment", subtitle: "Bank B · synthetic", status: "Recorded", cells: ["LAB-CA-001", "12 Oct 2026", "In", "Capital movement", "£20.00", "£20.00", "No", "Yes", "Bank B", "Synthetic example", "W/C 12/10/2026", "Resolved", "Open"], previewOnly: true },
  { id: "LAB-SB-B", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Profile B example", subtitle: "Exchange B · synthetic", status: "Settled", cells: ["8 Oct 2026", "Bookmaker B", "Profile B example", "—", "Standard", "Standard", "Settled", "Settled", "£ (4.00)", "Settled", "Open"], previewOnly: true },
  { id: "LAB-SB-SEP-B", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Profile B September example", subtitle: "Bookmaker B · settled", status: "Settled", cells: ["12 Sep 2026", "Bookmaker B", "Profile B September example", "—", "Standard bet", "Standard", "Settled", "Settled", "£ 16.00", "Settled", "Open"], previewOnly: true },
];

// Exact CALC-001 inputs/outputs from tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json.
// This is a fixed validated demonstration, not a new calculator implementation.
export const labQualifyingFixture = {
  backStake: "10.00", backOdds: "4.00", layOdds: "4.20", commission: "0.02",
  layStake: "9.57", liability: "30.62", backWins: "-0.62", layWins: "-0.62", matchedResult: "-0.62",
} as const;

export const labReportPoints = [
  { id: "LAB-SB-001", profileId: "LAB-PROFILE-A", date: "15 Oct", month: "Oct", value: 18.4 },
  { id: "LAB-SB-SEP-A", profileId: "LAB-PROFILE-A", date: "20 Sep", month: "Sep", value: 24.7 },
  { id: "LAB-SB-B", profileId: "LAB-PROFILE-B", date: "8 Oct", month: "Oct", value: -4 },
  { id: "LAB-SB-SEP-B", profileId: "LAB-PROFILE-B", date: "12 Sep", month: "Sep", value: 16 },
] as const;
