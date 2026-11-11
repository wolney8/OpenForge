import { afterEach, describe, expect, it, vi } from "vitest";
import { commitOwnedScalar, ownedScalarField } from "./ledger-scalar-command";

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
});
