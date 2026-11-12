import type { TableColumn } from "@/lib/tracker-modules";
import type { CombinedLedgerModule } from "@/lib/profile-scope";

/** The V2 open and overflow controls occupy two 44px targets plus cell padding. */
export const ledgerV2ActionColumnWidth = 112;

/** Columns shown by the Profile-owned ledgers. The combined view adds Profile before these. */
export const ledgerColumnContracts: Record<CombinedLedgerModule, TableColumn[]> = {
  accounts: [
    { key: "account_id", label: "Account ID" }, { key: "account", label: "Account" }, { key: "type", label: "Type" }, { key: "status", label: "Status" },
    { key: "counts_in_cash_total", label: "Counts in cash" }, { key: "current_balance", label: "Current balance", align: "end" },
    { key: "pending_withdrawal_amount", label: "Pending withdrawal", align: "end" }, { key: "last_balance_update", label: "Last balance update" },
    { key: "channel", label: "Channel" }, { key: "group_name", label: "Group" }, { key: "platform", label: "Platform" }, { key: "actions", label: "Actions" },
  ],
  "sportsbook-bets": [
    { key: "date_settled", label: "Settles" }, { key: "bookmaker", label: "Bookmaker" }, { key: "event_name", label: "Event" },
    { key: "offer_name", label: "Campaign Tag" }, { key: "offer_details", label: "Offer Details" }, { key: "match_strategy", label: "Strategy" },
    { key: "lay_status", label: "Lay Bet" }, { key: "back_bet_status", label: "Back Bet" }, { key: "displayed_value", label: "Value" },
    { key: "status", label: "Status" }, { key: "actions", label: "Actions" },
  ],
  "free-bets": [
    { key: "date_settled", label: "Settles" }, { key: "expiry_datetime", label: "Expiry" }, { key: "bookmaker", label: "Bookmaker" },
    { key: "offer_name", label: "Campaign Tag" }, { key: "event_name", label: "Event" }, { key: "offer_details", label: "Offer details" },
    { key: "match_strategy", label: "Strategy" }, { key: "lay_status", label: "Lay Bet" }, { key: "back_bet_status", label: "Back Bet" },
    { key: "displayed_value", label: "Value" }, { key: "status", label: "Status" }, { key: "actions", label: "Actions" },
  ],
  "casino-offers": [
    { key: "date_settling", label: "Settles" }, { key: "expiry_datetime", label: "Expiry" }, { key: "bookmaker", label: "Bookmaker" },
    { key: "offer_name", label: "Offer Name" }, { key: "game", label: "Game" }, { key: "offer_type", label: "Offer type" },
    { key: "status", label: "Status" }, { key: "result", label: "Result" }, { key: "displayed_value", label: "Value", align: "end" },
    { key: "actions", label: "Actions" },
  ],
  "each-way-extra-places": [
    { key: "date", label: "Date / time" }, { key: "runner", label: "Runner / Race" }, { key: "bookmaker", label: "Bookmaker" },
    { key: "stake", label: "E/W Stake", align: "end" }, { key: "backOdds", label: "Back Odds" }, { key: "terms", label: "E/W Terms" },
    { key: "placeOdds", label: "Place Odds" }, { key: "winLayOdds", label: "Win Lay Odds" }, { key: "winLayStake", label: "Win Lay Stake", align: "end" },
    { key: "winLiability", label: "Win Lay Liab", align: "end" }, { key: "placeLayOdds", label: "Place Lay Odds" },
    { key: "placeLayStake", label: "Place Lay Stake", align: "end" }, { key: "placeLiability", label: "Place Lay Liab", align: "end" },
    { key: "rating", label: "Rating %" }, { key: "impliedOdds", label: "Implied Odds" }, { key: "qualLoss", label: "Qual Loss", align: "end" },
    { key: "epProfit", label: "EP Profit", align: "end" }, { key: "status", label: "Status" }, { key: "actions", label: "Actions" },
  ],
  "cash-adjustments": [
    { key: "cash_adjustment_id", label: "Adjustment ID" }, { key: "adjustment_date", label: "Date" }, { key: "direction", label: "Direction" },
    { key: "adjustment_type", label: "Type" }, { key: "amount", label: "Amount", align: "end" }, { key: "signed_amount", label: "Signed amount", align: "end" },
    { key: "affects_investment", label: "Investment" }, { key: "affects_cash_snapshot", label: "Cash snapshot" },
    { key: "linked_account", label: "Linked account" }, { key: "description", label: "Description" }, { key: "week_label", label: "Week label" },
    { key: "calculation_state", label: "Calc state" }, { key: "actions", label: "Actions" },
  ],
};

/** Match each native ledger's column chooser; financial/action anchors remain visible. */
export const ledgerHideableColumns: Record<CombinedLedgerModule, ReadonlySet<string>> = {
  accounts: new Set(["account_id", "type", "status", "counts_in_cash_total", "last_balance_update", "channel", "group_name", "platform"]),
  "sportsbook-bets": new Set(["date_settled", "bookmaker", "event_name", "offer_name", "offer_details", "match_strategy"]),
  "free-bets": new Set(["date_settled", "expiry_datetime", "bookmaker", "offer_name", "event_name", "offer_details", "match_strategy"]),
  "casino-offers": new Set(["date_settling", "expiry_datetime", "bookmaker", "offer_name", "game", "offer_type"]),
  "each-way-extra-places": new Set(["backOdds", "terms", "placeOdds", "winLayOdds", "winLayStake", "winLiability", "placeLayOdds", "placeLayStake", "placeLiability", "rating", "impliedOdds"]),
  "cash-adjustments": new Set(["cash_adjustment_id", "adjustment_date", "direction", "adjustment_type", "affects_investment", "affects_cash_snapshot", "linked_account", "description", "week_label", "calculation_state"]),
};

export const ledgerSortableColumns: Record<CombinedLedgerModule, ReadonlySet<string>> = {
  accounts: new Set(ledgerColumnContracts.accounts.filter(column => column.key !== "actions").map(column => column.key)),
  "sportsbook-bets": new Set(["date_settled", "bookmaker", "displayed_value", "status"]),
  "free-bets": new Set(["date_settled", "bookmaker", "displayed_value", "status"]),
  "casino-offers": new Set(["date_settling", "bookmaker", "status", "displayed_value"]),
  "each-way-extra-places": new Set(),
  "cash-adjustments": new Set(["adjustment_date", "adjustment_type", "signed_amount", "calculation_state"]),
};

/** Native column geometry shared with the combined Profile scope. */
export const ledgerColumnWidths: Record<CombinedLedgerModule, Record<string, number>> = {
  "accounts": {
  account_id: 120,
  account: 170,
  type: 175,
  status: 220,
  counts_in_cash_total: 145,
  current_balance: 150,
  pending_withdrawal_amount: 175,
  last_balance_update: 180,
  channel: 155,
  group_name: 165,
  platform: 160,
  actions: 110,
},
  "sportsbook-bets": {
  date_settled: 190,
  bookmaker: 130,
  event_name: 220,
  offer_name: 170,
  offer_details: 220,
  match_strategy: 150,
  lay_status: 120,
  back_bet_status: 150,
  displayed_value: 130,
  status: 135,
  actions: 190,
},
  "free-bets": {
  date_settled: 190,
  expiry_datetime: 180,
  bookmaker: 130,
  offer_name: 170,
  event_name: 220,
  offer_details: 230,
  match_strategy: 150,
  lay_status: 145,
  back_bet_status: 155,
  displayed_value: 130,
  status: 205,
  actions: 170,
},
  "casino-offers": {
  date_settling: 190,
  expiry_datetime: 170,
  bookmaker: 130,
  offer_name: 180,
  game: 180,
  offer_type: 150,
  status: 135,
  result: 135,
  displayed_value: 130,
  actions: 110,
},
  "cash-adjustments": {
  cash_adjustment_id: 160,
  adjustment_date: 180,
  direction: 110,
  adjustment_type: 140,
  amount: 120,
  signed_amount: 135,
  affects_investment: 120,
  affects_cash_snapshot: 135,
  linked_account: 150,
  description: 220,
  week_label: 140,
  calculation_state: 130,
  actions: 110,
},
  "each-way-extra-places": {
    date: 152, runner: 230, bookmaker: 150, stake: 155, backOdds: 118, terms: 108,
    placeOdds: 118, winLayOdds: 142, winLayStake: 142, winLiability: 142,
    placeLayOdds: 142, placeLayStake: 142, placeLiability: 142, rating: 108,
    impliedOdds: 120, qualLoss: 132, epProfit: 144, status: 180, actions: 116,
  },
};
