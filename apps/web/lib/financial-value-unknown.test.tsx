import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FinancialValue } from "../components/financial-value";

describe("FinancialValue unknown and zero semantics", () => {
  it("renders a canonical blank value as unavailable instead of zero", () => {
    const markup = renderToStaticMarkup(createElement(FinancialValue, { value: "" }));

    expect(markup).toContain("Unavailable");
    expect(markup).not.toContain("£");
  });

  it("keeps an authoritative zero value valid", () => {
    const markup = renderToStaticMarkup(
      createElement(FinancialValue, { value: "0.00", zeroTone: "neutral" }),
    );

    expect(markup).toContain("£ -");
    expect(markup).not.toContain("Unavailable");
  });
});
