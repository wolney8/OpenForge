import type { ReactNode } from "react";

export function CalculatorTableSection({
  busy = false,
  children,
  className,
  headingAction,
  inspectionId,
  title,
}: {
  busy?: boolean;
  children: ReactNode;
  className?: string;
  headingAction?: ReactNode;
  inspectionId: string;
  title: ReactNode;
}) {
  return <section
    aria-busy={busy}
    className={`calculator-table-section calculator-result-card${className ? ` ${className}` : ""}`}
    data-pd-id={inspectionId}
  >
    <div className="calculator-result-card-heading">
      <div className="calculator-reference-heading-content"><h3>{title}</h3>{headingAction}</div>
    </div>
    {children}
  </section>;
}
