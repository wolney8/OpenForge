import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinancialAggregateReadValue } from "../components/financial-aggregate-read-value";

const render = (
  state: "loading" | "ready" | "error",
  knownValue: number,
  knownCount: number,
  unknownCount: number,
) => renderToStaticMarkup(createElement(FinancialAggregateReadValue, {
  aggregate: { knownValue, knownCount, unknownCount, isComplete: unknownCount === 0 },
  label: "selected range profit and loss",
  state,
  subject: "profit and loss",
}));

describe("FinancialAggregateReadValue", () => {
  it("never presents loading as unavailable", () => {
    const html = render("loading", 0, 0, 0);
    expect(html).toContain("Loading profit and loss");
    expect(html).not.toContain("Unavailable");
  });

  it("shows a known subtotal with an explicit incomplete count", () => {
    const html = render("ready", 12.34, 4, 3);
    expect(html).toContain("£ 12.34");
    expect(html).toContain("known");
    expect(html).toContain("Incomplete · 3 records unavailable");
    expect(html).toContain('data-financial-state="partial"');
  });

  it("uses unavailable only when no authoritative value exists", () => {
    const html = render("ready", 0, 0, 3);
    expect(html).toContain("Unavailable");
    expect(html).toContain("3 records without an authoritative value");
  });

  it("renders a complete authoritative zero as money", () => {
    const html = render("ready", 0, 1, 0);
    expect(html).toContain("£ -");
    expect(html).not.toContain("Incomplete");
  });
});
