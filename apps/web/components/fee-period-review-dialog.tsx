"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { formatMoney } from "@/lib/tracker-summary";
import {
  getClosedMonthOptions,
  getPreviousMonthValue,
  type FeePeriodApiRecord,
  type FeePeriodRevisionApiRecord,
} from "@/lib/fee-period-summary";
import {
  buildFeeReviewLedgerHref,
  buildFeeReviewReturnHref,
  type FeeReviewLedger,
} from "@/lib/fee-review-session";
import {
  buildOperationalLedgerHref,
  type OperationalActionCounts,
} from "@/lib/operational-actions";
import { LedgerLoadingIndicator } from "./ledger-loading-indicator";

type FeePeriodPreview = {
  profile_id: string;
  period_start: string;
  period_end: string;
  calculation_state: string;
  sportsbook_total: string;
  sportsbook_count: number;
  free_bet_total: string;
  free_bet_count: number;
  casino_total: string;
  casino_count: number;
  eligible_period_profit: string | null;
  opening_loss_carryforward: string | null;
  fee_base: string | null;
  management_fee_percent: string;
  investment_fee_percent: string;
  management_fee_amount: string | null;
  investment_fee_amount: string | null;
  total_fee_due: string | null;
  blockers: { module: string; record_id: string; reason: string }[];
};

type FeePeriodReviewDialogProps = {
  open: boolean;
  profileId: string;
  profileName: string;
  trackingStartDate: string;
  periods: FeePeriodApiRecord[];
  operationalActions: OperationalActionCounts;
  initialMonth?: string;
  onClose: () => void;
  onPeriodsChanged: (periods: FeePeriodApiRecord[]) => void;
};

const actorId = "fund-manager-local";

function monthBounds(value: string) {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? value : getPreviousMonthValue();
  const [year, month] = normalized.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function money(value: string | null, unresolvedLabel = "Unavailable") {
  return value === null ? unresolvedLabel : formatMoney(Number(value));
}

function blockerLabel(reason: string) {
  const labels: Record<string, string> = {
    settled_row_missing_date: "Settled row needs a settlement date",
    settled_final_value_unresolved: "Settled row needs a final value",
    previous_fee_period_missing: "The immediately preceding fee month is missing",
    prior_fee_period_not_crystallised: "The preceding fee month must be confirmed first",
  };
  return labels[reason] ?? reason.replaceAll("_", " ");
}

function blockerLedgerLabel(blockerModule: string) {
  const ledgers: Record<string, { label: string; route: string }> = {
    sportsbook: { label: "Sportsbook Bets", route: "sportsbook-bets" },
    free_bet: { label: "Free Bets", route: "free-bets" },
    casino: { label: "Casino Offers", route: "casino-offers" },
  };
  return ledgers[blockerModule]?.label ?? null;
}

function formatAuditDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function FeePeriodReviewDialog({
  open,
  profileId,
  profileName,
  trackingStartDate,
  periods,
  operationalActions,
  initialMonth,
  onClose,
  onPeriodsChanged,
}: FeePeriodReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(initialMonth ?? getPreviousMonthValue);
  const [preview, setPreview] = useState<FeePeriodPreview | null>(null);
  const [previewMonth, setPreviewMonth] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [withdrawalDate, setWithdrawalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [withdrawalAccount, setWithdrawalAccount] = useState("");
  const [managementWithdrawal, setManagementWithdrawal] = useState<string | null>(null);
  const [investmentWithdrawal, setInvestmentWithdrawal] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [correctedFeeDue, setCorrectedFeeDue] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [profileClosing, setProfileClosing] = useState(false);
  const [isCorrectionSaving, setIsCorrectionSaving] = useState(false);
  const [revisions, setRevisions] = useState<FeePeriodRevisionApiRecord[]>([]);
  const [revisionsPeriodId, setRevisionsPeriodId] = useState("");
  const [revisionAuditError, setRevisionAuditError] = useState("");
  const monthOptions = useMemo(
    () => getClosedMonthOptions(trackingStartDate),
    [trackingStartDate]
  );
  const bounds = useMemo(() => monthBounds(month), [month]);
  const isLoading = open && previewMonth !== month && !error;
  const existingPeriod = periods.find(
    (period) => period.period_start === bounds.periodStart
  );
  const managementWithdrawn = (existingPeriod?.withdrawal_links ?? [])
    .filter((link) => link.component === "management")
    .reduce((total, link) => total + Number(link.amount), 0);
  const investmentWithdrawn = (existingPeriod?.withdrawal_links ?? [])
    .filter((link) => link.component === "investment")
    .reduce((total, link) => total + Number(link.amount), 0);
  const managementOutstanding = Math.max(
    Number(existingPeriod?.current_revision.management_fee_amount ?? 0) - managementWithdrawn,
    0
  );
  const investmentOutstanding = Math.max(
    Number(existingPeriod?.current_revision.investment_fee_amount ?? 0) - investmentWithdrawn,
    0
  );
  const managementWithdrawalValue = managementWithdrawal ?? managementOutstanding.toFixed(2);
  const investmentWithdrawalValue = investmentWithdrawal ?? investmentOutstanding.toFixed(2);
  const managementWithdrawalNumber = Number(managementWithdrawalValue);
  const investmentWithdrawalNumber = Number(investmentWithdrawalValue);
  const withdrawalAmountsAreValid =
    Number.isFinite(managementWithdrawalNumber) &&
    Number.isFinite(investmentWithdrawalNumber) &&
    managementWithdrawalNumber >= 0 &&
    investmentWithdrawalNumber >= 0;
  const totalWithdrawal = managementWithdrawalNumber + investmentWithdrawalNumber;
  const feeWithdrawnAmount = Number(existingPeriod?.fee_withdrawn_amount ?? 0);
  const correctedFeeDueValue = correctedFeeDue ?? existingPeriod?.current_revision.total_fee_due ?? "0.00";
  const currentRevisionNumber = existingPeriod?.current_revision_number ?? 1;
  const isReopenedReview =
    existingPeriod?.state === "ready_to_crystallise" &&
    currentRevisionNumber > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/profiles/${profileId}/fee-periods/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period_start: bounds.periodStart,
        period_end: bounds.periodEnd,
        actor_id: actorId,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Fee preview failed with status ${response.status}`);
        setPreview((await response.json()) as FeePeriodPreview);
        setPreviewMonth(month);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Fee preview failed");
        }
      })
    return () => controller.abort();
  }, [bounds, month, open, profileId]);

  useEffect(() => {
    if (!open || !existingPeriod) return;
    const controller = new AbortController();
    void fetch(
      `${apiBaseUrl}/profiles/${profileId}/fee-periods/${existingPeriod.fee_period_id}/revisions`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Revision audit could not be loaded");
        setRevisions((await response.json()) as FeePeriodRevisionApiRecord[]);
        setRevisionsPeriodId(existingPeriod.fee_period_id);
        setRevisionAuditError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setRevisionsPeriodId(existingPeriod.fee_period_id);
          setRevisionAuditError(
            reason instanceof Error ? reason.message : "Revision audit could not be loaded"
          );
        }
      });
    return () => controller.abort();
  }, [existingPeriod, open, profileId]);

  async function refreshPeriods() {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/fee-periods`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Updated fee periods could not be loaded");
    onPeriodsChanged((await response.json()) as FeePeriodApiRecord[]);
  }

  async function runPrimaryAction() {
    if (!preview || preview.calculation_state !== "resolved") return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      if (existingPeriod?.state === "crystallised") {
        const response = await fetch(
          `${apiBaseUrl}/profiles/${profileId}/fee-periods/${existingPeriod.fee_period_id}/mark-withdrawn`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actor_id: actorId,
              adjustment_date: withdrawalDate,
              linked_account: withdrawalAccount.trim(),
              management_amount: managementWithdrawalValue,
              investment_amount: investmentWithdrawalValue,
            }),
          }
        );
        if (!response.ok) {
          const payload = (await response.json()) as { detail?: string };
          throw new Error(payload.detail ?? `Fee withdrawal failed with status ${response.status}`);
        }
        await refreshPeriods();
        setManagementWithdrawal(null);
        setInvestmentWithdrawal(null);
        setMessage(`${profileName} fee withdrawal was recorded in Cash Adjustments.`);
        return;
      }
      const url = existingPeriod
        ? `${apiBaseUrl}/profiles/${profileId}/fee-periods/${existingPeriod.fee_period_id}/crystallise`
        : `${apiBaseUrl}/profiles/${profileId}/fee-periods`;
      const body = existingPeriod
        ? { actor_id: actorId, confirmation: true }
        : {
            period_start: bounds.periodStart,
            period_end: bounds.periodEnd,
            reporting_basis: "settled_final",
            actor_id: actorId,
          };
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { detail?: { message?: string } | string };
        const detail = typeof payload.detail === "string" ? payload.detail : payload.detail?.message;
        throw new Error(detail ?? `Fee action failed with status ${response.status}`);
      }
      await refreshPeriods();
      setMessage(
        existingPeriod
          ? `${profileName} fees are confirmed as earned for this month.`
          : `${profileName} fee review is ready for confirmation.`
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fee action failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function reopenConfirmedPeriod() {
    if (!existingPeriod || !reopenReason.trim() || isCorrectionSaving) return;
    setIsCorrectionSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/fee-periods/${existingPeriod.fee_period_id}/reopen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actor_id: actorId, reason: reopenReason.trim() }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        const labels: Record<string, string> = {
          later_fee_period_exists: "A later fee month already exists, so this period cannot be reopened independently.",
          withdrawn_period_is_immutable: "A withdrawn fee period cannot be reopened. Record a fee correction instead.",
        };
        throw new Error(labels[payload.detail ?? ""] ?? payload.detail ?? "Fee review could not be reopened");
      }
      await refreshPeriods();
      setReopenReason("");
      setMessage(`${profileName} fee review was reopened and recalculated. Confirm the new revision before withdrawing fees.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fee review could not be reopened");
    } finally {
      setIsCorrectionSaving(false);
    }
  }

  async function recordFeeCorrection() {
    if (!existingPeriod || !correctionReason.trim() || isCorrectionSaving) return;
    const correctedAmount = Number(correctedFeeDueValue);
    if (!Number.isFinite(correctedAmount) || correctedAmount < 0) return;
    setIsCorrectionSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/fee-periods/${existingPeriod.fee_period_id}/corrections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: actorId,
            corrected_fee_due: correctedFeeDueValue,
            profile_closing: profileClosing,
            reason: correctionReason.trim(),
          }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        const labels: Record<string, string> = {
          fee_correction_difference_required: "The corrected fee must differ from the confirmed fee.",
          withdrawn_crystallised_period_required: "Fee credits and debits apply only after a confirmed fee withdrawal.",
        };
        throw new Error(labels[payload.detail ?? ""] ?? payload.detail ?? "Fee correction could not be recorded");
      }
      const correction = (await response.json()) as { adjustment_type: string; amount: string };
      await refreshPeriods();
      setCorrectedFeeDue(null);
      setCorrectionReason("");
      setProfileClosing(false);
      setMessage(
        `${correction.adjustment_type === "fee_credit" ? "Fee credit" : "Fee debit"} of ${formatMoney(Number(correction.amount))} was recorded for a future fee period.`
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fee correction could not be recorded");
    } finally {
      setIsCorrectionSaving(false);
    }
  }

  const primaryDisabledReason = isLoading
    ? "Wait for the settled fee preview to load."
    : preview?.calculation_state !== "resolved"
      ? "Resolve the listed ledger issues before preparing fees."
      : existingPeriod?.state === "crystallised" && Number(existingPeriod.fee_outstanding_amount) <= 0
        ? "All confirmed fees for this month have been withdrawn."
      : existingPeriod?.state === "crystallised" && !withdrawalAccount.trim()
        ? "Enter the account the fee was withdrawn to."
      : existingPeriod?.state === "crystallised" && !withdrawalAmountsAreValid
        ? "Fee withdrawal amounts must be valid values of zero or more."
      : existingPeriod?.state === "crystallised" && totalWithdrawal <= 0
        ? "Enter at least one fee amount to withdraw."
      : existingPeriod?.state === "crystallised" &&
          (managementWithdrawalNumber > managementOutstanding ||
            investmentWithdrawalNumber > investmentOutstanding)
        ? "A withdrawal cannot exceed the outstanding fee component."
      : "";
  const trackerActions = [
    {
      count: operationalActions.sportsbook,
      icon: "sports",
      label: "Sportsbook",
      ledger: "sportsbook" as const,
    },
    {
      count: operationalActions.freeBets,
      icon: "award_star",
      label: "Free Bets",
      ledger: "free-bets" as const,
    },
    {
      count: operationalActions.casinoOffers,
      icon: "playing_cards",
      label: "Casino",
      ledger: "casino-offers" as const,
    },
  ];
  const groupedBlockers = useMemo(() => {
    const groups = new Map<FeeReviewLedger, FeePeriodPreview["blockers"]>();
    preview?.blockers.forEach((blocker) => {
      if (blocker.module !== "sportsbook" && blocker.module !== "free_bet" && blocker.module !== "casino") {
        return;
      }
      const ledger = blocker.module as FeeReviewLedger;
      groups.set(ledger, [...(groups.get(ledger) ?? []), blocker]);
    });
    return Array.from(groups.entries());
  }, [preview]);

  return (
    <dialog
      aria-labelledby="fee-period-review-title"
      className="fee-period-review-dialog"
      data-pd-id="fee-period-review.dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header className="modal-sticky-header section-heading-row">
        <div>
          <span className="eyebrow">Fund Manager Fees</span>
          <h2 id="fee-period-review-title">Review Monthly Fees</h2>
          <span>{profileName}</span>
        </div>
        <button
          aria-label={`Close monthly fee review for ${profileName}`}
          className="dialog-close-button"
          data-pd-id="fee-period-review.close"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
      </header>

      <div className="fee-period-review-body stack">
        <label className="m3-picker-field fee-period-month-field">
          <span className="m3-picker-label">Closed Month</span>
          <span className="m3-picker-control">
            <span aria-hidden="true" className="material-symbols-outlined">calendar_month</span>
            <select
            aria-label={`Closed fee month for ${profileName}`}
            data-pd-id="fee-period-review.month"
            onChange={(event) => {
              setMonth(event.target.value);
              setPreview(null);
              setPreviewMonth("");
              setError("");
              setMessage("");
              setManagementWithdrawal(null);
              setInvestmentWithdrawal(null);
            }}
            value={month}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </span>
        </label>

        {isLoading ? <LedgerLoadingIndicator label="Calculating settled monthly fees" /> : null}
        {error ? <div className="validation-message" role="alert">{error}</div> : null}
        {message ? <div className="status-banner" role="status">{message}</div> : null}

        {preview && !isLoading ? (
          <>
            <section className="stat-strip fee-period-stat-strip" aria-label="Monthly settled fee totals">
              <article className="stat-card"><span>Sportsbook</span><strong>{money(preview.sportsbook_total)}</strong><small>{preview.sportsbook_count} settled rows</small></article>
              <article className="stat-card"><span>Free Bets</span><strong>{money(preview.free_bet_total)}</strong><small>{preview.free_bet_count} settled rows</small></article>
              <article className="stat-card"><span>Casino</span><strong>{money(preview.casino_total)}</strong><small>{preview.casino_count} settled rows</small></article>
              <article className="stat-card"><span>Settled Profit</span><strong>{money(preview.eligible_period_profit, preview.blockers.length ? "Blocked" : "Unavailable")}</strong><small>Before loss recovery</small></article>
            </section>

            <section className="content-subpanel stack-tight" data-pd-id="fee-period-review.calculation">
              <h3>Fee Calculation</h3>
              <dl className="profile-detail-list">
                <div><dt>Opening Loss Carryforward</dt><dd>{money(preview.opening_loss_carryforward, preview.blockers.length ? "Blocked" : "Unavailable")}</dd></div>
                <div><dt>Fee Base</dt><dd>{money(preview.fee_base, preview.blockers.length ? "Blocked" : "Unavailable")}</dd></div>
                <div><dt>Management Fee ({preview.management_fee_percent}%)</dt><dd>{money(preview.management_fee_amount, preview.blockers.length ? "Blocked" : "Unavailable")}</dd></div>
                <div><dt>Investment Fee ({preview.investment_fee_percent}%)</dt><dd>{money(preview.investment_fee_amount, preview.blockers.length ? "Blocked" : "Unavailable")}</dd></div>
                <div><dt>Total Fee Due</dt><dd><strong>{money(preview.total_fee_due, preview.blockers.length ? "Blocked" : "Unavailable")}</strong></dd></div>
              </dl>
            </section>

            {isReopenedReview ? (
              <section
                aria-labelledby="fee-period-reopened-title"
                className="status-banner fee-period-reopened-banner stack-tight"
                data-pd-id="fee-period-review.reopened-state"
                role="status"
              >
                <div>
                  <span aria-hidden="true" className="material-symbols-outlined">history</span>
                  <h3 id="fee-period-reopened-title">Reopened Review Awaiting Confirmation</h3>
                </div>
                <p>
                  Revision {currentRevisionNumber} was recalculated from the latest
                  settled ledger values. Compare it with the earlier revision below, then select
                  <strong> Confirm Fees Earned</strong> to lock the corrected figures.
                </p>
              </section>
            ) : null}

            {existingPeriod ? (
              <details
                className="content-subpanel stack-tight fee-revision-audit"
                data-pd-id="fee-period-review.revision-audit"
                open={isReopenedReview || (existingPeriod.corrections ?? []).length > 0}
              >
                <summary>
                  <span>Revision Audit</span>
                  <span className="status-chip status-chip-neutral">
                    {currentRevisionNumber} revision{currentRevisionNumber === 1 ? "" : "s"}
                  </span>
                </summary>
                <p className="supporting-copy">
                  Each recalculation is retained. Reopening never overwrites the originally confirmed fee review.
                </p>
                {revisionsPeriodId !== existingPeriod.fee_period_id ? (
                  <LedgerLoadingIndicator label="Loading fee revision audit" />
                ) : revisionAuditError ? (
                  <div className="validation-message" role="alert">{revisionAuditError}</div>
                ) : (
                  <>
                    <ol className="fee-revision-list" aria-label="Fee review revision history">
                      {revisions.map((revision) => {
                        const isCurrent = revision.revision_number === currentRevisionNumber;
                        return (
                          <li className={isCurrent ? "is-current" : ""} key={revision.fee_revision_id}>
                            <div className="fee-revision-heading">
                              <div>
                                <strong>Revision {revision.revision_number}</strong>
                                {isCurrent ? <span className="status-chip status-chip-positive">Current</span> : null}
                              </div>
                              <time dateTime={revision.created_at}>{formatAuditDate(revision.created_at)}</time>
                            </div>
                            <dl className="fee-revision-values">
                              <div><dt>Settled Profit</dt><dd>{formatMoney(Number(revision.eligible_period_profit))}</dd></div>
                              <div><dt>Fee Base</dt><dd>{formatMoney(Number(revision.fee_base))}</dd></div>
                              <div><dt>Total Fee</dt><dd>{formatMoney(Number(revision.total_fee_due))}</dd></div>
                            </dl>
                            <p><strong>Reason:</strong> {revision.change_reason || "Initial monthly fee review"}</p>
                            <small>Recorded by {revision.created_by}</small>
                          </li>
                        );
                      })}
                    </ol>
                    {(existingPeriod.corrections ?? []).length > 0 ? (
                      <section className="stack-tight" aria-labelledby="fee-correction-audit-title">
                        <h4 id="fee-correction-audit-title">Post-Withdrawal Corrections</h4>
                        <ul className="fee-correction-list" aria-label="Recorded fee corrections">
                          {(existingPeriod.corrections ?? []).map((correction) => (
                            <li key={correction.fee_correction_id}>
                              <strong>{correction.adjustment_type === "fee_credit" ? "Fee Credit" : "Fee Debit"}</strong>
                              <span>{formatMoney(Number(correction.amount))} · {correction.state}</span>
                              <small>{correction.reason}</small>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </>
                )}
              </details>
            ) : null}

            {existingPeriod?.state === "crystallised" ? (
              <section
                aria-labelledby="fee-period-withdrawal-title"
                className="content-subpanel stack-tight"
                data-pd-id="fee-period-review.withdrawal"
              >
                <h3 id="fee-period-withdrawal-title">Mark as Withdrawn</h3>
                <div className="form-grid fee-withdrawal-grid">
                  <label className="field-control">
                    <span>Management Fee</span>
                    <input
                      aria-describedby="fee-period-management-outstanding"
                      data-pd-id="fee-period-review.withdrawal.management"
                      max={managementOutstanding.toFixed(2)}
                      min="0"
                      onChange={(event) => setManagementWithdrawal(event.target.value)}
                      step="0.01"
                      type="number"
                      value={managementWithdrawalValue}
                    />
                    <small id="fee-period-management-outstanding">
                      {formatMoney(managementOutstanding)} outstanding
                    </small>
                  </label>
                  <label className="field-control">
                    <span>Investment Fee</span>
                    <input
                      aria-describedby="fee-period-investment-outstanding"
                      data-pd-id="fee-period-review.withdrawal.investment"
                      max={investmentOutstanding.toFixed(2)}
                      min="0"
                      onChange={(event) => setInvestmentWithdrawal(event.target.value)}
                      step="0.01"
                      type="number"
                      value={investmentWithdrawalValue}
                    />
                    <small id="fee-period-investment-outstanding">
                      {formatMoney(investmentOutstanding)} outstanding
                    </small>
                  </label>
                  <label className="field-control">
                    <span>Withdrawal Date</span>
                    <input
                      data-pd-id="fee-period-review.withdrawal.date"
                      onChange={(event) => setWithdrawalDate(event.target.value)}
                      type="date"
                      value={withdrawalDate}
                    />
                  </label>
                  <label className="field-control">
                    <span>Paid to Account</span>
                    <input
                      data-pd-id="fee-period-review.withdrawal.account"
                      onChange={(event) => setWithdrawalAccount(event.target.value)}
                      placeholder="Demo Bank"
                      type="text"
                      value={withdrawalAccount}
                    />
                  </label>
                </div>
              </section>
            ) : null}

            {existingPeriod?.state === "crystallised" ? (
              <details className="content-subpanel stack-tight fee-correction-controls">
                <summary className="eyebrow">Correction Controls</summary>
                {feeWithdrawnAmount <= 0 ? (
                  <div className="stack-tight">
                    <h3>Reopen Confirmed Review</h3>
                    <label className="field-control">
                      <span>Reason for Reopening</span>
                      <textarea
                        aria-describedby="fee-reopen-help"
                        data-pd-id="fee-period-review.reopen.reason"
                        maxLength={1000}
                        onChange={(event) => setReopenReason(event.target.value)}
                        rows={3}
                        value={reopenReason}
                      />
                      <small id="fee-reopen-help">The original revision remains in the audit history.</small>
                    </label>
                    <button
                      className="button-link"
                      data-pd-id="fee-period-review.reopen.action"
                      disabled={!reopenReason.trim() || isCorrectionSaving}
                      onClick={() => void reopenConfirmedPeriod()}
                      type="button"
                    >
                      Reopen and Recalculate
                    </button>
                  </div>
                ) : (
                  <div className="stack-tight">
                    <h3>Record Fee Credit or Debit</h3>
                    <div className="form-grid fee-correction-grid">
                      <label className="field-control">
                        <span>Corrected Total Fee</span>
                        <input
                          aria-describedby="corrected-fee-help"
                          data-pd-id="fee-period-review.correction.corrected-fee"
                          min="0"
                          onChange={(event) => setCorrectedFeeDue(event.target.value)}
                          step="0.01"
                          type="number"
                          value={correctedFeeDueValue}
                        />
                        <small id="corrected-fee-help">Enter the total fee that should have been charged, not the difference.</small>
                      </label>
                      <label className="field-control field-span-2">
                        <span>Correction Reason</span>
                        <textarea
                          data-pd-id="fee-period-review.correction.reason"
                          maxLength={1000}
                          onChange={(event) => setCorrectionReason(event.target.value)}
                          rows={3}
                          value={correctionReason}
                        />
                      </label>
                      <label className="checkbox-field field-span-2">
                        <input
                          checked={profileClosing}
                          data-pd-id="fee-period-review.correction.profile-closing"
                          onChange={(event) => setProfileClosing(event.target.checked)}
                          type="checkbox"
                        />
                        <span>Profile is closing; report an unused credit as a refund due</span>
                      </label>
                    </div>
                    <button
                      className="button-link"
                      data-pd-id="fee-period-review.correction.action"
                      disabled={
                        !correctionReason.trim() ||
                        !Number.isFinite(Number(correctedFeeDueValue)) ||
                        Number(correctedFeeDueValue) < 0 ||
                        Number(correctedFeeDueValue) === Number(existingPeriod.current_revision.total_fee_due) ||
                        isCorrectionSaving
                      }
                      onClick={() => void recordFeeCorrection()}
                      type="button"
                    >
                      Record Fee Correction
                    </button>
                  </div>
                )}
              </details>
            ) : null}

            {preview.blockers.length > 0 ? (
              <section
                aria-labelledby="fee-period-blockers-title"
                className="validation-message fee-period-action-required stack-tight"
                data-pd-id="fee-period-review.action-required"
                role="alert"
              >
                <h3 id="fee-period-blockers-title">Blocking This Fee Review</h3>
                <ul>
                  {groupedBlockers.map(([ledger, blockers]) => {
                    const ledgerLabel = blockerLedgerLabel(ledger);
                    const recordIds = blockers.map((blocker) => blocker.record_id);
                    const blockerHref = buildFeeReviewLedgerHref({
                      profileId,
                      profileName,
                      month,
                      ledger,
                      recordIds,
                      returnHref: buildFeeReviewReturnHref(profileId, month),
                    });
                    return (
                      <li key={ledger}>
                        <span>
                          {blockers.map((blocker) => (
                            <span key={`${blocker.record_id}-${blocker.reason}`}>
                              {blockerLabel(blocker.reason)}: {blocker.record_id}
                            </span>
                          ))}
                        </span>
                        {ledgerLabel ? (
                          <Link
                            aria-label={`Resolve ${recordIds.length} ${ledgerLabel} fee review blocker${recordIds.length === 1 ? "" : "s"}`}
                            className="report-action-link fee-period-blocker-link"
                            data-pd-id={`fee-period-review.blockers.${ledger}`}
                            href={blockerHref}
                            title={`Resolve fee review blockers in ${ledgerLabel}`}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
                            Resolve {recordIds.length} in {ledgerLabel}
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section
              aria-label="All tracker actions"
              className="content-subpanel stack-tight fee-period-tracker-actions"
              data-pd-id="fee-period-review.all-tracker-actions"
            >
              <h3>All Tracker Actions</h3>
              <p>
                These totals match the profile directory. Only records listed under
                <strong> Blocking This Fee Review</strong> prevent this month from being calculated.
              </p>
              <div className="fee-period-action-links">
                {trackerActions.map((action) => {
                  const requiresAction = action.count > 0;
                  const accessibleLabel = requiresAction
                    ? `Open ${profileName} ${action.label} rows requiring action`
                    : `Open ${profileName} ${action.label} ledger`;
                  return (
                    <Link
                      aria-label={accessibleLabel}
                      className={`report-value-link profile-action-link ${requiresAction ? "report-value-link-urgent" : "is-inactive-action"}`}
                      href={buildOperationalLedgerHref(
                        profileId,
                        action.ledger,
                        requiresAction ? "all" : null
                      )}
                      key={action.ledger}
                      title={accessibleLabel}
                    >
                      <span aria-hidden="true" className="profile-action-icon-wrap">
                        <span className="material-symbols-outlined profile-action-icon">
                          {action.icon}
                        </span>
                        {requiresAction ? (
                          <strong className="profile-action-count">
                            {action.count > 9 ? "9+" : action.count}
                          </strong>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <footer className="modal-sticky-footer fee-period-review-footer">
        <span id="fee-period-action-reason">{primaryDisabledReason}</span>
        <button className="button-link" onClick={onClose} type="button">Close</button>
        <button
          aria-describedby={primaryDisabledReason ? "fee-period-action-reason" : undefined}
          className="modal-primary-button"
          data-pd-id="fee-period-review.primary-action"
          disabled={Boolean(primaryDisabledReason) || isSaving}
          onClick={() => void runPrimaryAction()}
          type="button"
        >
          {isSaving
            ? "Saving"
            : existingPeriod?.state === "ready_to_crystallise"
              ? "Confirm Fees Earned"
              : existingPeriod?.state === "crystallised"
                ? Number(existingPeriod.fee_outstanding_amount) > 0
                  ? "Mark as Withdrawn"
                  : "Fees Withdrawn"
                : "Prepare Fee Review"}
        </button>
      </footer>
    </dialog>
  );
}
