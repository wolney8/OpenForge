import { describe, expect, it } from "vitest";

import { inferStatusToastTone } from "./status-toast";

describe("inferStatusToastTone", () => {
  it.each([
    ["Opened sportsbook bet SB-DEMO for editing.", "info"],
    ["New free bet ready. Complete the required fields, then save.", "info"],
    ["Created sportsbook bet SB-DEMO.", "success"],
    ["Outcome update autosaved for FB-DEMO.", "success"],
    ["Reverted unsaved changes for casino offer CO-DEMO.", "warning"],
    ["Complete required cash-adjustment fields before saving: Amount.", "error"],
    ["Autosave is waiting for required sportsbook fields.", "error"],
    ["Sportsbook row could not be found for outcome update.", "error"],
  ] as const)("maps %s to %s", (message, expectedTone) => {
    expect(inferStatusToastTone(message)).toBe(expectedTone);
  });
});
