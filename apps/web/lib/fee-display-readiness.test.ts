import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FeeCentreBreakdownDrawer } from "../components/fee-centre-breakdown-drawer";
import { FeePeriodReviewDialog } from "../components/fee-period-review-dialog";
import type { FeePeriodApiRecord } from "./fee-period-summary";

vi.mock("../components/financial-motion-preference", () => ({
  useFinancialMotionPreference: () => ({ enabled: false, ready: true, reducedMotion: false,
    replayDelayMs: 1500, durationMs: 520, staggerMs: 80 }),
}));

let element: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(() => new Promise(() => {}));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  element = document.createElement("div");
  document.body.append(element);
  root = createRoot(element);
});
afterEach(() => {
  act(() => root.unmount());
  element.remove();
  vi.unstubAllGlobals();
});

function period(overrides: Partial<FeePeriodApiRecord["current_revision"]> = {}): FeePeriodApiRecord {
  return { fee_period_id: "synthetic-fee-1", profile_id: "USER-001", period_start: "2026-08-01",
    period_end: "2026-08-31", state: "crystallised", fee_withdrawn_amount: "10.00",
    fee_outstanding_amount: "40.00", current_revision: {
      eligible_period_profit: "100.00", opening_loss_carryforward: "0.00", fee_base: "100.00",
      management_fee_amount: "40.00", investment_fee_amount: "10.00", total_fee_due: "50.00",
      ...overrides,
    } };
}
function drawerProps(record = period()): ComponentProps<typeof FeeCentreBreakdownDrawer> {
  return { cashAdjustmentTotal: NaN, month: "2026-08", monthLabel: "August 2026", open: true,
    profileId: "USER-001", profileName: "Synthetic Profile", profileCode: "DEMO-001",
    onClose: vi.fn(), onReview: vi.fn(), result: {
      state: "part_withdrawn", period: record, feesEarned: 50, feesWithdrawn: 10, availableToWithdraw: 40,
    } };
}
function field(label: string) {
  const dt = Array.from(element.querySelectorAll("dt")).find((node) => node.textContent?.startsWith(label));
  expect(dt, label).toBeDefined();
  return dt!.nextElementSibling!;
}
function display(node: Element | null | undefined) {
  return node?.querySelector(".financial-value-canonical-text")?.textContent ?? node?.textContent;
}
async function renderDrawer(props = drawerProps()) {
  await act(async () => { root.render(createElement(FeeCentreBreakdownDrawer, props)); });
}
function preview(overrides: Record<string, unknown> = {}) {
  return { profile_id: "USER-001", period_start: "2026-08-01", period_end: "2026-08-31",
    calculation_state: "resolved", sportsbook_total: "-1234.56", sportsbook_count: 1,
    free_bet_total: "0.00", free_bet_count: 0, casino_total: "2234.56", casino_count: 1,
    eligible_period_profit: "1000.00", opening_loss_carryforward: "0.00", fee_base: "1000.00",
    management_fee_percent: "40.00", investment_fee_percent: "10.00",
    management_fee_amount: "400.00", investment_fee_amount: "100.00", total_fee_due: "500.00",
    blockers: [], ...overrides };
}
async function renderReview(payload: ReturnType<typeof preview>) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => payload });
  await act(async () => { root.render(createElement(FeePeriodReviewDialog, {
    open: true, profileId: "USER-001", profileName: "Synthetic Profile", trackingStartDate: "2026-01-01",
    periods: [], operationalActions: { sportsbook: 0, freeBets: 0, casinoOffers: 0, extraPlaces: 0 },
    initialMonth: "2026-08", onClose: vi.fn(), onPeriodsChanged: vi.fn(),
  })); });
}

it("does not invent zero for missing persisted module output or a blank fee output", async () => {
  await renderDrawer(drawerProps(period({ management_fee_amount: " ", fee_base_breakdown_json: JSON.stringify({
    module_totals: { sportsbook: "-1234.56", free_bet: "0.00" },
  }) })));
  expect(display(field("Sportsbook"))).toBe("£ (1,234.56)");
  expect(display(field("Free Bets"))).toBe("£ -");
  expect(display(field("Casino Offers"))).toBe("Unavailable");
  expect(display(field("Management Fee"))).toBe("Unavailable");
  expect(display(field("Cash Adjustments"))).toBe("Unavailable");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("keeps independently confirmed fees visible through performance loading and failure", async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await renderDrawer();
  expect(display(field("Sportsbook"))).toBe("Loading…");
  expect(display(field("Total Fee"))).toBe("£ 50.00");
  expect(display(field("Available to Withdraw"))).toBe("£ 40.00");
  await act(async () => { finish({ ok: false, status: 503 }); });
  expect(element.querySelector('[role="alert"]')?.textContent).toContain("503");
  expect(display(field("Sportsbook"))).toBe("Unavailable");
  expect(display(field("Total Fee"))).toBe("£ 50.00");
  expect(display(field("Available to Withdraw"))).toBe("£ 40.00");
});

it.each(["", " ", "NaN", "Infinity", null])("keeps unresolved preview money %j distinct from known zero", async (missing) => {
  await renderReview(preview({ sportsbook_total: missing, management_fee_amount: missing }));
  const cards = element.querySelectorAll(".fee-period-stat-strip .stat-card");
  expect(display(cards[0].querySelector("strong"))).toBe("Unavailable");
  expect(display(cards[1].querySelector("strong"))).toBe("£ -");
  expect(display(field("Management Fee"))).toBe("Unavailable");
  expect(display(field("Investment Fee"))).toBe("£ 100.00");
});

it("retains signed exact preview text and one accessible value without an aria-live announcement", async () => {
  await renderReview(preview());
  const value = element.querySelector(".fee-period-stat-strip .financial-value");
  expect(value?.getAttribute("aria-label")).toBe("£ (1,234.56)");
  expect(value?.querySelectorAll(".financial-value-canonical-text")).toHaveLength(1);
  expect(display(value)).toBe("£ (1,234.56)");
  expect(value?.getAttribute("aria-live")).toBeNull();
  expect(value?.getAttribute("data-money-motion")).toBe("none");
});

it.each(["loading", "error"] as const)("does not show a derived fee position while its source is %s", async (state) => {
  await renderDrawer({ ...drawerProps(), sourceState: state });
  expect(display(field("Available to Withdraw"))).toBe(state === "loading"
    ? "Loading Available fees…" : "Available fees unavailable");
  expect(element.querySelector(".fee-centre-state")?.textContent).toBe(state === "loading"
    ? "Loading fee position…" : "Fee position unavailable");
  expect(element.querySelector<HTMLButtonElement>('[data-pd-id="fees.breakdown.review"]')?.disabled).toBe(true);
  expect(display(field("Total Fee"))).toBe(state === "loading" ? "Loading…" : "Unavailable");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("does not retain an earlier preview under a failed parent fee source", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => preview() });
  const props = drawerProps();
  await renderDrawer(props);
  expect(display(field("Sportsbook"))).toBe("£ (1,234.56)");
  await renderDrawer({ ...props, sourceState: "error" });
  expect(display(field("Sportsbook"))).toBe("Unavailable");
  expect(display(field("Total Fee"))).toBe("Unavailable");
  expect(display(field("Available to Withdraw"))).toBe("Available fees unavailable");
});

it("a late response body from the previous month cannot replace the selected month", async () => {
  let finishOld!: (value: unknown) => void;
  let requestCount = 0;
  fetchMock.mockImplementation(() => {
    requestCount += 1;
    return Promise.resolve({ ok: true, json: () => requestCount === 1
      ? new Promise((resolve) => { finishOld = resolve; })
      : Promise.resolve(preview({ period_start: "2026-07-01", sportsbook_total: "12.34" })) });
  });
  await act(async () => { root.render(createElement(FeePeriodReviewDialog, {
    open: true, profileId: "USER-001", profileName: "Synthetic Profile", trackingStartDate: "2026-01-01",
    periods: [], operationalActions: { sportsbook: 0, freeBets: 0, casinoOffers: 0, extraPlaces: 0 },
    initialMonth: "2026-08", onClose: vi.fn(), onPeriodsChanged: vi.fn(),
  })); });
  const select = element.querySelector<HTMLSelectElement>('[data-pd-id="fee-period-review.month"]')!;
  await act(async () => { select.value = "2026-07"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  const sportsbookValue = () => display(element.querySelector(".fee-period-stat-strip .stat-card strong"));
  expect(sportsbookValue()).toBe("£ 12.34");
  await act(async () => { finishOld(preview({ sportsbook_total: "9999.99" })); });
  expect(select.value).toBe("2026-07");
  expect(sportsbookValue()).toBe("£ 12.34");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
