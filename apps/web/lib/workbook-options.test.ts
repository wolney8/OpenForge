import { describe, expect, it } from "vitest";
import {
  betTypeOptions,
  filterCampaignTagOptions,
  getDefaultBetTypeForOfferType,
  getAllowedBetTypesForOfferType,
  normalizeSportsbookBetType,
  sportsbookOfferTypeOptions,
} from "./workbook-options";

describe("workbook-options sportsbook taxonomy helpers", () => {
  it("keeps wager-shape legacy values out of the base sportsbook offer-type list", () => {
    expect(sportsbookOfferTypeOptions).not.toContain("Bet Builder");
    expect(sportsbookOfferTypeOptions).not.toContain("Acca");
  });

  it("includes workbook-compatible in-play composite bet types", () => {
    expect(betTypeOptions).toContain("In Play + Single");
    expect(betTypeOptions).toContain("In Play + Bet Builder");
  });

  it("normalizes only legacy accumulator variants", () => {
    expect(normalizeSportsbookBetType("Acca")).toBe("Accumulator / Multiple");
    expect(normalizeSportsbookBetType("Accumulator")).toBe("Accumulator / Multiple");
    expect(normalizeSportsbookBetType("First Goalscorer")).toBe("First Goalscorer");
    expect(normalizeSportsbookBetType("Correct Score")).toBe("Correct Score");
  });

  it("suggests offer-type specific bet-type defaults", () => {
    expect(getDefaultBetTypeForOfferType("Double Delight / Hat-trick Heaven", "")).toBe(
      "First Goalscorer"
    );
    expect(getDefaultBetTypeForOfferType("Bet Builder", "")).toBe("Bet Builder");
    expect(getDefaultBetTypeForOfferType("Acca", "")).toBe("Accumulator / Multiple");
    expect(getDefaultBetTypeForOfferType("Bet & Get", "")).toBe("Single");
  });

  it("restricts allowed bet types when the offer flow has a clear workbook-safe mapping", () => {
    expect(getAllowedBetTypesForOfferType("Double Delight / Hat-trick Heaven")).toEqual([
      "First Goalscorer",
    ]);
    expect(getAllowedBetTypesForOfferType("Bet & Get")).toEqual([
      "Accumulator / Multiple",
      "Bet Builder",
      "In Play + Bet Builder",
      "In Play + Single",
      "Single",
    ]);
  });

  it("keeps a current compatible bet type but resets incompatible ones through the default helper", () => {
    expect(getDefaultBetTypeForOfferType("Bet & Get", "In Play + Single")).toBe(
      "In Play + Single"
    );
    expect(getDefaultBetTypeForOfferType("Double Delight / Hat-trick Heaven", "Single")).toBe(
      "First Goalscorer"
    );
  });

  it("filters campaign tags by offer-family keywords with full fallback when nothing matches", () => {
    expect(
      filterCampaignTagOptions(
        ["Weekly Reload", "Betfred DDHH", "Saturday Boost"],
        { offerType: "Double Delight / Hat-trick Heaven" }
      )
    ).toEqual(["Betfred DDHH"]);

    expect(
      filterCampaignTagOptions(["Friday Bet Club"], {
        offerType: "Cashback",
      })
    ).toEqual(["Friday Bet Club"]);
  });
});
