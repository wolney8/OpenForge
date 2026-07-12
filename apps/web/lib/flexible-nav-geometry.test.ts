import { describe, expect, it } from "vitest";
import { computeFlexibleNavGeometry } from "./flexible-nav-geometry";

describe("computeFlexibleNavGeometry", () => {
  it("returns progress 0 below the anchor zone", () => {
    const result = computeFlexibleNavGeometry({
      topBarBottom: 100,
      staticTop: 180,
      staticLeft: 40,
      staticWidth: 960,
      viewportWidth: 1400,
    });

    expect(result.anchorTop).toBe(116);
    expect(result.progress).toBe(0);
    expect(result.top).toBe(180);
    expect(result.left).toBe(40);
    expect(result.width).toBe(960);
  });

  it("returns intermediate progress while crossing the anchor zone", () => {
    const result = computeFlexibleNavGeometry({
      topBarBottom: 100,
      staticTop: 80,
      staticLeft: 40,
      staticWidth: 960,
      viewportWidth: 1400,
    });

    expect(result.anchorTop).toBe(116);
    expect(result.progress).toBeCloseTo(0.5, 5);
    expect(result.top).toBeGreaterThan(80);
    expect(result.top).toBeLessThan(116);
    expect(result.width).toBeLessThan(960);
    expect(result.left).toBeGreaterThan(40);
  });

  it("returns progress 1 above the anchor zone", () => {
    const result = computeFlexibleNavGeometry({
      topBarBottom: 100,
      staticTop: 0,
      staticLeft: 40,
      staticWidth: 960,
      viewportWidth: 1400,
    });

    expect(result.anchorTop).toBe(116);
    expect(result.progress).toBe(1);
    expect(result.top).toBe(116);
    expect(result.width).toBeCloseTo(902.4, 5);
    expect(result.left).toBeCloseTo(68.8, 5);
  });

  it("uses mobile gap and keeps width full on smaller layouts", () => {
    const result = computeFlexibleNavGeometry({
      topBarBottom: 120,
      staticTop: 96,
      staticLeft: 12,
      staticWidth: 360,
      viewportWidth: 600,
    });

    expect(result.anchorTop).toBe(132);
    expect(result.progress).toBeCloseTo((132 - 96) / 56, 5);
    expect(result.width).toBeCloseTo(360, 5);
    expect(result.left).toBeCloseTo(12, 5);
  });
});
