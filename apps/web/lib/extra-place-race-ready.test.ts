import { describe, expect, it } from "vitest";
import { getExtraPlaceRaceReadyState } from "./extra-place-race-ready";

const scheduledAt = Date.parse("2026-08-27T14:00:00.000Z");

describe("getExtraPlaceRaceReadyState", () => {
  it("does not cue before the race or for settled rows", () => {
    expect(
      getExtraPlaceRaceReadyState({
        now: scheduledAt + 4 * 60_000,
        placedAt: "2026-08-27T14:00:00.000Z",
        status: "Placed",
      }),
    ).toBeNull();
    expect(
      getExtraPlaceRaceReadyState({
        now: scheduledAt + 11 * 60_000,
        placedAt: "2026-08-27T14:00:00.000Z",
        status: "Settled",
      }),
    ).toBeNull();
  });

  it("changes from race finishing to result due without automating settlement", () => {
    expect(
      getExtraPlaceRaceReadyState({
        now: scheduledAt + 6 * 60_000,
        placedAt: "2026-08-27T14:00:00.000Z",
        status: "Placed",
      }),
    ).toEqual({ label: "Race finishing", tone: "finishing" });
    expect(
      getExtraPlaceRaceReadyState({
        now: scheduledAt + 10 * 60_000,
        placedAt: "2026-08-27T14:00:00.000Z",
        status: "Placed",
      }),
    ).toEqual({ label: "Result due", tone: "due" });
  });

  it("keeps the result-due cue active until a placed row is settled", () => {
    expect(
      getExtraPlaceRaceReadyState({
        now: scheduledAt + 15 * 60_000,
        placedAt: "2026-08-27T14:00:00.000Z",
        status: "Placed",
      }),
    ).toEqual({ label: "Result due", tone: "due" });
  });
});
