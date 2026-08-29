import { describe, expect, it } from "vitest";
import {
  FUND_MANAGER_DASHBOARD_PATH,
  normalizePostAuthDestination,
} from "./auth-redirect";

describe("normalizePostAuthDestination", () => {
  it.each([undefined, null, "", "/", "/login", "https://example.invalid", "//example.invalid"])(
    "uses the Fund Manager Dashboard for a normal or unsafe target: %s",
    (target) => {
      expect(normalizePostAuthDestination(target)).toBe(FUND_MANAGER_DASHBOARD_PATH);
    }
  );

  it("preserves a specific protected application route", () => {
    expect(normalizePostAuthDestination("/profiles/profile-demo-001/tracker/accounts")).toBe(
      "/profiles/profile-demo-001/tracker/accounts"
    );
  });
});
