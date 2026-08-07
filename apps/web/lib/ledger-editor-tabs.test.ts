import { describe, expect, it } from "vitest";
import {
  getFirstInvalidLedgerEditorTab,
  getLedgerEditorTabBadgeLabel,
  getLedgerEditorTabStatusLabel,
  getNextLedgerEditorTabId,
  type LedgerEditorTabDefinition,
} from "./ledger-editor-tabs";

const tabs: LedgerEditorTabDefinition[] = [
  { id: "setup", label: "Setup", status: "complete" },
  { id: "matching", label: "Matching", requiredIssueCount: 2, status: "invalid" },
  { id: "settlement", label: "Settlement", status: "neutral" },
];

describe("ledger editor tab helpers", () => {
  it("finds the first invalid tab", () => {
    expect(getFirstInvalidLedgerEditorTab(tabs)?.id).toBe("matching");
    expect(getFirstInvalidLedgerEditorTab([{ id: "a", label: "A", status: "complete" }])).toBeNull();
  });

  it("returns accessible status labels and compact badges", () => {
    expect(getLedgerEditorTabBadgeLabel(tabs[0])).toBe("Done");
    expect(getLedgerEditorTabBadgeLabel(tabs[1])).toBe("2");
    expect(getLedgerEditorTabStatusLabel(tabs[1])).toBe("Matching: 2 required items");
    expect(getLedgerEditorTabStatusLabel({ id: "a", label: "Advanced", status: "locked" })).toBe(
      "Advanced: locked"
    );
  });

  it("wraps keyboard navigation across tab ids", () => {
    expect(getNextLedgerEditorTabId(tabs, "setup", "next")).toBe("matching");
    expect(getNextLedgerEditorTabId(tabs, "setup", "previous")).toBe("settlement");
    expect(getNextLedgerEditorTabId(tabs, "unknown", "next")).toBe("matching");
  });

  it("skips locked tabs during keyboard navigation", () => {
    const tabsWithLockedBridge: LedgerEditorTabDefinition[] = [
      { id: "setup", label: "Setup", status: "complete" },
      { id: "settlement", label: "Settlement", status: "complete" },
      { id: "free_bet", label: "Free Bet", status: "locked" },
    ];

    expect(getNextLedgerEditorTabId(tabsWithLockedBridge, "settlement", "next")).toBe("setup");
    expect(getNextLedgerEditorTabId(tabsWithLockedBridge, "setup", "previous")).toBe("settlement");
  });
});
