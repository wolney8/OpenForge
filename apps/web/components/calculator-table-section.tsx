import type { ReactNode } from "react";

import { CalculatorSectionHeading } from "@/components/calculator-section-heading";

export function CalculatorTableSection({
  busy = false,
  children,
  className,
  headingAction,
  inspectionId,
  title,
  tone = "neutral",
}: {
  busy?: boolean;
  children: ReactNode;
  className?: string;
  headingAction?: ReactNode;
  inspectionId: string;
  title: ReactNode;
  tone?: "back" | "lay" | "neutral";
}) {
  return <section
    aria-busy={busy}
    className={`calculator-table-section calculator-result-card calculator-table-section-tone-${tone}${className ? ` ${className}` : ""}`}
    data-pd-id={inspectionId}
  >
    <CalculatorSectionHeading action={headingAction} className="calculator-result-card-heading" title={title} />
    {children}
  </section>;
}
