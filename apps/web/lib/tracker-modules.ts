import type { TrackerModuleKey } from "./tracker-types";

export type TableColumn = {
  key: string;
  label: string;
  align?: "start" | "end";
};

export type TrackerModuleDefinition = {
  href: string;
  title: string;
  summary: string;
  addLabel?: string;
  columns?: TableColumn[];
};

export const trackerModuleDefinitions: Record<string, TrackerModuleDefinition> = {
  dashboard: {
    href: "dashboard",
    title: "Dashboard",
    summary: "Live profile dashboard for cash snapshot, open positions, alerts, and current profit visibility.",
  },
  accounts: {
    href: "accounts",
    title: "Accounts",
    summary: "Bookmaker and exchange account health, balances, and sign-up status.",
    addLabel: "Add account row",
    columns: [
      { key: "id", label: "Account ID" },
      { key: "account", label: "Account" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "currentBalance", label: "Current balance", align: "end" },
      { key: "group", label: "Group" },
      { key: "platform", label: "Platform" },
    ],
  },
  "sportsbook-bets": {
    href: "sportsbook-bets",
    title: "Sportsbook Bets",
    summary: "Qualifying, mug-bet, and sportsbook bet-entry workflow shell.",
    addLabel: "Add sportsbook row",
    columns: [
      { key: "id", label: "Bet ID" },
      { key: "dateSettling", label: "Settles" },
      { key: "bookmaker", label: "Bookmaker" },
      { key: "status", label: "Status" },
      { key: "result", label: "Result" },
      { key: "backStake", label: "Back stake", align: "end" },
      { key: "backOdds", label: "Back odds", align: "end" },
      { key: "matchStrategy", label: "Strategy" },
      { key: "layOdds1", label: "Lay odds", align: "end" },
      { key: "exchange", label: "Exchange" },
      { key: "eventName", label: "Event" },
    ],
  },
  "free-bets": {
    href: "free-bets",
    title: "Free Bets",
    summary: "Free-bet entry and tracking shell for SNR and SR flows.",
    addLabel: "Add free-bet row",
    columns: [
      { key: "id", label: "Free bet ID" },
      { key: "dateSettling", label: "Settles" },
      { key: "bookmaker", label: "Bookmaker" },
      { key: "status", label: "Status" },
      { key: "result", label: "Result" },
      { key: "retentionMode", label: "Mode" },
      { key: "freeBetValue", label: "Value", align: "end" },
      { key: "backOdds", label: "Back odds", align: "end" },
      { key: "matchStrategy", label: "Strategy" },
      { key: "layOdds1", label: "Lay odds", align: "end" },
      { key: "expiryDateTime", label: "Expiry" },
    ],
  },
  "casino-offers": {
    href: "casino-offers",
    title: "Casino Offers",
    summary: "Casino offer tracking shell.",
    addLabel: "Add casino row",
    columns: [
      { key: "id", label: "Offer ID" },
      { key: "dateStarted", label: "Started" },
      { key: "bookmaker", label: "Bookmaker" },
      { key: "offerType", label: "Offer type" },
      { key: "offerName", label: "Offer name" },
      { key: "cashStake", label: "Cash stake", align: "end" },
      { key: "freeSpinsAwarded", label: "Free spins", align: "end" },
      { key: "status", label: "Status" },
      { key: "result", label: "Result" },
    ],
  },
  "cash-adjustments": {
    href: "cash-adjustments",
    title: "Cash Adjustments",
    summary: "Top-ups, withdrawals, deductions, and signed cash-event shell.",
    addLabel: "Add cash adjustment",
    columns: [
      { key: "id", label: "Adjustment ID" },
      { key: "adjustmentDate", label: "Date" },
      { key: "direction", label: "Direction" },
      { key: "amount", label: "Amount", align: "end" },
      { key: "adjustmentType", label: "Type" },
      { key: "linkedAccount", label: "Linked account" },
      { key: "description", label: "Description" },
    ],
  },
  settings: {
    href: "settings",
    title: "Settings",
    summary:
      "Profile-scoped tracker settings, list authorities, and workbook-derived defaults.",
  },
  reports: {
    href: "reports",
    title: "Reports",
    summary: "Formal weekly, monthly, and yearly workbook-style reporting from profile-scoped tracker rows.",
  },
  "profit-tracker": {
    href: "profit-tracker",
    title: "Profit Tracker",
    summary: "Selected-range profit view with current versus settled value split, account health, and activity drilldown.",
  },
};

export const trackerModuleCards = Object.values(trackerModuleDefinitions);

export const trackerLandingCards = trackerModuleCards.filter(
  (module) => module.href !== "profit-tracker"
);

export const primaryProfileModules = trackerModuleCards.filter((module) =>
  [
    "sportsbook-bets",
    "free-bets",
    "casino-offers",
    "cash-adjustments",
  ].includes(module.href)
);

export const profileOverflowModules = trackerModuleCards.filter((module) =>
  ["dashboard", "accounts", "settings", "reports"].includes(module.href)
);

export const trackerTableModules = new Set<TrackerModuleKey>([
  "accounts",
  "sportsbook-bets",
  "free-bets",
  "casino-offers",
  "cash-adjustments",
]);
