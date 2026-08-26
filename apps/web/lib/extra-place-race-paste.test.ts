import { describe, expect, it } from "vitest";
import { parseExtraPlaceRacePaste } from "./extra-place-race-paste";

describe("parseExtraPlaceRacePaste", () => {
  it("parses the Smarkets runner copy block", () => {
    expect(
      parseExtraPlaceRacePaste("14:45 - Catterick\n\nTo win\n\nRoyale Union"),
    ).toEqual({ race: "Catterick 14:45", runner: "Royale Union" });
  });

  it("parses the MBB runner copy block", () => {
    expect(
      parseExtraPlaceRacePaste("14:45 Catterick\n\nCatterick\n\nRoyale Union\n\nWinner"),
    ).toEqual({ race: "Catterick 14:45", runner: "Royale Union" });
  });

  it("does not claim ordinary typed text", () => {
    expect(parseExtraPlaceRacePaste("Catterick 14:45")).toBeNull();
  });
});
