// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OddsMatcherShell } from "@/components/oddsmatcher-shell";
import { FundManagerOddsmatcherSettings } from "@/components/fund-manager-oddsmatcher-settings";
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
  data_source: "live", replay_snapshot_id: null, replay_captured_at: null,
  manual_refresh_only: true, competitions: ["Premier League", "Championship", "UEFA Champions League"],
  event_count: 12, bookmaker_count: 9, exchange_count: 3,
  provider_credits_used: 49, provider_credits_remaining: 451, provider_last_refresh_cost: 3,
  provider_quota_exhausted: false,
  opportunities: Array.from({ length: 34 }, (_, index) => opportunity(index)), excluded: [],
};

function emptyFeed(providerCreditsRemaining: number | null): OddsMatcherFeed {
  return {
    ...feed,
    fetched_at: null,
    state: "empty",
    warning: null,
    event_count: 0,
    bookmaker_count: 0,
    exchange_count: 0,
    provider_credits_used: null,
    provider_credits_remaining: providerCreditsRemaining,
    provider_last_refresh_cost: null,
    provider_quota_exhausted: false,
    opportunities: [],
  };
}

function isOddsMatcherFeedRequest(input: RequestInfo | URL) {
  const pathname = new URL(String(input), "http://localhost").pathname;
  return pathname === "/api/oddsmatcher" || pathname === "/oddsmatcher";
}

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
      if (url.includes("/oddsmatcher/snapshots")) return new Response(JSON.stringify([]), { status: 200 });
      if (url.includes("/account-catalogue/source")) return new Response(JSON.stringify({ schema_version: "1.0", records: [] }), { status: 200 });
      if (url.endsWith("/profiles")) return new Response(JSON.stringify([{ profile_id: "profile-demo-001", display_name: "Synthetic Alpha", status: "active" }]), { status: 200 });
      if (url.includes("matched-betting/preview")) {
        const payload = init?.body ? JSON.parse(String(init.body)) as { strategy?: string; manual_lay_stake?: string } : {};
        const selected = payload.strategy === "Underlay" ? "9.41" : payload.strategy === "Overlay" ? "13.18" : payload.strategy === "Custom" ? payload.manual_lay_stake || "10.14" : "10.14";
        return new Response(JSON.stringify({ selected_lay_stake: selected, reference_lay_stake_standard: "10.14", reference_lay_stake_underlay: "9.41", reference_lay_stake_overlay: "13.18", liability: "35.59", pnl_if_back_wins: "-1.09", pnl_if_lay_wins: "-0.57", matched_result: "-1.09", outcomes: [{ key: "back-wins", label: "Back wins", bookmaker_component: "35.00", exchange_component: "-35.59", total: "-1.09" }, { key: "lay-wins", label: "Lay wins", bookmaker_component: "-10.00", exchange_component: "9.43", total: "-0.57" }], strategy_references: [{ strategy: "Underlay", lay_stake: "9.41", liability: "", back_wins_total: "", back_loses_total: "" }, { strategy: "Standard", lay_stake: "10.14", liability: "", back_wins_total: "", back_loses_total: "" }, { strategy: "Overlay", lay_stake: "13.18", liability: "", back_wins_total: "", back_loses_total: "" }] }), { status: 200 });
      }
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

  it("shows a refresh instruction only when an empty snapshot can be refreshed", async () => {
    const original = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isOddsMatcherFeedRequest(input)) return new Response(JSON.stringify(emptyFeed(null)), { status: 200 });
      return original!(input, init);
    });

    await act(async () => { root.render(createElement(OddsMatcherShell)); });

    const state = container.querySelector<HTMLElement>(".oddsmatcher-provider-state");
    const refresh = container.querySelector<HTMLButtonElement>('[data-pd-id="oddsmatcher.refresh"]');
    expect(state?.querySelector("strong")?.textContent).toBe("No odds snapshot is loaded.");
    expect(state?.querySelector("p")?.textContent).toBe("Use Refresh once to make one bounded provider request across the approved competitions.");
    expect(refresh?.disabled).toBe(false);
  });

  it("shows provider exhaustion without contradictory Refresh guidance", async () => {
    const original = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isOddsMatcherFeedRequest(input)) return new Response(JSON.stringify(emptyFeed(0)), { status: 200 });
      return original!(input, init);
    });

    await act(async () => { root.render(createElement(OddsMatcherShell)); });

    const state = container.querySelector<HTMLElement>(".oddsmatcher-provider-state");
    const refresh = container.querySelector<HTMLButtonElement>('[data-pd-id="oddsmatcher.refresh"]');
    expect(state?.querySelector("strong")?.textContent).toBe("Provider quota exhausted.");
    expect([...state!.querySelectorAll("p")].map((node) => node.textContent)).toEqual([
      "No odds snapshot is loaded.",
    ]);
    expect(state?.textContent).not.toContain("Use Refresh");
    expect(refresh?.disabled).toBe(true);
  });

  it("keeps a stale last-good snapshot visible instead of rendering the no-snapshot state", async () => {
    const original = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isOddsMatcherFeedRequest(input)) return new Response(JSON.stringify({
        ...feed,
        state: "stale",
        warning: "Refresh failed. Showing the last successful data as stale.",
      }), { status: 200 });
      return original!(input, init);
    });

    await act(async () => { root.render(createElement(OddsMatcherShell)); });

    expect(container.querySelectorAll("tbody tr")).toHaveLength(16);
    expect(container.textContent).toContain("Refresh failed. Showing the last successful data as stale.");
    expect(container.textContent).not.toContain("No odds snapshot is loaded.");
  });

  it("loads a saved snapshot without provider refresh and disables live actions", async () => {
    const snapshotId = "20261023T120010000000Z-123456789abc";
    const original = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/fund-manager/preferences/oddsmatcher")) {
        return new Response(JSON.stringify({ ...defaultOddsMatcherPreferences, data_source: "replay", saved_snapshot_id: snapshotId, auto_update_back_odds: true, auto_update_lay_odds: true }), { status: 200 });
      }
      if (url.pathname.endsWith(`/oddsmatcher/snapshots/${snapshotId}`)) {
        return new Response(JSON.stringify({
          ...feed,
          state: "stale",
          data_source: "replay",
          replay_snapshot_id: snapshotId,
          replay_captured_at: feed.fetched_at,
          opportunities: feed.opportunities.map((row) => ({
            ...row,
            can_create_prospecting_draft: false,
            freshness: "stale",
            back: { ...row.back, link: null },
            lay: { ...row.lay, link: null },
          })),
        }), { status: 200 });
      }
      if (url.pathname.endsWith("/oddsmatcher/snapshots")) {
        return new Response(JSON.stringify([{ snapshot_id: snapshotId, captured_at: feed.fetched_at, provider: feed.provider, competitions: feed.competitions, event_count: 12, bookmaker_count: 9, exchange_count: 3 }]), { status: 200 });
      }
      return original!(input, init);
    });

    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });

    expect(container.textContent).toContain("testing/replay");
    expect(container.querySelector('[data-pd-id="oddsmatcher.data-source-control"]')).toBeNull();
    expect(container.textContent).toContain("Draft creation and external quote links are disabled");
    expect(container.querySelector<HTMLButtonElement>('[data-pd-id="oddsmatcher.refresh"]')?.disabled).toBe(true);
    expect(requests.filter((request) => request.url.includes("/oddsmatcher/refresh"))).toHaveLength(0);
    const summary = container.querySelector<HTMLButtonElement>('button[aria-label^="Open Bet Summary"]');
    await act(async () => { summary?.click(); });
    expect(document.body.textContent).toContain("Replay · draft creation disabled");
    const addDraft = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Add Prospecting Draft");
    expect(addDraft?.disabled).toBe(true);
    const autoUpdates = [...document.body.querySelectorAll<HTMLButtonElement>('button[role="switch"]')].filter((button) => button.textContent?.includes("Auto-update"));
    expect(autoUpdates).toHaveLength(2);
    expect(autoUpdates.every((button) => button.disabled && button.getAttribute("aria-checked") === "false")).toBe(true);
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
    const autoBack = document.body.querySelector<HTMLButtonElement>('button[aria-label="Auto update back odds"]') ?? [...document.body.querySelectorAll<HTMLButtonElement>('button[role="switch"]')].find(button => button.textContent?.includes("Auto-update Back Odds"));
    expect(autoBack?.getAttribute("aria-checked")).toBe("false");
    const reset = [...document.body.querySelectorAll("button")].find(button => button.textContent === "Reset to latest quotes");
    await act(async () => { reset?.click(); });
    expect(autoBack?.getAttribute("aria-checked")).toBe("false");
  }, 10_000);

  it("preserves normal inputs and results when Advanced is toggled", async () => {
    await act(async () => { root.render(createElement(OddsMatcherShell, { profileId: "profile-demo-001" })); });
    const summary = container.querySelector<HTMLButtonElement>('button[aria-label^="Open Bet Summary"]');
    await act(async () => { summary?.click(); });
    const advanced = document.body.querySelector<HTMLButtonElement>('[data-pd-id="oddsmatcher.advanced"]');
    expect(document.body.textContent).toContain("Back Stake");
    expect(document.body.querySelector<HTMLSelectElement>('#oddsmatcher-bet-type')?.value).toBe("qualifying");
    expect(document.body.textContent).not.toContain("Back Odds Decimal");
    const settings = document.body.querySelector<HTMLButtonElement>('button[aria-label="Open Bet Summary settings"]');
    await act(async () => { settings?.click(); });
    expect(document.body.querySelector('[data-pd-id="oddsmatcher.bet-summary.settings"]')).not.toBeNull();
    expect(document.body.querySelector('.oddsmatcher-calculator-settings-backdrop')).toBeNull();
    await act(async () => { settings?.click(); });
    expect(document.body.textContent).toContain("Total Profit");
    await act(async () => { advanced?.click(); });
    expect(document.body.textContent).toContain("Underlay");
    expect(document.body.textContent).toContain("Current Lay Stake");
    const rangeValues = document.body.querySelectorAll('.custom-slider-summary-values > *');
    expect(rangeValues).toHaveLength(3);
    expect(document.body.textContent).toContain("£10.14");
    const placeLay = document.body.querySelector('[data-pd-id="oddsmatcher.place-lay-stub"]');
    const advancedControls = document.body.querySelector('.oddsmatcher-advanced-controls');
    expect(advancedControls && placeLay && Boolean(advancedControls.compareDocumentPosition(placeLay) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(document.body.textContent).toContain("Back Stake");
    await act(async () => { advanced?.click(); });
    expect(document.body.textContent).not.toContain("Range Min");
    expect(document.body.textContent).toContain("Total Profit");
  });

  it("edits universal data-source and quote defaults in Fund Manager settings", async () => {
    const snapshotId = "20261026T203500Z-demo";
    const original = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/oddsmatcher/snapshots")) return new Response(JSON.stringify([{ snapshot_id: snapshotId, captured_at: "2026-10-26T20:35:00Z", provider: "The Odds API", competitions: ["Premier League"], event_count: 1, bookmaker_count: 1, exchange_count: 1 }]), { status: 200 });
      return original!(input, init);
    });
    await act(async () => { root.render(createElement(FundManagerOddsmatcherSettings)); });
    expect(container.textContent).toContain("Data Source");
    const replay = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Saved Snapshot");
    await act(async () => { replay?.click(); });
    expect(container.querySelector<HTMLSelectElement>('#oddsmatcher-saved-snapshot-setting')?.value).toBe(snapshotId);
    const switches = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')];
    expect(switches.map((button) => button.getAttribute("aria-checked"))).toEqual(["false", "false"]);
    await act(async () => { switches[0]?.click(); switches[1]?.click(); });
    const save = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Save Oddsmatcher settings");
    await act(async () => { save?.click(); });
    const write = requests.find((request) => request.url.includes("/fund-manager/preferences/oddsmatcher") && request.method === "PUT");
    expect(write?.body).toMatchObject({ data_source: "replay", saved_snapshot_id: snapshotId, auto_update_back_odds: true, auto_update_lay_odds: true });
  });
});
