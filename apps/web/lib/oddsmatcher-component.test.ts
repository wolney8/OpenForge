// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OddsMatcherShell } from "@/components/oddsmatcher-shell";
import { defaultOddsMatcherPreferences, type OddsMatcherFeed, type OddsMatcherOpportunity } from "./oddsmatcher";

function opportunity(index: number): OddsMatcherOpportunity {
  return {
    opportunity_id: `opp-${String(index).padStart(2, "0")}`, provider: "The Odds API",
    competition_key: "soccer_epl", competition: "Premier League", event_id: `event-${index}`,
    event_name: `Demo City ${index} v Demo United ${index}`,
    starts_at: `2026-10-${String(24 + (index % 5)).padStart(2, "0")}T15:00:00Z`,
    selection_key: index % 3 === 0 ? "DRAW" : "HOME", selection: index % 3 === 0 ? "Draw" : `Demo City ${index}`,
    market_key: "h2h", market: "Match Odds / 1X2",
    back: { provider_key: "bookmaker_a", provider_name: "Bookmaker A", account_name: "Bookmaker A", odds: "4.5", observed_at: "2026-10-23T12:00:00Z", link: "https://example.invalid/back" },
    lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.7", observed_at: "2026-10-23T12:00:05Z", link: "https://example.invalid/lay" },
    display_rating: String(95 + index / 100), commission_aware_rating: "94.00", exchange_commission: "0.02", commission_origin: "profile-account",
    standard_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", conservative_result: "-1.09",
    liquidity_state: "UNKNOWN", freshness: "fresh", age_seconds: 30,
    back_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-b" },
    lay_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-l" },
    can_create_prospecting_draft: true,
  };
}

const feed: OddsMatcherFeed = {
  provider: "The Odds API", fetched_at: "2026-10-23T12:00:10Z", state: "fresh", warning: null,
  manual_refresh_only: true, competitions: ["Premier League", "Championship", "UEFA Champions League"],
  event_count: 12, bookmaker_count: 9, exchange_count: 3, credits_used_today: 3,
  provider_credits_used: 3, provider_credits_remaining: 497, daily_credit_ceiling: 25,
  opportunities: Array.from({ length: 34 }, (_, index) => opportunity(index)), excluded: [],
};

describe("OddsMatcherShell", () => {
  let container: HTMLDivElement;
  let root: Root;
  let requests: { url: string; method: string; body: unknown }[];

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("crypto", { randomUUID: () => "retry-token-0001" });
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
    requests = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      requests.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url.includes("/fund-manager/preferences/oddsmatcher")) return new Response(JSON.stringify(defaultOddsMatcherPreferences), { status: 200 });
      if (url.includes("/account-catalogue/source")) return new Response(JSON.stringify({ schema_version: "1.0", records: [] }), { status: 200 });
      if (url.endsWith("/profiles")) return new Response(JSON.stringify([{ profile_id: "profile-demo-001", display_name: "Synthetic Alpha", status: "active" }]), { status: 200 });
      if (url.includes("matched-betting/preview")) return new Response(JSON.stringify({ selected_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09", outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "35.00", exchange_component: "-35.59", total: "-1.09" }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: "9.43", total: "-0.57" }] }), { status: 200 });
      if (url.includes("prospecting-drafts")) return new Response(JSON.stringify({ created: true, sportsbook_bet: { sportsbook_bet_id: "ODD-DEMO" } }), { status: 201 });
      return new Response(JSON.stringify(feed), { status: 200 });
    }));
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  });

  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); document.querySelectorAll("dialog").forEach(dialog => dialog.remove()); });

  it("loads a saved snapshot without provider refresh and paginates the full filtered set", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });
    expect(requests[0]).toMatchObject({ method: "GET" });
    expect(requests.some(request => request.url.endsWith("/refresh"))).toBe(false);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(16);
    expect(container.textContent).toContain("Page 1 of 3 · 34 rows");
    const next = [...container.querySelectorAll("button")].find(button => button.textContent === "Next");
    act(() => next?.click());
    expect(container.textContent).toContain("Page 2 of 3 · 34 rows");
  });

  it("keeps last-good rows visible and coalesces repeat activation while refreshing", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const original = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/oddsmatcher/refresh")) {
        requests.push({ url: String(input), method: init?.method ?? "GET", body: null });
        await pending;
        return new Response(JSON.stringify(feed), { status: 200 });
      }
      return original!(input, init);
    });
    const refresh = container.querySelector<HTMLButtonElement>('[data-pd-id="oddsmatcher.refresh"]');
    await act(async () => { refresh?.click(); await Promise.resolve(); });
    expect(refresh?.getAttribute("aria-busy")).toBe("true");
    expect(refresh?.getAttribute("aria-label")).toBe("Refreshing odds");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(16);
    refresh?.click();
    expect(requests.filter((request) => request.url.includes("/oddsmatcher/refresh"))).toHaveLength(1);
    await act(async () => { release?.(); await pending; });
    expect(refresh?.getAttribute("aria-busy")).toBe("false");
  });

  it("uses one global tool and requires explicit Profile context for Tracker drafts", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell)); });
    expect(requests.some(request => request.url.endsWith("/oddsmatcher"))).toBe(true);
    expect(container.textContent).toContain("No Profile / All opportunities");
    expect(container.textContent).toContain("Choose a Profile to check Account eligibility and add to Tracker");
    const add = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Add Prospecting Draft");
    expect(add).toBeUndefined();
  });

  it("shows unknown liquidity, live calculator results and creates only an explicit Prospecting draft", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });
    expect(container.textContent).toContain("Unavailable");
    const summary = container.querySelector<HTMLButtonElement>('button[aria-label^="Open Bet Summary"]');
    await act(async () => { summary?.click(); });
    const liquidityStatus = document.body.querySelector<HTMLButtonElement>('button[aria-label^="Liquidity unavailable"]');
    await act(async () => { liquidityStatus?.focus(); });
    expect(document.body.textContent).toContain("This provider supplies a lay price but not available exchange depth");
    expect(document.body.textContent).toContain("Lay Stake");
    expect(document.body.textContent).toContain("Total Profit");
    expect(document.body.textContent).not.toContain("Place Bet");
    const add = [...document.body.querySelectorAll("button")].find(button => button.textContent === "Add Prospecting Draft");
    await act(async () => { add?.click(); });
    const request = requests.find(item => item.url.includes("prospecting-drafts"));
    expect(request?.body).toMatchObject({ opportunity_id: expect.any(String), retry_token: "retry-token-0001", strategy: "Standard" });
    expect(document.body.textContent).toContain("No balance or placed-bet state changed");
  });

  it("keeps manual odds until Reset to latest quotes", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });
    const summary = container.querySelector<HTMLButtonElement>('button[aria-label^="Open Bet Summary"]');
    await act(async () => { summary?.click(); });
    const backOdds = document.body.querySelector<HTMLInputElement>('input[aria-label="Back Odds"]');
    await act(async () => {
      if (backOdds) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(backOdds, "4.6");
        backOdds.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    const autoBack = document.body.querySelector<HTMLButtonElement>('button[aria-label="Auto update back odds"]') ?? [...document.body.querySelectorAll<HTMLButtonElement>('button[role="switch"]')].find(button => button.textContent?.includes("Auto update back odds"));
    expect(autoBack?.getAttribute("aria-checked")).toBe("false");
    const reset = [...document.body.querySelectorAll("button")].find(button => button.textContent === "Reset to latest quotes");
    await act(async () => { reset?.click(); });
    expect(autoBack?.getAttribute("aria-checked")).toBe("true");
  });

  it("preserves normal inputs and results when Advanced is toggled", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });
    const summary = container.querySelector<HTMLButtonElement>('button[aria-label^="Open Bet Summary"]');
    await act(async () => { summary?.click(); });
    const advanced = document.body.querySelector<HTMLButtonElement>('[data-pd-id="oddsmatcher.advanced"]');
    expect(document.body.textContent).toContain("Back Stake");
    expect(document.body.textContent).toContain("Total Profit");
    await act(async () => { advanced?.click(); });
    expect(document.body.textContent).toContain("Underlay");
    expect(document.body.textContent).toContain("Current Lay Stake");
    expect(document.body.textContent).toContain("Back Stake");
    await act(async () => { advanced?.click(); });
    expect(document.body.textContent).not.toContain("Range Min");
    expect(document.body.textContent).toContain("Total Profit");
  });
});
