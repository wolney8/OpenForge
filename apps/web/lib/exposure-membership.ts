export type FinancialMembership = "PLANNED" | "COMMITTED" | "REALISED" | "EXCLUDED";

export type ExposureDomain = "sportsbook" | "free-bet" | "casino" | "extra-place";

type LifecycleRecord = {
  status: string;
  result?: string;
};

/**
 * Canonical financial membership for current exposure consumers.
 *
 * This is intentionally separate from API `counts_as_open`, which also marks
 * workflow-open planning records so that ledgers can keep them visible.
 */
export function financialMembership(
  domain: ExposureDomain,
  record: LifecycleRecord
): FinancialMembership {
  switch (domain) {
    case "sportsbook":
      if (record.status === "Prospecting" || record.status === "Not Placed") return "PLANNED";
      if (record.status === "Placed") return "COMMITTED";
      if (record.status === "Settled" || record.status === "Free Bet Awarded") return "REALISED";
      return "EXCLUDED";
    case "free-bet":
      if (["Prospecting", "Not Yet Awarded", "Available"].includes(record.status)) return "PLANNED";
      if (record.status === "Placed") return "COMMITTED";
      if (record.status === "Settled" || record.status === "Converted") return "REALISED";
      return "EXCLUDED";
    case "casino":
      if (record.status === "Prospecting") return "PLANNED";
      if (record.status === "Started" || record.status === "In Progress") return "COMMITTED";
      if (record.status === "Settled") return "REALISED";
      return "EXCLUDED";
    case "extra-place":
      if (record.status === "Prospecting") return "PLANNED";
      if (record.status === "Placed") return "COMMITTED";
      if (record.status === "Settled") return "REALISED";
      return "EXCLUDED";
  }
}

export function isCommittedExposure(domain: ExposureDomain, record: LifecycleRecord): boolean {
  return financialMembership(domain, record) === "COMMITTED";
}

export function isFinanciallyRecognised(domain: ExposureDomain, record: LifecycleRecord): boolean {
  const membership = financialMembership(domain, record);
  return membership === "COMMITTED" || membership === "REALISED";
}
