import { afterEach, describe, expect, it, vi } from "vitest";
import { commitOwnedAccessChannels, commitOwnedRunnerRace, commitOwnedScalar, ownedAccessChannelsEditable, ownedScalarField } from "./ledger-scalar-command";

afterEach(() => vi.unstubAllGlobals());

describe("combined Profile-owned scalar Save preflight", () => {
  it.each([
    ["sportsbook-bets", "event_name", "Settled"],
    ["sportsbook-bets", "offer_name", "Void"],
    ["free-bets", "event_name", "Settled"],
    ["free-bets", "offer_name", "Settled"],
    ["casino-offers", "offer_name", "Settled"],
    ["casino-offers", "game", "Settled"],
  ] as const)("blocks %s %s on a %s source", (module, field, status) => {
    expect(ownedScalarField(module, field, { profile_id: "profile-demo-001", status })).toBeNull();
  });

  it("keeps resolved and protected Cash rows in the native Edit workflow", () => {
    expect(ownedScalarField("cash-adjustments", "description", { profile_id: "profile-demo-001", calculation_state: "resolved" })).toBeNull();
    expect(ownedScalarField("cash-adjustments", "description", { profile_id: "profile-demo-001", calculation_state: "incomplete", adjustment_type: "Management Fee Withdrawal" })).toBeNull();
  });

  it("hands coupled Free Bet and Sportsbook rows to native draft validation", () => {
    const freeBet = { profile_id: "profile-demo-001", status: "Prospecting", result: "Pending", offer_type: "Free Bet", event_name: "Demo event", bookmaker: "Bookmaker A", free_bet_value: "10" };
    expect(ownedScalarField("free-bets", "offer_name", freeBet)).not.toBeNull();
    expect(ownedScalarField("free-bets", "offer_name", { ...freeBet, status: "Placed" })).toBeNull();
    expect(ownedScalarField("free-bets", "event_name", { ...freeBet, bookmaker: "" })).toBeNull();
    expect(ownedScalarField("free-bets", "event_name", { ...freeBet, free_bet_value: "invalid" })).toBeNull();
    expect(ownedScalarField("sportsbook-bets", "event_name", { profile_id: "profile-demo-001", status: "Placed", match_strategy: "Multilay" })).toBeNull();
  });

  it("rejects stale fields, foreign identity and invalid values before a PUT", async () => {
    const source = { profile_id: "profile-demo-001", sportsbook_bet_id: "SB-DEMO-001", status: "Planned", event_name: "Actual event" };
    const methods: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      methods.push(init?.method ?? "GET");
      return new Response(JSON.stringify(source), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const edit = (value: string, expected = source.event_name) => commitOwnedScalar({ module: "sportsbook-bets", profileId: "profile-demo-001",
      recordId: source.sportsbook_bet_id, column: "event_name", expected, value });
    await expect(edit(" ")).rejects.toThrow("Event name is required");
    await expect(edit("x".repeat(201))).rejects.toThrow("at most 200 characters");
    await expect(edit("Changed", "Older event")).rejects.toThrow("changed elsewhere");
    expect(methods).toEqual(["GET"]);
    source.profile_id = "foreign-profile";
    await expect(edit("Changed")).rejects.toThrow("Source identity changed");
    expect(methods).toEqual(["GET", "GET"]);
  });

  it("sends the native Cash audit idempotency key for an eligible Description change", async () => {
    const source = {
      profile_id: "profile-demo-001", cash_adjustment_id: "CA-DEMO-001",
      adjustment_type: "TopUp", calculation_state: "incomplete", description: "Demo note",
    };
    const calls: Array<{ method: string; headers: Headers }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ method, headers: new Headers(init?.headers) });
      return new Response(JSON.stringify(method === "PUT" ? { ...source, description: "Updated demo note" } : source), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }));
    await commitOwnedScalar({ module: "cash-adjustments", profileId: source.profile_id,
      recordId: source.cash_adjustment_id, column: "description", expected: source.description, value: "Updated demo note" });
    expect(calls.map(call => call.method)).toEqual(["GET", "PUT"]);
    expect(calls[1].headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("saves Runner and Race together through the owning Profile without changing financial fields", async () => {
    const source = { profile_id: "profile-demo-001", each_way_extra_place_id: "EP-DEMO-001", runner: "Runner A", race: "Race A", each_way_stake: "10.00", status: "Placed" };
    const requests: Array<{ method: string; body?: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      requests.push({ method: init?.method ?? "GET", body });
      return new Response(JSON.stringify(body ?? source), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const saved = await commitOwnedRunnerRace({ profileId: source.profile_id, recordId: source.each_way_extra_place_id,
      expectedRunner: source.runner, expectedRace: source.race, runner: "Runner B", race: "Race B" });
    expect(requests.map(request => request.method)).toEqual(["GET", "PUT"]);
    expect(requests[1].body).toMatchObject({ runner: "Runner B", race: "Race B", each_way_stake: "10.00", status: "Placed" });
    expect(saved).toMatchObject({ runner: "Runner B", race: "Race B" });
  });

  it("rejects a stale Runner/Race pair without submitting a partial write", async () => {
    const source = { profile_id: "profile-demo-001", each_way_extra_place_id: "EP-DEMO-001", runner: "Runner B", race: "Race A" };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(source), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(commitOwnedRunnerRace({ profileId: source.profile_id, recordId: source.each_way_extra_place_id,
      expectedRunner: "Runner A", expectedRace: source.race, runner: "Runner C", race: "Race C" })).rejects.toThrow("changed elsewhere");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses the native Account PUT with its version check and no balance observation fields", async () => {
    const source = { profile_id: "profile-demo-001", account_id: "AC-DEMO-001", catalogue_id: "CAT-DEMO-001", type: "Bookie", signup_offer_status: "No", access_channels: ["Online"], channel: "Online", current_balance: "12.00", pending_withdrawal_amount: "2.00", last_balance_update: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z" };
    const calls: Array<{ method: string; body?: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ method: init?.method ?? "GET", body });
      return new Response(JSON.stringify(body ? { ...source, ...body, channel: "Online, Mobile" } : source), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const saved = await commitOwnedAccessChannels({ profileId: source.profile_id, recordId: source.account_id, expected: ["Online"], values: ["Mobile", "Online"] });
    expect(calls.map(call => call.method)).toEqual(["GET", "PUT"]);
    expect(calls[1].body).toMatchObject({ account_id: source.account_id, profile_id: source.profile_id, access_channels: ["Online", "Mobile"], expected_updated_at: source.updated_at });
    expect(calls[1].body).not.toHaveProperty("current_balance");
    expect(calls[1].body).not.toHaveProperty("pending_withdrawal_amount");
    expect(calls[1].body).not.toHaveProperty("last_balance_update");
    expect(saved.access_channels).toEqual(["Online", "Mobile"]);
  });

  it("rejects stale, foreign and unavailable Account channel updates without a PUT", async () => {
    const source = { profile_id: "profile-demo-001", account_id: "AC-DEMO-001", catalogue_id: "CAT-DEMO-001", type: "Bookie", signup_offer_status: "No", access_channels: ["Mobile"], updated_at: "2026-11-01T10:00:00Z" };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(source), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const edit = () => commitOwnedAccessChannels({ profileId: "profile-demo-001", recordId: source.account_id, expected: ["Online"], values: ["Retail"] });
    await expect(edit()).rejects.toThrow("changed elsewhere");
    source.profile_id = "foreign-profile";
    await expect(edit()).rejects.toThrow("Source identity changed");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(ownedAccessChannelsEditable({ ...source, type: "Exchange" })).toBe(false);
    expect(ownedAccessChannelsEditable({ ...source, signup_offer_status: "Yes" })).toBe(false);
  });
});
