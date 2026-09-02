import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_SECURITY_PREFERENCE,
  inactivityRemainingMs,
  MEANINGFUL_SESSION_ACTIVITY_EVENTS,
  normalizeSessionSecurityPreference,
  parseSessionSecurityPreference,
} from "./session-inactivity";

describe("session inactivity preferences", () => {
  it("defaults safely and rejects unsupported timeout values", () => {
    expect(parseSessionSecurityPreference(null)).toEqual(DEFAULT_SESSION_SECURITY_PREFERENCE);
    expect(parseSessionSecurityPreference("not-json")).toEqual(
      DEFAULT_SESSION_SECURITY_PREFERENCE
    );
    expect(normalizeSessionSecurityPreference({
      autoLogoutEnabled: true,
      timeoutMinutes: 12,
    })).toEqual({ autoLogoutEnabled: true, timeoutMinutes: 30 });
  });

  it("calculates the inactivity boundary deterministically", () => {
    expect(inactivityRemainingMs({
      lastActivityAt: 1_000,
      now: 1_000 + 14 * 60_000,
      timeoutMinutes: 15,
    })).toBe(60_000);
    expect(inactivityRemainingMs({
      lastActivityAt: 1_000,
      now: 1_000 + 15 * 60_000,
      timeoutMinutes: 15,
    })).toBe(0);
  });

  it("does not classify focus or visibility as meaningful activity", () => {
    expect(MEANINGFUL_SESSION_ACTIVITY_EVENTS).toEqual([
      "keydown",
      "pointerdown",
      "touchstart",
    ]);
    expect(MEANINGFUL_SESSION_ACTIVITY_EVENTS).not.toContain("focus");
  });
});
