import { describe, expect, it } from "vitest";
import { resolveBackLayTheme, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("uses an allowed stored theme when present", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to system preference when storage is empty", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
  });

  it("ignores unknown stored values", () => {
    expect(resolveTheme("sepia", true)).toBe("dark");
  });
});

describe("resolveBackLayTheme", () => {
  it("uses an allowed stored back/lay theme when present", () => {
    expect(resolveBackLayTheme("smarkets")).toBe("smarkets");
    expect(resolveBackLayTheme("betfair")).toBe("betfair");
  });

  it("defaults to smarkets when storage is empty or unknown", () => {
    expect(resolveBackLayTheme(null)).toBe("smarkets");
    expect(resolveBackLayTheme(undefined)).toBe("smarkets");
    expect(resolveBackLayTheme("custom")).toBe("smarkets");
  });
});
