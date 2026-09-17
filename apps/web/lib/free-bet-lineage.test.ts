import { describe, expect, it } from "vitest";

import { isFreeBetLinkedToSportsbook } from "./free-bet-lineage";

describe("Sportsbook-linked Free Bet lineage", () => {
  it("uses the remapped native parent after portable restore", () => {
    expect(
      isFreeBetLinkedToSportsbook(
        {
          origin_qual_bet_id: "SOURCE-SB-001",
          origin_qual_bet_native_id: "RESTORED-SB-901",
          origin_qual_bet_resolution_state: "resolved",
        },
        "RESTORED-SB-901"
      )
    ).toBe(true);
  });

  it("retains the direct-link behaviour of native rows created before lineage storage", () => {
    expect(
      isFreeBetLinkedToSportsbook(
        {
          origin_qual_bet_id: "SB-001",
          origin_qual_bet_native_id: "",
          origin_qual_bet_resolution_state: "not_applicable",
        },
        "SB-001"
      )
    ).toBe(true);
  });

  it.each(["missing", "ambiguous", "legacy_unresolved"])(
    "does not guess a %s relationship from the external identity",
    (state) => {
      expect(
        isFreeBetLinkedToSportsbook(
          {
            origin_qual_bet_id: "SB-001",
            origin_qual_bet_native_id: "",
            origin_qual_bet_resolution_state: state,
          },
          "SB-001"
        )
      ).toBe(false);
    }
  );
});
