import type { CombinedLedgerModule } from "@/lib/profile-scope";

export type LedgerWarningTarget = { label: string; stage: string; field: string };

/** Copy for the approved compact warning row; source predicates still decide whether it exists. */
export function ledgerWarningPresentation(module: CombinedLedgerModule, label: string) {
  const target = ledgerWarningTarget(module, label);
  const lower = label.toLowerCase();
  const message = lower.includes("not recorded") || lower.includes("no ") || lower.includes("needed")
    ? "Not recorded or awaiting review."
    : lower.includes("unplaced") || lower.includes("not confirmed")
      ? "Placement confirmation is not recorded."
      : lower.includes("overdue")
        ? "The recorded review point has passed."
        : "Recorded evidence needs review.";
  const actionLabel = lower.includes("back unplaced") ? "Review Back confirmation"
    : target.field === "Lay Stake" ? "Review Lay Stake"
      : lower.includes("historical") ? "Review Historical P&L"
        : lower.includes("scope") ? "Review Scope"
          : lower.includes("no account") ? "Review Account"
      : target.field === "Result" ? "Review settlement"
        : `Review ${target.field}`;
  return { label, message, actionLabel };
}

/** Presentation routing only. The owning editor keeps validation and Save authority. */
export function ledgerWarningTarget(module: CombinedLedgerModule, label: string): LedgerWarningTarget {
  const lower = label.toLowerCase();
  if (module === "sportsbook-bets") {
    if (lower.includes("lay recheck")) return { label, stage: "placement", field: "Lay Stake" };
    if (lower.includes("back unplaced")) return { label, stage: "placement", field: "Back placement" };
    if (lower.includes("settle date")) return { label, stage: "setup", field: "Settles" };
    return { label, stage: "settlement", field: "Result" };
  }
  if (module === "free-bets") {
    if (lower.includes("expiry")) return { label, stage: "setup", field: "Expiry" };
    if (lower.includes("back unplaced")) return { label, stage: "matching", field: "Back confirmation" };
    if (lower.includes("settle date")) return { label, stage: "setup", field: "Settles" };
    return { label, stage: "settlement", field: "Result" };
  }
  if (module === "casino-offers") {
    if (lower.includes("unplaced")) return { label, stage: "setup", field: "Placement" };
    if (lower.includes("settle date")) return { label, stage: "setup", field: "Settles" };
    return { label, stage: "settlement", field: lower.includes("value") ? "Final Value" : "Result" };
  }
  if (module === "each-way-extra-places") {
    if (lower.includes("outcome")) return { label, stage: "settlement", field: "Result" };
    if (lower.includes("historical")) return { label, stage: "settlement", field: "Imported realised P&L" };
    return { label, stage: "calculate", field: label.replace(/ needed$/i, "") };
  }
  if (module === "cash-adjustments") {
    if (lower.includes("scope")) return { label, stage: "scope", field: "Affects investment" };
    return { label, stage: "scope", field: "Linked account" };
  }
  if (lower.includes("balance")) return { label, stage: "balance", field: "Current balance" };
  if (lower.includes("restriction")) return { label, stage: "restrictions", field: "Restrictions" };
  return { label, stage: "details", field: "Status" };
}

export function focusLedgerWarningField(field: string) {
  // Native dialog focus is installed after mount; run after that initial focus pass.
  window.setTimeout(() => {
    const context = document.querySelector<HTMLElement>("[data-ledger-warning-context]");
    if (!context) return;
    const root = context.closest("form") ?? context.closest('[role="dialog"]') ?? document;
    const visible = (element: HTMLElement) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
    const fieldName = field.toLowerCase();
    const labels = [...root.querySelectorAll<HTMLLabelElement>("label")].filter(visible);
    const match = labels.find(label => label.textContent?.trim().toLowerCase().startsWith(fieldName));
    const labelledControl = match?.control instanceof HTMLElement ? match.control : null;
    const control = (labelledControl && visible(labelledControl) ? labelledControl : null)
      ?? match?.querySelector<HTMLElement>("input,select,textarea,button")
      ?? [...root.querySelectorAll<HTMLElement>("input,select,textarea,button")].find(element =>
        visible(element) && element.getAttribute("aria-label")?.toLowerCase().startsWith(fieldName));
    const guardedEdit = context.closest('[role="dialog"]')?.querySelector<HTMLElement>('button[aria-label="Edit cash-adjustment row"]');
    const destination = control && visible(control) && !control.hasAttribute("disabled")
      ? control : guardedEdit && visible(guardedEdit) ? guardedEdit : context;
    destination?.focus({ preventScroll: true });
    destination?.scrollIntoView({ block: "center", inline: "nearest" });
  }, 80);
}
