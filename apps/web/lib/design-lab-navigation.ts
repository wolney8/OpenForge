import type { LabLedgerKey } from "@/lib/design-lab-connected-data";

export type LabSection = "home" | "tasks" | "opportunities" | "accounts" | "tracker" | "reports" | "profiles" | "offers" | LabLedgerKey | "oddsmatcher" | "calculators" | "subscribers" | "catalogue" | "administration" | "recovery";
export type LabNavigationGroup = "primary" | "tracker" | "more" | "launcher";
export type LabDestination = { id: LabSection; label: string; icon: string; group: LabNavigationGroup; owner: "Fund Manager" | "Betting Tools" | "Administration"; parent?: LabSection; access: "fund_manager"; status: "simulated" | "preview"; breadcrumb: readonly LabSection[] };

export const labDestinations: readonly LabDestination[] = [
  { id:"home", label:"Position", icon:"space_dashboard", group:"primary", owner:"Fund Manager", access:"fund_manager", status:"simulated", breadcrumb:["home"] },
  { id:"tasks", label:"Today", icon:"task_alt", group:"primary", owner:"Fund Manager", access:"fund_manager", status:"simulated", breadcrumb:["home","tasks"] },
  { id:"opportunities", label:"Opportunities", icon:"travel_explore", group:"primary", owner:"Fund Manager", access:"fund_manager", status:"preview", breadcrumb:["home","opportunities"] },
  { id:"accounts", label:"Accounts", icon:"account_balance_wallet", group:"primary", owner:"Fund Manager", access:"fund_manager", status:"simulated", breadcrumb:["home","accounts"] },
  { id:"tracker", label:"Tracker", icon:"table_chart", group:"primary", owner:"Fund Manager", access:"fund_manager", status:"simulated", breadcrumb:["home","tracker"] },
  { id:"sportsbook", label:"Sportsbook Bets", icon:"sports_soccer", group:"tracker", owner:"Fund Manager", parent:"tracker", access:"fund_manager", status:"simulated", breadcrumb:["home","tracker","sportsbook"] },
  { id:"freeBets", label:"Free Bets", icon:"redeem", group:"tracker", owner:"Fund Manager", parent:"tracker", access:"fund_manager", status:"preview", breadcrumb:["home","tracker","freeBets"] },
  { id:"casino", label:"Casino Offers", icon:"casino", group:"tracker", owner:"Fund Manager", parent:"tracker", access:"fund_manager", status:"preview", breadcrumb:["home","tracker","casino"] },
  { id:"extraPlace", label:"Extra Place", icon:"emoji_events", group:"tracker", owner:"Fund Manager", parent:"tracker", access:"fund_manager", status:"preview", breadcrumb:["home","tracker","extraPlace"] },
  { id:"cash", label:"Cash Adjustments", icon:"account_balance", group:"tracker", owner:"Fund Manager", parent:"tracker", access:"fund_manager", status:"preview", breadcrumb:["home","tracker","cash"] },
  { id:"reports", label:"Reports", icon:"monitoring", group:"primary", owner:"Fund Manager", access:"fund_manager", status:"preview", breadcrumb:["home","reports"] },
  { id:"profiles", label:"Profiles", icon:"group", group:"more", owner:"Fund Manager", access:"fund_manager", status:"simulated", breadcrumb:["home","profiles"] },
  { id:"offers", label:"Recurring Offers", icon:"event_repeat", group:"more", owner:"Fund Manager", access:"fund_manager", status:"simulated", breadcrumb:["home","offers"] },
  { id:"oddsmatcher", label:"Oddsmatcher", icon:"travel_explore", group:"launcher", owner:"Betting Tools", access:"fund_manager", status:"preview", breadcrumb:["home","oddsmatcher"] },
  { id:"calculators", label:"Calculators", icon:"calculate", group:"launcher", owner:"Betting Tools", access:"fund_manager", status:"preview", breadcrumb:["home","calculators"] },
  { id:"subscribers", label:"Subscribers & Invitations", icon:"person_add", group:"launcher", owner:"Administration", access:"fund_manager", status:"preview", breadcrumb:["home","subscribers"] },
  { id:"catalogue", label:"Account Catalogue", icon:"storefront", group:"launcher", owner:"Administration", access:"fund_manager", status:"preview", breadcrumb:["home","catalogue"] },
  { id:"administration", label:"Administration / Settings", icon:"settings", group:"launcher", owner:"Administration", access:"fund_manager", status:"preview", breadcrumb:["home","administration"] },
  { id:"recovery", label:"Recovery & Backups", icon:"backup", group:"launcher", owner:"Administration", access:"fund_manager", status:"preview", breadcrumb:["home","recovery"] },
];

export const labDestination = (id: LabSection) => labDestinations.find(item => item.id === id)!;
export const labDestinationLabel = (id: LabSection) => labDestination(id).label;
