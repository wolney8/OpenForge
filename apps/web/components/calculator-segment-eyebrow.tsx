import type { ReactNode } from "react";

/** Canonical segment heading shared by standalone and embedded planners. */
export function CalculatorSegmentEyebrow({ children }: { children: ReactNode }) {
  return <div className="calculator-segment-heading"><span className="eyebrow">{children}</span></div>;
}
