import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LedgerPnlCard } from "../components/ledger-pnl-card";

const preference = vi.hoisted(() => ({ enabled: true, ready: true, reducedMotion: false,
  replayDelayMs: 1500, durationMs: 520, staggerMs: 80 }));
vi.mock("../components/financial-motion-preference", () => ({ useFinancialMotionPreference: () => preference }));
let element: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.assign(preference, { enabled: true, ready: true, reducedMotion: false });
  element = document.createElement("div"); document.body.append(element); root = createRoot(element);
});
afterEach(() => { act(() => root.unmount()); element.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function render(value: number, state: "loading" | "ready" | "error" = "ready") {
  act(() => root.render(createElement(LedgerPnlCard, { label: "Synthetic P&L", description: "Selected-range result", value, state })));
}
const money = () => element.querySelector<HTMLElement>(".financial-value")!;
const cycle = () => Number(money().dataset.moneyMotionCycle);
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

it("distinguishes pending, failed and authoritative zero without invented money", () => {
  render(0, "loading"); expect(element.textContent).toContain("Loading P&L"); expect(money()).toBeNull();
  render(0, "error"); expect(element.textContent).toContain("P&L unavailable"); expect(money()).toBeNull();
  render(0); expect(money().getAttribute("aria-label")).toBe("£ -"); expect(cycle()).toBe(0);
});

it.each([[1234567.89, "£ 1,234,567.89", "positive"], [-1234567.89, "£ (1,234,567.89)", "negative"], [NaN, "Unavailable", "neutral"]])(
  "retains exact canonical and accessible text for %s", (value, text, tone) => {
    render(value as number); tick(40);
    expect(money().getAttribute("aria-label")).toBe(text);
    expect(money().classList.contains("financial-value-" + tone)).toBe(true);
    expect(money().querySelector(".financial-value-canonical-text")?.textContent).toBe(text);
    expect(money().getAttribute("aria-live")).toBeNull();
  });

it("does not replay on equal data/rerenders; rapid changes follow delta and settle the latest", () => {
  render(20); const first = cycle(); tick(40); expect(money().dataset.moneyMotion).toBe("up");
  render(20); expect(cycle()).toBe(first);
  render(10); tick(40); expect(money().dataset.moneyMotion).toBe("down");
  render(-20); render(-10); tick(40); expect(money().dataset.moneyMotion).toBe("up");
  expect(money().getAttribute("aria-label")).toBe("£ (10.00)");
  tick(2500); expect(money().dataset.moneyMotion).toBe("none");
});

it("replays from the card label on every click, but respects hover cooldown", () => {
  render(5); tick(2000); const first = cycle();
  const label = element.querySelector(".eyebrow")!;
  act(() => label.dispatchEvent(new MouseEvent("click", { bubbles: true }))); expect(cycle()).toBe(first + 1);
  act(() => label.dispatchEvent(new MouseEvent("click", { bubbles: true }))); expect(cycle()).toBe(first + 2);
  act(() => element.querySelector("article")!.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
  expect(cycle()).toBe(first + 2);
  tick(2000);
  act(() => element.querySelector("article")!.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
  expect(cycle()).toBe(first + 3);
});

it.each(["disabled", "reduced"])("is static when motion is %s, including replay", (mode) => {
  if (mode === "disabled") preference.enabled = false; else preference.reducedMotion = true;
  render(-5); act(() => element.querySelector("article")!.click()); tick(100);
  expect(cycle()).toBe(0); expect(money().dataset.moneyMotion).toBe("none");
  expect(money().getAttribute("aria-label")).toBe("£ (5.00)");
});
