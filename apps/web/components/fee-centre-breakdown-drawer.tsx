"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  feeCentreStateLabels,
  type FeeCentreRow,
} from "@/lib/fee-centre-status";
import { formatMoney } from "@/lib/tracker-summary";
import { LedgerLoadingIndicator } from "./ledger-loading-indicator";

type FeePreview = {
  calculation_state: string;
  sportsbook_total: string;
  free_bet_total: string;
  casino_total: string;
  eligible_period_profit: string | null;
  opening_loss_carryforward: string | null;
  fee_base: string | null;
  management_fee_amount: string | null;
  investment_fee_amount: string | null;
  total_fee_due: string | null;
  blockers: { module: string; record_id: string; reason: string }[];
};

type ModuleTotals = {
  sportsbook: string;
  free_bet: string;
  casino: string;
};

type FeeCentreBreakdownDrawerProps = {
  cashAdjustmentTotal: number;
  month: string;
  monthLabel: string;
  onClose: () => void;
  onReview: () => void;
  open: boolean;
  profileCode: string;
  profileId: string;
  profileName: string;
  result: FeeCentreRow;
};

function optionalMoney(value: string | null | undefined, fallback = "Not prepared") {
  return value === null || value === undefined ? fallback : formatMoney(Number(value));
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    periodStart: `${month}-01`,
    periodEnd: new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10),
  };
}

function persistedModuleTotals(value: string | undefined): ModuleTotals | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { module_totals?: Partial<ModuleTotals> };
    if (!parsed.module_totals) return null;
    return {
      sportsbook: parsed.module_totals.sportsbook ?? "0.00",
      free_bet: parsed.module_totals.free_bet ?? "0.00",
      casino: parsed.module_totals.casino ?? "0.00",
    };
  } catch {
    return null;
  }
}

export function FeeCentreBreakdownDrawer({
  cashAdjustmentTotal,
  month,
  monthLabel,
  onClose,
  onReview,
  open,
  profileCode,
  profileId,
  profileName,
  result,
}: FeeCentreBreakdownDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<FeePreview | null>(null);
  const [error, setError] = useState("");
  const canReview = result.state !== "open" && result.state !== "not_applicable";
  const revision = result.period?.current_revision;
  const storedModuleTotals = useMemo(
    () => persistedModuleTotals(revision?.fee_base_breakdown_json),
    [revision?.fee_base_breakdown_json]
  );
  const moduleTotals = storedModuleTotals ?? (preview ? {
    sportsbook: preview.sportsbook_total,
    free_bet: preview.free_bet_total,
    casino: preview.casino_total,
  } : null);
  const settledProfit = revision?.eligible_period_profit ?? preview?.eligible_period_profit;
  const openingLoss = revision?.opening_loss_carryforward ?? preview?.opening_loss_carryforward;
  const feeBase = revision?.fee_base ?? preview?.fee_base;
  const managementFee = revision?.management_fee_amount ?? preview?.management_fee_amount;
  const investmentFee = revision?.investment_fee_amount ?? preview?.investment_fee_amount;
  const totalFee = revision?.total_fee_due ?? preview?.total_fee_due;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !canReview || storedModuleTotals) return;
    const controller = new AbortController();
    const bounds = monthBounds(month);
    void fetch(`${apiBaseUrl}/profiles/${profileId}/fee-periods/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor_id: "fund-manager-local",
        period_start: bounds.periodStart,
        period_end: bounds.periodEnd,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Fee breakdown failed with status ${response.status}`);
        setPreview((await response.json()) as FeePreview);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Fee breakdown could not be loaded");
        }
      });
    return () => controller.abort();
  }, [canReview, month, open, profileId, storedModuleTotals]);

  return (
    <dialog
      aria-labelledby="fee-centre-breakdown-title"
      className="profile-details-drawer fee-centre-breakdown-drawer"
      data-pd-id="fees.breakdown.drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="profile-details-drawer-content stack">
        <header className="section-heading-row">
          <div>
            <span className="eyebrow">Fund Manager Fees</span>
            <h2 id="fee-centre-breakdown-title">{profileName}</h2>
            <span>{profileCode} · {monthLabel}</span>
          </div>
          <button
            aria-label={`Close fee breakdown for ${profileName}`}
            className="dialog-close-button"
            data-pd-id="fees.breakdown.close"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </header>

        <span className={`table-status fee-centre-state fee-centre-state-${result.state}`}>
          {feeCentreStateLabels[result.state]}
        </span>

        {!storedModuleTotals && canReview && !preview && !error ? (
          <LedgerLoadingIndicator label="Loading monthly fee breakdown" />
        ) : null}
        {error ? <div className="validation-message" role="alert">{error}</div> : null}

        <section className="profile-drawer-section stack-tight">
          <h3>Monthly Performance</h3>
          <dl className="profile-detail-list">
            <div><dt>Sportsbook / Qualifying Bets</dt><dd>{optionalMoney(moduleTotals?.sportsbook)}</dd></div>
            <div><dt>Free Bets</dt><dd>{optionalMoney(moduleTotals?.free_bet)}</dd></div>
            <div><dt>Casino Offers</dt><dd>{optionalMoney(moduleTotals?.casino)}</dd></div>
            <div>
              <dt>Cash Adjustments <small>Excluded from fee base</small></dt>
              <dd>{formatMoney(cashAdjustmentTotal)}</dd>
            </div>
            <div><dt>Settled Profit</dt><dd><strong>{optionalMoney(settledProfit)}</strong></dd></div>
          </dl>
        </section>

        <section className="profile-drawer-section stack-tight">
          <h3>Fee Calculation</h3>
          <dl className="profile-detail-list">
            <div><dt>Opening Loss Carryforward</dt><dd>{optionalMoney(openingLoss)}</dd></div>
            <div><dt>Fee Base</dt><dd>{optionalMoney(feeBase)}</dd></div>
            <div><dt>Management Fee</dt><dd>{optionalMoney(managementFee)}</dd></div>
            <div><dt>Investment Fee</dt><dd>{optionalMoney(investmentFee)}</dd></div>
            <div><dt>Total Fee</dt><dd><strong>{optionalMoney(totalFee)}</strong></dd></div>
          </dl>
        </section>

        <section className="profile-drawer-section stack-tight">
          <h3>Withdrawal Position</h3>
          <dl className="profile-detail-list">
            <div><dt>Fees Earned</dt><dd>{result.period?.state === "crystallised" ? formatMoney(result.feesEarned) : "Not confirmed"}</dd></div>
            <div><dt>Fees Withdrawn</dt><dd>{result.period?.state === "crystallised" ? formatMoney(result.feesWithdrawn) : "—"}</dd></div>
            <div><dt>Available to Withdraw</dt><dd><strong>{result.period?.state === "crystallised" ? formatMoney(result.availableToWithdraw) : "—"}</strong></dd></div>
          </dl>
        </section>

        <footer className="profile-drawer-icon-actions fee-centre-breakdown-actions">
          <button className="button-link" onClick={onClose} type="button">Close</button>
          <button
            className="button-link primary-action"
            data-pd-id="fees.breakdown.review"
            disabled={!canReview}
            onClick={() => {
              onClose();
              onReview();
            }}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">calculate</span>
            Open Monthly Review
          </button>
        </footer>
      </div>
    </dialog>
  );
}
