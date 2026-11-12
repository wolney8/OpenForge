import { ledgerColumnContracts } from "@/lib/ledger-column-contracts";
import type { CombinedLedgerModule } from "@/lib/profile-scope";

export type LedgerCellType = "text" | "identifier" | "enum" | "multi-value" | "date" | "datetime" | "money" | "odds" | "percentage" | "boolean" | "composite" | "status" | "action";
export type LedgerCellAuthority = "scalar" | "native-composite" | "source-identity" | "financial-workflow" | "calculated" | "lifecycle" | "row-action";
export type LedgerCellCapability = { type: LedgerCellType; authority: LedgerCellAuthority };
const cell = (type: LedgerCellType, authority: LedgerCellAuthority): LedgerCellCapability => ({ type, authority });

/** Every displayed column has an explicit type and governed interaction authority. */
export const ledgerCellCapabilities: Record<CombinedLedgerModule, Record<string, LedgerCellCapability>> = {
  accounts: {
    account_id: cell("identifier", "source-identity"), account: cell("text", "source-identity"), type: cell("enum", "lifecycle"), status: cell("status", "lifecycle"),
    counts_in_cash_total: cell("boolean", "financial-workflow"), current_balance: cell("money", "financial-workflow"), pending_withdrawal_amount: cell("money", "financial-workflow"),
    last_balance_update: cell("datetime", "financial-workflow"), channel: cell("multi-value", "native-composite"), group_name: cell("text", "lifecycle"), platform: cell("text", "lifecycle"), actions: cell("action", "row-action"),
  },
  "sportsbook-bets": {
    date_settled: cell("datetime", "financial-workflow"), bookmaker: cell("enum", "financial-workflow"), event_name: cell("text", "scalar"), offer_name: cell("text", "scalar"),
    offer_details: cell("composite", "financial-workflow"), match_strategy: cell("enum", "financial-workflow"), lay_status: cell("status", "calculated"),
    back_bet_status: cell("status", "calculated"), displayed_value: cell("money", "calculated"), status: cell("status", "lifecycle"), actions: cell("action", "row-action"),
  },
  "free-bets": {
    date_settled: cell("datetime", "financial-workflow"), expiry_datetime: cell("datetime", "financial-workflow"), bookmaker: cell("enum", "financial-workflow"),
    offer_name: cell("text", "scalar"), event_name: cell("text", "scalar"), offer_details: cell("composite", "financial-workflow"), match_strategy: cell("enum", "financial-workflow"),
    lay_status: cell("status", "calculated"), back_bet_status: cell("status", "calculated"), displayed_value: cell("money", "calculated"), status: cell("status", "lifecycle"), actions: cell("action", "row-action"),
  },
  "casino-offers": {
    date_settling: cell("datetime", "financial-workflow"), expiry_datetime: cell("datetime", "financial-workflow"), bookmaker: cell("enum", "financial-workflow"),
    offer_name: cell("text", "scalar"), game: cell("text", "scalar"), offer_type: cell("enum", "financial-workflow"), status: cell("status", "lifecycle"),
    result: cell("enum", "lifecycle"), displayed_value: cell("money", "calculated"), actions: cell("action", "row-action"),
  },
  "each-way-extra-places": {
    date: cell("datetime", "financial-workflow"), runner: cell("composite", "native-composite"), bookmaker: cell("enum", "financial-workflow"), stake: cell("money", "financial-workflow"),
    backOdds: cell("odds", "financial-workflow"), terms: cell("composite", "financial-workflow"), placeOdds: cell("odds", "financial-workflow"), winLayOdds: cell("odds", "financial-workflow"),
    winLayStake: cell("money", "financial-workflow"), winLiability: cell("money", "calculated"), placeLayOdds: cell("odds", "financial-workflow"),
    placeLayStake: cell("money", "financial-workflow"), placeLiability: cell("money", "calculated"), rating: cell("percentage", "calculated"), impliedOdds: cell("odds", "calculated"),
    qualLoss: cell("money", "calculated"), epProfit: cell("money", "calculated"), status: cell("status", "lifecycle"), actions: cell("action", "row-action"),
  },
  "cash-adjustments": {
    cash_adjustment_id: cell("identifier", "source-identity"), adjustment_date: cell("datetime", "financial-workflow"), direction: cell("enum", "financial-workflow"),
    adjustment_type: cell("enum", "financial-workflow"), amount: cell("money", "financial-workflow"), signed_amount: cell("money", "calculated"),
    affects_investment: cell("boolean", "financial-workflow"), affects_cash_snapshot: cell("boolean", "financial-workflow"), linked_account: cell("enum", "financial-workflow"),
    description: cell("text", "scalar"), week_label: cell("text", "calculated"), calculation_state: cell("status", "calculated"), actions: cell("action", "row-action"),
  },
};

export function ledgerCellCapability(module: CombinedLedgerModule, column: string): LedgerCellCapability {
  if (column === "profile_name") return cell("text", "source-identity");
  const capability = ledgerCellCapabilities[module][column];
  if (!capability) throw new Error(`Missing ${module} column interaction contract: ${column}`);
  return capability;
}

export function ledgerCellReviewReason(capability: LedgerCellCapability): string {
  switch (capability.authority) {
    case "source-identity": return "Source identity is fixed by its owning Profile.";
    case "financial-workflow": return "This field uses the established financial workflow and validation.";
    case "calculated": return "This value is calculated or source derived and cannot be edited directly.";
    case "lifecycle": return "This state uses the established review, placement or correction workflow.";
    case "native-composite": return "This group uses its existing coupled native control.";
    case "row-action": return "Use the row Actions control.";
    case "scalar": return "This row currently requires its populated editor or correction workflow.";
  }
}

export function assertLedgerCellCapabilityCoverage(): void {
  for (const [module, columns] of Object.entries(ledgerColumnContracts) as Array<[CombinedLedgerModule, typeof ledgerColumnContracts[CombinedLedgerModule]]>) {
    const expected = new Set(columns.map(column => column.key));
    const actual = new Set(Object.keys(ledgerCellCapabilities[module]));
    for (const key of expected) if (!actual.has(key)) throw new Error(`Missing ${module} column capability: ${key}`);
    for (const key of actual) if (!expected.has(key)) throw new Error(`Stale ${module} column capability: ${key}`);
  }
}
