import type { CombinedLedgerModule } from "@/lib/profile-scope";

export type LedgerWarningTarget = { label: string; stage: string; field: string; instruction?: string };

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
  const actionLabel = lower.includes("back unplaced") ? module === "free-bets" ? "Review placement status" : "Review Back confirmation"
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
    if (lower.includes("settle date")) return { label, stage: "settlement", field: "Settles" };
    return { label, stage: "settlement", field: "Result" };
  }
  if (module === "free-bets") {
    if (lower.includes("expiry")) return { label, stage: "settlement", field: "Expiry" };
    if (lower.includes("back unplaced")) return { label, stage: "settlement", field: "Status", instruction: "Review Status and actual placement evidence. Changing Status does not itself confirm an external Back placement." };
    if (lower.includes("settle date")) return { label, stage: "settlement", field: "Settles" };
    return { label, stage: "settlement", field: "Result" };
  }
  if (module === "casino-offers") {
    if (lower.includes("unplaced")) return { label, stage: "settlement", field: "Status" };
    if (lower.includes("settle date")) return { label, stage: "settlement", field: "Status", instruction: "Settles is recorded through this record’s existing Review settlement action; the main form has no separate Settles input. Review Status here without inventing a date." };
    return { label, stage: "settlement", field: lower.includes("value") ? "Net Result" : "Result" };
  }
  if (module === "each-way-extra-places") {
    if (lower.includes("outcome") || lower.includes("result")) return { label, stage: "settlement", field: "Result" };
    if (lower.includes("historical")) return { label, stage: "settlement", field: "Imported realised P&L" };
    if (lower.includes("placement not confirmed")) return { label, stage: "settlement", field: "Status", instruction: "Review recorded Status and placement evidence before saving. Status alone does not confirm an external bet." };
    return { label, stage: "calculate", field: label.replace(/ needed$/i, "") };
  }
  if (module === "cash-adjustments") {
    if (lower.includes("scope")) return { label, stage: "scope", field: "Affects investment" };
    return { label, stage: "scope", field: "Linked account" };
  }
  if (lower.includes("pending withdrawal")) return { label, stage: "balance", field: "Pending withdrawal" };
  if (lower.includes("balance")) return { label, stage: "balance", field: "Current balance" };
  if (lower.includes("restriction")) return { label, stage: "restrictions", field: "Account restrictions" };
  return { label, stage: "details", field: "Signup / lifecycle" };
}

export function focusLedgerWarningField(field: string, context: HTMLElement) {
  if (!context.isConnected) return;
  const root = context.closest<HTMLElement>('[data-pd-id$=".editor.dialog"], [data-pd-id$=".editor.workbench-surface"], [role="dialog"]') ?? context.closest("form") ?? context.parentElement;
  if (!root) return;
  const visible = (element: HTMLElement) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  const fieldName = field.toLowerCase();
  const labels = [...root.querySelectorAll<HTMLLabelElement>("label")].filter(visible);
  const match = labels.find(label => label.textContent?.trim().toLowerCase().startsWith(fieldName));
  const labelledControl = match?.control instanceof HTMLElement ? match.control : null;
  const labelledGroup = [...root.querySelectorAll<HTMLElement>('[role="group"][aria-label]')].find(group =>
    visible(group) && group.getAttribute("aria-label")?.toLowerCase().startsWith(fieldName));
  const control = (labelledControl && visible(labelledControl) ? labelledControl : null)
    ?? match?.querySelector<HTMLElement>("input,select,textarea,button")
    ?? labelledGroup?.querySelector<HTMLElement>("button:not([disabled]),input:not([disabled])")
    ?? [...root.querySelectorAll<HTMLElement>("input,select,textarea,button")].find(element =>
      visible(element) && element.getAttribute("aria-label")?.toLowerCase().startsWith(fieldName));
  const guardedEdit = root.querySelector<HTMLElement>('button[aria-label="Edit cash-adjustment row"]');
  const destination = control && visible(control) && !control.hasAttribute("disabled")
    ? control : guardedEdit && visible(guardedEdit) ? guardedEdit : context;
  destination.focus({ preventScroll: true });
  destination.scrollIntoView({ block: "center", inline: "nearest" });
}
