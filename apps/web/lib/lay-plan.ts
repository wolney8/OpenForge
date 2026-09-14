export type LayPlan = {
  schema_version: "lay-plan-v1";
  revision: number;
  calculation_contract_version: "workbook-reference-v1" | "snr-outcome-target-v1";
  backing_basis: "Normal" | "SNR";
  back_stake: string;
  back_odds: string;
  lay_odds: string;
  selected_strategy: "Standard" | "Underlay" | "Overlay" | "Custom";
  custom_lay_stake: string;
  exchange_name: string;
  exchange_account_id: string;
  commission_units: "ratio";
  commission: string;
  commission_origin: "default" | "override";
  reviewed_planned_lay_stake: string;
  source_identity: string;
  source_checksum: string;
};

export function readLayPlan(raw: string | null | undefined): LayPlan | null {
  if (!raw) return null;
  try {
    const plan = JSON.parse(raw) as LayPlan;
    const expectedContract = plan.backing_basis === "SNR" ? "snr-outcome-target-v1" : "workbook-reference-v1";
    return plan.schema_version === "lay-plan-v1" && plan.commission_units === "ratio" &&
      ["Normal","SNR"].includes(plan.backing_basis) && plan.calculation_contract_version === expectedContract &&
      ["Standard","Underlay","Overlay","Custom"].includes(plan.selected_strategy) ? plan : null;
  } catch { return null; }
}

/** A save may acknowledge revision metadata, never the user's newer plan inputs. */
export function acknowledgeLayPlan(submitted: unknown, saved: unknown, current: unknown): unknown {
  if (typeof submitted !== "string" || typeof saved !== "string" || typeof current !== "string") return current;
  const before = readLayPlan(submitted), acknowledgement = readLayPlan(saved), draft = readLayPlan(current);
  if (!before || !acknowledgement || !draft || draft.revision !== before.revision ||
      acknowledgement.revision < before.revision || draft.source_identity !== acknowledgement.source_identity) return current;
  return JSON.stringify({ ...draft, revision: acknowledgement.revision,
    exchange_account_id: draft.exchange_account_id || acknowledgement.exchange_account_id });
}
