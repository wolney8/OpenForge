import type { FeePeriodApiRecord } from "./fee-period-summary";
import { readSummaryMoney } from "./tracker-summary";

export type FeeCentreState =
  | "open"
  | "not_applicable"
  | "review_required"
  | "waiting_for_confirmation"
  | "ready_to_withdraw"
  | "part_withdrawn"
  | "unavailable"
  | "done";

export type FeeCentreRow = {
  state: FeeCentreState;
  period: FeePeriodApiRecord | null;
  feesEarned: number;
  feesWithdrawn: number;
  availableToWithdraw: number;
};

export const feeCentreStateLabels: Record<FeeCentreState, string> = {
  open: "Open Month",
  not_applicable: "Not Applicable",
  review_required: "Review Required",
  waiting_for_confirmation: "Waiting for Confirmation",
  ready_to_withdraw: "Ready to Withdraw",
  part_withdrawn: "Part Withdrawn",
  unavailable: "Unavailable",
  done: "Done",
};

export function deriveFeeCentreRow({
  month,
  lastClosedMonth,
  periods,
  trackingStartDate,
}: {
  month: string;
  lastClosedMonth: string;
  periods: FeePeriodApiRecord[];
  trackingStartDate: string;
}): FeeCentreRow {
  if (month > lastClosedMonth) {
    return { state: "open", period: null, feesEarned: 0, feesWithdrawn: 0, availableToWithdraw: 0 };
  }
  if (month < trackingStartDate.slice(0, 7)) {
    return { state: "not_applicable", period: null, feesEarned: 0, feesWithdrawn: 0, availableToWithdraw: 0 };
  }

  const period = periods.find((candidate) => candidate.period_start.slice(0, 7) === month) ?? null;
  if (!period) {
    return { state: "review_required", period: null, feesEarned: 0, feesWithdrawn: 0, availableToWithdraw: 0 };
  }

  const feesEarned = readSummaryMoney(period.current_revision.total_fee_due);
  const feesWithdrawn = readSummaryMoney(period.fee_withdrawn_amount);
  const availableToWithdraw = readSummaryMoney(period.fee_outstanding_amount);
  if (period.state === "ready_to_crystallise") {
    return { state: "waiting_for_confirmation", period, feesEarned: 0, feesWithdrawn, availableToWithdraw: 0 };
  }
  if (period.state !== "crystallised") {
    return { state: "review_required", period, feesEarned: 0, feesWithdrawn, availableToWithdraw: 0 };
  }
  if (!Number.isFinite(availableToWithdraw) || !Number.isFinite(feesWithdrawn)) {
    return { state: "unavailable", period, feesEarned, feesWithdrawn, availableToWithdraw };
  }
  if (availableToWithdraw <= 0.005) {
    return { state: "done", period, feesEarned, feesWithdrawn, availableToWithdraw: 0 };
  }
  if (feesWithdrawn > 0.005) {
    return { state: "part_withdrawn", period, feesEarned, feesWithdrawn, availableToWithdraw };
  }
  return { state: "ready_to_withdraw", period, feesEarned, feesWithdrawn, availableToWithdraw };
}
