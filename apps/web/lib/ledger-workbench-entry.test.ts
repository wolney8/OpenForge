import { describe, expect, it } from "vitest";
import { casinoWorkbenchEntry, extraPlaceWorkbenchEntry, freeBetWorkbenchEntry, sportsbookWorkbenchEntry } from "./ledger-workbench-entry";

describe("persisted ledger lifecycle chooses the initial workbench stage", () => {
  it("keeps a new or incomplete Sportsbook row at setup", () => {
    expect(sportsbookWorkbenchEntry({ status: "Prospecting", layStatus: "Unknown", matchStrategy: "Partial Lay", setupComplete: false })).toBe("setup");
  });
  it("sends placed partial hedge evidence to placement without treating a past event as settlement", () => {
    expect(sportsbookWorkbenchEntry({ status: "Placed", layStatus: "Part Laid", matchStrategy: "Partial Lay", setupComplete: true })).toBe("placement");
    expect(sportsbookWorkbenchEntry({ status: "Placed", layStatus: "Fully Laid", matchStrategy: "Partial Lay", setupComplete: true })).toBe("settlement");
    expect(sportsbookWorkbenchEntry({ status: "Settled", layStatus: "Fully Laid", matchStrategy: "Partial Lay", setupComplete: true })).toBe("settlement");
    expect(sportsbookWorkbenchEntry({ status: "Placed", layStatus: "Unknown", matchStrategy: "Standard", setupComplete: true })).toBe("matching");
    expect(sportsbookWorkbenchEntry({ status: "Placed", layStatus: "Unknown", matchStrategy: "No Lay", setupComplete: true })).toBe("settlement");
    expect(sportsbookWorkbenchEntry({ status: "Void", layStatus: "Unknown", matchStrategy: "Standard", setupComplete: true })).toBe("settlement");
  });
  it("keeps an unawarded Free Bet in setup and separates matching from settlement", () => {
    expect(freeBetWorkbenchEntry({ status: "Not Yet Awarded", result: "Pending", layStatus: "Unknown", setupComplete: true })).toBe("setup");
    expect(freeBetWorkbenchEntry({ status: "Placed", result: "Pending", layStatus: "Part Laid", setupComplete: true })).toBe("matching");
    expect(freeBetWorkbenchEntry({ status: "Placed", result: "Pending", layStatus: "Fully Laid", setupComplete: true })).toBe("settlement");
    expect(freeBetWorkbenchEntry({ status: "Available", result: "Pending", layStatus: "Unknown", setupComplete: false })).toBe("setup");
    expect(freeBetWorkbenchEntry({ status: "Settled", result: "Win", layStatus: "Unknown", setupComplete: true })).toBe("settlement");
  });
  it("follows only the Casino stages supported by its offer type", () => {
    expect(casinoWorkbenchEntry({ status: "Started", result: "Pending", setupComplete: true, hasCampaign: true, campaignComplete: false, hasReward: true, rewardComplete: false })).toBe("campaign");
    expect(casinoWorkbenchEntry({ status: "Started", result: "Pending", setupComplete: true, hasCampaign: false, campaignComplete: false, hasReward: true, rewardComplete: false })).toBe("reward");
    expect(casinoWorkbenchEntry({ status: "Settled", result: "Win", setupComplete: true, hasCampaign: true, campaignComplete: true, hasReward: true, rewardComplete: true })).toBe("settlement");
    expect(casinoWorkbenchEntry({ status: "Prospecting", result: "Pending", setupComplete: false, hasCampaign: false, campaignComplete: false, hasReward: true, rewardComplete: false })).toBe("setup");
    expect(casinoWorkbenchEntry({ status: "Started", result: "Pending", setupComplete: true, hasCampaign: true, campaignComplete: true, hasReward: true, rewardComplete: false })).toBe("reward");
    expect(casinoWorkbenchEntry({ status: "Started", result: "Pending", setupComplete: true, hasCampaign: false, campaignComplete: false, hasReward: false, rewardComplete: false })).toBe("settlement");
  });
  it("opens complete placed Extra Place rows at their native settlement review", () => {
    expect(extraPlaceWorkbenchEntry({ status: "Prospecting", calculationInputsComplete: true })).toBe("calculate");
    expect(extraPlaceWorkbenchEntry({ status: "Placed", calculationInputsComplete: false })).toBe("calculate");
    expect(extraPlaceWorkbenchEntry({ status: "Placed", calculationInputsComplete: true })).toBe("settlement");
    expect(extraPlaceWorkbenchEntry({ status: "Settled", calculationInputsComplete: false })).toBe("settlement");
  });
});
