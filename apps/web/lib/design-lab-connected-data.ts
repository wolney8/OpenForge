import type { LabProfileId } from "./design-lab-fixture";

// Synthetic, display-only rows. Column labels follow the current ledger shells;
// missing sample values are explicit and never interpreted as financial zero.
export const labLedgerColumns = {
  accounts: ["Account ID", "Account", "Type", "Status", "Counts in cash", "Current balance", "Pending withdrawal", "Last balance update", "Channel", "Group", "Platform", "Actions"],
  sportsbook: ["Settles", "Bookmaker", "Event", "Campaign Tag", "Offer Details", "Strategy", "Lay Bet", "Back Bet", "Value", "Status", "Actions"],
  freeBets: ["Settles", "Expiry", "Bookmaker", "Campaign Tag", "Event", "Offer details", "Strategy", "Lay Bet", "Back Bet", "Value", "Status", "Actions"],
  casino: ["Settles", "Expiry", "Bookmaker", "Offer Name", "Game", "Offer type", "Status", "Result", "Value", "Actions"],
  extraPlace: ["Date / time", "Runner / Race", "Bookmaker", "E/W Stake", "Back Odds", "E/W Terms", "Place Odds", "Win Lay Odds", "Win Lay Stake", "Win Lay Liab", "Place Lay Odds", "Place Lay Stake", "Place Lay Liab", "Rating %", "Implied Odds", "Qual Loss", "EP Profit", "Actions"],
  cash: ["Adjustment ID", "Date", "Direction", "Type", "Amount", "Signed amount", "Investment", "Cash snapshot", "Linked account", "Description", "Week label", "Calc state", "Actions"],
} as const;

export type LabLedgerKey = keyof typeof labLedgerColumns;
// Stable IDs and order are transcribed from the six normal ledger table declarations.
// Extra Place follows its signed-off no-duplicate-Status contract; the normal table
// currently renders Status and is separately recorded as a contract conflict.
export const labLedgerColumnIds: Record<LabLedgerKey, readonly string[]> = {
  accounts: ["account_id","account","type","status","counts_in_cash_total","current_balance","pending_withdrawal_amount","last_balance_update","channel","group_name","platform","actions"],
  sportsbook: ["date_settled","bookmaker","event_name","offer_name","offer_details","match_strategy","lay_status","back_bet_status","displayed_value","status","actions"],
  freeBets: ["date_settled","expiry_datetime","bookmaker","offer_name","event_name","offer_details","match_strategy","lay_status","back_bet_status","displayed_value","status","actions"],
  casino: ["date_settling","expiry_datetime","bookmaker","offer_name","game","offer_type","status","result","displayed_value","actions"],
  extraPlace: ["date","runner","bookmaker","stake","backOdds","terms","placeOdds","winLayOdds","winLayStake","winLiability","placeLayOdds","placeLayStake","placeLiability","rating","impliedOdds","qualLoss","epProfit","actions"],
  cash: ["cash_adjustment_id","adjustment_date","direction","adjustment_type","amount","signed_amount","affects_investment","affects_cash_snapshot","linked_account","description","week_label","calculation_state","actions"],
};
export type LabColumnKind = "date" | "money" | "odds" | "status" | "result" | "account" | "text" | "boolean" | "actions";
export type LabEditAuthority = "descriptive" | "planning-date" | "planning-account" | "planning-choice" | "financial-input" | "balance-observation" | "governed" | "derived" | "immutable" | "actions";
export type LabColumnSpec = {
  id: string; label: string; position: number; defaultVisible: boolean; required: boolean;
  kind: LabColumnKind; sortable: boolean; filterable: boolean; edit: LabEditAuthority;
  source: string; relatedFields: readonly string[]; responsive: "table-and-labelled-detail";
};
const financial = /balance|amount|stake|liability|loss|profit|value|rating|potential|withdrawal/i;
const odds = /odds/i;
const date = /date|settles|expiry|update/i;
const status = /status|state/i;
const account = /bookmaker|exchange|linked_account|^account$/i;
const result = /result/i;
const boolean = /counts_in_cash|investment|cash_snapshot/i;
// Explicit domain-field authority. This is a lab interaction policy, not a financial
// calculation contract. Lifecycle determines the review path after a field is selected.
const editAuthority: Record<LabLedgerKey, Record<string, LabEditAuthority>> = {
  accounts: {account_id:"immutable",account:"balance-observation",type:"immutable",status:"governed",counts_in_cash_total:"governed",current_balance:"balance-observation",pending_withdrawal_amount:"derived",last_balance_update:"derived",channel:"descriptive",group_name:"descriptive",platform:"descriptive",actions:"actions"},
  sportsbook: {date_settled:"planning-date",bookmaker:"planning-account",event_name:"descriptive",offer_name:"descriptive",offer_details:"descriptive",match_strategy:"financial-input",lay_status:"financial-input",back_bet_status:"financial-input",displayed_value:"derived",status:"planning-choice",actions:"actions"},
  freeBets: {date_settled:"governed",expiry_datetime:"planning-date",bookmaker:"planning-account",offer_name:"descriptive",event_name:"descriptive",offer_details:"descriptive",match_strategy:"financial-input",lay_status:"financial-input",back_bet_status:"financial-input",displayed_value:"derived",status:"governed",actions:"actions"},
  casino: {date_settling:"governed",expiry_datetime:"planning-date",bookmaker:"planning-account",offer_name:"descriptive",game:"descriptive",offer_type:"planning-choice",status:"governed",result:"governed",displayed_value:"derived",actions:"actions"},
  extraPlace: {date:"planning-date",runner:"descriptive",bookmaker:"planning-account",stake:"financial-input",backOdds:"financial-input",terms:"financial-input",placeOdds:"derived",winLayOdds:"financial-input",winLayStake:"financial-input",winLiability:"derived",placeLayOdds:"financial-input",placeLayStake:"financial-input",placeLiability:"derived",rating:"derived",impliedOdds:"derived",qualLoss:"derived",epProfit:"derived",actions:"actions"},
  cash: {cash_adjustment_id:"immutable",adjustment_date:"planning-date",direction:"financial-input",adjustment_type:"financial-input",amount:"financial-input",signed_amount:"derived",affects_investment:"governed",affects_cash_snapshot:"governed",linked_account:"planning-account",description:"descriptive",week_label:"derived",calculation_state:"derived",actions:"actions"},
};
const sourceShell: Record<LabLedgerKey, string> = {
  accounts: "accounts-workflow-shell.tsx", sportsbook: "sportsbook-workflow-first-shell.tsx",
  freeBets: "free-bet-workflow-shell.tsx", casino: "casino-offer-workflow-shell.tsx",
  extraPlace: "each-way-extra-place-workflow-shell.tsx + signed-off no-Status contract",
  cash: "cash-adjustment-workflow-shell.tsx",
};
const optionalColumns: Record<LabLedgerKey, readonly string[]> = {
  accounts: ["account_id","type","status","counts_in_cash_total","last_balance_update","channel","group_name","platform"],
  sportsbook: ["date_settled","bookmaker","event_name","offer_name","offer_details","match_strategy"],
  freeBets: ["date_settled","expiry_datetime","bookmaker","offer_name","event_name","offer_details","match_strategy"],
  casino: ["date_settling","expiry_datetime","bookmaker","offer_name","game","offer_type"],
  extraPlace: ["backOdds","terms","placeOdds","winLayOdds","winLayStake","winLiability","placeLayOdds","placeLayStake","placeLiability","rating","impliedOdds"],
  cash: ["cash_adjustment_id","adjustment_date","direction","adjustment_type","affects_investment","affects_cash_snapshot","linked_account","description","week_label","calculation_state"],
};
const filterColumns: Record<LabLedgerKey, readonly string[]> = {
  accounts: ["account","type","status","counts_in_cash_total","current_balance"],
  sportsbook: ["bookmaker","match_strategy","lay_status","back_bet_status","status","date_settled","displayed_value"],
  freeBets: ["bookmaker","match_strategy","lay_status","status","expiry_datetime","displayed_value"],
  casino: ["bookmaker","offer_type","status","result","expiry_datetime","displayed_value"],
  extraPlace: ["bookmaker","terms","date","qualLoss","epProfit"],
  cash: ["direction","adjustment_type","linked_account","calculation_state","adjustment_date","amount"],
};
const relatedFinancialFields: Record<string, readonly string[]> = {
  lay_status: ["exchange","lay_odds","requested_lay_stake","matched_lay_stake","commission","lay_status"],
  back_bet_status: ["back_stake","back_odds","back_bet_status"],
  displayed_value: ["projected_current_pnl","final_net_pnl","reporting_value"],
  signed_amount: ["direction","amount"], current_balance: ["observed_balance","observation_timestamp"],
  winLiability: ["winLayOdds","winLayStake"], placeLiability: ["placeLayOdds","placeLayStake"],
  qualLoss: ["backOdds","stake","terms","winLayOdds","placeLayOdds","winLayStake","placeLayStake"],
  epProfit: ["bookmaker_places","exchange_places","winLayStake","placeLayStake","backOdds","stake"],
};
export function labLedgerColumnSpecs(key: LabLedgerKey): LabColumnSpec[] {
  return labLedgerColumnIds[key].map((id, position) => {
    const label = labLedgerColumns[key][position];
    const kind: LabColumnKind = id === "actions" ? "actions" : odds.test(id) ? "odds" : date.test(id) ? "date" : status.test(id) ? "status" : result.test(id) ? "result" : account.test(id) ? "account" : boolean.test(id) ? "boolean" : financial.test(id) ? "money" : "text";
    const edit = editAuthority[key][id];
    return {
      id, label, position, defaultVisible: true,
      required: !optionalColumns[key].includes(id),
      kind, sortable: id !== "actions", filterable: filterColumns[key].includes(id),
      edit, source: sourceShell[key], relatedFields: relatedFinancialFields[id] ?? [id],
      responsive: "table-and-labelled-detail" as const,
    };
  });
}
export type LabRecord = { id: string; profileId: LabProfileId; section: LabLedgerKey; title: string; subtitle: string; status: string; cells: readonly string[]; sourceInputs?:Record<string,string>; relatedId?: string; previewOnly?: boolean; dueDate?: string; expiresAt?: string };

export const labRecords: LabRecord[] = [
  { id: "LAB-SB-001", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Demo FC v Sample United", subtitle: "Bookmaker A · qualifying", status: "Settled", cells: ["15 Oct 2026", "Bookmaker A", "Demo FC v Sample United", "Demo Offer", "Qualifying bet", "Standard", "Settled", "Settled", "£ 18.40", "Settled", "Open"], relatedId: "LAB-FB-001" },
  { id: "LAB-SB-002", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Example City v Sample Town", subtitle: "Bookmaker A · open", status: "Placed", dueDate: "2026-11-05", cells: ["5 Nov 2026", "Bookmaker A", "Example City v Sample Town", "—", "Standard bet", "Standard", "Placed", "Placed", "Current £—", "Placed", "Open"] },
  { id: "LAB-SB-PROSPECT-B", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Sample reload · selection pending", subtitle: "Bookmaker B · planning", status: "Prospecting", cells: ["Not entered", "Bookmaker B", "Selection pending", "Sample reload", "Synthetic offer text", "Standard", "Not confirmed", "Not confirmed", "Planning · unavailable", "Prospecting", "Open"], previewOnly: true },
  { id: "LAB-SB-OVERDUE", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Demo Rovers v Sample Albion", subtitle: "Bookmaker A · settlement review", status: "Placed", dueDate: "2026-10-30", cells: ["30 Oct 2026", "Bookmaker A", "Demo Rovers v Sample Albion", "—", "Synthetic placed bet", "Standard", "Placed", "Placed", "Current · unavailable", "Placed", "Open"], previewOnly: true },
  { id: "LAB-SB-PARTIAL", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Sample Athletic v Demo City", subtitle: "Bookmaker B · partial lay follow-up", status: "Placed", dueDate: "2026-11-02", cells: ["2 Nov 2026", "Bookmaker B", "Sample Athletic v Demo City", "—", "Synthetic partial hedge", "Standard", "Partially matched", "Placed", "Current · unavailable", "Placed", "Open"], previewOnly: true },
  { id: "LAB-SB-SEP-A", profileId: "LAB-PROFILE-A", section: "sportsbook", title: "Sample Rangers v Demo County", subtitle: "Bookmaker A · settled", status: "Settled", cells: ["20 Sep 2026", "Bookmaker A", "Sample Rangers v Demo County", "—", "Standard bet", "Standard", "Settled", "Settled", "£ 24.70", "Settled", "Open"], previewOnly: true },
  { id: "LAB-FB-001", profileId: "LAB-PROFILE-A", section: "freeBets", title: "Demo Offer reward", subtitle: "Linked to LAB-SB-001", status: "Available", cells: ["—", "10 Nov 2026", "Bookmaker A", "Demo Offer", "—", "Linked award", "SNR", "Not placed", "Not placed", "Current £—", "Available", "Open"], relatedId: "LAB-SB-001", previewOnly: true },
  { id: "LAB-FB-EXPIRING", profileId: "LAB-PROFILE-B", section: "freeBets", title: "Sample Free Bet reward", subtitle: "Bookmaker B · expiry review", status: "Available", expiresAt: "2026-11-02", cells: ["—", "2 Nov 2026", "Bookmaker B", "Sample reward", "—", "Synthetic award", "SNR", "Not placed", "Not placed", "Current · unavailable", "Available", "Open"], previewOnly: true },
  { id: "LAB-CO-001", profileId: "LAB-PROFILE-A", section: "casino", title: "Demo Casino Offer", subtitle: "Bookmaker C · wagering", status: "Wagering", cells: ["—", "15 Nov 2026", "Bookmaker C", "Demo Casino Offer", "Demo Game", "Wager to earn", "Wagering", "Pending", "Unavailable", "Open"], previewOnly: true },
  { id: "LAB-CO-002", profileId: "LAB-PROFILE-B", section: "casino", title: "Sample Free Spins Check", subtitle: "Bookmaker A · planning", status: "Prospecting", cells: ["—", "8 Nov 2026", "Bookmaker A", "Sample Free Spins", "—", "Free Spins", "Prospecting", "Pending", "Unavailable", "Open"], previewOnly: true },
  { id: "LAB-EP-001", profileId: "LAB-PROFILE-A", section: "extraPlace", title: "Demo Runner · Sample Race", subtitle: "Extra Place · planning", status: "Prospecting", cells: ["7 Nov 2026", "Demo Runner / Sample Race", "Bookmaker A", "£5.00", "—", "1/5", "—", "—", "—", "—", "—", "—", "—", "—", "—", "Unavailable", "Unavailable", "Open"], previewOnly: true },
  { id: "LAB-EP-002", profileId: "LAB-PROFILE-B", section: "extraPlace", title: "Sample Runner · Demo Cup", subtitle: "Extra Place · incomplete draft", status: "Prospecting", cells: ["8 Nov 2026", "Sample Runner / Demo Cup", "Bookmaker A", "—", "—", "1/5", "—", "—", "—", "—", "—", "—", "—", "—", "—", "Unavailable", "Unavailable", "Open"], previewOnly: true },
  { id: "LAB-CA-001", profileId: "LAB-PROFILE-A", section: "cash", title: "Demo cash adjustment", subtitle: "Bank B · synthetic", status: "Recorded", cells: ["LAB-CA-001", "12 Oct 2026", "In", "Capital movement", "£20.00", "£20.00", "No", "Yes", "Bank B", "Synthetic example", "W/C 12/10/2026", "Resolved", "Open"], previewOnly: true },
  // Signed amount and week label below are the validated outgoing_withdrawal fixture
  // from tests/fixtures/cash-adjustment-fixtures.json; unknown flags remain explicit.
  { id: "LAB-CA-002", profileId: "LAB-PROFILE-B", section: "cash", title: "Sample withdrawal", subtitle: "Bank B · fixture-backed", status: "Recorded", cells: ["LAB-CA-002", "16 Jul 2026", "Out", "Withdrawal", "£50.00", "£ (50.00)", "—", "—", "Bank B", "Synthetic withdrawal", "W/C 13/07/2026", "Resolved", "Open"], previewOnly: true },
  { id: "LAB-SB-B", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Profile B example", subtitle: "Exchange B · synthetic", status: "Settled", cells: ["8 Oct 2026", "Bookmaker B", "Profile B example", "—", "Standard", "Standard", "Settled", "Settled", "£ (4.00)", "Settled", "Open"], previewOnly: true },
  { id: "LAB-SB-SEP-B", profileId: "LAB-PROFILE-B", section: "sportsbook", title: "Profile B September example", subtitle: "Bookmaker B · settled", status: "Settled", cells: ["12 Sep 2026", "Bookmaker B", "Profile B September example", "—", "Standard bet", "Standard", "Settled", "Settled", "£ 16.00", "Settled", "Open"], previewOnly: true },
];

// Typed synthetic source inputs for editing. Display strings and calculated cells
// are never reverse-parsed into authoritative financial inputs.
export const labRecordInputs: Record<string, Record<string, string>> = {
  "LAB-SB-001": {event_name:"Demo FC v Sample United",offer_name:"Demo Offer",offer_details:"Qualifying bet",bookmaker:"Bookmaker A",match_strategy:"Standard"},
  "LAB-SB-002": {event_name:"Example City v Sample Town",offer_details:"Standard bet",bookmaker:"Bookmaker A",match_strategy:"Standard"},
  "LAB-SB-PROSPECT-B": {event_name:"Selection pending",offer_name:"Sample reload",offer_details:"Synthetic offer text",bookmaker:"Bookmaker B",match_strategy:"Standard"},
  "LAB-SB-OVERDUE": {event_name:"Demo Rovers v Sample Albion",offer_details:"Synthetic placed bet",bookmaker:"Bookmaker A",match_strategy:"Standard"},
  "LAB-SB-PARTIAL": {event_name:"Sample Athletic v Demo City",offer_details:"Synthetic partial hedge",bookmaker:"Bookmaker B",match_strategy:"Standard"},
  "LAB-SB-SEP-A": {event_name:"Sample Rangers v Demo County",offer_details:"Standard bet",bookmaker:"Bookmaker A",match_strategy:"Standard"},
  "LAB-SB-B": {event_name:"Profile B example",offer_details:"Standard",bookmaker:"Bookmaker B",match_strategy:"Standard"},
  "LAB-SB-SEP-B": {event_name:"Profile B September example",offer_details:"Standard bet",bookmaker:"Bookmaker B",match_strategy:"Standard"},
  "LAB-FB-001": {expiry_datetime:"2026-11-10",bookmaker:"Bookmaker A",offer_name:"Demo Offer",offer_details:"Linked award",match_strategy:"SNR"},
  "LAB-FB-EXPIRING": {expiry_datetime:"2026-11-02",bookmaker:"Bookmaker B",offer_name:"Sample reward",offer_details:"Synthetic award",match_strategy:"SNR"},
  "LAB-CO-001": {expiry_datetime:"2026-11-15",bookmaker:"Bookmaker C",offer_name:"Demo Casino Offer",game:"Demo Game",offer_type:"Wager to earn"},
  "LAB-CO-002": {expiry_datetime:"2026-11-08",bookmaker:"Bookmaker A",offer_name:"Sample Free Spins",offer_type:"Free Spins"},
  "LAB-EP-001": {date:"2026-11-07",runner:"Demo Runner / Sample Race",bookmaker:"Bookmaker A",stake:"5.00",terms:"1/5"},
  "LAB-EP-002": {date:"2026-11-08",runner:"Sample Runner / Demo Cup",bookmaker:"Bookmaker A",terms:"1/5"},
  "LAB-CA-001": {adjustment_date:"2026-10-12",direction:"In",adjustment_type:"Capital movement",amount:"20.00",affects_investment:"No",affects_cash_snapshot:"Yes",linked_account:"Bank B",description:"Synthetic example"},
  "LAB-CA-002": {adjustment_date:"2026-07-16",direction:"Out",adjustment_type:"Withdrawal",amount:"50.00",linked_account:"Bank B",description:"Synthetic withdrawal"},
};

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
