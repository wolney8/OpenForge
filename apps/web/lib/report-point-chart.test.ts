import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ReportPointChart } from "../components/report-point-chart";
import { buildSparklinePoints } from "./dashboard-analytics";

it("does not render invalid SVG or NaN accessible values when a period is unknown", () => {
  const points = [{ key: "known", label: "Known week", value: 5 }, { key: "unknown", label: "Unknown week", value: NaN }];
  const html = renderToStaticMarkup(createElement(ReportPointChart, {
    ...buildSparklinePoints(points, true), points, selectedIndex: 1, onSelect: () => {}, label: "Period P&L",
  }));
  expect(html).not.toContain("<svg");
  expect(html).not.toContain("NaN");
  expect(html).toContain("Unavailable");
  expect(html).toContain("required betting values need review");
});

it("places profit and loss on opposite sides of the zero line without changing values", () => {
  const graph = buildSparklinePoints([{ value: -5 }, { value: 5 }], true);
  expect(graph.zeroY).toBe(21);
  expect(graph.line).toBe("3.00,38.00 97.00,4.00");
  expect(graph.area).toBe("0,21 3.00,38.00 97.00,4.00 100,21");
});
