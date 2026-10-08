// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeeReportReviewQueueDialog,
  type FeeReportQueueEntry,
} from "@/components/fee-report-review-queue-dialog";

describe("FeeReportReviewQueueDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("paginates the complete queue in stable 16-row pages", () => {
    const entries: FeeReportQueueEntry[] = Array.from({ length: 34 }, (_, index) => ({
      key: `profile-${String(index).padStart(2, "0")}:2026-09`,
      profileId: `profile-${String(index).padStart(2, "0")}`,
      profileName: `Profile ${String(index).padStart(2, "0")}`,
      month: "2026-09",
      monthLabel: "September 2026",
      state: "review_required",
      amount: index,
    }));

    act(() => root.render(createElement(FeeReportReviewQueueDialog, {
      entries,
      label: "September 2026",
      onClose: () => undefined,
      onReview: () => undefined,
      open: true,
    })));

    expect(container.querySelectorAll("tbody tr")).toHaveLength(16);
    expect(container.textContent).toContain("Page 1 of 3 · 34 rows");
    expect(container.textContent).toContain("Profile 00");
    expect(container.textContent).not.toContain("Profile 16");

    const next = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Next"
    );
    act(() => next?.click());

    expect(container.querySelectorAll("tbody tr")).toHaveLength(16);
    expect(container.textContent).toContain("Page 2 of 3 · 34 rows");
    expect(container.textContent).toContain("Profile 16");
    expect(container.textContent).not.toContain("Profile 00");
  });
});
