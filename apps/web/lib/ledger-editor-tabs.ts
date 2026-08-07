export type LedgerEditorTabStatus = "complete" | "warning" | "invalid" | "locked" | "neutral";

export type LedgerEditorTabDefinition = {
  id: string;
  label: string;
  status: LedgerEditorTabStatus;
  requiredIssueCount?: number;
  warningIssueCount?: number;
  summary?: string;
};

export function getFirstInvalidLedgerEditorTab(
  tabs: LedgerEditorTabDefinition[]
): LedgerEditorTabDefinition | null {
  return tabs.find((tab) => tab.status === "invalid") ?? null;
}

export function getLedgerEditorTabBadgeLabel(tab: LedgerEditorTabDefinition): string {
  const issueCount = tab.requiredIssueCount ?? 0;
  const warningCount = tab.warningIssueCount ?? 0;

  if (tab.status === "invalid" && issueCount > 0) return String(issueCount);
  if (tab.status === "warning" && warningCount > 0) return String(warningCount);
  if (tab.status === "locked") return "Locked";
  if (tab.status === "complete") return "Done";
  return "";
}

export function getLedgerEditorTabStatusLabel(tab: LedgerEditorTabDefinition): string {
  const badge = getLedgerEditorTabBadgeLabel(tab);

  if (tab.status === "invalid") {
    return badge ? `${tab.label}: ${badge} required items` : `${tab.label}: requires attention`;
  }
  if (tab.status === "warning") {
    return badge ? `${tab.label}: ${badge} warnings` : `${tab.label}: warning`;
  }
  if (tab.status === "locked") return `${tab.label}: locked`;
  if (tab.status === "complete") return `${tab.label}: complete`;
  return `${tab.label}: not started`;
}

export function getNextLedgerEditorTabId(
  tabs: LedgerEditorTabDefinition[],
  activeTabId: string,
  direction: "next" | "previous"
): string {
  const navigableTabs = tabs.filter((tab) => tab.status !== "locked");
  if (navigableTabs.length === 0) return activeTabId;
  const currentIndex = Math.max(
    0,
    navigableTabs.findIndex((tab) => tab.id === activeTabId)
  );
  const offset = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + offset + navigableTabs.length) % navigableTabs.length;
  return navigableTabs[nextIndex]?.id ?? activeTabId;
}
